import { FontVariable } from "@/services/api/shop-manager/osdl";
import { Trash2 } from "lucide-react";
import { CustomDropdown } from "../../shared/CustomDropdown";
import { Plus } from "lucide-react";

const availableFonts = [
    'Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 
    'Courier New', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
    'Source Sans Pro', 'Nunito', 'Raleway', 'Ubuntu', 'Playfair Display', 'Merriweather'
];

interface FontsSettingsPanelProps {
    fontVariables: FontVariable[];
    onFontVariablesChange: (variables: FontVariable[]) => void;
    newFontName: string;
    onNewFontNameChange: (name: string) => void;
    newFontValue: string;
    onNewFontValueChange: (value: string) => void;
    showAddFontForm: boolean;
    onShowAddFontFormChange: (show: boolean) => void;
    onAddFontVariable: () => void;
    setVariableToDelete: (variable: { type: 'font', id: string, name: string } | null) => void;
    onUpdateFontVariable: (variableId: string, newValue: string) => void;
}

export const FontsSettingsPanel: React.FC<FontsSettingsPanelProps> = ({
    fontVariables,
    onFontVariablesChange,
    newFontName,
    onNewFontNameChange,
    newFontValue,
    onNewFontValueChange,
    showAddFontForm,
    onShowAddFontFormChange,
    onAddFontVariable,
    setVariableToDelete,
    onUpdateFontVariable
}) => (
    <div className="space-y-4">
        {/* Existing font variables */}
        <div className="space-y-1">
            {fontVariables.map((fontVar) => (
                <div key={fontVar.id} className="group p-3 hover:bg-gray-50 rounded transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700">
                            {fontVar.name}
                        </div>
                        <button
                            onClick={() => {
                                setVariableToDelete({ type: 'font', id: fontVar.id, name: fontVar.name });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete font variable"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="mt-2">
                        <CustomDropdown
                            value={fontVar.value}
                            options={availableFonts.map(font => ({ value: font, label: font }))}
                            onChange={(newFont) => onUpdateFontVariable(fontVar.id, newFont)}
                            className="w-full"
                        />
                    </div>
                </div>
            ))}
        </div>

        {/* Add new font variable */}
        <div className="border-t border-gray-200 pt-4 mt-4">
            {!showAddFontForm ? (
                <button
                    onClick={() => onShowAddFontFormChange(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-700 transition-colors"
                >
                    <Plus size={16} />
                    <span className="text-sm font-medium">Add New Font Variable</span>
                </button>
            ) : (
                <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Variable Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., heading, body, display"
                                value={newFontName}
                                onChange={(e) => onNewFontNameChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Font Family
                            </label>
                            <CustomDropdown
                                value={newFontValue}
                                options={availableFonts.map(font => ({ value: font, label: font }))}
                                onChange={onNewFontValueChange}
                                className="w-full max-w-full"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    onShowAddFontFormChange(false);
                                    onNewFontNameChange('');
                                    onNewFontValueChange('Inter');
                                }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onAddFontVariable}
                                disabled={!newFontName.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={12} />
                                Add Variable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);