import { BuildDefaultField } from "../../utils";

// Button Content Field (text input, not textarea)
export const buttonContentField = BuildDefaultField({
  id: "content",
  type: "text",
  label: "",
  dataPath: "params.content",
  rendererConfig: {
    placeholder: "Enter button text...",
    enableOverrides: false,
    showLabel: false,
    dir: "row",
    className: "flex-1 min-w-0"
  }
});

