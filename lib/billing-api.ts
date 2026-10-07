import { apiFetch } from "@/lib/api"

export type BillingPlan = "MONTHLY" | "ANNUALLY"
export type SubscriptionStatus = "PENDING" | "ACTIVE" | "CANCELLED"
export type AccessKind = "admin" | "lifetime" | "subscription" | "trial" | "none"

export type AccessInfo = {
  hasAccess: boolean
  kind: AccessKind
  expiresAt: string | null
  daysLeft: number | null
}

export type SubscriptionInfo = {
  status: SubscriptionStatus
  plan: BillingPlan | null
  currentPeriodEnd: string | null
  cancelledAt: string | null
}

export type PlanInfo = {
  plan: BillingPlan
  productId: string
  name: string | null
  /** Centavos; null se o catálogo estiver indisponível. */
  price: number | null
}

export type BillingStatus = {
  enforced: boolean
  access: AccessInfo
  trialEndsAt: string | null
  /** Pode iniciar o teste grátis (opcional, uma vez por conta). */
  trialAvailable: boolean
  trialDays: number
  subscription: SubscriptionInfo | null
  plans: PlanInfo[]
}

export const PLAN_LABEL: Record<BillingPlan, string> = { MONTHLY: "Mensal", ANNUALLY: "Anual" }

export const ACCESS_LABEL: Record<AccessKind, string> = {
  admin: "Administrador",
  lifetime: "Vitalício",
  subscription: "Assinatura",
  trial: "Teste grátis",
  none: "Sem acesso",
}

/** Disparado pelo apiFetch quando a API responde 402 (acesso expirado). */
export const BILLING_REQUIRED_EVENT = "pit:billing-required"

export function getBillingStatus(token: string) {
  return apiFetch<BillingStatus>("/billing/me", { token })
}

export function createCheckout(token: string, plan: BillingPlan) {
  return apiFetch<{ url: string }>("/billing/checkout", {
    method: "POST",
    token,
    body: JSON.stringify({ plan }),
  })
}

export function startTrial(token: string) {
  return apiFetch<BillingStatus>("/billing/trial", { method: "POST", token })
}

export function cancelSubscription(token: string) {
  return apiFetch<SubscriptionInfo>("/billing/cancel", { method: "POST", token })
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export function daysLabel(days: number | null) {
  if (days === null) return "Sem prazo"
  return days === 1 ? "1 dia" : `${days} dias`
}
