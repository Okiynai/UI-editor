import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Custom Dropdown Component
interface CustomDropdownProps {
    value: string;
    options: { value: string; label: string; }[];
    icon?: any;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
    value, 
    options, 
    icon: Icon, 
    onChange,
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                className={`relative w-full text-left bg-white border border-gray-200 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-colors ${className} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                {Icon && <Icon size={14} className="text-gray-500" />}
                <span className="block truncate">{options.find(opt => opt.value === value)?.label || value}</span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown size={12} className="text-gray-400 ml-auto" />
                </span>
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}; 