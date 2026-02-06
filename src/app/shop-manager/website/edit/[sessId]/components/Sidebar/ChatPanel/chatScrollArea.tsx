import { useEffect, useMemo, useState, memo, useRef } from "react";

import { ArrowUp, ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";


import { ParsedSectionCard } from './agentResponseRenderer';
import { useAtom } from "jotai";
import { chatDebugModeAtom } from "@/store/editor";
import { AgentTimelineItem } from "@/OSDL/editor/hooks/useBuilderStream";
import { UserMessage } from "./userMessage";
import { BuilderGeneratedImageCard } from "./GeneratedImageCard";

const ChatMessagesScrollAreaComponent = ({
    timeline,
    isAgentBusy,
    expansionManager,
    pendingChanges,
    pageDefinition,
    handleKeepAgentChanges,
    handleRejectAgentChanges
}: {
    timeline: AgentTimelineItem[];
    isAgentBusy: boolean;
    expansionManager: any;
    pendingChanges: Map<string, any>;
    pageDefinition: any;
    handleKeepAgentChanges: (nodeId: string) => void;
    handleRejectAgentChanges: (nodeId: string) => void;
}) => {
    const [debugMode] = useAtom(chatDebugModeAtom);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const [isScrollPinned, setIsScrollPinned] = useState(true);
    const [lastScrollTop, setLastScrollTop] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [showBottomShadow, setShowBottomShadow] = useState(false);

    // Deduplicate timeline items to prevent rendering issues
    const deduplicatedTimeline = useMemo(() => {
        const seen = new Set<number>();
        const filtered: AgentTimelineItem[] = [];
        
        for (const item of timeline) {
            // For streamEnd items, only keep the first one
            if (item.type === 'streamEnd') {
                if (!seen.has(item.order)) {
                    seen.add(item.order);
                    filtered.push(item);
                }
                continue;
            }
            
            // For other items, keep them all but ensure unique keys
            filtered.push(item);
        }
        
        return filtered;
    }, [timeline]);

    // Simple auto-scroll effect - only scroll if pinned
    useEffect(() => {
        if (isScrollPinned && scrollContainerRef.current) {
            // Use a longer delay to ensure React has finished rendering
            const timer = setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100); // 100ms delay to ensure rendering is complete
            
            return () => clearTimeout(timer);
        }
    }, [timeline, isScrollPinned]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            setIsScrolled(scrollTop > 10);
            setShowScrollToBottom(distanceFromBottom > 500);
            setShowBottomShadow(distanceFromBottom > 50);
            
            // Check if user actually scrolled up from bottom
            if (scrollTop < lastScrollTop && distanceFromBottom > 50) {
                setIsScrollPinned(false);
            }
            
            // Check if user scrolled down to bottom
            if (distanceFromBottom < 100) {
                setIsScrollPinned(true);
            }
            
            setLastScrollTop(scrollTop);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [lastScrollTop]);


    const isSectionCurrentlyStreaming = useMemo(() => {
        return (itemIndex: number) => {
            // If agent is not busy, nothing is streaming
            if (!isAgentBusy) return false;
            
            // Find the last parsed section in the timeline
            const lastParsedSectionIndex = deduplicatedTimeline
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item.type === 'parsedSection')
                .pop()?.index ?? -1;
            
            // Only the last parsed section should be streaming
            return itemIndex === lastParsedSectionIndex;
        };
    }, [deduplicatedTimeline, isAgentBusy]);

    // Debug logging for performance monitoring - set to false to disable render logging
    const DEBUG_RENDERS = false; // Change to true to see re-renders


    console.log('this nigger stil fucked??', timeline);


    useEffect(() => {
        if (DEBUG_RENDERS) {
            const sectionCount = deduplicatedTimeline.filter(item => item.type === 'parsedSection').length;
            const userMessageCount = deduplicatedTimeline.filter(item => item.type === 'userMessage').length;
            const rawTokenCount = deduplicatedTimeline.filter(item => item.type === 'rawToken').length;

            // Get section names for debugging
            const sectionNames = deduplicatedTimeline
                .filter(item => item.type === 'parsedSection')
                .map(item => (item as any).sectionName);

            console.log('🔄 ChatMessagesScrollArea re-rendered:', {
                originalTimelineLength: timeline.length,
                deduplicatedTimelineLength: deduplicatedTimeline.length,
                sections: sectionCount,
                userMessages: userMessageCount,
                rawTokens: rawTokenCount,
                sectionNames: sectionNames, // Show which sections exist
                timelineOrder: deduplicatedTimeline.map(item => ({
                    type: item.type,
                    name: item.type === 'parsedSection' ? (item as any).sectionName : item.type,
                    order: item.order
                })), // Show the complete timeline order
                isAgentBusy,
                debugMode,
                timestamp: new Date().toISOString().slice(11, 19) // Show just time
            });

            // Log if we have duplicate section names (indicates a problem)
            const uniqueSections = new Set(sectionNames);
            if (uniqueSections.size !== sectionNames.length) {
                console.warn('⚠️  DUPLICATE SECTIONS DETECTED!', {
                    totalSections: sectionNames.length,
                    uniqueSections: uniqueSections.size,
                    duplicates: sectionNames.filter((name, index) => sectionNames.indexOf(name) !== index)
                });
            }

            // Log if we had duplicates that were filtered out
            if (timeline.length !== deduplicatedTimeline.length) {
                console.warn('⚠️  DUPLICATES FILTERED OUT!', {
                    originalLength: timeline.length,
                    filteredLength: deduplicatedTimeline.length,
                    duplicatesRemoved: timeline.length - deduplicatedTimeline.length
                });
            }
        }
    }, [timeline, deduplicatedTimeline, isAgentBusy, debugMode]);

    const handleScrollToBottom = () => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });

            // Pin when user clicks scroll button
            setIsScrollPinned(true);
        }
    };

    return (
        <div className="p-4 py-2 relative overflow-hidden flex flex-col flex-1">
            {timeline.length === 0 && (
                <div className="text-center text-sm text-gray-400 pt-10">
                    Agent is ready. Ask anything to get started.
                </div>
            )}

                {isScrolled && (
                    <div className="absolute top-2 left-0 right-8 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                )}

                {showBottomShadow && (
                    <div className="absolute bottom-2 left-0 right-8 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-5" />
                )}

                <div ref={scrollContainerRef} className="space-y-4 pr-4 flex-1 overflow-y-auto">
                    {deduplicatedTimeline.map((item, index) => {
                        if (item.type === 'userMessage') {
                            return (
                                <UserMessage key={item.id} message={item.content} imageUrls={item.imageUrls} />
                            );
                        }

                        if (item.type === 'generatedImage') {
                            return (
                                <div key={item.id || `image-${index}`} className="flex justify-start">
                                    <BuilderGeneratedImageCard
                                        imageUrl={item.imageUrl}
                                        loading={item.loading}
                                        prompt={item.prompt}
                                    />
                                </div>
                            );
                        }

                        if (item.type === 'rawToken' && debugMode === 'raw') {
                            return (
                                <div key={`raw-${item.order}-${item.parseStartTimestamp}`} className="bg-gray-50 border border-gray-200 rounded-md p-4">
                                    <div className="text-xs font-semibold text-gray-700 mb-2">Raw Response</div>
                                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono leading-relaxed">
                                        {item.content}
                                    </pre>
                                </div>
                            );
                        }

                        if (item.type === 'parsedSection' && debugMode !== 'raw') {
                            let change = null;
                            if(item.actionId) {
                                change = pendingChanges.get(item.actionId);
                            }

                            return (
                                <ParsedSectionCard
                                    key={`parsed-${item.order}-${item.parseStartTimestamp}`}
                                    sectionName={item.sectionName}
                                    parsedContent={item.parsedContent}
                                    isStreaming={
                                        isSectionCurrentlyStreaming(index)
                                    }
                                    sectionKey={`section-${item.order}`}
                                    expansionManager={expansionManager}
                                    pageDefinition={pageDefinition}
                                    change={change}
                                    onKeepChange={(changeId: string) => {
                                        handleKeepAgentChanges(changeId);
                                    }}
                                    onRejectChange={(changeId: string) => {
                                        handleRejectAgentChanges(changeId);
                                    }}
                                />
                            );
                        }

                        if (item.type === 'streamEnd') {
                            return (
                                <div key={`stream-end-${item.order}-${item.parseStartTimestamp}`} className="space-y-2">
                                    <RatingButtons />
                                    {debugMode === 'raw' &&
                                        <CopyButton
                                            timeline={deduplicatedTimeline}
                                            currentOrder={item.order}
                                        />
                                    }
                                </div>
                            );
                        }

                        return null;
                    })}

                {/* Loading Indicator when agent is busy and the last message is from user with no assistant response yet */}
                {isAgentBusy && (
                    <AgentBusyIndicator />
                )}

          
            </div>

            {/* Scroll to Bottom Button - outside the scrollable area */}
            <button
                onClick={handleScrollToBottom}
                className={`absolute left-1/2 transform -translate-x-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all duration-150 ease-out flex items-center justify-center z-10 ${showScrollToBottom
                    ? 'opacity-100 pointer-events-auto bottom-4 translate-y-0'
                    : 'opacity-100 pointer-events-none -bottom-28 translate-y-2'
                    }`}
            >
                <ArrowUp className="w-3.5 h-3.5 text-blue-700 rotate-180" />
            </button>
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
export const ChatMessagesScrollArea = memo(ChatMessagesScrollAreaComponent, (prevProps, nextProps) => {
    // Only re-render if these specific props have changed
    return (
        prevProps.timeline === nextProps.timeline &&
        prevProps.pageDefinition === nextProps.pageDefinition &&
        prevProps.isAgentBusy === nextProps.isAgentBusy &&
        prevProps.expansionManager === nextProps.expansionManager &&
        prevProps.pendingChanges === nextProps.pendingChanges
    );
});

const AgentBusyIndicator = () => {
    const [dots, setDots] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev === 3 ? 1 : prev + 1);
        }, 400);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-end gap-0.5">
            <p className="text-xs text-gray-500">Generating</p>
            <div className="flex items-center space-x-1 mb-1">
                {dots >= 1 && <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />}
                {dots >= 2 && <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />}
                {dots >= 3 && <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />}
            </div>
        </div>
    );
};

// RatingButtons component for user feedback
const RatingButtons = () => {
    const [rating, setRating] = useState<'like' | 'dislike' | null>(null);

    const handleLike = () => {
        setRating(rating === 'like' ? null : 'like');
        // TODO: Implement actual rating functionality
        console.log(`TODO: User liked response`);
    };

    const handleDislike = () => {
        setRating(rating === 'dislike' ? null : 'dislike');
        // TODO: Implement actual rating functionality  
        console.log(`TODO: User disliked response`);
    };

    return (
        <div className="flex items-center">
            <button
                onClick={handleLike}
                className={`px-1 transition-all duration-75 ${rating === 'like'
                        ? 'text-gray-400'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                title="Rate this response positively"
            >
                <ThumbsUp className={`w-3 h-3 ${rating === 'like' ? 'fill-current' : ''}`} />
            </button>
            <button
                onClick={handleDislike}
                className={`px-1 transition-all duration-75 ${rating === 'dislike'
                        ? 'text-gray-400'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                title="Rate this response negatively"
            >
                <ThumbsDown className={`w-3 h-3 ${rating === 'dislike' ? 'fill-current' : ''}`} />
            </button>
        </div>
    );
};

const CopyButton = ({ timeline, currentOrder }: { timeline: AgentTimelineItem[], currentOrder: number }) => {
    const [copied, setCopied] = useState(false);


    // NOTE: im pretty sure that there's extra logic here for doing this smiple task
    // speciall around indxes and order stuff
    // but imma leave it like this for now.

    // Extract the agent response content for this specific stream
    // Find the streamEnd with currentOrder and collect all rawTokens from that stream
    const content = (() => {
        let accumulatedContent = '';

        // Find the index of the streamEnd with currentOrder
        const streamEndIndex = timeline.findIndex(item =>
            item.type === 'streamEnd' && item.order === currentOrder
        );

        if (streamEndIndex === -1) return '';

        // Go backwards from the streamEnd until we hit the previous streamEnd or userMessage
        for (let i = streamEndIndex - 1; i >= 0; i--) {
            const item = timeline[i];

            // Stop if we hit a user message or the previous stream end
            if (item.type === 'userMessage') {
                break;
            }

            // Collect raw tokens from this stream
            if (item.type === 'rawToken') {
                accumulatedContent = item.content + accumulatedContent;
            }
        }

        return accumulatedContent;
    })();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <div className="flex items-center justify-center py-2">
            <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg border transition-all duration-200 flex items-center gap-2 ${copied
                        ? 'bg-green-50 border-green-200 text-green-600'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                title="Copy response to clipboard"
            >
                {copied ? (
                    <>
                        <Check className="w-3 h-3" />
                        <span className="text-xs">Copied!</span>
                    </>
                ) : (
                    <>
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">Copy</span>
                    </>
                )}
            </button>
        </div>
    );
};
