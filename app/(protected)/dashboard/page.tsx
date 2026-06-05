"use client"

import * as React from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useSelectedYear } from "@/hooks/use-selected-year"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiExpense, ApiTag, ApiCreditor, MonthCardData } from "@/lib/finance-types"
import {
  MONTHS,
  spendConfig,
  toNumber,
  getQuarter,
  buildTopCategories,
  buildDonutData,
  formatBRL,
} from "@/lib/finance-utils"
import { MonthCard } from "@/components/dashboard/month-card"
import { CompactLegend } from "@/components/dashboard/compact-legend"
import { CreditorsSection } from "@/components/dashboard/creditors-section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  Label as RechartsLabel,
} from "recharts"

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

function InstallmentsSection({
  expenses,
  tagById,
  creditorById,
}: {
  expenses: import("@/lib/finance-types").ApiExpense[]
  tagById: Map<string, import("@/lib/finance-types").ApiTag>
  creditorById: Map<string, string>
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, {
      groupId: string
      item: string
      amount: number
      total: number
      paidCount: number
      tagName: string | null
      creditorName: string | null
    }>()

    expenses.forEach((e) => {
      if (!e.installmentGroupId) return
      const existing = map.get(e.installmentGroupId)
      if (!existing) {
        map.set(e.installmentGroupId, {
          groupId: e.installmentGroupId,
          item: e.item,
          amount: toNumber(e.amount),
          total: e.installmentTotal ?? 1,
          paidCount: e.isPaid ? 1 : 0,
          tagName: (e.tagId ? tagById.get(e.tagId)?.name : undefined) ?? null,
          creditorName: (e.creditorId ? creditorById.get(e.creditorId) : undefined) ?? null,
        })
      } else {
        if (e.isPaid) existing.paidCount++
      }
    })

    return Array.from(map.values())
      .filter((g) => g.paidCount < g.total)                               // só abertas
      .sort((a, b) => (a.total - a.paidCount) - (b.total - b.paidCount)) // menos restantes primeiro
  }, [expenses, tagById, creditorById])

  if (groups.length === 0) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">Compras Parceladas</span>
        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
          {groups.length} ativa{groups.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="divide-y divide-border/50">
          {groups.map((g) => {
            const pct = Math.round((g.paidCount / g.total) * 100)
            const remaining = g.total - g.paidCount
            const remainingValue = g.amount * remaining

            return (
              <div key={g.groupId} className="flex items-center gap-4 px-4 py-3">
                {/* Item name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground/90">{g.item}</span>
                    {g.tagName && (
                      <span className="shrink-0 rounded-full border border-border bg-accent/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {g.tagName}
                      </span>
                    )}
                    {g.creditorName && (
                      <span className="shrink-0 rounded-full border border-orange-500/15 bg-orange-500/8 px-1.5 py-0.5 text-[10px] text-orange-300/70">
                        {g.creditorName}
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-blue-400/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-500/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-blue-300">
                      {g.paidCount}/{g.total}
                    </span>
                  </div>
                </div>

                {/* Amounts */}
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground/80">
                    {formatBRL(g.amount)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {remaining} restante{remaining !== 1 ? "s" : ""} · {formatBRL(remainingValue)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()

  const [selectedYear, setSelectedYear] = useSelectedYear()
  const [selectedMonth, setSelectedMonth] = React.useState(String(currentMonthIndex))
  const [activeTab, setActiveTab] = React.useState(`q${getQuarter(currentMonthIndex)}`)
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoadingData(true)
    Promise.all([
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiIncome[]>("/incomes", { token }),
      apiFetch<ApiExpense[]>("/expenses", { token }),
      apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
    ])
      .then(([t, i, e, c]) => { if (!cancelled) { setTags(t); setIncomes(i); setExpenses(e); setAllCreditors(c) } })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.") })
      .finally(() => { if (!cancelled) setIsLoadingData(false) })
    return () => { cancelled = true }
  }, [token])

  const selectedYearNumber = Number(selectedYear)
  const selectedMonthIndex = Number(selectedMonth)

  const availableYears = React.useMemo(() => {
    const s = new Set<number>()
    incomes.forEach((i) => s.add(new Date(i.date).getFullYear()))
    expenses.forEach((e) => s.add(new Date(e.date).getFullYear()))
    s.add(currentYear)
    s.add(currentYear + 1)
    return Array.from(s).sort((a, b) => b - a)
  }, [incomes, expenses, currentYear])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const creditorById = React.useMemo(() => new Map(allCreditors.map((c) => [c.id, c.name])), [allCreditors])

  // Month cards (full year)
  const monthCards = React.useMemo((): MonthCardData[] => {
    const inc = Array(12).fill(0)
    const exp = Array(12).fill(0)
    incomes.forEach((i) => { const d = new Date(i.date); if (d.getFullYear() === selectedYearNumber) inc[d.getMonth()] += toNumber(i.amount) })
    expenses.forEach((e) => { const d = new Date(e.date); if (d.getFullYear() === selectedYearNumber) exp[d.getMonth()] += toNumber(e.amount) })
    return MONTHS.map((m, mi) => {
      const q = getQuarter(mi)
      return {
        key: `${selectedYear}-${mi}`,
        label: m.label,
        quarter: q,
        year: selectedYearNumber,
        income: inc[mi],
        expense: exp[mi],
        dotColor: q === 1 ? "var(--color-chart-1)" : q === 2 ? "var(--color-chart-2)" : q === 3 ? "var(--color-chart-3)" : "var(--color-chart-4)",
        isCurrentMonth: selectedYearNumber === currentYear && mi === currentMonthIndex,
      }
    })
  }, [incomes, expenses, selectedYearNumber, selectedYear, currentYear, currentMonthIndex])

  // Area chart — full year
  const monthlySpendData = React.useMemo(() => {
    const limit = selectedYearNumber === currentYear ? currentMonthIndex : 11
    return monthCards.slice(0, limit + 1).map((m, i) => ({ month: MONTHS[i].short, gastos: m.expense, receitas: m.income }))
  }, [monthCards, selectedYearNumber, currentYear, currentMonthIndex])

  // KPI data — selected month
  const kpiData = React.useMemo(() => {
    const curr = monthCards[selectedMonthIndex]
    const prevIdx = selectedMonthIndex - 1
    const prev = prevIdx >= 0 ? monthCards[prevIdx] : null
    const pendentes = expenses
      .filter((e) => { const d = new Date(e.date); return !e.isPaid && d.getFullYear() === selectedYearNumber && d.getMonth() === selectedMonthIndex })
      .reduce((s, e) => s + toNumber(e.amount), 0)
    const income = curr?.income ?? 0
    const expense = curr?.expense ?? 0
    return {
      income,
      expense,
      balance: income - expense,
      pendentes,
      incomeDelta: prev ? pctDelta(income, prev.income) : null,
      expenseDelta: prev ? pctDelta(expense, prev.expense) : null,
    }
  }, [monthCards, selectedMonthIndex, expenses, selectedYearNumber])

  // Donuts — selected month
  const { incomesData, incomesConfig, totalIncome } = React.useMemo(() => {
    const totals = new Map<string, number>()
    incomes.forEach((i) => {
      const d = new Date(i.date)
      if (d.getFullYear() !== selectedYearNumber || d.getMonth() !== selectedMonthIndex) return
      const k = (i.tagId ? tagById.get(i.tagId)?.name : undefined) || i.source || "Outros"
      totals.set(k, (totals.get(k) ?? 0) + toNumber(i.amount))
    })
    const { data, config } = buildDonutData(buildTopCategories(Array.from(totals.entries()), 4))
    return { incomesData: data, incomesConfig: config, totalIncome: data.reduce((s, d) => s + d.value, 0) }
  }, [incomes, tagById, selectedYearNumber, selectedMonthIndex])

  const { expensesData, expensesConfig, totalExpense } = React.useMemo(() => {
    const totals = new Map<string, number>()
    expenses.forEach((e) => {
      const d = new Date(e.date)
      if (d.getFullYear() !== selectedYearNumber || d.getMonth() !== selectedMonthIndex) return
      const k = (e.tagId ? tagById.get(e.tagId)?.name : undefined) || e.item || "Outros"
      totals.set(k, (totals.get(k) ?? 0) + toNumber(e.amount))
    })
    const { data, config } = buildDonutData(buildTopCategories(Array.from(totals.entries()), 4))
    return { expensesData: data, expensesConfig: config, totalExpense: data.reduce((s, d) => s + d.value, 0) }
  }, [expenses, tagById, selectedYearNumber, selectedMonthIndex])

  // Top 6 despesas — selected month
  const topExpenses = React.useMemo(() => {
    return expenses
      .filter((e) => { const d = new Date(e.date); return d.getFullYear() === selectedYearNumber && d.getMonth() === selectedMonthIndex })
      .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
      .slice(0, 6)
  }, [expenses, selectedYearNumber, selectedMonthIndex])

  // Bar chart saldo — full year
  const balanceBarData = React.useMemo(() => {
    const limit = selectedYearNumber === currentYear ? currentMonthIndex : 11
    return monthCards.slice(0, limit + 1).map((m, i) => ({ month: MONTHS[i].short, saldo: m.income - m.expense }))
  }, [monthCards, selectedYearNumber, currentYear, currentMonthIndex])

  const monthsWithInstallments = React.useMemo(() => {
    const s = new Set<number>()
    expenses.forEach((e) => { if (e.installmentGroupId) s.add(new Date(e.date).getMonth()) })
    return s
  }, [expenses])

  const monthLabel = MONTHS[selectedMonthIndex]?.label ?? ""

  // ── KPI card component ───────────────────────────────────────────────────
  function KpiCard({
    label, value, delta, icon: Icon,
    valueClass = "text-white",
    iconClass = "bg-white/10 text-white/60",
  }: {
    label: string; value: string; delta?: number | null
    icon: React.ComponentType<{ className?: string }>
    valueClass?: string; iconClass?: string
  }) {
    return (
      <div className="relative overflow-hidden rounded-2xl p-5">
        <div className="absolute inset-0 rounded-2xl border border-border bg-card backdrop-blur-sm" />
        <div className="relative z-10">
          <div className="mb-3 flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <div className={`rounded-xl p-2 ${iconClass}`}>
              <Icon className="size-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
          {delta != null && (
            <div className={`mt-1.5 flex items-center gap-1 text-xs ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {delta >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {Math.abs(delta).toFixed(1)}% vs mês anterior
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-24 pt-6 sm:px-6 md:pb-8">

      {/* Header — filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground sm:text-2xl">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          Dashboard
          {isLoadingData && <span className="ml-2 text-sm font-normal text-muted-foreground">Carregando...</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-border bg-background text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={`Receita — ${monthLabel}`}
          value={fmt(kpiData.income)}
          delta={kpiData.incomeDelta}
          icon={TrendingUp}
          valueClass="text-emerald-400"
          iconClass="bg-emerald-500/15 text-emerald-400"
        />
        <KpiCard
          label={`Despesa — ${monthLabel}`}
          value={fmt(kpiData.expense)}
          delta={kpiData.expenseDelta}
          icon={TrendingDown}
          valueClass="text-red-400"
          iconClass="bg-red-500/15 text-red-400"
        />
        <KpiCard
          label="Saldo do mês"
          value={fmt(kpiData.balance)}
          icon={Wallet}
          valueClass={kpiData.balance >= 0 ? "text-emerald-400" : "text-red-400"}
          iconClass={kpiData.balance >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}
        />
        <KpiCard
          label="Pendências"
          value={fmt(kpiData.pendentes)}
          icon={DollarSign}
          valueClass="text-orange-400"
          iconClass="bg-orange-500/15 text-orange-400"
        />
      </div>

      {/* Gráfico de área + 2 donuts (layout 6+3+3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6 border-border bg-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receitas e despesas — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={spendConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={monthlySpendData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(v) => (
                        <span className="font-mono font-medium tabular-nums text-foreground">{fmt(Number(v))}</span>
                      )}
                    />
                  }
                />
                <Area dataKey="receitas" type="monotone" stroke="var(--color-receitas)" fill="var(--color-receitas)" fillOpacity={0.15} strokeWidth={2} />
                <Area dataKey="gastos" type="monotone" stroke="var(--color-gastos)" fill="var(--color-gastos)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border bg-card backdrop-blur-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">Receitas por categoria</CardTitle>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={incomesConfig} className="aspect-square h-[200px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" formatter={(v) => <span className="font-mono tabular-nums text-foreground">{fmt(Number(v))}</span>} />} />
                <Pie data={incomesData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} stroke="transparent">
                  <RechartsLabel content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                    const cx = viewBox.cx as number
                    const cy = viewBox.cy as number
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan className="fill-foreground text-base font-bold">{fmt(totalIncome)}</tspan>
                        <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-[10px]">Total</tspan>
                      </text>
                    )
                  }} />
                </Pie>
              </PieChart>
            </ChartContainer>
            <CompactLegend data={incomesData} config={incomesConfig} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-border bg-card backdrop-blur-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">Despesas por categoria</CardTitle>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={expensesConfig} className="aspect-square h-[200px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" formatter={(v) => <span className="font-mono tabular-nums text-foreground">{fmt(Number(v))}</span>} />} />
                <Pie data={expensesData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} stroke="transparent">
                  <RechartsLabel content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                    const cx = viewBox.cx as number
                    const cy = viewBox.cy as number
                    return (
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan className="fill-foreground text-base font-bold">{fmt(totalExpense)}</tspan>
                        <tspan x={cx} y={cy + 16} className="fill-muted-foreground text-[10px]">Total</tspan>
                      </text>
                    )
                  }} />
                </Pie>
              </PieChart>
            </ChartContainer>
            <CompactLegend data={expensesData} config={expensesConfig} />
          </CardContent>
        </Card>
      </div>

      {/* Maiores despesas + saldo mensal (layout 6+6) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top 6 despesas */}
        <Card className="border-border bg-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Maiores despesas — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {topExpenses.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma despesa em {monthLabel}.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {topExpenses.map((exp, idx) => {
                  const tagName = exp.tagId ? tagById.get(exp.tagId)?.name : null
                  const maxAmt = toNumber(topExpenses[0]?.amount ?? 0)
                  const pct = maxAmt > 0 ? (toNumber(exp.amount) / maxAmt) * 100 : 0
                  return (
                    <div key={exp.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-4 shrink-0 text-xs tabular-nums text-muted-foreground/50">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm text-foreground/90">{exp.item}</span>
                          <span className={`shrink-0 text-sm font-semibold tabular-nums ${exp.isPaid ? "text-emerald-400" : "text-red-400"}`}>
                            {fmt(toNumber(exp.amount))}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                            <div className="h-full rounded-full bg-red-400/50" style={{ width: `${pct}%` }} />
                          </div>
                          {tagName && (
                            <span className="shrink-0 rounded-full border border-border bg-accent/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {tagName}
                            </span>
                          )}
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${exp.isPaid ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                            {exp.isPaid ? "Pago" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldo mensal — bar chart */}
        <Card className="border-border bg-card backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo mensal — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ saldo: { label: "Saldo" } }} className="aspect-auto h-[220px] w-full">
              <BarChart data={balanceBarData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(v) => (
                        <span className={`font-mono font-medium tabular-nums ${Number(v) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmt(Number(v))}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="saldo" radius={4}>
                  {balanceBarData.map((entry, i) => (
                    <Cell key={`c-${i}`} fill={entry.saldo >= 0 ? "rgba(52,211,153,0.65)" : "rgba(248,113,113,0.65)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Compras Parceladas */}
      <InstallmentsSection expenses={expenses} tagById={tagById} creditorById={creditorById} />

      {/* Credores */}
      <div className="rounded-2xl border border-border bg-card p-5 backdrop-blur-sm">
        <CreditorsSection availableYears={availableYears} expenses={expenses} />
      </div>

      {/* Month cards */}
      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Resumo por mês — {selectedYear}</p>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap gap-y-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="q1">1º tri</TabsTrigger>
            <TabsTrigger value="q2">2º tri</TabsTrigger>
            <TabsTrigger value="q3">3º tri</TabsTrigger>
            <TabsTrigger value="q4">4º tri</TabsTrigger>
          </TabsList>
          {(["all", "q1", "q2", "q3", "q4"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {monthCards
                  .filter((m) => tab === "all" || `q${m.quarter}` === tab)
                  .map((month) => (
                    <MonthCard
                      key={month.key}
                      month={month}
                      hasInstallments={monthsWithInstallments.has(Number(month.key.split("-")[1]))}
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

    </div>
  )
}
