import { CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

/** Lançamentos fictícios de outubro: dia → [nome, valor]. */
const EV: Record<number, [string, number][]> = {
  1: [["Internet", -119.9], ["Uber", -74.3], ["Farmácia", -58.9], ["Cinema", -64]],
  2: [["Salário", 7200], ["Supermercado", -752.93], ["Combustível", -210]],
  3: [["Feira", -86.4]],
  5: [["Aluguel", -1950], ["Academia", -99.9]],
  8: [["Notebook", -289.9]],
  10: [["Condomínio", -480], ["Empréstimo", -395], ["Freelance", 850]],
  12: [["Luz", -187.35]],
  18: [["Streaming", -55.9]],
  20: [["Plano de saúde", -412]],
  25: [["Consultoria", 400]],
}

const START = 2491.6
const TODAY = 3
const LAST = 31

const BAL: number[] = [START]
for (let d = 1; d <= LAST; d++) BAL[d] = BAL[d - 1] + (EV[d] ?? []).reduce((a, e) => a + e[1], 0)

const TO_PAY = Object.entries(EV)
  .filter(([d]) => Number(d) > TODAY)
  .flatMap(([, list]) => list)
  .reduce((a, [, v]) => (v < 0 ? a - v : a), 0)

const UPCOMING = [
  { day: 1, name: "Internet", value: 119.9, paid: true },
  { day: 5, name: "Aluguel", value: 1950 },
  { day: 8, name: "Notebook", parcel: "5/10", value: 289.9 },
  { day: 10, name: "Empréstimo", parcel: "3/12", value: 395 },
]

// gráfico
const W = 520
const H = 150
const PAD_X = 8
const TOP = 14
const BASE = 128
const MAX = 9000
const X = (d: number) => +(PAD_X + ((d - 1) * (W - PAD_X * 2)) / (LAST - 1)).toFixed(1)
const Y = (v: number) => +(BASE - (v / MAX) * (BASE - TOP)).toFixed(1)

/** Saldo em degraus de `from` até `to`, partindo de `startValue`. */
function stepPath(from: number, to: number, startValue: number) {
  let p = `M${X(from)} ${Y(startValue)}`
  for (let d = from; d <= to; d++) {
    // a partir de "hoje", o saldo inicial já inclui os lançamentos do dia
    if (d === from && from > 1) continue
    if (EV[d]) p += ` L${X(d)} ${Y(BAL[d - 1])} L${X(d)} ${Y(BAL[d])}`
  }
  return p + ` L${X(to)} ${Y(BAL[to])}`
}

const PAST = stepPath(1, TODAY, START)
const FUTURE = stepPath(TODAY, LAST, BAL[TODAY])

const money = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Cartão de previsão do mês: saldo previsto, linha do saldo e próximas contas. Estático, com uma entrada suave. */
export function HeroForecast() {
  return (
    <div
      role="img"
      aria-label={`Exemplo de previsão: saldo hoje ${money(BAL[TODAY])}, saldo previsto em 31 de outubro ${money(BAL[LAST])}.`}
      className="lp-forecast rounded-2xl border bg-card shadow-[0_24px_60px_-24px_rgb(0_0_0/0.6)]"
    >
      <div aria-hidden>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <strong className="text-sm font-medium">Previsão de outubro</strong>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-income" />
            Hoje, 3 de out
          </span>
        </div>

        <div className="px-5 pt-5">
          <div className="text-[13px] text-muted-foreground">Saldo previsto em 31/10</div>
          <div className="num mt-1 text-[clamp(30px,3.6vw,40px)] font-semibold leading-none tracking-[-0.04em]">{money(BAL[LAST])}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-muted-foreground">Saldo hoje</div>
              <div className="num mt-0.5 font-semibold">{money(BAL[TODAY])}</div>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-muted-foreground">A pagar até o fim do mês</div>
              <div className="num mt-0.5 font-semibold text-expense">{money(TO_PAY)}</div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
            {[TOP, (TOP + BASE) / 2, BASE].map((y) => (
              <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
            ))}
            <path
              d={`${PAST} L${X(TODAY)} ${BASE} L${X(1)} ${BASE} Z`}
              fill="color-mix(in oklch, var(--primary) 14%, transparent)"
              className="lp-fade"
            />
            <path
              d={PAST}
              pathLength={1}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="lp-draw"
            />
            <path
              d={FUTURE}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeDasharray="3 5"
              strokeLinejoin="round"
              className="lp-fade lp-fade-late"
            />
            <line x1={X(TODAY)} y1={TOP} x2={X(TODAY)} y2={BASE} stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeDasharray="2 3" />
            <circle cx={X(TODAY)} cy={Y(BAL[TODAY])} r="4.5" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
            <circle cx={X(LAST)} cy={Y(BAL[LAST])} r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" className="lp-fade lp-fade-late" />
            {[1, 10, 20, 31].map((d) => (
              <text
                key={d}
                x={X(d)}
                y={H - 2}
                fontSize="11"
                fill="var(--muted-foreground)"
                textAnchor={d === 1 ? "start" : d === LAST ? "end" : "middle"}
              >
                {`${d}/10`}
              </text>
            ))}
            <text x={X(TODAY) + 6} y={H - 2} fontSize="11" fill="var(--foreground)">
              hoje
            </text>
          </svg>
        </div>

        <ul className="mt-2 border-t px-5 py-1.5">
          {UPCOMING.map((u) => {
            const inDays = u.day - TODAY
            return (
              <li key={u.name} className="flex items-center gap-3 border-b py-2.5 text-[13px] last:border-0">
                <span className="num w-9 shrink-0 text-muted-foreground">{String(u.day).padStart(2, "0")}/10</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {u.name}
                  {u.parcel && <span className="num ml-1.5 text-xs font-normal text-muted-foreground">{u.parcel}</span>}
                </span>
                <span
                  className={cn(
                    "hidden items-center gap-1 text-xs min-[420px]:inline-flex",
                    u.paid ? "text-income" : inDays <= 2 ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {u.paid ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                  {u.paid ? "Pago" : `Vence em ${inDays} dias`}
                </span>
                <span className="num w-[92px] shrink-0 text-right font-semibold">{money(u.value)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
