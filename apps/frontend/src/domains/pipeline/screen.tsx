"use client";

import * as React from "react";

import Highcharts from "@/shared/charts/highcharts-init";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { DashboardHighchart, createBaseChartOptions } from "@/shared/charts/highcharts";
import { HighchartsGridPro } from "@/shared/charts/highcharts-grid-pro";
import { Slider } from "@/shared/ui/slider";

import {
  allBubblePoints,
  allDeals,
  BubblePoint,
  Deal,
  COMPANY_INFO,
  FILTER_RANGES,
  FUNNEL_BUBBLE_MAX_SIZE,
  FUNNEL_BUBBLE_MIN_SIZE,
  FUNNEL_STAGE_BUBBLE_SIZES,
  FUNNEL_BUBBLE_Z_MAX,
  FUNNEL_BUBBLE_Z_MIN,
  FUNNEL_STAGE_COLORS,
  MAX_DEAL_SIZE,
  pipelineDeals,
  salesPipelineKpis,
  wonDeals,
} from "./data/pipeline.data";
import { ArrKpiCard } from "../sales/widgets/cards";

// ─── Grid options ─────────────────────────────────────────────────────────────

function buildWonGridOptions() {
  return {
    accessibility: { enabled: false },
    pagination: { enabled: false },
    rendering: {
      theme: "hcg-theme-default",
      rows: {
        strictHeights: true,
        minVisibleRows: 4,
      },
      columns: {
        resizing: { enabled: false },
      },
    },
    credits: { enabled: false },
    columnDefaults: {
      sorting: { enabled: false },
      cells: { className: "sp-grid-cell" },
    },
    columns: [
      {
        id: "company",
        header: { format: "Company" },
        width: "34%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const v = String((this as { value?: unknown }).value ?? "");
            return `<span style="font-weight:600">${v}</span>`;
          },
        },
      },
      {
        id: "contact",
        header: { format: "Contact" },
        width: "28%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "dealSize",
        header: { format: "Deal Size" },
        width: "20%",
        cells: {
          className: "sp-grid-cell sp-amount-cell",
          formatter: function () {
            const n = Number((this as { value?: unknown }).value ?? 0);
            return `<span class="sp-stage-won-text">$${Math.round(n / 1000)}K</span>`;
          },
        },
      },
      {
        id: "closeDate",
        header: { format: "Closed" },
        width: "18%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
    ],
    dataTable: {
      columns: {
        company:   wonDeals.map((d) => d.company),
        contact:   wonDeals.map((d) => d.contact),
        dealSize:  wonDeals.map((d) => d.dealSize),
        closeDate: wonDeals.map((d) => d.expectedClose),
      },
    },
  };
}

function buildPipelineGridOptions() {
  return {
    accessibility: { enabled: false },
    pagination: { enabled: true },
    rendering: {
      theme: "hcg-theme-default",
      rows: {
        strictHeights: true,
        minVisibleRows: 8,
      },
      columns: {
        resizing: { enabled: false },
      },
    },
    credits: { enabled: false },
    columnDefaults: {
      sorting: { enabled: false },
      cells: { className: "sp-grid-cell" },
    },
    columns: [
      {
        id: "company",
        header: { format: "Company" },
        width: "22%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const v = String((this as { value?: unknown }).value ?? "");
            return `<span style="font-weight:600">${v}</span>`;
          },
        },
      },
      {
        id: "stage",
        header: { format: "Stage" },
        width: "18%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const s = String((this as { value?: unknown }).value ?? "");
            const cls =
              s === "Scoping"   ? "sp-stage-scoping"   :
              s === "Proposal"  ? "sp-stage-proposal"  :
              s === "Committed" ? "sp-stage-committed" : "";
            return `<span class="sp-stage-badge ${cls}">${s}</span>`;
          },
        },
      },
      {
        id: "dealSize",
        header: { format: "Deal Size" },
        width: "16%",
        cells: {
          className: "sp-grid-cell sp-amount-cell",
          formatter: function () {
            const n = Number((this as { value?: unknown }).value ?? 0);
            const large = n > 200000 ? " sp-deal-large" : "";
            return `<span class="${large.trim()}">$${Math.round(n / 1000)}K</span>`;
          },
        },
      },
      {
        id: "probability",
        header: { format: "Prob." },
        width: "12%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const p = Number((this as { value?: unknown }).value ?? 0);
            const cls = p >= 70 ? "sp-prob-high" : p >= 40 ? "sp-prob-medium" : "sp-prob-low";
            return `<span class="${cls}">${p}%</span>`;
          },
        },
      },
      {
        id: "contact",
        header: { format: "Contact" },
        width: "18%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "expectedClose",
        header: { format: "Exp. Close" },
        width: "14%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
    ],
    dataTable: {
      columns: {
        company:       pipelineDeals.map((d) => d.company),
        stage:         pipelineDeals.map((d) => d.stage),
        dealSize:      pipelineDeals.map((d) => d.dealSize),
        probability:   pipelineDeals.map((d) => d.probability),
        contact:       pipelineDeals.map((d) => d.contact),
        expectedClose: pipelineDeals.map((d) => d.expectedClose),
      },
    },
  };
}

// ─── Funnel bubble chart ──────────────────────────────────────────────────────

const STAGE_NAMES = ["Scoping", "Proposal", "Committed", "Won"] as const;

function formatCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

// Linear interpolation of the funnel y-boundary at a given x.
// Left edge (x=-0.5): y_bound=4.5 · Right edge (x=3.5): y_bound=1.5
function funnelBoundAtX(dataX: number): number {
  const t = (dataX - -0.5) / (3.5 - -0.5);
  return 4.5 - 3.0 * t;
}

// ─── Filter dimensions ────────────────────────────────────────────────────────

type FilterDimKey = "dealSize" | "companyArr" | "employees" | "age";

const FILTER_DIMS: Array<{
  key: FilterDimKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  extract: (name: string, z: number) => number;
}> = [
  {
    key:     "dealSize",
    label:   "Deal Size",
    min:     0,
    max:     MAX_DEAL_SIZE,
    step:    10000,
    format:  (v) => v === 0 ? "All" : `≥ $${Math.round(v / 1000)}K`,
    extract: (_name, z) => z,
  },
  {
    key:     "companyArr",
    label:   "Co. ARR",
    min:     0,
    max:     FILTER_RANGES.maxAnnualRevenue,
    step:    5000,
    format:  (v) => v === 0 ? "All" : `≥ $${(v / 1000).toFixed(0)}M`,
    extract: (name) => COMPANY_INFO[name]?.annualRevenue ?? 0,
  },
  {
    key:     "employees",
    label:   "Headcount",
    min:     0,
    max:     FILTER_RANGES.maxEmployeeCount,
    step:    50,
    format:  (v) => v === 0 ? "All" : `≥ ${v.toLocaleString()}`,
    extract: (name) => COMPANY_INFO[name]?.employeeCount ?? 0,
  },
  {
    key:     "age",
    label:   "Age",
    min:     0,
    max:     FILTER_RANGES.maxYearsInBiz,
    step:    1,
    format:  (v) => v === 0 ? "All" : `≥ ${v} yr${v !== 1 ? "s" : ""}`,
    extract: (name) => COMPANY_INFO[name] ? 2026 - COMPANY_INFO[name].foundedYear : 0,
  },
];

type SelectedPoint = { name: string; stage: string; probability: number; z: number };

function buildFunnelChartOptions(
  series: Array<{ name: string; color: string; data: BubblePoint[] }>,
  onPointClick: (pt: SelectedPoint) => void,
): Highcharts.Options {
  return createBaseChartOptions({
    chart: {
      type: "bubble",
      height: 460,
      spacing: [24, 16, 16, 16],
      events: {
        render: function () {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chart = this as any;

          // Remove previously drawn overlay elements
          if (Array.isArray(chart._funnelOverlay)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (chart._funnelOverlay as any[]).forEach((el) => { try { el.destroy(); } catch { /* ignore */ } });
          }
          chart._funnelOverlay = [];

          const xa = chart.xAxis[0];
          const ya = chart.yAxis[0];
          if (!xa || !ya) return;

          const px = (d: number) => xa.toPixels(d, false) as number;
          const py = (d: number) => ya.toPixels(d, false) as number;

          // ── Trapezoid fill ───────────────────────────────────────────────
          const lx  = px(-0.5);
          const rx  = px(3.5);
          const lyT = py(4.5);
          const lyB = py(-4.5);
          const ryT = py(1.5);
          const ryB = py(-1.5);

          chart._funnelOverlay.push(
            chart.renderer
              .path(["M", lx, lyT, "L", rx, ryT, "L", rx, ryB, "L", lx, lyB, "Z"])
              .attr({
                fill: "rgba(128,135,232,0.05)",
                stroke: "rgba(128,135,232,0.22)",
                "stroke-width": 1,
                zIndex: 0,
              })
              .add(),
          );

          // ── Dashed vertical dividers at x = 0.5, 1.5, 2.5 ──────────────
          [0.5, 1.5, 2.5].forEach((dx) => {
            const divX   = px(dx);
            const yBound = funnelBoundAtX(dx);
            chart._funnelOverlay.push(
              chart.renderer
                .path(["M", divX, py(yBound), "L", divX, py(-yBound)])
                .attr({
                  stroke: "rgba(100,116,139,0.35)",
                  "stroke-width": 1,
                  dashstyle: "Dash",
                  zIndex: 1,
                })
                .add(),
            );
          });

          // ── Stage labels above each section ─────────────────────────────
          STAGE_NAMES.forEach((name, i) => {
            const cx     = px(i);
            const yBound = funnelBoundAtX(i);
            const labelY = py(yBound + 0.45);
            chart._funnelOverlay.push(
              chart.renderer
                .text(name, cx, labelY)
                .attr({ align: "center", zIndex: 5 })
                .css({
                  color: "var(--muted-foreground)",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                })
                .add(),
            );
          });
        },
      },
    },
    xAxis: {
      min: -0.5,
      max: 3.5,
      tickLength: 0,
      lineWidth: 0,
      gridLineWidth: 0,
      labels: {
        formatter: function () {
          const v = Math.round(this.value as number);
          return STAGE_NAMES[v] ?? "";
        },
        style: { color: "transparent" },
      },
    },
    yAxis: {
      min: -5,
      max: 5,
      visible: false,
      gridLineWidth: 0,
    },
    legend: {
      enabled: true,
      align: "right",
      verticalAlign: "top",
      layout: "vertical",
    },
    plotOptions: {
      bubble: {
        minSize: FUNNEL_BUBBLE_MIN_SIZE,
        maxSize: FUNNEL_BUBBLE_MAX_SIZE,
        zMin: FUNNEL_BUBBLE_Z_MIN,
        zMax: FUNNEL_BUBBLE_Z_MAX,
        opacity: 0.82,
        marker: {
          lineWidth: 1,
          lineColor: "rgba(255,255,255,0.3)",
        },
      },
      series: {
        animation: false,
        cursor: "pointer",
        point: {
          events: {
            click: function () {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = this as any;
              onPointClick({
                name: p.name as string,
                stage: p.stage as string,
                probability: p.probability as number,
                z: p.z as number,
              });
            },
          },
        },
      },
    },
    tooltip: {
      useHTML: true,
      formatter: function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = this as any;
        const sizeK = `$${Math.round((p.z as number) / 1000)}K`;
        return `
          <div style="padding:4px 2px;min-width:140px">
            <div style="font-weight:700;margin-bottom:4px">${p.name as string}</div>
            <div style="font-size:13px">${sizeK}</div>
            <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">
              ${p.stage as string} · ${p.probability as number}%
            </div>
          </div>`;
      },
    },
    series: series.map((s) => {
      const stage = s.name as Deal["stage"];
      const size = FUNNEL_STAGE_BUBBLE_SIZES[stage];
      return {
        type: "bubble" as const,
        name: s.name,
        color: s.color,
        minSize: size?.minSize ?? FUNNEL_BUBBLE_MIN_SIZE,
        maxSize: size?.maxSize ?? FUNNEL_BUBBLE_MAX_SIZE,
        zMin: size?.zMin ?? FUNNEL_BUBBLE_Z_MIN,
        zMax: size?.zMax ?? FUNNEL_BUBBLE_Z_MAX,
        data: s.data.map((pt) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z,
          name: pt.name,
          stage: pt.stage,
          probability: pt.probability,
        })),
      };
    }),
  });
}

// ─── View ─────────────────────────────────────────────────────────────────────

export function SalesPipelineView() {
  const [filterDim, setFilterDim]         = React.useState<FilterDimKey>("dealSize");
  const [filterValues, setFilterValues]   = React.useState<Record<FilterDimKey, number>>({ dealSize: 0, companyArr: 0, employees: 0, age: 0 });
  const [selectedPoint, setSelectedPoint] = React.useState<SelectedPoint | null>(null);

  const wonGridOptions      = React.useMemo(() => buildWonGridOptions(),      []);
  const pipelineGridOptions = React.useMemo(() => buildPipelineGridOptions(), []);

  const activeDim = React.useMemo(() => FILTER_DIMS.find((d) => d.key === filterDim)!, [filterDim]);
  const minFilterValue = filterValues[filterDim];

  const filteredBubblePoints = React.useMemo(
    () =>
      minFilterValue > 0
        ? allBubblePoints.filter((p) => activeDim.extract(p.name, p.z) >= minFilterValue)
        : allBubblePoints,
    [activeDim, minFilterValue],
  );

  const filteredDeals = React.useMemo(
    () =>
      minFilterValue > 0
        ? allDeals.filter((d) => activeDim.extract(d.company, d.dealSize) >= minFilterValue)
        : allDeals,
    [activeDim, minFilterValue],
  );

  const filteredFunnelSeries = React.useMemo(() => {
    return STAGE_NAMES.map((stage) => ({
      name: stage,
      color: FUNNEL_STAGE_COLORS[stage],
      data: filteredBubblePoints.filter((p) => p.stage === stage),
    }));
  }, [filteredBubblePoints]);

  const visibleCount = filteredBubblePoints.length;

  const stageFilterKpis = React.useMemo(() => {
    const fullStageStats = STAGE_NAMES.reduce<Record<(typeof STAGE_NAMES)[number], { count: number; value: number }>>(
      (acc, stage) => {
        const stageDeals = allDeals.filter((d) => d.stage === stage);
        acc[stage] = {
          count: stageDeals.length,
          value: stageDeals.reduce((sum, d) => sum + d.dealSize, 0),
        };
        return acc;
      },
      {
        Scoping: { count: 0, value: 0 },
        Proposal: { count: 0, value: 0 },
        Committed: { count: 0, value: 0 },
        Won: { count: 0, value: 0 },
      },
    );

    return STAGE_NAMES.map((stage) => {
      const stageDeals = filteredDeals.filter((d) => d.stage === stage);
      const filteredValue = stageDeals.reduce((sum, d) => sum + d.dealSize, 0);
      const baselineCount = fullStageStats[stage].count;
      const deltaPct = baselineCount > 0 ? ((stageDeals.length - baselineCount) / baselineCount) * 100 : 0;

      return {
        stage,
        dealsAdded: stageDeals.length,
        valueAdded: formatCompactCurrency(filteredValue),
        deltaPct,
      };
    });
  }, [filteredDeals]);

  const handleBubbleClick = React.useCallback((pt: SelectedPoint) => setSelectedPoint(pt), []);

  const funnelChartOptions = React.useMemo(
    () => buildFunnelChartOptions(filteredFunnelSeries, handleBubbleClick),
    [filteredFunnelSeries, handleBubbleClick],
  );

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
        <p className="text-muted-foreground">Track deals from scoping to close.</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {salesPipelineKpis.map((kpi) => (
          <ArrKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            trend={kpi.trend}
            positive={kpi.positive}
          />
        ))}
      </div>

      {/* Funnel-bubble chart */}
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-5 pb-3">
          <div>
            <CardTitle className="text-base">Pipeline Funnel</CardTitle>
            <CardDescription>Deal size and volume across pipeline stages</CardDescription>
          </div>
          <div className="flex flex-col gap-2 min-w-[260px]">
            {/* Dimension pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {FILTER_DIMS.map((dim) => (
                <button
                  key={dim.key}
                  onClick={() => setFilterDim(dim.key)}
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border transition-colors ${
                    filterDim === dim.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {dim.label}
                </button>
              ))}
            </div>
            {/* Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activeDim.label}</span>
                <span className="text-xs font-semibold tabular-nums">
                  {activeDim.format(filterValues[filterDim])}
                  <span className="ml-1.5 text-muted-foreground font-normal">
                    · {visibleCount} deal{visibleCount !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>
              <Slider
                min={activeDim.min}
                max={activeDim.max}
                step={activeDim.step}
                value={[filterValues[filterDim]]}
                onValueChange={([v]) => setFilterValues((prev) => ({ ...prev, [filterDim]: v }))}
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <DashboardHighchart
            options={funnelChartOptions}
            className="h-[460px] w-full"
          />
        </CardContent>

        {/* ── Per-stage KPIs (respect slider filter) ─────────────────────── */}
        <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          {stageFilterKpis.map((s, i) => (
            <div
              key={s.stage}
              className={`flex flex-col gap-2 p-5 ${i < stageFilterKpis.length - 1 ? "border-r border-border" : ""}`}
            >
              {/* Stage label with colour dot */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: FUNNEL_STAGE_COLORS[s.stage] }}
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {s.stage}
                </span>
              </div>

              {/* Primary: deal count */}
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold tabular-nums leading-none">{s.dealsAdded}</span>
                <span className="mb-0.5 text-sm text-muted-foreground">deals</span>
              </div>

              {/* Secondary: total value */}
              <div className="text-base font-semibold tabular-nums text-foreground">
                {s.valueAdded}
              </div>

              {/* Delta vs full unfiltered stage count */}
              <p
                className={`text-xs font-medium ${
                  s.deltaPct > 0 ? "text-emerald-500" : s.deltaPct < 0 ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {`${s.deltaPct > 0 ? "+" : ""}${Math.round(s.deltaPct)}%`} vs all deals
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Grids */}
      <div className="grid gap-4 grid-cols-5">
        {/* Won deals — col-span-2 */}
        <Card className="col-span-5 xl:col-span-2 gap-0 py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">Latest Sales</CardTitle>
            <CardDescription>Recently closed deals</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <HighchartsGridPro
              options={wonGridOptions}
              className="sp-pipeline-grid h-[220px]"
            />
          </CardContent>
        </Card>

        {/* Pipeline deals — col-span-3 */}
        <Card className="col-span-5 xl:col-span-3 gap-0 py-0">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base">In the Pipe</CardTitle>
            <CardDescription>Active opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <HighchartsGridPro
              options={pipelineGridOptions}
              className="sp-pipeline-grid h-[350px]"
            />
          </CardContent>
        </Card>
      </div>
    </div>

    {/* ── Company detail popup ─────────────────────────────────────────────── */}
    {selectedPoint && (() => {
      const info = COMPANY_INFO[selectedPoint.name];
      const deal = allDeals.find((d) => d.company === selectedPoint.name);
      if (!info || !deal) return null;
      const stageCls =
        selectedPoint.stage === "Scoping"   ? "sp-stage-scoping"   :
        selectedPoint.stage === "Proposal"  ? "sp-stage-proposal"  :
        selectedPoint.stage === "Committed" ? "sp-stage-committed" : "sp-stage-won";

      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedPoint(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[440px] mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight leading-none">{selectedPoint.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                    {info.industry}
                  </span>
                  <span className={`sp-stage-badge ${stageCls} text-xs`}>
                    {selectedPoint.stage}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors ml-3 shrink-0"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed px-6 pb-5">
              {info.description}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-px bg-border mx-6 mb-5 rounded-xl overflow-hidden">
              {[
                { label: "Deal Size",    value: `$${Math.round(selectedPoint.z / 1000)}K` },
                { label: "Probability",  value: `${selectedPoint.probability}%` },
                { label: "Employees",    value: info.employees },
                { label: "Company ARR",  value: info.yearlyRevenue },
                { label: "Contact",      value: deal.contact },
                { label: "Exp. Close",   value: deal.expectedClose },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card px-3 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm font-semibold leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}
