"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  CalendarPlus,
  Clock,
  Infinity as InfinityIcon,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { extendTrial, listUsers, setUserPassword, updateAccess } from "@/lib/admin-api"
import type { AdminUser } from "@/lib/admin-api"
import { ACCESS_LABEL, PLAN_LABEL, daysLabel, formatDate } from "@/lib/billing-api"
import type { AccessKind } from "@/lib/billing-api"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { KpiCard } from "@/components/finance/kpi-card"
import { KpiRowSkeleton, TableSkeleton } from "@/components/finance/skeletons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

const KIND_VARIANT: Record<AccessKind, "soft" | "info" | "income" | "warning" | "expense"> = {
  admin: "soft",
  lifetime: "info",
  subscription: "income",
  trial: "warning",
  none: "expense",
}

const DAY_PRESETS = [7, 30, 90, 365]

const normalize = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

type Dialogs =
  | { kind: "days"; user: AdminUser }
  | { kind: "password"; user: AdminUser }
  | { kind: "endTrial"; user: AdminUser }
  | { kind: "revokeLifetime"; user: AdminUser }
  | null

function DaysDialog({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (days: number) => Promise<void> }) {
  const [days, setDays] = React.useState("30")
  const [saving, setSaving] = React.useState(false)
  const n = Number(days)
  const valid = Number.isInteger(n) && n >= 1 && n <= 3650

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    try {
      await onSave(n)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Dar dias grátis</DialogTitle>
            <DialogDescription>
              Os dias somam ao fim do acesso atual de <strong className="font-medium text-foreground">{user.email}</strong>
              {user.access.expiresAt ? ` (${formatDate(user.access.expiresAt)})` : " (a partir de hoje)"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((p) => (
              <Button key={p} type="button" size="sm" variant={String(p) === days ? "default" : "outline"} onClick={() => setDays(String(p))}>
                +{p} dias
              </Button>
            ))}
          </div>
          <div>
            <label htmlFor="adm-days" className="mb-1.5 block text-sm font-medium">
              Quantidade de dias
            </label>
            <Input
              id="adm-days"
              type="number"
              inputMode="numeric"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              aria-invalid={!valid}
              className="h-10"
            />
            {!valid && <p className="mt-1.5 text-xs text-expense">Use um número inteiro entre 1 e 3650.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Voltar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {saving && <Loader2 className="animate-spin" />} Adicionar dias
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PasswordDialog({ user, onClose, onSave }: { user: AdminUser; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [touched, setTouched] = React.useState(false)
  const error =
    password.length < 6 ? "A senha deve ter no mínimo 6 caracteres." : password !== confirm ? "As senhas não conferem." : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (error) return
    setSaving(true)
    try {
      await onSave(password)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Nova senha para <strong className="font-medium text-foreground">{user.email}</strong>. Passe a senha ao usuário por um canal seguro.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="adm-pw" className="mb-1.5 block text-sm font-medium">
              Nova senha
            </label>
            <Input id="adm-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
          </div>
          <div>
            <label htmlFor="adm-pw2" className="mb-1.5 block text-sm font-medium">
              Confirmar senha
            </label>
            <Input id="adm-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-10" />
            {touched && error && <p className="mt-1.5 text-xs text-expense">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Voltar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Salvar senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  title,
  description,
  action,
  onClose,
  onConfirm,
}: {
  title: string
  description: React.ReactNode
  action: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [saving, setSaving] = React.useState(false)
  return (
    <AlertDialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            onClick={async (e) => {
              e.preventDefault()
              setSaving(true)
              try {
                await onConfirm()
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving && <Loader2 className="animate-spin" />} {action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function AdminUsuariosPage() {
  const router = useRouter()
  const { user, token, isReady } = useAuth()
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<AccessKind | "all">("all")
  const [dialog, setDialog] = React.useState<Dialogs>(null)

  React.useEffect(() => {
    if (isReady && !user?.isAdmin) router.replace("/dashboard")
  }, [isReady, user, router])

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      setUsers(await listUsers(token))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar usuários.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    if (user?.isAdmin) void load()
  }, [user, load])

  const replace = (u: AdminUser) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))

  async function run(action: () => Promise<AdminUser | void>, success: string) {
    try {
      const updated = await action()
      if (updated) replace(updated)
      toast.success(success)
      setDialog(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir.")
    }
  }

  const counts = React.useMemo(() => {
    const c: Record<AccessKind | "all", number> = { all: users.length, admin: 0, lifetime: 0, subscription: 0, trial: 0, none: 0 }
    users.forEach((u) => (c[u.access.kind] += 1))
    return c
  }, [users])

  const filtered = React.useMemo(() => {
    const q = normalize(search)
    return users.filter((u) => (filter === "all" || u.access.kind === filter) && (!q || normalize(u.email).includes(q)))
  }, [users, search, filter])

  if (!isReady || !user?.isAdmin || !token) return null

  const FILTERS: { value: AccessKind | "all"; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "trial", label: "Em teste" },
    { value: "subscription", label: "Assinantes" },
    { value: "lifetime", label: "Vitalício" },
    { value: "none", label: "Sem acesso" },
  ]

  return (
    <PageShell title="Admin Usuários" subtitle="Acesso, teste grátis e senha de cada usuário">
      {isLoading ? (
        <KpiRowSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
          <KpiCard hero label="Usuários" icon={Users} tone="primary" value={String(counts.all)} footnote="Cadastrados" />
          <KpiCard label="Assinantes" icon={UserCheck} tone="income" value={String(counts.subscription + counts.lifetime)} footnote={`${counts.lifetime} vitalício(s)`} />
          <KpiCard label="Em teste" icon={Clock} tone="warning" value={String(counts.trial)} footnote="Teste grátis ativo" />
          <KpiCard label="Sem acesso" icon={UserX} tone="expense" value={String(counts.none)} footnote="Bloqueados" />
        </div>
      )}

      <Card className="gap-0 overflow-clip py-0" aria-label="Usuários">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:px-5">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input className="h-10 pl-9" placeholder="Buscar e-mail" aria-label="Buscar usuários" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div role="group" aria-label="Filtrar por acesso" className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-[3px] md:ml-auto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={
                  "inline-flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground md:flex-none" +
                  (filter === f.value ? " bg-card text-foreground shadow-xs" : "")
                }
              >
                {f.label}
                <span className="num text-[11px] text-muted-foreground">{counts[f.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : loadError ? (
          <div className="px-4 pb-5 md:px-5">
            <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
              <div className="min-w-0 flex-1 text-[13px]">
                <strong className="block text-sm font-semibold">Não foi possível carregar os usuários</strong>
                <span className="text-muted-foreground">{loadError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw /> Tentar novamente
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState className="border-t" icon={Users} title="Nenhum usuário encontrado" description="Nenhum usuário corresponde ao filtro atual." />
        ) : (
          <ul className="divide-y border-t">
            {filtered.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-sm font-medium">{u.email}</strong>
                    <Badge variant={KIND_VARIANT[u.access.kind]}>
                      {u.access.kind === "lifetime" && <InfinityIcon aria-hidden />}
                      {ACCESS_LABEL[u.access.kind]}
                    </Badge>
                    {u.subscription?.status === "CANCELLED" && <Badge variant="outline">Assinatura cancelada</Badge>}
                  </div>
                  <p className="num mt-0.5 text-[13px] text-muted-foreground">
                    {u.access.kind === "admin" || u.access.kind === "lifetime"
                      ? "Acesso sem prazo"
                      : u.access.hasAccess
                        ? `${daysLabel(u.access.daysLeft)} restantes · até ${formatDate(u.access.expiresAt)}`
                        : u.trialStartedAt
                          ? "Acesso expirado"
                          : "Ainda não escolheu teste ou plano"}
                    {u.subscription?.plan && ` · Plano ${PLAN_LABEL[u.subscription.plan].toLowerCase()}`}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted-foreground">Cadastro em {formatDate(u.createdAt)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Ações para ${u.email}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog({ kind: "days", user: u })}>
                      <CalendarPlus /> Dar dias grátis
                    </DropdownMenuItem>
                    {u.lifetimeAccess ? (
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "revokeLifetime", user: u })}>
                        <InfinityIcon /> Remover acesso vitalício
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => void run(() => updateAccess(token, u.id, { lifetimeAccess: true }), `Acesso vitalício liberado para ${u.email}.`)}
                      >
                        <InfinityIcon /> Dar acesso vitalício
                      </DropdownMenuItem>
                    )}
                    {u.access.kind === "trial" && (
                      <DropdownMenuItem onSelect={() => setDialog({ kind: "endTrial", user: u })}>
                        <UserX /> Encerrar teste grátis
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setDialog({ kind: "password", user: u })}>
                      <KeyRound /> Alterar senha
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {dialog?.kind === "days" && (
        <DaysDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSave={(days) => run(() => extendTrial(token, dialog.user.id, days), `+${days} dias para ${dialog.user.email}.`)}
        />
      )}
      {dialog?.kind === "password" && (
        <PasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSave={(password) => run(async () => void (await setUserPassword(token, dialog.user.id, password)), `Senha de ${dialog.user.email} alterada.`)}
        />
      )}
      {dialog?.kind === "endTrial" && (
        <ConfirmDialog
          title="Encerrar teste grátis?"
          description={`${dialog.user.email} perde o acesso agora, a menos que tenha assinatura ou acesso vitalício.`}
          action="Encerrar teste"
          onClose={() => setDialog(null)}
          onConfirm={() => run(() => updateAccess(token, dialog.user.id, { trialEndsAt: null }), "Teste grátis encerrado.")}
        />
      )}
      {dialog?.kind === "revokeLifetime" && (
        <ConfirmDialog
          title="Remover acesso vitalício?"
          description={`${dialog.user.email} volta a depender de teste grátis ou assinatura.`}
          action="Remover"
          onClose={() => setDialog(null)}
          onConfirm={() => run(() => updateAccess(token, dialog.user.id, { lifetimeAccess: false }), "Acesso vitalício removido.")}
        />
      )}
    </PageShell>
  )
}
