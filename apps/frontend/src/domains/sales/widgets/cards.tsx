"use client";

import { IconArrowDownRight, IconArrowUpRight, IconInfoCircle } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function ArrKpiCard({
  title,
  value,
  subtitle,
  trend,
  positive,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  positive: boolean;
}) {
  return (
    <Card className="h-full w-full gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <IconInfoCircle className="size-4 text-muted-foreground" aria-label={`More info about ${title}`} />
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        <p className={`mt-4 text-xs font-medium ${positive ? "text-emerald-500" : "text-red-500"}`}>{trend}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsMetricCard({
  title,
  stats,
  trend,
  profitPercentage,
  profitNumber,
  sign = "dollar",
}: {
  title: string;
  stats: number;
  trend: "asc" | "des";
  profitPercentage: number;
  profitNumber: number;
  sign?: "dollar" | "number";
}) {
  const isAscending = trend === "asc";

  return (
    <Card className="h-full w-full gap-0 bg-muted py-0">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">{title}</CardTitle>
        <IconInfoCircle className="size-4 scale-90 text-muted-foreground" aria-label={`More info about ${title}`} />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="text-lg font-bold sm:text-2xl">
          {sign === "dollar" ? "$" : ""}
          {stats.toLocaleString()}
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isAscending ? "text-emerald-500" : "text-red-500"}`}>
          <span className="inline-block">
            {isAscending ? <IconArrowUpRight className="size-4" /> : <IconArrowDownRight className="size-4" />}
          </span>
          <span>{profitPercentage.toLocaleString()}%</span>
          <span>
            ({isAscending ? "+" : ""}
            {profitNumber.toLocaleString()})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
