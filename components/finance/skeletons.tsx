import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function KpiSkeleton() {
  return (
    <Card className="gap-2 px-4 py-4" aria-hidden>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </Card>
  )
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] sm:gap-4"
      role="status"
      aria-label="Carregando"
    >
      {Array.from({ length: count }, (_, i) => (
        <KpiSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y" role="status" aria-label="Carregando">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 flex-[2]" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <Skeleton className="w-full" style={{ height }} role="status" aria-label="Carregando gráfico" />
}
