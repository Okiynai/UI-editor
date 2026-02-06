import { PageDefinition, ComponentNode } from "@/OSDL/OSDL.types";

export const getCheckoutDemoPageDefinition = (
  routeParams: Record<string, string>
): PageDefinition => {
  const checkoutNode: ComponentNode = {
    id: "checkout-component-node",
    type: "component",
    componentType: "Checkout",
    order: 0,
    name: "Checkout Component",
    params: {},
  } as any;

  const page: PageDefinition = {
    id: "checkout-demo-page",
    schemaVersion: "osdl_v3.1",
    name: "Checkout Demo",
    route: "/checkout-demo",
    pageType: "static",
    nodes: [checkoutNode],
  } as PageDefinition;

  return page;
};


