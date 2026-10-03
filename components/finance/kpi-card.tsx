import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

type KpiTone = "primary" | "income" | "expense" | "warning"

const iconTone: Record<KpiTone, string> = {
  primary: "bg-primary-soft text-primary",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  warning: "bg-warning-soft text-warning",
}

export type KpiDelta = {
  /** Texto, ex.: "+12,4%" */
  text: string
  direction: "up" | "down" | "flat"
  /** good = verde, bad = vermelho, neutral = cinza */
  sentiment: "good" | "bad" | "neutral"
}

const deltaTone = {
  good: "bg-income-soft text-income",
  bad: "bg-expense-soft text-expense",
  neutral: "bg-muted text-muted-foreground",
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hero,
  delta,
  footnote,
  valueClassName,
  className,
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  tone?: KpiTone
  /** Destaque: ocupa a linha toda no mobile */
  hero?: boolean
  delta?: KpiDelta
  footnote?: React.ReactNode
  valueClassName?: string
  className?: string
}) {
  const DeltaIcon = delta?.direction === "up" ? ArrowUp : delta?.direction === "down" ? ArrowDown : Minus
  return (
    <Card className={cn("gap-1.5 px-4 py-3.5 md:px-[18px] md:py-4", hero && "col-span-full sm:col-span-1", className)}>
      <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
        <span>{label}</span>
        {Icon && (
          <span className={cn("hidden size-7 place-items-center rounded-lg sm:grid", iconTone[tone])} aria-hidden>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div
        className={cn(
          "num font-semibold leading-tight tracking-tight",
          hero ? "text-[28px] sm:text-3xl" : "text-xl sm:text-[26px]",
          valueClassName,
        )}
      >
        {value}
      </div>
      {(delta || footnote) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {delta && (
            <span
              className={cn(
                "num inline-flex items-center gap-0.5 rounded-md px-1.5 py-px font-semibold",
                deltaTone[delta.sentiment],
              )}
            >
              <DeltaIcon className="size-3" aria-hidden />
              {delta.text}
            </span>
          )}
          {footnote}
        </div>
      )}
    </Card>
  )
}
