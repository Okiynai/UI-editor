import React, { createContext, useContext, ReactNode } from 'react';
import { useIframeCommunication } from '../util/useIframeCommunication';

interface IframeCommunicationContextType {
    iframeCommunicationManager: any;
    handleIframeReady: (iframe: HTMLIFrameElement) => void;
    handleInspectModeToggle: (enabled: boolean) => void;
    handleUndo: () => void;
    handleRedo: () => void;
    handleSendChatContent: (type: string, content: any, targetElementId?: string) => void;
    handleUpdatePageDefinition: (pageDefinition: any) => void;
    updateLocale: (selectedLocale: string) => void;
    updateScreenSize: (screenSize: string, resizableWidth: number) => void;
    updateInspectMode: (isInspectMode: boolean) => void;
    handleChangePage: (pageRoute: string, shopSubdomain: string) => void;
    handleRejectChanges: (payload: { agentChanges: any[] | Map<string, any>; changeId: string, all?: boolean }) => void;
    handleSaveRequest: (shopId?: string) => void;
    handleSiteSettingsChange: (payload: any) => void;
    handleUpdateNode: (nodeId: string, changes: Record<string, any>) => void;
    handleAgentChangeAction: (action: 'undo' | 'redo', actionId: string, change?: any, all?: boolean, agentChanges?: any[] | Map<string, any>) => void;
    handleUserModeToggle: (isUserMode: boolean, user?: any) => void;
    isReady: boolean;
}

const IframeCommunicationContext = createContext<IframeCommunicationContextType | null>(null);

export const IframeCommunicationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const iframeCommunication = useIframeCommunication();

    return (
        <IframeCommunicationContext.Provider value={iframeCommunication}>
            {children}
        </IframeCommunicationContext.Provider>
    );
};

export const useIframeCommunicationContext = () => {
    const context = useContext(IframeCommunicationContext);
    if (!context) {
        throw new Error('useIframeCommunicationContext must be used within an IframeCommunicationProvider');
    }
    return context;
}; 