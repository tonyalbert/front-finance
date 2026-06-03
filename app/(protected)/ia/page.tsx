"use client"

import * as React from "react"
import { toast } from "sonner"
import { Brain } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiExpense, ApiTag, ApiCreditor } from "@/lib/finance-types"
import { MONTHS, toNumber } from "@/lib/finance-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function IaPage() {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])

  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)

  const [aiAnalysis, setAiAnalysis] = React.useState<string>("")
  const [isLoadingAi, setIsLoadingAi] = React.useState(false)
  const [aiMonth, setAiMonth] = React.useState<string>(String(now.getMonth() + 1))
  const [aiYear, setAiYear] = React.useState<string>(String(now.getFullYear()))

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoadingData(true)
    Promise.all([
      apiFetch<ApiIncome[]>("/incomes", { token }),
      apiFetch<ApiExpense[]>("/expenses", { token }),
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
    ])
      .then(([incomesRes, expensesRes, tagsRes, creditorsRes]) => {
        if (cancelled) return
        setIncomes(incomesRes)
        setExpenses(expensesRes)
        setTags(tagsRes)
        setAllCreditors(creditorsRes)
      })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.") })
      .finally(() => { if (!cancelled) setIsLoadingData(false) })
    return () => { cancelled = true }
  }, [token])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const availableYears = React.useMemo(() => {
    const years = new Set<number>()
    for (const inc of incomes) years.add(new Date(inc.date).getFullYear())
    for (const exp of expenses) years.add(new Date(exp.date).getFullYear())
    const current = now.getFullYear()
    years.add(current)
    return Array.from(years).sort((a, b) => b - a)
  }, [incomes, expenses, now])

  async function handleAiAnalysis() {
    if (!token) return
    setIsLoadingAi(true)
    setAiAnalysis("")
    try {
      const monthNum = Number(aiMonth)
      const yearNum = Number(aiYear)
      const monthIncomes = incomes.filter((i) => {
        const d = new Date(i.date)
        return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum
      })
      const monthExpenses = expenses.filter((e) => {
        const d = new Date(e.date)
        return d.getMonth() + 1 === monthNum && d.getFullYear() === yearNum
      })
      const monthCreditors = allCreditors
        .map((c) => {
          const cExpenses = monthExpenses.filter((e) => e.creditorId === c.id)
          const total = cExpenses.reduce((s, e) => s + toNumber(e.amount), 0)
          const paid = cExpenses.filter((e) => e.isPaid).reduce((s, e) => s + toNumber(e.amount), 0)
          return { name: c.name, totalAmount: total, paidAmount: paid, unpaidAmount: total - paid }
        })
        .filter((c) => c.totalAmount > 0)

      const payload = {
        month: monthNum,
        year: yearNum,
        totalIncome: monthIncomes.reduce((s, i) => s + toNumber(i.amount), 0),
        totalExpense: monthExpenses.reduce((s, e) => s + toNumber(e.amount), 0),
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
      setAiAnalysis(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao analisar dados.")
    } finally {
      setIsLoadingAi(false)
    }
  }

  return (
    <PageShell title="Análise com IA">
      {isLoadingData && <p className="text-sm text-white/40">Carregando dados...</p>}

      <div className="max-w-2xl space-y-6">
        {/* Controls */}
        <div className="relative overflow-hidden rounded-2xl p-5">
          <div className="absolute inset-0 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm" />
          <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
              <Brain className="size-5 text-red-400" />
              <h2 className="text-sm font-semibold text-white">Selecione o período</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={aiMonth} onValueChange={setAiMonth}>
                <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={aiYear} onValueChange={setAiYear}>
                <SelectTrigger className="w-[100px] border-white/10 bg-white/5 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAiAnalysis}
                disabled={isLoadingAi || isLoadingData}
                className="bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-400"
              >
                <Brain className="mr-2 size-4" />
                {isLoadingAi ? "Analisando..." : "Analisar"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/40">
              A IA analisa suas receitas, despesas e credores do mês selecionado e gera insights personalizados.
            </p>
          </div>
        </div>

        {/* Result */}
        {(aiAnalysis || isLoadingAi) && (
          <Card className="border-red-500/15 bg-red-950/20 backdrop-blur-sm">
            <CardContent className="p-5">
              {isLoadingAi ? (
                <div className="flex items-center gap-3">
                  <Brain className="size-5 animate-pulse text-red-400" />
                  <p className="text-sm text-white/50">Gerando análise personalizada...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="size-4 text-red-400" />
                    <span className="text-xs font-semibold text-red-300">
                      Análise — {MONTHS[Number(aiMonth) - 1]?.label} {aiYear}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {aiAnalysis}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  )
}
