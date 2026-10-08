"use client"

import Link from "next/link"
import { PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiSavingsGoal } from "@/lib/finance-types"
import { formatBRL, toNumber } from "@/lib/finance-utils"
import { formatMonthYear } from "@/lib/fixed-expense-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/finance/empty-state"
import { GOAL_STATUS } from "@/components/metas/goal-status"

const VISIBLE = 4

/** Progresso das metas em andamento e quanto falta guardar neste mês. */
export function SavingsGoalsSummary({ goals, isLoading }: { goals: ApiSavingsGoal[]; isLoading: boolean }) {
  const active = goals.filter((g) => g.progress.status !== "completed")
  const leftThisMonth = active.reduce((s, g) => s + g.progress.leftThisMonth, 0)
  const hidden = active.length - VISIBLE

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-start justify-between gap-3 px-5 pb-0 pt-[18px] max-md:px-4">
        <div>
          <CardTitle className="text-[15px] font-semibold tracking-tight">Metas</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {active.length > 0 ? `${active.length} em andamento` : "Quanto guardar por mês"}
          </p>
        </div>
        <Link href="/metas" className="text-[13px] font-medium text-primary hover:underline">
          Ver todas
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-3 max-md:px-4">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Carregando">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : active.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title={goals.length > 0 ? "Todas as metas concluídas" : "Nenhuma meta"}
            description={goals.length > 0 ? "Que tal definir a próxima?" : "Defina um valor e um prazo e veja quanto guardar por mês."}
            className="py-6"
          />
        ) : (
          <>
            <ul className="divide-y">
              {active.slice(0, VISIBLE).map((g) => {
                const s = GOAL_STATUS[g.progress.status]
                return (
                  <li key={g.id} className="flex flex-col gap-1.5 py-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <strong className="truncate font-medium">{g.name}</strong>
                      <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium", s.cls)}>{s.label}</span>
                    </div>
                    <Progress value={g.progress.percent} aria-label={`${g.progress.percent}% de ${g.name}`} className="h-2 bg-muted [&>[data-slot=progress-indicator]]:bg-income" />
                    <div className="num flex justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatBRL(g.progress.saved)} de {formatBRL(toNumber(g.targetAmount))}
                      </span>
                      <span>
                        {g.progress.startsAt
                          ? `começa em ${formatMonthYear(g.progress.startsAt)}`
                          : g.progress.leftThisMonth > 0
                            ? `faltam ${formatBRL(g.progress.leftThisMonth)} no mês`
                            : "mês em dia"}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
            {hidden > 0 && (
              <Link href="/metas" className="pb-1 pt-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                + {hidden} em Metas
              </Link>
            )}
            <div className="mt-auto flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
              <span className="text-[13px] font-medium text-muted-foreground">Guardar neste mês</span>
              <span className="num text-[15px] font-semibold">{formatBRL(leftThisMonth)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
