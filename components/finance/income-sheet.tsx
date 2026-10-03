"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ApiIncome, ApiTag } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DateField } from "./date-field"
import { MoneyInput } from "./money-input"

const schema = z.object({
  source: z.string().trim().min(2, "Informe a fonte (mínimo 2 caracteres)"),
  amount: z.number().positive("Informe um valor maior que zero"),
  date: z.string().min(1, "Escolha a data"),
  tagId: z.string(),
})
export type IncomeFormValues = z.infer<typeof schema>

const NONE = "none"

/** Criar ou editar uma receita. Sheet lateral no desktop e bottom sheet no mobile. */
export function IncomeSheet({
  open,
  onOpenChange,
  income,
  defaultDate,
  tags,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  income: ApiIncome | null
  defaultDate: string
  tags: ApiTag[]
  onSubmit: (values: IncomeFormValues, income: ApiIncome | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!income
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { source: "", amount: 0, date: defaultDate, tagId: NONE },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      income
        ? { source: income.source, amount: Number(income.amount) || 0, date: income.date, tagId: income.tagId ?? NONE }
        : { source: "", amount: 0, date: defaultDate, tagId: NONE },
    )
  }, [open, income, defaultDate, form])

  const isSubmitting = form.formState.isSubmitting

  async function submit(values: IncomeFormValues) {
    try {
      await onSubmit(values, income)
      onOpenChange(false)
    } catch {
      // o chamador mostra o toast de erro; mantém o formulário aberto
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-lg">{editing ? "Editar receita" : "Nova receita"}</SheetTitle>
          <SheetDescription>Salário, freelas, rendimentos e outras entradas.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fonte <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Salário mensal" autoComplete="off" className="h-10" {...field} />
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
                  name="date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <DateField value={field.value} onChange={field.onChange} ref={field.ref} invalid={!!fieldState.error} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Salvar alterações" : "Salvar receita"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
