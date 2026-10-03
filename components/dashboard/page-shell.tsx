"use client"

/**
 * Cabeçalho padrão das páginas. O ano/mês agora vêm do período global da topbar,
 * por isso as props de ano continuam aceitas (compatibilidade) mas não renderizam nada.
 */
export function PageShell({
  title,
  subtitle,
  headerActions,
  children,
}: {
  title: string
  subtitle?: string
  /** @deprecated o período é controlado pela topbar */
  availableYears?: number[]
  /** @deprecated o período é controlado pela topbar */
  selectedYear?: string
  /** @deprecated o período é controlado pela topbar */
  onYearChange?: (year: string) => void
  headerActions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-14 md:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
      </div>
      {children}
    </div>
  )
}
