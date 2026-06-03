export type ApiIncome = {
  id: string
  source: string
  amount: unknown
  date: string
  tagId: string | null
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
