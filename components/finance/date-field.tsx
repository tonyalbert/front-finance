"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateDisplay, toUtcIso, utcParts } from "@/lib/finance-utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** Data com calendário. `value` é ISO à meia-noite UTC (formato usado pela API). */
export const DateField = React.forwardRef<
  HTMLButtonElement,
  {
    value: string
    onChange: (iso: string) => void
    id?: string
    placeholder?: string
    invalid?: boolean
    className?: string
  }
>(function DateField({ value, onChange, id, placeholder = "Escolher data", invalid, className }, ref) {
  const [open, setOpen] = React.useState(false)
  const parts = value ? utcParts(value) : null
  const selected = parts ? new Date(parts.year, parts.month, parts.day) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm outline-none transition-[border-color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[invalid=true]:border-expense",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("num", !value && "text-muted-foreground")}>
            {value ? formatDateDisplay(value) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(toUtcIso(date.getFullYear(), date.getMonth(), date.getDate()))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
})
