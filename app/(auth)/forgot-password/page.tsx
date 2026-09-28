"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Mail, Wallet } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar instruções."
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

        {/* Conteúdo — centralizado verticalmente */}
        <div className="flex flex-1 flex-col justify-center px-8 pb-8 lg:px-14">
          <div className="w-full max-w-sm">
            {submitted ? (
              /* Estado de sucesso */
              <div className="text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                  <Mail className="size-6 text-red-500" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  Verifique seu e-mail
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  Se o endereço <span className="text-zinc-700">{email}</span> estiver cadastrado,
                  você receberá as instruções em breve.
                </p>
                <p className="mt-2 text-xs text-zinc-400">Verifique também a pasta de spam.</p>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para o login
                </Link>
              </div>
            ) : (
              /* Estado do formulário */
              <>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  Recuperar senha
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white
                      hover:bg-red-500 active:bg-red-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors duration-150"
                  >
                    {isLoading ? <Spinner className="size-4" /> : null}
                    {isLoading ? "Enviando..." : "Enviar instruções"}
                  </button>
                </form>

                <div className="mt-6">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    Voltar para o login
                  </Link>
                </div>
              </>
            )}
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
            Recupere o acesso e volte a controlar seus gastos com tranquilidade.
          </p>
        </div>
      </div>
    </div>
  )
}
