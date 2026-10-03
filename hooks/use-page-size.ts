import * as React from "react"

export const PAGE_SIZES = [10, 15, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 15
const PAGE_SIZE_KEY = "pit-finance:page-size"
const pageSizeListeners = new Set<() => void>()

function readPageSize(): number {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE
  } catch {
    return DEFAULT_PAGE_SIZE
  }
}

/** Itens por página, lembrado entre visitas. */
export function usePageSize(): [number, (size: number) => void] {
  const size = React.useSyncExternalStore(
    (cb) => {
      pageSizeListeners.add(cb)
      return () => pageSizeListeners.delete(cb)
    },
    readPageSize,
    () => DEFAULT_PAGE_SIZE,
  )
  const set = (next: number) => {
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(next))
    } catch {}
    pageSizeListeners.forEach((cb) => cb())
  }
  return [size, set]
}
