"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  Layers,
  Plus,
  Tag,
  TrendingDown,
  Trash2,
  UserCircle,
} from "lucide-react"
import { CreditorsSection } from "@/components/dashboard/creditors-section"
import { FixedExpensesSummary } from "@/components/dashboard/fixed-expenses-summary"
import { useAuth } from "@/hooks/use-auth"
import { useSelectedYear } from "@/hooks/use-selected-year"
import { apiFetch } from "@/lib/api"
import type { ApiExpense, ApiTag, ApiCreditor } from "@/lib/finance-types"
import {
  MONTHS,
  formatBRL,
  formatDateDisplay,
  formatDateInput,
  toNumber,
} from "@/lib/finance-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { DatePickerCell } from "@/components/dashboard/date-picker-cell"
import { SortableHeader } from "@/components/dashboard/sortable-header"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DespesasPage() {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()

  const [selectedYear, setSelectedYear] = useSelectedYear()
  const selectedYearNumber = Number(selectedYear)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(currentMonthIndex + 1))

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)

  const [editingCell, setEditingCell] = React.useState<{ id: string; field: "item" | "amount" | "date" | "tagId" | "creditorId" } | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, Partial<ApiExpense>>>({})
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null)
  const [sortColumn, setSortColumn] = React.useState<"item" | "amount" | "date" | "tagId" | "creditorId" | "isPaid" | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")
  const [selectedExpenseIds, setSelectedExpenseIds] = React.useState<Set<string>>(() => new Set())

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [addStep, setAddStep] = React.useState<"choose" | "installment">("choose")
  const [selectedMonthForInstallment, setSelectedMonthForInstallment] = React.useState<number | null>(null)
  const [installmentMonths, setInstallmentMonths] = React.useState<number>(1)
  const [installmentItem, setInstallmentItem] = React.useState("")
  const [installmentAmount, setInstallmentAmount] = React.useState("")
  const [installmentCreditorId, setInstallmentCreditorId] = React.useState<string>("")

  const [creditorsRefreshKey, setCreditorsRefreshKey] = React.useState(0)
  const [pendingDeleteGroupId, setPendingDeleteGroupId] = React.useState<string | null>(null)
  const [pendingGroupUpdate, setPendingGroupUpdate] = React.useState<{
    groupId: string; field: "tagId" | "creditorId"; value: string; expenseId: string; payload: Partial<ApiExpense>
  } | null>(null)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoadingData(true)
    Promise.all([
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiExpense[]>("/expenses", { token }),
      apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
    ])
      .then(([tagsRes, expensesRes, creditorsRes]) => {
        if (cancelled) return
        setTags(tagsRes)
        setExpenses(expensesRes)
        setAllCreditors(creditorsRes)
      })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.") })
      .finally(() => { if (!cancelled) setIsLoadingData(false) })
    return () => { cancelled = true }
  }, [token])

  const refreshExpenses = React.useCallback(async () => {
    if (!token) return
    try {
      const [expensesRes, creditorsRes] = await Promise.all([
        apiFetch<ApiExpense[]>("/expenses", { token }),
        apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      ])
      setExpenses(expensesRes)
      setAllCreditors(creditorsRes)
      setCreditorsRefreshKey((k) => k + 1)
    } catch { /* silent */ }
  }, [token])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const expenseTags = React.useMemo(() => tags.filter((t) => t.type === "EXPENSE"), [tags])

  const availableYears = React.useMemo(() => {
    const years = new Set<number>()
    for (const exp of expenses) years.add(new Date(exp.date).getFullYear())
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [expenses, currentYear])

  const expenseRows = React.useMemo(() => {
    return expenses
      .filter((exp) => {
        const d = new Date(exp.date)
        if (d.getFullYear() !== selectedYearNumber) return false
        return d.getMonth() + 1 === Number(selectedMonth)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, selectedYearNumber, selectedMonth])

  const expenseRowsByMonth = React.useMemo(() => {
    const map = new Map<number, ApiExpense[]>()
    for (const row of expenseRows) {
      const mi = new Date(row.date).getMonth()
      const list = map.get(mi) ?? []
      list.push(row)
      map.set(mi, list)
    }
    if (sortColumn) {
      for (const [mi, rows] of map.entries()) {
        map.set(mi, [...rows].sort((a, b) => {
          let aVal: string | number | boolean
          let bVal: string | number | boolean
          if (sortColumn === "item") { aVal = a.item.toLowerCase(); bVal = b.item.toLowerCase() }
          else if (sortColumn === "amount") { aVal = toNumber(a.amount); bVal = toNumber(b.amount) }
          else if (sortColumn === "date") { aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime() }
          else if (sortColumn === "tagId") { aVal = (a.tagId && tagById.get(a.tagId)?.name) || ""; bVal = (b.tagId && tagById.get(b.tagId)?.name) || "" }
          else if (sortColumn === "creditorId") { aVal = allCreditors.find((c) => c.id === a.creditorId)?.name || ""; bVal = allCreditors.find((c) => c.id === b.creditorId)?.name || "" }
          else { aVal = a.isPaid ? 1 : 0; bVal = b.isPaid ? 1 : 0 }
          if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
          if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
          return 0
        }))
      }
    }
    return map
  }, [expenseRows, sortColumn, sortDirection, tagById, allCreditors])

  function handleSort(column: "item" | "amount" | "date" | "tagId" | "creditorId" | "isPaid") {
    if (sortColumn === column) setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    else { setSortColumn(column); setSortDirection("asc") }
  }

  function startEdit(id: string, field: "item" | "amount" | "date" | "tagId" | "creditorId") {
    setEditingCell({ id, field })
    setDrafts((prev) => {
      if (prev[id]) return prev
      const current = expenses.find((e) => e.id === id)
      if (!current) return prev
      return { ...prev, [id]: { item: current.item, amount: current.amount, date: current.date, tagId: current.tagId, creditorId: current.creditorId } }
    })
  }

  async function saveField(id: string, field: "item" | "amount" | "date" | "tagId" | "creditorId", value: string) {
    const current = expenses.find((e) => e.id === id)
    if (!current || !token) return
    const payload: Partial<ApiExpense> = {}
    if (field === "item") {
      if (value.trim().length < 2) { toast.error("Item precisa ter pelo menos 2 caracteres."); return }
      payload.item = value.trim()
    }
    if (field === "amount") {
      const amount = Number(value)
      if (!Number.isFinite(amount) || amount <= 0) { toast.error("Valor precisa ser maior que zero."); return }
      payload.amount = amount
    }
    if (field === "date") {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) { toast.error("Data inválida."); return }
      payload.date = d.toISOString()
    }
    if (field === "tagId") payload.tagId = value === "none" ? null : value
    if (field === "creditorId") payload.creditorId = value === "none" ? null : value

    setEditingCell(null)

    if ((field === "tagId" || field === "creditorId") && current.installmentGroupId) {
      setPendingGroupUpdate({ groupId: current.installmentGroupId, field, value, expenseId: id, payload })
      return
    }

    setSavingRowId(id)
    try {
      await apiFetch(`/expenses/${id}`, { method: "PUT", token, body: JSON.stringify(payload) })
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, ...payload } : e))
      if (field === "creditorId" || field === "amount") setCreditorsRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.")
    } finally {
      setSavingRowId(null)
    }
  }

  async function togglePaid(id: string, isPaid: boolean) {
    if (!token) return
    try {
      await apiFetch(`/expenses/${id}`, { method: "PUT", token, body: JSON.stringify({ isPaid }) })
      setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, isPaid } : e))
      setCreditorsRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar status.")
    }
  }

  async function handleAddExpense(monthIndex: number) {
    if (!token) return
    const monthKey = `${selectedYearNumber}-${monthIndex}`
    setSavingRowId(monthKey)
    try {
      const date = new Date(selectedYearNumber, monthIndex, 1).toISOString()
      const created = await apiFetch<ApiExpense>("/expenses", {
        method: "POST",
        token,
        body: JSON.stringify({ item: "Nova despesa", amount: 0.01, date, tagId: expenseTags[0]?.id ?? null, isPaid: false }),
      })
      setExpenses((prev) => [created, ...prev])
      setCreditorsRefreshKey((k) => k + 1)
      startEdit(created.id, "item")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar.")
    } finally {
      setSavingRowId(null)
    }
  }

  async function handleDeleteSelected(ids: string[]) {
    if (!token) return
    setSavingRowId("delete")
    try {
      const toDelete = ids.filter((id) => selectedExpenseIds.has(id))
      if (toDelete.length === 0) return
      await Promise.all(toDelete.map((id) => apiFetch(`/expenses/${id}`, { method: "DELETE", token })))
      setExpenses((prev) => prev.filter((e) => !toDelete.includes(e.id)))
      setSelectedExpenseIds((prev) => { const next = new Set(prev); toDelete.forEach((id) => next.delete(id)); return next })
      setCreditorsRefreshKey((k) => k + 1)
      toast.success(`${toDelete.length} despesa(s) excluída(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir.")
    } finally {
      setSavingRowId(null)
    }
  }

  async function handleAddInstallment(monthIndex: number) {
    if (!token) return
    const monthKey = `${selectedYearNumber}-${monthIndex}`
    setSavingRowId(monthKey)
    try {
      const startDate = new Date(selectedYearNumber, monthIndex, 1).toISOString()
      const result = await apiFetch<{ groupId: string; count: number }>("/expenses/installments", {
        method: "POST",
        token,
        body: JSON.stringify({
          item: installmentItem || "Compra parcelada",
          amount: Number(installmentAmount) || 1,
          startDate,
          totalInstallments: installmentMonths,
          tagId: expenseTags[0]?.id,
          creditorId: installmentCreditorId && installmentCreditorId !== "none" ? installmentCreditorId : null,
          isPaid: false,
        }),
      })
      setIsAddDialogOpen(false)
      setAddStep("choose")
      setSelectedMonthForInstallment(null)
      setInstallmentMonths(1)
      setInstallmentItem("")
      setInstallmentAmount("")
      setInstallmentCreditorId("")
      toast.success(`${result.count} parcelas criadas!`)
      const [expensesRes] = await Promise.all([apiFetch<ApiExpense[]>("/expenses", { token })])
      setExpenses(expensesRes)
      setCreditorsRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar parcelas.")
    } finally {
      setSavingRowId(null)
    }
  }

  async function handleDeleteInstallmentGroup(groupId: string) {
    if (!token) return
    try {
      await apiFetch(`/expenses/group/${groupId}`, { method: "DELETE", token })
      setExpenses((prev) => prev.filter((e) => e.installmentGroupId !== groupId))
      setCreditorsRefreshKey((k) => k + 1)
      toast.success("Parcelas excluídas com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir parcelas.")
    }
  }

  async function applyGroupUpdate(applyAll: boolean) {
    if (!pendingGroupUpdate || !token) return
    const { groupId, expenseId, payload } = pendingGroupUpdate
    setSavingRowId(expenseId)
    setPendingGroupUpdate(null)
    try {
      if (applyAll) {
        await apiFetch(`/expenses/group/${groupId}`, { method: "PUT", token, body: JSON.stringify(payload) })
        setExpenses((prev) => prev.map((e) => e.installmentGroupId === groupId ? { ...e, ...payload } : e))
      } else {
        await apiFetch(`/expenses/${expenseId}`, { method: "PUT", token, body: JSON.stringify(payload) })
        setExpenses((prev) => prev.map((e) => e.id === expenseId ? { ...e, ...payload } : e))
      }
      setCreditorsRefreshKey((k) => k + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.")
    } finally {
      setSavingRowId(null)
    }
  }

  const visibleMonths = MONTHS.map((month, monthIndex) => ({
    month,
    monthIndex,
    isVisible: monthIndex + 1 === Number(selectedMonth),
  })).filter((m) => m.isVisible)

  const totalExpensePeriod = React.useMemo(
    () => expenseRows.reduce((s, r) => s + toNumber(r.amount), 0),
    [expenseRows],
  )
  const totalPago = React.useMemo(
    () => expenseRows.filter((r) => r.isPaid).reduce((s, r) => s + toNumber(r.amount), 0),
    [expenseRows],
  )
  const totalPendente = totalExpensePeriod - totalPago

  return (
    <PageShell
      title="Despesas"
      availableYears={availableYears}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
      headerActions={
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isLoadingData && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {/* Despesas Fixas */}
      <FixedExpensesSummary
        month={String(currentMonthIndex + 1)}
        year={selectedYear}
        onGenerated={refreshExpenses}
      />

      {/* Credores */}
      <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-sm">
        <CreditorsSection availableYears={availableYears} refreshKey={creditorsRefreshKey} expenses={expenses} month={selectedMonth} year={selectedYear} />
      </div>

      {/* Total do período */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 backdrop-blur-sm">
          <TrendingDown className="size-4 shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total do período</p>
            <p className="text-base font-bold tabular-nums text-red-400">{formatBRL(totalExpensePeriod)}</p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground/50">{expenseRows.length} reg.</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 backdrop-blur-sm">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-base font-bold tabular-nums text-emerald-400">{formatBRL(totalPago)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/15 bg-orange-500/5 px-4 py-3 backdrop-blur-sm">
          <AlertCircle className="size-4 shrink-0 text-orange-400" />
          <div>
            <p className="text-xs text-white/40">Pendente</p>
            <p className="text-base font-bold tabular-nums text-orange-400">{formatBRL(totalPendente)}</p>
          </div>
        </div>
      </div>

      {visibleMonths.map(({ month, monthIndex }) => {
        const rows = expenseRowsByMonth.get(monthIndex) ?? []
        const monthIds = rows.map((r) => r.id)
        const allSelected = rows.length > 0 && monthIds.every((id) => selectedExpenseIds.has(id))
        const someSelected = monthIds.some((id) => selectedExpenseIds.has(id))
        const monthKey = `${selectedYearNumber}-${monthIndex}`

        return (
          <Card key={month.label} className="mb-4 border-border bg-card backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium">{month.label}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {someSelected && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSelected(monthIds)} disabled={savingRowId === "delete"}>
                      {savingRowId === "delete" ? "Excluindo..." : "Excluir selecionadas"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setSelectedMonthForInstallment(monthIndex); setAddStep("choose"); setIsAddDialogOpen(true) }} disabled={savingRowId === monthKey}>
                    {savingRowId === monthKey ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">
                        {rows.length > 0 && (
                          <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={(checked) => {
                              setSelectedExpenseIds((prev) => { const next = new Set(prev); if (checked) monthIds.forEach((id) => next.add(id)); else monthIds.forEach((id) => next.delete(id)); return next })
                            }}
                          />
                        )}
                      </TableHead>
                      <SortableHeader column="item" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={FileText}>Item</SortableHeader>
                      <SortableHeader column="amount" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={DollarSign}>Valor</SortableHeader>
                      <SortableHeader column="tagId" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={Tag}>Tag</SortableHeader>
                      <SortableHeader column="creditorId" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={UserCircle}>Credor</SortableHeader>
                      <SortableHeader column="date" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={Calendar}>Data</SortableHeader>
                      <SortableHeader column="isPaid" currentSort={sortColumn} sortDirection={sortDirection} onSort={handleSort} icon={CheckCircle} align="right">Status</SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="px-6 py-6 text-center text-sm text-muted-foreground">
                          Nenhuma despesa neste mês. Clique em "Adicionar" para criar uma.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const isEditing = (f: "item" | "amount" | "date" | "tagId" | "creditorId") => editingCell?.id === row.id && editingCell.field === f
                        const draft = drafts[row.id]
                        const itemValue = (draft?.item ?? row.item) as string
                        const amountValue = String(draft?.amount ?? row.amount)
                        const dateValue = formatDateInput((draft?.date ?? row.date) as string)
                        const tagValue = (draft?.tagId ?? row.tagId) as string | null
                        const tagLabel = (row.tagId && tagById.get(row.tagId)?.name) || "Sem tag"

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="pl-6">
                              <Checkbox checked={selectedExpenseIds.has(row.id)} onCheckedChange={(checked) => { setSelectedExpenseIds((prev) => { const next = new Set(prev); if (checked) next.add(row.id); else next.delete(row.id); return next }) }} />
                            </TableCell>
                            <TableCell onClick={() => startEdit(row.id, "item")}>
                              <div className="group flex items-center gap-2">
                                {isEditing("item") ? (
                                  <Input autoFocus value={itemValue}
                                    onChange={(e) => setDrafts((p) => ({ ...p, [row.id]: { ...p[row.id], item: e.target.value } }))}
                                    onBlur={(e) => saveField(row.id, "item", e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveField(row.id, "item", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingCell(null) }}
                                  />
                                ) : <span className="cursor-text">{row.item}</span>}
                                {row.installmentGroupId && (
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">{row.installmentNumber}/{row.installmentTotal}</span>
                                    <button onClick={(e) => { e.stopPropagation(); if (row.installmentGroupId) setPendingDeleteGroupId(row.installmentGroupId) }} className="rounded-full p-1 hover:bg-red-200 dark:hover:bg-red-900" title="Excluir todas as parcelas">
                                      <Trash2 className="size-3 text-red-600" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell onClick={() => startEdit(row.id, "amount")}>
                              {isEditing("amount") ? (
                                <Input autoFocus type="number" step="0.01" value={amountValue}
                                  onChange={(e) => setDrafts((p) => ({ ...p, [row.id]: { ...p[row.id], amount: e.target.value } }))}
                                  onBlur={(e) => saveField(row.id, "amount", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveField(row.id, "amount", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingCell(null) }}
                                />
                              ) : <span className="cursor-text">{formatBRL(toNumber(row.amount))}</span>}
                            </TableCell>
                            <TableCell onClick={() => startEdit(row.id, "tagId")}>
                              {isEditing("tagId") ? (
                                <Select value={tagValue ?? "none"} onValueChange={(v) => saveField(row.id, "tagId", v)}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem tag</SelectItem>
                                    {expenseTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : <span className="cursor-text">{tagLabel}</span>}
                            </TableCell>
                            <TableCell onClick={() => startEdit(row.id, "creditorId")}>
                              {isEditing("creditorId") ? (
                                <Select value={(drafts[row.id]?.creditorId ?? row.creditorId) ?? "none"} onValueChange={(v) => saveField(row.id, "creditorId", v)}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem credor</SelectItem>
                                    {allCreditors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : <span className="cursor-text">{row.creditorId ? allCreditors.find((c) => c.id === row.creditorId)?.name : "-"}</span>}
                            </TableCell>
                            <TableCell>
                              <DatePickerCell
                                value={row.date}
                                isEditing={isEditing("date")}
                                onStartEdit={() => startEdit(row.id, "date")}
                                onSave={(iso) => saveField(row.id, "date", iso)}
                                onCancel={() => setEditingCell(null)}
                              />
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <button type="button" onClick={() => togglePaid(row.id, !row.isPaid)} className="inline-flex items-center gap-2 text-sm font-medium">
                                {row.isPaid ? <CheckCircle2 className="size-4 text-emerald-400" /> : <AlertCircle className="size-4 text-red-400" />}
                                <span>{row.isPaid ? "Pago" : "Pendente"}</span>
                              </button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Group update dialog */}
      <AlertDialog open={!!pendingGroupUpdate} onOpenChange={(open) => { if (!open) setPendingGroupUpdate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar {pendingGroupUpdate?.field === "tagId" ? "tag" : "credor"}</AlertDialogTitle>
            <AlertDialogDescription>Deseja aplicar essa alteração apenas nesta parcela ou em todas as parcelas do grupo?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyGroupUpdate(false)}>Só esta parcela</AlertDialogAction>
            <AlertDialogAction onClick={() => applyGroupUpdate(true)}>Todas as parcelas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add expense dialog — unified (choose type or fill installment form) */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) { setIsAddDialogOpen(false); setAddStep("choose"); setInstallmentMonths(1); setInstallmentItem(""); setInstallmentAmount(""); setInstallmentCreditorId("") } }}>
        <DialogContent className="sm:max-w-md">
          {addStep === "choose" ? (
            <>
              <DialogHeader>
                <DialogTitle>Adicionar despesa</DialogTitle>
              </DialogHeader>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setAddStep("choose")
                    if (selectedMonthForInstallment !== null) handleAddExpense(selectedMonthForInstallment)
                  }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background">
                    <Plus className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Despesa simples</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Adicione e edite direto na tabela</p>
                  </div>
                </button>
                <button
                  onClick={() => setAddStep("installment")}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background">
                    <Layers className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Compra parcelada</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Divida em múltiplas parcelas mensais</p>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Compra Parcelada</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nome da Compra</label>
                  <Input placeholder="Ex: TV 55 polegadas" value={installmentItem} onChange={(e) => setInstallmentItem(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Valor de Cada Parcela</label>
                  <Input type="number" min="0.01" step="0.01" placeholder="Ex: 150.00" value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Credor (Opcional)</label>
                  <Select value={installmentCreditorId} onValueChange={setInstallmentCreditorId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um credor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem credor</SelectItem>
                      {allCreditors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Número de Parcelas</label>
                  <Input type="number" min="1" max="60" value={installmentMonths} onChange={(e) => setInstallmentMonths(Number(e.target.value))} />
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium">Resumo:</p>
                  <p className="text-muted-foreground">{installmentMonths}x de {installmentAmount ? formatBRL(Number(installmentAmount)) : "R$ 0,00"}</p>
                  <p className="text-muted-foreground">Total: {installmentAmount && installmentMonths ? formatBRL(Number(installmentAmount) * installmentMonths) : "R$ 0,00"}</p>
                  {selectedMonthForInstallment !== null && <p className="text-muted-foreground">Começando em {MONTHS[selectedMonthForInstallment].label} de {selectedYearNumber}</p>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setAddStep("choose")} className="text-muted-foreground">
                    Voltar
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setAddStep("choose"); setInstallmentMonths(1); setInstallmentItem(""); setInstallmentAmount("") }}>Cancelar</Button>
                    <Button onClick={() => { if (selectedMonthForInstallment !== null) handleAddInstallment(selectedMonthForInstallment) }} disabled={!installmentItem || !installmentAmount || installmentMonths < 1}>Criar Parcelas</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete group dialog */}
      <AlertDialog open={!!pendingDeleteGroupId} onOpenChange={(open) => { if (!open) setPendingDeleteGroupId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todas as parcelas?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação irá remover todas as parcelas deste grupo permanentemente. Não é possível desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingDeleteGroupId) { handleDeleteInstallmentGroup(pendingDeleteGroupId); setPendingDeleteGroupId(null) } }}>Excluir todas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
