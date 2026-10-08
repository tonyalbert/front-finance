import { Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

/** Parcela "3/12". Não renderiza nada se não for parcelada. */
export function InstallmentBadge({
  number,
  total,
  className,
}: {
  number?: number | null
  total?: number | null
  className?: string
}) {
  if (!number || !total || total < 2) return null
  return (
    <span
      className={cn(
        "num inline-flex h-5 items-center rounded-md bg-info-soft px-1.5 text-[11px] font-semibold text-info",
        className,
      )}
      title={`Parcela ${number} de ${total}`}
    >
      {number}/{total}
    </span>
  )
}

/** Badge "Fixa" para despesas/receitas geradas por uma regra fixa. */
export function FixedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Repeat className="size-3" aria-hidden />
      Fixa
    </span>
  )
}
