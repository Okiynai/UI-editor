'use client';

import { useState, useEffect } from 'react';
import { OSDLSiteLibrary } from '../../types';

interface TabbedProps {
  children: React.ReactNode;
  className?: string;
  library?: OSDLSiteLibrary;
  libraryData?: any;
  updateLocal?: (value: string) => void;
  updateIframe?: (value: string) => void;
}

export function Tabbed({ children, className = "", library, libraryData, updateLocal, updateIframe }: TabbedProps) {
  const [activeTab, setActiveTab] = useState<'custom' | 'library'>('custom');
  const [hasLibraryContent, setHasLibraryContent] = useState(false);

  // Check if libraryData has actual content for the specific library type
  useEffect(() => {
    console.log(library, libraryData);
    if (!library || !libraryData) {
      setHasLibraryContent(false);
      return;
    }
    
    setHasLibraryContent(libraryData != null);
  }, [library, libraryData]);

  // If no library content, just render the children without tabs
  if (!hasLibraryContent) {
    return (
      <div className={`w-full bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
        {children}
      </div>
    );
  }

  // If library content exists, show the tabbed interface
  return (
    <div className={`w-full bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Tab Headers */}
      <div className="flex p-2 gap-1">
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-2 py-1 text-xs font-medium transition-colors rounded-md ${
            activeTab === 'custom'
              ? 'bg-gray-200 text-gray-800'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-2 py-1 text-xs font-medium transition-colors rounded-md ${
            activeTab === 'library'
              ? 'bg-gray-200 text-gray-800'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Library
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'custom' && (
          <>
            {children}
          </>
        )}

        {activeTab === 'library' && (
          <>
            {library === 'colors' && (
              <ColorLibraryRenderer colors={libraryData} updateLocal={updateLocal} updateIframe={updateIframe} />
            )}
            {library === 'fonts' && (
              <FontLibraryRenderer fonts={libraryData} updateLocal={updateLocal} updateIframe={updateIframe} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface FontLibraryRendererProps {
  fonts: Record<string, string>;
  updateLocal?: (value: string) => void;
  updateIframe?: (value: string) => void;
}

export function FontLibraryRenderer({ fonts, updateLocal, updateIframe }: FontLibraryRendererProps) {
  return (
    <div className="min-w-[225px] w-full h-[242px] overflow-y-auto px-2 pb-2">
      <ul className="space-y-2 text-sm">
        {Object.entries(fonts).map(([variableName, fontName]) => (
          <li 
            key={variableName}
            className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => {
              updateLocal?.(fontName)
              updateIframe?.(`var(--${variableName})`)
            }}
          >
            {/* T icon with gray background */}
            <div className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-sm">T</span>
            </div>
            
            {/* Variable name and font name */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">
                {variableName}
              </div>
              <div className="text-xs text-gray-600">
                {fontName}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ColorLibraryRendererProps {
  colors: Record<string, string>;
  updateLocal?: (value: string) => void;
  updateIframe?: (value: string) => void;
}

export function ColorLibraryRenderer({ colors, updateLocal, updateIframe }: ColorLibraryRendererProps) {

  return (
    <div className="min-w-[225px] w-full h-[242px] overflow-y-auto px-2 pb-2">
      <ul className="space-y-2 text-sm">
        {Object.entries(colors).map(([variableName, colorValue]) => (
          <li 
            key={variableName}
            className="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => {
              updateLocal?.(colorValue)
              updateIframe?.(`var(--${variableName})`)
            }}
          >
            {/* Color circle */}
            <div 
              className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"
              style={{ backgroundColor: colorValue }}
            />
            
            {/* Variable name and color value */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">
                {variableName}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {colorValue}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}