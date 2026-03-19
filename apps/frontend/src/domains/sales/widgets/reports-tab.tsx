"use client";

import { IconFileDescription } from "@tabler/icons-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { reportFiles } from "../data/sales-dashboard.data";

export function DashboardReportsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports Library</CardTitle>
        <CardDescription>Download your latest monthly reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Report</TableHead>
                <TableHead className="text-foreground">Type</TableHead>
                <TableHead className="text-foreground">Period</TableHead>
                <TableHead className="text-right text-foreground">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportFiles.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-foreground">{report.name}</TableCell>
                  <TableCell className="text-foreground">{report.type}</TableCell>
                  <TableCell className="text-foreground">{report.period}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <IconFileDescription className="mr-2 size-4" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
