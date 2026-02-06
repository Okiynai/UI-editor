import React, { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Plus, ArrowLeft, ChevronDown, Loader } from 'lucide-react';
import { Locale } from '../../types/builder';
import { useIframeCommunicationContext } from '../../context/IframeCommunicationContext';
import { useDebouncedSiteSettings } from '../../util/useDebouncedSiteSettings';
import { ShopLocales } from '@/services/api/osdl/osdl';
import ConfirmationModal from '@/components/atoms/ConfirmationModal';

// Comprehensive locale list
const AVAILABLE_LOCALES: Locale[] = [
    { value: "en-US", label: "English", flag: "🇺🇸" },
    { value: "en-GB", label: "English", flag: "🇬🇧" },
    { value: "es-ES", label: "Español", flag: "🇪🇸" },
    { value: "es-MX", label: "Español", flag: "🇲🇽" },
    { value: "fr-FR", label: "Français", flag: "🇫🇷" },
    { value: "fr-CA", label: "Français", flag: "🇨🇦" },
    { value: "de-DE", label: "Deutsch", flag: "🇩🇪" },
    { value: "it-IT", label: "Italiano", flag: "🇮🇹" },
    { value: "pt-PT", label: "Português", flag: "🇧🇷" },
    { value: "ar-SA", label: "العربية", flag: "🇸🇦" },
    { value: "ar-AE", label: "العربية", flag: "🇦🇪" },
    { value: "zh-CN", label: "中文", flag: "🇨🇳" },
    { value: "zh-TW", label: "中文", flag: "🇹🇼" },
    { value: "ja-JP", label: "日本語", flag: "🇯🇵" },
    { value: "ko-KR", label: "한국어", flag: "🇰🇷" },
    { value: "ru-RU", label: "Русский", flag: "🇷🇺" },
    { value: "hi-IN", label: "हिन्दी", flag: "🇮🇳" },
    { value: "th-TH", label: "ไทย", flag: "🇹🇭" },
    { value: "vi-VN", label: "Tiếng Việt", flag: "🇻🇳" },
    { value: "ar-EG", label: "العربية", flag: "🇪🇬" }
];

export const LocaleDropdown = ({
    className = "",
    localesData,
    isLoading,
}: {
    className?: string;
    localesData: ShopLocales | null | undefined;
    isLoading: boolean;
}) => {
    const [selectedLocale, setSelectedLocale] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [showAddMode, setShowAddMode] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [localeToDelete, setLocaleToDelete] = useState<string | null>(null);

    const [locales, setLocales] = useState<Locale[]>([]);
    const [localDefaultLocale, setLocalDefaultLocale] = useState<string>("");

    useEffect(() => {
        const mappedLocales = (localesData?.supportedLocales || []).map(localeValue => {
            const availableLocale = AVAILABLE_LOCALES.find(l => l.value === localeValue);
            return {
                value: localeValue,
                label: availableLocale?.label || localeValue,
                flag: availableLocale?.flag || '🏳️'
            };
        });
        setLocales(mappedLocales);
        
        // Initialize local default locale
        if (localesData?.defaultLocale) {
            setLocalDefaultLocale(localesData.defaultLocale);
        }
    }, [localesData?.supportedLocales, localesData?.defaultLocale]);

    // Get iframe communication context
    const { updateLocale, isReady } = useIframeCommunicationContext();
    const { immediateSiteSettingsChange } = useDebouncedSiteSettings();

    useEffect(() => {
        // adding the (selectedLocale == '' || selectedLocale == localDefaultLocale) 
        // to make this action only once, on init.
        if (isReady && localDefaultLocale && 
            (selectedLocale == '' || selectedLocale == localDefaultLocale)) {
            updateLocale(localDefaultLocale);
        }
    }, [localDefaultLocale, isReady, selectedLocale]);

    useEffect(() => {
        if (localDefaultLocale && !selectedLocale) {
            setSelectedLocale(localDefaultLocale);
        }
    }, [localDefaultLocale, selectedLocale]);

    const availableToAdd = AVAILABLE_LOCALES.filter(
        (locale: Locale) => !locales.some((userLocale: Locale) => userLocale.value === locale.value)
    );

    // Filter locales based on search term
    const filteredUserLocales = locales.filter((locale: Locale) =>
        locale.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAvailableToAdd = availableToAdd.filter((locale: Locale) =>
        locale.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentLocale = locales.find((locale: Locale) => locale.value === selectedLocale) || locales.find((l: Locale) => l.value === localDefaultLocale) || locales[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                
                setIsOpen(false);
                setShowAddMode(false);
                setSearchTerm("");
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset search when switching modes
    useEffect(() => {
        setSearchTerm("");
    }, [showAddMode]);

    const handleSelectedLocaleChange = (localeValue: string) => {
        
        setSelectedLocale(localeValue);
        setIsOpen(false);
        
        // Send locale change to iframe
        updateLocale(localeValue);
    };

    const handleSetDefaultLocale = (localeValue: string) => {
        // Update local default locale
        setLocalDefaultLocale(localeValue);
        
        // Send site settings change message for setting default locale
        immediateSiteSettingsChange({
            type: 'locale',
            action: 'update',
            newValue: { defaultLocale: localeValue },
            oldValue: { defaultLocale: localDefaultLocale }
        });
    };

    const confirmRemoveLocale = () => {
        if (!localeToDelete) return;
        if (locales.length <= 1) return;

        // Update local state optimistically
        setLocales(prevLocales => prevLocales.filter(locale => locale.value !== localeToDelete));

        // If we're deleting the default locale, set a new default
        if (localeToDelete === localDefaultLocale) {
            const newDefault = locales.filter((l: Locale) => l.value !== localeToDelete)[0]?.value;
            if (newDefault) {
                setLocalDefaultLocale(newDefault);
            }
        }

        // Optimistically select a new locale if the current one is being deleted
        if (selectedLocale === localeToDelete) {
            const newDefault = locales.filter((l: Locale) => l.value !== localeToDelete)[0]?.value;
            if (newDefault) {
                // To avoid closing dropdown, directly update state and call iframe update
                setSelectedLocale(newDefault);
                updateLocale(newDefault);
            }
        }

        // Send site settings change message for locale deletion
        immediateSiteSettingsChange({
            type: 'locale',
            action: 'delete',
            variableId: localeToDelete,
        });

        setLocaleToDelete(null);
    };

    const handleRemoveLocale = (localeValue: string) => {
        setLocaleToDelete(localeValue);
    };

    const handleAddLocale = (locale: Locale) => {
        // Update local state optimistically
        setLocales(prevLocales => [...prevLocales, locale]);
        
        // Send site settings change message for adding locale
        immediateSiteSettingsChange({
            type: 'locale',
            action: 'add',
            variableName: 'locale',
            variableId: locale.value,
            newValue: { addedLocale: locale.value, localeLabel: locale.label, localeFlag: locale.flag }
        });
    };

    const handleShowAddMode = () => {
        
        setShowAddMode(true);
    };

    const handleBackToLocales = () => {
        
        setShowAddMode(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                }}
                className={`flex items-center gap-2 px-3 text-sm border border-gray-200 hover:bg-gray-50 focus:outline-none bg-white h-8 ${
                    isOpen 
                        ? 'w-72 rounded-t-md rounded-b-none border-b-0 transition-[width] duration-200 ease-out' 
                        : 'w-full rounded-md transition-[width,border-radius] duration-200 ease-out'
                }`}
                disabled={isLoading}
            >
                {(isLoading && !selectedLocale) ? (
                    <Loader size={14} className="animate-spin text-gray-500" />
                ) : (
                    <>
                        <span className="flex items-center gap-1">
                            <span>{currentLocale?.flag}</span>
                            <span>{currentLocale?.label || selectedLocale}</span>
                        </span>
                        <ChevronDown size={12} className={`text-gray-400 ml-auto transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            
            {isOpen && (
                <div className="absolute left-0 top-full -mt-1 w-72 bg-white border border-gray-200 border-t-0 rounded-b-md rounded-t-none shadow-lg z-[100] max-h-80 overflow-y-auto opacity-0 scale-y-95 animate-[dropdownOpen_200ms_ease-out_forwards]" 
                     style={{ transformOrigin: 'top center' }}>

            {isLoading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                    <Loader size={24} className="animate-spin text-primary-500" />
                </div>
            )}
                    {!showAddMode ? (
                        <>
                            {/* Search input for main mode */}
                            <div className="px-3 py-2 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search locales..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div> 

                            {/* Main locale list */}
                            {filteredUserLocales.map((locale: Locale) => (
                                <div
                                    key={locale.value}
                                    className="relative group hover:bg-gray-100 transition-colors"
                                    onMouseEnter={() => setHoveredItem(locale.value)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                >
                                    <div className="flex items-center w-full">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelectedLocaleChange(locale.value);
                                            }}
                                            className="flex-1 text-left px-3 py-2 text-sm text-gray-700 flex items-center gap-2 transition-colors"
                                        >
                                            <span className="text-base">{locale.flag}</span>
                                            <span className="flex-1">{locale.label}</span>
                                            {locale.value === localDefaultLocale && (
                                                <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                                                    Default
                                                </span>
                                            )}
                                        </button>
                                        
                                        {/* Hover actions - positioned in flex layout */}
                                        <div className="flex items-center gap-1 pr-2">
                                            {locale.value !== localDefaultLocale && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSetDefaultLocale(locale.value);
                                                        }}
                                                        className={`px-2 py-1 text-[11px] uppercase tracking-wide hover:bg-gray-100 rounded text-gray-600 border border-gray-200 transition-opacity ${
                                                            hoveredItem === locale.value ? 'opacity-100' : 'opacity-0'
                                                        }`}
                                                        title="Set as default"
                                                        disabled={isLoading}
                                                    >
                                                        Set default
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveLocale(locale.value);
                                                        }}
                                                        className={`p-1.5 hover:bg-red-100 rounded text-red-600 transition-opacity ${
                                                            hoveredItem === locale.value ? 'opacity-100' : 'opacity-0'
                                                        }`}
                                                        title="Remove locale"
                                                        disabled={isLoading || locales.length <= 1}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredUserLocales.length === 0 && searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No locales found matching "{searchTerm}"
                                </div>
                            )}
                            
                            {/* Add locale button */}
                            <div className="border-t border-gray-200 mt-1">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleShowAddMode();
                                    }}
                                    className="group w-full text-left px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                    disabled={isLoading}
                                >
                                    <Plus size={14} className="text-green-600 group-hover:text-green-700 transition-colors" />
                                    <span>Add Locale</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Add mode header */}
                            <div className="sticky top-0 bg-white p-3 z-10 border-b border-gray-100">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleBackToLocales();
                                    }}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to locales</span>
                                </button>
                            </div>
                            
                            {/* Search input for add mode */}
                            <div className="p-3 border-b border-gray-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Search available locales..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Available locales to add */}
                            {filteredAvailableToAdd.map((locale: Locale) => (
                                <button
                                    key={locale.value}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAddLocale(locale);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors group"
                                    disabled={isLoading}
                                >
                                    <span className="text-base">{locale.flag}</span>
                                    <span className="flex-1">{locale.label}</span>
                                    <Plus size={14} className="text-green-600 group-hover:scale-110 transition-transform" />
                                </button>
                            ))}
                            
                            {filteredAvailableToAdd.length === 0 && searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No available locales found matching "{searchTerm}"
                                </div>
                            )}
                            
                            {availableToAdd.length === 0 && !searchTerm && (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    All available locales have been added
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
            {localeToDelete && (
                <ConfirmationModal
                    isOpen={!!localeToDelete}
                    onClose={() => setLocaleToDelete(null)}
                    onConfirm={confirmRemoveLocale}
                    title="Confirm Delete Locale"
                    message={`Are you sure you want to remove the locale "${AVAILABLE_LOCALES.find(l => l.value === localeToDelete)?.label || localeToDelete}"? This action cannot be undone.`}
                    confirmText="Delete"
                />
            )}
        </div>
    );
}; 
