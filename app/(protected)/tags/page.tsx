"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertCircle, Pencil, Plus, RefreshCw, Tag } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiExpense, ApiIncome, ApiTag } from "@/lib/finance-types"
import { MONTHS, formatBRL, isInMonth, toNumber } from "@/lib/finance-utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { tagColor } from "@/components/finance/inline-edit"
import { TableSkeleton } from "@/components/finance/skeletons"
import { TagFormSheet } from "@/components/tags/tag-form-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TagsPage() {
  const { token } = useAuth()
  const { month, year } = usePeriod()

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiTag | null>(null)
  const [newType, setNewType] = React.useState<ApiTag["type"]>("EXPENSE")

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [t, e, i] = await Promise.all([
        apiFetch<ApiTag[]>("/tags", { token }),
        apiFetch<ApiExpense[]>("/expenses", { token }),
        apiFetch<ApiIncome[]>("/incomes", { token }),
      ])
      setTags(t)
      setExpenses(e)
      setIncomes(i)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados."
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  // Totais do mês do período, por tag
  const stats = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    const add = (tagId: string | null, amount: unknown) => {
      if (!tagId) return
      const cur = map.get(tagId) ?? { count: 0, total: 0 }
      map.set(tagId, { count: cur.count + 1, total: cur.total + toNumber(amount) })
    }
    expenses.forEach((e) => isInMonth(e.date, year, month) && add(e.tagId, e.amount))
    incomes.forEach((i) => isInMonth(i.date, year, month) && add(i.tagId, i.amount))
    return map
  }, [expenses, incomes, year, month])

  const monthLabel = `${MONTHS[month].label.toLowerCase()} de ${year}`

  function openNew(type: ApiTag["type"]) {
    setEditing(null)
    setNewType(type)
    setFormOpen(true)
  }

  const groups = [
    { type: "EXPENSE" as const, title: "Despesa", noun: "despesa", tone: "text-expense" },
    { type: "INCOME" as const, title: "Receita", noun: "receita", tone: "text-income" },
  ]

  return (
    <PageShell
      title="Tags"
      subtitle="Categorias usadas em receitas e despesas"
      headerActions={
        <Button onClick={() => openNew("EXPENSE")}>
          <Plus /> Nova tag
        </Button>
      }
    >
      {loadError && !isLoading ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar as tags</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => {
            const list = tags.filter((t) => t.type === g.type)
            return (
              <Card key={g.type} className="gap-0 py-0" aria-labelledby={`h-tags-${g.type}`}>
                <CardHeader className="flex-row items-start justify-between gap-3 px-5 pb-0 pt-[18px] max-md:px-4">
                  <div>
                    <CardTitle id={`h-tags-${g.type}`} className="text-[15px] font-semibold tracking-tight">
                      {g.title}
                    </CardTitle>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">Totais de {monthLabel}</p>
                  </div>
                  <Badge variant="outline" className="num">
                    {list.length} tag{list.length !== 1 ? "s" : ""}
                  </Badge>
                </CardHeader>
                <CardContent className="px-5 pb-3 pt-2 max-md:px-4">
                  {isLoading ? (
                    <TableSkeleton rows={4} cols={3} />
                  ) : list.length === 0 ? (
                    <EmptyState
                      icon={Tag}
                      title={`Nenhuma tag de ${g.noun}`}
                      description="Crie uma tag para classificar seus lançamentos."
                      action={
                        <Button variant="outline" onClick={() => openNew(g.type)}>
                          <Plus /> Nova tag
                        </Button>
                      }
                      className="py-8"
                    />
                  ) : (
                    <ul className="divide-y">
                      {list.map((t) => {
                        const s = stats.get(t.id)
                        return (
                          <li key={t.id} className="flex min-h-14 items-center gap-3 py-2.5">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: tagColor(tags.findIndex((x) => x.id === t.id)) }}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1 leading-tight">
                              <strong className="block truncate text-sm font-medium">{t.name}</strong>
                              <span className="num text-xs text-muted-foreground">
                                {s ? `${s.count} ${g.noun}${s.count !== 1 ? "s" : ""}` : `Sem ${g.noun}s no mês`}
                              </span>
                            </div>
                            <span className={`num text-sm font-medium ${s ? "" : "text-muted-foreground"}`}>
                              {formatBRL(s?.total ?? 0)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 max-md:size-11"
                              aria-label={`Editar tag ${t.name}`}
                              onClick={() => {
                                setEditing(t)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <TagFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        tag={editing}
        defaultType={newType}
        onSaved={(saved) => setTags((prev) => (prev.some((t) => t.id === saved.id) ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]))}
        onDeleted={(id) => setTags((prev) => prev.filter((t) => t.id !== id))}
      />
    </PageShell>
  )
}
