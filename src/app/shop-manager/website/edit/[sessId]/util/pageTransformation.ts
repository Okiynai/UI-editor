import { Page } from "../types/builder";
import { PageDefinition } from "@/services/api/shop-manager/osdl";

export const transformBackendPagesToFrontend = (backendPages: PageDefinition[]): Page[] => {
    if (!backendPages || backendPages.length === 0) {
        return [];
    }

    // Create a map for quick lookups and initial transformation
    const pageMap = new Map<string, Page>();
    backendPages.forEach(p => {
        const page: Page = {
            id: p.id,
            realId: p.id,
            value: p.route,
            label: p.name,
            isDynamic: p.pageType === 'dynamic',
            isFolderPage: p.pageType === 'folder-only',
            slugName: p.pageType === 'dynamic' ? p.route.match(/\[(.*?)\]/)?.[1] || 'id' : undefined,
            pageType: p.pageType,
            parentId: undefined, // Will be determined next
            nodes: p.nodes || [],
            systemPageProps: p.systemPageProps || {},
            seo: p.seo || undefined,
        };
        pageMap.set(p.id, page);
    });

    // Sort pages by route depth to ensure parents are processed before children
    const sortedPages = [...backendPages].sort((a, b) => {
        const depthA = a.route.split('/').length;
        const depthB = b.route.split('/').length;
        if (depthA !== depthB) {
            return depthA - depthB;
        }
        return a.route.localeCompare(b.route);
    });

    // Determine parent-child relationships robustly
    sortedPages.forEach(p => {
        const page = pageMap.get(p.id);
        if (!page) return;

        // Find the most specific possible parent from the already processed pages
        let bestParent: PageDefinition | null = null;
        for (const potentialParent of sortedPages) {
            if (p.id === potentialParent.id) continue;

            // A valid parent's route must be a prefix of the child's route
            const isRootParent = potentialParent.route === '/';
            if (p.route.startsWith(potentialParent.route) && p.route !== potentialParent.route) {
                // Ensure it's a "whole path" prefix, not partial.
                const remainingPath = p.route.substring(potentialParent.route.length).replace(/^\//, '');
                
                // If the parent is the root ('/'), the child should not have any other slashes in its remaining path.
                // e.g., '/test' is a child of '/', but '/test/deep' is not.
                if (isRootParent && remainingPath.includes('/')) {
                    continue;
                }

                if (isRootParent || p.route.substring(potentialParent.route.length).startsWith('/')) {
                    // This is a potential parent. Is it better than the one we have?
                    if (!bestParent || potentialParent.route.length > bestParent.route.length) {
                        bestParent = potentialParent;
                    }
                }
            }
        }
        
        if (bestParent && bestParent.route !== '/') {
            const parentInMap = pageMap.get(bestParent.id);
            if (parentInMap) {
                page.parentId = parentInMap.id;
            }
        }
    });

    return Array.from(pageMap.values());
}; 