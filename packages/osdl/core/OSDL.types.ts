// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Okiynai Site Description Language (OSDL) V1 TypeScript Types
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/**
 * --- OSDL Expression Syntax & Capabilities ---
 *
 * OSDL uses a powerful JavaScript-like expression syntax inside `{{ ... }}` placeholders
 * to enable dynamic and interactive content. This allows you to bind node properties
 * not just to data, but to the result of calculations, conditions, and state changes.
 *
 * === 1. Data Access ===
 *
 * Accessing data from various contexts is the foundation of the syntax.
 *
 *   - **Dot Notation:** For standard object properties.
 *     Ex: `{{ data.product.name }}`
 *
 *   - **Bracket Notation (Strings):** For properties with special characters or for dynamic access.
 *     Both single and double quotes are supported.
 *     Ex: `{{ states['nav-menu'].isOpen }}`
 *
 *   - **Bracket Notation (Numbers):** For accessing array elements by their index.
 *     Ex: `{{ data.product.images[0] }}`
 *
 *   - **Nested Access:** Combine dot and bracket notation to access deep data structures.
 *     Ex: `{{ states['product-gallery'].images[state.currentImageIndex].url }}`
 *
 *
 * === 2. Operators & Logic ===
 *
 * You can perform logic directly inside your expressions.
 *
 *   - **Arithmetic Operators:** Perform calculations.
 *     Ex: `{{ (data.product.priceInCents / 100) * 1.15 }}` // Add 15% tax
 *
 *   - **Comparison Operators:** Compare values to produce `true` or `false`.
 *     Used heavily for conditional visibility and styling.
 *     Operators: `==`, `!=`, `>`, `>=`, `<`, `<=`
 *     Ex: `{{ user.loginCount > 0 }}`
 *     Ex: `{{ state.activeTab === 'profile' }}`
 *
 *   - **Logical Operators:** Combine multiple conditions.
 *     Operators: `&&` (and), `||` (or)
 *     Ex: `{{ user.isLoggedIn && user.cart.itemCount > 0 }}`
 *
 *   - **Ternary Operator (`? :`):** The most powerful tool for conditional logic. It lets
 *     you choose between two values based on a condition.
 *     Syntax: `condition ? value_if_true : value_if_false`
 *     Ex: `{{ state.isExpanded ? 'Collapse' : 'Expand' }}` // Dynamic button text
 *     Ex: `{{ user.score > 50 ? 'var(--success)' : 'var(--error)' }}` // Dynamic color
 *
 *
 * === 3. Fallbacks & Safe Access ===
 *
 * Expressions handle missing data gracefully.
 *
 *   - **Logical OR (`||`):** Provide a fallback value if the primary data is `null`,
 *     `undefined`, `false`, `0`, or an empty string.
 *     Ex: `{{ user.profile.firstName || "Guest" }}`
 *
 *   - **Safe Navigation (`get()` function):** For accessing deeply nested properties that
 *     might not exist, use the built-in `get()` function to prevent errors. It's the
 *     safest way to access data that might be loading or optional.
 *     Syntax: `get(object, 'path.to.value', fallback_value)`
 *     Ex: `{{ get(data, 'product.reviews[0].author', 'Anonymous') }}`
 *
 *
 * === 4. Built-in Helper Functions ===
 *
 * A set of safe, custom functions are available to format and process data.
 *
 *   - `toFixed(number, digits)`: Formats a number to a specific number of decimal places.
 *     Ex: `{{ toFixed(data.product.priceInCents / 100, 2) }}` // -> "19.99"
 *
 *   - `toUpperCase(string)`: Converts a string to uppercase.
 *     Ex: `{{ toUpperCase(item.category) }}`
 *
 *   - `toLowerCase(string)`: Converts a string to lowercase.
 *
 *   - `len(array_or_string)`: Returns the length of an array or string.
 *     Ex: `{{ len(data.product.tags) }}`
 *
 *   - `includes(array_or_string, value)`: Checks if an array or string contains a value.
 *     Ex: `{{ includes(user.roles, 'admin') }}`
 *
 *
 * --- Data Binding Contexts ---
 * 
 * Data and state values are accessible throughout the OSDL schema in string properties
 * using the `{{ context.path.to.value }}` template syntax. The available contexts
 * depend on where the binding is being used (e.g., in a node parameter vs. inside an action).
 * 
 * 
 * === Universal Contexts (Available Everywhere) ===
 * 
 * These contexts are available for resolving properties on any node.
 * 
 *   - `{{ data... }}`: Accesses page-level data fetched from `PageDefinition.dataSource`.
 *     Ex: `{{ data.mainProduct.name }}`
 * 
 *   - `{{ nodeData... }}`: Accesses node-level data fetched from a node's `dataRequirements`.
 *     Ex: `{{ nodeData.relatedItems[0].name }}`
 * 
 *   - `{{ state... }}`: Accesses a value from the **current node's own** internal state object.
 *     Ex: `{{ state.isExpanded }}`
 * 
 *   - `{{ parentState... }}`: Accesses a value from the **direct parent node's** internal state.
 *     Ex: `{{ parentState.activeTab }}`
 * 
 *   - `{{ states... }}`: Accesses the internal state of **any node on the page** by its ID. This is the
 *     most flexible way to access state from a distant node.
 *     Ex: `{{ states['tab-group-container'].activeTab }}`
 * 
 *   - `{{ page... }}`: Accesses metadata about the current page.
 *     Ex: `{{ page.routeParams.productId }}`, `{{ page.name }}`
 * 
 *   - `{{ site... }}`: Accesses the entire global `siteSettings` object.
 *     Ex: `{{ site.name }}`, `{{ site.globalStyleVariables.colors.primary }}`
 * 
 *   - `{{ viewport... }}`: Accesses the browser's viewport dimensions.
 *     Ex: `{{ viewport.width }}`, `{{ viewport.height }}`
 * 
 *   - `{{ user... }}`: Accesses information about the currently authenticated user.
 *     Ex: `{{ user.profile.firstName }}`
 * 
 * 
 * === Action-Specific Contexts ===
 * 
 * These contexts are ONLY available for resolving properties inside an `Action`'s `params` object.
 * 
 *   - `{{ formData... }}`: Accesses values from input atoms within a form context (`isFormContext: true`).
 *     **Scope**: Available in actions triggered by events like `onSubmit` or `onClick` from within the form.
 *     Ex: `{{ formData.email_input }}`
 * 
 *   - `{{ actionResults... }}`: Accesses the data returned by a preceding asynchronous action within a chain.
 *     **Scope**: Available only in the `onSuccess` or `onError` blocks of an action like `executeRQL`.
 *     Ex: `{{ actionResults.formSubmission.ticketId }}`
 * 
 *   - `{{ event... }}`: Accesses the immediate value from the browser event that triggered the action. This is
 *     useful for avoiding state-lag issues.
 *     **Scope**: Currently implemented for `onChange` event handlers on `Input` atoms.
 *     Ex: `{{ event.value }}`
 *
 *  === Repeater-Specific Contexts ===
 *
 * These contexts are ONLY available for resolving properties inside a `repeater.template` node.
 * 
 *   - `{{ item... }}`: Accesses the data object for the current item in the iteration.
 *     Ex: `{{ item.name }}`, `{{ item.price }}`
 * 
 *   - `{{ index }}`: Accesses the zero-based index of the current item in the iteration.
 *     Ex: `<div class="item-{{ index }}">`
 *
 *   - `{{ repeater.nodeId }}`: Accesses the final, generated ID of the current node being rendered.
 *     Ex: `id="{{ repeater.nodeId }}"` resolves to "product_card_0"
 *
 *   - `{{ repeater.parentId }}`: Accesses the final, generated ID of the direct parent of the current node.
 * 
 */

import { CartItem } from "@/types/cart";

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// 2. Global Configuration
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// 2.1. Site Settings (`siteSettings.json`)

/**
 * Defines the types of parameters that can be used throughout the site.
 * Used by the builder UI to generate controls and for validation.
 */
export interface ParamDefinition {
  /** The type of the parameter, influencing how it's displayed and validated. */
  type: 'color' | 'image' | 'string' | 'number' | 'boolean' | 'font' | 'spacingUnit' | 'choice';
  /** Human-readable label for the builder UI. */
  label: string;
  /** Optional description for the parameter. */
  description?: string;
  /** Default value for the parameter. */
  defaultValue?: any;
  /** For 'choice' type, an array of available options. */
  options?: Array<{ label: string; value: any }>;
  /** Validation rules for builder UI input. */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string; // Regex pattern
  };
}

/**
 * Defines site-wide configurations.
 */
export interface SiteSettings {
  /** Version of the OSDL schema being used (e.g., "osdl_v3.0"). */
  schemaVersion: string;
  /** Name of the Shop/Site. */
  name: string;
  /** Optional URL for the site logo. */
  logoUrl?: string;
  /** Optional URL for the site favicon. */
  faviconUrl?: string;
  /** Default locale for the site (e.g., "en-US"). */
  defaultLocale: string;
  /** Array of supported locales. */
  supportedLocales?: string[];

  /**
   * Global definitions for parameter types available in the builder.
   * Keys are parameter IDs (e.g., "brandColor", "bodyFont").
   */
  paramDefinitions?: Record<string, ParamDefinition>;

  /**
   * Global style variables (CSS Custom Properties) for theming.
   * These can be referenced in node styles, e.g., "var(--primary-color)".
   */
  globalStyleVariables?: {
    colors?: Record<string, string>; // e.g., { "primary": "#FF0000", "accent": "rgba(0,0,255,0.8)" }
    fonts?: Record<string, string>; // e.g., { "heading": "Arial, sans-serif", "body": "Roboto, sans-serif" }
    spacing?: Record<string, string>; // e.g., { "small": "8px", "medium": "16px" }
    /** Breakpoint definitions used for responsive overrides. Key is breakpoint name, value is CSS media query. */
    breakpoints?: Record<ResponsiveBreakpointName, string>; // e.g., { "mobile": "max-width: 767px" }
    // ... other categories like typography
  };

  /** Default SEO settings for the site. */
  seo?: {
	llmTxt?: string;
    defaultTitle?: string;
    titleSuffix?: string;
    defaultDescription?: string;
    defaultKeywords?: string[];
    socialImage?: string; // URL
  };

  /** Configuration for integrations with external services (API keys, etc.). */
  integrations?: Record<string, any>;

  /** Settings for the AI Shop Keeper (future use). */
  aiShopKeeper?: {
    personality?: string;
    brandVoiceGuidelines?: string;
  };
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// 3. Page Structure (`[pageName].json`)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/** Defines the type of the page. */
export type PageType = 'static' | 'dynamic' | 'system'; // system pages: 404, cart, checkout

// --- RQL & Data Source Integration Types ---

/**
 * A direct representation of a single RQL query,
 * matching the structure your RQL server expects.
 */
export interface RQLQuery {
  contract: string;
  params?: Record<string, any>; // Can be templated
  select: RQLSelectObject;
}

export interface RQLSelectObject {
  [fieldName: string]: true | { select: RQLSelectObject };
}

/**
 * The source type for an RQL data requirement.
 */
export interface RQLSource {
  type: 'rql';
  /**
   * An object where each key is a logical name for a query, and the value
   * is the RQL query itself. This allows a single data requirement
   * to batch multiple RQL queries together.
   */
  queries: Record<string, RQLQuery>;
}

export interface ApiDataSource {
  type: 'apiEndpoint' | 'graphQLQuery' | 'cmsCollection' | 'mockData';
  query: string;
  variables?: Record<string, any>;
  dataPath?: string;
}

export type NodeDataSource = RQLSource | ApiDataSource;


export type DataSourceConfig = 
  | {
      type: 'rql';
      sourceParams: {
        queries: Record<string, RQLQuery>;
      };
    }
  | {
      type: 'productDetail';
      sourceParams: {
        productId?: string;
        [key: string]: any;
      };
    }
  | {
      type: 'staticContent';
      sourceParams: {
        content?: any;
        [key: string]: any;
      };
    }
  | {
      type: 'mockData';
      sourceParams: {
        mockProductId?: string;
        [key: string]: any;
      };
    };

/**
 * Defines the structure and content of a single page.
 */
export interface PageDefinition {
  /** Unique ID for the page (e.g., "home", "product-detail"). */
  id: string;
  /** Version of the OSDL schema used for this page (e.g., "osdl_v3.0"). */
  schemaVersion: string;
  /** Human-readable page name (for builder UI). */
  name: string;
  /** URL path for the page (e.g., "/", "/products", "/products/[productId]"). */
  route: string;
  /** Type of the page. */
  pageType: PageType;

  /** Configuration for dynamic data fetching, if applicable. */
  dataSource?: DataSourceConfig;

  /** SEO settings specific to this page, overriding site defaults. */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    socialImage?: string; // URL
    canonicalUrl?: string; // URL
  };

  /**
   * Root nodes of the page. Order in this array, combined with `order`
   * property on each node, determines initial rendering sequence.
   */
  nodes: Node[];

  /**
   * Page-specific CSS variables or raw CSS string or structured CSS object.
   * Rarely needed; prefer global or node-level styling.
   */
  pageStyles?: string | Record<string, string>;

  /** AI-specific metadata for this page. */
  aiContext?: {
    purpose?: string; // e.g., "Homepage", "Product Listing", "Lead Capture"
    targetAudience?: string;
    conversionGoal?: string;
  };

  /** Specifies additional, independent data requirements for this node. */
  dataRequirements?: DataRequirementConfig[];
  /**
   * Defines actions to be triggered by various events on this node.
   */
  eventHandlers?: EventHandlersConfig;
  
  /** System-specific properties for pages like 'index' (for redirects) or other system pages. */
  systemPageProps?: Record<string, any>;
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// 4. The Node System (Core OSDL)
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

/** Defines the type of a node in the OSDL tree. */
export type NodeType = 'section' | 'atom' | 'component' | 'codeblock';

/**
 * Defines names for responsive breakpoints.
 * These keys should correspond to definitions in `SiteSettings.globalStyleVariables.breakpoints`.
 */
export type ResponsiveBreakpointName = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide' | string;

// --- BaseNode property types ---

/**
 * Configuration for 2D/3D transformations.
 */
export interface TransformProps {
  translate?: string; // e.g., "50px, -20px" or "50%"
  translateX?: string;
  translateY?: string;
  translateZ?: string;
  scale?: number | string; // e.g., 1.1 or "1.1, 0.9"
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotate?: string;    // e.g., "45deg"
  rotateX?: string;
  rotateY?: string;
  rotateZ?: string;
  skew?: string;      // e.g., "10deg, 5deg"
  skewX?: string;
  skewY?: string;
  perspective?: string; // e.g., "1000px"
  transformOrigin?: string; // e.g., "center center", "top left"
  transformStyle?: 'flat' | 'preserve-3d'; // CSS transform-style property
  backfaceVisibility?: 'visible' | 'hidden'; // CSS backface-visibility property
}

/**
 * Configuration for advanced positioning, transformations, and z-indexing.
 */
export interface PositioningConfig {
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;
  transform?: TransformProps;
  clipPath?: string; // e.g., "polygon(...)"
}

/**
 * Defines a single keyframe in an animation.
 */
export interface KeyframeDefinition {
  /** Offset of the keyframe, from 0 to 1. */
  offset: number;
  /** CSS properties to animate at this keyframe. */
  styles: Record<string, string | number>;
}

/**
 * Configuration for animation timing.
 */
export interface AnimationTimingConfig {
  durationMs: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | string; // string for cubic-bezier
  iterations?: number | 'infinite'; // Default 1
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both'; // Default 'none'
}

/**
 * Configuration for what triggers an animation.
 */
export interface AnimationTriggerConfig {
  type: 'load' | 'hover' | 'click' | 'scroll_into_view' | 'scroll_progress';
  delayMs?: number; // For 'load', 'scroll_into_view'
  targetElementId?: string; // Defaults to the current node
  scrollSettings?: {
    once?: boolean; // For 'scroll_into_view': trigger only once (default true)
    offset?: string | { top?: string; bottom?: string }; // e.g., "100px from bottom", "center"
    start?: string; // For 'scroll_progress', e.g., "top center" (element's top at viewport center)
    end?: string;   // e.g., "bottom top" (element's bottom at viewport top)
    scrub?: boolean | number; // true or a smoothing factor (0-1)
  };
}

/**
 * Defines a single animation rule applied to a node.
 */
export interface AnimationRule {
  /** Unique ID for this animation rule on the node. */
  id: string;
  /** Optional descriptive name for the builder UI. */
  name?: string;
  trigger: AnimationTriggerConfig;
  /** Array of keyframes or name of a predefined global animation (string). */
  keyframes: KeyframeDefinition[] | string;
  timing: AnimationTimingConfig;
}

/**
 * Defines the animation timing for a single CSS property.
 */
export interface TransitionDefinition {
  /** The CSS property to be transitioned (e.g., "opacity", "transform"). */
  prop: string;
  /** The duration of the transition in milliseconds. */
  durationMs: number;
  /** An optional delay in milliseconds before the transition starts. */
  waitDurationMs?: number;
  /** The CSS easing function (e.g., "ease-in-out", "cubic-bezier(...)"). Defaults to 'ease'. */
  easing?: string;
}

/**
 * Defines style changes for a node during interaction states.
 */
export interface NodeStyleChanges {
  /** Direct CSS style overrides. */
  inlineStyles?: Record<string, string | number>;
  
  /** 
   * An array of individual transition definitions.
   * This replaces the old single transition object.
   */
  transitions?: TransitionDefinition[];
  
  // params?: Record<string, any>; // OSDL V1 mentions this, deferring to inlineStyles/transitions for simplicity now
}

/**
 * Configuration for styling nodes based on interaction states.
 */
export interface InteractionStatesConfig {
  hover?: NodeStyleChanges;
  focus?: NodeStyleChanges;
  active?: NodeStyleChanges; // e.g., mouse button down
}

/**
 * Configuration for conditional visibility of a node.
 */
export interface NodeVisibilityConfig {
  /** Simple static hide/show, can be overridden by expression. */
  hidden?: boolean;

  /**
   * [DEPRECATED - use expression] An array of conditions.
   * @deprecated Use a more expressive `expression` instead.
   */
  conditions?: Array<{
    /** Path to a value within the rendering context. */
    contextPath: string;
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'contains' | 'notContains' | 'exists' | 'notExists' | 'regex';
    /** Value to compare against. Not needed for 'exists'/'notExists'. */
    value?: any;
  }>;
  /**
   * [DEPRECATED - use expression] How to combine multiple conditions (default AND).
   * @deprecated Use a more expressive `expression` instead.
   */
  conditionLogic?: 'AND' | 'OR';

  /**
   * A single JavaScript-like expression that must evaluate to a truthy value for the node to be visible.
   * Ex: "{{ user.isLoggedIn && states['cart-icon'].itemCount > 0 }}"
   */
  expression?: string;
}

/**
 * Configuration for overriding node properties based on locale.
 */
export interface LocaleOverrideConfig {
  /** Node parameters to override for this locale (e.g., text content). */
  params?: Record<string, any>;
  /** Layout properties to override (e.g., for LTR/RTL adjustments). */
  layout?: Partial<LayoutConfig>; // Defined later
  /** Positioning properties to override. */
  positioning?: Partial<PositioningConfig>;
  /** Visibility settings to override for this locale. */
  visibility?: Partial<NodeVisibilityConfig>;
  /** Override for the node's order within its parent. */
  order?: number;
}

/**
 * Configuration for skeleton placeholders.
 */
export interface SkeletonConfig {
  shape?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
  lines?: number; // For text skeleton
  color?: string;
}

/**
 * Configuration for node behavior during data loading.
 */
export interface LoadingBehaviorConfig {
  /** Type of placeholder to show while data is loading. */
  placeholderType: 'skeleton' | 'spinner' | 'custom_node' | 'none';
  /** Configuration for skeleton placeholders. */
  skeletonConfig?: SkeletonConfig;
  spinnerColor?: string; // e.g., "var(--primary)" or "#FF0000"
  customPlaceholderNodeId?: string; // ID of another node in the page definition to use as a placeholder
  /** Minimum display time for the loader in milliseconds to prevent flickering. */
  minLoaderDurationMs?: number;
}

/**
 * Configuration for attaching custom JavaScript logic or React hooks to a node.
 */
export interface CustomLogicConfig {
  /** Unique ID for this logic block within the node. */
  id: string;
  trigger: 'onMount' | 'onUpdate' | 'onUnmount' | 'onEvent' | 'onDataChange';
  eventSource?: {
    targetNodeId?: string; // Defaults to self
    eventName: string; // e.g., "click", "customEvent"
  };
  /** For 'onDataChange', array of contextPaths to monitor. */
  dataChangeWatchPaths?: string[];
  scriptLanguage: 'javascript' | 'react_hook_definition';
  /** The code string. See OSDL V3/V3.1 for examples and execution context. */
  script: string;
  /**
   * For 'react_hook_definition' or 'onUpdate' trigger, array of dependency paths
   * (e.g., "props.text", "data.product.id") that trigger re-evaluation/re-run.
   */
  dependencies?: string[];
}

/**
 * Configuration for a single data requirement for a node.
 */
export interface DataRequirementConfig {
  /** A unique key for this data requirement within the node. */
  key: string;
  /** Describes the source and query for the data. */
  source: NodeDataSource;
  /** If true, rendering of this node waits for this data. Default: true. */
  blocking?: boolean;
  /** Optional: How long to cache this data in milliseconds. */
  cacheDurationMs?: number;
  /** Optional: Default value if data fails to load or is not yet available. */
  defaultValue?: any;
}

// --- OSDL V1.2 Event Handler & Action System ---

export type EventTriggerType =
  | 'onMount'        // When the node is first rendered/mounted.
  | 'onClick'        // User clicks the node.
  | 'onSubmit'       // A form containing this node is submitted.
  | 'onChange'       // The value of an input node changes.
  | 'onMouseEnter'   // Mouse cursor enters the node's area.
  | 'onMouseLeave'   // Mouse cursor leaves the node's area.
  | 'onFocus'
  | 'onBlur'
  | 'onCustomEvent'; // Listens for a custom event dispatched by another action.

export type EventHandlersConfig = Partial<Record<EventTriggerType, Action[]>>;

export type ActionType =
  | 'updateNodeState'  // The workhorse: declaratively change any property of another node.
  | 'updateState'      // For managing client-side node state 
  | 'submitData'       // Send data to an API endpoint.
  | 'navigate'         // Change the page route.
  | 'scrollTo'         // Scroll to an element on the page.
  | 'dispatchEvent'    // For advanced, decoupled communication.
  | 'openModal'        // Syntactic sugar for updating a modal's visibility.
  | 'closeModal'       // Syntactic sugar.
  | 'resetForm'        // Syntactic sugar for clearing form inputs.
  | 'executeRQL'       // For executing RQL queries/mutations.
  | 'refetchPageData'  // NEW: Triggers a refetch of the page's main data source.
  | 'apiCall'         // Kept for compatibility/other uses.
  | 'addItemToCart';   // NEW: Add an item to the cart (uses CartContext)

/** For 'updateNodeState': The most powerful action for UI manipulation. */
export interface UpdateNodeStateParams {
  /** The ID of the node to update. */
  targetNodeId: string;
  /**
   * A partial node definition containing the properties to merge into the target node.
   * This can change anything: params, visibility, positioning, layout, etc.
   * Example: { "visibility": { "hidden": false }, "params": { "content": "New Text!" } }
   */
  updates: Partial<Omit<BaseNode, 'id' | 'type'>>;
  resultKey?: string;
}

/** For 'submitData': Handles all API requests. */
export interface SubmitDataParams {
  /** The API endpoint to send the data to. Can use templating. */
  endpoint: string;
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  /**
   * Defines the request body. Values can be static, from the main data context,
   * or from form inputs using the `{{ formData.INPUT_ID }}` or `{{ formData.INPUT_NAME }}` template.
   */
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

/** For 'navigate' */
export interface NavigateParams {
  url: string;
  newTab?: boolean;
}

/** For 'scrollTo' */
export interface ScrollToParams {
  targetNodeId: string;
  options?: { behavior?: 'smooth' | 'auto'; block?: 'start' | 'center' | 'end'; };
}

/** For 'dispatchEvent' */
export interface DispatchEventParams {
  eventName: string;
  detail?: Record<string, any>;
}

/** For 'addItemToCart' */
export interface AddItemToCartParams {
  productId: string;
  quantity?: number;
  customizations?: CartItem['customizations'] | null;
  product: CartItem['product'];
}

/** For 'openModal' and 'closeModal' (Syntactic Sugar for `updateNodeState`) */
export interface OpenModalParams {
  modalNodeId: string;
}
export interface CloseModalParams {
  modalNodeId?: string; // If omitted, closes the most recently opened modal.
}

/** For 'resetForm' (Syntactic Sugar) */
export interface ResetFormParams {
  formNodeId: string; // The ID of the SectionNode with `isFormContext: true`.
}

/** For 'executeRQL' */
export interface ExecuteRQLParams {
  /** A single RQL query to execute. */
  query: RQLQuery;
  /**
   * A key to store the result of the mutation under,
   * accessible in onSuccess/onError actions via {{ actionResults.resultKey.fieldName }}
   */
  resultKey?: string;
}

/** For 'refetchPageData' */
export interface RefetchPageDataParams {
    // No parameters needed for this action, but defining for consistency.
    queryKeys?: string[]; // Future use for more granular refetching
}

/** For 'apiCall' */
export interface ApiCallParams {
  // Define params for generic api call if needed, for now keep it simple
  [key: string]: any;
}

/** For 'updateState': Modifies the internal client-side state of a node. */
export interface UpdateStateParams {
  /** The ID of the node whose state will be updated. Defaults to the current node if omitted. */
  targetNodeId?: string;
  /**
   * An object where keys are state variable names and values are the new values.
   * Values can be static or resolved from the data context (e.g., "{{ formData.my_input }}").
   */
  updates: Record<string, any>;
}


export type ActionParams =
  | UpdateNodeStateParams
  | UpdateStateParams
  | SubmitDataParams
  | NavigateParams
  | ScrollToParams
  | DispatchEventParams
  | OpenModalParams
  | CloseModalParams
  | ResetFormParams
  | ExecuteRQLParams
  | RefetchPageDataParams
  | ApiCallParams
  | AddItemToCartParams;

export interface Action {
  /** A unique ID for this action step, used for debugging and keys. */
  id: string;
  /** The type of action to perform. This determines the required `params`. */
  type: ActionType;
  /** Optional delay in milliseconds before executing this action. */
  delayMs?: number;
  /** Optional conditions that must be met for this action to execute. */
  conditions?: NodeVisibilityConfig['conditions'];
  conditionLogic?: 'AND' | 'OR';
  /** Parameters specific to the action type. */
  params: ActionParams;
  /** Actions to execute if an async action (like submitData or executeRQL) succeeds. */
  onSuccess?: Action[];
  /** Actions to execute if an async action fails. */
  onError?: Action[];
}

/**
 * Base interface for all node types.
 */
export interface BaseNode {
  /** Unique identifier for this node instance within the page. CRITICAL. */
  id: string;
  /** Type of the node. */
  type: NodeType;
  /** Optional descriptive name for the builder UI. */
  name?: string;
  /** Defines rendering order within its parent's `children` array or `PageDefinition.nodes`. */
  order: number;
  /**
   * Initial key-value store for client-side state.
   * This state can be modified by 'updateState' actions and accessed
   * in templates via `{{ state.key }}`.
   */
  state?: Record<string, any>;
  /**
   * Parameters specific to this node instance. Structure depends on node type
   * and atomType/componentType. Validated by the builder using internal schemas.
   */
  params: Record<string, any>;
  /**
   * A string of Tailwind CSS classes to be applied to the node's root element.
   * This allows for rapid, utility-first styling. These classes are applied alongside
   * styles generated from layout, positioning, and params. Inline styles generated
   * by other properties will override Tailwind classes due to CSS specificity.
   * Ex: "p-4 m-2 bg-blue-500 rounded-lg shadow-md hover:bg-blue-600"
   */
  className?: string;
  /** Advanced positioning, transformations, and z-indexing. */
  positioning?: PositioningConfig;
  /** Animations applied to this node. */
  animations?: AnimationRule[];
  /** Styling for different interaction states (hover, focus, active). */
  interactionStates?: InteractionStatesConfig;
  /** Conditional visibility of the node. */
  visibility?: NodeVisibilityConfig;
  /** Notes for AI: purpose, hints for generation/modification, etc. */
  remarksAI?: string;
  /** Locale-specific overrides for node properties. Key is locale string (e.g., "fr-FR"). */
  localeOverrides?: Record<string, LocaleOverrideConfig>;
  /** Defines behavior during data loading states. */
  loadingBehavior?: LoadingBehaviorConfig;
  /** Allows attaching custom JavaScript logic or React hooks. */
  customLogic?: CustomLogicConfig[];
  /** Specifies additional, independent data requirements for this node. */
  dataRequirements?: DataRequirementConfig[];
  /**
   * Defines actions to be triggered by various events on this node.
   */
  eventHandlers?: EventHandlersConfig;
  /**
   * Breakpoint-specific overrides.
   * The value is a partial configuration of the node, allowing overrides for most properties.
   */
  responsiveOverrides?: Record<ResponsiveBreakpointName, ResponsiveOverrideConfig>;
}

// --- Specific Node Type Interfaces (extending BaseNode) ---

/**
 * Defines spacing for padding/margin (top, right, bottom, left).
 */
export interface SpacingObject {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

/**
 * Configuration for layout of children within a SectionNode.
 */
export interface LayoutConfig {
  mode: 'flow' | 'flex' | 'grid'; // Default 'flow'
  padding?: string | SpacingObject;
  margin?: string | SpacingObject;
  width?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  maxWidth?: string;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  // Flexbox specific
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap?: string; // For flex and grid
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  // Grid specific
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
  gridJustifyItems?: 'stretch' | 'start' | 'center' | 'end';
  gridAlignItems?: 'stretch' | 'start' | 'center' | 'end';
  // Grid gap properties
  rowGap?: number;
  columnGap?: number;
  // Grid template generation
  gridColumns?: number;
  gridColumnsUnit?: 'fr' | 'px' | '%' | 'auto';
  gridRows?: number;
  gridRowsUnit?: 'fr' | 'px' | '%' | 'auto';
  // gridGap is covered by 'gap' for simplicity.
}

/** Defines valid HTML tags for SectionNode container. */
export type ValidSectionHtmlTag = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav' | 'form';

/**
 * Defines the configuration for making a SectionNode render its children dynamically
 * based on an array from the data context.
 */
export interface RepeaterConfig {
  /**
   * Data-binding path to the source array.
   * Ex: "nodeData.products.items", "data.featuredArticles"
   */
  source: string;

  /**
   * A single Node object that will be used as a template for each item in the source array.
   * The `children` property of the SectionNode will be ignored if this is active.
   */
  template: Node;

  /**
   * Optional: Maximum number of items to render. Can be a template string.
   */
  limit?: number | string;

  /**
   * Optional: Configuration for generating unique IDs for the repeated nodes.
   */
  idStrategy?: {
    /** Separator between the base ID and the index (default: "_"). */
    separator?: string;
    /** If true, prefixes the ID with the parent repeater's generated ID. Essential for nested repeaters. */
    includeParentIds?: boolean;
    /** A static prefix for all generated node IDs within this repeater. */
    prefix?: string;
  };

  /**
   * Optional: A condition to filter the source array before rendering.
   * The `value` can be a template string.
   */
  filter?: {
    field: string; // Path to the field within the array item object.
    operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'notContains' | 'exists' | 'notExists';
    value?: any; // The value to compare against.
  };

  /**
   * Optional: Sort the array before rendering. `field` is a path within the item object.
   */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}


/**
 * Interface for SectionNode, a container for layout and grouping other nodes.
 */
export interface SectionNode extends BaseNode {
  type: 'section';
  /**
   * Child nodes (sections, atoms, components, etc.).
   * This property is IGNORED if the `repeater` property is configured and resolves to a valid array.
   */
  children: Node[];
  /** Defines how children are arranged. */
  layout: LayoutConfig;
  /** Optional direct styling for the section container itself. Use sparingly. */
  inlineStyles?: Record<string, string | number>;
  /** HTML tag for the section container (default: 'div'). */
  htmlTag?: ValidSectionHtmlTag;
  /**
   * If true, this section acts as a form, providing a FormContext to its children.
   * Its htmlTag should typically be 'form'.
   */
  isFormContext?: boolean;
  /**
   * If present, this SectionNode will dynamically generate its children
   * by iterating over a data array and rendering a template for each item.
   */
  repeater?: RepeaterConfig;
}

/**
 * String literal union for known Atom types. Extendable with `| string`.
 * Examples: 'Text', 'Image', 'Button', 'Icon', 'Video', 'Input', 'Form', 'Spacer', 'Divider', 'ThreeJSScene'
 */
export type AtomType = 
  | 'Text' | 'Image' | 'Button' | 'Icon' | 'Video' | 'Input' | 'Form' | 'Spacer' | 'Divider' 
  | 'ThreeJSScene' // Specialized atom for 3D scenes
  | 'ProgressBar' // New AtomType
  | 'Link' // Navigation link atom
  | string; // Allows for custom atom types

/**
 * Interface for AtomNode, the most basic, indivisible visual elements.
 */
export interface AtomNode extends BaseNode {
  type: 'atom';
  /**
   * Type of the atom (e.g., 'Text', 'Image', 'Button').
   * The builder uses this to find the specific parameter schema for `params`.
   */
  atomType: AtomType;
}

/**
 * String literal union for known Component types. Extendable with `| string`.
 * Examples: 'Navbar', 'Footer', 'HeroBanner', 'ProductGrid', 'TestimonialSlider'
 */
export type ComponentType =
  | 'Navbar' | 'Footer' | 'HeroBanner' | 'ProductGrid' | 'TestimonialSlider'
  | string; // Allows for custom component types

/**
 * Interface for ComponentNode, pre-built, reusable groups of nodes.
 */
export interface ComponentNode extends BaseNode {
  type: 'component';
  /**
   * Type of the component (e.g., 'Navbar', 'Footer', 'ProductGrid').
   * The builder uses this to find the specific parameter schema for `params`.
   */
  componentType: ComponentType;
}

/**
 * Interface for CodeBlockNode, for embedding custom code.
 */
export interface CodeBlockNode extends BaseNode {
  type: 'codeblock';
  params: {
    language: 'html' | 'css' | 'javascript' | 'react_component_jsx';
    code?: string; // Original source code (e.g., JSX). Can be optional if compiled URL is present.
    compiledComponentUrl?: string; // URL to the pre-compiled component JS file.

    executionContext?:
      | 'iframe_sandboxed'     // Default for html, javascript
      | 'direct_script'        // For javascript (less secure)
      | 'scoped_style_tag'     // Default for css
      | 'global_style_tag'     // For css
      | 'dynamic_component';   // Default for react_component_jsx
    sandboxAttributes?: string[]; // For 'iframe_sandboxed', e.g., ["allow-scripts", "allow-same-origin"]
    scopedCss?: boolean; // For CSS (true if executionContext is 'scoped_style_tag')
    dependencies?: string[]; // URLs for external libraries for JS/React
    props?: Record<string, any>; // Props passed to the React component or available in JS execution scope.
  } & BaseNode['params'];
}

/**
 * The main discriminated union type for any node in the OSDL tree.
 */
export type Node = SectionNode | AtomNode | ComponentNode | CodeBlockNode;


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// 4.6. Example Atom Parameters: ThreeJSScene (for illustration)
// This would be for an AtomNode: { type: 'atom', atomType: 'ThreeJSScene', params: ThreeJSSceneParams }
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export interface ThreeJSObjectAnimation {
  property: string; // e.g., "rotation.y", "position.x"
  loopType: 'once' | 'repeat' | 'pingpong';
  durationMs: number;
  keyframes: Array<{ time: number; value: number }>; // time (0-1), value
}

export interface ThreeJSObject {
  id: string;
  type: 'cube' | 'sphere' | 'gltf_model' | 'custom_geometry' | 'torus';
  sourceUrl?: string; // For gltf_model (URL)
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  material?: {
    type: 'basic' | 'standard' | 'phong';
    color?: string;
    textureUrl?: string; // URL
    // ... other material properties
  };
  animations?: ThreeJSObjectAnimation[];
}

export interface ThreeJSSceneParams {
  sceneSetup?: {
    cameraPosition?: [number, number, number];
    backgroundColor?: string; // hex or 'transparent'
    // ... other global scene settings
  };
  objects?: ThreeJSObject[];
  enableControls?: boolean; // e.g., OrbitControls
  // ... other Three.js related parameters
}

/**
 * Parameters for ProgressBarAtom.
 */
export interface ProgressBarAtomParams {
  value: number; // Current value of the progress bar
  max?: number;  // Maximum value (defaults to 100 if not HTML5 default)
  barColor?: string; // Color of the progress bar itself (e.g., "var(--primary)")
  trackColor?: string; // Color of the background track (e.g., "var(--backgroundSubtle)")
  width?: string; // e.g., "100%", "200px"
  height?: string; // e.g., "10px", "var(--spacing-small)"
  borderRadius?: string; // e.g., "4px", "var(--border-radius-medium)"
}

/**
 * Parameters for VideoAtom.
 */
export interface VideoAtomParams {
  src: string; // URL of the video file
  autoplay?: boolean; // Whether to autoplay the video
  loop?: boolean; // Whether to loop the video
  muted?: boolean; // Whether to mute the video
  controls?: boolean; // Whether to show video controls
  playsInline?: boolean; // Whether to play inline on mobile devices
  poster?: string; // URL of the poster image to show before the video plays
  width?: string | number; // Width of the video element
  height?: string | number; // Height of the video element
  objectFit?: string; // How the video should be resized to fit its container
}

/**
 * Parameters for InputAtom.
 */
export interface InputAtomParams {
  type?: string; // Input type (text, email, password, checkbox, radio, etc.)
  placeholder?: string; // Placeholder text
  value?: string; // Current value (for controlled components)
  defaultValue?: string; // Default value (for uncontrolled components)
  required?: boolean; // Whether the input is required
  disabled?: boolean; // Whether the input is disabled
  readOnly?: boolean; // Whether the input is read-only
  name?: string; // Name attribute for the input
  min?: number | string; // Minimum value (for number inputs)
  max?: number | string; // Maximum value (for number inputs)
  step?: number | string; // Step value (for number inputs)
  pattern?: string; // Validation pattern (for text inputs)
  autoComplete?: string; // Autocomplete attribute
  width?: string | number; // Width of the input element
  height?: string | number; // Height of the input element
  border?: string; // Border styling
  borderRadius?: string; // Border radius
  backgroundColor?: string; // Background color
  color?: string; // Text color
  fontSize?: string; // Font size
  padding?: string; // Padding
  margin?: string; // Margin
  outline?: string; // Outline styling
}

/**
 * Defines the structure for responsive overrides on a node.
 * This allows overriding a subset of a node's properties at specific breakpoints.
 * The specific overridable properties can vary slightly by node type.
 */
export interface ResponsiveOverrideConfig {
  params?: Record<string, any>;
  positioning?: Partial<PositioningConfig>;
  animations?: AnimationRule[];
  interactionStates?: Partial<InteractionStatesConfig>;
  visibility?: Partial<NodeVisibilityConfig>;
  order?: number;
  loadingBehavior?: Partial<LoadingBehaviorConfig>;
  
  // SectionNode specific overrides (will be part of SectionNode's effective ResponsiveOverrideConfig)
  layout?: Partial<LayoutConfig>;
  inlineStyles?: Record<string, string | number>;
  htmlTag?: ValidSectionHtmlTag;
  
  // Other node-type specific overrides can be conceptualized here
  // e.g. for CodeBlockNode, params might have a more specific override structure
  // but `params: Record<string, any>` is general enough.
}

/**
 * Represents a change suggested by an AI agent, ready to be applied to the UI state.
 */
export interface ParsedDiff {
    id: string;
    pageId: string;
    targetNodeId: string;
    propertyPath: string; // e.g., "params.text" or "layout.padding.top"
    search: string; // The old value (for verification, can be stringified)
    replace: string; // The new value (can be stringified)
    status: 'pending' | 'applied' | 'rejected';
}
