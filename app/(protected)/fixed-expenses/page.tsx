"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  CircleSlash,
  MoreHorizontal,
  Pencil,
  PauseCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiFixedExpense, ApiTag } from "@/lib/finance-types"
import { MONTHS, formatBRL, toNumber } from "@/lib/finance-utils"
import { competenceKey, formatVigency, getStatus, isEligibleInMonth, type FixedExpenseStatus } from "@/lib/fixed-expense-utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { FixedExpenseSheet, type FixedExpenseFormValues } from "@/components/finance/fixed-expense-sheet"
import { KpiCard } from "@/components/finance/kpi-card"
import { KpiRowSkeleton, TableSkeleton } from "@/components/finance/skeletons"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"

const NONE = "none"

const STATUS: Record<FixedExpenseStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active: { label: "Ativa", icon: CheckCircle2, cls: "bg-income-soft text-income" },
  paused: { label: "Pausada", icon: PauseCircle, cls: "bg-warning-soft text-warning" },
  ended: { label: "Encerrada", icon: CircleSlash, cls: "bg-muted text-muted-foreground" },
}

export default function FixedExpensesPage() {
  const { token } = useAuth()
  const { month, year } = usePeriod()

  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [showInactive, setShowInactive] = React.useState(false)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiFixedExpense | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<ApiFixedExpense | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [fe, t, c] = await Promise.all([
        apiFetch<ApiFixedExpense[]>("/fixed-expenses", { token }),
        apiFetch<ApiTag[]>("/tags", { token }),
        apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      ])
      setFixedExpenses(fe)
      setTags(t.filter((tag) => tag.type === "EXPENSE"))
      setCreditors(c)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  // Competência do período escolhido na topbar
  const competence = competenceKey(year, month + 1)
  const active = React.useMemo(() => fixedExpenses.filter((fe) => getStatus(fe, competence) === "active"), [fixedExpenses, competence])
  const inactive = React.useMemo(() => fixedExpenses.filter((fe) => getStatus(fe, competence) !== "active"), [fixedExpenses, competence])

  // Total mensal: só regras ativas e vigentes no mês do período
  const totalMonthly = React.useMemo(
    () => fixedExpenses.filter((fe) => isEligibleInMonth(fe, competence)).reduce((s, fe) => s + toNumber(fe.amount), 0),
    [fixedExpenses, competence],
  )
  const inactiveTotal = inactive.reduce((s, fe) => s + toNumber(fe.amount), 0)
  const monthLabel = `${MONTHS[month].label.toLowerCase()} de ${year}`

  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year
  const nextCount = fixedExpenses.filter((fe) => isEligibleInMonth(fe, competenceKey(nextYear, nextMonth + 1))).length

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(fe: ApiFixedExpense) {
    setEditing(fe)
    setSheetOpen(true)
  }

  async function submit(values: FixedExpenseFormValues, current: ApiFixedExpense | null) {
    if (!token) throw new Error("Sessão expirada.")
    const body = {
      name: values.name,
      amount: values.amount,
      dayOfMonth: values.dayOfMonth,
      // YYYY-MM-DD sem conversão de fuso; null = sem data fim
      startDate: values.startDate.slice(0, 10),
      endDate: values.noEndDate ? null : values.endDate.slice(0, 10),
      tagId: values.tagId === NONE ? null : values.tagId,
      creditorId: values.creditorId === NONE ? null : values.creditorId,
    }
    try {
      if (current) {
        const updated = await apiFetch<ApiFixedExpense>(`/fixed-expenses/${current.id}`, { method: "PUT", token, body: JSON.stringify(body) })
        setFixedExpenses((prev) => prev.map((fe) => (fe.id === current.id ? updated : fe)))
        toast.success("Despesa fixa atualizada.")
      } else {
        const created = await apiFetch<ApiFixedExpense>("/fixed-expenses", { method: "POST", token, body: JSON.stringify(body) })
        setFixedExpenses((prev) => [created, ...prev])
        toast.success("Despesa fixa criada.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
      throw err
    }
  }

  async function toggleActive(fe: ApiFixedExpense) {
    if (!token) return
    setTogglingId(fe.id)
    try {
      const updated = await apiFetch<ApiFixedExpense>(`/fixed-expenses/${fe.id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ isActive: !fe.isActive }),
      })
      setFixedExpenses((prev) => prev.map((f) => (f.id === fe.id ? updated : f)))
      toast.success(updated.isActive ? "Despesa reativada." : "Despesa pausada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar o status.")
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    setIsDeleting(true)
    try {
      await apiFetch(`/fixed-expenses/${pendingDelete.id}`, { method: "DELETE", token })
      setFixedExpenses((prev) => prev.filter((fe) => fe.id !== pendingDelete.id))
      toast.success("Despesa fixa excluída.")
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  const renderRow = (fe: ApiFixedExpense) => (
    <FixedExpenseRow
      key={fe.id}
      fe={fe}
      status={getStatus(fe, competence)}
      isToggling={togglingId === fe.id}
      onEdit={() => openEdit(fe)}
      onToggle={() => void toggleActive(fe)}
      onDelete={() => setPendingDelete(fe)}
    />
  )

  return (
    <PageShell
      title="Despesas fixas"
      subtitle="Geradas automaticamente todo mês, no dia do vencimento"
      headerActions={
        <Button onClick={openCreate}>
          <Plus /> Nova despesa fixa
        </Button>
      }
    >
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label="Comprometido por mês"
            icon={RefreshCw}
            tone="primary"
            value={formatBRL(totalMonthly)}
            footnote={`${active.length} ativa${active.length !== 1 ? "s" : ""} em ${monthLabel}`}
          />
          <KpiCard
            label="Próxima geração"
            icon={CalendarClock}
            tone="primary"
            value={`01/${String(nextMonth + 1).padStart(2, "0")}/${nextYear}`}
            footnote={`${nextCount} despesa${nextCount !== 1 ? "s" : ""} em ${MONTHS[nextMonth].label.toLowerCase()}`}
          />
          <KpiCard
            label="Pausadas ou encerradas"
            icon={CirclePause}
            tone="warning"
            value={String(inactive.length)}
            footnote={inactive.length > 0 ? `${formatBRL(inactiveTotal)} por mês fora do orçamento` : "Nenhuma"}
          />
        </div>
      )}

      {loadError && !isLoading ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar as despesas fixas</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-0 pt-[18px] max-md:px-4">
              <CardTitle className="text-[15px] font-semibold tracking-tight">Ativas</CardTitle>
              <p className="text-[13px] text-muted-foreground">Vigentes em {monthLabel}</p>
            </CardHeader>
            <CardContent className="px-5 pb-2 pt-2 max-md:px-4">
              {isLoading ? (
                <TableSkeleton rows={4} cols={3} />
              ) : active.length === 0 ? (
                <EmptyState
                  icon={RefreshCw}
                  title="Nenhuma despesa fixa ativa"
                  description="Cadastre aluguel, internet, plano de saúde e outras contas que se repetem todo mês."
                  action={
                    <Button onClick={openCreate}>
                      <Plus /> Nova despesa fixa
                    </Button>
                  }
                  className="py-8"
                />
              ) : (
                <ul className="divide-y">{active.map(renderRow)}</ul>
              )}
            </CardContent>
          </Card>

          {inactive.length > 0 && (
            <Card className="gap-0 py-0">
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                aria-expanded={showInactive}
                className="flex w-full items-center justify-between px-5 py-4 text-left max-md:px-4"
              >
                <span>
                  <span className="text-[15px] font-semibold tracking-tight">Pausadas e encerradas</span>
                  <span className="num ml-2 text-[13px] text-muted-foreground">{inactive.length}</span>
                </span>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showInactive && "rotate-180")} aria-hidden />
              </button>
              {showInactive && (
                <CardContent className="border-t px-5 pb-2 pt-2 max-md:px-4">
                  <ul className="divide-y">{inactive.map(renderRow)}</ul>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}

      <FixedExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        fixedExpense={editing}
        tags={tags}
        creditors={creditors}
        onSubmit={submit}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. As despesas já geradas em Despesas não serão afetadas.
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

function FixedExpenseRow({
  fe,
  status,
  isToggling,
  onEdit,
  onToggle,
  onDelete,
}: {
  fe: ApiFixedExpense
  status: FixedExpenseStatus
  isToggling: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const s = STATUS[status]
  const Icon = s.icon
  const muted = status !== "active"

  return (
    <li className="flex min-h-[68px] items-center gap-3 py-3">
      <span className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-subtle leading-[1.1]">
        <small className="text-[10px] uppercase tracking-wide text-muted-foreground">dia</small>
        <b className="num text-[15px]">{String(fe.dayOfMonth).padStart(2, "0")}</b>
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className={cn("truncate text-sm font-medium", muted && "text-muted-foreground")}>{fe.name}</strong>
          <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium", s.cls)}>
            <Icon className="size-3" aria-hidden />
            {s.label}
          </span>
        </div>
        <span className="block truncate text-xs text-muted-foreground">
          {[fe.tag?.name, fe.creditor?.name].filter(Boolean).join(" · ") || "Sem tag ou credor"}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground/80">{formatVigency(fe)}</span>
      </div>

      <div className="flex flex-col items-end leading-tight">
        <span className={cn("num text-sm font-semibold", muted && "text-muted-foreground")}>{formatBRL(toNumber(fe.amount))}</span>
        <span className="text-xs text-muted-foreground">mensal</span>
      </div>

      <Switch
        checked={fe.isActive}
        disabled={isToggling}
        onCheckedChange={onToggle}
        aria-label={fe.isActive ? `Pausar ${fe.name}` : `Reativar ${fe.name}`}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 max-md:size-11" aria-label={`Ações de ${fe.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
