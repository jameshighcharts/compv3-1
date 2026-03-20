"use client";

import * as React from "react";

import Highcharts from "@/shared/charts/highcharts-init";
import { DashboardHighchart, chartColor, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

// ── Scorecard data ───────────────────────────────────────────────────────────

const REVENUE_SCORECARD = {
  mtd: {
    actual: 482_300,
    target: 620_000,
    lastYear: 445_000,
    label: "MTD Revenue",
    period: "Mar 1–20, 2026",
  },
  ytd: {
    actual: 1_204_750,
    target: 6_200_000,
    lastYear: 1_080_000,
    label: "YTD Revenue",
    period: "Jan 1 – Mar 20, 2026",
  },
};

const BUDGET_VS_ACTUAL = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  budget:  [580, 560, 620, 600, 640, 660, 620, 600, 580, 640, 700, 750],
  actual:  [540, 510, 482, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  lastYear:[520, 490, 445, 580, 610, 630, 590, 560, 540, 600, 670, 720],
  pace: "$55,556/day from $14M / 252 workdays",
};

type BattleKey = "new-licenses" | "morningstar" | "r-ai";

interface BattleData {
  label: string;
  mtd: { actual: number; target: number; lastYear: number };
  ytd: { actual: number; target: number; lastYear: number };
  chart: { months: string[]; actual: number[]; target: number[]; lastYear: number[] };
}

const BATTLES: Record<BattleKey, BattleData> = {
  "new-licenses": {
    label: "New Licenses",
    mtd: { actual: 142_000, target: 180_000, lastYear: 128_000 },
    ytd: { actual: 386_000, target: 1_800_000, lastYear: 340_000 },
    chart: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      actual:   [118, 126, 142, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      target:   [150, 160, 180, 170, 190, 200, 180, 170, 160, 190, 210, 230],
      lastYear: [110, 118, 128, 155, 165, 175, 160, 150, 140, 170, 195, 210],
    },
  },
  morningstar: {
    label: "Morningstar Sales",
    mtd: { actual: 98_500, target: 120_000, lastYear: 82_000 },
    ytd: { actual: 264_000, target: 1_200_000, lastYear: 218_000 },
    chart: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      actual:   [78, 87, 99, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      target:   [100, 105, 120, 110, 115, 125, 120, 110, 105, 120, 130, 140],
      lastYear: [72, 80, 82, 95, 100, 108, 102, 95, 90, 105, 115, 125],
    },
  },
  "r-ai": {
    label: "R-AI",
    mtd: { actual: 64_200, target: 85_000, lastYear: 0 },
    ytd: { actual: 178_000, target: 850_000, lastYear: 0 },
    chart: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      actual:   [52, 62, 64, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      target:   [60, 70, 85, 75, 80, 90, 85, 75, 70, 85, 95, 100],
      lastYear: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
};

const BATTLE_KEYS: BattleKey[] = ["new-licenses", "morningstar", "r-ai"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function pctOf(actual: number, target: number): number {
  return target > 0 ? Math.round((actual / target) * 100) : 0;
}

// ── Scorecard card ───────────────────────────────────────────────────────────

function ScorecardCard({
  label,
  period,
  actual,
  target,
  lastYear,
}: {
  label: string;
  period: string;
  actual: number;
  target: number;
  lastYear: number;
}) {
  const pct = pctOf(actual, target);
  const beatLastYear = actual >= lastYear;
  const vsLastYear = lastYear > 0
    ? `${beatLastYear ? "+" : ""}${(((actual - lastYear) / lastYear) * 100).toFixed(1)}%`
    : "N/A";

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight">{fmtK(actual)}</p>

        {/* Progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#8087E8] transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{pct}% of {fmtK(target)}</span>
          <span>{period}</span>
        </div>

        {/* Beat last year badge */}
        <div className="mt-2.5">
          {lastYear > 0 ? (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                beatLastYear
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              ].join(" ")}
            >
              {beatLastYear ? "▲" : "▼"} {vsLastYear} vs last year
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">No prior year data</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Budget vs Actual chart ───────────────────────────────────────────────────

function useBudgetVsActualOptions() {
  return React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "column", height: 280, spacing: [12, 6, 8, 4] },
        xAxis: {
          categories: BUDGET_VS_ACTUAL.months,
          tickLength: 0,
        },
        yAxis: {
          title: { text: undefined },
          labels: { format: "${value}K" },
          gridLineDashStyle: "Dash",
        },
        tooltip: {
          shared: true,
          pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y}K</b><br/>',
        },
        legend: {
          enabled: true,
          align: "left",
          verticalAlign: "top",
          itemStyle: { fontSize: "11px", fontWeight: "600" },
        },
        plotOptions: {
          column: { borderWidth: 0, borderRadius: 3, pointPadding: 0.1, groupPadding: 0.15 },
          spline: { lineWidth: 2, marker: { radius: 3 }, dashStyle: "ShortDash" as Highcharts.DashStyleValue },
          series: { animation: false },
        },
        series: mergeSeriesColors(
          [
            { type: "column", name: "Actual", data: BUDGET_VS_ACTUAL.actual },
            { type: "column", name: "Budget", data: BUDGET_VS_ACTUAL.budget },
            { type: "spline", name: "Last Year", data: BUDGET_VS_ACTUAL.lastYear },
          ],
          [chartColor(0), chartColor(2), "#94a3b8"],
        ),
      }),
    [],
  );
}

// ── Battle chart builder ─────────────────────────────────────────────────────

function useBattleChartOptions(battle: BattleData) {
  return React.useMemo(
    () =>
      createBaseChartOptions({
        chart: { type: "column", height: 240, spacing: [8, 4, 4, 4] },
        xAxis: {
          categories: battle.chart.months,
          tickLength: 0,
          labels: { style: { fontSize: "10px" } },
        },
        yAxis: {
          title: { text: undefined },
          labels: { format: "${value}K", style: { fontSize: "10px" } },
          gridLineDashStyle: "Dash",
        },
        tooltip: {
          shared: true,
          pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>${point.y}K</b><br/>',
        },
        legend: {
          enabled: true,
          align: "left",
          verticalAlign: "top",
          itemStyle: { fontSize: "10px", fontWeight: "600" },
        },
        plotOptions: {
          column: { borderWidth: 0, borderRadius: 3, pointPadding: 0.08, groupPadding: 0.12 },
          spline: { lineWidth: 2, marker: { radius: 2.5 }, dashStyle: "ShortDash" as Highcharts.DashStyleValue },
          series: { animation: false },
        },
        series: mergeSeriesColors(
          [
            { type: "column", name: "Actual", data: battle.chart.actual },
            { type: "column", name: "Target", data: battle.chart.target },
            ...(battle.chart.lastYear.some((v) => v > 0)
              ? [{ type: "spline" as const, name: "Last Year", data: battle.chart.lastYear }]
              : []),
          ],
          [chartColor(0), chartColor(2), "#94a3b8"],
        ),
      }),
    [battle],
  );
}

// ── Battle panel ─────────────────────────────────────────────────────────────

function BattlePanel({ battle }: { battle: BattleData }) {
  const chartOptions = useBattleChartOptions(battle);
  return <DashboardHighchart options={chartOptions} className="h-[300px] w-full" />;
}

// ── Toggle pills ─────────────────────────────────────────────────────────────

function BattleToggle({
  value,
  onChange,
}: {
  value: BattleKey;
  onChange: (v: BattleKey) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {BATTLE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={[
            "rounded-md px-3 py-1 text-[11px] font-semibold transition-all",
            value === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {BATTLES[key].label}
        </button>
      ))}
    </div>
  );
}

// ── Main tab ─────────────────────────────────────────────────────────────────

export function DashboardOverviewTab() {
  const [activeBattle, setActiveBattle] = React.useState<BattleKey>("new-licenses");
  const budgetVsActualOptions = useBudgetVsActualOptions();
  const battle = BATTLES[activeBattle];

  return (
    <div className="grid gap-5 xl:grid-cols-2">

      {/* ── Left: Revenue ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScorecardCard
            label={REVENUE_SCORECARD.mtd.label}
            period={REVENUE_SCORECARD.mtd.period}
            actual={REVENUE_SCORECARD.mtd.actual}
            target={REVENUE_SCORECARD.mtd.target}
            lastYear={REVENUE_SCORECARD.mtd.lastYear}
          />
          <ScorecardCard
            label={REVENUE_SCORECARD.ytd.label}
            period={REVENUE_SCORECARD.ytd.period}
            actual={REVENUE_SCORECARD.ytd.actual}
            target={REVENUE_SCORECARD.ytd.target}
            lastYear={REVENUE_SCORECARD.ytd.lastYear}
          />
        </div>

        <Card className="gap-0 py-0">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Revenue: Budget vs Actual
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Pace {BUDGET_VS_ACTUAL.pace}
            </p>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <DashboardHighchart options={budgetVsActualOptions} className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* ── Right: Must Win Battles ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScorecardCard
            label={`${battle.label} · MTD`}
            period="Mar 1–20"
            actual={battle.mtd.actual}
            target={battle.mtd.target}
            lastYear={battle.mtd.lastYear}
          />
          <ScorecardCard
            label={`${battle.label} · YTD`}
            period="Jan – Mar 20"
            actual={battle.ytd.actual}
            target={battle.ytd.target}
            lastYear={battle.ytd.lastYear}
          />
        </div>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between pb-0 pt-4">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Must Win Battles
              </CardTitle>
              <p className="text-xs text-muted-foreground">{battle.label}</p>
            </div>
            <BattleToggle value={activeBattle} onChange={setActiveBattle} />
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <BattlePanel battle={battle} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
