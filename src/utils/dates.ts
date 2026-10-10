const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-01" -> "1 Oct 2026" */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${ABBR[m - 1]} ${y}`;
}

/** Last day of a "YYYY-MM" month, as an ISO date. */
export function endOfMonthISO(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Whole days from an ISO date up to today, never negative. */
export function daysSince(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  const start = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - start) / 86_400_000));
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
