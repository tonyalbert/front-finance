"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { CATEGORY_LABEL } from "@/lib/tickets-api"
import type { TicketCategory } from "@/lib/tickets-api"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  title: z.string().trim().min(5, "O título precisa ter pelo menos 5 caracteres"),
  description: z.string().trim().min(10, "A descrição precisa ter pelo menos 10 caracteres"),
  category: z.enum(["TECHNICAL", "FINANCIAL", "ACCOUNT", "OTHER"]),
})
export type NewTicketValues = z.infer<typeof schema>

export function NewTicketSheet({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: NewTicketValues) => Promise<void>
}) {
  const isMobile = useIsMobile()
  const form = useForm<NewTicketValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category: "OTHER" },
  })

  React.useEffect(() => {
    if (open) form.reset({ title: "", description: "", category: "OTHER" })
  }, [open, form])

  const isSubmitting = form.formState.isSubmitting

  async function submit(values: NewTicketValues) {
    try {
      await onSubmit(values)
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
          <SheetTitle className="text-lg">Novo chamado</SheetTitle>
          <SheetDescription>Conte o que aconteceu e a equipe responde por aqui.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Assunto <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Descreva o problema em poucas palavras" autoComplete="off" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={(v) => field.onChange(v as TicketCategory)}>
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição <span className="text-expense" aria-hidden>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Explique com mais detalhes o que aconteceu" className="min-h-[140px] resize-none" {...field} />
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
                Abrir chamado
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
