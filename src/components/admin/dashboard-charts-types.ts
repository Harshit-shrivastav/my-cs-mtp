// MY CS MTP — Dashboard charts shared types and helpers.
// Shared between the server-side dashboard page (which builds the
// status slices) and the client-side recharts wrapper. Must NOT be
// a 'use client' module so it can be imported from server components.

export interface MonthPoint {
  month: string
  orders: number
  revenue: number
}

export interface StatusSlice {
  name: string
  value: number
  color: string
}

export const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'hsl(217 91% 60%)',
  ASSIGNED: 'hsl(38 92% 50%)',
  UNDER_EVALUATION: 'hsl(280 65% 60%)',
  EVALUATED: 'hsl(142 71% 45%)',
}

export function statusColor(name: string): string {
  return STATUS_COLORS[name] || 'var(--muted-foreground)'
}
