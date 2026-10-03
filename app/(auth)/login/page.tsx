"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { AlertCircle, Loader2, Mail } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail").email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
})
type LoginValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const form = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password)
      toast.success("Login realizado com sucesso.")
      router.push("/dashboard")
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Erro ao fazer login." })
    }
  }

  return (
    <AuthShell>
      <AuthHeading title="Entrar" description="Acesse sua conta para acompanhar o seu mês." />

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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input type="email" autoComplete="email" placeholder="voce@email.com" className="h-11 pl-9" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Senha</FormLabel>
                  <Link href="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
                    Esqueci a senha
                  </Link>
                </div>
                <FormControl>
                  <PasswordField autoComplete="current-password" placeholder="Sua senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        ou
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
