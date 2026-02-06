import React, { useState } from 'react';
import { Settings, FolderOpen, Layout, Code, ChevronRight } from 'lucide-react';
import { SidebarPanel } from '../../types/builder';
import { useAtom } from 'jotai';
import { isInPreviewModeAtom } from '../../store';
import { layoutDebugModeAtom } from '@/store/editor';

export const LeftSidebar = ({
    activePanel,
    onPanelChange,
}: {
    activePanel: SidebarPanel;
    onPanelChange: (panel: SidebarPanel) => void;
}) => {
    const [isPreview] = useAtom(isInPreviewModeAtom);

    return (
        <div className={`w-14 bg-white border-r border-gray-100 flex flex-col ${isPreview ? 'hidden' : ''}`}>
            {/* Top Section - Panel Controls */}
            <div className="flex-1 py-4">
                <div className="space-y-2 px-2">
                    <button
                        onClick={() => onPanelChange("settings")}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            activePanel === "settings" 
                            ? "bg-primary-100 text-primary-600" 
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Global Settings"
                    >
                        <Settings size={16} />
                    </button>
                    
                    <button
                        onClick={() => onPanelChange("assets")}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            activePanel === "assets" 
                            ? "bg-primary-100 text-primary-600" 
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Assets"
                    >
                        <FolderOpen size={16} />
                    </button>
                    
                    <button
                        onClick={() => onPanelChange("layout")}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            activePanel === "layout" 
                            ? "bg-primary-100 text-primary-600" 
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Layout"
                    >
                        <Layout size={16} />
                    </button>
                    
                </div>

                {/* Debug Controls Section */}
                <DebugControls />
            </div>
        </div>
    );
}; 

// Debug Controls Component
const DebugControls = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [layoutDebugMode, setLayoutDebugMode] = useAtom(layoutDebugModeAtom);

    return (
        <div 
            className={`fixed z-[100] transition-transform duration-300 ease-out ${
                isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-30px)]'
            }`}
            style={{
                bottom: '25%',
                left: '0px'
            }}
        >
            {/* Debug buttons container */}
            <div className="flex items-end">
                {/* Debug buttons panel */}
                <div className="bg-black border border-gray-600 shadow-lg p-2 flex flex-col gap-2">  
                    {/* Layout Raw Mode Toggle */}
                    <button
                        onClick={() => setLayoutDebugMode(prev => prev === 'off' ? 'raw' : 'off')}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                            layoutDebugMode === 'raw'
                                ? 'bg-purple-600 text-purple-100 border border-purple-400'
                                : 'text-gray-300 hover:text-gray-100 hover:bg-gray-700 border border-transparent'
                        }`}
                        title={layoutDebugMode === 'raw' ? "Switch to Normal Layout Mode" : "Enable Raw Layout Mode"}
                    >
                        <Code size={16} />
                    </button>

                </div>
                
                {/* Toggle button */}
                <button
                    onClick={() => setIsOpen(prev => !prev)}
                    className="bg-black rounded-r-lg shadow-lg h-[58px] w-8 flex items-center justify-center hover:bg-gray-800 transition-colors"
                    title={isOpen ? "Close Debug Panel" : "Open Debug Panel"}
                >
                    <ChevronRight
                        size={16} 
                        className={`text-gray-300 transform transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
};
