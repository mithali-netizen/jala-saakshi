import type { WaterClass, WaterReading } from '../types/waterData';

/**
 * Derived "monitoring location" layer.
 *
 * The raw KSPCB rows are keyed by station_code, but the same physical site
 * appears under different codes across years (e.g. ARKA-5893BA in 2018-23 and
 * KSPCB-1165 in 2025-26). We group rows by coordinates so a site shows up once
 * on the map and its trend runs across every year. Where two distinct stations
 * were geocoded to the same point, the worst reading of the month is used.
 * The loader and the raw data are untouched.
 */

export interface MonitoringLocation {
  id: string;
  name: string;
  river: string;
  lat: number;
  lng: number;
  /** Original station names that were merged into this location. */
  names: string[];
  codes: string[];
  byMonth: Map<string, WaterReading>;
  /** Months with a reading, ascending. */
  months: string[];
}

export const CLASS_RANK: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };

export function classRank(c: WaterClass | undefined): number {
  return c ? (CLASS_RANK[c] ?? 0) : 0;
}

export function hasValues(r: WaterReading): boolean {
  return r.class != null || r.do != null || r.bod != null || r.total_coliform != null;
}

/** Positive when `a` is worse than `b`. */
function compareSeverity(a: WaterReading, b: WaterReading): number {
  const dr = classRank(a.class) - classRank(b.class);
  if (dr !== 0) return dr;
  if (a.do != null && b.do != null && a.do !== b.do) return b.do - a.do;
  if (a.do != null && b.do == null) return 1;
  return 0;
}

// ── Names ────────────────────────────────────────────────────────────────────

const SMALL_WORDS = new Set(['at', 'of', 'to', 'and', 'near', 'in', 'from', 'the', 'on', 'with']);

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (/^[ud]\/s$/.test(lower)) return lower.toUpperCase();
      if (/^([a-z]\.)+[a-z]?$/i.test(w)) return w.toUpperCase();
      if (w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

/** "Arkavathi at At D/S of Kanakapura" -> "D/S of Kanakapura" */
function shortStationName(name: string, river: string): string {
  let s = name.replace(/\s+/g, ' ').trim();
  const rk = letters(river).slice(0, 5);
  const m = s.match(/^(.*?)\s+at\s+(.*)$/i);
  if (m && letters(m[1]).startsWith(rk)) s = m[2];
  s = s.replace(/^at\s+/i, '');
  s = s.replace(/^river\s+[a-z ]{3,25}?\s+(?=at\s|d\/s|u\/s|near|from)/i, '');
  s = s.replace(/^at\s+/i, '');
  return titleCase(s || name);
}

const RIVER_ALIASES: Record<string, string> = {
  simsha: 'Shimsha',
  shimsha: 'Shimsha',
  nethravathi: 'Netravathi',
  netravathi: 'Netravathi',
  malprabha: 'Malaprabha',
  malaprabha: 'Malaprabha',
  tungabhadra: 'Tungabhadra',
  lakshmantirtha: 'Lakshmantirtha',
  lakshmantirtha2: 'Lakshmantirtha',
  ghataprabha: 'Ghataprabha',
};

/** Merge spelling variants from the PDFs ("Simsha"/"Shimsha", "Lakshman Tirtha"...). */
export function canonicalRiver(river: string): string {
  const key = letters(river);
  if (key.startsWith('krishna')) return 'Krishna';
  if (key.startsWith('dakshinapinakini')) return 'Dakshina Pinakini';
  if (key.startsWith('lakshman')) return 'Lakshmantirtha';
  return RIVER_ALIASES[key] ?? river.replace(/\s+/g, ' ').trim();
}

// ── Build ────────────────────────────────────────────────────────────────────

export function buildLocations(readings: WaterReading[]): MonitoringLocation[] {
  const groups = new Map<string, WaterReading[]>();
  for (const r of readings) {
    if (r.lat == null || r.lng == null) continue;
    const id = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    const list = groups.get(id);
    if (list) list.push(r);
    else groups.set(id, [r]);
  }

  const locations: MonitoringLocation[] = [];
  for (const [id, rows] of groups) {
    const byMonth = new Map<string, WaterReading>();
    for (const r of rows) {
      const prev = byMonth.get(r.month);
      if (!prev || compareSeverity(r, prev) > 0) byMonth.set(r.month, r);
    }
    const months = [...byMonth.keys()].sort();
    const latest = byMonth.get(months[months.length - 1])!;
    const river = canonicalRiver(latest.river);
    locations.push({
      id,
      name: `${river} at ${shortStationName(latest.station_name, latest.river)}`,
      river,
      lat: latest.lat,
      lng: latest.lng,
      names: [...new Set(rows.map((r) => r.station_name))],
      codes: [...new Set(rows.map((r) => r.station_code))],
      byMonth,
      months,
    });
  }
  return locations.sort((a, b) => a.name.localeCompare(b.name));
}

/** Months in which at least one real reading exists, ascending. */
export function monthsWithData(locations: MonitoringLocation[]): string[] {
  const set = new Set<string>();
  for (const loc of locations) {
    for (const [m, r] of loc.byMonth) if (r.status !== 'no_access' && hasValues(r)) set.add(m);
  }
  return [...set].sort();
}

// ── Summaries ────────────────────────────────────────────────────────────────

export type ClassCounts = Record<'A' | 'B' | 'C' | 'D' | 'E' | 'none', number>;

export function countByClass(locations: MonitoringLocation[], month: string): ClassCounts {
  const counts: ClassCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, none: 0 };
  for (const loc of locations) {
    const r = loc.byMonth.get(month);
    if (!r) continue;
    if (r.class) counts[r.class] += 1;
    else counts.none += 1;
  }
  return counts;
}

export function worstStations(
  locations: MonitoringLocation[],
  month: string,
  n = 5,
): { location: MonitoringLocation; reading: WaterReading }[] {
  return locations
    .flatMap((location) => {
      const reading = location.byMonth.get(month);
      return reading && reading.class ? [{ location, reading }] : [];
    })
    .sort((a, b) => compareSeverity(b.reading, a.reading) || (b.reading.bod ?? 0) - (a.reading.bod ?? 0))
    .slice(0, n);
}

// ── Trend ────────────────────────────────────────────────────────────────────

export type TrendDirection = 'improving' | 'worsening' | 'stable' | 'unknown';

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function delta(values: number[]): number | null {
  if (values.length < 2) return null;
  if (values.length >= 4) return mean(values.slice(-2)) - mean(values.slice(-4, -2));
  return values[values.length - 1] - values[0];
}

/**
 * Compare the latest readings with the ones before them (up to the last four).
 * Higher DO is better, lower BOD is better. Small wobbles count as stable.
 */
export function computeTrend(location: MonitoringLocation, upToMonth: string): TrendDirection {
  const rows = location.months
    .filter((m) => m <= upToMonth)
    .map((m) => location.byMonth.get(m)!)
    .filter((r) => r.status !== 'no_access');
  const dDo = delta(rows.map((r) => r.do).filter((v): v is number => v != null).slice(-4));
  const dBod = delta(rows.map((r) => r.bod).filter((v): v is number => v != null).slice(-4));
  if (dDo === null && dBod === null) return 'unknown';
  let score = 0;
  if (dDo !== null) score += dDo >= 0.5 ? 1 : dDo <= -0.5 ? -1 : 0;
  if (dBod !== null) score += dBod <= -1 ? 1 : dBod >= 1 ? -1 : 0;
  return score > 0 ? 'improving' : score < 0 ? 'worsening' : 'stable';
}
