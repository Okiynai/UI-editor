"use client";

import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Type, Palette } from 'lucide-react';
import { ColorVariable, FontVariable } from '@/services/api/shop-manager/osdl';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { FontsSettingsPanel } from './Fonts';
import { ColorsSettingsPanel } from './Colors';
import { useDebouncedSiteSettings } from '../../../util/useDebouncedSiteSettings';

interface SettingsPanelProps {
    siteSettings: any;
    siteSettingsState: { isLoading: boolean; isRefetching?: boolean };
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    siteSettings,
    siteSettingsState,
}) => {
    // Active tab management
    const [activeSettingsTab, setActiveSettingsTab] = useState<string | null>(null);
    
    // Deletion modal state
    const [variableToDelete, setVariableToDelete] = useState<{ type: 'color' | 'font', id: string, name: string } | null>(null);

    // Site settings messaging
    const { debouncedSiteSettingsChange, throttledSiteSettingsChange, immediateSiteSettingsChange } = useDebouncedSiteSettings();

    // Extract data from iframe site settings
    const colorVariables: ColorVariable[] = siteSettings?.globalStyleVariables?.colors 
        ? Object.entries(siteSettings.globalStyleVariables.colors).map(([name, value]) => ({
            id: name,
            name,
            value: value as string
        }))
        : [];

    const fontVariables: FontVariable[] = siteSettings?.globalStyleVariables?.fonts
        ? Object.entries(siteSettings.globalStyleVariables.fonts).map(([name, value]) => ({
            id: name,
            name,
            value: value as string
        }))
        : [];

    // Form states for adding new variables
    const [newColorName, setNewColorName] = useState('');
    const [newColorValue, setNewColorValue] = useState('#000000');
    const [showAddColorForm, setShowAddColorForm] = useState(false);
    const [newFontName, setNewFontName] = useState('');
    const [newFontValue, setNewFontValue] = useState('Inter');
    const [showAddFontForm, setShowAddFontForm] = useState(false);

    // Initialize keywords display from iframe data
    // (Removed pre-fill so the input remains empty unless user is typing)

    // Color variable handlers - send directly to iframe
    const handleAddColorVariable = () => {
        if (newColorName.trim()) {
            const newId = Date.now().toString();
            const newVariable = { id: newId, name: newColorName.trim(), value: newColorValue };
            
            setShowAddColorForm(false);
            setNewColorName('');
            setNewColorValue('#000000');

            // Send immediate message for new variable
            immediateSiteSettingsChange({
                type: 'color',
                action: 'add',
                variableName: newVariable.name,
                variableId: newVariable.id,
                newValue: newVariable.value
            });
        }
    };

    const handleUpdateColorVariable = (variableId: string, newValue: string) => {
        const oldVariable = colorVariables.find(v => v.id === variableId);
        
        // Send throttled message for color update (real-time during mouse interactions)
        if (oldVariable) {
            throttledSiteSettingsChange({
                type: 'color',
                action: 'update',
                variableName: oldVariable.name,
                variableId: oldVariable.id,
                newValue: newValue,
                oldValue: oldVariable.value
            });
        }
    };

    // Font variable handlers - send directly to iframe
    const handleAddFontVariable = () => {
        if (newFontName.trim()) {
            const newId = Date.now().toString();
            const newVariable = { id: newId, name: newFontName.trim(), value: newFontValue };
            
            setShowAddFontForm(false);
            setNewFontName('');
            setNewFontValue('Inter');

            // Send immediate message for new variable
            immediateSiteSettingsChange({
                type: 'font',
                action: 'add',
                variableName: newVariable.name,
                variableId: newVariable.id,
                newValue: newVariable.value
            });
        }
    };

    const handleUpdateFontVariable = (variableId: string, newValue: string) => {
        const oldVariable = fontVariables.find(v => v.id === variableId);
        
        // Send debounced message for font update
        if (oldVariable) {
            immediateSiteSettingsChange({
                type: 'font',
                action: 'update',
                variableName: oldVariable.name,
                variableId: oldVariable.id,
                newValue: newValue,
                oldValue: oldVariable.value
            });
        }
    };

    // Delete handlers - send directly to iframe
    const confirmDeleteVariable = () => {
        if (!variableToDelete) return;

        immediateSiteSettingsChange({
            type: variableToDelete.type,
            action: 'delete',
            variableName: variableToDelete.name,
            variableId: variableToDelete.id,
        });

        setVariableToDelete(null);
    };

    const getTabTitle = () => {
        switch(activeSettingsTab) {
            case "colors": return "Color Variables";
            case "fonts": return "Font Variables";
            default: return "";
        }
    }

    return (
        <>
            <div className="w-full bg-white border-r border-gray-100 flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
                {!activeSettingsTab && (
                    <div className="px-4 py-3">
                        <h2 className="font-semibold text-gray-800 text-sm">Global Settings</h2>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col h-full">
                        {!activeSettingsTab ? (
                            siteSettingsState?.isLoading ? (
                                <div className="flex items-center justify-center h-full p-6 text-sm text-gray-500">
                                    <div className="animate-spin mr-2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                                    Loading settings...
                                </div>
                            ) : (
                                // Main settings menu
                                <SettingsMainMenu onSelect={setActiveSettingsTab as (tab: 'fonts' | 'colors') => void} />
                            )
                        ) : (
                            // Individual setting tab content
                            <div className="flex flex-col h-full">
                                {/* Header with title and back button */}
                                <SettingsSectionHeader 
                                    title={getTabTitle()}
                                    onBack={() => setActiveSettingsTab(null)}
                                />

                                {/* Tab content */}
                                <div className="flex-1 overflow-y-auto p-4 pt-0">
                                    {activeSettingsTab === "fonts" && (
                                        <FontsSettingsPanel
                                            fontVariables={fontVariables}
                                            onFontVariablesChange={() => {}} // No-op since we don't use local state
                                            newFontName={newFontName}
                                            onNewFontNameChange={setNewFontName}
                                            newFontValue={newFontValue}
                                            onNewFontValueChange={setNewFontValue}
                                            showAddFontForm={showAddFontForm}
                                            onShowAddFontFormChange={setShowAddFontForm}
                                            onAddFontVariable={handleAddFontVariable}
                                            setVariableToDelete={setVariableToDelete}
                                            onUpdateFontVariable={handleUpdateFontVariable}
                                        />
                                    )}

                                    {activeSettingsTab === "colors" && (
                                        <ColorsSettingsPanel
                                            colorVariables={colorVariables}
                                            onColorVariablesChange={() => {}} // No-op since we don't use local state
                                            newColorName={newColorName}
                                            onNewColorNameChange={setNewColorName}
                                            newColorValue={newColorValue}
                                            onNewColorValueChange={setNewColorValue}
                                            showAddColorForm={showAddColorForm}
                                            onShowAddColorFormChange={setShowAddColorForm}
                                            onAddColorVariable={handleAddColorVariable}
                                            setVariableToDelete={setVariableToDelete}
                                            onUpdateColorVariable={handleUpdateColorVariable}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={!!variableToDelete}
                onClose={() => setVariableToDelete(null)}
                onConfirm={confirmDeleteVariable}
                title="Are you sure you want to delete this setting?"
                message="This action can still be undone before saving."
                confirmText="Delete"
            />
        </>
    );
}; 

interface SettingsSectionHeaderProps {
    title: string;
    onBack: () => void;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ title, onBack }) => (
    <div className="px-4 py-3">
        <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
            <ArrowLeft size={16} className="group-hover:text-gray-900" />
            <h3 className="text-sm font-bold">{title}</h3>
        </button>
    </div>
);

interface SettingsMainMenuProps {
    onSelect: (tab: 'fonts' | 'colors') => void;
}

export const SettingsMainMenu: React.FC<SettingsMainMenuProps> = ({ onSelect }) => (
    <div className="p-3 space-y-2">
        <button
            onClick={() => onSelect("fonts")}
            className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 hover:rounded-lg transition-all duration-200 flex items-center gap-3"
        >
            <Type size={16} className="text-gray-600" />
            <span className="flex-1">Fonts</span>
            <ChevronRight size={18} className="text-gray-500" />
        </button>
        <button
            onClick={() => onSelect("colors")}
            className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 hover:rounded-lg transition-all duration-200 flex items-center gap-3"
        >
            <Palette size={16} className="text-gray-600" />
            <span className="flex-1">Colors</span>
            <ChevronRight size={18} className="text-gray-500" />
        </button>
    </div>
);
