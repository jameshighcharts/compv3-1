"use client";

import * as React from "react";

import {
  IconBell,
  IconChartBar,
  IconChartLine,
  IconCurrencyDollar,
  IconDownload,
  IconFileAnalytics,
} from "@tabler/icons-react";

import { DatePicker } from "@/shared/ui/date-picker";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { DEFAULT_REVENUE_RANGE, type RevenueRange } from "@contracts/sales";
import { useSalesforceRevenue } from "@/lib/sf/use-salesforce-revenue";

import { DashboardAnalyticsTab } from "@/domains/sales/widgets/analytics-tab";
import { DashboardOverviewTab } from "@/domains/sales/widgets/overview-tab";
import { DashboardReportsTab } from "@/domains/sales/widgets/reports-tab";
import { DashboardSalesRevenueTab } from "@/domains/sales/widgets/sales-revenue-tab";

const TAB_IDS = {
  salesRevenueTrigger: "sales-dashboard-trigger-sales-revenue",
  salesRevenueContent: "sales-dashboard-content-sales-revenue",
  overviewTrigger: "sales-dashboard-trigger-overview",
  overviewContent: "sales-dashboard-content-overview",
  analyticsTrigger: "sales-dashboard-trigger-analytics",
  analyticsContent: "sales-dashboard-content-analytics",
  reportsTrigger: "sales-dashboard-trigger-reports",
  reportsContent: "sales-dashboard-content-reports",
  notificationsTrigger: "sales-dashboard-trigger-notifications",
  notificationsContent: "sales-dashboard-content-notifications",
} as const;

export default function SalesDashboardScreen() {
  const [range, setRange] = React.useState<RevenueRange>(DEFAULT_REVENUE_RANGE);
  const { data, loading, error } = useSalesforceRevenue(range);

  return (
    <div>
      <div className="mb-2 flex flex-col items-start justify-between space-y-2 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button size="sm">
            <IconDownload className="mr-2 size-4" />
            Download
          </Button>
          <DatePicker placeholder="Pick a date" />
        </div>
      </div>

      <Tabs defaultValue="sales-revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger
            value="sales-revenue"
            id={TAB_IDS.salesRevenueTrigger}
            aria-controls={TAB_IDS.salesRevenueContent}
          >
            <IconCurrencyDollar className="mr-1.5 size-4" />
            Sales Revenue
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            id={TAB_IDS.overviewTrigger}
            aria-controls={TAB_IDS.overviewContent}
          >
            <IconChartLine className="mr-1.5 size-4" />
            ARR
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            id={TAB_IDS.analyticsTrigger}
            aria-controls={TAB_IDS.analyticsContent}
          >
            <IconChartBar className="mr-1.5 size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            id={TAB_IDS.reportsTrigger}
            aria-controls={TAB_IDS.reportsContent}
          >
            <IconFileAnalytics className="mr-1.5 size-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            id={TAB_IDS.notificationsTrigger}
            aria-controls={TAB_IDS.notificationsContent}
          >
            <IconBell className="mr-1.5 size-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="sales-revenue"
          id={TAB_IDS.salesRevenueContent}
          aria-labelledby={TAB_IDS.salesRevenueTrigger}
          className="space-y-4"
        >
          <DashboardSalesRevenueTab
            range={range}
            onRangeChange={setRange}
            sfData={data}
            loading={loading}
            error={error}
          />
        </TabsContent>

        <TabsContent
          value="overview"
          id={TAB_IDS.overviewContent}
          aria-labelledby={TAB_IDS.overviewTrigger}
          className="space-y-4"
        >
          <DashboardOverviewTab />
        </TabsContent>

        <TabsContent
          value="analytics"
          id={TAB_IDS.analyticsContent}
          aria-labelledby={TAB_IDS.analyticsTrigger}
          className="space-y-4"
        >
          <DashboardAnalyticsTab />
        </TabsContent>

        <TabsContent
          value="reports"
          id={TAB_IDS.reportsContent}
          aria-labelledby={TAB_IDS.reportsTrigger}
        >
          <DashboardReportsTab />
        </TabsContent>

        <TabsContent
          value="notifications"
          id={TAB_IDS.notificationsContent}
          aria-labelledby={TAB_IDS.notificationsTrigger}
        >
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            Notifications content coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
