"use client";

import React from "react";

import { HEX_TO_PANEL, concentrationTrend } from "../data/vikingsaas.data";

// ── Types ────────────────────────────────────────────────────────────────────

interface Metric {
  id: number;
  label: string;
  defaultValue: string;
  trend: number[];
  peer: string;
  invert?: boolean;
}

interface MetricGroup {
  label: string;
  accent: string;
  metrics: Metric[];
}

// ── Data ─────────────────────────────────────────────────────────────────────

const GROUPS: MetricGroup[] = [
  {
    label: "Growth",
    accent: "#1c3328",
    metrics: [
      { id: 1,  label: "Total ARR",        defaultValue: "$4.2M",  peer: "$3.8M",  trend: [3200, 3400, 3580, 3600, 3720, 3860, 4040, 4200] },
      { id: 2,  label: "ARR Growth",       defaultValue: "+16%",   peer: "18%",    trend: [28, 26, 24, 22, 20, 18, 17, 16] },
      { id: 3,  label: "Organic Growth",   defaultValue: "+13%",   peer: "15%",    trend: [22, 20, 18, 16, 15, 14, 14, 13] },
      { id: 4,  label: "New Sales Growth", defaultValue: "+18%",   peer: "21%",    trend: [32, 30, 26, 24, 22, 20, 19, 18] },
      { id: 10, label: "Rolling 12M ARR",  defaultValue: "$4.6M",  peer: "$4.1M",  trend: [3133, 3364, 3562, 3785, 3988, 4076, 4297, 4644] },
    ],
  },
  {
    label: "Retention",
    accent: "#2f6c45",
    metrics: [
      { id: 14, label: "NRR",             defaultValue: "108%",   peer: "106%",   trend: [104, 105, 106, 106, 107, 107, 108, 108] },
      { id: 5,  label: "Recurring Rev",   defaultValue: "87%",    peer: "85%",    trend: [82, 83, 84, 84, 85, 86, 86, 87] },
      { id: 7,  label: "Renewal Rate",    defaultValue: "91%",    peer: "91%",    trend: [86, 87, 88, 89, 89, 90, 90, 91] },
      { id: 6,  label: "Churn",           defaultValue: "8.5%",   peer: "9%",     trend: [12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5], invert: true },
    ],
  },
  {
    label: "Concentration & Pricing",
    accent: "#8a8434",
    metrics: [
      { id: 23, label: "ARR / Customer",  defaultValue: "$42K",   peer: "$38K",   trend: [30, 32, 34, 36, 38, 39, 40, 42] },
      { id: 21, label: "Customer Conc.",   defaultValue: "12%",    peer: "15%",    trend: concentrationTrend.series[0].data, invert: true },
      { id: 22, label: "Industry Conc.",   defaultValue: "34%",    peer: "30%",    trend: concentrationTrend.series[1].data, invert: true },
      { id: 24, label: "Avg Sales Price",  defaultValue: "$38K",   peer: "$35K",   trend: [28, 30, 32, 33, 34, 35, 36, 38] },
    ],
  },
];

// ── Tiny sparkline ───────────────────────────────────────────────────────────

function Spark({ data, color }: { data: number[]; color: string }) {
  const w = 64;
  const h = 20;
  if (data.length < 2) return <div style={{ width: w, height: h }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`)
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Exported section ─────────────────────────────────────────────────────────

interface Props {
  metricValues?: Partial<Record<number, string>>;
  onKpiClick?: (id: number) => void;
}

export function CompetitivePositionSection({ metricValues, onKpiClick }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {GROUPS.map((group) => (
        <div key={group.label}>
          {/* Group header */}
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: group.accent }} />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </span>
          </div>

          {/* Metric rows */}
          <div className="space-y-0 divide-y divide-border/40">
            {group.metrics.map((m) => {
              const isClickable = !!HEX_TO_PANEL[m.id];
              const val = metricValues?.[m.id] ?? m.defaultValue;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={isClickable && onKpiClick ? () => onKpiClick(m.id) : undefined}
                  disabled={!isClickable}
                  className={[
                    "flex w-full items-center gap-3 py-3 text-left transition-colors",
                    isClickable ? "cursor-pointer hover:bg-muted/40" : "cursor-default",
                  ].join(" ")}
                >
                  {/* Label */}
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-muted-foreground">
                    {m.label}
                  </span>

                  {/* Sparkline */}
                  <Spark data={m.trend} color={group.accent} />

                  {/* Value */}
                  <span className="w-[72px] text-right text-[15px] font-bold tabular-nums tracking-tight text-foreground">
                    {val}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
