"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { PAGE_SIZES, usePageSize } from "@/hooks/use-page-size"
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed"
import { PageShell } from "@/components/dashboard/page-shell"
import { userInitials } from "@/components/dashboard/nav-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

/** Miniatura do app nas cores do tema, só para o usuário reconhecer a opção. */
function ThemeMini({ mode }: { mode: "light" | "dark" }) {
  const light = mode === "light"
  const bg = light ? "oklch(0.985 0.003 165)" : "oklch(0.155 0.006 165)"
  const side = light ? "oklch(0.972 0.005 165)" : "oklch(0.17 0.006 165)"
  const card = light ? "oklch(1 0 0)" : "oklch(0.19 0.007 165)"
  const line = light ? "oklch(0.912 0.007 165)" : "oklch(0.285 0.009 165)"
  const primary = light ? "oklch(0.53 0.15 160)" : "oklch(0.72 0.15 160)"
  return (
    <div className="flex h-full w-full" style={{ background: bg }} aria-hidden>
      <div className="flex w-1/4 flex-col gap-1.5 p-2" style={{ background: side, borderRight: `1px solid ${line}` }}>
        <div className="h-1.5 rounded-full" style={{ background: primary }} />
        <div className="h-1.5 rounded-full" style={{ background: line }} />
        <div className="h-1.5 rounded-full" style={{ background: line }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="h-1.5 w-2/5 rounded-full" style={{ background: line }} />
        <div className="flex-1 rounded-md" style={{ background: card, border: `1px solid ${line}` }} />
      </div>
    </div>
  )
}

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
] as const

export default function ConfiguracoesPage() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const [pageSize, setPageSize] = usePageSize()

  return (
    <PageShell title="Configurações" subtitle="Aparência e conta">
      <Card className="gap-0 py-0" aria-labelledby="h-tema">
        <CardHeader className="px-5 pb-0 pt-[18px] max-md:px-4">
          <CardTitle id="h-tema" className="text-[15px] font-semibold tracking-tight">
            Tema
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Como o Pit Finance aparece neste dispositivo</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-5 pb-5 pt-4 max-md:px-4">
          <div role="radiogroup" aria-labelledby="h-tema" className="grid grid-cols-3 gap-3 max-sm:gap-2">
            {THEMES.map((t) => {
              const selected = mounted && theme === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-2 text-left transition-colors hover:border-input",
                    selected && "border-primary shadow-[0_0_0_1px_var(--primary)]",
                  )}
                >
                  <div className="h-20 overflow-hidden rounded-lg border max-sm:h-16">
                    {t.value === "system" ? (
                      <div className="flex h-full">
                        <div className="w-1/2 overflow-hidden">
                          <div className="h-full w-[200%]">
                            <ThemeMini mode="light" />
                          </div>
                        </div>
                        <div className="w-1/2 overflow-hidden">
                          <div className="h-full w-[200%] -translate-x-1/2">
                            <ThemeMini mode="dark" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ThemeMini mode={t.value} />
                    )}
                  </div>
                  <span className="flex items-center justify-between px-1 text-[13px] font-medium">
                    {t.label}
                    <span
                      className={cn("size-3.5 rounded-full border", selected && "border-[4px] border-primary")}
                      aria-hidden
                    />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden items-center justify-between gap-4 border-t pt-4 md:flex">
            <div>
              <div id="cfg-collapsed" className="text-sm font-medium">
                Menu lateral recolhido
              </div>
              <div className="text-[13px] text-muted-foreground">Mostra só os ícones para ganhar espaço</div>
            </div>
            <Switch checked={collapsed} onCheckedChange={toggleCollapsed} aria-labelledby="cfg-collapsed" />
          </div>

          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div>
              <div id="cfg-page-size" className="text-sm font-medium">
                Itens por página nas tabelas
              </div>
              <div className="text-[13px] text-muted-foreground">Vale para Despesas e Receitas</div>
            </div>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-[84px]" aria-labelledby="cfg-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0" aria-labelledby="h-conta">
        <CardHeader className="px-5 pb-0 pt-[18px] max-md:px-4">
          <CardTitle id="h-conta" className="text-[15px] font-semibold tracking-tight">
            Conta
          </CardTitle>
          <p className="text-[13px] text-muted-foreground">Dados de acesso</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-5 pb-5 pt-4 max-md:px-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border bg-muted text-sm font-semibold" aria-hidden>
              {userInitials(user?.email)}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">{user?.isAdmin ? "Administrador" : "Conta pessoal"}</p>
              <p className="text-[13px] text-muted-foreground">Pit Finance</p>
            </div>
          </div>

          <div className="max-w-md">
            <label htmlFor="cfg-email" className="mb-1.5 block text-sm font-medium">
              E-mail
            </label>
            <Input id="cfg-email" value={user?.email ?? ""} disabled readOnly className="h-10" />
            <p className="mt-1.5 text-xs text-muted-foreground">Para trocar o e-mail, abra um chamado no Suporte.</p>
          </div>

          <div className="border-t pt-4">
            <Button variant="outline" className="text-expense hover:text-expense" onClick={logout}>
              <LogOut /> Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}
