"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Check, CheckCircle2, Clock, Inbox, Plus, RefreshCw, Search, Tag, TrendingDown, Trash2, Undo2, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiExpense, ApiTag, ApiCreditor } from "@/lib/finance-types"
import { EMPTY_FILTERS, applyExpenseFilters, hasActiveFilters, type ExpenseFilters } from "@/lib/expense-filters"
import { MONTHS, formatBRL, getExpenseStatus, isInMonth, toNumber, toUtcIso } from "@/lib/finance-utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { CreditorsSection } from "@/components/dashboard/creditors-section"
import { TagsSheet } from "@/components/dashboard/tags-sheet"
import { ExpensesTable, sortExpenses, type SortKey, type SortState } from "@/components/despesas/expenses-table"
import { EmptyState } from "@/components/finance/empty-state"
import { ExpenseSheet, type ExpenseFormValues } from "@/components/finance/expense-sheet"
import { KpiCard, type KpiDelta } from "@/components/finance/kpi-card"
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
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

/** Preferência liga/desliga lembrada entre visitas (sem quebrar se o storage estiver bloqueado). */
function useStoredFlag(key: string): [boolean, (next: boolean) => void] {
  const [value, setValue] = React.useState(false)
  React.useEffect(() => {
    try {
      setValue(localStorage.getItem(key) === "1")
    } catch {}
  }, [key])
  const set = React.useCallback(
    (next: boolean) => {
      setValue(next)
      try {
        localStorage.setItem(key, next ? "1" : "0")
      } catch {}
    },
    [key],
  )
  return [value, set]
}

type PendingDelete =
  | { kind: "rows"; ids: string[]; fixedCount: number }
  | { kind: "group"; groupId: string; count: number }

const NONE = "none"
const STATUS_LABEL: Record<ExpenseFilters["status"], string> = {
  all: "Todos",
  paid: "Pagas",
  pending: "Pendentes",
  late: "Atrasadas",
}
const TYPE_LABEL: Record<ExpenseFilters["type"], string> = {
  all: "Todos",
  fixed: "Fixas",
  installment: "Parceladas",
  single: "Avulsas",
}

export default function DespesasPage() {
  return (
    <React.Suspense fallback={null}>
      <DespesasContent />
    </React.Suspense>
  )
}

function DespesasContent() {
  const { token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { month, year } = usePeriod()
  const now = React.useMemo(() => new Date(), [])

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [creditorsRefreshKey, setCreditorsRefreshKey] = React.useState(0)

  const [filters, setFilters] = React.useState<ExpenseFilters>(EMPTY_FILTERS)
  /** Vindo do alerta "Ver atrasadas": ignora o período e lista as atrasadas de todos os meses. */
  const [allMonths, setAllMonths] = React.useState(false)
  const [sort, setSort] = React.useState<SortState>({ key: "date", dir: "desc" })
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [groupByCreditor, setGroupByCreditor] = useStoredFlag("pit-finance:expenses-group-by-creditor")

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiExpense | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null)
  const [isBusy, setIsBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [t, e, c] = await Promise.all([
        apiFetch<ApiTag[]>("/tags", { token }),
        apiFetch<ApiExpense[]>("/expenses", { token }),
        apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      ])
      setTags(t)
      setExpenses(e)
      setAllCreditors(c)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  // ?nova=1 (botão + / "Nova despesa") abre o formulário; ?status=atrasado vem do alerta do dashboard.
  React.useEffect(() => {
    const nova = searchParams.get("nova")
    const status = searchParams.get("status")
    if (nova !== "1" && status !== "atrasado") return
    if (nova === "1") {
      setEditing(null)
      setSheetOpen(true)
    }
    if (status === "atrasado") {
      setFilters({ ...EMPTY_FILTERS, status: "late" })
      setAllMonths(true)
      setSelected(new Set())
    }
    router.replace("/despesas", { scroll: false })
  }, [searchParams, router])

  const expenseTags = React.useMemo(() => tags.filter((t) => t.type === "EXPENSE"), [tags])
  const tagIndexById = React.useMemo(() => new Map(tags.map((t, i) => [t.id, i])), [tags])
  const tagName = React.useCallback((id: string | null) => (id && tags.find((t) => t.id === id)?.name) || "Sem tag", [tags])
  const creditorName = React.useCallback(
    (id: string | null) => (id && allCreditors.find((c) => c.id === id)?.name) || "",
    [allCreditors],
  )

  // Despesas do período (mês e ano da topbar)
  const periodRows = React.useMemo(() => expenses.filter((e) => isInMonth(e.date, year, month)), [expenses, year, month])
  const baseRows = allMonths ? expenses : periodRows

  const filteredRows = React.useMemo(
    () => sortExpenses(applyExpenseFilters(baseRows, filters, { tagName: (id) => (id ? tagName(id) : ""), creditorName }), sort, now, {
        tag: tagName,
        creditor: creditorName,
      }),
    [baseRows, filters, sort, now, tagName, creditorName],
  )

  // Seleção só vale para o que está visível: trocar período ou filtro tira o resto da seleção.
  const selectedIds = React.useMemo(() => {
    const visible = new Set(filteredRows.map((r) => r.id))
    return [...selected].filter((id) => visible.has(id))
  }, [selected, filteredRows])

  const stats = React.useMemo(() => {
    const total = periodRows.reduce((s, r) => s + toNumber(r.amount), 0)
    const paid = periodRows.filter((r) => r.isPaid).reduce((s, r) => s + toNumber(r.amount), 0)
    const pending = periodRows.filter((r) => !r.isPaid)
    const late = periodRows.filter((r) => getExpenseStatus(r, now) === "late")
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevTotal = expenses.filter((e) => isInMonth(e.date, prevYear, prevMonth)).reduce((s, e) => s + toNumber(e.amount), 0)
    return {
      total,
      paid,
      pendingTotal: total - paid,
      pendingCount: pending.length,
      lateCount: late.length,
      prevTotal,
      prevLabel: MONTHS[prevMonth].label.toLowerCase(),
    }
  }, [periodRows, expenses, month, year, now])

  const delta: KpiDelta | undefined = React.useMemo(() => {
    if (!stats.prevTotal) return undefined
    const pct = Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 1000) / 10
    return {
      text: `${pct > 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
      sentiment: pct === 0 ? "neutral" : pct > 0 ? "bad" : "good",
    }
  }, [stats])

  const monthName = MONTHS[month].label
  const filtersActive = hasActiveFilters(filters) || allMonths

  function patchFilters(patch: Partial<ExpenseFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
  }
  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    setAllMonths(false)
  }
  function changeSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "item" || key === "tag" || key === "creditor" ? "asc" : "desc" }))
  }

  const chips: { key: string; label: string; value: string; remove: () => void }[] = []
  if (allMonths) chips.push({ key: "all", label: "Período", value: "todos os meses", remove: () => setAllMonths(false) })
  if (filters.search.trim()) chips.push({ key: "search", label: "Busca", value: filters.search.trim(), remove: () => patchFilters({ search: "" }) })
  if (filters.status !== "all") chips.push({ key: "status", label: "Status", value: STATUS_LABEL[filters.status], remove: () => patchFilters({ status: "all" }) })
  if (filters.type !== "all") chips.push({ key: "type", label: "Tipo", value: TYPE_LABEL[filters.type], remove: () => patchFilters({ type: "all" }) })
  if (filters.tagId !== "all") chips.push({ key: "tag", label: "Tag", value: filters.tagId === NONE ? "Sem tag" : tagName(filters.tagId), remove: () => patchFilters({ tagId: "all" }) })
  if (filters.creditorId !== "all")
    chips.push({ key: "cred", label: "Credor", value: filters.creditorId === NONE ? "Sem credor" : creditorName(filters.creditorId), remove: () => patchFilters({ creditorId: "all" }) })

  function newExpenseDate() {
    const today = new Date()
    const isCurrent = today.getFullYear() === year && today.getMonth() === month
    return toUtcIso(year, month, isCurrent ? today.getDate() : 1)
  }

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(row: ApiExpense) {
    setEditing(row)
    setSheetOpen(true)
  }

  const refreshCreditors = () => setCreditorsRefreshKey((k) => k + 1)

  async function togglePaid(row: ApiExpense) {
    if (!token) return
    const isPaid = !row.isPaid
    try {
      await apiFetch(`/expenses/${row.id}`, { method: "PUT", token, body: JSON.stringify({ isPaid }) })
      setExpenses((prev) => prev.map((e) => (e.id === row.id ? { ...e, isPaid } : e)))
      refreshCreditors()
      toast.success(isPaid ? "Marcada como paga." : "Marcada como pendente.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.")
    }
  }

  /** Troca tag ou credor direto na tabela; em parcelada pode valer para o grupo todo. */
  async function changeField(row: ApiExpense, field: "tagId" | "creditorId", value: string | null, applyToGroup: boolean) {
    if (!token) return
    const patch = { [field]: value } as Partial<ApiExpense>
    const toGroup = applyToGroup && !!row.installmentGroupId
    try {
      await apiFetch(`/expenses/${row.id}`, { method: "PUT", token, body: JSON.stringify(patch) })
      if (toGroup) await apiFetch(`/expenses/group/${row.installmentGroupId}`, { method: "PUT", token, body: JSON.stringify(patch) })
      setExpenses((prev) =>
        prev.map((e) => (e.id === row.id || (toGroup && e.installmentGroupId === row.installmentGroupId) ? { ...e, ...patch } : e)),
      )
      if (field === "creditorId") refreshCreditors()
      toast.success(toGroup ? "Atualizado em todas as parcelas." : field === "tagId" ? "Tag atualizada." : "Credor atualizado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  /** Item, valor e vencimento editados direto na tabela. */
  async function changeBasic(row: ApiExpense, patch: { item?: string; amount?: number; date?: string }) {
    if (!token) return
    try {
      await apiFetch(`/expenses/${row.id}`, { method: "PUT", token, body: JSON.stringify(patch) })
      setExpenses((prev) => prev.map((e) => (e.id === row.id ? { ...e, ...patch } : e)))
      if (patch.amount !== undefined || patch.date !== undefined) refreshCreditors()
      toast.success("Despesa atualizada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  /** Muda o status de várias despesas de uma vez; só envia as que realmente mudam. */
  async function setPaidMany(ids: string[], isPaid: boolean): Promise<boolean> {
    if (!token) return false
    const changing = ids.filter((id) => expenses.find((e) => e.id === id)?.isPaid !== isPaid)
    if (changing.length === 0) return true
    setIsBusy(true)
    try {
      const results = await Promise.allSettled(
        changing.map((id) => apiFetch(`/expenses/${id}`, { method: "PUT", token, body: JSON.stringify({ isPaid }) }).then(() => id)),
      )
      const done = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
      setExpenses((prev) => prev.map((e) => (done.includes(e.id) ? { ...e, isPaid } : e)))
      if (done.length > 0) refreshCreditors()
      const n = done.length
      const s = n !== 1 ? "s" : ""
      if (n === changing.length) {
        toast.success(`${n} despesa${s} marcada${s} como ${isPaid ? `paga${s}` : `pendente${n !== 1 ? "s" : ""}`}.`)
        return true
      }
      toast.error(`${changing.length - n} de ${changing.length} despesas não foram atualizadas. Tente novamente.`)
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function markSelected(isPaid: boolean) {
    if (selectedIds.length === 0) return
    if (await setPaidMany(selectedIds, isPaid)) setSelected(new Set())
  }

  async function duplicate(row: ApiExpense) {
    if (!token) return
    try {
      const created = await apiFetch<ApiExpense>("/expenses", {
        method: "POST",
        token,
        body: JSON.stringify({
          item: row.item,
          amount: toNumber(row.amount),
          date: row.date,
          ...(row.tagId ? { tagId: row.tagId } : {}),
          ...(row.creditorId ? { creditorId: row.creditorId } : {}),
          isPaid: false,
        }),
      })
      setExpenses((prev) => [created, ...prev])
      refreshCreditors()
      toast.success("Despesa duplicada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar.")
    }
  }

  // Excluir ocorrência de despesa fixa pula aquele mês (lápide no back): o diálogo avisa.
  function requestDelete(ids: string[]) {
    if (ids.length === 0) return
    const fixedCount = expenses.filter((e) => ids.includes(e.id) && e.fixedExpenseCompetence).length
    setPendingDelete({ kind: "rows", ids, fixedCount })
  }
  function requestDeleteGroup(row: ApiExpense) {
    if (!row.installmentGroupId) return
    const count = expenses.filter((e) => e.installmentGroupId === row.installmentGroupId).length
    setPendingDelete({ kind: "group", groupId: row.installmentGroupId, count })
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    setIsBusy(true)
    try {
      if (target.kind === "rows") {
        await Promise.all(target.ids.map((id) => apiFetch(`/expenses/${id}`, { method: "DELETE", token })))
        setExpenses((prev) => prev.filter((e) => !target.ids.includes(e.id)))
        setSelected((prev) => new Set([...prev].filter((id) => !target.ids.includes(id))))
        toast.success(`${target.ids.length} despesa${target.ids.length !== 1 ? "s" : ""} excluída${target.ids.length !== 1 ? "s" : ""}.`)
      } else {
        await apiFetch(`/expenses/group/${target.groupId}`, { method: "DELETE", token })
        setExpenses((prev) => prev.filter((e) => e.installmentGroupId !== target.groupId))
        toast.success("Parcelas excluídas.")
      }
      refreshCreditors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsBusy(false)
    }
  }

  async function submitExpense(values: ExpenseFormValues, current: ApiExpense | null) {
    if (!token) throw new Error("Sessão expirada.")
    const tagId = values.tagId === NONE ? null : values.tagId
    const creditorId = values.creditorId === NONE ? null : values.creditorId
    try {
      if (!current) {
        if (values.installments) {
          const result = await apiFetch<{ groupId: string; count: number }>("/expenses/installments", {
            method: "POST",
            token,
            body: JSON.stringify({
              item: values.item,
              amount: values.amount,
              startDate: values.date,
              totalInstallments: values.installmentCount,
              ...(tagId ? { tagId } : {}),
              ...(creditorId ? { creditorId } : {}),
              isPaid: values.isPaid,
            }),
          })
          setExpenses(await apiFetch<ApiExpense[]>("/expenses", { token }))
          toast.success(`${result.count} parcelas criadas.`)
        } else {
          const created = await apiFetch<ApiExpense>("/expenses", {
            method: "POST",
            token,
            body: JSON.stringify({
              item: values.item,
              amount: values.amount,
              date: values.date,
              ...(tagId ? { tagId } : {}),
              ...(creditorId ? { creditorId } : {}),
              isPaid: values.isPaid,
            }),
          })
          setExpenses((prev) => [created, ...prev])
          toast.success("Despesa criada.")
        }
      } else {
        const payload = { item: values.item, amount: values.amount, date: values.date, tagId, creditorId, isPaid: values.isPaid }
        await apiFetch(`/expenses/${current.id}`, { method: "PUT", token, body: JSON.stringify(payload) })
        let groupPatch: Partial<ApiExpense> | null = null
        if (current.installmentGroupId && values.applyToGroup === "all") {
          groupPatch = { tagId, creditorId }
          await apiFetch(`/expenses/group/${current.installmentGroupId}`, { method: "PUT", token, body: JSON.stringify(groupPatch) })
        }
        setExpenses((prev) =>
          prev.map((e) => {
            if (e.id === current.id) return { ...e, ...payload }
            if (groupPatch && e.installmentGroupId === current.installmentGroupId) return { ...e, ...groupPatch }
            return e
          }),
        )
        toast.success("Despesa atualizada.")
      }
      refreshCreditors()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a despesa.")
      throw err
    }
  }

  const selectedCount = selectedIds.length
  const hasNoExpensesInPeriod = !isLoading && !loadError && periodRows.length === 0 && !allMonths

  return (
    <PageShell
      title="Despesas"
      subtitle={`${periodRows.length} em ${monthName.toLowerCase()} de ${year}`}
      headerActions={
        <>
          <Button variant="outline" onClick={() => setTagsOpen(true)}>
            <Tag /> Tags
          </Button>
          <Button onClick={openCreate}>
            <Plus /> Nova despesa
          </Button>
        </>
      }
    >
      {/* Quanto devo e para quem, no mês do período */}
      <Card className="gap-0 py-0">
        <CardContent className="p-5 max-md:p-4">
          <CreditorsSection
            refreshKey={creditorsRefreshKey}
            expenses={expenses}
            month={String(month + 1)}
            year={String(year)}
            onPaidChange={(ids, isPaid) => setExpenses((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, isPaid } : e)))}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label="Total do período"
            icon={TrendingDown}
            tone="expense"
            value={formatBRL(stats.total)}
            delta={delta}
            footnote={delta ? `vs. ${stats.prevLabel}` : undefined}
          />
          <KpiCard
            label="Pago"
            icon={CheckCircle2}
            tone="income"
            value={formatBRL(stats.paid)}
            footnote="Quitado neste mês"
          />
          <KpiCard
            label="Pendente"
            icon={Clock}
            tone="warning"
            value={formatBRL(stats.pendingTotal)}
            footnote={
              <>
                {stats.pendingCount} conta{stats.pendingCount !== 1 ? "s" : ""}
                {stats.lateCount > 0 && (
                  <span className="font-medium text-expense">
                    {" "}
                    · {stats.lateCount} atrasada{stats.lateCount !== 1 ? "s" : ""}
                  </span>
                )}
              </>
            }
          />
        </div>
      )}

      <Card className="gap-0 overflow-clip py-0" aria-label="Lista de despesas">
        {/* Busca e filtros */}
        <div className="grid grid-cols-2 gap-2 p-4 md:flex md:flex-wrap md:items-center md:px-5">
          <div className="relative col-span-2 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="h-10 pl-9"
              placeholder="Buscar item, tag ou credor"
              aria-label="Buscar despesas"
              value={filters.search}
              onChange={(e) => patchFilters({ search: e.target.value })}
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => patchFilters({ status: v as ExpenseFilters["status"] })}>
            <SelectTrigger className="h-10 w-full md:w-[160px]" aria-label="Filtrar por status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="late">Atrasadas</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(v) => patchFilters({ type: v as ExpenseFilters["type"] })}>
            <SelectTrigger className="h-10 w-full md:w-[150px]" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="fixed">Fixas</SelectItem>
              <SelectItem value="installment">Parceladas</SelectItem>
              <SelectItem value="single">Avulsas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.tagId} onValueChange={(v) => patchFilters({ tagId: v })}>
            <SelectTrigger className="h-10 w-full md:w-[170px]" aria-label="Filtrar por tag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              <SelectItem value={NONE}>Sem tag</SelectItem>
              {expenseTags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.creditorId} onValueChange={(v) => patchFilters({ creditorId: v })}>
            <SelectTrigger className="h-10 w-full md:w-[170px]" aria-label="Filtrar por credor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os credores</SelectItem>
              <SelectItem value={NONE}>Sem credor</SelectItem>
              {allCreditors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="col-span-2 flex h-10 cursor-pointer items-center gap-2 text-[13px] font-medium md:col-span-1">
            <Switch checked={groupByCreditor} onCheckedChange={setGroupByCreditor} aria-label="Agrupar por credor" />
            Agrupar por credor
          </label>
          <span className="num ml-auto hidden text-[13px] text-muted-foreground md:inline">
            {filteredRows.length} de {baseRows.length}
          </span>
          <Button variant="outline" size="icon" className="hidden size-10 md:inline-flex" onClick={openCreate} aria-label="Nova despesa" title="Nova despesa">
            <Plus />
          </Button>
        </div>

        {/* Chips de filtros ativos */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-5" aria-label="Filtros ativos">
            {chips.map((c) => (
              <span key={c.key} className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-muted pl-2.5 pr-1 text-xs">
                <span className="text-muted-foreground">{c.label}:</span>
                <span className="font-medium">{c.value}</span>
                <button
                  type="button"
                  onClick={c.remove}
                  aria-label={`Remover filtro ${c.label}`}
                  className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
              Limpar filtros
            </button>
          </div>
        )}

        {/* Ações em massa */}
        {selectedCount > 0 && (
          <div role="region" aria-label="Ações em massa" className="flex flex-wrap items-center gap-2 border-y bg-primary-soft px-4 py-2.5 md:px-5">
            <strong className="num text-sm">
              {selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}
            </strong>
            <span className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => void markSelected(true)} disabled={isBusy}>
              <Check /> Marcar como pago
            </Button>
            <Button size="sm" variant="outline" onClick={() => void markSelected(false)} disabled={isBusy}>
              <Undo2 /> Marcar como pendente
            </Button>
            <Button size="sm" variant="outline" onClick={() => requestDelete(selectedIds)} disabled={isBusy}>
              <Trash2 /> Excluir
            </Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setSelected(new Set())} aria-label="Limpar seleção">
              <X />
            </Button>
          </div>
        )}

        {/* Conteúdo */}
        {isLoading ? (
          <TableSkeleton rows={7} cols={5} />
        ) : loadError ? (
          <div className="px-4 pb-6 md:px-5">
            <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
              <div className="min-w-0 flex-1 text-[13px]">
                <strong className="block text-sm font-semibold">Não foi possível carregar as despesas</strong>
                <span className="text-muted-foreground">{loadError} Seus lançamentos continuam salvos.</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw /> Tentar novamente
              </Button>
            </div>
          </div>
        ) : hasNoExpensesInPeriod ? (
          <EmptyState
            className="border-t"
            icon={Inbox}
            title={`Nenhuma despesa em ${monthName.toLowerCase()}`}
            description="Registre a primeira despesa do mês. As despesas fixas ativas são geradas automaticamente."
            action={
              <Button onClick={openCreate}>
                <Plus /> Nova despesa
              </Button>
            }
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            className="border-t"
            icon={Search}
            title="Nenhuma despesa encontrada"
            description="Nenhum lançamento corresponde à busca e aos filtros atuais."
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="border-t">
            <ExpensesTable
              rows={filteredRows}
              now={now}
              tagName={tagName}
              tagIndex={(id) => (id ? (tagIndexById.get(id) ?? 0) : 0)}
              creditorName={creditorName}
              tagOptions={expenseTags}
              creditorOptions={allCreditors}
              onChangeBasic={(row, patch) => void changeBasic(row, patch)}
              onChangeTag={(row, id, all) => void changeField(row, "tagId", id, all)}
              onChangeCreditor={(row, id, all) => void changeField(row, "creditorId", id, all)}
              selected={new Set(selectedIds)}
              onSelectedChange={setSelected}
              sort={sort}
              onSortChange={changeSort}
              onTogglePaid={togglePaid}
              onEdit={openEdit}
              onDuplicate={duplicate}
              onDelete={(row) => requestDelete([row.id])}
              onDeleteGroup={requestDeleteGroup}
              onAdd={openCreate}
              groupByCreditor={groupByCreditor}
              onSetPaid={(rows, isPaid) => void setPaidMany(rows.map((r) => r.id), isPaid)}
              busy={isBusy}
            />
          </div>
        )}
      </Card>

      <TagsSheet open={tagsOpen} onOpenChange={setTagsOpen} defaultType="EXPENSE" onTagsChange={setTags} />

      <ExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        expense={editing}
        defaultDate={newExpenseDate()}
        tags={expenseTags}
        creditors={allCreditors}
        onSubmit={submitExpense}
      />

      {/* Confirmação: só para excluir */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "group"
                ? "Excluir todas as parcelas?"
                : pendingDelete && pendingDelete.fixedCount > 0
                  ? "Excluir despesa fixa deste mês?"
                  : pendingDelete && pendingDelete.ids.length > 1
                    ? `Excluir ${pendingDelete.ids.length} despesas?`
                    : "Excluir despesa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "group" ? (
                `Remove as ${pendingDelete.count} parcelas deste grupo permanentemente. Não é possível desfazer.`
              ) : pendingDelete && pendingDelete.fixedCount > 0 ? (
                <>
                  {pendingDelete.fixedCount > 1
                    ? `${pendingDelete.fixedCount} despesas selecionadas são geradas por despesas fixas: esses meses serão pulados e não serão recriados.`
                    : "Esta despesa é gerada por uma despesa fixa: este mês será pulado e ela não será recriada."}{" "}
                  A despesa fixa continua valendo nos demais meses.
                </>
              ) : (
                "Esta ação não pode ser desfeita."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              {pendingDelete?.kind === "group"
                ? "Excluir todas"
                : pendingDelete && pendingDelete.fixedCount > 0
                  ? "Excluir e pular o mês"
                  : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
