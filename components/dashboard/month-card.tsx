import { Card, CardContent } from "@/components/ui/card"
import { formatBRL } from "@/lib/finance-utils"
import type { MonthCardData } from "@/lib/finance-types"

export function MonthCard({
  month,
  hasInstallments,
}: {
  month: MonthCardData
  hasInstallments?: boolean
}) {
  const balance = month.income - month.expense
  const balanceClass =
    balance > 0
      ? "text-emerald-400"
      : balance < 0
        ? "text-red-400"
        : "text-muted-foreground"

  return (
    <Card
      className={[
        "py-4 bg-white/[0.04] border-white/[0.08] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.12]",
        month.isCurrentMonth ? "ring-1 ring-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.1)]" : "",
        hasInstallments ? "border-blue-500/20" : "",
      ].join(" ")}
    >
      <CardContent className="px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: month.dotColor }} />
            <div className="text-sm font-semibold">{month.label}</div>
          </div>
          {hasInstallments && (
            <div className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
              Parcelas
            </div>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Receita:</span>
            <span className="font-medium tabular-nums">{formatBRL(month.income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Despesa:</span>
            <span className="font-medium tabular-nums">{formatBRL(month.expense)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Saldo:</span>
            <span className={`font-semibold tabular-nums ${balanceClass}`}>{formatBRL(balance)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
