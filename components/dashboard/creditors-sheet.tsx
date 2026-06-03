"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, Mail, Phone, Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor } from "@/lib/finance-types"
import { formatBRL } from "@/lib/finance-utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function CreditorsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { token } = useAuth()
  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const [newName, setNewName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newEmail, setNewEmail] = React.useState("")

  React.useEffect(() => {
    if (!open || !token) return
    setIsLoading(true)
    apiFetch<ApiCreditor[]>("/creditors/summary", { token })
      .then(setCreditors)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [open, token])

  async function handleAdd() {
    if (!token || newName.trim().length < 2) {
      toast.error("Nome precisa ter pelo menos 2 caracteres.")
      return
    }
    try {
      const created = await apiFetch<ApiCreditor>("/creditors", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || null,
          email: newEmail.trim() || null,
        }),
      })
      setCreditors((p) => [
        { ...created, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, isPaidOff: false, expenseCount: 0 },
        ...p,
      ])
      setNewName("")
      setNewPhone("")
      setNewEmail("")
      toast.success("Credor criado!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.")
    }
  }

  async function handleDelete(id: string) {
    if (!token) return
    try {
      await apiFetch(`/creditors/${id}`, { method: "DELETE", token })
      setCreditors((p) => p.filter((c) => c.id !== id))
      toast.success("Credor excluído!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto border-border bg-background text-foreground">
        <SheetHeader className="px-6">
          <SheetTitle className="text-foreground">Credores</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-6 pb-6">
          {/* Inline add form */}
          <div className="space-y-2">
            <Input
              placeholder="Nome do credor *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
              className="border-border bg-accent/30 text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <Input
                placeholder="Telefone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="border-border bg-accent/30 text-foreground placeholder:text-muted-foreground"
              />
              <Input
                placeholder="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="border-border bg-accent/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="w-full"
            >
              <Plus className="mr-2 size-4" />
              Adicionar credor
            </Button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8" />

          {/* List */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : creditors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum credor cadastrado.</p>
          ) : (
            <div className="space-y-1">
              {creditors.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-accent/20 px-3 py-3 transition-colors hover:bg-accent/40"
                >
                  {/* Avatar */}
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.isPaidOff ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground/90">{c.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />{c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" />{c.email}
                        </span>
                      )}
                    </div>
                    {c.totalAmount > 0 && (
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {formatBRL(c.unpaidAmount)} restante de {formatBRL(c.totalAmount)}
                      </p>
                    )}
                  </div>

                  {/* Status + delete */}
                  <div className="flex shrink-0 items-center gap-1">
                    {c.isPaidOff
                      ? <CheckCircle2 className="size-4 text-emerald-400" />
                      : <AlertCircle className="size-4 text-orange-400" />}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
