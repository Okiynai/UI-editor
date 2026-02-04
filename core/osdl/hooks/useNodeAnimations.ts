import { useEffect, useRef } from 'react';
import { AnimationRule, KeyframeDefinition, AnimationTimingConfig } from '@/OSDL.types';
import React from 'react';

// A simple registry for predefined animations, as suggested by the plan.
// This could be expanded and live in its own file.
const globalAnimations: Record<string, { keyframes: KeyframeDefinition[]; timing: AnimationTimingConfig }> = {
  fadeInUp: {
    keyframes: [
      { offset: 0, styles: { opacity: '0', transform: 'translateY(20px)' } },
      { offset: 1, styles: { opacity: '1', transform: 'translateY(0px)' } },
    ],
    timing: { durationMs: 800, easing: 'ease-out', fillMode: 'forwards' },
  },
  // Add other global animations here
};

const convertToWaapiTimings = (timing: AnimationTimingConfig, trigger: any): KeyframeAnimationOptions => ({
    duration: timing.durationMs,
    easing: timing.easing || 'linear',
    iterations: timing.iterations === 'infinite' ? Infinity : timing.iterations || 1,
    direction: timing.direction || 'normal',
    fill: timing.fillMode || 'none',
    delay: trigger.delayMs || 0,
});

const convertToWaapiKeyframes = (keyframes: any[]): Keyframe[] => {
    return keyframes.map(kf => ({
        ...kf.styles,
        offset: kf.offset,
    }));
};

const LOG_PREFIX = '[GEMINI_ANIM_DEBUG]';

export function useNodeAnimations(
  nodeRef: React.RefObject<HTMLElement | null>,
  animationRules: AnimationRule[] | undefined,
  nodeId: string
): void {
  const animationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    if (!animationRules || animationRules.length === 0 || !nodeRef.current) {
      return;
    }
    
    const element = nodeRef.current;
    console.log(`${LOG_PREFIX} Node ${nodeId}: Initializing animations for element`, element);
    const activeAnimations: Animation[] = [];

    animationRules.forEach(rule => {
      const { trigger, keyframes, timing } = rule;

      if (!keyframes || !timing || !Array.isArray(keyframes)) {
        console.warn(`${LOG_PREFIX} Node ${nodeId}: Skipping rule ${rule.id} due to missing or invalid keyframes/timing.`);
        return;
      }

      const waapiTimings = convertToWaapiTimings(timing, trigger);
      const waapiKeyframes = keyframes.map((kf: KeyframeDefinition) => ({ ...kf.styles, offset: kf.offset }));

      const playAnimation = () => {
        console.log(`${LOG_PREFIX} Node ${nodeId}: PLAYING animation for trigger: ${trigger.type}`, { rule });
        const animation = element.animate(waapiKeyframes, waapiTimings);
        activeAnimations.push(animation);
      };

      switch (trigger.type) {
        case 'load':
          console.log(`${LOG_PREFIX} Node ${nodeId}: Found 'load' trigger.`, { rule });
          playAnimation();
          break;

        case 'scroll_into_view': {
          console.log(`${LOG_PREFIX} Node ${nodeId}: Found 'scroll_into_view' trigger. Setting up IntersectionObserver.`, { rule });
          
          const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
              console.log(`${LOG_PREFIX} Node ${nodeId}: Element is intersecting. Firing 'scroll_into_view' animation.`);
              playAnimation();
              if (trigger.scrollSettings?.once) {
                console.log(`${LOG_PREFIX} Node ${nodeId}: Disconnecting observer because 'once' is true.`);
                observer.disconnect();
              }
            }
          }, {
            root: null,
            rootMargin: typeof trigger.scrollSettings?.offset === 'string' ? trigger.scrollSettings.offset : '0px',
            threshold: 0.1
          });

          observer.observe(element);
          
          return () => {
            console.log(`${LOG_PREFIX} Node ${nodeId}: Cleaning up IntersectionObserver.`);
            observer.disconnect();
          };
        }

        case 'click':
          console.log(`${LOG_PREFIX} Node ${nodeId}: Found 'click' trigger. Attaching event listener.`, { rule });
          element.addEventListener('click', playAnimation);
          return () => {
            console.log(`${LOG_PREFIX} Node ${nodeId}: Cleaning up 'click' event listener.`);
            element.removeEventListener('click', playAnimation);
          };

        case 'hover':
          console.log(`${LOG_PREFIX} Node ${nodeId}: Found 'hover' trigger. Attaching event listener.`, { rule });
          element.addEventListener('mouseenter', playAnimation);
          return () => {
            console.log(`${LOG_PREFIX} Node ${nodeId}: Cleaning up 'hover' event listener.`);
            element.removeEventListener('mouseenter', playAnimation);
          };
          
        default:
          break;
      }
    });

    animationsRef.current = activeAnimations;

    return () => {
        console.log(`${LOG_PREFIX} Node ${nodeId}: Main cleanup function. Cancelling ${animationsRef.current.length} animations.`);
        animationsRef.current.forEach(anim => anim.cancel());
    };
  }, [JSON.stringify(animationRules), nodeId]);
} 