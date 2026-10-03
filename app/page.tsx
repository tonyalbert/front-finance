import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import { RedirectIfAuthenticated } from "@/components/landing/landing-client"

const title = "Pit Finance: saiba para onde vai cada real do seu mês"
const description =
  "Receitas, despesas, parcelas e contas fixas em uma tela só, com os vencimentos à vista antes de virarem atraso. Teste 7 dias grátis, sem cartão de crédito."

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    locale: "pt_BR",
    siteName: "Pit Finance",
  },
  twitter: { card: "summary", title, description },
}

export default function Home() {
  return (
    <>
      <RedirectIfAuthenticated />
      <LandingPage />
    </>
  )
}
