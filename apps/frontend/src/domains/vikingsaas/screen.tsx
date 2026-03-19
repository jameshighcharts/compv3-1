"use client";

import * as React from "react";
import { IconDownload } from "@tabler/icons-react";

import { useScorecardArr } from "@/lib/sf/use-scorecard-arr";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

import { HCARRHoneycomb } from "./widgets/honeycomb";
import { DetailPanel } from "./widgets/detail-panel";
import { HEX_TO_PANEL } from "./data/vikingsaas.data";

// ── Legend items ──────────────────────────────────────────────────────────────
const LEGEND = [
  { color: "#1a2e2a", label: "Growth & Profitability" },
  { color: "#4a7c59", label: "CAC & Sales Efficiency" },
  { color: "#f5f0d0", label: "Coverage Model & Sales Process", dark: true },
];

function formatCompactCurrency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPlainPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function HCARRView() {
  const arrState = useScorecardArr();
  const [selectedHex, setSelectedHex] = React.useState<number | null>(null);
  const data = arrState.data;
  const currencyCode = data?.currencyCode ?? "USD";

  const handleHexClick = React.useCallback((id: number) => {
    // Toggle: click the same hex again to close the panel
    setSelectedHex((prev) => (prev === id ? null : id));
  }, []);

  const closePanel = React.useCallback(() => setSelectedHex(null), []);

  // Close on Escape key
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePanel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePanel]);

  const hasPanel = selectedHex != null && !!HEX_TO_PANEL[selectedHex];
  const metricValues = React.useMemo<Partial<Record<number, string>>>(() => {
    if (!data) {
      return {};
    }

    return {
      1: formatCompactCurrency(data.currentSnapshot.totalArr, currencyCode),
      2: formatPct(data.trailingTwelveMonths.totalArrGrowthPct),
      3: formatPct(data.trailingTwelveMonths.organicArrGrowthPct),
      4: formatPct(data.trailingTwelveMonths.newSalesArrGrowthPct),
      5: formatPlainPct(data.trailingTwelveMonths.recurringRevenuePct),
      6: formatPlainPct(data.trailingTwelveMonths.arrChurnPct),
      7: formatPlainPct(data.trailingTwelveMonths.renewalRatePct),
      14: formatPlainPct(data.trailingTwelveMonths.netRevenueRetentionPct),
      21: formatPlainPct(data.currentSnapshot.topCustomerSharePct),
      22: formatPlainPct(data.currentSnapshot.topIndustrySharePct),
      23: formatCompactCurrency(data.currentSnapshot.arrPerCustomer, currencyCode),
      24: formatCompactCurrency(data.trailingTwelveMonths.averageSalesPrice, currencyCode),
    };
  }, [currencyCode, data]);
  const highlights = React.useMemo(() => {
    if (!data) {
      return [
        { label: "Total ARR", value: "—", sub: "Loading live Woo ARR" },
        { label: "TTM ARR Growth", value: "—", sub: "Waiting for live bridge" },
        { label: "NRR", value: "—", sub: "Waiting for cohort rollup" },
      ];
    }

    return [
      {
        label: "Total ARR",
        value: formatCompactCurrency(data.currentSnapshot.totalArr, currencyCode),
        sub: `${data.currentSnapshot.activeSubscriptions.toLocaleString("en-US")} active subscriptions`,
      },
      {
        label: "TTM ARR Growth",
        value: formatPlainPct(data.trailingTwelveMonths.totalArrGrowthPct),
        sub: `${formatPlainPct(data.trailingTwelveMonths.organicArrGrowthPct)} organic growth`,
      },
      {
        label: "NRR",
        value: formatPlainPct(data.trailingTwelveMonths.netRevenueRetentionPct),
        sub: `${formatPlainPct(data.trailingTwelveMonths.renewalRatePct)} renewal rate`,
      },
    ];
  }, [currencyCode, data]);

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HC ARR KPI Dashboard</h1>
          <p className="text-muted-foreground">
            Live Woo ARR engine · snapshot {data ? data.asOfDate : "loading"} · latest full month {data?.latestFullMonthLabel ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="fy24">
            <SelectTrigger className="w-[130px]" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q4">Q4 2024</SelectItem>
              <SelectItem value="fy24">FY 2024</SelectItem>
              <SelectItem value="fy23">FY 2023</SelectItem>
              <SelectItem value="ttm">TTM</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline">
            <IconDownload className="mr-2 size-4" aria-hidden="true" />
            Export
          </Button>
          <div className="rounded-full border border-[#4a7c59]/20 bg-[#4a7c59]/8 px-3 py-1 text-xs font-medium text-muted-foreground">
            {arrState.loading && data ? "Refreshing live data..." : "Live ARR + placeholder finance metrics"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">

        {/* ── Honeycomb card ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>HC ARR KPI Dashboard — Honeycomb</CardTitle>
                <CardDescription>
                  27 KPIs across three clusters · click a highlighted cell to drill into detail
                </CardDescription>
              </div>
              {/* Colour legend */}
              <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-4 shrink-0 rounded-sm border border-border/60"
                      style={{ background: l.color }}
                    />
                    <span className="text-[11px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto pb-4">
            <div className="min-w-[760px]">
              <HCARRHoneycomb
                selectedId={selectedHex}
                onHexClick={handleHexClick}
                metricValues={metricValues}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Detail panel — fixed modal overlay ───────────────────────────── */}
        {hasPanel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}
          >
            <div className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-xl shadow-2xl">
              <DetailPanel hexId={selectedHex} onClose={closePanel} data={data} />
            </div>
          </div>
        )}

        {/* ── KPI highlight row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {highlights.map((h) => (
            <Card key={h.label} className="gap-0 py-0">
              <CardContent className="px-5 py-4">
                <p className="text-[11px] font-medium text-muted-foreground">{h.label}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{h.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{h.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="gap-0 py-0">
          <CardContent className="px-5 py-4 text-xs text-muted-foreground">
            Supported honeycomb cells now use live Woo subscription, order, and order-line logic. Finance, HR, and CAC-driven cells remain placeholder values until those source systems are wired in.
          </CardContent>
        </Card>

        {/* ── Metric glossary strip ─────────────────────────────────────────────── */}
        <Card className="gap-0 py-0">
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-base">KPI Reference</CardTitle>
            <CardDescription>
              27 HC ARR Framework metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-1 gap-x-8 gap-y-0 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
              {GLOSSARY.map((g) => (
                <div
                  key={g.name}
                  className="flex items-center justify-between gap-2 border-b border-border/30 py-2.5"
                >
                  <span className="font-medium text-foreground/80">{g.name}</span>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {g.type}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ── Glossary data ─────────────────────────────────────────────────────────────

const GLOSSARY = [
  // Growth & Profitability
  { name: "Total ARR",                cat: "Growth",   type: "$" },
  { name: "Total ARR Growth",         cat: "Growth",   type: "%" },
  { name: "Organic ARR Growth Rate",  cat: "Growth",   type: "%" },
  { name: "New Sales ARR Growth",     cat: "Growth",   type: "%" },
  { name: "% Recurring Revenue",      cat: "Growth",   type: "%" },
  { name: "Churn (ARR & Customer)",   cat: "Growth",   type: "%" },
  { name: "Renewal Rate",             cat: "Growth",   type: "%" },
  { name: "Rule of 40",               cat: "Growth",   type: "Score" },
  { name: "SaaS Gross Margin",        cat: "Growth",   type: "%" },
  { name: "Growth Endurance",         cat: "Growth",   type: "Ratio" },
  { name: "EBITDA",                   cat: "Growth",   type: "%/$" },
  { name: "EBITDA-Capex",             cat: "Growth",   type: "$" },
  { name: "Operating Cash Flow/FCF",  cat: "Growth",   type: "$" },
  // CAC & Sales Efficiency
  { name: "Net Revenue Retention",    cat: "CAC",      type: "%" },
  { name: "CAC Payback",              cat: "CAC",      type: "Months" },
  { name: "LTV / CAC",                cat: "CAC",      type: "Ratio" },
  { name: "SaaS Magic Number",        cat: "CAC",      type: "Ratio" },
  { name: "Yield per Rep",            cat: "CAC",      type: "$" },
  { name: "S&M % of ARR",             cat: "CAC",      type: "%" },
  { name: "R&D % of ARR",             cat: "CAC",      type: "%" },
  // Coverage Model
  { name: "Customer Concentration",   cat: "Coverage", type: "%" },
  { name: "Industry Concentration",   cat: "Coverage", type: "%" },
  { name: "ARR per Customer",         cat: "Coverage", type: "$" },
  { name: "Average Sales Price",      cat: "Coverage", type: "$" },
  { name: "ARR / FTEs",               cat: "Coverage", type: "$" },
  { name: "Employee Costs / FTEs",    cat: "Coverage", type: "$" },
  { name: "Employee Cost Total",      cat: "Coverage", type: "$" },
];
