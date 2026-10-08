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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DateField } from "@/components/finance/date-field"
import { MoneyInput } from "@/components/finance/money-input"

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
    targetAmount: z.number().positive("Informe um valor maior que zero"),
    targetDate: z.string().min(1, "Informe o prazo"),
    initialAmount: z.number().min(0),
  })
  .superRefine((v, ctx) => {
    if (v.targetDate && monthKey(v.targetDate) < monthKey(localToday())) {
      ctx.addIssue({ code: "custom", path: ["targetDate"], message: "O prazo deve ser a partir do mês atual" })
    }
  })
export type GoalFormValues = z.infer<typeof schema>

/** Valores iniciais para criar uma meta (ex.: sugestão de reserva de emergência). */
export type GoalDraft = Partial<GoalFormValues> & { isEmergencyFund?: boolean }

export function GoalSheet({
  open,
  onOpenChange,
  goal,
  draft,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: ApiSavingsGoal | null
  draft?: GoalDraft | null
  onSubmit: (values: GoalFormValues, goal: ApiSavingsGoal | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!goal
  const today = monthKey(localToday())

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(today),
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      goal
        ? {
            name: goal.name,
            targetAmount: toNumber(goal.targetAmount),
            targetDate: toIso(goal.targetDate),
            initialAmount: toNumber(goal.initialAmount),
          }
        : { ...emptyValues(today), ...stripFlags(draft) },
    )
  }, [open, goal, draft, form, today])

  const [targetAmount, targetDate, initialAmount] = useWatch({
    control: form.control,
    name: ["targetAmount", "targetDate", "initialAmount"],
  })
  const isSubmitting = form.formState.isSubmitting

  // Prévia do plano: ao criar, (alvo − já guardado) ÷ meses; ao editar, o back recalcula com os aportes.
  const months = targetDate ? monthsUntil(today, monthKey(targetDate)) : 0
  const saved = goal ? goal.progress.saved - toNumber(goal.initialAmount) + (initialAmount || 0) : initialAmount || 0
  const remaining = Math.max(0, (targetAmount || 0) - saved)
  const perMonth = months > 0 ? Math.ceil((remaining * 100) / months) / 100 : 0

  async function submit(values: GoalFormValues) {
    try {
      await onSubmit(values, goal)
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
          <SheetDescription>Diga quanto quer juntar e até quando. Calculamos quanto guardar por mês.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
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

              <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        Quero juntar <span className="text-expense" aria-hidden>*</span>
                      </FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} aria-invalid={!!fieldState.error} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Já tenho guardado</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Até quando <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <DateField value={field.value} onChange={field.onChange} ref={field.ref} invalid={!!fieldState.error} />
                    </FormControl>
                    <FormDescription>Vale o mês do prazo: você guarda até o fim dele.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {targetAmount > 0 && months > 0 && (
                <div className="rounded-[10px] border border-primary/30 bg-primary-soft/50 px-3.5 py-3 text-[13px]">
                  {remaining === 0 ? (
                    <p className="font-medium">Você já tem o valor da meta guardado.</p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">Para chegar lá até {formatMonthYear(targetDate)}, guarde</p>
                      <p className="num mt-0.5 text-xl font-semibold tracking-tight">
                        {formatBRL(perMonth)}
                        <span className="text-sm font-normal text-muted-foreground"> por mês</span>
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        durante {months} {months === 1 ? "mês" : "meses"}, a partir de {formatMonthYear(today)}.
                      </p>
                    </>
                  )}
                </div>
              )}
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

/** "YYYY-MM-DD" ou ISO -> ISO à meia-noite UTC (formato do DateField). */
function toIso(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number)
  return toUtcIso(y, m - 1, d)
}

/** Último dia do mês "YYYY-MM" como ISO (prazo padrão). */
export function endOfMonthIso(key: string): string {
  const [y, m] = key.split("-").map(Number)
  return toUtcIso(y, m - 1, new Date(Date.UTC(y, m, 0)).getUTCDate())
}

function stripFlags(draft?: GoalDraft | null): Partial<GoalFormValues> {
  if (!draft) return {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isEmergencyFund, ...values } = draft
  return values
}

function emptyValues(today: string): GoalFormValues {
  return {
    name: "",
    targetAmount: 0,
    targetDate: endOfMonthIso(addMonthsKey(today, 11)),
    initialAmount: 0,
  }
}
