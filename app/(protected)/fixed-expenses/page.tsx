"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CircleSlash,
  MoreHorizontal,
  Pencil,
  PauseCircle,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import type { ApiCreditor, ApiFixedExpense, ApiFixedIncome, ApiTag } from "@/lib/finance-types"
import { MONTHS, formatBRL, toNumber } from "@/lib/finance-utils"
import {
  competenceKey,
  formatMonthYear,
  formatVigency,
  getStatus,
  incomeAmountFor,
  isEligibleInMonth,
  nextAdjustment,
  type FixedExpenseStatus,
  type FixedRule,
} from "@/lib/fixed-expense-utils"
import { usePeriod } from "@/components/dashboard/period-provider"
import { PageShell } from "@/components/dashboard/page-shell"
import { EmptyState } from "@/components/finance/empty-state"
import { FixedExpenseSheet, type FixedExpenseFormValues } from "@/components/finance/fixed-expense-sheet"
import { FROM_START, FixedIncomeSheet, type FixedIncomeFormValues } from "@/components/finance/fixed-income-sheet"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const NONE = "none"

type Kind = "despesas" | "receitas"

const STATUS: Record<FixedExpenseStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active: { label: "Ativa", icon: CheckCircle2, cls: "bg-income-soft text-income" },
  paused: { label: "Pausada", icon: PauseCircle, cls: "bg-warning-soft text-warning" },
  ended: { label: "Encerrada", icon: CircleSlash, cls: "bg-muted text-muted-foreground" },
}

/** Uma regra fixa como a lista enxerga (despesa ou receita). */
type RuleView = FixedRule & {
  id: string
  name: string
  dayOfMonth: number
  /** Valor vigente na competência do período. */
  amount: number
  meta: string
  note?: string
}

type PendingDelete = { kind: Kind; id: string; name: string }

export default function FixedPage() {
  return (
    <React.Suspense fallback={null}>
      <FixedPageContent />
    </React.Suspense>
  )
}

function FixedPageContent() {
  const { token } = useAuth()
  const { month, year } = usePeriod()
  const router = useRouter()
  const searchParams = useSearchParams()
  const kind: Kind = searchParams.get("tipo") === "receitas" ? "receitas" : "despesas"

  const [fixedExpenses, setFixedExpenses] = React.useState<ApiFixedExpense[]>([])
  const [fixedIncomes, setFixedIncomes] = React.useState<ApiFixedIncome[]>([])
  const [expenseTags, setExpenseTags] = React.useState<ApiTag[]>([])
  const [incomeTags, setIncomeTags] = React.useState<ApiTag[]>([])
  const [creditors, setCreditors] = React.useState<ApiCreditor[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const [expenseSheetOpen, setExpenseSheetOpen] = React.useState(false)
  const [incomeSheetOpen, setIncomeSheetOpen] = React.useState(false)
  const [editingExpense, setEditingExpense] = React.useState<ApiFixedExpense | null>(null)
  const [editingIncome, setEditingIncome] = React.useState<ApiFixedIncome | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<PendingDelete | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const [fe, fi, t, c] = await Promise.all([
        apiFetch<ApiFixedExpense[]>("/fixed-expenses", { token }),
        apiFetch<ApiFixedIncome[]>("/fixed-incomes", { token }),
        apiFetch<ApiTag[]>("/tags", { token }),
        apiFetch<ApiCreditor[]>("/creditors/summary", { token }),
      ])
      setFixedExpenses(fe)
      setFixedIncomes(fi)
      setExpenseTags(t.filter((tag) => tag.type === "EXPENSE"))
      setIncomeTags(t.filter((tag) => tag.type === "INCOME"))
      setCreditors(c)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados.")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    void load()
  }, [load])

  function setKind(next: string) {
    router.replace(next === "receitas" ? "/fixed-expenses?tipo=receitas" : "/fixed-expenses", { scroll: false })
  }

  // Competência do período escolhido na topbar
  const competence = competenceKey(year, month + 1)
  const monthLabel = `${MONTHS[month].label.toLowerCase()} de ${year}`

  const expenseViews = React.useMemo<RuleView[]>(
    () =>
      fixedExpenses.map((fe) => ({
        ...fe,
        amount: toNumber(fe.amount),
        meta: [fe.tag?.name, fe.creditor?.name].filter(Boolean).join(" · ") || "Sem tag ou credor",
      })),
    [fixedExpenses],
  )
  const incomeViews = React.useMemo<RuleView[]>(
    () =>
      fixedIncomes.map((fi) => {
        const next = nextAdjustment(fi, competence)
        return {
          ...fi,
          amount: toNumber(incomeAmountFor(fi, competence)),
          meta: fi.tag?.name ?? "Sem tag",
          note: next ? `Reajuste para ${formatBRL(toNumber(next.amount))} em ${formatMonthYear(next.effectiveFrom)}` : undefined,
        }
      }),
    [fixedIncomes, competence],
  )

  const monthlyTotal = (rules: RuleView[]) =>
    rules.filter((r) => isEligibleInMonth(r, competence)).reduce((s, r) => s + r.amount, 0)
  const expenseTotal = monthlyTotal(expenseViews)
  const incomeTotal = monthlyTotal(incomeViews)
  const balance = incomeTotal - expenseTotal
  const countActive = (rules: RuleView[]) => rules.filter((r) => isEligibleInMonth(r, competence)).length
  const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`

  function openCreate() {
    if (kind === "receitas") {
      setEditingIncome(null)
      setIncomeSheetOpen(true)
    } else {
      setEditingExpense(null)
      setExpenseSheetOpen(true)
    }
  }

  async function submitExpense(values: FixedExpenseFormValues, current: ApiFixedExpense | null) {
    if (!token) throw new Error("Sessão expirada.")
    const body = {
      name: values.name,
      amount: values.amount,
      dayOfMonth: values.dayOfMonth,
      // YYYY-MM-DD sem conversão de fuso; null = sem data fim
      startDate: values.startDate.slice(0, 10),
      endDate: values.noEndDate ? null : values.endDate.slice(0, 10),
      tagId: values.tagId === NONE ? null : values.tagId,
      creditorId: values.creditorId === NONE ? null : values.creditorId,
    }
    try {
      if (current) {
        const updated = await apiFetch<ApiFixedExpense>(`/fixed-expenses/${current.id}`, { method: "PUT", token, body: JSON.stringify(body) })
        setFixedExpenses((prev) => prev.map((fe) => (fe.id === current.id ? updated : fe)))
        toast.success("Despesa fixa atualizada.")
      } else {
        const created = await apiFetch<ApiFixedExpense>("/fixed-expenses", { method: "POST", token, body: JSON.stringify(body) })
        setFixedExpenses((prev) => [created, ...prev])
        toast.success("Despesa fixa criada.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
      throw err
    }
  }

  async function submitIncome(values: FixedIncomeFormValues, current: ApiFixedIncome | null, amountChanged: boolean) {
    if (!token) throw new Error("Sessão expirada.")
    const body: Record<string, unknown> = {
      name: values.name,
      dayOfMonth: values.dayOfMonth,
      startDate: values.startDate.slice(0, 10),
      endDate: values.noEndDate ? null : values.endDate.slice(0, 10),
      tagId: values.tagId === NONE ? null : values.tagId,
    }
    // Na edição o valor só vai se mudou; a vigência transforma a mudança em reajuste.
    if (!current) body.amount = values.amount
    else if (amountChanged) {
      body.amount = values.amount
      if (values.effectiveFrom !== FROM_START) body.amountEffectiveFrom = values.effectiveFrom
    }
    try {
      if (current) {
        const updated = await apiFetch<ApiFixedIncome>(`/fixed-incomes/${current.id}`, { method: "PUT", token, body: JSON.stringify(body) })
        setFixedIncomes((prev) => prev.map((fi) => (fi.id === current.id ? updated : fi)))
        toast.success(amountChanged && values.effectiveFrom !== FROM_START ? `Reajuste a partir de ${formatMonthYear(values.effectiveFrom)} salvo.` : "Receita fixa atualizada.")
      } else {
        const created = await apiFetch<ApiFixedIncome>("/fixed-incomes", { method: "POST", token, body: JSON.stringify(body) })
        setFixedIncomes((prev) => [created, ...prev])
        toast.success("Receita fixa criada.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.")
      throw err
    }
  }

  async function toggleActive(k: Kind, rule: RuleView) {
    if (!token) return
    setTogglingId(rule.id)
    try {
      const path = k === "receitas" ? "/fixed-incomes" : "/fixed-expenses"
      const body = JSON.stringify({ isActive: !rule.isActive })
      if (k === "receitas") {
        const updated = await apiFetch<ApiFixedIncome>(`${path}/${rule.id}`, { method: "PUT", token, body })
        setFixedIncomes((prev) => prev.map((f) => (f.id === rule.id ? updated : f)))
      } else {
        const updated = await apiFetch<ApiFixedExpense>(`${path}/${rule.id}`, { method: "PUT", token, body })
        setFixedExpenses((prev) => prev.map((f) => (f.id === rule.id ? updated : f)))
      }
      const noun = k === "receitas" ? "Receita" : "Despesa"
      toast.success(rule.isActive ? `${noun} pausada.` : `${noun} reativada.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar o status.")
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!token || !pendingDelete) return
    setIsDeleting(true)
    try {
      if (pendingDelete.kind === "receitas") {
        await apiFetch(`/fixed-incomes/${pendingDelete.id}`, { method: "DELETE", token })
        setFixedIncomes((prev) => prev.filter((fi) => fi.id !== pendingDelete.id))
        toast.success("Receita fixa excluída.")
      } else {
        await apiFetch(`/fixed-expenses/${pendingDelete.id}`, { method: "DELETE", token })
        setFixedExpenses((prev) => prev.filter((fe) => fe.id !== pendingDelete.id))
        toast.success("Despesa fixa excluída.")
      }
      setPendingDelete(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.")
    } finally {
      setIsDeleting(false)
    }
  }

  const section = (k: Kind, rules: RuleView[]) => (
    <RulesSection
      kind={k}
      rules={rules}
      competence={competence}
      monthLabel={monthLabel}
      isLoading={isLoading}
      togglingId={togglingId}
      onCreate={openCreate}
      onEdit={(r) => {
        if (k === "receitas") {
          setEditingIncome(fixedIncomes.find((fi) => fi.id === r.id) ?? null)
          setIncomeSheetOpen(true)
        } else {
          setEditingExpense(fixedExpenses.find((fe) => fe.id === r.id) ?? null)
          setExpenseSheetOpen(true)
        }
      }}
      onToggle={(r) => void toggleActive(k, r)}
      onDelete={(r) => setPendingDelete({ kind: k, id: r.id, name: r.name })}
    />
  )

  return (
    <PageShell
      title="Receitas e despesas fixas"
      subtitle="Geradas automaticamente todo mês, no dia do vencimento ou do recebimento"
      headerActions={
        <Button onClick={openCreate}>
          <Plus /> {kind === "receitas" ? "Nova receita fixa" : "Nova despesa fixa"}
        </Button>
      }
    >
      {isLoading ? (
        <KpiRowSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4">
          <KpiCard
            hero
            label="Saldo fixo do mês"
            icon={Scale}
            tone={balance >= 0 ? "income" : "expense"}
            value={formatBRL(balance)}
            footnote={`Receitas fixas menos despesas fixas em ${monthLabel}`}
          />
          <KpiCard
            label="Receitas fixas"
            icon={TrendingUp}
            tone="income"
            value={formatBRL(incomeTotal)}
            footnote={plural(countActive(incomeViews), "ativa")}
          />
          <KpiCard
            label="Despesas fixas"
            icon={TrendingDown}
            tone="expense"
            value={formatBRL(expenseTotal)}
            footnote={plural(countActive(expenseViews), "ativa")}
          />
        </div>
      )}

      {loadError && !isLoading ? (
        <div role="alert" className="flex items-start gap-3 rounded-[10px] border border-expense/40 bg-expense-soft px-3.5 py-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-expense" aria-hidden />
          <div className="min-w-0 flex-1 text-[13px]">
            <strong className="block text-sm font-semibold">Não foi possível carregar os lançamentos fixos</strong>
            <span className="text-muted-foreground">{loadError}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            <RefreshCw /> Tentar novamente
          </Button>
        </div>
      ) : (
        <Tabs value={kind} onValueChange={setKind} className="gap-4">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="despesas" className="sm:px-4">
              <TrendingDown /> Despesas
            </TabsTrigger>
            <TabsTrigger value="receitas" className="sm:px-4">
              <TrendingUp /> Receitas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="despesas" className="flex flex-col gap-4">
            {section("despesas", expenseViews)}
          </TabsContent>
          <TabsContent value="receitas" className="flex flex-col gap-4">
            {section("receitas", incomeViews)}
          </TabsContent>
        </Tabs>
      )}

      <FixedExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={setExpenseSheetOpen}
        fixedExpense={editingExpense}
        tags={expenseTags}
        creditors={creditors}
        onSubmit={submitExpense}
      />
      <FixedIncomeSheet
        open={incomeSheetOpen}
        onOpenChange={setIncomeSheetOpen}
        fixedIncome={editingIncome}
        tags={incomeTags}
        onSubmit={submitIncome}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Os lançamentos de meses passados em{" "}
              {pendingDelete?.kind === "receitas" ? "Receitas" : "Despesas"} não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void confirmDelete()} disabled={isDeleting}>
              {isDeleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  )
}

const EMPTY: Record<Kind, { icon: LucideIcon; title: string; description: string; cta: string }> = {
  despesas: {
    icon: RefreshCw,
    title: "Nenhuma despesa fixa ativa",
    description: "Cadastre aluguel, internet, plano de saúde e outras contas que se repetem todo mês.",
    cta: "Nova despesa fixa",
  },
  receitas: {
    icon: TrendingUp,
    title: "Nenhuma receita fixa ativa",
    description: "Cadastre salário, contratos, aluguel recebido e outras entradas que se repetem todo mês.",
    cta: "Nova receita fixa",
  },
}

function RulesSection({
  kind,
  rules,
  competence,
  monthLabel,
  isLoading,
  togglingId,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
}: {
  kind: Kind
  rules: RuleView[]
  competence: string
  monthLabel: string
  isLoading: boolean
  togglingId: string | null
  onCreate: () => void
  onEdit: (r: RuleView) => void
  onToggle: (r: RuleView) => void
  onDelete: (r: RuleView) => void
}) {
  const [showInactive, setShowInactive] = React.useState(false)
  const active = rules.filter((r) => getStatus(r, competence) === "active")
  const inactive = rules.filter((r) => getStatus(r, competence) !== "active")
  const empty = EMPTY[kind]

  const renderRow = (r: RuleView) => (
    <FixedRuleRow
      key={r.id}
      rule={r}
      kind={kind}
      status={getStatus(r, competence)}
      isToggling={togglingId === r.id}
      onEdit={() => onEdit(r)}
      onToggle={() => onToggle(r)}
      onDelete={() => onDelete(r)}
    />
  )

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="px-5 pb-0 pt-[18px] max-md:px-4">
          <CardTitle className="text-[15px] font-semibold tracking-tight">Ativas</CardTitle>
          <p className="text-[13px] text-muted-foreground">Vigentes em {monthLabel}</p>
        </CardHeader>
        <CardContent className="px-5 pb-2 pt-2 max-md:px-4">
          {isLoading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : active.length === 0 ? (
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              description={empty.description}
              action={
                <Button onClick={onCreate}>
                  <Plus /> {empty.cta}
                </Button>
              }
              className="py-8"
            />
          ) : (
            <ul className="divide-y">{active.map(renderRow)}</ul>
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card className="gap-0 py-0">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            aria-expanded={showInactive}
            className="flex w-full items-center justify-between px-5 py-4 text-left max-md:px-4"
          >
            <span>
              <span className="text-[15px] font-semibold tracking-tight">Pausadas e encerradas</span>
              <span className="num ml-2 text-[13px] text-muted-foreground">{inactive.length}</span>
            </span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showInactive && "rotate-180")} aria-hidden />
          </button>
          {showInactive && (
            <CardContent className="border-t px-5 pb-2 pt-2 max-md:px-4">
              <ul className="divide-y">{inactive.map(renderRow)}</ul>
            </CardContent>
          )}
        </Card>
      )}
    </>
  )
}

function FixedRuleRow({
  rule,
  kind,
  status,
  isToggling,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: RuleView
  kind: Kind
  status: FixedExpenseStatus
  isToggling: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const s = STATUS[status]
  const Icon = s.icon
  const muted = status !== "active"

  return (
    <li className="flex min-h-[68px] items-center gap-3 py-3">
      <span className="flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border bg-subtle leading-[1.1]">
        <small className="text-[10px] uppercase tracking-wide text-muted-foreground">dia</small>
        <b className="num text-[15px]">{String(rule.dayOfMonth).padStart(2, "0")}</b>
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className={cn("truncate text-sm font-medium", muted && "text-muted-foreground")}>{rule.name}</strong>
          <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium", s.cls)}>
            <Icon className="size-3" aria-hidden />
            {s.label}
          </span>
        </div>
        <span className="block truncate text-xs text-muted-foreground">{rule.meta}</span>
        <span className="block truncate text-[11px] text-muted-foreground/80">{formatVigency(rule)}</span>
        {rule.note && <span className="block truncate text-[11px] font-medium text-income">{rule.note}</span>}
      </div>

      <div className="flex flex-col items-end leading-tight">
        <span className={cn("num text-sm font-semibold", muted ? "text-muted-foreground" : kind === "receitas" && "text-income")}>
          {formatBRL(rule.amount)}
        </span>
        <span className="text-xs text-muted-foreground">mensal</span>
      </div>

      <Switch
        checked={rule.isActive}
        disabled={isToggling}
        onCheckedChange={onToggle}
        aria-label={rule.isActive ? `Pausar ${rule.name}` : `Reativar ${rule.name}`}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 max-md:size-11" aria-label={`Ações de ${rule.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> {kind === "receitas" ? "Editar / reajustar" : "Editar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
