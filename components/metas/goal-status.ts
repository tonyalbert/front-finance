import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react"
import type { SavingsGoalStatus } from "@/lib/finance-types"

export const GOAL_STATUS: Record<SavingsGoalStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  on_track: { label: "No ritmo", icon: TrendingUp, cls: "bg-income-soft text-income" },
  behind: { label: "Atrasada", icon: Clock, cls: "bg-warning-soft text-warning" },
  overdue: { label: "Prazo vencido", icon: AlertTriangle, cls: "bg-expense-soft text-expense" },
  completed: { label: "Concluída", icon: CheckCircle2, cls: "bg-income-soft text-income" },
}
