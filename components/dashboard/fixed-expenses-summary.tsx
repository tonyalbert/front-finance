"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiFixedExpense } from "@/lib/finance-types"
import { formatBRL, toNumber } from "@/lib/finance-utils"
import {
  competenceKey,
  formatVigency,
  isEligibleInMonth,
} from "@/lib/fixed-expense-utils"

export function FixedExpensesSummary({
  month,
  year,
}: {
  month: string  // 1-12
  year: string
}) {
  const { token } = useAuth()
  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    apiFetch<ApiFixedExpense[]>("/fixed-expenses", { token })
      .then((res) => { if (!cancelled) setFixedExpenses(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [token])

  // Apenas regras ativas e vigentes no mes visto.
  const competence = competenceKey(year, month)
  const active = React.useMemo(
    () => fixedExpenses.filter((fe) => isEligibleInMonth(fe, competence)),
    [fixedExpenses, competence],
  )
  const total = React.useMemo(
    () => active.reduce((s, fe) => s + toNumber(fe.amount), 0),
    [active],
  )

  if (!isLoading && active.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">Despesas Fixas</span>
          {active.length > 0 && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {active.length} ativa{active.length !== 1 ? "s" : ""} · {formatBRL(total)}/mês
            </span>
          )}
          {isLoading && <span className="text-xs text-muted-foreground/50">...</span>}
        </div>
      </div>

      {/* List */}
      {active.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border/50">
            {active.map((fe) => (
              <div key={fe.id} className="flex items-center gap-4 px-4 py-3">
                {/* Avatar */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  <RefreshCw className="size-3.5" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground/90">{fe.name}</span>
                    <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      dia {fe.dayOfMonth}
                    </span>
                    {fe.tag && (
                      <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {fe.tag.name}
                      </span>
                    )}
                    {fe.creditor && (
                      <span className="shrink-0 rounded-full border border-orange-500/15 bg-orange-500/8 px-1.5 py-0.5 text-[10px] text-orange-300/70">
                        {fe.creditor.name}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground/50">{formatVigency(fe)}</p>
                </div>

                {/* Amount */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground/80">
                    {formatBRL(toNumber(fe.amount))}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">por mês</p>
                </div>
              </div>
            ))}

            {/* Total row */}
            {active.length > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-accent/20">
                <span className="text-xs font-medium text-muted-foreground">Total mensal fixo</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatBRL(total)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
