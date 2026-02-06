import React from "react";
import { RendererProps } from "../../types";
import { renderField } from "../../utils/defaults/unifiedFields";

interface DisplayMutations {
  update: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => void;
}

interface DisplayConfig {
  type: string;
  label?: string;
  dir?: "row" | "col";
  className?: string;
  options?: Array<{ value: string; name: string }>;
}

const DisplayRenderer: React.FC<RendererProps<any, DisplayMutations, DisplayConfig>> = ({ 
  data, 
  mutations, 
  config, 
  library, 
  libraryData, 
  siteSettings, 
  showOverrides, 
  interactionsInlineStyle 
}) => {
  const { value, overrides } = data;
  const { update } = mutations;

  if (!value) {
    return (
      <div className="text-red-500">
        Error: No display data found
      </div>
    );
  }

  // Handle simple display value (non-section nodes)
  if (typeof value === 'string') {
    return (
      <div className="relative group">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {config?.label || 'Display'}
          </label>
          {renderField("select", value, config, update, library, libraryData)}
        </div>

      </div>
    );
  }

  // Handle complex layout object (section nodes)
  const isFlex = value.display === 'flex';
  const isGrid = value.display === 'grid';

  const handleFieldUpdate = (fieldName: string, fieldValue: any) => {
    const newValue = { ...value, [fieldName]: fieldValue };
    
    // Handle grid template generation when columns/rows change
    if (fieldName === 'gridColumns' || fieldName === 'gridColumnsUnit') {
      const columns = fieldName === 'gridColumns' ? fieldValue : value.gridColumns || 1;
      const unit = fieldName === 'gridColumnsUnit' ? fieldValue : value.gridColumnsUnit || 'fr';
      
      if (unit === 'auto') {
        newValue.gridTemplateColumns = `repeat(${columns}, auto)`;
      } else {
        newValue.gridTemplateColumns = `repeat(${columns}, 1${unit})`;
      }
    }
    
    if (fieldName === 'gridRows' || fieldName === 'gridRowsUnit') {
      const rows = fieldName === 'gridRows' ? fieldValue : value.gridRows || 1;
      const unit = fieldName === 'gridRowsUnit' ? fieldValue : value.gridRowsUnit || 'fr';
      
      if (unit === 'auto') {
        newValue.gridTemplateRows = `repeat(${rows}, auto)`;
      } else {
        newValue.gridTemplateRows = `repeat(${rows}, 1${unit})`;
      }
    }
    
    update(newValue);
  };

  return (
    <div className="relative group">
      <div className="space-y-2">
        {/* Display Mode */}
        <div className="flex items-center">
          <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
            {config?.label || 'Display'}
          </label>
          <div className="ml-auto">
            {renderField("select", value.display, config, (newDisplay) => handleFieldUpdate('display', newDisplay), library, libraryData)}
          </div>
        </div>

        {/* Flex Controls */}
        {isFlex && (
          <>
            {/* Direction */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Direction
              </label>
              {renderField("segmented", value.direction, {
                type: "segmented",
                options: [
                  { value: "row", name: "→" },
                  { value: "row-reverse", name: "←" },
                  { value: "column", name: "↓" },
                  { value: "column-reverse", name: "↑" }
                ]
              }, (newDirection) => handleFieldUpdate('direction', newDirection), library, libraryData)}
            </div>

            {/* Wrap */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Wrap
              </label>
              <div className="ml-auto">
                {renderField("select", value.flexWrap, {
                  type: "select",
                  options: [
                    { value: "nowrap", name: "No Wrap" },
                    { value: "wrap", name: "Wrap Down" },
                    { value: "wrap-reverse", name: "Wrap Up" }
                  ]
                }, (newWrap) => handleFieldUpdate('flexWrap', newWrap), library, libraryData)}
              </div>
            </div>

            {/* Justify Content */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Justify Content
              </label>
              <div className="ml-auto min-w-[150px]">
                {renderField("select", value.justifyContent, {
                  type: "select",
                  options: [
                    { value: "flex-start", name: "Start" },
                    { value: "center", name: "Center" },
                    { value: "flex-end", name: "End" },
                    { value: "space-between", name: "Space Between" },
                    { value: "space-around", name: "Space Around" },
                    { value: "space-evenly", name: "Space Evenly" }
                  ]
                }, (newJustify) => handleFieldUpdate('justifyContent', newJustify), library, libraryData)}
              </div>
            </div>

            {/* Align Items */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Align Items
              </label>
              <div className="ml-auto">
                {renderField("select", value.alignItems, {
                  type: "select",
                  options: [
                    { value: "stretch", name: "Stretch" },
                    { value: "flex-start", name: "Start" },
                    { value: "center", name: "Center" },
                    { value: "flex-end", name: "End" },
                    { value: "baseline", name: "Baseline" }
                  ]
                }, (newAlign) => handleFieldUpdate('alignItems', newAlign), library, libraryData)}
              </div>
            </div>
          </>
        )}

        {/* Grid Controls */}
        {isGrid && (
          <>
            {/* Grid Columns */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Columns
              </label>
              <div className="ml-auto flex items-center space-x-2">
                {renderField("number", value.gridColumns || 1, {
                  type: "number",
                  min: 1,
                  max: 12,
                  step: 1,
                  showSlider: false,
                  unit: value.gridColumnsUnit === 'px' ? 'PX' : value.gridColumnsUnit === 'auto' ? 'Auto' : (value.gridColumnsUnit || 'fr'),
                  unitOptions: ['fr','PX','%','Auto'],
                  onUnitChange: (u: string) => handleFieldUpdate('gridColumnsUnit', u === 'PX' ? 'px' : u === 'Auto' ? 'auto' : u)
                }, (newColumns) => handleFieldUpdate('gridColumns', newColumns), library, libraryData)}
                <div className="hidden" />
              </div>
            </div>

            {/* Grid Rows */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Rows
              </label>
              <div className="ml-auto flex items-center space-x-2">
                {renderField("number", value.gridRows || 1, {
                  type: "number",
                  min: 1,
                  max: 12,
                  step: 1,
                  showSlider: false,
                  unit: value.gridRowsUnit === 'px' ? 'PX' : value.gridRowsUnit === 'auto' ? 'Auto' : (value.gridRowsUnit || 'fr'),
                  unitOptions: ['fr','PX','%','Auto'],
                  onUnitChange: (u: string) => handleFieldUpdate('gridRowsUnit', u === 'PX' ? 'px' : u === 'Auto' ? 'auto' : u)
                }, (newRows) => handleFieldUpdate('gridRows', newRows), library, libraryData)}
                <div className="hidden" />
              </div>
            </div>

            {/* Justify Items */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Justify Items
              </label>
              <div className="ml-auto">
                {renderField("select", value.gridJustifyItems, {
                  type: "select",
                  options: [
                    { value: "stretch", name: "Stretch" },
                    { value: "start", name: "Start" },
                    { value: "center", name: "Center" },
                    { value: "end", name: "End" }
                  ]
                }, (newJustify) => handleFieldUpdate('gridJustifyItems', newJustify), library, libraryData)}
              </div>
            </div>

            {/* Align Items */}
            <div className="flex items-center">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Align Items
              </label>
              <div className="ml-auto">
                {renderField("select", value.gridAlignItems, {
                  type: "select",
                  options: [
                    { value: "stretch", name: "Stretch" },
                    { value: "start", name: "Start" },
                    { value: "center", name: "Center" },
                    { value: "end", name: "End" }
                  ]
                }, (newAlign) => handleFieldUpdate('gridAlignItems', newAlign), library, libraryData)}
              </div>
            </div>
          </>
        )}

        {/* Gap Controls */}
        {isFlex && (
          <div className="flex items-center space-x-3">
            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
              Gap
            </label>
            {renderField("number", value.gap, {
              type: "number",
              min: 0,
              max: 200,
              step: 1,
              showSlider: true,
              unit: 'px',
              className: 'w-full'
            }, (newGap) => handleFieldUpdate('gap', newGap), library, libraryData)}
          </div>
        )}

        {isGrid && (
          <>
            {/* Row Gap */}
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Row Gap
              </label>
              {renderField("number", value.rowGap, {
                type: "number",
                min: 0,
                max: 200,
                step: 1,
                showSlider: true,
                unit: 'px',
                className: 'w-full'
              }, (newRowGap) => handleFieldUpdate('rowGap', newRowGap), library, libraryData)}
            </div>

            {/* Column Gap */}
            <div className="flex items-center space-x-3">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Column Gap
              </label>
              {renderField("number", value.columnGap, {
                type: "number",
                min: 0,
                max: 200,
                step: 1,
                showSlider: true,
                unit: 'px',
                className: 'w-full'
              }, (newColumnGap) => handleFieldUpdate('columnGap', newColumnGap), library, libraryData)}
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export { DisplayRenderer };
