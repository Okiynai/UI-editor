import React from 'react';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import BuilderPage from './app/shop-manager/website/edit/[sessId]/page';
import IframePage from './app/shop-manager/website/edit/iframe/page';

const rootRoute = createRootRoute({
  component: () => <Outlet />
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <BuilderPage />
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$sessId',
  component: () => <BuilderPage />
});

const iframeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shop-manager/website/edit/iframe',
  component: () => <IframePage />
});

const routeTree = rootRoute.addChildren([indexRoute, editorRoute, iframeRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
