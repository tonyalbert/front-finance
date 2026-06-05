"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { formatDateDisplay } from "@/lib/finance-utils"

function parseUTCAsLocal(iso: string): Date | undefined {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return undefined
  // Create local date from UTC parts so the calendar highlights the correct day
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function DatePickerCell({
  value,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  value: string
  isEditing: boolean
  onStartEdit: () => void
  onSave: (isoDate: string) => void
  onCancel: () => void
}) {
  const selected = parseUTCAsLocal(value)

  if (!isEditing) {
    return (
      <span className="cursor-text" onClick={onStartEdit}>
        {formatDateDisplay(value)}
      </span>
    )
  }

  return (
    <Popover open onOpenChange={(open) => { if (!open) onCancel() }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-border bg-background px-3 text-sm font-normal text-foreground"
        >
          <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
          {formatDateDisplay(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            // Convert local selection back to UTC midnight to avoid timezone drift
            const iso = new Date(
              Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
            ).toISOString()
            onSave(iso)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
