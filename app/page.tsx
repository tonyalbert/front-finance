"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  BarChart3,
  Brain,
  CreditCard,
  PiggyBank,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { RaycastBackground } from "@/components/ui/raycast-animated-background"
import { LiquidButton, GlassFilter } from "@/components/ui/liquid-glass-button"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const router = useRouter()
  const { token, isReady } = useAuth()

  useEffect(() => {
    if (isReady && token) router.replace("/dashboard")
  }, [isReady, token, router])

  if (!isReady || token) return null

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Wallet className="size-6 text-red-400" />
            <span className="text-lg font-bold tracking-tight text-white">Pit Finance</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-red-500 hover:bg-red-400 text-white border-0 shadow-lg shadow-red-500/20">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <RaycastBackground className="min-h-screen">
        {/* Shared glass SVG filter — rendered once for the whole hero */}
        <GlassFilter />

        <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-32 text-center">

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Seu dinheiro,{" "}
            <span className="bg-gradient-to-r from-red-400 via-rose-300 to-red-400 bg-clip-text text-transparent">
              sob controle
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Organize receitas, despesas, parcelas e credores em um só lugar.
            Saiba exatamente para onde vai seu dinheiro — mês a mês.
          </p>

          {/* CTAs — primary é emerald branded, secondary é liquid glass */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="gap-2 bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-400 hover:shadow-red-400/40 transition-all rounded-full px-8"
              >
                Começar grátis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <LiquidButton size="lg" className="text-white rounded-full px-8 font-semibold">
                Já tenho conta
              </LiquidButton>
            </Link>
          </div>

          {/* Social proof — liquid glass card */}
          <div className="mt-16 relative inline-flex flex-col items-center gap-3 rounded-2xl px-6 py-4">
            <div
              className="absolute inset-0 rounded-2xl border border-white/20 bg-white/8 backdrop-blur-md
                shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1),0_8px_32px_rgba(0,0,0,0.2)]"
            />
            <div className="relative z-10 flex -space-x-2">
              {[
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
              ].map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt="User avatar"
                  width={36}
                  height={36}
                  className="rounded-full border-2 border-white/30 object-cover"
                />
              ))}
            </div>
            <p className="relative z-10 text-sm text-white/70">
              Mais de{" "}
              <span className="font-semibold text-white">2.000 usuários</span>{" "}
              já organizam suas finanças
            </p>
          </div>

          {/* Stats — liquid glass pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {[
              { value: "100%", label: "Gratuito" },
              { value: "< 2 min", label: "Para começar" },
              { value: "IA", label: "Análise mensal" },
            ].map((stat) => (
              <div key={stat.label} className="relative flex items-center gap-2.5 rounded-full px-5 py-2.5">
                <div
                  className="absolute inset-0 rounded-full border border-white/20 bg-white/8 backdrop-blur-md
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]"
                />
                <span className="relative z-10 text-lg font-bold text-white">{stat.value}</span>
                <span className="relative z-10 text-xs text-white/55">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </RaycastBackground>

      {/* Preview do sistema com scroll animation */}
      <section className="relative overflow-hidden border-t bg-zinc-950">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-red-700/8 blur-[140px]" />
          <div className="absolute left-1/4 bottom-1/4 h-[300px] w-[400px] rounded-full bg-red-900/10 blur-[100px]" />
          <div className="absolute right-1/4 top-1/3 h-[250px] w-[350px] rounded-full bg-red-800/8 blur-[80px]" />
        </div>

        {/* Dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10">
          <ContainerScroll
            titleComponent={
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-red-400" />
                  Preview
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Veja como{" "}
                  <span className="bg-gradient-to-r from-red-400 via-rose-300 to-red-400 bg-clip-text text-transparent">
                    funciona
                  </span>
                </h2>
                <p className="mx-auto max-w-md text-base text-white/40">
                  Uma visão geral do seu painel financeiro.
                </p>
              </div>
            }
          >
            <Image
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80"
              alt="Dashboard preview"
              width={1400}
              height={720}
              className="mx-auto rounded-2xl object-cover h-full object-top"
              draggable={false}
            />
          </ContainerScroll>
        </div>
      </section>

      {/* Features — bento grid liquid glass */}
      <section className="relative overflow-hidden border-t bg-zinc-950 py-28">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/3 h-[400px] w-[400px] rounded-full bg-red-900/10 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          {/* Header */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-red-400" />
              Funcionalidades
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Tudo que você precisa para{" "}
              <span className="bg-gradient-to-r from-red-400 via-rose-300 to-red-400 bg-clip-text text-transparent">
                organizar suas finanças
              </span>
            </h2>
            <p className="mt-4 text-white/40">Sem complicação, sem planilha. Só o que importa.</p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">

            {/* Card 1 — Receitas e despesas (large) */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-7">
              <GlassCard />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-red-500/15 p-2.5 text-red-400">
                  <TrendingUp className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Receitas e despesas</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Registre tudo em poucos cliques. Edite direto na tabela, sem formulários intermináveis.
                </p>
                {/* Mini bar chart */}
                <div className="mt-6 flex items-end gap-1.5 h-16">
                  {[55, 72, 48, 85, 63, 90, 70, 78, 95, 60, 82, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background: i % 2 === 0
                          ? "rgba(248,113,113,0.7)"
                          : "rgba(255,255,255,0.12)",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="size-2 rounded-full bg-red-400/70" />Receitas
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/40">
                    <span className="size-2 rounded-full bg-white/20" />Despesas
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 — Análise com IA (featured) */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-5">
              <GlassCard accent />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-red-500/20 p-2.5 text-red-300">
                  <Brain className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Análise com IA</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Insights personalizados do seu mês: pontos de atenção, gastos elevados e dicas práticas.
                </p>
                {/* AI message bubble */}
                <div className="mt-5 space-y-2">
                  <div className="rounded-xl rounded-tl-sm bg-white/8 px-3.5 py-2.5 text-xs text-white/70 leading-relaxed border border-white/10">
                    💰 <strong className="text-white">Saldo +R$ 1.360</strong> — bom controle no mês.
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-white/8 px-3.5 py-2.5 text-xs text-white/70 leading-relaxed border border-white/10">
                    ⚠️ Eletrônicos = 19% das despesas. Atenção às parcelas.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3 — Compras parceladas */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-4">
              <GlassCard />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-red-500/15 p-2.5 text-red-400">
                  <CreditCard className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Compras parceladas</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Crie parcelas com um comando. Altere tag e credor de todas de uma vez.
                </p>
                {/* Parcelas visualization */}
                <div className="mt-5 space-y-1.5">
                  {[
                    { label: "iPhone 15", n: "3/12", pct: 25 },
                    { label: "Notebook", n: "7/12", pct: 58 },
                    { label: "TV Samsung", n: "11/12", pct: 92 },
                  ].map((p) => (
                    <div key={p.label} className="flex items-center gap-2">
                      <span className="w-20 truncate text-xs text-white/40">{p.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-red-400/60" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs text-white/30">{p.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4 — Controle de credores */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-4">
              <GlassCard />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-red-500/15 p-2.5 text-red-400">
                  <PiggyBank className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Controle de credores</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Saiba quanto deve, para quem e quando. Filtre por mês.
                </p>
                {/* Credores list */}
                <div className="mt-5 space-y-2">
                  {[
                    { name: "Nubank", valor: "R$ 320", pago: false },
                    { name: "Itaú", valor: "R$ 450", pago: true },
                  ].map((c) => (
                    <div key={c.name} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-3 py-2">
                      <span className="text-xs font-medium text-white/70">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{c.valor}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.pago ? "bg-white/10 text-white/50" : "bg-red-500/20 text-red-300"}`}>
                          {c.pago ? "Quitado" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 5 — Gráficos por mês */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-4">
              <GlassCard />
              <div className="relative z-10">
                <div className="mb-4 inline-flex rounded-xl bg-red-500/15 p-2.5 text-red-400">
                  <BarChart3 className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Gráficos por mês</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  Evolução mensal das receitas e despesas por categoria.
                </p>
                {/* Donut rings simulation */}
                <div className="mt-5 flex items-center gap-4">
                  <div className="relative size-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(248,113,113,0.7)" strokeWidth="4" strokeDasharray="62 26" strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">70%</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-white/50">
                    <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-red-400/70" />Moradia — 35%</div>
                    <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-white/20" />Alimentação — 22%</div>
                    <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-white/10" />Outros — 13%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6 — Seus dados (full width) */}
            <div className="group relative overflow-hidden rounded-2xl p-6 lg:col-span-12">
              <GlassCard />
              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl bg-red-500/15 p-2.5 text-red-400">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Seus dados, seu controle</h3>
                    <p className="mt-1 text-sm text-white/50">
                      Acesso protegido por autenticação. Cada usuário só vê e edita os próprios dados — nenhum dado compartilhado.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {["Criptografado", "Privado", "Seguro"].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 backdrop-blur-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comece a organizar suas finanças agora
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            É gratuito. Crie sua conta em segundos e tenha uma visão clara do seu dinheiro.
          </p>
          <div className="mt-10">
            <Link href="/register">
              <Button size="lg" className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                Criar minha conta grátis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-red-500" />
            <span>Pit Finance</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Pit Finance</span>
        </div>
      </footer>
    </div>
  )
}

function GlassCard({ accent = false }: { accent?: boolean }) {
  return (
    <div
      className={[
        "absolute inset-0 rounded-2xl border transition-all duration-300",
        accent
          ? "border-red-500/20 bg-gradient-to-br from-red-500/10 via-white/4 to-white/2 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2),0_8px_40px_rgba(220,38,38,0.15)]"
          : "border-white/8 bg-white/4 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.15),0_8px_32px_rgba(0,0,0,0.3)] group-hover:border-white/15 group-hover:bg-white/6",
      ].join(" ")}
    />
  )
}
