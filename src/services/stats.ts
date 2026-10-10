import type { WaterReading } from '../types/waterData';
import { buildLocations, canonicalRiver, hasValues, type MonitoringLocation } from '../utils/stations';
import { DODDAGUBBI } from './doddagubbi';
import { DEMO_WATCHED_LAKES } from '../demo/watchlist';

/**
 * THE one place every number on screen is computed.
 *
 * Tiles, captions and headlines all read from the object this returns. Nothing anywhere
 * else counts stations, rivers or lakes for itself, so the dashboard, the story pages and
 * the mobile app cannot drift apart. Figures that come from the KSPCB dataset live at the
 * top level; anything seeded sits under `demo` and must be labelled as such in the UI.
 */

const LAKE_WORDS = /lake|kere|tank/i;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface NearestPoint {
  name: string;
  river: string;
  km: number;
}

export interface Stats {
  /** Distinct physical sites, grouped by coordinates. */
  locations: number;
  /** Station codes in the raw rows; higher than `locations` because codes are reissued. */
  stationCodes: number;
  /** Rivers after spelling variants are merged. */
  rivers: number;
  /** Water bodies in the reports whose name, river or stretch reads as a lake/kere/tank. */
  lakesInReports: number;
  /** Stations whose district reads Bengaluru. District is only filled in some reports. */
  bengaluruStations: number;
  /** ...of those, how many carry no reading in the report that names them. */
  bengaluruNoReading: number;
  /** Months that the district column is filled in at all. */
  districtMonths: string[];
  months: string[];
  firstMonth: string;
  lastMonth: string;
  /** Points that appear in the given month's report at all (reading or not). */
  listedIn: (month: string) => number;
  /** ...of those, the ones carrying an actual reading. */
  sampledIn: (month: string) => number;
  nearestToDoddagubbi: NearestPoint;
  demo: {
    /** Lakes on Jala Saakshi's own watchlist. Seeded, NOT a KSPCB figure. */
    watchedLakes: number;
  };
}

export function computeStats(readings: WaterReading[], locations?: MonitoringLocation[]): Stats {
  const locs = locations ?? buildLocations(readings);
  const months = [...new Set(readings.map((r) => r.month))].sort();

  const lakeKeys = new Set(
    readings
      .filter((r) => [r.station_name, r.river, r.stretch, r.note].some((f) => f && LAKE_WORDS.test(f)))
      .map((r) => `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`),
  );

  const blr = readings.filter((r) => /bengaluru|bangalore/i.test(r.district ?? ''));

  const nearest = locs
    .map((l) => ({ name: l.name, river: l.river, km: haversineKm(DODDAGUBBI.lat, DODDAGUBBI.lng, l.lat, l.lng) }))
    .sort((a, b) => a.km - b.km)[0] ?? { name: '—', river: '—', km: 0 };

  const listedByMonth = new Map<string, number>();
  const sampledByMonth = new Map<string, number>();
  for (const l of locs) {
    for (const [m, r] of l.byMonth) {
      listedByMonth.set(m, (listedByMonth.get(m) ?? 0) + 1);
      if (r.status !== 'no_access' && hasValues(r)) sampledByMonth.set(m, (sampledByMonth.get(m) ?? 0) + 1);
    }
  }

  return {
    locations: locs.length,
    stationCodes: new Set(readings.map((r) => r.station_code)).size,
    rivers: new Set(readings.map((r) => canonicalRiver(r.river))).size,
    lakesInReports: lakeKeys.size,
    bengaluruStations: new Set(blr.map((r) => r.station_code)).size,
    bengaluruNoReading: new Set(blr.filter((r) => !hasValues(r)).map((r) => r.station_code)).size,
    districtMonths: [...new Set(readings.filter((r) => r.district).map((r) => r.month))].sort(),
    months,
    firstMonth: months[0] ?? '',
    lastMonth: months[months.length - 1] ?? '',
    listedIn: (month) => listedByMonth.get(month) ?? 0,
    sampledIn: (month) => sampledByMonth.get(month) ?? 0,
    nearestToDoddagubbi: nearest,
    demo: { watchedLakes: DEMO_WATCHED_LAKES },
  };
}
