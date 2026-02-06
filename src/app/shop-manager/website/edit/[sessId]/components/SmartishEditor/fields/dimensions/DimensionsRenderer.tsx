import React, { useState, useEffect } from 'react';
import { LockOpen, Lock } from 'lucide-react';
import { RendererProps } from '../../types';
import { DimensionValue, DimensionValueType } from './types';
import { UnifiedNumberField } from '../../utils/defaults/unifiedFields';
import { SegmentedSwitch } from '../../ControlsUI/Switch';
import { Scan } from 'lucide-react';
import { 
  clampDimensionValue
} from './utils';

export const DimensionsRenderer: React.FC<RendererProps> = ({
  data,
  mutations,
  config
}) => {
  
  const label = config?.label || 'Dimensions';
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
  const [overflowMode, setOverflowMode] = useState<'visible' | 'hidden' | 'scroll'>(data?.overflow || 'visible');
  const [isOverflowAdvancedOpen, setIsOverflowAdvancedOpen] = useState(false);
  const [overflowXMode, setOverflowXMode] = useState<'visible' | 'hidden' | 'scroll'>(data?.overflowX || 'visible');
  const [overflowYMode, setOverflowYMode] = useState<'visible' | 'hidden' | 'scroll'>(data?.overflowY || 'visible');
  const [limitModeWidth, setLimitModeWidth] = useState<'max' | 'min'>('max');
  const [limitModeHeight, setLimitModeHeight] = useState<'max' | 'min'>('max');

  const handleDimensionChange = (
    property: 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight', 
    newValue: DimensionValue
  ) => {
    // Use individual mutators instead of setDimensions
    if (property === 'width' && mutations?.setWidth) {
      mutations.setWidth(newValue);
    } else if (property === 'height' && mutations?.setHeight) {
      mutations.setHeight(newValue);
    } else if (property === 'minWidth' && (mutations as any)?.setMinWidth) {
      (mutations as any).setMinWidth(newValue);
    } else if (property === 'minHeight' && (mutations as any)?.setMinHeight) {
      (mutations as any).setMinHeight(newValue);
    } else if (property === 'maxWidth' && mutations?.setMaxWidth) {
      mutations.setMaxWidth(newValue);
    } else if (property === 'maxHeight' && mutations?.setMaxHeight) {
      mutations.setMaxHeight(newValue);
    }
  };

  const handleValueTypeChange = (
    property: 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight',
    newType: DimensionValueType
  ) => {
    const currentValue = data?.[property]?.value || { value: 100, type: 'relative' as DimensionValueType };
    const newValue: DimensionValue = {
      ...currentValue,
      type: newType,
      value: (newType === 'fit-content' || newType === 'auto' || newType === 'unset') ? 0 : currentValue.value
    };

    handleDimensionChange(property, newValue);
  };

  const handleValueChange = (
    property: 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight',
    newValue: number
  ) => {
    const currentValue = data?.[property]?.value || { value: 100, type: 'relative' as DimensionValueType };
    
    if (currentValue.type === 'fit-content' || currentValue.type === 'auto' || currentValue.type === 'unset') return; // Don't allow value changes for fit-content, auto, or unset

    const clampedValue = clampDimensionValue(newValue, currentValue.type);
    const newDimensionValue: DimensionValue = {
      ...currentValue,
      value: clampedValue
    };

    // Handle aspect ratio locking for width and height
    if (isAspectRatioLocked && (property === 'width' || property === 'height')) {
      const currentWidth = data?.width?.value || { value: 100, type: 'relative' as DimensionValueType };
      const currentHeight = data?.height?.value || { value: 100, type: 'relative' as DimensionValueType };
      
      // Calculate the aspect ratio
      const aspectRatio = currentWidth.value / currentHeight.value;
      
      if (property === 'width') {
        // When width changes, update height proportionally
        const newHeightValue = Math.round(clampedValue / aspectRatio);
        const newHeightDimension: DimensionValue = {
          ...currentHeight,
          value: clampDimensionValue(newHeightValue, currentHeight.type)
        };
        handleDimensionChange('height', newHeightDimension);
      } else if (property === 'height') {
        // When height changes, update width proportionally
        const newWidthValue = Math.round(clampedValue * aspectRatio);
        const newWidthDimension: DimensionValue = {
          ...currentWidth,
          value: clampDimensionValue(newWidthValue, currentWidth.type)
        };
        handleDimensionChange('width', newWidthDimension);
      }
    }

    handleDimensionChange(property, newDimensionValue);
  };




  // Determine whether to show the Aspect selector (only when both width and height are fixed)
  const widthType = (data?.width?.value?.type as DimensionValueType) || 'relative';
  const heightType = (data?.height?.value?.type as DimensionValueType) || 'relative';
  const shouldShowAspect = widthType === 'fixed' && heightType === 'fixed';
  const shouldShowAspectLock = (['fixed','relative'].includes(widthType) && ['fixed','relative'].includes(heightType));

  // Sync overflow state from data changes
  useEffect(() => {
    if (data?.overflow) setOverflowMode(data.overflow);
    if (data?.overflowX) setOverflowXMode(data.overflowX);
    if (data?.overflowY) setOverflowYMode(data.overflowY);
  }, [data?.overflow, data?.overflowX, data?.overflowY]);

  // Derive current aspect from width/height when both fixed
  useEffect(() => {
    if (!shouldShowAspect) return;
    const w = (data?.width?.value?.type === 'fixed') ? data?.width?.value?.value : undefined;
    const h = (data?.height?.value?.type === 'fixed') ? data?.height?.value?.value : undefined;
    if (!w || !h || h === 0) return;
    const ratio = w / h;
    const presets = ['16:9','1:1','2:1','1:2','9:16'];
    const values = [16/9, 1, 2, 1/2, 9/16];
    const tol = 0.02;
    let found = '16:9';
    let matched = false;
    for (let i = 0; i < presets.length; i++) {
      if (Math.abs(ratio - values[i]) < tol) {
        found = presets[i]; matched = true; break;
      }
    }
    if (matched) setSelectedAspectRatio(found);
  }, [shouldShowAspect, data?.width?.value, data?.height?.value]);

  const applyAspectRatio = (aspect: string) => {
    if (!shouldShowAspect) return;
    const currentWidth = data?.width?.value || { value: 100, type: 'relative' as DimensionValueType };
    const currentHeight = data?.height?.value || { value: 100, type: 'relative' as DimensionValueType };
    // Only operate when both fixed
    if (currentWidth.type !== 'fixed' || currentHeight.type !== 'fixed') return;
    const [a, b] = aspect.split(':').map((n) => parseFloat(n));
    if (!a || !b) return;
    const targetRatio = a / b;
    // Prefer keeping width, adjust height
    const newHeightValue = Math.round(currentWidth.value / targetRatio);
    const newHeightDimension: DimensionValue = { ...currentHeight, value: clampDimensionValue(newHeightValue, 'fixed') };
    if (mutations?.setHeight) mutations.setHeight(newHeightDimension);
  };

  const renderDimensionField = (
    property: 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight',
    label: string,
    value: DimensionValue
  ) => {
    // Determine effective property when toggling between max/min for width/height limits
    let effectiveProperty: 'width' | 'height' | 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight' = property;
    if (property === 'maxWidth' && limitModeWidth === 'min') effectiveProperty = 'minWidth';
    if (property === 'maxHeight' && limitModeHeight === 'min') effectiveProperty = 'minHeight';

    // Source value from data based on effective property to always show the correct bound
    const effectiveValue: DimensionValue = (data as any)?.[effectiveProperty]?.value || value;

    return (
      <div className="flex items-center space-x-1">
        {(property === 'maxWidth' || property === 'maxHeight') ? (
          <label className="text-xs font-medium text-gray-700 flex-shrink-0 mr-auto flex items-center gap-1">
            <span
              className="cursor-pointer relative isolate before:content-[''] before:absolute before:-inset-x-1 before:-inset-y-0.5 before:bg-gray-200 before:rounded-[4px] before:scale-0 before:transition-transform before:duration-75 before:-z-10 hover:before:scale-100 select-none"
              style={{
                textDecoration: 'underline dotted',
                textDecorationThickness: '1px',
                textUnderlineOffset: '2px',
              }}
              title={
                property === 'maxWidth'
                  ? (limitModeWidth === 'max' ? 'Switch to min width' : 'Switch to max width')
                  : (limitModeHeight === 'max' ? 'Switch to min height' : 'Switch to max height')
              }
              onClick={() => {
                if (property === 'maxWidth') {
                  setLimitModeWidth((m) => (m === 'max' ? 'min' : 'max'));
                } else {
                  setLimitModeHeight((m) => (m === 'max' ? 'min' : 'max'));
                }
              }}
            >
              {property === 'maxWidth' ? (limitModeWidth === 'max' ? 'Max ' : 'Min ') : (limitModeHeight === 'max' ? 'Max' : 'Min')}
            </span>
            <span className="capitalize">{property === 'maxWidth' ? 'width' : 'height'}</span>
          </label>
        ) : (
          <label className="text-xs font-medium text-gray-700 flex-shrink-0 mr-auto">
            {label}
          </label>
        )}
        
        {/* Spacing for width and height fields */}
        {(property === 'width' || property === 'height') && (
          <div className="relative">
            {(property === 'width' && shouldShowAspectLock && 
              <div 
                className="DL absolute inset-0 top-[10px] w-[20px] h-[22px] cursor-pointer"
                onClick={() => setIsAspectRatioLocked(!isAspectRatioLocked)}
                title={isAspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
              >
                {isAspectRatioLocked ? (
                  <Lock 
                    className="absolute -left-1/2 top-[33%] -translate-x-1/2 -translate-y-1/2 border-[4px] border-white rounded-full z-10 bg-white transition-[stroke] duration-75" 
                    size={22} 
                    color='hsl(240, 6%, 60%)'
                    strokeWidth={3}
                  />
                ) : (
                  <LockOpen 
                    className="absolute -left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 border-[4px] border-white rounded-full z-10 bg-white transition-[stroke] duration-75" 
                    size={22} 
                    color='hsl(240, 6%, 80%)'
                    strokeWidth={3}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Value Input with inline unit selector */}
        <div className="">
          <UnifiedNumberField
            value={effectiveValue.value}
            onChange={(newValue) => handleValueChange(effectiveProperty, newValue)}
            config={{
              min: 0,
              max: effectiveValue.type === 'relative' ? 100 : effectiveValue.type === 'fixed' ? 1200 : undefined,
              step: effectiveValue.type === 'relative' ? 1 : 1,
              showSlider: false,
              className: "w-full",
              unit: (effectiveValue.type === 'relative' ? '%' : effectiveValue.type === 'fixed' ? 'PX' : effectiveValue.type === 'auto' ? 'Auto' : effectiveValue.type === 'unset' ? 'Unset' : effectiveValue.type),
              unitOptions: (
                (effectiveProperty === 'maxWidth' || effectiveProperty === 'maxHeight' || effectiveProperty === 'minWidth' || effectiveProperty === 'minHeight')
                  ? ['PX','%','fit-content','Unset']
                  : ['PX','%','fit-content','Auto']
              ),
              onUnitChange: (u: string) => {
                // Map unit to DimensionValueType and update
                const nextType: DimensionValueType = (u === '%') ? 'relative'
                  : (u === 'PX') ? 'fixed'
                  : (u === 'Auto') ? 'auto'
                  : (u === 'fit-content') ? 'fit-content'
                  : (u === 'Unset') ? 'unset'
                  : 'unset';
                handleValueTypeChange(effectiveProperty, nextType);
              },
              inputClassName: "px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
            }}
          />
        </div>

        {/* Inline unit selector handled by UnifiedNumberField; remove external dropdown */}

      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {renderDimensionField('width', 'Width', data?.width?.value || { value: 100, type: 'relative' as DimensionValueType })}
          {renderDimensionField('maxWidth', 'Max Width', data?.maxWidth?.value || { value: 0, type: 'unset' as DimensionValueType })}
          {renderDimensionField('height', 'Height', data?.height?.value || { value: 100, type: 'relative' as DimensionValueType })}
          {renderDimensionField('maxHeight', 'Max Height', data?.maxHeight?.value || { value: 0, type: 'unset' as DimensionValueType })}
        </div>

        {shouldShowAspect && (
          <div className="flex items-center space-x-2 mt-6">
            <label className="text-xs font-medium text-gray-700 w-20 flex-shrink-0">Aspect</label>
            <SegmentedSwitch
              labels={["16:9","1:1","2:1","1:2","9:16"]}
              values={["16:9","1:1","2:1","1:2","9:16"]}
              value={selectedAspectRatio as any}
              onChange={(v) => { const sel = v as string; setSelectedAspectRatio(sel); applyAspectRatio(sel); }}
              className="!ml-auto"
            />
          </div>
        )}

        {/* Overflow header row with buttons next to label and switch at end when simple */}
        <div className="flex items-center mt-6">
          <div className="flex items-center">
            <label className="text-xs font-medium text-gray-700 flex-shrink-0 mr-2">Overflow</label>
            <div className="flex items-center gap-1 mr-auto">
              <button
                type="button"
                onClick={() => setIsOverflowAdvancedOpen((v) => !v)}
                className={`group p-1 rounded transition-colors ${!isOverflowAdvancedOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                title="Connected edges"
                aria-expanded={!isOverflowAdvancedOpen}
              >
                <div className={`w-4 h-4 border rounded-md transition-colors ${!isOverflowAdvancedOpen ? 'border-gray-800' : 'border-gray-600 group-hover:border-gray-800'}`}></div>
              </button>
              <button
                type="button"
                onClick={() => setIsOverflowAdvancedOpen((v) => !v)}
                className={`group p-1 rounded transition-colors ${isOverflowAdvancedOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                title="Advanced overflow behaviour"
                aria-expanded={isOverflowAdvancedOpen}
              >
                <Scan className={`transition-colors ${isOverflowAdvancedOpen ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`} size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1" />
          {!isOverflowAdvancedOpen && (
            <div className="flex items-center space-x-2 w-fit">
              <SegmentedSwitch
                labels={["Visible","Hidden","Scroll"]}
                values={["visible","hidden","scroll"]}
                value={overflowMode}
                onChange={(v) => { const m = v as 'visible' | 'hidden' | 'scroll'; setOverflowMode(m); mutations?.setOverflow && mutations.setOverflow(m); }}
                className="flex-1"
              />
            </div>
          )}
        </div>

        {/* Overflow Behaviour per axis (advanced) */}
        {isOverflowAdvancedOpen && (
          <div className="flex flex-col space-y-2 ml-auto max-w-[70%]">
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">X</label>
                <SegmentedSwitch
                  labels={["Visible","Hidden","Scroll"]}
                  values={["visible","hidden","scroll"]}
                  value={overflowXMode}
                  onChange={(v) => { const m = v as 'visible' | 'hidden' | 'scroll'; setOverflowXMode(m); mutations?.setOverflowX && mutations.setOverflowX(m); }}
                  className="w-full"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700 w-12">Y</label>
                <SegmentedSwitch
                  labels={["Visible","Hidden","Scroll"]}
                  values={["visible","hidden","scroll"]}
                  value={overflowYMode}
                  onChange={(v) => { const m = v as 'visible' | 'hidden' | 'scroll'; setOverflowYMode(m); mutations?.setOverflowY && mutations.setOverflowY(m); }}
                  className="w-full"
                />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
