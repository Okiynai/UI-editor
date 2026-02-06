'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { LocaleProvider } from "@/OSDL/osdl/contexts/LocaleContext";
import { BreakpointProvider } from "@/OSDL/osdl/contexts/BreakpointContext";
import { UIStateProvider } from "@/OSDL/osdl/contexts/UIStateContext";
import { SiteSettingsProvider } from '@/OSDL/osdl/contexts/SiteSettingsContext';
import GlobalStyleVariablesInjector from "@/OSDL/osdl/utils/GlobalStyleVariablesInjector";
import { useSetAtom, useAtom } from 'jotai';
import OkiynaiEditorRenderer from "@/OSDL/editor/OkiynaiEditorRenderer";
import OkiynaiPageWithDataContext from "@/OSDL/osdl/OkiynaiPageWithDataContext";
import { SiteSettings } from "@/OSDL/OSDL.types";
import { IframeToParentMessage, SiteSettingsChangedPayload, ParentToIframeMessage } from "../[sessId]/types/iframe-communication";
import { currentPageIdAtom, currentPageNameAtom, AgentChange, selectedNodesAtom, hoveredNodeIdAtom } from "@/store/editor";
import { isEqual } from 'lodash';
import { handleParentMessages } from './utils/handleParentMessages';

// HOOKS
import { usePageDefinition } from './utils/hooks/usePageDefinition';
import { useFetchSiteSettings } from './utils/hooks/useFetchSiteSettings';
import { useSaveMutation } from './utils/hooks/useSaveMutation';
import { useUndoRedo } from './utils/undo-redo';

// UTILS
import createOSDLNodeUtil from './utils/osdl-node-operations/createOSDLNode';
import deleteOSDLNodeUtil from './utils/osdl-node-operations/deleteOSDLNode';
import duplicateOSDLNodeUtil from './utils/osdl-node-operations/duplicateOSDLNode';
import moveOSDLNode from './utils/osdl-node-operations/moveOSDLNode';
import applyPreBuiltSectionUtil from './utils/osdl-node-operations/applyPreBuiltSection';
import applyDiffUtil from './utils/applyDiff';
import handleSiteSettingsChangeUtil from './utils/handleSiteSettingsChange';

// Navigation Utils
import { useLinkClickInterceptor } from './utils/hooks/useLinkClickInterceptor';
import { handleInternalNavigation } from './utils/handleInternalNavigation';
import { NavigationProvider } from './utils/context/NavigationProvider';

import { processContextRequestUtil } from './utils/processContextRequest';
import Script from 'next/script';

// Read slug/route overrides saved by PageDropdown
const getStoredRouteParamsForPage = (pageId: string | null): Record<string, string> => {
  if (!pageId || typeof window === 'undefined') return {};
  try {
    const key = `okiynai-slug-settings-${pageId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && parsed.useDefault === false && parsed.overrides && typeof parsed.overrides === 'object') {
      return parsed.overrides as Record<string, string>;
    }
  } catch (e) {
    console.warn('[IframePage] Failed to read slug overrides:', e);
  }
  return {};
};

// Extract route params strictly from stored overrides (no defaults)
const extractRouteParamsFromPageDefinition = (pageDefinition: any, pageId: string | null): Record<string, string> => {
  if (!pageDefinition?.route) return {};
  const route = pageDefinition.route as string;
  const stored = getStoredRouteParamsForPage(pageId);
  const filtered: Record<string, string> = {};
  Object.keys(stored).forEach((k) => {
    if (route.includes(`[${k}]`)) {
      filtered[k] = String(stored[k]);
    }
  });
  return filtered;
};

export default function IframePage() {
  const readyRef = useRef(false);
  const hasReceivedParentMessageRef = useRef(false);
  const inFlightLoadKeyRef = useRef<string | null>(null);
  const currentLoadedRouteRef = useRef<string | null>(null);
  const lastResolvedLoadKeyRef = useRef<string | null>(null);

  const [isInspectMode, setIsInspectMode] = useState(false);
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());
  const [currentLocale, setCurrentLocale] = useState('en-US');
  const [isRTL, setIsRTL] = useState(false);
  const [userInfoOverride, setUserInfoOverride] = useState<any | undefined>(undefined);

  // Use custom hook for page definition management
  const {
    pageDefinition,
    originalPageDefinition,
    isLoading: isLoadingPageDefinition,
    error: pageDefinitionError,
    loadPage,
    setPageDefinition,
    setOriginalPageDefinition,
    updateCachedPage
  } = usePageDefinition();
  
  // Use custom hook for site settings
  const { siteSettings: originalSiteSettings, isLoading: isLoadingSiteSettings, error: siteSettingsError } = useFetchSiteSettings();
  const [editableSiteSettings, setEditableSiteSettings] = useState<SiteSettings | null>(null);
  // Baseline site settings snapshot used for dirty detection across multiple saves
  const [baselineSiteSettings, setBaselineSiteSettings] = useState<SiteSettings | null>(null);

  const [currentPageId, setCurrentPageId] = useAtom(currentPageIdAtom);
  const setCurrentPageName = useSetAtom(currentPageNameAtom);

  const setSelectedNodes = useSetAtom(selectedNodesAtom);
  const setHoveredNodeId = useSetAtom(hoveredNodeIdAtom);

  // Use the undo/redo hook
  const { addToUndoStack, setCurrentPage } = useUndoRedo({
    setPageDefinition,
    setEditableSiteSettings
  });


  // Extract route params from page definition when it changes
  const [routeParamsBump, setRouteParamsBump] = useState(0);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!currentPageId) return;
      const key = `okiynai-slug-settings-${currentPageId}`;
      if (e.key === key) setRouteParamsBump((v) => v + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [currentPageId]);

  const routeParams = useMemo(() => {
    if (!pageDefinition) return {};
    return extractRouteParamsFromPageDefinition(pageDefinition, currentPageId);
  }, [pageDefinition?.route, currentPageId, routeParamsBump]);

  useEffect(() => {
    currentLoadedRouteRef.current = pageDefinition?.route || null;
  }, [pageDefinition?.route]);

  // Use custom hook for save mutation
  const saveMutation = useSaveMutation({
    editableSiteSettings,
    pageDefinition,
    setOriginalPageDefinition,
    setEditableSiteSettings,
    setBaselineSiteSettings
  });

  // Helper to load a page with proper state updates
  const loadPageWithStateUpdates = useCallback(async (pageRoute: string, subDomain: string) => {
    const requestKey = `${subDomain}:${pageRoute}`;
    if (inFlightLoadKeyRef.current === requestKey) {
      return;
    }

    // Prevent accidental same-page reinitialization when duplicate CHANGE_PAGE arrives.
    if (currentLoadedRouteRef.current === pageRoute && lastResolvedLoadKeyRef.current === requestKey) {
      return;
    }

    inFlightLoadKeyRef.current = requestKey;
    try {
      const loadedPage = await loadPage(pageRoute, subDomain);

      console.log('[IframePage] Loaded page', loadedPage);

      // Update current page state if page definition is loaded
      if (loadedPage) {
        currentLoadedRouteRef.current = loadedPage.route;
        lastResolvedLoadKeyRef.current = requestKey;
        setCurrentPageId(loadedPage.id);
        setCurrentPageName(loadedPage.name);
        // Set the current page for undo/redo
        setCurrentPage(loadedPage.id);
      }
    } finally {
      if (inFlightLoadKeyRef.current === requestKey) {
        inFlightLoadKeyRef.current = null;
      }
    }
  }, [loadPage, setCurrentPageId, setCurrentPageName, setCurrentPage]);

  // When user edits the page, update the cache so edits are preserved
  useEffect(() => {
    if (pageDefinition && originalPageDefinition) {
      const cacheKey = pageDefinition.route;
      updateCachedPage(cacheKey, pageDefinition, originalPageDefinition);
    }
  }, [pageDefinition, originalPageDefinition, updateCachedPage]);

  // Send page definition changes to parent
  useEffect(() => {
    const now = new Date();
    const timestamp = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}:${now.getMilliseconds().toString().padStart(3, '0')}`;
    console.log(`[IframePage] Page definition changed [${timestamp}]`, pageDefinition, isLoadingPageDefinition);
    window.parent.postMessage({
      type: 'IFRAME_DATA_CHANGED',
      payload: {
        changeType: 'definition',
        data: pageDefinition ? {
          name: pageDefinition.name,
          nodes: pageDefinition.nodes
        } : null,
        state: {
          isLoading: isLoadingPageDefinition
        }
      }
    }, '*');
  }, [pageDefinition, isLoadingPageDefinition]);

  // Send site settings changes to parent
  useEffect(() => {
    if (editableSiteSettings) {
      window.parent.postMessage({
        type: 'IFRAME_DATA_CHANGED',
        payload: {
          changeType: 'settings',
          data: editableSiteSettings,
          state: {
            isLoading: isLoadingSiteSettings
          }
        }
      }, '*');
    }
  }, [editableSiteSettings, isLoadingSiteSettings]);

  // Apply diff to page definition with improved content matching
  const applyDiff = useCallback((payload: {
    diffType: 'node' | 'page' | 'site';
    targetId: string;
    propertyPath: string;
    searchValue: string;
    replaceValue: string;
    isAgentRequest?: boolean;
  }) => {
    return applyDiffUtil(payload, {
      setPageDefinition,
      setEditableSiteSettings,
      addToUndoStack
    });

  }, [setPageDefinition, setEditableSiteSettings, addToUndoStack]);

  const createOSDLNode = useCallback((node: any, parentId: string, isAgentRequest?: boolean) => {
    return createOSDLNodeUtil(node, parentId, { setPageDefinition, addToUndoStack }, isAgentRequest);
  }, [setPageDefinition, addToUndoStack]);

  const deleteOSDLNode = useCallback((nodeId: string, isAgentRequest?: boolean) => {
    console.log('this this gets called twice?');
    return deleteOSDLNodeUtil(nodeId, { setPageDefinition, addToUndoStack }, isAgentRequest);
  }, [setPageDefinition, addToUndoStack]);

  const duplicateOSDLNode = useCallback((nodeId: string) => {
    duplicateOSDLNodeUtil(nodeId, { setPageDefinition, addToUndoStack });
  }, [setPageDefinition, addToUndoStack]);

  const applyPreBuiltSection = useCallback((sectionId: string, parentId: string, name: string, order: number, isAgentRequest?: boolean) => {
    return applyPreBuiltSectionUtil(sectionId, parentId, name, order, { createOSDLNode }, isAgentRequest);
  }, [createOSDLNode]);

  const processContextRequest = useCallback((scope: string, details: any) => {
    return processContextRequestUtil(scope, details, pageDefinition, editableSiteSettings);
  }, [pageDefinition, editableSiteSettings]);

  // Handle site settings changes from parent
  const handleSiteSettingsChange = useCallback((payload: SiteSettingsChangedPayload) => {
    if (!editableSiteSettings) return null;
    return handleSiteSettingsChangeUtil(payload, { setEditableSiteSettings });
  }, [editableSiteSettings, setEditableSiteSettings]);

  const hasChanges = useMemo(() => {
    const settingsBaseline = baselineSiteSettings || originalSiteSettings;
    return !isEqual(pageDefinition, originalPageDefinition) 
    || !isEqual(editableSiteSettings, settingsBaseline);
  }, [pageDefinition, originalPageDefinition, editableSiteSettings, originalSiteSettings, baselineSiteSettings]);

  useEffect(() => {
    window.parent.postMessage({
      type: 'DIRTY_STATE',
      payload: {
        dirty: hasChanges
      }
    }, '*');
  }, [hasChanges]);

  // Initialize editable site settings when original settings are first loaded
  useEffect(() => {
    if (originalSiteSettings && !editableSiteSettings) {
      setEditableSiteSettings(originalSiteSettings);
      setBaselineSiteSettings(originalSiteSettings);
    }
  }, [originalSiteSettings, editableSiteSettings]);


  // Removed iframe-local change tracking; parent owns pending changes


  // Set up postMessage communication
  useEffect(() => {
    const handleMessage = async (event: MessageEvent<ParentToIframeMessage>) => {
      if (event.data && typeof event.data === 'object' && 'type' in event.data) {
        hasReceivedParentMessageRef.current = true;
      }
      await handleParentMessages(event, {
        setCurrentLocale,
        setIsRTL,
        setIsInspectMode,
        setPageDefinition,
        setEditingSections,
        applyDiff,
        // TODO: rename this from the function params
        loadPage: loadPageWithStateUpdates,
        createOSDLNode,
        applyPreBuiltSection,
        deleteOSDLNode,
        duplicateOSDLNode,
        handleSiteSettingsChange,
        saveMutation,
        processContextRequest,
        setSelectedNodes,
        setHoveredNodeId,
        currentPageId,
        addToUndoStack,
        setUserInfoOverride
      });
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [loadPageWithStateUpdates, applyDiff, createOSDLNode, applyPreBuiltSection, deleteOSDLNode, duplicateOSDLNode, 
    handleSiteSettingsChange, saveMutation, processContextRequest]);

  /*==============================================
   *              INITIALIZATION 
   *           & READY STATE SETUP
   *==============================================*/
  //#region INITIALIZATION & READY STATE

  // Send ready message to parent when component is ready
  useEffect(() => {
    if (readyRef.current) {
      return;
    }

    readyRef.current = true;

    const postReady = () => {
      const message: IframeToParentMessage = {
        type: 'READY',
        payload: {
          dimensions: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        },
      };
      window.parent.postMessage(message, '*');
    };

    // Initial READY
    postReady();

    // Retry READY while embedded until parent sends any message.
    if (window.parent !== window) {
      let attempts = 0;
      const maxAttempts = 20;
      const intervalId = window.setInterval(() => {
        if (hasReceivedParentMessageRef.current || attempts >= maxAttempts) {
          window.clearInterval(intervalId);
          return;
        }
        attempts += 1;
        postReady();
      }, 500);

      return () => window.clearInterval(intervalId);
    }
  }, []);

  // Fallback for standalone/demo: load a default page if parent doesn't send CHANGE_PAGE
  useEffect(() => {
    const isEmbeddedInParent = window.parent !== window;
    if (isEmbeddedInParent) {
      return;
    }

    if (!pageDefinition && !isLoadingPageDefinition) {
      const url = new URL(window.location.href);
      const siteIdParam = url.searchParams.get('siteid') || 'demo';
      // In demo mode we use a fake subdomain
      loadPageWithStateUpdates('/', siteIdParam);
    }
  }, [pageDefinition, isLoadingPageDefinition, loadPageWithStateUpdates]);

  useLinkClickInterceptor((url, _method) => {
    function isSameOrigin(url: string) {
      try {
        const link = new URL(url, window.location.origin);
        return link.origin === window.location.origin;
      } catch {
        return false;
      }
    }

    // open new tab if that's an external link
    // or handle internal navigation
    if (!isSameOrigin(url)) { window.open(url, '_blank', 'noopener'); }
    else { handleInternalNavigation(url, pageDefinition, 'push'); }

    return true;
  }, { disableNavigation: isInspectMode });

  // Add beforeunload listener to prevent navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // TODO: When adding undo/redo, add a check here: if (hasChanges || undoStack.length > 0 || redoStack.length > 0)
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted && hasChanges) {
        // TODO: Add localStorage cleanup for session recovery
        // localStorage.setItem('shop-settings-esess-recovery', 'discard');
        // localStorage.removeItem('shop-settings-esess-count');
        
        // TODO: When adding undo/redo, add a check here: if (hasChanges || undoStack.length > 0 || redoStack.length > 0)
        console.log('[IframePage] Page hidden with unsaved changes');
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      // TODO: When adding undo/redo, add a check here: if (hasChanges || undoStack.length > 0 || redoStack.length > 0)
      if (hasChanges) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) {
          // Push current state back to prevent navigation
          history.pushState(null, '', window.location.href);
          event.preventDefault();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasChanges]);

  // TODO: Additional navigation protection features
  // - Add undo/redo functionality with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  // - Add auto-save functionality with configurable intervals for indexedDB for crashes
  // - Add session recovery for crashed browser sessions
  // - Add "Save and Continue" option in confirmation dialogs
  // - Add progress indicators for save operations
  // - Add a handle to multiple tabs for builder sessions

  if (isLoadingPageDefinition || isLoadingSiteSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (pageDefinitionError || siteSettingsError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-lg">Error Loading</div>
          <div className="text-gray-600 mt-2">{pageDefinitionError || siteSettingsError}</div>
        </div>
      </div>
    );
  }

  if (!pageDefinition || !editableSiteSettings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-gray-600">Waiting for data...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      lang={currentLocale}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Add the Tailwind JIT CDN Script */}
      <Script src="https://cdn.tailwindcss.com" />

      <NavigationProvider pageDefinition={pageDefinition} devMode={true} isEditMode={true}>

        <SiteSettingsProvider
          enableDataFetching={false}
          enforcedSettings={editableSiteSettings || undefined}
        >
          <GlobalStyleVariablesInjector pageDefinition={pageDefinition} />
          <LocaleProvider initialActiveLocale={currentLocale}>
            <BreakpointProvider>
              <UIStateProvider>
                <OkiynaiPageWithDataContext pageDefinition={pageDefinition} routeParams={routeParams} userInfoOverride={userInfoOverride}>
                  <OkiynaiEditorRenderer
                    pageDefinition={pageDefinition}
                    setPageDefinition={setPageDefinition}
                    showDevInfo={false}
                    isInspectMode={isInspectMode}
                    editingSections={editingSections}
                    onDeleteNode={(id)=> {
                      console.log('top top top twice?');
                      deleteOSDLNode(id);
                    }}
                    onDuplicateNode={duplicateOSDLNode}
                    onMoveNode={(nodeId: string, direction: 'up' | 'down') => 
                      moveOSDLNode(nodeId, direction, { setPageDefinition, addToUndoStack })
                    }
                  />
                </OkiynaiPageWithDataContext>
              </UIStateProvider>
            </BreakpointProvider>
          </LocaleProvider>
        </SiteSettingsProvider>

      </NavigationProvider>
    </div>
  );
}
