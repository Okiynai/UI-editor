'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Field, RendererProps } from '../../types';
import { defaultReader, defaultMutatorsCreator } from '../../utils';
import { Upload, ImageIcon, X, Check, Loader2, ArrowLeft } from 'lucide-react';
import { UploadDropzone } from '@/lib/uploadthing';
import { OverrideCreatorWrapper, OverrideDisplay } from '../../utils/defaults/OverrideUtils';
import { useAssetManagement } from '@/app/shop-manager/website/edit/[sessId]/components/Sidebar/AssetsPanel/useAssetManagement';

interface imageSrcFieldProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  onOpenAssetsModal?: () => void;
  isOverride?: boolean;
}

interface AssetsSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assetUrl: string) => void;
  selectedFolder: string | null;
}

const normalizeFolderName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_');

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Convert ShopAsset to the format expected by the UI
const convertShopAssetToUIAsset = (asset: any) => ({
  id: parseInt(asset.id.slice(-8), 16), // Convert UUID to number for compatibility
  name: asset.originalName,
  size: formatFileSize(asset.fileSize),
  type: asset.type === '3d_model' ? '3d' : asset.type,
  url: asset.fileUrl,
  thumbnail: asset.type === 'image' && asset.fileUrl ? asset.fileUrl : null,
  originalId: asset.id // Keep original ID for API operations
});

const AssetsSelectModal: React.FC<AssetsSelectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedFolder 
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  
  // Use real asset management
  const {
    realFolders,
    realAssets,
    loading,
    loadAssetsForFolder
  } = useAssetManagement();

  // Load assets when folder is selected
  useEffect(() => {
    if (isOpen && currentFolder) {
      loadAssetsForFolder(currentFolder, 1, 50, false);
    }
  }, [isOpen, currentFolder, loadAssetsForFolder]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Get all folders (system + custom, deduplicated)
  const getAllFolders = () => {
    if (!realFolders) return { system: [], custom: [] };
    
    // Deduplicate by name (keep the first occurrence)
    const seenNames = new Set();
    const deduplicatedFolders = realFolders.filter((folder: any) => {
      if (seenNames.has(folder.name)) {
        return false;
      }
      seenNames.add(folder.name);
      return true;
    });
    
    const systemFolders = deduplicatedFolders.filter((f: any) => f.type === 'system');
    const customFolders = deduplicatedFolders.filter((f: any) => f.type === 'custom');
    
    return { system: systemFolders, custom: customFolders };
  };

  // Get assets for current folder
  const getCurrentFolderAssets = (folderName: string) => {
    if (realAssets && realAssets[folderName]) {
      return realAssets[folderName].map(convertShopAssetToUIAsset);
    }
    return [];
  };

  const isSystemFolder = (folderName: string) => {
    const { system } = getAllFolders();
    return system.some((f: any) => f.name === folderName);
  };

  useEffect(() => {
    if (!isOpen) {
      setCurrentFolder(null);
      setSelectedAsset(null);
      return;
    }

    const folders = [...getAllFolders().system, ...getAllFolders().custom];
    if (folders.length === 0) return;

    if (folders.length === 1) {
      setCurrentFolder(folders[0].name);
      return;
    }

    if (selectedFolder) {
      const normalizedSelected = normalizeFolderName(selectedFolder);
      const match = folders.find((folder: any) => {
        const normalizedName = normalizeFolderName(folder.name);
        return normalizedName === normalizedSelected
          || (normalizedSelected === 'images' && normalizedName === 'assets')
          || (normalizedSelected === 'chat' && normalizedName === 'assets');
      });
      if (match) {
        setCurrentFolder(match.name);
      }
    }
  }, [isOpen, selectedFolder, realFolders]);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedAsset && currentFolder) {
      const assets = getCurrentFolderAssets(currentFolder);
      const asset = assets.find(a => a.id.toString() === selectedAsset);
      if (asset) {
        onSelect(asset.url);
      }
    }
  };

  const handleFolderSelect = (folderName: string) => {
    setCurrentFolder(folderName);
    setSelectedAsset(null); // Reset selection when changing folders
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">Choose Image from Assets</h2>
            {currentFolder && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>→</span>
                <span className="px-2 py-1 bg-gray-100 rounded-md">
                  {currentFolder.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!currentFolder ? (
            /* Folder Selection */
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select a folder to browse assets</h3>
              
              {/* All Folders in Rows */}
              {[...getAllFolders().system, ...getAllFolders().custom].map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderSelect(folder.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 rounded-md transition-colors group"
                >
                  <ImageIcon 
                    size={14} 
                    className={folder.type === 'system' ? "text-blue-600" : "text-amber-600"} 
                  />
                  <span className="text-sm text-gray-700 flex-1">
                    {folder.name.replace('_', ' ')}
                  </span>
                </button>
              ))}

              {/* Empty State */}
              {getAllFolders().system.length === 0 && getAllFolders().custom.length === 0 && (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No folders found</p>
                  <p className="text-sm text-gray-400 mt-1">Create some folders to organize your assets</p>
                </div>
              )}
            </div>
          ) : (
            /* Assets Grid */
            <>
              {/* Back Button */}
              <div className="mb-4">
                <button
                  onClick={() => setCurrentFolder(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to folders
                </button>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading assets...</span>
                </div>
              )}

              {/* Assets Grid */}
              {!loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {getCurrentFolderAssets(currentFolder).map((asset) => (
                    <div
                      key={asset.originalId || asset.id}
                      onClick={() => setSelectedAsset(asset.id.toString())}
                      className={`relative group cursor-pointer rounded-lg border-2 transition-all duration-200 ${
                        selectedAsset === asset.id.toString() 
                          ? 'border-primary-500 ring-2 ring-primary-200' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        {asset.thumbnail ? (
                          <img
                            src={asset.thumbnail}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Selection Indicator */}
                      {selectedAsset === asset.id.toString() && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      {/* Asset Name */}
                      <div className="p-2">
                        <p className="text-sm font-medium text-gray-900 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{asset.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && getCurrentFolderAssets(currentFolder).length === 0 && (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No images found in this folder</p>
                  <p className="text-sm text-gray-400 mt-1">Upload some images to get started</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          {currentFolder && (
            <button
              onClick={handleSelect}
              disabled={!selectedAsset}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Select Image
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SrcField: React.FC<imageSrcFieldProps> = ({ 
  value = '', 
  onChange, 
  label, 
  className, 
  disabled,
  onOpenAssetsModal,
  isOverride = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleUploadComplete = (files: any[]) => {
    if (files?.[0]?.url) {
      onChange(files[0].url);
    }
    setIsUploading(false);
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
    setIsUploading(false);
  };

  const handleUploadBegin = () => {
    setIsUploading(true);
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
        </label>
      )}
      
      {/* Main Upload Area */}
      <div className="h-48">
        {/* Upload Dropzone / Image Preview */}
        <div className="relative h-full">
          {value ? (
            // Image Preview with hover overlay
            <div 
              ref={imageRef}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`relative w-full h-full border-2 border-transparent ${isHovered ? 'border-dashed border-gray-300' : ''} rounded-lg overflow-hidden bg-gray-50 transition-all duration-200`}
            >
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Hover Overlay */}
              <div className={`absolute inset-0 transition-all duration-200 cursor-pointer ${isHovered ? 'bg-black/50' : 'bg-black/0'}`}>
                {/* Replace Image Text at Top */}
                <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 transition-all duration-150 pointer-events-none ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white">
                      {isUploading ? 'Uploading...' : 'Replace Image'}
                    </p>
                    <p className="text-xs text-white/80 mt-1">
                      {isUploading ? 'Please wait...' : 'Click to upload new image'}
                    </p>
                  </div>
                </div>

                {/* Upload Button Overlay */}
                <UploadDropzone
                  endpoint="imageUploader"
                  onClientUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadBegin={handleUploadBegin}
                  config={{ mode: "auto" }}
                  content={{
                    uploadIcon({ isDragActive, isUploading: uploading }) {
                      return null;
                    },
                    label: "",
                    allowedContent: "",
                    button: ""
                  }}
                  appearance={{
                    container: "w-full h-full flex items-center justify-center border-none",
                    uploadIcon: "hidden",
                    label: "hidden",
                    allowedContent: "hidden",
                    button: "hidden"
                  }}
                  disabled={disabled}
                />
                
                {/* Choose from Assets Button in Overlay */}
                {onOpenAssetsModal && (
                  <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-all duration-150 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <button
                      type="button"
                      onClick={onOpenAssetsModal}
                      disabled={disabled}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Choose from Assets
                    </button>
                  </div>
                )}
              </div>
              
              {/* Remove Button - only for base, not overrides */}
              {!isOverride && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className={`absolute top-2 right-2 p-1 bg-white text-red-500 rounded-full transition-opacity duration-200 hover:bg-red-50 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                  disabled={disabled}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            // Empty Upload Dropzone
            <div className="h-full flex flex-col justify-between">
              <div className="h-36">
                <UploadDropzone
                  endpoint="imageUploader"
                  onClientUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadBegin={handleUploadBegin}
                  config={{ mode: "auto" }}
                  content={{
                    uploadIcon({ isDragActive, isUploading: uploading }) {
                      const isUploadingState = uploading || isUploading;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                            isDragActive ? 'bg-gray-200' : 'bg-gray-100'
                          }`}>
                            {isUploadingState ? (
                              <div className="w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ImageIcon className={`w-3 h-3 ${isDragActive ? 'text-gray-600' : 'text-gray-500'}`} />
                            )}
                          </div>
                          <div className="text-center">
                            <p className={`text-xs font-medium ${isDragActive ? 'text-gray-600' : 'text-gray-700'}`}>
                              {isUploadingState ? 'Uploading...' : isDragActive ? 'Drop image here' : 'Upload Image'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isUploadingState ? 'Please wait...' : 'Drag & drop or click to upload'}
                            </p>
                          </div>
                        </div>
                      );
                    },
                    label: "",
                    allowedContent: "",
                    button: ""
                  }}
                  appearance={{
                    container: `border-2 border-dashed rounded-lg h-full flex items-center justify-center text-center transition-all duration-200 bg-white hover:bg-gray-50 cursor-pointer ${
                      isUploading ? 'border-gray-400 bg-gray-100' : 'border-gray-300 hover:border-gray-400'
                    }`,
                    uploadIcon: "w-12 h-12",
                    label: "hidden",
                    allowedContent: "hidden",
                    button: "hidden"
                  }}
                  disabled={disabled}
                />
              </div>
              
              {/* Choose from Assets Button - positioned at bottom */}
              {onOpenAssetsModal && !value && (
                <div>
                  <button
                    type="button"
                    onClick={onOpenAssetsModal}
                    disabled={disabled || isUploading}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isUploading 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Choose from Assets
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Src Field Definition - custom renderer with override support
export const imageSrcField: Field = {
  id: "imageSrc",
  rendererKey: "imageSrc",
  reader: (node, siteSettings) => {
    return defaultReader({ 
      type: "text", 
      dataPath: "params.src"
    }, node, siteSettings);
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return defaultMutatorsCreator({ 
      type: "text", 
      dataPath: "params.src" 
    }, node, onIframeUpdate, interactionsInlineStyle);
  }
};

// Src Field Renderer with override support
export const ImageSrcFieldRenderer: React.FC<RendererProps> = ({ data, mutations, siteSettings }) => {
  const { value, overrides } = data;
  const { update } = mutations;
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [selectedAssetFolder, setSelectedAssetFolder] = useState<string | null>(null);

  if (!update) {
    return (
      <div className="py-2 text-red-500">
        Error: Mutations object not found
      </div>
    );
  }

  const handleChange = (newValue: string) => {
    update(newValue);
  };

  const handleOpenAssetsModal = () => {
    setShowAssetsModal(true);
    setSelectedAssetFolder('assets');
  };

  const handleCloseAssetsModal = () => {
    setShowAssetsModal(false);
    setSelectedAssetFolder(null);
  };

  const handleAssetSelect = (assetUrl: string) => {
    handleChange(assetUrl);
    handleCloseAssetsModal();
  };

  return (
    <div className="relative group py-2">
      <SrcField
        value={value}
        onChange={handleChange}
        disabled={false}
        onOpenAssetsModal={handleOpenAssetsModal}
      />
      
      {/* Override Display */}
      <OverrideDisplay
        overrides={overrides || []}
        mutations={mutations}
        initOverrideState={false}
      >
        {(override) => (
          <SrcField
            value={override.value}
            onChange={(newValue) => mutations.update(newValue, {
              [override.scope === 'responsive' ? 'breakpoint' : override.scope]: override.key
            })}
            label=""
            disabled={false}
            onOpenAssetsModal={handleOpenAssetsModal}
            isOverride={true}
          />
        )}
      </OverrideDisplay>

      {/* Override Creator */}
      <OverrideCreatorWrapper
        className=""
        fieldLabel="Image Source"
        mutations={mutations}
        siteSettings={siteSettings}
        overrides={overrides || []}
      />

      {/* Assets Modal */}
      {showAssetsModal && (
        <AssetsSelectModal
          isOpen={showAssetsModal}
          onClose={handleCloseAssetsModal}
          onSelect={handleAssetSelect}
          selectedFolder={selectedAssetFolder}
        />
      )}
    </div>
  );
};
