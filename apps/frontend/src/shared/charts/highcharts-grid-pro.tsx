"use client";

import * as React from "react";

import { cn } from "@/shared/lib/utils";

type GridOptions = import("@highcharts/grid-pro/es-modules/masters/grid-pro.src.js").Options;
type GridInstance = import("@highcharts/grid-pro/es-modules/Grid/Core/Grid.js").Grid;

export type HighchartsGridProProps = {
  className?: string;
  options: GridOptions;
};

export function HighchartsGridPro({ className, options }: HighchartsGridProProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const gridRef = React.useRef<GridInstance | null>(null);

  React.useEffect(() => {
    let isActive = true;

    const mountGrid = async () => {
      const gridModule = await import("@highcharts/grid-pro/es-modules/masters/grid-pro.src.js");

      if (!isActive || !containerRef.current) {
        return;
      }

      gridRef.current?.destroy();
      gridRef.current = gridModule.default.grid(containerRef.current, options);
    };

    void mountGrid();

    return () => {
      isActive = false;
      gridRef.current?.destroy();
      gridRef.current = null;
    };
  }, [options]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
}
