"use client";

import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerWithPreviewProps {
    color: string;
    onChange: (color: string) => void;
}

export const ColorPickerWithPreview: React.FC<ColorPickerWithPreviewProps> = ({ color, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handlePreviewClick = () => {
        if (colorInputRef.current) {
            colorInputRef.current.click();
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={handlePreviewClick}
                className="w-8 h-8 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: color }}
                title={`Color: ${color}`}
            />
            <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={handleColorChange}
                className="sr-only"
            />
        </div>
    );
}; 