export type AssetFolder = {
  id: string;
  name: string;
  type?: 'system' | 'custom';
  isSystem?: boolean;
};

export type ShopAsset = {
  id: string;
  originalName: string;
  fileSize: number;
  type: 'image' | 'document' | 'archive' | '3d_model' | 'video' | 'other';
  fileUrl: string;
  folderId?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PaginationInfo = {
  page: number;
  totalPages: number;
  totalCount: number;
  total?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

export type StorageQuota = {
  used: number;
  total: number;
  limit?: number;
  percentage?: number;
};

type StoredImageRecord = {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadSource?: string;
  createdAt: number;
  updatedAt: number;
  blob?: Blob;
  externalUrl?: string;
};

type TrackAssetInput = {
  folderId?: string;
  originalName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  type: 'image' | 'video' | '3d_model' | 'document' | 'archive' | 'other';
  width?: number;
  height?: number;
  duration?: number;
  uploadSource?: string;
  altText?: string;
  caption?: string;
  tags?: string[];
};

const DB_NAME = 'osdl-local-assets';
const DB_VERSION = 1;
const STORE_NAME = 'images';

const PRIMARY_FOLDER: AssetFolder = {
  id: 'local-assets',
  name: 'assets',
  type: 'system',
  isSystem: true,
};

const DEFAULT_TOTAL_BYTES = 1024 * 1024 * 1024;

const LEGACY_FOLDER_ALIASES = new Set([
  'assets',
  'asset',
  'images',
  'image',
  'chat',
  'documents',
  'document',
  '3d_models',
  '3d_model',
  'videos',
  'video',
  'archives',
  'archive',
  'system-images',
  'system-docs',
  PRIMARY_FOLDER.id,
]);

const dataUrlCache = new Map<string, string>();

const canUseIndexedDb = (): boolean => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const openDb = async (): Promise<IDBDatabase> => {
  if (!canUseIndexedDb()) {
    throw new Error('IndexedDB is not available in this environment');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>
): Promise<T> => {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const value = await fn(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });

    return value;
  } finally {
    db.close();
  }
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });

const getAllRecords = async (): Promise<StoredImageRecord[]> => {
  if (!canUseIndexedDb()) return [];

  try {
    return await withStore('readonly', async (store) => {
      const request = store.getAll();
      const rows = (await requestToPromise(request)) as StoredImageRecord[];
      return rows.sort((a, b) => b.createdAt - a.createdAt);
    });
  } catch (error) {
    console.error('Failed to read local images:', error);
    return [];
  }
};

const putRecord = async (record: StoredImageRecord): Promise<void> => {
  if (!canUseIndexedDb()) return;

  await withStore('readwrite', async (store) => {
    store.put(record);
    return undefined;
  });
};

const deleteRecord = async (id: string): Promise<void> => {
  if (!canUseIndexedDb()) return;

  await withStore('readwrite', async (store) => {
    store.delete(id);
    return undefined;
  });

  dataUrlCache.delete(id);
};

const normalizeFolderToken = (value?: string | null): string => {
  if (!value) return 'assets';
  return value.trim().toLowerCase().replace(/\s+/g, '_');
};

const isSupportedFolder = (value?: string | null): boolean => {
  if (!value) return true;
  const normalized = normalizeFolderToken(value);
  return LEGACY_FOLDER_ALIASES.has(normalized) || normalized.startsWith('custom-');
};

const blobToDataUrl = async (blob: Blob): Promise<string> =>
  await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });

const toPublicUrl = async (record: StoredImageRecord): Promise<string> => {
  if (record.externalUrl) return record.externalUrl;
  if (!record.blob) return '';

  const cached = dataUrlCache.get(record.id);
  if (cached) return cached;

  const nextUrl = await blobToDataUrl(record.blob);
  dataUrlCache.set(record.id, nextUrl);
  return nextUrl;
};

const toAsset = async (record: StoredImageRecord): Promise<ShopAsset> => ({
  id: record.id,
  originalName: record.originalName,
  fileSize: record.fileSize,
  type: 'image',
  fileUrl: await toPublicUrl(record),
  folderId: PRIMARY_FOLDER.id,
  mimeType: record.mimeType,
  width: record.width,
  height: record.height,
  createdAt: new Date(record.createdAt).toISOString(),
  updatedAt: new Date(record.updatedAt).toISOString(),
});

const toBlobFromUrl = async (url: string): Promise<Blob | null> => {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
};

const sanitizeMimeType = (mimeType: string): string => {
  if (!mimeType || typeof mimeType !== 'string') return 'image/png';
  if (!mimeType.startsWith('image/')) return 'image/png';
  return mimeType;
};

const newAssetId = (): string => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `asset_${Date.now()}_${randomPart}`;
};

export const getAssetFolders = async () => ({
  success: true,
  data: [PRIMARY_FOLDER],
});

export const getAssets = async (params: { folderId?: string; page?: number; limit?: number } = {}) => {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.limit ?? 50);

  if (!isSupportedFolder(params.folderId)) {
    return {
      success: true,
      data: {
        assets: [] as ShopAsset[],
        pagination: {
          page,
          totalPages: 1,
          totalCount: 0,
          total: 0,
          limit,
          hasNext: false,
          hasPrev: false,
        } satisfies PaginationInfo,
      },
    };
  }

  const all = await getAllRecords();
  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const pageRows = all.slice(start, start + limit);

  return {
    success: true,
    data: {
      assets: await Promise.all(pageRows.map(toAsset)),
      pagination: {
        page: safePage,
        totalPages,
        totalCount,
        total: totalCount,
        limit,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      } satisfies PaginationInfo,
    },
  };
};

export const createAssetFolder = async (_: { name: string; description?: string }) => ({
  success: true,
  data: PRIMARY_FOLDER,
});

export const deleteAssetFolder = async (_: string) => ({ success: true });

export const initializeDefaultFolders = async () => ({
  success: true,
  data: [PRIMARY_FOLDER],
});

export const trackAsset = async (input: TrackAssetInput) => {
  if (input.type !== 'image' && !input.mimeType?.startsWith('image/')) {
    return {
      success: false,
      error: 'Only image assets are supported in local mode',
    };
  }

  const mimeType = sanitizeMimeType(input.mimeType);
  const blob = await toBlobFromUrl(input.fileUrl);

  if (!blob && !/^https?:\/\//i.test(input.fileUrl)) {
    return {
      success: false,
      error: 'Failed to read image data for local storage',
    };
  }

  const now = Date.now();
  const id = newAssetId();
  const record: StoredImageRecord = {
    id,
    originalName: input.originalName || input.fileName || `image-${id}`,
    fileSize: input.fileSize || blob?.size || 0,
    mimeType,
    width: input.width,
    height: input.height,
    uploadSource: input.uploadSource,
    createdAt: now,
    updatedAt: now,
    blob: blob ?? undefined,
    externalUrl: blob ? undefined : input.fileUrl,
  };

  try {
    await putRecord(record);
    return {
      success: true,
      data: await toAsset(record),
    };
  } catch (error) {
    console.error('Failed to store local image asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store image',
    };
  }
};

export const deleteAsset = async (assetId: string) => {
  try {
    await deleteRecord(assetId);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete local image asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    };
  }
};

export const getStorageQuota = async () => {
  const all = await getAllRecords();
  const used = all.reduce((sum, row) => sum + (row.fileSize || 0), 0);

  return {
    success: true,
    data: {
      used,
      total: DEFAULT_TOTAL_BYTES,
      limit: DEFAULT_TOTAL_BYTES,
      percentage: Math.min(100, (used / DEFAULT_TOTAL_BYTES) * 100),
    } satisfies StorageQuota,
  };
};
