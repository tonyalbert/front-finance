"use client"

import * as React from "react"

type PeriodContextValue = {
  /** 0-11 */
  month: number
  year: number
  setPeriod: (month: number, year: number) => void
  setMonth: (month: number) => void
  setYear: (year: number) => void
  prevMonth: () => void
  nextMonth: () => void
}

const PeriodContext = React.createContext<PeriodContextValue | null>(null)

/** Período global (mês + ano) mostrado na topbar. Começa no mês atual. */
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = React.useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  const value = React.useMemo<PeriodContextValue>(
    () => ({
      ...period,
      setPeriod: (month, year) => setPeriodState({ month, year }),
      setMonth: (month) => setPeriodState((p) => ({ ...p, month })),
      setYear: (year) => setPeriodState((p) => ({ ...p, year })),
      prevMonth: () =>
        setPeriodState((p) => (p.month === 0 ? { month: 11, year: p.year - 1 } : { ...p, month: p.month - 1 })),
      nextMonth: () =>
        setPeriodState((p) => (p.month === 11 ? { month: 0, year: p.year + 1 } : { ...p, month: p.month + 1 })),
    }),
    [period],
  )

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = React.useContext(PeriodContext)
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de PeriodProvider")
  return ctx
}
