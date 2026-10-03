"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatBRL } from "@/lib/finance-utils"
import type { ApiCreditor, ApiExpense, ApiTag } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { DateField } from "./date-field"
import { MoneyInput } from "./money-input"

const schema = z
  .object({
    item: z.string().trim().min(2, "Informe o item (mínimo 2 caracteres)"),
    amount: z.number().positive("Informe um valor maior que zero"),
    date: z.string().min(1, "Escolha a data de vencimento"),
    tagId: z.string(),
    creditorId: z.string(),
    isPaid: z.boolean(),
    installments: z.boolean(),
    installmentCount: z.number(),
    applyToGroup: z.enum(["one", "all"]),
  })
  .superRefine((v, ctx) => {
    if (v.installments && (!Number.isInteger(v.installmentCount) || v.installmentCount < 2 || v.installmentCount > 60)) {
      ctx.addIssue({ code: "custom", path: ["installmentCount"], message: "Use de 2 a 60 parcelas" })
    }
  })

export type ExpenseFormValues = z.infer<typeof schema>

const NONE = "none"

/** Criar ou editar uma despesa. Sheet lateral no desktop e bottom sheet no mobile. */
export function ExpenseSheet({
  open,
  onOpenChange,
  expense,
  defaultDate,
  tags,
  creditors,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Despesa em edição; sem ela o formulário cria uma nova */
  expense: ApiExpense | null
  /** Data inicial (ISO UTC) ao criar */
  defaultDate: string
  tags: ApiTag[]
  creditors: Pick<ApiCreditor, "id" | "name">[]
  onSubmit: (values: ExpenseFormValues, expense: ApiExpense | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!expense
  const inGroup = !!expense?.installmentGroupId

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(defaultDate),
  })

  // Recarrega o formulário a cada abertura (nova ou edição).
  React.useEffect(() => {
    if (!open) return
    form.reset(
      expense
        ? {
            item: expense.item,
            amount: Number(expense.amount) || 0,
            date: expense.date,
            tagId: expense.tagId ?? NONE,
            creditorId: expense.creditorId ?? NONE,
            isPaid: expense.isPaid,
            installments: false,
            installmentCount: 2,
            applyToGroup: "one",
          }
        : emptyValues(defaultDate),
    )
  }, [open, expense, defaultDate, form])

  const installments = useWatch({ control: form.control, name: "installments" })
  const count = useWatch({ control: form.control, name: "installmentCount" })
  const amount = useWatch({ control: form.control, name: "amount" })
  const isSubmitting = form.formState.isSubmitting

  async function submit(values: ExpenseFormValues) {
    try {
      await onSubmit(values, expense)
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
          <SheetTitle className="text-lg">{editing ? "Editar despesa" : "Nova despesa"}</SheetTitle>
          <SheetDescription>
            {editing ? "Altere os dados do lançamento." : "Lance uma despesa avulsa ou parcelada."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              <FormField
                control={form.control}
                name="item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Item <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Supermercado" autoComplete="off" className="h-10" {...field} />
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
                        {installments ? "Valor da parcela" : "Valor"} <span className="text-expense" aria-hidden>*</span>
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
                      <FormLabel>{installments ? "1ª parcela vence em" : "Vencimento"}</FormLabel>
                      <FormControl>
                        <DateField
                          value={field.value}
                          onChange={field.onChange}
                          ref={field.ref}
                          invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="isPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel id="status-label">Status</FormLabel>
                    <div
                      role="group"
                      aria-labelledby="status-label"
                      className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-[3px]"
                    >
                      {[
                        { v: false, label: "Pendente" },
                        { v: true, label: "Pago" },
                      ].map((o) => (
                        <button
                          key={o.label}
                          type="button"
                          aria-pressed={field.value === o.v}
                          onClick={() => field.onChange(o.v)}
                          className={cn(
                            "h-[30px] rounded-md text-[13px] font-medium text-muted-foreground",
                            field.value === o.v && "bg-card text-foreground shadow-xs",
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />

              {!editing && (
                <>
                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem className="flex-row items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3">
                        <div className="space-y-0.5">
                          <FormLabel>Compra parcelada</FormLabel>
                          <FormDescription>Gera uma despesa por mês, com a parcela no nome</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {installments && (
                    <FormField
                      control={form.control}
                      name="installmentCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de parcelas</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="numeric"
                              className="num h-10 max-w-[140px]"
                              value={field.value ? String(field.value) : ""}
                              onChange={(e) => field.onChange(Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0)}
                              onBlur={field.onBlur}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormDescription>
                            {count >= 2 && amount > 0
                              ? `${count}x de ${formatBRL(amount)} · total ${formatBRL(amount * count)}`
                              : "De 2 a 60 parcelas"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              {editing && inGroup && (
                <FormField
                  control={form.control}
                  name="applyToGroup"
                  render={({ field }) => (
                    <FormItem className="rounded-[10px] border px-3.5 py-3">
                      <FormLabel>Tag e credor desta compra parcelada</FormLabel>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="one" /> Alterar só esta parcela
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="all" /> Alterar em todas as parcelas
                        </label>
                      </RadioGroup>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {editing ? "Salvar alterações" : installments ? "Criar parcelas" : "Salvar despesa"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

function emptyValues(date: string): ExpenseFormValues {
  return {
    item: "",
    amount: 0,
    date,
    tagId: NONE,
    creditorId: NONE,
    isPaid: false,
    installments: false,
    installmentCount: 2,
    applyToGroup: "one",
  }
}
