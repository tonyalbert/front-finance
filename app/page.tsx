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
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

const features = [
  {
    icon: TrendingUp,
    title: "Receitas e despesas",
    description:
      "Registre tudo em poucos cliques. Edite direto na tabela, sem formulários intermináveis.",
  },
  {
    icon: Brain,
    title: "Análise com IA",
    description:
      "Insights personalizados do seu mês: pontos de atenção, gastos elevados e dicas práticas.",
  },
  {
    icon: CreditCard,
    title: "Compras parceladas",
    description: "Crie parcelas com um comando. Altere tag e credor de todas de uma vez.",
  },
  {
    icon: PiggyBank,
    title: "Controle de credores",
    description: "Saiba quanto deve, para quem e quando. Filtre por mês.",
  },
  {
    icon: BarChart3,
    title: "Gráficos por mês",
    description: "Evolução mensal das receitas e despesas por categoria.",
  },
  {
    icon: Shield,
    title: "Seus dados, seu controle",
    description:
      "Acesso protegido por autenticação. Cada usuário só vê e edita os próprios dados.",
  },
]

export default function Home() {
  const router = useRouter()
  const { token, isReady } = useAuth()

  useEffect(() => {
    if (isReady && token) router.replace("/dashboard")
  }, [isReady, token, router])

  if (!isReady || token) return null

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Wallet className="size-6 text-red-500" />
            <span className="text-lg font-bold tracking-tight text-zinc-900">Pit Finance</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-50/70 to-white">
        {/* Decorative glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-red-200/40 blur-3xl" />
          <div className="absolute top-10 right-[10%] h-[260px] w-[260px] rounded-full bg-rose-200/50 blur-3xl" />
          <div className="absolute top-24 left-[8%] h-[220px] w-[220px] rounded-full bg-orange-100/50 blur-3xl" />
        </div>
        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 0%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 0%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-700 mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-medium text-red-600 shadow-sm">
            <Sparkles className="size-3.5" />
            Novo: análise financeira com IA
          </div>

          <h1 className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            Seu dinheiro,{" "}
            <span className="bg-gradient-to-r from-red-600 via-rose-500 to-red-600 bg-clip-text text-transparent">
              sob controle
            </span>
          </h1>

          <p className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500">
            Organize receitas, despesas, parcelas e credores em um só lugar.
            Saiba exatamente para onde vai seu dinheiro — mês a mês.
          </p>

          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="gap-2 bg-red-600 text-white shadow-lg shadow-red-500/25 hover:bg-red-500 hover:shadow-red-500/30 transition-all"
              >
                Começar grátis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Já tenho conta
              </Button>
            </Link>
          </div>

          {/* Social proof */}
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-400 fill-mode-both mt-14 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
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
                  className="rounded-full border-2 border-white object-cover"
                />
              ))}
            </div>
            <p className="text-sm text-zinc-500">
              Mais de <span className="font-semibold text-zinc-900">2.000 usuários</span> já
              organizam suas finanças
            </p>
          </div>

          {/* Stats */}
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { value: "100%", label: "Gratuito" },
              { value: "< 2 min", label: "Para começar" },
              { value: "IA", label: "Análise mensal" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-5 py-2.5 transition-shadow hover:shadow-sm"
              >
                <span className="text-lg font-bold text-zinc-900">{stat.value}</span>
                <span className="text-xs text-zinc-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview do sistema */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500">
              <span className="size-1.5 rounded-full bg-red-500" />
              Preview
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Veja como <span className="text-red-600">funciona</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-zinc-500">
              Uma visão geral do seu painel financeiro.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 shadow-xl">
            <Image
              src="/dashboard-preview.png"
              alt="Dashboard do Pit Finance com dados de exemplo"
              width={1600}
              height={1000}
              className="w-full object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-medium text-zinc-500">
              <span className="size-1.5 rounded-full bg-red-500" />
              Funcionalidades
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Tudo que você precisa para organizar suas finanças
            </h2>
            <p className="mt-4 text-zinc-500">Sem complicação, sem planilha. Só o que importa.</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-red-50 p-2.5 text-red-600">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Comece a organizar suas finanças agora
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">
            É gratuito. Crie sua conta em segundos e tenha uma visão clara do seu dinheiro.
          </p>
          <div className="mt-10">
            <Link href="/register">
              <Button size="lg" className="gap-2 bg-red-600 text-white hover:bg-red-500">
                Criar minha conta grátis
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-zinc-500">
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
