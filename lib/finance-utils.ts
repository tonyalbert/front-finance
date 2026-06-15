import type { ChartConfig } from "@/components/ui/chart"

export const MONTHS = [
  { label: "Janeiro", short: "Jan" },
  { label: "Fevereiro", short: "Fev" },
  { label: "Marco", short: "Mar" },
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

export const CHART_PALETTE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const

export const INCOME_PALETTE = [
  "#34d399",
  "#10b981",
  "#6ee7b7",
  "#059669",
  "#a7f3d0",
] as const

export const EXPENSE_PALETTE = [
  "#f87171",
  "#fb923c",
  "#c084fc",
  "#fbbf24",
  "#f472b6",
] as const

export const spendConfig = {
  gastos: { label: "Despesas", color: "#f87171" },
  receitas: { label: "Receitas", color: "#34d399" },
} satisfies ChartConfig

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
    fill: palette[index % palette.length],
  }))
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.fill }]),
  )
  return { data, config }
}
