"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LifeBuoy, Plus } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import {
  createTicket,
  getMyTickets,
  CATEGORY_LABEL,
  STATUS_LABEL,
} from "@/lib/tickets-api"
import type { TicketCategory, TicketStatus, TicketSummary } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type TabValue = "all" | TicketStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "OPEN", label: "Abertos" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "CLOSED", label: "Encerrados" },
]

function statusStyle(status: TicketStatus) {
  if (status === "OPEN") return "border-blue-500/20 bg-blue-500/10 text-blue-400"
  if (status === "IN_PROGRESS") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
  return "border-border bg-muted text-muted-foreground"
}

function emptyForm() {
  return { title: "", description: "", category: "OTHER" as TicketCategory }
}

export default function ChamadosPage() {
  const router = useRouter()
  const { token } = useAuth()

  const [tickets, setTickets] = React.useState<TicketSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<TabValue>("all")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm())
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    getMyTickets(token)
      .then((data) => { if (!cancelled) setTickets(data) })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar chamados.") })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const filtered = React.useMemo(
    () => activeTab === "all" ? tickets : tickets.filter((t) => t.status === activeTab),
    [tickets, activeTab],
  )

  function openDialog() {
    setForm(emptyForm())
    setIsDialogOpen(true)
  }

  async function handleCreate() {
    if (!token) return
    const title = form.title.trim()
    const description = form.description.trim()
    if (title.length < 5) { toast.error("Título precisa ter pelo menos 5 caracteres."); return }
    if (description.length < 10) { toast.error("Descrição precisa ter pelo menos 10 caracteres."); return }

    setIsSaving(true)
    try {
      const ticket = await createTicket(token, { title, description, category: form.category })
      setIsDialogOpen(false)
      router.push(`/chamados/${ticket.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar chamado.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageShell
      title="Meus Chamados"
      headerActions={
        <Button size="sm" onClick={openDialog}>
          <Plus className="mr-2 size-4" />
          Abrir Chamado
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="h-auto flex-wrap gap-y-1">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <LifeBuoy className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground/60">Nenhum chamado encontrado.</p>
          <Button size="sm" variant="outline" onClick={openDialog}>
            Abrir primeiro chamado
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((ticket) => {
          const lastMsg = ticket.messages.at(-1)
          return (
            <Card
              key={ticket.id}
              className="cursor-pointer border-border bg-card transition-colors hover:bg-accent/20"
              onClick={() => router.push(`/chamados/${ticket.id}`)}
            >
              <CardContent className="flex flex-col gap-2 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-sm font-medium text-foreground/90">{ticket.title}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {CATEGORY_LABEL[ticket.category]}
                    </span>
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", statusStyle(ticket.status))}>
                      {STATUS_LABEL[ticket.status]}
                    </span>
                  </div>
                </div>
                {lastMsg && (
                  <p className="line-clamp-1 text-xs text-muted-foreground/60">
                    {lastMsg.isAdmin ? "Suporte: " : "Você: "}{lastMsg.content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/40">
                  {new Date(ticket.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Título</label>
              <Input
                placeholder="Descreva o problema em poucas palavras"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Explique com mais detalhes o que aconteceu"
                className="min-h-[100px] resize-none"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoria</label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v as TicketCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">Técnico</SelectItem>
                  <SelectItem value="FINANCIAL">Financeiro</SelectItem>
                  <SelectItem value="ACCOUNT">Conta</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Spinner className="mr-2 size-4" /> : null}
                {isSaving ? "Enviando..." : "Abrir Chamado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
