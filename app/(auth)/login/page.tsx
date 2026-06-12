"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Wallet } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { Spinner } from "@/components/ui/spinner"
import { AuthBackground } from "@/components/ui/background-paper-shaders"

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
    <AuthBackground>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">

        {/* Logo */}
        <Link href="/" className="mb-10 flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <Wallet className="size-6 text-red-400" />
          <span className="text-lg font-bold tracking-tight">Pit Finance</span>
        </Link>

        {/* Glass card */}
        <div className="relative w-full max-w-sm">
          {/* Glass layer */}
          <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl
            shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2),0_24px_64px_rgba(0,0,0,0.5)]" />

          <div className="relative z-10 p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Bem-vindo de volta
              </h1>
              <p className="mt-2 text-sm text-white/45">
                Entre com suas credenciais para acessar o dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-white/70">
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
                  className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-white
                    placeholder:text-white/25 backdrop-blur-sm outline-none
                    focus:border-white/25 focus:bg-white/10 focus:ring-2 focus:ring-white/8
                    transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-white/70">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-white
                    placeholder:text-white/25 backdrop-blur-sm outline-none
                    focus:border-white/25 focus:bg-white/10 focus:ring-2 focus:ring-white/8
                    transition-all duration-200"
                />
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-white/40 hover:text-red-400 transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>

              {/* CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white
                  shadow-lg shadow-red-500/25 hover:bg-red-400 hover:shadow-red-400/30
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                {isLoading ? <Spinner className="size-4" /> : null}
                Entrar
                {!isLoading && <ArrowRight className="size-4" />}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-xs text-white/25">ou</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <p className="text-center text-sm text-white/40">
              Ainda não tem conta?{" "}
              <Link
                href="/register"
                className="font-medium text-red-400 hover:text-red-300 underline-offset-4 hover:underline transition-colors"
              >
                Crie uma agora
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/20">&copy; {new Date().getFullYear()} Pit Finance</p>
      </div>
    </AuthBackground>
  )
}
