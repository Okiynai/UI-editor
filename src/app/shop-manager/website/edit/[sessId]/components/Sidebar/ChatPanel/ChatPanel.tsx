import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBuilderStream } from '@/OSDL/editor/hooks/useBuilderStream';

import { useIframeCommunicationContext } from '../../../context/IframeCommunicationContext';
import { StartAgentStreamResponse } from '@/types/ai';

import type { PageDefinition } from '@/OSDL/OSDL.types';

import { UploadDropZone } from '@/components/atoms/UploadDropZone';
import { getAssetFolders, trackAsset } from '@/services/api/shop-manager/assets';

import { ChatInput } from './chatInput';
import { useExpansionState } from './agentResponseRenderer';
import { ChatMessagesScrollArea } from './chatScrollArea';

import { handleBindChangesToActions } from './utils/handleBindChangesToActions';
import { loadDBMessagesToTimeline } from './utils/loadChatFromDB';

// Import session hook
import { useSession } from '@/context/Session';

// Import chat hooks
import {
    useCreateChat,
    useChatMessages
} from '@/hooks/useChats';

// Timeline types are now imported from useAgentStream

export const ChatPanel = ({ pageDefinition }: 
    { pageDefinition?: PageDefinition | null }) => {
    const [inputValue, setInputValue] = React.useState('');
    const [selectedModel, setSelectedModel] = React.useState<"Limited intelligence" | "Mid" | "High">("Mid");
    // Image upload state
    const [attachedImages, setAttachedImages] = React.useState<Array<{ 
        url: string; 
        name: string; 
        size: number; 
        width?: number; 
        height?: number; 
        type: string;
        isUploading?: boolean;
        uploadId?: string;
    }>>([]);
    const [uploadingCount, setUploadingCount] = React.useState(0);
    const [showImageUploader, setShowImageUploader] = React.useState(false);
    const [chatFolderId, setChatFolderId] = React.useState<string | null>(null);
    
    const ensureChatFolderId = useCallback(async (): Promise<string | null> => {
        if (chatFolderId) return chatFolderId;
        const foldersResp = await getAssetFolders();
        const chatFolder = foldersResp?.data?.find((f: any) => f.name === 'chat');
        const folderId = chatFolder?.id || null;
        setChatFolderId(folderId);
        return folderId;
    }, [chatFolderId]);

    // Timeline is now managed by useAgentStream

    // Ref for tracking parsed sections (used for smart merging logic)
    const parsedSectionsRef = useRef<Array<{
        sectionName: string;
        sectionContent: any;
        creationTimestamp?: number;
    }>>([]);

    // Create stable expansion state manager - use ref to prevent re-creation
    const expansionManager = useRef(useExpansionState()).current;

    const { iframeCommunicationManager } = useIframeCommunicationContext();

    // Get shopId from session
    const { shop } = useSession();
    const shopId = shop?.id || '';

    const { 
        startStream, 
        stopStream, 
        closeStream, 
        isAgentBusy, 
        startNewConversation: originalStartNewConversation, 
        pendingChanges, 
        setPendingChanges, 
        streamParser, 
        setConversationId,
        // New timeline functionality
        timeline,
        setTimeline,
        chatError,
        setChatError,
        addUserMessage,
        // User decision recording
        recordUserDecision
    } = useBuilderStream(iframeCommunicationManager);

    // Chat hooks
    const createChatMutation = useCreateChat();
    
    // State for selected chat ID
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    
    // Hook to fetch chat messages when a chat is selected
    const { data: selectedChatMessages } = useChatMessages(selectedChatId || '', 1, 100);

    useEffect(() => {
        // Clear parsed sections ref when component unmounts
        return () => {
            parsedSectionsRef.current = []; // Clear parsed sections ref
            setSelectedChatId(null); // Clear selected chat ID
        };
    }, []);

    useEffect(()=> {
        const deps = {
            setTimeline,
            setPendingChanges
        };

        handleBindChangesToActions(pendingChanges, timeline, deps);
    }, [pendingChanges, timeline, setTimeline, setPendingChanges]);
    
    // Effect to load chat messages when selectedChatId changes
    useEffect(() => {
        if (selectedChatId && selectedChatMessages?.messages) {
            // Convert messages to timeline format and get historical actions
            const { timeline: timelineItems, historicalActions } = loadDBMessagesToTimeline(selectedChatMessages.messages, pageDefinition);

            setTimeline(timelineItems);
            
            // Load historical actions as pendingChanges with their determined status
            if (historicalActions.length > 0) {
                console.log('[ChatPanel] Adding historical actions to pending changes:', historicalActions);
                
                const historicalChangesMap = new Map();
                historicalActions.forEach(action => {
                    // Convert historical action to pendingChange format
                    const changeKey = action.payload.action_code || action.tempId;
                    historicalChangesMap.set(changeKey, {
                        id: changeKey,
                        toolUsed: action.toolName,
                        success: action.status === 'completed',
                        error: action.status === 'failed' ? action.executionResult?.message : null,
                        timestamp: Date.now(),
                        choice: action.status === 'completed' ? 'kept' : 
                               action.status === 'rejected' ? 'rejected' : undefined,
                        isAssociated: true, // Mark as associated since they're from history
                        actionCode: action.payload.action_code
                    });
                });
                
                setPendingChanges(prev => {
                    const newMap = new Map(prev);
                    historicalChangesMap.forEach((value, key) => {
                        newMap.set(key, value);
                    });
                    return newMap;
                });
            }
        }
    }, [selectedChatId, selectedChatMessages, pageDefinition, setPendingChanges]);
    
    // Map UI model names to backend modelTier values
    const getModelTier = (modelName: string): 'low' | 'mid' | 'high' => {
        switch (modelName) {
            case 'Limited intelligence':
                return 'low';
            case 'Mid':
                return 'mid';
            case 'High':
                return 'high';
            default:
                return 'mid';
        }
    };

    const handleSubmit = () => {
        if (isAgentBusy || uploadingCount > 0) return;
        if (!inputValue.trim() && attachedImages.length === 0) return;

        // Clear any previous errors before making a new request
        setChatError(null);

        // Add user message to timeline
        addUserMessage(inputValue, attachedImages.map(img => img.url));

        startStream(
            inputValue,
            attachedImages.map(img => img.url),
            selectedChatId,
            getModelTier(selectedModel)
        ).catch((error: StartAgentStreamResponse) => {
            console.log('Error caught in startStream:', error);

            // Set the new structured error state
            setChatError({
                type: error.errorType || 'generic',
                message: error.message || 'An unexpected error occurred.'
            });

            // The useAgentStream hook now handles removing the user message on error
        });

        setInputValue('');
        setAttachedImages([]);
        setTimeout(() => {
            const textarea = document.querySelector('textarea');
            if (textarea) {
                textarea.style.height = 'auto';
            }
        }, 0);
    };

    // Wrap startNewConversation to reset state
    const startNewConversation = () => {
        parsedSectionsRef.current = []; // Clear parsed sections ref
        setSelectedChatId(null); // Clear selected chat ID
        originalStartNewConversation(); // This now handles timeline and chatError clearing
    };

    // Handle chat selection (manages chat selection state in ChatPanel)
    const handleSelectChat = (sessionId: string) => {
        console.log(`Selected chat: ${sessionId}`);
        
        // Clear any existing errors
        setChatError(null);
        
        // Clear parsed sections ref
        parsedSectionsRef.current = [];
        
        // Set the selected chat ID to trigger the useChatMessages hook
        setSelectedChatId(sessionId);
        
        // Update the conversation ID in the atom to use the selected chat's session ID
        // This ensures useAgentStream uses the correct session ID when starting new streams
        if (sessionId) {
            setConversationId(sessionId);
        }
        
        // Don't call originalStartNewConversation here as it would clear the conversation ID
        // that we just set. Instead, just reset the parser state manually.
        if (streamParser) {
            streamParser.resetAll();
        }
    };

    const handleGetMoreCredits = () => {
        // Navigate to billing page to purchase more credits
        window.open('/shop-manager/settings/billing', '_blank');
    };

    const clearChatError = () => {
        setChatError(null);
    };

    const NOPendingChanges = useMemo(() => {
        return Array
            .from(pendingChanges.values())
            .filter(change => !change.choice && !change.error).length;
    }, [pendingChanges]);

    return (
        <div className="w-full bg-white border-r border-gray-100 flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}> 
            {/* Floating Test Button 
            <FloatingTestButton
                onAddToTimeline={(item: AgentTimelineItem)=> setTimeline(prev => [...prev, item])}
                timeline={timeline}
                setTimeline={setTimeline}
                pendingChanges={pendingChanges}
                setPendingChanges={setPendingChanges as any}
            /> */}

            {/* Chat Header */}
            <div className="h-auto flex flex-col px-4 pt-6 justify-center">
                <div className="flex flex-col items-center w-full mb-4">
                    <div className="bg-gray-100 rounded-md px-4 py-2 text-sm font-medium text-gray-700 tracking-tight">
                        Chat
                    </div>
                </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col flex-1 overflow-hidden relative">
                            <ChatMessagesScrollArea
                                timeline={timeline}
                                pageDefinition={pageDefinition}
                                isAgentBusy={isAgentBusy}
                                expansionManager={expansionManager}
                                pendingChanges={pendingChanges}
                                handleKeepAgentChanges={async (changeId: string) => {
                                    const change = pendingChanges.get(changeId);
                                    if (change && !change.choice && !change.error) {
                                        // Record user decision before updating state
                                        const toolName = change.toolUsed;
                                        const actionParams = {
                                            tool_name: toolName,
                                            action_code: change.actionCode,
                                            // Include other relevant parameters from the change
                                        };
                                        
                                        await recordUserDecision(
                                            toolName,
                                            actionParams,
                                            'approved',
                                            `User approved ${toolName} action`
                                        );
                                        
                                        setPendingChanges(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(changeId, { ...change, choice: 'kept' });
                                            return newMap;
                                        });
                                    }
                                }}
                                handleRejectAgentChanges={async (changeId: string) => {
                                    const change = pendingChanges.get(changeId);

                                    if (change && !change.choice && !change.error) {
                                        // Record user decision before updating state
                                        const toolName = change.toolUsed;
                                        const actionParams = {
                                            tool_name: toolName,
                                            action_code: change.actionCode,
                                            // Include other relevant parameters from the change
                                        };
                                        
                                        await recordUserDecision(
                                            toolName,
                                            actionParams,
                                            'rejected',
                                            `User rejected ${toolName} action`
                                        );
                                        
                                        // Send agent change action to iframe (undo)
                                        if (iframeCommunicationManager) {
                                            iframeCommunicationManager.send('AGENT_CHANGE_ACTION', {
                                                action: 'undo',
                                                actionId: changeId,
                                                change: change.change // single AgentChange object
                                            });
                                        }

                                        setPendingChanges(prev => {
                                            const newMap = new Map(prev);
                                            newMap.set(changeId, { ...change, choice: 'rejected' });
                                            return newMap;
                                        });
                                    }
                                }}
                            />

                        <div className="px-4 pt-2 pb-4 bg-white z-20 flex-shrink-0">
                            {showImageUploader && (
                                <ImageUploader
                                    uploadingCount={uploadingCount}
                                    attachedImages={attachedImages}
                                    setAttachedImages={setAttachedImages}
                                    ensureChatFolderId={ensureChatFolderId}
                                    trackAsset={trackAsset}
                                    setUploadingCount={setUploadingCount}
                                    onClose={() => setShowImageUploader(false)}
                                />
                            )}

                            {(NOPendingChanges > 0) && (
                                <PendingChangesControl
                                    NOPendingChanges={NOPendingChanges}
                                    handleRejectAllAgentChanges={async () => {
                                        // Get all pending changes
                                        const pendingChangesList = Array
                                            .from(pendingChanges.values())
                                            .filter(change => !change.choice && !change.error);

                                        // Record user decisions for all actions
                                        for (const change of pendingChangesList) {
                                            const toolName = change.toolUsed;
                                            const actionParams = {
                                                tool_name: toolName,
                                                action_code: change.actionCode,
                                            };
                                            
                                            await recordUserDecision(
                                                toolName,
                                                actionParams,
                                                'rejected',
                                                `User rejected ${toolName} action (bulk reject)`
                                            );
                                        }

                                        // Send agent change action to iframe (undo all)
                                        // Following the REJECT_AGENT_CHANGES pattern
                                        if (iframeCommunicationManager) {
                                            iframeCommunicationManager.send('AGENT_CHANGE_ACTION', {
                                                action: 'undo',
                                                actionId: 'reject_all_' + Date.now(),
                                                all: true,
                                                agentChanges: pendingChangesList.map(change => change.change) // array of AgentChange objects
                                            });
                                        }

                                        // Mark all pending changes as rejected
                                        setPendingChanges(prev => {
                                            const newMap = new Map(prev);
                                            newMap.forEach((change, id) => {
                                                if (!change.choice && !change.error) {
                                                    newMap.set(id, { ...change, choice: 'rejected' });
                                                }
                                            });
                                            return newMap;
                                        });
                                    }}
                                    handleKeepAllAgentChanges={async () => {
                                        // Get all pending changes
                                        const pendingChangesList = Array
                                            .from(pendingChanges.values())
                                            .filter(change => !change.choice && !change.error);

                                        // Record user decisions for all actions
                                        for (const change of pendingChangesList) {
                                            const toolName = change.toolUsed;
                                            const actionParams = {
                                                tool_name: toolName,
                                                action_code: change.actionCode,
                                            };
                                            
                                            await recordUserDecision(
                                                toolName,
                                                actionParams,
                                                'approved',
                                                `User approved ${toolName} action (bulk approve)`
                                            );
                                        }

                                        // Send agent change action to iframe (redo all - to "keep" the changes)
                                        // Following the REJECT_AGENT_CHANGES pattern
                                        if (iframeCommunicationManager) {
                                            iframeCommunicationManager.send('AGENT_CHANGE_ACTION', {
                                                action: 'redo',
                                                actionId: 'keep_all_' + Date.now(),
                                                all: true,
                                                agentChanges: pendingChangesList.map(change => change.change) // array of AgentChange objects
                                            });
                                        }

                                        // Mark all pending changes as kept
                                        setPendingChanges(prev => {
                                            const newMap = new Map(prev);
                                            newMap.forEach((change, id) => {
                                                if (!change.choice && !change.error) {
                                                    newMap.set(id, { ...change, choice: 'kept' });
                                                }
                                            });
                                            return newMap;
                                        });
                                    }}
                                />
                            )}

                            <ChatInput
                                inputValue={inputValue}
                                onInputChange={setInputValue}
                                onSubmit={handleSubmit}
                                autoFocus={true}
                                isBusy={isAgentBusy}
                                isUploading={uploadingCount > 0}
                                attachedImages={attachedImages}
                                onRemoveImage={(idx) => setAttachedImages(prev => prev.filter((_, i) => i !== idx))}
                                onToggleImageUploader={() => setShowImageUploader(v => !v)}
                                onAddImage={(image) => setAttachedImages(prev => [...prev, image])}
                                startNewConversation={startNewConversation}
                                onCancel={stopStream}
                                setUploadingCount={setUploadingCount}
                                ensureChatFolderId={ensureChatFolderId}
                                trackAsset={trackAsset}
                                onImageUploadComplete={(fileName, fileUrl, width, height) => {
                                    // Update the corresponding image when upload completes
                                    setAttachedImages(prev => prev.map(img => {
                                        if (img.isUploading && img.name === fileName) {
                                            // Clean up the temporary URL
                                            if (img.url.startsWith('blob:')) {
                                                URL.revokeObjectURL(img.url);
                                            }

                                            return {
                                                ...img,
                                                url: fileUrl,
                                                width,
                                                height,
                                                isUploading: false,
                                                uploadId: undefined
                                            };
                                        }
                                        return img;
                                    }));
                                }}
                                isAgentBusy={isAgentBusy}
                                NOPendingChanges={NOPendingChanges}
                                createChatMutation={createChatMutation}
                                onSelectChat={handleSelectChat}
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                            />
                            {/* Chat Error - Outside the scrollable area */}
                            <ChatError
                                chatError={chatError}
                                clearChatError={clearChatError}
                                handleGetMoreCredits={handleGetMoreCredits}
                                startNewConversation={startNewConversation}
                            />
                        </div>
                    </div>
            </div>
        </div>
    );
};

const PendingChangesControl = ({
    NOPendingChanges,
    handleRejectAllAgentChanges,
    handleKeepAllAgentChanges
}: {
    NOPendingChanges: number;
    handleRejectAllAgentChanges: () => void;
    handleKeepAllAgentChanges: () => void;
}) => {
    return (
        <div className="px-2 bg-white z-10">
            <div className="bg-gray-50 border border-gray-200 border-b-0 rounded-t-lg px-2 py-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 tracking-tight">
                        {NOPendingChanges} change{NOPendingChanges !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRejectAllAgentChanges}
                            className="py-0.5 text-xs hover:[&>span]:text-gray-800"
                        >
                            <span className="text-gray-600 tracking-tight transition-colors">Reject all</span>
                        </button>

                        <button
                            onClick={handleKeepAllAgentChanges}
                            className="px-3 py-0.5 text-xs bg-zinc-200/60 rounded-[4px] hover:bg-gray-200 transition-colors"
                        >
                            <span className="text-gray-600 tracking-tight">Keep all</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ImageUploader = ({
    uploadingCount,
    attachedImages,
    setAttachedImages,
    ensureChatFolderId,
    trackAsset,
    setUploadingCount,
    onClose,
}: {
    uploadingCount: number;
    attachedImages: Array<{
        url: string;
        name: string;
        size: number;
        width?: number;
        height?: number;
        type: string;
        isUploading?: boolean;
        uploadId?: string;
    }>;
    setAttachedImages: React.Dispatch<React.SetStateAction<Array<{
        url: string;
        name: string;
        size: number;
        width?: number;
        height?: number;
        type: string;
        isUploading?: boolean;
        uploadId?: string;
    }>>>;
    ensureChatFolderId: () => Promise<string | null>;
    trackAsset: (asset: any) => Promise<any>;
    setUploadingCount: React.Dispatch<React.SetStateAction<number>>;
    onClose?: () => void;
}) => {
    return (
        <div className="mb-2">
            <UploadDropZone
                accept="image/*"
                multiple={true}
                className="w-full border-2 border-dashed border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                onUploadBegin={() => {
                    setUploadingCount(prev => prev + 1);
                }}
                onDrop={(acceptedFiles) => {
                    // Add images immediately when dropped for better UX
                    acceptedFiles.forEach(file => {
                        const tempUrl = URL.createObjectURL(file);
                        const imageId = Math.random().toString(36).substr(2, 9);

                        setAttachedImages(prev => [...prev, {
                            url: tempUrl,
                            name: file.name,
                            size: file.size,
                            width: undefined,
                            height: undefined,
                            type: file.type,
                            isUploading: true,
                            uploadId: imageId
                        }]);
                    });
                    // Close the uploader after drop since input shows loading
                    onClose?.();
                }}
                onClientUploadComplete={async (files) => {
                    try {
                        if (!files || files.length === 0) return;
                        const folderId = await ensureChatFolderId();
                        if (!folderId) {
                            console.error('Chat folder not found');
                        }

                        // Update each uploaded file
                        await Promise.all(files.map(async (file) => {
                            const mimeType = file.mimeType || file.type || 'image/*';
                            if (folderId) {
                                await trackAsset({
                                    folderId,
                                    originalName: file.originalName || file.name,
                                    fileName: file.fileName || file.name,
                                    fileUrl: file.url,
                                    fileSize: file.fileSize || file.size,
                                    mimeType,
                                    type: 'image',
                                    width: (file as any).width,
                                    height: (file as any).height,
                                    uploadSource: 'chat_upload'
                                });
                            }

                            // Find and update the corresponding uploading image
                            setAttachedImages(prev => prev.map(img => {
                                if (img.isUploading && img.name === (file.originalName || file.name)) {
                                    // Clean up the temporary URL
                                    if (img.url.startsWith('blob:')) {
                                        URL.revokeObjectURL(img.url);
                                    }

                                    return {
                                        ...img,
                                        url: file.url,
                                        width: (file as any).width,
                                        height: (file as any).height,
                                        isUploading: false,
                                        uploadId: undefined
                                    };
                                }
                                return img;
                            }));
                        }));
                    } catch (e) {
                        console.error('Failed to handle uploaded images:', e);
                    } finally {
                        setUploadingCount(prev => Math.max(0, prev - 1));
                    }
                }}
                onUploadError={(error: Error) => {
                    console.error('Upload error:', error);
                    setUploadingCount(prev => Math.max(0, prev - 1));
                }}
                content={{
                    uploadIcon: ({ isDragActive, isUploading }) => (
                        <div className="text-center p-4">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
                                <svg className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <p className={`text-sm font-medium mb-1 ${isDragActive ? 'text-primary-600' : 'text-gray-600'}`}>
                                {isDragActive ? "Drop your image here" : "Drop your image here"}
                            </p>
                            <p className="text-xs text-gray-500">
                                or click to browse
                            </p>
                        </div>
                    )
                }}
            />
        </div>
    );
};

const ChatError = ({
    chatError,
    clearChatError,
    handleGetMoreCredits,
    startNewConversation
}: {
    chatError: any;
    clearChatError: () => void;
    handleGetMoreCredits: () => void;
    startNewConversation: () => void;
}) => {
    if (!chatError) return null;

    return (
        <div className="mt-2 rounded-xl p-3 border border-gray-200 bg-gray-50/60 shadow-sm relative">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">
                        {/* Dynamic Title */}
                        {chatError.type === 'credits' && 'You have run out of credits'}
                        {chatError.type === 'message_too_long' && 'Message Too Long'}
                        {chatError.type === 'chat_too_long' && 'Conversation Too Long'}
                        {chatError.type === 'rate_limit' && 'Daily Limit Reached'}
                        {chatError.type === 'sys_rate_limit' && 'System Under Pressure'}
                        {chatError.type === 'generic' && 'An Error Occurred'}
                        {chatError.type === 'network' && 'Network Error'}
                    </h3>
                    <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        {chatError.message}
                    </p>
                    <div className="flex justify-end gap-2">
                        {/* Action Button 1: Primary Action */}
                        {chatError.type === 'credits' && (
                            <button
                                onClick={handleGetMoreCredits}
                                className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Get More Credits
                            </button>
                        )}
                        {chatError.type === 'chat_too_long' && (
                            <button
                                onClick={() => {
                                    startNewConversation();
                                    clearChatError();
                                }}
                                className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Start New Chat
                            </button>
                        )}

                        {/* Action Button 2: Dismissive Action */}
                        {(chatError.type === 'message_too_long' || chatError.type === 'rate_limit' || chatError.type === 'generic' || chatError.type === 'network' || chatError.type === 'sys_rate_limit') && (
                            <button
                                onClick={clearChatError}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Got it
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
