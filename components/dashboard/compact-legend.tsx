import type { ChartConfig } from "@/components/ui/chart"

export function CompactLegend({
  data,
  config,
}: {
  data: Array<{ name: string; fill: string }>
  config: ChartConfig
}) {
  if (!data?.length) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-2 pt-2">
      {data.map((item, idx) => {
        const itemConfig = config[item.name]
        const label = itemConfig?.label || item.name
        const color = itemConfig?.color || item.fill
        return (
          <div key={idx} className="flex items-center gap-1.5 text-[10px] leading-tight">
            <div className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="whitespace-nowrap">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
