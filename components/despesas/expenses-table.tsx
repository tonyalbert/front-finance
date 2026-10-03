"use client"

import * as React from "react"
import { Check, ChevronLeft, ChevronRight, Copy, Layers, MoreHorizontal, Pencil, Plus, Trash2, Undo2 } from "lucide-react"
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
}

export function ExpensesTable(props: Props) {
  const { rows, now, selected, onSelectedChange, sort, onSortChange } = props
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = usePageSize()

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize)

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
            {pageRows.map((row) => {
              const status = getExpenseStatus(row, now)
              const isSel = selected.has(row.id)
              return (
                <tr key={row.id} className={cn("border-b last:border-0 hover:bg-muted/40", isSel && "bg-primary-soft/50")}>
                  <td className="w-10 pl-5">
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
            })}
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
        {pageRows.map((row) => {
          const status = getExpenseStatus(row, now)
          const meta = `vence ${formatDateDisplay(row.date).slice(0, 5)}`
          return (
            <li key={row.id} className={cn("flex items-start gap-3 px-4 py-3", selected.has(row.id) && "bg-primary-soft/50")}>
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
        })}
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

      {/* Paginação */}
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
    </div>
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
