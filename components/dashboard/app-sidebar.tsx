"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { PitLogo } from "@/components/brand/pit-logo"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  adminNav,
  isActivePath,
  mainNav,
  secondaryNav,
  userInitials,
  type NavItem,
} from "./nav-config"

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    "flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
    "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
    active && "bg-sidebar-accent text-foreground",
    collapsed && "justify-center px-0",
  )

function Item({
  item,
  active,
  collapsed,
  onClick,
  href,
}: {
  item: Pick<NavItem, "icon" | "label">
  active?: boolean
  collapsed: boolean
  onClick?: () => void
  href?: string
}) {
  const Icon = item.icon
  const inner = (
    <>
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  )
  const el = href ? (
    <Link
      href={href}
      className={itemClass(!!active, collapsed)}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
    >
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      className={itemClass(!!active, collapsed)}
      aria-label={collapsed ? item.label : undefined}
    >
      {inner}
    </button>
  )
  if (!collapsed) return el
  return (
    <Tooltip>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full flex-col gap-0.5 border-r border-sidebar-border bg-sidebar p-3">
      <div className={cn("mb-2 flex h-11 items-center gap-2.5 px-1.5", collapsed && "justify-center px-0")}>
        <Link href="/dashboard" aria-label="Pit Finance: ir para o Dashboard" className="rounded-md">
          <PitLogo iconOnly={collapsed} className={collapsed ? "text-2xl" : "text-[15px]"} />
        </Link>
      </div>

      <nav aria-label="Seções" className="flex flex-col gap-0.5">
        {mainNav.map((i) => (
          <Item key={i.href} item={i} href={i.href} active={isActivePath(pathname, i.href)} collapsed={collapsed} />
        ))}
      </nav>

      {user?.isAdmin && (
        <>
          {!collapsed && (
            <div className="px-2.5 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Administração
            </div>
          )}
          <nav aria-label="Administração" className={cn("flex flex-col gap-0.5", collapsed && "mt-2")}>
            {adminNav.map((i) => (
              <Item key={i.href} item={i} href={i.href} active={isActivePath(pathname, i.href)} collapsed={collapsed} />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
        {secondaryNav.map((i) => (
          <Item key={i.href} item={i} href={i.href} active={isActivePath(pathname, i.href)} collapsed={collapsed} />
        ))}

        <div className={cn("flex items-center gap-2 px-1.5 pt-2", collapsed && "flex-col px-0")}>
          <span className="grid size-8 shrink-0 place-items-center rounded-full border bg-muted text-xs font-semibold">
            {userInitials(user?.email)}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-medium">{user?.email}</span>
              <span className="text-xs text-muted-foreground">{user?.isAdmin ? "Administrador" : "Conta"}</span>
            </span>
          )}
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={logout} aria-label="Sair da conta" title="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
