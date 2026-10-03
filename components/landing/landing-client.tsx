"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

/** Quem já está logado vai direto para o app. Não renderiza nada. */
export function RedirectIfAuthenticated() {
  const router = useRouter()
  const { token, isReady } = useAuth()
  React.useEffect(() => {
    if (isReady && token) router.replace("/dashboard")
  }, [isReady, token, router])
  return null
}

/**
 * Faixa no tema oposto ao da página: página clara => faixa escura e vice-versa.
 * Usa as classes `.dark` / `.light`, que reaplicam os tokens do app dentro do bloco.
 */
export function OppositeThemeBand({ className, children }: { className?: string; children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  // antes de montar assume página clara (faixa escura)
  const pageIsDark = mounted && resolvedTheme === "dark"
  return <div className={cn(pageIsDark ? "light" : "dark", "bg-background text-foreground", className)}>{children}</div>
}
