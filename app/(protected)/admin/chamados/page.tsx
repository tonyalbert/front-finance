"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { redirect } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getAllTickets, CATEGORY_LABEL, STATUS_LABEL } from "@/lib/tickets-api"
import type { TicketStatus, TicketSummary } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function AdminChamadosPage() {
  const router = useRouter()
  const { user, token, isReady } = useAuth()

  const [tickets, setTickets] = React.useState<TicketSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<TabValue>("all")

  React.useEffect(() => {
    if (!isReady) return
    if (!user?.isAdmin) {
      redirect("/dashboard")
    }
  }, [isReady, user])

  React.useEffect(() => {
    if (!token || !user?.isAdmin) return
    let cancelled = false
    setIsLoading(true)
    getAllTickets(token)
      .then((data) => { if (!cancelled) setTickets(data) })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar chamados.") })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [token, user])

  const filtered = React.useMemo(
    () => activeTab === "all" ? tickets : tickets.filter((t) => t.status === activeTab),
    [tickets, activeTab],
  )

  if (!isReady || !user?.isAdmin) return null

  return (
    <PageShell title="Admin — Chamados">
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
          <ShieldCheck className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground/60">Nenhum chamado encontrado.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((ticket) => {
          const lastMsg = ticket.messages.at(-1)
          return (
            <Card key={ticket.id} className="border-border bg-card">
              <CardContent className="flex flex-col gap-2 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground/60">{ticket.user.email}</p>
                    <p className="mt-0.5 text-sm font-medium text-foreground/90">{ticket.title}</p>
                  </div>
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
                    {lastMsg.isAdmin ? "Suporte: " : "Usuário: "}{lastMsg.content}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground/40">
                    Atualizado em {new Date(ticket.updatedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/admin/chamados/${ticket.id}`)}
                  >
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </PageShell>
  )
}
