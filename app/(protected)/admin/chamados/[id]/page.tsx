"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getAdminTicket, sendMessage, updateTicketStatus, STATUS_LABEL } from "@/lib/tickets-api"
import type { Ticket, TicketStatus } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { TicketCategoryBadge, TicketStatusBadge, TicketThread, formatTicketDate } from "@/components/suporte/ticket-ui"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminChamadoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { user, token, isReady } = useAuth()

  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isSending, setIsSending] = React.useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  React.useEffect(() => {
    if (isReady && !user?.isAdmin) router.replace("/dashboard")
  }, [isReady, user, router])

  const load = React.useCallback(async () => {
    if (!token || !id) return
    setIsLoading(true)
    setLoadError(null)
    try {
      setTicket(await getAdminTicket(token, id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar chamado.")
    } finally {
      setIsLoading(false)
    }
  }, [token, id])

  React.useEffect(() => {
    if (user?.isAdmin) void load()
  }, [user, load])

  async function send(content: string) {
    if (!token || !ticket) return false
    setIsSending(true)
    try {
      const msg = await sendMessage(token, ticket.id, content)
      setTicket((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev))
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.")
      return false
    } finally {
      setIsSending(false)
    }
  }

  async function changeStatus(status: TicketStatus) {
    if (!token || !ticket) return
    setIsUpdatingStatus(true)
    try {
      const updated = await updateTicketStatus(token, ticket.id, status)
      setTicket((prev) => (prev ? { ...prev, status: updated.status } : prev))
      toast.success(`Status alterado para ${STATUS_LABEL[updated.status].toLowerCase()}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar o status.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (!isReady || !user?.isAdmin) return null

  const back = (
    <Button variant="ghost" asChild>
      <Link href="/admin/chamados">
        <ArrowLeft /> Voltar
      </Link>
    </Button>
  )

  if (isLoading) {
    return (
      <PageShell title="Chamado" headerActions={back}>
        <div className="space-y-3" role="status" aria-label="Carregando">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </PageShell>
    )
  }

  if (loadError || !ticket) {
    return (
      <PageShell title="Chamado" headerActions={back}>
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível abrir o chamado</strong>
            <span className="text-muted-foreground">{loadError ?? "Chamado não encontrado."}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title={ticket.title} subtitle={ticket.user.email} headerActions={back}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketCategoryBadge category={ticket.category} />
          <span className="num text-xs text-muted-foreground">Aberto em {formatTicketDate(ticket.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {isUpdatingStatus && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
          <label htmlFor="ticket-status" className="text-[13px] text-muted-foreground">
            Alterar status
          </label>
          <Select value={ticket.status} onValueChange={(v) => void changeStatus(v as TicketStatus)} disabled={isUpdatingStatus}>
            <SelectTrigger id="ticket-status" className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Aberto</SelectItem>
              <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
              <SelectItem value="CLOSED">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TicketThread
        ticket={ticket}
        viewerIsAdmin
        canReply
        isSending={isSending}
        onSend={send}
        placeholder="Digite a resposta para o usuário…"
        sendLabel="Responder"
      />
    </PageShell>
  )
}
