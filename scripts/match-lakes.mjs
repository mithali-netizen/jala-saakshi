/**
 * Match the KSPCB July 2026 Bengaluru lakes report onto the OpenStreetMap lake polygons.
 *
 *   npm run match:lakes
 *
 * Reads  public/data/lakes-2026-07.json  (131 tested lakes, with coordinates)
 *        public/data/all-lakes.geojson   (~340 named OSM polygons)
 * Writes public/data/lake-readings.json  (readings keyed by OSM id, plus the unmatched)
 *
 * A reading is attached to a polygon only when the sample point falls inside it, or
 * failing that lies within 300 m of it. Anything further away is left unmatched rather
 * than guessed at: a reading pinned to the wrong lake is worse than no reading.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'public', 'data');

const NEAREST_LIMIT_M = 300;

const readings = JSON.parse(readFileSync(path.join(DATA, 'lakes-2026-07.json'), 'utf8'));
const geo = JSON.parse(readFileSync(path.join(DATA, 'all-lakes.geojson'), 'utf8'));

// ── geometry ────────────────────────────────────────────────────────────────
/** Rings as [lng, lat][] — polygons only; the file also holds a couple of watercourses. */
function ringsOf(f) {
  const g = f.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.flat();
  return [];
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const toRad = (x) => (x * Math.PI) / 180;
function haversineM(lat1, lng1, lat2, lng2) {
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Shortest distance from a point to a ring's vertices and edges, in metres. */
function distanceToRingM(lat, lng, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    // Project onto the segment in degree space, then measure properly.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((lng - x1) * dx + (lat - y1) * dy) / len2));
    best = Math.min(best, haversineM(lat, lng, y1 + t * dy, x1 + t * dx));
  }
  return best;
}

// ── index the polygons ──────────────────────────────────────────────────────
/**
 * Named water bodies in the OSM extract that are not lakes. Matched narrowly and by
 * name because OSM tags them all `natural=water` with nothing to tell them apart:
 * a hotel pool, a landfill leachate pond, quarry catchments, and two watercourses
 * (thorai is a channel; the Vrishabhavati is a river).
 */
const NOT_A_LAKE_NAME = /swimming pool|^leachate pond$|quarry (catchment|water)|thorai$|^vrishabhavati$/i;

/** OSM `water=` values that are not lakes — drains, canals and the like. */
const NOT_A_LAKE = new Set(['drain', 'ditch', 'canal', 'wastewater', 'catchment_area']);

const polygons = [];
let skippedNonLakes = 0;
for (const f of geo.features ?? []) {
  const rings = ringsOf(f);
  if (rings.length === 0) continue;
  if (NOT_A_LAKE.has(String(f.properties?.water ?? '')) || NOT_A_LAKE_NAME.test(String(f.properties?.name ?? ''))) {
    skippedNonLakes += 1;
    continue;
  }
  const name = typeof f.properties?.name === 'string' ? f.properties.name : '';
  if (!name) continue;
  const outer = rings[0];
  polygons.push({
    id: String(f.properties?.['@id'] ?? `lake-${polygons.length}`),
    name,
    rings,
    lat: outer.reduce((s, p) => s + p[1], 0) / outer.length,
    lng: outer.reduce((s, p) => s + p[0], 0) / outer.length,
  });
}

// ── match ───────────────────────────────────────────────────────────────────
const num = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || /^(bdl|nd|na|-)$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const byOsmId = {};
const unmatched = [];
const nameMismatches = [];
let insideCount = 0;
let nearCount = 0;

/** Loose comparison, to spot matches whose names are clearly different. */
const normalise = (s) =>
  s.toLowerCase().replace(/[^a-z]/g, '').replace(/lake|kere|tank|bengaluru|bangalore|vill|village/g, '');

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Transliterated Kannada place names vary a lot in spelling (Puttenhalli /
 * Puttenahalli), so only flag pairs that are genuinely unalike rather than every
 * variant — otherwise the review list is noise and nobody reads it.
 */
function clearlyDifferent(a, b) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return false;
  const distance = levenshtein(a, b);
  return distance / Math.max(a.length, b.length) > 0.34;
}

for (const r of readings) {
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  let hit = null;
  let how = null;

  for (const p of polygons) {
    if (pointInRing(lng, lat, p.rings[0])) {
      hit = p;
      how = 'inside';
      break;
    }
  }

  if (!hit) {
    let best = null;
    for (const p of polygons) {
      // Cheap filter before the expensive edge walk.
      if (haversineM(lat, lng, p.lat, p.lng) > 3000) continue;
      const d = Math.min(...p.rings.map((ring) => distanceToRingM(lat, lng, ring)));
      if (!best || d < best.d) best = { p, d };
    }
    if (best && best.d <= NEAREST_LIMIT_M) {
      hit = best.p;
      how = `within ${Math.round(best.d)} m`;
    }
  }

  const reading = {
    kspcbName: r.name,
    useClass: r.use_class ?? null,
    do_mg_l: num(r.do_mg_l),
    bod_mg_l: num(r.bod_mg_l),
    ph: num(r.ph),
    conductivity: num(r.conductivity),
    nitrate_n: num(r.nitrate_n),
    fecal_coliform: num(r.fecal_coliform),
    total_coliform: num(r.total_coliform),
    lat,
    lng,
  };

  if (!hit) {
    unmatched.push(reading);
    continue;
  }

  if (how === 'inside') insideCount += 1;
  else nearCount += 1;

  // Two sample points can fall in one polygon; keep the first and record the clash.
  if (byOsmId[hit.id]) {
    unmatched.push({ ...reading, note: `polygon ${hit.id} already matched to ${byOsmId[hit.id].kspcbName}` });
    continue;
  }
  byOsmId[hit.id] = { ...reading, osmName: hit.name, match: how };

  const a = normalise(hit.name);
  const b = normalise(r.name);
  if (clearlyDifferent(a, b)) {
    nameMismatches.push({ osm: hit.name, kspcb: r.name, how });
  }
}

const matchedIds = new Set(Object.keys(byOsmId));
const osmWithoutReading = polygons.filter((p) => !matchedIds.has(p.id));

writeFileSync(
  path.join(DATA, 'lake-readings.json'),
  JSON.stringify(
    {
      source: 'KSPCB Bengaluru Lakes report, July 2026',
      sourceFile: readings[0]?.source_file ?? null,
      month: '2026-07',
      generatedBy: 'scripts/match-lakes.mjs',
      nearestLimitM: NEAREST_LIMIT_M,
      byOsmId,
      unmatched,
    },
    null,
    1,
  ),
);

// ── log ─────────────────────────────────────────────────────────────────────
console.log('KSPCB lakes tested (July 2026):    ', readings.length);
console.log('  matched to an OSM polygon:       ', matchedIds.size, `(${insideCount} inside, ${nearCount} within ${NEAREST_LIMIT_M} m)`);
console.log('  unmatched:                       ', unmatched.length);
console.log('OSM lake polygons:                 ', polygons.length, `(${skippedNonLakes} drains and similar excluded)`);
console.log('  with a July 2026 reading:        ', matchedIds.size);
console.log('  with no reading:                 ', osmWithoutReading.length);

const classes = {};
for (const r of readings) classes[r.use_class] = (classes[r.use_class] ?? 0) + 1;
console.log('\nuse_class across all 131 tested:   ', JSON.stringify(classes));

if (unmatched.length) {
  console.log(`\nUnmatched KSPCB lakes (${unmatched.length}) — shown as points on the map:`);
  for (const u of unmatched) console.log(`  · ${u.kspcbName}${u.note ? `  [${u.note}]` : ''}`);
}

if (nameMismatches.length) {
  console.log(`\nMatches where the names differ — please review (${nameMismatches.length}):`);
  for (const m of nameMismatches) console.log(`  OSM "${m.osm}"\n    KSPCB "${m.kspcb}"   (${m.how})`);
}
