import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Moon,
  RefreshCw,
  Smartphone,
  Tag,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PitLogo } from "@/components/brand/pit-logo"
import { RabbitMark } from "@/components/brand/rabbit-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { DashboardPreview } from "./dashboard-preview"
import { MonthSimulation } from "./month-simulation"
import { OppositeThemeBand } from "./landing-client"

const wrap = "mx-auto w-full max-w-[1200px] px-4 min-[760px]:px-6"
const sec = "scroll-mt-16 py-[72px] min-[760px]:py-28"
const secTight = "scroll-mt-16 pb-[72px] pt-6 min-[760px]:pb-28"
const kicker = "text-[13px] font-semibold uppercase tracking-[0.08em] text-primary"
const h2 = "mt-3 text-balance text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.035em]"
const lead = "mt-4 max-w-[600px] text-pretty text-[17px] leading-relaxed text-muted-foreground"
const ctaBtn = "h-12 px-[22px] text-[15px] max-[760px]:w-full"

const STEPS = [
  { n: "01", title: "Crie sua conta", text: "Só e-mail e senha. Sem cartão de crédito para começar os 7 dias grátis." },
  { n: "02", title: "Cadastre o que é fixo", text: "Aluguel, contas e assinaturas uma única vez. O Pit Finance gera todo mês." },
  { n: "03", title: "Lance o dia a dia", text: "Despesas avulsas e parcelas em segundos. O painel mostra saldo, o que falta pagar e o que vence." },
]

const MINIS = [
  { icon: Landmark, title: "Credores", text: "Quanto você deve a cada banco ou pessoa, o que já pagou e o que falta." },
  { icon: Tag, title: "Tags com cor", text: "Moradia, Mercado, Lazer: suas categorias, do seu jeito, nos gráficos." },
  { icon: Smartphone, title: "No celular e no computador", text: "Lance a despesa na fila do mercado e confira o mês no notebook." },
  { icon: Moon, title: "Tema claro e escuro", text: "Confortável de dia e de noite, ou seguindo o tema do seu aparelho." },
]

const INCLUDED = [
  "Dashboard do mês e do ano",
  "Receitas, despesas e despesas fixas automáticas",
  "Parcelas acompanhadas até a última",
  "Credores e tags com cor",
  "Suporte por chamado",
]

const FAQ = [
  { q: "Preciso cadastrar cartão para testar?", a: "Não. Os 7 dias grátis começam só com e-mail e senha." },
  {
    q: "O que acontece depois dos 7 dias?",
    a: "Para continuar usando, você assina por R$ 19,99 por mês. Nada é cobrado automaticamente, porque nenhum cartão foi cadastrado no teste.",
  },
  {
    q: "O Pit Finance se conecta ao meu banco?",
    a: "Não. Você lança receitas e despesas no app, e as despesas fixas e parcelas são geradas automaticamente a cada mês.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. É só abrir no navegador do celular; a tela se adapta, com navegação embaixo e botão rápido para nova despesa.",
  },
]

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 place-items-center rounded-[10px] bg-primary-soft text-primary" aria-hidden>
      {children}
    </span>
  )
}

const visual = "mt-auto rounded-[10px] border bg-background"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" id="topo">
      {/* 1. Barra fixa */}
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className={`${wrap} flex h-[60px] items-center gap-3 min-[760px]:h-16 min-[760px]:gap-7`}>
          <Link href="#topo" aria-label="Pit Finance: topo da página">
            <PitLogo className="text-base" />
          </Link>
          <nav aria-label="Seções" className="hidden gap-6 text-sm text-muted-foreground min-[900px]:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#preco" className="hover:text-foreground">Preço</a>
            <a href="#perguntas" className="hover:text-foreground">Perguntas</a>
          </nav>
          <span className="flex-1" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">
              <span>Criar conta<span className="max-[760px]:hidden"> grátis</span></span>
            </Link>
          </Button>
        </div>
      </header>

      <main>
        {/* 2. Hero: faixa sempre escura, com o mês simulado */}
        <section aria-labelledby="hero-title" className="dark border-b bg-background pb-12 pt-12 text-foreground min-[760px]:pb-[72px] min-[760px]:pt-[88px]">
          <div className={wrap}>
            <div className="grid items-end gap-7 min-[900px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] min-[900px]:gap-14">
              <h1
                id="hero-title"
                className="text-[clamp(46px,7.4vw,100px)] font-semibold leading-[0.96] tracking-[-0.05em]"
              >
                Seu mês inteiro,
                <br />
                <em className="not-italic text-primary">um pulo à frente.</em>
              </h1>
              <div>
                <p className="max-w-[460px] text-pretty text-[clamp(16px,1.8vw,19px)] leading-relaxed text-muted-foreground">
                  Veja hoje como vai estar seu saldo no dia 31. O Pit Finance desenha o mês com suas receitas, contas fixas e parcelas, e mostra cada vencimento antes de ele chegar.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" className={ctaBtn} asChild>
                    <Link href="/register">
                      Criar conta grátis <ArrowRight />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className={ctaBtn} asChild>
                    <a href="#como-funciona">Ver como funciona</a>
                  </Button>
                </div>
                <p className="mt-3.5 text-[13px] text-muted-foreground">Depois do teste, R$ 19,99 por mês.</p>
              </div>
            </div>

            <MonthSimulation />
            <p className="mt-3 text-xs text-muted-foreground">Exemplo com lançamentos fictícios de um mês.</p>
          </div>
        </section>

        {/* Por dentro: prévia do painel */}
        <section className="pt-[72px] min-[760px]:pt-28">
          <div className={wrap}>
            <div className="mx-auto max-w-[680px] text-center">
              <span className={kicker}>Por dentro</span>
              <h2 className={h2}>Tudo do mês em uma tela.</h2>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* 3. Recursos */}
        <section id="recursos" className={`${sec} border-t`}>
          <div className={wrap}>
            <div className="max-w-[680px]">
              <span className={kicker}>Recursos</span>
              <h2 className={h2}>Menos planilha, mais clareza sobre o mês.</h2>
              <p className={lead}>O que se repete o Pit Finance lança sozinho. Com o resto, ele te ajuda a não esquecer.</p>
            </div>

            <div className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-5">
              <Card className="gap-[22px] p-5 min-[760px]:p-7">
                <FeatureIcon>
                  <RefreshCw className="size-5" />
                </FeatureIcon>
                <div>
                  <h3 className="text-[21px] font-semibold tracking-tight">Contas fixas no automático</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    Cadastre aluguel, internet e assinaturas uma vez. Todo mês elas aparecem na data certa, prontas para marcar como pagas.
                  </p>
                </div>
                <ul className={`${visual} divide-y px-4 py-1.5`} aria-hidden>
                  {[
                    { c: "var(--chart-1)", name: "Aluguel", when: "Todo dia 5", v: "R$ 1.950,00" },
                    { c: "var(--chart-3)", name: "Plano de saúde", when: "Todo dia 20", v: "R$ 412,00" },
                    { c: "var(--chart-7)", name: "Internet", when: "Todo dia 1", v: "R$ 119,90" },
                  ].map((r) => (
                    <li key={r.name} className="flex min-h-14 items-center gap-3 py-2.5">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.c }} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <strong className="block text-sm font-medium">{r.name}</strong>
                        <span className="text-xs text-muted-foreground">{r.when}</span>
                      </div>
                      <span className="num text-sm">{r.v}</span>
                      <Switch checked tabIndex={-1} className="pointer-events-none" aria-hidden />
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="gap-[22px] p-5 min-[760px]:p-7">
                <FeatureIcon>
                  <CreditCard className="size-5" />
                </FeatureIcon>
                <div>
                  <h3 className="text-[21px] font-semibold tracking-tight">Parcelas até a última</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    Compra em 10x? Você vê em qual parcela está, quanto falta e quando termina, sem fazer conta de cabeça.
                  </p>
                </div>
                <div className={`${visual} flex flex-col gap-4 p-4`} aria-hidden>
                  {[
                    { name: "Notebook", parcel: "5/10", left: "faltam R$ 1.449,50", pct: 50 },
                    { name: "Empréstimo", parcel: "3/12", left: "faltam R$ 3.555,00", pct: 25 },
                  ].map((p) => (
                    <div key={p.name} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="flex items-center gap-1.5 font-medium">
                          {p.name}
                          <span className="num rounded-md bg-info-soft px-1.5 py-px text-[11px] font-semibold text-info">{p.parcel}</span>
                        </strong>
                        <span className="num text-[13px] text-muted-foreground">{p.left}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-info" style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="gap-[22px] p-5 min-[760px]:p-7">
                <FeatureIcon>
                  <Clock className="size-5" />
                </FeatureIcon>
                <div>
                  <h3 className="text-[21px] font-semibold tracking-tight">Vencimentos à vista</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    Pendente, vence em breve ou atrasada: cada conta mostra o status com cor e texto, e você marca como paga com um toque.
                  </p>
                </div>
                <div className={`${visual} flex flex-wrap gap-2 p-4`} aria-hidden>
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-income-soft px-2.5 text-[12.5px] font-medium text-income">
                    <CheckCircle2 className="size-3.5" /> Pago
                  </span>
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-warning-soft px-2.5 text-[12.5px] font-medium text-warning">
                    <Clock className="size-3.5" /> Vence em 5 dias
                  </span>
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-expense-soft px-2.5 text-[12.5px] font-medium text-expense">
                    <AlertCircle className="size-3.5" /> Atrasada há 2 dias
                  </span>
                </div>
              </Card>
            </div>

            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
              {MINIS.map((m) => (
                <Card key={m.title} className="gap-2.5 p-[22px]">
                  <m.icon className="size-5 text-muted-foreground" aria-hidden />
                  <h4 className="text-base font-semibold">{m.title}</h4>
                  <p className="text-sm leading-normal text-muted-foreground">{m.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Como funciona */}
        <section id="como-funciona" className={secTight}>
          <div className={wrap}>
            <div className="max-w-[680px]">
              <span className={kicker}>Como funciona</span>
              <h2 className={h2}>Organizado em uma tarde. Em dia o mês inteiro.</h2>
            </div>
            <ol className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] border-t">
              {STEPS.map((s) => (
                <li key={s.n} className="flex flex-col gap-2.5 pr-0 pt-7 min-[760px]:pr-7">
                  <span className="font-mono text-[13px] font-medium text-primary">{s.n}</span>
                  <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Preço */}
        <section id="preco" className={sec}>
          <div className={`${wrap} grid items-center gap-8 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,460px)] min-[900px]:gap-14`}>
            <div>
              <span className={kicker}>Preço</span>
              <h2 className={h2}>Um plano, tudo incluído.</h2>
              <p className={lead}>
                Teste tudo por 7 dias, sem cadastrar cartão. Se fizer sentido para você, continue por menos de um real por dia.
              </p>
              <ol className="mt-7 flex flex-col">
                {[
                  { icon: Check, title: "Hoje", text: "Você cria a conta e usa tudo, sem cartão." },
                  { icon: Clock, title: "Dia 7", text: "Fim do teste. Para continuar, é só assinar." },
                  { icon: CalendarClock, title: "Depois", text: "R$ 19,99 por mês." },
                ].map((t, i, arr) => (
                  <li key={t.title} className="relative grid grid-cols-[28px_1fr] gap-3.5 pb-[22px]">
                    {i < arr.length - 1 && <span className="absolute bottom-0 left-[13px] top-7 w-0.5 bg-border" aria-hidden />}
                    <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary" aria-hidden>
                      <t.icon className="size-3.5" />
                    </span>
                    <div>
                      <strong className="block font-semibold">{t.title}</strong>
                      <span className="text-sm text-muted-foreground">{t.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <Card className="gap-[22px] border-primary p-6 shadow-lg min-[760px]:p-8">
              <div className="flex items-center justify-between">
                <strong className="text-[17px]">Pit Finance</strong>
                <Badge variant="income">7 dias grátis</Badge>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <strong className="num text-[46px] font-semibold leading-none tracking-[-0.04em] min-[760px]:text-[56px]">R$ 19,99</strong>
                  <span className="text-base text-muted-foreground">/mês</span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">Sem cartão no teste.</p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Button size="lg" className="h-11 w-full" asChild>
                <Link href="/register">Começar 7 dias grátis</Link>
              </Button>
            </Card>
          </div>
        </section>

        {/* 6. Perguntas frequentes */}
        <section id="perguntas" className={secTight}>
          <div className={wrap}>
            <div className="mx-auto max-w-[680px] text-center">
              <span className={kicker}>Perguntas</span>
              <h2 className={h2}>Antes de começar</h2>
            </div>
            <Accordion type="single" collapsible defaultValue="q0" className="mx-auto mt-12 max-w-[760px] border-t">
              {FAQ.map((f, i) => (
                <AccordionItem key={f.q} value={`q${i}`}>
                  <AccordionTrigger className="min-h-11 py-5 text-[17px] font-medium hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="pr-10 text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* 7. Chamada final, em faixa no tema oposto ao da página */}
        <section className={secTight}>
          <div className={wrap}>
            <OppositeThemeBand className="rounded-2xl border px-5 py-12 text-center min-[760px]:rounded-[20px] min-[760px]:px-8 min-[760px]:py-[72px]">
              <h2 className="mx-auto max-w-[680px] text-balance text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08] tracking-[-0.035em]">
                Comece o mês com as contas no lugar.
              </h2>
              <p className="mx-auto mt-4 max-w-[600px] text-pretty text-[17px] leading-relaxed text-muted-foreground">
                7 dias grátis, sem cartão. Depois, R$ 19,99 por mês.
              </p>
              <div className="mt-[34px] flex justify-center">
                <Button size="lg" className={ctaBtn} asChild>
                  <Link href="/register">
                    Criar conta grátis <ArrowRight />
                  </Link>
                </Button>
              </div>
            </OppositeThemeBand>
          </div>
        </section>
      </main>

      {/* 8. Rodapé (Privacidade, Termos e Suporte ainda sem página) */}
      <footer className="border-t pb-10 pt-7">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-4 text-[13px] text-muted-foreground`}>
          <span className="flex items-center gap-2.5">
            <RabbitMark size={22} decorative className="text-foreground" />
            © 2026 Rabbit · Pit Finance é um serviço Rabbit
          </span>
          <nav aria-label="Rodapé" className="flex gap-5">
            <a href="#privacidade" className="hover:text-foreground">Privacidade</a>
            <a href="#termos" className="hover:text-foreground">Termos de uso</a>
            <a href="#suporte" className="hover:text-foreground">Suporte</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
