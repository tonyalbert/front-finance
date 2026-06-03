"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckCircle2, Edit, Plus, Trash2, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiTag } from "@/lib/finance-types"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function TagsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { token } = useAuth()
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [newTagName, setNewTagName] = React.useState("")
  const [newTagType, setNewTagType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE")
  const [editingTagId, setEditingTagId] = React.useState<string | null>(null)
  const [editingTagName, setEditingTagName] = React.useState("")

  React.useEffect(() => {
    if (!open || !token) return
    apiFetch<ApiTag[]>("/tags", { token }).then(setTags).catch(() => {})
  }, [open, token])

  async function handleAddTag() {
    if (!token || newTagName.trim().length < 2) {
      toast.error("Nome da tag precisa ter pelo menos 2 caracteres.")
      return
    }
    try {
      const created = await apiFetch<ApiTag>("/tags", {
        method: "POST",
        token,
        body: JSON.stringify({ name: newTagName.trim(), type: newTagType }),
      })
      setTags((prev) => [...prev, created])
      setNewTagName("")
      toast.success("Tag criada com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar tag.")
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!token) return
    try {
      await apiFetch(`/tags/${tagId}`, { method: "DELETE", token })
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      toast.success("Tag excluída com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir tag.")
    }
  }

  async function handleUpdateTag() {
    if (!token || !editingTagId || editingTagName.trim().length < 2) {
      toast.error("Nome da tag precisa ter pelo menos 2 caracteres.")
      return
    }
    try {
      await apiFetch(`/tags/${editingTagId}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ name: editingTagName.trim() }),
      })
      setTags((prev) =>
        prev.map((t) =>
          t.id === editingTagId ? { ...t, name: editingTagName.trim() } : t,
        ),
      )
      setEditingTagId(null)
      setEditingTagName("")
      toast.success("Tag atualizada com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar tag.")
    }
  }

  const incomeTags = tags.filter((t) => t.type === "INCOME")
  const expenseTags = tags.filter((t) => t.type === "EXPENSE")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto border-border bg-background text-foreground">
        <SheetHeader className="px-6">
          <SheetTitle className="text-foreground">Gerenciar Tags</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-6 pb-6">
          {/* Add new tag */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
              className="border-border bg-accent/30 text-foreground placeholder:text-muted-foreground"
            />
            <Select
              value={newTagType}
              onValueChange={(v) => setNewTagType(v as "INCOME" | "EXPENSE")}
            >
              <SelectTrigger className="w-36 shrink-0 border-white/12 bg-white/6 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Receita</SelectItem>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddTag} className="shrink-0">
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Income tags */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Tags de Receita</h3>
            <div className="flex flex-wrap gap-2">
              {incomeTags.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">Nenhuma tag de receita.</p>
              ) : (
                incomeTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-2 rounded-full border border-border bg-accent/40 px-3 py-1.5"
                  >
                    {editingTagId === tag.id ? (
                      <>
                        <Input
                          className="h-6 w-28 rounded-full border-border bg-accent/30 px-2 text-xs text-foreground"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateTag()
                            if (e.key === "Escape") setEditingTagId(null)
                          }}
                          autoFocus
                        />
                        <button onClick={handleUpdateTag}>
                          <CheckCircle2 className="size-3.5 text-white/60 hover:text-white" />
                        </button>
                        <button onClick={() => setEditingTagId(null)}>
                          <X className="size-3.5 text-white/60 hover:text-white" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-foreground/80">{tag.name}</span>
                        <div className="hidden gap-1 group-hover:flex">
                          <button
                            onClick={() => {
                              setEditingTagId(tag.id)
                              setEditingTagName(tag.name)
                            }}
                          >
                            <Edit className="size-3 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button onClick={() => handleDeleteTag(tag.id)}>
                            <Trash2 className="size-3 text-muted-foreground hover:text-red-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expense tags */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Tags de Despesa</h3>
            <div className="flex flex-wrap gap-2">
              {expenseTags.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">Nenhuma tag de despesa.</p>
              ) : (
                expenseTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/8 px-3 py-1.5"
                  >
                    {editingTagId === tag.id ? (
                      <>
                        <Input
                          className="h-6 w-28 rounded-full border-border bg-accent/30 px-2 text-xs text-foreground"
                          value={editingTagName}
                          onChange={(e) => setEditingTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateTag()
                            if (e.key === "Escape") setEditingTagId(null)
                          }}
                          autoFocus
                        />
                        <button onClick={handleUpdateTag}>
                          <CheckCircle2 className="size-3.5 text-red-400 hover:text-red-300" />
                        </button>
                        <button onClick={() => setEditingTagId(null)}>
                          <X className="size-3.5 text-red-400 hover:text-red-300" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-red-300">{tag.name}</span>
                        <div className="hidden gap-1 group-hover:flex">
                          <button
                            onClick={() => {
                              setEditingTagId(tag.id)
                              setEditingTagName(tag.name)
                            }}
                          >
                            <Edit className="size-3 text-red-400/60 hover:text-red-300" />
                          </button>
                          <button onClick={() => handleDeleteTag(tag.id)}>
                            <Trash2 className="size-3 text-red-400/60 hover:text-red-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
