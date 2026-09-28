"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react"

import { apiFetch, ApiError } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"

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
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Link inválido</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          {tokenError ?? "Nenhum token de recuperação encontrado neste link."}
        </p>
        <p className="mt-1 text-sm text-zinc-400">Solicite um novo link de recuperação.</p>
        <Link
          href="/forgot-password"
          className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white
            hover:bg-red-500 transition-colors duration-150"
        >
          Solicitar novo link
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/login"
          className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Redefinir senha</h1>
      <p className="mt-2 text-sm text-zinc-500">Crie uma nova senha para sua conta.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
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
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900
              placeholder:text-zinc-400 outline-none
              focus:border-red-500 focus:ring-2 focus:ring-red-500/10
              transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">
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
          {isLoading ? "Redefinindo..." : "Redefinir senha"}
          {!isLoading && <ArrowRight className="size-4" />}
        </button>
      </form>

      <div className="mt-6">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
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
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-8">
                  <Spinner className="size-6" />
                </div>
              }
            >
              <ResetPasswordForm />
            </Suspense>
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
            Segurança em primeiro lugar
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900">
            Suas finanças,
            <br />
            sob controle
          </h2>
          <p className="mt-5 text-base leading-relaxed text-zinc-500">
            Crie uma nova senha e volte a controlar seus gastos com tranquilidade.
          </p>
        </div>
      </div>
    </div>
  )
}
