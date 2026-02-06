import React from "react";

import { OverrideCreatorWrapper, OverrideDisplay } from "./OverrideUtils";
import { renderField } from "./unifiedFields";
import { RendererProps } from "../../types";

// Type definitions for the default renderer
interface DefaultMutations {
  update: (value: any, ctx?: { breakpoint?: string; locale?: string }) => void;
}

interface DefaultConfig {
  type: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; name: string }>;
  placeholder?: string;
  rows?: number;
  isCSSBased?: boolean;
  dir?: "row" | "col";
  className?: string;
  minWidth?: number;
  labelTextClass?: string;
  enableOverrides?: boolean;
  showLabel?: boolean;
  overridePositioning?: {
    bottom?: string;
    top?: string;
    left?: string;
    right?: string;
  };
}

/**
 * Default renderer that handles common primitive field types
 * Simple and focused on basic UI controls
 */
const DefaultRenderer: React.FC<RendererProps<any, DefaultMutations, DefaultConfig>> = ({ data, mutations, config, library, libraryData, siteSettings, showOverrides, interactionsInlineStyle }) => {

  // Field type must be specified in config
  const fieldType = config?.type;
  if (!fieldType) {
    return (
      <div className="py-2 text-red-500">
        Error: Field type not specified in config
      </div>
    );
  }

  const { update } = mutations;
  if (!update) {
    return (
      <div className="py-2 text-red-500">
        Error: Mutations object not found
      </div>
    );
  }

  const { value, overrides } = data;

  // Handle different field types using unified renderer
  const getFieldClassName = (fieldType: string) => {
    const direction = config?.dir || "col";

    switch (fieldType) {
      case "checkbox":
        return `flex items-center space-x-3`;
      case "number":
      case "lineHeight": // Treat lineHeight same as number for spacing
        if (direction === "row") {
          return `flex items-center space-x-24`; // HUGE gap for sliders
        }
        return `space-y-2`;
      default:
        if (direction === "row") {
          return `flex items-center space-x-3`;
        }
        return `space-y-2`;
    }
  };

  const getFieldLabel = (fieldType: string) => {
    switch (fieldType) {
      case "color":
        return config?.label || 'Color';
      case "number":
        return config?.label || 'Number';
      case "checkbox":
        return config?.label || 'Checkbox';
      case "select":
        return config?.label || 'Select';
      case "text":
        return config?.label || 'Text';
      case "textarea":
        return config?.label || 'Textarea';
      default:
        return config?.label || 'Unknown';
    }
  };

  const isRowLayout = (config?.dir || "col") === "row";
  
  // Determine if overrides should be shown
  // Priority: config.enableOverrides > true (default)
  const shouldShowOverrides = config?.enableOverrides !== undefined 
    ? config.enableOverrides 
    : true;

  // Determine if label should be shown
  // Priority: config.showLabel > true (default)
  const shouldShowLabel = config?.showLabel !== undefined 
    ? config.showLabel 
    : true;

  return (
    <div className={`relative group py-2`}>
      <div className={`${getFieldClassName(fieldType)}`}>
        {fieldType !== "checkbox" && shouldShowLabel && (
          <label className={`${config?.labelTextClass || 'text-xs'} font-medium text-gray-700 ${isRowLayout ? 'whitespace-nowrap' : ''}`}>
            {getFieldLabel(fieldType)}
          </label>
        )}
        {renderField(fieldType, value, config, update, library, libraryData)}
      </div>

      {shouldShowOverrides && (
        <OverrideCreatorWrapper
          fieldLabel={getFieldLabel(fieldType)}
          interactionsInlineStyle={interactionsInlineStyle}
          mutations={mutations}
          siteSettings={siteSettings}
          overrides={overrides}
          customPositioning={config?.overridePositioning}
        />
      )}

      {shouldShowOverrides && overrides && fieldType && config && (
        <OverrideDisplay
          overrides={overrides}
          mutations={mutations}
          initOverrideState={showOverrides ?? false}
        >
          {(override) => renderField(fieldType, override.value, config, (value: any) => {
            const ctx = override.scope === 'locale'
              ? { locale: override.key }
              : override.scope === 'interaction'
              ? { interaction: override.key }
              : { breakpoint: override.key };
            mutations.update(value, ctx);
          }, library, libraryData)}
        </OverrideDisplay>
      )}
    </div>
  );
};

export default DefaultRenderer;