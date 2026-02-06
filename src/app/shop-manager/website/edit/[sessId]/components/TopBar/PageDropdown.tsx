import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
    ArrowLeft, 
    ArrowRight,
    ArrowUp,
    ChevronDown, 
    Search, 
    Plus, 
    Settings, 
    MoreVertical, 
    Trash2, 
    AlertTriangle, 
    Home, 
    Folder,
    FolderOpen,
    Info, 
    Loader
} from 'lucide-react';
import { Page } from '../../types/builder';
import { Tooltip } from '../shared/Tooltip';
import { PageDefinition } from '@/services/api/shop-manager/osdl';
import { UseMutateFunction } from '@tanstack/react-query';
import ConfirmationModal from '../shared/ConfirmationModal';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/toast/toast';
import { useSession } from '@/context/Session';
import {
    filterRouteParamsForRoute,
    findBestRouteMatch,
    normalizeInternalNavigationPayload,
    normalizePathname
} from '@/app/shop-manager/website/edit/shared/navigation';


// Move Into Menu Component
const MoveIntoMenu = ({
    userPages,
    currentPageId,
    onMovePage,
    onCloseMenu,
    currentParentId,
    navigationHistory,
    onNavigateBack
}: {
    userPages: Page[];
    currentPageId: string | null;
    onMovePage: (pageId: string, newParentId?: string) => void;
    onCloseMenu: () => void;
    currentParentId: string | null;
    navigationHistory: Array<{id: string | null, label: string}>;
    onNavigateBack: () => void;
}) => {
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [currentMoveParentId, setCurrentMoveParentId] = useState<string | null>(null);
    const [moveNavigationHistory, setMoveNavigationHistory] = useState<Array<{id: string | null, label: string}>>([]);
    const [moveMenuPosition, setMoveMenuPosition] = useState({ top: 0, left: 0 });
    const [openTimer, setOpenTimer] = useState<NodeJS.Timeout | null>(null);
    const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null);
    const [isHoveringButton, setIsHoveringButton] = useState(false);
    const [isHoveringMenu, setIsHoveringMenu] = useState(false);
    const moveButtonRef = useRef<HTMLButtonElement>(null);
    
    // Helper function to check if current level would be empty after moving a page
    const wouldCurrentLevelBeEmptyAfterMove = (pageIdToMove: string): boolean => {
        const currentLevelPages = userPages.filter(page => 
            currentParentId === null ? !page.parentId : page.parentId === currentParentId
        );
        const remainingPages = currentLevelPages.filter(page => page.id !== pageIdToMove);
        return remainingPages.length === 0;
    };
    
    // Get potential parent pages (exclude self and its descendants)
    const getPotentialParents = (): Page[] => {
        const isDescendant = (pageId: string, potentialAncestorId: string): boolean => {
            const page = userPages.find(p => p.id === pageId);
            if (!page || !page.parentId) return false;
            if (page.parentId === potentialAncestorId) return true;
            return isDescendant(page.parentId, potentialAncestorId);
        };
        
        // Check if current page is a slug-only page (dynamic page with empty label)
        const currentPage = userPages.find(p => p.id === currentPageId);
        const isSlugOnlyPage = currentPage && 
            currentPage.isDynamic && 
            (currentPage.label.trim() === '');
        
        return userPages.filter(page => {
            // Exclude self and its descendants
            if (page.id === currentPageId || (currentPageId ? isDescendant(page.id, currentPageId) : false)) {
                return false;
            }
            
            // ALWAYS exclude the Index and 404 pages - they're special and pages shouldn't be moved into them
            if (page.id === 'index' || page.id === '404') {
                return false;
            }
            
            return true;
        });
    };

    // Get pages at current move navigation level
    const getCurrentMoveLevelPages = (pages: Page[], parentId: string | null): Page[] => {
        if (parentId === null) {
            return pages.filter(page => !page.parentId);
        }
        return pages.filter(page => page.parentId === parentId);
    };

    // Check if a page has children that could be potential parents
    const hasValidChildren = (pageId: string): boolean => {
        const potentialParents = getPotentialParents();
        return potentialParents.some(page => page.parentId === pageId);
    };

    // Navigate into a page's children in move menu
    const navigateIntoMoveMenu = (page: Page) => {
        const currentLabel = currentMoveParentId ? 
            (userPages.find(p => p.id === currentMoveParentId)?.label || 'Unknown') : 
            'Root';
        setMoveNavigationHistory(prev => [...prev, { id: currentMoveParentId, label: currentLabel }]);
        setCurrentMoveParentId(page.id);
    };

    // Navigate back in move menu
    const navigateBackInMoveMenu = () => {
        if (moveNavigationHistory.length > 0) {
            const previousLevel = moveNavigationHistory[moveNavigationHistory.length - 1];
            setCurrentMoveParentId(previousLevel.id);
            setMoveNavigationHistory(prev => prev.slice(0, -1));
        }
    };

    // Helper function to add middle ellipsis to long paths
    const addMiddleEllipsis = (path: string, maxLength: number = 35): string => {
        if (path.length <= maxLength) return path;
        
        const startLength = Math.floor((maxLength - 3) / 2);
        const endLength = maxLength - 3 - startLength;
        
        return `${path.substring(0, startLength)}...${path.substring(path.length - endLength)}`;
    };

    // Get current move navigation path - build full path through navigation history
    const getCurrentMovePath = (): string => {
        if (!currentMoveParentId) return '/';
        
        // Build the full path from navigation history + current location
        const pathSegments: string[] = [];
        
        // Add all segments from navigation history
        for (const historyItem of moveNavigationHistory) {
            if (historyItem.id) {
                const page = userPages.find(p => p.id === historyItem.id);
                if (page) {
                    // Build segment including dynamic parts for dynamic pages
                    let segment: string;
                    if (page.isDynamic) {
                        if (page.label.trim() === '') {
                            segment = `[${page.slugName || 'id'}]`;
                        } else {
                            const nameSegment = page.label.toLowerCase().replace(/\s+/g, '-');
                            segment = `${nameSegment}/[${page.slugName || 'id'}]`;
                        }
                    } else {
                        segment = page.label.toLowerCase().replace(/\s+/g, '-');
                    }
                    pathSegments.push(segment);
                }
            }
        }
        
        // Add current move parent
        const currentPage = userPages.find(p => p.id === currentMoveParentId);
        if (currentPage) {
            // Build segment including dynamic parts for dynamic pages
            let segment: string;
            if (currentPage.isDynamic) {
                if (currentPage.label.trim() === '') {
                    segment = `[${currentPage.slugName || 'id'}]`;
                } else {
                    const nameSegment = currentPage.label.toLowerCase().replace(/\s+/g, '-');
                    segment = `${nameSegment}/[${currentPage.slugName || 'id'}]`;
                }
            } else {
                segment = currentPage.label.toLowerCase().replace(/\s+/g, '-');
            }
            pathSegments.push(segment);
        }
        
        const fullPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
        return fullPath; // Return full path for title attribute
    };

    // Get truncated move path for display
    const getTruncatedMovePath = (): string => {
        return addMiddleEllipsis(getCurrentMovePath());
    };

    const potentialParents = getPotentialParents();
    const currentPage = userPages.find(p => p.id === currentPageId);
    const allCurrentMoveLevelPages = getCurrentMoveLevelPages(potentialParents, currentMoveParentId);
    
    // Filter out pages that would lead to empty menus when clicked
    const currentMoveLevelPages = allCurrentMoveLevelPages.filter(page => {
        // Check what would be shown if we navigate into this page
        const childrenInThisPage = getCurrentMoveLevelPages(potentialParents, page.id);
        const isAlreadyInThisPage = currentPage?.parentId === page.id;
        
        // Would have "/" option? (if not already in this page)
        const wouldHaveSlashOption = !isAlreadyInThisPage;
        
        // Would have children options?
        const wouldHaveChildrenOptions = childrenInThisPage.length > 0;
        
        // Only show this page if clicking on it would show at least one option
        return wouldHaveSlashOption || wouldHaveChildrenOptions;
    });
    
    // Unified hover state management
    useEffect(() => {
        const isHoveringEither = isHoveringButton || isHoveringMenu;
        
        if (isHoveringButton && !showMoveMenu) {
            // Clear any existing timers
            if (closeTimer) {
                clearTimeout(closeTimer);
                setCloseTimer(null);
            }
            if (openTimer) {
                clearTimeout(openTimer);
            }
            
            // Start open timer
            const timer = setTimeout(() => {
                if (moveButtonRef.current) {
                    const rect = moveButtonRef.current.getBoundingClientRect();
                    setMoveMenuPosition({
                        top: rect.top,
                        left: rect.right - 4
                    });
                }
                setCurrentMoveParentId(null);
                setMoveNavigationHistory([]);
                setShowMoveMenu(true);
            }, 100);
            
            setOpenTimer(timer);
        } else if (!isHoveringEither && showMoveMenu) {
            // Clear open timer
            if (openTimer) {
                clearTimeout(openTimer);
                setOpenTimer(null);
            }
            if (closeTimer) {
                clearTimeout(closeTimer);
            }
            
            // Start close timer
            const timer = setTimeout(() => {
                setShowMoveMenu(false);
                setCurrentMoveParentId(null);
                setMoveNavigationHistory([]);
            }, 150);
            
            setCloseTimer(timer);
        } else if (isHoveringEither) {
            // Clear close timer when hovering either element
            if (closeTimer) {
                clearTimeout(closeTimer);
                setCloseTimer(null);
            }
        }
    }, [isHoveringButton, isHoveringMenu, showMoveMenu]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (openTimer) {
                clearTimeout(openTimer);
            }
            if (closeTimer) {
                clearTimeout(closeTimer);
            }
        };
    }, [openTimer, closeTimer]);
    
    // Early return after all hooks
    if (!currentPageId) return null;
    
    return (
        <>
            {/* Move into button - only show if there are valid options */}
            {potentialParents.length > 0 && (
                <button
                    ref={moveButtonRef}
                    onMouseEnter={() => {
                        setIsHoveringButton(true);
                    }}
                    onMouseLeave={() => {
                        setIsHoveringButton(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                >
                    <FolderOpen size={14} className="text-blue-600" />
                    <span className="flex-1">Move Into</span>
                    <ChevronDown size={12} className="rotate-[-90deg] text-gray-400" />
                </button>
            )}

            {/* Floating move menu */}
            {showMoveMenu && (
                <div 
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] min-w-52 max-h-80 overflow-y-auto overflow-hidden"
                    data-move-menu="true"
                    onMouseEnter={() => {
                        setIsHoveringMenu(true);
                    }}
                    onMouseLeave={() => {
                        setIsHoveringMenu(false);
                    }}
                    style={{ 
                        top: `${moveMenuPosition.top}px`,
                        left: `${moveMenuPosition.left}px`
                    }}
                >
                    {/* Navigation header - show when not at root level */}
                    {currentMoveParentId && (
                        <div className="p-3 border-b border-gray-100">
                            <button
                                onClick={navigateBackInMoveMenu}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                <span>Back</span>
                            </button>
                            <div className="mt-1 text-xs text-gray-500">
                                <span className="font-medium" title={getCurrentMovePath()}>{getTruncatedMovePath()}</span>
                            </div>
                        </div>
                    )}

                    {/* Page list */}
                    <div className="">
                        {/* Move to root level option - show when at top level and not already at root */}
                        {!currentMoveParentId && (() => {
                            const currentPage = userPages.find(p => p.id === currentPageId);
                            const isSlugOnlyPage = currentPage && 
                                currentPage.isDynamic && 
                                (currentPage.label.trim() === '');
                            const isAlreadyAtRoot = !currentPage?.parentId;
                            
                            // Show "/" option for moving to first level (unless already there or slug-only)
                            return !isSlugOnlyPage && !isAlreadyAtRoot;
                        })() && (
                            <button
                                onClick={() => {
                                    // Check if current level would be empty and navigate back if needed
                                    if (wouldCurrentLevelBeEmptyAfterMove(currentPageId) && navigationHistory.length > 0) {
                                        onNavigateBack();
                                    }
                                    
                                    // Reset hover states and close menu
                                    setIsHoveringButton(false);
                                    setIsHoveringMenu(false);
                                    setShowMoveMenu(false);
                                    setCurrentMoveParentId(null);
                                    setMoveNavigationHistory([]);
                                    
                                    onMovePage(currentPageId, undefined); // Move to root level (first level)
                                    onCloseMenu();
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                                <span className=" text-xs flex-1">/</span>
                            </button>
                        )}

                        {/* Move into current parent - only show when inside a page and not already in that parent */}
                        {currentMoveParentId && (() => {
                            // Check if current page is already directly under this parent
                            const currentPage = userPages.find(p => p.id === currentPageId);
                            const isAlreadyInThisParent = currentPage?.parentId === currentMoveParentId;
                            
                            // Show "/" option if not already in this parent (regardless of other options)
                            return !isAlreadyInThisParent;
                        })() && (
                            <button
                                onClick={() => {
                                    // Check if current level would be empty and navigate back if needed
                                    if (wouldCurrentLevelBeEmptyAfterMove(currentPageId) && navigationHistory.length > 0) {
                                        onNavigateBack();
                                    }
                                    
                                    // Reset hover states and close menu
                                    setIsHoveringButton(false);
                                    setIsHoveringMenu(false);
                                    setShowMoveMenu(false);
                                    setCurrentMoveParentId(null);
                                    setMoveNavigationHistory([]);
                                    
                                    onMovePage(currentPageId, currentMoveParentId); // Move into the current parent
                                    onCloseMenu();
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                                <span className=" text-xs flex-1">/</span>
                            </button>
                        )}

                        {/* Available pages to move into */}
                        {currentMoveLevelPages.map((page) => {
                            // Helper function to get proper display name for move menu (showing actual URL format)
                            const getMoveDisplayName = (page: Page): string => {
                                if (page.id === 'index') return '/';
                                
                                // For slug-only pages, show /[slugName]
                                if (page.isDynamic && page.label.trim() === '') {
                                    return `/[${page.slugName || 'id'}]`;
                                }
                                
                                // For regular dynamic pages, show /name/[slug] (URL format)
                                if (page.isDynamic) {
                                    return `/${page.label.toLowerCase().replace(/\s+/g, '-')}/[${page.slugName || 'id'}]`;
                                }
                                
                                // For regular pages, show /name (URL format)
                                return `/${page.label.toLowerCase().replace(/\s+/g, '-')}`;
                            };

                            return (
                                <button
                                    key={page.id}
                                    onClick={() => {
                                        if (hasValidChildren(page.id)) {
                                            navigateIntoMoveMenu(page);
                                        } else {
                                            // Check if current level would be empty and navigate back if needed
                                            if (wouldCurrentLevelBeEmptyAfterMove(currentPageId) && navigationHistory.length > 0) {
                                                onNavigateBack();
                                            }
                                            
                                            // Reset hover states and close menu
                                            setIsHoveringButton(false);
                                            setIsHoveringMenu(false);
                                            setShowMoveMenu(false);
                                            setCurrentMoveParentId(null);
                                            setMoveNavigationHistory([]);
                                            
                                            onMovePage(currentPageId, page.id);
                                            onCloseMenu();
                                        }
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                >
                                    <span className=" text-xs flex-1">
                                        {getMoveDisplayName(page)}
                                    </span>
                                    {hasValidChildren(page.id) && (
                                        <ChevronDown size={12} className="rotate-[-90deg] text-gray-400" />
                                    )}
                                </button>
                            );
                        })}

                        {(() => {
                            // Check if we have any options at all (including "/" options)
                            const currentPage = userPages.find(p => p.id === currentPageId);
                            const isSlugOnlyPage = currentPage && currentPage.isDynamic && (currentPage.label.trim() === '');
                            const isAlreadyAtRoot = !currentPage?.parentId;
                            const isAlreadyInThisParent = currentMoveParentId && currentPage?.parentId === currentMoveParentId;
                            
                            const hasRootOption = !currentMoveParentId && !isSlugOnlyPage && !isAlreadyAtRoot;
                            const hasParentOption = currentMoveParentId && !isAlreadyInThisParent;
                            const hasPageOptions = currentMoveLevelPages.length > 0;
                            
                            const noOptionsAtAll = !hasRootOption && !hasParentOption && !hasPageOptions;
                            
                            return noOptionsAtAll && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No valid destinations available
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
                 </>
     );
};

// Specialized Page Dropdown Component
export const PageDropdown = ({ 
    selectedPage, 
    userPages: rawUserPages, 
    onPageChange,
    upsertPage,
    deletePage,
    isLoading,
    className = ""
}: { 
    selectedPage: string;
    userPages: Page[];
    onPageChange: (value: string) => void;
    upsertPage: UseMutateFunction<PageDefinition, any, Partial<Omit<PageDefinition, "id">> & { id?: string | undefined; }, unknown>;
    deletePage: UseMutateFunction<{ success: boolean, message: string }, any, string, unknown>;
    isLoading?: boolean;
    className?: string;
}) => {
    const rootPage = "/";

    const { shop } = useSession();
    const queryClient = useQueryClient();

    const [isOpen, setIsOpen] = useState(false);
    const [showAddMode, setShowAddMode] = useState(false);
    const [showEditMode, setShowEditMode] = useState(false);
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [newPageName, setNewPageName] = useState("");
    const [editPageName, setEditPageName] = useState("");
    const [isDynamicPage, setIsDynamicPage] = useState(false);
    const [isEditDynamicPage, setIsEditDynamicPage] = useState(false);
    const [isFolderPage, setIsFolderPage] = useState(false);
    const [isEditFolderPage, setIsEditFolderPage] = useState(false);
    const [newSlugName, setNewSlugName] = useState("id");
    const [editSlugName, setEditSlugName] = useState("id");
    const [addingAsChildOf, setAddingAsChildOf] = useState<string | undefined>(undefined);
    const [showPageMenu, setShowPageMenu] = useState<string | null>(null);
    const [pageMenuPosition, setPageMenuPosition] = useState({ top: 0, left: 0 });
    const [currentParentId, setCurrentParentId] = useState<string | null>(null); // For navigation hierarchy
    const [navigationHistory, setNavigationHistory] = useState<Array<{id: string | null, label: string}>>([]);
    
    // Navigation history stack for tracking page changes
    const [pageNavigationHistory, setPageNavigationHistory] = useState<Array<{
        pageId: string;
        pageName: string;
        timestamp: number;
    }>>([]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
    
    const [isInImmunityPeriod, setIsInImmunityPeriod] = useState(false);
    const [immunityTimer, setImmunityTimer] = useState<NodeJS.Timeout | null>(null);
    const [redirectTargetName, setRedirectTargetName] = useState("");
    const [useIndexAsHomepage, setUseIndexAsHomepage] = useState(true);
    const [pageToDelete, setPageToDelete] = useState<string | null>(null);


    // Slug settings state
    const [showSlugSettings, setShowSlugSettings] = useState(false);
    const [slugSettingsPosition, setSlugSettingsPosition] = useState({ top: 0, left: 0 });
    const [slugSettingsForm, setSlugSettingsForm] = useState<{
        useDefault: boolean;
        overrides: { [key: string]: string };
    }>({
        useDefault: true,
        overrides: {}
    });
    
    // Temporary slug settings for route params (not persisted)
    const [tempSlugSettings, setTempSlugSettings] = useState<{
        [pageId: string]: {
            useDefault: boolean;
            overrides: { [key: string]: string };
        };
    }>({});

    // localStorage key for slug settings
    const getSlugSettingsKey = (pageId: string) => `okiynai-slug-settings-${pageId}`;
    
    // Helper function to clear localStorage settings for a page
    const clearSlugSettings = (pageId: string) => {
        try {
            const localStorageKey = getSlugSettingsKey(pageId);
            localStorage.removeItem(localStorageKey);
            console.log('Cleared slug settings for page:', pageId);
        } catch (error) {
            console.error('Error clearing slug settings from localStorage:', error);
        }
    };

    // Extract the first path segment from a string.
    // Example: "/products/sale" => "products"; "products" => "products"; "products/sale" => "products"
    const getFirstPathSegment = useCallback((value: string): string => {
        const trimmed = (value || '').trim().replace(/^\/+/, '');
        const slashIdx = trimmed.indexOf('/');
        return slashIdx === -1 ? trimmed : trimmed.slice(0, slashIdx);
    }, []);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const userPages = useMemo(() => {
        const pages = [...rawUserPages];
        const indexPage = pages.find((p: Page) =>
            p.id === 'index' ||
            p.label.toLowerCase() === 'index' ||
            (p.pageType === 'system' && p.value === '/')
        );
        if (indexPage) {
            // Only set realId if it doesn't already exist (preserve the original database ID)
            if (!indexPage.realId) {
                indexPage.realId = indexPage.id;
            }
            indexPage.id = 'index';
        }

        const notFoundPage = pages.find((p: Page) => p.label.toLowerCase() === '404');
        if (notFoundPage) {
            // Only set realId if it doesn't already exist (preserve the original database ID)
            if (!notFoundPage.realId) {
                notFoundPage.realId = notFoundPage.id;
            }
            notFoundPage.id = '404';
        }
        return pages;
    }, [rawUserPages]);

    // Navigation history management functions
    const addToPageHistory = useCallback((pageId: string, pageName: string) => {
        const lastEntry = pageNavigationHistory[pageNavigationHistory.length - 1];
        if (lastEntry?.pageId === pageId) {
            return;
        }

        const newEntry = {
            pageId,
            pageName,
            timestamp: Date.now()
        };
        
        // Remove any entries after current index (if navigating back then to new page)
        const updatedHistory = pageNavigationHistory.slice(0, currentHistoryIndex + 1);
        updatedHistory.push(newEntry);
        
        setPageNavigationHistory(updatedHistory);
        setCurrentHistoryIndex(updatedHistory.length - 1);
        
        console.log(`[PageDropdown] Added to history: ${pageName} (${pageId}) at index ${updatedHistory.length - 1}`);
    }, [pageNavigationHistory, currentHistoryIndex]);

    const navigateToHistoryEntry = useCallback((targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= pageNavigationHistory.length) {
            console.log(`[PageDropdown] Invalid history index: ${targetIndex}`);
            return false;
        }
        
        const targetEntry = pageNavigationHistory[targetIndex];
        const targetPage = userPages.find(p => p.id === targetEntry.pageId);
        
        if (!targetPage) {
            console.log(`[PageDropdown] Page no longer exists: ${targetEntry.pageName} (${targetEntry.pageId})`);
            
            // Remove the deleted page from history
            const updatedHistory = pageNavigationHistory.filter((_, index) => index !== targetIndex);
            setPageNavigationHistory(updatedHistory);
            
            // Adjust current index if needed
            if (currentHistoryIndex >= updatedHistory.length) {
                setCurrentHistoryIndex(Math.max(0, updatedHistory.length - 1));
            } else if (currentHistoryIndex > targetIndex) {
                setCurrentHistoryIndex(currentHistoryIndex - 1);
            }
            
            toast.error(
                `The page "${targetEntry.pageName}" no longer exists and has been removed from navigation history.`,
                {
                    position: "top-right",
                    autoClose: 4000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                }
            );
            return false;
        }
        
        console.log(`[PageDropdown] Navigating to history entry: ${targetEntry.pageName} (${targetEntry.pageId}) at index ${targetIndex}`);
        onPageChange(targetPage.value);
        setCurrentHistoryIndex(targetIndex);
        return true;
    }, [pageNavigationHistory, userPages, onPageChange, currentHistoryIndex]);

    const navigateBackInHistory = useCallback(() => {
        if (currentHistoryIndex > 0) {
            return navigateToHistoryEntry(currentHistoryIndex - 1);
        }
        return false;
    }, [currentHistoryIndex, navigateToHistoryEntry]);

    const navigateForwardInHistory = useCallback(() => {
        if (currentHistoryIndex < pageNavigationHistory.length - 1) {
            return navigateToHistoryEntry(currentHistoryIndex + 1);
        }
        return false;
    }, [currentHistoryIndex, pageNavigationHistory.length, navigateToHistoryEntry]);





    // Initialize history with current page if history is empty
    useEffect(() => {
        if (pageNavigationHistory.length === 0 && selectedPage) {
            const currentPage = userPages.find(p => p.value === selectedPage);
            if (currentPage) {
                addToPageHistory(currentPage.id, currentPage.label);
            }
        }
    }, [selectedPage, userPages, pageNavigationHistory.length, addToPageHistory]);

    // Track previous page to detect actual navigation
    const [previousPage, setPreviousPage] = useState<string | null>(null);
    
    // Clear temp slug settings only when navigating to a different page
    useEffect(() => {
        if (selectedPage && selectedPage !== previousPage) {
            // We've navigated to a different page
            if (previousPage) {
                const previousPageObj = userPages.find(p => p.value === previousPage);
                if (previousPageObj && tempSlugSettings[previousPageObj.id]) {
                    // Clear temp settings for the previous page
                    console.log(`[PageDropdown] Clearing temp slug settings for previous page: ${previousPageObj.id}`);
                    setTempSlugSettings(prev => {
                        const newTemp = { ...prev };
                        delete newTemp[previousPageObj.id];
                        return newTemp;
                    });
                }
            }
            setPreviousPage(selectedPage);
        } else if (selectedPage && !previousPage) {
            // Initial page load
            setPreviousPage(selectedPage);
        }
    }, [selectedPage, userPages, tempSlugSettings, previousPage]);

    // Listen for internal navigation messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, payload } = event.data || {};
            if (type === 'INTERNAL_NAVIGATION') {
                const normalizedPayload = normalizeInternalNavigationPayload(payload);
                const { navigationType } = normalizedPayload;

                console.log('Handling internal navigation from iframe:', normalizedPayload);

                if (navigationType === 'back') {
                    if (navigateBackInHistory()) {
                        console.log(`[PageDropdown] Internal navigation (back) - navigated back in history`);
                    } else {
                        console.log(`[PageDropdown] Internal navigation (back) - no history to go back to`);
                    }
                    return;
                }

                if (navigationType === 'forward') {
                    if (navigateForwardInHistory()) {
                        console.log(`[PageDropdown] Internal navigation (forward) - navigated forward in history`);
                    } else {
                        console.log(`[PageDropdown] Internal navigation (forward) - no history to go forward to`);
                    }
                    return;
                }

                const fallbackTarget = `${window.location.origin}${selectedPage || '/'}`;
                const targetUrl = normalizedPayload.url || fallbackTarget;
                const pathname = normalizePathname(targetUrl);
                const matchedRoute = findBestRouteMatch(userPages, pathname, (page) => page.value);

                const matchingPage = matchedRoute?.entry;

                if (matchingPage) {
                    const routeParamsToStore =
                        filterRouteParamsForRoute(matchingPage.value, normalizedPayload.routeParams) ||
                        (matchedRoute?.routeParams && Object.keys(matchedRoute.routeParams).length > 0 ? matchedRoute.routeParams : undefined);

                    if (routeParamsToStore) {
                        console.log(`[PageDropdown] Persisting route params to localStorage and temp slug settings:`, routeParamsToStore);
                        // Persist to localStorage immediately for this page
                        try {
                            const localStorageKey = getSlugSettingsKey(matchingPage.id);
                            const settingsToSave = {
                                useDefault: false,
                                overrides: routeParamsToStore
                            };
                            localStorage.setItem(localStorageKey, JSON.stringify(settingsToSave));
                        } catch (error) {
                            console.error('Error saving slug settings from internal navigation to localStorage:', error);
                        }
                        // Also keep temp state in sync for current session UX
                        setTempSlugSettings(prev => ({
                            ...prev,
                            [matchingPage.id]: {
                                useDefault: false,
                                overrides: routeParamsToStore
                            }
                        }));
                    }
                    
                    // Handle different navigation types
                    switch (navigationType) {
                        case 'push':
                            // Add to navigation history and change page
                            addToPageHistory(matchingPage.id, matchingPage.label);
                            onPageChange(matchingPage.value);
                            console.log(`[PageDropdown] Internal navigation (push) to: ${matchingPage.label} (ID: ${matchingPage.id})`);
                            break;
                            
                        case 'replace':
                            // Replace current history entry instead of adding new one
                            if (currentHistoryIndex >= 0 && currentHistoryIndex < pageNavigationHistory.length) {
                                const updatedHistory = [...pageNavigationHistory];
                                updatedHistory[currentHistoryIndex] = {
                                    pageId: matchingPage.id,
                                    pageName: matchingPage.label,
                                    timestamp: Date.now()
                                };
                                setPageNavigationHistory(updatedHistory);
                            } else {
                                // If no history, just add normally
                                addToPageHistory(matchingPage.id, matchingPage.label);
                            }
                            onPageChange(matchingPage.value);
                            console.log(`[PageDropdown] Internal navigation (replace) to: ${matchingPage.label} (ID: ${matchingPage.id})`);
                            break;

                        case 'reload':
                            // Reload current page - just trigger page change without history modification
                            onPageChange(matchingPage.value);
                            console.log(`[PageDropdown] Internal navigation (reload) - reloaded: ${matchingPage.label} (ID: ${matchingPage.id})`);
                            
                            // Show toast to inform user about reload limitations in editor
                            toast.info(
                                "Reload functionality may not work optimally in the editor. For best results, use the page dropdown to navigate.",
                                {
                                    position: "top-right",
                                    autoClose: 4000,
                                    hideProgressBar: false,
                                    closeOnClick: true,
                                    pauseOnHover: true,
                                    draggable: true,
                                }
                            );
                            break;
                            
                        default:
                            // Default to push behavior
                            addToPageHistory(matchingPage.id, matchingPage.label);
                            onPageChange(matchingPage.value);
                            console.log(`[PageDropdown] Internal navigation (default) to: ${matchingPage.label} (ID: ${matchingPage.id})`);
                    }
                } else {
                    console.log(`[PageDropdown] No matching page found for URL: ${targetUrl}`);
                    
                    // Show toast notification to user
                    toast.info(
                        `No page found for "${pathname}". Consider creating this page from the pages dropdown menu.`,
                        {
                            position: "top-right",
                            autoClose: 4000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true,
                        }
                    );
                }
            }
        };

        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [userPages, onPageChange, addToPageHistory, navigateBackInHistory, navigateForwardInHistory, currentHistoryIndex, pageNavigationHistory, selectedPage]);


    const indexPage = userPages.find((p: Page) => p.id === 'index');
    const indexRedirectTarget = indexPage?.systemPageProps?.redirect || null;

    // Helper function to get pages at current navigation level
    const getCurrentLevelPages = (pages: Page[], parentId: string | null): Page[] => {
        // Handle root level: both null and undefined should match
        if (parentId === null) {
            return pages.filter(page => !page.parentId); // undefined or null
        }
        return pages.filter(page => page.parentId === parentId);
    };

    // Helper function to check if a page has children
    const hasChildren = (pageId: string, pages: Page[]): boolean => {
        return pages.some(page => page.parentId === pageId);
    };

    // Helper: display the immediate segment relative to current level
    const getPageDisplayName = (page: Page): string => {
        // Root displayed as '/'
        if (page.value === '/') return '/';

        // Determine base route for current level
        let baseRoute = '/';
        if (currentParentId) {
            const parentPage = userPages.find(p => p.id === currentParentId);
            if (parentPage) baseRoute = parentPage.value || '/';
        }

        // Compute relative path by stripping the base route prefix
        const stripPrefix = (path: string, prefix: string) => {
            if (!prefix || prefix === '/') return path;
            if (path.startsWith(prefix)) return path.slice(prefix.length);
            return path; // fallback
        };

        let relative = stripPrefix(page.value || '', baseRoute);
        relative = relative.replace(/^\//, ''); // drop any leading '/'

        // Show only the immediate segment for this level
        const firstSlash = relative.indexOf('/');
        const segment = firstSlash === -1 ? relative : relative.slice(0, firstSlash);

        // For dynamic pages, append slug visibly
        if (page.isDynamic) {
            const slug = page.slugName || 'id';
            if (!segment) return `[${slug}]`;
            return `${segment}/[${slug}]`;
        }

        return segment;
    };

    // Helper function to start immunity period
    const startImmunityPeriod = () => {
        // Clear any existing immunity timer
        if (immunityTimer) {
            clearTimeout(immunityTimer);
        }
        
        setIsInImmunityPeriod(true);
        
        const timer = setTimeout(() => {
            setIsInImmunityPeriod(false);
            setImmunityTimer(null);
        }, 500); // 500ms immunity period
        
        setImmunityTimer(timer);
    };

    // Helper function to navigate into a page's children
    const navigateIntoPage = (page: Page) => {
        const currentLabel = currentParentId ? 
            (userPages.find(p => p.id === currentParentId)?.label || 'Unknown') : 
            'Root';
        setNavigationHistory(prev => [...prev, { id: currentParentId, label: currentLabel }]);
        setCurrentParentId(page.id);
        setSearchTerm("");
        
        // Start immunity period after navigation
        startImmunityPeriod();
    };

    // Helper function to navigate back
    const navigateBack = () => {
        if (navigationHistory.length > 0) {
            const previousLevel = navigationHistory[navigationHistory.length - 1];
            setCurrentParentId(previousLevel.id);
            setNavigationHistory(prev => prev.slice(0, -1));
            setSearchTerm("");
            
            // Start immunity period after navigation
            startImmunityPeriod();
        }
    };

    const breadcrumbItems = useMemo(() => {
        const items = [...navigationHistory];
        if (currentParentId) {
            const currentPage = userPages.find(p => p.id === currentParentId);
            items.push({ id: currentParentId, label: currentPage?.label || 'Unknown' });
        }
        if (items.length === 0) {
            return [{ id: null, label: 'Root' }];
        }
        return items;
    }, [currentParentId, navigationHistory, userPages]);

    const handleBreadcrumbClick = useCallback((crumbId: string | null, index: number) => {
        setCurrentParentId(crumbId);
        setNavigationHistory(breadcrumbItems.slice(0, index));
        setSearchTerm("");
        startImmunityPeriod();
    }, [breadcrumbItems]);

    // Helper function to build URL path from page hierarchy
    const buildPathFromPage = (pageId: string, pages: Page[]): string => {
        const page = pages.find(p => p.id === pageId);
        if (!page) return '/unknown';
        
        // If this is a root page, return its value
        if (!page.parentId) {
            return page.value;
        }
        
        // Otherwise, build path recursively
        const parentPath = buildPathFromPage(page.parentId, pages);
        
        // Build current segment - include both name and dynamic parts for dynamic pages
        let currentSegment: string;
        if (page.isDynamic) {
            // For slug-only pages (empty label), just show the slug
            if (page.label.trim() === '') {
                currentSegment = `[${page.slugName || 'id'}]`;
            } else {
                // For named dynamic pages, show both name and slug
                const nameSegment = page.label.toLowerCase().replace(/\s+/g, '-');
                currentSegment = `${nameSegment}/[${page.slugName || 'id'}]`;
            }
        } else {
            // Regular pages just use the label
            currentSegment = page.label.toLowerCase().replace(/\s+/g, '-');
        }
            
        return parentPath === '/' ? `/${currentSegment}` : `${parentPath}/${currentSegment}`;
    };

    // Helper function to add middle ellipsis to long paths (same as in MoveIntoMenu)
    const addMiddleEllipsis = (path: string, maxLength: number = 35): string => {
        if (path.length <= maxLength) return path;
        
        const startLength = Math.floor((maxLength - 3) / 2);
        const endLength = maxLength - 3 - startLength;
        
        return `${path.substring(0, startLength)}...${path.substring(path.length - endLength)}`;
    };

    // Helper function to get current navigation path (full path for title)
    const getCurrentPath = (): string => {
        if (!currentParentId) return '/';
        return buildPathFromPage(currentParentId, userPages);
    };

    // Get truncated path for display
    const getTruncatedPath = (): string => {
        return addMiddleEllipsis(getCurrentPath());
    };

    // Validation for URL-compliant page names
    const validatePageName = (name: string) => {
        // Allow letters, numbers, spaces, and hyphens only
        const validPattern = /^[a-zA-Z0-9\s-]*$/;
        return validPattern.test(name);
    };

    const validateSlugName = (name: string) => {
        // Slug names should be more restrictive - letters, numbers, underscores
        const validPattern = /^[a-zA-Z0-9_]*$/;
        return validPattern.test(name);
    };

    const getInvalidCharacters = (name: string) => {
        const invalidChars = name.match(/[^a-zA-Z0-9\s-]/g);
        return invalidChars ? [...new Set(invalidChars)].join(', ') : '';
    };

    const getInvalidSlugCharacters = (name: string) => {
        const invalidChars = name.match(/[^a-zA-Z0-9_]/g);
        return invalidChars ? [...new Set(invalidChars)].join(', ') : '';
    };

    // Check if a page would be just a slug (not allowed in root)
    const isJustSlug = (pageName: string, isDynamic: boolean, parentId?: string) => {
        const trimmedName = pageName.trim().toLowerCase();
        // Only check for root level pages
        if (parentId !== undefined) return false;
        // Check if it's dynamic and the name would result in just a slug
        return isDynamic && trimmedName === '';
    };

    // Check if the selected page has a slug part in its route
    const selectedPageHasSlug = (): boolean => {
        return selectedPage.includes('[') && selectedPage.includes(']');
    };

    // Check for duplicate page names within the same parent
    const checkDuplicateName = (name: string, parentId?: string, excludePage?: Page) => {
        const trimmedName = name.trim().toLowerCase();
        
        // Don't allow empty names
        if (trimmedName === '') return true;
        
        // Check for duplicate pages at the same level
        return userPages.some((page: Page) => {
            if (excludePage && page.id === excludePage.id) return false;
            if (page.parentId !== parentId) return false;
            return page.label.toLowerCase() === trimmedName;
        });
    };

    const addFormDuplicate = newPageName.trim() && checkDuplicateName(newPageName, addingAsChildOf);
    const editFormDuplicate = editPageName.trim() && editingPage && checkDuplicateName(editPageName, editingPage.parentId, editingPage);
    const addFormJustSlug = isJustSlug(newPageName, isDynamicPage, addingAsChildOf);
    const editFormJustSlug = editingPage && isJustSlug(editPageName, isEditDynamicPage, editingPage.parentId);

    const isAddFormValid = (newPageName.trim() || (isDynamicPage && addingAsChildOf !== undefined)) && 
                           (newPageName.trim() === '' || validatePageName(newPageName)) && 
                           !addFormDuplicate && !addFormJustSlug &&
                           (!isDynamicPage || (newSlugName.trim() && validateSlugName(newSlugName)));
    const isEditFormValid = (editPageName.trim() || (isEditDynamicPage && editingPage?.parentId !== undefined)) && 
                           (editPageName.trim() === '' || validatePageName(editPageName)) && 
                           !editFormDuplicate && !editFormJustSlug &&
                           (!isEditDynamicPage || (editSlugName.trim() && validateSlugName(editSlugName)));

    const addFormInvalidChars = getInvalidCharacters(newPageName);
    const editFormInvalidChars = getInvalidCharacters(editPageName);
    const addSlugInvalidChars = getInvalidSlugCharacters(newSlugName);
    const editSlugInvalidChars = getInvalidSlugCharacters(editSlugName);

    // Generate URL preview 
    const generateUrlPreview = (pageName: string, isDynamic: boolean, slugName: string = 'id') => {
        const trimmedName = pageName.trim().toLowerCase();
        
        // Handle slug-only pages (empty name but dynamic)
        if (trimmedName === '' && isDynamic) {
            return `/[${slugName}]`;
        }
        
        // Don't show preview for empty names (non-dynamic)
        if (trimmedName === '') return '';
        
        // Handle regular pages
        const slug = trimmedName.replace(/\s+/g, '-');
        return isDynamic ? `/${slug}/[${slugName}]` : `/${slug}`;
    };

    // Get current level pages and filter them
    const currentLevelPages = getCurrentLevelPages(userPages, currentParentId);
    const filteredUserPages = searchTerm 
        ? userPages.filter((page: Page) =>
            page.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.label.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : currentLevelPages;
    
    // Sort pages so that home is first, 404 is last, and the rest are alphabetical
    const sortedFilteredPages = filteredUserPages.sort((a: Page, b: Page) => {
        const isAIndex = a.id === 'index';
        const isBIndex = b.id === 'index';
        const isA404 = a.id === '404';
        const isB404 = b.id === '404';

        if (isAIndex) return -1; // a is index, should be first
        if (isBIndex) return 1;  // b is index, should be first

        if (isA404) return 1;   // a is 404, should be last
        if (isB404) return -1;  // b is 404, should be last
        
        // For all other pages, sort alphabetically by label
        return a.label.localeCompare(b.label);
    });

    const currentPage = userPages.find((page: Page) => page.value === selectedPage) || userPages[0];

    // Slug settings helper functions
    const getCurrentPageSlugs = (): string[] => {
        if (!currentPage || !currentPage.isDynamic) return [];
        
        // For now, we'll assume single slug, but this can be extended for multiple slugs
        const slugName = currentPage.slugName || 'id';
        return [slugName];
    };

    const initializeSlugSettings = () => {
        if (!currentPage || !currentPage.isDynamic) return;
        
        const slugs = getCurrentPageSlugs();
        
        // Check for temp settings first
        const tempSettings = tempSlugSettings[currentPage.id];
        let finalSettings = null;
        
        if (tempSettings) {
            // Use temp settings if they exist
            finalSettings = tempSettings;
            console.log(`[PageDropdown] Using temp slug settings for ${currentPage.id}:`, tempSettings);
            
            // Don't remove temp settings here - they'll be cleared when navigating to a different page
        } else {
            // Try to load from localStorage
            const localStorageKey = getSlugSettingsKey(currentPage.id);
            let savedSettings = null;
            
            try {
                const saved = localStorage.getItem(localStorageKey);
                if (saved) {
                    savedSettings = JSON.parse(saved);
                }
            } catch (error) {
                console.error('Error loading slug settings from localStorage:', error);
            }
            
            // Use localStorage settings if available, otherwise fall back to page settings
            const existingOverrides = savedSettings?.overrides || currentPage.systemPageProps?.slugOverrides || {};
            const useDefault = savedSettings?.useDefault ?? !Object.keys(existingOverrides).length;
            
            finalSettings = {
                useDefault,
                overrides: existingOverrides
            };
        }
        
        setSlugSettingsForm(finalSettings);
    };

    const handleSlugOverrideChange = (slugName: string, value: string) => {
        setSlugSettingsForm(prev => {
            const newOverrides = { ...prev.overrides };
            if (value.trim() === '') {
                delete newOverrides[slugName];
            } else {
                newOverrides[slugName] = value.trim();
            }
            
            // If user starts typing, turn off default
            const newUseDefault = Object.keys(newOverrides).length === 0;
            
            const newForm = {
                useDefault: newUseDefault,
                overrides: newOverrides
            };
            
            // Save to localStorage immediately
            if (currentPage) {
                const localStorageKey = getSlugSettingsKey(currentPage.id);
                try {
                    localStorage.setItem(localStorageKey, JSON.stringify(newForm));
                } catch (error) {
                    console.error('Error saving slug settings to localStorage:', error);
                }
            }
            
            return newForm;
        });
    };

    const handleDefaultToggle = (useDefault: boolean) => {
        setSlugSettingsForm(prev => {
            const newForm = {
                useDefault,
                overrides: useDefault ? {} : prev.overrides
            };
            
            // Save to localStorage immediately
            if (currentPage) {
                const localStorageKey = getSlugSettingsKey(currentPage.id);
                try {
                    localStorage.setItem(localStorageKey, JSON.stringify(newForm));
                } catch (error) {
                    console.error('Error saving slug settings to localStorage:', error);
                }
            }
            
            return newForm;
        });
    };

    const validateSlugValue = (value: string) => {
        const invalidChars = value.match(/[^a-zA-Z0-9_-]/g);
        return !invalidChars;
    };

    const getInvalidSlugValueCharacters = (value: string) => {
        const invalidChars = value.match(/[^a-zA-Z0-9_-]/g);
        return invalidChars ? [...new Set(invalidChars)].join(', ') : '';
    };

    const saveSlugSettings = () => {
        if (!currentPage) return;
        
        // Validate that all slugs are filled and valid if not using default
        if (!slugSettingsForm.useDefault) {
            const slugs = getCurrentPageSlugs();
            const hasEmptySlugs = slugs.some(slugName => !slugSettingsForm.overrides[slugName]?.trim());
            const hasInvalidSlugs = slugs.some(slugName => {
                const value = slugSettingsForm.overrides[slugName]?.trim();
                return value && !validateSlugValue(value);
            });
            
            if (hasEmptySlugs || hasInvalidSlugs) {
                // Don't save, validation will be shown
                return;
            }
        }
        
        // Save to localStorage
        const localStorageKey = getSlugSettingsKey(currentPage.id);
        try {
            const settingsToSave = {
                useDefault: slugSettingsForm.useDefault,
                overrides: slugSettingsForm.overrides
            };
            localStorage.setItem(localStorageKey, JSON.stringify(settingsToSave));
            console.log('Slug settings saved to localStorage:', settingsToSave);
        } catch (error) {
            console.error('Error saving slug settings to localStorage:', error);
        }
        
        setShowSlugSettings(false);
    };

    // Helper function to check if current level would be empty after deleting a page
    const wouldCurrentLevelBeEmptyAfterDelete = (pageIdToDelete: string): boolean => {
        const currentLevelPages = getCurrentLevelPages(userPages, currentParentId);
        const remainingPages = currentLevelPages.filter(page => page.id !== pageIdToDelete);
        return remainingPages.length === 0;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Don't close if clicking on the fixed page menu, move menu, or slug settings panel
                const target = event.target as HTMLElement;
                if (target.closest('[data-page-menu]') || target.closest('[data-move-menu]') || target.closest('.fixed') || target.closest('[data-slug-settings]')) {
                    return;
                }
                
                // Close slug settings panel when clicking outside
                setShowSlugSettings(false);
                
                // Don't close if we're in immunity period
                if (isInImmunityPeriod) {
                    return;
                }
                
                // Reset all state when clicking outside
                setIsOpen(false);
                setShowAddMode(false);
                setShowEditMode(false);
                setShowSlugSettings(false);
                setSearchTerm("");
                setNewPageName("");
                setEditPageName("");
                setNewSlugName("id");
                setEditSlugName("id");
                setIsDynamicPage(false);
                setIsEditDynamicPage(false);
                setEditingPage(null);
                setAddingAsChildOf(undefined);
                setShowPageMenu(null);
                setCurrentParentId(null);
                setNavigationHistory([]);
                
                // Clear immunity timer if closing
                if (immunityTimer) {
                    clearTimeout(immunityTimer);
                    setImmunityTimer(null);
                    setIsInImmunityPeriod(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isInImmunityPeriod, immunityTimer]);

    // Cleanup immunity timer on unmount
    useEffect(() => {
        return () => {
            if (immunityTimer) {
                clearTimeout(immunityTimer);
            }
        };
    }, [immunityTimer]);

    const handleAddPageSubmit = () => {
        if (isAddFormValid) {
            const slug = isDynamicPage ? newSlugName.trim() || 'id' : undefined;
            // For now, we'll just console.log the folder page state - backend integration would handle this
            console.log('Creating page:', { 
                name: newPageName.trim(), 
                isDynamic: isDynamicPage, 
                isFolderPage: isFolderPage,
                slugName: slug, 
                parentId: addingAsChildOf 
            });
            handleAddPage(newPageName.trim(), isDynamicPage, slug, addingAsChildOf, isFolderPage);
            // Reset add form
            setNewPageName("");
            setNewSlugName("id");
            setIsDynamicPage(false);
            setIsFolderPage(false);
            setAddingAsChildOf(undefined);
            setShowAddMode(false);
            // Don't close dropdown, just go back to main view
        }
    };

    const handleEditPageSubmit = () => {
        if (editingPage?.id === 'index') {
            const newRedirect = !useIndexAsHomepage && redirectTargetName.trim() ? redirectTargetName.trim() : undefined;

            // just update hte props here before going to the function, and the fucing will be able to handle that
            editingPage.systemPageProps = {
                redirect: newRedirect
            };

            handleEditPageInternal(editingPage.realId, editPageName.trim(), isEditDynamicPage);
            
            // Reset edit form
            setRedirectTargetName("");
            setUseIndexAsHomepage(true);
            setEditPageName("");
            setEditingPage(null);
            setShowEditMode(false);
        } else if (isEditFormValid && editingPage) {
            const slug = isEditDynamicPage ? editSlugName.trim() || 'id' : undefined;
            // For now, we'll just console.log the folder page state - backend integration would handle this
            console.log('Editing page:', { 
                id: editingPage.id,
                name: editPageName.trim(), 
                isDynamic: isEditDynamicPage, 
                isFolderPage: isEditFolderPage,
                slugName: slug
            });
            handleEditPageInternal(editingPage.realId, editPageName.trim(), isEditDynamicPage, slug, isEditFolderPage);
            // Reset edit form
            setEditPageName("");
            setEditSlugName("id");
            setIsEditDynamicPage(false);
            setIsEditFolderPage(false);
            setEditingPage(null);
            setShowEditMode(false);
        }
    };

    const handleEditPage = (page: Page) => {
        setEditingPage(page);
        setEditPageName(getFirstPathSegment(page.value));
        setEditSlugName(page.slugName || 'id');
        setIsEditDynamicPage(page.isDynamic);
        setIsEditFolderPage(page.isFolderPage || false);
        
        // Load current redirect target for index page
        if (page.id === 'index') {
            const currentRedirect = page.systemPageProps?.redirect;
            if (currentRedirect) {
                setRedirectTargetName(currentRedirect);
                setUseIndexAsHomepage(false); // If there's a redirect, toggle is OFF
            } else {
                setRedirectTargetName("");
                setUseIndexAsHomepage(true); // No redirect, toggle is ON
            }
        }
        
        setShowEditMode(true);
        setShowAddMode(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (showEditMode) {
                handleEditPageSubmit();
            } else {
                handleAddPageSubmit();
            }
        } else if (e.key === 'Escape') {
            if (showEditMode) {
                // Reset edit form and exit edit mode
                setEditPageName("");
                setEditSlugName("id");
                setIsEditDynamicPage(false);
                setIsEditFolderPage(false);
                setRedirectTargetName("");
                setUseIndexAsHomepage(true);
                setEditingPage(null);
                setShowEditMode(false);
            } else {
                // Reset add form and exit add mode
                setNewPageName("");
                setNewSlugName("id");
                setIsDynamicPage(false);
                setIsFolderPage(false);
                setAddingAsChildOf(undefined);
                setShowAddMode(false);
            }
        }
    };

    const handleRemovePage = (pageId: string) => {
        const pageToDelete = userPages.find((p: Page) => p.id === pageId);
        if (!pageToDelete) return;

        // Show confirmation modal instead of immediately deleting
        setPageToDelete(pageId);
    };

    const handleConfirmDelete = () => {
        if (pageToDelete) {
            // Clear localStorage settings for the page being deleted
            clearSlugSettings(pageToDelete);
            const page = userPages.find((p: Page) => p.id === pageToDelete);
            if (page) {
                deletePage(page.realId || pageToDelete);
            }
            setPageToDelete(null);
        }
    };

    const getPageName = (pageId: string) => {
        const page = userPages.find(p => p.id === pageId);
        return page?.label || 'Unknown Page';
    };

    const handleAddPage = (pageName: string, isDynamic?: boolean, slugName?: string, parentId?: string, isFolderPage?: boolean) => {
        const parentPage = userPages.find((p: Page) => p.id === parentId);
        const parentRoute = parentPage ? parentPage.value : '/';
        const newRouteParts = parentRoute.split('/').filter(Boolean);

        const firstSegment = getFirstPathSegment(pageName);
        if (firstSegment) newRouteParts.push(firstSegment);

        if (isDynamic) {
            newRouteParts.push(`[${slugName || 'id'}]`);
        }

        let route = '/' + newRouteParts.join('/');
        
        // Ensure route always starts with a slash, or is just a slash for the homepage
        if (route === '//') {
            route = '/';
        }

        const newPage: Partial<PageDefinition> = {
            name: pageName.trim(),
            route: route,
            pageType: isFolderPage ? 'folder-only' : isDynamic ? 'dynamic' : 'static',
            nodes: [], // Start with empty nodes
            schemaVersion: "osdl_v1.0",
        };
        
        console.log("--- Sending New Page to Backend ---", newPage);
        upsertPage(newPage);
    };

    const handleEditPageInternal = (pageId: string, newPageName: string, newIsDynamic: boolean, newSlugName?: string, isFolderPage?: boolean) => {
        const pageToEdit = userPages.find((p: Page) => p.realId === pageId || p.id === pageId);
        if (!pageToEdit) return;

        // Build route for edit (applies to all pages including system)
        const parentPage = userPages.find((p: Page) => p.id === pageToEdit.parentId);
        const parentRoute = parentPage ? parentPage.value : '/';
        
        const newRouteParts = parentRoute.split('/').filter(Boolean);

        const firstSegment = getFirstPathSegment(newPageName);
        if (firstSegment) newRouteParts.push(firstSegment);

        if (newIsDynamic) {
            newRouteParts.push(`[${newSlugName || 'id'}]`);
        }

        let newRoute = '/' + newRouteParts.join('/');
        if (newRoute === '//') {
            newRoute = '/';
        }
        
        const updatedPage: Partial<PageDefinition> & { id: string } = {
            id: pageToEdit.realId || pageId,
            name: pageToEdit.label,
            route: newRoute,
            pageType: pageToEdit.pageType === 'system' ? 'system' : (isFolderPage ? 'folder-only' : (newIsDynamic ? 'dynamic' : 'static')),
            schemaVersion: "osdl_v1.0",
            nodes: pageToEdit.nodes,
            ...(pageToEdit.pageType === 'system' && pageToEdit.systemPageProps ? { systemPageProps: pageToEdit.systemPageProps } : {})
        };
        
        upsertPage(updatedPage);
    };

    const handleMovePage = (pageId: string, newParentId?: string) => {
        const pageToMove = userPages.find((p: Page) => p.id === pageId);
        if (!pageToMove) return;

        // 1. Determine the new parent's route. Default to root ('/').
        let newParentRoute = '/';
        if (newParentId) {
            const parentPage = userPages.find((p: Page) => p.id === newParentId);
            if (parentPage) {
                newParentRoute = parentPage.value;
            }
        }

        // 2. Determine the old parent's route to isolate the child's path segment.
        let oldParentRoute = '/';
        if (pageToMove.parentId) {
            const oldParentPage = userPages.find((p: Page) => p.id === pageToMove.parentId);
            if (oldParentPage) {
                oldParentRoute = oldParentPage.value;
            }
        }

        // 3. Isolate the child's own path segment.
        let childSegment = '';
        if (pageToMove.value.startsWith(oldParentRoute)) {
            childSegment = pageToMove.value.substring(oldParentRoute.length);
        } else {
            // Fallback for weird cases, just use the last part of the path
            childSegment = '/' + pageToMove.value.split('/').pop();
        }
        childSegment = childSegment.startsWith('/') ? childSegment.substring(1) : childSegment;


        // 4. Construct the new route.
        let newRoute = newParentRoute === '/' ? `/${childSegment}` : `${newParentRoute}/${childSegment}`;

        // Cleanup any double slashes that might have been created.
        newRoute = newRoute.replace(/\/\//g, '/');
        
        const updatedPage: Partial<PageDefinition> & { id: string } = {
            id: pageToMove.realId || pageId,
            name: pageToMove.label,
            route: newRoute,
            pageType: pageToMove.isFolderPage ? 'folder-only' : pageToMove.isDynamic ? 'dynamic' : 'static',
            schemaVersion: "osdl_v1.0",
            nodes: pageToMove.nodes,
        };
        console.log('--- pageToMove ---', pageToMove.id);
        

        upsertPage(updatedPage);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div className="flex items-center gap-2">

          <div className={`${isOpen ? 'min-w-80' : 'min-w-48'} transition-[min-width] duration-200 ease-out`}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Always close slug settings when dropdown button is clicked
                        setShowSlugSettings(false);
                        setIsOpen(!isOpen);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 hover:bg-gray-50 focus:outline-none bg-white ${
                        isOpen 
                            ? 'w-80 rounded-t-md rounded-b-none border-b-0 transition-[width] duration-200 ease-out' 
                            : 'w-full min-w-48 rounded-md transition-[width,border-radius] duration-200 ease-out'
                    }`}
                >
                {/* Use same logic as page list: specific icons for special pages, '/' for others */}
                {currentPage?.id === '404' ? (
                    <AlertTriangle size={14} className="text-gray-500" />
                ) : currentPage?.id === 'index' ? (
                    <Home size={14} className="text-gray-600" />
                ) : currentPage?.isFolderPage ? (
                    <Folder size={14} className="text-amber-600" />
                ) : (
                    <span className="text-gray-400 text-sm font-medium">/</span>
                )}
                <span className="flex-1 text-left  text-sm flex items-center gap-1" title={currentPage?.value || selectedPage}>
                    {(() => {
                        const pageValue = currentPage?.value || selectedPage;
                        let displayValue = pageValue === '/' ? '/' : pageValue.replace(/^\//, '');
                        
                        // Show redirect arrow for index page when there's a redirect target
                        if (pageValue === '/' && indexRedirectTarget) {
                            const redirectDisplay = indexRedirectTarget.replace(/^\//, '');
                            return (
                                <>
                                    <span>/</span>
                                    <ArrowRight size={12} className="text-gray-400" />
                                    <span title={`/ → ${redirectDisplay}`}>{addMiddleEllipsis(redirectDisplay, isOpen ? 25 : 10)}</span>
                                </>
                            );
                        }
                        
                        // Apply middle ellipsis to long paths
                        const truncatedValue = addMiddleEllipsis(displayValue, isOpen ? 30 : 15);
                        return <span title={displayValue}>{truncatedValue}</span>;
                    })()}
                </span>
                {currentPage?.isFolderPage && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Folder
                    </span>
                )}
                <ChevronDown size={12} className={`text-gray-400 ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
          

        </div>

  {/* Slug settings button for slug pages */}
            {selectedPageHasSlug() && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (showSlugSettings) {
                            setShowSlugSettings(false);
                        } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSlugSettingsPosition({
                                top: rect.bottom + 8,
                                left: rect.left
                            });
                            initializeSlugSettings();
                            setShowSlugSettings(true);
                        }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                    <Settings size={14} />
                    <span className="text-xs font-medium">Slug Settings</span>
                </button>
            )}
            </div>
          
            {isOpen && (
                <div className={`absolute left-0 top-full -mt-1 w-80 bg-white border border-gray-200 border-t-0 rounded-b-md rounded-t-none shadow-lg z-[70] opacity-0 scale-y-95 animate-[dropdownOpen_200ms_ease-out_forwards] overflow-hidden ${
                    showAddMode || showEditMode ? '' : 'max-h-80 overflow-y-auto'
                }`} 
                     style={{ transformOrigin: 'top center' }}>
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                            <Loader className="animate-spin text-primary-600" size={24} />
                        </div>
                    )}
                    {!showAddMode && !showEditMode ? (
                        <>
                            {/* Navigation header - show when not at root level */}
                            {currentParentId && (
                                <div className="px-3 pt-2">
                                    <button
                                        onClick={navigateBack}
                                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Back</span>
                                    </button>
                                    <div className="mt-1 text-xs text-gray-500">
                                        <span className="font-medium" title={getCurrentPath()}>{getTruncatedPath()}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                                        {breadcrumbItems.map((crumb, index) => (
                                            <React.Fragment key={`${crumb.id ?? 'root'}-${index}`}>
                                                <button
                                                    onClick={() => handleBreadcrumbClick(crumb.id, index)}
                                                    className="hover:text-gray-800 transition-colors"
                                                    title={crumb.label}
                                                >
                                                    {crumb.label}
                                                </button>
                                                {index < breadcrumbItems.length - 1 && (
                                                    <span className="text-gray-300">/</span>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search input */}
                            <div className="px-3 py-2 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder={searchTerm ? "Search all pages..." : "Search pages..."}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Page list */}
                            {(() => {
                                const parentPage = currentParentId ? userPages.find(p => p.id === currentParentId) : null;
                                if (parentPage && !parentPage.isFolderPage && !searchTerm) {
                                    return (
                                        <div
                                            key={`${parentPage.id}-as-parent`}
                                            className="relative group"
                                        >
                                            <button
                                                onClick={() => {
                                                    addToPageHistory(parentPage.id, parentPage.label);
                                                    onPageChange(parentPage.value);
                                                    setShowSlugSettings(false);
                                                    setIsOpen(false);
                                                }}
                                                className="w-full flex items-center py-2 px-3 hover:bg-gray-100 transition-colors text-left"
                                            >
                                                <div className="w-6 flex justify-center mr-1">
                                                    <span className="text-gray-400 text-sm font-medium">/</span>
                                                </div>
                                                <div className="flex-1 text-left text-sm text-gray-700">
                                                    <span className=" truncate max-w-[200px]">
                                                        /
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            {sortedFilteredPages.map((page) => (
                                <div
                                    key={page.id}
                                    className="relative group"
                                    onMouseEnter={() => setHoveredItem(page.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    <div className="flex items-center py-2 px-3 hover:bg-gray-100 transition-colors">
                                        {/* Left icon - show for all pages */}
                                        <div className="w-6 flex justify-center mr-1">
                                            {page.id === '404' ? (
                                                <AlertTriangle size={12} className="text-gray-500" />
                                            ) : page.value === rootPage ? (
                                                <Home size={12} className="text-gray-600" />
                                            ) : page.isFolderPage ? (
                                                <Folder size={12} className="text-amber-600" />
                                            ) : (
                                                <span className="text-gray-400 text-sm font-medium">/</span>
                                            )}
                                        </div>
                                        
                                        {/* Main page button */}
                                        <button
                                            onClick={() => {
                                                // If searching, select the page and navigate to its natural location
                                                if (searchTerm) {
                                                    // Navigate to the page's natural location in hierarchy
                                                    setSearchTerm(""); // Clear search
                                                    
                                                    // Build navigation history to the page's parent
                                                    const buildNavigationToParent = (targetParentId: string | undefined) => {
                                                        if (!targetParentId) {
                                                            // Page is at root level
                                                            setCurrentParentId(null);
                                                            setNavigationHistory([]);
                                                            return;
                                                        }
                                                        
                                                        // Build the path from root to parent
                                                        const pathToParent: Array<{id: string | null, label: string}> = [];
                                                        let currentId: string | undefined = targetParentId;
                                                        
                                                        while (currentId) {
                                                            const currentPage = userPages.find(p => p.id === currentId);
                                                            if (!currentPage) break;
                                                            
                                                            if (currentPage.parentId) {
                                                                const parentPage = userPages.find(p => p.id === currentPage.parentId);
                                                                pathToParent.unshift({
                                                                    id: currentPage.parentId,
                                                                    label: parentPage?.label || 'Unknown'
                                                                });
                                                            } else {
                                                                // This page's parent is root
                                                                pathToParent.unshift({
                                                                    id: null,
                                                                    label: 'Root'
                                                                });
                                                            }
                                                            
                                                            currentId = currentPage.parentId;
                                                        }
                                                        
                                                        setNavigationHistory(pathToParent);
                                                        setCurrentParentId(targetParentId);
                                                    };

                                                    if (page.isFolderPage) {
                                                        buildNavigationToParent(page.parentId);
                                                        setCurrentParentId(page.id);
                                                        setShowSlugSettings(false);
                                                        return;
                                                    }

                                                    addToPageHistory(page.id, page.label);
                                                    onPageChange(page.value);
                                                    buildNavigationToParent(page.parentId);
                                                    setShowSlugSettings(false);
                                                    setIsOpen(false);
                                                    return;
                                                }
                                                
                                                // If page has children, navigate into it
                                                if (page.isFolderPage || hasChildren(page.id, userPages)) {
                                                    navigateIntoPage(page);
                                                } else {
                                                    // Otherwise select the page
                                                    addToPageHistory(page.id, page.label);
                                                    onPageChange(page.value);
                                                    setShowSlugSettings(false);
                                                    setIsOpen(false);
                                                }
                                            }}
                                            className="flex-1 text-left text-sm text-gray-700 transition-colors"
                                        >
                                            <span className=" truncate max-w-[200px] flex items-center gap-1" title={searchTerm ? page.value : getPageDisplayName(page)}>
                                                {(() => {
                                                    if (searchTerm) {
                                                        const displayValue = page.value === '/' ? '/' : page.value.replace(/^\//, '');
                                                        // Show redirect arrow for index page when searching and there's a redirect target
                                                        if (page.value === '/' && indexRedirectTarget) {
                                                            return (
                                                                <>
                                                                    <span>/</span>
                                                                    <ArrowRight size={12} className="text-gray-400" />
                                                                    <span>{indexRedirectTarget.replace(/^\//, '')}</span>
                                                                </>
                                                            );
                                                        }
                                                        return displayValue;
                                                    } else {
                                                        const displayName = getPageDisplayName(page);
                                                        // Show redirect arrow for index page when there's a redirect target
                                                        if (page.value === '/' && indexRedirectTarget) {
                                                            return (
                                                                <>
                                                                    <span>/</span>
                                                                    <ArrowRight size={12} className="text-gray-400" />
                                                                    <span>{indexRedirectTarget.replace(/^\//, '')}</span>
                                                                </>
                                                            );
                                                        }
                                                        return displayName;
                                                    }
                                                })()}
                                            </span>
                                        </button>
                                        {page.isFolderPage && (
                                            <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                Folder
                                            </span>
                                        )}

                                        {/* Right section with three-dot menu and chevron - fixed width to prevent layout shift */}
                                        <div className="flex items-center justify-end">
                                            {/* Three-dot menu on hover - appears before chevron (hidden for 404 and home page) */}
                                            <div className="w-7 flex justify-center items-center">
                                                {page.id !== '404' && page.value !== rootPage && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const buttonRect = e.currentTarget.getBoundingClientRect();
                                                            setPageMenuPosition({
                                                                top: buttonRect.bottom + 4,
                                                                left: buttonRect.left
                                                            });
                                                            setShowPageMenu(page.id);
                                                        }}
                                                        className={`p-1.5 rounded text-gray-500 hover:text-gray-800 ${
                                                            hoveredItem === page.id ? '' : 'invisible'
                                                        }`}
                                                        title="Page options"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                )}
                                                {/* For home page, show only the gear icon as an option, visible only on hover */}
                                                {page.value === rootPage && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const pageObj = userPages.find(p => p.id === page.id);
                                                            if (pageObj) handleEditPage(pageObj);
                                                        }}
                                                        className={`p-1 rounded text-gray-500 hover:text-gray-800 ${hoveredItem === page.id ? '' : 'invisible'}`}
                                                        title="Edit Home Page Settings"
                                                    >
                                                        <Settings size={14} className="text-gray-500" />
                                                    </button>
                                                )}
                                            </div>
                                            {/* Chevron for pages with children - always at the far right when present */}
                                            {hasChildren(page.id, userPages) && !searchTerm && (
                                                <div className="w-7 flex justify-center items-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigateIntoPage(page);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                        title={`View ${getPageDisplayName(page)} sub-pages`}
                                                    >
                                                        <ChevronDown size={14} className="rotate-[-90deg]" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {sortedFilteredPages.length === 0 && searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No pages found matching "{searchTerm}"
                                </div>
                            )}

                            {sortedFilteredPages.length === 0 && !searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    {currentParentId && userPages.find(p => p.id === currentParentId)?.isFolderPage
                                        ? 'Folder is empty. Add a sub-page to continue.'
                                        : 'No pages in this section'}
                                </div>
                            )}
                            
                            {/* Add page button */}
                            <div className="border-t border-gray-200 mt-1">
                                <button
                                    onClick={() => {
                                        setAddingAsChildOf(currentParentId || undefined);
                                        setShowAddMode(true);
                                    }}
                                    className="group w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                >
                                    <Plus size={14} className="text-green-600 group-hover:text-green-700 transition-colors" />
                                    <span>Add Page{currentParentId ? " Here" : ""}</span>
                                </button>
                            </div>
                        </>
                    ) : showAddMode ? (
                        <>
                            {/* Add mode header */}
                            <div className="sticky top-0 bg-white p-3 z-10 border-b border-gray-100">
                                <button
                                    onClick={() => {
                                        setNewPageName("");
                                        setNewSlugName("id");
                                        setIsDynamicPage(false);
                                        setIsFolderPage(false);
                                        setAddingAsChildOf(undefined);
                                        setShowAddMode(false);
                                    }}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to pages</span>
                                </button>
                                
                                {/* Show context when adding sub-page */}
                                {addingAsChildOf && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Adding sub-page to: <span className=" font-medium">
                                            {userPages.find(p => p.id === addingAsChildOf)?.value || 'Unknown'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Add page input */}
                            <div className="p-3">
                                <div className="space-y-4">
                                    <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Page URL
                                                </label>
                                        
                                        <div className="mb-2 text-xs text-gray-500">
                                            Allowed: letters, numbers, spaces, and hyphens only.
                                        </div>
                                        
                                            <input
                                            type="text"
                                                placeholder={addingAsChildOf !== undefined ? 
                                                    "Enter first URL segment (e.g., products)" : 
                                                    "Enter first URL segment (e.g., products)"
                                                }
                                            value={newPageName}
                                            onChange={(e) => setNewPageName(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                                newPageName && (!validatePageName(newPageName) || addFormDuplicate || addFormJustSlug)
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                    : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                                            }`}
                                            autoFocus
                                        />
                                        
                                        {/* Error message for invalid characters */}
                                        {newPageName && !validatePageName(newPageName) && (
                                            <div className="mt-1 text-xs text-red-600">
                                                Invalid characters: {addFormInvalidChars}
                                            </div>
                                        )}
                                        
                                        {/* Error message for duplicate names */}
                                        {newPageName && validatePageName(newPageName) && addFormDuplicate && (
                                            <div className="mt-1 text-xs text-red-600">
                                                A page with this name already exists
                                            </div>
                                        )}
                                        
                                        {/* Error message for just slug in root */}
                                        {newPageName && validatePageName(newPageName) && !addFormDuplicate && addFormJustSlug && (
                                            <div className="mt-1 text-xs text-red-600">
                                                Cannot create a page that is just a slug parameter in the root directory
                                            </div>
                                        )}
                                        
                                        {/* Show actual URL that will be created */}
                                        {(newPageName.trim() || (isDynamicPage && addingAsChildOf !== undefined)) && 
                                         (newPageName.trim() === '' || validatePageName(newPageName)) && !addFormDuplicate && !addFormJustSlug && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                Will create: <span className=" text-gray-700">
                                                    {generateUrlPreview(newPageName, isDynamicPage, newSlugName)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dynamic Page Toggle */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <label className={`text-sm font-medium ${isFolderPage ? 'text-gray-400' : 'text-gray-700'}`}>
                                                    Dynamic Page
                                                </label>
                                                <Tooltip content="Creates a template that matches multiple URLs. Example: /product/[id] matches /product/123, /product/abc, etc.">
                                                    <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                </Tooltip>
                                            </div>
                                            <button
                                                onClick={() => !isFolderPage && setIsDynamicPage(!isDynamicPage)}
                                                disabled={isFolderPage}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                    isDynamicPage && !isFolderPage ? 'bg-blue-600' : 'bg-gray-200'
                                                } ${isFolderPage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                        isDynamicPage && !isFolderPage ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                        
                                        {/* Disabled message for folder pages */}
                                        {isFolderPage && (
                                            <div className="text-xs text-gray-500">
                                                Dynamic pages cannot be folder pages. Folder pages are containers that only hold sub-pages.
                                            </div>
                                        )}
                                        
                                        {/* Slug name input - only visible for dynamic pages */}
                                        {isDynamicPage && !isFolderPage && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Slug Name
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="id"
                                                    value={newSlugName}
                                                    onChange={(e) => setNewSlugName(e.target.value)}
                                                    className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                                        newSlugName && !validateSlugName(newSlugName)
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                            : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                                                    }`}
                                                />
                                                
                                                {/* Error message for invalid slug characters */}
                                                {newSlugName && !validateSlugName(newSlugName) && (
                                                    <div className="mt-1 text-xs text-red-600">
                                                        Invalid characters: {addSlugInvalidChars}. Use letters, numbers, and underscores only.
                                                    </div>
                                                )}
                                                
                                                <div className="mt-1 text-xs text-gray-500">
                                                    This will be used as [slugName] in the URL pattern.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Folder Page Toggle */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium text-gray-700">
                                                    Folder Page (Container Only)
                                                </label>
                                                <Tooltip content="This page won't be accessible directly - only its sub-pages will be accessible.">
                                                    <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                </Tooltip>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newFolderPageState = !isFolderPage;
                                                    setIsFolderPage(newFolderPageState);
                                                    // If turning folder page ON, turn dynamic page OFF
                                                    if (newFolderPageState && isDynamicPage) {
                                                        setIsDynamicPage(false);
                                                    }
                                                }}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                    isFolderPage ? 'bg-blue-600' : 'bg-gray-200'
                                                }`}
                                            >
                                                <span
                                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                        isFolderPage ? 'translate-x-5' : 'translate-x-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end pt-2">
                                        <button
                                            onClick={() => {
                                                setNewPageName("");
                                                setNewSlugName("id");
                                                setIsDynamicPage(false);
                                                setIsFolderPage(false);
                                                setAddingAsChildOf(undefined);
                                                setShowAddMode(false);
                                            }}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddPageSubmit}
                                            disabled={!isAddFormValid}
                                            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Add Page
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : showEditMode ? (
                        <>
                            {/* Edit mode header */}
                            <div className="sticky top-0 bg-white p-3 z-10 border-b border-gray-100">
                                <button
                                    onClick={() => {
                                        setEditPageName("");
                                        setIsEditDynamicPage(false);
                                        setIsEditFolderPage(false);
                                        setRedirectTargetName("");
                                        setUseIndexAsHomepage(true);
                                        setEditingPage(null);
                                        setShowEditMode(false);
                                    }}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to pages</span>
                                </button>
                            </div>
                            
                            {/* Edit page input */}
                            <div className="p-3">
                                <div className="space-y-4">
                                    <div>
                                        {editingPage?.id === 'index' ? (
                                            <div className="mb-4">
                                                <h3 className="text-sm font-medium text-gray-700 mb-1">
                                                    Home Page Settings
                                                </h3>
                                                <p className="text-xs text-gray-500">
                                                    This is your site's home page, displayed when visitors go to your main domain.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Edit Page URL
                                                </label>
                                                
                                                <div className="mb-2 text-xs text-gray-500">
                                                    Allowed: letters, numbers, spaces, and hyphens only.
                                                </div>
                                                
                                                <input
                                                    type="text"
                                                    placeholder="Enter first URL segment (e.g., products)"
                                                    value={editPageName}
                                                    onChange={(e) => setEditPageName(e.target.value)}
                                                    onKeyDown={handleKeyPress}
                                                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                                        editPageName && (!validatePageName(editPageName) || editFormDuplicate)
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                            : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                                                    }`}
                                                    autoFocus
                                                />
                                                
                                                {/* Error message for invalid characters */}
                                                {editPageName && !validatePageName(editPageName) && (
                                                    <div className="mt-1 text-xs text-red-600">
                                                        Invalid characters: {editFormInvalidChars}
                                                    </div>
                                                )}
                                                
                                                {/* Error message for duplicate names */}
                                                {editPageName && validatePageName(editPageName) && editFormDuplicate && (
                                                    <div className="mt-1 text-xs text-red-600">
                                                        A page with this name already exists
                                                    </div>
                                                )}
                                                
                                                {/* Show actual URL that will be created */}
                                                {editPageName.trim() && validatePageName(editPageName) && !editFormDuplicate && (
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        Will create: <span className=" text-gray-700">
                                                            {generateUrlPreview(editPageName, isEditDynamicPage, editSlugName)}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Dynamic Page Toggle - only show for non-index pages */}
                                    {editingPage?.id !== 'index' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <label className={`text-sm font-medium ${isEditFolderPage ? 'text-gray-400' : 'text-gray-700'}`}>
                                                        Dynamic Page
                                                    </label>
                                                    <Tooltip content="Creates a template that matches multiple URLs. Example: /product/[id] matches /product/123, /product/abc, etc.">
                                                        <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                    </Tooltip>
                                                </div>
                                                <button
                                                    onClick={() => !isEditFolderPage && setIsEditDynamicPage(!isEditDynamicPage)}
                                                    disabled={isEditFolderPage}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                        isEditDynamicPage && !isEditFolderPage ? 'bg-blue-600' : 'bg-gray-200'
                                                    } ${isEditFolderPage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                            isEditDynamicPage && !isEditFolderPage ? 'translate-x-5' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            
                                            {/* Disabled message for folder pages */}
                                            {isEditFolderPage && (
                                                <div className="text-xs text-gray-500">
                                                    Dynamic pages cannot be folder pages. Folder pages are containers that only hold sub-pages.
                                                </div>
                                            )}
                                            
                                            {/* Slug name input - only visible for dynamic pages */}
                                            {isEditDynamicPage && !isEditFolderPage && (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Slug Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="id"
                                                        value={editSlugName}
                                                        onChange={(e) => setEditSlugName(e.target.value)}
                                                        className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                                            editSlugName && !validateSlugName(editSlugName)
                                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                                : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                                                        }`}
                                                    />
                                                    
                                                    {/* Error message for invalid slug characters */}
                                                    {editSlugName && !validateSlugName(editSlugName) && (
                                                        <div className="mt-1 text-xs text-red-600">
                                                            Invalid characters: {editSlugInvalidChars}. Use letters, numbers, and underscores only.
                                                        </div>
                                                    )}
                                                    
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        This will be used as [slugName] in the URL pattern.
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    )}

                                    {/* Folder Page Toggle - only show for non-index pages */}
                                    {editingPage?.id !== 'index' && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm font-medium text-gray-700">
                                                        Folder Page (Container Only)
                                                    </label>
                                                    <Tooltip content="This page won't be accessible directly - only its sub-pages will be accessible.">
                                                        <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                    </Tooltip>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newEditFolderPageState = !isEditFolderPage;
                                                        setIsEditFolderPage(newEditFolderPageState);
                                                        // If turning folder page ON, turn dynamic page OFF
                                                        if (newEditFolderPageState && isEditDynamicPage) {
                                                            setIsEditDynamicPage(false);
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                        isEditFolderPage ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                            isEditFolderPage ? 'translate-x-5' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Home page settings for index page */}
                                    {editingPage?.id === 'index' && (
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm font-medium text-gray-700">
                                                            Use "/" as home page
                                                        </label>
                                                        <Tooltip content="When disabled, visitors to '/' will be automatically redirected to this page url.">
                                                            <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                        </Tooltip>
                                                    </div>
                                                    <button
                                                        onClick={() => setUseIndexAsHomepage(!useIndexAsHomepage)}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                            useIndexAsHomepage ? 'bg-blue-600' : 'bg-gray-200'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                                                useIndexAsHomepage ? 'translate-x-5' : 'translate-x-1'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                                
                                                {/* Show redirect input when toggle is OFF */}
                                                {!useIndexAsHomepage && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <label className="block text-sm font-medium text-gray-700">
                                                                Redirect to Page
                                                            </label>
                                                            <Tooltip content="Visitors will be automatically redirected from your home page to this page.">
                                                                <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                                            </Tooltip>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Enter page to redirect to (e.g., /home)"
                                                            value={redirectTargetName}
                                                            onChange={(e) => setRedirectTargetName(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Current redirect status */}
                                            {!useIndexAsHomepage && (indexRedirectTarget || redirectTargetName.trim()) && (
                                                <div className="bg-gray-50 px-3 py-2 rounded-lg text-xs text-gray-500 flex items-center gap-1">
                                                    <span className=" text-gray-700">/</span>
                                                    <ArrowRight size={12} className="text-gray-600" />
                                                    <span className=" text-gray-700">
                                                        {redirectTargetName.trim() || indexRedirectTarget}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end pt-2">
                                        <button
                                            onClick={() => {
                                                setEditPageName("");
                                                setIsEditDynamicPage(false);
                                                setIsEditFolderPage(false);
                                                setRedirectTargetName("");
                                                setUseIndexAsHomepage(true);
                                                setEditingPage(null);
                                                setShowEditMode(false);
                                            }}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEditPageSubmit}
                                            disabled={editingPage?.id === 'index' ? false : !isEditFormValid}
                                            className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {editingPage?.id === 'index' ? 'Save Settings' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            )}

            {/* Fixed Page Menu Overlay */}
            {showPageMenu && (
                <>
                    <div
                        className="fixed inset-0 bg-transparent z-[9998]"
                        onClick={() => setShowPageMenu(null)}
                    />
                    <div 
                        className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] overflow-hidden"
                        data-page-menu="true"
                        style={{ 
                            top: `${pageMenuPosition.top}px`,
                            left: `${pageMenuPosition.left}px`,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const page = userPages.find(p => p.id === showPageMenu);
                                if (page) handleEditPage(page);
                                setShowPageMenu(null);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                        >
                            <Settings size={14} className="text-gray-500" />
                            <span>Edit Page</span>
                        </button>
                        {/* Add Sub-page - only show for non-index and non-404 pages */}
                        {showPageMenu !== 'index' && showPageMenu !== '404' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setAddingAsChildOf(showPageMenu);
                                    setShowAddMode(true);
                                    setShowPageMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                                <Plus size={14} className="text-green-600" />
                                <span>Add Sub-page</span>
                            </button>
                        )}
                        
                        {/* Separator before movement buttons - show if any movement option is available */}
                        {(() => {
                            const page = userPages.find(p => p.id === showPageMenu);
                            if (!page) return null;
                            
                            // Check if "Move One Level Up" would be visible
                            const moveUpVisible = (() => {
                                const isSlugOnlyPage = page && page.isDynamic && (page.label.trim() === '');
                                const isAtRoot = !page?.parentId;
                                
                                // For slug-only pages, check if they're 2+ levels deep
                                if (isSlugOnlyPage && page?.parentId) {
                                    const parentPage = userPages.find((p: Page) => p.id === page.parentId);
                                    const isTwoOrMoreLevelsDeep = parentPage?.parentId;
                                    return showPageMenu !== 'index' && showPageMenu !== '404' && isTwoOrMoreLevelsDeep;
                                }
                                
                                // For regular pages, show if has parent and not at root
                                return page?.parentId && showPageMenu !== 'index' && showPageMenu !== '404' && !isSlugOnlyPage && !isAtRoot;
                            })();
                            
                            // Check if "Move Into" would be visible - replicate MoveIntoMenu logic
                            const moveIntoVisible = (() => {
                                if (showPageMenu === 'index' || showPageMenu === '404') return false;
                                
                                // Get potential parent pages (same logic as MoveIntoMenu)
                                const isDescendant = (pageId: string, potentialAncestorId: string): boolean => {
                                    const p = userPages.find((p: Page) => p.id === pageId);
                                    if (!p || !p.parentId) return false;
                                    if (p.parentId === potentialAncestorId) return true;
                                    return isDescendant(p.parentId, potentialAncestorId);
                                };
                                
                                const potentialParents = userPages.filter((p: Page) => {
                                    // Exclude self and its descendants
                                    if (p.id === showPageMenu || isDescendant(p.id, showPageMenu)) {
                                        return false;
                                    }
                                    
                                    // ALWAYS exclude the Index and 404 pages
                                    if (p.id === 'index' || p.id === '404') {
                                        return false;
                                    }
                                    
                                    return true;
                                });
                                
                                return potentialParents.length > 0;
                            })();
                            
                            return (moveUpVisible || moveIntoVisible) && (
                                <div className="border-t border-gray-100 my-1"></div>
                            );
                        })()}
                        
                        {/* Move one level up */}
                        {(() => {
                            const page = userPages.find((p: Page) => p.id === showPageMenu);
                            if (!page) return null;

                            const isSlugOnlyPage = page && page.isDynamic && (page.label.trim() === '');
                            const isAtRoot = !page?.parentId;
                            
                            // For slug-only pages, check if they're 2+ levels deep
                            if (isSlugOnlyPage && page?.parentId) {
                                const parentPage = userPages.find((p: Page) => p.id === page.parentId);
                                const isTwoOrMoreLevelsDeep = parentPage?.parentId;
                                return showPageMenu !== 'index' && showPageMenu !== '404' && isTwoOrMoreLevelsDeep;
                            }
                            
                            // For regular pages, show if has parent and not at root
                            return page?.parentId && showPageMenu !== 'index' && showPageMenu !== '404' && !isSlugOnlyPage && !isAtRoot;
                        })() && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const page = userPages.find((p: Page) => p.id === showPageMenu);
                                    if (page && page.parentId) {
                                        // Check if current level would be empty and navigate back if needed
                                        if (wouldCurrentLevelBeEmptyAfterDelete(page.id) && navigationHistory.length > 0) {
                                            navigateBack();
                                        }
                                        // Find the parent's parent (move up one level)
                                        const parentPage = userPages.find((p: Page) => p.id === page.parentId);
                                        handleMovePage(page.id, parentPage?.parentId);
                                    }
                                    setShowPageMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                            >
                                <ArrowUp size={14} className="text-blue-600" />
                                <span>Move One Level Up</span>
                            </button>
                        )}
                        
                        {/* Move into another page - only show for non-index and non-404 pages */}
                        {showPageMenu !== 'index' && showPageMenu !== '404' && (
                            <MoveIntoMenu 
                                userPages={userPages}
                                currentPageId={showPageMenu}
                                onMovePage={handleMovePage}
                                onCloseMenu={() => setShowPageMenu(null)}
                                currentParentId={currentParentId}
                                navigationHistory={navigationHistory}
                                onNavigateBack={navigateBack}
                            />
                        )}
                        
                        {/* Only show Delete for non-index and non-404 pages */}
                        {showPageMenu !== 'index' && showPageMenu !== '404' && (
                            <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (showPageMenu) {
                                            // Check if current level would be empty and navigate back if needed
                                            if (wouldCurrentLevelBeEmptyAfterDelete(showPageMenu) && navigationHistory.length > 0) {
                                                navigateBack();
                                            }
                                            handleRemovePage(showPageMenu);
                                        }
                                        setShowPageMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={14} className="text-red-600" />
                                    <span>Delete Page</span>
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
            
            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!pageToDelete}
                onClose={() => setPageToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Page"
                message={(() => {
                    if (!pageToDelete) return '';
                    const childPages = userPages.filter(p => p.parentId === pageToDelete);
                    if (childPages.length > 0) {
                        return `Are you sure you want to delete "${getPageName(pageToDelete)}" and its ${childPages.length} sub page${childPages.length === 1 ? '' : 's'}? This action cannot be undone.`;
                    }
                    return `Are you sure you want to delete "${getPageName(pageToDelete)}"? This action cannot be undone.`;
                })()}
                confirmText="Delete"
            />

            {/* Slug Settings Floating Panel */}
            {showSlugSettings && (
                <div 
                    data-slug-settings
                    className="fixed z-[80] bg-white border border-gray-200 rounded-lg shadow-lg"
                    style={{
                        top: slugSettingsPosition.top,
                        left: slugSettingsPosition.left,
                        minWidth: '280px',
                        maxWidth: '320px'
                    }}
                >
                    <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900">Slug Settings</h3>
                            <button
                                onClick={() => setShowSlugSettings(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Default Switch */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Default
                                </label>
                                <Tooltip content="These values are used as preview route params for dynamic pages. Use them in templates with {{ page.routeParams.slugName }} or {{ page.slugs.slugName }}. Shortcuts for the first dynamic param: {{ page.slugName }} and {{ page.slug }}. If no value is set, the editor uses sample-slugName as fallback.">
                                    <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                </Tooltip>
                            </div>
                            <div
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    slugSettingsForm.useDefault ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                        slugSettingsForm.useDefault ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Overrides Section */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-800">Overrides</h4>
                                <Tooltip content="Set a preview value for each dynamic segment. Example: for /product/[productId], set productId and access it with {{ page.routeParams.productId }} or {{ page.slugs.productId }}. If unset, it falls back to sample-productId.">
                                    <Info size={14} className="text-gray-400 hover:text-gray-600" />
                                </Tooltip>
                            </div>
                            <p className="text-xs text-gray-500">
                                Once you set a value for any slug, default behavior is turned off for the entire route (all slugs), so be sure to set the rest if needed
                            </p>
                            {getCurrentPageSlugs().map((slugName) => {
                                const value = slugSettingsForm.overrides[slugName] || '';
                                const isEmpty = !slugSettingsForm.useDefault && !value.trim();
                                const isInvalid = value.trim() && !validateSlugValue(value);
                                const hasError = isEmpty || isInvalid;
                                
                                return (
                                    <div key={slugName}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            [{slugName}]
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={`Enter [${slugName}] value`}
                                            value={value}
                                            onChange={(e) => handleSlugOverrideChange(slugName, e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                                                hasError 
                                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                                    : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500'
                                            }`}
                                        />
                                        {isEmpty && (
                                            <div className="mt-1 text-xs text-red-600">
                                                This field is required when not using default
                                            </div>
                                        )}
                                        {isInvalid && (
                                            <div className="mt-1 text-xs text-red-600">
                                                Invalid characters: {getInvalidSlugValueCharacters(value)}. Use letters, numbers, hyphens, and underscores only.
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={() => setShowSlugSettings(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveSlugSettings}
                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
