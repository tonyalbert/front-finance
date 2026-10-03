"use client"

import * as React from "react"
import { CheckCircle2, CircleDot, Loader, Send, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/tickets-api"
import type { Ticket, TicketCategory, TicketStatus } from "@/lib/tickets-api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const STATUS_STYLE: Record<TicketStatus, { icon: typeof CircleDot; cls: string }> = {
  OPEN: { icon: CircleDot, cls: "bg-info-soft text-info" },
  IN_PROGRESS: { icon: Loader, cls: "bg-warning-soft text-warning" },
  CLOSED: { icon: CheckCircle2, cls: "bg-muted text-muted-foreground" },
}

/** Status do chamado, sempre com ícone e texto. */
export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const { icon: Icon, cls } = STATUS_STYLE[status]
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function TicketCategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
      {CATEGORY_LABEL[category]}
    </span>
  )
}

export function formatTicketDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

/**
 * Conversa de um chamado: o pedido original, as respostas e o campo para responder.
 * `viewerIsAdmin` define de que lado ficam as mensagens (as do próprio leitor ficam à direita).
 */
export function TicketThread({
  ticket,
  viewerIsAdmin,
  canReply,
  isSending,
  onSend,
  placeholder,
  sendLabel,
  closedNote = "Este chamado está encerrado.",
}: {
  ticket: Ticket
  viewerIsAdmin: boolean
  canReply: boolean
  isSending: boolean
  onSend: (content: string) => Promise<boolean>
  placeholder: string
  sendLabel: string
  closedNote?: string
}) {
  const [content, setContent] = React.useState("")
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [ticket.messages.length])

  async function send() {
    const text = content.trim()
    if (!text || isSending) return
    if (await onSend(text)) setContent("")
  }

  const initial = (ticket.user?.email ?? "?").slice(0, 2).toUpperCase()

  return (
    <section aria-label="Conversa" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {/* O pedido original abre a conversa */}
        <Bubble
          mine={!viewerIsAdmin}
          author={viewerIsAdmin ? ticket.user.email : "Você"}
          initial={viewerIsAdmin ? initial : "VC"}
          date={formatTicketDate(ticket.createdAt, true)}
          content={ticket.description}
          admin={false}
        />
        {ticket.messages.map((m) => {
          const mine = viewerIsAdmin ? m.isAdmin : !m.isAdmin
          return (
            <Bubble
              key={m.id}
              mine={mine}
              admin={m.isAdmin}
              author={m.isAdmin ? "Suporte" : viewerIsAdmin ? m.user.email : "Você"}
              initial={m.isAdmin ? "" : viewerIsAdmin ? m.user.email.slice(0, 2).toUpperCase() : "VC"}
              date={formatTicketDate(m.createdAt, true)}
              content={m.content}
            />
          )
        })}
      </ul>
      <div ref={endRef} />

      {canReply ? (
        <div className="rounded-xl border bg-card p-3 shadow-xs">
          <label htmlFor="ticket-reply" className="sr-only">
            Resposta
          </label>
          <Textarea
            id="ticket-reply"
            placeholder={placeholder}
            className="min-h-[88px] resize-none border-0 p-1 shadow-none focus-visible:ring-0"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                void send()
              }
            }}
            disabled={isSending}
          />
          <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter para enviar</span>
            <Button onClick={() => void send()} disabled={isSending || !content.trim()} className="ml-auto">
              <Send /> {isSending ? "Enviando…" : sendLabel}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">{closedNote}</p>
      )}
    </section>
  )
}

function Bubble({
  mine,
  admin,
  author,
  initial,
  date,
  content,
}: {
  mine: boolean
  admin: boolean
  author: string
  initial: string
  date: string
  content: string
}) {
  return (
    <li className={cn("flex gap-3", mine && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
          admin ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
        )}
        aria-hidden
      >
        {admin ? <ShieldCheck className="size-4" /> : initial}
      </span>
      <div className={cn("flex max-w-[min(640px,85%)] flex-col gap-1", mine && "items-end")}>
        <div className={cn("flex flex-wrap items-baseline gap-x-2 text-xs", mine && "flex-row-reverse")}>
          <strong className="font-semibold">{author}</strong>
          <span className="num text-muted-foreground">{date}</span>
        </div>
        <p
          className={cn(
            "whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 text-sm leading-relaxed",
            mine ? "rounded-tr-sm bg-primary-soft" : "rounded-tl-sm bg-card",
          )}
        >
          {content}
        </p>
      </div>
    </li>
  )
}
