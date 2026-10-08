"use client"

import * as React from "react"
import { CheckCircle2, HandCoins, Loader2, MoreHorizontal, Plus, XCircle } from "lucide-react"
import { formatBRL, formatDateDisplay, toNumber } from "@/lib/finance-utils"
import type { ApiSavingsGoal, ApiSavingsLoan } from "@/lib/finance-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

type LoanRow = { goal: ApiSavingsGoal; loan: ApiSavingsLoan }

/** Empréstimos tomados das metas (ex.: reserva): parcelas, próxima a pagar e quitação. */
export function LoansSection({
  goals,
  canBorrow,
  onBorrow,
  onPay,
  onCancel,
}: {
  goals: ApiSavingsGoal[]
  canBorrow: boolean
  onBorrow: () => void
  onPay: (expenseId: string) => Promise<void>
  onCancel: (goalId: string, loanId: string) => void
}) {
  const rows: LoanRow[] = goals.flatMap((goal) => (goal.loans ?? []).map((loan) => ({ goal, loan })))
  const open = rows.filter((r) => r.loan.remainingCount > 0)
  const done = rows.filter((r) => r.loan.remainingCount === 0)
  const [payingId, setPayingId] = React.useState<string | null>(null)
  const [pendingCancel, setPendingCancel] = React.useState<LoanRow | null>(null)

  async function pay(expenseId: string) {
    setPayingId(expenseId)
    try {
      await onPay(expenseId)
    } finally {
      setPayingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Empréstimos da reserva</h2>
          <p className="text-[13px] text-muted-foreground">Pegue do que guardou e devolva com juros, como num banco. Os juros voltam para você.</p>
        </div>
        <Button variant="outline" onClick={onBorrow} disabled={!canBorrow}>
          <Plus /> Pedir empréstimo
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed px-3.5 py-3 text-[13px] text-muted-foreground">
          Precisou usar a reserva? Em vez de só tirar o dinheiro, faça um empréstimo para você mesmo: as parcelas entram em Despesas e cada uma paga
          devolve o valor com os juros que você escolher.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...open, ...done].map(({ goal, loan }) => {
            const total = toNumber(loan.installmentAmount) * loan.installments
            const pct = total > 0 ? Math.min(100, (loan.paidAmount / total) * 100) : 0
            const settled = loan.remainingCount === 0
            const next = loan.nextInstallment
            return (
              <Card key={loan.id} className="gap-0 py-0">
                <CardContent className="flex flex-col gap-3 p-5 max-md:p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-warning-soft text-warning" aria-hidden>
                      <HandCoins className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <strong className="block truncate text-[15px] font-semibold tracking-tight">
                        {formatBRL(toNumber(loan.principal))} de {goal.name}
                      </strong>
                      <span className="num text-xs text-muted-foreground">
                        {loan.installments}× {formatBRL(toNumber(loan.installmentAmount))} ·{" "}
                        {toNumber(loan.monthlyRate) === 0 ? "sem juros" : `${toNumber(loan.monthlyRate).toLocaleString("pt-BR")}% a.m.`}
                      </span>
                    </div>
                    {settled ? (
                      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-income-soft px-2 text-[11px] font-medium text-income">
                        <CheckCircle2 className="size-3" aria-hidden /> Quitado
                      </span>
                    ) : (
                      loan.paidCount === 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8 max-md:size-11" aria-label="Ações do empréstimo">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem variant="destructive" onSelect={() => setPendingCancel({ goal, loan })}>
                              <XCircle /> Cancelar empréstimo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Progress value={pct} aria-label={`${Math.round(pct)}% devolvido`} className="h-2 bg-muted [&>[data-slot=progress-indicator]]:bg-income" />
                    <div className="num flex justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatBRL(loan.paidAmount)} de {formatBRL(total)} devolvidos
                      </span>
                      <span>
                        {loan.paidCount}/{loan.installments} parcelas
                      </span>
                    </div>
                  </div>

                  {next && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5 text-[13px]">
                      <div className="min-w-0 flex-1 leading-tight">
                        <span className="block text-muted-foreground">
                          Próxima: {next.number}/{loan.installments} · {formatDateDisplay(next.date)}
                        </span>
                        <b className="num text-[15px]">{formatBRL(next.amount)}</b>
                      </div>
                      <Button size="sm" onClick={() => void pay(next.expenseId)} disabled={payingId !== null}>
                        {payingId === next.expenseId && <Loader2 className="animate-spin" />}
                        Pagar parcela
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AlertDialog open={!!pendingCancel} onOpenChange={(o) => !o && setPendingCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar o empréstimo?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel && `${formatBRL(toNumber(pendingCancel.loan.principal))} volta para ${pendingCancel.goal.name}`} e as{" "}
              {pendingCancel?.loan.installments} parcelas saem de Despesas. Use isto se você não chegou a usar o dinheiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (pendingCancel) onCancel(pendingCancel.goal.id, pendingCancel.loan.id)
                setPendingCancel(null)
              }}
            >
              Cancelar empréstimo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
