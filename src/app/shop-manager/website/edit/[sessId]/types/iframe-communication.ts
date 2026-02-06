// Types for communication between the builder and iframe
import { SEOSettings } from '@/services/api/shop-manager/osdl';

export interface ParentToIframeMessage {
  type: 'CHANGE_LOCALE' | 'INSPECT_ELEMENT' | 'UNDO' | 'REDO' | 'UPDATE_PAGE_DEFINITION' 
  | 'SCREEN_SIZE_CHANGE' | 'CHAT_CONTENT_UPDATE' | 'SECTION_EDITING_START' 
  | 'SECTION_EDITING_COMPLETE' | 'APPLY_COMPLETE_DIFF' 
  | 'CLEAR_ALL_EDITING_STATES' | 'CHANGE_PAGE' 
  | 'CREATE_OSDL_NODE' | 'DELETE_OSDL_NODE' | 'DUPLICATE_OSDL_NODE' 
  | 'ADD_PRE_BUILT_SECTION' | 'REJECT_AGENT_CHANGES' | 'SAVE' | 'SITE_SETTINGS_CHANGED' | 'REQUEST_LIVE_CONTEXT' | 'DIFF_RESULT' | 'LAYOUT_NODE_INTERACTION'
  | 'UPDATE_NODE' | 'AGENT_CHANGE_ACTION' | 'USER_MODE_TOGGLE';
  payload?: any;
}

export interface IframeToParentMessage {
  type: 'READY' | 'ELEMENT_SELECTED' | 'ELEMENT_HOVERED' | 'STATE_CHANGED' 
  | 'DIRTY_STATE' | 'DIMENSIONS_CHANGED' | 'ERROR' | 'CHANGE_PAGE' 
  | 'EDIT_NODE' | 'SAVE_FINISHED' | 'INTERNAL_NAVIGATION'
  | 'LIVE_CONTEXT_RESPONSE' | 'DIFF_RESULT' | 'CREATE_NODE_RESULT' | 'DELETE_NODE_RESULT' | 'ADD_PRE_BUILT_SECTION_RESULT' | 'PAGE_DEFINITION_CHANGED' | 'IFRAME_DATA_CHANGED';
  payload?: any;
}

// Specific payload types for better type safety
export interface LocaleChangePayload {
  locale: string;
}

export interface InspectElementPayload {
  enabled: boolean;
}

export interface UserModeTogglePayload {
  isUserMode: boolean;
  // Optional user data forwarded from parent; when absent, iframe will mock
  user?: any;
}
export interface UpdatePageDefinitionPayload {
  pageDefinition: any; // Use your PageDefinition type
  subDomain: string;
}

export interface ElementInteractionPayload {
  element: {
    id: string;
    type: string;
    properties?: Record<string, any>;
    position?: { x: number; y: number };
    dimensions?: { width: number; height: number };
  };
}

export interface DirtyStatePayload { dirty: boolean; }

export interface ScreenSizeChangePayload {
  width: number;
  height: number;
  screenSize: 'mobile' | 'tablet' | 'desktop';
}

export interface ChatContentUpdatePayload {
  type: 'ADD_ELEMENT' | 'MODIFY_ELEMENT' | 'DELETE_ELEMENT' | 'REPLACE_CONTENT';
  targetElementId?: string;
  content: any;
}

export interface IframeReadyPayload {
  dimensions: {
    width: number;
    height: number;
  };
}

export interface IframeErrorPayload {
  error: string;
  context?: any;
}

export interface SectionEditingPayload {
  sectionId: string;
  sectionTitle: string;
}

export interface ChangePagePayload {
  pageRoute: string;
  shopSubdomain: string;
}

export interface InternalNavigationPayload {
  url?: string;
  navigationType?: 'push' | 'replace' | 'back' | 'forward' | 'reload';
  action?: 'push' | 'replace' | 'back' | 'forward' | 'reload';
  routeParams?: Record<string, string>;
}

export interface PageDefinitionChangedPayload {
  pageDefinition: {
    name: string;
    nodes: any[];
  };
  timestamp: number;
}

export interface ApplyCompleteDiffPayload {
  sectionId: string;
  sectionTitle: string;
  propertyPath: string;
  searchValue: string;
  replaceValue: string;
  actionId?: string;
  isAgentRequest?: boolean;
  // Extended fields used by iframe diff application logic
  // These are present in actual payloads sent from editor logic
  diffType: 'node' | 'page' | 'site'; // Made required
  targetId: string; // Made required
}

// NEW: Dynamic Node Manipulation Payloads (v2.0)
export interface CreateOSDLNodePayload {
  node: any; // OSDL node object with id, type, params, etc.
  parentId: string; // ID of parent node to append to
  actionId?: string;
  isAgentRequest?: boolean; // Whether this request comes from an AI agent
}

export interface AddPreBuiltSectionPayload {
  sectionId: string; // Registry ID of the pre-built section
  parentId: string; // ID of parent node to append to
  name: string; // Name for the new section instance
  order: number; // Order within the parent
  actionId?: string;
  isAgentRequest?: boolean;
}

export interface DeleteOSDLNodePayload {
  nodeId: string; // ID of node to delete
  actionId?: string;
  isAgentRequest?: boolean;
}

export interface RejectChangesPayload {
  agentChanges: any[] | Map<string, any>;
  changeId: string;
  all?: boolean; // Optional: true = all changes, false = specific node
}

export interface AgentChangeActionPayload {
  action: 'undo' | 'redo';
  actionId: string;
  change?: any; // The specific agent change if needed
  all?: boolean; // Whether this is for all changes (reject all case)
  agentChanges?: any[] | Map<string, any>; // Array of changes for "reject all" case, following REJECT_AGENT_CHANGES pattern
}

export interface LayoutNodeInteractionPayload {
  interactionType: 'hover' | 'select' | 'deselect';
  node?: any; // The full node object (optional for deselect)
}

// Allow faviconUrl to be passed with SEO updates for preview
type SeoPayloadValue = SEOSettings & { faviconUrl?: string };

// NEW: Site Settings Change Payload
export interface SiteSettingsChangedPayload {
  type: 'color' | 'font' | 'seo' | 'locale';
  action: 'update' | 'add' | 'delete';
  variableName?: string;
  variableId?: string;
  newValue?: string | SeoPayloadValue | { defaultLocale: string } | { addedLocale: string; localeLabel: string; localeFlag: string };
  oldValue?: string | SeoPayloadValue | { defaultLocale: string };
}

// NEW: Node Update Payloads
export interface UpdateNodePayload {
  nodeId: string;
  changes: Record<string, any>; // Partial node with only changed properties
}


// NEW: Unified Builder Data Change Payload
export interface BuilderDataChangedPayload {
  changeType: 'settings' | 'definition';
  data: any;
  state: {
    isLoading: boolean;
    isRefetching?: boolean;
  };
}

// Communication manager class for the parent
export class IframeCommunicationManager {
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  private lastMessages: Map<string, any> = new Map();
  private isReady: boolean = false;
  private pendingReadyMessages: ParentToIframeMessage[] = [];
  private messageListener: ((event: MessageEvent) => void) | null = null;
	private pendingContextResolvers = new Map<string, (state: any) => void>();
  private pendingActionResolvers = new Map<string, { resolve: (payload: any) => void; reject: (err: any) => void; timeoutHandle: number }>();

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
    this.setupEventListener();
	this.on('LIVE_CONTEXT_RESPONSE', (payload: any) => {
		const resolver = this.pendingContextResolvers.get(payload.requestId);
		if (resolver) {
			resolver(payload.context);
			this.pendingContextResolvers.delete(payload.requestId);
		}
	});
    // Handler for iframe data changes (page definition, site settings, etc.)
    this.on('IFRAME_DATA_CHANGED', (payload: any) => {
      // This will be handled by the parent component
    });
  }

  private setupEventListener() {
    if (this.messageListener) {
      return;
    }

    this.messageListener = (event) => {
      // Validate origin in production
      // if (event.origin !== 'http://localhost:3000') return;
      
      const message = event.data as IframeToParentMessage;
      if (message?.type) {
        this.lastMessages.set(message.type, message.payload);
      }
      
      // Handle ready state
      if (message.type === 'READY') {
        this.isReady = true;
        this.flushPendingReadyMessages();
      }
      
      // Resolve pending action promises for unified tool feedback
      if (
        message.type === 'DIFF_RESULT' ||
        message.type === 'CREATE_NODE_RESULT' ||
        message.type === 'DELETE_NODE_RESULT' ||
        message.type === 'ADD_PRE_BUILT_SECTION_RESULT'
      ) {
        const payload: any = message.payload;
        const actionId: string | undefined = payload?.actionId || payload?.diffPayload?.actionId;
        if (actionId && this.pendingActionResolvers.has(actionId)) {
          const entry = this.pendingActionResolvers.get(actionId)!;
          clearTimeout(entry.timeoutHandle);
          // Slight delay to ensure all React state updates flush and live-context reads reflect changes
          setTimeout(() => {
            this.pendingActionResolvers.delete(actionId);
            entry.resolve(payload);
          }, 0);
          return; // Handled
        }
      }

      const handler = this.messageHandlers.get(message.type);
      
      if (handler) {
        handler(message.payload);
      }
    };

    window.addEventListener('message', this.messageListener);
  }
  private flushPendingReadyMessages() {
    if (!this.isReady || this.pendingReadyMessages.length === 0) {
      return;
    }

    const pending = [...this.pendingReadyMessages];
    this.pendingReadyMessages = [];
    pending.forEach((message) => {
      this.postToIframe(message);
    });
  }

  private postToIframe(message: ParentToIframeMessage) {
    if (!this.iframe?.contentWindow) {
      console.warn('Iframe not ready for communication');
      return;
    }
    this.iframe.contentWindow.postMessage(message, '*');
  }

  private waitForActionResult(actionId: string, timeoutMs = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = window.setTimeout(() => {
        if (this.pendingActionResolvers.has(actionId)) {
          this.pendingActionResolvers.delete(actionId);
        }
        reject(new Error(`Timed out waiting for action result: ${actionId}`));
      }, timeoutMs);
      this.pendingActionResolvers.set(actionId, { resolve, reject, timeoutHandle });
    });
  }
    public async getCurrentState(payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            // const requestId = `state_${crypto.randomUUID()}`;

			const { requestId, scope, details } = payload;
            // Set a timeout to prevent waiting forever.
            const timeoutHandle = setTimeout(() => {
                this.pendingContextResolvers.delete(requestId);
                reject(new Error('Iframe did not respond with its state in time.'));
            }, 5000); // 5-second timeout

            // Store the resolver function, but also include the timeout handle
            // so we can clear it if we get a response in time.
            this.pendingContextResolvers.set(requestId, (state) => {
                clearTimeout(timeoutHandle);
                resolve(state);
            });

            // Send the request message to the iframe.
            this.iframe?.contentWindow?.postMessage({
                type: 'REQUEST_LIVE_CONTEXT',
                payload: { requestId, scope, details }
            }, '*'); // Use a specific target origin in production
        });
    }
  // Register handlers for messages from iframe
  on(type: IframeToParentMessage['type'], handler: (payload: any) => void) {
    this.messageHandlers.set(type, handler);
    if (this.lastMessages.has(type)) {
      handler(this.lastMessages.get(type));
    }
  }

  // Remove a specific handler
  off(type: IframeToParentMessage['type']) {
    this.messageHandlers.delete(type);
  }

  setIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  // Send messages to iframe
  send(type: ParentToIframeMessage['type'], payload?: any, options?: { requiresReady?: boolean }) {
    const message: ParentToIframeMessage = { type, payload };
    const requiresReady = options?.requiresReady === true;

    if (requiresReady && !this.isReady) {
      if (type === 'CHANGE_PAGE') {
        this.pendingReadyMessages = this.pendingReadyMessages.filter((msg) => msg.type !== 'CHANGE_PAGE');
      }
      this.pendingReadyMessages.push(message);
      return;
    }

    this.postToIframe(message);
  }

  // Check if iframe is ready
  get ready(): boolean {
    return this.isReady;
  }

  // Convenience methods for common operations
  changeLocale(locale: string, isRTL: boolean = false) {
    this.send('CHANGE_LOCALE', { locale, isRTL } as LocaleChangePayload);
  }

  changePage(pageRoute: string, shopSubdomain: string) {
    this.send('CHANGE_PAGE', { pageRoute, shopSubdomain } as ChangePagePayload, { requiresReady: true });
  }

  toggleInspectMode(enabled: boolean) {
    this.send('INSPECT_ELEMENT', { enabled } as InspectElementPayload);
  }

  updatePageDefinition(pageDefinition: any) {
    this.send('UPDATE_PAGE_DEFINITION', { pageDefinition } as UpdatePageDefinitionPayload);
  }

  undo() {
    this.send('UNDO');
  }

  redo() {
    this.send('REDO');
  }

  updateScreenSize(width: number, height: number, screenSize: 'mobile' | 'tablet' | 'desktop') {
    this.send('SCREEN_SIZE_CHANGE', { width, height, screenSize } as ScreenSizeChangePayload);
  }

  sendChatUpdate(type: ChatContentUpdatePayload['type'], content: any, targetElementId?: string) {
    this.send('CHAT_CONTENT_UPDATE', { type, content, targetElementId } as ChatContentUpdatePayload);
  }

  // Diff-related convenience methods
  startSectionEditing(sectionId: string, sectionTitle: string) {
    this.send('SECTION_EDITING_START', { sectionId, sectionTitle } as SectionEditingPayload);
  }

  completeSectionEditing(sectionId: string, sectionTitle: string) {
    this.send('SECTION_EDITING_COMPLETE', { sectionId, sectionTitle } as SectionEditingPayload);
  }

  applyCompleteDiff(payload: ApplyCompleteDiffPayload) {
    this.send('APPLY_COMPLETE_DIFF', payload);
  }

  async applyCompleteDiffAwaitable(payload: ApplyCompleteDiffPayload & { actionId?: string }): Promise<any> {
    const actionId = payload.actionId || crypto.randomUUID();
    this.applyCompleteDiff({ ...payload, actionId });
    return this.waitForActionResult(actionId);
  }



  clearAllEditingStates() {
    this.send('CLEAR_ALL_EDITING_STATES', {});
  }

  rejectChanges(payload: RejectChangesPayload) {
    this.send('REJECT_AGENT_CHANGES', payload);
  }

  // NEW: Dynamic Node Manipulation Methods (v2.0)
  createOSDLNode(node: any, parentId: string) {
    this.send('CREATE_OSDL_NODE', { node, parentId } as CreateOSDLNodePayload);
  }

  async createOSDLNodeAwaitable(node: any, parentId: string, actionId?: string, isAgentRequest?: boolean): Promise<any> {
    const id = actionId || crypto.randomUUID();
    this.send('CREATE_OSDL_NODE', { node, parentId, actionId: id, isAgentRequest } as CreateOSDLNodePayload);
    return this.waitForActionResult(id);
  }

  save(shopId?: string) {
    this.send('SAVE', { shopId } as { shopId?: string});
  }

  deleteOSDLNode(nodeId: string) {
    this.send('DELETE_OSDL_NODE', { nodeId } as DeleteOSDLNodePayload);
  }
  async deleteOSDLNodeAwaitable(nodeId: string, actionId?: string, isAgentRequest?: boolean): Promise<any> {
    const id = actionId || crypto.randomUUID();
    this.send('DELETE_OSDL_NODE', { nodeId, actionId: id, isAgentRequest } as any);
    return this.waitForActionResult(id);
  }
  async addPreBuiltSectionAwaitable(sectionId: string, parentId: string, name: string, order: number, actionId?: string, isAgentRequest?: boolean): Promise<any> {
    const id = actionId || crypto.randomUUID();
    this.send('ADD_PRE_BUILT_SECTION', { sectionId, parentId, name, order, actionId: id, isAgentRequest } as any);
    return this.waitForActionResult(id);
  }
	async getContextFromIframe(requestId: string, scope: string, details: any): Promise<any> {
		return new Promise((resolve) => {
			this.pendingContextResolvers.set(requestId, resolve);
			// Forward the request to the iframe itself
			this.send('REQUEST_LIVE_CONTEXT', { requestId, scope, details });
		});
	}

  // NEW: Site Settings Change Method
  sendSiteSettingsChange(payload: SiteSettingsChangedPayload) {
    this.send('SITE_SETTINGS_CHANGED', payload);
  }

  // NEW: Node Update Methods
  updateNode(nodeId: string, changes: Record<string, any>) {
    this.send('UPDATE_NODE', { 
      nodeId, 
      changes
    } as UpdateNodePayload);
  }


  // NEW: Layout Node Interaction Method
  sendLayoutNodeInteraction(payload: LayoutNodeInteractionPayload) {
    this.send('LAYOUT_NODE_INTERACTION', payload);
  }

  // NEW: Agent Change Action Method
  sendAgentChangeAction(action: 'undo' | 'redo', actionId: string, change?: any, all?: boolean, agentChanges?: any[] | Map<string, any>) {
    this.send('AGENT_CHANGE_ACTION', { action, actionId, change, all, agentChanges } as AgentChangeActionPayload);
  }

  toggleUserMode(isUserMode: boolean, user?: any) {
    this.send('USER_MODE_TOGGLE', { isUserMode, user } as UserModeTogglePayload);
  }

  cleanup() {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.messageHandlers.clear();
    this.lastMessages.clear();
    this.pendingReadyMessages = [];
    this.iframe = null;
    this.isReady = false;
  }
} 
