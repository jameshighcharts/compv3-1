"use client"

import * as React from "react"
import { IconDownload, IconPlus, IconSparkles } from "@tabler/icons-react"

import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"

type AdhocTask = {
  id: string
  question: string
  requester: string
  notesScope?: string
  priority: "low" | "medium" | "high"
  status: "todo" | "in progress" | "done"
  dueDate: string
}

const INITIAL_ADHOCS: AdhocTask[] = [
  {
    id: "ADHOC-101",
    question: "Why did paid search conversion drop week-over-week by channel and campaign?",
    requester: "Growth",
    priority: "high",
    status: "in progress",
    dueDate: "2026-02-20",
  },
  {
    id: "ADHOC-102",
    question: "Break down churn by plan tier and tenure for the last 90 days.",
    requester: "Retention",
    priority: "high",
    status: "todo",
    dueDate: "2026-02-22",
  },
  {
    id: "ADHOC-103",
    question: "Identify top drivers of MRR expansion across enterprise accounts.",
    requester: "Finance",
    priority: "medium",
    status: "todo",
    dueDate: "2026-02-24",
  },
  {
    id: "ADHOC-104",
    question: "Check anomaly in daily active users for APAC after the latest release.",
    requester: "Product",
    priority: "medium",
    status: "done",
    dueDate: "2026-02-18",
  },
  {
    id: "ADHOC-105",
    question: "Build cohort view for trial-to-paid conversion by signup source.",
    requester: "RevOps",
    priority: "low",
    status: "todo",
    dueDate: "2026-02-27",
  },
]

const formatLabel = (value: string): string =>
  value
    .split(" ")
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(" ")

const priorityVariant = (value: AdhocTask["priority"]): "destructive" | "secondary" | "outline" => {
  if (value === "high") {
    return "destructive"
  }

  if (value === "medium") {
    return "secondary"
  }

  return "outline"
}

export default function TasksPage() {
  const [rows, setRows] = React.useState<AdhocTask[]>(INITIAL_ADHOCS)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [question, setQuestion] = React.useState("")
  const [requester, setRequester] = React.useState("")
  const [notesScope, setNotesScope] = React.useState("")
  const [priority, setPriority] = React.useState<AdhocTask["priority"]>("medium")
  const [dueDate, setDueDate] = React.useState("")

  const currentAdhocs = React.useMemo(
    () => rows.filter((task) => task.status !== "done"),
    [rows],
  )

  const completedAdhocs = React.useMemo(
    () => rows.filter((task) => task.status === "done"),
    [rows],
  )

  const handleCreateTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!question.trim()) {
      return
    }

    const nextId = `ADHOC-${String(rows.length + 101).padStart(3, "0")}`

    const newTask: AdhocTask = {
      id: nextId,
      question: question.trim(),
      requester: requester.trim() || "Data Team",
      notesScope: notesScope.trim() || undefined,
      priority,
      status: "todo",
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
    }

    setRows((current) => [newTask, ...current])
    setQuestion("")
    setRequester("")
    setNotesScope("")
    setPriority("medium")
    setDueDate("")
    setIsCreateOpen(false)
  }

  const handleDownloadReport = (task: AdhocTask) => {
    const reportBody = [
      `Adhoc Report`,
      `Task ID: ${task.id}`,
      `Question: ${task.question}`,
      `Requester: ${task.requester}`,
      `Priority: ${formatLabel(task.priority)}`,
      `Status: ${formatLabel(task.status)}`,
      `Date: ${task.dueDate}`,
      `Notes / Scope: ${task.notesScope ?? "N/A"}`,
    ].join("\n")

    const blob = new Blob([reportBody], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${task.id.toLowerCase()}-report.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Adhocs</h1>
          <p className="text-sm text-muted-foreground">
            create adhocs/tasks if theres anything you need to know that is not covered in the compass.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <IconPlus className="mr-2 size-4" />
          Create Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSparkles className="size-4" />
            Current Adhocs
          </CardTitle>
          <CardDescription>
            Active requests that are in progress or queued.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px] text-foreground">ID</TableHead>
                  <TableHead className="text-foreground">Question</TableHead>
                  <TableHead className="w-[120px] text-foreground">Requester</TableHead>
                  <TableHead className="w-[110px] text-foreground">Priority</TableHead>
                  <TableHead className="w-[130px] text-foreground">Status</TableHead>
                  <TableHead className="w-[130px] text-right text-foreground">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAdhocs.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-foreground">{task.id}</TableCell>
                    <TableCell className="text-foreground">{task.question}</TableCell>
                    <TableCell className="text-foreground">{task.requester}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(task.priority)}>{formatLabel(task.priority)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatLabel(task.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground">{task.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSparkles className="size-4" />
            Completed
          </CardTitle>
          <CardDescription>
            Finished adhocs with downloadable reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px] text-foreground">ID</TableHead>
                  <TableHead className="text-foreground">Question</TableHead>
                  <TableHead className="w-[130px] text-foreground">Requester</TableHead>
                  <TableHead className="w-[130px] text-foreground">Completed</TableHead>
                  <TableHead className="w-[180px] text-right text-foreground">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedAdhocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground">
                      No completed adhocs yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  completedAdhocs.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium text-foreground">{task.id}</TableCell>
                      <TableCell className="text-foreground">{task.question}</TableCell>
                      <TableCell className="text-foreground">{task.requester}</TableCell>
                      <TableCell className="text-foreground">{task.dueDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReport(task)}>
                          <IconDownload className="mr-2 size-4" />
                          Download Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Task</SheetTitle>
            <SheetDescription>
              Add a new adhoc analysis request. Click save when you&apos;re done.
            </SheetDescription>
          </SheetHeader>
          <form
            id="create-task-form"
            className="mx-auto mt-6 w-full max-w-sm space-y-4 px-4 sm:px-0"
            onSubmit={handleCreateTask}
          >
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Question</p>
              <Input
                placeholder="e.g. Why did conversion drop by segment this week?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="w-full"
                required
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Requester</p>
              <Input
                placeholder="Growth / Product / Finance"
                value={requester}
                onChange={(event) => setRequester(event.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Notes / Scope</p>
              <textarea
                placeholder="Context, scope boundaries, metric definitions, and expected output."
                value={notesScope}
                onChange={(event) => setNotesScope(event.target.value)}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-colors focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Priority</p>
              <Select value={priority} onValueChange={(value) => setPriority(value as AdhocTask["priority"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Due Date</p>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full"
              />
            </div>
          </form>
          <SheetFooter className="mx-auto mt-6 w-full max-w-sm gap-2 p-0 px-4 sm:justify-end sm:px-0">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Close
            </Button>
            <Button form="create-task-form" type="submit">
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
