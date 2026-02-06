import { Minus, Plus, X, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select, SegmentedSwitch } from "../../ControlsUI";

/*
* OverrideDisplay Component - shows override values with L-shaped visual indicator
*/

// OverrideDisplay Component - shows override values with L-shaped visual indicator
interface OverrideDisplayProps {
  overrides: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }>;
  mutations: any;
  initOverrideState: boolean;
  children: (override: { scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }) => React.ReactNode;
}
export const OverrideDisplay: React.FC<OverrideDisplayProps> = ({
  overrides,
  mutations,
  initOverrideState,
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initOverrideState);

  if (!overrides || overrides.length === 0) return null;

  // Render collapsed state
  if (isCollapsed) {
    return (
      <div className="mt-2">
        <div
          className="text-xs text-gray-600 cursor-pointer hover:text-gray-700 transition-colors ml-7 relative"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          Show {overrides.length} override{overrides.length !== 1 ? 's' : ''}

          <div
            className="L cursor-pointer"
            style={{
              '--thickness': '2px',
              '--top': '-8px',
              '--left': '-14px',
              '--height': '20px'
            } as React.CSSProperties}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
          </div>
        </div>
      </div>
    );
  }

  // Render expanded state
  return (
    <div className="space-y-2 mt-2">
      {overrides.map((override, index) => (
        <OverrideField
          key={`${override.scope}-${override.key}`}
          override={override}
          index={index}
          mutations={mutations}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        >
          {children(override)}
        </OverrideField>
      ))}
    </div>
  );
};


/*
* OverrideField Component - shows override values with L-shaped visual indicator
*/

// Individual Override Field Component - handles hooks properly at component level
interface OverrideFieldProps {
  override: { scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any };
  index: number;
  mutations: any;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}

// NOTE: Now fully generalized! This component just handles the L-shaped visual indicator
// and renders whatever children are passed to it. Perfect for any custom field type.
export const OverrideField: React.FC<OverrideFieldProps> = ({
  override,
  index,
  mutations,
  onToggleCollapse,
  children
}) => {
  const scopeLabel = override.scope === 'locale' ? 'language' : 
                    override.scope === 'interaction' ? 'interaction' : 'breakpoint';
  const overrideLabel = `Override for ${scopeLabel} ${override.key}`;

  const overrideFieldRef = useRef<HTMLDivElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEasing, setEditEasing] = useState('ease');
  const [editDuration, setEditDuration] = useState('75');
  const [editWaitDuration, setEditWaitDuration] = useState('0');

  // consts
  const labelHeight = 20; // the label above the field's height

  // space y will apply a space between override fields of 8px
  // except for the first one
  const spaceY = 8; // space between override fields

  const fieldHeightRef = useRef<number>(0); // the field's height
  const [tailHeight, setTailHeight] = useState<number>(0);
  const [topOffset, setTopOffset] = useState<number>(0);

  // Function to calculate heights
  const calculateHeights = useCallback(() => {
    if (overrideFieldRef.current) {
      const currentHeight = overrideFieldRef.current.offsetHeight;
      fieldHeightRef.current = currentHeight;
      
      const newTailHeight = ((index+1) * (labelHeight/2)) + (index * currentHeight) + spaceY;
      const newTopOffset = -(((index) * (spaceY)) + (index * currentHeight) + spaceY);
      
      setTailHeight(newTailHeight);
      setTopOffset(newTopOffset);
    }
  }, [index, spaceY, labelHeight]);

  // Initial calculation with a small delay to ensure DOM is ready
  useEffect(() => {
    // Use a small timeout to ensure the component is fully rendered
    const timeoutId = setTimeout(() => {
      calculateHeights();
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [calculateHeights]);

  // Recalculate when content changes (using ResizeObserver for better timing)
  useEffect(() => {
    if (!overrideFieldRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => {
        calculateHeights();
      });
    });

    resizeObserver.observe(overrideFieldRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateHeights]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ctx = override.scope === 'locale'
      ? { locale: override.key }
      : override.scope === 'interaction'
      ? { interaction: override.key }
      : { breakpoint: override.key };
    mutations.removeOverride(ctx);
  }, [mutations, override.scope, override.key]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Initialize edit values from current override value if it has transition data
    if (override.scope === 'interaction' && override.value?.transition) {
      setEditEasing(override.value.transition.easing || 'ease');
      setEditDuration(String(override.value.transition.durationMs || 75));
      setEditWaitDuration(String(override.value.transition.waitDurationMs || 0));
    }
    setIsEditModalOpen(true);
  }, [override]);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (override.scope === 'interaction') {
      // For transition updates, we don't need to pass a value - just the transition data
      // The update method will preserve the existing value
      mutations.update(null, {
        interaction: override.key,
        transition: {
          easing: editEasing,
          durationMs: Number(editDuration) || 0,
          waitDurationMs: Number(editWaitDuration) || 0
        }
      });
    }
    setIsEditModalOpen(false);
  }, [mutations, override.scope, override.key, editEasing, editDuration, editWaitDuration]);

  return (
    <div key={`${override.scope}-${override.key}`}>
      <div className="ml-7 relative" ref={overrideFieldRef}>
        <div className="text-xs text-gray-600 mb-1 flex items-center gap-2">
          {overrideLabel}
          <div className="flex items-center gap-1 ml-auto">
            {/* Pencil icon for interactions */}
            {override.scope === 'interaction' && (
              <button
                onClick={handleEditClick}
                title="Edit interaction settings"
                className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-gray-100"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleRemove}
              title="Remove override"
              className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div
          className="L cursor-pointer"
          style={{
            '--thickness': '2px',
            '--top': topOffset + 'px',
            '--left': '-14px',
            '--height': tailHeight + 'px'
          } as React.CSSProperties}
          onClick={onToggleCollapse}
          title="Collapse overrides"
        >
        </div>
        {children}
        
        {/* Floating Edit Modal for Interactions */}
        {isEditModalOpen && override.scope === 'interaction' && (
          <div className="absolute top-[20px] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">
                Edit Interaction: {override.key}
              </h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Easing field */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Easing</label>
                <Select
                  value={editEasing}
                  onChange={(v: string) => setEditEasing(v)}
                  options={[
                    { value: 'ease', label: 'ease' },
                    { value: 'linear', label: 'linear' },
                    { value: 'ease-in', label: 'ease-in' },
                    { value: 'ease-out', label: 'ease-out' },
                    { value: 'ease-in-out', label: 'ease-in-out' },
                  ]}
                  placeholder="Select easing"
                />
              </div>
              
              {/* Duration fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Duration (ms)</label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 75"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Wait Duration (ms)</label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={editWaitDuration}
                    onChange={(e) => setEditWaitDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g., 0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleCloseEditModal}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


/*
* Unified Override Creator Component
* Combines the Plus Icon trigger and Override Modal into a single self-contained component
*/
export interface OverrideCreatorProps {
  className?: string;
  fieldLabel: string;
  interactionsInlineStyle?: boolean | string;
  mutations: any;
  siteSettings?: any;
  overrides?: Array<{ scope: 'responsive' | 'locale' | 'interaction'; key: string; value: any }>;
  onModalOpenChange?: (open: boolean) => void;
  customPositioning?: {
    bottom?: string;
    top?: string;
    left?: string;
    right?: string;
  };
}

export const OverrideCreatorWrapper: React.FC<OverrideCreatorProps> = ({
  className,
  fieldLabel,
  interactionsInlineStyle,
  mutations,
  siteSettings,
  overrides = [],
  onModalOpenChange,
  customPositioning,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<'locale' | 'breakpoint' | 'interaction'>('locale');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [interactionEasing, setInteractionEasing] = useState<string>('ease');
  const [interactionDurationMs, setInteractionDurationMs] = useState<string>('75');
  const [interactionWaitDurationMs, setInteractionWaitDurationMs] = useState<string>('0');

  // Get locale options from siteSettings
  const localeOptions = siteSettings?.supportedLocales || ['en-US'];

  // Get breakpoint options from ScreenSizeControls
  const breakpointOptions = ['desktop', 'tablet', 'mobile'];

  // Get interaction options for CSS-based fields
  const interactionOptions = ['hover', 'focus', 'active'];

  const interactionSupported = !!interactionsInlineStyle;

  const getSwitchConfig = () => {
    const labels = interactionSupported
      ? ["Locale", "Breakpoint", "Interaction"]
      : ["Locale", "Breakpoint"];
    const values = interactionSupported
      ? ["locale", "breakpoint", "interaction"]
      : ["locale", "breakpoint"];
    return { labels, values };
  };

  const getOptions = (type: 'locale' | 'breakpoint' | 'interaction') => {
    if (type === 'locale') {
      // Filter out existing locale overrides
      const existingLocaleOverrides = overrides
        .filter(override => override.scope === 'locale')
        .map(override => override.key);
      return localeOptions
        .filter((locale: string) => !existingLocaleOverrides.includes(locale))
        .map((locale: string) => ({ value: locale, label: locale }));
    }
    if (type === 'breakpoint') {
      // Filter out existing breakpoint overrides
      const existingBreakpointOverrides = overrides
        .filter(override => override.scope === 'responsive')
        .map(override => override.key);
      return breakpointOptions
        .filter((bp: string) => !existingBreakpointOverrides.includes(bp))
        .map((bp: string) => ({ value: bp, label: bp.charAt(0).toUpperCase() + bp.slice(1) }));
    }
    // Filter out existing interaction overrides
    const existingInteractionOverrides = overrides
      .filter(override => override.scope === 'interaction')
      .map(override => override.key);
    return interactionOptions
      .filter((it: string) => !existingInteractionOverrides.includes(it))
      .map((it: string) => ({ value: it, label: it.charAt(0).toUpperCase() + it.slice(1) }));
  };

  const getPlaceholder = (type: 'locale' | 'breakpoint' | 'interaction') => {
    if (type === 'locale') return 'Select Locale';
    if (type === 'breakpoint') return 'Select Breakpoint';
    return 'Select Interaction State';
  };

  // Set initial selected value only when override type changes
  useEffect(() => {
    const opts = getOptions(overrideType);
    setSelectedValue(opts && opts.length > 0 ? opts[0].value : '');
  }, [overrideType, overrides]);

  const handleShowModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setError('');
  }, []);

  // Notify parent when modal open state changes
  useEffect(() => {
    if (typeof onModalOpenChange === 'function') {
      onModalOpenChange(isModalOpen);
    }
  }, [isModalOpen, onModalOpenChange]);

  const handleOverrideTypeChange = (newType: 'locale' | 'breakpoint' | 'interaction') => {
    setOverrideType(newType);
    setError(''); // Clear any previous errors
    const opts = getOptions(newType);
    setSelectedValue(opts && opts.length > 0 ? opts[0].value : '');
  };

  const handleCreateOverride = async () => {
    if (!selectedValue) return;

    setError('');

    try {
      console.log('Creating override:', { overrideType, selectedValue, interactionEasing, interactionDurationMs });
      
      // Call the createOverride mutation with the correct context
      if (overrideType === 'locale') {
        await mutations.createOverride({ locale: selectedValue });
      } else if (overrideType === 'breakpoint') {
        await mutations.createOverride({ breakpoint: selectedValue });
      } else if (overrideType === 'interaction') {
        console.log('Creating interaction override with context:', { 
          interaction: selectedValue,
          transition: { 
            easing: interactionEasing, 
            durationMs: Number(interactionDurationMs) || 0,
            waitDurationMs: Number(interactionWaitDurationMs) || 0
          }
        });
        await mutations.createOverride({ 
          interaction: selectedValue,
          transition: { 
            easing: interactionEasing, 
            durationMs: Number(interactionDurationMs) || 0,
            waitDurationMs: Number(interactionWaitDurationMs) || 0
          }
        });
      }

      // Success - close the modal
      handleCloseModal();
    } catch (err) {
      console.error('Failed to create override:', err);
      setError('Failed to create override. Please try again.');
    }
  };

  // Check if there are any available options for the current override type
  const availableOptions = getOptions(overrideType);
  const hasAvailableOptions = availableOptions.length > 0;

  return (
    <>
      {/* Plus Icon Button */}
      <div 
        className={`absolute left-0 right-0 transition-opacity duration-200 z-10 ${className} ${
          isModalOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{
          bottom: customPositioning?.bottom || '0px',
          top: customPositioning?.top,
          left: customPositioning?.left,
          right: customPositioning?.right,
        }}
      >
        <div className="w-full h-px bg-gray-200/60 relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-2.5">
            <button
              className="bg-white w-5 h-5 border border-gray-300 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleShowModal();
              }}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs text-gray-900">
              Create Override for:{" "}
              <b>{fieldLabel}</b>
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Override Type Switch */}
            <SegmentedSwitch
              className="mx-auto"
              labels={getSwitchConfig().labels as unknown as string[]}
              values={getSwitchConfig().values as unknown as string[]}
              value={overrideType}
              onChange={(v) => handleOverrideTypeChange(v as 'locale' | 'breakpoint' | 'interaction')}
            />

            {/* Dynamic Dropdown */}
            <div className="space-y-2">
              {overrideType === 'interaction' && (
                <label className="block text-xs text-gray-600 mb-1">Interaction state</label>
              )}
              {hasAvailableOptions ? (
                <Select
                  value={selectedValue}
                  onChange={(v: string) => setSelectedValue(v)}
                  options={availableOptions}
                  placeholder={getPlaceholder(overrideType)}
                />
              ) : (
                <div className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                  All {overrideType} overrides already exist
                </div>
              )}
            </div>

            {/* Interaction transition fields */}
            {overrideType === 'interaction' && (
              <div className="space-y-4">
                {/* Easing field - full width */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Easing</label>
                  <Select
                    value={interactionEasing}
                    onChange={(v: string) => setInteractionEasing(v)}
                    options={[
                      { value: 'ease', label: 'ease' },
                      { value: 'linear', label: 'linear' },
                      { value: 'ease-in', label: 'ease-in' },
                      { value: 'ease-out', label: 'ease-out' },
                      { value: 'ease-in-out', label: 'ease-in-out' },
                    ]}
                    placeholder="Select easing"
                  />
                </div>
                
                {/* Duration fields - side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Duration (ms)</label>
                    <input
                      type="number"
                      min={0}
                      step={(Number(interactionDurationMs) || 0) < 100 ? 25 : 50}
                      value={interactionDurationMs}
                      onChange={(e) => setInteractionDurationMs(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 75"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Wait Duration (ms)</label>
                    <input
                      type="number"
                      min={0}
                      step={(Number(interactionWaitDurationMs) || 0) < 100 ? 25 : 50}
                      value={interactionWaitDurationMs}
                      onChange={(e) => setInteractionWaitDurationMs(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., 0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCloseModal}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOverride}
                disabled={!hasAvailableOptions || !selectedValue}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  hasAvailableOptions && selectedValue
                    ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};