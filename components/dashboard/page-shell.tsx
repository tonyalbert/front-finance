"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PageShell({
  title,
  availableYears,
  selectedYear,
  onYearChange,
  headerActions,
  children,
}: {
  title: string
  availableYears?: number[]
  selectedYear?: string
  onYearChange?: (year: string) => void
  headerActions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground sm:text-2xl">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          {title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableYears && availableYears.length > 0 && selectedYear && onYearChange && (
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="w-[100px] border-border bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {headerActions}
        </div>
      </div>
      {children}
    </div>
  )
}
