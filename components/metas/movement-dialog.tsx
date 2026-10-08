"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBRL, toUtcIso } from "@/lib/finance-utils"
import type { ApiSavingsGoal } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DateField } from "@/components/finance/date-field"
import { MoneyInput } from "@/components/finance/money-input"

export type MovementType = "DEPOSIT" | "WITHDRAW"
export type MovementValues = { type: MovementType; amount: number; date: string }

/** Registrar quanto o usuário guardou (ou retirou) de uma meta. Valor sugerido já vem preenchido. */
export function MovementDialog({
  goal,
  initialType,
  onOpenChange,
  onSubmit,
}: {
  /** Meta alvo; null = fechado. */
  goal: ApiSavingsGoal | null
  initialType: MovementType
  onOpenChange: (open: boolean) => void
  onSubmit: (goal: ApiSavingsGoal, values: MovementValues) => Promise<void>
}) {
  const [type, setType] = React.useState<MovementType>(initialType)
  const [amount, setAmount] = React.useState(0)
  const [date, setDate] = React.useState(todayIso())
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!goal) return
    setType(initialType)
    setAmount(initialType === "DEPOSIT" ? suggested(goal) : 0)
    setDate(todayIso())
    setError(null)
  }, [goal, initialType])

  function changeType(next: MovementType) {
    setType(next)
    if (goal) setAmount(next === "DEPOSIT" ? suggested(goal) : 0)
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal) return
    if (amount <= 0) return setError("Informe um valor maior que zero")
    if (type === "WITHDRAW" && amount > goal.progress.saved) {
      return setError(`Você tem ${formatBRL(goal.progress.saved)} guardado nesta meta`)
    }
    setIsSubmitting(true)
    try {
      await onSubmit(goal, { type, amount, date: date.slice(0, 10) })
      onOpenChange(false)
    } catch {
      // o chamador mostra o toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const tab = (value: MovementType, label: string) => (
    <button
      type="button"
      onClick={() => changeType(value)}
      aria-pressed={type === value}
      className={cn(
        "h-8 flex-1 rounded-md text-sm font-medium transition-colors",
        type === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  )

  return (
    <Dialog open={!!goal} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{goal?.name}</DialogTitle>
            <DialogDescription>
              {goal && goal.progress.leftThisMonth > 0
                ? `Para seguir o plano, faltam ${formatBRL(goal.progress.leftThisMonth)} este mês.`
                : "Registre o que você guardou ou retirou."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex rounded-lg bg-muted p-[3px]" role="group" aria-label="Tipo">
            {tab("DEPOSIT", "Guardar")}
            {tab("WITHDRAW", "Retirar")}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="movement-amount">Valor</Label>
            <MoneyInput id="movement-amount" value={amount} onChange={setAmount} aria-invalid={!!error} autoFocus />
            {error && <p className="text-[13px] text-destructive">{error}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Data</Label>
            <DateField value={date} onChange={setDate} />
          </div>

          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} variant={type === "WITHDRAW" ? "outline" : "default"}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {type === "DEPOSIT" ? "Guardar" : "Retirar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Sugestão do aporte: o que falta no mês; se o mês já está em dia, a parcela mensal. */
function suggested(goal: ApiSavingsGoal): number {
  const p = goal.progress
  if (p.status === "completed") return 0
  return p.leftThisMonth > 0 ? p.leftThisMonth : Math.min(p.monthlySuggested, p.remaining)
}

function todayIso(): string {
  const t = new Date()
  return toUtcIso(t.getFullYear(), t.getMonth(), t.getDate())
}
