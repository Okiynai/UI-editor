import React, { useState, useEffect } from 'react';
import { RendererProps } from '../../types';
import type { TransformFieldData, TransformType, TransformValue } from './types';
import { SegmentedSwitch } from '../../ControlsUI/Switch';
import { Select } from '../../ControlsUI/Select';
import { UnifiedNumberField } from '../../utils/defaults/unifiedFields';
import { createTransformReader } from './reader';
import { createTransformMutators } from './mutators';
import { OverrideDisplay, OverrideCreatorWrapper } from '../../utils/defaults/OverrideUtils';
import { Node } from '@/OSDL/OSDL.types';
import { ExpandableSection } from '../../ExpandableSection';

// Helper functions for parsing override values
const parseTransformString = (transformString: string): Partial<TransformValue> => {
  if (!transformString || typeof transformString !== 'string') {
    return {};
  }

  const values: Partial<TransformValue> = {};
  
  // Parse translate3d(x, y, z) or translate(x, y) or translateX/Y/Z
  const translate3dMatch = transformString.match(/translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (translate3dMatch) {
    values.translateX = parseFloat(translate3dMatch[1]) || 0;
    values.translateY = parseFloat(translate3dMatch[2]) || 0;
    values.translateZ = parseFloat(translate3dMatch[3]) || 0;
  } else {
    const translateMatch = transformString.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (translateMatch) {
      values.translateX = parseFloat(translateMatch[1]) || 0;
      values.translateY = parseFloat(translateMatch[2]) || 0;
      values.translateZ = 0;
    } else {
      // Check for individual translateX, translateY, translateZ
      const translateXMatch = transformString.match(/translateX\(([^)]+)\)/);
      if (translateXMatch) values.translateX = parseFloat(translateXMatch[1]) || 0;
      
      const translateYMatch = transformString.match(/translateY\(([^)]+)\)/);
      if (translateYMatch) values.translateY = parseFloat(translateYMatch[1]) || 0;
      
      const translateZMatch = transformString.match(/translateZ\(([^)]+)\)/);
      if (translateZMatch) values.translateZ = parseFloat(translateZMatch[1]) || 0;
    }
  }

  // Parse rotate3d(x, y, z, angle) or rotate(angle)
  const rotate3dMatch = transformString.match(/rotate3d\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (rotate3dMatch) {
    values.rotateX = parseFloat(rotate3dMatch[1]) || 0;
    values.rotateY = parseFloat(rotate3dMatch[2]) || 0;
    values.rotateZ = parseFloat(rotate3dMatch[3]) || 0;
    values.angle = parseFloat(rotate3dMatch[4]) || 0;
  } else {
    const rotateMatch = transformString.match(/rotate\(([^)]+)\)/);
    if (rotateMatch) {
      values.angle = parseFloat(rotateMatch[1]) || 0;
      values.rotateX = 0;
      values.rotateY = 0;
      values.rotateZ = 1;
    }
  }

  // Parse scale3d(x, y, z) or scale(x, y) or scaleX/Y/Z
  const scale3dMatch = transformString.match(/scale3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
  if (scale3dMatch) {
    values.scaleX = parseFloat(scale3dMatch[1]) || 1;
    values.scaleY = parseFloat(scale3dMatch[2]) || 1;
    values.scaleZ = parseFloat(scale3dMatch[3]) || 1;
  } else {
    const scaleMatch = transformString.match(/scale\(([^,]+)(?:,\s*([^)]+))?\)/);
    if (scaleMatch) {
      values.scaleX = parseFloat(scaleMatch[1]) || 1;
      values.scaleY = parseFloat(scaleMatch[2]) || parseFloat(scaleMatch[1]) || 1;
      values.scaleZ = 1;
    } else {
      // Check for individual scaleX, scaleY, scaleZ
      const scaleXMatch = transformString.match(/scaleX\(([^)]+)\)/);
      if (scaleXMatch) values.scaleX = parseFloat(scaleXMatch[1]) || 1;
      
      const scaleYMatch = transformString.match(/scaleY\(([^)]+)\)/);
      if (scaleYMatch) values.scaleY = parseFloat(scaleYMatch[1]) || 1;
      
      const scaleZMatch = transformString.match(/scaleZ\(([^)]+)\)/);
      if (scaleZMatch) values.scaleZ = parseFloat(scaleZMatch[1]) || 1;
    }
  }

  // Parse skew(x, y) or skewX/Y
  const skewMatch = transformString.match(/skew\(([^,]+),\s*([^)]+)\)/);
  if (skewMatch) {
    values.skewX = parseFloat(skewMatch[1]) || 0;
    values.skewY = parseFloat(skewMatch[2]) || 0;
  } else {
    const skewXMatch = transformString.match(/skewX\(([^)]+)\)/);
    if (skewXMatch) values.skewX = parseFloat(skewXMatch[1]) || 0;
    
    const skewYMatch = transformString.match(/skewY\(([^)]+)\)/);
    if (skewYMatch) values.skewY = parseFloat(skewYMatch[1]) || 0;
  }

  return values;
};

const parseTransformOrigin = (originString: string): { x: string; y: string } => {
  if (!originString || typeof originString !== 'string') {
    return { x: '50%', y: '50%' };
  }

  const parts = originString.trim().split(/\s+/);
  return {
    x: parts[0] || '50%',
    y: parts[1] || '50%'
  };
};

export const TransformRenderer: React.FC<RendererProps> = ({
  data,
  mutations,
  config,
  showOverrides = false,
  siteSettings
}) => {
  const [currentTransform, setCurrentTransform] = useState<TransformType>('translate');
  const [isHovered, setIsHovered] = useState(false);
  
  const label = config?.label || 'Transform';
  const transformData = data as TransformFieldData & { node: Node };
  
  // Get overrides from the reader data
  const overrideArray = showOverrides ? (transformData.overrides || []) : [];


  
  // Transform type options
  const transformTypes: TransformType[] = ['translate', 'rotate', 'scale', 'skew'];
  const transformLabels = ['Translate', 'Rotate', 'Scale', 'Skew'];
  
  // Use state for current transform, fallback to data if available
  const activeTransform = currentTransform || transformData?.activeTransform || 'translate';
  
  // Handle transform type change
  const handleTransformTypeChange = (newType: TransformType) => {
    setCurrentTransform(newType);
    if (transformData?.values) {
      mutations.update({
        transformType: newType,
        currentValues: transformData.values
      });
    }
  };
  
  // Handle value changes
  const handleValueChange = (property: keyof TransformValue, value: number) => {
    if (transformData?.values) {
      mutations.update({
        property,
        value,
        currentValues: transformData.values
      });
    }
  };
  
  // Handle transform origin changes
  const handleOriginChange = (axis: 'x' | 'y', value: string) => {
    const currentOrigin = transformData?.transformOrigin || { x: '50%', y: '50%' };
    console.log('Transform origin change:', { axis, value, currentOrigin });
    
    mutations.update({
      originAxis: axis,
      originValue: value,
      currentOrigin: currentOrigin
    });
  };

  // Handle advanced 3D property changes
  const handleAdvancedChange = (property: 'transformStyle' | 'backfaceVisibility', value: string) => {
    console.log('Advanced change:', { property, value, currentValues: transformData?.values });
    mutations.update({
      property,
      value: value as any,
      currentValues: transformData?.values || {}
    });
  };
  
  // Render input fields based on current transform type
  const renderTransformInputs = () => {
    const values = transformData?.values || {};
    
    switch (activeTransform) {
      case 'translate':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateX || 0}
                    onChange={(value) => handleValueChange('translateX', value)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateY || 0}
                    onChange={(value) => handleValueChange('translateY', value)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateZ || 0}
                    onChange={(value) => handleValueChange('translateZ', value)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'rotate':
        return (
          <div className="space-y-4">
            {/* 3D Rotation Axis (X, Y, Z) */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">3D Rotation Axis</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateX || 0}
                      onChange={(value) => handleValueChange('rotateX', value)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: false }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateY || 0}
                      onChange={(value) => handleValueChange('rotateY', value)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: false }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateZ || 0}
                      onChange={(value) => handleValueChange('rotateZ', value)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: false }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rotation Angle */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Rotation Angle</h4>
              <div className="flex items-center space-x-2">
                <UnifiedNumberField
                  value={values.angle || 0}
                  onChange={(value) => handleValueChange('angle', value)}
                  config={{ min: -360, max: 360, step: 1, showSlider: true, unit: '°', className: 'w-full' }}
                />
              </div>
            </div>
          </div>
        );
        
      case 'scale':
        return (
          <div className="space-y-4">
            {/* Scale (X, Y, Z) */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Scale</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleX || 1}
                      onChange={(value) => handleValueChange('scaleX', value)}
                      config={{ min: 0, max: 10, step: 0.01, showSlider: false }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleY || 1}
                      onChange={(value) => handleValueChange('scaleY', value)}
                      config={{ min: 0, max: 10, step: 0.01, showSlider: false }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleZ || 1}
                      onChange={(value) => handleValueChange('scaleZ', value)}
                      config={{ min: 0, max: 10, step: 0.01, showSlider: false }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        );
        
      case 'skew':
        return (
          <div className="space-y-4">
            {/* 2D Skew (X, Y) */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">2D Skew</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.skewX || 0}
                      onChange={(value) => handleValueChange('skewX', value)}
                      config={{ min: -180, max: 180, step: 0.1, showSlider: false,  unit: '°' }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.skewY || 0}
                      onChange={(value) => handleValueChange('skewY', value)}
                      config={{ min: -180, max: 180, step: 0.1, showSlider: false,  unit: '°' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Render transform origin inputs
  const renderTransformOrigin = () => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-700">Transform Origin</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-1">
          <label className="text-xs font-medium text-gray-700 w-6">X:</label>
          <div className="flex items-center w-full">
            <UnifiedNumberField
              value={parseFloat(transformData?.transformOrigin?.x?.replace('%', '') || '50')}
              onChange={(value) => handleOriginChange('x', `${value}%`)}
              config={{ min: 0, max: 100, step: 1, showSlider: true,  unit: '%', className: 'w-full' }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
          <div className="flex items-center w-full">
            <UnifiedNumberField
              value={parseFloat(transformData?.transformOrigin?.y?.replace('%', '') || '50')}
              onChange={(value) => handleOriginChange('y', `${value}%`)}
              config={{ min: 0, max: 100, step: 1, showSlider: true,  unit: '%', className: 'w-full' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render advanced 3D options
  const renderAdvancedOptions = () => (
    <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center">
            <label className="text-xs font-medium text-gray-700 w-20">Perspective:</label>
            <div className="flex items-center ml-auto">
              <UnifiedNumberField
                value={transformData?.values?.perspective || 0}
                onChange={(value) => handleValueChange('perspective', value)}
                config={{ min: 0, max: 2000, step: 10, showSlider: false,  unit: 'px' }}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Transform Style</label>
          <Select
            value={transformData?.values?.transformStyle || 'flat'}
            onChange={(value) => handleAdvancedChange('transformStyle', value)}
            options={[
              { value: 'flat', label: 'Flat' },
              { value: 'preserve-3d', label: 'Preserve 3D' }
            ]}
            className="w-full"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Backface Visibility</label>
          <Select
            value={transformData?.values?.backfaceVisibility || 'visible'}
            onChange={(value) => handleAdvancedChange('backfaceVisibility', value)}
            options={[
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' }
            ]}
            className="w-full"
          />
        </div>
      </div>
    );

  // Handle override value changes
  const handleOverrideValueChange = (property: keyof TransformValue, value: number, override: any) => {
    // Update the specific override value
    const currentValues = parseTransformString(override.value || '');
    const updatedValues = { ...currentValues, [property]: value };
    
    // Build new transform string
    const transformString = buildTransformString(updatedValues);
    
    // Update the override directly using the mutator's update method with context
    const ctx = override.scope === 'locale'
      ? { locale: override.key }
      : override.scope === 'interaction'
      ? { interaction: override.key }
      : { breakpoint: override.key };
    
    // Call the mutator's update method with the context to update the specific override
    mutations.update({
      property,
      value,
      currentValues: updatedValues
    }, ctx);
  };

  // Handle override origin changes
  const handleOverrideOriginChange = (axis: 'x' | 'y', value: string, override: any) => {
    const currentOrigin = parseTransformOrigin(override.value?.transformOrigin || '50% 50%');
    const updatedOrigin = { ...currentOrigin, [axis]: value };
    
    const ctx = override.scope === 'locale'
      ? { locale: override.key }
      : override.scope === 'interaction'
      ? { interaction: override.key }
      : { breakpoint: override.key };
    
    // Call the mutator's update method with the context to update the specific override
    mutations.update({
      originAxis: axis,
      originValue: value,
      currentOrigin: updatedOrigin
    }, ctx);
  };

  // Build transform string for overrides
  const buildTransformString = (values: Partial<TransformValue>): string => {
    const transforms: string[] = [];

    // Always include translate if any translate values exist
    if (values.translateX !== undefined || values.translateY !== undefined || values.translateZ !== undefined) {
      const x = values.translateX || 0;
      const y = values.translateY || 0;
      const z = values.translateZ || 0;
      if (z !== 0) {
        transforms.push(`translate3d(${x}px, ${y}px, ${z}px)`);
      } else if (x !== 0 || y !== 0) {
        transforms.push(`translate(${x}px, ${y}px)`);
      }
    }

    // Always include rotate if angle exists
    if (values.angle !== undefined && values.angle !== 0) {
      const has3DAxis = (values.rotateX !== undefined && values.rotateX !== 0) || 
                       (values.rotateY !== undefined && values.rotateY !== 0) || 
                       (values.rotateZ !== undefined && values.rotateZ !== 0);
      
      if (has3DAxis) {
        const x = values.rotateX || 0;
        const y = values.rotateY || 0;
        const z = values.rotateZ || 0;
        transforms.push(`rotate3d(${x}, ${y}, ${z}, ${values.angle}deg)`);
      } else {
        transforms.push(`rotate(${values.angle}deg)`);
      }
    }

    // Always include scale if any scale values exist
    if (values.scaleX !== undefined || values.scaleY !== undefined || values.scaleZ !== undefined) {
      const scaleX = values.scaleX || 1;
      const scaleY = values.scaleY || 1;
      const scaleZ = values.scaleZ || 1;
      if (scaleZ !== 1) {
        transforms.push(`scale3d(${scaleX}, ${scaleY}, ${scaleZ})`);
      } else if (scaleX !== 1 || scaleY !== 1) {
        if (scaleX === scaleY) {
          transforms.push(`scale(${scaleX})`);
        } else {
          transforms.push(`scale(${scaleX}, ${scaleY})`);
        }
      }
    }

    // Always include skew if any skew values exist
    if (values.skewX !== undefined || values.skewY !== undefined) {
      const skewX = values.skewX || 0;
      const skewY = values.skewY || 0;
      if (skewX !== 0 && skewY !== 0) {
        transforms.push(`skew(${skewX}deg, ${skewY}deg)`);
      } else if (skewX !== 0) {
        transforms.push(`skewX(${skewX}deg)`);
      } else if (skewY !== 0) {
        transforms.push(`skewY(${skewY}deg)`);
      }
    }

    return transforms.join(' ');
  };

  // Render editable transform inputs for overrides
  const renderEditableTransformInputsForOverride = (values: Partial<TransformValue>, origin: { x: string; y: string }, override: any) => {
    switch (activeTransform) {
      case 'translate':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateX || 0}
                    onChange={(value) => handleOverrideValueChange('translateX', value, override)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateY || 0}
                    onChange={(value) => handleOverrideValueChange('translateY', value, override)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                <div className="flex items-center">
                  <UnifiedNumberField
                    value={values.translateZ || 0}
                    onChange={(value) => handleOverrideValueChange('translateZ', value, override)}
                    config={{ min: -1000, max: 1000, step: 1, showSlider: false,  unit: 'px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'rotate':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">3D Rotation Axis</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateX || 0}
                      onChange={(value) => handleOverrideValueChange('rotateX', value, override)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateY || 0}
                      onChange={(value) => handleOverrideValueChange('rotateY', value, override)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.rotateZ || 0}
                      onChange={(value) => handleOverrideValueChange('rotateZ', value, override)}
                      config={{ min: -1, max: 1, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Rotation Angle</h4>
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                    <UnifiedNumberField
                    value={values.angle || 0}
                    onChange={(value) => handleOverrideValueChange('angle', value, override)}
                      config={{ min: -360, max: 360, step: 1, showSlider: true,  unit: '°' }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'scale':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">Scale</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleX || 1}
                      onChange={(value) => handleOverrideValueChange('scaleX', value, override)}
                      config={{ min: 0.1, max: 5, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleY || 1}
                      onChange={(value) => handleOverrideValueChange('scaleY', value, override)}
                      config={{ min: 0.1, max: 5, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Z:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.scaleZ || 1}
                      onChange={(value) => handleOverrideValueChange('scaleZ', value, override)}
                      config={{ min: 0.1, max: 5, step: 0.1, showSlider: true }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'skew':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-700">2D Skew</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">X:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.skewX || 0}
                      onChange={(value) => handleOverrideValueChange('skewX', value, override)}
                      config={{ min: -45, max: 45, step: 1, showSlider: true,  unit: '°' }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
                  <div className="flex items-center">
                    <UnifiedNumberField
                      value={values.skewY || 0}
                      onChange={(value) => handleOverrideValueChange('skewY', value, override)}
                      config={{ min: -45, max: 45, step: 1, showSlider: true,  unit: '°' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Render editable transform origin for overrides
  const renderEditableTransformOriginForOverride = (origin: { x: string; y: string }, override: any) => (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-700">Transform Origin</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center space-x-1">
          <label className="text-xs font-medium text-gray-700 w-6">X:</label>
          <div className="flex items-center w-full">
            <UnifiedNumberField
              value={parseFloat(origin.x?.replace('%', '') || '50')}
              onChange={(value) => handleOverrideOriginChange('x', `${value}%`, override)}
              config={{ min: 0, max: 100, step: 1, showSlider: true,  unit: '%' }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <label className="text-xs font-medium text-gray-700 w-6">Y:</label>
          <div className="flex items-center w-full">
            <UnifiedNumberField
              value={parseFloat(origin.y?.replace('%', '') || '50')}
              onChange={(value) => handleOverrideOriginChange('y', `${value}%`, override)}
              config={{ min: 0, max: 100, step: 1, showSlider: true,  unit: '%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Transform Label and Switch on same row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
        <SegmentedSwitch
          labels={transformLabels}
          values={transformTypes}
          value={activeTransform}
          onChange={handleTransformTypeChange}
        />
      </div>

      {/* Main Transform Controls with Hover Area for Overrides */}
      <div 
        className="space-y-6 relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Transform Inputs */}
        <div className="space-y-2">
          {renderTransformInputs()}
        </div>

        {/* Transform Origin */}
        <div className="space-y-2">
          {renderTransformOrigin()}
        </div>

        {/* Overrides Display */}
        {showOverrides && (
            <OverrideDisplay
              overrides={overrideArray}
              mutations={mutations}
              initOverrideState={true}
            >
              {(override) => {
                // Parse the override transform string to get values
                const overrideValues = parseTransformString(override.value || '');
                const overrideOrigin = parseTransformOrigin(override.value?.transformOrigin || '50% 50%');
                
                return (
                  <div className="space-y-2">
                    {/* Override Transform Inputs - Now Editable */}
                    <div className="space-y-2">
                      {renderEditableTransformInputsForOverride(overrideValues, overrideOrigin, override)}
                    </div>
                    
                    {/* Override Transform Origin - Now Editable */}
                    <div className="space-y-2">
                      {renderEditableTransformOriginForOverride(overrideOrigin, override)}
                    </div>
                  </div>
                );
              }}
            </OverrideDisplay>
        )}

        {/* Override Creator - positioned below the fields with proper spacing */}
        {showOverrides && (
            <OverrideCreatorWrapper
              customPositioning={{ bottom: "-5px" }}
              fieldLabel={label}
              interactionsInlineStyle="transform"
              mutations={mutations}
              siteSettings={siteSettings}
              overrides={overrideArray}
            />
        )}
      </div>

      {/* Advanced Options using shared ExpandableSection for smooth height animation */}
      <ExpandableSection 
        title="Advanced 3D Options" 
        defaultExpanded={false}
        buttonClassName="w-full text-left px-0 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center justify-between"
        titleClassName="truncate"
        iconClassName="text-base font-medium"
        contentClassName="px-0 pb-3"
      >
        <div className="space-y-2">
          {renderAdvancedOptions()}
        </div>
      </ExpandableSection>
    </div>
  );
};
