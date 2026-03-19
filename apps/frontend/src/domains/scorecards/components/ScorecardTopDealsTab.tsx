"use client";

import * as React from "react";

import {
  REVENUE_CUSTOMER_CHANNEL_LABELS,
  REVENUE_CUSTOMER_CHANNEL_VALUES,
  REVENUE_SALES_CHANNEL_LABELS,
  REVENUE_SALES_CHANNEL_VALUES,
  type RevenueCustomerChannel,
  type RevenueSalesChannel,
} from "@contracts/sales";

import type { ScorecardTopDealsState } from "@/lib/sf/use-scorecard-top-deals";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function TogglePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function resolveTypeClasses(value: string): string {
  const normalized = value.toLowerCase();

  if (normalized === "new") {
    return "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
  }

  if (normalized === "renewal") {
    return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400";
  }

  if (normalized === "upgrade") {
    return "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400";
  }

  if (normalized === "downgrade") {
    return "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
}

function resolveLicenseClasses(value: string): string {
  const normalized = value.toLowerCase();

  if (normalized.includes("enterprise")) {
    return "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-400";
  }

  if (normalized.includes("professional")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-400";
  }

  if (normalized.includes("standard")) {
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-500/10 dark:text-slate-400";
  }

  if (normalized.includes("starter")) {
    return "border-teal-200 bg-teal-50 text-teal-600 dark:border-teal-500/25 dark:bg-teal-500/10 dark:text-teal-400";
  }

  return "border-border bg-muted text-muted-foreground";
}

function isPositiveStage(stage: string): boolean {
  const normalized = stage.toLowerCase();
  return normalized.includes("complete") || normalized.includes("paid") || normalized.includes("active");
}

export function ScorecardTopDealsTab({
  customerChannel,
  salesChannel,
  onCustomerChannelChange,
  onSalesChannelChange,
  state,
}: {
  customerChannel: RevenueCustomerChannel;
  salesChannel: RevenueSalesChannel;
  onCustomerChannelChange: (value: RevenueCustomerChannel) => void;
  onSalesChannelChange: (value: RevenueSalesChannel) => void;
  state: ScorecardTopDealsState;
}) {
  const statusText = state.error
    ? state.error
    : !state.data && state.loading
      ? "Loading today’s Salesforce deals..."
      : state.loading
        ? "Refreshing today’s Salesforce deals..."
        : "Live Salesforce deals for today";

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Today&apos;s Orders
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{statusText}</p>
          </div>
          <div className="flex flex-col gap-2">
            <TogglePills
              options={REVENUE_CUSTOMER_CHANNEL_VALUES.map((value) => ({
                label: REVENUE_CUSTOMER_CHANNEL_LABELS[value],
                value,
              }))}
              value={customerChannel}
              onChange={onCustomerChannelChange}
            />
            <TogglePills
              options={REVENUE_SALES_CHANNEL_VALUES.map((value) => ({
                label: REVENUE_SALES_CHANNEL_LABELS[value],
                value,
              }))}
              value={salesChannel}
              onChange={onSalesChannelChange}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-0 pb-4 pt-0">
        {!state.data && state.loading ? (
          <div className="mx-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            Loading today&apos;s live orders...
          </div>
        ) : state.data ? (
          <div className={cn("transition-opacity duration-300", state.loading ? "opacity-60" : "opacity-100")}>
            <div className="px-5">
              <p className="text-sm text-muted-foreground">
                {state.data.totalDeals} orders today · Total {fmtCurrency(state.data.totalAmount)}
              </p>
              {state.data.deals.length < state.data.totalDeals ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Showing the top {state.data.deals.length} orders by amount for the selected filters
                </p>
              ) : null}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12">#</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Owner</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-5 py-3.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Licence</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.deals.map((deal, index) => (
                    <tr
                      key={deal.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        index < (state.data?.deals.length ?? 0) - 1 && "border-b border-border/70",
                      )}
                    >
                      <td className="px-5 py-4 text-base font-extrabold tabular-nums text-slate-300 dark:text-slate-600">{index + 1}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{deal.company}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{deal.owner}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold",
                          isPositiveStage(deal.stage) ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
                        )}>
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            isPositiveStage(deal.stage) ? "bg-emerald-500" : "bg-amber-500",
                          )} />
                          {deal.stage}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {fmtCurrency(deal.amount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                          resolveTypeClasses(deal.type),
                        )}>
                          {deal.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold",
                          resolveLicenseClasses(deal.licenceType),
                        )}>
                          {deal.licenceType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-slate-50/80 dark:bg-slate-800/40">
                    <td className="px-5 py-3.5" />
                    <td className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400" colSpan={3}>
                      {state.data.totalDeals} orders total
                    </td>
                    <td className="px-5 py-3.5 text-right text-base font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                      {fmtCurrency(state.data.totalAmount)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="mx-4 rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No Salesforce orders were found for today with the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
