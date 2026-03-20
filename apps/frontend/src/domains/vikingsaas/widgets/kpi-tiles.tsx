"use client";

import React from "react";
import { useTheme } from "next-themes";

import { HEX_TO_PANEL, concentrationTrend } from "../data/vikingsaas.data";

// ── Types ────────────────────────────────────────────────────────────────────

type Group = 1 | 2 | 3;

interface KpiDef {
  id: number;
  label: string;
  defaultValue: string;
  group: Group;
  /** Is this the hero metric for its group? */
  hero?: boolean;
  /** Peer benchmark label */
  peer?: string;
  /** Quarterly trend data (8 points) */
  trend?: number[];
  /** Is higher better? Controls colour of delta */
  higherIsBetter: boolean;
}

// ── Palette ──────────────────────────────────────────────────────────────────

interface Palette {
  bg: string;
  text: string;
  sub: string;
  accent: string;
  spark: string;
}

const GROUP_COLORS: Record<"light" | "dark", Record<1 | 2 | 3, Palette>> = {
  light: {
    1: { bg: "#1c3328", text: "#fff", sub: "rgba(255,255,255,0.58)", accent: "#6dba88", spark: "#8fe0a8" },
    2: { bg: "#2f6c45", text: "#fff", sub: "rgba(255,255,255,0.58)", accent: "#a3edba", spark: "#c0f5d0" },
    3: { bg: "#eae5bf", text: "#1c3328", sub: "rgba(28,51,40,0.50)", accent: "#8a8434", spark: "#b5ae5a" },
  },
  dark: {
    1: { bg: "#1c3328", text: "#fff", sub: "rgba(255,255,255,0.50)", accent: "#6dba88", spark: "#8fe0a8" },
    2: { bg: "#2f6c45", text: "#fff", sub: "rgba(255,255,255,0.50)", accent: "#a3edba", spark: "#c0f5d0" },
    3: { bg: "#273c1e", text: "#d9e8c0", sub: "rgba(217,232,192,0.50)", accent: "#c8be72", spark: "#ddd88a" },
  },
};

const GROUP_LABELS: Record<Group, string> = {
  1: "ARR Growth",
  2: "Retention & Revenue Quality",
  3: "Concentration & Pricing",
};

// ── KPI definitions with real trend data ─────────────────────────────────────

const KPIS: KpiDef[] = [
  // ── Group 1 — ARR Growth ─────────────────────────────────────────────────
  {
    id: 1, label: "Total ARR", defaultValue: "$4.2M", group: 1, hero: true,
    higherIsBetter: true,
    trend: [3200, 3400, 3580, 3600, 3720, 3860, 4040, 4200],
    peer: "Peer: $3.8M",
  },
  {
    id: 2, label: "Total ARR Growth", defaultValue: "+16%", group: 1,
    higherIsBetter: true,
    trend: [28, 26, 24, 22, 20, 18, 17, 16],
    peer: "Peer: +18%",
  },
  {
    id: 3, label: "Organic Growth", defaultValue: "+13%", group: 1,
    higherIsBetter: true,
    trend: [22, 20, 18, 16, 15, 14, 14, 13],
    peer: "Peer: +15%",
  },
  {
    id: 4, label: "New Sales Growth", defaultValue: "+18%", group: 1,
    higherIsBetter: true,
    trend: [32, 30, 26, 24, 22, 20, 19, 18],
    peer: "Peer: +21%",
  },
  {
    id: 10, label: "Rolling 12M ARR", defaultValue: "$4.6M", group: 1,
    higherIsBetter: true,
    trend: [3133, 3364, 3562, 3785, 3988, 4076, 4297, 4644],
    peer: "Peer: $4.1M",
  },

  // ── Group 2 — Retention & Revenue Quality ────────────────────────────────
  {
    id: 14, label: "Net Revenue Retention", defaultValue: "108%", group: 2, hero: true,
    higherIsBetter: true,
    trend: [104, 105, 106, 106, 107, 107, 108, 108],
    peer: "Peer: 106%",
  },
  {
    id: 5, label: "Recurring Revenue", defaultValue: "87%", group: 2,
    higherIsBetter: true,
    trend: [82, 83, 84, 84, 85, 86, 86, 87],
    peer: "Peer: 85%",
  },
  {
    id: 7, label: "Renewal Rate", defaultValue: "91%", group: 2,
    higherIsBetter: true,
    trend: [86, 87, 88, 89, 89, 90, 90, 91],
    peer: "Peer: 91%",
  },
  {
    id: 6, label: "ARR Churn", defaultValue: "8.5%", group: 2,
    higherIsBetter: false,
    trend: [12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5],
    peer: "Peer: 9%",
  },

  // ── Group 3 — Concentration & Pricing ────────────────────────────────────
  {
    id: 23, label: "ARR per Customer", defaultValue: "$42K", group: 3, hero: true,
    higherIsBetter: true,
    trend: [30, 32, 34, 36, 38, 39, 40, 42],
    peer: "Peer: $38K",
  },
  {
    id: 21, label: "Customer Conc.", defaultValue: "12%", group: 3,
    higherIsBetter: false,
    trend: concentrationTrend.series[0].data,
    peer: "Peer: 15%",
  },
  {
    id: 22, label: "Industry Conc.", defaultValue: "34%", group: 3,
    higherIsBetter: false,
    trend: concentrationTrend.series[1].data,
    peer: "Peer: 30%",
  },
  {
    id: 24, label: "Avg Sales Price", defaultValue: "$38K", group: 3,
    higherIsBetter: true,
    trend: [28, 30, 32, 33, 34, 35, 36, 38],
    peer: "Peer: $35K",
  },
];

// ── SVG Sparkline ────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color,
  width = 72,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Area fill path
  const firstX = pad;
  const lastX = pad + w;
  const areaPath = `M${points[0]} ${points.slice(1).map((p) => `L${p}`).join(" ")} L${lastX},${height} L${firstX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={2.5}
        fill={color}
      />
    </svg>
  );
}

// ── Trend direction badge ────────────────────────────────────────────────────

function TrendBadge({ data, higherIsBetter, palette }: { data: number[]; higherIsBetter: boolean; palette: Palette }) {
  if (data.length < 2) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const delta = ((last - first) / Math.abs(first || 1)) * 100;
  const isUp = delta > 0;
  const isGood = higherIsBetter ? isUp : !isUp;

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
      style={{
        background: isGood ? "rgba(109,186,136,0.18)" : "rgba(240,160,80,0.18)",
        color: isGood ? palette.accent : "#e8a040",
      }}
    >
      {isUp ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
    </span>
  );
}

// ── Ring progress ────────────────────────────────────────────────────────────

function RingProgress({
  value,
  max = 100,
  size = 80,
  strokeW = 6,
  color,
  trackColor,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeW?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">{children}</div>
    </div>
  );
}

// ── Hero card (big metric with ring + sparkline) ─────────────────────────────

function HeroCard({
  kpi,
  displayValue,
  palette,
  onClick,
}: {
  kpi: KpiDef;
  displayValue: string;
  palette: Palette;
  onClick?: () => void;
}) {
  const isClickable = !!HEX_TO_PANEL[kpi.id];
  // Parse a numeric value for the ring
  const numVal = parseFloat(displayValue.replace(/[^0-9.\-]/g, ""));
  const ringVal = displayValue.includes("$")
    ? 75 // currency metrics: static ring fill
    : Math.min(Math.abs(numVal), 120);
  const ringMax = displayValue.includes("$") ? 100 : 120;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className="group flex w-full items-center gap-5 rounded-2xl px-5 py-5 text-left transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.995]"
      style={{ background: palette.bg, cursor: isClickable ? "pointer" : "default" }}
    >
      {/* Ring */}
      <RingProgress
        value={ringVal}
        max={ringMax}
        size={76}
        strokeW={5}
        color={palette.accent}
        trackColor={kpi.group === 3 ? "rgba(28,51,40,0.08)" : "rgba(255,255,255,0.10)"}
      >
        <span style={{ color: palette.text }} className="text-lg font-extrabold tracking-tight leading-none">
          {displayValue}
        </span>
      </RingProgress>

      {/* Text + sparkline */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: palette.sub }}>
          {kpi.label}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {kpi.trend && <Sparkline data={kpi.trend} color={palette.spark} />}
          {kpi.trend && <TrendBadge data={kpi.trend} higherIsBetter={kpi.higherIsBetter} palette={palette} />}
        </div>
        {kpi.peer && (
          <p className="mt-1.5 text-[10px] font-medium" style={{ color: palette.sub }}>
            {kpi.peer}
          </p>
        )}
      </div>

      {/* Click hint */}
      {isClickable && (
        <svg
          className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-50"
          style={{ color: palette.text }}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </button>
  );
}

// ── Compact metric row ───────────────────────────────────────────────────────

function MetricRow({
  kpi,
  displayValue,
  palette,
  onClick,
}: {
  kpi: KpiDef;
  displayValue: string;
  palette: Palette;
  onClick?: () => void;
}) {
  const isClickable = !!HEX_TO_PANEL[kpi.id];

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.995]"
      style={{
        background: palette.bg,
        opacity: 0.88,
        cursor: isClickable ? "pointer" : "default",
      }}
    >
      {/* Sparkline */}
      <div className="shrink-0">
        {kpi.trend ? (
          <Sparkline data={kpi.trend} color={palette.spark} width={56} height={24} />
        ) : (
          <div className="h-6 w-14" />
        )}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: palette.sub }}>
          {kpi.label}
        </p>
        {kpi.peer && (
          <p className="mt-0.5 text-[9px] font-medium" style={{ color: palette.sub, opacity: 0.7 }}>
            {kpi.peer}
          </p>
        )}
      </div>

      {/* Value + trend */}
      <div className="flex shrink-0 items-center gap-2">
        {kpi.trend && <TrendBadge data={kpi.trend} higherIsBetter={kpi.higherIsBetter} palette={palette} />}
        <span className="text-base font-extrabold tabular-nums tracking-tight" style={{ color: palette.text }}>
          {displayValue}
        </span>
      </div>

      {/* Click hint */}
      {isClickable && (
        <svg
          className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50"
          style={{ color: palette.text }}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </button>
  );
}

// ── Exported section ─────────────────────────────────────────────────────────

interface KpiTilesSectionProps {
  metricValues?: Partial<Record<number, string>>;
  onKpiClick?: (id: number) => void;
}

export function KpiTilesSection({ metricValues, onKpiClick }: KpiTilesSectionProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = isDark ? GROUP_COLORS.dark : GROUP_COLORS.light;

  const groups = ([1, 2, 3] as const).map((gid) => {
    const all = KPIS.filter((k) => k.group === gid);
    return {
      id: gid,
      label: GROUP_LABELS[gid],
      hero: all.find((k) => k.hero)!,
      rest: all.filter((k) => !k.hero),
      colors: palette[gid],
    };
  });

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          {/* Group label */}
          <div className="flex items-center gap-2 px-1 pb-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: group.colors.accent }}
            />
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </h3>
          </div>

          {/* Hero metric */}
          <HeroCard
            kpi={group.hero}
            displayValue={metricValues?.[group.hero.id] ?? group.hero.defaultValue}
            palette={group.colors}
            onClick={onKpiClick ? () => onKpiClick(group.hero.id) : undefined}
          />

          {/* Supporting metrics */}
          <div className="space-y-1.5">
            {group.rest.map((kpi) => (
              <MetricRow
                key={kpi.id}
                kpi={kpi}
                displayValue={metricValues?.[kpi.id] ?? kpi.defaultValue}
                palette={group.colors}
                onClick={onKpiClick ? () => onKpiClick(kpi.id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
