import { useRef, useEffect, useCallback } from "react";
import { Loader2, X, Image } from "lucide-react";
import { ChatActions } from "./ChatActions";
import { generatePresignedUpload, uploadWithPresignedUrl } from "@/services/api/fileupload";

// Type definitions for ChatInput component
interface ChatInputProps {
    inputValue: string;
    onInputChange: (value: string) => void;

    onSubmit: () => void;

    autoFocus?: boolean;

    isBusy?: boolean;

    isUploading?: boolean;
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
    onRemoveImage: (index: number) => void;
    onToggleImageUploader: () => void;
    onAddImage: (image: {
        url: string;
        name: string;
        size: number;
        width?: number;
        height?: number;
        type: string;
        isUploading?: boolean;
        uploadId?: string;
    }) => void;

    startNewConversation: any;
    onCancel: () => void;

    setUploadingCount: React.Dispatch<React.SetStateAction<number>>;
    ensureChatFolderId: () => Promise<string | null>;
    trackAsset: (data: any) => Promise<any>;
    onImageUploadComplete: (fileName: string, fileUrl: string, width?: number, height?: number) => void;

    // Additional props for chat functionality
    isAgentBusy?: boolean;
    NOPendingChanges?: number;
    createChatMutation?: {
        mutateAsync: (shopId: string) => Promise<any>;
        isPending: boolean;
    };
    onSelectChat?: (chatId: string) => void;

    // Model selection
    selectedModel?: "Limited intelligence" | "Mid" | "High";
    onModelChange?: (model: "Limited intelligence" | "Mid" | "High") => void;
}

export const ChatInput = (props: ChatInputProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Keep textarea focused after submit
    useEffect(() => {
        if (textareaRef.current && props.autoFocus) {
            textareaRef.current.focus();
        }
    }, [props.autoFocus]);

    // Handle paste events for images - upload immediately via Backblaze flow
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            await handlePasteUpload(files);
        }
    }, []);

    // Handle paste upload using Backblaze presigned URLs
    const handlePasteUpload = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        // Add preview placeholders immediately
        files.forEach(file => {
            const tempUrl = URL.createObjectURL(file);
            const imageId = Math.random().toString(36).substr(2, 9);

            props.onAddImage({
                url: tempUrl,
                name: file.name,
                size: file.size,
                width: undefined,
                height: undefined,
                type: file.type,
                isUploading: true,
                uploadId: imageId
            });
        });

        props.setUploadingCount(prev => prev + 1);
        try {
            const folderId = await props.ensureChatFolderId();
            if (!folderId) {
                console.error('Chat folder not found');
            }

            for (const file of files) {
                // Upload to Backblaze
                const { url, publicUrl } = await generatePresignedUpload(file);
                await uploadWithPresignedUrl(file, url);

                // Track asset in chat folder
                if (folderId) {
                    await props.trackAsset({
                        folderId,
                        originalName: file.name,
                        fileName: file.name,
                        fileUrl: publicUrl,
                        fileSize: file.size,
                        mimeType: file.type || 'image/*',
                        type: 'image',
                        uploadSource: 'chat_upload'
                    });
                }

                // Notify parent to replace temp image with final URL
                props.onImageUploadComplete(file.name, publicUrl);
            }
        } catch (err) {
            console.error('Paste upload failed:', err);
        } finally {
            props.setUploadingCount(prev => Math.max(0, prev - 1));
        }
    }, [props.ensureChatFolderId, props.trackAsset, props.onAddImage, props.onImageUploadComplete, props.setUploadingCount]);

    return (
        <div
            className={`rounded-xl p-2 transition-all duration-200 border border-gray-200 hover:border-gray-300/80 focus-within:border-gray-300/80 bg-gray-50/60 shadow-sm`}
        >
            {props.attachedImages.length > 0 && (
                <AttachedImages
                    attachedImages={props.attachedImages}
                    onRemoveImage={props.onRemoveImage}
                    isUploading={props.isUploading}
                />
            )}

            <ChatTextarea
                inputValue={props.inputValue}
                onInputChange={props.onInputChange}
                onSubmit={props.onSubmit}
                autoFocus={props.autoFocus}
                onPaste={handlePaste}
                textareaRef={textareaRef}
            />

            <ChatActions
                isUploading={props.isUploading}
                onToggleImageUploader={props.onToggleImageUploader}
                isBusy={props.isBusy}
                onCancel={props.onCancel}
                onSubmit={props.onSubmit}
                startNewConversation={props.startNewConversation}
                inputValue={props.inputValue}
                attachedImages={props.attachedImages}
                isAgentBusy={props.isAgentBusy}
                NOPendingChanges={props.NOPendingChanges}
                createChatMutation={props.createChatMutation}
                onSelectChat={props.onSelectChat}
                selectedModel={props.selectedModel}
                onModelChange={props.onModelChange}
            />
        </div>
    );
};

// Component for the chat textarea with auto-resize functionality
const ChatTextarea = ({
    inputValue,
    onInputChange,
    onSubmit,
    autoFocus,
    onPaste,
    textareaRef
}: {
    inputValue: string;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
    autoFocus?: boolean;
    onPaste: (e: React.ClipboardEvent) => void;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) => {
    return (
        <textarea
            ref={textareaRef}
            autoFocus={autoFocus}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={onPaste}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                }
            }}
            placeholder="Ask anything... (Shift+⏎ for new line)"
            className="w-full min-h-[20px] mb-3 mt-1 text-xs max-h-32 pr-2 px-0 py-0 border-none resize-none focus:outline-none placeholder-gray-500 leading-5 bg-transparent"
            rows={1}
            style={{
                scrollbarWidth: 'thin',
                display: 'flex',
                flexDirection: 'column-reverse'
            }}
            onInput={(e) => {
                const target = (e.target as HTMLTextAreaElement);
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                target.scrollTop = target.scrollHeight;
            }}
        />
    );
};

// Component for displaying and managing attached images
const AttachedImages = ({
    attachedImages,
    onRemoveImage,
    isUploading
}: {
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
    onRemoveImage: (index: number) => void;
    isUploading?: boolean;
}) => {
    return (
        <div className="flex flex-wrap gap-2 mb-2">
            {attachedImages.map((img, idx) => (
                <div key={`${img.url}-${idx}`} className="relative group">
                    <div className="w-16 h-10 rounded-md overflow-hidden bg-gray-100">
                        {/* Show loading spinner instead of image while uploading */}
                        {img.isUploading ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                            </div>
                        ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={img.url} alt={img.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                    </div>
                    <button
                        onClick={() => onRemoveImage(idx)}
                        className="absolute inset-0 w-full h-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-black/10"
                        title="Remove image"
                        disabled={isUploading}
                    >
                        <X className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            ))}
        </div>
    );
};
