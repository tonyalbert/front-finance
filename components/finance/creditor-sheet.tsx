"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ApiCreditor } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome (mínimo 2 caracteres)"),
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Informe um e-mail válido"),
})
export type CreditorFormValues = z.infer<typeof schema>

/** Criar ou editar um credor (pessoa ou instituição para quem você deve). */
export function CreditorSheet({
  open,
  onOpenChange,
  creditor,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditor: Pick<ApiCreditor, "id" | "name" | "phone" | "email"> | null
  onSubmit: (values: CreditorFormValues, creditor: Pick<ApiCreditor, "id"> | null) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const editing = !!creditor
  const form = useForm<CreditorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "" },
  })

  React.useEffect(() => {
    if (open) form.reset({ name: creditor?.name ?? "", phone: creditor?.phone ?? "", email: creditor?.email ?? "" })
  }, [open, creditor, form])

  const isSubmitting = form.formState.isSubmitting

  async function submit(values: CreditorFormValues) {
    try {
      await onSubmit(values, creditor)
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
          <SheetTitle className="text-lg">{editing ? "Editar credor" : "Novo credor"}</SheetTitle>
          <SheetDescription>Para quem você paga: bancos, pessoas, imobiliárias…</SheetDescription>
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
                      <Input placeholder="Ex.: Nubank" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input type="tel" inputMode="tel" placeholder="(11) 98765-4321" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@exemplo.com" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
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
                {editing ? "Salvar alterações" : "Criar credor"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
