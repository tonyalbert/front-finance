"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, Mail, Phone, Plus, Trash2, XCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiCreditorDetails, ApiExpense } from "@/lib/finance-types"
import { MONTHS, formatBRL } from "@/lib/finance-utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function CreditorsSection({
  availableYears,
  refreshKey,
}: {
  availableYears?: number[]
  refreshKey?: number
}) {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])

  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))
  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [isLoading, setIsLoading] = React.useState(false)

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newEmail, setNewEmail] = React.useState("")

  const [details, setDetails] = React.useState<ApiCreditorDetails | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false)

  const years = availableYears ?? [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const fetchCreditors = React.useCallback(async (m: string, y: string) => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await apiFetch<ApiCreditor[]>(`/creditors/summary?month=${m}&year=${y}`, { token })
      setCreditors(res)
    } catch { /* silent */ }
    finally { setIsLoading(false) }
  }, [token])

  React.useEffect(() => { fetchCreditors(month, year) }, [month, year, fetchCreditors, refreshKey])

  async function handleAdd() {
    if (!token || newName.trim().length < 2) { toast.error("Nome precisa ter pelo menos 2 caracteres."); return }
    try {
      const created = await apiFetch<ApiCreditor>("/creditors", {
        method: "POST", token,
        body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim() || null, email: newEmail.trim() || null }),
      })
      setCreditors((p) => [{ ...created, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, isPaidOff: false, expenseCount: 0 }, ...p])
      setNewName(""); setNewPhone(""); setNewEmail("")
      setIsAddOpen(false)
      toast.success("Credor criado!")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro.") }
  }

  async function handleDelete(id: string, ev: React.MouseEvent) {
    ev.stopPropagation()
    if (!token) return
    try {
      await apiFetch(`/creditors/${id}`, { method: "DELETE", token })
      setCreditors((p) => p.filter((c) => c.id !== id))
      toast.success("Credor excluído!")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro.") }
  }

  async function handleOpen(id: string) {
    if (!token) return
    setIsLoadingDetails(true)
    setIsDetailsOpen(true)
    try {
      const d = await apiFetch<ApiCreditorDetails>(`/creditors/${id}`, { token })
      setDetails(d)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); setIsDetailsOpen(false) }
    finally { setIsLoadingDetails(false) }
  }

  const totalPendente = creditors.filter((c) => !c.isPaidOff).reduce((s, c) => s + c.unpaidAmount, 0)
  const pendingCount = creditors.filter((c) => !c.isPaidOff).length

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">Credores</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-orange-500/15 border border-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
              {pendingCount} pendente{pendingCount !== 1 ? "s" : ""} · {formatBRL(totalPendente)}
            </span>
          )}
          {isLoading && <span className="text-xs text-muted-foreground/50">...</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-7 w-[110px] border-border bg-background text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-7 w-[80px] border-border bg-background text-xs text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-3 text-xs">
                <Plus className="mr-1 size-3" />Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Credor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><label className="mb-2 block text-sm font-medium">Nome</label><Input placeholder="Ex: João Silva" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
                <div><label className="mb-2 block text-sm font-medium">Telefone</label><Input placeholder="(11) 98765-4321" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></div>
                <div><label className="mb-2 block text-sm font-medium">Email</label><Input type="email" placeholder="joao@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAdd} disabled={!newName.trim()}>Adicionar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List */}
      {creditors.length === 0 && !isLoading ? (
        <p className="py-3 text-sm text-muted-foreground/60">Nenhum credor neste período.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="divide-y divide-border/50">
            {creditors.map((c) => {
              const pct = c.totalAmount > 0 ? Math.round((c.paidAmount / c.totalAmount) * 100) : 0
              const initials = c.name.slice(0, 2).toUpperCase()
              return (
                <div
                  key={c.id}
                  className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/30"
                  onClick={() => handleOpen(c.id)}
                >
                  {/* Avatar */}
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.isPaidOff ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {initials}
                  </div>

                  {/* Name + contact + bar */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground/90">{c.name}</span>
                      {c.phone && <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Phone className="size-3" />{c.phone}</span>}
                      {c.email && <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex"><Mail className="size-3" />{c.email}</span>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <div
                          className={`h-full rounded-full transition-all ${c.isPaidOff ? "bg-emerald-400/70" : "bg-red-400/60"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/60">{pct}%</span>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold tabular-nums ${c.isPaidOff ? "text-emerald-400" : "text-red-400"}`}>
                      {c.isPaidOff ? "Quitado" : formatBRL(c.unpaidAmount)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">de {formatBRL(c.totalAmount)}</p>
                  </div>

                  {/* Status icon + delete */}
                  <div className="flex shrink-0 items-center gap-1">
                    {c.isPaidOff
                      ? <CheckCircle2 className="size-4 text-emerald-400" />
                      : <AlertCircle className="size-4 text-orange-400" />}
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={(o) => { setIsDetailsOpen(o); if (!o) setDetails(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{details?.name ?? "Carregando..."}</DialogTitle></DialogHeader>
          {isLoadingDetails ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : details?.expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta associada.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details?.expenses.map((exp: ApiExpense) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">{exp.item}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{new Date(exp.date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{formatBRL(Number(exp.amount))}</TableCell>
                      <TableCell className="text-center">
                        {exp.isPaid ? <CheckCircle2 className="mx-auto size-4 text-emerald-500" /> : <XCircle className="mx-auto size-4 text-red-400" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
