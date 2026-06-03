import { useState } from "react"

export function useSelectedYear(): [string, React.Dispatch<React.SetStateAction<string>>] {
  return useState<string>(String(new Date().getFullYear()))
}
