import React from 'react';
import { BaseNode, SectionNode, LayoutConfig, PositioningConfig, TransformProps, SpacingObject, SiteSettings, Node } from '@/OSDL.types';

export interface ProcessedStyles {
  style: React.CSSProperties;
  className: string; 
}

// Helper for SpacingObject to prefix with padding/margin
function spacingToObjectWithPrefix(spacing: SpacingObject, prefix: 'padding' | 'margin'): React.CSSProperties {
  const styles: React.CSSProperties = {};
  if (spacing.top) styles[`${prefix}Top`] = spacing.top;
  if (spacing.right) styles[`${prefix}Right`] = spacing.right;
  if (spacing.bottom) styles[`${prefix}Bottom`] = spacing.bottom;
  if (spacing.left) styles[`${prefix}Left`] = spacing.left;
  return styles;
}

function transformPropsToString(transform: TransformProps | undefined): string | undefined {
  if (!transform) return undefined;
  const parts: string[] = [];
  // Order matters for transforms - perspective should come first
  if (transform.perspective) parts.push(`perspective(${transform.perspective})`);
  
  if (transform.translate) parts.push(`translate(${transform.translate})`);
  if (transform.translateX) parts.push(`translateX(${transform.translateX})`);
  if (transform.translateY) parts.push(`translateY(${transform.translateY})`);
  if (transform.translateZ) parts.push(`translateZ(${transform.translateZ})`);

  if (transform.scale) parts.push(`scale(${transform.scale})`);
  if (transform.scaleX) parts.push(`scaleX(${transform.scaleX})`);
  if (transform.scaleY) parts.push(`scaleY(${transform.scaleY})`);
  if (transform.scaleZ) parts.push(`scaleZ(${transform.scaleZ})`);

  if (transform.rotate) parts.push(`rotate(${transform.rotate})`);
  if (transform.rotateX) parts.push(`rotateX(${transform.rotateX})`);
  if (transform.rotateY) parts.push(`rotateY(${transform.rotateY})`);
  if (transform.rotateZ) parts.push(`rotateZ(${transform.rotateZ})`);

  if (transform.skew) parts.push(`skew(${transform.skew})`);
  if (transform.skewX) parts.push(`skewX(${transform.skewX})`);
  if (transform.skewY) parts.push(`skewY(${transform.skewY})`);
  
  return parts.length > 0 ? parts.join(' ') : undefined;
}


function applyBorderParamsToStyles(styles: React.CSSProperties, params: Record<string, any> | undefined): void {
  if (!params) return;
  const hasAnySide = params.borderTop || params.borderRight || params.borderBottom || params.borderLeft;
  if (hasAnySide) {
    // Using individual sides - don't set shorthand to avoid conflicts
    if (params.borderTop) styles.borderTop = params.borderTop as string;
    if (params.borderRight) styles.borderRight = params.borderRight as string;
    if (params.borderBottom) styles.borderBottom = params.borderBottom as string;
    if (params.borderLeft) styles.borderLeft = params.borderLeft as string;
    // Explicitly avoid setting border to prevent conflicts
    delete styles.border;
  } else if (params.border) {
    // Using shorthand - clear any individual side properties to avoid conflicts
    styles.border = params.border as string;
    delete styles.borderTop;
    delete styles.borderRight;
    delete styles.borderBottom;
    delete styles.borderLeft;
  }
}

function applyBorderRadiusParamsToStyles(styles: React.CSSProperties, params: Record<string, any> | undefined): void {
  if (!params) return;
  const hasAnyCorner = params.borderTopLeftRadius || params.borderTopRightRadius || params.borderBottomRightRadius || params.borderBottomLeftRadius;
  if (hasAnyCorner) {
    // Using individual corners - don't set shorthand to avoid conflicts
    if (params.borderTopLeftRadius) styles.borderTopLeftRadius = params.borderTopLeftRadius as string;
    if (params.borderTopRightRadius) styles.borderTopRightRadius = params.borderTopRightRadius as string;
    if (params.borderBottomRightRadius) styles.borderBottomRightRadius = params.borderBottomRightRadius as string;
    if (params.borderBottomLeftRadius) styles.borderBottomLeftRadius = params.borderBottomLeftRadius as string;
    // Explicitly avoid setting borderRadius to prevent conflicts
    delete styles.borderRadius;
  } else if (params.borderRadius) {
    // Using shorthand - clear any individual corner properties to avoid conflicts
    styles.borderRadius = params.borderRadius as string;
    delete styles.borderTopLeftRadius;
    delete styles.borderTopRightRadius;
    delete styles.borderBottomRightRadius;
    delete styles.borderBottomLeftRadius;
  }
}

function applyFilterParamsToStyles(styles: React.CSSProperties, params: Record<string, any> | undefined): void {
  // Handle filter as a single shorthand property (like boxShadow)
  if (!params) return;
  if (params.filter) {
    styles.filter = params.filter as string;
  }
}

function applyImageParamsToStyles(styles: React.CSSProperties, params: Record<string, any> | undefined): void {
  // Image-specific properties
  if (!params) return;
  if (params.objectFit) styles.objectFit = params.objectFit as React.CSSProperties['objectFit'];
  if (params.objectPosition) styles.objectPosition = params.objectPosition as React.CSSProperties['objectPosition'];
}


export function processStylesAndLayout(
  node: Node, // Using the discriminated union type Node for better type safety
  siteSettings: SiteSettings // For global vars, though not directly used if vars are strings
): ProcessedStyles {
  const styles: React.CSSProperties = {};
  let className = ''; // Start with empty className

  // 1. Handle PositioningConfig (applies to all nodes)
  if (node.positioning) {
    const pos = node.positioning;
    if (pos.position) styles.position = pos.position;
    if (pos.top) styles.top = pos.top;
    if (pos.right) styles.right = pos.right;
    if (pos.bottom) styles.bottom = pos.bottom;
    if (pos.left) styles.left = pos.left;
    if (pos.zIndex !== undefined) styles.zIndex = pos.zIndex;
    
    const transformString = transformPropsToString(pos.transform);
    if (transformString) styles.transform = transformString;
    if (pos.transform?.transformOrigin) styles.transformOrigin = pos.transform.transformOrigin;
    if (pos.transform?.transformStyle) styles.transformStyle = pos.transform.transformStyle;
    if (pos.transform?.backfaceVisibility) styles.backfaceVisibility = pos.transform.backfaceVisibility;
    if (pos.clipPath) styles.clipPath = pos.clipPath;
  }

  // 2. Handle LayoutConfig (specific to SectionNode)
  if (node.type === 'section') {
     if (!node.layout) {
      console.error("[IframePage] Node was missing a 'layout'");
      throw new Error(`Node { id: ${node.id}, name: ${node.name}, type: ${node.type} } was missing a 'layout'`);
      // return { style: styles, className: '' };
    }
    // No need to cast, node is already SectionNode due to discriminated union
    const layout = node.layout;

    if (layout.mode === 'flex') {
      styles.display = 'flex';
      if (layout.direction) styles.flexDirection = layout.direction;
      if (layout.justifyContent) styles.justifyContent = layout.justifyContent;
      if (layout.alignItems) styles.alignItems = layout.alignItems;
      if (layout.gap) styles.gap = layout.gap;
      if (layout.flexWrap) styles.flexWrap = layout.flexWrap;
    } else if (layout.mode === 'grid') {
      styles.display = 'grid';
      if (layout.gridTemplateColumns) styles.gridTemplateColumns = layout.gridTemplateColumns;
      if (layout.gridTemplateRows) styles.gridTemplateRows = layout.gridTemplateRows;
      if (layout.gridAutoFlow) styles.gridAutoFlow = layout.gridAutoFlow;
      if (layout.gridJustifyItems) styles.justifyItems = layout.gridJustifyItems;
      if (layout.gridAlignItems) styles.alignItems = layout.gridAlignItems;
      
      // Handle gap properties - avoid mixing shorthand and non-shorthand
      if (layout.rowGap !== undefined || layout.columnGap !== undefined) {
        // Use individual gap properties
        if (layout.rowGap !== undefined) styles.rowGap = layout.rowGap;
        if (layout.columnGap !== undefined) styles.columnGap = layout.columnGap;
        // Explicitly avoid setting gap to prevent conflicts
        delete styles.gap;
      } else if (layout.gap !== undefined) {
        // Use shorthand gap property
        styles.gap = layout.gap;
        // Explicitly avoid setting individual gap properties to prevent conflicts
        delete styles.rowGap;
        delete styles.columnGap;
      } 
    } else { // 'flow' or default
      styles.display = 'block'; 
    }

    // Common layout properties
    if (typeof layout.padding === 'string') styles.padding = layout.padding;
    else if (layout.padding) Object.assign(styles, spacingToObjectWithPrefix(layout.padding, 'padding'));
    
    if (typeof layout.margin === 'string') styles.margin = layout.margin;
    else if (layout.margin) Object.assign(styles, spacingToObjectWithPrefix(layout.margin, 'margin'));

    if (layout.width) styles.width = layout.width;
    if (layout.height) styles.height = layout.height;
    if (layout.minHeight) styles.minHeight = layout.minHeight;
    if (layout.maxHeight) styles.maxHeight = layout.maxHeight;
    if (layout.minWidth) styles.minWidth = layout.minWidth;
    if (layout.maxWidth) styles.maxWidth = layout.maxWidth;
    if (layout.overflow) styles.overflow = layout.overflow;

    // SectionNode.inlineStyles
    if (node.inlineStyles) { // node is SectionNode here
      Object.assign(styles, node.inlineStyles);
    }
  }

  // 3. Handle common style parameters from node.params
  // These are typically for Atom, Component, or Section nodes which have params: Record<string, any>.
  if (node.type === 'atom' || node.type === 'component' || node.type === 'section') {
    const generalParams = node.params as Record<string, any>; // Type assertion for general access

    if (generalParams?.backgroundColor) styles.backgroundColor = generalParams.backgroundColor as string;
    if (generalParams?.color) styles.color = generalParams.color as string;
    if (generalParams?.fontSize) styles.fontSize = generalParams.fontSize as string; // Assuming string like "16px" or number for px
    if (generalParams?.textAlign) styles.textAlign = generalParams.textAlign as React.CSSProperties['textAlign'];
    if (generalParams?.fontFamily) styles.fontFamily = generalParams.fontFamily as string;
    // Add more common style props from params as needed. Examples:
    if (generalParams?.fontWeight) styles.fontWeight = generalParams.fontWeight as React.CSSProperties['fontWeight'];
    if (generalParams?.letterSpacing) styles.letterSpacing = generalParams.letterSpacing as string;
    if (generalParams?.lineHeight) styles.lineHeight = generalParams.lineHeight as React.CSSProperties['lineHeight'];
    if (generalParams?.textTransform) styles.textTransform = generalParams.textTransform as React.CSSProperties['textTransform'];
    if (generalParams?.textDecoration) styles.textDecoration = generalParams.textDecoration as React.CSSProperties['textDecoration'];

    // Explicitly handle padding and margin from params
    if (generalParams?.padding) styles.padding = generalParams.padding as string;
    if (generalParams?.margin) styles.margin = generalParams.margin as string;

    if (generalParams?.width) styles.width = generalParams.width as string;
    if (generalParams?.height) styles.height = generalParams.height as string;
    if (generalParams?.minWidth) styles.minWidth = generalParams.minWidth as string;
    if (generalParams?.minHeight) styles.minHeight = generalParams.minHeight as string;
    if (generalParams?.maxWidth) styles.maxWidth = generalParams.maxWidth as string;
    if (generalParams?.maxHeight) styles.maxHeight = generalParams.maxHeight as string;
    // Borders and Radius via helpers to avoid mixing shorthand/longhand
    applyBorderParamsToStyles(styles, generalParams);
    applyBorderRadiusParamsToStyles(styles, generalParams);
    
    // CSS Filters via helper
    applyFilterParamsToStyles(styles, generalParams);
    
    // Image-specific properties via helper
    applyImageParamsToStyles(styles, generalParams);
    
    if (generalParams?.boxShadow) styles.boxShadow = generalParams.boxShadow as string;
    if (generalParams?.opacity !== undefined) styles.opacity = generalParams.opacity as number;
    // Prefer axis-specific overflow if present to avoid mixing with shorthand
    const hasOverflowX = !!generalParams?.overflowX;
    const hasOverflowY = !!generalParams?.overflowY;
    if (hasOverflowX) styles.overflowX = generalParams.overflowX as React.CSSProperties['overflowX'];
    if (hasOverflowY) styles.overflowY = generalParams.overflowY as React.CSSProperties['overflowY'];
    if (!hasOverflowX && !hasOverflowY && generalParams?.overflow) {
      styles.overflow = generalParams.overflow as string;
    }

    if (generalParams?.cursor) styles.cursor = generalParams.cursor as React.CSSProperties['cursor'];
    // Additional style params that might be used in buttons
    if (generalParams?.background) styles.background = generalParams.background as string;
     if (generalParams?.backgroundImage) styles.backgroundImage = generalParams.backgroundImage; // not recommended, use atom image instead.
    if (generalParams?.display) styles.display = generalParams.display as string;
    if (generalParams?.visibility) styles.visibility = generalParams.visibility as React.CSSProperties['visibility'];
    if (generalParams?.alignItems) styles.alignItems = generalParams.alignItems as string;
    if (generalParams?.justifyContent) styles.justifyContent = generalParams.justifyContent as string;
    if (generalParams?.backdropFilter) styles.backdropFilter = generalParams.backdropFilter as string;
    if (generalParams?.position) styles.position = generalParams.position as React.CSSProperties['position'];
    if (generalParams?.left) styles.left = generalParams.left as string;
    if (generalParams?.right) styles.right = generalParams.right as string;
    if (generalParams?.top) styles.top = generalParams.top as string;
    if (generalParams?.transform) styles.transform = generalParams.transform as string;
    if (generalParams?.transformOrigin) styles.transformOrigin = generalParams.transformOrigin as string;
    if (generalParams?.transformStyle) styles.transformStyle = generalParams.transformStyle as React.CSSProperties['transformStyle'];
    if (generalParams?.backfaceVisibility) styles.backfaceVisibility = generalParams.backfaceVisibility as React.CSSProperties['backfaceVisibility'];
    if (generalParams?.zIndex) styles.zIndex = generalParams.zIndex as number;
    if (generalParams?.aspectRatio) styles.aspectRatio = generalParams.aspectRatio as string;
    if (generalParams?.textAlign) styles.textAlign = generalParams.textAlign as React.CSSProperties['textAlign'];
    if (generalParams?.marginTop) styles.marginTop = generalParams.marginTop as string;
    if (generalParams?.marginBottom) styles.marginBottom = generalParams.marginBottom as string;
    if (generalParams?.marginLeft) styles.marginLeft = generalParams.marginLeft as string;
    if (generalParams?.marginRight) styles.marginRight = generalParams.marginRight as string;

    // if (node.id === 'cta-button-header' || node.id === 'link-home') { // Log for specific buttons
    //   console.log(`styleUtils: Processed styles for ${node.id}:`, JSON.parse(JSON.stringify(styles)));
    // }
  }

  // Note: Global style variables (var(--...)) from siteSettings are expected to be defined globally (e.g., in _app.tsx or global CSS).
  // If a param value is "var(--primary-color)", React will pass it through, and it will work if the variable is defined.

  // 4. Handle initial styles for 'load' animations to prevent FOUC (Flash of Unstyled Content)
  // This runs on the server and client to ensure the initial state is correct.
  if (node.animations) {
    for (const anim of node.animations) {
      if (anim.trigger.type === 'load' && anim.keyframes && Array.isArray(anim.keyframes) && anim.keyframes.length > 0) {
        // Find the first keyframe, which defines the pre-animation state.
        const firstKeyframe = anim.keyframes.find(kf => kf.offset === 0);
        if (firstKeyframe && firstKeyframe.styles) {
          // Apply these styles directly. This ensures the element is invisible (or transformed)
          // from the very first server render, eliminating the flash.
          Object.assign(styles, firstKeyframe.styles);
        }
      }
    }
  }

  return { style: styles, className };
} 
