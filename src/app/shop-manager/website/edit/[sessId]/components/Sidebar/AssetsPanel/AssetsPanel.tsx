"use client";

import React, { useState } from 'react';
import { Folder, Plus, Trash2, ChevronDown, Upload, Check, Copy, ImageIcon, File, Archive, Loader2, ChevronUp } from 'lucide-react';
import { UploadDropZone } from '@/components/atoms/UploadDropZone';
import { 
    AssetFolder, 
    ShopAsset, 
    PaginationInfo,
    getAssetFolders, 
    getAssets, 
    createAssetFolder, 
    deleteAssetFolder, 
    initializeDefaultFolders, 
    trackAsset, 
    deleteAsset 
} from '@/services/api/shop-manager/assets';
import { useAssetManagement } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/AssetsPanel/useAssetManagement';

interface AssetsPanelProps {
    // Folder management (kept for backward compatibility but no longer used internally)
    customFolders?: string[];
    onCustomFoldersChange?: (folders: string[]) => void;
    newFolderName?: string;
    onNewFolderNameChange?: (name: string) => void;
    showAddFolderInput?: boolean;
    onShowAddFolderInputChange?: (show: boolean) => void;
    
    // Asset modal
    showAssetModal: boolean;
    onShowAssetModalChange: (show: boolean) => void;
    selectedAssetFolder: string | null;
    onSelectedAssetFolderChange: (folder: string | null) => void;
    
    // Copy URL feedback
    copiedAssetId: number | null;
    onCopiedAssetIdChange: (id: number | null) => void;
    
    // Callbacks
    onOpenAssetFolder: (folderName: string) => void;
    onCopyUrl: (url: string, assetId: number) => Promise<void>;
    onDeleteAsset: (assetId: number) => void;
    
    // Real asset data (legacy props - no longer used since we use the hook internally)
    realFolders?: AssetFolder[];
    realAssets?: Record<string, ShopAsset[]>;
    loading?: boolean;
    uploadingToFolder?: string | null;
    paginationInfo?: Record<string, PaginationInfo>;
    loadingPage?: Record<string, boolean>;
    onLoadRealAssets?: (folderName: string) => Promise<void>;
    onCreateRealFolder?: (name: string) => Promise<void>;
    onDeleteRealFolder?: (folderId: string) => Promise<void>;
    onUploadToFolder?: (files: any[], folderName: string) => Promise<void>;
    onDeleteRealAsset?: (assetId: string) => Promise<void>;
    onLoadMoreAssets?: (folderName: string) => Promise<void>;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Convert ShopAsset to the format expected by the UI
const convertShopAssetToUIAsset = (asset: ShopAsset) => ({
    id: parseInt(asset.id.slice(-8), 16), // Convert UUID to number for compatibility
    name: asset.originalName,
    size: formatFileSize(asset.fileSize),
    type: asset.type === '3d_model' ? '3d' : asset.type,
    url: asset.fileUrl,
    // Ensure thumbnail URL is properly formatted and available
    thumbnail: asset.type === 'image' && asset.fileUrl ? asset.fileUrl : null,
    originalId: asset.id // Keep original ID for API operations
});

export const AssetsPanel: React.FC<AssetsPanelProps> = ({
    customFolders = [],
    onCustomFoldersChange = () => {},
    newFolderName: externalNewFolderName,
    onNewFolderNameChange: externalOnNewFolderNameChange,
    showAddFolderInput: externalShowAddFolderInput,
    onShowAddFolderInputChange: externalOnShowAddFolderInputChange,
    showAssetModal,
    onShowAssetModalChange,
    selectedAssetFolder,
    onSelectedAssetFolderChange,
    copiedAssetId,
    onCopiedAssetIdChange,
    onOpenAssetFolder,
    onCopyUrl,
    onDeleteAsset,
    // Legacy props (ignored since we use the hook internally)
    realFolders: legacyRealFolders,
    realAssets: legacyRealAssets,
    loading: legacyLoading,
    uploadingToFolder: legacyUploadingToFolder,
    paginationInfo: legacyPaginationInfo,
    loadingPage: legacyLoadingPage,
    onLoadRealAssets: legacyOnLoadRealAssets,
    onCreateRealFolder: legacyOnCreateRealFolder,
    onDeleteRealFolder: legacyOnDeleteRealFolder,
    onUploadToFolder: legacyOnUploadToFolder,
    onDeleteRealAsset: legacyOnDeleteRealAsset,
    onLoadMoreAssets: legacyOnLoadMoreAssets
}) => {
    const showFolderManagement = false;

    // Internal state for folder management (replaces the controlled state from parent)
    const [newFolderName, setNewFolderName] = useState("");
    const [showAddFolderInput, setShowAddFolderInput] = useState(false);
    
    // Clipboard functionality state
    const [hasClipboardImage, setHasClipboardImage] = useState(false);
    const [clipboardCheckError, setClipboardCheckError] = useState<string | null>(null);
    const [isCheckingClipboard, setIsCheckingClipboard] = useState(false);
    const [capturedClipboardImage, setCapturedClipboardImage] = useState<File | null>(null);

    // Get real asset management functionality
    const {
        realFolders,
        realAssets,
        loading,
        uploadingToFolder,
        storageQuota,
        paginationInfo,
        loadingPage,
        loadAssetsForFolder,
        loadMoreAssets,
        createCustomFolder,
        deleteCustomFolder,
        uploadToFolder,
        deleteRealAsset
    } = useAssetManagement();

    // Enhanced handlers that use real asset management
    const handleLoadRealAssets = async (folderName: string) => {
        await loadAssetsForFolder(folderName, 1, 50, false);
    };

    const handleCreateRealFolder = async (name: string) => {
        await createCustomFolder(name);
    };

    const handleDeleteRealFolder = async (folderId: string) => {
        await deleteCustomFolder(folderId);
    };

    const handleUploadToFolder = async (files: any[], folderName: string) => {
        try {
            await uploadToFolder(files, folderName);
        } catch (error) {
            console.error('Failed to upload to folder:', error);
            throw error;
        }
    };

    const handleDeleteRealAsset = async (assetId: string) => {
        try {
            await deleteRealAsset(assetId);
        } catch (error) {
            console.error('Failed to delete real asset:', error);
            throw error;
        }
    };

    const handleLoadMoreAssets = async (folderName: string) => {
        await loadMoreAssets(folderName);
    };

    const isSystemFolder = (folderName: string) => {
        const { system } = getAllFolders();
        return system.some((f: AssetFolder) => f.name === folderName);
    };

    const canManageFolderAssets = (folderName: string) => {
        const normalized = folderName.trim().toLowerCase();
        return normalized === 'assets' || !isSystemFolder(folderName) || normalized === '3d_models';
    };

    // Get assets for current folder (real data only)
    const getCurrentFolderAssets = (folderName: string) => {
        if (realAssets && realAssets[folderName]) {
            return realAssets[folderName].map(convertShopAssetToUIAsset);
        }
        return [];
    };

    // Get pagination info for current folder
    const getCurrentFolderPagination = (folderName: string) => {
        if (paginationInfo && paginationInfo[folderName]) {
            return paginationInfo[folderName];
        }
        return null;
    };

    // Check if loading more assets for a folder
    const isLoadingMore = (folderName: string) => {
        return loadingPage && loadingPage[folderName];
    };

    // Get all folders (system + custom, deduplicated)
    const getAllFolders = () => {
        if (!realFolders) return { system: [], custom: [] };
        
        // Deduplicate by name (keep the first occurrence)
        const seenNames = new Set();
        const deduplicatedFolders = realFolders.filter((folder: AssetFolder) => {
            if (seenNames.has(folder.name)) {
                return false;
            }
            seenNames.add(folder.name);
            return true;
        });
        
        const systemFolders = deduplicatedFolders.filter((f: AssetFolder) => f.type === 'system');
        const customFolders = deduplicatedFolders.filter((f: AssetFolder) => f.type === 'custom');
        
        return { system: systemFolders, custom: customFolders };
    };

    const handleAddCustomFolder = async () => {
        const trimmedName = newFolderName.trim();
        if (!trimmedName) return;
        
        const { system, custom } = getAllFolders();
        const allExistingNames = [...system.map((f: AssetFolder) => f.name), ...custom.map((f: AssetFolder) => f.name)];
        
        if (allExistingNames.includes(trimmedName)) {
            return; // Folder already exists
        }
        
        await handleCreateRealFolder(trimmedName);
        setNewFolderName("");
        setShowAddFolderInput(false);
    };

    const handleDeleteCustomFolder = async (folderName: string) => {
        if (realFolders) {
            const folder = realFolders.find((f: AssetFolder) => f.name === folderName && f.type === 'custom');
            if (folder) {
                await handleDeleteRealFolder(folder.id);
            }
        }
    };

    // Clipboard functionality
    const checkAndCaptureClipboardImage = async (): Promise<boolean> => {
        try {
            setIsCheckingClipboard(true);
            setClipboardCheckError(null);
            setCapturedClipboardImage(null);
            
            // Check if clipboard API is available
            if (!navigator.clipboard || !navigator.clipboard.read) {
                setClipboardCheckError('Clipboard API not supported in this browser');
                setHasClipboardImage(false);
                return false;
            }

            // Request clipboard permission if needed
            try {
                const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
                if (permission.state === 'denied') {
                    setClipboardCheckError('Clipboard access denied');
                    setHasClipboardImage(false);
                    return false;
                }
            } catch (permError) {
                // Some browsers might not support permission queries
                console.warn('Permission query not supported:', permError);
            }

            // Read clipboard contents
            const clipboardItems = await navigator.clipboard.read();
            
            let capturedImage: File | null = null;
            for (const clipboardItem of clipboardItems) {
                // Check for image types
                const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
                const availableTypes = clipboardItem.types;
                
                for (const imageType of imageTypes) {
                    if (availableTypes.includes(imageType)) {
                        // Verify the blob exists and has content
                        try {
                            const blob = await clipboardItem.getType(imageType);
                            if (blob && blob.size > 0) {
                                // Additional validation: check if it's not too large (e.g., 10MB limit)
                                const maxSize = 10 * 1024 * 1024; // 10MB
                                if (blob.size <= maxSize) {
                                    // Verify it's actually an image by checking the blob type
                                    if (blob.type && blob.type.startsWith('image/')) {
                                        // Create a file from the blob and capture it
                                        const fileExtension = imageType.split('/')[1] || 'png';
                                        const fileName = `clipboard-image-${Date.now()}.${fileExtension}`;
                                        // @ts-ignore - File constructor is available in browser environment
                                        capturedImage = new File([blob], fileName, { type: imageType });
                                        
                                        // Log the captured image details
                                        console.log('📋 Captured clipboard image:', {
                                            name: fileName,
                                            size: `${(blob.size / 1024).toFixed(2)} KB`,
                                            type: imageType,
                                            dimensions: 'Will be determined after upload',
                                            targetFolder: selectedAssetFolder
                                        });
                                        
                                        break;
                                    }
                                } else {
                                    setClipboardCheckError('Image in clipboard is too large (max 10MB)');
                                }
                            }
                        } catch (blobError) {
                            console.warn('Failed to read blob for type:', imageType, blobError);
                        }
                    }
                }
                
                if (capturedImage) break;
            }
            
            if (capturedImage) {
                setCapturedClipboardImage(capturedImage);
                setHasClipboardImage(true);
                // Here you would upload the captured image
                console.log('Would upload image:', capturedImage);
                return true;
            } else {
                setHasClipboardImage(false);
                setClipboardCheckError('No valid images found in clipboard');
                return false;
            }
            
        } catch (error) {
            console.error('Error checking clipboard:', error);
            setClipboardCheckError('Failed to access clipboard');
            setHasClipboardImage(false);
            return false;
        } finally {
            setIsCheckingClipboard(false);
        }
    };

    return (
        <>
            <div className="w-full bg-white border-r border-gray-100 flex flex-col"  style={{ height: 'calc(100dvh - 56px)' }}>
                <div className="px-4 pt-3 pb-2">
                    <h2 className="font-semibold text-gray-800 text-sm">Assets</h2>
                </div>
                <div className="p-2">
                    <div className="space-y-1">
                        {(() => {
                            const { system, custom } = getAllFolders();
                            
                            return (
                                <>
                                    {/* System Folders */}
                                    {system.map((folder: AssetFolder) => (
                                        <button
                                            key={folder.id}
                                            onClick={async () => {
                                                onOpenAssetFolder(folder.name);
                                                await handleLoadRealAssets(folder.name);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors group"
                                        >
                                            <Folder size={14} className="text-blue-600 transition-colors" />
                                            <span className="text-sm text-gray-700 flex-1">{folder.name.replace('_', ' ')}</span>
                                            <ChevronDown size={12} className="rotate-[-90deg] text-gray-400 group-hover:text-gray-600 transition-colors" />
                                        </button>
                                    ))}

                                    {showFolderManagement && custom.map((folder: AssetFolder) => (
                                        <div
                                            key={folder.id}
                                            className="w-full flex items-center hover:bg-gray-100 rounded-md transition-colors group relative"
                                        >
                                            <button
                                                onClick={async () => {
                                                    onOpenAssetFolder(folder.name);
                                                    await handleLoadRealAssets(folder.name);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left"
                                            >
                                                <Folder size={14} className="text-amber-600 transition-colors" />
                                                <span className="text-sm text-gray-700 flex-1 text-left">{folder.name}</span>
                                                <ChevronDown size={12} className="rotate-[-90deg] text-gray-400 group-hover:text-gray-600 transition-colors" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomFolder(folder.name)}
                                                className="absolute right-8 p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete folder"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            );
                        })()}

                        {showFolderManagement && (
                            <div className="border-t border-gray-200 mt-3 pt-3">
                                {!showAddFolderInput ? (
                                    <button
                                        onClick={() => setShowAddFolderInput(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors group"
                                    >
                                        <Plus size={14} className="text-green-600 transition-colors" />
                                        <span className="text-sm text-gray-600 group-hover:text-gray-700">Add Folder</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2 px-2">
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Folder name..."
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddCustomFolder();
                                                    } else if (e.key === 'Escape') {
                                                        setNewFolderName("");
                                                        setShowAddFolderInput(false);
                                                    }
                                                }}
                                                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                                                    (() => {
                                                        const trimmedName = newFolderName.trim();
                                                        if (!trimmedName) return 'border-gray-200 focus:ring-primary-500 focus:border-primary-500';
                                                        
                                                        const { system, custom } = getAllFolders();
                                                        const allExistingNames = [...system.map((f: AssetFolder) => f.name), ...custom.map((f: AssetFolder) => f.name)];
                                                        
                                                        return allExistingNames.includes(trimmedName)
                                                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                            : 'border-gray-200 focus:ring-primary-500 focus:border-primary-500';
                                                    })()
                                                }`}
                                                autoFocus
                                            />
                                            {(() => {
                                                const trimmedName = newFolderName.trim();
                                                if (!trimmedName) return null;
                                                
                                                const { system, custom } = getAllFolders();
                                                const allExistingNames = [...system.map((f: AssetFolder) => f.name), ...custom.map((f: AssetFolder) => f.name)];
                                                
                                                return allExistingNames.includes(trimmedName) ? (
                                                    <div className="mt-1 text-xs text-red-600">
                                                        A folder with this name already exists
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddCustomFolder}
                                                disabled={(() => {
                                                    const trimmedName = newFolderName.trim();
                                                    if (!trimmedName) return true;
                                                    
                                                    const { system, custom } = getAllFolders();
                                                    const allExistingNames = [...system.map((f: AssetFolder) => f.name), ...custom.map((f: AssetFolder) => f.name)];
                                                    
                                                    return allExistingNames.includes(trimmedName);
                                                })()}
                                                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNewFolderName("");
                                                    setShowAddFolderInput(false);
                                                }}
                                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Asset Modal */}
            {showAssetModal && selectedAssetFolder && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            onShowAssetModalChange(false);
                            onSelectedAssetFolderChange(null);
                        }}
                    >
                        <div 
                            className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header - Sticky */}
                            <div className="sticky top-0 z-10 bg-white rounded-t-lg px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Folder size={20} className={isSystemFolder(selectedAssetFolder) ? "text-blue-600" : "text-amber-600"} />
                                        <h2 className="text-xl font-semibold text-gray-800 capitalize">
                                            {selectedAssetFolder.replace('_', ' ')} Assets
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onShowAssetModalChange(false);
                                            onSelectedAssetFolderChange(null);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 px-6 pb-6 overflow-y-auto">
                                {/* Description */}
                                <div className="mb-6">
                                    <p className="text-sm text-gray-500">
                                        {isSystemFolder(selectedAssetFolder) 
                                            ? `Browse and manage your ${selectedAssetFolder.replace('_', ' ')} files and media`
                                            : "Upload and organize your custom assets"
                                        }
                                    </p>
                                </div>

                                {/* Upload functionality */}
                                {canManageFolderAssets(selectedAssetFolder) && (
                                    <>
                                        {/* Drag and Drop Area */}
                                        <div className="relative mb-8">
                                            {/* Upload Loading Overlay */}
                                            {uploadingToFolder === selectedAssetFolder && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                                                        <p className="text-sm font-medium text-gray-700">Uploading files...</p>
                                                        <p className="text-xs text-gray-500">Please wait while we process your files</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <UploadDropZone
                                                accept="image/*"
                                                multiple={true}
                                                isUploadingExternal={uploadingToFolder === selectedAssetFolder}
                                                className={`border-2 border-dashed rounded-lg p-16 text-center transition-colors bg-gray-50/50 ${
                                                    uploadingToFolder === selectedAssetFolder 
                                                        ? 'border-primary-300 bg-primary-50/50 pointer-events-none' 
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                                content={{
                                                    uploadIcon: ({ isDragActive, isUploading }) => (
                                                        <div>
                                                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mx-auto mb-4">
                                                                <Upload className="w-8 h-8" />
                                                            </div>
                                                            <div className="text-lg font-medium text-gray-900">
                                                                {isDragActive ? 'Drop files to upload' : 'Drag and drop your files here'}
                                                            </div>
                                                            <div className="text-gray-500 mt-2">
                                                                Images only
                                                            </div>
                                                            <div className="text-primary-600 hover:text-primary-700 font-medium underline mt-2">
                                                                {isUploading || uploadingToFolder === selectedAssetFolder ? 'Uploading...' : 'Browse to choose files'}
                                                            </div>
                                                        </div>
                                                    )
                                                }}
                                                onClientUploadComplete={async (res) => {
                                                    if (!selectedAssetFolder) return;
                                                    // Map to shape expected by uploadToFolder
                                                    const files = res.map((r: any) => ({
                                                        name: r.originalName || r.fileName || 'file',
                                                        size: r.fileSize || 0,
                                                        url: r.url,
                                                        type: r.mimeType || 'application/octet-stream',
                                                        width: r.width,
                                                        height: r.height,
                                                    }))
                                                    await uploadToFolder(files as any[], selectedAssetFolder);
                                                }}
                                                onUploadError={(error) => {
                                                    console.error('Upload error:', error);
                                                }}
                                            />
                                            
                                            {/* Supported Formats Info */}
                                            <div className="mt-4 text-center">
                                                <p className="text-sm text-gray-500 mb-3">Supported formats:</p>
                                                <div className="flex flex-wrap justify-center gap-2 mb-3">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">JPG</span>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">PNG</span>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">GIF</span>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">WEBP</span>
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">SVG</span>
                                                </div>
                                                <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
                                            </div>
                                        </div>

                                        {/* Clipboard Upload */}
                                        <div className="border-t border-gray-200 pt-4 mt-4 mb-8">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">Upload from Clipboard</p>
                                                        <p className="text-xs text-gray-500">
                                                            {isCheckingClipboard ? (
                                                                "Checking clipboard..."
                                                            ) : hasClipboardImage ? (
                                                                "Image found in clipboard"
                                                            ) : clipboardCheckError ? (
                                                                clipboardCheckError
                                                            ) : (
                                                                "Click to check clipboard for images"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            checkAndCaptureClipboardImage();
                                                        }}
                                                        disabled={isCheckingClipboard}
                                                        className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        type="button"
                                                    >
                                                        {isCheckingClipboard ? "Checking..." : "Upload from Clipboard"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Assets Grid */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium text-gray-700">
                                            {getCurrentFolderAssets(selectedAssetFolder).length > 0 ? 'Assets' : 'No assets yet'}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {getCurrentFolderAssets(selectedAssetFolder).length > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    {(() => {
                                                        const pagination = getCurrentFolderPagination(selectedAssetFolder);
                                                        if (pagination) {
                                                            return `${getCurrentFolderAssets(selectedAssetFolder).length} of ${pagination.total} files`;
                                                        }
                                                        return `${getCurrentFolderAssets(selectedAssetFolder).length} files`;
                                                    })()}
                                                </p>
                                            )}
                                            {loading && (
                                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Assets List */}
                                    {getCurrentFolderAssets(selectedAssetFolder).length > 0 ? (
                                        <div className="space-y-0">
                                            {getCurrentFolderAssets(selectedAssetFolder).map((asset: any, index: number) => (
                                                <div key={asset.originalId || asset.id} className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors group ${
                                                    index < getCurrentFolderAssets(selectedAssetFolder).length - 1 ? 'border-b border-gray-200' : ''
                                                }`}>
                                                    {/* Asset thumbnail/icon */}
                                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {asset.thumbnail ? (
                                                            <img 
                                                                src={asset.thumbnail} 
                                                                alt={asset.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // Handle broken images by hiding the img and showing icon
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const parent = target.parentElement;
                                                                    if (parent) {
                                                                        parent.innerHTML = `
                                                                            <div class="text-gray-500 flex items-center justify-center w-full h-full">
                                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                                                                    <circle cx="9" cy="9" r="2"/>
                                                                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                                                                </svg>
                                                                            </div>
                                                                        `;
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="text-gray-500">
                                                                {asset.type === 'image' && <ImageIcon size={20} />}
                                                                {asset.type === 'document' && <File size={20} />}
                                                                {asset.type === '3d' && <Archive size={20} />}
                                                                {asset.type === 'archive' && <Archive size={20} />}
                                                                {asset.type === 'video' && <File size={20} />}
                                                                {!['image', 'document', '3d', 'archive', 'video'].includes(asset.type) && <File size={20} />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Asset info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate" title={asset.name}>
                                                            {asset.name}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span>{asset.size}</span>
                                                            <span className="uppercase">{asset.type}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => onCopyUrl(asset.url, asset.id)}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Copy URL"
                                                        >
                                                            {copiedAssetId === asset.id ? (
                                                                <Check size={14} className="text-green-600" />
                                                            ) : (
                                                                <Copy size={14} />
                                                            )}
                                                        </button>
                                                        
                                                        {canManageFolderAssets(selectedAssetFolder) && (
                                                            <button
                                                                onClick={async () => {
                                                                    // Use real API if available
                                                                    if (asset.originalId) {
                                                                        await handleDeleteRealAsset(asset.originalId);
                                                                    } else {
                                                                        // Fallback to mock functionality
                                                                        onDeleteAsset(asset.id);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Delete asset"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Pagination Controls */}
                                            {(() => {
                                                const pagination = getCurrentFolderPagination(selectedAssetFolder);
                                                const isLoadingMoreAssets = isLoadingMore(selectedAssetFolder);
                                                
                                                if (!pagination || pagination.totalPages <= 1) return null;
                                                
                                                return (
                                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-xs text-gray-500">
                                                                Page {pagination.page} of {pagination.totalPages}
                                                            </div>
                                                            
                                                            {pagination.hasNext && (
                                                                <button
                                                                    onClick={() => handleLoadMoreAssets(selectedAssetFolder)}
                                                                    disabled={isLoadingMoreAssets}
                                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                                                                >
                                                                    {isLoadingMoreAssets ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                            Loading...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ChevronUp className="w-3 h-3 rotate-180" />
                                                                            Load More
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Progress indicator */}
                                                        {pagination.total > 0 && (
                                                            <div className="mt-2">
                                                                <div className="w-full bg-gray-200 rounded-full h-1">
                                                                    <div 
                                                                        className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                                                                        style={{ 
                                                                            width: `${(getCurrentFolderAssets(selectedAssetFolder).length / pagination.total) * 100}%` 
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="text-xs text-gray-400 mt-1 text-center">
                                                                    {getCurrentFolderAssets(selectedAssetFolder).length} / {pagination.total} assets loaded
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Folder size={24} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm">
                                                {isSystemFolder(selectedAssetFolder) 
                                                    ? `No ${selectedAssetFolder.replace('_', ' ')} assets yet`
                                                    : "No assets uploaded yet"
                                                }
                                            </p>
                                            {canManageFolderAssets(selectedAssetFolder) && (
                                                <p className="text-xs mt-1">
                                                    Upload your first file using the area above
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}; 
