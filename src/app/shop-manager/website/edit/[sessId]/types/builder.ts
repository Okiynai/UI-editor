export type SidebarPanel = "chat" | "settings" | "assets" | "layout";
export type ChatTab = "chat" | "smart-editor";
export type ScreenSize = "desktop" | "tablet" | "mobile" | "resizable";

export type Page = {
    id: string;
    realId: string;
    value: string;
    label: string;
    isDynamic: boolean;
    slugName?: string;
    parentId?: string;
    isFolderPage?: boolean;
    pageType?: 'system' | 'static' | 'folder-only' | 'dynamic';
    nodes: any[];
    systemPageProps: Record<string, any>;
    seo?: {
        title?: string;
        titleSuffix?: string;
        defaultDescription?: string;
        keywords?: string[];
        socialImage?: string;
        llmTxt?: string;
    };
};

export type Locale = {
    value: string;
    label: string;
    flag: string;
};

export type ColorVariable = {
    id: string;
    name: string;
    value: string;
};

export type FontVariable = {
    id: string;
    name: string;
    value: string;
};

export type Asset = {
    id: number;
    name: string;
    size: string;
    type: 'image' | 'document' | '3d' | 'archive';
    url: string;
    thumbnail: string | null;
};

export type BuilderState = {
    // Panel states
    activePanel: SidebarPanel;
    chatTab: ChatTab;
    screenSize: ScreenSize;
    showSaveDropdown: boolean;
    panelPosition: { top: number; left: number };
    
    // Page states
    selectedPage: string;
    userPages: Page[];
    rootPage: string;
    indexRedirectTarget: string | null;
    
    // Locale states
    selectedLocale: string;
    defaultLocale: string;
    userLocales: Locale[];
    
    // Resizable states
    resizableWidth: number;
    isDragging: boolean;
    dragHandle: 'left' | 'right' | null;
    dragStartX: number;
    dragStartWidth: number;
    
    // Settings states
    activeSettingsTab: string | null;
    colorVariables: ColorVariable[];
    fontVariables: FontVariable[];
    showColorPicker: string | null;
    newColorName: string;
    newColorValue: string;
    showAddColorForm: boolean;
    newFontName: string;
    newFontValue: string;
    showAddFontForm: boolean;
    
    // Assets states
    customFolders: string[];
    showAssetModal: boolean;
    selectedAssetFolder: string | null;
    newFolderName: string;
    showAddFolderInput: boolean;
    hasClipboardImage: boolean;
    clipboardCheckError: string | null;
    isCheckingClipboard: boolean;
    copiedAssetId: number | null;
    capturedClipboardImage: File | null;
};

export type BuilderActions = {
    // Panel actions
    setActivePanel: (panel: SidebarPanel) => void;
    setChatTab: (tab: ChatTab) => void;
    setScreenSize: (size: ScreenSize) => void;
    setShowSaveDropdown: (show: boolean) => void;
    setPanelPosition: (position: { top: number; left: number }) => void;
    
    // Page actions
    setSelectedPage: (page: string) => void;
    setUserPages: (pages: Page[] | ((prev: Page[]) => Page[])) => void;
    setRootPage: (page: string) => void;
    setIndexRedirectTarget: (target: string | null) => void;
    
    // Locale actions
    setSelectedLocale: (locale: string) => void;
    setDefaultLocale: (locale: string) => void;
    setUserLocales: (locales: Locale[] | ((prev: Locale[]) => Locale[])) => void;
    
    // Resizable actions
    setResizableWidth: (width: number) => void;
    setIsDragging: (dragging: boolean) => void;
    setDragHandle: (handle: 'left' | 'right' | null) => void;
    setDragStartX: (x: number) => void;
    setDragStartWidth: (width: number) => void;
    
    // Settings actions
    setActiveSettingsTab: (tab: string | null) => void;
    setColorVariables: (variables: ColorVariable[] | ((prev: ColorVariable[]) => ColorVariable[])) => void;
    setFontVariables: (variables: FontVariable[] | ((prev: FontVariable[]) => FontVariable[])) => void;
    setShowColorPicker: (id: string | null) => void;
    setNewColorName: (name: string) => void;
    setNewColorValue: (value: string) => void;
    setShowAddColorForm: (show: boolean) => void;
    setNewFontName: (name: string) => void;
    setNewFontValue: (value: string) => void;
    setShowAddFontForm: (show: boolean) => void;
    
    // Assets actions
    setCustomFolders: (folders: string[] | ((prev: string[]) => string[])) => void;
    setShowAssetModal: (show: boolean) => void;
    setSelectedAssetFolder: (folder: string | null) => void;
    setNewFolderName: (name: string) => void;
    setShowAddFolderInput: (show: boolean) => void;
    setHasClipboardImage: (has: boolean) => void;
    setClipboardCheckError: (error: string | null) => void;
    setIsCheckingClipboard: (checking: boolean) => void;
    setCopiedAssetId: (id: number | null) => void;
    setCapturedClipboardImage: (image: File | null) => void;
};

// New types for Agent Communication
export interface AgentStreamEvent {
    type: 'agent_started' | 'step_started' | 'step_progress' | 'step_completed' | 'diff_generated' | 'workflow_completed' | 'error' | 'connection_established' | 'step_failed' | 'user_message' | 'assistant_message' | 'heartbeat';
    message: string;
    timestamp: number;
    sessionId?: string;
    role?: 'user' | 'assistant';
    referencedSections?: Array<{
        pageId: string;
        nodeId: string;
        pageName: string;
    }>;
    images?: string[];
}
