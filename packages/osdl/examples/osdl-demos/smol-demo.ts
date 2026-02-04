import { PageDefinition, SectionNode, Node } from "@/OSDL.types";
import { navbar, heroSection } from "../prebuilt-sections";

export const getSmolDemoPageDefinition = (routeParams: Record<string, string>): PageDefinition => {
  // Use pre-built navbar section
  const navbarSection: SectionNode = {
    ...navbar,
    id: "navbar-section",
    name: "Demo Navbar",
    order: 0
  };

  // Use pre-built hero section
  const heroSectionNode: SectionNode = {
    ...heroSection,
    id: "hero-section",
    name: "Demo Hero",
    order: 1
  };

  // Page definition
  const smolDemoPage: PageDefinition = {
    id: "smol-demo-page",
    schemaVersion: "osdl_v3.1",
    name: "Smol Navbar Demo",
    route: "/smol-demo",
    pageType: "static",
    nodes: [navbarSection as Node, heroSectionNode as Node]
  };

  return smolDemoPage;
};

export const smolDemo = getSmolDemoPageDefinition({ id: "123" });
