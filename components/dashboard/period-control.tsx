"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { MONTHS } from "@/lib/finance-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { usePeriod } from "./period-provider"

/** Seletor de período da topbar: mês anterior / mês e ano (abre grade de meses) / próximo mês. */
export function PeriodControl() {
  const { month, year, setPeriod, prevMonth, nextMonth } = usePeriod()
  const [open, setOpen] = React.useState(false)
  const [pickerYear, setPickerYear] = React.useState(year)
  const now = new Date()

  const navBtn =
    "grid size-[34px] place-items-center rounded-[9px] text-muted-foreground hover:bg-muted hover:text-foreground"

  return (
    <div
      role="group"
      aria-label="Período"
      className="inline-flex h-9 items-center rounded-lg border bg-card shadow-xs"
    >
      <button type="button" className={navBtn} onClick={prevMonth} aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </button>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (o) setPickerYear(year)
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-live="polite"
            className="num min-w-[44px] px-1.5 text-center text-[13px] font-medium sm:min-w-[116px]"
          >
            <span className="hidden sm:inline">
              {MONTHS[month].label} {year}
            </span>
            <span className="sm:hidden">
              {MONTHS[month].short} {String(year).slice(2)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-64 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className={navBtn}
              onClick={() => setPickerYear((y) => y - 1)}
              aria-label="Ano anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="num text-sm font-semibold">{pickerYear}</span>
            <button
              type="button"
              className={navBtn}
              onClick={() => setPickerYear((y) => y + 1)}
              aria-label="Próximo ano"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const selected = i === month && pickerYear === year
              const current = i === now.getMonth() && pickerYear === now.getFullYear()
              return (
                <button
                  key={m.short}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setPeriod(i, pickerYear)
                    setOpen(false)
                  }}
                  className={cn(
                    "h-9 rounded-lg text-[13px] font-medium hover:bg-muted",
                    current && !selected && "border border-primary text-primary",
                    selected && "bg-primary text-primary-foreground hover:bg-primary-hover",
                  )}
                >
                  {m.short}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
      <button type="button" className={navBtn} onClick={nextMonth} aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
