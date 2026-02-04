'use client';

import React from 'react';
import { ComponentNode, AtomNode, SectionNode } from '@/OSDL.types';
import { resolveDataBindingsInObject } from '@/osdl/utils/nodeProcessor';
import NodeRenderer from '@/osdl/NodeRenderer';

// Params for the Hero component
export interface HeroComponentParams {
  /**
   * Array of images to display. Each item can be a string (url) or an object with url and alt.
   * If a string, it is treated as the url and alt is auto-generated as 'hero_img_[index]'.
   * Example: ["/img1.jpg", { url: "/img2.jpg", alt: "desc" }]
   */
  images?: (string | { url: string; alt?: string })[];
  margin?: string; // e.g., '32px 0' or '2rem auto' (CSS shorthand: top right bottom left)
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  autoScroll?: boolean;
  autoScrollWaitDuration?: number; // ms
  scrollIndicatorType?: 'buttons' | 'dots' | 'both' | 'none';
  transitionAnimation?: 'fade' | 'slide' | 'none';
  imageFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  borderRadius?: string; // CSS value, e.g., '16px'
  aspectRatio?: string; // e.g., '21/9'
  height?: string; // CSS value
  width?: string; // CSS value
  /**
   * Dynamic content for the hero overlay. This should be a full OSDL section node.
   * Example: { type: 'section', children: [{ type: 'atom', atomType: 'Text', ... }] }
   */
  heroContent?: any;
}

interface HeroComponentProps extends HeroComponentParams {
  id: string;
  nodeSchema: ComponentNode;
  style?: React.CSSProperties;
  className?: string;
  showDevInfo?: boolean;
  // ChildRenderer props
  setPageDefinition?: React.Dispatch<React.SetStateAction<any>>;
  isInspectMode?: boolean;
  editingSections?: Set<string>;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  ChildRenderer?: React.ComponentType<any>;
}

// Utility function to parse margin shorthand (CSS and Tailwind-style)
export function parseMargin(margin: string | undefined): [string, string, string, string] {
  if (!margin || margin.trim() === '') return ['0', '0', '0', '0'];
  const parts = margin.trim().split(/\s+/);
  // Tailwind-style: '8px x' or '4px y'
  if (parts.length === 2 && (parts[1] === 'x' || parts[1] === 'y')) {
    if (parts[1] === 'x') {
      // left/right = value, top/bottom = 0
      return ['0', parts[0], '0', parts[0]];
    } else if (parts[1] === 'y') {
      // top/bottom = value, left/right = 0
      return [parts[0], '0', parts[0], '0'];
    }
  }
  // Standard CSS margin shorthand
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  if (parts.length === 4) return [parts[0], parts[1], parts[2], parts[3]];
  // Fallback
  return ['0', '0', '0', '0'];
}

// Main HeroComponent
const HeroComponent: React.FC<HeroComponentProps> = ({
  images,
  margin = '4px 16px',
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  autoScroll = false,
  autoScrollWaitDuration = 5000,
  scrollIndicatorType = 'both',
  transitionAnimation = 'fade',
  imageFit = 'cover',
  borderRadius = '16px',
  aspectRatio = '21/9',
  height = 'auto',
  width = '100%',
  heroContent,
  id,
  nodeSchema,
  style,
  className,
  showDevInfo,
  setPageDefinition,
  isInspectMode,
  editingSections,
  onDeleteNode,
  onDuplicateNode,
  ChildRenderer = NodeRenderer,
}) => {
  // Use utility function to parse margin
  const [mt, mr, mb, ml] = parseMargin(margin);

  const marginStyle: React.CSSProperties = {
    marginTop: typeof marginTop !== 'undefined' ? marginTop : mt,
    marginRight: typeof marginRight !== 'undefined' ? marginRight : mr,
    marginBottom: typeof marginBottom !== 'undefined' ? marginBottom : mb,
    marginLeft: typeof marginLeft !== 'undefined' ? marginLeft : ml,
  };

  const aspectRatioStyle: React.CSSProperties = {
    aspectRatio: aspectRatio,
    width,
    height,
    position: 'relative',
    borderRadius: borderRadius,
    overflow: 'hidden',
  };

  // Prepare images array from the images prop
  const heroImages: { url: string; alt?: string }[] = images && Array.isArray(images) && images.length > 0
    ? images.map((img, idx) =>
        typeof img === 'string'
          ? { url: img, alt: `hero_img_${idx}` }
          : { url: img.url, alt: img.alt || `hero_img_${idx}` }
      )
    : [];

  // State for current image index if multiple images
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const hasMultipleImages = heroImages.length > 1;

  // Auto-scroll effect
  React.useEffect(() => {
    if (!autoScroll || !hasMultipleImages) return;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, autoScrollWaitDuration);
    return () => clearTimeout(timer);
  }, [autoScroll, autoScrollWaitDuration, hasMultipleImages, heroImages.length, currentIndex]);

  // Handler for next/prev (for future transition logic)
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  // Transition style
  const getTransitionStyle = (idx: number) => {
    if (!hasMultipleImages) return {};
    if (transitionAnimation === 'fade') {
      return {
        transition: 'opacity 0.5s',
        opacity: idx === currentIndex ? 1 : 0,
        zIndex: 1,
        display: 'block',
        position: 'absolute' as const,
        top: '0px',
        left: '0px',
      };
    } else if (transitionAnimation === 'slide') {
      return {
        transition: 'transform 0.5s',
        transform: `translateX(${(idx - currentIndex) * 100}%)`,
        zIndex: 1,
        display: 'block',
        position: 'absolute' as const,
        top: '0px',
        left: '0px',
      };
    } else {
      // 'none'
      return {
        opacity: idx === currentIndex ? 1 : 0,
        zIndex: 1,
        display: idx === currentIndex ? 'block' : 'none',
        position: 'absolute' as const,
        top: '0px',
        left: '0px',
      };
    }
  };

  // Use the heroContent directly as a section node
  const heroContentSection: SectionNode | null = React.useMemo(() => {
    if (!heroContent) return null;

    // Resolve heroContent params if present
    let resolvedHeroContent = heroContent;
    if (typeof heroContent === 'string') {
      try {
        resolvedHeroContent = JSON.parse(heroContent);
      } catch (e) {
        console.warn('Failed to parse heroContent as JSON:', heroContent);
        return null;
      }
    }

    if (resolvedHeroContent && typeof resolvedHeroContent === 'object') {
      resolvedHeroContent = resolveDataBindingsInObject(resolvedHeroContent, {}, undefined);
    }

    // Ensure it has the proper structure (NO MARGIN on the section itself)
    if (resolvedHeroContent && typeof resolvedHeroContent === 'object') {
      return {
        ...resolvedHeroContent,
        id: resolvedHeroContent.id || `${nodeSchema.id}-hero-content-section`,
        layout: {
          ...resolvedHeroContent.layout,
        }
      } as SectionNode;
    }

    return null;
  }, [heroContent, nodeSchema.id]);



  return (
    <div id={id} className={className} data-component-type="Hero" style={{ ...style, ...marginStyle }}>
      {showDevInfo && (
        <small>Hero Component ID: {id} (Parent Schema: {nodeSchema.id})</small>
      )}
      <div style={aspectRatioStyle}>
        {/* Render images as a carousel/slider if more than one, otherwise just the single image */}
        {heroImages.map((img, idx) => (
          <img
            key={img.url + idx}
            src={img.url}
            alt={img.alt || 'Hero Image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: imageFit,
              borderRadius: borderRadius,
              ...getTransitionStyle(idx),
            }}
          />
        ))}
        {/* Overlay: always present, covers image, contains all controls/content */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(30,30,30,0.78)', // darker overlay for better visibility
            zIndex: 10,
            pointerEvents: 'none', // overlay itself doesn't block, but children can
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Controls/indicators, absolutely positioned, pointerEvents: auto */}
          {hasMultipleImages && scrollIndicatorType !== 'none' && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
              <ScrollIndicators
                type={scrollIndicatorType}
                currentIndex={currentIndex}
                total={heroImages.length}
                goToPrev={goToPrev}
                goToNext={goToNext}
                setCurrentIndex={setCurrentIndex}
              />
            </div>
          )}
          {/* Overlay content always present, centered, pointerEvents: auto */}
          {heroContentSection ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                pointerEvents: 'auto',
                zIndex: 15,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                boxSizing: 'border-box',
              }}
            >
              <ChildRenderer
                nodeSchema={heroContentSection}
                setPageDefinition={setPageDefinition || (() => {})}
                isInspectMode={isInspectMode}
                editingSections={editingSections}
                onDeleteNode={onDeleteNode}
                onDuplicateNode={onDuplicateNode}
                ChildRenderer={ChildRenderer}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// --- Scroll Indicator Components ---

interface ScrollIndicatorsProps {
  type: 'buttons' | 'dots' | 'both' | 'none';
  currentIndex: number;
  total: number;
  goToPrev: () => void;
  goToNext: () => void;
  setCurrentIndex: (idx: number) => void;
}

const ScrollIndicators: React.FC<ScrollIndicatorsProps> = ({
  type,
  currentIndex,
  total,
  goToPrev,
  goToNext,
  setCurrentIndex,
}) => {
  // Place buttons absolutely on the left/right, dots centered at bottom
  return (
    <>
      {(type === 'buttons' || type === 'both') && (
        <>
          <button
            onClick={goToPrev}
            style={{
              position: 'absolute',
              top: '50%',
              left: 16,
              transform: 'translateY(-50%)',
              background: 'rgba(120,120,120,0.18)', // slightly darker gray
              color: '#222',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: 0,
            }}
            aria-label="Previous image"
          >
            {/* Left Chevron SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={goToNext}
            style={{
              position: 'absolute',
              top: '50%',
              right: 16,
              transform: 'translateY(-50%)',
              background: 'rgba(120,120,120,0.18)', // slightly darker gray
              color: '#222',
              border: 'none',
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              padding: 0,
            }}
            aria-label="Next image"
          >
            {/* Right Chevron SVG */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </>
      )}
      {(type === 'dots' || type === 'both') && (
        <div style={{
          position: 'absolute',
          bottom: 10, // move closer to image bottom
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 20,
        }}>
          <IndicatorDots currentIndex={currentIndex} total={total} setCurrentIndex={setCurrentIndex} />
        </div>
      )}
    </>
  );
};


// IndicatorButtons removed, logic now in ScrollIndicators
interface IndicatorDotsProps {
  currentIndex: number;
  total: number;
  setCurrentIndex: (idx: number) => void;
}

const IndicatorDots: React.FC<IndicatorDotsProps> = ({ currentIndex, total, setCurrentIndex }) => (
  <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
    {Array.from({ length: total }).map((_, dotIdx) => (
      <span
        key={dotIdx}
        onClick={() => setCurrentIndex(dotIdx)}
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: dotIdx === currentIndex ? '#fff' : '#bbb',
          display: 'inline-block',
          cursor: 'pointer',
          margin: '0 1px',
          transition: 'background 0.2s',
        }}
      />
    ))}
  </div>
);

export default HeroComponent; 