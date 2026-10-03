"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getMyTicket, sendMessage } from "@/lib/tickets-api"
import type { Ticket } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { TicketCategoryBadge, TicketStatusBadge, TicketThread, formatTicketDate } from "@/components/suporte/ticket-ui"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ChamadoDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { token } = useAuth()

  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isSending, setIsSending] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token || !id) return
    setIsLoading(true)
    setLoadError(null)
    try {
      setTicket(await getMyTicket(token, id))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar chamado.")
    } finally {
      setIsLoading(false)
    }
  }, [token, id])

  React.useEffect(() => {
    void load()
  }, [load])

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

  const back = (
    <Button variant="ghost" asChild>
      <Link href="/chamados">
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
    <PageShell title={ticket.title} headerActions={back}>
      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <TicketCategoryBadge category={ticket.category} />
        <span className="num text-xs text-muted-foreground">Aberto em {formatTicketDate(ticket.createdAt)}</span>
      </div>

      <TicketThread
        ticket={ticket}
        viewerIsAdmin={false}
        canReply={ticket.status !== "CLOSED"}
        isSending={isSending}
        onSend={send}
        placeholder="Descreva sua dúvida ou atualização…"
        sendLabel="Enviar"
      />
    </PageShell>
  )
}
