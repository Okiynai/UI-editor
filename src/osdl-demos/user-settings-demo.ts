import { PageDefinition, ComponentNode } from "@/OSDL/OSDL.types";

export const getUserSettingsDemoPageDefinition = (
  routeParams: Record<string, string>
): PageDefinition => {
  const userSettingsNode: ComponentNode = {
    id: "user-settings-component-node",
    type: "component",
    componentType: "UserSettings",
    order: 0,
    name: "User Settings Component",
    params: {},
  } as any;

  const page: PageDefinition = {
    id: "user-settings-demo-page",
    schemaVersion: "osdl_v3.1",
    name: "User Settings Demo",
    route: "/user-settings-demo",
    pageType: "static",
    nodes: [userSettingsNode],
  } as PageDefinition;

  return page;
};


