"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Layers, MoreHorizontal, Pencil, Plus, Trash2, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiExpense } from "@/lib/finance-types"
import { formatBRL, formatDateDisplay, getExpenseStatus, toNumber, type ExpenseStatus } from "@/lib/finance-utils"
import { EditableDate, EditableMoney, EditableText, InlinePicker, SortTh, tagColor, type PickerOption } from "@/components/finance/inline-edit"
import { PAGE_SIZES, usePageSize } from "@/hooks/use-page-size"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FixedBadge, InstallmentBadge } from "@/components/finance/installment-badge"
import { StatusBadge } from "@/components/finance/status-badge"

export type SortKey = "item" | "tag" | "creditor" | "date" | "status" | "amount"
export type SortState = { key: SortKey; dir: "asc" | "desc" }

const STATUS_ORDER: Record<ExpenseStatus, number> = { late: 0, pending: 1, paid: 2 }
export function sortExpenses(
  rows: ApiExpense[],
  sort: SortState,
  now: Date,
  names: { tag: (id: string | null) => string; creditor: (id: string | null) => string },
): ApiExpense[] {
  const mul = sort.dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    let r = 0
    if (sort.key === "tag" || sort.key === "creditor") {
      // sem tag/credor sempre no fim, em qualquer direção
      const pick = sort.key === "tag" ? (e: ApiExpense) => (e.tagId ? names.tag(e.tagId) : "") : (e: ApiExpense) => (e.creditorId ? names.creditor(e.creditorId) : "")
      const an = pick(a)
      const bn = pick(b)
      if (!an !== !bn) return !an ? 1 : -1
      return an.localeCompare(bn, "pt-BR") * mul
    }
    if (sort.key === "item") r = a.item.localeCompare(b.item, "pt-BR")
    else if (sort.key === "amount") r = toNumber(a.amount) - toNumber(b.amount)
    else if (sort.key === "date") r = new Date(a.date).getTime() - new Date(b.date).getTime()
    else r = STATUS_ORDER[getExpenseStatus(a, now)] - STATUS_ORDER[getExpenseStatus(b, now)]
    return r * mul
  })
}

type Props = {
  rows: ApiExpense[]
  now: Date
  tagName: (id: string | null) => string
  tagIndex: (id: string | null) => number
  creditorName: (id: string | null) => string
  tagOptions: PickerOption[]
  creditorOptions: PickerOption[]
  onChangeBasic: (row: ApiExpense, patch: { item?: string; amount?: number; date?: string }) => void
  onChangeTag: (row: ApiExpense, tagId: string | null, applyToGroup: boolean) => void
  onChangeCreditor: (row: ApiExpense, creditorId: string | null, applyToGroup: boolean) => void
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  sort: SortState
  onSortChange: (key: SortKey) => void
  onTogglePaid: (row: ApiExpense) => void
  onEdit: (row: ApiExpense) => void
  onDuplicate: (row: ApiExpense) => void
  onDelete: (row: ApiExpense) => void
  onDeleteGroup: (row: ApiExpense) => void
  onAdd: () => void
  /** Agrupa as linhas por credor, cada grupo recolhível e com status em lote. */
  groupByCreditor?: boolean
  /** Muda o status de várias despesas de uma vez (usado no cabeçalho do grupo). */
  onSetPaid: (rows: ApiExpense[], isPaid: boolean) => void
  busy?: boolean
}

const NO_CREDITOR = "__none__"

type CreditorGroup = { key: string; name: string; rows: ApiExpense[]; total: number; status: ExpenseStatus }

/** Mantém a ordem atual das linhas dentro de cada grupo; "Sem credor" sempre por último. */
function groupRows(rows: ApiExpense[], now: Date, creditorName: (id: string | null) => string): CreditorGroup[] {
  const map = new Map<string, ApiExpense[]>()
  for (const r of rows) {
    const key = r.creditorId ?? NO_CREDITOR
    const list = map.get(key)
    if (list) list.push(r)
    else map.set(key, [r])
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const total = list.reduce((s, r) => s + toNumber(r.amount), 0)
      const statuses = list.map((r) => getExpenseStatus(r, now))
      const status: ExpenseStatus = statuses.every((st) => st === "paid") ? "paid" : statuses.includes("late") ? "late" : "pending"
      return { key, name: key === NO_CREDITOR ? "Sem credor" : creditorName(key) || "Credor removido", rows: list, total, status }
    })
    .sort((a, b) => {
      if ((a.key === NO_CREDITOR) !== (b.key === NO_CREDITOR)) return a.key === NO_CREDITOR ? 1 : -1
      return a.name.localeCompare(b.name, "pt-BR")
    })
}

export function ExpensesTable(props: Props) {
  const { rows, now, selected, onSelectedChange, sort, onSortChange, creditorName, groupByCreditor = false } = props
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = usePageSize()
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set())

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  // Agrupado, todos os grupos aparecem (recolhidos); a paginação só vale para a lista simples.
  const pageRows = groupByCreditor ? rows : rows.slice(current * pageSize, current * pageSize + pageSize)
  const groups = React.useMemo(
    () => (groupByCreditor ? groupRows(rows, now, creditorName) : []),
    [groupByCreditor, rows, now, creditorName],
  )

  const total = rows.reduce((s, r) => s + toNumber(r.amount), 0)
  const paid = rows.filter((r) => r.isPaid).reduce((s, r) => s + toNumber(r.amount), 0)

  const pageIds = pageRows.map((r) => r.id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPage = pageIds.some((id) => selected.has(id))

  function toggleAll(checked: boolean) {
    const next = new Set(selected)
    pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)))
    onSelectedChange(next)
  }
  function toggleIds(ids: string[], checked: boolean) {
    const next = new Set(selected)
    ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
    onSelectedChange(next)
  }
  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function groupCheck(g: CreditorGroup): boolean | "indeterminate" {
    const n = g.rows.filter((r) => selected.has(r.id)).length
    return n === 0 ? false : n === g.rows.length ? true : "indeterminate"
  }
  /** Tudo pago → volta para pendente; senão paga as que faltam. */
  function toggleGroupPaid(g: CreditorGroup) {
    if (g.status === "paid") props.onSetPaid(g.rows, false)
    else props.onSetPaid(g.rows.filter((r) => !r.isPaid), true)
  }
  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id)
    else next.delete(id)
    onSelectedChange(next)
  }

  const tagPicker = (row: ApiExpense) => (
    <InlinePicker
      label="Tag"
      valueId={row.tagId}
      display={row.tagId ? props.tagName(row.tagId) : "Sem tag"}
      dotColor={tagColor(props.tagIndex(row.tagId))}
      options={props.tagOptions}
      noneLabel="Sem tag"
      inGroup={!!row.installmentGroupId}
      onChange={(id, all) => props.onChangeTag(row, id, all)}
    />
  )
  const creditorPicker = (row: ApiExpense) => (
    <InlinePicker
      label="Credor"
      valueId={row.creditorId}
      display={row.creditorId ? props.creditorName(row.creditorId) : "Sem credor"}
      options={props.creditorOptions}
      noneLabel="Sem credor"
      inGroup={!!row.installmentGroupId}
      onChange={(id, all) => props.onChangeCreditor(row, id, all)}
    />
  )

  const desktopRow = (row: ApiExpense) => {
    const status = getExpenseStatus(row, now)
    const isSel = selected.has(row.id)
    return (
      <tr key={row.id} className={cn("border-b last:border-0 hover:bg-muted/40", isSel && "bg-primary-soft/50")}>
        <td className={cn("w-10 pl-5", groupByCreditor && "pl-9")}>
          <Checkbox
            checked={isSel}
            onCheckedChange={(c) => toggleOne(row.id, c === true)}
            aria-label={`Selecionar ${row.item}`}
          />
        </td>
        <td className="h-[54px] px-3">
          <div className="flex flex-wrap items-center gap-1.5 font-medium">
            <EditableText value={row.item} label="item" onSave={(item) => props.onChangeBasic(row, { item })} />
            <InstallmentBadge number={row.installmentNumber} total={row.installmentTotal} />
            {row.fixedExpenseCompetence && <FixedBadge />}
          </div>
        </td>
        <td className="px-3">{tagPicker(row)}</td>
        <td className="px-3">{creditorPicker(row)}</td>
        <td className="px-3">
          <EditableDate value={row.date} label="vencimento" onSave={(date) => props.onChangeBasic(row, { date })} />
        </td>
        <td className="px-3">
          <StatusBadge status={status} onToggle={() => props.onTogglePaid(row)} />
        </td>
        <td className="px-3">
          <EditableMoney value={toNumber(row.amount)} label="valor" onSave={(amount) => props.onChangeBasic(row, { amount })} />
        </td>
        <td className="w-12 pr-4 text-right">
          <RowMenu row={row} {...props} />
        </td>
      </tr>
    )
  }

  const mobileRow = (row: ApiExpense) => {
    const status = getExpenseStatus(row, now)
    const meta = `vence ${formatDateDisplay(row.date).slice(0, 5)}`
    return (
      <li key={row.id} className={cn("flex items-start gap-3 px-4 py-3", groupByCreditor && "pl-8", selected.has(row.id) && "bg-primary-soft/50")}>
        <Checkbox
          className="mt-1"
          checked={selected.has(row.id)}
          onCheckedChange={(c) => toggleOne(row.id, c === true)}
          aria-label={`Selecionar ${row.item}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 font-medium">
            <EditableText value={row.item} label="item" onSave={(item) => props.onChangeBasic(row, { item })} />
            <InstallmentBadge number={row.installmentNumber} total={row.installmentTotal} />
            {row.fixedExpenseCompetence && <FixedBadge />}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <EditableDate value={row.date} label="vencimento" text={meta} onSave={(date) => props.onChangeBasic(row, { date })} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs">
            {tagPicker(row)}
            {creditorPicker(row)}
          </div>
          <div className="mt-2">
            <StatusBadge status={status} onToggle={() => props.onTogglePaid(row)} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EditableMoney value={toNumber(row.amount)} label="valor" onSave={(amount) => props.onChangeBasic(row, { amount })} />
          <RowMenu row={row} {...props} />
        </div>
      </li>
    )
  }

  return (
    <div>
      {/* Desktop: tabela com cabeçalho fixo */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-[60px] z-10 bg-card shadow-[0_1px_0_var(--border)]">
            <tr>
              <th className="w-10 pl-5">
                <Checkbox
                  checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                  onCheckedChange={(c) => toggleAll(c === true)}
                  aria-label="Selecionar todas as despesas da página"
                />
              </th>
              <SortTh k="item" sort={sort} onSort={onSortChange}>Item</SortTh>
              <SortTh k="tag" sort={sort} onSort={onSortChange}>
                Tag
              </SortTh>
              <SortTh k="creditor" sort={sort} onSort={onSortChange}>
                Credor
              </SortTh>
              <SortTh k="date" sort={sort} onSort={onSortChange}>Vencimento</SortTh>
              <SortTh k="status" sort={sort} onSort={onSortChange}>Status</SortTh>
              <SortTh k="amount" sort={sort} onSort={onSortChange} right>
                Valor
              </SortTh>
              <th className="w-12 pr-4">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groupByCreditor
              ? groups.map((g) => {
                  const open = expanded.has(g.key)
                  const paidCount = g.rows.filter((r) => r.isPaid).length
                  return (
                    <React.Fragment key={g.key}>
                      <tr className="border-b bg-muted/30 hover:bg-muted/50">
                        <td className="w-10 pl-5">
                          <Checkbox
                            checked={groupCheck(g)}
                            onCheckedChange={(c) => toggleIds(g.rows.map((r) => r.id), c === true)}
                            aria-label={`Selecionar despesas de ${g.name}`}
                          />
                        </td>
                        <td className="h-[54px] px-3" colSpan={4}>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(g.key)}
                            aria-expanded={open}
                            className="flex w-full items-center gap-2 text-left font-semibold"
                          >
                            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden />
                            <span className="truncate">{g.name}</span>
                            <span className="num text-xs font-normal text-muted-foreground">
                              {g.rows.length} despesa{g.rows.length !== 1 ? "s" : ""} · {paidCount} paga{paidCount !== 1 ? "s" : ""}
                            </span>
                          </button>
                        </td>
                        <td className="px-3">
                          <GroupStatus group={g} disabled={props.busy} onToggle={() => toggleGroupPaid(g)} />
                        </td>
                        <td className="num px-3 text-right font-semibold">{formatBRL(g.total)}</td>
                        <td className="w-12 pr-4" />
                      </tr>
                      {open && g.rows.map(desktopRow)}
                    </React.Fragment>
                  )
                })
              : pageRows.map(desktopRow)}
          </tbody>
          <tfoot className="sticky bottom-0 bg-card shadow-[0_-1px_0_var(--border)]">
            <tr>
              <td />
              <td className="h-11 px-3 font-semibold" colSpan={5}>
                Total <span className="num font-normal text-muted-foreground">· pago {formatBRL(paid)} · pendente {formatBRL(total - paid)}</span>
              </td>
              <td className="num px-3 text-right font-semibold">{formatBRL(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: cada linha vira um card */}
      <ul className="divide-y md:hidden">
        <li className="flex items-center gap-3 px-4 py-2.5 text-xs text-muted-foreground">
          <Checkbox
            checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
            onCheckedChange={(c) => toggleAll(c === true)}
            aria-label="Selecionar todas as despesas da página"
          />
          Selecionar todas
        </li>
        {groupByCreditor
          ? groups.map((g) => {
              const open = expanded.has(g.key)
              return (
                <React.Fragment key={g.key}>
                  <li className="flex items-center gap-3 bg-muted/30 px-4 py-3">
                    <Checkbox
                      checked={groupCheck(g)}
                      onCheckedChange={(c) => toggleIds(g.rows.map((r) => r.id), c === true)}
                      aria-label={`Selecionar despesas de ${g.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpanded(g.key)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{g.name}</span>
                        <span className="num text-xs text-muted-foreground">
                          {g.rows.length} despesa{g.rows.length !== 1 ? "s" : ""} · {formatBRL(g.total)}
                        </span>
                      </span>
                    </button>
                    <GroupStatus group={g} disabled={props.busy} onToggle={() => toggleGroupPaid(g)} />
                  </li>
                  {open && g.rows.map(mobileRow)}
                </React.Fragment>
              )
            })
          : pageRows.map(mobileRow)}
        <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Total</span>
          <span className="num">{formatBRL(total)}</span>
        </li>
      </ul>

      {/* Adicionar sem voltar ao topo da página */}
      <button
        type="button"
        onClick={props.onAdd}
        aria-label="Nova despesa"
        title="Nova despesa"
        className="flex min-h-12 w-full items-center justify-center border-t text-primary hover:bg-muted/50"
      >
        <Plus className="size-5" aria-hidden />
      </button>

      {/* Paginação (só na lista simples) */}
      {!groupByCreditor && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px] text-muted-foreground md:px-5">
        <span className="num">
          {rows.length === 0
            ? "0 despesas"
            : `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, rows.length)} de ${rows.length}`}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Itens por página</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v))
                setPage(0)
              }}
            >
              <SelectTrigger className="h-8 w-[76px]" aria-label="Itens por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft />
          </Button>
          <span className="num">
            Página {current + 1} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
            aria-label="Próxima página"
          >
            <ChevronRight />
          </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

/** Status do grupo inteiro: clicar paga tudo o que falta (ou volta tudo para pendente se já estiver quitado). */
function GroupStatus({ group, disabled, onToggle }: { group: CreditorGroup; disabled?: boolean; onToggle: () => void }) {
  return (
    <StatusBadge
      status={group.status}
      disabled={disabled}
      onToggle={onToggle}
      ariaLabel={
        group.status === "paid"
          ? `Tudo pago em ${group.name}. Marcar todas como pendentes`
          : `Marcar todas as despesas de ${group.name} como pagas`
      }
    />
  )
}

function RowMenu({
  row,
  onTogglePaid,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteGroup,
}: { row: ApiExpense } & Pick<Props, "onTogglePaid" | "onEdit" | "onDuplicate" | "onDelete" | "onDeleteGroup">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 max-md:size-11" aria-label={`Ações de ${row.item}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onTogglePaid(row)}>
          {row.isPaid ? <Undo2 /> : <Check />}
          {row.isPaid ? "Marcar como pendente" : "Marcar como pago"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(row)}>
          <Pencil /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onDuplicate(row)}>
          <Copy /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row)}>
          <Trash2 /> Excluir
        </DropdownMenuItem>
        {row.installmentGroupId && (
          <DropdownMenuItem variant="destructive" onSelect={() => onDeleteGroup(row)}>
            <Layers /> Excluir todas as parcelas
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
