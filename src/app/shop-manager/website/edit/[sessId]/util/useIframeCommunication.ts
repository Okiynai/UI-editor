import { useState, useEffect, useCallback, useRef } from "react";
import { IframeCommunicationManager } from "../types/iframe-communication";

export function useIframeCommunication() {
    // Iframe communication manager
    const [iframeCommunicationManager, setIframeCommunicationManager] = useState<IframeCommunicationManager | null>(null);
    const [isReady, setIsReady] = useState(false);
    const managerRef = useRef<IframeCommunicationManager | null>(null);

    // Initialize iframe communication manager when iframe is ready
    const handleIframeReady = useCallback((iframe: HTMLIFrameElement) => {
        if (!iframe) {
            return;
        }

        if (managerRef.current) {
            managerRef.current.setIframe(iframe);
            return;
        }

        const manager = new IframeCommunicationManager(iframe);
        managerRef.current = manager;

        // Set up event handlers
        manager.on('READY', (payload: any) => {
            console.log('Iframe ready:', payload);
            setIsReady(true);
        });

        manager.on('ELEMENT_SELECTED', (payload: any) => {
            console.log('Element selected:', payload);
            // Handle element selection - could update sidebar/inspector
        });

        manager.on('ELEMENT_HOVERED', (payload: any) => {
            console.log('Element hovered:', payload);
            // Handle element hovering - could show tooltips
        });

        manager.on('ERROR', (payload: any) => {
            console.error('Iframe error:', payload);
        });

        manager.on('CHANGE_PAGE', (payload: any) => {
            console.log('Page changed:', payload);
        });

        setIframeCommunicationManager(manager);
    }, []);

    // Helper functions for iframe communication
    const handleInspectModeToggle = useCallback((enabled: boolean) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.toggleInspectMode(enabled);
        }
    }, [iframeCommunicationManager]);

    const handleUndo = useCallback(() => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.undo();
        }
    }, [iframeCommunicationManager]);

    const handleSaveRequest = useCallback((shopId?: string) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.save(shopId);
        }
    }, [iframeCommunicationManager]);

    const handleRedo = useCallback(() => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.redo();
        }
    }, [iframeCommunicationManager]);

    const handleSendChatContent = useCallback((type: string, content: any, targetElementId?: string) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.sendChatUpdate(type as any, content, targetElementId);
        }
    }, [iframeCommunicationManager]);

    const handleUpdatePageDefinition = useCallback((pageDefinition: any) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.updatePageDefinition(pageDefinition);
        }
    }, [iframeCommunicationManager]);

    // NEW: Site Settings Change Handler
    const handleSiteSettingsChange = useCallback((payload: any) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.sendSiteSettingsChange(payload);
        }
    }, [iframeCommunicationManager]);

    // NEW: Node Update Handlers
    const handleUpdateNode = useCallback((nodeId: string, changes: Record<string, any>) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.updateNode(nodeId, changes);
        }
    }, [iframeCommunicationManager]);


    // Helper function to update locale
    const updateLocale = useCallback((selectedLocale: string) => {
        if (iframeCommunicationManager && selectedLocale) {
            iframeCommunicationManager.changeLocale(selectedLocale);
        }
    }, [iframeCommunicationManager]);

    // Helper function to update screen size
    const updateScreenSize = useCallback((screenSize: string, resizableWidth: number) => {
        if (iframeCommunicationManager) {
            const width = screenSize === "resizable" ? resizableWidth :
                         screenSize === "desktop" ? 1200 :
                         screenSize === "tablet" ? 768 :
                         screenSize === "mobile" ? 375 : 1200;
            
            iframeCommunicationManager.updateScreenSize(width, 800, screenSize === "resizable" ? "desktop" : screenSize as any);
        }
    }, [iframeCommunicationManager]);

    // Helper function to toggle inspect mode
    const updateInspectMode = useCallback((isInspectMode: boolean) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.toggleInspectMode(isInspectMode);
        }
    }, [iframeCommunicationManager]);

    // Cleanup iframe manager on unmount
    useEffect(() => {
        return () => {
            if (managerRef.current) {
                managerRef.current.cleanup();
                managerRef.current = null;
            }
        };
    }, []);

    const handleChangePage = useCallback((pageRoute: string, shopSubdomain: string) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.changePage(pageRoute, shopSubdomain);
        }
    }, [iframeCommunicationManager]);

    const handleRejectChanges = useCallback((payload: { agentChanges: any[] | Map<string, any>; changeId: string, all?: boolean }) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.rejectChanges(payload);
        }
    }, [iframeCommunicationManager]);

    // NEW: Agent Change Action Handler
    const handleAgentChangeAction = useCallback((action: 'undo' | 'redo', actionId: string, change?: any, all?: boolean, agentChanges?: any[] | Map<string, any>) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.sendAgentChangeAction(action, actionId, change, all, agentChanges);
        }
    }, [iframeCommunicationManager]);

    // User Mode Toggle Handler
    const handleUserModeToggle = useCallback((isUserMode: boolean, user?: any) => {
        if (iframeCommunicationManager) {
            iframeCommunicationManager.toggleUserMode(isUserMode, user);
        }
    }, [iframeCommunicationManager]);

    return {
        iframeCommunicationManager,
        handleIframeReady,
        handleInspectModeToggle,
        handleUndo,
        handleRedo,
        handleSendChatContent,
        handleUpdatePageDefinition,
        updateLocale,
        updateScreenSize,
        updateInspectMode,
        handleChangePage,
        handleRejectChanges,
        handleSaveRequest,
        handleSiteSettingsChange,
        handleUpdateNode,
        handleAgentChangeAction,
        handleUserModeToggle,
        isReady,
    };
} 
