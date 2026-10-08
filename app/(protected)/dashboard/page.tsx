"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertCircle, CalendarCheck, Plus, TrendingDown, TrendingUp, Wallet, Clock, PieChart as PieIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Pie, ReferenceArea, PieChart, XAxis, YAxis, Label as RechartsLabel } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiIncome, ApiExpense, ApiTag, ApiCreditor, ApiSavingsGoal, MonthCardData } from "@/lib/finance-types"
import { savedInMonth } from "@/lib/savings-utils"
import { competenceKey } from "@/lib/fixed-expense-utils"
import {
  MONTHS,
  spendConfig,
  toNumber,
  getQuarter,
  buildTopCategories,
  buildDonutData,
  formatBRL,
  getExpenseStatus,
  isInMonth,
  utcParts,
} from "@/lib/finance-utils"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { MonthCard } from "@/components/dashboard/month-card"
import { CreditorsSection } from "@/components/dashboard/creditors-section"
import { FixedExpensesSummary } from "@/components/dashboard/fixed-expenses-summary"
import { SavingsGoalsSummary } from "@/components/dashboard/savings-goals-summary"
import { InstallmentsSection } from "@/components/dashboard/installments-section"
import { KpiCard, type KpiDelta } from "@/components/finance/kpi-card"
import { StatusBadge } from "@/components/finance/status-badge"
import { InstallmentBadge } from "@/components/finance/installment-badge"
import { EmptyState } from "@/components/finance/empty-state"
import { ChartSkeleton, KpiRowSkeleton } from "@/components/finance/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

function fmtShort(v: unknown): string {
  const n = Number(v)
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}

/** Rótulo de barra: R$ 5.123 (sem centavos; o valor exato fica no tooltip) */
function fmtLabel(v: unknown): string {
  const n = Number(v)
  if (!n) return "R$ 0,00"
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
}

/**
 * Tick do eixo X em 3 linhas: mês, receita e despesa. Os valores ficam abaixo das barras,
 * cada um na sua linha, então nunca colidem, por maior que seja o texto.
 */
function MonthTick({
  x,
  y,
  payload,
  selectedIndex,
  data,
}: {
  x?: number
  y?: number
  payload?: { value: string; index: number }
  selectedIndex: number
  data: { receitas: number; gastos: number }[]
}) {
  const i = payload?.index ?? 0
  const selected = i === selectedIndex
  const row = data[i]
  const cx = x ?? 0
  const top = (y ?? 0) + 6
  return (
    <g>
      <text
        x={cx}
        y={top}
        textAnchor="middle"
        dominantBaseline="hanging"
        className={selected ? "fill-foreground" : "fill-muted-foreground"}
        fontSize={12}
        fontWeight={selected ? 700 : 500}
      >
        {payload?.value}
      </text>
      {row && (
        <>
          <circle cx={cx - 31} cy={top + 25} r={3} fill="var(--series-in)" />
          <text x={cx - 25} y={top + 25} dominantBaseline="central" className="num fill-foreground" fontSize={11}>
            {fmtLabel(row.receitas)}
          </text>
          <circle cx={cx - 31} cy={top + 42} r={3} fill="var(--series-out)" />
          <text x={cx - 25} y={top + 42} dominantBaseline="central" className="num fill-foreground" fontSize={11}>
            {fmtLabel(row.gastos)}
          </text>
        </>
      )}
    </g>
  )
}
function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

function makeDelta(pct: number | null, upIsGood: boolean): KpiDelta | undefined {
  if (pct == null) return undefined
  const rounded = Math.round(pct * 10) / 10
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat"
  const sentiment = rounded === 0 ? "neutral" : (rounded > 0) === upIsGood ? "good" : "bad"
  const text = `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  return { text, direction, sentiment }
}

/** Dia do mês exibido (mesmo critério UTC de formatDateDisplay). */
function dayOf(date: string) {
  const d = new Date(date)
  return Number.isNaN(d.getTime()) ? "—" : String(d.getUTCDate()).padStart(2, "0")
}

function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 px-5 pb-0 pt-[18px] max-md:px-4">
        <div className="min-w-0">
          <CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3 max-md:px-4">{children}</CardContent>
    </Card>
  )
}

function CategoryDonut({
  data,
  config,
  total,
  countLabel,
  emptyTitle,
}: {
  data: { name: string; value: number; fill: string }[]
  config: React.ComponentProps<typeof ChartContainer>["config"]
  total: number
  countLabel: string
  emptyTitle: string
}) {
  if (data.length === 0) {
    return <EmptyState icon={PieIcon} title={emptyTitle} className="py-8" />
  }
  return (
    <div className="flex flex-col gap-5">
      <ChartContainer config={config} className="mx-auto aspect-square h-[188px] w-[188px]">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                nameKey="name"
                formatter={(v) => <span className="num font-medium text-foreground">{formatBRL(Number(v))}</span>}
              />
            }
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} stroke="var(--card)" strokeWidth={2}>
            <RechartsLabel
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                const cx = viewBox.cx as number
                const cy = viewBox.cy as number
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan className="num fill-foreground text-[17px] font-semibold">{formatBRL(total)}</tspan>
                    <tspan x={cx} y={cy + 18} className="fill-muted-foreground text-xs">
                      {countLabel}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.name} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[13px]">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: d.fill }} aria-hidden />
            <span className="truncate">{d.name}</span>
            <span className="num">{formatBRL(d.value)}</span>
            <span className="num w-11 text-right text-muted-foreground">
              {total > 0 ? ((d.value / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0,0"}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const { month: selectedMonthIndex, year: selectedYearNumber, setMonth } = usePeriod()
  const now = React.useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()

  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [incomes, setIncomes] = React.useState<ApiIncome[]>([])
  const [expenses, setExpenses] = React.useState<ApiExpense[]>([])
  const [allCreditors, setAllCreditors] = React.useState<ApiCreditor[]>([])
  const [goals, setGoals] = React.useState<ApiSavingsGoal[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(true)
  const [payingId, setPayingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoadingData(true)
    Promise.all([
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiIncome[]>("/incomes", { token }),
      apiFetch<ApiExpense[]>("/expenses", { token }),
      apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      // Metas sao opcionais no dashboard: falha nelas nao derruba o resto.
      apiFetch<ApiSavingsGoal[]>("/savings-goals", { token }).catch(() => [] as ApiSavingsGoal[]),
    ])
      .then(([t, i, e, c, g]) => {
        if (!cancelled) {
          setGoals(g)
          setTags(t)
          setIncomes(i)
          setExpenses(e)
          setAllCreditors(c)
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.")
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const tagById = React.useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const creditorById = React.useMemo(() => new Map(allCreditors.map((c) => [c.id, c.name])), [allCreditors])

  const inPeriod = React.useCallback(
    (date: string, year = selectedYearNumber, month = selectedMonthIndex) => {
      return isInMonth(date, year, month)
    },
    [selectedYearNumber, selectedMonthIndex],
  )

  // ── Depende só do ANO do período ─────────────────────────────────────────
  const monthCards = React.useMemo((): MonthCardData[] => {
    const inc = Array(12).fill(0)
    const exp = Array(12).fill(0)
    incomes.forEach((i) => {
      const p = utcParts(i.date)
      if (p && p.year === selectedYearNumber) inc[p.month] += toNumber(i.amount)
    })
    expenses.forEach((e) => {
      const p = utcParts(e.date)
      if (p && p.year === selectedYearNumber) exp[p.month] += toNumber(e.amount)
    })
    return MONTHS.map((m, mi) => {
      const q = getQuarter(mi)
      return {
        key: `${selectedYearNumber}-${mi}`,
        label: m.label,
        quarter: q,
        year: selectedYearNumber,
        income: inc[mi],
        expense: exp[mi],
        dotColor: `var(--chart-${q})`,
        isCurrentMonth: selectedYearNumber === currentYear && mi === currentMonthIndex,
      }
    })
  }, [incomes, expenses, selectedYearNumber, currentYear, currentMonthIndex])

  const yearChartData = React.useMemo(
    () =>
      monthCards.map((m, i) => ({
        month: MONTHS[i].short,
        index: i,
        receitas: m.income,
        gastos: m.expense,
        saldo: m.income - m.expense,
      })),
    [monthCards],
  )
  const yearIncome = monthCards.reduce((s, m) => s + m.income, 0)
  const yearExpense = monthCards.reduce((s, m) => s + m.expense, 0)

  // ── Depende do MÊS do período ────────────────────────────────────────────
  const kpiData = React.useMemo(() => {
    const prevMonth = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1
    const prevYear = selectedMonthIndex === 0 ? selectedYearNumber - 1 : selectedYearNumber
    const sum = <T extends { date: string; amount: unknown }>(list: T[], y: number, m: number, filter?: (x: T) => boolean) =>
      list
        .filter((x) => inPeriod(x.date, y, m) && (!filter || filter(x)))
        .reduce((s, x) => s + toNumber(x.amount), 0)
    const income = sum(incomes, selectedYearNumber, selectedMonthIndex)
    const expense = sum(expenses, selectedYearNumber, selectedMonthIndex)
    // Guardado nas metas NAO e despesa: sai do saldo como categoria propria.
    const saved = savedInMonth(goals, competenceKey(selectedYearNumber, selectedMonthIndex + 1))
    const pending = expenses.filter((e) => !e.isPaid && inPeriod(e.date))
    return {
      income,
      expense,
      saved,
      balance: income - expense - saved,
      pendingTotal: pending.reduce((s, e) => s + toNumber(e.amount), 0),
      pendingCount: pending.length,
      incomeDelta: pctDelta(income, sum(incomes, prevYear, prevMonth)),
      expenseDelta: pctDelta(expense, sum(expenses, prevYear, prevMonth)),
      prevLabel: MONTHS[prevMonth].label.toLowerCase(),
    }
  }, [incomes, expenses, goals, selectedYearNumber, selectedMonthIndex, inPeriod])

  const { incomesData, incomesConfig, totalIncome, incomeCount } = React.useMemo(() => {
    const totals = new Map<string, number>()
    let count = 0
    incomes.forEach((i) => {
      if (!inPeriod(i.date)) return
      count++
      const k = (i.tagId ? tagById.get(i.tagId)?.name : undefined) || i.source || "Outros"
      totals.set(k, (totals.get(k) ?? 0) + toNumber(i.amount))
    })
    const { data, config } = buildDonutData(buildTopCategories(Array.from(totals.entries()), 4))
    return { incomesData: data, incomesConfig: config, totalIncome: data.reduce((s, d) => s + d.value, 0), incomeCount: count }
  }, [incomes, tagById, inPeriod])

  const { expensesData, expensesConfig, totalExpense, expenseCount } = React.useMemo(() => {
    const totals = new Map<string, number>()
    let count = 0
    expenses.forEach((e) => {
      if (!inPeriod(e.date)) return
      count++
      const k = (e.tagId ? tagById.get(e.tagId)?.name : undefined) || e.item || "Outros"
      totals.set(k, (totals.get(k) ?? 0) + toNumber(e.amount))
    })
    const { data, config } = buildDonutData(buildTopCategories(Array.from(totals.entries()), 4))
    return { expensesData: data, expensesConfig: config, totalExpense: data.reduce((s, d) => s + d.value, 0), expenseCount: count }
  }, [expenses, tagById, inPeriod])

  const topExpenses = React.useMemo(
    () =>
      expenses
        .filter((e) => inPeriod(e.date))
        .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
        .slice(0, 6),
    [expenses, inPeriod],
  )

  const upcoming = React.useMemo(
    () =>
      expenses
        .filter((e) => !e.isPaid && inPeriod(e.date))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5),
    [expenses, inPeriod],
  )

  // ── Independe do período ─────────────────────────────────────────────────
  const late = React.useMemo(() => {
    const list = expenses.filter((e) => getExpenseStatus(e, now) === "late")
    return { count: list.length, total: list.reduce((s, e) => s + toNumber(e.amount), 0) }
  }, [expenses, now])

  async function markPaid(id: string) {
    if (!token) return
    setPayingId(id)
    try {
      await apiFetch(`/expenses/${id}`, { method: "PUT", token, body: JSON.stringify({ isPaid: true }) })
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, isPaid: true } : e)))
      toast.success("Despesa marcada como paga.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar a despesa.")
    } finally {
      setPayingId(null)
    }
  }

  const monthName = MONTHS[selectedMonthIndex].label
  const monthLower = `${monthName.toLowerCase()} de ${selectedYearNumber}`

  return (
    <PageShell
      title="Visão geral"
      subtitle={`Resumo de ${monthLower}`}
      headerActions={
        <>
          <Button variant="outline" asChild>
            <Link href="/receitas?nova=1">
              <Plus /> Nova receita
            </Link>
          </Button>
          <Button asChild>
            <Link href="/despesas?nova=1">
              <Plus /> Nova despesa
            </Link>
          </Button>
        </>
      }
    >
      {late.count > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">
              {late.count} despesa{late.count !== 1 ? "s" : ""} atrasada{late.count !== 1 ? "s" : ""}
            </strong>
            <span className="text-muted-foreground">Somam {formatBRL(late.total)} em aberto com vencimento já passado.</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/despesas?status=atrasado">Ver atrasadas</Link>
          </Button>
        </div>
      )}

      {/* Cards do topo: mês do período */}
      {isLoadingData ? (
        <KpiRowSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] sm:gap-4">
          <KpiCard
            hero
            label={kpiData.saved !== 0 ? "Livre no período" : "Saldo do período"}
            icon={Wallet}
            tone="primary"
            value={formatBRL(kpiData.balance)}
            valueClassName={kpiData.balance < 0 ? "text-expense" : undefined}
            footnote={kpiData.saved !== 0 ? `${monthName} · ${formatBRL(kpiData.saved)} guardado em metas` : monthName}
          />
          <KpiCard
            label="Receitas"
            icon={TrendingUp}
            tone="income"
            value={formatBRL(kpiData.income)}
            delta={makeDelta(kpiData.incomeDelta, true)}
            footnote={kpiData.incomeDelta != null ? `vs. ${kpiData.prevLabel}` : undefined}
          />
          <KpiCard
            label="Despesas"
            icon={TrendingDown}
            tone="expense"
            value={formatBRL(kpiData.expense)}
            delta={makeDelta(kpiData.expenseDelta, false)}
            footnote={kpiData.expenseDelta != null ? `vs. ${kpiData.prevLabel}` : undefined}
          />
          <KpiCard
            label="A pagar"
            icon={Clock}
            tone="warning"
            value={formatBRL(kpiData.pendingTotal)}
            footnote={`${kpiData.pendingCount} conta${kpiData.pendingCount !== 1 ? "s" : ""} pendente${kpiData.pendingCount !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      {/* Receitas × despesas (ano), com rótulos de dados */}
      <SectionCard title="Receitas × despesas" description={`Por mês, em ${selectedYearNumber}`}>
        {isLoadingData ? (
          <ChartSkeleton />
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-[3px] bg-series-in" aria-hidden />
                Receitas <strong className="num font-semibold">{formatBRL(yearIncome)}</strong>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-[3px] bg-series-out" aria-hidden />
                Despesas <strong className="num font-semibold">{formatBRL(yearExpense)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <ChartContainer config={spendConfig} className="aspect-auto h-[360px] w-full min-w-[860px]">
                <BarChart data={yearChartData} barGap={3} barCategoryGap="10%" margin={{ left: 0, right: 8, top: 12 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <ReferenceArea
                    x1={MONTHS[selectedMonthIndex].short}
                    x2={MONTHS[selectedMonthIndex].short}
                    fill="var(--muted)"
                    fillOpacity={0.7}
                    stroke="none"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    height={70}
                    interval={0}
                    tick={(props) => <MonthTick {...props} selectedIndex={selectedMonthIndex} data={yearChartData} />}
                  />
                  <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={fmtShort} />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                    content={
                      <ChartTooltipContent
                        formatter={(v, name) => (
                          <span className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{name === "receitas" ? "Receitas" : "Despesas"}</span>
                            <span className="num font-medium text-foreground">{formatBRL(Number(v))}</span>
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="receitas" fill="var(--color-receitas)" radius={4} maxBarSize={44}>
                  </Bar>
                  <Bar dataKey="gastos" fill="var(--color-gastos)" radius={4} maxBarSize={44}>
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Categorias do mês */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Despesas por categoria" description={monthName}>
          {isLoadingData ? (
            <ChartSkeleton />
          ) : (
            <CategoryDonut
              data={expensesData}
              config={expensesConfig}
              total={totalExpense}
              countLabel={`${expenseCount} despesa${expenseCount !== 1 ? "s" : ""}`}
              emptyTitle={`Sem despesas em ${monthName.toLowerCase()}`}
            />
          )}
        </SectionCard>

        <SectionCard title="Receitas por categoria" description={monthName}>
          {isLoadingData ? (
            <ChartSkeleton />
          ) : (
            <CategoryDonut
              data={incomesData}
              config={incomesConfig}
              total={totalIncome}
              countLabel={`${incomeCount} receita${incomeCount !== 1 ? "s" : ""}`}
              emptyTitle={`Sem receitas em ${monthName.toLowerCase()}`}
            />
          )}
        </SectionCard>
      </div>

      {/* Mês a mês (ano) */}
      <SectionCard
        title={`Mês a mês em ${selectedYearNumber}`}
        description="Receita, despesa e saldo de cada mês, por trimestre. Clique para ver o mês."
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(270px,100%),1fr))] gap-4">
          {([1, 2, 3, 4] as const).map((q) => {
            const list = monthCards.filter((m) => m.quarter === q)
            const saldo = list.reduce((s, m) => s + m.income - m.expense, 0)
            return (
              <div key={q} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between px-0.5 text-xs text-muted-foreground">
                  <strong className="text-[11px] font-medium uppercase tracking-wider">{q}º trimestre</strong>
                  <span className="num">Saldo {formatBRL(saldo)}</span>
                </div>
                {list.map((m) => {
                  const mi = Number(m.key.split("-")[1])
                  const isFuture =
                    selectedYearNumber > currentYear || (selectedYearNumber === currentYear && mi > currentMonthIndex)
                  return (
                    <MonthCard
                      key={m.key}
                      month={m}
                      isSelected={mi === selectedMonthIndex}
                      isFuture={isFuture}
                      onSelect={() => setMonth(mi)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Fixas (mês) | Próximas contas (mês) | Maiores despesas (mês) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        <FixedExpensesSummary month={String(selectedMonthIndex + 1)} year={String(selectedYearNumber)} />
        <SavingsGoalsSummary goals={goals} isLoading={isLoadingData} />

        <SectionCard
          title="Próximas contas"
          description={`Pendentes de ${monthName.toLowerCase()}, por vencimento`}
          action={
            <Link href="/despesas" className="text-[13px] font-medium text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          {isLoadingData ? (
            <ChartSkeleton height={200} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Tudo em dia" description="Nenhuma conta pendente neste mês." className="py-6" />
          ) : (
            <ul className="divide-y">
              {upcoming.map((e) => {
                const status = getExpenseStatus(e, now)
                return (
                  <li key={e.id} className="flex min-h-14 items-center gap-3 py-3">
                    <span
                      className={cn(
                        "flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-subtle leading-[1.1]",
                        status === "late" && "border-expense/50 bg-expense-soft text-expense",
                      )}
                    >
                      <b className="num text-[15px]">{dayOf(e.date)}</b>
                      <small className={cn("text-[10px] uppercase tracking-wide text-muted-foreground", status === "late" && "text-expense")}>
                        {MONTHS[selectedMonthIndex].short}
                      </small>
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <strong className="flex items-center gap-1.5 text-sm font-medium">
                        <span className="truncate">{e.item}</span>
                        <InstallmentBadge number={e.installmentNumber} total={e.installmentTotal} />
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {status === "late" ? "Atrasada" : (e.creditorId && creditorById.get(e.creditorId)) || "Pendente"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="num text-sm font-semibold">{formatBRL(toNumber(e.amount))}</span>
                      <button
                        type="button"
                        disabled={payingId === e.id}
                        onClick={() => markPaid(e.id)}
                        aria-label={`Marcar ${e.item} como paga`}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        Marcar paga
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Maiores despesas" description={monthName}>
          {isLoadingData ? (
            <ChartSkeleton height={200} />
          ) : topExpenses.length === 0 ? (
            <EmptyState icon={TrendingDown} title={`Sem despesas em ${monthName.toLowerCase()}`} className="py-6" />
          ) : (
            <ol className="flex flex-col gap-3">
              {topExpenses.map((exp, idx) => {
                const tagName = exp.tagId ? tagById.get(exp.tagId)?.name : null
                const max = toNumber(topExpenses[0]?.amount ?? 0)
                const pct = max > 0 ? (toNumber(exp.amount) / max) * 100 : 0
                return (
                  <li key={exp.id} className="flex items-center gap-3">
                    <span className="num w-4 shrink-0 text-xs text-muted-foreground">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm">{exp.item}</span>
                        <span className="num shrink-0 text-sm font-semibold">{formatBRL(toNumber(exp.amount))}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-series-out" style={{ width: `${pct}%` }} />
                        </div>
                        {tagName && (
                          <span className="shrink-0 rounded-full border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {tagName}
                          </span>
                        )}
                        <StatusBadge status={getExpenseStatus(exp, now)} className="h-5 px-2 text-[11px] max-md:h-5 [&_svg]:size-3" />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </SectionCard>
      </div>

      <InstallmentsSection expenses={expenses} tagById={tagById} creditorById={creditorById} />

      {/* Credores: mês do período */}
      <Card className="gap-0 py-0">
        <CardContent className="p-5 max-md:p-4">
          <CreditorsSection
            expenses={expenses}
            month={String(selectedMonthIndex + 1)}
            year={String(selectedYearNumber)}
            onPaidChange={(ids, isPaid) => setExpenses((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, isPaid } : e)))}
          />
        </CardContent>
      </Card>
    </PageShell>
  )
}
