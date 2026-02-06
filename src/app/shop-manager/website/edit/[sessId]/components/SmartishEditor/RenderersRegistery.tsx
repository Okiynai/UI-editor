import { RendererProps } from "./types";
import DefaultRenderer from "./utils/defaults/defaultRenderer";
import { OrderingRenderer } from "./fields/ordering";
import { BackgroundColorRenderer } from "./fields/backgroundColor";
import { SpacingRenderer } from "./fields/spacing";
import { DimensionsRenderer } from "./fields/dimensions";
import { TransformRenderer } from "./fields/transform";
import { PositionRenderer } from "./fields/position";
import { ShadowRenderer } from "./fields/effects";
import { ClipPathRenderer } from "./fields/effects";
import { BorderRenderer } from "./fields/border/BorderRenderer";
import { DisplayRenderer } from "./fields/display/display";
import { IconPickerRenderer } from "./fields/iconAtom/iconPicker";
import { ImageSrcFieldRenderer, FilterGroupRenderer } from "./fields/imageAtom";

export const rendererRegistry: Record<string, React.ComponentType<RendererProps>> = {
  'default': DefaultRenderer,
  'ordering': OrderingRenderer,
  'backgroundColor': BackgroundColorRenderer,
  'spacing': SpacingRenderer,
  'dimensions': DimensionsRenderer,
  'transform': TransformRenderer,
  'position': PositionRenderer,
  'shadow': ShadowRenderer,
  'clipPath': ClipPathRenderer,
  'border': BorderRenderer,
  'display': DisplayRenderer,
  'iconPicker': IconPickerRenderer,
  'imageSrc': ImageSrcFieldRenderer,
  'filterGroup': FilterGroupRenderer,
};