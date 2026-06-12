"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  CalendarClock,
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
import type { ApiCreditor, ApiFixedExpense, ApiGenerateResult, ApiTag } from "@/lib/finance-types"
import { MONTHS, formatBRL, toNumber } from "@/lib/finance-utils"
import { PageShell } from "@/components/dashboard/page-shell"
import { Button } from "@/components/ui/button"
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

const today = new Date().toISOString().slice(0, 10)
const currentMonth = String(new Date().getMonth() + 1)
const currentYear = String(new Date().getFullYear())
const availableYears = [
  new Date().getFullYear() - 1,
  new Date().getFullYear(),
  new Date().getFullYear() + 1,
]

function emptyForm() {
  return {
    name: "",
    amount: "",
    dayOfMonth: "1",
    startDate: today,
    tagId: "",
    creditorId: "",
  }
}

export default function FixedExpensesPage() {
  const router = useRouter()
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

  // Generate dialog
  const [isGenerateOpen, setIsGenerateOpen] = React.useState(false)
  const [generateMonth, setGenerateMonth] = React.useState(currentMonth)
  const [generateYear, setGenerateYear] = React.useState(currentYear)
  const [isGenerating, setIsGenerating] = React.useState(false)

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

  const active = fixedExpenses.filter((fe) => fe.isActive)
  const inactive = fixedExpenses.filter((fe) => !fe.isActive)

  const totalMonthly = React.useMemo(
    () => active.reduce((s, fe) => s + toNumber(fe.amount), 0),
    [active],
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

    const body = {
      name,
      amount,
      dayOfMonth,
      startDate: new Date(form.startDate).toISOString(),
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
      toast.success(updated.isActive ? "Despesa reativada!" : "Despesa desativada!")
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

  async function handleGenerate() {
    if (!token) return
    setIsGenerating(true)
    try {
      const result = await apiFetch<ApiGenerateResult>(
        `/fixed-expenses/generate/${generateYear}/${generateMonth}`,
        { method: "POST", token },
      )
      toast.success(
        `${result.generated} despesa${result.generated !== 1 ? "s" : ""} gerada${result.generated !== 1 ? "s" : ""}, ${result.skipped} ignorada${result.skipped !== 1 ? "s" : ""}.`,
      )
      setIsGenerateOpen(false)
      router.push("/despesas")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar despesas.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <PageShell
      title="Despesas Fixas"
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerateOpen(true)}
          >
            <CalendarClock className="mr-2 size-4" />
            Gerar mês
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nova despesa fixa
          </Button>
        </div>
      }
    >
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
            <p className="text-xs text-muted-foreground">Inativas</p>
            <p className="text-base font-bold tabular-nums text-muted-foreground">{inactive.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <CheckCircle2 className="size-4 shrink-0 text-red-400" />
          <div>
            <p className="text-xs text-muted-foreground">Total mensal</p>
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
              Nenhuma despesa fixa ativa. Clique em "Nova despesa fixa" para criar.
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
              <span>Inativas ({inactive.length})</span>
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

      {/* Generate month dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={(open) => { if (!open) setIsGenerateOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerar despesas do mês</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione o mês e ano para gerar as despesas fixas ativas. Despesas já existentes serão ignoradas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Mês</label>
              <Select value={generateMonth} onValueChange={setGenerateMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ano</label>
              <Select value={generateYear} onValueChange={setGenerateYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || active.length === 0}>
              {isGenerating ? <Spinner className="mr-2 size-4" /> : <CalendarClock className="mr-2 size-4" />}
              {isGenerating ? "Gerando..." : `Gerar ${active.length} despesa${active.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
          {active.length === 0 && (
            <p className="text-center text-xs text-muted-foreground/60">
              Nenhuma despesa fixa ativa para gerar.
            </p>
          )}
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

  return (
    <div className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/20">
      {/* Status dot */}
      <div className={`size-2 shrink-0 rounded-full ${fe.isActive ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${fe.isActive ? "text-foreground/90" : "text-muted-foreground/60"}`}>
            {fe.name}
          </span>
          <span className="shrink-0 rounded-full border border-border bg-accent/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            dia {fe.dayOfMonth}
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
          Desde {new Date(fe.startDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
        </p>
      </div>

      {/* Amount */}
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${fe.isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
        {formatBRL(toNumber(fe.amount))}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
          title={fe.isActive ? "Desativar" : "Reativar"}
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
