const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-08" -> "Aug 2026" */
export function formatMonth(month: string): string {
  if (!month) return '';
  const [y, m] = month.split('-');
  const abbr = MONTH_ABBR[parseInt(m, 10) - 1];
  return abbr ? `${abbr} ${y}` : month;
}

/** "2026-08" -> "Aug" */
export function monthAbbr(month: string): string {
  return MONTH_ABBR[parseInt(month.split('-')[1], 10) - 1] ?? month;
}

export function yearOf(month: string): string {
  return month.split('-')[0];
}

export function groupMonthsByYear(months: string[]): { year: string; months: string[] }[] {
  const groups: { year: string; months: string[] }[] = [];
  for (const m of months) {
    const y = yearOf(m);
    const last = groups[groups.length - 1];
    if (last && last.year === y) last.months.push(m);
    else groups.push({ year: y, months: [m] });
  }
  return groups;
}
