import seededReports from '../demo/reports.json';
import { formatMonth } from '../utils/months';
import { daysSince, endOfMonthISO, formatDay } from '../utils/dates';
import { hasValues, type MonitoringLocation } from '../utils/stations';
import { DODDAGUBBI, FIRST_DEAD_FISH } from './doddagubbi';
import type { Stats } from './stats';

/**
 * Rows for the accountability tracker.
 *
 * Two kinds, and the UI must keep them apart:
 *   'gap'      — derived from the KSPCB dataset. Real.
 *   'complaint'— seeded demo reports. Every one carries demo: true and must render a badge.
 */

export type TrackerKind = 'gap' | 'complaint';

export interface TrackerRow {
  id: string;
  kind: TrackerKind;
  what: string;
  detail: string;
  /** ISO date the clock starts from. */
  since: string;
  days: number;
  status: string;
  demo: boolean;
  /** Map entity to select when the row is clicked, if any. */
  targetId?: string;
}

export interface SeededReport {
  id: string;
  what: string;
  issue: string;
  reportedOn: string;
  sentTo: string[];
  status: 'Submitted' | 'Sent' | 'Acknowledged' | 'Action taken';
  respondedOn: string | null;
}

/** A complaint counts as unanswered once it passes this many days with no response. */
export const OPEN_AFTER_DAYS = 7;

export function getSeededReports(): SeededReport[] {
  return seededReports as SeededReport[];
}

/** Seeded citizen complaints. Swap this function for a real API later. */
export function complaintRows(): TrackerRow[] {
  return getSeededReports().map((r) => ({
    id: r.id,
    kind: 'complaint' as const,
    what: `${r.what}: ${r.issue}`,
    detail: r.respondedOn
      ? `Sent to ${r.sentTo.join(', ')}. Answered ${formatDay(r.respondedOn)}, ${
          daysSince(r.reportedOn) - daysSince(r.respondedOn)
        } days later.`
      : `Sent to ${r.sentTo.join(', ')}. No response yet.`,
    since: r.reportedOn,
    days: daysSince(r.reportedOn),
    status: r.status,
    demo: true,
    targetId: /doddagubbi/i.test(r.what) ? DODDAGUBBI.id : undefined,
  }));
}

/** Seeded complaints with no response that are older than OPEN_AFTER_DAYS. */
export function openComplaints(rows = complaintRows()): TrackerRow[] {
  const answered = new Set(getSeededReports().filter((r) => r.respondedOn).map((r) => r.id));
  return rows.filter((r) => !answered.has(r.id) && r.days >= OPEN_AFTER_DAYS);
}

/**
 * Water bodies and stations with a monitoring gap, derived from the dataset.
 * Doddagubbi leads: it is not among the monitoring points at all.
 */
export function gapRows(locations: MonitoringLocation[], stats: Stats): TrackerRow[] {
  const lake: TrackerRow = {
    id: DODDAGUBBI.id,
    kind: 'gap',
    what: DODDAGUBBI.name,
    detail: `Not among the ${stats.locations} monitoring points in KSPCB's monthly river reports. Nearest point ${stats.nearestToDoddagubbi.km.toFixed(
      1,
    )} km away, on the ${stats.nearestToDoddagubbi.river}. Days counted from the first dead fish reported in news coverage.`,
    since: FIRST_DEAD_FISH,
    days: daysSince(FIRST_DEAD_FISH),
    status: 'Never in monthly reports',
    demo: false,
    targetId: DODDAGUBBI.id,
  };

  const stale: TrackerRow[] = [];
  for (const l of locations) {
    const last = l.months[l.months.length - 1];
    const lastReal = [...l.months].reverse().find((m) => hasValues(l.byMonth.get(m)!));
    if (last === stats.lastMonth && lastReal === stats.lastMonth) continue;
    const blankInLatest = last === stats.lastMonth && lastReal !== stats.lastMonth;
    stale.push({
      id: `gap-${l.id}`,
      kind: 'gap',
      what: l.name,
      detail: blankInLatest
        ? `Listed in the ${formatMonth(stats.lastMonth)} report with no reading recorded${
            lastReal ? `. Last reading ${formatMonth(lastReal)}` : ''
          }.`
        : `Last reading ${formatMonth(lastReal ?? last)}; absent from the ${formatMonth(stats.lastMonth)} report.`,
      since: endOfMonthISO(lastReal ?? last),
      days: daysSince(endOfMonthISO(lastReal ?? last)),
      status: blankInLatest ? 'No reading in latest report' : 'Not in latest report',
      demo: false,
      targetId: l.id,
    });
  }
  stale.sort((a, b) => a.days - b.days);
  return [lake, ...stale];
}
