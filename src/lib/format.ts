/** Today as a YYYY-MM-DD string in local time. */
export function todayISO(): string {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/** Format a YYYY-MM-DD string as e.g. "Sen, 20 Jul 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]} ${y}`
}

/** Short form: "20 Jul". */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  if (!m || !d) return iso
  return `${d} ${MONTHS[m - 1]}`
}
