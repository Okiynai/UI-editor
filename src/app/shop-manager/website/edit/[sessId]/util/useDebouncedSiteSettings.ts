import { useCallback, useRef } from 'react';
import { useIframeCommunicationContext } from '../context/IframeCommunicationContext';
import { SiteSettingsChangedPayload } from '../types/iframe-communication';

export function useDebouncedSiteSettings() {
    const { handleSiteSettingsChange } = useIframeCommunicationContext();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const throttleRef = useRef<NodeJS.Timeout | null>(null);
    const pendingThrottledPayloadRef = useRef<SiteSettingsChangedPayload | null>(null);

    const debouncedSiteSettingsChange = useCallback((payload: SiteSettingsChangedPayload, delay: number = 300) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            handleSiteSettingsChange(payload);
        }, delay);
    }, [handleSiteSettingsChange]);

    const throttledSiteSettingsChange = useCallback((payload: SiteSettingsChangedPayload, throttleMs: number = 50) => {
        // Store the most recent payload
        pendingThrottledPayloadRef.current = payload;

        // If no throttle is active, start one
        if (!throttleRef.current) {
            throttleRef.current = setTimeout(() => {
                // Send the most recent payload
                if (pendingThrottledPayloadRef.current) {
                    handleSiteSettingsChange(pendingThrottledPayloadRef.current);
                    pendingThrottledPayloadRef.current = null;
                }
                throttleRef.current = null;
            }, throttleMs);
        }
    }, [handleSiteSettingsChange]);

    const immediateSiteSettingsChange = useCallback((payload: SiteSettingsChangedPayload) => {
        // Clear any pending timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (throttleRef.current) {
            clearTimeout(throttleRef.current);
            throttleRef.current = null;
        }
        pendingThrottledPayloadRef.current = null;
        
        // Send immediately
        handleSiteSettingsChange(payload);
    }, [handleSiteSettingsChange]);

    return {
        debouncedSiteSettingsChange,
        throttledSiteSettingsChange,
        immediateSiteSettingsChange,
    };
} 