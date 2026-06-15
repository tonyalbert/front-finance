"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Send, ShieldCheck, User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getMyTicket, sendMessage, CATEGORY_LABEL, STATUS_LABEL } from "@/lib/tickets-api"
import type { Ticket } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function statusStyle(status: string) {
  if (status === "OPEN") return "border-blue-500/20 bg-blue-500/10 text-blue-400"
  if (status === "IN_PROGRESS") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
  return "border-border bg-muted text-muted-foreground"
}

export default function ChamadoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { token } = useAuth()

  const [ticket, setTicket] = React.useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [content, setContent] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)

  React.useEffect(() => {
    if (!token || !id) return
    let cancelled = false
    setIsLoading(true)
    getMyTicket(token, id)
      .then((data) => { if (!cancelled) setTicket(data) })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar chamado.") })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [token, id])

  async function handleSend() {
    if (!token || !ticket || !content.trim()) return
    const text = content.trim()
    setIsSending(true)
    try {
      const msg = await sendMessage(token, ticket.id, text)
      setTicket((prev) => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
      setContent("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }

  if (!ticket) return null

  const isClosed = ticket.status === "CLOSED"

  return (
    <PageShell
      title={ticket.title}
      headerActions={
        <button
          onClick={() => router.push("/chamados")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
      }
    >
      {/* Ticket meta */}
      <Card className="border-border bg-card">
        <CardContent className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", statusStyle(ticket.status))}>
              {STATUS_LABEL[ticket.status]}
            </span>
            <span className="rounded-full border border-border bg-accent/40 px-2 py-0.5 text-xs text-muted-foreground">
              {CATEGORY_LABEL[ticket.category]}
            </span>
            <span className="text-xs text-muted-foreground/50">
              Aberto em {new Date(ticket.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          {ticket.description && (
            <p className="mt-3 text-sm text-muted-foreground/80 leading-relaxed">{ticket.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Messages */}
      {ticket.messages.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
            Respostas ({ticket.messages.length})
          </p>
          {ticket.messages.map((msg) => (
            <Card
              key={msg.id}
              className={cn(
                "border",
                msg.isAdmin
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card",
              )}
            >
              <CardContent className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    msg.isAdmin ? "bg-primary/20" : "bg-accent",
                  )}>
                    {msg.isAdmin
                      ? <ShieldCheck className="size-3.5 text-primary" />
                      : <User className="size-3.5 text-muted-foreground" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground/80">
                    {msg.isAdmin ? "Suporte" : "Você"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {new Date(msg.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply */}
      {isClosed ? (
        <Card className="border-border bg-card">
          <CardContent className="px-5 py-4 text-center text-sm text-muted-foreground/50">
            Este chamado está encerrado.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
              Adicionar resposta
            </p>
            <Textarea
              placeholder="Descreva sua dúvida ou atualização..."
              className="mb-3 min-h-[100px] resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSending}
            />
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={isSending || !content.trim()} size="sm">
                {isSending ? <Spinner className="mr-2 size-4" /> : <Send className="mr-2 size-4" />}
                {isSending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
