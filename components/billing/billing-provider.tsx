"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { BILLING_REQUIRED_EVENT, daysLabel, getBillingStatus } from "@/lib/billing-api"
import type { BillingStatus } from "@/lib/billing-api"
import { isActivePath } from "@/components/dashboard/nav-config"

type BillingContextValue = {
  status: BillingStatus | null
  refresh: () => Promise<void>
}

const BillingContext = React.createContext<BillingContextValue | undefined>(undefined)

/** Rotas que continuam abertas sem acesso: assinar, pedir ajuda e sair da conta. */
const OPEN_WHEN_BLOCKED = ["/assinatura", "/chamados", "/configuracoes"]

export function isBlocked(status: BillingStatus | null) {
  return !!status && status.enforced && !status.access.hasAccess
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = React.useState<BillingStatus | null>(null)

  const refresh = React.useCallback(async () => {
    if (!token) return
    try {
      setStatus(await getBillingStatus(token))
    } catch {
      // Falha de rede não bloqueia o app; a API continua barrando com 402.
    }
  }, [token])

  React.useEffect(() => {
    void refresh()
    const onRequired = () => void refresh()
    window.addEventListener(BILLING_REQUIRED_EVENT, onRequired)
    window.addEventListener("focus", onRequired)
    return () => {
      window.removeEventListener(BILLING_REQUIRED_EVENT, onRequired)
      window.removeEventListener("focus", onRequired)
    }
  }, [refresh])

  const blocked = isBlocked(status)
  const onOpenRoute = OPEN_WHEN_BLOCKED.some((href) => isActivePath(pathname, href))

  React.useEffect(() => {
    if (blocked && !onOpenRoute) router.replace("/assinatura")
  }, [blocked, onOpenRoute, router])

  const value = React.useMemo(() => ({ status, refresh }), [status, refresh])

  return (
    <BillingContext.Provider value={value}>
      {blocked && !onOpenRoute ? null : children}
    </BillingContext.Provider>
  )
}

export function useBilling() {
  const ctx = React.useContext(BillingContext)
  if (!ctx) throw new Error("useBilling deve ser usado dentro de BillingProvider")
  return ctx
}

/** Aviso no topo: teste acabando (até 3 dias) ou acesso expirado. */
export function BillingBanner() {
  const { status } = useBilling()
  const pathname = usePathname()
  if (!status?.enforced || isActivePath(pathname, "/assinatura")) return null

  const { access } = status
  const ending = access.kind === "trial" && (access.daysLeft ?? 99) <= 3
  if (access.hasAccess && !ending) return null

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-warning-soft px-4 py-2 text-[13px] md:px-6">
      <Clock className="size-4 shrink-0 text-warning" aria-hidden />
      <span className="flex-1">
        {access.hasAccess
          ? `Seu teste grátis termina em ${daysLabel(access.daysLeft)}.`
          : status.trialAvailable
            ? `Comece seu teste grátis de ${status.trialDays} dias ou assine para usar o Pit Finance.`
            : "Seu acesso terminou. Assine para voltar a usar o Pit Finance."}
      </span>
      <Link href="/assinatura" className="font-medium text-primary hover:underline">
        Ver planos
      </Link>
    </div>
  )
}
