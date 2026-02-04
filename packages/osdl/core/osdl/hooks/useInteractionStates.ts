import { useState, useMemo } from 'react';
import { InteractionStatesConfig, NodeStyleChanges, TransitionDefinition } from '@/OSDL.types';
import React from 'react';

interface InteractionHandlers {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

interface InteractionStyleResult {
  dynamicStyles: React.CSSProperties;
  transitionStyles: React.CSSProperties;
  handlers: InteractionHandlers;
}

// Helper function to convert TransitionDefinition to CSS transition string
const transitionDefinitionToCSS = (transition: TransitionDefinition): string => {
  const { prop, durationMs, waitDurationMs = 0, easing = 'ease' } = transition;
  return `${prop} ${durationMs}ms ${easing} ${waitDurationMs}ms`;
};

export function useInteractionStates(
  interactionStates: InteractionStatesConfig | undefined,
): InteractionStyleResult {
  const [isHovering, setIsHovering] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handlers = useMemo((): InteractionHandlers => ({
    onMouseEnter: () => setIsHovering(true),
    onMouseLeave: () => setIsHovering(false),
    onFocus: () => setIsFocusing(true),
    onBlur: () => setIsFocusing(false),
    onMouseDown: () => setIsActive(true),
    onMouseUp: () => setIsActive(false),
  }), []);

  const hoverStyles = useMemo(() => isHovering ? interactionStates?.hover?.inlineStyles || {} : {}, [isHovering, interactionStates?.hover]);
  const focusStyles = useMemo(() => isFocusing ? interactionStates?.focus?.inlineStyles || {} : {}, [isFocusing, interactionStates?.focus]);
  const activeStyles = useMemo(() => isActive ? interactionStates?.active?.inlineStyles || {} : {}, [isActive, interactionStates?.active]);
  
  const dynamicStyles = useMemo((): React.CSSProperties => ({
    ...hoverStyles,
    ...focusStyles,
    ...activeStyles,
  }), [hoverStyles, focusStyles, activeStyles]);

  const transitionStyles = useMemo((): React.CSSProperties => {
    if (!interactionStates) {
      return {};
    }
    
    // This map will store the final transition for each CSS property,
    // ensuring that more specific states overwrite less specific ones.
    const finalTransitions = new Map<string, TransitionDefinition>();

    // 1. Apply base hover transitions (always present for smooth hover in/out)
    if (interactionStates.hover?.transitions) {
      for (const t of interactionStates.hover.transitions) {
        finalTransitions.set(t.prop, t);
      }
    }

    // 2. Apply focus transitions, overwriting hover transitions for the same properties.
    if (interactionStates.focus?.transitions) {
      for (const t of interactionStates.focus.transitions) {
        finalTransitions.set(t.prop, t);
      }
    }

    // 3. Apply active transitions, which have the highest precedence.
    if (interactionStates.active?.transitions) {
      for (const t of interactionStates.active.transitions) {
        finalTransitions.set(t.prop, t);
      }
    }
    
    if (finalTransitions.size === 0) {
      return {};
    }

    // 4. Convert the final map of transitions into a CSS string.
    const transitionString = Array.from(finalTransitions.values())
      .map(transitionDefinitionToCSS)
      .join(', ');

    return {
      transition: transitionString,
    };

  }, [interactionStates]);

  return { dynamicStyles, transitionStyles, handlers };
} 