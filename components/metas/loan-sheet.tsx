"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatBRL, formatDateDisplay, toUtcIso } from "@/lib/finance-utils"
import type { ApiSavingsGoal } from "@/lib/finance-types"
import { annualRate, loanInstallment } from "@/lib/savings-utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { DateField } from "@/components/finance/date-field"
import { MoneyInput } from "@/components/finance/money-input"

export type LoanValues = { goalId: string; amount: number; monthlyRate: number; installments: number; firstDueDate: string }

const RATE_PRESETS = [0, 0.5, 1, 2]
const INSTALLMENT_PRESETS = [3, 6, 12, 24]
const MAX_INSTALLMENTS = 48
const MAX_RATE = 10

/** Pedir emprestado à própria meta (ex.: reserva) e devolver em parcelas, com os juros que o usuário escolher. */
export function LoanSheet({
  open,
  onOpenChange,
  goals,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Metas com dinheiro disponível. */
  goals: ApiSavingsGoal[]
  onSubmit: (values: LoanValues) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const [goalId, setGoalId] = React.useState("")
  const [amount, setAmount] = React.useState(0)
  const [rate, setRate] = React.useState(1)
  const [rateText, setRateText] = React.useState("1")
  const [installments, setInstallments] = React.useState(6)
  const [firstDue, setFirstDue] = React.useState(nextMonthIso())
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const first = goals.find((g) => g.isEmergencyFund) ?? goals[0]
    setGoalId(first?.id ?? "")
    setAmount(first ? Math.min(1000, Math.floor(first.progress.saved)) : 0)
    setRate(1)
    setRateText("1")
    setInstallments(6)
    setFirstDue(nextMonthIso())
    setError(null)
  }, [open, goals])

  const goal = goals.find((g) => g.id === goalId)
  const available = goal?.progress.saved ?? 0
  const parcel = loanInstallment(amount, rate, installments)
  const total = Math.round(parcel * installments * 100) / 100
  const interest = Math.max(0, total - amount)

  function changeRate(value: number) {
    const clamped = Math.min(MAX_RATE, Math.max(0, Math.round(value * 100) / 100))
    setRate(clamped)
    setRateText(String(clamped).replace(".", ","))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal) return setError("Escolha de qual meta pegar")
    if (amount <= 0) return setError("Informe um valor maior que zero")
    if (amount > available) return setError(`Disponível nesta meta: ${formatBRL(available)}`)
    setIsSubmitting(true)
    try {
      await onSubmit({ goalId: goal.id, amount, monthlyRate: rate, installments, firstDueDate: firstDue.slice(0, 10) })
      onOpenChange(false)
    } catch {
      // o chamador mostra o toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-lg">Pedir empréstimo</SheetTitle>
          <SheetDescription>Pegue do que você guardou e devolva em parcelas, com juros, como num banco.</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <div className="grid gap-2">
              <Label>Pegar de</Label>
              <Select
                value={goalId}
                onValueChange={(id) => {
                  setGoalId(id)
                  const g = goals.find((x) => x.id === id)
                  if (g && amount > g.progress.saved) setAmount(Math.floor(g.progress.saved))
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Escolha a meta" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} · {formatBRL(g.progress.saved)} disponível
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resultado ao vivo */}
            <div className="rounded-xl border border-primary/30 bg-primary-soft/50 px-4 py-4 text-center" aria-live="polite">
              <p className="text-[13px] text-muted-foreground">Você devolve</p>
              <p className="num mt-0.5 text-[30px] font-semibold leading-tight tracking-tight">
                {installments}× {formatBRL(parcel)}
              </p>
              <p className="num text-[13px] text-muted-foreground">
                Total {formatBRL(total)} · {formatBRL(interest)} de juros
              </p>
              <p className="mt-2 border-t border-primary/20 pt-2 text-xs leading-snug text-muted-foreground">
                As parcelas entram em <b className="text-foreground">Despesas</b>. Cada parcela paga volta para{" "}
                {goal?.isEmergencyFund ? "a sua reserva" : "a meta"}, com os juros: você paga a si mesmo.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="loan-amount">Quanto pegar</Label>
                <MoneyInput id="loan-amount" value={amount} onChange={setAmount} aria-invalid={!!error} className="h-9 w-40 text-right font-semibold" />
              </div>
              <Slider
                value={[Math.min(amount, available)]}
                min={0}
                max={Math.max(available, 1)}
                step={available > 2000 ? 50 : 10}
                onValueChange={([v]) => setAmount(v)}
                disabled={available <= 0}
                aria-label="Quanto pegar"
                className="py-1.5"
              />
              <div className="num flex justify-between text-[11px] text-muted-foreground">
                <span>R$ 0</span>
                <span>{formatBRL(available)} disponível</span>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="loan-rate">Juros ao mês</Label>
                <div className="relative">
                  <input
                    id="loan-rate"
                    inputMode="decimal"
                    value={rateText}
                    onChange={(e) => {
                      const text = e.target.value.replace(/[^\d,.]/g, "").slice(0, 5)
                      setRateText(text)
                      const n = Number(text.replace(",", "."))
                      if (!Number.isNaN(n)) setRate(Math.min(MAX_RATE, Math.max(0, Math.round(n * 100) / 100)))
                    }}
                    onBlur={() => changeRate(rate)}
                    className="num h-9 w-24 rounded-lg border border-input bg-card pl-3 pr-7 text-right text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
              <Slider value={[rate]} min={0} max={MAX_RATE} step={0.1} onValueChange={([v]) => changeRate(v)} aria-label="Juros ao mês" className="py-1.5" />
              <div className="flex flex-wrap items-center gap-1.5">
                {RATE_PRESETS.map((r) => (
                  <Chip key={r} active={rate === r} onClick={() => changeRate(r)}>
                    {r === 0 ? "Sem juros" : `${String(r).replace(".", ",")}%`}
                  </Chip>
                ))}
                <span className="num ml-auto text-[11px] text-muted-foreground">
                  ≈ {annualRate(rate).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% ao ano
                </span>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Parcelas</Label>
                <span className="num text-sm font-semibold">{installments}×</span>
              </div>
              <Slider
                value={[installments]}
                min={1}
                max={MAX_INSTALLMENTS}
                step={1}
                onValueChange={([v]) => setInstallments(v)}
                aria-label="Número de parcelas"
                className="py-1.5"
              />
              <div className="flex flex-wrap gap-1.5">
                {INSTALLMENT_PRESETS.map((n) => (
                  <Chip key={n} active={installments === n} onClick={() => setInstallments(n)}>
                    {n}×
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Primeira parcela</Label>
              <DateField value={firstDue} onChange={setFirstDue} />
              <p className="text-xs text-muted-foreground">
                Depois, todo dia {firstDue ? Number(firstDue.slice(8, 10)) : "—"} de cada mês, até {lastDueLabel(firstDue, installments)}.
              </p>
            </div>

            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !goal || amount <= 0}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Pegar {formatBRL(amount)}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-full border px-3 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/** Mesmo dia, mês que vem (dia limitado a 28 para existir em todo mês). */
function nextMonthIso(): string {
  const t = new Date()
  return toUtcIso(t.getMonth() === 11 ? t.getFullYear() + 1 : t.getFullYear(), (t.getMonth() + 1) % 12, Math.min(t.getDate(), 28))
}

function lastDueLabel(firstIso: string, installments: number): string {
  if (!firstIso) return "—"
  const [y, m, d] = firstIso.slice(0, 10).split("-").map(Number)
  const total = y * 12 + (m - 1) + installments - 1
  const ly = Math.floor(total / 12)
  const lm = total % 12
  const lastDay = new Date(Date.UTC(ly, lm + 1, 0)).getUTCDate()
  return formatDateDisplay(toUtcIso(ly, lm, Math.min(d, lastDay)))
}
