import { BuildDefaultField } from "../../utils";

// Link Content Field (text input, not textarea)
export const linkContentField = BuildDefaultField({
  id: "content",
  type: "text",
  label: "",
  dataPath: "params.content",
  rendererConfig: {
    enableOverrides: false,
    showLabel: false,
    placeholder: "Enter link text...",
    dir: "row",
    className: "flex-1 min-w-0"
  }
});

// Href Field
export const linkHrefField = BuildDefaultField({
  id: "href",
  type: "text",
  label: "URL",
  dataPath: "params.href",
  rendererConfig: {
    enableOverrides: false,
    placeholder: "https://example.com",
    dir: "row",
    className: "flex-1 min-w-0"
  }
});

// Target Field
export const linkTargetField = BuildDefaultField({
  id: "target",
  type: "select",
  label: "Target",
  dataPath: "params.target",
  rendererConfig: {
    enableOverrides: false,
    dir: "row",
    className: "!ml-auto min-w-[100px]",
    options: [
      { value: "_self", title: "Same Tab" },
      { value: "_blank", title: "New Tab" },
      { value: "_parent", title: "Parent" },
      { value: "_top", title: "Top" }
    ]
  }
});

// Rel Field
export const linkRelField = BuildDefaultField({
  id: "rel",
  type: "text",
  label: "Rel",
  dataPath: "params.rel",
  rendererConfig: {
    enableOverrides: false,
    placeholder: "e.g., noopener noreferrer",
    dir: "row",
    className: "flex-1 min-w-0"
  }
});
