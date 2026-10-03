"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronRight, CheckCircle2, CircleDot, Loader, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { getAllTickets } from "@/lib/tickets-api"
import type { TicketStatus, TicketSummary } from "@/lib/tickets-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { KpiCard } from "@/components/finance/kpi-card"
import { KpiRowSkeleton, TableSkeleton } from "@/components/finance/skeletons"
import { TicketCategoryBadge, TicketStatusBadge, formatTicketDate } from "@/components/suporte/ticket-ui"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type TabValue = "all" | TicketStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "OPEN", label: "Abertos" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "CLOSED", label: "Encerrados" },
]

const normalize = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

export default function AdminChamadosPage() {
  const router = useRouter()
  const { user, token, isReady } = useAuth()

  const [tickets, setTickets] = React.useState<TicketSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<TabValue>("OPEN")
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    if (isReady && !user?.isAdmin) router.replace("/dashboard")
  }, [isReady, user, router])

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      setTickets(await getAllTickets(token))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar chamados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    if (user?.isAdmin) void load()
  }, [user, load])

  const counts = React.useMemo(() => {
    const c: Record<TabValue, number> = { all: tickets.length, OPEN: 0, IN_PROGRESS: 0, CLOSED: 0 }
    tickets.forEach((t) => (c[t.status] += 1))
    return c
  }, [tickets])

  const filtered = React.useMemo(() => {
    const q = normalize(search)
    return tickets.filter((t) => {
      if (activeTab !== "all" && t.status !== activeTab) return false
      return !q || normalize(`${t.title} ${t.user.email}`).includes(q)
    })
  }, [tickets, activeTab, search])

  if (!isReady || !user?.isAdmin) return null

  return (
    <PageShell title="Admin Suporte" subtitle="Chamados de todos os usuários">
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard hero label="Abertos" icon={CircleDot} tone="primary" value={String(counts.OPEN)} footnote="Aguardando resposta" />
          <KpiCard label="Em andamento" icon={Loader} tone="warning" value={String(counts.IN_PROGRESS)} footnote="Com a equipe" />
          <KpiCard label="Encerrados" icon={CheckCircle2} tone="income" value={String(counts.CLOSED)} footnote={`de ${counts.all} no total`} />
        </div>
      )}

      <Card className="gap-0 overflow-clip py-0" aria-label="Chamados">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:px-5">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="h-10 pl-9"
              placeholder="Buscar assunto ou e-mail"
              aria-label="Buscar chamados"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-[3px] md:ml-auto">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={activeTab === t.value}
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  "inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground md:flex-none",
                  activeTab === t.value && "bg-card text-foreground shadow-xs",
                )}
              >
                {t.label}
                <span className="num text-[11px] text-muted-foreground">{counts[t.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : loadError ? (
          <div className="px-4 pb-5 md:px-5">
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
            className="border-t"
            icon={ShieldCheck}
            title="Nenhum chamado encontrado"
            description={search || activeTab !== "all" ? "Nenhum chamado corresponde ao filtro atual." : "Quando alguém abrir um chamado, ele aparece aqui."}
            action={
              search || activeTab !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("")
                    setActiveTab("all")
                  }}
                >
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y border-t">
            {filtered.map((t) => {
              const last = t.messages.at(-1)
              return (
                <li key={t.id}>
                  <Link href={`/admin/chamados/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 md:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">{t.user.email}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <strong className="truncate text-sm font-medium">{t.title}</strong>
                        <TicketCategoryBadge category={t.category} />
                      </div>
                      {last && (
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                          <span className="font-medium">{last.isAdmin ? "Suporte" : "Usuário"}:</span> {last.content}
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
    </PageShell>
  )
}
