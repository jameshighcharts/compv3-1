import type { ComponentType } from "react";
import {
  IconCurrencyDollar,
  IconEye,
  IconFilter,
  IconPresentation,
  IconReportMoney,
  IconUserCheck,
} from "@tabler/icons-react";

import { chartColor } from "@/shared/charts/highcharts";

// ─── Stat Card Type ────────────────────────────────────────────────────────────

export type StatCard = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  value: string;
  badge: string;
  positive: boolean;
  change: string;
  iconColor: string;
  previousPeriod?: string;
  previousValue?: string;
  targetLabel?: string;
  targetProgress?: number;
};

// ─── KPI Cards — Nov 2024 MTD ─────────────────────────────────────────────────

export const statCards: StatCard[] = [
  {
    title: "Website Sessions",
    icon: IconEye,
    value: "284,521",
    badge: "12.3%",
    positive: true,
    change: "+3,241 today",
    iconColor: "bg-violet-500/20 text-violet-500",
  },
  {
    title: "Trial Signups",
    icon: IconUserCheck,
    value: "2,847",
    badge: "18.5%",
    positive: true,
    change: "+34 today",
    iconColor: "bg-emerald-500/20 text-emerald-500",
  },
  {
    title: "Demo Requests",
    icon: IconPresentation,
    value: "312",
    badge: "7.2%",
    positive: true,
    change: "+5 today",
    iconColor: "bg-sky-500/20 text-sky-500",
  },
  {
    title: "MQLs This Month",
    icon: IconFilter,
    value: "923",
    badge: "24.1%",
    positive: true,
    change: "+18 today",
    iconColor: "bg-orange-500/20 text-orange-500",
  },
  {
    title: "Cost Per Lead",
    icon: IconCurrencyDollar,
    value: "$48",
    badge: "11.2%",
    positive: true,
    change: "-$6 vs last mo.",
    iconColor: "bg-teal-500/20 text-teal-500",
  },
  {
    title: "Mktg Pipeline",
    icon: IconReportMoney,
    value: "$4.2M",
    badge: "31.4%",
    positive: true,
    change: "+$390K today",
    iconColor: "bg-indigo-500/20 text-indigo-500",
  },
];

// ─── Traffic Acquisition — 12-week weekly trend ───────────────────────────────

export const trafficWeekLabels = [
  "Sep 2", "Sep 9", "Sep 16", "Sep 23", "Sep 30",
  "Oct 7", "Oct 14", "Oct 21", "Oct 28",
  "Nov 4", "Nov 11", "Nov 18",
];

export const trafficOrganic  = [21000, 21900, 22100, 23000, 23600, 23400, 24200, 24600, 25700, 26400, 27100, 28100];
export const trafficDirect   = [9100,  8900,  9600,  9400,  10100, 9700,  10600, 10400, 11200, 10900, 11600, 12100];
export const trafficPaid     = [6200,  6600,  6400,  7100,  7600,  8200,  8000,  8600,  9100,  8800,  9500,  9900];
export const trafficReferral = [4200,  4500,  4600,  4400,  4800,  5100,  5400,  5700,  5600,  6200,  6400,  6700];
export const trafficSocial   = [2600,  2500,  2700,  2900,  3100,  3000,  3200,  3400,  3600,  3700,  3900,  4100];

// ─── Channel Mix — MTD sessions by source ────────────────────────────────────

export const channelMixData = [
  { name: "Organic Search", y: 154200, color: chartColor(0) },
  { name: "Direct",         y: 56900,  color: chartColor(1) },
  { name: "Paid Search",    y: 39800,  color: chartColor(2) },
  { name: "Referral",       y: 24400,  color: chartColor(3) },
  { name: "Social",         y: 9300,   color: chartColor(4) },
];

export const totalSessions = channelMixData.reduce((s, d) => s + d.y, 0);

// ─── SaaS Growth Funnel — Highcharts developer journey ───────────────────────
// Traces the path from discovery (npm/docs reach) through to paid conversion.
// Realistic numbers for a B2B developer-tool / charting-library SaaS.

export const saasFlowFunnel = [
  { name: "Organic & Paid Reach",  y: 512_400, color: chartColor(0) },
  { name: "Website Visitors",      y: 284_521, color: chartColor(0) },
  { name: "Free Trial Starts",     y:   2_847, color: chartColor(1) },
  { name: "Product Activated",     y:   1_247, color: chartColor(2) },
  { name: "Paid Conversions",      y:     196, color: chartColor(3) },
];

/** Conversion rate between consecutive funnel stages */
export const funnelConvRates = [
  { label: "Reach → Visit",   pct: "55.5%", color: chartColor(0) },
  { label: "Visit → Trial",   pct: "1.0%",  color: chartColor(1) },
  { label: "Trial → Active",  pct: "43.8%", color: chartColor(2) },
  { label: "Active → Paid",   pct: "15.7%", color: chartColor(3) },
];

// ─── Campaign Performance ─────────────────────────────────────────────────────

export const campaignLabels      = ["HC12 Launch", "Dev Newsletter", "G-Ads Charts", "LinkedIn Ent.", "Data Viz Summit", "Retargeting", "GitHub Ads"];
export const campaignConversions = [89, 134, 62, 47, 38, 29, 71];
export const campaignCTR         = [3.2, 8.7, 2.1, 4.8, 5.3, 1.4, 6.1];

// ─── Active Campaigns Table ───────────────────────────────────────────────────

export const campaignRows = [
  { name: "Highcharts 12 Launch",        channel: "Multi-channel", budget: "$24,800", impressions: "1.24M",   ctr: "3.2%", conversions: "89",  status: "Active" },
  { name: "Developer Newsletter — Q4",   channel: "Email",         budget: "$8,400",  impressions: "42,800",  ctr: "8.7%", conversions: "134", status: "Active" },
  { name: "Charts Library — G-Ads",      channel: "Paid Search",   budget: "$31,200", impressions: "284,100", ctr: "2.1%", conversions: "62",  status: "Active" },
  { name: "LinkedIn Enterprise",         channel: "Social",        budget: "$15,600", impressions: "98,400",  ctr: "4.8%", conversions: "47",  status: "Active" },
  { name: "Data Viz Summit Sponsorship", channel: "Events",        budget: "$12,000", impressions: "18,200",  ctr: "5.3%", conversions: "38",  status: "Paused" },
  { name: "Retargeting — Trial Dropout", channel: "Display",       budget: "$9,100",  impressions: "420,000", ctr: "1.4%", conversions: "29",  status: "Active" },
  { name: "GitHub Sponsored — OSS",      channel: "Dev Ads",       budget: "$6,500",  impressions: "210,000", ctr: "6.1%", conversions: "71",  status: "Active" },
];

// ─── Geographic Distribution ──────────────────────────────────────────────────

export const geoData = [
  { name: "North America",  y: 38, color: chartColor(0) },
  { name: "Europe & MEA",   y: 29, color: chartColor(1) },
  { name: "Asia Pacific",   y: 21, color: chartColor(2) },
  { name: "Latin America",  y: 7,  color: chartColor(3) },
  { name: "Other",          y: 5,  color: chartColor(4) },
];

// ─── Trial → Paid Conversion — 12 months ─────────────────────────────────────

export const conversionMonths = [
  "Dec '23", "Jan '24", "Feb '24", "Mar '24", "Apr '24", "May '24",
  "Jun '24", "Jul '24", "Aug '24", "Sep '24", "Oct '24", "Nov '24",
];
export const trialSignups    = [1820, 1940, 1780, 2110, 2280, 2340, 2190, 2450, 2580, 2710, 2680, 2847];
export const paidConversions = [94,   108,  97,   121,  138,  149,  134,  157,  168,  182,  174,  196];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatInteger = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

export const fmtK = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${Math.round(value / 1_000)}K`
      : String(value);
