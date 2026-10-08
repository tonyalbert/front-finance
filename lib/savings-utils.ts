import type { ApiSavingsGoal } from "@/lib/finance-types"
import { toNumber } from "@/lib/finance-utils"

/** Meses recomendados de despesas fixas para a reserva de emergência. */
export const EMERGENCY_MONTHS = 6

/** Líquido guardado (aportes − retiradas) nas metas, na competência "YYYY-MM". */
export function savedInMonth(goals: ApiSavingsGoal[], competence: string): number {
  let total = 0
  for (const g of goals) {
    for (const m of g.movements) {
      if (m.date.slice(0, 7) !== competence) continue
      total += m.type === "DEPOSIT" ? toNumber(m.amount) : -toNumber(m.amount)
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
