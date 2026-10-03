"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, ChevronRight, LifeBuoy, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { createTicket, getMyTickets } from "@/lib/tickets-api"
import type { TicketStatus, TicketSummary } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { TableSkeleton } from "@/components/finance/skeletons"
import { NewTicketSheet, type NewTicketValues } from "@/components/suporte/new-ticket-sheet"
import { TicketCategoryBadge, TicketStatusBadge, formatTicketDate } from "@/components/suporte/ticket-ui"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type TabValue = "all" | TicketStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "OPEN", label: "Abertos" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "CLOSED", label: "Encerrados" },
]

export default function ChamadosPage() {
  const router = useRouter()
  const { token } = useAuth()

  const [tickets, setTickets] = React.useState<TicketSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabValue>("all")
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      setTickets(await getMyTickets(token))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar chamados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  const counts = React.useMemo(() => {
    const c: Record<TabValue, number> = { all: tickets.length, OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 }
    tickets.forEach((t) => (c[t.status] += 1))
    return c
  }, [tickets])

  const filtered = React.useMemo(() => (activeTab === "all" ? tickets : tickets.filter((t) => t.status === activeTab)), [tickets, activeTab])

  async function create(values: NewTicketValues) {
    if (!token) throw new Error("Sessão expirada.")
    try {
      const ticket = await createTicket(token, values)
      setSheetOpen(false)
      router.push(`/chamados/${ticket.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar chamado.")
      throw err
    }
  }

  return (
    <PageShell
      title="Suporte"
      subtitle="Seus chamados com a equipe Pit Finance"
      headerActions={
        <Button onClick={() => setSheetOpen(true)}>
          <Plus /> Novo chamado
        </Button>
      }
    >
      <div role="group" aria-label="Filtrar por status" className="flex w-full flex-wrap gap-0.5 self-start rounded-lg bg-muted p-[3px] sm:w-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={activeTab === t.value}
            onClick={() => setActiveTab(t.value)}
            className={cn(
              "inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground sm:flex-none",
              activeTab === t.value && "bg-card text-foreground shadow-xs",
            )}
          >
            {t.label}
            <span className="num text-[11px] text-muted-foreground">{counts[t.value]}</span>
          </button>
        ))}
      </div>

      <Card className="gap-0 overflow-clip py-0" aria-label="Seus chamados">
        {isLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : loadError ? (
          <div className="p-4">
            <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
              <div className="min-w-0 flex-1 text-[13px]">
                <strong className="block text-sm font-semibold">Não foi possível carregar os chamados</strong>
                <span className="text-muted-foreground">{loadError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw /> Tentar novamente
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title={tickets.length === 0 ? "Nenhum chamado ainda" : "Nenhum chamado neste filtro"}
            description={tickets.length === 0 ? "Precisa de ajuda ou tem uma sugestão? Abra um chamado e a equipe responde por aqui." : undefined}
            action={
              tickets.length === 0 ? (
                <Button onClick={() => setSheetOpen(true)}>
                  <Plus /> Abrir primeiro chamado
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setActiveTab("all")}>
                  Ver todos
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((t) => {
              const last = t.messages.at(-1)
              return (
                <li key={t.id}>
                  <Link href={`/chamados/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 md:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm font-medium">{t.title}</strong>
                        <TicketCategoryBadge category={t.category} />
                      </div>
                      {last && (
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                          <span className="font-medium">{last.isAdmin ? "Suporte" : "Você"}:</span> {last.content}
                        </p>
                      )}
                      <p className="num mt-0.5 text-xs text-muted-foreground">Atualizado em {formatTicketDate(t.updatedAt)}</p>
                    </div>
                    <TicketStatusBadge status={t.status} />
                    <ChevronRight className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <NewTicketSheet open={sheetOpen} onOpenChange={setSheetOpen} onSubmit={create} />
    </PageShell>
  )
}
