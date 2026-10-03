"use client"

import * as React from "react"
import { redirect } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, RefreshCw, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiExpense, ApiTag, ApiCreditor } from "@/lib/finance-types"
import { MONTHS, formatBRL, isInMonth, toNumber } from "@/lib/finance-utils"
import { AI_ENABLED } from "@/components/dashboard/nav-config"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { KpiCard } from "@/components/finance/kpi-card"
import { KpiRowSkeleton } from "@/components/finance/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Texto da IA: parágrafos, listas com "-" ou "*" e **negrito**. */
function AiText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>,
    )
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n")
        const isList = lines.every((l) => /^\s*[-*•]\s+/.test(l))
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>
              ))}
            </ul>
          )
        }
        const heading = /^#{1,3}\s+(.*)$/.exec(block)
        if (heading) return <h3 key={i} className="pt-1 text-sm font-semibold">{inline(heading[1])}</h3>
        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}

function IaAnalysis() {
  const { token } = useAuth()
  const { month, year } = usePeriod()

  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [analysis, setAnalysis] = React.useState<{ text: string; month: number; year: number; count: number } | null>(null)
  const [isLoadingAi, setIsLoadingAi] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoadingData(true)
    setLoadError(null)
    try {
      const [i, e, t, c] = await Promise.all([
        apiFetch<ApiIncome[]>("/incomes", { token }),
        apiFetch<ApiExpense[]>("/expenses", { token }),
        apiFetch<ApiTag[]>("/tags", { token }),
        apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      ])
      setIncomes(i)
      setExpenses(e)
      setTags(t)
      setAllCreditors(c)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setIsLoadingData(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  // O que a IA vai analisar: lançamentos do mês do período
  const monthIncomes = React.useMemo(() => incomes.filter((i) => isInMonth(i.date, year, month)), [incomes, year, month])
  const monthExpenses = React.useMemo(() => expenses.filter((e) => isInMonth(e.date, year, month)), [expenses, year, month])
  const totalIncome = monthIncomes.reduce((s, i) => s + toNumber(i.amount), 0)
  const totalExpense = monthExpenses.reduce((s, e) => s + toNumber(e.amount), 0)
  const entries = monthIncomes.length + monthExpenses.length

  const monthName = MONTHS[month].label
  // a análise mostrada pode ser de outro mês se o período mudou depois
  const stale = !!analysis && (analysis.month !== month || analysis.year !== year)

  async function analyze() {
    if (!token) return
    setIsLoadingAi(true)
    setAnalysis(null)
    try {
      const monthCreditors = allCreditors
        .map((c) => {
          const list = monthExpenses.filter((e) => e.creditorId === c.id)
          const total = list.reduce((s, e) => s + toNumber(e.amount), 0)
          const paid = list.filter((e) => e.isPaid).reduce((s, e) => s + toNumber(e.amount), 0)
          return { name: c.name, totalAmount: total, paidAmount: paid, unpaidAmount: total - paid }
        })
        .filter((c) => c.totalAmount > 0)

      const payload = {
        month: month + 1,
        year,
        totalIncome,
        totalExpense,
        incomes: monthIncomes.map((i) => ({
          source: i.source,
          amount: toNumber(i.amount),
          tag: i.tagId ? tagById.get(i.tagId)?.name : undefined,
        })),
        expenses: monthExpenses.map((e) => ({
          item: e.item,
          amount: toNumber(e.amount),
          tag: e.tagId ? tagById.get(e.tagId)?.name : undefined,
          creditor: e.creditorId ? allCreditors.find((c) => c.id === e.creditorId)?.name : undefined,
          isPaid: e.isPaid,
        })),
        creditors: monthCreditors,
      }

      const { result } = await apiFetch<{ result: string }>("/ai/analyze", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      })
      setAnalysis({ text: result, month, year, count: entries })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao analisar dados.")
    } finally {
      setIsLoadingAi(false)
    }
  }

  return (
    <PageShell title="Análise com IA" subtitle={`Insights sobre ${monthName.toLowerCase()} de ${year}`}>
      {loadError && !isLoadingData ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar seus dados</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <CardContent className="flex flex-col gap-4 p-5 max-md:p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden>
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">Analisar {monthName.toLowerCase()}</h2>
                  <p className="mt-0.5 max-w-xl text-[13px] text-muted-foreground">
                    A IA lê suas receitas, despesas e credores do mês escolhido na barra superior e gera insights personalizados. Use as
                    setas do período para analisar outro mês.
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={() => void analyze()} disabled={isLoadingAi || isLoadingData || entries === 0} className="shrink-0">
                <Sparkles className={isLoadingAi ? "animate-pulse" : undefined} />
                {isLoadingAi ? "Analisando…" : "Analisar"}
              </Button>
            </CardContent>
          </Card>

          {isLoadingData ? (
            <KpiRowSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
              <KpiCard hero label="Saldo do mês" icon={Wallet} tone="primary" value={formatBRL(totalIncome - totalExpense)} valueClassName={totalIncome - totalExpense < 0 ? "text-expense" : undefined} footnote={`${entries} lançamento${entries !== 1 ? "s" : ""} para analisar`} />
              <KpiCard label="Receitas" icon={TrendingUp} tone="income" value={formatBRL(totalIncome)} footnote={`${monthIncomes.length} lançamento${monthIncomes.length !== 1 ? "s" : ""}`} />
              <KpiCard label="Despesas" icon={TrendingDown} tone="expense" value={formatBRL(totalExpense)} footnote={`${monthExpenses.length} lançamento${monthExpenses.length !== 1 ? "s" : ""}`} />
            </div>
          )}

          {!isLoadingData && entries === 0 && !analysis && !isLoadingAi && (
            <p className="rounded-xl border bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
              Não há lançamentos em {monthName.toLowerCase()} de {year}. Escolha outro mês na barra superior para analisar.
            </p>
          )}

          {isLoadingAi && (
            <Card className="gap-0 py-0" aria-busy="true">
              <CardContent className="space-y-3 p-5 max-md:p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
                  Gerando análise personalizada…
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          )}

          {analysis && !isLoadingAi && (
            <Card className="gap-0 py-0">
              <CardContent className="space-y-4 p-5 max-md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
                      <Sparkles className="size-4" />
                    </span>
                    <strong className="text-sm font-semibold">
                      Análise de {MONTHS[analysis.month].label.toLowerCase()} de {analysis.year}
                    </strong>
                  </div>
                  {stale && (
                    <Button size="sm" variant="outline" onClick={() => void analyze()} disabled={entries === 0}>
                      <RefreshCw /> Analisar {monthName.toLowerCase()}
                    </Button>
                  )}
                </div>
                <AiText text={analysis.text} />
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Baseado em {analysis.count} lançamento{analysis.count !== 1 ? "s" : ""}. A IA usa apenas os seus dados. É uma estimativa, não uma
                  recomendação financeira: confira valores importantes antes de decidir.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageShell>
  )
}

export default function IaPage() {
  if (!AI_ENABLED) redirect("/dashboard")
  return <IaAnalysis />
}
