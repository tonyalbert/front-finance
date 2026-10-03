"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { toUtcIso } from "@/lib/finance-utils"
import type { ApiCreditor, ApiFixedExpense, ApiTag } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { DateField } from "./date-field"
import { MoneyInput } from "./money-input"

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
    amount: z.number().positive("Informe um valor maior que zero"),
    dayOfMonth: z.number(),
    startDate: z.string().min(1, "Informe a data de início"),
    noEndDate: z.boolean(),
    endDate: z.string(),
    tagId: z.string(),
    creditorId: z.string(),
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
export type FixedExpenseFormValues = z.infer<typeof schema>

const NONE = "none"

/** Criar ou editar uma despesa fixa (regra que gera uma despesa por mês). */
export function FixedExpenseSheet({
  open,
  onOpenChange,
  fixedExpense,
  tags,
  creditors,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fixedExpense: ApiFixedExpense | null
  tags: ApiTag[]
  creditors: Pick<ApiCreditor, "id" | "name">[]
  /** Datas chegam como ISO à meia-noite UTC; `slice(0, 10)` dá o YYYY-MM-DD que a API espera. */
  onSubmit: (values: FixedExpenseFormValues, fixedExpense: ApiFixedExpense | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!fixedExpense

  const form = useForm<FixedExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      fixedExpense
        ? {
            name: fixedExpense.name,
            amount: Number(fixedExpense.amount) || 0,
            dayOfMonth: fixedExpense.dayOfMonth,
            startDate: toIso(fixedExpense.startDate),
            noEndDate: !fixedExpense.endDate,
            endDate: fixedExpense.endDate ? toIso(fixedExpense.endDate) : "",
            tagId: fixedExpense.tagId ?? NONE,
            creditorId: fixedExpense.creditorId ?? NONE,
          }
        : emptyValues(),
    )
  }, [open, fixedExpense, form])

  const noEndDate = useWatch({ control: form.control, name: "noEndDate" })
  const isSubmitting = form.formState.isSubmitting

  async function submit(values: FixedExpenseFormValues) {
    try {
      await onSubmit(values, fixedExpense)
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
          <SheetTitle className="text-lg">{editing ? "Editar despesa fixa" : "Nova despesa fixa"}</SheetTitle>
          <SheetDescription>Gera uma despesa por mês, no dia do vencimento.</SheetDescription>
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
                      <Input placeholder="Ex.: Aluguel" autoComplete="off" className="h-10" {...field} />
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
                        Valor <span className="text-expense" aria-hidden>*</span>
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
                      <FormLabel>Dia do vencimento</FormLabel>
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

              <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
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
                <FormField
                  control={form.control}
                  name="creditorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credor</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Sem credor</SelectItem>
                          {creditors.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <p className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Se você já lançou este mês manualmente, exclua o lançamento manual para não duplicar.
              </p>
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Salvar alterações" : "Criar despesa fixa"}
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

function emptyValues(): FixedExpenseFormValues {
  const t = new Date()
  return {
    name: "",
    amount: 0,
    dayOfMonth: 1,
    startDate: toUtcIso(t.getFullYear(), t.getMonth(), t.getDate()),
    noEndDate: true,
    endDate: "",
    tagId: NONE,
    creditorId: NONE,
  }
}
