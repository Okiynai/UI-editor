import React from "react";
import { RendererProps } from "../../types";
import { SegmentedSwitch } from "../../ControlsUI";
import { Plus, X } from "lucide-react";
import { OverrideCreatorWrapper, OverrideDisplay } from "../../utils/defaults/OverrideUtils";
import { UnifiedColorField, UnifiedNumberField } from "../../utils/defaults/unifiedFields";

type ShadowData = { value: string; overrides?: any[] };

type ShadowMutations = {
  update?: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string }) => void;
  createOverride?: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => void;
  removeOverride?: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => void;
};

type ShadowConfig = { label?: string };

// Multi-shadow editor UI: add (+), list chips, floating panel for editing a selected shadow
export const ShadowRenderer: React.FC<RendererProps<ShadowData, ShadowMutations, ShadowConfig>> = ({ data, mutations, config, showOverrides = false, siteSettings, interactionsInlineStyle, library, libraryData }) => {
  const value = data?.value || "";
  type Shadow = { inset: boolean; x: number; y: number; blur: number; spread: number; color: string };
  const [shadows, setShadows] = React.useState<Shadow[]>([]);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingOverrideIndex, setEditingOverrideIndex] = React.useState<number | null>(null);
  const [isHoveringCards, setIsHoveringCards] = React.useState(false);
  const chipRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const overrideChipRefs = React.useRef<Record<number, HTMLDivElement | null>>({});
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const overridePanelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const [overridePanelStyle, setOverridePanelStyle] = React.useState<React.CSSProperties>({});
  const [isCreatorModalOpen, setIsCreatorModalOpen] = React.useState(false);

  const parseShadow = (s: string): Shadow => {
    const parts = s.trim().split(/\s+/);
    let i = 0;
    let inset = false;
    if (parts[i] === 'inset') { inset = true; i++; }
    const x = parseInt(parts[i++] || '0');
    const y = parseInt(parts[i++] || '0');
    const blur = parseInt(parts[i++] || '0');
    const spreadMaybe = parts[i] ?? '0';
    const spread = /px$/.test(spreadMaybe) || /^-?\d+$/.test(spreadMaybe) ? parseInt(parts[i++] || '0') : 0;
    const color = parts.slice(i).join(' ') || 'rgba(0,0,0,0.2)';
    return { inset, x: isNaN(x) ? 0 : x, y: isNaN(y) ? 0 : y, blur: isNaN(blur) ? 0 : blur, spread: isNaN(spread) ? 0 : spread, color };
  };

  const toCss = (shadow: Shadow) => `${shadow.inset ? 'inset ' : ''}${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
  // Preview style for chips: only depend on inset + color with strong default geometry
  const toPreviewCss = (shadow: Shadow) => {
    // Stronger preview: make outset bolder and inset lean to the right
    // Match Tailwind's shadow-sm geometry: 0 1px 2px 0
    // const strongOutset = `0px 5px 26px -11px ${shadow.color}`;
    const strongOutset = `0px 1px 16px -6px ${shadow.color}`;
    const strongInset = `inset 61px 0px 20px -8px ${shadow.color}`; // push to right side inside
    return shadow.inset ? strongInset : strongOutset;
  };
  const emitAll = (list: Shadow[]) => mutations?.update?.(list.length ? list.map(toCss).join(', ') : '');

  React.useEffect(() => {
    if (!value) { setShadows([]); return; }
    // naive split on "," boundaries for prototype
    const parts = value.split(/,(?![^()]*\))/).map(p => p.trim()).filter(Boolean);
    const parsed = parts.map(parseShadow);
    setShadows(parsed);
    // Don't auto-select first shadow when parsing - preserve current selection
  }, [value]);

  const addShadow = () => {
    const next: Shadow = { inset: false, x: 0, y: 8, blur: 24, spread: -8, color: 'rgba(0,0,0,0.2)' };
    const list = [...shadows, next];
    setShadows(list);
    emitAll(list);
  };

  const updateShadow = (index: number, patch: Partial<Shadow>) => {
    const list = shadows.map((s, i) => i === index ? { ...s, ...patch } : s);
    setShadows(list);
    emitAll(list);
  };

  const removeShadow = (index: number) => {
    const list = shadows.filter((_, i) => i !== index);
    setShadows(list);
    emitAll(list);
    if (editingIndex === index) setEditingIndex(list.length ? 0 : null);
  };

  // Override shadow editing functions
  const updateOverrideShadow = (overrideIndex: number, shadowIndex: number, patch: Partial<Shadow>) => {
    if (!overrides || !overrides[overrideIndex]) return;
    
    const overrideValue = overrides[overrideIndex].value || "";
    const parts = overrideValue.split(/,(?![^()]*\))/).map((p: string) => p.trim()).filter(Boolean);
    const parsedShadows = parts.map(parseShadow);
    
    const updatedShadows = parsedShadows.map((s: Shadow, i: number) => i === shadowIndex ? { ...s, ...patch } : s);
    const newValue = updatedShadows.map(toCss).join(', ');
    
    const ctx = overrides[overrideIndex].scope === 'locale'
      ? { locale: overrides[overrideIndex].key }
      : overrides[overrideIndex].scope === 'interaction'
      ? { interaction: overrides[overrideIndex].key }
      : { breakpoint: overrides[overrideIndex].key };
    
    mutations?.update?.(newValue, ctx);
  };

  const addOverrideShadow = (overrideIndex: number) => {
    if (!overrides || !overrides[overrideIndex]) return;
    
    const overrideValue = overrides[overrideIndex].value || "";
    const parts = overrideValue.split(/,(?![^()]*\))/).map((p: string) => p.trim()).filter(Boolean);
    const parsedShadows = parts.map(parseShadow);
    
    const next: Shadow = { inset: false, x: 0, y: 8, blur: 24, spread: -8, color: 'rgba(0,0,0,0.2)' };
    const updatedShadows = [...parsedShadows, next];
    const newValue = updatedShadows.map(toCss).join(', ');
    
    const ctx = overrides[overrideIndex].scope === 'locale'
      ? { locale: overrides[overrideIndex].key }
      : overrides[overrideIndex].scope === 'interaction'
      ? { interaction: overrides[overrideIndex].key }
      : { breakpoint: overrides[overrideIndex].key };
    
    mutations?.update?.(newValue, ctx);
  };

  const removeOverrideShadow = (overrideIndex: number, shadowIndex: number) => {
    if (!overrides || !overrides[overrideIndex]) return;
    
    const overrideValue = overrides[overrideIndex].value || "";
    const parts = overrideValue.split(/,(?![^()]*\))/).map((p: string) => p.trim()).filter(Boolean);
    const parsedShadows = parts.map(parseShadow);
    
    const updatedShadows = parsedShadows.filter((_: Shadow, i: number) => i !== shadowIndex);
    const newValue = updatedShadows.map(toCss).join(', ');
    
    const ctx = overrides[overrideIndex].scope === 'locale'
      ? { locale: overrides[overrideIndex].key }
      : overrides[overrideIndex].scope === 'interaction'
      ? { interaction: overrides[overrideIndex].key }
      : { breakpoint: overrides[overrideIndex].key };
    
    mutations?.update?.(newValue, ctx);
  };

  const label = config?.label || "Shadow";
  const active = editingIndex != null ? shadows[editingIndex] : null;

  // Position floating panel using fixed coordinates relative to chip rect
  const updatePanelPosition = React.useCallback(() => {
    if (editingIndex == null) return;
    const chipEl = chipRefs.current[editingIndex];
    if (!chipEl) return;
    const rect = chipEl.getBoundingClientRect();
    const panelWidth = 320; // w-80
    const margin = 8;
    // Prefer above; if not enough space, place below
    const estimatedHeight = 260; // rough
    let top = rect.top - margin;
    let translateY = '-100%';
    if (top - estimatedHeight < 0) {
      top = rect.bottom + margin;
      translateY = '0%';
    }
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
    setPanelStyle({ position: 'fixed', top, left, transform: `translateY(${translateY})` });
  }, [editingIndex]);

  // Position override floating panel using fixed coordinates relative to override chip rect
  const updateOverridePanelPosition = React.useCallback(() => {
    if (editingOverrideIndex == null) return;
    const chipEl = overrideChipRefs.current[editingOverrideIndex];
    if (!chipEl) return;
    const rect = chipEl.getBoundingClientRect();
    const panelWidth = 320; // w-80
    const margin = 8;
    // Prefer above; if not enough space, place below
    const estimatedHeight = 260; // rough
    let top = rect.top - margin;
    let translateY = '-100%';
    if (top - estimatedHeight < 0) {
      top = rect.bottom + margin;
      translateY = '0%';
    }
    let left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
    setOverridePanelStyle({ position: 'fixed', top, left, transform: `translateY(${translateY})` });
  }, [editingOverrideIndex]);

  React.useEffect(() => { updatePanelPosition(); }, [editingIndex, shadows, updatePanelPosition]);
  React.useEffect(() => { updateOverridePanelPosition(); }, [editingOverrideIndex, updateOverridePanelPosition]);
  
  React.useEffect(() => {
    if (editingIndex == null) return;
    const onScroll = () => updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    // Outside click to close
    const handleOutside = (e: MouseEvent) => {
      const panel = panelRef.current;
      const chipEl = chipRefs.current[editingIndex!];
      if (!panel) return;
      const target = e.target as Node;
      if (panel.contains(target) || (chipEl && chipEl.contains(target))) return;
      setEditingIndex(null);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [editingIndex, updatePanelPosition]);

  React.useEffect(() => {
    if (editingOverrideIndex == null) return;
    const onScroll = () => updateOverridePanelPosition();
    const onResize = () => updateOverridePanelPosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    // Outside click to close
    const handleOutside = (e: MouseEvent) => {
      const panel = overridePanelRef.current;
      const chipEl = overrideChipRefs.current[editingOverrideIndex!];
      if (!panel) return;
      const target = e.target as Node;
      if (panel.contains(target) || (chipEl && chipEl.contains(target))) return;
      setEditingOverrideIndex(null);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [editingOverrideIndex, updateOverridePanelPosition]);

  const { overrides } = data;

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button className="p-1 rounded-md hover:bg-gray-100" onClick={addShadow} title="Add shadow">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Shadow list */}
      <div 
        className="relative"
        onMouseEnter={() => setIsHoveringCards(true)}
        onMouseLeave={() => setIsHoveringCards(false)}
      >
        <div className="flex flex-wrap gap-3">
          {shadows.map((s, i) => (
            <div key={i} className="relative inline-block flex-none group" ref={(el) => { chipRefs.current[i] = el; }}>
              <div className="rounded-md border border-gray-100 p-0.5">
                <div
                  className={`relative px-4 py-3 rounded-md bg-white hover:bg-gray-50 text-left overflow-visible cursor-pointer border border-gray-100 w-44`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditingIndex(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingIndex(i); } }}
                  title={toCss(s)}
                >
                  {/* Dedicated preview layer so shadow can overflow around card */}
                  <div className="pointer-events-none absolute inset-0 rounded-md" style={{ boxShadow: toPreviewCss(s) }} />
                  <div className="relative text-[10px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap w-full">{toCss(s)}</div>
                  <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition">
                    <button className="h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); removeShadow(i); }}>
                      <X className="h-3 w-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating editor anchored to this chip */}
              {editingIndex === i && (
                <div ref={panelRef} style={panelStyle} className="w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-3 space-y-2 z-50">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-800">Shadow</div>
                    <button className="h-6 w-6 rounded-md hover:bg-gray-100 flex items-center justify-center" onClick={() => setEditingIndex(null)}>
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center">
                    <SegmentedSwitch className="w-64" labels={["Outset", "Inset"]} values={[0, 1]} value={s.inset ? 1 : 0} onChange={(v) => updateShadow(i, { inset: Number(v) === 1 })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">X</label>
                      <UnifiedNumberField value={s.x} onChange={(nx) => updateShadow(i, { x: nx })} config={{ min: -200, max: 200, step: 1 }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Y</label>
                      <UnifiedNumberField value={s.y} onChange={(ny) => updateShadow(i, { y: ny })} config={{ min: -200, max: 200, step: 1 }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Blur</label>
                      <UnifiedNumberField value={s.blur} onChange={(nb) => updateShadow(i, { blur: nb })} config={{ min: 0, max: 300, step: 1 }} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Spread</label>
                      <UnifiedNumberField value={s.spread} onChange={(ns) => updateShadow(i, { spread: ns })} config={{ min: -200, max: 200, step: 1 }} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Color</label>
                    <UnifiedColorField value={s.color} onChange={(c) => updateShadow(i, { color: c })} config={{}} library={library} libraryData={libraryData} />
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Override Display */}
        {overrides && (
          <OverrideDisplay
            overrides={overrides}
            mutations={mutations}
            initOverrideState={showOverrides ?? false}
          >
            {(override) => {
              // Parse the override value to show shadow cards
              const overrideValue = override.value || "";
              if (!overrideValue) return null;

              const parts = overrideValue.split(/,(?![^()]*\))/).map((p: string) => p.trim()).filter(Boolean);
              const parsedShadows = parts.map(parseShadow);

              // Find the override index
              const overrideIndex = overrides?.findIndex(o => o === override) ?? 0;

              return (
                <div className="space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Override Shadow</label>
                    <button className="p-1 rounded-md hover:bg-gray-100" onClick={() => addOverrideShadow(overrideIndex)} title="Add shadow">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Override Shadow list */}
                  <div className="flex flex-wrap gap-3">
                    {parsedShadows.map((s: Shadow, i: number) => (
                      <div key={i} className="relative inline-block flex-none group" ref={(el) => { overrideChipRefs.current[i] = el; }}>
                        <div className="rounded-md border border-gray-100 p-0.5">
                          <div
                            className="relative px-4 py-3 rounded-md bg-white hover:bg-gray-50 text-left overflow-visible cursor-pointer border border-gray-100 w-44"
                            role="button"
                            tabIndex={0}
                            onClick={() => setEditingOverrideIndex(i)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingOverrideIndex(i); } }}
                            title={toCss(s)}
                          >
                            {/* Dedicated preview layer so shadow can overflow around card */}
                            <div className="pointer-events-none absolute inset-0 rounded-md" style={{ boxShadow: toPreviewCss(s) }} />
                            <div className="relative text-[10px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap w-full">{toCss(s)}</div>
                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition">
                              <button className="h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); removeOverrideShadow(overrideIndex, i); }}>
                                <X className="h-3 w-3 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Floating editor for override shadow */}
                        {editingOverrideIndex === i && (
                          <div ref={overridePanelRef} style={overridePanelStyle} className="w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-3 space-y-2 z-50">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-medium text-gray-800">Override Shadow</div>
                              <button className="h-6 w-6 rounded-md hover:bg-gray-100 flex items-center justify-center" onClick={() => setEditingOverrideIndex(null)}>
                                <X className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>

                            <div className="flex items-center justify-center">
                              <SegmentedSwitch className="w-64" labels={["Outset", "Inset"]} values={[0, 1]} value={s.inset ? 1 : 0} onChange={(v) => updateOverrideShadow(overrideIndex, i, { inset: Number(v) === 1 })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">X</label>
                                <UnifiedNumberField value={s.x} onChange={(nx) => updateOverrideShadow(overrideIndex, i, { x: nx })} config={{ min: -200, max: 200, step: 1 }} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Y</label>
                                <UnifiedNumberField value={s.y} onChange={(ny) => updateOverrideShadow(overrideIndex, i, { y: ny })} config={{ min: -200, max: 200, step: 1 }} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Blur</label>
                                <UnifiedNumberField value={s.blur} onChange={(nb) => updateOverrideShadow(overrideIndex, i, { blur: nb })} config={{ min: 0, max: 300, step: 1 }} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Spread</label>
                                <UnifiedNumberField value={s.spread} onChange={(ns) => updateOverrideShadow(overrideIndex, i, { spread: ns })} config={{ min: -200, max: 200, step: 1 }} />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Color</label>
                              <UnifiedColorField value={s.color} onChange={(c) => updateOverrideShadow(overrideIndex, i, { color: c })} config={{}} library={library} libraryData={libraryData} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }}
          </OverrideDisplay>
        )}

        {/* Override Creator - positioned relative to shadow cards container */}
        <div className={`absolute bottom-0 left-0 z-[50] right-0 transition-opacity duration-200 ${
          (isHoveringCards || isCreatorModalOpen) ? 'opacity-100' : 'opacity-0'
        }`}>
          <OverrideCreatorWrapper
            fieldLabel={label}
            interactionsInlineStyle={interactionsInlineStyle}
            mutations={mutations}
            siteSettings={siteSettings}
            overrides={overrides}
            className="opacity-100"
            onModalOpenChange={(open) => setIsCreatorModalOpen(open)}
          />
        </div>
      </div>

     
    </div>
  );
};

export default ShadowRenderer;


