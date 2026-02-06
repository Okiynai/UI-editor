import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { useSmartPosition } from './Utils/useSmartPosition';
import { Tabbed } from './Utils/Tabbed';
import { OSDLSiteLibrary } from '../types';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

type SelectProps = (
  | {
      multi?: false;
      value: string;
      onChange: (value: string) => void;
    }
  | {
      multi: true;
      value: string[];
      onChange: (value: string[]) => void;
    }
) & {
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  library?: OSDLSiteLibrary;
  libraryData?: any;
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'>;

export const Select: React.FC<SelectProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { style, calculatePosition } = useSmartPosition(selectRef, dropdownRef, {
    preferredPosition: 'bottom',
    fallbackPositions: ['top'],
    margin: 8,
    isVisible: isOpen,
    estimatedWidth: 200, // Good estimate for dropdown width
    estimatedHeight: 240, // max-h-60 = 15rem = 240px
  });

  const selectedOption = props.multi ? null : props.options.find(opt => opt.value === props.value);
  const selectedValues = props.multi ? props.value : [];

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleDropdown = () => {
    if (!props.disabled) {
      if (!isOpen) {
        // Pre-calculate position before opening to prevent jump
        calculatePosition();
      }
      setIsOpen(prev => !prev);
    }
  };

  // Extract rest props correctly
  const { onChange, multi, options, placeholder, label, className, error, disabled, library, libraryData, ...rest } = props;

  return (
    <div className={`relative p-px ${className || ''}`} ref={selectRef} {...rest}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div
        onClick={handleToggleDropdown}
        className={`
          flex w-full px-2.5 py-1.5 rounded-md
          transition-all duration-200
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-pointer bg-[#f2f2f3]'}
          ${error ? 'ring-1 ring-error-500' :
            isOpen && !disabled ? 'ring-1 ring-primary-500 shadow-sm' :
            ''
          }
          ${multi ? 'flex-wrap gap-1 items-start min-h-[34px]' : 'items-center justify-between'}
        `}
      >
        {/* Container for content with flex-grow to push chevron to the right */}
        <div className="flex-grow overflow-hidden">
          {multi ? (
            selectedValues.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-w-full">
                {selectedValues.map(v => {
                  const option = options.find(opt => opt.value === v);
                  return (
                    <span
                      key={v}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-primary-800 text-xs"
                    >
                      {option?.label || v}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (multi) {
                            onChange(selectedValues.filter(val => val !== v));
                          }
                        }}
                      />
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-gray-500">{placeholder || 'Select options...'}</span>
            )
          ) : (
            <span className={`text-xs truncate block ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
              {selectedOption?.label || placeholder || 'Select an option...'}
            </span>
          )}
        </div>

        {/* ChevronDown in a separate container to ensure consistent positioning */}
        <div className="flex-shrink-0 ml-2 self-center">
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-error-500">{error}</p>}

      {isOpen && (
        <div
          ref={dropdownRef}
          style={style}
          className="absolute z-10 w-full bg-[#f2f2f3] rounded-md shadow-md"
        >
          <Tabbed library={library} libraryData={libraryData} updateLocal={onChange as (value: string) => void} updateIframe={onChange as (value: string) => void}>
            {/* Custom tab - normal select options */}
            <div className="w-full max-h-60 overflow-auto">
              {options.length === 0 ? (
                <div className="px-3 py-1.5 text-xs text-gray-500">No options available</div>
              ) : (
                options.map((option, index) => {
                  const isSelected = multi
                    ? selectedValues.includes(option.value)
                    : props.value === option.value;

                  return (
                    <div
                      key={option.value}
                      onClick={() => {
                        if (option.disabled) return;
                        if (multi) {
                          const newValues = isSelected
                            ? selectedValues.filter(v => v !== option.value)
                            : [...selectedValues, option.value];
                          onChange(newValues);
                        } else {
                          onChange(option.value);
                          setIsOpen(false);
                        }
                      }}
                      className={`
                          flex items-center justify-between px-3 py-1.5
                          transition-colors duration-150
                          ${option.disabled
                          ? 'cursor-not-allowed bg-gray-50 text-gray-400'
                          : isSelected
                            ? (multi
                              ? 'bg-blue-50 cursor-pointer'
                              : 'bg-primary-100 text-primary-700 font-medium cursor-pointer')
                            : 'hover:bg-[#e5e5ea] text-gray-700 cursor-pointer'}
                          ${index === 0 ? 'rounded-t-md' : ''}
                          ${index === options.length - 1 ? 'rounded-b-md' : ''}
                        `}
                    >
                      <span className="text-xs flex items-center gap-2">
                        {option.label}
                        {option.disabled && (
                          <span className="text-xs text-gray-400 italic">
                            {option.disabledMessage || "(Not available)"}
                          </span>
                        )}
                      </span>
                      {isSelected && !option.disabled && (
                        <Check className={`h-4 w-4 ${multi ? 'text-primary-600' : 'text-primary-600'}`} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Tabbed>
        </div>
      )}
    </div>
  );
};
