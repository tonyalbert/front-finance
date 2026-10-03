import { Plus } from "lucide-react"
import { PitLogo } from "@/components/brand/pit-logo"
import { cn } from "@/lib/utils"

const MONTHS = [
  { label: "Mai", in: 102.7, out: 94.3, inY: 37.3, outY: 45.7 },
  { label: "Jun", in: 105.3, out: 73.3, inY: 34.7, outY: 66.7 },
  { label: "Jul", in: 102.7, out: 82.9, inY: 37.3, outY: 57.1 },
  { label: "Ago", in: 115.7, out: 77, inY: 24.3, outY: 63 },
  { label: "Set", in: 105.4, out: 73, inY: 34.6, outY: 67 },
  { label: "Out", in: 109.9, out: 68.1, inY: 30.1, outY: 71.9 },
]

const NAV = ["Dashboard", "Receitas", "Despesas", "Despesas fixas"]

const KPIS = [
  { label: "Saldo do período", value: "R$ 3.213,52", delta: "+29,0%", cls: "text-income", hero: true },
  { label: "Receitas", value: "R$ 8.450,00", delta: "+4,2%" },
  { label: "Despesas", value: "R$ 5.236,48", delta: "-6,8%" },
  { label: "A pagar", value: "R$ 1.460,05", foot: "6 contas", cls: "text-warning" },
]

const UPCOMING = [
  { day: "01", name: "Internet", note: "Atrasada há 2 dias", value: "R$ 119,90", late: true },
  { day: "08", name: "Notebook", parcel: "5/10", note: "Vence em 5 dias", value: "R$ 289,90", warn: true },
  { day: "10", name: "Empréstimo", parcel: "3/12", note: "Vence em 7 dias", value: "R$ 395,00" },
]

/** Prévia do painel feita com HTML/SVG (não imagem). Sempre no tema escuro. */
export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Prévia do painel do Pit Finance"
      className="mx-auto mt-10 max-w-[1120px] rounded-t-xl border border-b-0 bg-muted p-1.5 sm:mt-16 sm:rounded-t-[18px] sm:p-2.5 sm:pb-0"
    >
      <div
        aria-hidden
        className="dark flex h-[460px] overflow-hidden rounded-t-[10px] border border-b-0 bg-background text-left text-foreground sm:h-[520px]"
      >
        <div className="hidden w-[196px] shrink-0 flex-col gap-0.5 border-r bg-sidebar p-3 min-[900px]:flex">
          <div className="flex h-9 items-center px-1.5">
            <PitLogo className="text-sm" />
          </div>
          {NAV.map((n, i) => (
            <span
              key={n}
              className={cn(
                "flex min-h-8 items-center rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground",
                i === 0 && "bg-sidebar-accent text-foreground",
              )}
            >
              {n}
            </span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 overflow-hidden p-3.5 sm:px-[22px] sm:py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Outubro de 2026</div>
              <strong className="text-lg tracking-tight">Visão geral</strong>
            </div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground">
              <Plus className="size-3.5" />
              Nova despesa
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 min-[900px]:grid-cols-4">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-xl border bg-card px-3.5 py-3">
                <div className="text-[13px] font-medium text-muted-foreground">{k.label}</div>
                <div className={cn("num mt-1 text-[19px] font-semibold leading-tight tracking-tight", k.cls)}>{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {k.delta ? (
                    <span className="num rounded-md bg-income-soft px-1.5 py-px font-semibold text-income">{k.delta}</span>
                  ) : (
                    k.foot
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 min-[900px]:grid-cols-[1.5fr_1fr]">
            <div className="hidden rounded-xl border bg-card px-4 py-3.5 sm:block">
              <div className="flex items-center justify-between">
                <strong className="text-[13px]">Receitas × despesas</strong>
                <span className="flex items-center gap-2.5 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-series-in" />
                    Receitas
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-series-out" />
                    Despesas
                  </span>
                </span>
              </div>
              <svg viewBox="0 0 360 162" className="mt-2 w-full" aria-hidden>
                {[10, 75, 140].map((y) => (
                  <line key={y} x1="20" y1={y} x2="356" y2={y} stroke="var(--chart-grid)" />
                ))}
                {MONTHS.map((m, i) => {
                  const x = 30 + i * 56
                  return (
                    <g key={m.label}>
                      <rect x={x} y={m.inY} width="14" height={m.in} rx="2" fill="var(--series-in)" />
                      <rect x={x + 18} y={m.outY} width="14" height={m.out} rx="2" fill="var(--series-out)" />
                      <text
                        x={x + 18}
                        y="156"
                        textAnchor="middle"
                        fontSize="10"
                        fill={m.label === "Out" ? "var(--foreground)" : "var(--muted-foreground)"}
                        fontWeight={m.label === "Out" ? 700 : 400}
                      >
                        {m.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <div className="rounded-xl border bg-card px-4 py-2.5">
              <strong className="text-[13px]">Próximas contas</strong>
              <ul>
                {UPCOMING.map((u) => (
                  <li key={u.name} className="flex items-center gap-3 border-b py-2.5 last:border-0">
                    <span
                      className={cn(
                        "flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border leading-[1.1]",
                        u.late ? "border-expense/50 bg-expense-soft text-expense" : "bg-subtle",
                      )}
                    >
                      <b className="num text-[15px]">{u.day}</b>
                      <small className="text-[10px] uppercase tracking-wide opacity-70">out</small>
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <strong className="flex items-center gap-1.5 text-[13px] font-medium">
                        {u.name}
                        {u.parcel && (
                          <span className="num rounded-md bg-info-soft px-1.5 py-px text-[11px] font-semibold text-info">{u.parcel}</span>
                        )}
                      </strong>
                      <span className={cn("text-xs text-muted-foreground", u.late && "text-expense", u.warn && "text-warning")}>{u.note}</span>
                    </div>
                    <span className="num text-[13px] font-semibold">{u.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
