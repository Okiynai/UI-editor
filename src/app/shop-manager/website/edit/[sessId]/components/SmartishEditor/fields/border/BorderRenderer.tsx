import React from 'react';
import { RendererProps } from '../../types';
import { BorderComponent } from './BorderComponent';
import { OverrideCreatorWrapper, OverrideDisplay } from '../../utils/defaults/OverrideUtils';

type BorderData = {
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
    overrides?: any[];
};

type BorderMutations = {
    setBorder?: (cssBorder: string | { top?: string; right?: string; bottom?: string; left?: string }) => void;
    setBorderRadius?: (css: string | { topLeft?: string; topRight?: string; bottomRight?: string; bottomLeft?: string }) => void;
    update?: (value: any, ctx?: { breakpoint?: string; locale?: string; interaction?: string }) => void;
    createOverride?: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => void;
    removeOverride?: (ctx: { breakpoint?: string; locale?: string; interaction?: string }) => void;
};

type BorderConfig = { label?: string };

export const BorderRenderer: React.FC<RendererProps<BorderData, BorderMutations, BorderConfig>> = ({ 
    data, 
    mutations, 
    config, 
    library, 
    libraryData, 
    showOverrides = false, 
    siteSettings, 
    interactionsInlineStyle 
}) => {
    const label = config?.label || 'Border';
    const { overrides } = data;
    const [isHoveringCards, setIsHoveringCards] = React.useState(false);

    // Helper functions for override handling
    const updateOverride = (overrideIndex: number, borderData: any) => {
        if (!overrides || !overrides[overrideIndex]) return;
        
        const ctx = overrides[overrideIndex].scope === 'locale'
            ? { locale: overrides[overrideIndex].key }
            : overrides[overrideIndex].scope === 'interaction'
            ? { interaction: overrides[overrideIndex].key }
            : { breakpoint: overrides[overrideIndex].key };
        
        // Pass the entire border data object to avoid mixing shorthand/longhand
        mutations?.update?.(borderData, ctx);
    };

    return (
        <div 
            className="space-y-2 relative"
            onMouseEnter={() => setIsHoveringCards(true)}
            onMouseLeave={() => setIsHoveringCards(false)}
        >
            {/* Main Border Component */}
            <div className="relative">
                <BorderComponent
                    label={label}
                    border={data?.border}
                    borderTop={data?.borderTop}
                    borderRight={data?.borderRight}
                    borderBottom={data?.borderBottom}
                    borderLeft={data?.borderLeft}
                    borderRadius={data?.borderRadius}
                    borderTopLeftRadius={data?.borderTopLeftRadius}
                    borderTopRightRadius={data?.borderTopRightRadius}
                    borderBottomRightRadius={data?.borderBottomRightRadius}
                    borderBottomLeftRadius={data?.borderBottomLeftRadius}
                    setBorder={mutations?.setBorder}
                    setBorderRadius={mutations?.setBorderRadius}
                    library={library}
                    libraryData={libraryData}
                />
            </div>

            {/* Override Display */}
            {overrides && (
                <OverrideDisplay
                    overrides={overrides}
                    mutations={mutations}
                    initOverrideState={showOverrides ?? false}
                >
                    {(override) => {
                        // Find the override index
                        const overrideIndex = overrides?.findIndex(o => o === override) ?? 0;
                        
                        // Create override-specific mutations that update the specific override
                        const overrideMutations = {
                            setBorder: (value: any) => {
                                // Get current override values to maintain other border properties
                                const currentOverride = override.value || {};
                                let updateData: any = { ...currentOverride };
                                
                                if (typeof value === 'string') {
                                    // Setting unified border - clear individual sides to avoid conflicts
                                    updateData.border = value;
                                    updateData.borderTop = undefined;
                                    updateData.borderRight = undefined;
                                    updateData.borderBottom = undefined;
                                    updateData.borderLeft = undefined;
                                } else {
                                    // Setting individual sides - clear unified border
                                    updateData.border = undefined;
                                    if (value.top !== undefined) updateData.borderTop = value.top;
                                    if (value.right !== undefined) updateData.borderRight = value.right;
                                    if (value.bottom !== undefined) updateData.borderBottom = value.bottom;
                                    if (value.left !== undefined) updateData.borderLeft = value.left;
                                }
                                
                                updateOverride(overrideIndex, updateData);
                            },
                            setBorderRadius: (value: any) => {
                                // Get current override values to maintain other border properties
                                const currentOverride = override.value || {};
                                let updateData: any = { ...currentOverride };
                                
                                if (typeof value === 'string') {
                                    // Setting unified radius - clear individual corners
                                    updateData.borderRadius = value;
                                    updateData.borderTopLeftRadius = undefined;
                                    updateData.borderTopRightRadius = undefined;
                                    updateData.borderBottomRightRadius = undefined;
                                    updateData.borderBottomLeftRadius = undefined;
                                } else {
                                    // Setting individual corners - clear unified radius
                                    updateData.borderRadius = undefined;
                                    if (value.topLeft !== undefined) updateData.borderTopLeftRadius = value.topLeft;
                                    if (value.topRight !== undefined) updateData.borderTopRightRadius = value.topRight;
                                    if (value.bottomRight !== undefined) updateData.borderBottomRightRadius = value.bottomRight;
                                    if (value.bottomLeft !== undefined) updateData.borderBottomLeftRadius = value.bottomLeft;
                                }
                                
                                updateOverride(overrideIndex, updateData);
                            },
                        };
                        
                        return (
                            <BorderComponent
                                label={label}
                                border={override.value?.border}
                                borderTop={override.value?.borderTop}
                                borderRight={override.value?.borderRight}
                                borderBottom={override.value?.borderBottom}
                                borderLeft={override.value?.borderLeft}
                                borderRadius={override.value?.borderRadius}
                                borderTopLeftRadius={override.value?.borderTopLeftRadius}
                                borderTopRightRadius={override.value?.borderTopRightRadius}
                                borderBottomRightRadius={override.value?.borderBottomRightRadius}
                                borderBottomLeftRadius={override.value?.borderBottomLeftRadius}
                                setBorder={overrideMutations.setBorder}
                                setBorderRadius={overrideMutations.setBorderRadius}
                                library={library}
                                libraryData={libraryData}
                            />
                        );
                    }}
                </OverrideDisplay>
            )}

            {/* Override Creator - positioned after override display */}
            <div className={`relative transition-opacity duration-200 z-10 ${
                isHoveringCards ? 'opacity-100' : 'opacity-0'
            }`}>
                <OverrideCreatorWrapper
                    fieldLabel={label}
                    interactionsInlineStyle={interactionsInlineStyle}
                    mutations={mutations}
                    siteSettings={siteSettings}
                    overrides={overrides}
                    className="opacity-100"
                />
            </div>
        </div>
    );
};


