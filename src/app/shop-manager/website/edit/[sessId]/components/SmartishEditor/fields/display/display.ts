import { Field } from "../../types";
import { defaultReader, defaultMutatorsCreator } from "../../utils";
export { DisplayRenderer } from "./DisplayRenderer";

// Enhanced display field with integrated layout controls
export const displayField: Field = {
  id: "display",
  rendererKey: "display",
  showOverrides: true,
  interactionsInlineStyle: "display",
  rendererConfig: {
    type: "select",
    label: "Display",
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    options: [
      { value: "block", name: "block" },
      { value: "inline", name: "inline" },
      { value: "inline-block", name: "inline-block" },
      { value: "flex", name: "flex" },
      { value: "grid", name: "grid" },
      { value: "none", name: "none" }
    ]
  },
  reader: (node, siteSettings) => {
    // Get display value
    let displayValue;
    if(node.type === 'section') {
      const base = defaultReader({ type: "select", dataPath: "layout.mode", interactionsInlineStyle: "display" }, node, siteSettings);
      displayValue = base.value;
    } else {
      const base = defaultReader({ type: "select", dataPath: "params.display", interactionsInlineStyle: "display" }, node, siteSettings);
      displayValue = base.value;
    }

    // For sections, also get layout values
    if (node.type === 'section') {
      const sectionNode = node as any;
      const layout = sectionNode.layout || {};
      
      // Generate initial grid templates if not present
      const gridColumns = layout.gridColumns || 1;
      const gridColumnsUnit = layout.gridColumnsUnit || 'fr';
      const gridRows = layout.gridRows || 1;
      const gridRowsUnit = layout.gridRowsUnit || 'fr';
      
      let gridTemplateColumns = layout.gridTemplateColumns || '';
      let gridTemplateRows = layout.gridTemplateRows || '';
      
      // Generate templates if not already set
      if (!gridTemplateColumns && gridColumns && gridColumnsUnit) {
        if (gridColumnsUnit === 'auto') {
          gridTemplateColumns = `repeat(${gridColumns}, auto)`;
        } else {
          gridTemplateColumns = `repeat(${gridColumns}, 1${gridColumnsUnit})`;
        }
      }
      
      if (!gridTemplateRows && gridRows && gridRowsUnit) {
        if (gridRowsUnit === 'auto') {
          gridTemplateRows = `repeat(${gridRows}, auto)`;
        } else {
          gridTemplateRows = `repeat(${gridRows}, 1${gridRowsUnit})`;
        }
      }
      
      return {
        value: {
          display: displayValue,
          direction: layout.direction || 'row',
          flexWrap: layout.flexWrap || 'nowrap',
          justifyContent: layout.justifyContent || 'flex-start',
          alignItems: layout.alignItems || 'stretch',
          gap: layout.gap || 0,
          rowGap: layout.rowGap || 0,
          columnGap: layout.columnGap || 0,
          gridColumns: gridColumns,
          gridColumnsUnit: gridColumnsUnit,
          gridRows: gridRows,
          gridRowsUnit: gridRowsUnit,
          gridTemplateColumns: gridTemplateColumns,
          gridTemplateRows: gridTemplateRows,
          gridJustifyItems: layout.gridJustifyItems || 'stretch',
          gridAlignItems: layout.gridAlignItems || 'stretch'
        },
        overrides: [] // Will be handled by individual field overrides
      };
    }

    return { value: displayValue, overrides: [] };
  },
  createMutators: (node, onIframeUpdate) => {
    if(node.type === 'section') {
      return {
        update: (value: any, ctx?: any) => {
          console.log('[Display Field] Section mutator update called with:', { value, ctx, nodeId: node.id });
          if (!onIframeUpdate) {
            console.error('[Display Field] onIframeUpdate is not available');
            return;
          }
          
          // Handle display mode change
          if (typeof value === 'string') {
            console.log('[Display Field] Updating display mode to:', value);
            const changes = { 
              layout: { 
                mode: value 
              } 
            };
            console.log('[Display Field] Sending changes:', changes);
            onIframeUpdate(node.id, changes);
            return;
          }
          
          // Handle layout object update
          if (typeof value === 'object' && value.display) {
            console.log('[Display Field] Updating layout object:', value);
            const layoutChanges: any = { mode: value.display };
            if (value.direction !== undefined) layoutChanges.direction = value.direction;
            if (value.flexWrap !== undefined) layoutChanges.flexWrap = value.flexWrap;
            if (value.justifyContent !== undefined) layoutChanges.justifyContent = value.justifyContent;
            if (value.alignItems !== undefined) layoutChanges.alignItems = value.alignItems;
            if (value.gap !== undefined) layoutChanges.gap = value.gap;
            if (value.rowGap !== undefined) layoutChanges.rowGap = value.rowGap;
            if (value.columnGap !== undefined) layoutChanges.columnGap = value.columnGap;
            if (value.gridColumns !== undefined) layoutChanges.gridColumns = value.gridColumns;
            if (value.gridColumnsUnit !== undefined) layoutChanges.gridColumnsUnit = value.gridColumnsUnit;
            if (value.gridRows !== undefined) layoutChanges.gridRows = value.gridRows;
            if (value.gridRowsUnit !== undefined) layoutChanges.gridRowsUnit = value.gridRowsUnit;
            if (value.gridTemplateColumns !== undefined) layoutChanges.gridTemplateColumns = value.gridTemplateColumns;
            if (value.gridTemplateRows !== undefined) layoutChanges.gridTemplateRows = value.gridTemplateRows;
            if (value.gridJustifyItems !== undefined) layoutChanges.gridJustifyItems = value.gridJustifyItems;
            if (value.gridAlignItems !== undefined) layoutChanges.gridAlignItems = value.gridAlignItems;
            
            const changes = { layout: layoutChanges };
            console.log('[Display Field] Sending layout changes:', changes);
            onIframeUpdate(node.id, changes);
          }
        },
        // createOverride: () => {},
        // removeOverride: () => {}
      };
    } else {
      console.log('[Display Field] Creating non-section mutators for node:', node.id);
      const mutators = defaultMutatorsCreator({ type: "select", dataPath: "params.display" }, node, onIframeUpdate, "display");
      console.log('[Display Field] Non-section mutators created:', Object.keys(mutators));
      return mutators;
    }
  }
};


// ================================
// Visibility field (all nodes)
// ================================
export const visibilityField: Field = {
  id: "visibility",
  rendererKey: "default",
  showOverrides: true,
  interactionsInlineStyle: "visibility",
  rendererConfig: {
    type: "segmented",
    label: "Visibility",
    dir: "row",
    className: "!ml-auto",
    options: [
      { value: "visible", name: "Visible" },
      { value: "hidden", name: "Hidden" },
      { value: "collapse", name: "Collapse" }
    ]
  },
  reader: (node, siteSettings) => {
    return defaultReader({ type: "segmented", dataPath: "params.visibility", interactionsInlineStyle: "visibility" }, node, siteSettings);
  },
  createMutators: (node, onIframeUpdate, interactionsInlineStyle) => {
    return defaultMutatorsCreator({ type: "segmented", dataPath: "params.visibility" }, node, onIframeUpdate, interactionsInlineStyle || 'visibility');
  }
};

