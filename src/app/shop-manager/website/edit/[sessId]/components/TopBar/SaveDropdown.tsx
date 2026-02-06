import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useIframeCommunicationContext } from '../../context/IframeCommunicationContext';
import { useSession } from '@/context/Session';
import { toast } from '@/components/toast/toast';

export const SaveDropdown = () => {
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    
    const { handleSaveRequest } = useIframeCommunicationContext();
    const { shop } = useSession();
    const shopId = shop?.id;

    // Listen for SAVE_FINISHED and DIRTY_STATE messages from iframe
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const { type, payload } = event.data || {};
            if (type === 'SAVE_FINISHED') {
                setIsSaving(false);
                const { siteSettingsSaved, pageSaved } = payload || {};
                if (siteSettingsSaved && pageSaved) {
                    toast.success('Website saved successfully!');
                    setHasChanges(false); // Reset dirty state after successful save
                } else {
                    if(!siteSettingsSaved && !pageSaved) {
                        toast.error('Failed to save changes.');
                    }

                    if (!siteSettingsSaved) {
                        toast.error('Failed to save site settings.');
                    }
                    if (!pageSaved) {
                        toast.error('Failed to save page content.');
                    }
                }
            } else if (type === 'DIRTY_STATE') {
                setHasChanges(!!payload?.dirty);
                if (isSaving && !payload?.dirty) {
                    // Saving finished
                    setIsSaving(false);
                }
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [isSaving]);

    const handleSave = () => {
        if (hasChanges && !isSaving && shopId) {
            setIsSaving(true);
            handleSaveRequest(shopId);
        }
    };

    return (
        <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                hasChanges && !isSaving
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
            {isSaving && (
                <Loader2 className="w-3 h-3 animate-spin" />
            )}
            Save
        </button>
    );
};
