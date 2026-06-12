"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Mail, Wallet } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"
import { AuthBackground } from "@/components/ui/background-paper-shaders"

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
            {submitted ? (
              /* Success state */
              <div className="text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/6">
                  <Mail className="size-6 text-red-400" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Verifique seu e-mail
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Se o endereço <span className="text-white/70">{email}</span> estiver cadastrado,
                  você receberá as instruções em breve.
                </p>
                <p className="mt-2 text-xs text-white/30">
                  Verifique também a pasta de spam.
                </p>
                <Link
                  href="/login"
                  className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Voltar para o login
                </Link>
              </div>
            ) : (
              /* Form state */
              <>
                <div className="mb-8 text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Recuperar senha
                  </h1>
                  <p className="mt-2 text-sm text-white/45">
                    Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
                  </p>
                </div>

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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white
                      shadow-lg shadow-red-500/25 hover:bg-red-400 hover:shadow-red-400/30
                      disabled:opacity-60 disabled:cursor-not-allowed
                      transition-all duration-200"
                  >
                    {isLoading ? <Spinner className="size-4" /> : null}
                    {isLoading ? "Enviando..." : "Enviar instruções"}
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
            )}
          </div>
        </div>

        <p className="mt-10 text-xs text-white/20">&copy; {new Date().getFullYear()} Pit Finance</p>
      </div>
    </AuthBackground>
  )
}
