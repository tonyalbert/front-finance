"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiCreditorDetails } from "@/lib/finance-types"
import { MONTHS, formatBRL, isInMonth } from "@/lib/finance-utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { CreditorDetailsDialog } from "@/components/dashboard/creditor-details-dialog"
import { CreditorSheet, type CreditorFormValues } from "@/components/finance/creditor-sheet"
import { EmptyState } from "@/components/finance/empty-state"
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
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function CreditoresPage() {
  const { token } = useAuth()
  const { month, year } = usePeriod()

  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiCreditor | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<ApiCreditor | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const [details, setDetails] = React.useState<ApiCreditorDetails | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)
  const [payingIds, setPayingIds] = React.useState<Set<string>>(() => new Set())

  const monthParam = String(month + 1)
  const yearParam = String(year)

  const fetchCreditors = React.useCallback(async () => {
    if (!token) return
    try {
      setCreditors(await apiFetch<ApiCreditor[]>(`/creditors/summary?month=${monthParam}&year=${yearParam}`, { token }))
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar credores.")
    }
  }, [token, monthParam, yearParam])

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchCreditors().finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchCreditors])

  const totals = React.useMemo(() => {
    const total = creditors.reduce((s, c) => s + c.totalAmount, 0)
    const paid = creditors.reduce((s, c) => s + c.paidAmount, 0)
    const pending = creditors.filter((c) => !c.isPaidOff && c.expenseCount > 0)
    return { total, paid, open: total - paid, pendingCount: pending.length }
  }, [creditors])

  const periodLabel = `${MONTHS[month].label.toLowerCase()} de ${year}`

  async function submit(values: CreditorFormValues, current: Pick<ApiCreditor, "id"> | null) {
    if (!token) throw new Error("Sessão expirada.")
    const body = { name: values.name, phone: values.phone || null, email: values.email || null }
    try {
      if (current) {
        await apiFetch(`/creditors/${current.id}`, { method: "PUT", token, body: JSON.stringify(body) })
        setCreditors((prev) => prev.map((c) => (c.id === current.id ? { ...c, ...body } : c)))
        toast.success("Credor atualizado.")
      } else {
        const created = await apiFetch<ApiCreditor>("/creditors", { method: "POST", token, body: JSON.stringify(body) })
        setCreditors((prev) => [{ ...created, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, isPaidOff: false, expenseCount: 0 }, ...prev])
        toast.success("Credor criado.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o credor.")
      throw err
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    setIsDeleting(true)
    try {
      await apiFetch(`/creditors/${pendingDelete.id}`, { method: "DELETE", token })
      setCreditors((prev) => prev.filter((c) => c.id !== pendingDelete.id))
      toast.success("Credor excluído.")
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir o credor.")
    } finally {
      setIsDeleting(false)
    }
  }

  async function openDetails(id: string) {
    if (!token) return
    setIsLoadingDetails(true)
    setDetailsOpen(true)
    try {
      const d = await apiFetch<ApiCreditorDetails>(`/creditors/${id}?month=${monthParam}&year=${yearParam}`, { token })
      setDetails({ ...d, expenses: d.expenses.filter((e) => isInMonth(e.date, year, month)) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar detalhes.")
      setDetailsOpen(false)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  async function setPaid(ids: string[], isPaid: boolean) {
    if (!token || ids.length === 0) return
    setPayingIds((prev) => new Set([...prev, ...ids]))
    try {
      await Promise.all(ids.map((id) => apiFetch(`/expenses/${id}`, { method: "PUT", token, body: JSON.stringify({ isPaid }) })))
      setDetails((prev) => (prev ? { ...prev, expenses: prev.expenses.map((e) => (ids.includes(e.id) ? { ...e, isPaid } : e)) } : prev))
      await fetchCreditors()
      toast.success(ids.length > 1 ? `${ids.length} contas marcadas como pagas.` : isPaid ? "Marcada como paga." : "Marcada como pendente.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar o status.")
    } finally {
      setPayingIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))))
    }
  }

  return (
    <PageShell
      title="Credores"
      subtitle={`Para quem você paga e quanto falta em ${periodLabel}`}
      headerActions={
        <Button
          onClick={() => {
            setEditing(null)
            setSheetOpen(true)
          }}
        >
          <Plus /> Novo credor
        </Button>
      }
    >
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label="Em aberto"
            icon={Wallet}
            tone="warning"
            value={formatBRL(totals.open)}
            footnote={`de ${formatBRL(totals.total)} no mês`}
          />
          <KpiCard label="Pago" icon={CheckCircle2} tone="income" value={formatBRL(totals.paid)} footnote="Quitado neste mês" />
          <KpiCard
            label="Com pendência"
            icon={Clock}
            tone="expense"
            value={String(totals.pendingCount)}
            footnote={`credor${totals.pendingCount !== 1 ? "es" : ""} a quitar`}
          />
        </div>
      )}

      {loadError && !isLoading ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar os credores</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void fetchCreditors()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <Card className="py-0">
          <TableSkeleton rows={4} cols={4} />
        </Card>
      ) : creditors.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            icon={Building2}
            title="Nenhum credor ainda"
            description="Cadastre quem você paga para ver quanto falta de cada um."
            action={
              <Button
                onClick={() => {
                  setEditing(null)
                  setSheetOpen(true)
                }}
              >
                <Plus /> Novo credor
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
          {creditors.map((c) => {
            const pct = c.totalAmount > 0 ? Math.round((c.paidAmount / c.totalAmount) * 100) : 0
            const hasExpenses = c.expenseCount > 0
            return (
              <Card key={c.id} className="relative gap-0 py-0 transition-colors hover:border-input">
                <button
                  type="button"
                  onClick={() => void openDetails(c.id)}
                  className="flex w-full flex-col gap-3 rounded-xl p-4 text-left"
                  aria-label={`Ver contas de ${c.name}`}
                >
                  <div className="flex items-start gap-3 pr-9">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        c.isPaidOff || !hasExpenses ? "bg-income-soft text-income" : "bg-expense-soft text-expense",
                      )}
                      aria-hidden
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <h3 className="truncate text-sm font-semibold">{c.name}</h3>
                      <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {c.phone && (
                          <span className="inline-flex items-center gap-1.5 truncate">
                            <Phone className="size-3 shrink-0" aria-hidden />
                            {c.phone}
                          </span>
                        )}
                        {c.email && (
                          <span className="inline-flex items-center gap-1.5 truncate">
                            <Mail className="size-3 shrink-0" aria-hidden />
                            {c.email}
                          </span>
                        )}
                        {!c.phone && !c.email && <span>{c.expenseCount} despesa{c.expenseCount !== 1 ? "s" : ""} no mês</span>}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {hasExpenses ? `${c.expenseCount} conta${c.expenseCount !== 1 ? "s" : ""}` : "Sem contas no mês"}
                      </span>
                      <span className="num text-muted-foreground">{pct}% pago</span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${pct}% pago`}
                    >
                      <div className="h-full rounded-full bg-income transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="leading-tight">
                      <p className="text-xs text-muted-foreground">Restante</p>
                      <p className={cn("num text-base font-semibold", c.isPaidOff || !hasExpenses ? "text-income" : "text-expense")}>
                        {formatBRL(c.unpaidAmount)}
                      </p>
                      <p className="num text-xs text-muted-foreground">de {formatBRL(c.totalAmount)}</p>
                    </div>
                    {hasExpenses &&
                      (c.isPaidOff ? (
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-income-soft px-2 text-xs font-medium text-income">
                          <CheckCircle2 className="size-3.5" aria-hidden />
                          Quitado
                        </span>
                      ) : (
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-soft px-2 text-xs font-medium text-warning">
                          <Clock className="size-3.5" aria-hidden />
                          Pendente
                        </span>
                      ))}
                  </div>
                </button>

                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 max-md:size-11" aria-label={`Ações de ${c.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(c)
                          setSheetOpen(true)
                        }}
                      >
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(c)}>
                        <Trash2 /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CreditorSheet open={sheetOpen} onOpenChange={setSheetOpen} creditor={editing} onSubmit={submit} />

      <CreditorDetailsDialog
        open={detailsOpen}
        onOpenChange={(o) => {
          setDetailsOpen(o)
          if (!o) setDetails(null)
        }}
        details={details}
        isLoading={isLoadingDetails}
        periodLabel={periodLabel}
        payingIds={payingIds}
        onSetPaid={setPaid}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              As despesas ligadas a este credor ficam sem credor. Esta ação não pode ser desfeita.
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
