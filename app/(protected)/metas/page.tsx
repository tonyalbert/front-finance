"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  History,
  LifeBuoy,
  MinusCircle,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiFixedExpense, ApiFixedIncome, ApiSavingsGoal } from "@/lib/finance-types"
import { MONTHS, formatBRL, formatDateDisplay, toNumber } from "@/lib/finance-utils"
import { addMonthsKey, formatMonthYear, incomeAmountFor, isEligibleInMonth, localToday, monthKey } from "@/lib/fixed-expense-utils"
import { EMERGENCY_MONTHS, monthlyNeeded, savedInMonth } from "@/lib/savings-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { KpiCard } from "@/components/finance/kpi-card"
import { KpiRowSkeleton } from "@/components/finance/skeletons"
import { GOAL_STATUS } from "@/components/metas/goal-status"
import { GoalSheet, endOfMonthIso, type GoalDraft, type GoalFormValues } from "@/components/metas/goal-sheet"
import { MovementDialog, type MovementType, type MovementValues } from "@/components/metas/movement-dialog"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

export default function MetasPage() {
  const { token } = useAuth()
  const today = monthKey(localToday())
  const monthLabel = MONTHS[Number(today.slice(5)) - 1].label.toLowerCase()

  const [goals, setGoals] = React.useState<ApiSavingsGoal[]>([])
  const [fixedIncomes, setFixedIncomes] = React.useState<ApiFixedIncome[]>([])
  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiSavingsGoal | null>(null)
  const [draft, setDraft] = React.useState<GoalDraft | null>(null)
  const [moving, setMoving] = React.useState<{ goal: ApiSavingsGoal; type: MovementType } | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<ApiSavingsGoal | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [g, fi, fe] = await Promise.all([
        apiFetch<ApiSavingsGoal[]>("/savings-goals", { token }),
        // Fixas só alimentam o alerta de viabilidade e a sugestão de reserva: falha nelas não bloqueia a página.
        apiFetch<ApiFixedIncome[]>("/fixed-incomes", { token }).catch(() => []),
        apiFetch<ApiFixedExpense[]>("/fixed-expenses", { token }).catch(() => []),
      ])
      setGoals(g)
      setFixedIncomes(fi)
      setFixedExpenses(fe)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar as metas.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  const replaceGoal = (updated: ApiSavingsGoal) => setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))

  // ── Números do mês atual ───────────────────────────────────────────────
  const totalSaved = goals.reduce((s, g) => s + g.progress.saved, 0)
  const savedThisMonth = savedInMonth(goals, today)
  const leftThisMonth = goals.reduce((s, g) => s + (g.progress.status === "completed" ? 0 : g.progress.leftThisMonth), 0)
  const needed = monthlyNeeded(goals)

  const fixedIncomeTotal = fixedIncomes.filter((fi) => isEligibleInMonth(fi, today)).reduce((s, fi) => s + toNumber(incomeAmountFor(fi, today)), 0)
  const fixedExpenseTotal = fixedExpenses.filter((fe) => isEligibleInMonth(fe, today)).reduce((s, fe) => s + toNumber(fe.amount), 0)
  const fixedBalance = fixedIncomeTotal - fixedExpenseTotal

  const hasEmergency = goals.some((g) => g.isEmergencyFund)
  const emergencyTarget = Math.ceil(fixedExpenseTotal * EMERGENCY_MONTHS)

  function openCreate(nextDraft: GoalDraft | null = null) {
    setEditing(null)
    setDraft(nextDraft)
    setSheetOpen(true)
  }

  async function submitGoal(values: GoalFormValues, current: ApiSavingsGoal | null) {
    if (!token) throw new Error("Sessão expirada.")
    const body = {
      name: values.name,
      targetAmount: values.targetAmount,
      targetDate: values.targetDate.slice(0, 10),
      initialAmount: values.initialAmount,
    }
    try {
      if (current) {
        replaceGoal(await apiFetch<ApiSavingsGoal>(`/savings-goals/${current.id}`, { method: "PUT", token, body: JSON.stringify(body) }))
        toast.success("Meta atualizada.")
      } else {
        const created = await apiFetch<ApiSavingsGoal>("/savings-goals", {
          method: "POST",
          token,
          body: JSON.stringify({ ...body, ...(draft?.isEmergencyFund ? { isEmergencyFund: true } : {}) }),
        })
        setGoals((prev) => [...prev, created].sort((a, b) => a.targetDate.localeCompare(b.targetDate)))
        toast.success("Meta criada.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
      throw err
    }
  }

  async function submitMovement(goal: ApiSavingsGoal, values: MovementValues) {
    if (!token) throw new Error("Sessão expirada.")
    try {
      const updated = await apiFetch<ApiSavingsGoal>(`/savings-goals/${goal.id}/movements`, { method: "POST", token, body: JSON.stringify(values) })
      replaceGoal(updated)
      if (values.type === "WITHDRAW") toast.success(`${formatBRL(values.amount)} retirado de ${goal.name}.`)
      else if (updated.progress.status === "completed") toast.success(`Parabéns! Você atingiu a meta ${goal.name}.`)
      else toast.success(`${formatBRL(values.amount)} guardado em ${goal.name}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar.")
      throw err
    }
  }

  async function removeMovement(goal: ApiSavingsGoal, movementId: string) {
    if (!token) return
    try {
      replaceGoal(await apiFetch<ApiSavingsGoal>(`/savings-goals/${goal.id}/movements/${movementId}`, { method: "DELETE", token }))
      toast.success("Movimentação excluída.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    setIsDeleting(true)
    try {
      await apiFetch(`/savings-goals/${pendingDelete.id}`, { method: "DELETE", token })
      setGoals((prev) => prev.filter((g) => g.id !== pendingDelete.id))
      toast.success("Meta excluída.")
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  const active = goals.filter((g) => g.progress.status !== "completed")
  const completed = goals.filter((g) => g.progress.status === "completed")

  return (
    <PageShell
      title="Metas"
      subtitle="Diga quanto quer juntar e até quando: calculamos quanto guardar por mês"
      headerActions={
        <Button onClick={() => openCreate()}>
          <Plus /> Nova meta
        </Button>
      }
    >
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label={`Guardar em ${monthLabel}`}
            icon={PiggyBank}
            tone="primary"
            value={formatBRL(leftThisMonth)}
            footnote={leftThisMonth > 0 ? "Para todas as metas seguirem o plano" : goals.length > 0 ? "Mês em dia com todas as metas" : "Crie sua primeira meta"}
          />
          <KpiCard label={`Guardado em ${monthLabel}`} icon={CalendarClock} tone="income" value={formatBRL(savedThisMonth)} footnote="Aportes menos retiradas" />
          <KpiCard
            label="Total guardado"
            icon={ShieldCheck}
            tone="income"
            value={formatBRL(totalSaved)}
            footnote={`${goals.length} meta${goals.length !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {loadError && !isLoading ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar as metas</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {active.length > 0 && <ViabilityNotice needed={needed} fixedBalance={fixedBalance} hasFixedIncome={fixedIncomeTotal > 0} />}

          {!hasEmergency && fixedExpenseTotal > 0 && (
            <Card className="gap-0 border-primary/30 py-0">
              <CardContent className="flex flex-col gap-3 p-5 max-md:p-4 sm:flex-row sm:items-center sm:gap-4">
                <span className="hidden size-10 shrink-0 sm:grid place-items-center rounded-lg bg-primary-soft text-primary" aria-hidden>
                  <LifeBuoy className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-[13px] leading-snug">
                  <strong className="block text-sm font-semibold">Comece pela reserva de emergência</strong>
                  <span className="text-muted-foreground">
                    O recomendado é ter {EMERGENCY_MONTHS} meses das suas despesas fixas guardados:{" "}
                    <b className="num text-foreground">{formatBRL(emergencyTarget)}</b>. Ela cobre imprevistos como perda de renda ou problemas de saúde
                    sem precisar fazer dívidas.
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    openCreate({
                      name: "Reserva de emergência",
                      targetAmount: emergencyTarget,
                      targetDate: endOfMonthIso(addMonthsKey(today, 11)),
                      isEmergencyFund: true,
                    })
                  }
                >
                  <Plus /> Criar reserva
                </Button>
              </CardContent>
            </Card>
          )}

          {goals.length === 0 ? (
            <Card className="py-0">
              <CardContent className="p-0">
                <EmptyState
                  icon={PiggyBank}
                  title="Nenhuma meta ainda"
                  description="Viagem, carro, troca de celular, reserva de emergência: defina o valor e o prazo e veja quanto guardar por mês."
                  action={
                    <Button onClick={() => openCreate()}>
                      <Plus /> Nova meta
                    </Button>
                  }
                  className="py-10"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map((g) => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    onMove={(type) => setMoving({ goal: g, type })}
                    onEdit={() => {
                      setEditing(g)
                      setDraft(null)
                      setSheetOpen(true)
                    }}
                    onDelete={() => setPendingDelete(g)}
                    onRemoveMovement={(id) => void removeMovement(g, id)}
                  />
                ))}
              </div>
              {completed.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-[15px] font-semibold tracking-tight">Concluídas</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {completed.map((g) => (
                      <GoalCard
                        key={g.id}
                        goal={g}
                        onMove={(type) => setMoving({ goal: g, type })}
                        onEdit={() => {
                          setEditing(g)
                          setDraft(null)
                          setSheetOpen(true)
                        }}
                        onDelete={() => setPendingDelete(g)}
                        onRemoveMovement={(id) => void removeMovement(g, id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      <GoalSheet open={sheetOpen} onOpenChange={setSheetOpen} goal={editing} draft={draft} onSubmit={submitGoal} />
      <MovementDialog goal={moving?.goal ?? null} initialType={moving?.type ?? "DEPOSIT"} onOpenChange={(o) => !o && setMoving(null)} onSubmit={submitMovement} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a meta “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de aportes e retiradas desta meta também será apagado. O dinheiro em si continua com você: isso só remove o
              acompanhamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}

/** Alerta de viabilidade: as metas cabem no que sobra das receitas fixas depois das despesas fixas? */
function ViabilityNotice({ needed, fixedBalance, hasFixedIncome }: { needed: number; fixedBalance: number; hasFixedIncome: boolean }) {
  if (!hasFixedIncome) {
    return (
      <p className="rounded-[10px] border bg-muted/50 px-3.5 py-3 text-[13px] text-muted-foreground">
        Cadastre suas{" "}
        <Link href="/fixed-expenses?tipo=receitas" className="font-medium text-primary hover:underline">
          receitas fixas
        </Link>{" "}
        (salário, contratos) para conferirmos se suas metas cabem no orçamento.
      </p>
    )
  }
  if (needed > fixedBalance) {
    const gap = needed - Math.max(0, fixedBalance)
    return (
      <div role="status" className="flex items-start gap-3 rounded-[10px] border border-warning/40 bg-warning-soft px-3.5 py-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <strong className="block text-sm font-semibold">Suas metas pedem mais do que sobra no mês</strong>
          <span className="text-muted-foreground">
            Elas pedem <b className="num text-foreground">{formatBRL(needed)}</b> por mês, mas depois das despesas fixas sobram{" "}
            <b className="num text-foreground">{formatBRL(fixedBalance)}</b> das receitas fixas. Faltam{" "}
            <b className="num text-foreground">{formatBRL(gap)}</b>: estenda algum prazo, reduza um valor ou corte uma despesa fixa.
          </span>
        </div>
      </div>
    )
  }
  const pct = fixedBalance > 0 ? Math.round((needed / fixedBalance) * 100) : 0
  return (
    <div role="status" className="flex items-start gap-3 rounded-[10px] border border-income/30 bg-income-soft/60 px-3.5 py-3">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-income" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
        <strong className="text-foreground">Cabe no orçamento.</strong> Suas metas pedem <b className="num text-foreground">{formatBRL(needed)}</b>{" "}
        por mês, {pct}% do que sobra das receitas fixas depois das despesas fixas ({formatBRL(fixedBalance)}).
      </p>
    </div>
  )
}

function GoalCard({
  goal,
  onMove,
  onEdit,
  onDelete,
  onRemoveMovement,
}: {
  goal: ApiSavingsGoal
  onMove: (type: MovementType) => void
  onEdit: () => void
  onDelete: () => void
  onRemoveMovement: (movementId: string) => void
}) {
  const [showHistory, setShowHistory] = React.useState(false)
  const p = goal.progress
  const s = GOAL_STATUS[p.status]
  const StatusIcon = s.icon
  const done = p.status === "completed"

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-4 p-5 max-md:p-4">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", goal.isEmergencyFund ? "bg-primary-soft text-primary" : "bg-income-soft text-income")} aria-hidden>
            {goal.isEmergencyFund ? <LifeBuoy className="size-5" /> : <PiggyBank className="size-5" />}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <strong className="block truncate text-[15px] font-semibold tracking-tight">{goal.name}</strong>
            <span className="text-xs text-muted-foreground">
              Até {formatMonthYear(goal.targetDate)}
              {!done && p.monthsLeft > 0 && ` · ${p.monthsLeft} ${p.monthsLeft === 1 ? "mês" : "meses"}`}
            </span>
          </div>
          <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium", s.cls)}>
            <StatusIcon className="size-3" aria-hidden />
            {s.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8 max-md:size-11" aria-label={`Ações de ${goal.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onMove("WITHDRAW")} disabled={p.saved <= 0}>
                <MinusCircle /> Retirar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="num text-xl font-semibold tracking-tight">{formatBRL(p.saved)}</span>
            <span className="num text-[13px] text-muted-foreground">
              de {formatBRL(toNumber(goal.targetAmount))} · {p.percent.toLocaleString("pt-BR")}%
            </span>
          </div>
          <Progress value={p.percent} aria-label={`${p.percent}% da meta`} className="h-2.5 bg-muted [&>[data-slot=progress-indicator]]:bg-income" />
        </div>

        {done ? (
          <p className="rounded-lg bg-income-soft px-3 py-2.5 text-[13px] font-medium text-income">Meta atingida! Você juntou o valor que planejou.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <div className="rounded-lg bg-muted px-3 py-2.5">
              <span className="block text-muted-foreground">{p.status === "overdue" ? "Falta juntar" : "Guardar por mês"}</span>
              <b className="num text-[15px]">{formatBRL(p.status === "overdue" ? p.remaining : p.monthlySuggested)}</b>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2.5">
              <span className="block text-muted-foreground">Falta neste mês</span>
              <b className={cn("num text-[15px]", p.leftThisMonth === 0 && "text-income")}>{p.leftThisMonth === 0 ? "Em dia" : formatBRL(p.leftThisMonth)}</b>
            </div>
          </div>
        )}

        {p.status === "behind" && (
          <p className="text-xs text-muted-foreground">
            O plano inicial era {formatBRL(p.plannedMonthly)} por mês. Para manter o prazo, a parcela subiu para {formatBRL(p.monthlySuggested)}.
          </p>
        )}
        {p.status === "overdue" && <p className="text-xs text-muted-foreground">O prazo passou. Edite a meta para definir um novo prazo e recalcular a parcela.</p>}

        <div className="flex items-center gap-2">
          {!done && (
            <Button className="flex-1" onClick={() => onMove("DEPOSIT")}>
              <PiggyBank /> Guardar
            </Button>
          )}
          {goal.movements.length > 0 && (
            <Button variant="ghost" size="sm" className={cn("text-muted-foreground", done && "-ml-2")} onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
              <History /> Histórico
              <ChevronDown className={cn("transition-transform", showHistory && "rotate-180")} />
            </Button>
          )}
        </div>

        {showHistory && (
          <ul className="-mt-1 divide-y border-t text-[13px]">
            {goal.movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <span className="w-20 shrink-0 text-muted-foreground">{formatDateDisplay(m.date)}</span>
                <span className="flex-1">{m.type === "DEPOSIT" ? "Guardou" : "Retirou"}</span>
                <span className={cn("num font-medium", m.type === "DEPOSIT" ? "text-income" : "text-expense")}>
                  {m.type === "DEPOSIT" ? "+" : "−"}
                  {formatBRL(toNumber(m.amount))}
                </span>
                <Button variant="ghost" size="icon" className="size-7" aria-label="Excluir movimentação" onClick={() => onRemoveMovement(m.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
