"use client"

import * as React from "react"
import { toast } from "sonner"
import { CalendarClock, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiFixedExpense, ApiGenerateResult } from "@/lib/finance-types"
import { MONTHS, formatBRL, toNumber } from "@/lib/finance-utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export function FixedExpensesSummary({
  month,
  year,
  onGenerated,
}: {
  month: string  // 1-12
  year: string
  onGenerated?: () => void
}) {
  const { token } = useAuth()
  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)

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

  const active = fixedExpenses.filter((fe) => fe.isActive)
  const total = React.useMemo(
    () => active.reduce((s, fe) => s + toNumber(fe.amount), 0),
    [active],
  )
  const monthLabel = MONTHS[Number(month) - 1]?.label ?? ""

  async function handleGenerate() {
    if (!token) return
    setIsGenerating(true)
    try {
      const result = await apiFetch<ApiGenerateResult>(
        `/fixed-expenses/generate/${year}/${month}`,
        { method: "POST", token },
      )
      const geradas = result.generated
      const ignoradas = result.skipped
      toast.success(
        `${geradas} despesa${geradas !== 1 ? "s" : ""} gerada${geradas !== 1 ? "s" : ""} para ${monthLabel}${ignoradas > 0 ? `, ${ignoradas} já existia${ignoradas !== 1 ? "m" : ""}` : ""}.`,
      )
      onGenerated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar despesas.")
    } finally {
      setIsGenerating(false)
    }
  }

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
        {active.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating
              ? <Spinner className="mr-1.5 size-3" />
              : <CalendarClock className="mr-1.5 size-3" />}
            {isGenerating ? "Gerando..." : `Gerar ${monthLabel} ${year}`}
          </Button>
        )}
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
                  <p className="mt-0.5 text-xs text-muted-foreground/50">recorrente mensal</p>
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
