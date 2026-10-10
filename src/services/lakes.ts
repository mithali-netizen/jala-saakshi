import { DODDAGUBBI } from './doddagubbi';

/**
 * Bengaluru water bodies from OpenStreetMap (Overpass, natural=water),
 * served from public/data/all-lakes.geojson.
 *
 * None of these carry a water-quality reading: they are geometry and a name. That
 * emptiness is the finding, so the UI says "no reading in KSPCB's monthly reports"
 * rather than hiding a lake that has nothing attached.
 */

export interface Lake {
  /** OSM id, e.g. "way/12345". The featured lake reuses the Doddagubbi entity id. */
  id: string;
  name: string;
  /** Centroid, used for pins, search and distance. */
  lat: number;
  lng: number;
  /** [lat, lng] rings for drawing. */
  rings: [number, number][][];
  /** The lake this project follows in detail. */
  featured?: boolean;
}

const LAKES_URL = '/data/all-lakes.geojson';

/** Treat an OSM lake this close to our Doddagubbi polygon as the same water body. */
const FEATURED_MATCH_KM = 0.3;

interface RawFeature {
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates: unknown };
}

function ringsOf(geom: { type: string; coordinates: unknown }): [number, number][][] {
  // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
  const toRing = (r: number[][]) => r.map((p) => [p[1], p[0]] as [number, number]);
  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).map(toRing);
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).flatMap((poly) => poly.map(toRing));
  return [];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function parseLakes(json: { features?: RawFeature[] }): Lake[] {
  const lakes: Lake[] = [];
  for (const f of json.features ?? []) {
    // Polygons only. The file also holds a couple of watercourse lines, which are
    // rivers rather than lakes and would otherwise be counted as water bodies.
    if (!f.geometry || !/^(Multi)?Polygon$/.test(f.geometry.type)) continue;
    const name = typeof f.properties?.name === 'string' ? f.properties.name : '';
    if (!name) continue;
    const rings = ringsOf(f.geometry);
    const outer = rings[0];
    if (!outer || outer.length === 0) continue;
    lakes.push({
      id: String(f.properties?.['@id'] ?? `lake-${lakes.length}`),
      name,
      lat: outer.reduce((s, p) => s + p[0], 0) / outer.length,
      lng: outer.reduce((s, p) => s + p[1], 0) / outer.length,
      rings,
    });
  }

  // Doddagubbi is in this file as "Dodda Gubbi Kere". Give it the featured entity's id
  // so selecting it from either the lake layer or the dashboard means the same thing.
  const match = lakes
    .map((l) => ({ l, km: haversineKm(DODDAGUBBI.lat, DODDAGUBBI.lng, l.lat, l.lng) }))
    .sort((a, b) => a.km - b.km)[0];
  if (match && match.km <= FEATURED_MATCH_KM) {
    match.l.featured = true;
    match.l.id = DODDAGUBBI.id;
  }

  return lakes.sort((a, b) => a.name.localeCompare(b.name));
}

let cache: Promise<Lake[]> | null = null;

/** Fetched once per session; the file is ~1.7 MB so callers should expect a wait. */
export function loadLakes(): Promise<Lake[]> {
  cache ??= fetch(LAKES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load lakes (${r.status})`);
      return r.json();
    })
    .then(parseLakes)
    .catch((err) => {
      cache = null; // let a later caller retry
      throw err;
    });
  return cache;
}

export const LAKES_ATTRIBUTION = '© OpenStreetMap contributors';
