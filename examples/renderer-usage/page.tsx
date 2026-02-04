import React from "react";
import OkiynaiPageRenderer from "../../core/osdl/OkiynaiPageRenderer";
import OkiynaiPageWithDataContext from "../../core/osdl/OkiynaiPageWithDataContext";
import type { PageDefinition, SectionNode, AtomNode, Node } from "../../core/OSDL.types";

const header: SectionNode = {
  id: "header",
  type: "section",
  name: "Header",
  order: 0,
  layout: { mode: "flex", justifyContent: "space-between", alignItems: "center" },
  params: { padding: "24px", backgroundColor: "var(--primary)" },
  children: [
    {
      id: "brand",
      type: "atom",
      atomType: "Text",
      order: 0,
      params: { content: "OSDL", tag: "h1", color: "white", fontSize: "28px" }
    } as AtomNode
  ]
};

const hero: SectionNode = {
  id: "hero",
  type: "section",
  name: "Hero",
  order: 1,
  layout: { mode: "flex", direction: "column", gap: "12px" },
  params: { padding: "32px" },
  children: [
    {
      id: "title",
      type: "atom",
      atomType: "Text",
      order: 0,
      params: { content: "Declarative Pages, Rendered", tag: "h2" }
    } as AtomNode,
    {
      id: "subtitle",
      type: "atom",
      atomType: "Text",
      order: 1,
      params: {
        content: "OSDL turns a JSON schema into a real UI with data and actions.",
        tag: "p",
        color: "#334155"
      }
    } as AtomNode
  ]
};

const pageDefinition: PageDefinition = {
  id: "demo",
  schemaVersion: "osdl_v3.1",
  name: "OSDL Renderer Demo",
  route: "/",
  pageType: "static",
  nodes: [header as Node, hero as Node]
};

export default function Page() {
  return (
    <main style={{ width: "100%" }}>
      <OkiynaiPageWithDataContext pageDefinition={pageDefinition} routeParams={{}}>
        <OkiynaiPageRenderer pageDefinition={pageDefinition} showDevInfo={false} />
      </OkiynaiPageWithDataContext>
    </main>
  );
}
