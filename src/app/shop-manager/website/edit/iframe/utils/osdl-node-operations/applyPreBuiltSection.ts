import { SectionNode } from '@/OSDL/OSDL.types';
import { prebuiltSections } from '@/prebuilt-sections';

export interface ApplyPreBuiltSectionDependencies {
  createOSDLNode: (node: any, parentId: string, isAgentRequest?: boolean) => void;
}

const applyPreBuiltSection = async (
  sectionId: string,
  parentId: string,
  name: string,
  order: number,
  deps: ApplyPreBuiltSectionDependencies,
  isAgentRequest?: boolean
): Promise<{ success: boolean; error?: string; sectionId?: string; name?: string; createdSection?: any }> => {
  console.log('[applyPreBuiltSection] Applying pre-built section:', { sectionId, parentId, name, order });

  // Get the pre-built section from registry
  const sectionTemplate = prebuiltSections[sectionId];
  
  if (!sectionTemplate) {
    console.error('[applyPreBuiltSection] Unknown section ID:', sectionId);
    return { success: false, error: `Unknown section ID: ${sectionId}` };
  }

  // Create the new section with dynamic fields
  const newSection: SectionNode = {
    id: `section-${crypto.randomUUID().slice(0, 8)}`,
    name,
    order,
    ...sectionTemplate.schema,
    children: sectionTemplate.schema.children.map((child: any) => ({
      ...child,
      id: `${child.id}-${crypto.randomUUID().slice(0, 8)}` // Generate unique IDs for children
    }))
  };

  // Use the existing createOSDLNode function to add it to the page
  try {
    deps.createOSDLNode(newSection, parentId, isAgentRequest); // Pass through the isAgentRequest parameter
    return { success: true, sectionId: newSection.id, name: newSection.name, createdSection: newSection };
  } catch (error) {
    console.error('[applyPreBuiltSection] Failed to create pre-built section:', error);
    return { success: false, error: `Failed to create pre-built section: ${error}` };
  }
};

export default applyPreBuiltSection; 