"use client"

import * as React from "react"
import type { ApiExpense, ApiTag } from "@/lib/finance-types"
import { formatBRL, toNumber } from "@/lib/finance-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InstallmentBadge } from "@/components/finance/installment-badge"

/** Compras parceladas em aberto. Não depende do período: mostra todas as abertas. */
export function InstallmentsSection({
  expenses,
  tagById,
  creditorById,
}: {
  expenses: ApiExpense[]
  tagById: Map<string, ApiTag>
  creditorById: Map<string, string>
}) {
  const groups = React.useMemo(() => {
    const map = new Map<
      string,
      {
        groupId: string
        item: string
        amount: number
        total: number
        paidCount: number
        tagName: string | null
        creditorName: string | null
      }
    >()

    expenses.forEach((e) => {
      if (!e.installmentGroupId) return
      const existing = map.get(e.installmentGroupId)
      if (!existing) {
        map.set(e.installmentGroupId, {
          groupId: e.installmentGroupId,
          item: e.item,
          amount: toNumber(e.amount),
          total: e.installmentTotal ?? 1,
          paidCount: e.isPaid ? 1 : 0,
          tagName: (e.tagId ? tagById.get(e.tagId)?.name : undefined) ?? null,
          creditorName: (e.creditorId ? creditorById.get(e.creditorId) : undefined) ?? null,
        })
      } else if (e.isPaid) {
        existing.paidCount++
      }
    })

    return Array.from(map.values())
      .filter((g) => g.paidCount < g.total)
      .sort((a, b) => a.total - a.paidCount - (b.total - b.paidCount))
  }, [expenses, tagById, creditorById])

  if (groups.length === 0) return null

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-start justify-between gap-3 px-5 pb-0 pt-[18px] max-md:px-4">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-tight">Compras parceladas</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {groups.length} em aberto, em todos os meses
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-2 pt-2 max-md:px-4">
        <ul className="divide-y">
          {groups.map((g) => {
            const pct = Math.round((g.paidCount / g.total) * 100)
            const remaining = g.total - g.paidCount
            return (
              <li key={g.groupId} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{g.item}</span>
                    <InstallmentBadge number={g.paidCount} total={g.total} />
                    {g.tagName && (
                      <span className="rounded-full border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {g.tagName}
                      </span>
                    )}
                    {g.creditorName && (
                      <span className="rounded-full bg-warning-soft px-1.5 py-0.5 text-[11px] text-warning">
                        {g.creditorName}
                      </span>
                    )}
                  </div>
                  <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${g.paidCount} de ${g.total} parcelas pagas`}
                  >
                    <div className="h-full rounded-full bg-info" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num text-sm font-semibold">
                    {formatBRL(g.amount)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="num text-xs text-muted-foreground">
                    {remaining} restante{remaining !== 1 ? "s" : ""} · {formatBRL(g.amount * remaining)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
