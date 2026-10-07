import { apiFetch } from "@/lib/api"
import type { AccessInfo, SubscriptionInfo } from "@/lib/billing-api"

export type AdminUser = {
  id: string
  email: string
  isAdmin: boolean
  lifetimeAccess: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  createdAt: string
  subscription: SubscriptionInfo | null
  access: AccessInfo
}

export function listUsers(token: string, search?: string) {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  return apiFetch<AdminUser[]>(`/admin/users${qs}`, { token })
}

export function setUserPassword(token: string, id: string, password: string) {
  return apiFetch<{ message: string }>(`/admin/users/${id}/password`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ password }),
  })
}

export function extendTrial(token: string, id: string, days: number) {
  return apiFetch<AdminUser>(`/admin/users/${id}/trial`, {
    method: "POST",
    token,
    body: JSON.stringify({ days }),
  })
}

export function updateAccess(
  token: string,
  id: string,
  body: { lifetimeAccess?: boolean; trialEndsAt?: string | null },
) {
  return apiFetch<AdminUser>(`/admin/users/${id}/access`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  })
}
