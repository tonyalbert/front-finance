"use client"

import * as React from "react"
import { Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Lançamentos fictícios de um mês: [nome, valor]. */
const EV: Record<number, [string, number][]> = {
  1: [["Internet", -119.9], ["Uber", -74.3], ["Farmácia", -58.9], ["Cinema", -64]],
  2: [["Salário", 7200], ["Supermercado", -752.93], ["Combustível", -210]],
  3: [["Feira", -86.4]],
  5: [["Aluguel", -1950], ["Academia", -99.9]],
  8: [["Notebook 5/10", -289.9]],
  10: [["Condomínio", -480], ["Empréstimo 3/12", -395], ["Freelance", 850]],
  12: [["Luz", -187.35]],
  18: [["Streaming", -55.9]],
  20: [["Plano de saúde", -412]],
  25: [["Consultoria", 400]],
}

const START = 2491.6
const BASE_Y = 210

const X = (d: number) => +(40 + ((d - 1) * 920) / 30).toFixed(1)
const Y = (v: number) => +(BASE_Y - v * 0.0205).toFixed(1)

const money = (v: number) => (v < 0 ? "−R$ " : "R$ ") + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// saldo ao fim de cada dia (índice 0 = saldo inicial)
const BAL: number[] = [START]
for (let d = 1; d <= 31; d++) BAL[d] = BAL[d - 1] + (EV[d] ?? []).reduce((a, e) => a + e[1], 0)

function buildPath(until: number) {
  let p = "M40 " + Y(START)
  for (let d = 1; d <= until; d++) if (EV[d]) p += " L" + X(d) + " " + Y(BAL[d - 1]) + " L" + X(d) + " " + Y(BAL[d])
  return p + " L" + X(until) + " " + Y(BAL[until])
}

const FULL_PATH = buildPath(31)
const DOTS = Object.keys(EV).map((k) => {
  const d = Number(k)
  const net = EV[d].reduce((a, e) => a + e[1], 0)
  return { d, x: X(d), y: Y(BAL[d]), income: net >= 0 }
})

/** O mês em uma linha: saldo dia a dia, com um coelho pulando e um controle para arrastar. */
export function MonthSimulation() {
  // começa no fim do mês (HTML estático/SEO) e, no cliente, reinicia do dia 1 e anima
  const [dia, setDia] = React.useState(31)
  const [playing, setPlaying] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setPlaying(false)
  }, [])

  const start = React.useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    setPlaying(true)
    timer.current = setInterval(() => {
      setDia((d) => {
        if (d >= 31) {
          // fim do mês: para a animação fora do updater
          queueMicrotask(stop)
          return d
        }
        return d + 1
      })
    }, 230)
  }, [stop])

  React.useEffect(() => {
    let reduce = false
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    } catch {}
    if (reduce) return
    const t = setTimeout(() => {
      setDia(1)
      start()
    }, 700)
    return () => {
      clearTimeout(t)
      if (timer.current) clearInterval(timer.current)
    }
  }, [start])

  const pathPast = buildPath(dia)
  const events = EV[dia] ?? []
  const delta = BAL[dia] - START
  const rx = X(dia)
  const ry = Y(BAL[dia])

  return (
    <div
      role="group"
      aria-label="Simulação de outubro no Pit Finance"
      className="mt-10 rounded-2xl border bg-card px-4 pb-3 pt-[18px] min-[760px]:mt-16 min-[760px]:rounded-[20px] min-[760px]:px-7 min-[760px]:pb-[18px] min-[760px]:pt-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5 min-[760px]:min-w-[280px]" aria-live={playing ? "off" : "polite"}>
          <span className="text-[13px] text-muted-foreground">Saldo no dia {dia} de outubro</span>
          <strong className="num text-[clamp(36px,5vw,60px)] font-semibold leading-none tracking-[-0.045em]">{money(BAL[dia])}</strong>
          <span className={cn("num text-[13px]", delta >= 0 ? "text-income" : "text-expense")}>
            {delta >= 0 ? "+" : ""}
            {money(delta)} desde o início do mês
          </span>
        </div>

        <div className="flex min-h-[34px] max-w-[620px] flex-wrap items-center gap-2 min-[760px]:justify-end">
          {events.length > 0 && <span className="text-xs text-muted-foreground">Neste dia</span>}
          {events.map(([nome, valor]) => (
            <span key={nome} className="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-[13px]">
              <span>{nome}</span>
              <b className={cn("num font-semibold", valor > 0 ? "text-income" : "text-expense")}>
                {valor > 0 ? "+" : ""}
                {money(valor)}
              </b>
            </span>
          ))}
          {events.length === 0 && (
            <span className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-[13px] text-muted-foreground">Nenhuma conta neste dia</span>
          )}
        </div>
      </div>

      <div className="-mx-2 mt-4 overflow-x-auto px-2">
        <svg viewBox="0 0 1000 250" aria-hidden className={cn("lp-month-svg block h-auto w-full min-w-[680px] overflow-visible min-[760px]:min-w-0", playing && "is-playing")}>
          {[25.5, 117.75, 210].map((y) => (
            <line key={y} x1="40" y1={y} x2="960" y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
          ))}
          <text className="lp-ax lp-ax-y" x="32" y="29.5">R$ 9 mil</text>
          <text className="lp-ax lp-ax-y" x="32" y="121.75">R$ 4,5 mil</text>
          <text className="lp-ax lp-ax-y" x="32" y="214">0</text>

          <path d={FULL_PATH} fill="none" stroke="var(--input)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinejoin="round" />
          <path d={`${pathPast} L${rx} ${BASE_Y} L40 ${BASE_Y} Z`} fill="color-mix(in oklch, var(--primary) 16%, transparent)" />
          <path d={pathPast} fill="none" stroke="var(--primary)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <line x1={rx} y1="18" x2={rx} y2={BASE_Y} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 4" />

          {DOTS.map((d) => (
            <circle
              key={d.d}
              cx={d.x}
              cy={d.y}
              r="5"
              fill={d.income ? "var(--income)" : "var(--expense)"}
              stroke="var(--card)"
              strokeWidth="2.5"
              opacity={d.d > dia ? 0.3 : 1}
              style={{ transition: "opacity .2s" }}
            />
          ))}

          <text className="lp-lbl" x={X(2) + 10} y={Y(BAL[2]) - 12}>Salário +7.200</text>
          <text className="lp-lbl" x={X(5) + 10} y={Y(BAL[5]) + 22}>Aluguel −1.950</text>

          {[1, 5, 10, 15, 20, 25, 31].map((d) => (
            <text key={d} className="lp-ax" x={X(d)} y="238">{d}</text>
          ))}

          <g className="lp-bun" style={{ transform: `translate(${rx}px, ${ry}px)` }}>
            <g className="lp-hop">
              <g transform="translate(-19 -46) scale(0.4)">
                <rect x="31" y="4" width="14" height="44" rx="7" transform="rotate(-14 38 44)" fill="var(--primary)" />
                <rect x="51" y="4" width="14" height="44" rx="7" transform="rotate(14 58 44)" fill="var(--primary)" />
                <circle cx="48" cy="62" r="28" fill="var(--primary)" stroke="var(--card)" strokeWidth="4" />
                <path d="M41.5 63.5 Q48 60.5 54.5 63.5 Q52 70 48 71.5 Q44 70 41.5 63.5 Z" fill="var(--card)" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <div className="mt-1.5 flex items-center gap-3.5">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={playing ? "Pausar animação" : "Reproduzir o mês"}
          onClick={() => {
            if (playing) stop()
            else {
              if (dia >= 31) setDia(1)
              start()
            }
          }}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <label className="sr-only" htmlFor="lp-dia">
          Dia de outubro
        </label>
        <input
          id="lp-dia"
          type="range"
          min={1}
          max={31}
          step={1}
          value={dia}
          onChange={(e) => {
            stop()
            setDia(parseInt(e.target.value, 10) || 1)
          }}
          className="h-11 flex-1 cursor-pointer accent-primary"
        />
        <span className="hidden text-xs text-muted-foreground min-[760px]:inline">Arraste para ver o mês</span>
      </div>
    </div>
  )
}
