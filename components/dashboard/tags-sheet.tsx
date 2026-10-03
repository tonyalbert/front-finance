"use client"

import * as React from "react"
import Link from "next/link"
import { Pencil, Plus, Tag } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useIsMobile } from "@/hooks/use-mobile"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ApiTag } from "@/lib/finance-types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EmptyState } from "@/components/finance/empty-state"
import { tagColor } from "@/components/finance/inline-edit"
import { Skeleton } from "@/components/ui/skeleton"
import { TagFormSheet } from "@/components/tags/tag-form-sheet"

/**
 * Atalho para gerenciar tags sem sair da tela (Receitas e Despesas).
 * A gestão completa, com totais por tag, fica na rota /tags.
 */
export function TagsSheet({
  open,
  onOpenChange,
  defaultType = "EXPENSE",
  onTagsChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tipo da tag criada pelo botão "Nova tag" (o da tela de origem) */
  defaultType?: ApiTag["type"]
  /** Avisa a página para atualizar as tags que ela mostra */
  onTagsChange?: (tags: ApiTag[]) => void
}) {
  const { token } = useAuth()
  const isMobile = useIsMobile()
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ApiTag | null>(null)

  React.useEffect(() => {
    if (!open || !token) return
    let cancelled = false
    setIsLoading(true)
    apiFetch<ApiTag[]>("/tags", { token })
      .then((res) => {
        if (!cancelled) setTags(res)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, token])

  function commit(next: ApiTag[]) {
    setTags(next)
    onTagsChange?.(next)
  }

  const groups: { type: ApiTag["type"]; title: string }[] = [
    { type: "EXPENSE", title: "Despesas" },
    { type: "INCOME", title: "Receitas" },
  ]

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
        >
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-lg">Tags</SheetTitle>
            <SheetDescription>Toque numa tag para renomear ou excluir.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> Nova tag
            </Button>

            {isLoading ? (
              <div className="space-y-2" role="status" aria-label="Carregando">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : tags.length === 0 ? (
              <EmptyState icon={Tag} title="Nenhuma tag ainda" description="Crie tags para organizar seus lançamentos." className="py-8" />
            ) : (
              groups.map((g) => {
                const list = tags.filter((t) => t.type === g.type)
                return (
                  <section key={g.type} aria-label={`Tags de ${g.title.toLowerCase()}`}>
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {g.title} <span className="num normal-case">· {list.length}</span>
                    </h3>
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma tag de {g.title.toLowerCase()}.</p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {list.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(t)
                                setFormOpen(true)
                              }}
                              className="group flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-muted/50"
                            >
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: tagColor(tags.findIndex((x) => x.id === t.id)) }}
                                aria-hidden
                              />
                              <span className="flex-1 truncate font-medium">{t.name}</span>
                              <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 max-md:opacity-60" aria-hidden />
                              <span className="sr-only">Editar tag {t.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })
            )}

            <Link href="/tags" onClick={() => onOpenChange(false)} className="text-[13px] font-medium text-primary hover:underline">
              Ver totais por tag →
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <TagFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        tag={editing}
        defaultType={defaultType}
        onSaved={(saved) => commit(editing ? tags.map((t) => (t.id === saved.id ? saved : t)) : [...tags, saved])}
        onDeleted={(id) => commit(tags.filter((t) => t.id !== id))}
      />
    </>
  )
}
