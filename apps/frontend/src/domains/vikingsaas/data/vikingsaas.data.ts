// ─────────────────────────────────────────────────────────────────────────────
// data.ts  –  chart data and panel metadata for HC ARR detail panels
// Values: ARR / revenue in $K unless noted. Percentages are plain numbers.
// ─────────────────────────────────────────────────────────────────────────────

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const QUARTERS_8 = [
  "Q1 FY23", "Q2 FY23", "Q3 FY23", "Q4 FY23",
  "Q1 FY24", "Q2 FY24", "Q3 FY24", "Q4 FY24",
];

// ── Hex → Panel routing ───────────────────────────────────────────────────────
// Only hexes listed here become clickable in the honeycomb.
export const HEX_TO_PANEL: Partial<Record<number, string>> = {
  1:  "arr-growth",
  2:  "arr-growth",
  3:  "arr-growth",
  4:  "arr-growth",
  10: "arr-growth",
  5:  "arr-growth",
  6:  "churn",
  7:  "churn",
  14: "nrr",
  21: "concentration",
  22: "concentration",
  23: "concentration",
  24: "concentration",
};

// ── Panel metadata ────────────────────────────────────────────────────────────
export const PANEL_META: Record<string, { title: string; description: string }> = {
  "arr-growth":  { title: "ARR Growth Analysis",       description: "Live total, organic, new sales, and recurring revenue metrics from Woo subscriptions, orders, and order lines" },
  "churn":       { title: "Churn Analysis",            description: "Live ARR churn, customer churn, retention, and renewal rate trends" },
  "rule40":      { title: "Rule of 40",                description: "Growth + EBITDA efficiency — Company vs Peer A vs Peer B (FY22–FY24)" },
  "saas-gm":     { title: "SaaS Gross Margin",         description: "Revenue & COGS P&L decomposition across three fiscal years ($K)" },
  "nrr":         { title: "Net Revenue Retention",     description: "NRR bridge waterfall, cohort expansion curves & peer benchmarks" },
  "cac-payback": { title: "CAC Payback Period",        description: "CAC payback trend, cost per new customer, and S&M efficiency" },
  "ltv-cac":     { title: "LTV / CAC Ratio",           description: "Customer lifetime value vs acquisition cost ratio trend" },
  "sm-pct":      { title: "S&M % of ARR",              description: "Sales & Marketing spend as % of ARR vs peer benchmark" },
  "rd-pct":      { title: "R&D % of ARR",              description: "R&D investment as % of ARR vs peer benchmark" },
  "concentration":{ title: "Revenue Concentration",   description: "Live customer and industry ARR concentration, ARR per customer, and average sales price" },
  "arr-ftes":    { title: "ARR per FTE",               description: "Revenue productivity and employee cost benchmarks over time" },
};

// ── ARR Waterfalls ($K) ───────────────────────────────────────────────────────
// Total ARR: 3600 + 820 + 480 − 220 − 480 = 4200  (+16.7%)
export const totalArrWf = [
  { name: "FY23 Opening", y: 3600, isSum: true },
  { name: "New Logos",    y:  820 },
  { name: "Expansion",    y:  480 },
  { name: "Contraction",  y: -220 },
  { name: "Churn",        y: -480 },
  { name: "FY24 Closing", y:    0, isSum: true },
];
// Organic ARR: 3600 + 650 + 380 − 210 − 350 = 4070  (+13.1%)
export const organicArrWf = [
  { name: "FY23 Opening",  y: 3600, isSum: true },
  { name: "Organic New",   y:  650 },
  { name: "Organic Exp.",  y:  380 },
  { name: "Contraction",   y: -210 },
  { name: "Churn",         y: -350 },
  { name: "Organic FY24",  y:    0, isSum: true },
];

// ── ARR Growth benchmark table ────────────────────────────────────────────────
export const arrGrowthBench = [
  { company: "HC ARR (Us)",     totalGrowth: "+16%", orgGrowth: "+13%", nrr: "108%", r40: 34, isUs: true  },
  { company: "Peer Median",     totalGrowth: "+18%", orgGrowth: "+15%", nrr: "106%", r40: 33              },
  { company: "Top Quartile",    totalGrowth: "+28%", orgGrowth: "+22%", nrr: "115%", r40: 42              },
  { company: "Bottom Quartile", totalGrowth: "+8%",  orgGrowth: "+6%",  nrr: "97%",  r40: 22              },
  { company: "Peer A",          totalGrowth: "+21%", orgGrowth: "+17%", nrr: "109%", r40: 36              },
  { company: "Peer B",          totalGrowth: "+14%", orgGrowth: "+12%", nrr: "103%", r40: 38              },
  { company: "Peer C",          totalGrowth: "+11%", orgGrowth: "+9%",  nrr: "98%",  r40: 28              },
];

// ── Churn (annualised %, monthly) ─────────────────────────────────────────────
export const churnBySize = {
  categories: MONTHS_SHORT,
  series: [
    { name: "Enterprise", data: [3.2, 2.8, 3.5, 2.9, 3.1, 2.7, 2.5, 2.8, 3.0, 2.4, 2.2, 2.1] },
    { name: "Mid-Market", data: [6.5, 7.2, 6.8, 7.5, 6.9, 7.1, 6.4, 6.8, 7.2, 6.5, 6.0, 5.8] },
    { name: "SMB",        data: [12.1,13.4,11.8,14.1,12.5,13.2,11.9,12.7,13.3,11.5,10.8,10.2] },
  ],
};
export const churnByIndustry = {
  categories: MONTHS_SHORT,
  series: [
    { name: "Technology", data: [4.2, 3.8, 4.5, 3.9, 4.1, 3.7, 3.5, 3.8, 4.0, 3.4, 3.2, 3.1] },
    { name: "Healthcare", data: [5.5, 6.2, 5.8, 6.5, 5.9, 6.1, 5.4, 5.8, 6.2, 5.5, 5.0, 4.8] },
    { name: "Finance",    data: [3.8, 4.1, 3.5, 4.2, 3.7, 4.0, 3.3, 3.9, 4.1, 3.5, 3.2, 3.0] },
    { name: "Other",      data: [9.2,10.1, 8.8,10.5, 9.4, 9.8, 8.7, 9.5,10.2, 8.9, 8.2, 7.9] },
  ],
};

// ── Rule of 40 (stacked col: ARR Growth % + EBITDA %) ────────────────────────
// Totals: OurCo 36/32/34, PeerA 37/33/32, PeerB 40/39/40
export const rule40OurCo = {
  categories: ["FY22", "FY23", "FY24"],
  series: [
    { name: "ARR Growth %", data: [28, 22, 16] },
    { name: "EBITDA %",     data: [8,  10, 18] },
  ],
};
export const rule40PeerA = {
  categories: ["FY22", "FY23", "FY24"],
  series: [
    { name: "ARR Growth %", data: [35, 28, 20] },
    { name: "EBITDA %",     data: [2,   5, 12] },
  ],
};
export const rule40PeerB = {
  categories: ["FY22", "FY23", "FY24"],
  series: [
    { name: "ARR Growth %", data: [18, 15, 14] },
    { name: "EBITDA %",     data: [22, 24, 26] },
  ],
};

// ── SaaS Gross Margin P&L ($K) ────────────────────────────────────────────────
export interface PlRow {
  label: string;
  fy22: number | string;
  fy23: number | string;
  fy24: number | string;
  bold?: boolean;
  indent?: number;
  highlight?: boolean;
}
export const saasGmRows: PlRow[] = [
  { label: "Total Revenue",              fy22: 2890, fy23: 3620, fy24: 4200, bold: true },
  { label: "  Subscription / SaaS",      fy22: 2504, fy23: 3153, fy24: 3654, indent: 1 },
  { label: "  Professional Services",    fy22:  232, fy23:  289, fy24:  336, indent: 1 },
  { label: "  Other",                    fy22:  154, fy23:  178, fy24:  210, indent: 1 },
  { label: "Cost of Revenue",            fy22:  810, fy23:  975, fy24: 1092, bold: true },
  { label: "  Infrastructure & Hosting", fy22:  320, fy23:  390, fy24:  420, indent: 1 },
  { label: "  Customer Support",         fy22:  240, fy23:  298, fy24:  336, indent: 1 },
  { label: "  Professional Svcs Cost",   fy22:  185, fy23:  218, fy24:  252, indent: 1 },
  { label: "  Other COGS",               fy22:   65, fy23:   69, fy24:   84, indent: 1 },
  { label: "Gross Profit",               fy22: 2080, fy23: 2645, fy24: 3108, bold: true, highlight: true },
  { label: "Gross Margin",               fy22: "72%",fy23: "73%",fy24: "74%", bold: true, highlight: true },
  { label: "SaaS Gross Margin",          fy22: "73%",fy23: "74%",fy24: "74%", bold: true },
];

// ── NRR Waterfall ($K) — NRR = 3888 / 3600 = 108% ───────────────────────────
// 3600 + 620 + 80 − 180 − 232 = 3888
export const nrrWf = [
  { name: "Beginning ARR", y: 3600, isSum: true },
  { name: "Expansion",     y:  620 },
  { name: "Reactivation",  y:   80 },
  { name: "Contraction",   y: -180 },
  { name: "Churn",         y: -232 },
  { name: "Ending ARR",    y:    0, isSum: true },
];
// NRR cohort chart — ARR as % of starting cohort ARR (bi-monthly x-axis)
export const nrrCohorts = {
  categories: ["M0", "M2", "M4", "M6", "M8", "M10", "M12"],
  series: [
    { name: "FY21 Cohort", data: [100,  97,  99, 102, 105, 109, 112] },
    { name: "FY22 Cohort", data: [100,  98, 100, 102, 105, 107, 110] },
    { name: "FY23 Cohort", data: [100,  99, 100, 103, 106, 108, null] },
    { name: "FY24 Cohort", data: [100,  99, 101, 104, null, null, null] },
  ],
};
export const nrrBench = [
  { company: "HC ARR (Us)",     nrr: "108%", grossRet: "91%", expansion: "+17%", churn: "9%", isUs: true },
  { company: "Peer Median",     nrr: "106%", grossRet: "91%", expansion: "+15%", churn: "9%" },
  { company: "Top Quartile",    nrr: "120%", grossRet: "95%", expansion: "+25%", churn: "5%" },
  { company: "Bottom Quartile", nrr: "95%",  grossRet: "87%", expansion: "+8%",  churn: "13%" },
  { company: "Peer A",          nrr: "109%", grossRet: "91%", expansion: "+18%", churn: "9%" },
  { company: "Peer B",          nrr: "103%", grossRet: "91%", expansion: "+12%", churn: "9%" },
];

// ── CAC Payback ────────────────────────────────────────────────────────────────
export const cacPaybackTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "CAC Payback (mo)", data: [22, 21, 20, 19, 18, 17, 16, 16] },
    { name: "Peer Median (mo)", data: [24, 23, 23, 22, 21, 20, 19, 18] },
  ],
};
export const cacCostTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "CAC ($K)",      data: [38, 39, 37, 36, 35, 34, 33, 32] },
    { name: "Peer Avg ($K)", data: [42, 41, 40, 39, 38, 37, 36, 35] },
  ],
};
export const cacEffTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "S&M / New ARR %",  data: [62, 60, 58, 56, 55, 53, 52, 51] },
    { name: "Target (<50%)",    data: [50, 50, 50, 50, 50, 50, 50, 50] },
  ],
};

// ── LTV / CAC ─────────────────────────────────────────────────────────────────
export const ltvCacTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "LTV / CAC",    data: [3.2, 3.4, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2] },
    { name: "Target (>3×)", data: [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0] },
  ],
};
export const ltvTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "LTV ($K)", data: [112, 118, 124, 130, 134, 136, 138, 134] },
    { name: "CAC ($K)", data: [ 35,  35,  34,  34,  34,  34,  34,  32] },
  ],
};

// ── Concentration ──────────────────────────────────────────────────────────────
export const custConcentrationPie = [
  { name: "Top Customer",    y: 12 },
  { name: "Customers 2–5",   y: 22 },
  { name: "Customers 6–20",  y: 34 },
  { name: "Long Tail (21+)", y: 32 },
];
export const indConcentrationPie = [
  { name: "Technology",    y: 34 },
  { name: "Healthcare",    y: 22 },
  { name: "Finance",       y: 18 },
  { name: "Manufacturing", y: 14 },
  { name: "Other",         y: 12 },
];
export const concentrationTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "Top 1 Customer %",  data: [15, 14, 13, 13, 13, 12, 12, 12] },
    { name: "Top 5 Customers %", data: [42, 40, 38, 37, 36, 35, 35, 34] },
  ],
};

// ── S&M and R&D % ARR ─────────────────────────────────────────────────────────
export const smPctTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "S&M % ARR",     data: [36, 34, 33, 31, 30, 29, 29, 28] },
    { name: "Peer Median",   data: [38, 37, 35, 34, 33, 32, 31, 30] },
    { name: "Target (<30%)", data: [30, 30, 30, 30, 30, 30, 30, 30] },
  ],
};
export const rdPctTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "R&D % ARR",     data: [38, 37, 36, 35, 34, 33, 33, 32] },
    { name: "Peer Median",   data: [32, 32, 31, 31, 30, 30, 30, 29] },
    { name: "Target (<30%)", data: [30, 30, 30, 30, 30, 30, 30, 30] },
  ],
};

// ── ARR per FTE ────────────────────────────────────────────────────────────────
export const arrFteTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "ARR / FTE ($K)",       data: [240, 248, 255, 262, 265, 270, 276, 280] },
    { name: "Peer Median ($K)",     data: [220, 228, 232, 238, 242, 248, 252, 258] },
  ],
};
export const empCostFteTrend = {
  categories: QUARTERS_8,
  series: [
    { name: "Emp. Cost / FTE ($K)", data: [88, 89, 90, 91, 92, 93, 94, 95] },
    { name: "Peer Median ($K)",     data: [85, 86, 86, 87, 87, 88, 88, 88] },
  ],
};
