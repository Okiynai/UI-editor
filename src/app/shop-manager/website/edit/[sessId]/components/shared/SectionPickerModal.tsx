import React, { useEffect, useMemo, useState } from 'react';
import { prebuiltSections } from '@/prebuilt-sections';
import { Node, SiteSettings } from '@/OSDL.types';
import NodeRenderer from '@/osdl/NodeRenderer';
import { SiteSettingsProvider } from '@/osdl/contexts/SiteSettingsContext';
import { LocaleProvider } from '@/osdl/contexts/LocaleContext';
import { BreakpointProvider } from '@/osdl/contexts/BreakpointContext';
import { UIStateProvider } from '@/osdl/contexts/UIStateContext';
import DataContext from '@/osdl/contexts/DataContext';

type SectionPickerItem = {
    id: string;
    name: string;
    schema?: any;
};

const formatLabel = (value: string) => {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const SectionPickerModal = ({
    isOpen,
    onClose,
    onSelect,
    siteSettings,
    anchorRect,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (sectionId: string, label: string) => void;
    siteSettings?: SiteSettings | null;
    anchorRect?: { top: number; left: number; width: number; height: number };
}) => {
    const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
    const [viewport, setViewport] = useState(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 1280,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    }));
    const [pickerElement, setPickerElement] = useState<HTMLDivElement | null>(null);

    const sections = useMemo<SectionPickerItem[]>(() => {
        return Object.entries(prebuiltSections).map(([key, section]: any) => {
            const meta = section?.metadata || {};
            const id = meta.id || key;
            return {
                id,
                name: formatLabel(id),
                schema: section?.schema,
            };
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            setHoveredSectionId(sections[0]?.id || null);
        }
    }, [isOpen, sections]);

    useEffect(() => {
        if (!isOpen) return;

        const syncViewport = () => {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        };

        syncViewport();
        window.addEventListener('resize', syncViewport);
        return () => window.removeEventListener('resize', syncViewport);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!pickerElement) return;
            if (!pickerElement.contains(event.target as globalThis.Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, pickerElement]);

    const activeSection = useMemo(() => {
        if (!hoveredSectionId) return null;
        return sections.find((section) => section.id === hoveredSectionId) || null;
    }, [sections, hoveredSectionId]);

    const previewSiteSettings = useMemo<SiteSettings>(() => {
        if (siteSettings) {
            return siteSettings;
        }

        return {
            schemaVersion: 'osdl_v3.1',
            name: 'Preview',
            defaultLocale: 'en-US',
            supportedLocales: ['en-US'],
            globalStyleVariables: {
                colors: {},
                fonts: {},
                spacing: {},
                breakpoints: {
                    mobile: 'max-width: 767px',
                    tablet: '(min-width: 768px) and (max-width: 1023px)',
                    desktop: 'min-width: 1024px'
                }
            },
            seo: {}
        } as SiteSettings;
    }, [siteSettings]);

    const previewDataContextValue = useMemo(() => ({
        mainPageData: null,
        isMainPageDataLoading: false,
        mainPageDataError: null,
        pageInfo: undefined,
        userInfo: undefined,
        siteInfo: undefined,
        fetchNodeRequirement: async () => ({ data: null, error: null }),
        observedNodeRequirements: {},
        getNodeRequirementState: () => undefined,
        refetchMainPageData: () => {}
    }), []);

    const renderPreview = (section: SectionPickerItem) => {
        if (!section.schema) {
            return (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>
                    Preview unavailable.
                </div>
            );
        }

        const previewNode: Node = {
            id: `preview-${section.id}`,
            name: section.name,
            order: 0,
            ...(section.schema as any)
        };

        return (
            <SiteSettingsProvider enforcedSettings={previewSiteSettings} enableDataFetching={false}>
                <LocaleProvider initialActiveLocale={previewSiteSettings.defaultLocale || 'en-US'}>
                    <BreakpointProvider>
                        <UIStateProvider>
                            <DataContext.Provider value={previewDataContextValue as any}>
                                <div style={{ pointerEvents: 'none' }}>
                                    <NodeRenderer
                                        nodeSchema={previewNode}
                                        showDevInfo={false}
                                        isInspectMode={false}
                                    />
                                </div>
                            </DataContext.Provider>
                        </UIStateProvider>
                    </BreakpointProvider>
                </LocaleProvider>
            </SiteSettingsProvider>
        );
    };

    if (!isOpen) return null;

    const margin = 12;
    const popoverGap = 12;
    const targetWidth = 560;
    const targetHeight = 500;

    const width = Math.min(targetWidth, viewport.width - margin * 2);
    const height = Math.min(targetHeight, viewport.height - margin * 2);

    let left = margin;
    let top = margin;

    if (anchorRect) {
        // Keep the picker anchored beside the trigger (prefer right side).
        const rightSideLeft = anchorRect.left + anchorRect.width + popoverGap;
        const leftSideLeft = anchorRect.left - width - popoverGap;
        const canFitRight = rightSideLeft + width <= viewport.width - margin;
        const canFitLeft = leftSideLeft >= margin;

        if (canFitRight) {
            left = rightSideLeft;
        } else if (canFitLeft) {
            left = leftSideLeft;
        } else {
            left = Math.max(margin, Math.min(rightSideLeft, viewport.width - margin - width));
        }

        // Align vertically with the trigger while keeping it in viewport.
        const maxTop = viewport.height - margin - height;
        top = Math.max(margin, Math.min(anchorRect.top - 6, maxTop));
    }

    return (
        <div className="fixed inset-0 z-[110] pointer-events-none">
            <div
                ref={setPickerElement}
                className="absolute bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden pointer-events-auto"
                style={{ left, top, width, height }}
            >
                <div className="grid grid-cols-[220px_1fr] h-full">
                    <div className="border-r border-gray-200 overflow-y-auto h-full">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onMouseEnter={() => setHoveredSectionId(section.id)}
                                onFocus={() => setHoveredSectionId(section.id)}
                                onClick={() => onSelect(section.id, section.name)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-100"
                            >
                                {section.name}
                            </button>
                        ))}
                    </div>

                    <div className="bg-gray-50/60 flex items-center justify-center overflow-hidden h-full min-h-0">
                        <div className="p-4 overflow-auto h-full w-full flex items-center justify-center">
                            {activeSection ? (
                                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-[0_10px_20px_-12px_rgba(15,23,42,0.2)] w-full max-w-[540px]">
                                    {renderPreview(activeSection)}
                                </div>
                            ) : (
                                <div className="text-[#94a3b8] text-xs">
                                    Select a section to preview
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
