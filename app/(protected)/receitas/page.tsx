"use client"

import * as React from "react"
import { toast } from "sonner"
import { Calendar, DollarSign, FileText, Tag, TrendingUp } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSelectedYear } from "@/hooks/use-selected-year"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiTag } from "@/lib/finance-types"
import {
  MONTHS,
  formatBRL,
  formatDateDisplay,
  formatDateInput,
  toNumber,
  getQuarter,
} from "@/lib/finance-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { DatePickerCell } from "@/components/dashboard/date-picker-cell"
import { SortableIncomeHeader } from "@/components/dashboard/sortable-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ReceitasPage() {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()

  const [selectedYear, setSelectedYear] = useSelectedYear()
  const selectedYearNumber = Number(selectedYear)
  const [incomeQuarter, setIncomeQuarter] = React.useState<string>("month")

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const [editingIncomeCell, setEditingIncomeCell] = React.useState<{
    id: string
    field: "source" | "amount" | "date" | "tagId"
  } | null>(null)
  const [draftsIncome, setDraftsIncome] = React.useState<Record<string, Partial<ApiIncome>>>({})
  const [savingIncomeId, setSavingIncomeId] = React.useState<string | null>(null)
  const [sortColumnIncome, setSortColumnIncome] = React.useState<"source" | "amount" | "date" | "tagId" | null>(null)
  const [sortDirectionIncome, setSortDirectionIncome] = React.useState<"asc" | "desc">("desc")
  const [selectedIncomeIds, setSelectedIncomeIds] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoadingData(true)
    Promise.all([
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiIncome[]>("/incomes", { token }),
    ])
      .then(([tagsRes, incomesRes]) => {
        if (cancelled) return
        setTags(tagsRes)
        setIncomes(incomesRes)
      })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.") })
      .finally(() => { if (!cancelled) setIsLoadingData(false) })
    return () => { cancelled = true }
  }, [token])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const incomeTags = React.useMemo(() => tags.filter((t) => t.type === "INCOME"), [tags])

  const availableYears = React.useMemo(() => {
    const years = new Set<number>()
    for (const inc of incomes) years.add(new Date(inc.date).getFullYear())
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [incomes, currentYear])

  const incomeRows = React.useMemo(() => {
    return incomes
      .filter((inc) => {
        const d = new Date(inc.date)
        if (d.getFullYear() !== selectedYearNumber) return false
        if (incomeQuarter === "all") return true
        if (incomeQuarter === "month") return d.getMonth() === currentMonthIndex
        return incomeQuarter === `q${getQuarter(d.getMonth())}`
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [incomes, selectedYearNumber, incomeQuarter, currentMonthIndex])

  const incomeRowsByMonth = React.useMemo(() => {
    const map = new Map<number, ApiIncome[]>()
    for (const row of incomeRows) {
      const mi = new Date(row.date).getMonth()
      const list = map.get(mi) ?? []
      list.push(row)
      map.set(mi, list)
    }
    if (sortColumnIncome) {
      for (const [mi, rows] of map.entries()) {
        map.set(mi, [...rows].sort((a, b) => {
          let aVal: string | number
          let bVal: string | number
          if (sortColumnIncome === "source") { aVal = a.source.toLowerCase(); bVal = b.source.toLowerCase() }
          else if (sortColumnIncome === "amount") { aVal = toNumber(a.amount); bVal = toNumber(b.amount) }
          else if (sortColumnIncome === "date") { aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime() }
          else { aVal = (a.tagId && tagById.get(a.tagId)?.name) || ""; bVal = (b.tagId && tagById.get(b.tagId)?.name) || "" }
          if (aVal < bVal) return sortDirectionIncome === "asc" ? -1 : 1
          if (aVal > bVal) return sortDirectionIncome === "asc" ? 1 : -1
          return 0
        }))
      }
    }
    return map
  }, [incomeRows, sortColumnIncome, sortDirectionIncome, tagById])

  function handleIncomeSort(column: "source" | "amount" | "date" | "tagId") {
    if (sortColumnIncome === column) setSortDirectionIncome(sortDirectionIncome === "asc" ? "desc" : "asc")
    else { setSortColumnIncome(column); setSortDirectionIncome("asc") }
  }

  function startIncomeEdit(id: string, field: "source" | "amount" | "date" | "tagId") {
    setEditingIncomeCell({ id, field })
    setDraftsIncome((prev) => {
      if (prev[id]) return prev
      const current = incomes.find((i) => i.id === id)
      if (!current) return prev
      return { ...prev, [id]: { source: current.source, amount: current.amount, date: current.date, tagId: current.tagId } }
    })
  }

  async function saveIncomeField(id: string, field: "source" | "amount" | "date" | "tagId", value: string) {
    const current = incomes.find((i) => i.id === id)
    if (!current || !token) return
    const payload: Partial<ApiIncome> = {}
    if (field === "source") {
      if (value.trim().length < 1) { toast.error("Fonte precisa ter pelo menos 1 caractere."); return }
      payload.source = value.trim()
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
    if (field === "tagId") {
      payload.tagId = value === "none" ? null : value
    }
    setEditingIncomeCell(null)
    setSavingIncomeId(id)
    try {
      await apiFetch(`/incomes/${id}`, { method: "PUT", token, body: JSON.stringify(payload) })
      setIncomes((prev) => prev.map((inc) => inc.id === id ? { ...inc, ...payload } : inc))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.")
    } finally {
      setSavingIncomeId(null)
    }
  }

  async function handleAddIncome(monthIndex: number) {
    if (!token) return
    const monthKey = `${selectedYearNumber}-${monthIndex}`
    setSavingIncomeId(monthKey)
    try {
      const date = new Date(selectedYearNumber, monthIndex, 1).toISOString()
      const created = await apiFetch<ApiIncome>("/incomes", {
        method: "POST",
        token,
        body: JSON.stringify({ source: "Nova receita", amount: 0.01, date, tagId: incomeTags[0]?.id ?? null }),
      })
      setIncomes((prev) => [created, ...prev])
      startIncomeEdit(created.id, "source")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar.")
    } finally {
      setSavingIncomeId(null)
    }
  }

  async function handleDeleteIncomeSelected(ids: string[]) {
    if (!token) return
    setSavingIncomeId("delete")
    try {
      const toDelete = ids.filter((id) => selectedIncomeIds.has(id))
      if (toDelete.length === 0) return
      await Promise.all(toDelete.map((id) => apiFetch(`/incomes/${id}`, { method: "DELETE", token })))
      setIncomes((prev) => prev.filter((inc) => !toDelete.includes(inc.id)))
      setSelectedIncomeIds((prev) => { const next = new Set(prev); toDelete.forEach((id) => next.delete(id)); return next })
      toast.success(`${toDelete.length} receita(s) excluída(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir.")
    } finally {
      setSavingIncomeId(null)
    }
  }

  const visibleMonths = MONTHS.map((month, monthIndex) => {
    const quarterLabel = getQuarter(monthIndex)
    const isVisible = incomeQuarter === "all" || (incomeQuarter === "month" && monthIndex === currentMonthIndex) || incomeQuarter === `q${quarterLabel}`
    return { month, monthIndex, isVisible }
  }).filter((m) => m.isVisible)

  const totalIncomePeriod = React.useMemo(
    () => incomeRows.reduce((s, r) => s + toNumber(r.amount), 0),
    [incomeRows],
  )

  return (
    <PageShell
      title="Receitas"
      availableYears={availableYears}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
      headerActions={
        <Tabs value={incomeQuarter} onValueChange={setIncomeQuarter}>
          <TabsList className="h-auto flex-wrap gap-y-1">
            <TabsTrigger value="month">Mês atual</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="q1">1º tri</TabsTrigger>
            <TabsTrigger value="q2">2º tri</TabsTrigger>
            <TabsTrigger value="q3">3º tri</TabsTrigger>
            <TabsTrigger value="q4">4º tri</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {isLoadingData && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {/* Total do período */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3 backdrop-blur-sm">
        <TrendingUp className="size-4 shrink-0 text-emerald-400" />
        <span className="text-sm text-muted-foreground">Total receitas no período:</span>
        <span className="ml-auto text-lg font-bold tabular-nums text-emerald-400">
          {formatBRL(totalIncomePeriod)}
        </span>
        <span className="text-xs text-muted-foreground/60">{incomeRows.length} registro{incomeRows.length !== 1 ? "s" : ""}</span>
      </div>

      {visibleMonths.map(({ month, monthIndex }) => {
        const rows = incomeRowsByMonth.get(monthIndex) ?? []
        const monthIds = rows.map((r) => r.id)
        const allSelected = rows.length > 0 && monthIds.every((id) => selectedIncomeIds.has(id))
        const someSelected = monthIds.some((id) => selectedIncomeIds.has(id))
        const monthKey = `${selectedYearNumber}-${monthIndex}`

        return (
          <Card key={month.label} className="mb-4 border-border bg-card backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium">{month.label}</CardTitle>
                <div className="flex items-center gap-2">
                  {someSelected && (
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteIncomeSelected(monthIds)} disabled={savingIncomeId === "delete"}>
                      {savingIncomeId === "delete" ? "Excluindo..." : "Excluir selecionadas"}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleAddIncome(monthIndex)} disabled={savingIncomeId === monthKey}>
                    {savingIncomeId === monthKey ? "Adicionando..." : "Adicionar"}
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
                              setSelectedIncomeIds((prev) => {
                                const next = new Set(prev)
                                if (checked) monthIds.forEach((id) => next.add(id))
                                else monthIds.forEach((id) => next.delete(id))
                                return next
                              })
                            }}
                          />
                        )}
                      </TableHead>
                      <SortableIncomeHeader column="source" currentSort={sortColumnIncome} sortDirection={sortDirectionIncome} onSort={handleIncomeSort} icon={FileText}>Fonte</SortableIncomeHeader>
                      <SortableIncomeHeader column="amount" currentSort={sortColumnIncome} sortDirection={sortDirectionIncome} onSort={handleIncomeSort} icon={DollarSign}>Valor</SortableIncomeHeader>
                      <SortableIncomeHeader column="tagId" currentSort={sortColumnIncome} sortDirection={sortDirectionIncome} onSort={handleIncomeSort} icon={Tag}>Tag</SortableIncomeHeader>
                      <SortableIncomeHeader column="date" currentSort={sortColumnIncome} sortDirection={sortDirectionIncome} onSort={handleIncomeSort} icon={Calendar}>Data</SortableIncomeHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="px-6 py-6 text-center text-sm text-muted-foreground">
                          Nenhuma receita neste mês. Clique em "Adicionar" para criar uma.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const isEditing = (f: "source" | "amount" | "date" | "tagId") => editingIncomeCell?.id === row.id && editingIncomeCell.field === f
                        const draft = draftsIncome[row.id]
                        const sourceValue = (draft?.source ?? row.source) as string
                        const amountValue = String(draft?.amount ?? row.amount)
                        const dateValue = formatDateInput((draft?.date ?? row.date) as string)
                        const tagValue = (draft?.tagId ?? row.tagId) as string | null
                        const tagLabel = (row.tagId && tagById.get(row.tagId)?.name) || "Sem tag"

                        return (
                          <TableRow key={row.id}>
                            <TableCell className="pl-6">
                              <Checkbox
                                checked={selectedIncomeIds.has(row.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedIncomeIds((prev) => { const next = new Set(prev); if (checked) next.add(row.id); else next.delete(row.id); return next })
                                }}
                              />
                            </TableCell>
                            <TableCell onClick={() => startIncomeEdit(row.id, "source")}>
                              {isEditing("source") ? (
                                <Input autoFocus value={sourceValue}
                                  onChange={(e) => setDraftsIncome((p) => ({ ...p, [row.id]: { ...p[row.id], source: e.target.value } }))}
                                  onBlur={(e) => saveIncomeField(row.id, "source", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveIncomeField(row.id, "source", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingIncomeCell(null) }}
                                />
                              ) : <span className="cursor-text">{row.source}</span>}
                            </TableCell>
                            <TableCell onClick={() => startIncomeEdit(row.id, "amount")}>
                              {isEditing("amount") ? (
                                <Input autoFocus type="number" step="0.01" value={amountValue}
                                  onChange={(e) => setDraftsIncome((p) => ({ ...p, [row.id]: { ...p[row.id], amount: e.target.value } }))}
                                  onBlur={(e) => saveIncomeField(row.id, "amount", e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveIncomeField(row.id, "amount", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingIncomeCell(null) }}
                                />
                              ) : <span className="cursor-text">{formatBRL(toNumber(row.amount))}</span>}
                            </TableCell>
                            <TableCell onClick={() => startIncomeEdit(row.id, "tagId")}>
                              {isEditing("tagId") ? (
                                <Select value={tagValue ?? "none"} onValueChange={(v) => saveIncomeField(row.id, "tagId", v)}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sem tag</SelectItem>
                                    {incomeTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : <span className="cursor-text">{tagLabel}</span>}
                            </TableCell>
                            <TableCell>
                              <DatePickerCell
                                value={row.date}
                                isEditing={isEditing("date")}
                                onStartEdit={() => startIncomeEdit(row.id, "date")}
                                onSave={(iso) => saveIncomeField(row.id, "date", iso)}
                                onCancel={() => setEditingIncomeCell(null)}
                              />
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
    </PageShell>
  )
}
