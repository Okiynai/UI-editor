import { useRef, useCallback, memo, useEffect, useState, useMemo } from "react";

import { X, Check, Wand2, Loader2,ChevronsUpDown, ChevronsDownUp, PlusCircle, Trash2, AlertTriangle, Search } from 'lucide-react';
import { Tooltip } from '../../shared/Tooltip';

// IMPORTANT: All memo'd components have custom comparison functions to ensure they re-render
// when pageDefinition changes. React's default shallow comparison can miss object reference
// changes, causing components to not update when the page changes.

import { MarkdownStreamRenderer } from './streamParsers/MDStreamParser/MDStreamRenderer';
import { findNodeRef } from './utils/nodeUtils';

const SKIPPED_SECTIONS = ['needs_rql_discovery'];

// Memoized ParsedSectionCard to prevent unnecessary re-renders
export const ParsedSectionCard = memo(({
    sectionName,
    parsedContent,
    isStreaming,
    sectionKey,
    expansionManager,
    pageDefinition,
    change,
    onKeepChange,
    onRejectChange
}: {
    sectionName: string;
    parsedContent: any;
    isStreaming?: boolean;
    sectionKey: string;
    expansionManager: ReturnType<typeof useExpansionState>;
    pageDefinition: any;
    change: any;
    onKeepChange: (changeId: string) => void;
    onRejectChange: (changeId: string) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(() => {
        // If we're streaming and have content, default to expanded
        if (isStreaming && parsedContent) {
            return true;
        }
        // Otherwise use the saved expansion state
        return expansionManager.getExpanded(sectionKey);
    });

    // Update expansion state when it changes
    useEffect(() => {
        expansionManager.setExpanded(sectionKey, isExpanded);
    }, [isExpanded, sectionKey, expansionManager]);

    // Auto-collapse when streaming completes
    useEffect(() => {
        if (!isStreaming) {
            setIsExpanded(false);
        }
    }, [isStreaming]);

    // Skip rendering for these sections for now
    if (SKIPPED_SECTIONS.includes(sectionName)) {
        return null;
    }

    // Render action_json with structured data
    if (sectionName === 'action_json') {
        return (
            <ActionJsonRenderer
                parsedContent={parsedContent}
                isStreaming={isStreaming}
                pageDefinition={pageDefinition}
                change={change}
                onKeepChange={onKeepChange}
                onRejectChange={onRejectChange}
            />
        );
    }

    // Handle message sections
    if (sectionName === 'response') {
        return <MessageRenderer content={parsedContent} />;
    }

    // Only apply the special UI to analysis/thought/execution_plan. For any other unknown sections, show plain.
    if (sectionName === 'reasoning') {
        const { startTimestamp, endTimestamp } = parsedContent;

        const humanTitle = `Thought for ${Math.round((endTimestamp - startTimestamp))} seconds`;

        const title = isStreaming ? "Thinking..." : humanTitle;

        return (
            <ExpandableContent
                isExpanded={isExpanded}
                isStreaming={isStreaming || false}
                title={title}
                content={parsedContent.rawContent}
                onToggle={() => setIsExpanded(v => !v)}
            />
        );
    }

    console.error('Unknown section', sectionName, parsedContent);

    return (
        <p>Unknown response...</p>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if essential props changed
    
    // Debug logging to understand re-render behavior
    const changeChanged = !(prevProps.change?.id === nextProps.change?.id &&
                           prevProps.change?.choice === nextProps.change?.choice &&
                           prevProps.change?.success === nextProps.change?.success &&
                           prevProps.change?.error === nextProps.change?.error &&
                           prevProps.change?.isAssociated === nextProps.change?.isAssociated);
    
    // Check if pageDefinition has changed (this is crucial for re-rendering when page changes)
    const pageDefinitionChanged = prevProps.pageDefinition !== nextProps.pageDefinition;
    
    if (changeChanged) {
        console.log('🔄 ParsedSectionCard change detected:', {
            prevChange: prevProps.change,
            nextChange: nextProps.change,
            sectionName: nextProps.sectionName
        });
    }
    
    if (pageDefinitionChanged) {
        console.log('🔄 ParsedSectionCard pageDefinition changed:', {
            sectionName: nextProps.sectionName,
            prevPageDef: prevProps.pageDefinition,
            nextPageDef: nextProps.pageDefinition
        });
    }
    
    // Always re-render if change has changed, streaming has changed, content has changed, or pageDefinition has changed
    const shouldReRender = changeChanged || 
                          prevProps.isStreaming !== nextProps.isStreaming ||
                          prevProps.parsedContent !== nextProps.parsedContent ||
                          pageDefinitionChanged;
    
    if (shouldReRender) {
        console.log('🔄 ParsedSectionCard will re-render:', {
            sectionName: nextProps.sectionName,
            reason: {
                streamingChanged: prevProps.isStreaming !== nextProps.isStreaming,
                changeChanged,
                contentChanged: prevProps.parsedContent !== nextProps.parsedContent,
                pageDefinitionChanged
            }
        });
    }
    
    return !shouldReRender;
});

// Add display name for debugging
ParsedSectionCard.displayName = 'ParsedSectionCard';

// Custom hook for scroll shadows and auto-scrolling
const useScrollShadows = (isExpanded: boolean, isStreaming: boolean) => {
    const [showTopShadow, setShowTopShadow] = useState(false);
    const [showBottomShadow, setShowBottomShadow] = useState(false);
    const [shouldShowShadows, setShouldShowShadows] = useState(false);

    const updateShadows = useCallback((element: HTMLDivElement) => {
        const atTop = element.scrollTop <= 1;
        const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
        setShowTopShadow(!atTop);
        setShowBottomShadow(!atBottom);

        const hasOverflow = element.scrollHeight > element.clientHeight;
        const shouldShow = Boolean((isExpanded || isStreaming) && hasOverflow);
        setShouldShowShadows(shouldShow);
    }, [isExpanded, isStreaming]);

    return { showTopShadow, showBottomShadow, shouldShowShadows, setShouldShowShadows, updateShadows };
};

// Custom hook for smooth scrolling
const useSmoothScroll = () => {
    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

    const smoothScrollToBottom = useCallback((element: HTMLDivElement) => {
        const start = element.scrollTop;
        const end = element.scrollHeight - element.clientHeight;
        const change = end - start;
        const duration = 600;
        let startTime: number | null = null;
        let animationFrameId: number;

        const animateScroll = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = easeOutQuad(progress);
            element.scrollTop = start + change * easedProgress;

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animateScroll);
            }
        };

        animationFrameId = requestAnimationFrame(animateScroll);
        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return { smoothScrollToBottom };
};


const NOTIFICATION_EVENT_TOOLS = ['analyze_assets'];

// Utility function to get section display name (placeholder for now)
const parseActionJson = (parsedContent: any, pageDefinition: any): {
    toolName: string;
    nodeName: string | null
} | null => {
    if(!parsedContent) return null;

    // parsedContent is already a clean object, so we can access properties directly
    const toolName = parsedContent.tool_name;

    console.log('wtf?? toolname', toolName);

    // simple tools that we only need their name, like
    // the analyze_assets, or much more in the future.
    if(NOTIFICATION_EVENT_TOOLS.includes(toolName)) {
        return {
            toolName,
            nodeName: null
        };
    }

    const params = parsedContent.params;
    if(!params) {
        return null;
    }

    console.log('wtf?? toolname and params', toolName, params);

    let nodeId = null;

    switch (toolName) {
        case 'create_osdl_node':
            // Handle both simple object format and array format with nested sections
            const nodePayload = params.node_payload;
            if (Array.isArray(nodePayload) && nodePayload.length > 0) {
                // For array format, take the first element's name (top-level section)
                nodeId = nodePayload[0]?.name;
                console.log('wtf?? nodeid from array format', nodeId);
            } else {
                // For simple object format, use the name directly
                nodeId = nodePayload?.name;
                console.log('wtf?? nodeid from object format', nodeId);
            }
            break;

        case 'add_pre_built_section':
            // no clue what this is, haven't checked it from the
            // real agent response yet, but whatever.
            nodeId = params.section_id || params.name;
            break;

        case 'modify_osdl_node':
            nodeId = params.node_id;
            break;

        case 'delete_osdl_node':
            nodeId = params.node_id;
            break;

        default: break;
    }

    if (toolName === 'create_osdl_node' || toolName === 'add_pre_built_section') {
        return {
            toolName,
            nodeName: nodeId
        };
    }

    // get node name from pageDefinition via its id
    const nodeRef = findNodeRef(pageDefinition.nodes, nodeId);
    console.log('wtf?? nodeRef', nodeRef);
    if(!nodeRef) {
        return null;
    }

    let nodeName = nodeRef.name;
    if(!nodeName) {
        if(nodeRef.params && nodeRef.params.content) {
            nodeName = nodeRef.params.content.substring(0, 10);
        }
    }

    // now we have the nodeName and tool_name from the
    // action json
    return {
        toolName,
        nodeName
    };
};



// Map tailwind text color utility to hex so we can expose a CSS var for shimmer
const resolveHexFromTextClass = (textClass: string): string => {
    switch (textClass) {
        case 'text-emerald-700': return '#047857';
        case 'text-emerald-600': return '#059669';
        case 'text-green-600': return '#16a34a';
        case 'text-rose-700': return '#be123c';
        case 'text-red-600': return '#dc2626';
        case 'text-amber-500': return '#f59e0b';
        case 'text-slate-700': return '#334155';
        case 'text-gray-700': return '#374151';
        case 'text-gray-600': return '#4b5563';
        default: return '#171717';
    }
};

// Component for rendering action_json sections
const ActionJsonRenderer = memo(({
    parsedContent,
    isStreaming,
    pageDefinition,
    change,
    onKeepChange,
    onRejectChange
}: {
    parsedContent: any;
    isStreaming?: boolean;
    pageDefinition: any;
    change: any;
    onKeepChange: (changeId: string) => void;
    onRejectChange: (changeId: string) => void;
}) => {
    // Cache the parsed action data so we don't lose it when pageDefinition changes
    const [cachedActionData, setCachedActionData] = useState<any>(null);
    
    // Parse action data and cache it if we don't have it yet
    const actionData = useMemo(() => {
        if (cachedActionData) {
            return cachedActionData;
        }
        const parsed = parseActionJson(parsedContent, pageDefinition);
        if ((NOTIFICATION_EVENT_TOOLS.includes(parsed?.toolName || "")) ||
            (parsed?.nodeName && parsed?.toolName)) {
            setCachedActionData(parsed);
        }
        return parsed;
    }, [parsedContent, pageDefinition, cachedActionData]);

    console.log('wtf final??', parsedContent, actionData, change);

    if (!actionData) {
        // Still parsing or incomplete
        // we just return nothing,
        // as we just do want to show anything
        // what have we got to show yk?
        return null;
    }

    // Check if this is a notification event tool
    const isNotificationEvent = NOTIFICATION_EVENT_TOOLS.includes(actionData.toolName);
    
    // For notification events, just show the tool name
    if (isNotificationEvent) {
        let displayText = '';
        let ActionIcon = Search;
        let textColor = 'text-gray-600';
        let iconColor = 'text-gray-600';

        if (actionData.toolName === 'analyze_assets') {
            displayText = isStreaming ? 'Searching in your assets...' : 'Analyzed your assets';
        } 

        const fontColorHex = resolveHexFromTextClass(textColor);
        return (
            <div className="w-full space-y-1">
                <div className={`w-full ${textColor} text-xs py-[2px] flex items-center justify-between rounded-[8px]`}>
                    <div className="flex items-center gap-2 flex-1">
                        <ActionIcon className={`w-4 h-4 ${iconColor} `} />
                        <p className="tracking-tight break-all flex-1 font-semibold">
                            <span className={isStreaming ? 'shimmer-text' : ''} style={{ ['--base-font-color' as any]: fontColorHex }}>
                                {displayText}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // For regular actions, check if we have a valid node name
    if (!actionData.nodeName) {
        return null;
    }

    // Check if this is a loaded action (from database)
    const isLoadedAction = parsedContent.isLoaded;
    
    // Determine the state based on change properties (only for non-loaded actions)
    const isPending = !isLoadedAction && !change;
    const isSuccess = !isLoadedAction && change && change.success && !change.error;
    // If there are no changes associated with a tool and the agent is not streaming, mark as failed
    const isFailed = !isLoadedAction && change && change.error;
    const choice = !isLoadedAction ? change?.choice : undefined;
    
    // Check if this action needs loading state (only for non-loaded actions)
    const showLoadingUntilProcessed = !isLoadedAction && isPending;

    let displayText = '';
    let ActionIcon = Wand2;
    let textColor = 'text-gray-700';
    let iconColor = 'text-gray-500';

    if (isFailed) {
        ActionIcon = AlertTriangle;
        textColor = 'text-amber-800/80';
        iconColor = 'text-amber-800/80';
        const actionName = actionData.toolName?.split('_')[0] || 'action';
        displayText = `Failed to ${actionName} ${actionData.nodeName}`;
    } else {
        // For loaded actions with missing node names, show italic fallback text
        if (isLoadedAction && !actionData.nodeName) {
            displayText = 'Action was rejected or node was deleted';
            textColor = 'text-gray-500';
            iconColor = 'text-gray-400';
        } else {
            switch (actionData.toolName) {
                case 'create_osdl_node':
                    displayText = actionData.nodeName;
                    ActionIcon = PlusCircle;
                    textColor = 'text-emerald-700';
                    iconColor = 'text-emerald-600';
                    break;
                case 'add_pre_built_section':
                    displayText = actionData.nodeName;
                    ActionIcon = PlusCircle;
                    textColor = 'text-emerald-700';
                    iconColor = 'text-emerald-600';
                    break;
                case 'delete_osdl_node':
                    displayText = actionData.nodeName;
                    ActionIcon = Trash2;
                    textColor = 'text-rose-700';
                    iconColor = 'text-rose-500';
                    break;
                case 'modify_osdl_node':
                    displayText = actionData.nodeName;
                    ActionIcon = Wand2;
                    textColor = 'text-slate-700';
                    iconColor = 'text-slate-500';
                    break;
                default:
                    displayText = actionData.nodeName;
                    ActionIcon = Wand2;
                    textColor = 'text-gray-700';
                    iconColor = 'text-gray-500';
                    break;
            }
        }
    }

    const fontColorHex = resolveHexFromTextClass(textColor);
    const containerChrome = isFailed ? '' : 'border border-[hsl(240_5%_95%)] bg-[hsl(240_5%_98%)]';
    const paddingClasses = isFailed ? 'py-[2px]' : 'px-3 py-[6px]';
    return (
        <div className="w-full space-y-1">
            <div className={`w-full ${textColor} text-xs ${paddingClasses} flex items-center justify-between rounded-[8px] ${containerChrome}`}>
                <div className="flex items-center gap-2 flex-1">
                    <ActionIcon className={`w-4 h-4 ${iconColor}`} />
                    <p className="break-all flex-1 font-normal">
                        <span className={`${showLoadingUntilProcessed && !isFailed ? 'shimmer-text' : ''} ${isLoadedAction && !actionData.nodeName ? 'italic' : ''}`} style={{ ['--base-font-color' as any]: fontColorHex }}>
                            {displayText}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                    {(() => {
                        // For loaded actions, don't show any buttons or loading states
                        if (isLoadedAction) {
                            return null;
                        }
                        
                        if (isFailed) {
                            return null;
                        }
                        
                        if (showLoadingUntilProcessed) {
                            return <Loader2 className="w-4 h-4 animate-spin text-[hsl(240_5%_65%)]" />;
                        }
                        
                        if (choice === 'kept') {
                            return (
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-600" />
                                </div>
                            );
                        }
                        
                        if (choice === 'rejected') {
                            return (
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <X className="w-4 h-4 text-red-600" />
                                </div>
                            );
                        }
                        
                        if (isSuccess) {
                            return (
                                <div className="flex items-center gap-1">
                                    <Tooltip content="Reject changes" delay={500}>
                                        <button
                                            onClick={() => onRejectChange(change.id || '')}
                                            className="flex items-center justify-center"
                                        >
                                            <X className="w-4 h-4 text-[hsl(240_5%_65%)]
                                            hover:text-[hsl(240_5%_45%)]
                                            " />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Keep changes" delay={500}>
                                        <button
                                            onClick={() => onKeepChange(change.id || '')}
                                            className="flex items-center justify-center"
                                        >
                                            <Check className="w-4 h-4 text-[hsl(240_5%_65%)]
                                            hover:text-[hsl(240_5%_45%)]
                                            " />
                                        </button>
                                    </Tooltip>
                                </div>
                            );
                        }

                        return null;
                    })()}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to ensure re-rendering when pageDefinition changes
    const pageDefinitionChanged = prevProps.pageDefinition !== nextProps.pageDefinition;
    const changeChanged = prevProps.change?.id !== nextProps.change?.id ||
                         prevProps.change?.choice !== nextProps.change?.choice ||
                         prevProps.change?.success !== nextProps.change?.success ||
                         prevProps.change?.error !== nextProps.change?.error;
    
    const shouldReRender = pageDefinitionChanged || 
                          changeChanged ||
                          prevProps.isStreaming !== nextProps.isStreaming ||
                          prevProps.parsedContent !== nextProps.parsedContent;
    
    if (shouldReRender) {
        console.log('🔄 ActionJsonRenderer will re-render:', {
            reason: {
                pageDefinitionChanged,
                changeChanged,
                streamingChanged: prevProps.isStreaming !== nextProps.isStreaming,
                contentChanged: prevProps.parsedContent !== nextProps.parsedContent
            }
        });
    }
    
    return !shouldReRender;
});

// Add display name for debugging
ActionJsonRenderer.displayName = 'ActionJsonRenderer';

// Component for rendering message sections
const MessageRenderer = memo(({ content }: { content: any }) => {
    if (!content) {
        console.error(`Missing parsedContent for message section`, content);
        return null;
    }

    return (
        <div className="text-sm text-gray-800 leading-relaxed break-words">
            <MarkdownStreamRenderer content={content} />
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to ensure re-rendering when content changes
    const shouldReRender = prevProps.content !== nextProps.content;
    
    if (shouldReRender) {
        console.log('🔄 MessageRenderer will re-render: content changed');
    }
    
    return !shouldReRender;
});

// Add display name for debugging
MessageRenderer.displayName = 'MessageRenderer';

// Component for expandable content with scrolling
export const ExpandableContent = memo(({
    isExpanded,
    isStreaming,
    title,
    content,
    onToggle,
    headerBackground
}: {
    isExpanded: boolean;
    isStreaming: boolean;
    title: string;
    content: string;
    onToggle: () => void;
    headerBackground?: string;
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const { smoothScrollToBottom } = useSmoothScroll();
    const { showTopShadow, showBottomShadow, shouldShowShadows, setShouldShowShadows, updateShadows } = useScrollShadows(isExpanded, isStreaming);
    const [maxHeightPx, setMaxHeightPx] = useState<number>(0);

    const EXPANDED_MAX_HEIGHT_PX = 240; // 15rem
    const STREAMING_MAX_HEIGHT_PX = 80;  // 5rem

    // CSS for hiding scrollbars during streaming
    const scrollbarStyles = `
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    `;

    // Auto-scroll and shadow updates
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        updateShadows(el);

        const onScroll = () => updateShadows(el);
        el.addEventListener('scroll', onScroll, { passive: true });

        let cleanupAnimation: (() => void) | null = null;

        // Auto-scroll while streaming, regardless of expansion state
        if (isStreaming) {
            cleanupAnimation = smoothScrollToBottom(el);
        }

        return () => {
            el.removeEventListener('scroll', onScroll as any);
            if (cleanupAnimation) cleanupAnimation();
        };
    }, [isStreaming, isExpanded, updateShadows, smoothScrollToBottom]);

    // Auto-scroll effect for streaming content
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        // Auto-scroll when content changes while streaming (even if not expanded)
        if (isStreaming) {
            // Small delay to ensure content has been rendered
            const timer = setTimeout(() => {
                if (el && isStreaming) {
                    smoothScrollToBottom(el);
                }
            }, 50);
            
            return () => clearTimeout(timer);
        }
    }, [content, isStreaming, smoothScrollToBottom]);

    // Resize observer for shadow updates only
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        const updateShadowsFromResize = () => {
            const hasOverflow = el.scrollHeight > el.clientHeight;
            const shouldShow = Boolean((isExpanded || isStreaming) && hasOverflow);
            setShouldShowShadows(shouldShow);
        };

        const resizeObserver = new ResizeObserver(updateShadowsFromResize);
        resizeObserver.observe(el);

        const handleTransitionEnd = (e: TransitionEvent) => {
            if (e.propertyName === 'max-height' || e.propertyName === 'all') {
                updateShadowsFromResize();
            }
        };

        el.addEventListener('transitionend', handleTransitionEnd);
        updateShadowsFromResize();

        return () => {
            resizeObserver.disconnect();
            el.removeEventListener('transitionend', handleTransitionEnd);
        };
    }, [isExpanded, isStreaming, setShouldShowShadows]);

    // Auto-collapse when streaming completes
    useEffect(() => {
        if (!isStreaming && !isExpanded && contentRef.current) {
            // Reset scroll position when streaming completes and we're collapsed
            contentRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [isStreaming, isExpanded]);

    // Height logic: streaming vs non-streaming with proper heights
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        if (isExpanded) {
            // Expanded: use 60rem if not streaming, 20rem if streaming
            const currentHeight = el.clientHeight;
            const targetHeight = isStreaming ? STREAMING_MAX_HEIGHT_PX : EXPANDED_MAX_HEIGHT_PX;
            
            setMaxHeightPx(currentHeight);
            requestAnimationFrame(() => setMaxHeightPx(targetHeight));
        } else {
            // Collapsed: always go to 0
            const currentHeight = el.clientHeight;
            setMaxHeightPx(currentHeight);
            requestAnimationFrame(() => setMaxHeightPx(0));
        }
    }, [isExpanded, isStreaming]);

    const fontColorHex = resolveHexFromTextClass('text-gray-700');

    return (
        <>
            {/* Inject CSS for hiding scrollbars during streaming */}
            {isStreaming && !isExpanded && (
                <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
            )}
            
            <div className="">
            {/* Sticky header */}
            <div className={`${isExpanded ? 'sticky top-0 z-[50] bg-white' : ''} flex items-center justify-between ease-in-out duration-75`} style={{ background: headerBackground }}>
                <button
                    onClick={onToggle}
                    className="text-gray-600 hover:text-gray-800 flex items-center 
                    bg-white/20 backdrop-blur-[10px]"
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                >
                    {isExpanded ? <ChevronsDownUp className="w-4 h-4" viewBox="6 0 24 24" /> : <ChevronsUpDown className="w-4 h-4" viewBox="6 0 24 24" />}
                    <span className={`text-xs text-gray-700 break-words ${isStreaming ? 'shimmer-text' : ''}`} style={{ ['--base-font-color' as any]: fontColorHex }}>{title}</span>
                </button>
            </div>

            {/* Scrollable content with animated height transitions */}
            <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded || isStreaming ? 'py-2' : 'py-0'
            }`}>
                <div
                    ref={contentRef}
                    className={`pr-1 pl-2 ml-[3px] transition-[max-height] duration-300 ease-in-out border-l-2 border-gray-200 ${
                        isExpanded || isStreaming ? 'overflow-y-auto' : 'overflow-hidden'
                    } ${isStreaming && !isExpanded ? 'hide-scrollbar' : ''}`}
                    style={{ 
                        maxHeight: `${maxHeightPx}px`,
                        scrollbarWidth: isStreaming && !isExpanded ? 'none' : 'thin',
                        msOverflowStyle: isStreaming && !isExpanded ? 'none' : 'auto'
                    }}
                >
                    <div className="text-xs text-gray-600 whitespace-pre-wrap break-inside-avoid leading-relaxed">
                        <MarkdownStreamRenderer content={content.trimEnd()} />
                    </div>
                </div>
                {shouldShowShadows && showTopShadow && (
                    <div className="pointer-events-none absolute left-2 top-2 h-6 bg-gradient-to-b from-white to-transparent" style={{ width: 'calc(100% - 16px)' }} />
                )}
                {shouldShowShadows && showBottomShadow && (
                    <div className="pointer-events-none absolute left-2 bottom-2 h-6 bg-gradient-to-t from-white to-transparent" style={{ width: 'calc(100% - 16px)' }} />
                )}
            </div>
        </div>
        </>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to ensure re-rendering when essential props change
    const shouldReRender = prevProps.isExpanded !== nextProps.isExpanded ||
                          prevProps.isStreaming !== nextProps.isStreaming ||
                          prevProps.title !== nextProps.title ||
                          prevProps.content !== nextProps.content;
    
    if (shouldReRender) {
        console.log('🔄 ExpandableContent will re-render:', {
            reason: {
                expandedChanged: prevProps.isExpanded !== nextProps.isExpanded,
                streamingChanged: prevProps.isStreaming !== nextProps.isStreaming,
                titleChanged: prevProps.title !== nextProps.title,
                contentChanged: prevProps.content !== nextProps.content
            }
        });
    }
    
    return !shouldReRender;
});

// Add display name for debugging
ExpandableContent.displayName = 'ExpandableContent';

export const useExpansionState = () => {
    const expansionStateRef = useRef<Map<string, boolean>>(new Map());

    const getExpanded = useCallback((key: string) => {
        return expansionStateRef.current.get(key) ?? false;
    }, []);

    const setExpanded = useCallback((key: string, expanded: boolean) => {
        expansionStateRef.current.set(key, expanded);
    }, []);

    return { getExpanded, setExpanded };
};

