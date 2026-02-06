import React from "react";
import { RendererProps } from "../../types";
import { Select } from "../../ControlsUI";
import { DragNumberInput } from "../../ControlsUI";
import { OverrideDisplay, OverrideCreatorWrapper } from "../../utils/defaults/OverrideUtils";

type ClipPathData = { value: string; overrides?: any[] };
type ClipPathMutations = { update?: (value: any, ctx?: any) => void };
type ClipPathConfig = { label?: string };

const options = [
  { value: "", label: "None" },
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "inset", label: "Inset" },
  { value: "polygon", label: "Polygon" },
  { value: "path", label: "Path" },
];

export const ClipPathRenderer: React.FC<RendererProps<ClipPathData, ClipPathMutations, ClipPathConfig>> = ({ data, mutations, config, showOverrides = false, siteSettings, interactionsInlineStyle }) => {
  const value = data?.value || "";
  const [kind, setKind] = React.useState<string>("");
  const [circleR, setCircleR] = React.useState<number>(50);
  const [ellipseRx, setEllipseRx] = React.useState<number>(50);
  const [ellipseRy, setEllipseRy] = React.useState<number>(50);
  const [insetTop, setInsetTop] = React.useState<number>(10);
  const [insetRight, setInsetRight] = React.useState<number>(10);
  const [insetBottom, setInsetBottom] = React.useState<number>(10);
  const [insetLeft, setInsetLeft] = React.useState<number>(10);
  const [polygonPoints, setPolygonPoints] = React.useState<string>("50% 0%, 100% 100%, 0% 100%");
  const [pathDef, setPathDef] = React.useState<string>("M10 10 H 90 V 90 H 10 Z");

  React.useEffect(() => {
    if (!value) { setKind(""); return; }
    const trimmed = value.trim();
    if (trimmed.startsWith("circle(")) {
      setKind("circle");
      const m = trimmed.match(/circle\(([^)]+)\)/);
      if (m) {
        const rStr = m[1].trim();
        const r = parseFloat(rStr);
        if (!isNaN(r)) setCircleR(r);
      }
    } else if (trimmed.startsWith("ellipse(")) {
      setKind("ellipse");
      const m = trimmed.match(/ellipse\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(/[\s,]+/).map(s => s.replace('%','').trim()).filter(Boolean);
        const rx = parseFloat(parts[0] || '50');
        const ry = parseFloat(parts[1] || '50');
        if (!isNaN(rx)) setEllipseRx(rx);
        if (!isNaN(ry)) setEllipseRy(ry);
      }
    } else if (trimmed.startsWith("inset(")) {
      setKind("inset");
      const m = trimmed.match(/inset\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(/[\s,]+/).map(s => s.replace('%','').trim()).filter(Boolean);
        const t = parseFloat(parts[0] || '10');
        const r = parseFloat(parts[1] || parts[0] || '10');
        const b = parseFloat(parts[2] || parts[0] || '10');
        const l = parseFloat(parts[3] || parts[1] || parts[0] || '10');
        if (!isNaN(t)) setInsetTop(t);
        if (!isNaN(r)) setInsetRight(r);
        if (!isNaN(b)) setInsetBottom(b);
        if (!isNaN(l)) setInsetLeft(l);
      }
    } else if (trimmed.startsWith("polygon(")) {
      setKind("polygon");
      const m = trimmed.match(/polygon\(([^)]+)\)/);
      if (m) setPolygonPoints(m[1].trim());
    } else if (trimmed.startsWith("path(")) {
      setKind("path");
      const m = trimmed.match(/path\(['"]?([^'"]+)['"]?\)/);
      if (m) setPathDef(m[1].trim());
    } else {
      setKind("");
    }
  }, [value]);

  const buildCss = (
    k: string,
    overrides?: Partial<{
      circleR: number;
      ellipseRx: number; ellipseRy: number;
      insetTop: number; insetRight: number; insetBottom: number; insetLeft: number;
      polygonPoints: string; pathDef: string;
    }>
  ) => {
    const r = overrides?.circleR ?? circleR;
    const rx = overrides?.ellipseRx ?? ellipseRx;
    const ry = overrides?.ellipseRy ?? ellipseRy;
    const t = overrides?.insetTop ?? insetTop;
    const rgt = overrides?.insetRight ?? insetRight;
    const btm = overrides?.insetBottom ?? insetBottom;
    const lft = overrides?.insetLeft ?? insetLeft;
    const poly = overrides?.polygonPoints ?? polygonPoints;
    const path = overrides?.pathDef ?? pathDef;
    switch (k) {
      case "circle": return `circle(${r}%)`;
      case "ellipse": return `ellipse(${rx}% ${ry}%)`;
      case "inset": return `inset(${t}% ${rgt}% ${btm}% ${lft}%)`;
      case "polygon": return `polygon(${poly})`;
      case "path": return `path('${path}')`;
      default: return "";
    }
  };
  const emit = (k?: string, overrides?: Parameters<typeof buildCss>[1]) => {
    const css = buildCss(k ?? kind, overrides);
    mutations?.update?.(css);
  };

  const label = config?.label || "Clip Path";

  return (
    <div className="space-y-2 relative group">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <Select 
          options={options} 
          value={kind} 
          onChange={(v) => { setKind(v); emit(v); }} 
          className="w-48"
        />
      </div>

      {kind === "circle" && (
        <DragNumberInput label="Radius %" unit="%" value={circleR} min={0} max={100} step={1} onChange={(n) => { setCircleR(n); emit("circle", { circleR: n }); }} />
      )}

      {kind === "ellipse" && (
        <div className="grid grid-cols-2 gap-3">
          <DragNumberInput label="Rx %" unit="%" value={ellipseRx} min={0} max={100} step={1} onChange={(n) => { setEllipseRx(n); emit("ellipse", { ellipseRx: n }); }} />
          <DragNumberInput label="Ry %" unit="%" value={ellipseRy} min={0} max={100} step={1} onChange={(n) => { setEllipseRy(n); emit("ellipse", { ellipseRy: n }); }} />
        </div>
      )}

      {kind === "inset" && (
        <div className="grid grid-cols-2 gap-3">
          <DragNumberInput label="Top %" unit="%" value={insetTop} min={0} max={100} step={1} onChange={(n) => { setInsetTop(n); emit("inset", { insetTop: n }); }} />
          <DragNumberInput label="Right %" unit="%" value={insetRight} min={0} max={100} step={1} onChange={(n) => { setInsetRight(n); emit("inset", { insetRight: n }); }} />
          <DragNumberInput label="Bottom %" unit="%" value={insetBottom} min={0} max={100} step={1} onChange={(n) => { setInsetBottom(n); emit("inset", { insetBottom: n }); }} />
          <DragNumberInput label="Left %" unit="%" value={insetLeft} min={0} max={100} step={1} onChange={(n) => { setInsetLeft(n); emit("inset", { insetLeft: n }); }} />
        </div>
      )}

      {kind === "polygon" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Points</label>
          <textarea className="w-full bg-gray-100 rounded-md p-2 text-sm" rows={3} placeholder="e.g. 50% 0%, 100% 100%, 0% 100%" value={polygonPoints} onChange={(e) => { setPolygonPoints(e.target.value); emit("polygon"); }} />
        </div>
      )}

      {kind === "path" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">SVG Path</label>
          <textarea className="w-full bg-gray-100 rounded-md p-2 text-sm" rows={3} placeholder="M10 10 H 90 V 90 H 10 Z" value={pathDef} onChange={(e) => { setPathDef(e.target.value); emit("path"); }} />
        </div>
      )}

      {showOverrides && (
        <OverrideDisplay overrides={(data as any)?.overrides || []} mutations={mutations} initOverrideState={true}>
          {(override) => {
            const ctx = override.scope === 'locale'
              ? { locale: override.key }
              : override.scope === 'interaction'
              ? { interaction: override.key }
              : { breakpoint: override.key };
            return (
              <OverrideClipPathControls
                initialValue={override.value || ''}
                onUpdate={(css) => mutations.update?.(css, ctx)}
              />
            );
          }}
        </OverrideDisplay>
      )}

      {showOverrides && (
        <OverrideCreatorWrapper
          className="bottom-[-5px]"
          fieldLabel="Clip Path"
          interactionsInlineStyle={interactionsInlineStyle || 'clipPath'}
          mutations={mutations}
          siteSettings={siteSettings}
          overrides={(data as any)?.overrides || []}
        />
      )}
    </div>
  );
};

export default ClipPathRenderer;



// Reusable controls for overrides: renders the same UI and emits CSS on change
const OverrideClipPathControls: React.FC<{
  initialValue: string;
  onUpdate: (css: string) => void;
}> = ({ initialValue, onUpdate }) => {
  const [kind, setKind] = React.useState<string>("");
  const [circleR, setCircleR] = React.useState<number>(50);
  const [ellipseRx, setEllipseRx] = React.useState<number>(50);
  const [ellipseRy, setEllipseRy] = React.useState<number>(50);
  const [insetTop, setInsetTop] = React.useState<number>(10);
  const [insetRight, setInsetRight] = React.useState<number>(10);
  const [insetBottom, setInsetBottom] = React.useState<number>(10);
  const [insetLeft, setInsetLeft] = React.useState<number>(10);
  const [polygonPoints, setPolygonPoints] = React.useState<string>("50% 0%, 100% 100%, 0% 100%");
  const [pathDef, setPathDef] = React.useState<string>("M10 10 H 90 V 90 H 10 Z");

  React.useEffect(() => {
    const value = initialValue || "";
    if (!value) { setKind(""); return; }
    const trimmed = value.trim();
    if (trimmed.startsWith("circle(")) {
      setKind("circle");
      const m = trimmed.match(/circle\(([^)]+)\)/);
      if (m) {
        const rStr = m[1].trim();
        const r = parseFloat(rStr);
        if (!isNaN(r)) setCircleR(r);
      }
    } else if (trimmed.startsWith("ellipse(")) {
      setKind("ellipse");
      const m = trimmed.match(/ellipse\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(/[\s,]+/).map(s => s.replace('%','').trim()).filter(Boolean);
        const rx = parseFloat(parts[0] || '50');
        const ry = parseFloat(parts[1] || '50');
        if (!isNaN(rx)) setEllipseRx(rx);
        if (!isNaN(ry)) setEllipseRy(ry);
      }
    } else if (trimmed.startsWith("inset(")) {
      setKind("inset");
      const m = trimmed.match(/inset\(([^)]+)\)/);
      if (m) {
        const parts = m[1].split(/[\s,]+/).map(s => s.replace('%','').trim()).filter(Boolean);
        const t = parseFloat(parts[0] || '10');
        const r = parseFloat(parts[1] || parts[0] || '10');
        const b = parseFloat(parts[2] || parts[0] || '10');
        const l = parseFloat(parts[3] || parts[1] || parts[0] || '10');
        if (!isNaN(t)) setInsetTop(t);
        if (!isNaN(r)) setInsetRight(r);
        if (!isNaN(b)) setInsetBottom(b);
        if (!isNaN(l)) setInsetLeft(l);
      }
    } else if (trimmed.startsWith("polygon(")) {
      setKind("polygon");
      const m = trimmed.match(/polygon\(([^)]+)\)/);
      if (m) setPolygonPoints(m[1].trim());
    } else if (trimmed.startsWith("path(")) {
      setKind("path");
      const m = trimmed.match(/path\(['"]?([^'"]+)['"]?\)/);
      if (m) setPathDef(m[1].trim());
    } else {
      setKind("");
    }
  }, [initialValue]);

  const buildCss = (
    k: string,
    overrides?: Partial<{
      circleR: number;
      ellipseRx: number; ellipseRy: number;
      insetTop: number; insetRight: number; insetBottom: number; insetLeft: number;
      polygonPoints: string; pathDef: string;
    }>
  ) => {
    const r = overrides?.circleR ?? circleR;
    const rx = overrides?.ellipseRx ?? ellipseRx;
    const ry = overrides?.ellipseRy ?? ellipseRy;
    const t = overrides?.insetTop ?? insetTop;
    const rgt = overrides?.insetRight ?? insetRight;
    const btm = overrides?.insetBottom ?? insetBottom;
    const lft = overrides?.insetLeft ?? insetLeft;
    const poly = overrides?.polygonPoints ?? polygonPoints;
    const path = overrides?.pathDef ?? pathDef;
    switch (k) {
      case "circle": return `circle(${r}%)`;
      case "ellipse": return `ellipse(${rx}% ${ry}%)`;
      case "inset": return `inset(${t}% ${rgt}% ${btm}% ${lft}%)`;
      case "polygon": return `polygon(${poly})`;
      case "path": return `path('${path}')`;
      default: return "";
    }
  };
  const emit = (k?: string, overrides?: Parameters<typeof buildCss>[1]) => {
    const css = buildCss(k ?? kind, overrides);
    onUpdate(css);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Clip Path</label>
        <Select 
          options={options} 
          value={kind} 
          onChange={(v) => { setKind(v); emit(v); }} 
          className="w-48"
        />
      </div>

      {kind === "circle" && (
        <DragNumberInput label="Radius %" unit="%" value={circleR} min={0} max={100} step={1} onChange={(n) => { setCircleR(n); emit("circle", { circleR: n }); }} />
      )}

      {kind === "ellipse" && (
        <div className="grid grid-cols-2 gap-3">
          <DragNumberInput label="Rx %" unit="%" value={ellipseRx} min={0} max={100} step={1} onChange={(n) => { setEllipseRx(n); emit("ellipse", { ellipseRx: n }); }} />
          <DragNumberInput label="Ry %" unit="%" value={ellipseRy} min={0} max={100} step={1} onChange={(n) => { setEllipseRy(n); emit("ellipse", { ellipseRy: n }); }} />
        </div>
      )}

      {kind === "inset" && (
        <div className="grid grid-cols-2 gap-3">
          <DragNumberInput label="Top %" unit="%" value={insetTop} min={0} max={100} step={1} onChange={(n) => { setInsetTop(n); emit("inset", { insetTop: n }); }} />
          <DragNumberInput label="Right %" unit="%" value={insetRight} min={0} max={100} step={1} onChange={(n) => { setInsetRight(n); emit("inset", { insetRight: n }); }} />
          <DragNumberInput label="Bottom %" unit="%" value={insetBottom} min={0} max={100} step={1} onChange={(n) => { setInsetBottom(n); emit("inset", { insetBottom: n }); }} />
          <DragNumberInput label="Left %" unit="%" value={insetLeft} min={0} max={100} step={1} onChange={(n) => { setInsetLeft(n); emit("inset", { insetLeft: n }); }} />
        </div>
      )}

      {kind === "polygon" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Points</label>
          <textarea className="w-full bg-gray-100 rounded-md p-2 text-sm" rows={3} placeholder="e.g. 50% 0%, 100% 100%, 0% 100%" value={polygonPoints} onChange={(e) => { setPolygonPoints(e.target.value); emit("polygon"); }} />
        </div>
      )}

      {kind === "path" && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">SVG Path</label>
          <textarea className="w-full bg-gray-100 rounded-md p-2 text-sm" rows={3} placeholder="M10 10 H 90 V 90 H 10 Z" value={pathDef} onChange={(e) => { setPathDef(e.target.value); emit("path"); }} />
        </div>
      )}
    </div>
  );
};

