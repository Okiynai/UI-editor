import React, { useRef, useState, useEffect } from "react";
import { Loader2, X, Image, History, Plus, ArrowUp, Check, ChevronDown } from "lucide-react";
import { useSession } from "@/context/Session";
import {
    useChatHistory,
    useRenameChat,
    useDeleteChat
} from "@/hooks/useChats";

// Type definitions for ChatActions component
interface ChatActionsProps {
    isUploading?: boolean;
    onToggleImageUploader: () => void;
    isBusy?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
    startNewConversation: any;
    inputValue: string;
    attachedImages: Array<any>;
    isAgentBusy?: boolean;
    NOPendingChanges?: number;

    // Passed from parent for chat creation and selection
    createChatMutation?: {
        mutateAsync: (shopId: string) => Promise<any>;
        isPending: boolean;
    };
    onSelectChat?: (chatId: string) => void;

    // Model selection
    selectedModel?: "Limited intelligence" | "Mid" | "High";
    onModelChange?: (model: "Limited intelligence" | "Mid" | "High") => void;
}

export const ChatActions = (props: ChatActionsProps) => {
    // Refs for button positioning
    const historyButtonRef = useRef<HTMLButtonElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const modelSelectorRef = useRef<HTMLButtonElement>(null);

    // State for floating panels
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [showNewChatConfirmation, setShowNewChatConfirmation] = useState(false);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [historyPanelPosition, setHistoryPanelPosition] = useState({ left: 0, bottom: 0 });
    const [newChatPanelPosition, setNewChatPanelPosition] = useState({ left: 0, bottom: 0 });
    const [modelSelectorPosition, setModelSelectorPosition] = useState({ left: 0, bottom: 0 });

    // State for chat management
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
    const [editInputValue, setEditInputValue] = useState("");

    // Get session data
    const { shop } = useSession();
    const shopId = shop?.id || '';

    // Chat hooks (only the ones that belong in ChatActions)
    const {
        data: chatHistoryData,
        isLoading: isLoadingChatHistory,
        error: chatHistoryError
    } = useChatHistory(shopId, 1, 50, isHistoryPanelOpen && !!shopId); // Only fetch when panel is open

    const renameChatMutation = useRenameChat();
    const deleteChatMutation = useDeleteChat();

    // Transform chat data to match expected interface
    const chatHistory = chatHistoryData?.chats?.map(chat => ({
        id: chat.sessionId, // Changed from chat.sessionId to chat.sessionId
        name: chat.name,
        createdAt: new Date(chat.createdAt).toISOString(),
        updatedAt: new Date(chat.updatedAt).toISOString()
    })) || [];

    // Sort chat history by updatedAt (most recent first)
    const sortedChatHistory = chatHistory.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Close history panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isHistoryPanelOpen &&
                historyButtonRef.current &&
                !historyButtonRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.history-panel')) {
                setIsHistoryPanelOpen(false);
            }
        };

        if (isHistoryPanelOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isHistoryPanelOpen]);

    // Clear edit/delete states when history panel closes
    useEffect(() => {
        if (!isHistoryPanelOpen) {
            setEditingChatId(null);
            setDeletingChatId(null);
            setEditInputValue("");
        }
    }, [isHistoryPanelOpen]);

    // Close new chat confirmation panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showNewChatConfirmation) {
                const target = event.target as Element;
                if (!target.closest('.new-chat-confirmation-panel') &&
                    !target.closest('.new-chat-button')) {
                    setShowNewChatConfirmation(false);
                }
            }
        };

        if (showNewChatConfirmation) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNewChatConfirmation]);

    // Close model selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isModelSelectorOpen &&
                modelSelectorRef.current &&
                !modelSelectorRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.model-selector-panel')) {
                setIsModelSelectorOpen(false);
            }
        };

        if (isModelSelectorOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModelSelectorOpen]);

    // Handle window resize to recalculate positions
    useEffect(() => {
        const handleResize = () => {
            if (isHistoryPanelOpen && historyButtonRef.current) {
                const rect = historyButtonRef.current.getBoundingClientRect();
                if (rect && rect.left !== 0 && rect.top !== 0) {
                    setHistoryPanelPosition({
                        left: rect.left - 20,
                        bottom: window.innerHeight - rect.top + 12
                    });
                } else {
                    // Fallback positioning if rect is not available
                    setHistoryPanelPosition({
                        left: 100,
                        bottom: 120
                    });
                }
            }
            if (showNewChatConfirmation && plusButtonRef.current) {
                const rect = plusButtonRef.current.getBoundingClientRect();
                if (rect && rect.left !== 0 && rect.top !== 0) {
                    setNewChatPanelPosition({
                        left: rect.left - 10,
                        bottom: window.innerHeight - rect.top + 8
                    });
                } else {
                    // Fallback positioning if rect is not available
                    setNewChatPanelPosition({
                        left: 200,
                        bottom: 100
                    });
                }
            }
            if (isModelSelectorOpen && modelSelectorRef.current) {
                const rect = modelSelectorRef.current.getBoundingClientRect();
                if (rect && rect.left !== 0 && rect.top !== 0) {
                    setModelSelectorPosition({
                        left: rect.left,
                        bottom: window.innerHeight - rect.top + 8
                    });
                } else {
                    // Fallback positioning if rect is not available
                    setModelSelectorPosition({
                        left: 300,
                        bottom: 100
                    });
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isHistoryPanelOpen, showNewChatConfirmation, isModelSelectorOpen]);

    // Handle chat renaming
    const handleRenameChat = async (sessionId: string, newName: string) => {
        try {
            await renameChatMutation.mutateAsync({ chatId: sessionId, name: newName }); // Keep chatId for API call
            setEditingChatId(null);
            setEditInputValue("");
        } catch (error) {
            console.error('Failed to rename chat:', error);
        }
    };

    // Handle chat deletion
    const handleDeleteChat = async (sessionId: string) => {
        try {
            await deleteChatMutation.mutateAsync(sessionId); // Use sessionId directly
            setDeletingChatId(null);
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    };

    // Handle chat selection (uses passed prop)
    const handleSelectChat = (sessionId: string) => {
        // Close the history panel when a chat is selected
        console.log('close dat shit mannn');
        setIsHistoryPanelOpen(false);

        if (props.onSelectChat) {
            props.onSelectChat(sessionId);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between h-6 mt-2">
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <button
                            ref={historyButtonRef}
                            onClick={() => {
                                if (!isHistoryPanelOpen) {
                                    // Calculate position before showing panel
                                    const rect = historyButtonRef.current?.getBoundingClientRect();
                                    if (rect && rect.left !== 0 && rect.top !== 0) {
                                        setHistoryPanelPosition({
                                            left: rect.left - 17,
                                            bottom: window.innerHeight - rect.top + 12
                                        });
                                    } else {
                                        // Fallback positioning if rect is not available
                                        setHistoryPanelPosition({
                                            left: 103,
                                            bottom: 120
                                        });
                                    }
                                }
                                setIsHistoryPanelOpen(!isHistoryPanelOpen);
                            }}
                            className="w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center transition-colors rounded-full"
                            title="Chats History"
                        >
                            <History className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="relative">
                        <button
                            ref={plusButtonRef}
                            onClick={() => {
                                if (props.isAgentBusy || (props.NOPendingChanges && props.NOPendingChanges > 0)) {
                                    setShowNewChatConfirmation(true);

                                    setIsHistoryPanelOpen(false); // Close history panel if open
                                    // Calculate position before showing panel
                                    const rect = plusButtonRef.current?.getBoundingClientRect();
                                    if (rect && rect.left !== 0 && rect.top !== 0) {
                                        setNewChatPanelPosition({
                                            left: rect.left - 17,
                                            bottom: window.innerHeight - rect.top + 8
                                        });
                                    } else {
                                        // Fallback positioning if rect is not available
                                        setNewChatPanelPosition({
                                            left: 193,
                                            bottom: 100
                                        });
                                    }
                                    setShowNewChatConfirmation(true);
                                } else {
                                    setIsHistoryPanelOpen(false); // Close history panel if open
                                    // Calculate position before showing panel
                                    const rect = plusButtonRef.current?.getBoundingClientRect();
                                    if (rect && rect.left !== 0 && rect.top !== 0) {
                                        setNewChatPanelPosition({
                                            left: rect.left - 17,
                                            bottom: window.innerHeight - rect.top + 8
                                        });
                                    } else {
                                        // Fallback positioning if rect is not available
                                        setNewChatPanelPosition({
                                            left: 193,
                                            bottom: 100
                                        });
                                    }
                                    props.startNewConversation();
                                }
                            }}
                            className="new-chat-button w-6 h-6 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center transition-colors rounded-full"
                            title="New Chat"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    
                    {/* Model Selector */}
                    {props.selectedModel && props.onModelChange && (
                        <div className="relative ml-3 mb-[2px]">
                            <button
                                ref={modelSelectorRef}
                                onClick={() => {
                                    if (!isModelSelectorOpen) {
                                        // Calculate position before showing panel
                                        const rect = modelSelectorRef.current?.getBoundingClientRect();
                                        if (rect && rect.left !== 0 && rect.top !== 0) {
                                            setModelSelectorPosition({
                                                left: rect.left,
                                                bottom: window.innerHeight - rect.top + 8
                                            });
                                        } else {
                                            // Fallback positioning if rect is not available
                                            setModelSelectorPosition({
                                                left: 300,
                                                bottom: 100
                                            });
                                        }
                                    }
                                    setIsModelSelectorOpen(!isModelSelectorOpen);
                                    setIsHistoryPanelOpen(false); // Close other panels
                                    setShowNewChatConfirmation(false);
                                }}
                                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors text-xs"
                                title="Select Model"
                            >
                                <span className="font-medium">{props.selectedModel}</span>
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <UploadButton
                        isUploading={props.isUploading}
                        onToggleImageUploader={props.onToggleImageUploader}
                    />
                    <SubmitButton
                        isBusy={props.isBusy}
                        isUploading={props.isUploading}
                        onCancel={props.onCancel}
                        onSubmit={props.onSubmit}
                        inputValue={props.inputValue}
                        attachedImages={props.attachedImages}
                    />
                </div>
            </div>

            {/* Floating Panels - positioned fixed to avoid overflow clipping */}
            {/* History Panel */}
            {isHistoryPanelOpen && (
                <div
                    className="history-panel fixed z-[100]"
                    style={{
                        left: `${historyPanelPosition.left}px`,
                        bottom: `${historyPanelPosition.bottom}px`
                    }}
                >
                    <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-lg min-w-[320px] max-w-[320px] relative px-1 py-0.5">
                        {/* Triangle pointing down - positioned at the bottom center */}
                        <div className="absolute -bottom-2 left-[22px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-50" />
                        {/* Chat History */}
                        <div className="max-h-48 overflow-y-auto py-1 px-1 pr-2">
                            {!shopId ? (
                                <div className="text-center py-4">
                                    <p className="text-xs text-red-500">Shop not available</p>
                                    <p className="text-xs text-gray-400 mt-1">Please refresh the page</p>
                                </div>
                            ) : isLoadingChatHistory ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                    <span className="text-xs text-gray-500 ml-2">Loading chats...</span>
                                </div>
                            ) : chatHistoryError ? (
                                <div className="text-center py-4">
                                    <p className="text-xs text-red-500">Failed to load chats</p>
                                    <p className="text-xs text-gray-400 mt-1">Please try again later</p>
                                </div>
                            ) : sortedChatHistory.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-xs text-gray-500">No chats yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Start a conversation to see your chat history</p>
                                </div>
                            ) : (
                                sortedChatHistory.map((chat) => {
                                    // Check if this chat is being edited or deleted
                                    const isEditing = editingChatId === chat.id;
                                    const isDeleting = deletingChatId === chat.id;

                                    // If editing or deleting, show the input interface
                                    if (isEditing || isDeleting) {
                                        return (
                                            <div key={chat.id} className={`flex items-center px-2 py-1.5 rounded-md my-0.5 ${
                                                isDeleting ? 'bg-red-200' : 'bg-gray-200'
                                            }`}>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input
                                                            type="text"
                                                            value={editInputValue}
                                                            onChange={(e) => setEditInputValue(e.target.value)}
                                                            className="flex-1 text-xs font-bold text-gray-600 bg-transparent border-none outline-none resize-none"
                                                            autoFocus
                                                            onFocus={(e) => e.target.select()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                                                    if (editInputValue.trim()) {
                                    handleRenameChat(chat.id, editInputValue.trim()); // chat.id is sessionId
                                }
                            } else if (e.key === 'Escape') {
                                setEditingChatId(null);
                                setEditInputValue('');
                            }
                        }}
                        onBlur={() => {
                            // Exit editing mode when input loses focus
                            if (editInputValue.trim()) {
                                handleRenameChat(chat.id, editInputValue.trim()); // chat.id is sessionId
                            } else {
                                setEditingChatId(null);
                                setEditInputValue('');
                            }
                        }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <span className="text-xs text-red-800 font-medium">Delete chat "{chat.name}"?</span>
                                                        <div className="flex items-center gap-1 ml-auto">
                                                                                        <button
                                onClick={() => handleDeleteChat(chat.id)} // chat.id is sessionId
                                className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                            >
                                                                <Check className="w-3 h-3 text-red-700 hover:text-red-950 transition-colors" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setDeletingChatId(null);
                                                                }}
                                                                className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                                                            >
                                                                <X className="w-3 h-3 text-gray-600 hover:text-gray-800 transition-colors" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    return (
                                                                <div
                            key={chat.id}
                            className="flex items-center px-2 py-1.5 hover:bg-gray-200 rounded-md cursor-pointer group my-0.5 transition-colors"
                            onClick={() => handleSelectChat(chat.id)} // chat.id is sessionId
                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-700 truncate">{chat.name}</p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {new Date(chat.updatedAt).toLocaleDateString()} • {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingChatId(chat.id); // chat.id is sessionId
                                                        setEditInputValue(chat.name);
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-300 transition-colors"
                                                    title="Rename chat"
                                                >
                                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingChatId(chat.id); // chat.id is sessionId
                                                    }}
                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-200 transition-colors"
                                                    title="Delete chat"
                                                >
                                                    <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Chat Confirmation Panel */}
            {showNewChatConfirmation && (
                <div
                    className="new-chat-confirmation-panel fixed z-[100]"
                    style={{
                        left: `${newChatPanelPosition.left}px`,
                        bottom: `${newChatPanelPosition.bottom}px`
                    }}
                >
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg w-[240px] relative px-3 py-2.5">
                        {/* Triangle pointing down - positioned to align with plus icon */}
                        <div className="absolute -bottom-1.5 left-6 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />

                        <div className="text-center mb-3">
                            <h3 className="text-xs font-semibold text-gray-800 mb-1.5">Start New Chat?</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {props.isAgentBusy
                                    ? "The agent is currently working. Starting a new chat will cancel the current request and lose all progress."
                                    : `You have ${props.NOPendingChanges} pending change${props.NOPendingChanges !== 1 ? 's' : ''}. Starting a new chat will clear all pending changes and lose progress.`
                                }
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setShowNewChatConfirmation(false)}
                                className="flex-1 px-2 py-1.5 text-xs hover:bg-gray-200 text-gray-700 rounded transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    setShowNewChatConfirmation(false);

                                    // Create new chat if we have a shopId
                                    if (shopId && props.createChatMutation) {
                                        try {
                                            await props.createChatMutation.mutateAsync(shopId);
                                        } catch (error) {
                                            console.error('Failed to create new chat:', error);
                                            return;
                                        }
                                    }

                                    props.startNewConversation();
                                }}
                                disabled={props.createChatMutation?.isPending}
                                className="flex-1 px-2 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {props.createChatMutation?.isPending ? (
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                        Creating...
                                    </div>
                                ) : (
                                    'Start New Chat'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Model Selector Panel */}
            {isModelSelectorOpen && props.selectedModel && props.onModelChange && (
                <div
                    className="model-selector-panel fixed z-[100]"
                    style={{
                        left: `${modelSelectorPosition.left}px`,
                        bottom: `${modelSelectorPosition.bottom}px`
                    }}
                >
                    <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-lg min-w-[200px] relative px-2 py-1">
                        {/* Triangle pointing down */}
                        <div className="absolute -bottom-1.5 left-4 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />

                        <div className="py-1">
                            {(['Limited intelligence', 'Mid', 'High'] as const).map((model) => (
                                <button
                                    key={model}
                                    onClick={() => {
                                        props.onModelChange?.(model);
                                        setIsModelSelectorOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-gray-50 ${
                                        props.selectedModel === model ? "text-gray-900" : "text-gray-800"
                                    }`}
                                >
                                    <div className="text-left">
                                        <div className="text-xs font-medium text-gray-900">{model}</div>
                                        <div className="text-[10px] text-gray-500">
                                            {model === 'Limited intelligence' && 'Light, fast, budget friendly'}
                                            {model === 'Mid' && 'Balanced quality & speed'}
                                            {model === 'High' && 'Best reasoning & quality'}
                                        </div>
                                    </div>
                                    {props.selectedModel === model && <Check className="h-3 w-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Component for the upload button with loading state
const UploadButton = ({
    isUploading,
    onToggleImageUploader
}: {
    isUploading?: boolean;
    onToggleImageUploader: () => void;
}) => {
    return (
        <button
            className={`w-6 h-6 ${isUploading ? 'bg-gray-100' : 'bg-white hover:bg-gray-100'} border border-gray-200 text-gray-600 flex items-center justify-center transition-colors rounded-full`}
            title={isUploading ? 'Uploading...' : 'Upload image'}
            onClick={() => { if (!isUploading) onToggleImageUploader(); }}
            disabled={isUploading}
        >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
        </button>
    );
};

// Component for the submit button with complex state logic
const SubmitButton = ({
    isBusy,
    isUploading,
    onCancel,
    onSubmit,
    inputValue,
    attachedImages
}: {
    isBusy?: boolean;
    isUploading?: boolean;
    onCancel: () => void;
    onSubmit: () => void;
    inputValue: string;
    attachedImages: Array<any>;
}) => {
    const canSubmit = (inputValue.trim() || attachedImages.length > 0) && !isUploading;
    const isDisabled = !isBusy && ((inputValue.trim() === '' && attachedImages.length === 0) || isUploading);

    return (
        <button
            onClick={isBusy ? onCancel : onSubmit}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                isBusy
                    ? 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
                    : canSubmit
                        ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            disabled={isDisabled}
            title={isBusy ? 'Cancel current request' : isUploading ? 'Wait for uploads to finish' : 'Press ⏎ to send'}
        >
            {isBusy ? <div className="w-2 h-2 bg-gray-500 rounded-sm" /> : <ArrowUp className="w-3.5 h-3.5" />}
        </button>
    );
};
