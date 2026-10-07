"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, CalendarClock, Check, CreditCard, Gift, Infinity as InfinityIcon, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import {
  ACCESS_LABEL,
  PLAN_LABEL,
  cancelSubscription,
  startTrial,
  createCheckout,
  daysLabel,
  formatCents,
  formatDate,
} from "@/lib/billing-api"
import type { BillingPlan, PlanInfo } from "@/lib/billing-api"
import { isBlocked, useBilling } from "@/components/billing/billing-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { KpiRowSkeleton } from "@/components/finance/skeletons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PERKS = ["Receitas, despesas e despesas fixas sem limite", "Dashboard e parcelamentos", "Suporte pelo app"]
const CONFIRM_POLL_MS = 3000
const CONFIRM_MAX_TRIES = 20

function PlanCard({
  info,
  monthlyPrice,
  disabled,
  loading,
  onChoose,
}: {
  info: PlanInfo
  monthlyPrice: number | null
  disabled: boolean
  loading: boolean
  onChoose: (plan: BillingPlan) => void
}) {
  const annual = info.plan === "ANNUALLY"
  const perMonth = annual && info.price ? Math.round(info.price / 12) : null
  const saving =
    annual && info.price && monthlyPrice ? Math.round((1 - info.price / (monthlyPrice * 12)) * 100) : null

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border bg-card p-5", annual && "border-primary shadow-[0_0_0_1px_var(--primary)]")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{PLAN_LABEL[info.plan]}</h3>
        {saving !== null && saving > 0 && <Badge variant="income">Economize {saving}%</Badge>}
      </div>
      <div>
        <p className="num text-2xl font-semibold tracking-tight">
          {info.price !== null ? formatCents(info.price) : "—"}
          <span className="text-sm font-normal text-muted-foreground">{annual ? " /ano" : " /mês"}</span>
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {perMonth ? `Equivale a ${formatCents(perMonth)} por mês` : "Renova todo mês"}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-income" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
      <Button className="mt-auto" variant={annual ? "default" : "outline"} disabled={disabled} onClick={() => onChoose(info.plan)}>
        {loading ? <Loader2 className="animate-spin" /> : <CreditCard />} Assinar {PLAN_LABEL[info.plan].toLowerCase()}
      </Button>
    </div>
  )
}

export default function AssinaturaPage() {
  return (
    <React.Suspense fallback={null}>
      <AssinaturaContent />
    </React.Suspense>
  )
}

function AssinaturaContent() {
  const { token } = useAuth()
  const { status, refresh } = useBilling()
  const searchParams = useSearchParams()
  const [pendingPlan, setPendingPlan] = React.useState<BillingPlan | null>(null)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [startingTrial, setStartingTrial] = React.useState(false)
  const router = useRouter()
  const [awaitingConfirmation, setAwaitingConfirmation] = React.useState(searchParams.get("status") === "processando")

  // Volta do checkout: o acesso só muda quando o webhook da AbacatePay chega; consulta por um tempo.
  React.useEffect(() => {
    if (!awaitingConfirmation) return
    if (status?.subscription?.status === "ACTIVE") {
      setAwaitingConfirmation(false)
      toast.success("Assinatura confirmada. Obrigado!")
      return
    }
    let tries = 0
    const id = window.setInterval(() => {
      tries += 1
      void refresh()
      if (tries >= CONFIRM_MAX_TRIES) {
        window.clearInterval(id)
        setAwaitingConfirmation(false)
      }
    }, CONFIRM_POLL_MS)
    return () => window.clearInterval(id)
  }, [awaitingConfirmation, status?.subscription?.status, refresh])

  async function choose(plan: BillingPlan) {
    if (!token) return
    setPendingPlan(plan)
    try {
      const { url } = await createCheckout(token, plan)
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o pagamento.")
      setPendingPlan(null)
    }
  }

  async function beginTrial() {
    if (!token) return
    setStartingTrial(true)
    try {
      await startTrial(token)
      await refresh()
      toast.success("Teste grátis liberado. Bom proveito!")
      router.push("/dashboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar o teste.")
      await refresh()
    } finally {
      setStartingTrial(false)
    }
  }

  async function cancel() {
    if (!token) return
    setCancelling(true)
    try {
      await cancelSubscription(token)
      await refresh()
      toast.success("Assinatura cancelada. Seu acesso continua até o fim do período pago.")
      setConfirmCancel(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar.")
    } finally {
      setCancelling(false)
    }
  }

  if (!status) {
    return (
      <PageShell title="Assinatura" subtitle="Plano e acesso">
        <KpiRowSkeleton count={2} />
      </PageShell>
    )
  }

  const { access, subscription, plans } = status
  const blocked = isBlocked(status)
  const active = subscription?.status === "ACTIVE"
  const unlimited = access.kind === "admin" || access.kind === "lifetime"
  const monthlyPrice = plans.find((p) => p.plan === "MONTHLY")?.price ?? null

  return (
    <PageShell title="Assinatura" subtitle="Plano e acesso">
      {blocked && status.trialAvailable && (
        <div role="status" className="flex items-start gap-3 rounded-[10px] border bg-primary-soft px-3.5 py-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="text-[13px]">
            <strong className="block text-sm font-semibold">Escolha como começar</strong>
            <span className="text-muted-foreground">
              Teste grátis por {status.trialDays} dias, sem cartão, ou assine agora.
            </span>
          </div>
        </div>
      )}

      {blocked && !status.trialAvailable && (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="text-[13px]">
            <strong className="block text-sm font-semibold">Seu acesso terminou</strong>
            <span className="text-muted-foreground">Seus dados continuam salvos. Escolha um plano para voltar a usar o Pit Finance.</span>
          </div>
        </div>
      )}

      {awaitingConfirmation && (
        <div role="status" className="flex items-center gap-3 rounded-[10px] border bg-info-soft px-3.5 py-3 text-[13px]">
          <Loader2 className="size-4 shrink-0 animate-spin text-info" aria-hidden />
          Confirmando seu pagamento com a AbacatePay. Isso costuma levar poucos segundos.
        </div>
      )}

      <Card className="gap-0 py-0" aria-labelledby="h-acesso">
        <CardHeader className="px-5 pb-0 pt-[18px] max-md:px-4">
          <CardTitle id="h-acesso" className="text-[15px] font-semibold tracking-tight">
            Seu acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 pb-5 pt-4 sm:grid-cols-3 max-md:px-4">
          <div>
            <p className="text-[13px] text-muted-foreground">Situação</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium">
              {unlimited ? <InfinityIcon className="size-4 text-primary" aria-hidden /> : <ShieldCheck className="size-4 text-primary" aria-hidden />}
              {ACCESS_LABEL[access.kind]}
              {subscription?.status === "CANCELLED" && access.kind === "subscription" && <Badge variant="warning">Cancelada</Badge>}
            </p>
          </div>
          <div>
            <p className="text-[13px] text-muted-foreground">Dias restantes</p>
            <p className="num mt-1 text-sm font-medium">{unlimited ? "Sem prazo" : daysLabel(access.daysLeft)}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted-foreground">
              {active ? "Próxima renovação (aprox.)" : "Acesso até"}
            </p>
            <p className="num mt-1 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
              {unlimited ? "—" : formatDate(access.expiresAt)}
            </p>
          </div>
          {active && subscription?.plan && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:col-span-3">
              <p className="text-[13px] text-muted-foreground">
                Plano <strong className="font-medium text-foreground">{PLAN_LABEL[subscription.plan]}</strong> no cartão, com renovação automática.
              </p>
              <Button variant="outline" className="text-expense hover:text-expense" onClick={() => setConfirmCancel(true)}>
                Cancelar assinatura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!unlimited && !active && (
        <section aria-labelledby="h-planos" className="flex flex-col gap-3">
          <div>
            <h2 id="h-planos" className="text-[15px] font-semibold tracking-tight">
              {status.trialAvailable ? "Como você quer começar?" : "Planos"}
            </h2>
            <p className="text-[13px] text-muted-foreground">
              Pagamento por cartão de crédito, processado pela AbacatePay. Cancele quando quiser.
              {access.kind === "trial" && " Ao assinar durante o teste, a cobrança começa hoje."}
            </p>
          </div>
          <div className={cn("grid gap-4 md:grid-cols-2", status.trialAvailable && plans.length > 0 && "lg:grid-cols-3")}>
            {status.trialAvailable && (
              <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold">Teste grátis</h3>
                  <Badge variant="soft">Sem cartão</Badge>
                </div>
                <div>
                  <p className="num text-2xl font-semibold tracking-tight">
                    R$ 0<span className="text-sm font-normal text-muted-foreground"> por {status.trialDays} dias</span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Use tudo por {status.trialDays} dias. Depois, é só assinar se gostar.
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5 text-[13px]">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-income" aria-hidden />
                    Nenhuma cobrança automática
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-income" aria-hidden />
                    Disponível uma vez por conta
                  </li>
                </ul>
                <Button className="mt-auto" variant="outline" disabled={startingTrial || pendingPlan !== null} onClick={() => void beginTrial()}>
                  {startingTrial ? <Loader2 className="animate-spin" /> : <Gift />} Começar teste grátis
                </Button>
              </div>
            )}
            {plans.length === 0 ? (
              <p className="rounded-xl border bg-card p-5 text-[13px] text-muted-foreground">
                Os planos pagos estão indisponíveis no momento. Tente de novo em instantes ou fale com o Suporte.
              </p>
            ) : (
              plans.map((p) => (
                <PlanCard
                  key={p.plan}
                  info={p}
                  monthlyPrice={monthlyPrice}
                  disabled={pendingPlan !== null}
                  loading={pendingPlan === p.plan}
                  onChoose={(plan) => void choose(plan)}
                />
              ))
            )}
          </div>
        </section>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={(o) => !cancelling && setConfirmCancel(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Não haverá novas cobranças. Você continua com acesso até {formatDate(access.expiresAt)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault()
                void cancel()
              }}
            >
              {cancelling && <Loader2 className="animate-spin" />} Cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}
