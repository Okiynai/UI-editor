import { Node, SiteSettings }  from "@/OSDL/OSDL.types";
import { CommonSectionsSchema, AtomNodesSchemas, ComponentNodesSchemas } from "./SectionsSchemas";
import { Field, Section } from "./types";
import { useIframeCommunicationContext } from "../../context/IframeCommunicationContext";
import { ExpandableSection } from "./ExpandableSection";
import { rendererRegistry } from "./RenderersRegistery";

interface SmartishEditorProps {
  node: Node;
  AIResponse?: any;
  siteSettings: SiteSettings;
  pageDefinitionNodes?: Node[];
}

export default function SmartishEditor({
  node,
  AIResponse,
  siteSettings,
  pageDefinitionNodes,
}: SmartishEditorProps) {
  // Get iframe communication context
  const { handleUpdateNode } = useIframeCommunicationContext();
  
  // Step 1: Get the full schema for this node type
  // This combines atom-specific sections with general styling sections,
  // ensuring no duplicates while maintaining proper order
  const fullNodeSchema = getFullNodeSchema(node, siteSettings);

  // Step 2: Transform AI response into ordered sections and show more sections
  const { orderedSections, showMoreSections } =
    transformAIResponse(fullNodeSchema, AIResponse);

  return (
    <>
      {/* Render the sections */}
      {orderedSections.map((section, idx) => (
        <SchemaSectionRenderer
          key={section.id}
          section={section}
          isLast={idx === orderedSections.length - 1 && showMoreSections.length === 0}
          node={node}
          onIframeUpdate={handleUpdateNode}
          siteSettings={siteSettings}
          pageDefinitionNodes={pageDefinitionNodes}
        />
      ))}

      {showMoreSections.length > 0 && (
        <ExpandableSection title="Show More">
          {showMoreSections.map((section, idx) => (
            <SchemaSectionRenderer
              key={section.id}
              section={section}
              isLast={idx === showMoreSections.length - 1}
              node={node}
              onIframeUpdate={handleUpdateNode}
              siteSettings={siteSettings}
              pageDefinitionNodes={pageDefinitionNodes}
            />
          ))}
        </ExpandableSection>
      )}
    </>
  );
}

/* 
  * helpers and utils 
*/

/**
 * Gets the full schema for a node by merging atom-specific sections
 * with general styling sections from SectionsOrder.
 * 
 * Order: "layout" section first, then "order" section, then atom/section-specific sections, 
 * then remaining general styling sections (background, dimensions, spacing, etc.)
 */
const getFullNodeSchema = (node: Node, siteSettings: SiteSettings): Section[] => {
  // Helper to recursively prune sections without any renderable fields
  const pruneSection = (section: Section): Section | null => {
    const children = section.children ?? [];
    const prunedChildren = children
      .map((child) => {
        if (child.type === 'field') {
          const visible = child.field.shouldRender ? child.field.shouldRender(node, siteSettings) : true;
          return visible ? child : null;
        } else {
          const pruned = pruneSection(child.section);
          return pruned ? { type: 'section', section: pruned } as const : null;
        }
      })
      .filter(Boolean) as NonNullable<Section['children']>;

    if (prunedChildren.length === 0) return null;
    return { ...section, children: prunedChildren };
  };

  if (node.type === 'atom') {
    const atomSchema = AtomNodesSchemas[node.atomType];
    if (!atomSchema) {
      return CommonSectionsSchema.map(pruneSection).filter(Boolean) as Section[];
    }

    // Get the "layout" section first, then "order" section, then atom sections, then remaining general sections
    const layoutSection = CommonSectionsSchema.find(section => section.id === 'layout')!;
    const orderSection = CommonSectionsSchema.find(section => section.id === 'order')!;
    const remainingSections = CommonSectionsSchema.filter(section => section.id !== 'layout' && section.id !== 'order');
    const merged = [layoutSection, orderSection, ...atomSchema, ...remainingSections];
    return merged.map(pruneSection).filter(Boolean) as Section[];
  } else if (node.type === 'section') {
    // No dedicated SectionNodeSchema; use common sections only
    return CommonSectionsSchema.map(pruneSection).filter(Boolean) as Section[];
  } else if ((node as any).type === 'component') {
    const compType = (node as any).componentType;
    const compSchema = ComponentNodesSchemas[compType];
    if (!compSchema) {
      return CommonSectionsSchema.map(pruneSection).filter(Boolean) as Section[];
    }

    const layoutSection = CommonSectionsSchema.find(section => section.id === 'layout')!;
    const orderSection = CommonSectionsSchema.find(section => section.id === 'order')!;
    const remainingSections = CommonSectionsSchema.filter(section => section.id !== 'layout' && section.id !== 'order');
    const merged = [layoutSection, orderSection, ...compSchema, ...remainingSections];
    return merged.map(pruneSection).filter(Boolean) as Section[];
  } else {
    return CommonSectionsSchema.map(pruneSection).filter(Boolean) as Section[];
  }
};

/**
 * Transforms AI response into ordered sections and show more sections.
 * 
 * If AI response is null/empty:
 * - Returns the full node schema as ordered sections
 * - Returns empty array for show more sections
 * 
 * If AI response contains section ordering:
 * - Reorders sections according to AI preferences
 * - Identifies sections to show more prominently
 */
const transformAIResponse = (
  nodeSchema: Section[], 
  AIResponse: any
): { orderedSections: Section[]; showMoreSections: Section[] } => {
  // If no AI response, return default ordering
  if (!AIResponse) {
    return {
      orderedSections: [...nodeSchema],
      showMoreSections: []
    };
  }

  // TODO: Implement AI-driven section reordering logic
  console.error("TODO: Implement AI-driven section reordering logic for \"Smartish Editor\"");

  // For now, return the default schema
  return {
    orderedSections: [...nodeSchema],
    showMoreSections: []
  };
};

/**
 * Recursive component that renders sections based on their new clean schema
 * Now uses ExpandableSection component for cleaner separation of concerns
 */
interface SchemaSectionRendererProps {
  section: Section;
  depth?: number;
  isLast?: boolean;

  node: Node;
  siteSettings: SiteSettings;
  pageDefinitionNodes?: Node[];

  onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void;
}

const SchemaSectionRenderer: React.FC<SchemaSectionRendererProps> = 
({ section, depth = 0, isLast, node, onIframeUpdate, siteSettings, pageDefinitionNodes }) => {

  // If section is not expandable, render children in a simple container
  if (!section.expandable) {
    return (
      <div className={`pl-${depth * 4}`}>
        <div className={`mx-2 px-2 py-3`}>
          {section.title && 
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              {section.title}
            </h3>
          }
          <div className="space-y-2">
            {section.children?.map((child) => {
              if (child.type === 'field') {
                return (
                  <FieldHost 
                    key={child.field.id} 
                    field={child.field} 
                    node={node} 
                    onIframeUpdate={onIframeUpdate}
                    pageDefinitionNodes={pageDefinitionNodes}
                    siteSettings={siteSettings}
                  />
                );
              } else if (child.type === 'section') {
                return (
                  <SchemaSectionRenderer 
                    key={child.section.id} 
                    section={child.section} 
                    depth={depth + 1}
                    node={node}
                    onIframeUpdate={onIframeUpdate}
                    pageDefinitionNodes={pageDefinitionNodes}
                    siteSettings={siteSettings}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
        {!isLast && (
          <div className="mx-2">
            <div className="px-2">
              <div className="mx-auto w-[100%] h-px bg-gray-300" />
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Expandable section - use the dedicated component
  const isSubsection = depth > 0;
  
  return (
    <div className={isSubsection ? "pl-0" : `pl-${depth * 4}`}>
      <ExpandableSection
        title={section.title || ''}
        depth={0} // Override depth to 0 for subsections to avoid pl-4
        defaultExpanded={section.expanded ?? false}
        buttonClassName={isSubsection ? "w-full text-left px-0 py-1.5 text-xs font-medium text-gray-800 hover:text-gray-900 transition-colors flex items-center justify-between" : undefined}
        titleClassName={isSubsection ? "truncate" : undefined}
        iconClassName={isSubsection ? "text-base font-medium" : undefined}
        contentClassName={isSubsection ? "px-0 pb-3" : undefined}
      >
        {/* Render children */}
        <div className="space-y-2">
          {section.children?.map((child) => {
            if (child.type === 'field') {
              return (
                <FieldHost
                  key={child.field.id}
                  field={child.field}
                  node={node}
                  onIframeUpdate={onIframeUpdate}
                  pageDefinitionNodes={pageDefinitionNodes}
                  siteSettings={siteSettings}
                />
              );
            } else if (child.type === 'section') {
              return (
                <SchemaSectionRenderer
                  key={child.section.id}
                  section={child.section}
                  depth={depth + 1}
                  node={node}
                  onIframeUpdate={onIframeUpdate}
                  pageDefinitionNodes={pageDefinitionNodes}
                  siteSettings={siteSettings}
                />
              );
            }
            return null;
          })}
        </div>
      </ExpandableSection>
      {/* Small centered separator aligned with ExpandableSection padding */}
      {/* No border bottom for depth = 1 (subsections) */}
      {!isLast && depth !== 1 && (
        <div className={`pl-0 mx-2`}>
          <div className="px-2">
            <div className="mx-auto w-[100%] h-px bg-gray-300" />
          </div>
        </div>
      )}
    </div>
  );
};

// Field host props - handles the field logic
interface FieldHostProps {
  field: Field;

  node: Node;
  siteSettings: SiteSettings;
  pageDefinitionNodes?: Node[];

  onIframeUpdate: (nodeId: string, changes: Record<string, any>) => void;
}

const FieldHost: React.FC<FieldHostProps> = 
({ field, node, onIframeUpdate, siteSettings, pageDefinitionNodes }) => {
  // Get the current value using the field's reader
  const reader = field.reader;
  if (!reader) {
    return (
      <div className="py-2 text-red-500">
        Error: No reader specified for field {field.id}
      </div>
    );
  }

  const data = reader(node, siteSettings, pageDefinitionNodes);
  
  // Require new mutator factory
  if (typeof field.createMutators !== 'function') {
    return (
      <div className="py-2 text-red-500">
        Error: No mutator factory (createMutators) specified for field {field.id}
      </div>
    );
  }
  const mutations = field.createMutators(node, onIframeUpdate, field.interactionsInlineStyle, pageDefinitionNodes);
  
  // Get the renderer for this field
  const rendererKey = field.rendererKey;
  if (!rendererKey) {
    return (
      <div className="py-2 text-red-500">
        Error: No renderer key specified for field {field.id}
      </div>
    );
  }
  
  const Renderer = rendererRegistry[rendererKey];
  if (!Renderer) {
    return (
      <div className="py-2 text-red-500">
        Error: Renderer '{rendererKey}' not found in registry
      </div>
    );
  }
  
  // If field has a library, get the library data from site settings
  let libraryData = undefined;
  if (field.library && siteSettings) {
    libraryData = siteSettings.globalStyleVariables?.[field.library];
  }
  
  return (
    <Renderer
      data={data}
      mutations={mutations}
      config={field.rendererConfig}
      library={field.library}
      libraryData={libraryData}
      showOverrides={field.showOverrides ?? false}
      siteSettings={siteSettings}
      pageDefinitionNodes={pageDefinitionNodes}
      interactionsInlineStyle={field.interactionsInlineStyle}
    />
  );
};