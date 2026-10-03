"use client"

import * as React from "react"
import { Check, Loader2, Mail, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiCreditorDetails } from "@/lib/finance-types"
import { formatBRL, formatDateDisplay, getExpenseStatus, toNumber } from "@/lib/finance-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/finance/empty-state"
import { FixedBadge, InstallmentBadge } from "@/components/finance/installment-badge"
import { StatusBadge } from "@/components/finance/status-badge"
import { Receipt } from "lucide-react"

/** Detalhe das contas de um credor no período, com troca de status (pago/pendente) na própria lista. */
export function CreditorDetailsDialog({
  open,
  onOpenChange,
  details,
  isLoading,
  periodLabel,
  payingIds,
  onSetPaid,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: ApiCreditorDetails | null
  isLoading: boolean
  periodLabel: string
  payingIds: Set<string>
  onSetPaid: (ids: string[], isPaid: boolean) => void
}) {
  const now = React.useMemo(() => new Date(), [])
  const expenses = React.useMemo(
    () => [...(details?.expenses ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [details],
  )
  const total = expenses.reduce((s, e) => s + toNumber(e.amount), 0)
  const paid = expenses.filter((e) => e.isPaid).reduce((s, e) => s + toNumber(e.amount), 0)
  const pending = expenses.filter((e) => !e.isPaid)
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0
  const paidOff = expenses.length > 0 && pending.length === 0
  const busy = payingIds.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 border-b px-5 py-4 text-left">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
              paidOff ? "bg-income-soft text-income" : "bg-expense-soft text-expense",
            )}
            aria-hidden
          >
            {(details?.name ?? "…").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-lg">{details?.name ?? "Carregando…"}</DialogTitle>
            <DialogDescription>Contas em {periodLabel}</DialogDescription>
            {(details?.phone || details?.email) && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {details.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" aria-hidden />
                    {details.phone}
                  </span>
                )}
                {details.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden />
                    {details.email}
                  </span>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 px-5 py-5" role="status" aria-label="Carregando">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma conta neste período" description="Este credor não tem despesas no mês selecionado." className="py-10" />
        ) : (
          <>
            <div className="border-b px-5 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="num text-base font-semibold">{formatBRL(total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="num text-base font-semibold text-income">{formatBRL(paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className={cn("num text-base font-semibold", pending.length > 0 && "text-warning")}>{formatBRL(total - paid)}</p>
                </div>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${pct}% pago`}
              >
                <div className="h-full rounded-full bg-income transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="num mt-1.5 text-xs text-muted-foreground">
                {pct}% pago · {expenses.length - pending.length} de {expenses.length} conta{expenses.length !== 1 ? "s" : ""}
              </p>
            </div>

            <ul className="max-h-[46vh] divide-y overflow-y-auto px-5">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{e.item}</span>
                      <InstallmentBadge number={e.installmentNumber} total={e.installmentTotal} />
                      {e.fixedExpenseCompetence && <FixedBadge />}
                    </div>
                    <span className="num text-xs text-muted-foreground">Vence {formatDateDisplay(e.date)}</span>
                  </div>
                  <StatusBadge
                    status={getExpenseStatus(e, now)}
                    disabled={payingIds.has(e.id)}
                    onToggle={() => onSetPaid([e.id], !e.isPaid)}
                  />
                  <span className="num w-24 shrink-0 text-right text-sm font-semibold">{formatBRL(toNumber(e.amount))}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <DialogFooter className="flex-row justify-between gap-2 border-t px-5 py-3 sm:justify-between">
          {pending.length > 0 ? (
            <Button variant="outline" onClick={() => onSetPaid(pending.map((e) => e.id), true)} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Check />}
              Marcar todas como pagas
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">{expenses.length > 0 ? "Tudo pago neste período." : ""}</span>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
