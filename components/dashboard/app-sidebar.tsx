"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Brain,
  Building2,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { ThemeSettingsModal } from "@/components/theme-settings-modal"
import { TagsSheet } from "./tags-sheet"
import { CreditorsSheet } from "./creditors-sheet"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/receitas", icon: TrendingUp, label: "Receitas" },
  { href: "/despesas", icon: TrendingDown, label: "Despesas" },
  { href: "/fixed-expenses", icon: RefreshCw, label: "Despesas Fixas" },
  { href: "/ia", icon: Brain, label: "Análise com IA" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [tagsOpen, setTagsOpen] = useState(false)
  const [creditorsOpen, setCreditorsOpen] = useState(false)

  return (
    <>
      <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar backdrop-blur-md">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <Wallet className="size-5 shrink-0 text-primary" />
          <span className="text-sm font-bold text-sidebar-foreground">Pit Finance</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className={cn("size-4 shrink-0", isActive && "text-primary")} />
                {item.label}
                {isActive && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-0.5 border-t border-sidebar-border px-2 py-3">
          <button
            onClick={() => setTagsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Tag className="size-4 shrink-0" />
            Tags
          </button>
          <button
            onClick={() => setCreditorsOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Building2 className="size-4 shrink-0" />
            Credores
          </button>

          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <ThemeSettingsModal />
            <p className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/35">{user?.email}</p>
            <button
              onClick={logout}
              title="Sair"
              className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <TagsSheet open={tagsOpen} onOpenChange={setTagsOpen} />
      <CreditorsSheet open={creditorsOpen} onOpenChange={setCreditorsOpen} />
    </>
  )
}
