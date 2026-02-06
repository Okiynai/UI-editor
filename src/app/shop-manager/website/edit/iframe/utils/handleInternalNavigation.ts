import {
  buildInternalNavigationPayload,
  extractRouteParamsFromPattern
} from '@/app/shop-manager/website/edit/shared/navigation';

export function handleInternalNavigation(
  url: string, 
  pageDefinition?: any, 
  navigationType?: 'push' | 'replace' | 'back' | 'forward' | 'reload'
) {
  console.log('🔄 Routing: handleInternalNavigation', url, navigationType);
  
  // Extract route parameters from URL if it's a dynamic route
  const urlObj = new URL(url, window.location.origin);
  let routeParams: Record<string, string> | undefined;
  
  // Check if current page is dynamic and extract params
  if (pageDefinition?.route) {
    routeParams = extractRouteParamsFromPattern(pageDefinition.route, urlObj.pathname) || undefined;
  }
  
  // Send message to parent with navigation type
  window.parent.postMessage({
    type: 'INTERNAL_NAVIGATION',
    payload: buildInternalNavigationPayload({
      url,
      navigationType: navigationType || 'push',
      routeParams
    })
  }, '*');
}
