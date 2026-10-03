"use client"

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react"

import { apiFetch } from "@/lib/api"
import { AuthHeading, AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const schema = z.object({
  email: z.string().trim().min(1, "Informe seu e-mail").email("Informe um e-mail válido"),
})
type ForgotValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const form = useForm<ForgotValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } })
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: ForgotValues) {
    try {
      await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: values.email }) })
      setSentTo(values.email)
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Erro ao enviar instruções." })
    }
  }

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ml-2.5 self-start">
      <Link href="/login">
        <ArrowLeft /> Voltar para o login
      </Link>
    </Button>
  )

  if (sentTo) {
    return (
      <AuthShell>
        {back}
        <div role="status" className="flex flex-col items-start gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-income-soft text-income" aria-hidden>
            <MailCheck className="size-6" />
          </span>
          <AuthHeading
            title="Verifique seu e-mail"
            description={`Se o endereço ${sentTo} estiver cadastrado, você receberá as instruções em breve. Confira também a pasta de spam.`}
          />
        </div>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => {
            setSentTo(null)
            form.reset({ email: sentTo })
          }}
        >
          Usar outro e-mail
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {back}
      <AuthHeading title="Esqueceu a senha?" description="Informe o e-mail da conta. Enviaremos um link para criar uma nova senha." />

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

          <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? "Enviando…" : "Enviar instruções"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}
