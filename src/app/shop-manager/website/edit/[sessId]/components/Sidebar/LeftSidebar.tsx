import React from 'react';
import { Settings, FolderOpen, Layout } from 'lucide-react';
import { SidebarPanel } from '../../types/builder';
import { useAtom } from 'jotai';
import { isInPreviewModeAtom } from '../../store';

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
            </div>
        </div>
    );
}; 
