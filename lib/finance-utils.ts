import type { ChartConfig } from "@/components/ui/chart"

export const MONTHS = [
  { label: "Janeiro", short: "Jan" },
  { label: "Fevereiro", short: "Fev" },
  { label: "Março", short: "Mar" },
  { label: "Abril", short: "Abr" },
  { label: "Maio", short: "Mai" },
  { label: "Junho", short: "Jun" },
  { label: "Julho", short: "Jul" },
  { label: "Agosto", short: "Ago" },
  { label: "Setembro", short: "Set" },
  { label: "Outubro", short: "Out" },
  { label: "Novembro", short: "Nov" },
  { label: "Dezembro", short: "Dez" },
] as const

// Categorias: --chart-1..5 ("Outros" usa --chart-7, neutro)
export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

export const OTHERS_COLOR = "var(--chart-7)"

// Barras receita x despesa: --series-in / --series-out
export const spendConfig = {
  gastos: { label: "Despesas", color: "var(--series-out)" },
  receitas: { label: "Receitas", color: "var(--series-in)" },
} satisfies ChartConfig

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export type ExpenseStatus = "paid" | "pending" | "late"

/** Pago, pendente, ou atrasado (pendente com vencimento antes de hoje). */
export function getExpenseStatus(
  expense: { isPaid: boolean; date: string },
  today: Date = new Date(),
): ExpenseStatus {
  if (expense.isPaid) return "paid"
  const due = new Date(expense.date)
  if (Number.isNaN(due.getTime())) return "pending"
  const dueDay = due.toISOString().slice(0, 10)
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  return dueDay < localToday.toISOString().slice(0, 10) ? "late" : "pending"
}

export function formatDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export function formatDateDisplay(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" })
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  if (value && typeof value === "object" && "toString" in value) {
    return Number(String(value))
  }
  return 0
}

export function getQuarter(monthIndex: number): 1 | 2 | 3 | 4 {
  return (Math.floor(monthIndex / 3) + 1) as 1 | 2 | 3 | 4
}

export function getSemester(monthIndex: number): 1 | 2 {
  return monthIndex < 6 ? 1 : 2
}

export function buildTopCategories(
  entries: Array<[string, number]>,
  maxItems: number,
): Array<[string, number]> {
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  if (sorted.length <= maxItems) return sorted
  const top = sorted.slice(0, maxItems)
  const rest = sorted.slice(maxItems)
  const othersTotal = rest.reduce((acc, [, v]) => acc + v, 0)
  if (othersTotal > 0) top.push(["Outros", othersTotal])
  return top
}

export function buildDonutData(
  pairs: Array<[string, number]>,
  palette: readonly string[] = CHART_PALETTE,
): {
  data: { name: string; value: number; fill: string }[]
  config: ChartConfig
} {
  const data = pairs.map(([name, value], index) => ({
    name,
    value,
    fill: name === "Outros" ? OTHERS_COLOR : palette[index % palette.length],
  }))
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.fill }]),
  )
  return { data, config }
}

/** Ano/mês(0-11)/dia de uma data ISO em UTC (as datas do app são "só data", gravadas à meia-noite UTC). */
export function utcParts(iso: string): { year: number; month: number; day: number } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

export function isInMonth(iso: string, year: number, month: number): boolean {
  const p = utcParts(iso)
  return !!p && p.year === year && p.month === month
}

/** Dia/mês/ano locais -> ISO à meia-noite UTC (evita deslocar o dia no fuso UTC-3). */
export function toUtcIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString()
}
