"use client";

import * as React from "react";
import { type SfScorecardArrResponse } from "@contracts/sales";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";

type MetricDoc = {
  name: string;
  what: string;
  uses: string;
};

type SourceDoc = {
  object: string;
  fields: string[];
  why: string;
};

function buildMetricDocs(
  data: SfScorecardArrResponse | null,
): Array<{ group: string; metrics: MetricDoc[] }> {
  const latestFullMonthLabel = data?.latestFullMonthLabel ?? "the latest full month";

  return [
    {
      group: "ARR Growth",
      metrics: [
        {
          name: "Current ARR",
          what: "ARR stock on the snapshot date. This is a point-in-time value, not a monthly total.",
          uses: "Active subscription statuses plus reconstructed ARR state from qualifying Woo orders and order lines.",
        },
        {
          name: "Rolling 12M ARR",
          what: `Closing ARR at the end of ${latestFullMonthLabel} inside the trailing-12-month bridge. It is not a sum of 12 months of ARR.`,
          uses: "The latest full-month ARR stock from the total ARR bridge.",
        },
        {
          name: "Total ARR Growth",
          what: "Opening ARR to closing ARR across the trailing 12 full months, including new-logo ARR.",
          uses: "TTM ARR bridge: opening ARR, new sales, expansion, contraction, and churn.",
        },
        {
          name: "Organic ARR Growth Rate",
          what: "Growth of the opening ARR cohort only, excluding new-logo ARR.",
          uses: "Existing-customer cohort ARR from the same TTM bridge.",
        },
        {
          name: "New Sales ARR Growth",
          what: "Current trailing-12-month annual new-logo ARR versus the prior trailing-12-month period.",
          uses: "Completed qualifying annual new orders only.",
        },
      ],
    },
    {
      group: "Retention & Revenue Quality",
      metrics: [
        {
          name: "% Recurring Revenue",
          what: "Recurring completed revenue as a share of total completed Woo order revenue.",
          uses: "Recurring revenue uses qualifying renewal and upgrade line amounts. The denominator uses completed order totals.",
        },
        {
          name: "ARR Churn",
          what: "ARR lost from the opening cohort over the trailing 12 full months.",
          uses: "Churned ARR divided by opening ARR.",
        },
        {
          name: "Renewal Rate",
          what: "Share of due subscriptions that renewed inside the renewal window.",
          uses: "Subscription anniversaries with a plus/minus 30-day renewal window.",
        },
        {
          name: "Net Revenue Retention",
          what: "How the opening ARR cohort performed after expansion, contraction, and churn.",
          uses: "Closing cohort ARR divided by opening cohort ARR. New-logo ARR is excluded.",
        },
      ],
    },
    {
      group: "Concentration & Pricing",
      metrics: [
        {
          name: "Customer Concentration",
          what: "Share of live ARR held by the largest ARR-bearing customer account.",
          uses: "Customer-keyed ARR aggregation on the live ARR snapshot.",
        },
        {
          name: "Industry Concentration",
          what: "Share of live ARR held by the largest industry bucket.",
          uses: "Latest ARR-bearing industry value tied to each active subscription.",
        },
        {
          name: "ARR per Customer",
          what: "Average live ARR per ARR-bearing customer.",
          uses: "Current ARR divided by distinct active customer keys.",
        },
        {
          name: "Average Sales Price",
          what: "Average annual new-logo ARR over the trailing 12 full months.",
          uses: "Trailing-12-month new sales ARR divided by trailing-12-month new logos.",
        },
      ],
    },
  ];
}

const SOURCES: SourceDoc[] = [
  {
    object: "woo_Subscription__c",
    fields: [
      "Id",
      "status__c",
      "CurrencyIsoCode",
      "Subscription_Start_Date__c",
      "Subscription_End_Date__c",
      "Cancelled_Date__c",
      "shipping_company__c",
      "billing_company__c",
      "Customer__c",
      "Customer__r.Name",
    ],
    why: "Subscription identity, lifecycle timing, status filters, customer fallback, and currency label.",
  },
  {
    object: "woo_Order__c",
    fields: [
      "Id",
      "Subscription__c",
      "License_Owner_Account__c",
      "License_Owner_Account__r.Name",
      "Order_Type__c",
      "OrderEffectiveDate__c",
      "OrderisComplete__c",
      "Totalextax__c",
      "meta_industry__c",
      "Support_Type__c",
      "SubscriptionType__c",
    ],
    why: "Order classification, completed revenue, ARR timing, customer identity, and industry attribution.",
  },
  {
    object: "woo_OrderLine__c",
    fields: [
      "Id",
      "Order__c",
      "Name",
      "name__c",
      "total__c",
      "SubscriptionType__c",
    ],
    why: "Upgrade and downgrade deltas use qualifying line amounts instead of full order totals.",
  },
];

const GLOBAL_LOGIC = [
  "Completed orders only: ARR and revenue logic only uses Woo orders where `OrderisComplete__c = yes`.",
  "Current ARR statuses: `active`, `pending`, `on-hold`, and `pending-cancel` count toward the live ARR snapshot.",
  "Latest full month: the previous calendar month. Trailing 12M means the 12 full months ending there.",
  "Annual logic: annual `new` orders create new ARR. Annual `renewal`, `upgrade`, and `downgrade` update ARR state.",
  "Perpetual logic: perpetual `new` does not count as ARR. ARR starts when a paid recurring renewal or support-bearing upgrade appears.",
  "Upgrade and downgrade deltas: use qualifying order-line amounts, not full Woo order totals.",
  "Renewal window: subscriptions are treated as renewed if a qualifying renewal or upgrade lands within plus/minus 30 days of the due date.",
  "Customer key order: license owner account, then shipping company, then billing company, then customer fallback.",
  "Interactive filters: this page currently uses fixed logic only. The period dropdown is presentational for now.",
];

export function HcArrInfoSheet({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SfScorecardArrResponse | null;
}) {
  const metricGroups = React.useMemo(() => buildMetricDocs(data), [data]);
  const caveats = data?.caveats ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,860px)] gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/60 pb-4">
          <SheetTitle>ARR Appendix</SheetTitle>
          <SheetDescription>
            Metric definitions, data fields, and logic behind the live Woo ARR view.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          <div className="grid gap-3 py-5 md:grid-cols-2">
            <Card className="gap-0 py-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Snapshot date:</span> {data?.asOfDate ?? "Live current date"}.</p>
                <p><span className="font-medium text-foreground">Latest full month:</span> {data?.latestFullMonthLabel ?? "Previous calendar month"}.</p>
                <p><span className="font-medium text-foreground">TTM window:</span> 12 full months ending in the latest full month.</p>
              </CardContent>
            </Card>

            <Card className="gap-0 py-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Interpretation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Current ARR</span> is a point-in-time stock metric.</p>
                <p><span className="font-medium text-foreground">Rolling 12M ARR</span> is the latest full-month closing ARR, not a 12-month sum.</p>
                <p><span className="font-medium text-foreground">NRR</span> is already live and sits in the retention cluster.</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <section className="py-5">
            <h3 className="text-sm font-semibold">Live Metrics</h3>
            <div className="mt-3 space-y-4">
              {metricGroups.map((group) => (
                <div key={group.group}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.group}
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {group.metrics.map((metric) => (
                      <Card key={metric.name} className="gap-0 py-0">
                        <CardHeader className="pb-1">
                          <CardTitle className="text-sm">{metric.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                          <p>{metric.what}</p>
                          <p><span className="font-medium text-foreground">Uses:</span> {metric.uses}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="py-5">
            <h3 className="text-sm font-semibold">Data Used</h3>
            <div className="mt-3 space-y-3">
              {SOURCES.map((source) => (
                <Card key={source.object} className="gap-0 py-0">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">{source.object}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>{source.why}</p>
                    <p><span className="font-medium text-foreground">Fields:</span> {source.fields.join(", ")}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator />

          <section className="py-5">
            <h3 className="text-sm font-semibold">Logic And Filters</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {GLOBAL_LOGIC.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <Separator />

          <section className="py-5">
            <h3 className="text-sm font-semibold">Current Caveats</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {caveats.length > 0 ? caveats.map((item) => <li key={item}>{item}</li>) : <li>Live caveats will appear here once the payload loads.</li>}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
