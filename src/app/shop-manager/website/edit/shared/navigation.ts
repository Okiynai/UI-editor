export type NavigationType = 'push' | 'replace' | 'back' | 'forward' | 'reload';

const DYNAMIC_SEGMENT_PATTERN = /^\[([^\]]+)\]$/;

const normalizeSlashes = (value: string) => value.replace(/\/{2,}/g, '/');

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizePathname = (value: string): string => {
  const raw = (value || '').trim();
  if (!raw) return '/';

  let pathname = raw;
  try {
    pathname = new URL(raw, 'http://localhost').pathname;
  } catch {
    pathname = raw.split('?')[0] || '/';
  }

  pathname = normalizeSlashes(pathname);
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  return pathname || '/';
};

const getPathSegments = (value: string): string[] =>
  normalizePathname(value)
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);

const isDynamicSegment = (segment: string): boolean => DYNAMIC_SEGMENT_PATTERN.test(segment);

const getDynamicSegmentName = (segment: string): string | null => {
  const match = segment.match(DYNAMIC_SEGMENT_PATTERN);
  return match ? match[1] : null;
};

export const filterRouteParamsForRoute = (
  routePattern: string,
  params: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (!params) return undefined;
  const validKeys = new Set(
    getPathSegments(routePattern)
      .map(getDynamicSegmentName)
      .filter((segment): segment is string => Boolean(segment))
  );

  if (validKeys.size === 0) return undefined;

  const filtered: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (validKeys.has(key)) {
      filtered[key] = value;
    }
  });

  return Object.keys(filtered).length > 0 ? filtered : undefined;
};

export const extractRouteParamsFromPattern = (
  routePattern: string,
  actualPath: string
): Record<string, string> | null => {
  const routeParts = getPathSegments(routePattern);
  const pathParts = getPathSegments(actualPath);

  if (routeParts.length !== pathParts.length) return null;

  const routeParams: Record<string, string> = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];

    if (isDynamicSegment(routePart)) {
      const key = getDynamicSegmentName(routePart);
      if (key) routeParams[key] = pathPart;
      continue;
    }

    if (routePart !== pathPart) return null;
  }

  return routeParams;
};

const getRouteSpecificityScore = (routePattern: string): number => {
  const segments = getPathSegments(routePattern);
  const staticSegments = segments.filter((segment) => !isDynamicSegment(segment)).length;
  return staticSegments * 100 + segments.length;
};

export const findBestRouteMatch = <T>(
  entries: T[],
  actualPath: string,
  getRoutePattern: (entry: T) => string | undefined
): { entry: T; routeParams: Record<string, string> } | null => {
  const path = normalizePathname(actualPath);
  let bestMatch: { entry: T; routeParams: Record<string, string>; score: number } | null = null;

  entries.forEach((entry) => {
    const routePattern = getRoutePattern(entry);
    if (!routePattern) return;

    const routeParams = extractRouteParamsFromPattern(routePattern, path);
    if (!routeParams) return;

    const score = getRouteSpecificityScore(routePattern);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry, routeParams, score };
    }
  });

  if (!bestMatch) return null;
  return { entry: bestMatch.entry, routeParams: bestMatch.routeParams };
};

type InternalNavigationPayloadLike = {
  url?: unknown;
  routeParams?: unknown;
  navigationType?: unknown;
  action?: unknown;
};

const isNavigationType = (value: unknown): value is NavigationType =>
  value === 'push' ||
  value === 'replace' ||
  value === 'back' ||
  value === 'forward' ||
  value === 'reload';

export const normalizeInternalNavigationPayload = (payload: unknown): {
  url?: string;
  routeParams?: Record<string, string>;
  navigationType: NavigationType;
} => {
  const parsed = (payload || {}) as InternalNavigationPayloadLike;
  const navigationType = isNavigationType(parsed.navigationType)
    ? parsed.navigationType
    : isNavigationType(parsed.action)
      ? parsed.action
      : 'push';

  const routeParams =
    parsed.routeParams && typeof parsed.routeParams === 'object' && !Array.isArray(parsed.routeParams)
      ? (parsed.routeParams as Record<string, string>)
      : undefined;

  const url = typeof parsed.url === 'string' ? parsed.url : undefined;

  return {
    url,
    routeParams,
    navigationType
  };
};

export const buildInternalNavigationPayload = (params: {
  url: string;
  navigationType: NavigationType;
  routeParams?: Record<string, string>;
}) => ({
  url: params.url,
  navigationType: params.navigationType,
  action: params.navigationType,
  routeParams: params.routeParams
});
