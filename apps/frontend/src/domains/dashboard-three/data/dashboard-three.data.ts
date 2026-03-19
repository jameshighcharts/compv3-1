import type { ComponentType } from "react";
import {
  IconCircle,
  IconClipboardData,
  IconFile,
} from "@tabler/icons-react";
import { Eye } from "lucide-react";

export type MetricCard = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  value: string;
  badge: string;
  positive: boolean;
};

const generateBudgetData = () => {
  const data = [];
  const startTimestamp = Date.UTC(2024, 3, 1);
  for (let i = 0; i < 30; i++) {
    const date = new Date(startTimestamp + i * 3 * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split("T")[0],
      desktop: 120 + ((i * 73) % 380),
      mobile: 110 + ((i * 61 + 29) % 360),
    });
  }
  return data;
};

export const budgetData = generateBudgetData();

export const totalDesktop = budgetData.reduce((sum, item) => sum + item.desktop, 0);
export const totalMobile = budgetData.reduce((sum, item) => sum + item.mobile, 0);

export const metricCards: MetricCard[] = [
  { title: "Session", icon: IconClipboardData, iconColor: "text-blue-500", value: "6,132", badge: "90%", positive: true },
  { title: "Page Views", icon: Eye, iconColor: "text-teal-500", value: "11,236", badge: "40%", positive: false },
  { title: "Average", icon: IconFile, iconColor: "text-orange-500", value: "46", badge: "22%", positive: true },
  { title: "Bounce Rate", icon: IconCircle, iconColor: "text-pink-500", value: "6,132", badge: "30%", positive: false },
];

export const radarData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

export const overviewData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

export const formatInteger = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
