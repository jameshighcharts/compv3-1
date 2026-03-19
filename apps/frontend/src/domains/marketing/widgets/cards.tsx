"use client";

import { IconDots } from "@tabler/icons-react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/shared/ui/card";

import type { StatCard } from "../data/marketing.data";

export function DashboardTwoStatCard({ card }: { card: StatCard }) {
  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${card.iconColor}`}>
            <card.icon className="size-3.5" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium leading-tight">{card.title}</span>
        </div>
        <IconDots className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-1">
        <div className="text-[26px] font-bold leading-none tracking-tight">{card.value}</div>

        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
              card.positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {card.positive ? (
              <ArrowUpRight className="size-3" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden="true" />
            )}
            {card.badge}
          </span>
          <span className="text-xs text-muted-foreground">{card.change}</span>
        </div>

        <div className="mt-4 border-t border-border/50 pt-3">
          <button
            type="button"
            className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View Report
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
