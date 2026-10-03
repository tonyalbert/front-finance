import { useSyncExternalStore } from "react"

const COLLAPSED_KEY = "pit-finance:sidebar-collapsed"

const collapsedListeners = new Set<() => void>()

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    (cb) => {
      collapsedListeners.add(cb)
      return () => collapsedListeners.delete(cb)
    },
    readCollapsed,
    () => false,
  )
  const toggle = () => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1")
    } catch {}
    collapsedListeners.forEach((cb) => cb())
  }
  return [collapsed, toggle]
}
