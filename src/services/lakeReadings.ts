/**
 * The KSPCB Bengaluru lakes report, July 2026, matched onto the OpenStreetMap polygons.
 *
 * Produced by scripts/match-lakes.mjs — re-run that after changing either input. Every
 * count exposed here is derived from the file, so nothing downstream needs a literal.
 */

export interface LakeReading {
  kspcbName: string;
  osmName?: string;
  /** The class printed in the report's "Use class" column. */
  useClass: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  do_mg_l: number | null;
  bod_mg_l: number | null;
  ph: number | null;
  conductivity: number | null;
  nitrate_n: number | null;
  fecal_coliform: number | null;
  total_coliform: number | null;
  lat: number;
  lng: number;
  /** 'inside' or 'within N m'. */
  match?: string;
  note?: string;
}

export interface LakeReadingsFile {
  source: string;
  month: string;
  byOsmId: Record<string, LakeReading>;
  /** Tested lakes we could not place on a polygon; drawn as points. */
  unmatched: LakeReading[];
}

const URL = '/data/lake-readings.json';

let cache: Promise<LakeReadingsFile> | null = null;

export function loadLakeReadings(): Promise<LakeReadingsFile> {
  cache ??= fetch(URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load lake readings (${r.status})`);
      return r.json() as Promise<LakeReadingsFile>;
    })
    .catch((err) => {
      cache = null;
      throw err;
    });
  return cache;
}

export interface LakeReadingStats {
  /** Lakes in the July 2026 report. */
  tested: number;
  /** ...by the class in its use-class column. */
  byClass: Record<string, number>;
  /** Tested lakes matched to an OSM polygon. */
  matched: number;
  /** Tested lakes we could not place. */
  unmatched: number;
  /** Mapped OSM lakes with no reading in this report. */
  withoutReading: (totalMapped: number) => number;
  source: string;
}

export function readingStats(file: LakeReadingsFile | null): LakeReadingStats | null {
  if (!file) return null;
  const matchedList = Object.values(file.byOsmId);
  const all = [...matchedList, ...file.unmatched];
  const byClass: Record<string, number> = {};
  for (const r of all) if (r.useClass) byClass[r.useClass] = (byClass[r.useClass] ?? 0) + 1;
  return {
    tested: all.length,
    byClass,
    matched: matchedList.length,
    unmatched: file.unmatched.length,
    withoutReading: (total) => Math.max(0, total - matchedList.length),
    source: file.source,
  };
}

/**
 * Colours for the classes that appear in this report.
 *
 * D and E are the only two present, and they must be told apart by people who cannot
 * distinguish red from green, so this uses two widely separated Okabe-Ito hues rather
 * than the orange/red pair the river classes use. The class letter is always shown
 * alongside, so colour is never the only cue.
 */
export const LAKE_CLASS_COLOUR: Record<string, { stroke: string; fill: string; label: string }> = {
  A: { stroke: '#117733', fill: '#44AA99', label: 'Class A' },
  B: { stroke: '#332288', fill: '#88CCEE', label: 'Class B' },
  C: { stroke: '#999933', fill: '#DDCC77', label: 'Class C' },
  D: { stroke: '#0072B2', fill: '#56B4E9', label: 'Class D' },
  E: { stroke: '#D55E00', fill: '#E69F00', label: 'Class E' },
};

export const NO_READING_COLOUR = { stroke: '#475569', fill: '#94a3b8' };

export const NO_READING_TEXT = 'No reading in the July 2026 KSPCB Bengaluru lakes report';

const fmt = (v: number | null, unit = '') => (v === null ? '—' : `${v.toLocaleString()}${unit}`);

/** Popup markup for a lake that was tested. */
export function readingPopupHtml(name: string, r: LakeReading): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<div class="lr-pop">
    <strong>${esc(name)}</strong>
    ${r.useClass ? `<span class="lr-class lr-class-${r.useClass}">Class ${r.useClass}</span>` : ''}
    <dl>
      <div><dt>Dissolved oxygen</dt><dd>${fmt(r.do_mg_l, ' mg/L')}</dd></div>
      <div><dt>BOD</dt><dd>${fmt(r.bod_mg_l, ' mg/L')}</dd></div>
      <div><dt>Total coliform</dt><dd>${fmt(r.total_coliform, ' MPN/100ml')}</dd></div>
      <div><dt>Fecal coliform</dt><dd>${fmt(r.fecal_coliform, ' MPN/100ml')}</dd></div>
    </dl>
    <em>KSPCB, July 2026</em>
  </div>`;
}

/**
 * The one sentence describing lake coverage, built from the data.
 *
 * Deliberately does NOT say "none in Class A, B or C". Only D and E appear in the
 * report's use-class column, but until it is confirmed that the column is the class
 * KSPCB assigned — rather than, say, the designated use the lake is managed for — that
 * conclusion is not ours to draw.
 */
export function lakeCoverageSentence(stats: LakeReadingStats, totalMapped: number | null): string {
  const classes = Object.entries(stats.byClass)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cls, n]) => `${n} Class ${cls}`)
    .join(', ');
  const head = `KSPCB tested ${stats.tested} lakes in July 2026; ${classes}.`;
  if (totalMapped === null) return head;
  return `${head} ${stats.withoutReading(totalMapped)} of the ${totalMapped} mapped lakes have no reading in that report.`;
}
