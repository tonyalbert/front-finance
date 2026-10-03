"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ArrowDown, Moon, Sun } from "lucide-react"
import { PitLogo } from "@/components/brand/pit-logo"
import { RabbitMark } from "@/components/brand/rabbit-mark"
import { Button } from "@/components/ui/button"

/** Moldura das telas de acesso: formulário à esquerda e painel de marca à direita (some no mobile). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="flex flex-col gap-6 px-5 pb-8 pt-5 sm:px-12 sm:py-7">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Pit Finance: página inicial">
            <PitLogo className="text-[15px]" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
          >
            {isDark ? <Sun /> : <Moon />}
          </Button>
        </div>

        <main className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center gap-[18px] py-6">{children}</main>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RabbitMark size={16} decorative className="text-foreground" />
          um serviço Rabbit
        </p>
      </div>

      <aside
        aria-label="Sobre o Pit Finance"
        className="hidden flex-col justify-center gap-8 border-l bg-sidebar p-14 lg:flex"
      >
        <p className="max-w-[460px] text-[22px] font-medium leading-snug tracking-tight">
          Seu mês inteiro em uma tela: o que entrou, o que saiu e o que ainda vence.
        </p>

        <div className="flex max-w-[420px] flex-col gap-3" aria-hidden>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between text-[13px] font-medium text-muted-foreground">
              <span>Saldo do mês</span>
              <span className="rounded-md bg-primary-soft px-1.5 py-px text-[11px] text-primary">Exemplo</span>
            </div>
            <div className="num mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-income">R$ 3.213,52</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="num inline-flex items-center gap-0.5 rounded-md bg-income-soft px-1.5 py-px font-semibold text-income">
                <ArrowDown className="size-3 rotate-180" />
                +29,0%
              </span>
              vs. mês anterior
            </div>
          </div>

          <div className="rounded-xl border bg-card px-4 py-1 shadow-sm">
            {[
              { day: "08", name: "Notebook", tag: "5/10", note: "Vence em 5 dias", value: "R$ 289,90", late: false },
              { day: "10", name: "Condomínio", tag: "", note: "Pendente", value: "R$ 480,00", late: false },
              { day: "01", name: "Internet", tag: "", note: "Atrasada", value: "R$ 119,90", late: true },
            ].map((r) => (
              <div key={r.name} className="flex items-center gap-3 border-b py-3 last:border-0">
                <span
                  className={`flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg border leading-[1.1] ${
                    r.late ? "border-expense/50 bg-expense-soft text-expense" : "bg-subtle"
                  }`}
                >
                  <b className="num text-[15px]">{r.day}</b>
                  <small className="text-[10px] uppercase tracking-wide opacity-70">out</small>
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <strong className="flex items-center gap-1.5 text-sm font-medium">
                    {r.name}
                    {r.tag && <span className="num rounded-md bg-info-soft px-1.5 py-px text-[11px] font-semibold text-info">{r.tag}</span>}
                  </strong>
                  <span className={`text-xs ${r.late ? "text-expense" : "text-muted-foreground"}`}>{r.note}</span>
                </div>
                <span className="num text-sm font-semibold">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
