import { CHART_PALETTE } from "./colors";

const BASE_OPTIONS = {
  chart: {
    backgroundColor: "transparent",
    style: {
      fontFamily: "inherit",
    },
  },
  colors: [...CHART_PALETTE],
  title: {
    text: undefined,
  },
  subtitle: {
    text: undefined,
  },
  credits: {
    enabled: false,
  },
  accessibility: {
    enabled: false,
  },
  exporting: {
    enabled: false,
  },
  legend: {
    itemStyle: {
      color: "var(--muted-foreground)",
      fontWeight: "500",
      fontSize: "12px",
    },
    itemHoverStyle: {
      color: "var(--foreground)",
    },
    itemDistance: 16,
  },
  tooltip: {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: 8,
    shadow: false,
    style: {
      color: "var(--foreground)",
      fontSize: "13px",
    },
    padding: 10,
  },
  xAxis: {
    labels: {
      style: {
        color: "var(--muted-foreground)",
        fontSize: "12px",
      },
    },
    lineColor: "transparent",
    tickColor: "transparent",
  },
  yAxis: {
    title: {
      text: undefined,
    },
    labels: {
      style: {
        color: "var(--muted-foreground)",
        fontSize: "12px",
      },
    },
    gridLineColor: "var(--border)",
    gridLineDashStyle: "Dot",
  },
};

export const createBaseChartOptions = <TOptions>(
  highcharts: { merge: (...parts: any[]) => unknown },
  options: TOptions,
): TOptions => highcharts.merge(BASE_OPTIONS, options) as TOptions;

export const mergeSeriesColors = <const TSeries extends readonly { color?: string }[]>(
  series: TSeries,
  colors: string[],
): Array<TSeries[number]> =>
  series.map((entry, index) => ({
    ...entry,
    color: entry.color ?? colors[index % colors.length],
  })) as Array<TSeries[number]>;
