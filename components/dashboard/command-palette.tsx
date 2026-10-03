"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { LogOut, Monitor, Moon, Sun } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useAuth } from "@/hooks/use-auth"
import { adminNav, mainNav, secondaryNav } from "./nav-config"

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const { user, logout } = useAuth()

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  const run = (fn: () => void) => {
    onOpenChange(false)
    fn()
  }

  const pages = [...mainNav, ...secondaryNav, ...(user?.isAdmin ? adminNav : [])]

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Buscar ou executar comando">
      <CommandInput placeholder="Buscar página ou ação…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ir para">
          {pages.map((p) => (
            <CommandItem key={p.href} onSelect={() => run(() => router.push(p.href))}>
              <p.icon />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tema">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun /> Tema claro
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon /> Tema escuro
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <Monitor /> Seguir o sistema
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Conta">
          <CommandItem onSelect={() => run(logout)}>
            <LogOut /> Sair
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
