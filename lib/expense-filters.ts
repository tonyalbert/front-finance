import type { ApiExpense } from "@/lib/finance-types"

export type ExpenseFilters = {
  search: string
  status: "all" | "paid" | "pending"
  type: "all" | "fixed" | "installment" | "single"
  tagId: string // "all" | "none" | id
  creditorId: string // "all" | "none" | id
}

export const EMPTY_FILTERS: ExpenseFilters = { search: "", status: "all", type: "all", tagId: "all", creditorId: "all" }

const normalizeText = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

export function hasActiveFilters(f: ExpenseFilters) {
  return f.search.trim() !== "" || f.status !== "all" || f.type !== "all" || f.tagId !== "all" || f.creditorId !== "all"
}

// Filtros combinam entre si (E). Fixa = fixedExpenseCompetence; parcelada = installmentGroupId; avulsa = nenhuma.
export function applyExpenseFilters(rows: ApiExpense[], f: ExpenseFilters): ApiExpense[] {
  const q = normalizeText(f.search)
  return rows.filter((e) => {
    if (q && !normalizeText(e.item).includes(q)) return false
    if (f.status === "paid" && !e.isPaid) return false
    if (f.status === "pending" && e.isPaid) return false
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
