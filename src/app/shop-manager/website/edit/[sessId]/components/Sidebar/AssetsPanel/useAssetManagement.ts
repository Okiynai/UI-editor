import { useState, useEffect, useCallback } from 'react';
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
    deleteAsset,
    StorageQuota,
    getStorageQuota
} from '@/services/api/shop-manager/assets';

const normalizeFolderName = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, '_');

const resolveFolderAlias = (value: string): string => {
    const normalized = normalizeFolderName(value);
    if (['images', 'image', 'chat', 'documents', 'document', '3d_models', '3d_model', 'system-images', 'system-docs'].includes(normalized)) {
        return 'assets';
    }
    return normalized;
};

// Helper function to determine asset type from mime type
const getAssetType = (mimeType: string): 'image' | 'video' | '3d_model' | 'document' | 'archive' | 'other' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('gltf') || mimeType.includes('glb') || mimeType.includes('obj') || mimeType.includes('fbx')) return '3d_model';
    if (mimeType.includes('pdf') || mimeType.includes('doc') || mimeType.includes('sheet') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
    return 'other';
};

export const useAssetManagement = () => {
    // Real asset data state
    const [realFolders, setRealFolders] = useState<AssetFolder[]>([]);
    const [realAssets, setRealAssets] = useState<Record<string, ShopAsset[]>>({});
    const [loading, setLoading] = useState(false);
    const [uploadingToFolder, setUploadingToFolder] = useState<string | null>(null);
    const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);
    
    // Pagination state - track pagination info for each folder
    const [paginationInfo, setPaginationInfo] = useState<Record<string, PaginationInfo>>({});
    const [loadingPage, setLoadingPage] = useState<Record<string, boolean>>({});

    // Initialize asset management system
    const initializeAssets = useCallback(async () => {
        try {
            setLoading(true);
            
            // Load folders (backend should ensure default folders exist)
            const foldersResponse = await getAssetFolders();
            if (foldersResponse.success && foldersResponse.data) {
                setRealFolders(foldersResponse.data);
            }
            
            // Load storage quota
            const quotaResponse = await getStorageQuota();
            if (quotaResponse.success && quotaResponse.data) {
                setStorageQuota(quotaResponse.data);
            }
            
        } catch (error) {
            console.error('Failed to initialize assets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load assets for a specific folder with pagination
    const loadAssetsForFolder = useCallback(async (
        folderName: string, 
        page: number = 1, 
        limit: number = 50,
        append: boolean = false
    ) => {
        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingPage(prev => ({ ...prev, [folderName]: true }));
            }
            
            // Find the folder by name
            const requested = resolveFolderAlias(folderName);
            const folder = realFolders.find(f => resolveFolderAlias(f.name) === requested) || realFolders[0];
            if (!folder) {
                console.warn(`Folder ${folderName} not found`);
                return;
            }
            
            // Load assets for this folder
            const assetsResponse = await getAssets({ 
                folderId: folder.id, 
                page, 
                limit 
            });
            
            // Update assets state
            if (assetsResponse.success && assetsResponse.data) {
                const { assets, pagination } = assetsResponse.data;
                
                setRealAssets(prev => {
                    if (append && prev[folderName]) {
                        // Append new assets to existing ones
                        return {
                            ...prev,
                            [folderName]: [...prev[folderName], ...assets]
                        };
                    } else {
                        // Replace assets for this folder
                        return {
                            ...prev,
                            [folderName]: assets
                        };
                    }
                });
                
                // Update pagination info
                setPaginationInfo(prev => ({
                    ...prev,
                    [folderName]: pagination
                }));
            }
            
        } catch (error) {
            console.error(`Failed to load assets for folder ${folderName}:`, error);
        } finally {
            setLoading(false);
            setLoadingPage(prev => ({ ...prev, [folderName]: false }));
        }
    }, [realFolders]);

    // Load more assets for pagination
    const loadMoreAssets = useCallback(async (folderName: string) => {
        const currentPagination = paginationInfo[folderName];
        if (!currentPagination || !currentPagination.hasNext) {
            return;
        }
        
        await loadAssetsForFolder(
            folderName, 
            currentPagination.page + 1, 
            currentPagination.limit,
            true // append to existing assets
        );
    }, [paginationInfo, loadAssetsForFolder]);

    // Create a new custom folder
    const createCustomFolder = useCallback(async (name: string) => {
        try {
            const folderResponse = await createAssetFolder({
                name,
                description: `Custom folder: ${name}`
            });
            
            // Update folders state
            if (folderResponse.success && folderResponse.data) {
                setRealFolders(prev => [...prev, folderResponse.data!]);
            }
            
        } catch (error) {
            console.error(`Failed to create folder ${name}:`, error);
            throw error;
        }
    }, []);

    // Delete a custom folder
    const deleteCustomFolder = useCallback(async (folderId: string) => {
        try {
            await deleteAssetFolder(folderId);
            
            // Update folders state
            setRealFolders(prev => prev.filter(f => f.id !== folderId));
            
            // Clear assets and pagination for this folder
            const folderName = realFolders.find(f => f.id === folderId)?.name;
            if (folderName) {
                setRealAssets(prev => {
                    const updated = { ...prev };
                    delete updated[folderName];
                    return updated;
                });
                setPaginationInfo(prev => {
                    const updated = { ...prev };
                    delete updated[folderName];
                    return updated;
                });
            }
            
        } catch (error) {
            console.error(`Failed to delete folder ${folderId}:`, error);
            throw error;
        }
    }, [realFolders]);

    // Upload files to a folder
    const uploadToFolder = useCallback(async (files: any[], folderName: string) => {
        try {
            setUploadingToFolder(folderName);
            
            // Find the folder
            const folder = realFolders.find(f => f.name === folderName);
            if (!folder) {
                throw new Error(`Folder ${folderName} not found`);
            }

            // Track each uploaded file as an asset
            for (const file of files) {
                const mimeType = file.type || 'application/octet-stream';
                await trackAsset({
                    folderId: folder.id,
                    originalName: file.name,
                    fileName: file.name,
                    fileUrl: file.url,
                    fileSize: file.size,
                    mimeType,
                    type: getAssetType(mimeType),
                    width: file.width,
                    height: file.height,
                    uploadSource: 'manual_upload'
                });
            }

            // Reload assets for this folder (reset to first page)
            await loadAssetsForFolder(folderName, 1, 50, false);
            
        } catch (error) {
            console.error(`Failed to upload files to folder ${folderName}:`, error);
            throw error;
        } finally {
            setUploadingToFolder(null);
        }
    }, [realFolders, loadAssetsForFolder]);

    // Delete an asset
    const deleteRealAsset = useCallback(async (assetId: string) => {
        try {
            await deleteAsset(assetId);
            
            // Update assets state by removing the deleted asset
            setRealAssets(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(folderName => {
                    updated[folderName] = updated[folderName].filter(asset => asset.id !== assetId);
                    
                    // Update pagination total count
                    setPaginationInfo(prevPagination => {
                        const folderPagination = prevPagination[folderName];
                        if (folderPagination) {
                            return {
                                ...prevPagination,
                                [folderName]: {
                                    ...folderPagination,
                                    total: Math.max(0, folderPagination.total - 1)
                                }
                            };
                        }
                        return prevPagination;
                    });
                });
                return updated;
            });
            
        } catch (error) {
            console.error(`Failed to delete asset ${assetId}:`, error);
            throw error;
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        initializeAssets();
    }, [initializeAssets]);

    return {
        // State
        realFolders,
        realAssets,
        loading,
        uploadingToFolder,
        storageQuota,
        paginationInfo,
        loadingPage,
        
        // Actions
        loadAssetsForFolder,
        loadMoreAssets,
        createCustomFolder,
        deleteCustomFolder,
        uploadToFolder,
        deleteRealAsset,
        initializeAssets
    };
}; 
