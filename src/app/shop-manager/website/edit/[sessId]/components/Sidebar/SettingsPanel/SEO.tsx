import {SEOPreferences} from "@/services/api/shop-manager/preferences"
import { Info, Upload, X, LoaderCircle } from "lucide-react";
import { Tooltip } from "../../shared/Tooltip";
import { UploadDropzone } from "@/lib/uploadthing";
import { useState } from "react";

interface SeoSettingsPanelProps {
    seoSettings: SEOPreferences;
    onSeoSettingsChange: (settings: SEOPreferences) => void;
    keywordsRaw: string;
    onKeywordsRawChange: (value: string) => void;
    onActiveSettingsTabChange: (tab: string | null) => void;
}

const SocialImageUploader = ({ 
    value, 
    onChange 
}: { 
    value: string | undefined; 
    onChange: (url: string | undefined) => void; 
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleRemove = () => {
        onChange(undefined);
    };

    return (
        <div className="space-y-3">
            {value ? (
                // Preview when image exists
                <div className="relative">
                    <div className="relative w-full h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 group">
                        <img
                            src={value}
                            alt="Social media preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                // Handle broken images
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'w-full h-full flex items-center justify-center text-gray-400 text-sm';
                                    errorDiv.textContent = 'Failed to load image';
                                    parent.appendChild(errorDiv);
                                }
                            }}
                        />
                        
                        {/* Remove button */}
                        <div className="absolute top-2 right-2 z-50">
                            <button
                                onClick={handleRemove}
                                className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                title="Remove image"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Upload overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                            <UploadDropzone
                                endpoint="imageUploader"
                                className="w-full h-full flex items-center justify-center"
                                content={{
                                    uploadIcon({ isDragActive, isUploading }) {
                                        return (
                                            <div className="text-white text-center">
                                                {isUploading ? (
                                                    <LoaderCircle className="animate-spin mx-auto" size={24} />
                                                ) : (
                                                    <>
                                                        <Upload size={24} className="mx-auto mb-2" />
                                                        <p className="text-sm font-medium">
                                                            {isDragActive ? "Drop to replace" : "Click to replace"}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    },
                                }}
                                appearance={{ allowedContent: "!hidden", label: "!hidden", button: "!hidden", container: "border-0" }}
                                config={{ mode: "auto" }}
                                onClientUploadComplete={(res) => {
                                    if (res?.[0]) {
                                        onChange(res[0].url);
                                        setIsUploading(false);
                                        setUploadError(null);
                                    }
                                }}
                                onUploadError={(error: Error) => {
                                    setUploadError(`Upload failed: ${error.message}`);
                                    setIsUploading(false);
                                }}
                                onUploadBegin={() => {
                                    setIsUploading(true);
                                    setUploadError(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                // Upload area when no image
                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-all duration-200">
                    <UploadDropzone
                        endpoint="imageUploader"
                        className="w-full h-full flex items-center justify-center"
                        appearance={{
                            allowedContent: "!hidden",
                            label: "!hidden", 
                            button: "!hidden",
                            container: "border-0"
                        }}
                        content={{
                            uploadIcon({ isDragActive, isUploading }) {
                                return (
                                    <div className="text-center p-4 pt-0"> 
                                        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary-100 flex items-center justify-center">
                                            {isUploading ? (
                                                <LoaderCircle className="animate-spin h-5 w-5 text-primary-600" />
                                            ) : (
                                                <Upload className={`h-5 w-5 ${isDragActive ? 'text-primary-700' : 'text-primary-600'}`} />
                                            )}
                                        </div>
                                        <p className={`text-sm font-medium mb-1 ${isDragActive ? 'text-primary-700' : 'text-gray-600'}`}>
                                            {isDragActive ? "Drop your image here" : "Upload image"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {isDragActive ? "Release to upload" : "Drag and drop or click to browse"}
                                        </p>
                                      
                                    </div>
                                );
                            },
                        }}
                        config={{ mode: "auto" }}
                        onClientUploadComplete={(res) => {
                            if (res?.[0]) {
                                onChange(res[0].url);
                                setIsUploading(false);
                                setUploadError(null);
                            }
                        }}
                        onUploadError={(error: Error) => {
                            setUploadError(`Upload failed: ${error.message}`);
                            setIsUploading(false);
                        }}
                        onUploadBegin={() => {
                            setIsUploading(true);
                            setUploadError(null);
                        }}
                    />
                </div>
            )}

            {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
            )}
        </div>
    );
};

export const SeoSettingsPanel: React.FC<SeoSettingsPanelProps> = ({
    seoSettings,
    onSeoSettingsChange,
    keywordsRaw,
    onKeywordsRawChange,
    onActiveSettingsTabChange
}) => {
    const currentKeywords = Array.from(new Set((seoSettings.defaultKeywords || []).filter(Boolean)));

    const addKeyword = (raw: string) => {
        const parts = (raw || '')
            .split(',')
            .map(k => k.trim())
            .filter(Boolean);
        if (parts.length === 0) return;
        const existing = new Set(currentKeywords);
        const merged = [...currentKeywords];
        for (const p of parts) {
            if (!existing.has(p)) {
                existing.add(p);
                merged.push(p);
            }
        }
        onSeoSettingsChange({
            ...seoSettings,
            defaultKeywords: merged
        });
        onKeywordsRawChange('');
    };

    const handleRemoveKeyword = (keyword: string) => {
        const next = (seoSettings.defaultKeywords || []).filter(k => k !== keyword);
        onSeoSettingsChange({ ...seoSettings, defaultKeywords: next });
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addKeyword(keywordsRaw);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {/* Description under the title for SEO settings */}
                <div className="mb-2">
                    <p className="text-xs text-gray-500">
                        These settings will be applied to the <b>home</b> page and serve as fallback values 
                        for any pages that don't have their own SEO settings configured. If a page 
                        is missing a value (like the title), these global settings will be used instead.
                    </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Default Title
                    </label>
                    <input
                        type="text"
                        placeholder="Brand Breeder"
                        value={seoSettings.defaultTitle || ''}
                        onChange={(e) => onSeoSettingsChange({ ...seoSettings, defaultTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Title Suffix
                    </label>
                    <input
                        type="text"
                        placeholder=" | Brand Breeder"
                        value={seoSettings.titleSuffix || ''}
                        onChange={(e) => onSeoSettingsChange({ ...seoSettings, titleSuffix: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Default Description
                    </label>
                    <textarea
                        placeholder="Enter default meta description"
                        rows={3}
                        value={seoSettings.defaultDescription || ''}
                        onChange={(e) => onSeoSettingsChange({ ...seoSettings, defaultDescription: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">
                        Default Keywords
                    </label>
                    <div className="text-xs text-gray-600 mb-2">
                        Separate with commas or press Enter to add
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Type a keyword and press Enter or ,"
                                value={keywordsRaw}
                                onChange={(e) => onKeywordsRawChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    {currentKeywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {currentKeywords.map((k) => (
                                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                    {k}
                                    <button
                                        title={`Remove ${k}`}
                                        className="ml-0.5 text-gray-500 hover:text-gray-700"
                                        onClick={() => handleRemoveKeyword(k)}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="mt-1 text-[10px] text-gray-500">{currentKeywords.length} keyword{currentKeywords.length === 1 ? '' : 's'}</div>
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <label className="block text-xs font-medium text-gray-700">
                            LLM Text
                        </label>
                        <Tooltip content="Provide additional context for Large Language Models (LLMs) and other AI systems. This can help improve how they understand and represent your page's content.">
                            <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>
                    <div className="text-xs text-gray-600 mb-1.5">
                        Additional context for AI systems and search engines
                    </div>
                    <textarea
                        placeholder="Additional context for AI systems"
                        rows={3}
                        value={seoSettings.llmTxt || ''}
                        onChange={(e) => onSeoSettingsChange({ ...seoSettings, llmTxt: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                </div>

                <div>
                    <div className="flex items-center gap-1.5">
                        <label className="block text-xs font-medium text-gray-700">
                            Favicon
                        </label>
                        <Tooltip content="This is the image that will be used for the favicon. It should be 16x16 pixels.">
                            <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>

                        <SocialImageUploader
                            value={seoSettings.faviconUrl}
                            onChange={(url) => onSeoSettingsChange({ ...seoSettings, faviconUrl: url })}
                        />
                </div>
                <div>
                    <div className="flex items-center gap-1 mb-2">
                        <label className="block text-xs font-medium text-gray-700">
                            Open Graph Image
                        </label>
                        <Tooltip content="This is the image that will be used for social media sharing. It should be 1200x630 pixels.">
                            <Info size={14} className="text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>
                    <SocialImageUploader
                        value={seoSettings.socialImage}
                        onChange={(url) => onSeoSettingsChange({ ...seoSettings, socialImage: url })}
                    />
                </div>
            
            </div>
        </div>
    );
};