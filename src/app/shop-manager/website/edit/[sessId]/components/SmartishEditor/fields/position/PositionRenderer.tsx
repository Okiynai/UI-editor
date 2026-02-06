// Position field renderer
// Clean UI for position controls

import React, { useState } from 'react';
import { RendererProps } from '../../types';
import { Select } from '../../ControlsUI/Select';
import { UnifiedNumberField } from '../../utils/defaults/unifiedFields';
import { OverrideDisplay, OverrideCreatorWrapper } from '../../utils/defaults/OverrideUtils';

export const PositionRenderer: React.FC<RendererProps> = ({ 
  data, 
  mutations, 
  siteSettings, 
  interactionsInlineStyle,
  showOverrides = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const positionData = data as any;

  if (!positionData?.values) {
    return <div>Loading position data...</div>;
  }

  const positionOptions = [
    { label: 'Static', value: 'static' },
    { label: 'Relative', value: 'relative' },
    { label: 'Absolute', value: 'absolute' },
    { label: 'Fixed', value: 'fixed' },
    { label: 'Sticky', value: 'sticky' }
  ];

  const handlePositionTypeChange = (newType: string) => {
    mutations.update({ activePosition: newType });
  };

  const handleValueChange = (property: string, value: number | string) => {
    mutations.update({ property, value });
  };

  // Get overrides from the reader data
  const overrideArray = showOverrides ? (positionData.overrides || []) : [];

  // Handle override value changes
  const handleOverrideValueChange = (property: string, value: number | string, override: any) => {
    const ctx = override.scope === 'locale'
      ? { locale: override.key }
      : override.scope === 'interaction'
      ? { interaction: override.key }
      : { breakpoint: override.key };
    
    mutations.update({ property, value }, ctx);
  };

  const values = positionData.values;
  const isStatic = values.type === 'static';

  // Render editable position inputs for overrides (only position values, not position type)
  const renderEditablePositionInputsForOverride = (overrideValues: any, override: any) => {
    return (
      <div className="space-y-4">
        {/* Position Values for Override - always show these */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700 w-12">
              Top
            </label>
            <UnifiedNumberField
              value={typeof overrideValues.top === 'number' ? overrideValues.top : 0}
              onChange={(value: number) => handleOverrideValueChange('top', value, override)}
              config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700 w-12">
              Right
            </label>
            <UnifiedNumberField
              value={typeof overrideValues.right === 'number' ? overrideValues.right : 0}
              onChange={(value: number) => handleOverrideValueChange('right', value, override)}
              config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700 w-12">
              Bottom
            </label>
            <UnifiedNumberField
              value={typeof overrideValues.bottom === 'number' ? overrideValues.bottom : 0}
              onChange={(value: number) => handleOverrideValueChange('bottom', value, override)}
              config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700 w-12">
              Left
            </label>
            <UnifiedNumberField
              value={typeof overrideValues.left === 'number' ? overrideValues.left : 0}
              onChange={(value: number) => handleOverrideValueChange('left', value, override)}
              config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-700 w-12">
            Z-Index
          </label>
          <UnifiedNumberField
            value={typeof overrideValues.zIndex === 'number' ? overrideValues.zIndex : 0}
            onChange={(value: number) => handleOverrideValueChange('zIndex', value, override)}
            config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Position</h3>
        <div className="w-40">
          <Select
            value={values.type}
            onChange={handlePositionTypeChange}
            options={positionOptions}
          />
        </div>
      </div>

      <div 
        className="space-y-2 relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Position Selector moved to header */}

        {/* Position Values - only show if not static */}
        {!isStatic && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">
                  Top
                </label>
                <UnifiedNumberField
                  value={values.top || 0}
                  onChange={(value: number) => handleValueChange('top', value)}
                  config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">
                  Right
                </label>
                <UnifiedNumberField
                  value={values.right || 0}
                  onChange={(value: number) => handleValueChange('right', value)}
                  config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">
                  Bottom
                </label>
                <UnifiedNumberField
                  value={values.bottom || 0}
                  onChange={(value: number) => handleValueChange('bottom', value)}
                  config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">
                  Left
                </label>
                <UnifiedNumberField
                  value={values.left || 0}
                  onChange={(value: number) => handleValueChange('left', value)}
                  config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false, unit: "px" }}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700 w-12">
                Z-Index
              </label>
              <UnifiedNumberField
                value={values.zIndex || 0}
                onChange={(value: number) => handleValueChange('zIndex', value)}
                config={{ placeholder: "0", min: -9999, max: 9999, step: 1, showSlider: false }}
              />
            </div>
          </div>
        )}

        {/* Overrides Display */}
        {showOverrides && (
          <OverrideDisplay
            overrides={overrideArray}
            mutations={mutations}
            initOverrideState={true}
          >
            {(override) => {
              return (
                <div className="space-y-2">
                  {renderEditablePositionInputsForOverride(override.value, override)}
                </div>
              );
            }}
          </OverrideDisplay>
        )}

        {/* Override Creator - positioned below the fields with proper spacing */}
        {showOverrides && (
          <OverrideCreatorWrapper
            className="bottom-[-5px]"
            fieldLabel="Position"
            interactionsInlineStyle="position"
            mutations={mutations}
            siteSettings={siteSettings}
            overrides={overrideArray}
          />
        )}
      </div>
    </div>
  );
};
