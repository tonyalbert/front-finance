export type ApiIncome = {
  id: string
  source: string
  amount: unknown
  date: string
  tagId: string | null
  fixedIncomeCompetence?: string | null
}

export type ApiExpense = {
  id: string
  item: string
  amount: unknown
  date: string
  isPaid: boolean
  tagId: string | null
  creditorId: string | null
  installmentGroupId?: string | null
  installmentNumber?: number | null
  installmentTotal?: number | null
  fixedExpenseCompetence?: string | null
}

export type ApiTag = {
  id: string
  name: string
  type: "INCOME" | "EXPENSE"
}

export type ApiCreditor = {
  id: string
  name: string
  phone: string | null
  email: string | null
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  isPaidOff: boolean
  expenseCount: number
}

export type ApiCreditorDetails = {
  id: string
  name: string
  phone: string | null
  email: string | null
  expenses: ApiExpense[]
}

export type ApiFixedExpense = {
  id: string
  name: string
  amount: string
  dayOfMonth: number
  startDate: string
  endDate: string | null
  isActive: boolean
  tagId: string | null
  creditorId: string | null
  tag: { id: string; name: string; type: string } | null
  creditor: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type ApiFixedIncomeAdjustment = {
  id: string
  amount: string
  /** Competência "YYYY-MM" a partir da qual o valor vale. */
  effectiveFrom: string
}

export type ApiFixedIncome = {
  id: string
  name: string
  /** Valor desde o início; reajustes em `adjustments`. */
  amount: string
  dayOfMonth: number
  startDate: string
  endDate: string | null
  isActive: boolean
  tagId: string | null
  tag: { id: string; name: string; type: string } | null
  adjustments: ApiFixedIncomeAdjustment[]
  createdAt: string
  updatedAt: string
}

export type MonthCardData = {
  key: string
  label: string
  quarter: 1 | 2 | 3 | 4
  year: number
  income: number
  expense: number
  dotColor: string
  isCurrentMonth?: boolean
}

export type ApiSavingsMovement = {
  id: string
  type: "DEPOSIT" | "WITHDRAW"
  amount: string
  date: string
  createdAt: string
}

export type SavingsGoalStatus = "completed" | "on_track" | "behind" | "overdue"

/** Calculado no back (mês corrente em APP_TIMEZONE). Valores em reais. */
export type ApiGoalProgress = {
  saved: number
  remaining: number
  /** Parcelas de empréstimo ainda não pagas (a caminho da meta). */
  pendingRepayment: number
  percent: number
  monthsLeft: number
  monthlySuggested: number
  savedThisMonth: number
  leftThisMonth: number
  plannedMonthly: number
  status: SavingsGoalStatus
}

/** Empréstimo da própria meta: parcelas são despesas parceladas (installmentGroupId). */
export type ApiSavingsLoan = {
  id: string
  goalId: string
  principal: string
  /** % ao mês */
  monthlyRate: string
  installments: number
  installmentAmount: string
  firstDueDate: string
  installmentGroupId: string
  createdAt: string
  paidCount: number
  remainingCount: number
  paidAmount: number
  pendingAmount: number
  nextInstallment: { expenseId: string; number: number | null; date: string; amount: number } | null
}

export type ApiSavingsGoal = {
  id: string
  name: string
  targetAmount: string
  targetDate: string
  initialAmount: string
  isEmergencyFund: boolean
  movements: ApiSavingsMovement[]
  loans: ApiSavingsLoan[]
  progress: ApiGoalProgress
  createdAt: string
  updatedAt: string
}
