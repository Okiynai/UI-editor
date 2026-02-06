import React from 'react';
import { Field, RendererProps } from '@/app/shop-manager/website/edit/[sessId]/components/SmartishEditor/types';
import { defaultReader, defaultMutatorsCreator } from '../../utils';
import { OverrideCreatorWrapper, OverrideDisplay } from '@/app/shop-manager/website/edit/[sessId]/components/SmartishEditor/utils/defaults/OverrideUtils';
import { UnifiedNumberField } from '../../utils/defaults/unifiedFields';

interface FilterValues {
  brightness?: number;
  contrast?: number;
  saturate?: number;
  hueRotate?: number;
  grayscale?: number;
  sepia?: number;
  blur?: number;
}

// Helper function to parse filter string into individual values
function parseFilterString(filterString: string): FilterValues {
  if (!filterString) return {};
  
  const values: FilterValues = {};
  // Updated regex to include hyphens: [\w-]+ instead of \w+
  const functions = filterString.match(/([\w-]+)\(([^)]+)\)/g);
  
  if (functions) {
    functions.forEach(func => {
      const match = func.match(/([\w-]+)\(([^)]+)\)/);
      if (match) {
        const [, name, value] = match;
        // Remove 'deg' from hue-rotate values before parsing
        const cleanValue = name === 'hue-rotate' ? value.replace('deg', '') : value;
        const numValue = parseFloat(cleanValue);
        
        switch (name) {
          case 'brightness':
          case 'contrast':
          case 'saturate':
          case 'grayscale':
          case 'sepia':
            values[name] = numValue;
            break;
          case 'hue-rotate':
            values.hueRotate = numValue;
            break;
          case 'blur':
            // Remove 'px' from blur values before parsing
            const blurValue = value.replace('px', '');
            values.blur = parseFloat(blurValue);
            break;
        }
      }
    });
  }
  
  return values;
}

// Helper function to build filter string from individual values
function buildFilterString(values: FilterValues): string {
  const parts: string[] = [];
  
  if (values.brightness !== undefined) parts.push(`brightness(${values.brightness})`);
  if (values.contrast !== undefined) parts.push(`contrast(${values.contrast})`);
  if (values.saturate !== undefined) parts.push(`saturate(${values.saturate})`);
  if (values.hueRotate !== undefined) parts.push(`hue-rotate(${values.hueRotate}deg)`);
  if (values.grayscale !== undefined) parts.push(`grayscale(${values.grayscale})`);
  if (values.sepia !== undefined) parts.push(`sepia(${values.sepia})`);
  if (values.blur !== undefined) parts.push(`blur(${values.blur}px)`);
  
  return parts.join(' ');
}

// Helper function to build complete filter string with all properties (for smooth transitions)
function buildCompleteFilterString(values: FilterValues): string {
  const parts: string[] = [];
  parts.push(`brightness(${values.brightness ?? 1})`);
  parts.push(`contrast(${values.contrast ?? 1})`);
  parts.push(`saturate(${values.saturate ?? 1})`);
  parts.push(`hue-rotate(${values.hueRotate ?? 0}deg)`);
  parts.push(`grayscale(${values.grayscale ?? 0})`);
  parts.push(`sepia(${values.sepia ?? 0})`);
  parts.push(`blur(${values.blur ?? 0}px)`);
  return parts.join(' ');
}

// Individual filter field component using UnifiedNumberField
const FilterField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, unit, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-medium text-gray-700 min-w-0 flex-shrink-0 w-20">
        {label}
      </label>
      <div className="flex-1 min-w-0">
        <UnifiedNumberField
          value={value}
          onChange={onChange}
          config={{
            min,
            max,
            step,
            showSlider: true,
            unit
          }}
        />
      </div>
    </div>
  );
};

// Filter fields component that can be reused
const FilterFieldsComponent: React.FC<{
  filterValues: FilterValues;
  updateFilterValue: (key: keyof FilterValues, value: number) => void;
}> = ({ filterValues, updateFilterValue }) => {
  return (
    <div className="space-y-4">
      <FilterField
        label="Brightness"
        value={filterValues.brightness ?? 1}
        min={0}
        max={2}
        step={0.1}
        unit=""
        onChange={(value) => updateFilterValue('brightness', value)}
      />
      
      <FilterField
        label="Contrast"
        value={filterValues.contrast ?? 1}
        min={0}
        max={2}
        step={0.1}
        unit=""
        onChange={(value) => updateFilterValue('contrast', value)}
      />
      
      <FilterField
        label="Saturate"
        value={filterValues.saturate ?? 1}
        min={0}
        max={2}
        step={0.1}
        unit=""
        onChange={(value) => updateFilterValue('saturate', value)}
      />
      
      <FilterField
        label="Hue Rotate"
        value={filterValues.hueRotate ?? 0}
        min={0}
        max={360}
        step={1}
        unit="°"
        onChange={(value) => updateFilterValue('hueRotate', value)}
      />
      
      <FilterField
        label="Grayscale"
        value={filterValues.grayscale ?? 0}
        min={0}
        max={1}
        step={0.1}
        unit=""
        onChange={(value) => updateFilterValue('grayscale', value)}
      />
      
      <FilterField
        label="Sepia"
        value={filterValues.sepia ?? 0}
        min={0}
        max={1}
        step={0.1}
        unit=""
        onChange={(value) => updateFilterValue('sepia', value)}
      />
      
      <FilterField
        label="Blur"
        value={filterValues.blur ?? 0}
        min={0}
        max={10}
        step={0.1}
        unit="px"
        onChange={(value) => updateFilterValue('blur', value)}
      />
    </div>
  );
};

// Main filter group field
export const filterGroupField: Field = {
  id: "filter",
  rendererKey: "filterGroup",
  interactionsInlineStyle: "filter",
  reader: (node, siteSettings) => {
    const baseValue = defaultReader({
      type: "string",
      dataPath: "params.filter",
      interactionsInlineStyle: "filter"
    }, node, siteSettings);

    // Add interaction state overrides
    const overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }> = [];
    
    if (node.interactionStates) {
      Object.keys(node.interactionStates).forEach((interactionState) => {
        const interactionData = (node.interactionStates as any)[interactionState];
        const interactionValue = interactionData?.inlineStyles?.filter;
        if (interactionValue !== undefined) {
          overrides.push({ scope: 'interaction', key: interactionState, value: interactionValue });
        }
      });
    }

    return {
      ...baseValue,
      overrides: overrides.length > 0 ? overrides : undefined
    };
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return {
      update: (value: string, ctx?: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        
        // Handle interaction state updates
        if (ctx?.interaction) {
          const interactionState = ctx.interaction;
          
          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // If transition data is provided, update the transition settings
          if (ctx.transition) {
            const transition = ctx.transition;
            
            // Update or add transition for the filter property
            const updatedTransitions = existingTransitions.map((t: any) => 
              t.prop === 'filter' 
                ? {
                    ...t,
                    durationMs: transition.durationMs,
                    easing: transition.easing,
                    waitDurationMs: transition.waitDurationMs || 0
                  }
                : t
            );
            
            // If no existing transition for filter, add it
            if (!existingTransitions.some((t: any) => t.prop === 'filter')) {
              updatedTransitions.push({
                prop: 'filter',
                durationMs: transition.durationMs,
                easing: transition.easing,
                waitDurationMs: transition.waitDurationMs || 0
              });
            }
            
            // Use existing value if no new value provided (for transition-only updates)
            const valueToUse = value !== null ? value : existingInlineStyles.filter;
            
            const changes = {
              interactionStates: {
                [interactionState]: {
                  inlineStyles: {
                    ...existingInlineStyles,
                    filter: valueToUse
                  },
                  transitions: updatedTransitions
                }
              }
            };
            onIframeUpdate(node.id, changes);
            return;
          }
          
          // Regular interaction state update (just the value)
          const changes = {
            interactionStates: {
              [interactionState]: {
                inlineStyles: {
                  ...existingInlineStyles,
                  filter: value
                }
              }
            }
          };
          
          onIframeUpdate(node.id, changes);
          return;
        }
        
        // Handle regular updates (base value, responsive, locale)
        if (ctx?.breakpoint || ctx?.locale) {
          // Use the standard override system for responsive/locale
          const path = ctx.breakpoint ? `responsiveOverrides.${ctx.breakpoint}.params.filter` : `localeOverrides.${ctx.locale}.params.filter`;
          onIframeUpdate(node.id, { [path]: value });
        } else {
          // Update base value
          onIframeUpdate(node.id, { params: { ...node.params, filter: value } });
        }
      },
      createOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string; transition?: any }) => {
        if (!onIframeUpdate) return;
        
        // Handle interaction state creation
        if (ctx.interaction) {
          const interactionState = ctx.interaction;
          
          // Get existing interaction state to preserve existing data
          const existingInteractionState = (node.interactionStates as any)?.[interactionState] || {};
          const existingInlineStyles = existingInteractionState.inlineStyles || {};
          const existingTransitions = existingInteractionState.transitions || [];
          
          // Create base interaction state with complete filter (all properties for smooth transitions)
          const currentFilterValues = parseFilterString(node.params.filter || '');
          const completeFilterString = buildCompleteFilterString(currentFilterValues);
          
          const baseInteractionState: any = {
            inlineStyles: {
              ...existingInlineStyles,
              filter: completeFilterString
            }
          };
          
          // Add transition if provided
          if (ctx.transition) {
            baseInteractionState.transitions = [
              ...existingTransitions.filter((t: any) => t.prop !== 'filter'),
              {
                prop: 'filter',
                durationMs: ctx.transition.durationMs,
                easing: ctx.transition.easing,
                waitDurationMs: ctx.transition.waitDurationMs || 0
              }
            ];
          }
          
          // Send the interaction state creation using the proper nested structure
          const changes = {
            interactionStates: {
              [interactionState]: baseInteractionState
            }
          };
          
          onIframeUpdate(node.id, changes);
          return;
        }
        
        // Handle regular override creation (responsive, locale)
        if (ctx.breakpoint || ctx.locale) {
          const path = ctx.breakpoint ? `responsiveOverrides.${ctx.breakpoint}.params.filter` : `localeOverrides.${ctx.locale}.params.filter`;
          // Use complete filter string for smooth transitions
          const currentFilterValues = parseFilterString(node.params.filter || '');
          const completeFilterString = buildCompleteFilterString(currentFilterValues);
          onIframeUpdate(node.id, { [path]: completeFilterString });
        }
      },
      removeOverride: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => {
        if (!onIframeUpdate) return;
        
        // Handle interaction state removal
        if (ctx.interaction) {
          const unsetPath = `interactionStates.${ctx.interaction}.inlineStyles.filter`;
          onIframeUpdate(node.id, {
            __unset: [{ scope: 'interaction', key: ctx.interaction, path: unsetPath }]
          });
          return;
        }
        
        // Handle regular override removal
        if (ctx.breakpoint) {
          onIframeUpdate(node.id, {
            __unset: [{ scope: 'responsive', key: ctx.breakpoint, path: `responsiveOverrides.${ctx.breakpoint}.params.filter` }]
          });
        } else if (ctx.locale) {
          onIframeUpdate(node.id, {
            __unset: [{ scope: 'locale', key: ctx.locale, path: `localeOverrides.${ctx.locale}.params.filter` }]
          });
        }
      }
    };
  },
  rendererConfig: {
    type: "filterGroup",
    label: "Filters",
    className: "space-y-3"
  }
};

// Custom renderer for the filter group
export const FilterGroupRenderer: React.FC<RendererProps> = ({ data, mutations, config, library, libraryData }) => {
  const [filterValues, setFilterValues] = React.useState<FilterValues>(() => 
    parseFilterString(data.value || '')
  );

  // Update filter values when data changes
  React.useEffect(() => {
    setFilterValues(parseFilterString(data.value || ''));
  }, [data.value]);

  // Update the filter string when individual values change
  const updateFilterValue = (key: keyof FilterValues, value: number) => {
    const newValues = { ...filterValues, [key]: value };
    setFilterValues(newValues);
    // Use complete filter string to ensure all properties are present for smooth transitions
    const filterString = buildCompleteFilterString(newValues);
    mutations.update(filterString);
  };

  const resetFilter = () => {
    // Reset to default values instead of empty string
    const defaultValues = {
      brightness: 1,
      contrast: 1,
      saturate: 1,
      hueRotate: 0,
      grayscale: 0,
      sepia: 0,
      blur: 0
    };
    setFilterValues(defaultValues);
    const filterString = buildCompleteFilterString(defaultValues);
    mutations.update(filterString);
  };

  return (
    <div className="relative group py-2 pb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-700">
            {config?.label || 'Filters'}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilter}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors duration-150 ease-in-out"
            >
              Reset
            </button>
            <div className="-mt-1">
              <OverrideCreatorWrapper
                fieldLabel="Filters"
                interactionsInlineStyle="filter"
                customPositioning={{ bottom: "5px" }}
                mutations={mutations}
                siteSettings={libraryData?.siteSettings}
                overrides={data.overrides || []}
              />
            </div>
          </div>
        </div>
        
        <FilterFieldsComponent
          filterValues={filterValues}
          updateFilterValue={updateFilterValue}
        />
      </div>
      
      {data.overrides && data.overrides.length > 0 && (
        <div className="mt-3">
          <OverrideDisplay
            overrides={data.overrides}
            mutations={mutations}
            initOverrideState={false}
          >
            {(override) => (
              <FilterFieldsComponent
                filterValues={parseFilterString(override.value || '')}
                updateFilterValue={(key, value) => {
                  const newValues = { ...parseFilterString(override.value || ''), [key]: value };
                  // Use complete filter string to ensure all properties are present for smooth transitions
                  const filterString = buildCompleteFilterString(newValues);
                  mutations.update(filterString, {
                    [override.scope === 'responsive' ? 'breakpoint' : override.scope]: override.key
                  });
                }}
              />
            )}
          </OverrideDisplay>
        </div>
      )}
    </div>
  );
};
