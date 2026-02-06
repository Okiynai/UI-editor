import { Section } from "./types";
import { BuildDefaultField } from "./utils";
import { textAtomContentField, fontSizeField, fontWeightField,
   backgroundColorField, orderingField, spacingField, dimensionsField, transformField, positionField, opacityField, shadowField, clipPathField, borderField, displayField,
   fontFamilyField, textColorField, lineHeightField, letterSpacingField, textAlignField, textTransformField, textDecorationField, textIndentField, verticalAlignField,
   iconPickerField, strokeWidthField, fillColorField, strokeColorField, sizeField,
   imageSrcField, imageFittingField, objectPositionField, filterGroupField,
   buttonContentField,
   linkContentField, linkHrefField, linkTargetField, linkRelField } from "./fields";
import { visibilityField } from "./fields/display/display";

export const CommonSectionsSchema: Section[] = [
  {
    id: "layout",
    title: "Layout",
    expandable: false,
    children: [
      { type: 'field', field: displayField },
      { type: 'field', field: visibilityField },
    ]
  },
  {
    id: "order",
    expandable: false,
    children: [
      { type: 'field', field: orderingField }
    ]
  },
  {
    id: "background",
    expandable: false,
    children: [
      { type: 'field', field: backgroundColorField }
    ]
  },
  {
    id: "position",
    expandable: false,
    children: [
      { type: 'field', field: positionField }
    ]
  },
  {
    id: "dimensions",
    expandable: false,
    children: [
      { type: 'field', field: dimensionsField }
    ]
  },
  {
    id: "spacing",
    expandable: false,
    children: [
      { type: 'field', field: spacingField }
    ]
  },
  {
    id: "transform",
    expandable: false,
    children: [
      { type: 'field', field: transformField }
    ]
  },
  {
    id: "border",
    expandable: false,
    children: [
      { type: 'field', field: borderField }
    ]
  },
  {
    id: "effects",
    title: "Effects",
    expandable: true,
    expanded: false,
    children: [
      { type: 'field', field: opacityField },
      { type: 'field', field: shadowField },
      { type: 'field', field: clipPathField },
    ]
  }
]; 

// Placeholder for atom schemas registry (coming soon)
export const AtomNodesSchemas: Record<string, Section[]> = {
  'Text': [
    {
      id: "content",
      expandable: false,
      children: [
        { type: 'field', field: textAtomContentField }
      ]
    },
    {
      id: "typography",
      title: "Typography",
      expandable: false,
      children: [
        { type: 'field', field: fontSizeField },
        { type: 'field', field: fontWeightField },
        { type: 'field', field: fontFamilyField },
        { type: 'field', field: textColorField },
        { type: 'field', field: lineHeightField },
        { type: 'field', field: letterSpacingField },
        { type: 'field', field: textAlignField },
        { type: 'field', field: textTransformField },
        { type: 'field', field: textDecorationField },
        {
          type: 'section',
          section: {
            id: "advancedText",
            title: "Advanced Text",
            expandable: true,
            expanded: false,
            children: [
              { type: 'field', field: textIndentField },
              { type: 'field', field: verticalAlignField }
              // Future enhancements (commented out for now):
              // { type: 'field', field: textShadowField },
              // { type: 'field', field: whiteSpaceField },
              // { type: 'field', field: wordBreakField },
              // { type: 'field', field: wordWrapField },
              // { type: 'field', field: hyphensField },
              // { type: 'field', field: textDirectionField }
            ]
          }
        }
      ]
    }
  ],
  'Icon': [
    {
      id: "icon",
      expandable: false,
      children: [
        { type: 'field', field: iconPickerField },
        { type: 'field', field: sizeField }
      ]
    },
    {
      id: "style",
      title: "Style",
      expandable: false,
      children: [
        { type: 'field', field: strokeWidthField },
        { type: 'field', field: strokeColorField },
        { type: 'field', field: fillColorField },
      ]
    }
  ],
  'Image': [
    {
      id: "source",
      title: "Source",
      expandable: false,
      children: [
        { type: 'field', field: imageSrcField }
      ]
    },
    {
      id: "fitting",
      title: "Image Fit",
      expandable: false,
      children: [
        { type: 'field', field: imageFittingField },
        { type: 'field', field: objectPositionField }
      ]
    },
    {
      id: "filters",
      title: "Image filters",
      expandable: true,
      expanded: false,
      children: [
        { type: 'field', field: filterGroupField }
      ]
    }
  ],
  'Button': [
    {
      id: "content",
      title: "Content",
      expandable: false,
      children: [
        { type: 'field', field: buttonContentField }
      ]
    },
    {
      id: "typography",
      title: "Typography",
      expandable: false,
      children: [
        { type: 'field', field: fontSizeField },
        { type: 'field', field: fontWeightField },
        { type: 'field', field: fontFamilyField },
        { type: 'field', field: textColorField },
        { type: 'field', field: lineHeightField },
        { type: 'field', field: letterSpacingField },
        { type: 'field', field: textAlignField },
        { type: 'field', field: textTransformField },
        { type: 'field', field: textDecorationField }
      ]
    }
  ],
  'Link': [
    {
      id: "content",
      title: "Content",
      expandable: false,
      children: [
        { type: 'field', field: linkContentField }
      ]
    },
    {
      id: "link",
      title: "Link Settings",
      expandable: false,
      children: [
        { type: 'field', field: linkHrefField },
        { type: 'field', field: linkTargetField },
        { type: 'field', field: linkRelField }
      ]
    },
    {
      id: "typography",
      title: "Typography",
      expandable: false,
      children: [
        { type: 'field', field: fontSizeField },
        { type: 'field', field: fontWeightField },
        { type: 'field', field: fontFamilyField },
        { type: 'field', field: textColorField },
        { type: 'field', field: lineHeightField },
        { type: 'field', field: letterSpacingField },
        { type: 'field', field: textAlignField },
        { type: 'field', field: textTransformField },
        { type: 'field', field: textDecorationField }
      ]
    }
  ],
  'Video': [
    {
      id: "source",
      title: "Source",
      expandable: false,
      children: []
    },
    {
      id: "controls",
      title: "Controls",
      expandable: false,
      children: []
    }
  ],
  'Input': [
    {
      id: "input",
      title: "Input",
      expandable: false,
      children: []
    },
    {
      id: "validation",
      title: "Validation",
      expandable: false,
      children: []
    }
  ],
  'ProgressBar': [
    {
      id: "progress",
      title: "Progress",
      expandable: false,
      children: []
    },
    {
      id: "appearance",
      title: "Appearance",
      expandable: false,
      children: []
    }
  ],
  'ThreeJSScene': [
    {
      id: "scene",
      title: "Scene",
      expandable: false,
      children: []
    },
    {
      id: "objects",
      title: "3D Objects",
      expandable: false,
      children: []
    }
  ]
};

// Minimal component schemas
export const cartAccentColorField = BuildDefaultField({
  id: "accentColor",
  type: "color",
  label: "Accent color",
  dataPath: "params.accentColor",
  rendererConfig: { enableOverrides: true },
  showOverrides: true,
  interactionsInlineStyle: "accentColor"
});

export const ComponentNodesSchemas: Record<string, Section[]> = {
  Cart: [
    {
      id: "cart",
      title: "Cart",
      expandable: false,
      children: [
        { type: 'field', field: cartAccentColorField },
        { type: 'field', field: iconPickerField },
      ]
    }
  ],
  Checkout: [
    {
      id: "checkout",
      title: "Checkout",
      expandable: false,
      children: [
        { type: 'field', field: iconPickerField },
      ]
    }
  ],
  ModalButton: [
    {
      id: "auth",
      title: "Auth Button",
      expandable: false,
      children: [
        { type: 'field', field: iconPickerField },
      ]
    }
  ]
};