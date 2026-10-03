"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatBRL, formatDateDisplay, toUtcIso, utcParts } from "@/lib/finance-utils"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MoneyInput } from "./money-input"

/** Cor da tag: ciclo de --chart-1..7 pela posição na lista de tags. */
export function tagColor(index: number) {
  return `var(--chart-${(index % 7) + 1})`
}

export function SortTh<K extends string>({
  k,
  sort,
  onSort,
  right,
  children,
}: {
  k: K
  sort: { key: K | null; dir: "asc" | "desc" }
  onSort: (key: K) => void
  right?: boolean
  children: React.ReactNode
}) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      aria-sort={!active ? undefined : sort.dir === "asc" ? "ascending" : "descending"}
      className={cn("h-10 px-3 text-left font-medium", right && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </th>
  )
}

const editBtn =
  "-mx-2 rounded-md px-2 py-1 text-left hover:bg-muted focus-visible:bg-muted data-[state=open]:bg-muted max-md:py-1.5"

/** Texto editável na célula: clique para editar, Enter ou sair do campo salva, Esc cancela. */
export function EditableText({
  value,
  label,
  onSave,
  className,
}: {
  value: string
  label: string
  onSave: (value: string) => void
  className?: string
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const cancelled = React.useRef(false)

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Editar ${label}: ${value}`}
        onClick={() => {
          cancelled.current = false
          setDraft(value)
          setEditing(true)
        }}
        className={cn(editBtn, className)}
      >
        {value}
      </button>
    )
  }

  const commit = () => {
    if (cancelled.current) return
    setEditing(false)
    const next = draft.trim()
    if (next === value.trim()) return
    if (next.length < 2) {
      toast.error("O item precisa ter pelo menos 2 caracteres.")
      return
    }
    onSave(next)
  }

  return (
    <input
      autoFocus
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
        if (e.key === "Escape") {
          cancelled.current = true
          setEditing(false)
        }
      }}
      className="h-8 w-full min-w-[160px] rounded-md border border-ring bg-card px-2 text-sm font-medium outline-none ring-[3px] ring-ring/25"
    />
  )
}

/** Valor editável na célula, com máscara de moeda por centavos. */
export function EditableMoney({ value, label, onSave }: { value: number; label: string; onSave: (value: number) => void }) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const cancelled = React.useRef(false)

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Editar ${label}: ${formatBRL(value)}`}
        onClick={() => {
          cancelled.current = false
          setDraft(value)
          setEditing(true)
        }}
        className={cn(editBtn, "num -mr-2 ml-auto block text-right font-semibold")}
      >
        {formatBRL(value)}
      </button>
    )
  }

  const commit = () => {
    if (cancelled.current) return
    setEditing(false)
    if (draft === value) return
    if (!(draft > 0)) {
      toast.error("O valor precisa ser maior que zero.")
      return
    }
    onSave(draft)
  }

  return (
    <div className="ml-auto w-[140px]">
      <MoneyInput
        autoFocus
        aria-label={label}
        value={draft}
        onChange={setDraft}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            cancelled.current = true
            setEditing(false)
          }
        }}
        className="h-8 font-semibold"
      />
    </div>
  )
}

/** Vencimento editável na célula: abre o calendário e salva ao escolher o dia. */
export function EditableDate({ value, label, onSave, text }: { value: string; label: string; onSave: (iso: string) => void; text?: string }) {
  const [open, setOpen] = React.useState(false)
  const parts = utcParts(value)
  const selected = parts ? new Date(parts.year, parts.month, parts.day) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Alterar ${label}: ${formatDateDisplay(value)}`} className={cn(editBtn, "num")}>
          {text ?? formatDateDisplay(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            setOpen(false)
            const iso = toUtcIso(date.getFullYear(), date.getMonth(), date.getDate())
            if (iso !== value) onSave(iso)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export type PickerOption = { id: string; name: string }

/**
 * Troca tag/credor direto na célula. Em parcelada, o item "Aplicar a todas as parcelas"
 * (marcável antes de escolher) estende a mudança ao grupo inteiro.
 */
export function InlinePicker({
  label,
  valueId,
  display,
  dotColor,
  options,
  noneLabel,
  inGroup,
  onChange,
  className,
}: {
  label: string
  valueId: string | null
  display: string
  dotColor?: string
  options: PickerOption[]
  noneLabel: string
  inGroup: boolean
  onChange: (id: string | null, applyToGroup: boolean) => void
  className?: string
}) {
  const [applyAll, setApplyAll] = React.useState(false)
  return (
    <DropdownMenu onOpenChange={(open) => !open && setApplyAll(false)}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${display}. Alterar`}
          className={cn(
            "group -mx-2 inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md px-2 text-left hover:bg-muted data-[state=open]:bg-muted",
            !valueId && "text-muted-foreground",
            className,
          )}
        >
          {valueId && dotColor && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden />}
          <span className="truncate">{display}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60 group-data-[state=open]:opacity-60 max-md:opacity-50" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
        {inGroup && (
          <>
            <DropdownMenuCheckboxItem checked={applyAll} onCheckedChange={setApplyAll} onSelect={(e) => e.preventDefault()}>
              Aplicar a todas as parcelas
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuRadioGroup value={valueId ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v, applyAll)}>
          <DropdownMenuRadioItem value="none">{noneLabel}</DropdownMenuRadioItem>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.id} value={o.id}>
              {o.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
