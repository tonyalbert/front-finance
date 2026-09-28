"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Wallet } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { Spinner } from "@/components/ui/spinner"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await login(email, password)
      toast.success("Login realizado com sucesso.")
      router.push("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao fazer login."
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Esquerda: painel do formulário ── */}
      <div className="relative flex w-full flex-col lg:w-[460px] xl:w-[520px] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 p-8">
          <Wallet className="size-5 text-red-500" />
          <span className="text-base font-bold tracking-tight text-zinc-900">Pit Finance</span>
        </div>

        {/* Formulário — centralizado verticalmente */}
        <div className="flex flex-1 flex-col justify-center px-8 pb-8 lg:px-14">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Entre com suas credenciais para acessar o dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900
                    placeholder:text-zinc-400 outline-none
                    focus:border-red-500 focus:ring-2 focus:ring-red-500/10
                    transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                    Senha
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-zinc-500 hover:text-red-600 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900
                    placeholder:text-zinc-400 outline-none
                    focus:border-red-500 focus:ring-2 focus:ring-red-500/10
                    transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white
                  hover:bg-red-500 active:bg-red-700
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-150"
              >
                {isLoading ? <Spinner className="size-4" /> : null}
                {isLoading ? "Entrando..." : "Entrar"}
                {!isLoading && <ArrowRight className="size-4" />}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-400">ou</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Ainda não tem conta?{" "}
              <Link
                href="/register"
                className="font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                Crie uma agora
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <p className="p-8 text-xs text-zinc-400">&copy; {new Date().getFullYear()} Pit Finance</p>
      </div>

      {/* ── Direita: painel de marca ── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden border-l border-zinc-200 bg-gradient-to-br from-red-50 via-rose-50 to-white p-16 lg:flex">
        <div className="max-w-md text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs text-zinc-500">
            <div className="size-1.5 rounded-full bg-red-500" />
            Controle financeiro inteligente
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900">
            Suas finanças,
            <br />
            sob controle
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-500">
            Acompanhe despesas, receitas e credores em um único lugar. Simples, rápido e seguro.
          </p>
        </div>
      </div>
    </div>
  )
}
