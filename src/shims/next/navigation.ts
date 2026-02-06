import { useMemo } from 'react';
import { useRouter as useTSRouter, useParams as useTSParams } from '@tanstack/react-router';

export const useRouter = () => {
  const router = useTSRouter();
  return {
    push: (to: string) => router.navigate({ to }),
    replace: (to: string) => router.navigate({ to, replace: true }),
    back: () => window.history.back(),
    prefetch: async () => undefined
  };
};

export const useParams = () => {
  try {
    return useTSParams();
  } catch {
    return {};
  }
};

export const usePathname = () => {
  return window.location.pathname;
};

export const useSearchParams = () => {
  return useMemo(() => new URLSearchParams(window.location.search), [window.location.search]);
};
