"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight, PanelLeft, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed"
import { PitLogo } from "@/components/brand/pit-logo"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "./app-sidebar"
import { BottomNav } from "./bottom-nav"
import { CommandPalette } from "./command-palette"
import { PeriodControl } from "./period-control"
import { pageTitle, userInitials } from "./nav-config"
import { BillingBanner } from "@/components/billing/billing-provider"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, toggle] = useSidebarCollapsed()
  const [paletteOpen, setPaletteOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block",
            collapsed ? "w-[68px]" : "w-[248px]",
          )}
        >
          <AppSidebar collapsed={collapsed} />
        </aside>

        <div className={cn("transition-[padding] duration-200", collapsed ? "md:pl-[68px]" : "md:pl-[248px]")}>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3 md:h-[60px] md:gap-3 md:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 md:inline-flex"
              onClick={toggle}
              aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              <PanelLeft className="size-4" />
            </Button>
            <Link href="/dashboard" className="md:hidden" aria-label="Pit Finance: ir para o Dashboard">
              <PitLogo iconOnly className="text-[22px]" />
            </Link>
            <nav aria-label="Você está em" className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="hidden sm:inline">Pit Finance</span>
              <ChevronRight className="hidden size-3.5 sm:inline" />
              <strong className="font-medium text-foreground">{pageTitle(pathname)}</strong>
            </nav>
            <div className="flex-1" />
            <PeriodControl />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Buscar ou executar comando (Ctrl K)"
              className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-muted-foreground shadow-xs hover:border-input md:min-w-60"
            >
              <Search className="size-4" />
              <span className="hidden flex-1 text-left text-[13px] md:inline">Buscar ou comando…</span>
              <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[11px] leading-[18px] md:inline">
                Ctrl K
              </kbd>
            </button>
            <Link
              href="/configuracoes"
              title={user?.email}
              aria-label="Configurações da conta"
              className="hidden size-8 place-items-center rounded-full border bg-muted text-xs font-semibold hover:border-input md:grid"
            >
              {userInitials(user?.email)}
            </Link>
          </header>

          <BillingBanner />
          <main id="conteudo">{children}</main>
        </div>

        <BottomNav />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  )
}
