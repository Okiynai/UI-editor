import React, { useEffect } from "react";

export interface SegmentedSwitchProps<T extends string | number> {
  labels: string[];
  values: T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Optional icons per option (Lucide React nodes). Same order as labels/values. */
  icons?: Array<React.ReactNode | undefined>;
  /** How to render option contents. Default 'text'. */
  display?: 'text' | 'icon' | 'both';
}

export function SegmentedSwitch<T extends string | number>({
  labels,
  values,
  value,
  onChange,
  className,
  icons,
  display = 'text'
}: SegmentedSwitchProps<T>) {
  const optionCount = values.length;
  const selectedIndex = Math.max(0, values.findIndex((v) => v === value));

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({});

  useEffect(() => {
    const updateMeasurements = () => {
      const container = containerRef.current;
      if (!container || optionCount <= 0) return;

      // Measure buttons to size/position the indicator based on the active button
      const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
      const activeButton = buttons[selectedIndex];

      if (!activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      const desiredWidth = activeRect.width;
      const desiredLeft = activeRect.left - containerRect.left; // relative X inside container

      // Keep a minimum 2px gap from the start
      const minLeft = 2;
      // Keep a 2px gap from the end, accounting for indicator width
      const maxLeft = Math.max(0, container.clientWidth - desiredWidth - 2);

      const clampedLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft);

      setIndicatorStyle({
        width: `${desiredWidth}px`,
        transform: `translateX(${clampedLeft}px)`
      });
    };

    updateMeasurements();
    const container = containerRef.current;
    if (container && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => updateMeasurements());
      ro.observe(container);
      return () => ro.disconnect();
    }
    return () => {};
  }, [optionCount, selectedIndex, labels.join("|"), display]);

  return (
    <div
      ref={containerRef}
      className={`bg-gray-100 rounded-md py-1.5 flex relative whitespace-nowrap ${className ?? ""}`} >
      <div
        className="absolute top-0.5 bottom-0.5 left-0 bg-white rounded-md shadow-sm transition-transform duration-150 ease-out"
        style={indicatorStyle}
      />
      {labels.map((label, index) => {
        const isActive = index === selectedIndex;
        const iconNode = icons?.[index];
        return (
          <button
            key={values[index] as React.Key}
            onClick={() => onChange(values[index])}
            className={
              `tracking-tight flex-1 px-3 text-sm rounded-lg transition-colors relative z-10 whitespace-nowrap
              ${isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-800"}
            `}
            title={(label && label.length > 0) ? label : String(values[index])}
          >
            {display === 'icon' && iconNode}
            {display === 'text' && label}
            {display === 'both' && (
              <span className="inline-flex items-center gap-1">
                {iconNode}
                <span>{label}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}


