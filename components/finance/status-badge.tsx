import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExpenseStatus } from "@/lib/finance-utils"

const CONFIG = {
  paid: { label: "Pago", icon: CheckCircle2, cls: "bg-income-soft text-income" },
  pending: { label: "Pendente", icon: Clock, cls: "bg-warning-soft text-warning" },
  late: { label: "Atrasado", icon: AlertCircle, cls: "bg-expense-soft text-expense" },
} as const

/**
 * Status sempre com ícone + texto (nunca só cor).
 * Com `onToggle`, vira um botão que alterna pago/pendente.
 */
export function StatusBadge({
  status,
  onToggle,
  disabled,
  className,
}: {
  status: ExpenseStatus
  onToggle?: () => void
  disabled?: boolean
  className?: string
}) {
  const { label, icon: Icon, cls } = CONFIG[status]
  const base = cn(
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-[12.5px] font-medium whitespace-nowrap max-md:h-8",
    cls,
    className,
  )
  const content = (
    <>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </>
  )
  if (!onToggle) return <span className={base}>{content}</span>
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={status === "paid" ? "Pago. Marcar como pendente" : `${label}. Marcar como pago`}
      className={cn(base, "cursor-pointer hover:border-current disabled:cursor-not-allowed disabled:opacity-60")}
    >
      {content}
    </button>
  )
}
