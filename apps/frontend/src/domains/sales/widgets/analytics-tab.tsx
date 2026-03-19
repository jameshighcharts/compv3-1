"use client";

import * as React from "react";
import { IconTrendingUp } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { DashboardHighchart, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";

import { AnalyticsMetricCard } from "./cards";
import {
  ANALYTICS_CORAL,
  ANALYTICS_TEAL,
  analyticsBuyersTotal,
  analyticsBuyersValue,
  analyticsCustomersData,
  analyticsSalesData,
  analyticsTrafficSourceData,
  analyticsVisitorsData,
} from "../data/sales-dashboard.data";

export function DashboardAnalyticsTab() {
  const salesPerformanceOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "column",
          height: 230,
          spacing: [12, 4, 0, 4],
        },
        legend: {
          enabled: false,
        },
        xAxis: {
          categories: analyticsSalesData.map((point) => point.month),
          tickLength: 0,
        },
        yAxis: {
          opposite: true,
          gridLineWidth: 0,
          tickInterval: 80,
          max: 320,
          labels: {
            format: "{value}k",
          },
        },
        tooltip: {
          pointFormat: "<b>{point.y}k</b>",
        },
        plotOptions: {
          series: {
            animation: false,
          },
          column: {
            borderWidth: 0,
            borderRadius: 4,
            pointPadding: 0.18,
            groupPadding: 0.14,
          },
        },
        series: [
          {
            type: "column",
            name: "Visitors",
            data: analyticsSalesData.map((point) => point.visitors),
            color: ANALYTICS_CORAL,
          },
        ],
      }),
    [],
  );

  const visitorsChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "area",
          height: 230,
          spacing: [6, 4, 0, 4],
        },
        legend: {
          enabled: false,
        },
        xAxis: {
          categories: analyticsVisitorsData.map((point) => point.month),
          tickLength: 0,
        },
        yAxis: {
          gridLineColor: "var(--border)",
          labels: {
            enabled: false,
          },
        },
        tooltip: {
          shared: true,
        },
        plotOptions: {
          area: {
            stacking: "normal",
            lineWidth: 2,
            marker: {
              enabled: false,
            },
          },
          series: {
            animation: false,
          },
        },
        series: mergeSeriesColors(
          [
            {
              type: "area",
              name: "Returning",
              data: analyticsVisitorsData.map((point) => point.returning),
              fillOpacity: 0.35,
            },
            {
              type: "area",
              name: "Visitors",
              data: analyticsVisitorsData.map((point) => point.visitors),
              fillOpacity: 0.35,
              dashStyle: "Dash",
            },
          ],
          [ANALYTICS_TEAL, ANALYTICS_CORAL],
        ),
      }),
    [],
  );

  const trafficSourceChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "bar",
          height: 200,
        },
        legend: {
          enabled: false,
        },
        xAxis: {
          categories: analyticsTrafficSourceData.map((point) => point.source),
          tickLength: 0,
          lineWidth: 0,
        },
        yAxis: {
          gridLineWidth: 0,
          tickInterval: 80,
          labels: {
            format: "{value}k",
          },
        },
        tooltip: {
          pointFormat: "<b>{point.y}</b>",
        },
        plotOptions: {
          series: {
            animation: false,
          },
          bar: {
            borderWidth: 0,
            borderRadius: 4,
            pointPadding: 0.2,
            groupPadding: 0.08,
            dataLabels: {
              enabled: true,
              format: "{y}",
              style: {
                color: "var(--foreground)",
                textOutline: "none",
                fontWeight: "500",
              },
            },
          },
        },
        series: [
          {
            type: "bar",
            name: "Amount",
            data: analyticsTrafficSourceData.map((point) => point.amount),
            color: ANALYTICS_TEAL,
          },
        ],
      }),
    [],
  );

  const customersChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "area",
          height: 200,
        },
        legend: {
          enabled: false,
        },
        xAxis: {
          categories: analyticsCustomersData.map((point) => point.month),
          tickLength: 0,
        },
        yAxis: {
          visible: false,
        },
        tooltip: {
          shared: true,
          pointFormat: "<b>{point.y}</b>",
        },
        plotOptions: {
          area: {
            lineWidth: 2,
            marker: {
              enabled: false,
            },
          },
          series: {
            animation: false,
          },
        },
        series: [
          {
            type: "area",
            name: "Customers",
            data: analyticsCustomersData.map((point) => point.customers),
            color: ANALYTICS_CORAL,
            fillOpacity: 0.3,
          },
        ],
      }),
    [],
  );

  const buyersProfileChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "pie",
          height: 220,
          spacing: [0, 0, 0, 0],
        },
        legend: {
          enabled: false,
        },
        tooltip: {
          enabled: false,
        },
        plotOptions: {
          pie: {
            innerSize: "72%",
            borderWidth: 0,
            center: ["50%", "56%"],
            startAngle: -125,
            endAngle: 125,
            dataLabels: {
              enabled: false,
            },
          },
          series: {
            animation: false,
          },
        },
        series: [
          {
            type: "pie",
            data: [
              {
                name: "Buyers",
                y: analyticsBuyersValue,
                color: ANALYTICS_TEAL,
              },
              {
                name: "Remaining",
                y: analyticsBuyersTotal - analyticsBuyersValue,
                color: "var(--muted)",
              },
            ],
          },
        ],
      }),
    [],
  );

  return (
    <div className="grid auto-rows-auto grid-cols-6 gap-5">
      <div className="col-span-6 xl:col-span-3">
        <Card className="h-full w-full gap-0 py-0">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sales</CardTitle>
              <Tabs defaultValue="week">
                <TabsList className="grid h-auto w-[130px] grid-cols-2 p-[3px]">
                  <TabsTrigger className="py-[3px]" value="month">
                    Month
                  </TabsTrigger>
                  <TabsTrigger className="py-[3px]" value="week">
                    Week
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CardDescription>Visualize sales performance trends</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6">
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 sm:grid-rows-2">
              <div className="col-span-2 row-end-2 row-start-1">
                <AnalyticsMetricCard
                  title="Net Sales"
                  stats={4_567_820}
                  trend="asc"
                  profitPercentage={24.5}
                  profitNumber={10}
                />
              </div>
              <div className="col-span-2 sm:row-end-3 sm:row-start-2">
                <AnalyticsMetricCard
                  title="Orders"
                  stats={1_246}
                  trend="des"
                  profitPercentage={5.5}
                  profitNumber={-15}
                  sign="number"
                />
              </div>
              <div className="col-span-4 sm:col-span-3 sm:row-span-2">
                <DashboardHighchart options={salesPerformanceOptions} className="h-full w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6 xl:col-span-3">
        <Card className="h-full w-full gap-0 py-0">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Visitors</CardTitle>
              <Tabs defaultValue="week">
                <TabsList className="grid h-auto w-[130px] grid-cols-2 p-[3px]">
                  <TabsTrigger className="py-[3px]" value="month">
                    Month
                  </TabsTrigger>
                  <TabsTrigger className="py-[3px]" value="week">
                    Week
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CardDescription>Key visitor information at a glance</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6">
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 sm:grid-rows-2">
              <div className="col-span-2 row-end-2 row-start-1">
                <AnalyticsMetricCard
                  title="New Visitors"
                  stats={36_786}
                  trend="asc"
                  profitPercentage={66.7}
                  profitNumber={10}
                  sign="number"
                />
              </div>
              <div className="col-span-2 sm:row-end-3 sm:row-start-2">
                <AnalyticsMetricCard
                  title="Returning"
                  stats={467}
                  trend="des"
                  profitPercentage={5.5}
                  profitNumber={-6}
                  sign="number"
                />
              </div>
              <div className="col-span-4 sm:col-span-3 sm:row-span-2">
                <DashboardHighchart options={visitorsChartOptions} className="h-full w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card className="h-full w-full gap-0 py-0">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <CardTitle>Traffic Source</CardTitle>
              <Tabs defaultValue="week">
                <TabsList className="grid h-auto w-[130px] grid-cols-2 p-[3px]">
                  <TabsTrigger className="py-[3px]" value="month">
                    Month
                  </TabsTrigger>
                  <TabsTrigger className="py-[3px]" value="week">
                    Week
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CardDescription>Gain insights into where your visitors are coming from.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DashboardHighchart options={trafficSourceChartOptions} className="max-h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card className="h-full w-full gap-0 py-0">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <CardTitle>Customers</CardTitle>
              <MoreHorizontal className="size-4 cursor-pointer opacity-60" />
            </div>
            <CardDescription>Customer performance and growth trends.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <DashboardHighchart options={customersChartOptions} className="max-h-[200px] w-full" />
          </CardContent>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Trending up by 5.2% this month</span>
              <IconTrendingUp className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card className="h-full w-full gap-0 py-0">
          <CardHeader className="p-6">
            <div className="flex items-center justify-between">
              <CardTitle>Buyers Profile</CardTitle>
              <MoreHorizontal className="size-4 cursor-pointer opacity-60" />
            </div>
            <CardDescription>Discover key insights into the buyer&apos;s preferences</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-0">
            <div className="relative mx-auto aspect-square max-h-[220px] w-full">
              <DashboardHighchart options={buyersProfileChartOptions} className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="mt-4 text-center">
                  <p className="text-4xl font-bold">{analyticsBuyersValue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Buyers</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardContent className="px-6 pb-6 pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Trending up by 5.2% this month</span>
              <IconTrendingUp className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
