import React, { useMemo, useState } from 'react';
import { UnifiedNumberField, UnifiedSelectField, UnifiedColorField } from '../../utils/defaults/unifiedFields';
import { SegmentedSwitch } from '../../ControlsUI/Switch';
import { Scan, SquareDashed } from 'lucide-react';

const BORDER_STYLE_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
];

const BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'];

interface BorderComponentProps {
    label?: string;
    
    // Border data
    border?: string;
    borderTop?: string;
    borderRight?: string;
    borderBottom?: string;
    borderLeft?: string;
    borderRadius?: string;
    borderTopLeftRadius?: string;
    borderTopRightRadius?: string;
    borderBottomRightRadius?: string;
    borderBottomLeftRadius?: string;
    
    // Mutations
    setBorder?: (cssBorder: string | { top?: string; right?: string; bottom?: string; left?: string }) => void;
    setBorderRadius?: (css: string | { topLeft?: string; topRight?: string; bottomRight?: string; bottomLeft?: string }) => void;
    
    // Library props
    library?: any;
    libraryData?: any;
}

export const BorderComponent: React.FC<BorderComponentProps> = ({
    label = 'Border',
    border,
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    borderRadius,
    borderTopLeftRadius: brTL,
    borderTopRightRadius: brTR,
    borderBottomRightRadius: brBR,
    borderBottomLeftRadius: brBL,
    setBorder,
    setBorderRadius,
    library,
    libraryData
}) => {
    const [activeBorderSide, setActiveBorderSide] = useState(0);

    const getActiveSide = () => {
        // id -> CSS side mapping based on icon rotations in the grid
        // 0: top (base icon), 1: left (-90deg), 3: right (90deg), 4: bottom (180deg), 2: center (unified)
        if (activeBorderSide === 0) return 'top' as const;
        if (activeBorderSide === 1) return 'left' as const;
        if (activeBorderSide === 3) return 'right' as const;
        if (activeBorderSide === 4) return 'bottom' as const;
        return 'all' as const; // center (unified)
    };

    const parseBorder = (css?: string) => {
        if (!css || typeof css !== 'string') return null;
        const parts = css.trim().split(/\s+/);
        let widthPx: number | undefined;
        let style: string | undefined;
        let color: string | undefined;
        for (const p of parts) {
            if (p.endsWith('px') && !widthPx) {
                const n = parseFloat(p);
                if (!isNaN(n)) widthPx = n;
                continue;
            }
            if (BORDER_STYLES.includes(p) && !style) {
                style = p;
                continue;
            }
        }
        // color is whatever remains after removing detected width/style
        const filtered = parts.filter(p => !(p.endsWith('px') && p === `${widthPx}px`) && p !== style);
        if (filtered.length > 0) color = filtered.join(' ');
        return { width: widthPx ?? (style === 'none' ? 0 : 1), style: style || 'solid', color: color || '#000000' };
    };

    // Radius utilities working with CSS strings
    const parseRadius = (css?: string) => {
        if (!css || typeof css !== 'string') return null as null | { value: number; unit: 'px' | '%' };
        const m = css.trim().match(/^(-?\d*\.?\d+)(px|%)$/);
        if (!m) return null;
        const value = parseFloat(m[1]);
        const unit = (m[2] as 'px' | '%');
        if (isNaN(value)) return null;
        return { value, unit };
    };

    const hasAnyCornerRadius = useMemo(() => !!(brTL || brTR || brBR || brBL), [brTL, brTR, brBR, brBL]);

    // Radius unified vs corners (derive from presence and equality of corner CSS values)
    const isRadiusUnified = useMemo(() => {
        if (!hasAnyCornerRadius) return true; // shorthand implies unified conceptually
        const tl = parseRadius(brTL) || parseRadius(borderRadius);
        const tr = parseRadius(brTR) || parseRadius(borderRadius);
        const br = parseRadius(brBR) || parseRadius(borderRadius);
        const bl = parseRadius(brBL) || parseRadius(borderRadius);
        if (!tl || !tr || !br || !bl) return false;
        const sameValue = tl.value === tr.value && tl.value === br.value && tl.value === bl.value;
        const sameUnit = tl.unit === tr.unit && tl.unit === br.unit && tl.unit === bl.unit;
        return sameValue && sameUnit;
    }, [hasAnyCornerRadius, brTL, brTR, brBR, brBL, borderRadius]);

    // Keep user's toggle stable; initialize based on data only once
    const [advancedRadius, setAdvancedRadius] = useState<boolean>(() => hasAnyCornerRadius && !isRadiusUnified);

    const buildCornersBaseline = () => {
        const tl = parseRadius(brTL) || parseRadius(borderRadius) || { value: 0, unit: 'px' as const };
        const tr = parseRadius(brTR) || parseRadius(borderRadius) || { value: 0, unit: 'px' as const };
        const brv = parseRadius(brBR) || parseRadius(borderRadius) || { value: 0, unit: 'px' as const };
        const bl = parseRadius(brBL) || parseRadius(borderRadius) || { value: 0, unit: 'px' as const };
        return {
            topLeft: tl,
            topRight: tr,
            bottomRight: brv,
            bottomLeft: bl,
        } as { topLeft: { value: number; unit: 'px' | '%' }; topRight: { value: number; unit: 'px' | '%' }; bottomRight: { value: number; unit: 'px' | '%' }; bottomLeft: { value: number; unit: 'px' | '%' } };
    };

    // Equality utilities
    const unifiedEq = useMemo(() => {
        // If per-side CSS exists, compare those
        if (borderTop || borderRight || borderBottom || borderLeft) {
            const t = parseBorder(borderTop) || parseBorder(border);
            const r = parseBorder(borderRight) || parseBorder(border);
            const b = parseBorder(borderBottom) || parseBorder(border);
            const l = parseBorder(borderLeft) || parseBorder(border);
            const width = [t?.width, r?.width, b?.width, l?.width] as number[];
            const style = [t?.style, r?.style, b?.style, l?.style] as string[];
            const color = [t?.color?.toLowerCase(), r?.color?.toLowerCase(), b?.color?.toLowerCase(), l?.color?.toLowerCase()] as string[];
            return {
                width: width.every(v => v === width[0]),
                style: style.every(v => v === style[0]),
                color: color.every(v => v === color[0]),
            };
        }
        // If only shorthand, it's unified by definition
        if (typeof border === 'string') return { width: true, style: true, color: true };
        // Fallback
        return { width: true, style: true, color: true };
    }, [border, borderTop, borderRight, borderBottom, borderLeft]);

    const getUnifiedBorder = () => {
        // Prefer per-side if they exist and equal; else shorthand; else defaults
        if (borderTop || borderRight || borderBottom || borderLeft) {
            const t = parseBorder(borderTop) || parseBorder(border);
            return t || { width: 1, style: 'solid', color: '#000000' };
        }
        if (typeof border === 'string') {
            return parseBorder(border) || { width: 1, style: 'solid', color: '#000000' };
        }
        return { width: 1, style: 'solid', color: '#000000' };
    };

    const setUnifiedBorder = (changes: Partial<{ width: number; style: string; color: string }>) => {
        const curr = getUnifiedBorder();
        const next = { ...curr, ...changes };
        const css = `${next.width}px ${next.style} ${next.color}`;
        // When detailed overrides exist, replace shorthand with per-side values to avoid conflicts
        if (borderTop || borderRight || borderBottom || borderLeft) {
            setBorder?.({
                top: css,
                right: css,
                bottom: css,
                left: css,
            });
        } else {
            setBorder?.(css);
        }
    };

    const setSide = (side: 'top' | 'right' | 'bottom' | 'left', changes: Partial<{ width: number; style: string; color: string }>) => {
        // Parse the current value for this side (or fall back to shorthand), then update only this side
        const sideCss = side === 'top' ? borderTop : side === 'right' ? borderRight : side === 'bottom' ? borderBottom : borderLeft;
        const base = getUnifiedBorder();
        const current = parseBorder(sideCss || (typeof border === 'string' ? border : undefined)) || base;
        const nextSide = { ...current, ...changes };
        const css = `${nextSide.width}px ${nextSide.style} ${nextSide.color}`;
        setBorder?.({ [side]: css });
    };

    const setUnifiedRadius = (radius: number, unit: 'px' | '%') => {
        const css = `${radius}${unit}`;
        setBorderRadius?.(css);
    };

    const setCornerRadius = (corner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft', value: number, unit: 'px' | '%') => {
        // Preserve other corners' units and values; update only the targeted one
        const baseline = buildCornersBaseline();
        const next = { ...baseline } as any;
        next[corner] = { value, unit };
        const css = {
            topLeft: `${next.topLeft.value}${next.topLeft.unit}`,
            topRight: `${next.topRight.value}${next.topRight.unit}`,
            bottomRight: `${next.bottomRight.value}${next.bottomRight.unit}`,
            bottomLeft: `${next.bottomLeft.value}${next.bottomLeft.unit}`,
        };
        setBorderRadius?.(css);
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">{label}</h3>
                <div />
            </div>
            
            <div className="space-y-2">
                <div className="flex items-start gap-3">
                    {/* Left: sides controller grid (UI only for now) */}
                    <div className="flex flex-wrap w-24 justify-center gap-2">
                        {[
                            null, 0, null,
                            1, 2, 3,
                            null, 4, null,
                        ].map((id, idx) =>
                            id === null ? (
                                <div key={idx} className="p-1">
                                    <div className="w-4 h-4" />
                                </div>
                            ) : (
                                <div
                                    key={idx}
                                    className={`p-1 rounded-md ${activeBorderSide === id ? 'bg-gray-200' : 'hover:bg-gray-100'} cursor-pointer`}
                                    onClick={() => setActiveBorderSide(id)}
                                    aria-label={`Border segment ${id}`}
                                >
                                    <div
                                        className="w-4 h-4 rounded-sm flex items-center justify-center"
                                        aria-label={`Border segment ${id}`}
                                    >
                                        {id === 2 ? (
                                            <div className="w-4 h-4 border border-gray-700 rounded-md" />
                                        ) : (
                                            <SquareDashed className="w-4 h-4" style={{ transform: `rotate(${id === 1 ? -90 : id === 3 ? 90 : id === 4 ? 180 : 0}deg)` }} />
                                        )}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {/* Right: column with width, style, color */}
                    <div className="flex-1 flex flex-col gap-2">
                        {(() => {
                            const active = getActiveSide();
                            const getSideParsed = (side: 'top' | 'right' | 'bottom' | 'left') => {
                                const sideCss = side === 'top' ? borderTop : side === 'right' ? borderRight : side === 'bottom' ? borderBottom : borderLeft;
                                return parseBorder(sideCss || (typeof border === 'string' ? border : undefined)) || getUnifiedBorder();
                            };
                            const current = active === 'all' ? getUnifiedBorder() : getSideParsed(active);
                            const handleChange = (changes: Partial<{ width: number; style: string; color: string }>) => {
                                if (active === 'all') setUnifiedBorder(changes); else setSide(active, changes);
                            };
                            return (
                                <>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-700 w-16 flex-shrink-0">Width</label>
                                        <div className="flex-1 min-w-0">
                                            <UnifiedNumberField value={active === 'all' ? (unifiedEq.width ? current.width : '' as any) : current.width} onChange={(v: any) => handleChange({ width: v })} config={{ min: 0, max: 64, step: 1, showSlider: true, unit: "px" }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-700 w-16 flex-shrink-0">Color</label>
                                        <div className="flex-1">
                                            <UnifiedColorField value={active === 'all' ? (unifiedEq.color ? current.color : '#000000') : current.color} onChange={(v: any) => handleChange({ color: v })} config={{}} library={library} libraryData={libraryData} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-700 w-16 flex-shrink-0">Style</label>
                                        <div className="w-32">
                                            <UnifiedSelectField value={active === 'all' ? (unifiedEq.style ? current.style : '' as any) : current.style} onChange={(v: any) => handleChange({ style: v })} config={{ options: BORDER_STYLE_OPTIONS }} library={library} libraryData={libraryData} />
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Radius */}
            <div className="flex items-center pt-2">
                <h4 className="text-xs font-medium text-gray-700 mr-2">Radius</h4>
                <div className="flex items-center gap-1 mr-2">
                    <button
                        type="button"
                        onClick={() => setAdvancedRadius(!advancedRadius)}
                        className={`group p-1 rounded transition-colors ${!advancedRadius ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        title="Unified radius"
                        aria-expanded={!advancedRadius}
                    >
                        <div className={`w-4 h-4 border rounded-md transition-colors ${!advancedRadius ? 'border-gray-800' : 'border-gray-600 group-hover:border-gray-800'}`}></div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdvancedRadius(!advancedRadius)}
                        className={`group p-1 rounded transition-colors ${advancedRadius ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                        title="Per-corner radius"
                        aria-expanded={advancedRadius}
                    >
                        <Scan className={`transition-colors ${advancedRadius ? 'text-gray-800' : 'text-gray-600 group-hover:text-gray-800'}`} size={16} />
                    </button>
                </div>
                {!advancedRadius && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-[140px]">
                            {(() => {
                                const unified = parseRadius(borderRadius) || parseRadius(brTL) || parseRadius(brTR) || parseRadius(brBR) || parseRadius(brBL) || { value: 0, unit: 'px' as const };
                                return (
                                    <UnifiedNumberField 
                                        value={isRadiusUnified ? unified.value : '' as any} 
                                        onChange={(v: any) => setUnifiedRadius(v, unified.unit)} 
                                        config={{ 
                                            min: 0, max: 256, step: 1, showSlider: true, 
                                            unit: unified.unit === 'px' ? 'PX' : unified.unit,
                                            unitOptions: ['PX','%'],
                                            onUnitChange: (u: string) => setUnifiedRadius((isRadiusUnified ? unified.value : 0), u === 'PX' ? 'px' : u as any),
                                            className: 'w-full'
                                        }} 
                                    />
                                );
                            })()}
                        </div>
                        
                    </div>
                )}
            </div>
            {advancedRadius && (
                <div className="space-y-2 ml-auto max-w-[80%]">
                    {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((corner) => {
                        const cornerCss = corner === 'topLeft' ? brTL : corner === 'topRight' ? brTR : corner === 'bottomRight' ? brBR : brBL;
                        const base = parseRadius(cornerCss) || parseRadius(borderRadius) || { value: 0, unit: 'px' as const };
                        const displayValue = base.value;
                        const unit = base.unit;
                        return (
                            <div key={corner} className="flex items-center gap-2 min-w-0">
                                <label className="text-xs font-medium text-gray-700 w-24 flex-shrink-0">
                                    {corner.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </label>
                                <div className="flex-1 min-w-[140px]">
                                    <UnifiedNumberField 
                                        value={displayValue} 
                                        onChange={(v: any) => setCornerRadius(corner, v, unit as any)} 
                                        config={{ 
                                            min: 0, max: 256, step: 1, showSlider: true, 
                                            unit: unit === 'px' ? 'PX' : unit,
                                            unitOptions: ['PX','%'],
                                            onUnitChange: (u: string) => setCornerRadius(corner, displayValue, u === 'PX' ? 'px' : u as any),
                                            className: 'w-full'
                                        }} 
                                    />
                                </div>
                                <div className="w-0" />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
