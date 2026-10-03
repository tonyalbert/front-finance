import { cn } from "@/lib/utils"
import { formatBRL } from "@/lib/finance-utils"
import type { MonthCardData } from "@/lib/finance-types"

/**
 * Só o saldo leva cor; receita e despesa ficam neutras.
 * Estrutura fixa (nome + saldo, receita, despesa) para todos os cards terem o mesmo tamanho.
 */
export function MonthCard({
  month,
  isSelected,
  isFuture,
  onSelect,
}: {
  month: MonthCardData
  /** Mês escolhido no período da topbar */
  isSelected?: boolean
  isFuture?: boolean
  onSelect?: () => void
}) {
  const balance = month.income - month.expense
  const balanceClass = balance > 0 ? "text-income" : balance < 0 ? "text-expense" : "text-muted-foreground"

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={month.isCurrentMonth ? "date" : undefined}
      aria-pressed={isSelected}
      className={cn(
        "flex h-[92px] w-full min-w-0 flex-col justify-between rounded-[10px] border bg-card px-3.5 py-3 text-left transition-colors hover:border-input",
        isSelected && "border-primary shadow-[0_0_0_1px_var(--primary)]",
        isFuture && !isSelected && "border-dashed bg-transparent",
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: month.dotColor }} aria-hidden />
          <span className={cn("truncate", isFuture && "font-medium text-muted-foreground")}>{month.label}</span>
          {month.isCurrentMonth && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[11px] font-medium text-primary-foreground">
              Atual
            </span>
          )}
        </span>
        <span className={cn("num shrink-0 whitespace-nowrap text-right font-semibold", balanceClass)}>
          {formatBRL(balance)}
        </span>
      </span>
      <span className="num flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Receita</span>
        <span className="whitespace-nowrap">{formatBRL(month.income)}</span>
      </span>
      <span className="num flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Despesa</span>
        <span className="whitespace-nowrap">{formatBRL(month.expense)}</span>
      </span>
    </button>
  )
}
