"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Copy, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiIncome } from "@/lib/finance-types"
import { formatBRL, formatDateDisplay, toNumber } from "@/lib/finance-utils"
import { PAGE_SIZES, usePageSize } from "@/hooks/use-page-size"
import { FixedBadge } from "@/components/finance/installment-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  EditableDate,
  EditableMoney,
  EditableText,
  InlinePicker,
  SortTh,
  tagColor,
  type PickerOption,
} from "@/components/finance/inline-edit"

export type IncomeSortKey = "source" | "tag" | "date" | "amount"
export type IncomeSortState = { key: IncomeSortKey; dir: "asc" | "desc" }

export function sortIncomes(rows: ApiIncome[], sort: IncomeSortState, tagName: (id: string | null) => string): ApiIncome[] {
  const mul = sort.dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    if (sort.key === "tag") {
      const an = a.tagId ? tagName(a.tagId) : ""
      const bn = b.tagId ? tagName(b.tagId) : ""
      if (!an !== !bn) return !an ? 1 : -1 // sem tag sempre no fim
      return an.localeCompare(bn, "pt-BR") * mul
    }
    let r = 0
    if (sort.key === "source") r = a.source.localeCompare(b.source, "pt-BR")
    else if (sort.key === "amount") r = toNumber(a.amount) - toNumber(b.amount)
    else r = new Date(a.date).getTime() - new Date(b.date).getTime()
    return r * mul
  })
}

type Props = {
  rows: ApiIncome[]
  tagName: (id: string | null) => string
  tagIndex: (id: string | null) => number
  tagOptions: PickerOption[]
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  sort: IncomeSortState
  onSortChange: (key: IncomeSortKey) => void
  onChangeBasic: (row: ApiIncome, patch: { source?: string; amount?: number; date?: string }) => void
  onChangeTag: (row: ApiIncome, tagId: string | null) => void
  onEdit: (row: ApiIncome) => void
  onDuplicate: (row: ApiIncome) => void
  onDelete: (row: ApiIncome) => void
  onAdd: () => void
}

export function IncomesTable(props: Props) {
  const { rows, selected, onSelectedChange, sort, onSortChange } = props
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = usePageSize()

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize)
  const total = rows.reduce((s, r) => s + toNumber(r.amount), 0)

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

  const tagPicker = (row: ApiIncome) => (
    <InlinePicker
      label="Tag"
      valueId={row.tagId}
      display={row.tagId ? props.tagName(row.tagId) : "Sem tag"}
      dotColor={tagColor(props.tagIndex(row.tagId))}
      options={props.tagOptions}
      noneLabel="Sem tag"
      inGroup={false}
      onChange={(id) => props.onChangeTag(row, id)}
    />
  )

  return (
    <div>
      {/* Desktop */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-[60px] z-10 bg-card shadow-[0_1px_0_var(--border)]">
            <tr>
              <th className="w-10 pl-5">
                <Checkbox
                  checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                  onCheckedChange={(c) => toggleAll(c === true)}
                  aria-label="Selecionar todas as receitas da página"
                />
              </th>
              <SortTh k="source" sort={sort} onSort={onSortChange}>
                Fonte
              </SortTh>
              <SortTh k="tag" sort={sort} onSort={onSortChange}>
                Tag
              </SortTh>
              <SortTh k="date" sort={sort} onSort={onSortChange}>
                Data
              </SortTh>
              <SortTh k="amount" sort={sort} onSort={onSortChange} right>
                Valor
              </SortTh>
              <th className="w-12 pr-4">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className={cn("border-b last:border-0 hover:bg-muted/40", selected.has(row.id) && "bg-primary-soft/50")}>
                <td className="w-10 pl-5">
                  <Checkbox checked={selected.has(row.id)} onCheckedChange={(c) => toggleOne(row.id, c === true)} aria-label={`Selecionar ${row.source}`} />
                </td>
                <td className="h-[54px] px-3 font-medium">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EditableText value={row.source} label="fonte" onSave={(source) => props.onChangeBasic(row, { source })} />
                    {row.fixedIncomeCompetence && <FixedBadge />}
                  </div>
                </td>
                <td className="px-3">{tagPicker(row)}</td>
                <td className="px-3">
                  <EditableDate value={row.date} label="data" onSave={(date) => props.onChangeBasic(row, { date })} />
                </td>
                <td className="px-3">
                  <EditableMoney value={toNumber(row.amount)} label="valor" onSave={(amount) => props.onChangeBasic(row, { amount })} />
                </td>
                <td className="w-12 pr-4 text-right">
                  <RowMenu row={row} {...props} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-card shadow-[0_-1px_0_var(--border)]">
            <tr>
              <td />
              <td className="h-11 px-3 font-semibold" colSpan={3}>
                Total
              </td>
              <td className="num px-3 text-right font-semibold text-income">{formatBRL(total)}</td>
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
            aria-label="Selecionar todas as receitas da página"
          />
          Selecionar todas
        </li>
        {pageRows.map((row) => (
          <li key={row.id} className={cn("flex items-start gap-3 px-4 py-3", selected.has(row.id) && "bg-primary-soft/50")}>
            <Checkbox
              className="mt-1"
              checked={selected.has(row.id)}
              onCheckedChange={(c) => toggleOne(row.id, c === true)}
              aria-label={`Selecionar ${row.source}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 font-medium">
                <EditableText value={row.source} label="fonte" onSave={(source) => props.onChangeBasic(row, { source })} />
                {row.fixedIncomeCompetence && <FixedBadge />}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                <EditableDate
                  value={row.date}
                  label="data"
                  text={`recebida em ${formatDateDisplay(row.date).slice(0, 5)}`}
                  onSave={(date) => props.onChangeBasic(row, { date })}
                />
              </div>
              <div className="mt-1 text-xs">{tagPicker(row)}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <EditableMoney value={toNumber(row.amount)} label="valor" onSave={(amount) => props.onChangeBasic(row, { amount })} />
              <RowMenu row={row} {...props} />
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Total</span>
          <span className="num text-income">{formatBRL(total)}</span>
        </li>
      </ul>

      <button
        type="button"
        onClick={props.onAdd}
        aria-label="Nova receita"
        title="Nova receita"
        className="flex min-h-12 w-full items-center justify-center border-t text-primary hover:bg-muted/50"
      >
        <Plus className="size-5" aria-hidden />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-[13px] text-muted-foreground md:px-5">
        <span className="num">
          {rows.length === 0 ? "0 receitas" : `${current * pageSize + 1}–${Math.min((current + 1) * pageSize, rows.length)} de ${rows.length}`}
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
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <span className="num">
              Página {current + 1} de {pageCount}
            </span>
            <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1} aria-label="Próxima página">
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
  onEdit,
  onDuplicate,
  onDelete,
}: { row: ApiIncome } & Pick<Props, "onEdit" | "onDuplicate" | "onDelete">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 max-md:size-11" aria-label={`Ações de ${row.source}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
