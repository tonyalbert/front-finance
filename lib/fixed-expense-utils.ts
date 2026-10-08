import type { ApiFixedIncome } from "@/lib/finance-types"

// Datas de despesas/receitas fixas sao "so data" (YYYY-MM-DD, UTC no back). Nunca passar por
// new Date(...) para exibir: no fuso UTC-3 isso desloca o dia/mes.

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export type FixedExpenseStatus = "active" | "paused" | "ended"

/** Campos comuns às regras fixas (despesa e receita). */
export type FixedRule = { startDate: string; endDate: string | null; isActive: boolean }

/** Data LOCAL de hoje em YYYY-MM-DD (sem toISOString, que usa UTC). */
export function localToday(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "YYYY-MM" de uma data ISO / YYYY-MM-DD. */
export function monthKey(date: string): string {
  return date.slice(0, 7)
}

/** "2026-03..." -> "mar/2026" */
export function formatMonthYear(date: string): string {
  const [year, month] = monthKey(date).split("-")
  return `${MONTH_SHORT[Number(month) - 1] ?? month}/${year}`
}

/** month: 1-12 (string ou numero), year: string ou numero -> "YYYY-MM" */
export function competenceKey(year: string | number, month: string | number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** "YYYY-MM" + n meses. */
export function addMonthsKey(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number)
  const total = y * 12 + (m - 1) + n
  return competenceKey(Math.floor(total / 12), (total % 12) + 1)
}

/** Regra vigente na competencia (inicio <= mes <= fim, fim nulo = sem fim). Nao considera pausa. */
export function isInWindow(fe: FixedRule, competence: string): boolean {
  return monthKey(fe.startDate) <= competence && (!fe.endDate || monthKey(fe.endDate) >= competence)
}

/** Ativa e vigente na competencia. */
export function isEligibleInMonth(fe: FixedRule, competence: string): boolean {
  return fe.isActive && isInWindow(fe, competence)
}

export function getStatus(fe: FixedRule, currentCompetence: string): FixedExpenseStatus {
  if (!fe.isActive) return "paused"
  if (fe.endDate && monthKey(fe.endDate) < currentCompetence) return "ended"
  return "active"
}

export function formatVigency(fe: FixedRule): string {
  return fe.endDate
    ? `${formatMonthYear(fe.startDate)} → ${formatMonthYear(fe.endDate)}`
    : `Desde ${formatMonthYear(fe.startDate)} · sem data fim`
}

/** Valor da receita fixa na competencia: base ou o reajuste mais recente ja vigente (espelha o back). */
export function incomeAmountFor(fi: Pick<ApiFixedIncome, "amount" | "adjustments">, competence: string): string {
  let amount = fi.amount
  let best = ""
  for (const a of fi.adjustments ?? []) {
    if (a.effectiveFrom <= competence && a.effectiveFrom > best) {
      best = a.effectiveFrom
      amount = a.amount
    }
  }
  return amount
}

/** Próximo reajuste programado depois da competencia (ou null). */
export function nextAdjustment(fi: Pick<ApiFixedIncome, "adjustments">, competence: string) {
  return (fi.adjustments ?? []).filter((a) => a.effectiveFrom > competence).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0] ?? null
}
