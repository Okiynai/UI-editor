import React, { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

import { useUncontrolledColorRef, useUncontrolledNumberRef, useUncontrolledFieldRef, useUncontrolledSelectRef, useUncontrolledBooleanRef } from "../../hooks";

import { ColorPickerWithPreview, DragNumberInput, Select, SegmentedSwitch } from "../../ControlsUI";

// Unified Field Renderer
export const renderField = (
  fieldType: string,
  value: any,
  config: any,
  onChange: (value: any) => void,
  library?: any,
  libraryData?: any
): React.ReactNode => {
  switch (fieldType) {
    case "segmented":
      return <UnifiedSegmentedField
        value={value}
        onChange={onChange}
        config={config}
      />;
    case "color":
      return <UnifiedColorField
        value={value}
        onChange={onChange}
        config={config}
        library={library}
        libraryData={libraryData}
      />;
    case "number":
    case "lineHeight": // Treat lineHeight same as number
      return <UnifiedNumberField
        value={value}
        onChange={onChange}
        config={config}
      />;
    case "text":
      return <UnifiedTextField
        value={value}
        onChange={onChange}
        config={config}
      />;
    case "textarea":
      return <UnifiedTextareaField
        value={value}
        onChange={onChange}
        config={config}
      />;
    case "select":
      return <UnifiedSelectField
        value={value}
        onChange={onChange}
        config={config}
        library={library}
        libraryData={libraryData}
      />;
    case "checkbox":
      return <UnifiedCheckboxField
        value={value}
        onChange={onChange}
        config={config}
      />;
    default:
      return (
        <div className="text-sm text-gray-500">
          {fieldType} field (to be implemented)
        </div>
      );
  }
};

// Unified Field Components
export const UnifiedColorField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
  library: any;
  libraryData: any;
}> = ({ value, onChange, config, library, libraryData }) => {
  // 1. Add state to track if the user has the picker open.
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 2. Pass the interaction state to the hook.
  const { color: localColor, onChange: localOnChange } = useUncontrolledColorRef({
    initialColor: value || "#000000",
    onImmediateChange: () => {}, // The throttled handler is used for iframe updates
    isInteracting: isPickerOpen,
  });

  const lastEmitRef = useRef<number>(0);
  const trailingTimerRef = useRef<number | null>(null);
  const latestHexRef = useRef<string>(value || "#000000");
  useEffect(() => { latestHexRef.current = localColor; }, [localColor]);
  useEffect(() => () => { if (trailingTimerRef.current) { clearTimeout(trailingTimerRef.current); } }, []);

  const throttleMs = 60;
  const onChangeThrottled = useCallback((hex: string) => {
    latestHexRef.current = hex;
    const now = Date.now();
    const elapsed = now - lastEmitRef.current;
    if (elapsed >= throttleMs) {
      lastEmitRef.current = now;
      onChange(hex);
    } else if (!trailingTimerRef.current) {
      const delay = throttleMs - elapsed;
      trailingTimerRef.current = window.setTimeout(() => {
        trailingTimerRef.current = null;
        lastEmitRef.current = Date.now();
        onChange(latestHexRef.current);
      }, delay);
    }
  }, [onChange]);

  useEffect(() => {
    // This is a workaround since the ColorPickerWithPreview doesn't expose onOpen/onClose
    // We'll assume the picker is "interacting" when the color changes rapidly
    // This is not perfect but will work for most cases
    const timer = setTimeout(() => {
      setIsPickerOpen(false);
    }, 1000); // Assume interaction ends after 1 second of no changes

    return () => clearTimeout(timer);
  }, [localColor]);

  // Set interaction state when color changes
  useEffect(() => {
    setIsPickerOpen(true);
  }, [localColor]);

  return (
    <div className={config?.className || ""}>
      <ColorPickerWithPreview
        color={localColor}
        onChange={localOnChange}
        onChangeThrottled={onChangeThrottled}
        library={library}
        libraryData={libraryData}
      />
    </div>
  );
};

export const UnifiedNumberField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
}> = ({ value, onChange, config }) => {
  const numericValue = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  const { 
    value: localNumber, 
    onChange: localOnChange, 
    interactionProps 
  } = useUncontrolledNumberRef({
    initialValue: numericValue,
    onImmediateChange: onChange,
  });

  return (
    <DragNumberInput
      value={localNumber}
      onChange={localOnChange}
      min={config?.min ?? 0}
      max={config?.max ?? 100}
      step={config?.step ?? 1}
      showSlider={config?.showSlider !== false}
      className={config?.className || ""}
      unit={config?.unit}
      unitOptions={config?.unitOptions}
      onUnitChange={config?.onUnitChange}
      // Spread the interaction handlers onto the component
      {...interactionProps}
    />
  );
};

export const UnifiedTextField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
}> = ({ value, onChange, config }) => {
  const { inputProps } = useUncontrolledFieldRef<HTMLInputElement>({
    initialValue: value || "",
    onImmediateChange: onChange,
  });

  return (
    <input
      type="text"
      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-0.5 focus:ring-primary-500 focus:border-primary-500"
      placeholder={config?.placeholder || "Enter text"}
      {...inputProps}
    />
  );
};

export const UnifiedTextareaField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
}> = ({ value, onChange, config }) => {
  const { inputProps } = useUncontrolledFieldRef<HTMLTextAreaElement>({
    initialValue: value || "",
    onImmediateChange: onChange,
  });

  return (
    <textarea
      className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-0.5 focus:ring-primary-500 focus:border-primary-500"
      rows={config?.rows || 3}
      placeholder={config?.placeholder || "Enter text"}
      {...inputProps}
    />
  );
};

export const UnifiedSegmentedField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
}> = ({ value, onChange, config }) => {
  const options = (config?.options || []).map((option: any) => ({
    value: option.value,
    label: option.name || option.title || option.label || option.value,
    icon: option.icon
  }));

  // Check if any option has an icon
  const hasIcons = options.some((o: any) => o.icon);
  
  // Get Lucide icon component
  const getIcon = (iconName: string) => {
    if (!iconName) return undefined;
    
    const iconMap: { [key: string]: any } = {
      'AlignLeft': AlignLeft,
      'AlignCenter': AlignCenter,
      'AlignRight': AlignRight,
      'AlignJustify': AlignJustify,
    };
    
    const IconComponent = iconMap[iconName];
    return IconComponent ? React.createElement(IconComponent, { size: 14 }) : undefined;
  };

  return (
    <SegmentedSwitch
      labels={options.map((o: any) => o.label)}
      values={options.map((o: any) => o.value)}
      value={value}
      onChange={onChange}
      className="!ml-auto"
      icons={hasIcons ? options.map((o: any) => getIcon(o.icon)) : undefined}
      display={config?.display || (hasIcons ? 'both' : 'text')}
    />
  );
};

export const UnifiedSelectField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
  library: any;
  libraryData: any;
}> = ({ value, onChange, config, library, libraryData }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { value: localValue, onChange: localOnChange } = useUncontrolledSelectRef({
    initialValue: value || "",
    onImmediateChange: onChange,
    isInteracting: isDropdownOpen,
  });

  const options = useMemo(() =>
    (config?.options?.map((option: any) => ({
      value: option.value,
      label: option.name || option.title || option.label || option.value
    })) || []),
    [config?.options]
  );

  // Monitor for dropdown state changes by tracking value changes
  // This is a workaround since the Select component doesn't expose onOpen/onClose
  useEffect(() => {
    // Assume interaction when value changes
    setIsDropdownOpen(true);
    const timer = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 500); // Assume interaction ends after 500ms of no changes

    return () => clearTimeout(timer);
  }, [localValue]);

  return (
    <div className={config?.className || ""}>
      <Select
        value={localValue}
        onChange={localOnChange}
        options={options}
        placeholder="Select option"
        library={library}
        libraryData={libraryData}
      />
    </div>
  );
};

export const UnifiedCheckboxField: React.FC<{
  value: any;
  onChange: (value: any) => void;
  config: any;
}> = ({ value, onChange, config }) => {
  const { inputProps } = useUncontrolledBooleanRef<HTMLInputElement>({
    initialChecked: !!value,
    onImmediateChange: onChange,
  });

  return (
    <>
      <input
        type="checkbox"
        className="rounded"
        {...inputProps}
      />
      <label className="text-xs font-medium text-gray-700">
        {config?.label || 'Checkbox'}
      </label>
    </>
  );
};
