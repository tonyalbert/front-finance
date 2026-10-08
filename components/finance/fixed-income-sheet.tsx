"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatBRL, toNumber, toUtcIso } from "@/lib/finance-utils"
import type { ApiFixedIncome, ApiTag } from "@/lib/finance-types"
import { addMonthsKey, formatMonthYear, incomeAmountFor, localToday, monthKey } from "@/lib/fixed-expense-utils"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { DateField } from "./date-field"
import { MoneyInput } from "./money-input"

/** Valor de `effectiveFrom` que corrige o valor desde o início (sem gerar reajuste). */
export const FROM_START = "start"

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
    amount: z.number().positive("Informe um valor maior que zero"),
    effectiveFrom: z.string(),
    dayOfMonth: z.number(),
    startDate: z.string().min(1, "Informe a data de início"),
    noEndDate: z.boolean(),
    endDate: z.string(),
    tagId: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!Number.isInteger(v.dayOfMonth) || v.dayOfMonth < 1 || v.dayOfMonth > 31) {
      ctx.addIssue({ code: "custom", path: ["dayOfMonth"], message: "Use um dia de 1 a 31" })
    }
    if (!v.noEndDate) {
      if (!v.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Informe a data de fim ou marque “Sem data fim”" })
      else if (v.startDate && v.endDate < v.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "A data de fim deve ser igual ou posterior ao início" })
      }
    }
  })
export type FixedIncomeFormValues = z.infer<typeof schema>

const NONE = "none"

/** Criar ou editar uma receita fixa (salário, contrato…). Na edição, mudar o valor pede o mês do reajuste. */
export function FixedIncomeSheet({
  open,
  onOpenChange,
  fixedIncome,
  tags,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fixedIncome: ApiFixedIncome | null
  tags: ApiTag[]
  /** `amountChanged` indica se o valor difere do vigente no mês atual (só então a vigência importa). */
  onSubmit: (values: FixedIncomeFormValues, fixedIncome: ApiFixedIncome | null, amountChanged: boolean) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!fixedIncome
  const today = monthKey(localToday())
  const currentAmount = fixedIncome ? toNumber(incomeAmountFor(fixedIncome, today)) : 0

  const form = useForm<FixedIncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(today),
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      fixedIncome
        ? {
            name: fixedIncome.name,
            amount: toNumber(incomeAmountFor(fixedIncome, today)),
            effectiveFrom: today,
            dayOfMonth: fixedIncome.dayOfMonth,
            startDate: toIso(fixedIncome.startDate),
            noEndDate: !fixedIncome.endDate,
            endDate: fixedIncome.endDate ? toIso(fixedIncome.endDate) : "",
            tagId: fixedIncome.tagId ?? NONE,
          }
        : emptyValues(today),
    )
  }, [open, fixedIncome, form, today])

  const noEndDate = useWatch({ control: form.control, name: "noEndDate" })
  const amount = useWatch({ control: form.control, name: "amount" })
  const amountChanged = editing && Math.round(amount * 100) !== Math.round(currentAmount * 100)
  const isSubmitting = form.formState.isSubmitting

  // Reajuste: do mês atual até +12 (ou desde o início, para corrigir um valor digitado errado).
  const months = React.useMemo(() => Array.from({ length: 13 }, (_, i) => addMonthsKey(today, i)), [today])

  async function submit(values: FixedIncomeFormValues) {
    try {
      await onSubmit(values, fixedIncome, amountChanged)
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
          <SheetTitle className="text-lg">{editing ? "Editar receita fixa" : "Nova receita fixa"}</SheetTitle>
          <SheetDescription>Gera uma receita por mês, no dia do recebimento.</SheetDescription>
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
                      <Input placeholder="Ex.: Salário" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>
                        {editing ? "Valor mensal atual" : "Valor"} <span className="text-expense" aria-hidden>*</span>
                      </FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          ref={field.ref}
                          aria-invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do recebimento</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          className="num h-10"
                          value={field.value ? String(field.value) : ""}
                          onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {amountChanged && (
                <FormField
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem className="rounded-[10px] border border-income/40 bg-income-soft/40 px-3.5 py-3">
                      <FormLabel>Novo valor vale a partir de</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-10 w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {months.map((m) => (
                            <SelectItem key={m} value={m}>
                              {formatMonthYear(m)}
                              {m === today ? " (mês atual)" : ""}
                            </SelectItem>
                          ))}
                          <SelectItem value={FROM_START}>Desde o início (corrigir valor)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === FROM_START
                          ? "Substitui o valor e o histórico de reajustes. Meses anteriores já lançados não mudam."
                          : `Aumento ou redução: os meses antes de ${formatMonthYear(field.value)} continuam com ${formatBRL(currentAmount)}.`}
                      </FormDescription>
                    </FormItem>
                  )}
                />
              )}

              {editing && fixedIncome.adjustments.length > 0 && (
                <div className="rounded-[10px] border px-3.5 py-3 text-[13px]">
                  <p className="mb-1.5 font-medium">Histórico de valores</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between gap-3">
                      <span>Desde {formatMonthYear(fixedIncome.startDate)}</span>
                      <span className="num">{formatBRL(toNumber(fixedIncome.amount))}</span>
                    </li>
                    {fixedIncome.adjustments.map((a) => (
                      <li key={a.id} className="flex justify-between gap-3">
                        <span>
                          A partir de {formatMonthYear(a.effectiveFrom)}
                          {a.effectiveFrom > today ? " (programado)" : ""}
                        </span>
                        <span className="num">{formatBRL(toNumber(a.amount))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <FormField
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Data de início</FormLabel>
                    <FormControl>
                      <DateField value={field.value} onChange={field.onChange} ref={field.ref} invalid={!!fieldState.error} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="noEndDate"
                render={({ field }) => (
                  <FormItem className="flex-row items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3">
                    <div className="space-y-0.5">
                      <FormLabel>Sem data fim</FormLabel>
                      <FormDescription>Continua sendo gerada todos os meses</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {!noEndDate && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Data de fim</FormLabel>
                      <FormControl>
                        <DateField value={field.value} onChange={field.onChange} ref={field.ref} invalid={!!fieldState.error} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tagId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem tag</SelectItem>
                        {tags.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <p className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Se você já lançou este mês manualmente em Receitas, exclua o lançamento manual para não duplicar.
              </p>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Salvar alterações" : "Criar receita fixa"}
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

function emptyValues(today: string): FixedIncomeFormValues {
  const t = new Date()
  return {
    name: "",
    amount: 0,
    effectiveFrom: today,
    dayOfMonth: 5,
    startDate: toUtcIso(t.getFullYear(), t.getMonth(), t.getDate()),
    noEndDate: true,
    endDate: "",
    tagId: NONE,
  }
}
