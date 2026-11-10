// MY CS MTP — currency formatting helper
export function formatCurrency(amount: number, currencySymbol = '₹'): string {
  return currencySymbol + Number(amount || 0).toFixed(2).replace(/\.00$/, '')
}

export function slugify(input: string): string {
  return input.toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function makeReferralCode(name: string | null, email: string): string {
  const base = (name || email.split('@')[0]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}${rand}`
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function rowToCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','))
  }
  return lines.join('\n')
}
