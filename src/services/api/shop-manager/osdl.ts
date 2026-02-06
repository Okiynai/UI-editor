import type { PageDefinition, SiteSettings } from '@/OSDL/OSDL.types';
import { getDemoPageDefinition } from '@/osdl-demos/default-demo';

export type { PageDefinition };
export type ColorVariable = { id: string; name: string; value: string; type?: 'color' };
export type FontVariable = { id: string; name: string; value: string; type?: 'font' };
export type SEOSettings = Record<string, any>;

const SETTINGS_KEY = 'osdl-demo-site-settings';
const PAGES_KEY = 'osdl-demo-pages';
const DB_NAME = 'osdl-demo-store';
const DB_VERSION = 1;
const STORE_NAME = 'kv';
const FORCE_DEFAULT_DEMO = false;

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

const loadSettings = async (): Promise<SiteSettings> => {
  const settings = await readKV<SiteSettings>(SETTINGS_KEY);
  if (settings) return settings;
  return {
    schemaVersion: 'osdl_v3.1',
    name: 'Demo Shop',
    defaultLocale: 'en-US',
    supportedLocales: ['en-US'],
    globalStyleVariables: { colors: { primary: '#1B3258' }, fonts: {}, spacing: {}, breakpoints: { mobile: 480, tablet: 768, desktop: 1024 } },
    seo: {}
  } as SiteSettings;
};

const saveSettings = async (s: SiteSettings) => {
  await writeKV(SETTINGS_KEY, s);
};

const loadPages = async (): Promise<PageDefinition[]> => {
  if (FORCE_DEFAULT_DEMO) {
    return [getDemoPageDefinition({ subdomain: 'demo', path: '/' })];
  }

  const pages = await readKV<PageDefinition[]>(PAGES_KEY);
  if (pages && Array.isArray(pages)) return pages;
  const demo = getDemoPageDefinition({ subdomain: 'demo', path: '/' });
  return [demo];
};

const savePages = async (pages: PageDefinition[]) => {
  await writeKV(PAGES_KEY, pages);
};

export const getSiteSettings = async (_shopId: string) => ({ success: true, data: await loadSettings() });

export const updateSiteSettings = async (
  _shopId: string,
  colorVariables: ColorVariable[],
  fontVariables: FontVariable[],
  seoSettings: SEOSettings,
  settings: Partial<SiteSettings>
) => {
  const current = await loadSettings();
  const colors = { ...(current.globalStyleVariables?.colors || {}) };
  const fonts = { ...(current.globalStyleVariables?.fonts || {}) };
  colorVariables.forEach(v => { colors[v.name] = v.value; });
  fontVariables.forEach(v => { fonts[v.name] = v.value; });
  const merged: SiteSettings = {
    ...current,
    ...settings,
    globalStyleVariables: {
      ...(current.globalStyleVariables || {}),
      colors,
      fonts
    },
    seo: seoSettings
  } as SiteSettings;
  await saveSettings(merged);
  return {};
};

export const transformOSDLToVariables = (settings: SiteSettings) => settings;

export const getPagesForSite = async (_siteId: string) => await loadPages();

export const upsertPage = async (_siteId: string, page: Partial<PageDefinition>) => {
  const pages = await loadPages();
  const id = page.id || `page_${Date.now()}`;
  const existingIndex = pages.findIndex(p => p.id === id);
  const nextPage: PageDefinition = {
    ...(existingIndex >= 0 ? pages[existingIndex] : getDemoPageDefinition({ subdomain: 'demo', path: page.route || '/' })),
    ...page,
    id
  } as PageDefinition;
  if (existingIndex >= 0) pages[existingIndex] = nextPage; else pages.push(nextPage);
  await savePages(pages);
  return nextPage;
};

export const deletePage = async (_siteId: string, pageId: string) => {
  const pages = (await loadPages()).filter(p => p.id !== pageId);
  await savePages(pages);
  return { success: true, message: 'deleted' };
};

export const deleteSiteVariable = async () => ({ success: true });

export const savePageSEOSettings = async () => ({ success: true });
