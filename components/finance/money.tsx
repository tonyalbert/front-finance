import { cn } from "@/lib/utils"
import { formatBRL } from "@/lib/finance-utils"

type Tone = "income" | "expense" | "warning" | "muted" | "default"

const toneClass: Record<Tone, string> = {
  income: "text-income",
  expense: "text-expense",
  warning: "text-warning",
  muted: "text-muted-foreground",
  default: "",
}

/** Valor monetário em pt-BR (R$ 1.234,56) com algarismos tabulares. */
export function Money({
  value,
  tone = "default",
  className,
}: {
  value: number
  tone?: Tone
  className?: string
}) {
  return <span className={cn("num whitespace-nowrap", toneClass[tone], className)}>{formatBRL(value)}</span>
}
