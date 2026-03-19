"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import type { MetricCard } from "../data/dashboard-three.data";

export function DashboardThreeMetricCard({ card }: { card: MetricCard }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <span className="inline-flex items-center rounded-full border bg-secondary p-1 text-xs font-semibold text-secondary-foreground">
          <card.icon className={`size-4 ${card.iconColor}`} />
        </span>
      </CardHeader>
      <CardContent className="pb-5 pt-0">
        <h2 className="text-2xl font-bold">{card.value}</h2>
        <div className="mt-1 flex items-center gap-1">
          <span className={`text-xs font-medium ${card.positive ? "text-emerald-500" : "text-red-500"}`}>
            {card.badge}
          </span>
          {card.positive ? (
            <IconTrendingUp className="size-4 text-emerald-500" />
          ) : (
            <IconTrendingDown className="size-4 text-red-500" />
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">vs Previous 30 Days</p>
      </CardContent>
    </Card>
  );
}
