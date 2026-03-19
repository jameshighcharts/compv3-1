"use client"

import * as React from "react"
import { IconCalendar } from "@tabler/icons-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Calendar } from "@/shared/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover"

type PresetKey =
  | "today"
  | "last7"
  | "last30"
  | "monthToDate"
  | "quarterToDate"
  | "yearToDate"
  | "lastYear"
  | "allTime"

type DatePickerProps = {
  className?: string
  placeholder?: string
  value?: DateRange
  defaultValue?: DateRange
  onChange?: (date: DateRange | undefined) => void
  /** Earliest selectable date (used for "All Time" preset and calendar bounds) */
  minDate?: Date
}

const formatDate = (value: Date): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)

/** Format a date as MM/DD/YYYY for the editable input fields */
const formatDateInput = (value: Date): string => {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  const year = value.getFullYear()
  return `${month}/${day}/${year}`
}

/** Parse a date string in common formats: MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD */
const parseDateInput = (input: string): Date | null => {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    if (!Number.isNaN(date.getTime())) return date
  }

  // Try YYYY-MM-DD
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dashMatch) {
    const [, y, m, d] = dashMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    if (!Number.isNaN(date.getTime())) return date
  }

  return null
}

const toStartOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const shiftDays = (value: Date, delta: number): Date => {
  const next = new Date(value)
  next.setDate(next.getDate() + delta)
  return toStartOfDay(next)
}

const normalizeRange = (range: DateRange | undefined): DateRange | undefined => {
  if (!range?.from) {
    return undefined
  }

  const from = toStartOfDay(range.from)
  const to = toStartOfDay(range.to ?? range.from)

  if (to < from) {
    return { from: to, to: from }
  }

  return { from, to }
}

const formatRange = (range: DateRange | undefined): string | null => {
  if (!range?.from) {
    return null
  }

  if (!range.to) {
    return `${formatDate(range.from)} - End date`
  }

  return `${formatDate(range.from)} - ${formatDate(range.to)}`
}

const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  monthToDate: "Month to Date",
  quarterToDate: "Quarter to Date",
  yearToDate: "Year to Date",
  lastYear: "Last Year",
  allTime: "All Time",
}

const getPresetRange = (
  preset: PresetKey,
  minDate?: Date,
): DateRange => {
  const today = toStartOfDay(new Date())

  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "last7":
      return { from: shiftDays(today, -6), to: today }
    case "last30":
      return { from: shiftDays(today, -29), to: today }
    case "monthToDate":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: today,
      }
    case "quarterToDate": {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
      return {
        from: new Date(today.getFullYear(), quarterStartMonth, 1),
        to: today,
      }
    }
    case "yearToDate":
      return {
        from: new Date(today.getFullYear(), 0, 1),
        to: today,
      }
    case "lastYear":
      return {
        from: new Date(today.getFullYear() - 1, 0, 1),
        to: new Date(today.getFullYear() - 1, 11, 31),
      }
    case "allTime":
      return {
        from: minDate ? toStartOfDay(minDate) : new Date(2020, 0, 1),
        to: today,
      }
  }
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: Date | undefined
  onChange: (date: Date) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [text, setText] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setText(value ? formatDateInput(value) : "")
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const commitEdit = () => {
    setEditing(false)
    const parsed = parseDateInput(text)
    if (parsed) {
      onChange(toStartOfDay(parsed))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit()
    } else if (e.key === "Escape") {
      setEditing(false)
    }
  }

  return (
    <div
      className="group cursor-text rounded-md border bg-muted/30 px-2 py-1.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
      onClick={startEditing}
    >
      <p className="text-muted-foreground text-[11px]">{label}</p>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          placeholder="MM/DD/YYYY"
          className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
          autoFocus
        />
      ) : (
        <p className="text-xs font-medium">
          {value ? formatDate(value) : (
            <span className="text-muted-foreground/60">MM/DD/YYYY</span>
          )}
        </p>
      )}
    </div>
  )
}

export function DatePicker({
  className,
  placeholder = "Pick date range",
  value,
  defaultValue,
  onChange,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>(
    normalizeRange(defaultValue),
  )
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(
    normalizeRange(defaultValue),
  )

  const selectedDate = value ?? internalDate
  const buttonLabel = formatRange(selectedDate) ?? placeholder

  // Show calendar near the end date (or today) so users don't start at a distant past date
  const calendarDefaultMonth = React.useMemo(() => {
    const anchor = draftRange?.to ?? draftRange?.from ?? new Date()
    // Show the month before the anchor so both the anchor month and prior month are visible
    const d = new Date(anchor)
    d.setMonth(d.getMonth() - 1)
    return d
  }, [draftRange?.to, draftRange?.from])

  // Dropdown bounds for month/year navigation
  const dropdownStartMonth = React.useMemo(
    () => minDate ?? new Date(2018, 0),
    [minDate],
  )
  const dropdownEndMonth = React.useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  }, [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const commitDate = (nextRange: DateRange | undefined) => {
    const normalized = normalizeRange(nextRange)

    if (value === undefined) {
      setInternalDate(normalized)
    }

    onChange?.(normalized)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRange(selectedDate)
    }

    setOpen(nextOpen)
  }

  const applyRange = () => {
    commitDate(draftRange)
    setOpen(false)
  }

  const clearRange = () => {
    setDraftRange(undefined)
    commitDate(undefined)
    setOpen(false)
  }

  const cancelRange = () => {
    setDraftRange(selectedDate)
    setOpen(false)
  }

  const setPreset = (preset: PresetKey) => {
    setDraftRange(getPresetRange(preset, minDate))
  }

  const handleStartChange = (date: Date) => {
    setDraftRange((prev) => ({
      from: date,
      to: prev?.to && date <= prev.to ? prev.to : date,
    }))
  }

  const handleEndChange = (date: Date) => {
    setDraftRange((prev) => ({
      from: prev?.from && date >= prev.from ? prev.from : date,
      to: date,
    }))
  }

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "min-w-[260px] justify-start text-left font-normal",
          !selectedDate && "text-muted-foreground",
          className,
        )}
        type="button"
      >
        <IconCalendar className="mr-2 size-4" />
        {buttonLabel}
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "min-w-[260px] justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
          )}
        >
          <IconCalendar className="mr-2 size-4" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="border-border border-b px-3 py-2">
          <p className="text-muted-foreground text-xs">Date Range</p>
          <p className="text-sm font-medium">
            {formatRange(draftRange) ?? "Select start and end date"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
              <Button
                key={key}
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setPreset(key)}
              >
                {PRESET_LABELS[key]}
              </Button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <DateInput
              label="Start"
              value={draftRange?.from}
              onChange={handleStartChange}
            />
            <DateInput
              label="End"
              value={draftRange?.to}
              onChange={handleEndChange}
            />
          </div>
        </div>

        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          numberOfMonths={2}
          defaultMonth={calendarDefaultMonth}
          captionLayout="dropdown"
          startMonth={dropdownStartMonth}
          endMonth={dropdownEndMonth}
          initialFocus
        />

        <div className="border-border flex items-center justify-between gap-2 border-t p-2">
          <Button type="button" variant="ghost" size="sm" onClick={clearRange}>
            Clear
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelRange}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyRange}
              disabled={!draftRange?.from}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
