"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { AlertCircle, ArrowLeft, Check, Circle, Loader2, LinkIcon } from "lucide-react"

import { apiFetch, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell"
import { PasswordField, PasswordMeter } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Spinner } from "@/components/ui/spinner"

const schema = z
  .object({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Repita a nova senha"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" })
type ResetValues = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [tokenError, setTokenError] = React.useState<string | null>(null)

  const form = useForm<ResetValues>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } })
  const { isSubmitting, errors } = form.formState
  const password = useWatch({ control: form.control, name: "password" })
  const confirm = useWatch({ control: form.control, name: "confirmPassword" })

  async function onSubmit(values: ResetValues) {
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password: values.password }) })
      toast.success("Senha redefinida com sucesso.")
      router.push("/login")
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
        setTokenError(error.status === 400 ? "Este link de recuperação expirou." : "Link de recuperação inválido ou já utilizado.")
      } else {
        form.setError("root", { message: error instanceof Error ? error.message : "Erro ao redefinir senha." })
      }
    }
  }

  if (!token || tokenError) {
    return (
      <>
        <div role="alert" className="flex flex-col items-start gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-expense-soft text-expense" aria-hidden>
            <LinkIcon className="size-6" />
          </span>
          <AuthHeading
            title="Link inválido"
            description={`${tokenError ?? "Nenhum token de recuperação encontrado neste link."} Solicite um novo link de recuperação.`}
          />
        </div>
        <Button asChild size="lg" className="h-11 w-full">
          <Link href="/forgot-password">Solicitar novo link</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">
            <ArrowLeft /> Voltar para o login
          </Link>
        </Button>
      </>
    )
  }

  const rules = [
    { ok: password.length >= 6, text: "Pelo menos 6 caracteres" },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), text: "Letras e números (recomendado)" },
    { ok: password.length > 0 && password === confirm, text: "As duas senhas são iguais" },
  ]

  return (
    <>
      <AuthHeading title="Criar nova senha" description="Escolha uma senha que você não usa em outros serviços." />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-[18px]" noValidate>
          {errors.root && (
            <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-expense/40 bg-expense-soft px-3 py-2.5 text-[13px]">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-expense" aria-hidden />
              <span>{errors.root.message}</span>
            </div>
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" placeholder="Mínimo de 6 caracteres" {...field} />
                </FormControl>
                <PasswordMeter password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <ul className="flex flex-col gap-1 text-[13px]" aria-label="Requisitos da senha">
            {rules.map((r) => (
              <li key={r.text} className={cn("flex items-center gap-1.5", r.ok ? "text-income" : "text-muted-foreground")}>
                {r.ok ? <Check className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                {r.text}
                <span className="sr-only">{r.ok ? " (atendido)" : " (pendente)"}</span>
              </li>
            ))}
          </ul>

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" placeholder="Repita a nova senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </Form>

      <Button asChild variant="ghost" size="sm">
        <Link href="/login">
          <ArrowLeft /> Voltar para o login
        </Link>
      </Button>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        }
      >
        <ResetPasswordForm />
      </React.Suspense>
    </AuthShell>
  )
}
