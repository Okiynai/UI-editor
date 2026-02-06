import type { PageDefinition, SiteSettings } from '@/OSDL/OSDL.types';
import { getDemoPageDefinition } from '@/osdl-demos/default-demo';
import { findBestRouteMatch, normalizePathname } from '@/app/shop-manager/website/edit/shared/navigation';

export type ShopLocales = { supportedLocales: string[]; defaultLocale: string };

const SETTINGS_KEY = 'osdl-demo-site-settings';
const PAGES_KEY = 'osdl-demo-pages';
const DB_NAME = 'osdl-demo-store';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

type KVRecord = {
  key: string;
  value: unknown;
};

const canUseIndexedDb = (): boolean => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const canUseLocalStorage = (): boolean => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const openDb = async (): Promise<IDBDatabase> => {
  if (!canUseIndexedDb()) {
    throw new Error('IndexedDB is not available');
  }

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
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
    const result = await fn(store);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });

    return result;
  } finally {
    db.close();
  }
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });

const readLegacyLocalStorage = <T>(key: string): T | null => {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeLegacyLocalStorage = <T>(key: string, value: T): void => {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore fallback storage write errors.
  }
};

const writeKV = async <T>(key: string, value: T): Promise<void> => {
  if (!canUseIndexedDb()) {
    writeLegacyLocalStorage(key, value);
    return;
  }

  await withStore('readwrite', async (store) => {
    store.put({ key, value } satisfies KVRecord);
    return undefined;
  });
};

const readKV = async <T>(key: string): Promise<T | null> => {
  if (!canUseIndexedDb()) {
    return readLegacyLocalStorage<T>(key);
  }

  try {
    const record = await withStore('readonly', async (store) => {
      const request = store.get(key);
      return await requestToPromise(request) as KVRecord | undefined;
    });

    if (record?.value !== undefined) {
      return record.value as T;
    }
  } catch (error) {
    console.error('Failed reading from IndexedDB store:', error);
  }

  const legacyValue = readLegacyLocalStorage<T>(key);
  if (legacyValue !== null) {
    try {
      await writeKV(key, legacyValue);
    } catch {
      // Keep using legacy value for this session if migration fails.
    }
  }
  return legacyValue;
};

const defaultSettings: SiteSettings = {
  schemaVersion: 'osdl_v3.1',
  name: 'Demo Shop',
  logoUrl: '',
  faviconUrl: '',
  defaultLocale: 'en-US',
  supportedLocales: ['en-US'],
  globalStyleVariables: {
    colors: {
      primary: 'hsl(206 60% 43%)',
      primaryDarker: 'hsl(206 52% 30%)',
      primaryLighter: 'hsl(206 55% 52%)',
      secondary: 'hsl(206 56% 20%)',
      accent: 'hsl(206 40% 91%)',
      textLight: '#ffffff',
      textDark: '#171717',
      textMedium: 'hsl(240 5% 55%)',
      backgroundDark: 'hsl(206 65% 11%)',
      backgroundMedium: 'hsl(206 56% 20%)',
      backgroundLight: '#ffffff',
      backgroundSubtle: 'hsl(240 5% 95%)',
      success: 'hsl(140 64% 47%)',
      warning: 'hsl(48 96% 53%)',
      error: 'hsl(349 77% 55%)'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    },
    spacing: {
      small: '8px',
      medium: '16px',
      large: '24px',
      xl: '32px'
    },
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1024
    }
  },
  seo: {}
};

const loadSettings = async (): Promise<SiteSettings> => {
  const settings = await readKV<SiteSettings>(SETTINGS_KEY);
  if (settings) return settings;
  return defaultSettings;
};

const saveSettings = async (s: SiteSettings) => {
  await writeKV(SETTINGS_KEY, s);
};

const loadPages = async (): Promise<PageDefinition[]> => {
  const pages = await readKV<PageDefinition[]>(PAGES_KEY);
  if (pages && Array.isArray(pages)) return pages;
  const demo = getDemoPageDefinition({ subdomain: 'demo', path: '/' });
  return [demo];
};

const savePages = async (pages: PageDefinition[]) => {
  await writeKV(PAGES_KEY, pages);
};

export const getSiteSettings = async () => ({ success: true, data: await loadSettings() });

export const getManagerSiteSettings = async (_: { siteId: string }) => ({ success: true, data: await loadSettings() });

export const getPageDefinition = async (_: { subdomain: string; path: string }) => {
  const pages = await loadPages();
  const matchedPage = findBestRouteMatch(pages, _.path, (page) => page.route)?.entry;

  if (!matchedPage) {
    return {
      success: false,
      error: `Page not found for path "${normalizePathname(_.path)}"`
    };
  }

  return { success: true, data: matchedPage };
};

export const getManagerPageDefinition = async (_: { siteId: string; path: string }) => {
  const pages = await loadPages();
  const matchedPage = findBestRouteMatch(pages, _.path, (page) => page.route)?.entry;

  if (!matchedPage) {
    return {
      success: false,
      error: `Page not found for path "${normalizePathname(_.path)}"`
    };
  }

  return { success: true, data: matchedPage };
};

export const getShopLocales = async (): Promise<ShopLocales> => ({
  supportedLocales: (await loadSettings()).supportedLocales || ['en-US'],
  defaultLocale: (await loadSettings()).defaultLocale || 'en-US'
});

export const savePageDefinition = async (page: PageDefinition) => {
  const pages = await loadPages();
  const idx = pages.findIndex(p => p.id === page.id);
  if (idx >= 0) pages[idx] = page; else pages.push(page);
  await savePages(pages);
  return { success: true };
};

export const getCompiledComponent = async () => ({ success: false, error: 'disabled' });
export const previewCompileJsx = async () => ({ success: false, error: 'disabled' });
