import readingsJson from "../../../../public/data/readings.json";
import lakeGeoJson from "../assets/doddagubbi.json";
import type { DaysRow, GapFacts, MonitoringLocation, Reading, WaterClass } from "../types";

/**
 * Single source of truth: tiramisu/public/data/readings.json (the dataset the main
 * tiramisu site loads). Everything on screen that is a count or a reading comes from
 * here. To switch to a real API later, replace `getReadings()`.
 */
export function getReadings(): Reading[] {
  return readingsJson as unknown as Reading[];
}

// ── Doddagubbi (polygon is the team's lake.geojson, copied read-only) ────────

export const DODDAGUBBI_NAME = "Doddagubbi Lake";

const ring: number[][] = (lakeGeoJson as any).features[0].geometry.coordinates[0];
export const DODDAGUBBI = {
  name: DODDAGUBBI_NAME,
  lat: ring.reduce((s, p) => s + p[1], 0) / ring.length,
  lng: ring.reduce((s, p) => s + p[0], 0) / ring.length,
  /** [lat, lng] pairs for drawing the outline. */
  outline: ring.map((p) => [p[1], p[0]] as [number, number]),
};

// ── Names and rivers ─────────────────────────────────────────────────────────

const SMALL = new Set(["at", "of", "to", "and", "near", "in", "from", "the", "on", "with"]);
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w, i) => {
      const l = w.toLowerCase();
      if (/^[ud]\/s$/.test(l)) return l.toUpperCase();
      if (/^([a-z]\.)+[a-z]?$/i.test(w)) return w.toUpperCase();
      if (w.length <= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      if (i > 0 && SMALL.has(l)) return l;
      return l.charAt(0).toUpperCase() + l.slice(1);
    })
    .join(" ");
}

function shortName(name: string, river: string): string {
  let s = name.replace(/\s+/g, " ").trim();
  const m = s.match(/^(.*?)\s+at\s+(.*)$/i);
  if (m && letters(m[1]).startsWith(letters(river).slice(0, 5))) s = m[2];
  s = s.replace(/^at\s+/i, "");
  s = s.replace(/^river\s+[a-z ]{3,25}?\s+(?=at\s|d\/s|u\/s|near|from)/i, "");
  s = s.replace(/^at\s+/i, "");
  return titleCase(s || name);
}

/** Merge spelling variants of the same river across the PDFs. */
export function canonicalRiver(river: string): string {
  const k = letters(river);
  if (k.startsWith("krishna")) return "Krishna";
  if (k.startsWith("dakshinapinakini")) return "Dakshina Pinakini";
  if (k.startsWith("lakshman")) return "Lakshmantirtha";
  if (k.startsWith("ghataprab")) return "Ghataprabha";
  const alias: Record<string, string> = {
    simsha: "Shimsha",
    shimsha: "Shimsha",
    nethravathi: "Netravathi",
    netravathi: "Netravathi",
    malprabha: "Malaprabha",
    malaprabha: "Malaprabha",
    tungabhadra: "Tungabhadra",
  };
  return alias[k] ?? river.replace(/\s+/g, " ").trim();
}

// ── Locations ────────────────────────────────────────────────────────────────

export const hasValues = (r: Reading) =>
  r.class != null || r.do != null || r.bod != null || r.total_coliform != null;

const RANK: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
const rank = (c: WaterClass) => (c ? RANK[c] : 0);

/**
 * Rows are keyed by station_code, but one physical site appears under different codes in
 * different years. Group by coordinates. Where two stations share a point, the worse
 * reading of the month represents it.
 */
export function buildLocations(readings: Reading[]): MonitoringLocation[] {
  const groups = new Map<string, Reading[]>();
  for (const r of readings) {
    const id = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    (groups.get(id) ?? groups.set(id, []).get(id)!).push(r);
  }
  const out: MonitoringLocation[] = [];
  for (const [id, rows] of groups) {
    const byMonth = new Map<string, Reading>();
    for (const r of rows) {
      const prev = byMonth.get(r.month);
      if (!prev || rank(r.class) > rank(prev.class) || (rank(r.class) === rank(prev.class) && hasValues(r) && !hasValues(prev)))
        byMonth.set(r.month, r);
    }
    const months = [...byMonth.keys()].sort();
    const latest = byMonth.get(months[months.length - 1])!;
    const river = canonicalRiver(latest.river);
    const orders = rows.map((r) => r.river_order).filter((v): v is number => typeof v === "number");
    out.push({
      id,
      name: `${river} at ${shortName(latest.station_name, latest.river)}`,
      river,
      lat: latest.lat,
      lng: latest.lng,
      riverOrder: orders.length ? Math.min(...orders) : null,
      codes: [...new Set(rows.map((r) => r.station_code))],
      byMonth,
      months,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const LAKE_WORDS = /lake|kere|tank/i;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function computeFacts(readings: Reading[], locations: MonitoringLocation[]): GapFacts {
  const months = [...new Set(readings.map((r) => r.month))].sort();
  const lakeKeys = new Set(
    readings
      .filter((r) => [r.station_name, r.river, r.stretch, r.note].some((f) => f && LAKE_WORDS.test(f)))
      .map((r) => `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`),
  );
  const blr = readings.filter((r) => /bengaluru|bangalore/i.test(r.district ?? ""));
  const nearest = locations
    .map((l) => ({ name: l.name, river: l.river, km: haversineKm(DODDAGUBBI.lat, DODDAGUBBI.lng, l.lat, l.lng) }))
    .sort((a, b) => a.km - b.km)[0];
  return {
    locations: locations.length,
    stationCodes: new Set(readings.map((r) => r.station_code)).size,
    rivers: new Set(readings.map((r) => canonicalRiver(r.river))).size,
    lakeLocations: lakeKeys.size,
    firstMonth: months[0],
    lastMonth: months[months.length - 1],
    reportsMonths: months.length,
    bengaluruStations: new Set(blr.map((r) => r.station_code)).size,
    bengaluruNoReading: new Set(blr.filter((r) => !hasValues(r)).map((r) => r.station_code)).size,
    nearest,
  };
}

/** Months in which at least one real reading exists. */
export function monthsWithData(locations: MonitoringLocation[]): string[] {
  const s = new Set<string>();
  for (const l of locations) for (const [m, r] of l.byMonth) if (r.status !== "no_access" && hasValues(r)) s.add(m);
  return [...s].sort();
}

// ── Dates ────────────────────────────────────────────────────────────────────

const ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatMonth = (m: string) => `${ABBR[+m.split("-")[1] - 1]} ${m.split("-")[0]}`;
export const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${ABBR[m - 1]} ${y}`;
};
const endOfMonthISO = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo, 0));
  return d.toISOString().slice(0, 10);
};
export function daysSince(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - start) / 86_400_000));
}

// ── Tracker: unmonitored water bodies, derived from the dataset ──────────────

/** Fish-kill start as reported in news coverage; not in the dataset. */
export const FIRST_DEAD_FISH = "2026-10-01";

export function unmonitoredRows(
  locations: MonitoringLocation[],
  facts: GapFacts,
): DaysRow[] {
  const rows: DaysRow[] = [
    {
      id: "dodda",
      kind: "unmonitored",
      what: DODDAGUBBI_NAME,
      detail: `Not one of the ${facts.locations} points in KSPCB's monthly river reports. Nearest point: ${facts.nearest.km.toFixed(
        1,
      )} km away (${facts.nearest.river}). Days counted from the first dead fish reported in news coverage.`,
      since: FIRST_DEAD_FISH,
      status: "Not in monthly reports",
      demo: false,
    },
  ];
  const stale: DaysRow[] = [];
  for (const l of locations) {
    const last = l.months[l.months.length - 1];
    const lastWithValues = [...l.months].reverse().find((m) => hasValues(l.byMonth.get(m)!));
    if (last === facts.lastMonth && lastWithValues === facts.lastMonth) continue;
    const blankInLatest = last === facts.lastMonth && lastWithValues !== facts.lastMonth;
    stale.push({
      id: `stn-${l.id}`,
      kind: "unmonitored",
      what: l.name,
      detail: blankInLatest
        ? `In the ${formatMonth(facts.lastMonth)} report with no reading recorded${
            lastWithValues ? `. Last reading ${formatMonth(lastWithValues)}` : ""
          }.`
        : `Last reading ${formatMonth(lastWithValues ?? last)}; absent from the ${formatMonth(facts.lastMonth)} report.`,
      since: endOfMonthISO(lastWithValues ?? last),
      status: blankInLatest ? "No reading in latest report" : "Not in latest report",
      demo: false,
    });
  }
  stale.sort((a, b) => daysSince(a.since) - daysSince(b.since));
  return rows.concat(stale);
}
