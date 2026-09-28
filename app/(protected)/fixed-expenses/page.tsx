"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Power,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiFixedExpense, ApiTag } from "@/lib/finance-types"
import { formatBRL, toNumber } from "@/lib/finance-utils"
import {
  competenceKey,
  formatVigency,
  getStatus,
  isEligibleInMonth,
  localToday,
  type FixedExpenseStatus,
} from "@/lib/fixed-expense-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const today = localToday()
const currentMonth = String(new Date().getMonth() + 1)
const currentYear = String(new Date().getFullYear())
const STATUS_LABEL: Record<FixedExpenseStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  ended: "Encerrada",
}

function emptyForm() {
  return {
    name: "",
    amount: "",
    dayOfMonth: "1",
    startDate: today,
    endDate: "",
    noEndDate: true,
    tagId: "",
    creditorId: "",
  }
}

export default function FixedExpensesPage() {
  const { token } = useAuth()

  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [tags, setTags] = React.useState<ApiTag[]>([])
  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [showInactive, setShowInactive] = React.useState(false)

  // Create / Edit dialog
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm())

  // Delete dialog
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Toggle active loading
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) return
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      apiFetch<ApiFixedExpense[]>("/fixed-expenses", { token }),
      apiFetch<ApiTag[]>("/tags", { token }),
      apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
    ])
      .then(([fe, t, c]) => {
        if (cancelled) return
        setFixedExpenses(fe)
        setTags(t.filter((tag) => tag.type === "EXPENSE"))
        setCreditors(c)
      })
      .catch((err) => { if (!cancelled) toast.error(err instanceof Error ? err.message : "Erro ao carregar dados.") })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const currentCompetence = competenceKey(currentYear, currentMonth)
  const active = fixedExpenses.filter((fe) => getStatus(fe, currentCompetence) === "active")
  const inactive = fixedExpenses.filter((fe) => getStatus(fe, currentCompetence) !== "active")

  // Total mensal: so regras ativas e vigentes no mes corrente.
  const totalMonthly = React.useMemo(
    () =>
      fixedExpenses
        .filter((fe) => isEligibleInMonth(fe, currentCompetence))
        .reduce((s, fe) => s + toNumber(fe.amount), 0),
    [fixedExpenses, currentCompetence],
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setIsFormOpen(true)
  }

  function openEdit(fe: ApiFixedExpense) {
    setEditingId(fe.id)
    setForm({
      name: fe.name,
      amount: String(toNumber(fe.amount)),
      dayOfMonth: String(fe.dayOfMonth),
      startDate: fe.startDate.slice(0, 10),
      endDate: fe.endDate ? fe.endDate.slice(0, 10) : "",
      noEndDate: !fe.endDate,
      tagId: fe.tagId ?? "",
      creditorId: fe.creditorId ?? "",
    })
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  async function handleSave() {
    if (!token) return
    const name = form.name.trim()
    const amount = parseFloat(form.amount)
    const dayOfMonth = parseInt(form.dayOfMonth, 10)

    if (name.length < 2) { toast.error("Nome precisa ter pelo menos 2 caracteres."); return }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("Valor precisa ser maior que zero."); return }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) { toast.error("Dia do vencimento deve ser entre 1 e 31."); return }
    if (!form.startDate) { toast.error("Informe a data de início."); return }
    if (!form.noEndDate) {
      if (!form.endDate) { toast.error("Informe a data de fim ou marque \"Sem data fim\"."); return }
      if (form.endDate < form.startDate) { toast.error("A data de fim deve ser igual ou posterior à data de início."); return }
    }

    const body = {
      name,
      amount,
      dayOfMonth,
      // YYYY-MM-DD como veio do input (sem conversao de fuso); null = sem data fim
      startDate: form.startDate,
      endDate: form.noEndDate ? null : form.endDate,
      tagId: form.tagId || null,
      creditorId: form.creditorId || null,
    }

    setIsSaving(true)
    try {
      if (editingId) {
        const updated = await apiFetch<ApiFixedExpense>(`/fixed-expenses/${editingId}`, {
          method: "PUT",
          token,
          body: JSON.stringify(body),
        })
        setFixedExpenses((prev) => prev.map((fe) => fe.id === editingId ? updated : fe))
        toast.success("Despesa fixa atualizada!")
      } else {
        const created = await apiFetch<ApiFixedExpense>("/fixed-expenses", {
          method: "POST",
          token,
          body: JSON.stringify(body),
        })
        setFixedExpenses((prev) => [created, ...prev])
        toast.success("Despesa fixa criada!")
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(fe: ApiFixedExpense) {
    if (!token) return
    setTogglingId(fe.id)
    try {
      const updated = await apiFetch<ApiFixedExpense>(`/fixed-expenses/${fe.id}`, {
        method: "PUT",
        token,
        body: JSON.stringify({ isActive: !fe.isActive }),
      })
      setFixedExpenses((prev) => prev.map((f) => f.id === fe.id ? updated : f))
      toast.success(updated.isActive ? "Despesa reativada!" : "Despesa pausada!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar status.")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!token || !pendingDeleteId) return
    setIsDeleting(true)
    try {
      await apiFetch(`/fixed-expenses/${pendingDeleteId}`, { method: "DELETE", token })
      setFixedExpenses((prev) => prev.filter((fe) => fe.id !== pendingDeleteId))
      toast.success("Despesa fixa excluída!")
      setPendingDeleteId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PageShell
      title="Despesas Fixas"
      headerActions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nova despesa fixa
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        As despesas fixas aparecem automaticamente nos próximos 12 meses.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <RefreshCw className="size-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Ativas</p>
            <p className="text-base font-bold tabular-nums">{active.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <AlertCircle className="size-4 shrink-0 text-muted-foreground/60" />
          <div>
            <p className="text-xs text-muted-foreground">Pausadas / encerradas</p>
            <p className="text-base font-bold tabular-nums text-muted-foreground">{inactive.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-red-400" />
          <div>
            <p className="text-xs text-muted-foreground">Total mensal (vigentes)</p>
            <p className="text-base font-bold tabular-nums text-red-400">{formatBRL(totalMonthly)}</p>
          </div>
        </div>
      </div>

      {/* Active list */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ativas</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {active.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground/60">
              Nenhuma despesa fixa ativa. Clique em &quot;Nova despesa fixa&quot; para criar.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {active.map((fe) => (
                <FixedExpenseRow
                  key={fe.id}
                  fe={fe}
                  togglingId={togglingId}
                  onEdit={openEdit}
                  onToggle={handleToggleActive}
                  onDelete={(id) => setPendingDeleteId(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive list */}
      {inactive.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <button
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowInactive((v) => !v)}
            >
              <span>Pausadas e encerradas ({inactive.length})</span>
              {showInactive ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </CardHeader>
          {showInactive && (
            <CardContent className="px-0 pb-2">
              <div className="divide-y divide-border/50">
                {inactive.map((fe) => (
                  <FixedExpenseRow
                    key={fe.id}
                    fe={fe}
                    togglingId={togglingId}
                    onEdit={openEdit}
                    onToggle={handleToggleActive}
                    onDelete={(id) => setPendingDeleteId(id)}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) closeForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar despesa fixa" : "Nova despesa fixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nome</label>
              <Input
                placeholder="Ex: Aluguel"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Valor</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Dia do vencimento</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="1"
                  value={form.dayOfMonth}
                  onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Data de início</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={form.noEndDate}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, noEndDate: v === true, endDate: v === true ? "" : p.endDate }))
                  }
                />
                Sem data fim
              </label>
              {!form.noEndDate && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Data de fim</label>
                  <Input
                    type="date"
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <p className="rounded-md border border-border bg-accent/30 px-3 py-2 text-xs text-muted-foreground">
              Se você já lançou este mês manualmente, exclua o lançamento manual.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoria</label>
              <Select
                value={form.tagId || "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, tagId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Credor (opcional)</label>
              <Select
                value={form.creditorId || "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, creditorId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um credor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem credor</SelectItem>
                  {creditors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={closeForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Spinner className="mr-2 size-4" /> : null}
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. As despesas já geradas em /despesas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}

function FixedExpenseRow({
  fe,
  togglingId,
  onEdit,
  onToggle,
  onDelete,
}: {
  fe: ApiFixedExpense
  togglingId: string | null
  onEdit: (fe: ApiFixedExpense) => void
  onToggle: (fe: ApiFixedExpense) => void
  onDelete: (id: string) => void
}) {
  const isToggling = togglingId === fe.id
  const status = getStatus(fe, competenceKey(currentYear, currentMonth))
  const muted = status !== "active"

  return (
    <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/20">
      {/* Status dot */}
      <div className={`size-2 shrink-0 rounded-full ${status === "active" ? "bg-emerald-400" : status === "paused" ? "bg-orange-400/70" : "bg-muted-foreground/30"}`} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${muted ? "text-muted-foreground/60" : "text-foreground/90"}`}>
            {fe.name}
          </span>
          <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            dia {fe.dayOfMonth}
          </span>
          <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {STATUS_LABEL[status]}
          </span>
          {fe.tag && (
            <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {fe.tag.name}
            </span>
          )}
          {fe.creditor && (
            <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {fe.creditor.name}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground/50">
          {formatVigency(fe)}
        </p>
      </div>

      {/* Amount */}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${muted ? "text-muted-foreground/50" : "text-foreground"}`}>
        {formatBRL(toNumber(fe.amount))}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button
          onClick={() => onEdit(fe)}
          className="rounded p-1 hover:bg-accent"
          title="Editar"
        >
          <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
        </button>
        <button
          onClick={() => onToggle(fe)}
          disabled={isToggling}
          className="rounded p-1 hover:bg-accent"
          title={fe.isActive ? "Pausar" : "Reativar"}
        >
          {isToggling
            ? <Spinner className="size-3.5" />
            : <Power className={`size-3.5 ${fe.isActive ? "text-muted-foreground hover:text-orange-400" : "text-muted-foreground hover:text-emerald-400"}`} />}
        </button>
        <button
          onClick={() => onDelete(fe.id)}
          className="rounded p-1 hover:bg-accent"
          title="Excluir"
        >
          <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}
