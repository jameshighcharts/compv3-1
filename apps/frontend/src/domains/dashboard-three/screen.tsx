"use client";

import * as React from "react";
import {
  IconFilter,
} from "@tabler/icons-react";
import { TrendingUp } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { DashboardHighchart, chartColor, createBaseChartOptions, mergeSeriesColors } from "@/shared/charts/highcharts";
import { DatePicker } from "@/shared/ui/date-picker";

import { DashboardThreeMetricCard } from "./widgets/cards";
import {
  budgetData,
  formatInteger,
  metricCards,
  overviewData,
  radarData,
  totalDesktop,
  totalMobile,
} from "./data/dashboard-three.data";

export function DashboardThreeView() {
  const [activeChart, setActiveChart] = React.useState<"desktop" | "mobile">("desktop");

  const budgetChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "column",
          height: 250,
        },
        legend: {
          enabled: false,
        },
        xAxis: {
          categories: budgetData.map((item) => {
            const date = new Date(item.date);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }),
          tickLength: 0,
        },
        yAxis: {
          title: {
            text: undefined,
          },
          gridLineColor: "var(--border)",
        },
        tooltip: {
          formatter() {
            const dateLabel = String(this.x ?? "");
            return `<span>${dateLabel}</span><br/><b>${this.series.name}: ${formatInteger(Number(this.y))}</b>`;
          },
        },
        plotOptions: {
          series: {
            animation: false,
          },
          column: {
            borderWidth: 0,
          },
        },
        series: [
          {
            type: "column",
            name: activeChart === "desktop" ? "Desktop" : "Mobile",
            color: activeChart === "desktop" ? chartColor(0) : chartColor(1),
            data: budgetData.map((item) => item[activeChart]),
          },
        ],
      }),
    [activeChart],
  );

  const radialChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "pie",
          height: 250,
        },
        title: {
          text: "1,260",
          align: "center",
          verticalAlign: "middle",
          y: 10,
          style: {
            color: "var(--foreground)",
            fontSize: "30px",
            fontWeight: "700",
          },
        },
        subtitle: {
          text: "Visitors",
          align: "center",
          verticalAlign: "middle",
          y: 34,
          style: {
            color: "var(--muted-foreground)",
          },
        },
        legend: {
          enabled: false,
        },
        tooltip: {
          enabled: false,
        },
        plotOptions: {
          series: {
            animation: false,
          },
          pie: {
            startAngle: -90,
            endAngle: 160,
            center: ["50%", "55%"],
            innerSize: "72%",
            borderWidth: 0,
            dataLabels: {
              enabled: false,
            },
          },
        },
        series: [
          {
            type: "pie",
            data: [
              { name: "Visitors", y: 1260, color: chartColor(1) },
              { name: "Remaining", y: 340, color: "var(--muted)" },
            ],
          },
        ],
      }),
    [],
  );

  const radarChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          polar: true,
          type: "area",
          height: 250,
        },
        legend: {
          enabled: false,
        },
        pane: {
          size: "80%",
        },
        xAxis: {
          categories: radarData.map((item) => item.month),
          tickmarkPlacement: "on",
          lineWidth: 0,
        },
        yAxis: {
          gridLineInterpolation: "polygon",
          lineWidth: 0,
          min: 0,
          title: {
            text: undefined,
          },
        },
        tooltip: {
          shared: true,
        },
        plotOptions: {
          series: {
            animation: false,
            pointPlacement: "on",
          },
          area: {
            marker: {
              enabled: false,
            },
            lineWidth: 1,
          },
        },
        series: mergeSeriesColors(
          [
            {
              type: "area",
              name: "Desktop",
              data: radarData.map((item) => item.desktop),
              fillOpacity: 0.5,
            },
            {
              type: "area",
              name: "Mobile",
              data: radarData.map((item) => item.mobile),
              fillOpacity: 0.5,
            },
          ],
          [chartColor(0), chartColor(1)],
        ),
      }),
    [],
  );

  const overviewChartOptions = React.useMemo(
    () =>
      createBaseChartOptions({
        chart: {
          type: "column",
          height: 250,
        },
        xAxis: {
          categories: overviewData.map((item) => item.month),
          tickLength: 0,
        },
        yAxis: {
          title: {
            text: undefined,
          },
          gridLineColor: "var(--border)",
        },
        tooltip: {
          shared: true,
        },
        legend: {
          enabled: true,
        },
        plotOptions: {
          series: {
            animation: false,
          },
          column: {
            stacking: "normal",
            borderWidth: 0,
          },
        },
        series: mergeSeriesColors(
          [
            {
              type: "column",
              name: "Desktop",
              data: overviewData.map((item) => item.desktop),
              stack: "overview",
            },
            {
              type: "column",
              name: "Mobile",
              data: overviewData.map((item) => item.mobile),
              stack: "overview",
            },
          ],
          [chartColor(0), chartColor(1)],
        ),
      }),
    [],
  );

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-muted-foreground">Here, take a look at your sales.</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker />
          <Button size="sm">
            <IconFilter className="mr-2 size-4" />
            Filter By
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 items-stretch gap-5">
        <div className="col-span-12 xl:col-span-8">
          <Card className="h-full overflow-hidden">
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                <CardTitle>Budgets - Consolidated</CardTitle>
                <CardDescription>Showing total budgets for the last 3 months</CardDescription>
              </div>
              <div className="flex min-w-[280px] sm:min-w-[360px]">
                {(["desktop", "mobile"] as const).map((key) => (
                  <button
                    key={key}
                    data-active={activeChart === key}
                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                    onClick={() => setActiveChart(key)}
                  >
                    <span className="text-xs text-muted-foreground">
                      {key === "desktop" ? "Desktop" : "Mobile"}
                    </span>
                    <span className="text-lg font-bold leading-none sm:text-3xl">
                      {key === "desktop" ? formatInteger(totalDesktop) : formatInteger(totalMobile)}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-6 pt-4 sm:px-6">
              <DashboardHighchart options={budgetChartOptions} className="aspect-auto h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card className="flex h-full flex-col">
            <CardHeader className="items-start pb-0">
              <CardTitle>Total Visitors Chart - Shape</CardTitle>
              <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-center pb-0 pt-2">
              <DashboardHighchart options={radialChartOptions} className="mx-auto h-[250px] w-full max-w-[280px]" />
            </CardContent>
            <CardFooter className="mt-auto flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 font-medium leading-none">
                Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
              </div>
              <div className="leading-none text-muted-foreground">
                Showing total visitors for the last 6 months
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="col-span-12 grid auto-rows-fr grid-cols-4 gap-5 lg:col-span-6 xl:col-span-5">
          {metricCards.map((card) => (
            <div key={card.title} className="col-span-2">
              <DashboardThreeMetricCard card={card} />
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-6 xl:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Sales By Month</CardTitle>
              <CardDescription>Showing total sales for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center pb-0">
              <DashboardHighchart options={radarChartOptions} className="mx-auto h-[280px] w-full max-w-[420px]" />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-6 xl:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <DashboardHighchart options={overviewChartOptions} className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
