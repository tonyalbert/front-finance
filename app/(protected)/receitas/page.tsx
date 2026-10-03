"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Plus, RefreshCw, Search, Tag, Trash2, TrendingUp, Inbox, Hash, Trophy, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiTag } from "@/lib/finance-types"
import { MONTHS, formatBRL, getQuarter, toNumber, toUtcIso, utcParts } from "@/lib/finance-utils"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { TagsSheet } from "@/components/dashboard/tags-sheet"
import { IncomesTable, sortIncomes, type IncomeSortKey, type IncomeSortState } from "@/components/receitas/incomes-table"
import { EmptyState } from "@/components/finance/empty-state"
import { IncomeSheet, type IncomeFormValues } from "@/components/finance/income-sheet"
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
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Scope = "month" | "quarter" | "year"
const NONE = "none"
const normalize = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export default function ReceitasPage() {
  return (
    <React.Suspense fallback={null}>
      <ReceitasContent />
    </React.Suspense>
  )
}

function ReceitasContent() {
  const { token } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { month, year } = usePeriod()

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [scope, setScope] = React.useState<Scope>("month")
  const [search, setSearch] = React.useState("")
  const [tagFilter, setTagFilter] = React.useState("all")
  const [sort, setSort] = React.useState<IncomeSortState>({ key: "date", dir: "desc" })
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [tagsOpen, setTagsOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiIncome | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<string[] | null>(null)
  const [isBusy, setIsBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [t, i] = await Promise.all([apiFetch<ApiTag[]>("/tags", { token }), apiFetch<ApiIncome[]>("/incomes", { token })])
      setTags(t)
      setIncomes(i)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  // ?nova=1 (botão "Nova receita" do dashboard) abre o formulário
  React.useEffect(() => {
    if (searchParams.get("nova") !== "1") return
    setEditing(null)
    setSheetOpen(true)
    router.replace("/receitas", { scroll: false })
  }, [searchParams, router])

  const incomeTags = React.useMemo(() => tags.filter((t) => t.type === "INCOME"), [tags])
  const tagIndexById = React.useMemo(() => new Map(tags.map((t, i) => [t.id, i])), [tags])
  const tagName = React.useCallback((id: string | null) => (id && tags.find((t) => t.id === id)?.name) || "Sem tag", [tags])

  const inScope = React.useCallback(
    (iso: string) => {
      const p = utcParts(iso)
      if (!p || p.year !== year) return false
      if (scope === "year") return true
      if (scope === "quarter") return getQuarter(p.month) === getQuarter(month)
      return p.month === month
    },
    [scope, year, month],
  )

  const scopeRows = React.useMemo(() => incomes.filter((i) => inScope(i.date)), [incomes, inScope])

  const filteredRows = React.useMemo(() => {
    const q = normalize(search)
    const filtered = scopeRows.filter((i) => {
      if (q && !normalize(`${i.source} ${i.tagId ? tagName(i.tagId) : ""}`).includes(q)) return false
      if (tagFilter === NONE ? !!i.tagId : tagFilter !== "all" && i.tagId !== tagFilter) return false
      return true
    })
    return sortIncomes(filtered, sort, tagName)
  }, [scopeRows, search, tagFilter, sort, tagName])

  const selectedIds = React.useMemo(() => {
    const visible = new Set(filteredRows.map((r) => r.id))
    return [...selected].filter((id) => visible.has(id))
  }, [selected, filteredRows])

  const stats = React.useMemo(() => {
    const total = scopeRows.reduce((s, r) => s + toNumber(r.amount), 0)
    const biggest = scopeRows.reduce<ApiIncome | null>((m, r) => (!m || toNumber(r.amount) > toNumber(m.amount) ? r : m), null)
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevTotal =
      scope === "month"
        ? incomes
            .filter((i) => {
              const p = utcParts(i.date)
              return p && p.year === prevYear && p.month === prevMonth
            })
            .reduce((s, i) => s + toNumber(i.amount), 0)
        : 0
    return { total, biggest, prevTotal, prevLabel: MONTHS[prevMonth].label.toLowerCase() }
  }, [scopeRows, incomes, scope, month, year])

  const delta: KpiDelta | undefined = React.useMemo(() => {
    if (!stats.prevTotal) return undefined
    const pct = Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 1000) / 10
    return {
      text: `${pct > 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
      sentiment: pct === 0 ? "neutral" : pct > 0 ? "good" : "bad",
    }
  }, [stats])

  const periodLabel =
    scope === "month" ? `${MONTHS[month].label.toLowerCase()} de ${year}` : scope === "quarter" ? `${getQuarter(month)}º trimestre de ${year}` : `${year}`
  const filtersActive = search.trim() !== "" || tagFilter !== "all"

  function clearFilters() {
    setSearch("")
    setTagFilter("all")
  }
  function changeSort(key: IncomeSortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "source" || key === "tag" ? "asc" : "desc" }))
  }

  function newIncomeDate() {
    const today = new Date()
    const isCurrent = today.getFullYear() === year && today.getMonth() === month
    return toUtcIso(year, month, isCurrent ? today.getDate() : 1)
  }
  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }
  function openEdit(row: ApiIncome) {
    setEditing(row)
    setSheetOpen(true)
  }

  async function changeBasic(row: ApiIncome, patch: { source?: string; amount?: number; date?: string }) {
    if (!token) return
    try {
      await apiFetch(`/incomes/${row.id}`, { method: "PUT", token, body: JSON.stringify(patch) })
      setIncomes((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...patch } : i)))
      toast.success("Receita atualizada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  async function changeTag(row: ApiIncome, tagId: string | null) {
    if (!token) return
    try {
      await apiFetch(`/incomes/${row.id}`, { method: "PUT", token, body: JSON.stringify({ tagId }) })
      setIncomes((prev) => prev.map((i) => (i.id === row.id ? { ...i, tagId } : i)))
      toast.success("Tag atualizada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
    }
  }

  async function duplicate(row: ApiIncome) {
    if (!token) return
    try {
      const created = await apiFetch<ApiIncome>("/incomes", {
        method: "POST",
        token,
        body: JSON.stringify({ source: row.source, amount: toNumber(row.amount), date: row.date, ...(row.tagId ? { tagId: row.tagId } : {}) }),
      })
      setIncomes((prev) => [created, ...prev])
      toast.success("Receita duplicada.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar.")
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    const ids = pendingDelete
    setPendingDelete(null)
    setIsBusy(true)
    try {
      await Promise.all(ids.map((id) => apiFetch(`/incomes/${id}`, { method: "DELETE", token })))
      setIncomes((prev) => prev.filter((i) => !ids.includes(i.id)))
      setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))))
      toast.success(`${ids.length} receita${ids.length !== 1 ? "s" : ""} excluída${ids.length !== 1 ? "s" : ""}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsBusy(false)
    }
  }

  async function submitIncome(values: IncomeFormValues, current: ApiIncome | null) {
    if (!token) throw new Error("Sessão expirada.")
    const tagId = values.tagId === NONE ? null : values.tagId
    try {
      if (current) {
        const payload = { source: values.source, amount: values.amount, date: values.date, tagId }
        await apiFetch(`/incomes/${current.id}`, { method: "PUT", token, body: JSON.stringify(payload) })
        setIncomes((prev) => prev.map((i) => (i.id === current.id ? { ...i, ...payload } : i)))
        toast.success("Receita atualizada.")
      } else {
        const created = await apiFetch<ApiIncome>("/incomes", {
          method: "POST",
          token,
          body: JSON.stringify({ source: values.source, amount: values.amount, date: values.date, ...(tagId ? { tagId } : {}) }),
        })
        setIncomes((prev) => [created, ...prev])
        toast.success("Receita criada.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a receita.")
      throw err
    }
  }

  const hasNone = !isLoading && !loadError && scopeRows.length === 0

  return (
    <PageShell
      title="Receitas"
      subtitle={`Entradas de ${periodLabel}`}
      headerActions={
        <>
          <Button variant="outline" onClick={() => setTagsOpen(true)}>
            <Tag /> Tags
          </Button>
          <Button onClick={openCreate}>
            <Plus /> Nova receita
          </Button>
        </>
      }
    >
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label="Total do período"
            icon={TrendingUp}
            tone="income"
            value={formatBRL(stats.total)}
            delta={delta}
            footnote={delta ? `vs. ${stats.prevLabel}` : undefined}
          />
          <KpiCard
            label="Lançamentos"
            icon={Hash}
            tone="primary"
            value={String(scopeRows.length)}
            footnote={scopeRows.length === 1 ? "receita" : "receitas"}
          />
          <KpiCard
            label="Maior receita"
            icon={Trophy}
            tone="income"
            value={formatBRL(stats.biggest ? toNumber(stats.biggest.amount) : 0)}
            footnote={stats.biggest?.source ?? "—"}
          />
        </div>
      )}

      <Card className="gap-0 overflow-clip py-0" aria-label="Lista de receitas">
        <div className="grid grid-cols-2 gap-2 p-4 md:flex md:flex-wrap md:items-center md:px-5">
          <div className="relative col-span-2 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="h-10 pl-9"
              placeholder="Buscar fonte ou tag"
              aria-label="Buscar receitas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="h-10 w-full md:w-[170px]" aria-label="Filtrar por tag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              <SelectItem value={NONE}>Sem tag</SelectItem>
              {incomeTags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div role="group" aria-label="Período da lista" className="inline-flex rounded-lg bg-muted p-[3px]">
            {(
              [
                { v: "month", label: "Mês" },
                { v: "quarter", label: "Trimestre" },
                { v: "year", label: "Ano" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                aria-pressed={scope === o.v}
                onClick={() => setScope(o.v)}
                className={cn(
                  "h-[34px] flex-1 rounded-md px-3 text-[13px] font-medium text-muted-foreground",
                  scope === o.v && "bg-card text-foreground shadow-xs",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="num ml-auto hidden text-[13px] text-muted-foreground md:inline">
            {filteredRows.length} de {scopeRows.length}
          </span>
          <Button variant="outline" size="icon" className="hidden size-10 md:inline-flex" onClick={openCreate} aria-label="Nova receita" title="Nova receita">
            <Plus />
          </Button>
        </div>

        {filtersActive && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-5" aria-label="Filtros ativos">
            {search.trim() && (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-muted pl-2.5 pr-1 text-xs">
                <span className="text-muted-foreground">Busca:</span>
                <span className="font-medium">{search.trim()}</span>
                <button type="button" onClick={() => setSearch("")} aria-label="Remover filtro Busca" className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {tagFilter !== "all" && (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-muted pl-2.5 pr-1 text-xs">
                <span className="text-muted-foreground">Tag:</span>
                <span className="font-medium">{tagFilter === NONE ? "Sem tag" : tagName(tagFilter)}</span>
                <button type="button" onClick={() => setTagFilter("all")} aria-label="Remover filtro Tag" className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
              Limpar filtros
            </button>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div role="region" aria-label="Ações em massa" className="flex flex-wrap items-center gap-2 border-y bg-primary-soft px-4 py-2.5 md:px-5">
            <strong className="num text-sm">
              {selectedIds.length} selecionada{selectedIds.length !== 1 ? "s" : ""}
            </strong>
            <span className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => setPendingDelete(selectedIds)} disabled={isBusy}>
              <Trash2 /> Excluir
            </Button>
            <Button size="icon" variant="ghost" className="size-8" onClick={() => setSelected(new Set())} aria-label="Limpar seleção">
              <X />
            </Button>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : loadError ? (
          <div className="px-4 pb-6 md:px-5">
            <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
              <div className="min-w-0 flex-1 text-[13px]">
                <strong className="block text-sm font-semibold">Não foi possível carregar as receitas</strong>
                <span className="text-muted-foreground">{loadError} Seus lançamentos continuam salvos.</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw /> Tentar novamente
              </Button>
            </div>
          </div>
        ) : hasNone ? (
          <EmptyState
            className="border-t"
            icon={Inbox}
            title={`Nenhuma receita em ${periodLabel}`}
            description="Registre salário, freelas, rendimentos e outras entradas."
            action={
              <Button onClick={openCreate}>
                <Plus /> Nova receita
              </Button>
            }
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            className="border-t"
            icon={Search}
            title="Nenhuma receita encontrada"
            description="Nenhum lançamento corresponde à busca e aos filtros atuais."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <div className="border-t">
            <IncomesTable
              rows={filteredRows}
              tagName={tagName}
              tagIndex={(id) => (id ? (tagIndexById.get(id) ?? 0) : 0)}
              tagOptions={incomeTags}
              selected={new Set(selectedIds)}
              onSelectedChange={setSelected}
              sort={sort}
              onSortChange={changeSort}
              onChangeBasic={(row, patch) => void changeBasic(row, patch)}
              onChangeTag={(row, id) => void changeTag(row, id)}
              onEdit={openEdit}
              onDuplicate={duplicate}
              onDelete={(row) => setPendingDelete([row.id])}
              onAdd={openCreate}
            />
          </div>
        )}
      </Card>

      <TagsSheet open={tagsOpen} onOpenChange={setTagsOpen} defaultType="INCOME" onTagsChange={setTags} />

      <IncomeSheet open={sheetOpen} onOpenChange={setSheetOpen} income={editing} defaultDate={newIncomeDate()} tags={incomeTags} onSubmit={submitIncome} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete && pendingDelete.length > 1 ? `Excluir ${pendingDelete.length} receitas?` : "Excluir receita?"}</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void confirmDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
