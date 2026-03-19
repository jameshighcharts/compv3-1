"use client";

import * as React from "react";
import { Chart as HighchartsReact } from "@highcharts/react";

import {
  CHART_PALETTE,
  chartColor,
  createBaseChartOptions as createChartKitBaseOptions,
} from "@chart-kit";
import Highcharts, { ensureHighchartsModules } from "@/shared/charts/highcharts-init";
import { cn } from "@/shared/lib/utils";

export type DashboardHighchartProps = {
  className?: string;
  options: Highcharts.Options;
};

export { CHART_PALETTE, chartColor };

export const createBaseChartOptions = (
  options: Highcharts.Options,
): Highcharts.Options => createChartKitBaseOptions(Highcharts, options);

export const mergeSeriesColors = (
  series: Highcharts.SeriesOptionsType[],
  colors: string[],
): Highcharts.SeriesOptionsType[] =>
  series.map((entry, index) => {
    const seriesWithColor = entry as Highcharts.SeriesOptionsType & {
      color?: string;
    };

    return {
      ...seriesWithColor,
      color: seriesWithColor.color ?? colors[index % colors.length],
    };
  });

export const createSparklineOptions = ({
  color,
  data,
  height,
}: {
  color: string;
  data: number[];
  height: number;
}): Highcharts.Options =>
  createBaseChartOptions({
    chart: {
      type: "line",
      height,
      margin: [2, 0, 2, 0],
      spacing: [0, 0, 0, 0],
    },
    legend: {
      enabled: false,
    },
    xAxis: {
      visible: false,
    },
    yAxis: {
      visible: false,
    },
    tooltip: {
      enabled: false,
    },
    plotOptions: {
      series: {
        animation: false,
        marker: {
          enabled: false,
        },
        states: {
          hover: {
            lineWidthPlus: 0,
          },
        },
      },
    },
    series: [
      {
        type: "line",
        data,
        color,
        lineWidth: 2,
      },
    ],
  });

export function DashboardHighchart({
  className,
  options,
}: DashboardHighchartProps) {
  const [isReady, setIsReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isActive = true;

    void ensureHighchartsModules().then(() => {
      if (isActive) {
        setIsReady(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  if (!isReady) {
    return <div className={cn("h-full w-full", className)} />;
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        containerProps={{ className: "h-full w-full" }}
      />
    </div>
  );
}
