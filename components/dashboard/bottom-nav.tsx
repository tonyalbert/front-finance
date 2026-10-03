"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, MoreHorizontal, Plus, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { adminNav, isActivePath, mainNav, secondaryNav } from "./nav-config"

const tabClass = (active: boolean) =>
  cn(
    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors",
    active ? "text-foreground" : "text-muted-foreground",
  )

const moreLinkClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent"

export function BottomNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  const tab = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = isActivePath(pathname, href)
    return (
      <Link href={href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
        <Icon className={cn("size-5", active && "text-primary")} />
        {label}
      </Link>
    )
  }

  const moreItems = [
    ...mainNav.filter((i) => !["/dashboard", "/despesas", "/receitas"].includes(i.href)),
    ...secondaryNav,
    ...(user?.isAdmin ? adminNav : []),
  ]
  const moreActive = moreItems.some((i) => isActivePath(pathname, i.href))

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-5 items-center border-t bg-card px-1 md:hidden"
      >
        {tab("/dashboard", "Início", LayoutDashboard)}
        {tab("/despesas", "Despesas", TrendingDown)}
        <Link
          href="/despesas?nova=1"
          aria-label="Nova despesa"
          className="mx-auto grid size-[52px] place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md"
        >
          <Plus className="size-6" />
        </Link>
        {tab("/receitas", "Receitas", TrendingUp)}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreActive)}>
          <MoreHorizontal className={cn("size-5", moreActive && "text-primary")} />
          Mais
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-6">
          <SheetHeader>
            <SheetTitle>Mais</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-0.5 px-4">
            {moreItems.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setMoreOpen(false)} className={moreLinkClass}>
                <i.icon className="size-4 text-muted-foreground" />
                {i.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
              <span className="min-w-0 truncate text-xs text-muted-foreground">{user?.email}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={logout}
                  aria-label="Sair da conta"
                  className="grid size-9 place-items-center rounded-lg border hover:bg-accent"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
