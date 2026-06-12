"use client"

import * as React from "react"
import { toast } from "sonner"
import { AlertCircle, CheckCircle2, Mail, Phone, Plus, Trash2, XCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiCreditorDetails, ApiExpense } from "@/lib/finance-types"
import { MONTHS, formatBRL } from "@/lib/finance-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

export default function CreditoresPage() {
  const { token } = useAuth()
  const now = React.useMemo(() => new Date(), [])

  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [creditorFilterMonth, setCreditorFilterMonth] = React.useState<string>(String(now.getMonth() + 1))
  const [creditorFilterYear, setCreditorFilterYear] = React.useState<string>(String(now.getFullYear()))
  const [isLoadingData, setIsLoadingData] = React.useState(false)

  const [isCreditorDialogOpen, setIsCreditorDialogOpen] = React.useState(false)
  const [newCreditorName, setNewCreditorName] = React.useState("")
  const [newCreditorPhone, setNewCreditorPhone] = React.useState("")
  const [newCreditorEmail, setNewCreditorEmail] = React.useState("")

  const [creditorDetails, setCreditorDetails] = React.useState<ApiCreditorDetails | null>(null)
  const [isCreditorDetailsOpen, setIsCreditorDetailsOpen] = React.useState(false)
  const [isLoadingCreditorDetails, setIsLoadingCreditorDetails] = React.useState(false)

  const availableYears = React.useMemo(() => {
    const current = now.getFullYear()
    return [current - 1, current, current + 1]
  }, [now])

  const fetchCreditors = React.useCallback(async (month: string, year: string) => {
    if (!token) return
    setIsLoadingData(true)
    try {
      const res = await apiFetch<ApiCreditor[]>(`/creditors/summary?month=${month}&year=${year}`, { token })
      setCreditors(res)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar credores.")
    } finally {
      setIsLoadingData(false)
    }
  }, [token])

  React.useEffect(() => {
    fetchCreditors(creditorFilterMonth, creditorFilterYear)
  }, [creditorFilterMonth, creditorFilterYear, fetchCreditors])

  async function handleAddCreditor() {
    if (!token || newCreditorName.trim().length < 2) {
      toast.error("Nome do credor precisa ter pelo menos 2 caracteres.")
      return
    }
    try {
      const created = await apiFetch<ApiCreditor>("/creditors", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: newCreditorName.trim(),
          phone: newCreditorPhone.trim() || null,
          email: newCreditorEmail.trim() || null,
        }),
      })
      setCreditors((prev) => [
        { ...created, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, isPaidOff: false, expenseCount: 0 },
        ...prev,
      ])
      setNewCreditorName("")
      setNewCreditorPhone("")
      setNewCreditorEmail("")
      setIsCreditorDialogOpen(false)
      toast.success("Credor criado com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar credor.")
    }
  }

  async function handleDeleteCreditor(creditorId: string) {
    if (!token) return
    try {
      await apiFetch(`/creditors/${creditorId}`, { method: "DELETE", token })
      setCreditors((prev) => prev.filter((c) => c.id !== creditorId))
      toast.success("Credor excluído com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir credor.")
    }
  }

  async function handleOpenCreditor(creditorId: string) {
    if (!token) return
    setIsLoadingCreditorDetails(true)
    setIsCreditorDetailsOpen(true)
    try {
      const details = await apiFetch<ApiCreditorDetails>(`/creditors/${creditorId}?month=${creditorFilterMonth}&year=${creditorFilterYear}`, { token })
      const filtered = details.expenses.filter((e) => {
        const date = new Date(e.date)
        return date.getMonth() + 1 === Number(creditorFilterMonth) && date.getFullYear() === Number(creditorFilterYear)
      })
      setCreditorDetails({ ...details, expenses: filtered })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar detalhes.")
      setIsCreditorDetailsOpen(false)
    } finally {
      setIsLoadingCreditorDetails(false)
    }
  }

  return (
    <PageShell
      title="Credores"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={creditorFilterMonth} onValueChange={setCreditorFilterMonth}>
            <SelectTrigger className="w-[130px] border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={creditorFilterYear} onValueChange={setCreditorFilterYear}>
            <SelectTrigger className="w-[100px] border-white/10 bg-white/5 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreditorDialogOpen} onOpenChange={setIsCreditorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Plus className="mr-2 size-4" />
                Novo Credor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Credor</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Nome</label>
                  <Input placeholder="Ex: João Silva" value={newCreditorName} onChange={(e) => setNewCreditorName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Telefone</label>
                  <Input placeholder="Ex: (11) 98765-4321" value={newCreditorPhone} onChange={(e) => setNewCreditorPhone(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <Input type="email" placeholder="Ex: joao@email.com" value={newCreditorEmail} onChange={(e) => setNewCreditorEmail(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsCreditorDialogOpen(false); setNewCreditorName(""); setNewCreditorPhone(""); setNewCreditorEmail("") }}>Cancelar</Button>
                  <Button onClick={handleAddCreditor} disabled={!newCreditorName.trim()}>Adicionar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {isLoadingData && <p className="text-sm text-white/40">Carregando credores...</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {creditors.length === 0 && !isLoadingData ? (
          <Card className="bg-white/[0.03] border-white/[0.07]">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum credor neste período.
            </CardContent>
          </Card>
        ) : (
          creditors.map((creditor) => (
            <Card
              key={creditor.id}
              className={[
                "cursor-pointer bg-white/[0.04] border-white/[0.08] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.14]",
                creditor.isPaidOff ? "" : "border-orange-500/20",
              ].join(" ")}
              onClick={() => handleOpenCreditor(creditor.id)}
            >
              <CardContent className="px-3 py-3">
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{creditor.name}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {creditor.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="size-3" />{creditor.phone}
                        </div>
                      )}
                      {creditor.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="size-3" />{creditor.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCreditor(creditor.id) }}
                    className="ml-2 shrink-0 rounded-full p-0.5 hover:bg-muted"
                    title="Excluir credor"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium tabular-nums">{formatBRL(creditor.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pago:</span>
                    <span className="font-medium tabular-nums text-emerald-500">{formatBRL(creditor.paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Restante:</span>
                    <span className={`font-semibold tabular-nums ${creditor.isPaidOff ? "text-emerald-500" : "text-red-400"}`}>
                      {formatBRL(creditor.unpaidAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {creditor.isPaidOff ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="size-3" />Quitado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
                        <AlertCircle className="size-3" />Pendente
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Creditor details dialog */}
      <Dialog
        open={isCreditorDetailsOpen}
        onOpenChange={(open) => { setIsCreditorDetailsOpen(open); if (!open) setCreditorDetails(null) }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{creditorDetails?.name ?? "Carregando..."}</DialogTitle>
          </DialogHeader>
          {isLoadingCreditorDetails ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando contas...</p>
          ) : creditorDetails?.expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta associada.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditorDetails?.expenses.map((exp: ApiExpense) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-sm">{exp.item}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {new Date(exp.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatBRL(Number(exp.amount))}
                      </TableCell>
                      <TableCell className="text-center">
                        {exp.isPaid ? (
                          <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="mx-auto size-4 text-red-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
