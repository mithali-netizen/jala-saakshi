import type { Lake } from '../services/lakes';
import type { MonitoringLocation } from '../utils/stations';
import { hasValues } from '../utils/stations';
import { formatMonth } from '../utils/months';

/**
 * Everything the guided tour states, worked out from the data at runtime.
 *
 * Nothing here is written down in advance except the quoted sources. In particular we
 * never say, or imply, that a person's own wastewater reaches any lake: we have no
 * drainage or sewerage data, and the lakes near someone are simply the lakes near them.
 */

/** How far out "near you" reaches. */
export const NEARBY_RADIUS_KM = 3;

/** A monitoring point this close to a lake would plausibly be measuring that lake. */
const SAME_WATER_BODY_KM = 0.25;

/** Fallback when geolocation is refused or unavailable: central Bengaluru. */
export const BENGALURU_CENTRE = { lat: 12.9716, lng: 77.5946 };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export interface NearbyLake {
  lake: Lake;
  km: number;
  /** True only if a monitoring point sits close enough to be measuring this water body. */
  hasReading: boolean;
}

export interface NearestPoint {
  location: MonitoringLocation;
  km: number;
  month: string | null;
  do: number | null;
  bod: number | null;
  waterClass: string | null;
}

export interface TourFacts {
  origin: { lat: number; lng: number };
  /** Whether the origin came from the device or is the fallback centre. */
  located: boolean;
  nearby: NearbyLake[];
  withoutReading: number;
  nearest: NearestPoint | null;
}

export function computeFacts(
  origin: { lat: number; lng: number },
  located: boolean,
  lakes: Lake[],
  locations: MonitoringLocation[],
): TourFacts {
  const nearby: NearbyLake[] = lakes
    .map((lake) => ({ lake, km: haversineKm(origin.lat, origin.lng, lake.lat, lake.lng) }))
    .filter((n) => n.km <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.km - b.km)
    .map(({ lake, km }) => ({
      lake,
      km,
      // A lake counts as measured only if a monitoring point is effectively on it.
      hasReading: locations.some(
        (loc) => haversineKm(lake.lat, lake.lng, loc.lat, loc.lng) <= SAME_WATER_BODY_KM,
      ),
    }));

  let nearest: NearestPoint | null = null;
  if (locations.length > 0) {
    const best = locations
      .map((location) => ({ location, km: haversineKm(origin.lat, origin.lng, location.lat, location.lng) }))
      .sort((a, b) => a.km - b.km)[0];
    const month = [...best.location.months].reverse().find((m) => hasValues(best.location.byMonth.get(m)!)) ?? null;
    const reading = month ? best.location.byMonth.get(month)! : null;
    nearest = {
      location: best.location,
      km: best.km,
      month,
      do: reading?.do ?? null,
      bod: reading?.bod ?? null,
      waterClass: reading?.class ?? null,
    };
  }

  return {
    origin,
    located,
    nearby,
    withoutReading: nearby.filter((n) => !n.hasReading).length,
    nearest,
  };
}

/** KSPCB's class legend, verbatim (KSPCB August 2026 report, p. 3). Do not reword. */
export const CLASS_LEGEND: { code: string; text: string }[] = [
  { code: 'A', text: 'drinking water after disinfection' },
  { code: 'B', text: 'outdoor bathing' },
  { code: 'C', text: 'drinking water with conventional treatment' },
  { code: 'D', text: 'propagation of wildlife, fisheries' },
  { code: 'E', text: 'irrigation, industrial cooling, controlled waste disposal' },
];

export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
export { formatMonth };
