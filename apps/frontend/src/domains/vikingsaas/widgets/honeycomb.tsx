"use client";

import React from "react";
import { useTheme } from "next-themes";

import { HEX_TO_PANEL } from "../data/vikingsaas.data";

// ── Geometry ──────────────────────────────────────────────────────────────────
const R           = 58;
// For flat-top hexagons, exact tessellation column spacing is 1.5 * R
const TIGHT_COL   = R * 1.5;            // within-group (no gap)
const GROUP_GAP   = 28;                  // gap between the three colour groups
const ROW_SPACING = R * Math.sqrt(3);
const ODD_OFFSET  = ROW_SPACING / 2;

const OFFSET_X = 76;
const OFFSET_Y = 120;

// Column x-positions: cols 0-2 (group 1), 3-4 (group 2), 5-6 (group 3)
const COL_X = [
  0,                                         // col 0
  TIGHT_COL,                                 // col 1 (tight to col 0)
  TIGHT_COL * 2,                             // col 2 (tight to col 1)
  TIGHT_COL * 3 + GROUP_GAP,                 // col 3 (gap after group 1)
  TIGHT_COL * 4 + GROUP_GAP,                 // col 4 (tight to col 3)
  TIGHT_COL * 5 + GROUP_GAP * 2,             // col 5 (gap after group 2)
  TIGHT_COL * 6 + GROUP_GAP * 2,             // col 6 (tight to col 5)
];

const SVG_W    = COL_X[6] + OFFSET_X + R + 16;
const SVG_H    = 2 * ROW_SPACING + OFFSET_Y + R + 16;

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
  // ── Group 1 — ARR Growth ──────────────────────────────────────────────────
  { id: 2,  lines: ["Total ARR", "Growth"],    value: "+16%",   group: 1, col: 0, row: 0 },
  { id: 1,  lines: ["Total ARR"],              value: "$4.2M",  group: 1, col: 0, row: 1 },
  { id: 3,  lines: ["Organic ARR", "Growth"],  value: "+13%",   group: 1, col: 1, row: 0 },
  { id: 4,  lines: ["New Sales", "ARR Grwth"], value: "+18%",   group: 1, col: 1, row: 1 },
  { id: 10, lines: ["Rolling 12M", "ARR"],     value: "$4.6M",  group: 1, col: 2, row: 0 },

  // ── Group 2 — Retention & Revenue Quality ─────────────────────────────────
  { id: 5,  lines: ["% Recurring", "Revenue"], value: "87%",    group: 2, col: 3, row: 0 },
  { id: 7,  lines: ["Renewal Rate"],           value: "91%",    group: 2, col: 3, row: 1 },
  { id: 14, lines: ["Net Revenue", "Retention"], value: "108%", group: 2, col: 4, row: 0 },
  { id: 6,  lines: ["Churn"],                  value: "8.5%",   group: 2, col: 4, row: 1 },

  // ── Group 3 — Concentration & Pricing ─────────────────────────────────────
  { id: 21, lines: ["Customer", "Conc."],      value: "12%",    group: 3, col: 5, row: 0 },
  { id: 23, lines: ["ARR per", "Customer"],    value: "$42K",   group: 3, col: 5, row: 1 },
  { id: 22, lines: ["Industry", "Conc."],      value: "34%",    group: 3, col: 6, row: 0 },
  { id: 24, lines: ["Avg Sales", "Price"],     value: "$38K",   group: 3, col: 6, row: 1 },
];

// ── Category labels ───────────────────────────────────────────────────────────
interface CatLabel { lines: string[]; x: number; yTop: number; group: Group }
const CAT_LABELS: CatLabel[] = [
  {
    lines: ["ARR Growth"],
    x: OFFSET_X + (COL_X[0] + COL_X[2]) / 2,
    yTop: OFFSET_Y - R - 16,
    group: 1,
  },
  {
    lines: ["Retention &", "Revenue Quality"],
    x: OFFSET_X + (COL_X[3] + COL_X[4]) / 2,
    yTop: OFFSET_Y - R - 28,
    group: 2,
  },
  {
    lines: ["Concentration", "& Pricing"],
    x: OFFSET_X + (COL_X[5] + COL_X[6]) / 2,
    yTop: OFFSET_Y - R - 28,
    group: 3,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexCenter(col: number, row: number) {
  return {
    x: OFFSET_X + COL_X[col],
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
          {cl.lines.map((line, i) => (
            <text
              key={i}
              x={cl.x}
              y={cl.yTop + i * 18}
              textAnchor="middle"
              fill={catLabelAccent[cl.group]}
              fontSize={14}
              fontWeight="800"
              fontFamily="inherit"
              letterSpacing="0.5"
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
        const pts         = hexPoints(x, y, R - 3);
        const isClickable = !!HEX_TO_PANEL[hex.id];
        const isSelected  = hex.id === selectedId;
        const accent      = GROUP_ACCENT[hex.group];

        // Text y positions — two-line label sits higher, single-line centred
        const twoLine   = hex.lines.length === 2;
        const labelY1   = twoLine ? y - 18 : y - 12;
        const labelY2   = twoLine ? y - 6  : y - 12;
        const valueY    = twoLine ? y + 18 : y + 16;

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
              stroke={isSelected ? accent : style.bg}
              strokeWidth={isSelected ? 2 : 0.5}
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
                  fontSize={11}
                  fontFamily="inherit"
                  letterSpacing="0.2"
                >
                  {hex.lines[0]}
                </text>
                <text
                  x={x} y={labelY2}
                  textAnchor="middle"
                  fill={style.sub}
                  fontSize={11}
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
                fontSize={12}
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
              fontSize={20}
              fontWeight="800"
              fontFamily="inherit"
              letterSpacing="-0.5"
            >
              {metricValues?.[hex.id] ?? hex.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
