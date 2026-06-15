import { apiFetch } from "@/lib/api"

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "CLOSED"
export type TicketCategory = "TECHNICAL" | "FINANCIAL" | "ACCOUNT" | "OTHER"

export type TicketMessage = {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
  user: { id: string; email: string; isAdmin: boolean }
}

export type Ticket = {
  id: string
  title: string
  description: string
  status: TicketStatus
  category: TicketCategory
  createdAt: string
  updatedAt: string
  user: { id: string; email: string }
  messages: TicketMessage[]
}

export type TicketSummary = {
  id: string
  title: string
  category: TicketCategory
  status: TicketStatus
  createdAt: string
  updatedAt: string
  user: { id: string; email: string }
  messages: Array<{ content: string; createdAt: string; isAdmin: boolean }>
}

export function getMyTickets(token: string, status?: TicketStatus): Promise<TicketSummary[]> {
  const qs = status ? `?status=${status}` : ""
  return apiFetch<TicketSummary[]>(`/tickets${qs}`, { token })
}

export function getMyTicket(token: string, id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/${id}`, { token })
}

export function createTicket(
  token: string,
  body: { title: string; description: string; category?: TicketCategory }
): Promise<Ticket> {
  return apiFetch<Ticket>("/tickets", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  })
}

export function sendMessage(token: string, ticketId: string, content: string): Promise<TicketMessage> {
  return apiFetch<TicketMessage>(`/tickets/${ticketId}/messages`, {
    method: "POST",
    token,
    body: JSON.stringify({ content }),
  })
}

export function getAllTickets(token: string, status?: TicketStatus): Promise<TicketSummary[]> {
  const qs = status ? `?status=${status}` : ""
  return apiFetch<TicketSummary[]>(`/tickets/admin/all${qs}`, { token })
}

export function getAdminTicket(token: string, id: string): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/admin/${id}`, { token })
}

export function updateTicketStatus(token: string, id: string, status: TicketStatus): Promise<Ticket> {
  return apiFetch<Ticket>(`/tickets/admin/${id}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  })
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em Andamento",
  CLOSED: "Encerrado",
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  TECHNICAL: "Técnico",
  FINANCIAL: "Financeiro",
  ACCOUNT: "Conta",
  OTHER: "Outro",
}
