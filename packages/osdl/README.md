# OSDL

OSDL (Okiynai Site Description Language) is a declarative, JSON-based language for describing modern, dynamic websites. It defines page structure, styling, data requirements, and interactions in a single schema that can be rendered by a runtime.

Motivation:
- Unify structure, design, data, and behavior in one portable document.
- Enable fast iteration on pages without hand-writing React for every layout.
- Make page generation and edits feasible for both humans and AI agents.

How it’s used:
- Pages are defined as OSDL `PageDefinition` objects.
- The renderer interprets those definitions at runtime to produce a UI.
- Data requirements and actions are declared in the schema, not hand-wired in code.
- Editors can manipulate the same schema (in a separate repo) to drive visual editing.

Technical overview:
- OSDL is a node tree. Every element is a `Node` with common fields (id, type, order, params), plus type-specific fields (atom, section, component, codeblock).
- Layout and positioning are declarative (`layout`, `positioning`, `inlineStyles`, `responsiveOverrides`). These are transformed into runtime styles by the renderer utilities.
- Data requirements are declared on nodes. At render time, data providers resolve those requirements and bind the results into expressions (e.g. `{{ data.product.name }}`).
- Actions and interaction handlers are declared in the schema and executed by the action executor at runtime (e.g. state updates, modal control, navigation).
- The renderer processes the tree, resolves responsive/locale overrides, merges styles, and renders atoms/components while honoring loading/placeholder behavior.

Runtime flow (high-level):
1. Load a `PageDefinition` and global `SiteSettings`.
2. Normalize and process nodes (responsive + locale overrides, data bindings).
3. Resolve data requirements and populate data contexts.
4. Render the tree via `NodeRenderer`, which delegates to atoms/components.
5. Execute declarative actions through the action executor as events fire.

Example: minimal page definition
```ts
import type { PageDefinition, SectionNode, AtomNode, Node } from "@/OSDL.types";

const header: SectionNode = {
  id: "header",
  type: "section",
  name: "Header",
  order: 0,
  layout: { mode: "flex", justifyContent: "space-between", alignItems: "center" },
  children: [
    {
      id: "brand",
      type: "atom",
      atomType: "Text",
      order: 0,
      params: { content: "OSDL", tag: "h1" }
    } as AtomNode
  ]
};

export const page: PageDefinition = {
  id: "home",
  schemaVersion: "osdl_v3.1",
  name: "Home",
  route: "/",
  pageType: "static",
  nodes: [header as Node]
};
```

Example: expressions and bindings
```ts
// Expressions are strings wrapped in {{ ... }}
params: {
  content: "{{ data.product.name || 'Untitled' }}",
  color: "{{ state.isOnSale ? 'var(--primary)' : 'var(--text)' }}"
}
```

Example: renderer usage (simplified)
```tsx
import OkiynaiPageRenderer from "@/osdl/OkiynaiPageRenderer";
import OkiynaiPageWithDataContext from "@/osdl/OkiynaiPageWithDataContext";

<OkiynaiPageWithDataContext pageDefinition={page} routeParams={{}}>
  <OkiynaiPageRenderer pageDefinition={page} showDevInfo={false} />
</OkiynaiPageWithDataContext>
```

Structure:
- `core/` OSDL types, renderer, atoms, components, and runtime utilities.
- `docs/` Human-readable specification and documentation.
- `llm/` LLM-focused spec and prompting guidance.
- `examples/` Example OSDL pages, prebuilt sections, and renderer usage.
- `integrations/` Integration notes and app glue.

Source of truth:
- `core/OSDL.types.ts` is the primary source of truth for the OSDL schema. Treat it as the reference bible for structure, fields, and behavior.

What’s included:
- Renderer + runtime: `core/osdl/`
- Type definitions: `core/OSDL.types.ts`
- Atoms and components: `core/osdl/atoms/`, `core/osdl/components/`
- Default page demo: `examples/osdl-demos/default-demo.ts`
- Prebuilt sections: `examples/prebuilt-sections/`
- Renderer usage example: `examples/renderer-usage/`

How to explore:
1. Start with `docs/OSDL.md` for the spec.
2. Check `examples/osdl-demos/default-demo.ts` for a full page definition.
3. See `examples/renderer-usage/` for wiring the renderer in a Next.js app.
4. Dive into `core/OSDL.types.ts` for the full schema.

Notes:
- This directory is not initialized as a git repo yet.
- Paths and module aliases may need adjustment when extracted.
