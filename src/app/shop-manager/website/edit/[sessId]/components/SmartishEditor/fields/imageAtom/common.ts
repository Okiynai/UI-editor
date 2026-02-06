import { BuildDefaultField } from "../../utils";

// Image Fitting Field (object-fit)
export const imageFittingField = BuildDefaultField({
  id: "imageFitting",
  type: "select",
  label: "Fit",
  dataPath: "params.objectFit",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    enableOverrides: false, // Enable overrides for this field
    options: [
      { value: "cover", label: "Cover" },
      { value: "contain", label: "Contain" },
      { value: "fill", label: "Fill" },
      { value: "scale-down", label: "Scale Down" },
      { value: "none", label: "None" }
    ]
  }
});

// Object Position Field
export const objectPositionField = BuildDefaultField({
  id: "objectPosition",
  type: "select",
  label: "Position",
  dataPath: "params.objectPosition",
  rendererConfig: {
    dir: "row",
    className: "!ml-auto min-w-[140px]",
    enableOverrides: false, // Disable overrides for this field
    options: [
      { value: "center", label: "Center" },
      { value: "top", label: "Top" },
      { value: "bottom", label: "Bottom" },
      { value: "left", label: "Left" },
      { value: "right", label: "Right" },
      { value: "top-left", label: "Top Left" },
      { value: "top-right", label: "Top Right" },
      { value: "bottom-left", label: "Bottom Left" },
      { value: "bottom-right", label: "Bottom Right" }
    ]
  }
});
