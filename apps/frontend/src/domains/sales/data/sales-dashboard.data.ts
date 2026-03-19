import { chartColor } from "@/shared/charts/highcharts";

export const analyticsSalesData = [
  { month: "Jan", visitors: 186 },
  { month: "Feb", visitors: 305 },
  { month: "Mar", visitors: 237 },
  { month: "Apr", visitors: 73 },
  { month: "May", visitors: 209 },
  { month: "Jun", visitors: 214 },
];

export const analyticsVisitorsData = [
  { month: "Jan", visitors: 186, returning: 80 },
  { month: "Feb", visitors: 305, returning: 200 },
  { month: "Mar", visitors: 237, returning: 120 },
  { month: "Apr", visitors: 73, returning: 190 },
  { month: "May", visitors: 209, returning: 130 },
  { month: "Jun", visitors: 214, returning: 140 },
];

export const analyticsCustomersData = [
  { month: "Jan", customers: 56 },
  { month: "Feb", customers: 125 },
  { month: "Mar", customers: 47 },
  { month: "Apr", customers: 73 },
  { month: "May", customers: 109 },
  { month: "Jun", customers: 44 },
];

export const analyticsTrafficSourceData = [
  { source: "Google", amount: 186 },
  { source: "Social", amount: 305 },
  { source: "Direct", amount: 237 },
];

export const analyticsBuyersValue = 200;
export const analyticsBuyersTotal = 260;

export const ANALYTICS_CORAL = chartColor(0);
export const ANALYTICS_TEAL = chartColor(1);

export const salesRevenueKpiCards = [
  {
    title: "Expected Revenue this Month",
    value: "$4.9M",
    badge: "51%",
    positive: true,
    change: "this month",
    color: chartColor(0),
  },
  {
    title: "ARR",
    value: "$2.4M",
    badge: "25%",
    positive: false,
    change: "this month",
    color: chartColor(1),
  },
  {
    title: "New Logos Added",
    value: "125",
    badge: "12%",
    positive: true,
    change: "this month",
    color: chartColor(2),
  },
  {
    title: "Expected Pipeline Closes",
    value: "$640K",
    badge: "12%",
    positive: true,
    change: "this month",
    color: chartColor(3),
  },
];

export const arrOverviewKpis = [
  {
    title: "ARR",
    value: "$9.8M",
    subtitle: "Mockup data",
    trend: "+8.4% vs last month",
    positive: true,
  },
  {
    title: "New ARR Added",
    value: "$640K",
    subtitle: "Added this month",
    trend: "+12.1% vs last month",
    positive: true,
  },
  {
    title: "Annual Recurring Revenue",
    value: "$8.1M",
    subtitle: "Mockup data",
    trend: "+6.8% YoY",
    positive: true,
  },
  {
    title: "ADV Recurring Revenue",
    value: "$1.7M",
    subtitle: "Mockup data",
    trend: "+9.5% YoY",
    positive: true,
  },
];

export const arrRevenueBreakdownData = [
  { month: "Jan", annual: 620, adv: 120 },
  { month: "Feb", annual: 648, adv: 126 },
  { month: "Mar", annual: 676, adv: 132 },
  { month: "Apr", annual: 702, adv: 139 },
  { month: "May", annual: 734, adv: 146 },
  { month: "Jun", annual: 758, adv: 153 },
  { month: "Jul", annual: 786, adv: 159 },
  { month: "Aug", annual: 812, adv: 166 },
  { month: "Sep", annual: 838, adv: 173 },
  { month: "Oct", annual: 864, adv: 180 },
  { month: "Nov", annual: 890, adv: 188 },
  { month: "Dec", annual: 915, adv: 196 },
];

export const arrSubscriptionsData = [
  { month: "Jan", new: 92, renewed: 248 },
  { month: "Feb", new: 99, renewed: 257 },
  { month: "Mar", new: 106, renewed: 265 },
  { month: "Apr", new: 112, renewed: 272 },
  { month: "May", new: 118, renewed: 280 },
  { month: "Jun", new: 123, renewed: 287 },
  { month: "Jul", new: 130, renewed: 295 },
  { month: "Aug", new: 136, renewed: 302 },
  { month: "Sep", new: 143, renewed: 309 },
  { month: "Oct", new: 148, renewed: 317 },
  { month: "Nov", new: 154, renewed: 325 },
  { month: "Dec", new: 161, renewed: 332 },
];

// Jan 2025 → Feb 2026 (14 months). Feb '26 values are partial (≈71% through the month).
export const srBarMonths = [
  "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25",
  "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25",
  "Jan '26", "Feb '26",
];

const NO_TARGET = Array(13).fill(null) as (number | null)[];

export const licenseOwnersBarData = {
  badge: "-3%",
  positive: false,
  series: [
    { name: "Renewal",   data: [450, 460, 465, 470, 468, 462, 458, 452, 448, 445, 442, 436, 430, 305] },
    { name: "New",       data: [120, 128, 122, 135, 130, 145, 138, 152, 144, 158, 148, 136, 142,  99] },
    { name: "Upgrade",   data: [ 80,  82,  88,  90,  98, 100, 108, 110, 118, 120, 112, 102,  96,  67] },
    { name: "Downgrade", data: [ 28,  22,  26,  20,  24,  18,  22,  16,  20,  14,  18,  12,  16,   9] },
  ],
  // Feb '26 actuals sum ≈ 480; target 700 → grey peeks above the stack
  expected: [...NO_TARGET, 700] as (number | null)[],
};

export const directRevenueBarData = {
  badge: "+22%",
  positive: true,
  series: [
    { name: "Assisted Self-Service", data: [820, 840, 860, 900, 930, 960,  980, 1010, 1050, 1080, 1100, 1120, 1140,  810] },
    { name: "Self-Service",          data: [420, 440, 450, 480, 500, 520,  550,  580,  600,  620,  640,  660,  680,  483] },
    { name: "Assisted",              data: [310, 320, 330, 350, 360, 380,  400,  420,  440,  460,  480,  500,  520,  369] },
  ],
  // Feb '26 actuals sum ≈ 1662; target 2400
  expected: [...NO_TARGET, 2400] as (number | null)[],
};

export const totalRevenueBarData = {
  badge: "-20%",
  positive: false,
  series: [
    { name: "Renewal",   data: [2800, 2850, 2900, 2850, 2750, 2700, 2650, 2600, 2550, 2500, 2450, 2400, 2350, 1669] },
    { name: "New",       data: [ 800,  810,  800,  820,  800,  790,  780,  770,  760,  750,  740,  730,  720,  512] },
    { name: "Upgrade",   data: [ 500,  490,  480,  470,  460,  450,  440,  430,  420,  410,  400,  390,  380,  270] },
    { name: "Downgrade", data: [ 200,  180,  190,  170,  180,  160,  170,  150,  160,  140,  150,  130,  120,   85] },
  ],
  // Feb '26 actuals sum ≈ 2536; target 3800
  expected: [...NO_TARGET, 3800] as (number | null)[],
};

export const channelPartnerBarData = {
  badge: "+35%",
  positive: true,
  series: [
    { name: "Assisted Self-Service", data: [380, 400, 420, 450, 480, 510, 540, 580, 620, 660, 700, 750, 790, 561] },
    { name: "Self-Service",          data: [180, 190, 200, 220, 240, 260, 280, 300, 320, 340, 360, 390, 410, 291] },
    { name: "Assisted",              data: [120, 130, 140, 150, 160, 175, 190, 205, 220, 235, 250, 270, 285, 202] },
  ],
  // Feb '26 actuals sum ≈ 1054; target 1550
  expected: [...NO_TARGET, 1550] as (number | null)[],
};

export const srGaugeItems = [
  { title: "Sales This Month", value: 11.5, previous: 9.5, label: "$11.5M", subtitle: "Target: $12M", target: 12 },
  { title: "Sales Year to Date", value: 13.2, previous: 11, label: "$13.2M", subtitle: "Target: $14M", target: 14 },
];

export const reportFiles = [
  { id: "marketing-feb", name: "Monthly Marketing Report - Feb", type: "Marketing", period: "February 2026" },
  { id: "sales-feb", name: "Sales Report - Feb", type: "Sales", period: "February 2026" },
  { id: "pipeline-feb", name: "Pipeline Report - Feb", type: "Pipeline", period: "February 2026" },
  { id: "retention-feb", name: "Customer Retention Report - Feb", type: "Customer", period: "February 2026" },
];
