"use client";

import * as React from "react";

import type {
  PipelineClosedRange,
  SfOpportunityPipelineDeal,
  SfOpportunityPipelineResponse,
} from "@contracts/sales";

import Highcharts from "@/shared/charts/highcharts-init";
import { DashboardHighchart, createBaseChartOptions } from "@/shared/charts/highcharts";
import { HighchartsGridPro } from "@/shared/charts/highcharts-grid-pro";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";

import { useSalesforcePipeline } from "@/lib/sf/use-salesforce-pipeline";

import {
  buildCloseQuarterOptions,
  buildDealFilterBounds,
  buildFunnelPacking,
  buildRepresentativeFunnelDeals,
  clampRangeFilters,
  createDefaultRangeFilters,
  formatCompactCurrency,
  FUNNEL_STAGE_COLORS,
  MAX_WON_GRID_ROWS,
  type BubblePoint,
  type FunnelPackingLayout,
  type RangeFilterKey,
  type RangeFilterState,
  stageBadgeClass,
  STAGE_NAMES,
  type StageName,
  type StatusFilter,
  sortRange,
  valueInRange,
} from "./data/pipeline.data";
import { ArrKpiCard } from "../sales/widgets/cards";

type BubbleSeries = {
  name: StageName;
  color: string;
  data: BubblePoint[];
};

type RangeFilterConfig = {
  key: RangeFilterKey;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: [number, number]) => string;
};

function funnelBoundAtX(dataX: number): number {
  const t = (dataX - -0.5) / (3.5 - -0.5);
  return 4.5 - 3.0 * t;
}

function buildWonGridOptions(deals: readonly SfOpportunityPipelineDeal[]) {
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
        width: "30%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const value = String((this as { value?: unknown }).value ?? "");
            return `<span style="font-weight:600">${value}</span>`;
          },
        },
      },
      {
        id: "owner",
        header: { format: "Owner" },
        width: "18%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "dealSize",
        header: { format: "Deal Size" },
        width: "16%",
        cells: {
          className: "sp-grid-cell sp-amount-cell",
          formatter: function () {
            const value = Number((this as { value?: unknown }).value ?? 0);
            return `<span class="sp-stage-won-text">${formatCompactCurrency(value)}</span>`;
          },
        },
      },
      {
        id: "timeOpen",
        header: { format: "Time Open" },
        width: "16%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "closeDate",
        header: { format: "Closed" },
        width: "20%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
    ],
    dataTable: {
      columns: {
        company: deals.map((deal) => deal.company),
        owner: deals.map((deal) => deal.ownerName),
        dealSize: deals.map((deal) => deal.amount),
        timeOpen: deals.map((deal) => `${deal.timeOpen}d`),
        closeDate: deals.map((deal) => deal.closeDate ?? "Unknown"),
      },
    },
  };
}

function buildPipelineGridOptions(deals: readonly SfOpportunityPipelineDeal[]) {
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
        width: "18%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const value = String((this as { value?: unknown }).value ?? "");
            return `<span style="font-weight:600">${value}</span>`;
          },
        },
      },
      {
        id: "owner",
        header: { format: "Owner" },
        width: "14%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "stage",
        header: { format: "Stage" },
        width: "14%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const stage = String((this as { value?: unknown }).value ?? "");
            return `<span class="sp-stage-badge ${stageBadgeClass(stage as StageName)}">${stage}</span>`;
          },
        },
      },
      {
        id: "dealSize",
        header: { format: "Deal Size" },
        width: "12%",
        cells: {
          className: "sp-grid-cell sp-amount-cell",
          formatter: function () {
            const value = Number((this as { value?: unknown }).value ?? 0);
            const large = value > 200_000 ? " sp-deal-large" : "";
            return `<span class="${large.trim()}">${formatCompactCurrency(value)}</span>`;
          },
        },
      },
      {
        id: "probability",
        header: { format: "Prob." },
        width: "10%",
        cells: {
          className: "sp-grid-cell",
          formatter: function () {
            const value = Number((this as { value?: unknown }).value ?? 0);
            const style =
              value >= 70 ? "sp-prob-high" : value >= 40 ? "sp-prob-medium" : "sp-prob-low";
            return `<span class="${style}">${value}%</span>`;
          },
        },
      },
      {
        id: "daysOpen",
        header: { format: "Days Open" },
        width: "10%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "timeOpen",
        header: { format: "Time Open" },
        width: "10%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
      {
        id: "expectedClose",
        header: { format: "Exp. Close" },
        width: "12%",
        cells: { className: "sp-grid-cell sp-meta-cell" },
      },
    ],
    dataTable: {
      columns: {
        company: deals.map((deal) => deal.company),
        owner: deals.map((deal) => deal.ownerName),
        stage: deals.map((deal) => deal.stageBucket),
        dealSize: deals.map((deal) => deal.amount),
        probability: deals.map((deal) => deal.probability),
        daysOpen: deals.map((deal) => `${deal.daysOpen}d`),
        timeOpen: deals.map((deal) => `${deal.timeOpen}d`),
        expectedClose: deals.map((deal) => deal.expectedCloseDate ?? deal.closeDate ?? "Unknown"),
      },
    },
  };
}

function buildFunnelChartOptions(
  series: readonly BubbleSeries[],
  layout: FunnelPackingLayout,
  onPointClick: (opportunityId: string) => void,
): Highcharts.Options {
  return createBaseChartOptions({
    chart: {
      type: "bubble",
      height: 460,
      spacing: [24, 16, 16, 16],
      events: {
        render: function () {
          const chart = this as Highcharts.Chart & { _funnelOverlay?: Highcharts.SVGElement[] };

          if (Array.isArray(chart._funnelOverlay)) {
            chart._funnelOverlay.forEach((element) => {
              try {
                element.destroy();
              } catch {
                // Ignore stale overlay teardown errors.
              }
            });
          }

          chart._funnelOverlay = [];

          const xAxis = chart.xAxis[0];
          const yAxis = chart.yAxis[0];

          if (!xAxis || !yAxis) {
            return;
          }

          const px = (value: number) => xAxis.toPixels(value, false) as number;
          const py = (value: number) => yAxis.toPixels(value, false) as number;

          const leftX = px(-0.5);
          const rightX = px(3.5);
          const leftTop = py(4.5);
          const leftBottom = py(-4.5);
          const rightTop = py(1.5);
          const rightBottom = py(-1.5);

          chart._funnelOverlay.push(
            chart.renderer
              .path([
                "M",
                leftX,
                leftTop,
                "L",
                rightX,
                rightTop,
                "L",
                rightX,
                rightBottom,
                "L",
                leftX,
                leftBottom,
                "Z",
              ] as unknown as Highcharts.SVGPathArray)
              .attr({
                fill: "rgba(128,135,232,0.05)",
                stroke: "rgba(128,135,232,0.22)",
                "stroke-width": 1,
                zIndex: 0,
              })
              .add(),
          );

          [0.5, 1.5, 2.5].forEach((dividerX) => {
            const yBound = funnelBoundAtX(dividerX);
            chart._funnelOverlay?.push(
              chart.renderer
                .path([
                  "M",
                  px(dividerX),
                  py(yBound),
                  "L",
                  px(dividerX),
                  py(-yBound),
                ] as unknown as Highcharts.SVGPathArray)
                .attr({
                  stroke: "rgba(100,116,139,0.35)",
                  "stroke-width": 1,
                  dashstyle: "Dash",
                  zIndex: 1,
                })
                .add(),
            );
          });

          STAGE_NAMES.forEach((name, index) => {
            const yBound = funnelBoundAtX(index);
            chart._funnelOverlay?.push(
              chart.renderer
                .text(name, px(index), py(yBound + 0.45))
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
          const index = Math.round(this.value as number);
          return STAGE_NAMES[index] ?? "";
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
        minSize: layout.bubbleMinSize,
        maxSize: layout.bubbleMaxSize,
        zMin: layout.zMin,
        zMax: layout.zMax,
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
              const point = this as Highcharts.Point & { opportunityId?: string };
              const opportunityId =
                typeof point.opportunityId === "string" ? point.opportunityId : "";

              if (opportunityId) {
                onPointClick(opportunityId);
              }
            },
          },
        },
      },
    },
    tooltip: {
      useHTML: true,
      formatter: function () {
        const context = this as unknown as {
          point: Highcharts.Point & {
            z?: number;
            name?: string;
            stage?: string;
            stageName?: string;
            probability?: number;
          };
        };
        const point = context.point;

        return `
          <div style="padding:4px 2px;min-width:160px">
            <div style="font-weight:700;margin-bottom:4px">${point.name ?? ""}</div>
            <div style="font-size:13px">${formatCompactCurrency(Number(point.z ?? 0))}</div>
            <div style="font-size:11px;color:var(--muted-foreground);margin-top:2px">
              ${point.stageName ?? point.stage ?? ""} · ${Number(point.probability ?? 0)}%
            </div>
          </div>`;
      },
    },
    series: series.map((entry) => {
      const size = layout.stageBubbleSizes[entry.name];

      return {
        type: "bubble" as const,
        name: entry.name,
        color: entry.color,
        minSize: size.minSize,
        maxSize: size.maxSize,
        zMin: size.zMin,
        zMax: size.zMax,
        data: entry.data.map((point) => ({
          x: point.x,
          y: point.y,
          z: point.z,
          name: point.name,
          stage: point.stage,
          stageName: point.stageName,
          probability: point.probability,
          opportunityId: point.id,
        })),
      };
    }),
  });
}

export function SalesPipelineView({
  initialData = null,
}: {
  initialData?: SfOpportunityPipelineResponse | null;
}) {
  const [closedRange, setClosedRange] = React.useState<PipelineClosedRange>("ytd");
  const pipelineState = useSalesforcePipeline({
    initialData,
    closedRange,
    initialDataClosedRange: "ytd",
  });
  const isInitialLoading = pipelineState.loading && pipelineState.data === null;
  const allDeals = React.useMemo(
    () => pipelineState.data?.deals ?? [],
    [pipelineState.data],
  );
  const allVisibleDeals = React.useMemo(
    () => allDeals.filter((deal) => !deal.isClosed || deal.isWon),
    [allDeals],
  );
  const rangeBounds = React.useMemo(() => buildDealFilterBounds(allDeals), [allDeals]);
  const ownerOptions = React.useMemo(
    () =>
      Array.from(new Set(allDeals.map((deal) => deal.ownerName).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right),
      ),
    [allDeals],
  );
  const closeQuarterOptions = React.useMemo(
    () => buildCloseQuarterOptions(allDeals),
    [allDeals],
  );
  const rangeFilterConfigs = React.useMemo<RangeFilterConfig[]>(
    () => [
      {
        key: "dealSize",
        label: "Deal Size",
        min: 0,
        max: rangeBounds.maxDealSize,
        step: 10_000,
        format: ([min, max]) => `${formatCompactCurrency(min)} - ${formatCompactCurrency(max)}`,
      },
      {
        key: "probability",
        label: "Probability",
        min: 0,
        max: rangeBounds.maxProbability,
        step: 5,
        format: ([min, max]) => `${min}% - ${max}%`,
      },
      {
        key: "daysOpen",
        label: "Days Open",
        min: 0,
        max: rangeBounds.maxDaysOpen,
        step: 5,
        format: ([min, max]) => `${min}d - ${max}d`,
      },
      {
        key: "timeOpen",
        label: "Time Open",
        min: 0,
        max: rangeBounds.maxTimeOpen,
        step: 5,
        format: ([min, max]) => `${min}d - ${max}d`,
      },
      {
        key: "lastActivityDays",
        label: "Activity Age",
        min: 0,
        max: rangeBounds.maxLastActivityDays,
        step: 5,
        format: ([min, max]) => `${min}d - ${max}d`,
      },
    ],
    [rangeBounds],
  );

  const [selectedStages, setSelectedStages] = React.useState<StageName[]>([...STAGE_NAMES]);
  const [ownerFilter, setOwnerFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [quarterFilter, setQuarterFilter] = React.useState<string>("all");
  const [rangeFilters, setRangeFilters] = React.useState<RangeFilterState>(() =>
    createDefaultRangeFilters(rangeBounds),
  );
  const [selectedOpportunityId, setSelectedOpportunityId] = React.useState<string | null>(null);
  const initializedRangesRef = React.useRef(false);
  const hasAdjustedRangesRef = React.useRef(false);

  React.useEffect(() => {
    if (allDeals.length === 0) {
      initializedRangesRef.current = false;
      hasAdjustedRangesRef.current = false;
      setRangeFilters(createDefaultRangeFilters(rangeBounds));
      return;
    }

    setRangeFilters((current) => {
      if (!initializedRangesRef.current) {
        initializedRangesRef.current = true;
        return createDefaultRangeFilters(rangeBounds);
      }

      if (
        !hasAdjustedRangesRef.current &&
        (
          current.dealSize[1] < rangeBounds.maxDealSize ||
          current.probability[1] < rangeBounds.maxProbability ||
          current.daysOpen[1] < rangeBounds.maxDaysOpen ||
          current.timeOpen[1] < rangeBounds.maxTimeOpen ||
          current.lastActivityDays[1] < rangeBounds.maxLastActivityDays
        )
      ) {
        return createDefaultRangeFilters(rangeBounds);
      }

      return clampRangeFilters(current, rangeBounds);
    });
  }, [allDeals.length, rangeBounds]);

  const allStagesSelected = selectedStages.length === STAGE_NAMES.length;

  const toggleStage = React.useCallback((stage: StageName) => {
    setSelectedStages((current) => {
      if (current.includes(stage)) {
        return current.length === 1 ? current : current.filter((value) => value !== stage);
      }

      return [...current, stage].sort(
        (left, right) => STAGE_NAMES.indexOf(left) - STAGE_NAMES.indexOf(right),
      ) as StageName[];
    });
  }, []);

  const resetFilters = React.useCallback(() => {
    setSelectedStages([...STAGE_NAMES]);
    setOwnerFilter("all");
    setStatusFilter("all");
    setQuarterFilter("all");
    hasAdjustedRangesRef.current = false;
    setRangeFilters(createDefaultRangeFilters(rangeBounds));
  }, [rangeBounds]);

  const scopedDeals = React.useMemo(
    () =>
      allDeals.filter((deal) => {
        const activityAge = deal.lastActivityDays ?? rangeBounds.maxLastActivityDays;

        if (!selectedStages.includes(deal.stageBucket as StageName)) return false;
        if (ownerFilter !== "all" && deal.ownerName !== ownerFilter) return false;
        if (quarterFilter !== "all" && deal.closeQuarter !== quarterFilter) return false;
        if (!valueInRange(deal.amount, rangeFilters.dealSize)) return false;
        if (!valueInRange(deal.probability, rangeFilters.probability)) return false;
        if (!valueInRange(deal.daysOpen, rangeFilters.daysOpen)) return false;
        if (!valueInRange(deal.timeOpen, rangeFilters.timeOpen)) return false;
        if (!valueInRange(activityAge, rangeFilters.lastActivityDays)) return false;
        return true;
      }),
    [allDeals, ownerFilter, quarterFilter, rangeBounds.maxLastActivityDays, rangeFilters, selectedStages],
  );

  const scopedClosedDeals = React.useMemo(
    () => scopedDeals.filter((deal) => deal.isClosed),
    [scopedDeals],
  );
  const scopedWonDeals = React.useMemo(
    () => scopedClosedDeals.filter((deal) => deal.isWon),
    [scopedClosedDeals],
  );
  const scopedLostDeals = React.useMemo(
    () => scopedClosedDeals.filter((deal) => !deal.isWon),
    [scopedClosedDeals],
  );
  const scopedVisibleDeals = React.useMemo(
    () => scopedDeals.filter((deal) => !deal.isClosed || deal.isWon),
    [scopedDeals],
  );

  const filteredDeals = React.useMemo(
    () =>
      scopedVisibleDeals.filter((deal) => {
        if (statusFilter === "open") return !deal.isClosed;
        if (statusFilter === "won") return deal.isWon;
        return true;
      }),
    [scopedVisibleDeals, statusFilter],
  );

  const filteredDealIds = React.useMemo(
    () => new Set(filteredDeals.map((deal) => deal.id)),
    [filteredDeals],
  );
  const deferredFilteredDeals = React.useDeferredValue(filteredDeals);

  React.useEffect(() => {
    if (selectedOpportunityId && !filteredDealIds.has(selectedOpportunityId)) {
      setSelectedOpportunityId(null);
    }
  }, [filteredDealIds, selectedOpportunityId]);

  const filteredWonDeals = React.useMemo(
    () =>
      filteredDeals
        .filter((deal) => deal.isWon)
        .slice()
        .sort((left, right) => (right.closeDate ?? "").localeCompare(left.closeDate ?? "")),
    [filteredDeals],
  );

  const filteredPipelineDeals = React.useMemo(
    () =>
      filteredDeals
        .filter((deal) => !deal.isClosed)
        .slice()
        .sort((left, right) => {
          const leftDate = left.expectedCloseDate ?? left.closeDate ?? "9999-12-31";
          const rightDate = right.expectedCloseDate ?? right.closeDate ?? "9999-12-31";

          return leftDate.localeCompare(rightDate) || right.amount - left.amount;
        }),
    [filteredDeals],
  );

  const representativeFunnelDeals = React.useMemo(
    () => buildRepresentativeFunnelDeals(deferredFilteredDeals),
    [deferredFilteredDeals],
  );

  const representativeFunnelDealIds = React.useMemo(
    () => new Set(representativeFunnelDeals.map((deal) => deal.id)),
    [representativeFunnelDeals],
  );

  const funnelPacking = React.useMemo(
    // Pack a representative slice instead of every visible deal. The exact stage counts and values
    // still come from the full filtered dataset below.
    () => buildFunnelPacking(representativeFunnelDeals),
    [representativeFunnelDeals],
  );

  const stageFilterKpis = React.useMemo(() => {
    const baselineVisibleDeals = allVisibleDeals;

    return STAGE_NAMES.map((stage) => {
      const stageDeals = filteredDeals.filter((deal) => deal.stageBucket === stage);
      const baselineCount = baselineVisibleDeals.filter((deal) => deal.stageBucket === stage).length;
      const value = stageDeals.reduce((sum, deal) => sum + deal.amount, 0);
      const deltaPct =
        baselineCount > 0 ? ((stageDeals.length - baselineCount) / baselineCount) * 100 : 0;

      return {
        stage,
        dealsAdded: stageDeals.length,
        valueAdded: formatCompactCurrency(value),
        deltaPct,
      };
    });
  }, [allVisibleDeals, filteredDeals]);

  const filteredFunnelSeries = React.useMemo<BubbleSeries[]>(
    () =>
      STAGE_NAMES.map((stage) => ({
        name: stage,
        color: FUNNEL_STAGE_COLORS[stage],
        data: funnelPacking.points.filter(
          (point) =>
            point.stage === stage &&
            representativeFunnelDealIds.has(point.id),
        ),
      })),
    [funnelPacking.points, representativeFunnelDealIds],
  );

  const funnelChartOptions = React.useMemo(
    () => buildFunnelChartOptions(filteredFunnelSeries, funnelPacking, setSelectedOpportunityId),
    [filteredFunnelSeries, funnelPacking],
  );

  const kpis = React.useMemo(() => {
    const pipelineValue = filteredPipelineDeals.reduce((sum, deal) => sum + deal.amount, 0);
    const wonValue = filteredWonDeals.reduce((sum, deal) => sum + deal.amount, 0);
    const avgDaysOpen =
      filteredPipelineDeals.length > 0
        ? Math.round(
            filteredPipelineDeals.reduce((sum, deal) => sum + deal.daysOpen, 0) /
              filteredPipelineDeals.length,
          )
        : 0;
    const avgTimeOpen =
      filteredPipelineDeals.length > 0
        ? Math.round(
            filteredPipelineDeals.reduce((sum, deal) => sum + deal.timeOpen, 0) /
              filteredPipelineDeals.length,
          )
        : 0;
    const staleOpenDeals = filteredPipelineDeals.filter((deal) => (deal.lastActivityDays ?? 999) > 14).length;
    const winRate =
      scopedClosedDeals.length > 0
        ? Math.round((scopedWonDeals.length / scopedClosedDeals.length) * 100)
        : 0;

    return [
      {
        title: "Total Pipeline Value",
        value: formatCompactCurrency(pipelineValue),
        subtitle: `${filteredPipelineDeals.length} active opportunities`,
        trend: `${formatCompactCurrency(wonValue)} won in current view`,
        positive: true,
      },
      {
        title: "Deals in Pipe",
        value: String(filteredPipelineDeals.length),
        subtitle: `${filteredWonDeals.length} won visible`,
        trend: `${scopedLostDeals.length} closed-lost in manager scope`,
        positive: true,
      },
      {
        title: "Avg Days Open",
        value: `${avgDaysOpen}d`,
        subtitle: `${avgTimeOpen}d avg time open`,
        trend: `${staleOpenDeals} open deals stale for 14+d`,
        positive: staleOpenDeals <= Math.max(2, Math.round(filteredPipelineDeals.length * 0.25)),
      },
      {
        title: "Win Rate",
        value: `${winRate}%`,
        subtitle: `${scopedWonDeals.length} won of ${scopedClosedDeals.length} closed`,
        trend: `${scopedLostDeals.length} lost in current scope`,
        positive: winRate >= 30,
      },
    ];
  }, [filteredPipelineDeals, filteredWonDeals, scopedClosedDeals, scopedLostDeals, scopedWonDeals]);

  const wonGridOptions = React.useMemo(
    () => buildWonGridOptions(filteredWonDeals.slice(0, MAX_WON_GRID_ROWS)),
    [filteredWonDeals],
  );

  const pipelineGridOptions = React.useMemo(
    () => buildPipelineGridOptions(filteredPipelineDeals),
    [filteredPipelineDeals],
  );

  const selectedDeal = React.useMemo(
    () => filteredDeals.find((deal) => deal.id === selectedOpportunityId) ?? null,
    [filteredDeals, selectedOpportunityId],
  );
  const closedRangeLabel = closedRange === "all" ? "All time" : "YTD";

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Live Opportunity funnel powered through the same Salesforce API layer as daily scorecards.
          </p>
        </div>

        {pipelineState.error ? (
          <Card className="border-red-200 bg-red-50/60">
            <CardContent className="p-4 text-sm text-red-700">
              {pipelineState.error}
            </CardContent>
          </Card>
        ) : null}

        {isInitialLoading ? (
          <Card>
            <CardContent className="flex min-h-[220px] items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Loading live Opportunity pipeline</p>
                <p className="text-sm text-muted-foreground">
                  Pulling the current funnel from Salesforce. The chart will render once the live payload lands.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!isInitialLoading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => (
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

            <Card className="gap-0 py-0">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <CardTitle className="text-base">Manager Filters</CardTitle>
                      <CardDescription>
                        {filteredDeals.length} visible of {scopedVisibleDeals.length} open or won opportunities
                        {` · ${scopedLostDeals.length} closed-lost in scope`}
                        {` · closed history ${closedRangeLabel}`}
                        {pipelineState.loading ? " · Refreshing live data" : ""}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                        <SelectTrigger className="w-[170px] text-sm">
                          <SelectValue placeholder="Owner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All owners</SelectItem>
                          {ownerOptions.map((owner) => (
                            <SelectItem key={owner} value={owner}>
                              {owner}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                        <SelectTrigger className="w-[140px] text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Open + won</SelectItem>
                          <SelectItem value="open">Open only</SelectItem>
                          <SelectItem value="won">Won only</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                        <SelectTrigger className="w-[150px] text-sm">
                          <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All quarters</SelectItem>
                          {closeQuarterOptions.map((quarter) => (
                            <SelectItem key={quarter} value={quarter}>
                              {quarter}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center rounded-lg border border-border/70 p-1">
                        {(["ytd", "all"] as const).map((value) => {
                          const active = closedRange === value;

                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setClosedRange(value)}
                              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {value === "ytd" ? "Closed YTD" : "Closed all time"}
                            </button>
                          );
                        })}
                      </div>

                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Reset filters
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStages([...STAGE_NAMES])}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        allStagesSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      All stages
                    </button>
                    {STAGE_NAMES.map((stage) => {
                      const active = selectedStages.includes(stage);

                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => toggleStage(stage)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {stage}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-2 xl:grid-cols-5">
                {rangeFilterConfigs.map((filter) => (
                  <div key={filter.key} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {filter.label}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {filter.format(rangeFilters[filter.key])}
                      </span>
                    </div>
                    <Slider
                      min={filter.min}
                      max={filter.max}
                      step={filter.step}
                      value={rangeFilters[filter.key]}
                      onValueChange={(values) =>
                        {
                          hasAdjustedRangesRef.current = true;

                          setRangeFilters((current) => ({
                            ...current,
                            [filter.key]: sortRange(values),
                          }));
                        }
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-base">Pipeline Funnel</CardTitle>
                  <CardDescription>
                    Representative deal sample for the filtered Opportunity set. Stage counts and values remain exact.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                <DashboardHighchart options={funnelChartOptions} className="h-[460px] w-full" />
              </CardContent>

              <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
                {stageFilterKpis.map((stageSummary, index) => (
                  <div
                    key={stageSummary.stage}
                    className={`flex flex-col gap-2 p-5 ${index < stageFilterKpis.length - 1 ? "border-r border-border" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: FUNNEL_STAGE_COLORS[stageSummary.stage] }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {stageSummary.stage}
                      </span>
                    </div>

                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold tabular-nums leading-none">
                        {stageSummary.dealsAdded}
                      </span>
                      <span className="mb-0.5 text-sm text-muted-foreground">deals</span>
                    </div>

                    <div className="text-base font-semibold tabular-nums text-foreground">
                      {stageSummary.valueAdded}
                    </div>

                    <p
                      className={`text-xs font-medium ${
                        stageSummary.deltaPct > 0
                          ? "text-emerald-500"
                          : stageSummary.deltaPct < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {`${stageSummary.deltaPct > 0 ? "+" : ""}${Math.round(stageSummary.deltaPct)}%`} vs all visible opportunities
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-5 gap-4">
              <Card className="col-span-5 gap-0 py-0 xl:col-span-2">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-base">Latest Sales</CardTitle>
                  <CardDescription>
                    Latest {Math.min(filteredWonDeals.length, MAX_WON_GRID_ROWS)} closed-won opportunities in the current manager scope · {closedRangeLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  <HighchartsGridPro options={wonGridOptions} className="sp-pipeline-grid h-[220px]" />
                </CardContent>
              </Card>

              <Card className="col-span-5 gap-0 py-0 xl:col-span-3">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-base">In the Pipe</CardTitle>
                  <CardDescription>Active opportunities filtered for sales-manager review</CardDescription>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  <HighchartsGridPro options={pipelineGridOptions} className="sp-pipeline-grid h-[350px]" />
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>

      {selectedDeal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedOpportunityId(null)}
        >
          <div
            className="mx-4 w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold leading-none tracking-tight">{selectedDeal.company}</h3>
                <p className="text-sm text-muted-foreground">{selectedDeal.dealName}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`sp-stage-badge ${stageBadgeClass(selectedDeal.stageBucket as StageName)} text-xs`}>
                    {selectedDeal.stageBucket}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {selectedDeal.ownerName}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {selectedDeal.closeQuarter}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOpportunityId(null)}
                className="ml-3 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mx-6 mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border">
              {[
                { label: "Opportunity ID", value: selectedDeal.id },
                { label: "Deal Size", value: formatCompactCurrency(selectedDeal.amount) },
                { label: "Probability", value: `${selectedDeal.probability}%` },
                { label: "Owner", value: selectedDeal.ownerName },
                { label: "Actual Stage", value: selectedDeal.stageName },
                { label: "Funnel Bucket", value: selectedDeal.stageBucket },
                { label: "Days Open", value: `${selectedDeal.daysOpen}d` },
                { label: "Time Open", value: `${selectedDeal.timeOpen}d` },
                { label: "Woo Order ID", value: selectedDeal.wooOrderId ?? "No linked Woo order" },
                {
                  label: selectedDeal.isWon ? "Closed" : "Expected Close",
                  value:
                    selectedDeal.expectedCloseDate ??
                    selectedDeal.closeDate ??
                    "Unknown",
                },
                { label: "Created", value: selectedDeal.createdDate },
                {
                  label: "Last Activity",
                  value:
                    selectedDeal.lastActivityDate ??
                    "No logged activity",
                },
                { label: "Close Quarter", value: selectedDeal.closeQuarter },
                {
                  label: "Loss Reason",
                  value: selectedDeal.lossReason ?? "Not lost",
                },
              ].map(({ label, value }) => (
                <div key={label} className="bg-card px-3 py-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
