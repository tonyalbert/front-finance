"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Valor em reais -> "1.234,56" (sem símbolo). */
export function formatMoneyInput(value: number): string {
  if (!value) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Campo de moeda com máscara por centavos: digitar 1, 2, 3, 4, 5 vira 12,345 → 123,45.
 * `value` e `onChange` trabalham em reais (number), então o formulário guarda um número.
 */
export const MoneyInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
    value: number
    onChange: (value: number) => void
  }
>(function MoneyInput({ value, onChange, className, ...props }, ref) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={formatMoneyInput(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 11)
          onChange(digits ? parseInt(digits, 10) / 100 : 0)
        }}
        className={cn(
          "num h-10 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow]",
          "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
          "aria-invalid:border-expense aria-invalid:focus-visible:ring-expense/25",
          className,
        )}
        {...props}
      />
    </div>
  )
})
