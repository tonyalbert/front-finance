"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Brain, LayoutDashboard, RefreshCw, Tag, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagsSheet } from "./tags-sheet"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/receitas", icon: TrendingUp, label: "Receitas" },
  { href: "/despesas", icon: TrendingDown, label: "Despesas" },
  { href: "/fixed-expenses", icon: RefreshCw, label: "Fixas" },
  { href: "/ia", icon: Brain, label: "IA" },
]

export function BottomNav() {
  const pathname = usePathname()
  const [tagsOpen, setTagsOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="border-t border-border bg-background/90 backdrop-blur-md">
          <div className="flex items-center justify-around px-1 py-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 transition-all",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("size-5 shrink-0", isActive && "text-primary")} />
                  <span className="truncate text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => setTagsOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-muted-foreground transition-all"
            >
              <Tag className="size-5 shrink-0" />
              <span className="truncate text-[10px] font-medium">Tags</span>
            </button>
          </div>
        </div>
      </div>

      <TagsSheet open={tagsOpen} onOpenChange={setTagsOpen} />
    </>
  )
}
