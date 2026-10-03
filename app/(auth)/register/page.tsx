"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { AlertCircle, Loader2, Mail } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell"
import { PasswordField, PasswordMeter } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z
  .object({
    email: z.string().trim().min(1, "Informe seu e-mail").email("Informe um e-mail válido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Repita a senha"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem" })
type RegisterValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })
  const { isSubmitting, errors } = form.formState
  const password = useWatch({ control: form.control, name: "password" })

  async function onSubmit(values: RegisterValues) {
    try {
      await register(values.email, values.password)
      toast.success("Conta criada com sucesso.")
      router.push("/dashboard")
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Erro ao criar conta." })
    }
  }

  return (
    <AuthShell>
      <AuthHeading title="Criar conta" description="Leva um minuto. Comece a organizar suas finanças agora mesmo." />

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
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" placeholder="Mínimo de 6 caracteres" {...field} />
                </FormControl>
                <PasswordMeter password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" placeholder="Repita a senha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>
      </Form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        ou
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
