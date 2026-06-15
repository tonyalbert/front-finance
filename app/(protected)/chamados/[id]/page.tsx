"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Send } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getMyTicket, sendMessage, CATEGORY_LABEL, STATUS_LABEL } from "@/lib/tickets-api"
import type { Ticket } from "@/lib/tickets-api"
import { Button } from "@/components/ui/button"
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

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

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

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [ticket?.messages])

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/chamados")}
            className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">{ticket.title}</h1>
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", statusStyle(ticket.status))}>
                {STATUS_LABEL[ticket.status]}
              </span>
              <span className="rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {CATEGORY_LABEL[ticket.category]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground/50">
              Aberto em {new Date(ticket.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            {ticket.description && (
              <p className="mt-1.5 text-sm text-muted-foreground/70">{ticket.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {ticket.messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground/50">
            Nenhuma mensagem ainda. Envie uma mensagem abaixo.
          </p>
        )}
        <div className="space-y-3">
          {ticket.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.isAdmin ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  msg.isAdmin
                    ? "rounded-tl-sm bg-muted text-foreground"
                    : "rounded-tr-sm bg-primary text-primary-foreground",
                )}
              >
                {msg.isAdmin && (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Suporte
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={cn(
                  "mt-1 text-[10px]",
                  msg.isAdmin ? "text-muted-foreground/50" : "text-primary-foreground/60",
                )}>
                  {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6">
        {isClosed ? (
          <p className="text-center text-sm text-muted-foreground/50">
            Este chamado está encerrado.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              placeholder="Digite sua mensagem... (Enter para enviar)"
              className="max-h-32 min-h-[44px] flex-1 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isSending || !content.trim()}
              className="shrink-0"
            >
              {isSending ? <Spinner className="size-4" /> : <Send className="size-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
