import * as React from "react"
import { usePeriod } from "@/components/dashboard/period-provider"

/** Ano do período global (topbar). Mantém a assinatura antiga [ano, setAno] usada pelas páginas. */
export function useSelectedYear(): [string, React.Dispatch<React.SetStateAction<string>>] {
  const { year, setYear } = usePeriod()
  const set = React.useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (value) => {
      const next = typeof value === "function" ? value(String(year)) : value
      setYear(Number(next))
    },
    [year, setYear],
  )
  return [String(year), set]
}
