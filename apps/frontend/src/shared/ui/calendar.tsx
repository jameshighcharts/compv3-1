"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "flex h-8 items-center justify-center gap-1",
        caption_label: "hidden",
        dropdowns: "flex items-center gap-1",
        dropdown: "appearance-none rounded-md border border-border bg-background px-2 py-1 text-xs font-medium cursor-pointer hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring",
        dropdown_root: "relative",
        months_dropdown: "",
        years_dropdown: "",
        nav: "flex items-center justify-between w-full",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-9 rounded-md text-center text-[0.8rem] font-normal",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        range_start: "rounded-l-md",
        range_middle: "rounded-none bg-accent text-accent-foreground",
        range_end: "rounded-r-md",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) => {
          const iconClassName = cn("size-4", chevronClassName)

          if (orientation === "left") {
            return <ChevronLeft className={iconClassName} />
          }
          if (orientation === "right") {
            return <ChevronRight className={iconClassName} />
          }
          if (orientation === "up") {
            return <ChevronUp className={iconClassName} />
          }

          return <ChevronDown className={iconClassName} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
