'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ChevronDown, Search } from 'lucide-react';
import { Field, RendererProps } from '../../types';
import { defaultReader, defaultMutatorsCreator } from '../../utils';
import { useSmartPosition } from '../../ControlsUI/Utils/useSmartPosition';

// Popular icons for e-commerce applications
const POPULAR_ICONS = [
  'ShoppingCart', 'ShoppingBag', 'Store', 'Package', 'CreditCard', 'Wallet',
  'Star', 'Heart', 'ThumbsUp', 'Eye', 'Search', 'Filter', 'SlidersHorizontal',
  'User', 'Users', 'UserPlus', 'Settings', 'Bell', 'Mail', 'Phone',
  'MapPin', 'Truck', 'Package2', 'Gift', 'Percent', 'Tag', 'Tags',
  'DollarSign', 'TrendingUp', 'BarChart3', 'PieChart', 'Menu', 'X',
  'Plus', 'Minus', 'Edit', 'Trash2', 'Copy', 'Share', 'Download',
  'Upload', 'Image', 'Camera', 'Video', 'File', 'Folder', 'Calendar',
  'Clock', 'Check', 'AlertCircle', 'Info', 'HelpCircle', 'Home'
];

const getLucideIconNames = (): string[] => {
  const keys = Object.keys(LucideIcons);
  return keys
    .filter((k) => /^[A-Z]/.test(k)) // Starts with capital letter
    .filter((k) => typeof (LucideIcons as any)[k] === 'object') // Is a React component
    .filter((k) => !k.endsWith('Icon')) // Exclude aliases ending with 'Icon'
    .filter((k) => (LucideIcons as any)[k]?.displayName) // Has displayName (is a React component)
    .sort();
};

const ALL_ICON_NAMES = getLucideIconNames();

interface IconSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const IconSelect: React.FC<IconSelectProps> = ({ value, onChange, label, placeholder, className, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(40); // Start with 40 icons, load more as needed
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [localValue, setLocalValue] = useState(value || 'Circle');
  useEffect(() => { setLocalValue(value || 'Circle'); }, [value]);

  const { style } = useSmartPosition(selectRef, dropdownRef, {
    preferredPosition: 'bottom',
    fallbackPositions: ['top'],
    margin: 8,
    isVisible: isOpen,
    estimatedWidth: 200,
    estimatedHeight: 400,
  });

  const handleOptionSelect = (name: string) => {
    setLocalValue(name);
    onChange(name);
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearch(''); // Clear search when selecting
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const iconsToNavigate = filteredIcons.slice(0, visibleCount);

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, iconsToNavigate.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < iconsToNavigate.length) {
            handleOptionSelect(iconsToNavigate[focusedIndex]);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, search]);

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    if (!q) {
      // When no search, show popular icons first, then all others
      const popularAvailable = POPULAR_ICONS.filter(name => ALL_ICON_NAMES.includes(name));
      const remainingIcons = ALL_ICON_NAMES.filter(name => !POPULAR_ICONS.includes(name));
      return [...popularAvailable, ...remainingIcons];
    }
    
    return ALL_ICON_NAMES.filter((name) => {
      // Convert PascalCase to space-separated words for better search
      const searchableText = name
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .toLowerCase()
        .trim();
      
      // Check if the search query matches:
      // 1. The exact icon name
      // 2. The searchable text (space-separated)
      // 3. Individual words in the name
      return (
        name.toLowerCase().includes(q) ||
        searchableText.includes(q) ||
        searchableText.split(' ').some(word => word.startsWith(q))
      );
    });
  }, [search]);

  // Lazy loading: only render visible icons
  const visibleIcons = useMemo(() => {
    return search.trim() ? filteredIcons.slice(0, visibleCount) : filteredIcons.slice(0, visibleCount);
  }, [filteredIcons, visibleCount, search]);

  // Load more icons when scrolling near bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && visibleCount < filteredIcons.length) {
      setVisibleCount(prev => Math.min(prev + 40, filteredIcons.length));
    }
  };

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(40);
    setFocusedIndex(-1);
  }, [search]);

  // Reset visible count when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setVisibleCount(40);
    }
  }, [isOpen]);

  const selectedIconName = localValue;
  const SelectedIconComp = (LucideIcons as any)[selectedIconName] || (LucideIcons as any)['Circle'];

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={`relative ${className || ''}`} ref={selectRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={handleToggleDropdown}
        className={`
          flex w-full px-3 py-1.5 border rounded-md
          transition-all duration-200
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
          ${isOpen && !disabled ? 'border-primary-500 ring-0.5 ring-primary-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'}
          items-center justify-between gap-2
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SelectedIconComp className="h-4 w-4 text-gray-700 flex-shrink-0" />
          <span className={`text-sm font-medium ${selectedIconName ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedIconName ? selectedIconName.replace(/([A-Z])/g, ' $1').trim() : placeholder || 'Select an icon...'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={style}
          className="w-full bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <div className="w-full max-h-60 overflow-auto" onScroll={handleScroll}>
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(40); // Reset visible count on search
                  }}
                  placeholder="Search icons..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-0.5 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
            {visibleIcons.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">No icons found</div>
                <div className="text-sm text-gray-500">
                  Try searching for terms like "arrow", "home", "user", or "settings"
                </div>
              </div>
            ) : (
              <div className="p-2">
                {!search.trim() && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-700 mb-2 px-2">Popular Icons</div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 mb-4">
                      {POPULAR_ICONS.filter(name => ALL_ICON_NAMES.includes(name)).slice(0, 20).map((name, index) => {
                        const Icon = (LucideIcons as any)[name];
                        const isSelected = name === selectedIconName;
                        const isFocused = !search.trim() && focusedIndex === index;
                        
                        return (
                          <div
                            key={name}
                            onClick={() => handleOptionSelect(name)}
                            className={`
                              flex flex-col items-center justify-center py-2.5 px-0.5 rounded-lg cursor-pointer transition-colors duration-150
                              ${isSelected 
                                ? 'bg-gray-200 text-gray-700' 
                                : isFocused
                                  ? 'bg-gray-100 ring-1 ring-gray-300'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }
                            `}
                            title={name.replace(/([A-Z])/g, ' $1').trim()}
                          >
                            {Icon ? (
                              <Icon className={`h-5 w-5 mb-1.5 flex-shrink-0 text-gray-600`} />
                            ) : null}
                            <span className={`text-xs text-center leading-tight w-full truncate`}>
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-xs font-medium text-gray-700 mb-2 px-2">All Icons</div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mb-2 px-2">
                  {search.trim() ? (
                    `${visibleIcons.length} of ${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''} shown`
                  ) : (
                    `${visibleIcons.length} of ${filteredIcons.length} icons shown`
                  )}
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {(search.trim() ? visibleIcons : visibleIcons.slice(20)).map((name, index) => {
                    const Icon = (LucideIcons as any)[name];
                    const isSelected = name === selectedIconName;
                    const actualIndex = search.trim() ? index : index + 20;
                    const isFocused = focusedIndex === actualIndex;
                    
                    // Convert PascalCase to readable name
                    const displayName = name
                      .replace(/([A-Z])/g, ' $1')
                      .trim();
                    
                    return (
                      <div
                        key={name}
                        onClick={() => handleOptionSelect(name)}
                        className={`
                          flex flex-col items-center justify-center py-2.5 px-0.5 rounded-lg cursor-pointer transition-colors duration-150
                          ${isSelected 
                            ? 'bg-gray-200 text-gray-700' 
                            : isFocused
                              ? 'bg-gray-100 ring-1 ring-gray-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          }
                        `}
                        title={displayName}
                      >
                        {Icon ? (
                          <Icon className={`h-5 w-5 mb-1.5 flex-shrink-0 text-gray-600`} />
                        ) : null}
                        <span className={`text-xs text-center leading-tight w-full truncate`}>
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Loading indicator */}
                {visibleCount < filteredIcons.length && (
                  <div className="text-center py-4">
                    <div className="text-xs text-gray-500">
                      Loading more icons... ({visibleCount} of {filteredIcons.length})
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Icon Picker Field
export const iconPickerField: Field = {
  id: "iconPicker",
  rendererKey: "iconPicker",
  interactionsInlineStyle: "iconName",
  reader: (node, siteSettings) => {
    return defaultReader({ 
      type: "icon", 
      dataPath: "params.iconName", 
      interactionsInlineStyle: "iconName" 
    }, node, siteSettings);
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return defaultMutatorsCreator({ 
      type: "icon", 
      dataPath: "params.iconName" 
    }, node, onIframeUpdate, interactionsInlineStyle || 'iconName');
  }
};

// Icon Picker Renderer
export const IconPickerRenderer: React.FC<RendererProps> = ({ data, mutations }) => {
  const { value, overrides } = data;
  const { update } = mutations;

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

  return (
    <div className="relative group py-2">
      <IconSelect
        value={value}
        onChange={handleChange}
        label="Icon"
        placeholder="Select an icon..."
        className="!ml-auto min-w-[200px]"
        disabled={false}
      />
    </div>
  );
};
