"use client"

import * as React from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/** Campo de senha com ícone e botão de mostrar/ocultar. */
export const PasswordField = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  function PasswordField({ className, ...props }, ref) {
    const [visible, setVisible] = React.useState(false)
    return (
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("h-11 pl-9 pr-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  },
)

/** Pontuação 0-4 só para orientar o usuário; a regra de aceite continua sendo a do servidor. */
export function passwordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "—" }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  if (password.length < 6) score = Math.min(score, 1)
  return { score, label: ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][score] }
}

export function PasswordMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn("h-1 rounded-full bg-muted", i <= score && "bg-primary")} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">Força da senha: {label}</span>
    </div>
  )
}
