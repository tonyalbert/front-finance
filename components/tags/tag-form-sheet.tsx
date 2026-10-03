"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiFetch } from "@/lib/api"
import type { ApiTag } from "@/lib/finance-types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const schema = z.object({
  name: z.string().trim().min(2, "O nome precisa ter pelo menos 2 caracteres"),
  type: z.enum(["INCOME", "EXPENSE"]),
})
type TagFormValues = z.infer<typeof schema>

/** Criar, renomear ou excluir uma tag. O tipo (receita/despesa) só se escolhe na criação. */
export function TagFormSheet({
  open,
  onOpenChange,
  tag,
  defaultType = "EXPENSE",
  onSaved,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tag: ApiTag | null
  defaultType?: ApiTag["type"]
  onSaved: (tag: ApiTag) => void
  onDeleted: (id: string) => void
}) {
  const { token } = useAuth()
  const isMobile = useIsMobile()
  const editing = !!tag
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const form = useForm<TagFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: defaultType },
  })

  React.useEffect(() => {
    if (open) form.reset({ name: tag?.name ?? "", type: tag?.type ?? defaultType })
  }, [open, tag, defaultType, form])

  async function submit(values: TagFormValues) {
    if (!token) return
    try {
      const saved = tag
        ? await apiFetch<ApiTag>(`/tags/${tag.id}`, { method: "PUT", token, body: JSON.stringify({ name: values.name }) })
        : await apiFetch<ApiTag>("/tags", { method: "POST", token, body: JSON.stringify({ name: values.name, type: values.type }) })
      // o PUT pode não devolver o tipo: mantém o que já conhecemos
      onSaved({ ...tag, ...saved, name: values.name, type: tag?.type ?? values.type })
      toast.success(tag ? "Tag atualizada." : "Tag criada.")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a tag.")
    }
  }

  async function remove() {
    if (!token || !tag) return
    setIsDeleting(true)
    try {
      await apiFetch(`/tags/${tag.id}`, { method: "DELETE", token })
      onDeleted(tag.id)
      toast.success("Tag excluída.")
      setConfirmDelete(false)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir a tag.")
    } finally {
      setIsDeleting(false)
    }
  }

  const isSubmitting = form.formState.isSubmitting

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
        >
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-lg">{editing ? "Editar tag" : "Nova tag"}</SheetTitle>
            <SheetDescription>Categorias usadas para organizar receitas e despesas.</SheetDescription>
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
                        <Input placeholder="Ex.: Mercado" autoComplete="off" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel id="tag-type-label">Tipo</FormLabel>
                      <div role="group" aria-labelledby="tag-type-label" className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-[3px]">
                        {(
                          [
                            { v: "EXPENSE", label: "Despesa" },
                            { v: "INCOME", label: "Receita" },
                          ] as const
                        ).map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            aria-pressed={field.value === o.v}
                            disabled={editing}
                            onClick={() => field.onChange(o.v)}
                            className={cn(
                              "h-[30px] rounded-md text-[13px] font-medium text-muted-foreground disabled:cursor-not-allowed",
                              field.value === o.v && "bg-card text-foreground shadow-xs",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {editing && <FormDescription>O tipo não muda depois de criada.</FormDescription>}
                    </FormItem>
                  )}
                />
              </div>

              <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-3">
                {editing ? (
                  <Button type="button" variant="ghost" className="text-expense hover:text-expense" onClick={() => setConfirmDelete(true)}>
                    <Trash2 /> Excluir
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="animate-spin" />}
                    {editing ? "Salvar" : "Criar tag"}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a tag “{tag?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Os lançamentos que usam esta tag ficam sem tag. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void remove()} disabled={isDeleting}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
