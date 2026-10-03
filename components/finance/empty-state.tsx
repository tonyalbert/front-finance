import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2.5 px-6 py-14 text-center", className)}>
      <span className="mb-1 grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-6" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
