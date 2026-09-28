import type { ApiFixedExpense } from "@/lib/finance-types"

// Datas de despesas fixas sao "so data" (YYYY-MM-DD, UTC no back). Nunca passar por
// new Date(...) para exibir: no fuso UTC-3 isso desloca o dia/mes.

const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export type FixedExpenseStatus = "active" | "paused" | "ended"

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

/** Regra vigente na competencia (inicio <= mes <= fim, fim nulo = sem fim). Nao considera pausa. */
export function isInWindow(fe: ApiFixedExpense, competence: string): boolean {
  return monthKey(fe.startDate) <= competence && (!fe.endDate || monthKey(fe.endDate) >= competence)
}

/** Ativa e vigente na competencia. */
export function isEligibleInMonth(fe: ApiFixedExpense, competence: string): boolean {
  return fe.isActive && isInWindow(fe, competence)
}

export function getStatus(fe: ApiFixedExpense, currentCompetence: string): FixedExpenseStatus {
  if (!fe.isActive) return "paused"
  if (fe.endDate && monthKey(fe.endDate) < currentCompetence) return "ended"
  return "active"
}

export function formatVigency(fe: ApiFixedExpense): string {
  return fe.endDate
    ? `${formatMonthYear(fe.startDate)} → ${formatMonthYear(fe.endDate)}`
    : `Desde ${formatMonthYear(fe.startDate)} · sem data fim`
}
