import {
  Brain,
  Building2,
  LayoutDashboard,
  LifeBuoy,
  RefreshCw,
  Settings,
  ShieldCheck,
  Tag,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { href: string; icon: LucideIcon; label: string }

/** Análise com IA desativada. Para reativar, troque para true (menu, atalhos e a rota /ia voltam). */
export const AI_ENABLED = false

export const mainNav: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/receitas", icon: TrendingUp, label: "Receitas" },
  { href: "/despesas", icon: TrendingDown, label: "Despesas" },
  { href: "/fixed-expenses", icon: RefreshCw, label: "Despesas Fixas" },
  ...(AI_ENABLED ? [{ href: "/ia", icon: Brain, label: "Análise com IA" }] : []),
  { href: "/chamados", icon: LifeBuoy, label: "Suporte" },
]

export const adminNav: NavItem[] = [
  { href: "/admin/chamados", icon: ShieldCheck, label: "Admin Suporte" },
]

export const secondaryNav: NavItem[] = [
  { href: "/tags", icon: Tag, label: "Tags" },
  { href: "/credores", icon: Building2, label: "Credores" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export function pageTitle(pathname: string) {
  const all = [...mainNav, ...adminNav, ...secondaryNav]
  return all.find((i) => isActivePath(pathname, i.href))?.label ?? "Pit Finance"
}

export function userInitials(email?: string | null) {
  if (!email) return "?"
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim()
  const parts = name.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)
  return (letters || "?").toUpperCase()
}
