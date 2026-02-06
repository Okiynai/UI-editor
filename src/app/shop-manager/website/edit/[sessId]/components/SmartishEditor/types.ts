import { Node, SiteSettings } from '@/OSDL/OSDL.types';

export interface Section {
  id: string;
  title?: string;

  expandable?: boolean;
  expanded?: boolean;

  children?: SectionChild[];
}

// Section interface for organizing fields
type SectionChild = {
  type: 'field';
  field: Field;
} | {
  type: 'section';
  section: Section;
};

export type OSDLSiteLibrary = "colors" | "fonts"

// Self-contained field with built-in read/write methods
export interface Field {
  id: string;

  rendererKey: string;
  rendererConfig?: any;

  library?: OSDLSiteLibrary
  showOverrides?: boolean;

  // if the field controls a css-based value,
  // then we can show the interactions overrides
  // for that field.
  interactionsInlineStyle?: string;
  
  // Optional predicate to control conditional rendering of this field
  shouldRender?: (node: Node, siteSettings?: SiteSettings) => boolean;
  
  // Built-in read method - can return a rich read model or a primitive
  reader(node: Node, siteSettings?: SiteSettings, pageDefinitionNodes?: Node[] | null): any;

  // Mutator factory - preferred API
  createMutators?: (
    node: Node,
    onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void,
    interactionsInlineStyle?: string,
    pageDefinitionNodes?: Node[] | null,
  ) => any;
}

// Generic renderer contract - each renderer can specify its own types
export interface RendererProps<TData = any, TMutations = any, TConfig = any> {
  config?: TConfig;         // Typed configuration

  data: TData;           // Typed data
  mutations: TMutations;    // Typed mutations object

  library?: OSDLSiteLibrary;
  libraryData?: any;
  showOverrides?: boolean;

  siteSettings?: SiteSettings;
  
  // Optional context of the current page's nodes when available
  pageDefinitionNodes?: Node[];

  interactionsInlineStyle?: string;
}