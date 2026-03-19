"use client";

import React from "react";
import { useTheme } from "next-themes";

import { HEX_TO_PANEL } from "../data/vikingsaas.data";

// ── Geometry ──────────────────────────────────────────────────────────────────
const R           = 44;
const COL_SPACING = R * 1.5;
const ROW_SPACING = R * Math.sqrt(3);
const ODD_OFFSET  = ROW_SPACING / 2;

const OFFSET_X = 58;
const OFFSET_Y = 82;
const SVG_W    = 10 * COL_SPACING + OFFSET_X + R + 10;
const SVG_H    = 5 * ROW_SPACING + OFFSET_Y + R + 5;

// ── Types ─────────────────────────────────────────────────────────────────────
type Group = 1 | 2 | 3;

interface HexDef {
  id: number;
  lines: string[];
  value: string;
  group: Group;
  col: number;
  row: number;
}

// ── Colour palette ─────────────────────────────────────────────────────────────
// Precisely matched to the reference image.
// Light mode uses the full forest-green / cream palette.
// Dark mode keeps the greens identical but shifts Group 3 cream → dark olive
// so it reads against the navy page background.
const GROUP_FILLS = {
  light: {
    1: { bg: "#1c3328", text: "#ffffff", sub: "rgba(255,255,255,0.68)" },
    2: { bg: "#2f6c45", text: "#ffffff", sub: "rgba(255,255,255,0.68)" },
    3: { bg: "#eae5bf", text: "#1c3328", sub: "rgba(28,51,40,0.62)" },
  },
  dark: {
    1: { bg: "#1c3328", text: "#ffffff", sub: "rgba(255,255,255,0.62)" },
    2: { bg: "#2f6c45", text: "#ffffff", sub: "rgba(255,255,255,0.62)" },
    3: { bg: "#273c1e", text: "#d9e8c0", sub: "rgba(217,232,192,0.62)" },
  },
} as const;

// Accent used for selection ring per group
const GROUP_ACCENT: Record<Group, string> = {
  1: "#6dba88",
  2: "#9de0b0",
  3: "#c8be72",
};

// ── Hex data ──────────────────────────────────────────────────────────────────
const HEXES: HexDef[] = [
  // ── Group 1 — Growth & Profitability ─────────────────────────────────────
  { id: 1,  lines: ["Total ARR"],              value: "$4.2M",  group: 1, col: 0, row: 2 },
  { id: 2,  lines: ["Total ARR", "Growth"],    value: "+16%",   group: 1, col: 1, row: 1 },
  { id: 3,  lines: ["Organic ARR", "Growth"],  value: "+13%",   group: 1, col: 1, row: 2 },
  { id: 4,  lines: ["New Sales", "ARR Grwth"], value: "+18%",   group: 1, col: 1, row: 3 },
  { id: 5,  lines: ["% Recurring", "Revenue"], value: "87%",    group: 1, col: 2, row: 0 },
  { id: 6,  lines: ["Churn"],                  value: "8.5%",   group: 1, col: 2, row: 1 },
  { id: 7,  lines: ["Renewal Rate"],           value: "91%",    group: 1, col: 2, row: 2 },
  { id: 8,  lines: ["Rule of 40"],             value: "34",     group: 1, col: 2, row: 3 },
  { id: 9,  lines: ["SaaS Gross", "Margin"],   value: "74%",    group: 1, col: 3, row: 0 },
  { id: 10, lines: ["Growth", "Endurance"],    value: "0.81",   group: 1, col: 3, row: 1 },
  { id: 11, lines: ["EBITDA"],                 value: "12%",    group: 1, col: 3, row: 2 },
  { id: 12, lines: ["EBITDA-Capex"],           value: "$380K",  group: 1, col: 3, row: 3 },
  { id: 13, lines: ["Operating", "Cash Flow"], value: "$510K",  group: 1, col: 3, row: 4 },

  // ── Group 2 — CAC & Sales Efficiency ──────────────────────────────────────
  { id: 14, lines: ["Net Rev.", "Retention"],  value: "108%",   group: 2, col: 4, row: 0 },
  { id: 15, lines: ["CAC Payback"],            value: "16 mo",  group: 2, col: 4, row: 1 },
  { id: 16, lines: ["LTV / CAC"],              value: "4.2×",   group: 2, col: 4, row: 2 },
  { id: 17, lines: ["Magic", "Number"],        value: "0.82",   group: 2, col: 5, row: 0 },
  { id: 18, lines: ["Yield", "per Rep"],       value: "$420K",  group: 2, col: 5, row: 1 },
  { id: 19, lines: ["S&M % ARR"],              value: "28%",    group: 2, col: 6, row: 0 },
  { id: 20, lines: ["R&D % ARR"],              value: "32%",    group: 2, col: 6, row: 1 },

  // ── Group 3 — Coverage Model & Sales Process ──────────────────────────────
  { id: 21, lines: ["Customer", "Conc."],      value: "12%",    group: 3, col: 7, row: 0 },
  { id: 22, lines: ["Industry", "Conc."],      value: "34%",    group: 3, col: 7, row: 1 },
  { id: 23, lines: ["ARR per", "Customer"],    value: "$42K",   group: 3, col: 7, row: 2 },
  { id: 24, lines: ["Avg Sales", "Price"],     value: "$38K",   group: 3, col: 8, row: 0 },
  { id: 25, lines: ["ARR / FTEs"],             value: "$280K",  group: 3, col: 8, row: 1 },
  { id: 26, lines: ["Emp. Cost", "/ FTE"],     value: "$95K",   group: 3, col: 9, row: 0 },
  { id: 27, lines: ["Employee", "Cost Total"], value: "$4.1M",  group: 3, col: 9, row: 1 },
];

// ── Category labels ───────────────────────────────────────────────────────────
interface CatLabel { lines: string[]; x: number; yTop: number; group: Group }
const CAT_LABELS: CatLabel[] = [
  {
    lines: ["Growth &", "Profitability"],
    x: OFFSET_X + 1.5 * COL_SPACING,
    yTop: OFFSET_Y - R - 14,
    group: 1,
  },
  {
    lines: ["CAC &", "Sales Efficiency"],
    x: OFFSET_X + 5.0 * COL_SPACING,
    yTop: OFFSET_Y - R - 14,
    group: 2,
  },
  {
    lines: ["Coverage Model &", "Sales Process"],
    x: OFFSET_X + 8.0 * COL_SPACING,
    yTop: OFFSET_Y - R - 14,
    group: 3,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexCenter(col: number, row: number) {
  return {
    x: OFFSET_X + col * COL_SPACING,
    y: OFFSET_Y + row * ROW_SPACING + (col % 2) * ODD_OFFSET,
  };
}

function hexPoints(cx: number, cy: number, rad: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

// ── Component ─────────────────────────────────────────────────────────────────
interface HCARRHoneycombProps {
  selectedId?: number | null;
  onHexClick?: (id: number) => void;
  metricValues?: Partial<Record<number, string>>;
}

export function HCARRHoneycomb({ selectedId, onHexClick, metricValues }: HCARRHoneycombProps = {}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = isDark ? GROUP_FILLS.dark : GROUP_FILLS.light;

  // Stroke between adjacent hexes — barely visible divider
  const hexStroke = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";

  // Category label colours
  const catLabelAccent: Record<Group, string> = {
    1: isDark ? "#6dba88" : "#1c3328",
    2: isDark ? "#9de0b0" : "#2f6c45",
    3: isDark ? "#c8be72" : "#5a5a20",
  };

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
      aria-label="HC ARR KPI Dashboard - Honeycomb"
    >
      {/* ── Category headers ──────────────────────────────────────────────── */}
      {CAT_LABELS.map((cl) => (
        <g key={cl.group}>
          {/* Accent dot */}
          <circle
            cx={cl.x}
            cy={cl.yTop - 8}
            r={3}
            fill={catLabelAccent[cl.group]}
            opacity={0.85}
          />
          {cl.lines.map((line, i) => (
            <text
              key={i}
              x={cl.x}
              y={cl.yTop + i * 15}
              textAnchor="middle"
              fill={catLabelAccent[cl.group]}
              fontSize={12}
              fontWeight="700"
              fontFamily="inherit"
              letterSpacing="0.3"
            >
              {line}
            </text>
          ))}
        </g>
      ))}

      {/* ── Hex cells ─────────────────────────────────────────────────────── */}
      {HEXES.map((hex) => {
        const { x, y }   = hexCenter(hex.col, hex.row);
        const style       = palette[hex.group];
        const pts         = hexPoints(x, y, R - 1);
        const isClickable = !!HEX_TO_PANEL[hex.id];
        const isSelected  = hex.id === selectedId;
        const accent      = GROUP_ACCENT[hex.group];

        // Text y positions — two-line label sits higher, single-line centred
        const twoLine   = hex.lines.length === 2;
        const labelY1   = twoLine ? y - 14 : y - 9;
        const labelY2   = twoLine ? y - 4  : y - 9;
        const valueY    = twoLine ? y + 13 : y + 12;

        return (
          <g
            key={hex.id}
            onClick={isClickable && onHexClick ? () => onHexClick(hex.id) : undefined}
            style={isClickable ? { cursor: "pointer" } : undefined}
            role={isClickable ? "button" : undefined}
            aria-pressed={isClickable ? isSelected : undefined}
            aria-label={isClickable ? `View detail for ${hex.lines.join(" ")}` : undefined}
          >
            {/* Selection glow ring */}
            {isSelected && (
              <polygon
                points={hexPoints(x, y, R + 6)}
                fill="none"
                stroke={accent}
                strokeWidth={2.5}
                opacity={0.9}
                pointerEvents="none"
              />
            )}

            {/* Hex fill */}
            <polygon
              points={pts}
              fill={style.bg}
              stroke={isSelected ? accent : hexStroke}
              strokeWidth={isSelected ? 1.5 : 1}
            />

            {/* Hover highlight overlay — pure SVG opacity trick */}
            {isClickable && (
              <polygon
                points={pts}
                fill="white"
                opacity={0}
                style={{ transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as SVGPolygonElement).style.opacity = "0.06"; }}
                onMouseLeave={(e) => { (e.currentTarget as SVGPolygonElement).style.opacity = "0"; }}
                pointerEvents="all"
              />
            )}

            {/* ── Metric label (small, muted) ── */}
            {twoLine ? (
              <>
                <text
                  x={x} y={labelY1}
                  textAnchor="middle"
                  fill={style.sub}
                  fontSize={9}
                  fontFamily="inherit"
                  letterSpacing="0.2"
                >
                  {hex.lines[0]}
                </text>
                <text
                  x={x} y={labelY2}
                  textAnchor="middle"
                  fill={style.sub}
                  fontSize={9}
                  fontFamily="inherit"
                  letterSpacing="0.2"
                >
                  {hex.lines[1]}
                </text>
              </>
            ) : (
              <text
                x={x} y={labelY1}
                textAnchor="middle"
                fill={style.sub}
                fontSize={11}
                fontFamily="inherit"
                letterSpacing="0.2"
              >
                {hex.lines[0]}
              </text>
            )}

            {/* ── Metric value (prominent) ── */}
            <text
              x={x}
              y={valueY}
              textAnchor="middle"
              fill={style.text}
              fontSize={15}
              fontWeight="700"
              fontFamily="inherit"
              letterSpacing="-0.3"
            >
              {metricValues?.[hex.id] ?? hex.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
