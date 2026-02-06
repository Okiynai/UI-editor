"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useSession } from "@/context/Session";
import { TopBar } from "./components/TopBar/TopBar";
import { LeftSidebar } from "./components/Sidebar/LeftSidebar";
import { PreviewArea } from "./components/PreviewArea";
import { 
    getSiteSettings, 
    updateSiteSettings, 
    transformOSDLToVariables,
    getPagesForSite,
    upsertPage,
    deletePage,
    deleteSiteVariable,
} from '@/services/api/shop-manager/osdl';
import { toast } from "@/components/toast/toast";
import { 
    SidebarPanel, 
    ScreenSize,
} from "./types/builder";
import { transformBackendPagesToFrontend } from "./util/pageTransformation";
import ConfirmationModal from "./components/shared/ConfirmationModal";
import { SidePanelRenderer } from "./components/Sidebar/SidePanelRenderer";
import { IframeCommunicationProvider, useIframeCommunicationContext } from "./context/IframeCommunicationContext";
import { useSmartMaxWidth } from "./util/useSmartMaxWidth";
import { useAtom } from "jotai";
import { isInPreviewModeAtom } from "./store";

export default function BuilderPage() {
    return (
        <IframeCommunicationProvider>
            <BuilderPageContent />
        </IframeCommunicationProvider>
    );
}

import { currentPageIdAtom } from '@/store/editor';

function BuilderPageContent() {
    const params = useParams();
    const siteId = (params?.sessId as string) || 'demo';
    const { shop, isLoading: isAuthLoading } = useSession();
    const [currentPageId, setCurrentPageId] = useAtom(currentPageIdAtom);

    const queryClient = useQueryClient();
    
    // Use iframe communication context
    const { handleChangePage, isReady, iframeCommunicationManager } = useIframeCommunicationContext();
    const hasInitializedIframePageRef = useRef(false);

    // NEW: Iframe data states (single source of truth from iframe)
    const [iframeSiteSettings, setIframeSiteSettings] = useState<any>(null);
    const [iframeSiteSettingsState, setIframeSiteSettingsState] = useState({ isLoading: true, isRefetching: false });
    const [iframePageDefinition, setIframePageDefinition] = useState<any>(null);
    const [iframePageDefinitionState, setIframePageDefinitionState] = useState({ isLoading: true, isRefetching: false });

    // Set up iframe message handlers for unified data changes
    useEffect(() => {
        if (!iframeCommunicationManager) return;

        const handleIframeDataChanged = (payload: any) => {
            const { changeType, data, state } = payload;
            
            if (changeType === 'settings') {
                setIframeSiteSettings(data);
                setIframeSiteSettingsState(state);
            } else if (changeType === 'definition') {
                setIframePageDefinition(data);
                setIframePageDefinitionState(state);
            }
        };

        iframeCommunicationManager.on('IFRAME_DATA_CHANGED', handleIframeDataChanged);

        return () => {
            iframeCommunicationManager.off('IFRAME_DATA_CHANGED');
        };
    }, [iframeCommunicationManager]);


    // Add custom CSS animation for dropdown opening
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dropdownOpen {
                from {
                    opacity: 0;
                    transform: translateY(-8px) scaleY(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scaleY(1);
                }
            }
        `;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Confirmation modal state
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState({
        title: "",
        message: "",
        onConfirm: () => {},
    });

    const localesData = iframeSiteSettings?.supportedLocales ? {
        supportedLocales: iframeSiteSettings.supportedLocales,
        defaultLocale: iframeSiteSettings.defaultLocale
    } : null;
    const isLoadingLocales = iframeSiteSettingsState.isLoading;

    // Panel states - initialize with localStorage value or default to "settings"
    const [activePanel, setActivePanel] = useState<SidebarPanel>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('builderSidebarLayout');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.activePanel && ['settings', 'assets', 'layout'].includes(parsed.activePanel)) {
                        return parsed.activePanel as SidebarPanel;
                    }
                } catch (error) {
                    console.warn('Failed to parse sidebar layout from localStorage:', error);
                }
            }
        }
        return "settings"; // fallback default
    });
    const [screenSize, setScreenSize] = useState<ScreenSize>("desktop");
    
    // Page states
    const [selectedPage, setSelectedPage] = useState("/");
    
    // Sidebar width state (we need to track this for smart max width calculation)
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('builderSidebarWidth');
            return saved ? Math.min(600, Math.max(280, Number(saved))) : 600;
        }
        return 600;
    });
    
    // Resizable states
    const [resizableWidth, setResizableWidth] = useState(1024);
    
    // Use smart max width calculation
    const smartMaxWidth = useSmartMaxWidth(sidebarWidth, activePanel, screenSize);

    // Update resizable width when smart max width changes and current width exceeds it
    useEffect(() => {
        if (resizableWidth > smartMaxWidth) {
            setResizableWidth(smartMaxWidth);
        }
    }, [smartMaxWidth, resizableWidth]);

    // Save active panel to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const current = localStorage.getItem('builderSidebarWidth');
            const layoutData = {
                width: current ? Number(current) : 600,
                activePanel: activePanel
            };
            localStorage.setItem('builderSidebarLayout', JSON.stringify(layoutData));
        }
    }, [activePanel]);



    const shopId = shop?.id || '';

    // Fetch pages for the specific site (based on sessId = siteId)
    const { data: userPagesData, isLoading: isLoadingPages, isRefetching: isRefetchingPages } = useQuery({
        queryKey: ['pagesBySite', siteId],
        queryFn: () => getPagesForSite(siteId),
        enabled: !!siteId,
        select: (data) => transformBackendPagesToFrontend(data),
    });

    const handlePageChange = useCallback((pageValue: string) => {
        const page = userPagesData?.find(p => p.value === pageValue);
        if (page) {
            // Ignore redundant same-page requests to avoid accidental iframe re-initialization.
            if (page.value === selectedPage && page.realId === currentPageId) {
                return;
            }
            setSelectedPage(page.value);
            setCurrentPageId(page.realId);
            handleChangePage(page.value, shop?.subdomain || '');

            console.log(`[BuilderPage] Page changed to: ${page.label} (ID: ${page.id})`);
        }
    }, [userPagesData, setCurrentPageId, handleChangePage, shop?.subdomain, selectedPage, currentPageId]);

    useEffect(() => {
        hasInitializedIframePageRef.current = false;
    }, [siteId]);

    // Handle page changes - pass the route to iframe (including initial load)
    useEffect(() => {
        // Initialize iframe page exactly once per builder session after explicit READY.
        if (hasInitializedIframePageRef.current || !isReady || !shop || !userPagesData?.length) {
            return;
        }

        const indexPage = userPagesData.find((p) => p.id === 'index');
        const selectedPageEntry = userPagesData.find((p) => p.value === selectedPage);
        const targetPage = indexPage || selectedPageEntry || userPagesData[0];

        if (!targetPage) {
            return;
        }

        hasInitializedIframePageRef.current = true;

        setSelectedPage((prev) => (prev === targetPage.value ? prev : targetPage.value));
        setCurrentPageId((prev) => (prev === targetPage.realId ? prev : targetPage.realId));
        handleChangePage(targetPage.value, shop.subdomain || '');
    }, [userPagesData, isReady, shop, selectedPage, handleChangePage, setCurrentPageId]);

    const { mutate: upsertPageMutation, isPending: isUpsertingPage } = useMutation({
        mutationFn: (pageData: Parameters<typeof upsertPage>[1]) => upsertPage(shopId, pageData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pagesBySite', siteId] });
            queryClient.invalidateQueries({ queryKey: ['pages', shopId] });
            const action = variables.id ? 'updated' : 'created';
            toast.success(`Page successfully ${action}!`);
            // set to data.source if we are edting the page that we are on.
            // else do not change the page.
            const isEditingCurrentPage = (userPagesData?.find(p => p.value === selectedPage)?.id === data.id);
            if (isEditingCurrentPage) {
                setSelectedPage(data.route);
            }
        },
        onError: (error: any, variables) => {
            const action = variables.id ? 'update' : 'create';
            toast.error(`Failed to ${action} page: ${error.message}`);
        },
    });

    const { mutate: deletePageMutation, isPending: isDeletingPage } = useMutation({
        mutationFn: (pageId: string) => deletePage(shopId, pageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pagesBySite', siteId] });
            queryClient.invalidateQueries({ queryKey: ['pages', shopId] });
            toast.success("Page successfully deleted!");
            setSelectedPage("/"); // Reset to root page after deletion
        },
        onError: (error: any) => {
            toast.error(`Failed to delete page: ${error.message}`);
        },
    });

    const isPageActionLoading = isUpsertingPage || isDeletingPage || isRefetchingPages;

    return (
        <div className="flex flex-col bg-gray-100 overflow-hidden h-dvh" style={{ fontFamily: 'var(--font-body)' }}>
            <TopBar
                // Page props
                selectedPage={selectedPage}
                userPages={userPagesData || []}
                onPageChange={handlePageChange}
                upsertPage={upsertPageMutation}
                deletePage={deletePageMutation}
                isPageLoading={isPageActionLoading}
                
                // Locale props - from iframe site settings
                localesData={localesData}
                isLoadingLocales={isLoadingLocales}
                
                // Screen size props
                screenSize={screenSize}
                onScreenSizeChange={setScreenSize}
                onResizableWidthChange={setResizableWidth}
                maxWidth={smartMaxWidth}
                previewMaxWidth={smartMaxWidth} // Use smart max width for both modes
            />

            {/* Bottom section with sidebars and main content */}
            <div className="flex-1 flex">
                <LeftSidebar
                    activePanel={activePanel}
                    onPanelChange={setActivePanel}
                />

                {/* Secondary Sidebar Panel */}
                <SidePanelRenderer
                    activePanel={activePanel}
                    onActivePanelChange={(panel) => {
                        setActivePanel(panel as SidebarPanel);
                    }}

                    // Settings data and mutations - pass the iframe data and states
                    siteSettings={iframeSiteSettings}
                    siteSettingsState={iframeSiteSettingsState}
                    
                    // Page definition data and state for layout panel
                    pageDefinition={iframePageDefinition}
                    pageDefinitionState={iframePageDefinitionState}

                    // Pass down sidebar width setter for tracking
                    onSidebarWidthChange={setSidebarWidth}
                />

                {/* Preview Area */}
                <PreviewArea
                    screenSize={screenSize}
                    resizableWidth={resizableWidth}
                    onResizableWidthChange={setResizableWidth}
                    smartMaxWidth={smartMaxWidth}
                />
            </div>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmationProps.onConfirm}
                title={confirmationProps.title}
                message={confirmationProps.message}
                confirmText="Delete"
            />
        </div>
    );
}
