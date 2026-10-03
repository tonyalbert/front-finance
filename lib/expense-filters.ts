import type { ApiExpense } from "@/lib/finance-types"
import { getExpenseStatus } from "@/lib/finance-utils"

export type ExpenseFilters = {
  search: string
  status: "all" | "paid" | "pending" | "late"
  type: "all" | "fixed" | "installment" | "single"
  tagId: string // "all" | "none" | id
  creditorId: string // "all" | "none" | id
}

export const EMPTY_FILTERS: ExpenseFilters = { search: "", status: "all", type: "all", tagId: "all", creditorId: "all" }

const normalizeText = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export function hasActiveFilters(f: ExpenseFilters) {
  return f.search.trim() !== "" || f.status !== "all" || f.type !== "all" || f.tagId !== "all" || f.creditorId !== "all"
}

// Filtros combinam entre si (E). Fixa = fixedExpenseCompetence; parcelada = installmentGroupId; avulsa = nenhuma.
// Pendente = ainda não paga (inclui atrasadas); Atrasada = pendente com vencimento antes de hoje.
export function applyExpenseFilters(
  rows: ApiExpense[],
  f: ExpenseFilters,
  extra?: { tagName?: (tagId: string | null) => string; creditorName?: (creditorId: string | null) => string },
): ApiExpense[] {
  const q = normalizeText(f.search)
  const today = new Date()
  return rows.filter((e) => {
    if (q) {
      const haystack = normalizeText([e.item, extra?.tagName?.(e.tagId) ?? "", extra?.creditorName?.(e.creditorId) ?? ""].join(" "))
      if (!haystack.includes(q)) return false
    }
    if (f.status === "paid" && !e.isPaid) return false
    if (f.status === "pending" && e.isPaid) return false
    if (f.status === "late" && getExpenseStatus(e, today) !== "late") return false
    const isFixed = !!e.fixedExpenseCompetence
    const isInstallment = !!e.installmentGroupId
    if (f.type === "fixed" && !isFixed) return false
    if (f.type === "installment" && !isInstallment) return false
    if (f.type === "single" && (isFixed || isInstallment)) return false
    if (f.tagId === "none" ? !!e.tagId : f.tagId !== "all" && e.tagId !== f.tagId) return false
    if (f.creditorId === "none" ? !!e.creditorId : f.creditorId !== "all" && e.creditorId !== f.creditorId) return false
    return true
  })
}
