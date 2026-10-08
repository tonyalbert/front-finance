import type { ApiSavingsGoal } from "@/lib/finance-types"
import { toNumber } from "@/lib/finance-utils"

/** Meses recomendados de despesas fixas para a reserva de emergência. */
export const EMERGENCY_MONTHS = 6

/**
 * Líquido guardado nas metas na competência "YYYY-MM": aportes − retiradas − empréstimos tomados.
 * Parcelas de empréstimo pagas NÃO entram: já contam como despesa (senão sairiam duas vezes do saldo).
 */
export function savedInMonth(goals: ApiSavingsGoal[], competence: string): number {
  let total = 0
  for (const g of goals) {
    for (const m of g.movements) {
      if (m.date.slice(0, 7) !== competence) continue
      total += m.type === "DEPOSIT" ? toNumber(m.amount) : -toNumber(m.amount)
    }
    for (const l of g.loans ?? []) {
      if (l.createdAt.slice(0, 7) === competence) total -= toNumber(l.principal)
    }
  }
  return total
}

/** Meses da competência atual até a do prazo (inclusive); 0 se o prazo já passou. */
export function monthsUntil(fromKey: string, toKey: string): number {
  const [fy, fm] = fromKey.split("-").map(Number)
  const [ty, tm] = toKey.split("-").map(Number)
  const diff = (ty - fy) * 12 + (tm - fm) + 1
  return diff > 0 ? diff : 0
}

/** Quanto as metas em andamento pedem por mês (soma das parcelas sugeridas). */
export function monthlyNeeded(goals: ApiSavingsGoal[]): number {
  return goals.filter((g) => g.progress.status !== "completed").reduce((s, g) => s + g.progress.monthlySuggested, 0)
}

/** Parcela fixa (tabela Price), idêntica ao back. Taxa em % ao mês; 0% divide igualmente (arredonda p/ cima). */
export function loanInstallment(principal: number, monthlyRatePct: number, installments: number): number {
  const p = Math.round(principal * 100)
  const r = monthlyRatePct / 100
  if (installments < 1 || p <= 0) return 0
  if (r === 0) return Math.ceil(p / installments) / 100
  return Math.round((p * r) / (1 - Math.pow(1 + r, -installments))) / 100
}

/** Taxa anual equivalente (juros compostos), em %. */
export function annualRate(monthlyRatePct: number): number {
  return (Math.pow(1 + monthlyRatePct / 100, 12) - 1) * 100
}
