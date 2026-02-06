import { ColorVariable } from "@/services/api/shop-manager/osdl";
import { Trash2 } from "lucide-react";
import { CustomDropdown } from "../../shared/CustomDropdown";
import { Plus } from "lucide-react";
import { ColorPickerWithPreview } from "@/components/atoms/ColorPicker";

interface ColorsSettingsPanelProps {
    colorVariables: ColorVariable[];
    onColorVariablesChange: (variables: ColorVariable[]) => void;
    newColorName: string;
    onNewColorNameChange: (name: string) => void;
    newColorValue: string;
    onNewColorValueChange: (value: string) => void;
    showAddColorForm: boolean;
    onShowAddColorFormChange: (show: boolean) => void;
    onAddColorVariable: () => void;
    setVariableToDelete: (variable: { type: 'color', id: string, name: string } | null) => void;
    onUpdateColorVariable: (variableId: string, newValue: string) => void;
}

export const ColorsSettingsPanel: React.FC<ColorsSettingsPanelProps> = ({
    colorVariables,
    onColorVariablesChange,
    newColorName,
    onNewColorNameChange,
    newColorValue,
    onNewColorValueChange,
    showAddColorForm,
    onShowAddColorFormChange,
    onAddColorVariable,
    setVariableToDelete,
    onUpdateColorVariable
}) => (
    <div className="space-y-4">
        {/* Existing color variables */}
        <div className="space-y-1">
            {colorVariables.map((colorVar) => (
                <div key={colorVar.id} className="group flex items-center gap-3 p-3 hover:bg-gray-100 rounded transition-colors">
                    <div>
                        <ColorPickerWithPreview
                            color={colorVar.value}
                            onChange={(newColor) => onUpdateColorVariable(colorVar.id, newColor)}
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">
                            {colorVar.name}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setVariableToDelete({ type: 'color', id: colorVar.id, name: colorVar.name });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete color variable"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>

        {/* Add new color variable */}
        <div className="border-t border-gray-200 pt-4 mt-4">
            {!showAddColorForm ? (
                <button
                    onClick={() => onShowAddColorFormChange(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-700 transition-colors"
                >
                    <Plus size={16} />
                    <span className="text-sm font-medium">Add New Color Variable</span>
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
                                placeholder="e.g., primary, secondary"
                                value={newColorName}
                                onChange={(e) => onNewColorNameChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Color Value
                            </label>
                            <div className="flex items-center gap-3">
                                <ColorPickerWithPreview
                                    color={newColorValue}
                                    onChange={onNewColorValueChange}
                                />
                                <input
                                    type="text"
                                    value={newColorValue}
                                    onChange={(e) => onNewColorValueChange(e.target.value)}
                                    className="w-full flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    onShowAddColorFormChange(false);
                                    onNewColorNameChange('');
                                    onNewColorValueChange('#000000');
                                }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onAddColorVariable}
                                disabled={!newColorName.trim()}
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
