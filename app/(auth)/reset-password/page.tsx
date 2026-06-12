"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react"

import { apiFetch, ApiError } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { AuthBackground } from "@/components/ui/background-paper-shaders"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.")
      return
    }

    setIsLoading(true)
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      toast.success("Senha redefinida com sucesso.")
      router.push("/login")
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
        setTokenError(
          error.status === 400
            ? "Este link de recuperação expirou."
            : "Link de recuperação inválido ou já utilizado."
        )
      } else {
        const message = error instanceof Error ? error.message : "Erro ao redefinir senha."
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!token || tokenError) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Link inválido
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          {tokenError ?? "Nenhum token de recuperação encontrado neste link."}
        </p>
        <p className="mt-1 text-sm text-white/40">
          Solicite um novo link de recuperação.
        </p>
        <Link
          href="/forgot-password"
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white
            shadow-lg shadow-red-500/25 hover:bg-red-400 hover:shadow-red-400/30 transition-all duration-200"
        >
          Solicitar novo link
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/login"
          className="mt-4 flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Redefinir senha
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Crie uma nova senha para sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-white/70">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-white
              placeholder:text-white/25 backdrop-blur-sm outline-none
              focus:border-white/25 focus:bg-white/10 focus:ring-2 focus:ring-white/8
              transition-all duration-200"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70">
            Confirmar nova senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm text-white
              placeholder:text-white/25 backdrop-blur-sm outline-none
              focus:border-white/25 focus:bg-white/10 focus:ring-2 focus:ring-white/8
              transition-all duration-200"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white
            shadow-lg shadow-red-500/25 hover:bg-red-400 hover:shadow-red-400/30
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-all duration-200"
        >
          {isLoading ? <Spinner className="size-4" /> : null}
          {isLoading ? "Redefinindo..." : "Redefinir senha"}
          {!isLoading && <ArrowRight className="size-4" />}
        </button>
      </form>

      <div className="mt-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
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
          <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl
            shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.2),0_24px_64px_rgba(0,0,0,0.5)]" />

          <div className="relative z-10 p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Spinner className="size-6" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/20">&copy; {new Date().getFullYear()} Pit Finance</p>
      </div>
    </AuthBackground>
  )
}
