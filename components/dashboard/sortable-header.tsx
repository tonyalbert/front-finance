import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"

export function SortableHeader({
  column,
  currentSort,
  sortDirection,
  onSort,
  icon: Icon,
  children,
  align = "left",
}: {
  column: "item" | "amount" | "date" | "tagId" | "creditorId" | "isPaid"
  currentSort: "item" | "amount" | "date" | "tagId" | "creditorId" | "isPaid" | null
  sortDirection: "asc" | "desc"
  onSort: (col: "item" | "amount" | "date" | "tagId" | "creditorId" | "isPaid") => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  align?: "left" | "right"
}) {
  const isSorted = currentSort === column
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${align === "right" ? "pr-6 text-right" : ""}`}
      onClick={() => onSort(column)}
    >
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
        <Icon className="size-4 text-muted-foreground" />
        <span>{children}</span>
        {isSorted ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  )
}

export function SortableIncomeHeader({
  column,
  currentSort,
  sortDirection,
  onSort,
  icon: Icon,
  children,
  align = "left",
}: {
  column: "source" | "amount" | "date" | "tagId"
  currentSort: "source" | "amount" | "date" | "tagId" | null
  sortDirection: "asc" | "desc"
  onSort: (col: "source" | "amount" | "date" | "tagId") => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  align?: "left" | "right"
}) {
  const isSorted = currentSort === column
  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${align === "right" ? "pr-6 text-right" : ""}`}
      onClick={() => onSort(column)}
    >
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : ""}`}>
        <Icon className="size-4 text-muted-foreground" />
        <span>{children}</span>
        {isSorted ? (
          sortDirection === "asc" ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  )
}
