"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatBRL, toNumber, toUtcIso } from "@/lib/finance-utils"
import type { ApiSavingsGoal } from "@/lib/finance-types"
import { addMonthsKey, formatMonthYear, localToday, monthKey } from "@/lib/fixed-expense-utils"
import { monthsUntil } from "@/lib/savings-utils"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { MoneyInput } from "@/components/finance/money-input"

/** O que a página recebe ao salvar (prazo já convertido em data). */
export type GoalFormValues = { name: string; targetAmount: number; targetDate: string; initialAmount: number }

/** Valores iniciais para criar uma meta (ex.: sugestão de reserva de emergência). */
export type GoalDraft = Partial<GoalFormValues> & { isEmergencyFund?: boolean }

const MAX_MONTHS = 60
const DEADLINE_SHORTCUTS = [
  { months: 6, label: "6 meses" },
  { months: 12, label: "1 ano" },
  { months: 24, label: "2 anos" },
  { months: 60, label: "5 anos" },
]

/** Degraus do slider de valor: finos para valores pequenos, largos para grandes (R$ 100 até R$ 1 mi). */
const AMOUNT_STEPS: number[] = (() => {
  const steps: number[] = []
  const band = (from: number, to: number, step: number) => {
    for (let v = from; v < to; v += step) steps.push(v)
  }
  band(100, 1_000, 100)
  band(1_000, 10_000, 250)
  band(10_000, 50_000, 1_000)
  band(50_000, 200_000, 5_000)
  band(200_000, 1_000_001, 25_000)
  return steps
})()

/** Índice do degrau mais próximo (o valor digitado continua exato; só o slider arredonda). */
function stepIndex(value: number): number {
  let best = 0
  for (let i = 0; i < AMOUNT_STEPS.length; i++) {
    if (Math.abs(AMOUNT_STEPS[i] - value) < Math.abs(AMOUNT_STEPS[best] - value)) best = i
  }
  return best
}

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
  targetAmount: z.number().positive("Informe um valor maior que zero"),
  months: z.number().int().min(1),
  initialAmount: z.number().min(0),
})
type FormShape = z.infer<typeof schema>

export function GoalSheet({
  open,
  onOpenChange,
  goal,
  draft,
  fixedBalance,
  otherGoalsMonthly = 0,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: ApiSavingsGoal | null
  draft?: GoalDraft | null
  /** Sobra das fixas no mês (receitas − despesas fixas); null = sem receitas fixas cadastradas. */
  fixedBalance?: number | null
  /** Parcelas mensais das OUTRAS metas em andamento (para mostrar o total comprometido). */
  otherGoalsMonthly?: number
  onSubmit: (values: GoalFormValues, goal: ApiSavingsGoal | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!goal
  const today = monthKey(localToday())

  const form = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  React.useEffect(() => {
    if (!open) return
    if (goal) {
      form.reset({
        name: goal.name,
        targetAmount: toNumber(goal.targetAmount),
        months: Math.max(1, monthsUntil(today, monthKey(goal.targetDate))),
        initialAmount: toNumber(goal.initialAmount),
      })
    } else {
      form.reset({
        ...emptyValues(),
        ...(draft?.name ? { name: draft.name } : {}),
        ...(draft?.targetAmount ? { targetAmount: draft.targetAmount } : {}),
        ...(draft?.initialAmount ? { initialAmount: draft.initialAmount } : {}),
        ...(draft?.targetDate ? { months: Math.max(1, monthsUntil(today, monthKey(draft.targetDate))) } : {}),
      })
    }
  }, [open, goal, draft, form, today])

  const [targetAmount, months, initialAmount] = useWatch({
    control: form.control,
    name: ["targetAmount", "months", "initialAmount"],
  })
  const isSubmitting = form.formState.isSubmitting
  const maxMonths = Math.max(MAX_MONTHS, months || 1)
  const deadlineKey = addMonthsKey(today, (months || 1) - 1)

  // Mesmo cálculo do back: parcela sobre o que faltava no início do mês ÷ meses até o prazo.
  const savedBefore = goal ? goal.progress.saved - goal.progress.savedThisMonth - toNumber(goal.initialAmount) + (initialAmount || 0) : initialAmount || 0
  const remaining = Math.max(0, (targetAmount || 0) - savedBefore)
  const perMonth = months > 0 ? Math.ceil((remaining * 100) / months) / 100 : 0
  const animatedPerMonth = useAnimatedNumber(perMonth)

  const totalMonthly = otherGoalsMonthly + perMonth
  const hasBudget = fixedBalance !== null && fixedBalance !== undefined
  const fits = hasBudget && totalMonthly <= fixedBalance
  const budgetPct = hasBudget && fixedBalance > 0 ? Math.min(100, (totalMonthly / fixedBalance) * 100) : 100

  async function submit(values: FormShape) {
    // Prazo não mexido na edição => mantém a data original (não "puxa" uma meta vencida para o mês atual).
    const keepDeadline = goal && !form.formState.dirtyFields.months
    const targetDate = keepDeadline ? goal.targetDate.slice(0, 10) : endOfMonthIso(addMonthsKey(today, values.months - 1))
    try {
      await onSubmit({ name: values.name, targetAmount: values.targetAmount, targetDate, initialAmount: values.initialAmount }, goal)
      onOpenChange(false)
    } catch {
      // o chamador mostra o toast; o formulário continua aberto
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-lg">{editing ? "Editar meta" : "Nova meta"}</SheetTitle>
          <SheetDescription>Arraste para ajustar o valor e o prazo e veja quanto guardar por mês.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Viagem, Carro, Reserva de emergência" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Resultado ao vivo */}
              <div className="rounded-xl border border-primary/30 bg-primary-soft/50 px-4 py-4 text-center" aria-live="polite">
                {remaining === 0 && targetAmount > 0 ? (
                  <p className="py-3 text-sm font-medium">Você já tem o valor da meta guardado.</p>
                ) : (
                  <>
                    <p className="text-[13px] text-muted-foreground">Guarde por mês</p>
                    <p className="num mt-0.5 text-[34px] font-semibold leading-tight tracking-tight">{formatBRL(animatedPerMonth)}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {months} {months === 1 ? "mês" : "meses"} · até {formatMonthYear(deadlineKey)}
                    </p>
                  </>
                )}

                {hasBudget && remaining > 0 && (
                  <div className="mt-3 border-t border-primary/20 pt-3 text-left">
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-300", fits ? "bg-income" : "bg-warning")}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <p className="text-xs leading-snug text-muted-foreground">
                      {fits ? (
                        <>
                          {otherGoalsMonthly > 0 ? "Com as outras metas, usa " : "Usa "}
                          <b className="text-foreground">{Math.round(budgetPct)}%</b> do que sobra das suas fixas ({formatBRL(fixedBalance)}).
                        </>
                      ) : (
                        <>
                          {otherGoalsMonthly > 0 ? "Com as outras metas, passa " : "Passa "}
                          <b className="text-foreground">{formatBRL(totalMonthly - Math.max(0, fixedBalance))}</b> do que sobra das suas fixas (
                          {formatBRL(fixedBalance)}). Aumente o prazo para caber.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field, fieldState }) => (
                  <FormItem className="gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>
                        Quanto quer juntar <span className="text-expense" aria-hidden>*</span>
                      </FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-invalid={!!fieldState.error}
                          className="h-9 w-40 text-right font-semibold"
                        />
                      </FormControl>
                    </div>
                    <Slider
                      value={[stepIndex(field.value || AMOUNT_STEPS[0])]}
                      min={0}
                      max={AMOUNT_STEPS.length - 1}
                      step={1}
                      onValueChange={([i]) => field.onChange(AMOUNT_STEPS[i])}
                      aria-label="Quanto quer juntar"
                      className="py-1.5"
                    />
                    <div className="num flex justify-between text-[11px] text-muted-foreground">
                      <span>R$ 100</span>
                      <span>R$ 1 mi</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="months"
                render={({ field }) => (
                  <FormItem className="gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>Em quanto tempo</FormLabel>
                      <span className="num text-sm font-semibold">
                        {field.value} {field.value === 1 ? "mês" : "meses"}
                        <span className="font-normal text-muted-foreground"> · {formatMonthYear(deadlineKey)}</span>
                      </span>
                    </div>
                    <Slider
                      value={[field.value || 1]}
                      min={1}
                      max={maxMonths}
                      step={1}
                      onValueChange={([m]) => field.onChange(m)}
                      aria-label="Em quanto tempo, em meses"
                      className="py-1.5"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {DEADLINE_SHORTCUTS.map((s) => (
                        <button
                          key={s.months}
                          type="button"
                          onClick={() => form.setValue("months", s.months, { shouldDirty: true })}
                          className={cn(
                            "h-7 rounded-full border px-3 text-xs font-medium transition-colors",
                            field.value === s.months ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>Já tenho guardado</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} className="h-9 w-40 text-right" />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Salvar alterações" : "Criar meta"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

/** Número que "conta" até o novo valor (~250 ms) para o resultado acompanhar os sliders. */
function useAnimatedNumber(target: number): number {
  const [shown, setShown] = React.useState(target)
  const fromRef = React.useRef(target)
  React.useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target
      setShown(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 250)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = from + (target - from) * eased
      fromRef.current = value
      setShown(t === 1 ? target : Math.round(value * 100) / 100)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return shown
}

/** Último dia do mês "YYYY-MM" como ISO (prazo). */
export function endOfMonthIso(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return toUtcIso(y, m - 1, new Date(Date.UTC(y, m, 0)).getUTCDate())
}

function emptyValues(): FormShape {
  return { name: "", targetAmount: 5_000, months: 12, initialAmount: 0 }
}
