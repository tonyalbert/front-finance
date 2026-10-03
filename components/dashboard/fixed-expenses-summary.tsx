"use client"

import * as React from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiFixedExpense } from "@/lib/finance-types"
import { MONTHS, formatBRL, toNumber } from "@/lib/finance-utils"
import { competenceKey, formatVigency, isEligibleInMonth } from "@/lib/fixed-expense-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/finance/empty-state"

const VISIBLE = 5

/** Despesas fixas vigentes no mês do período (month: 1-12). */
export function FixedExpensesSummary({
  month,
  year,
}: {
  month: string
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
      .then((res) => {
        if (!cancelled) setFixedExpenses(res)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const competence = competenceKey(year, month)
  const active = React.useMemo(
    () =>
      fixedExpenses
        .filter((fe) => isEligibleInMonth(fe, competence))
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    [fixedExpenses, competence],
  )
  const total = React.useMemo(() => active.reduce((s, fe) => s + toNumber(fe.amount), 0), [active])
  const shortMonth = MONTHS[Number(month) - 1]?.short ?? ""
  const hidden = active.length - VISIBLE

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-start justify-between gap-3 px-5 pb-0 pt-[18px] max-md:px-4">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-tight">Despesas fixas</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {active.length > 0
              ? `${active.length} ativa${active.length !== 1 ? "s" : ""}, por dia de vencimento`
              : "Comprometido neste mês"}
          </p>
        </div>
        <Link href="/fixed-expenses" className="text-[13px] font-medium text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-3 max-md:px-4">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Carregando">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={RefreshCw}
            title="Nenhuma despesa fixa"
            description="Não há despesas fixas vigentes neste mês."
            className="py-6"
          />
        ) : (
          <>
            <ul className="divide-y">
              {active.slice(0, VISIBLE).map((fe) => (
                <li key={fe.id} className="flex min-h-14 items-center gap-3 py-3">
                  <span className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-subtle leading-[1.1]">
                    <b className="num text-[15px]">{String(fe.dayOfMonth).padStart(2, "0")}</b>
                    <small className="text-[10px] uppercase tracking-wide text-muted-foreground">{shortMonth}</small>
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <strong className="block truncate text-sm font-medium">{fe.name}</strong>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[fe.tag?.name, fe.creditor?.name].filter(Boolean).join(" · ") || "Sem tag ou credor"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground/80">{formatVigency(fe)}</span>
                  </div>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="num text-sm font-semibold">{formatBRL(toNumber(fe.amount))}</span>
                    <span className="text-xs text-muted-foreground">mensal</span>
                  </div>
                </li>
              ))}
            </ul>
            {hidden > 0 && (
              <Link
                href="/fixed-expenses"
                className="pb-1 pt-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                + {hidden} em Despesas fixas
              </Link>
            )}
            <div className="mt-auto flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <span className="text-[13px] font-medium text-muted-foreground">Total fixo do mês</span>
              <span className="num text-[15px] font-semibold">{formatBRL(total)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
