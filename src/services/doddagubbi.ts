import outlineJson from '../assets/doddagubbi.json';

/**
 * Doddagubbi Lake, Bengaluru — the featured water body.
 *
 * It is NOT in the KSPCB monthly river reports this app loads, so nothing here comes
 * from that dataset. Everything below is either the team's own lake polygon or a figure
 * reported in news coverage, and every screen that shows it must say which.
 */

const ring: number[][] = (outlineJson as { features: { geometry: { coordinates: number[][][] } }[] })
  .features[0].geometry.coordinates[0];

export const DODDAGUBBI = {
  id: 'wb-doddagubbi',
  name: 'Doddagubbi Lake',
  district: 'Bengaluru Urban',
  lat: ring.reduce((s, p) => s + p[1], 0) / ring.length,
  lng: ring.reduce((s, p) => s + p[0], 0) / ring.length,
  /** [lat, lng] pairs for drawing the outline. */
  outline: ring.map((p) => [p[1], p[0]] as [number, number]),
};

/** First dead fish, as reported in news coverage. The tracker counts days from here. */
export const FIRST_DEAD_FISH = '2026-10-01';

/** Dates reported in news coverage. Not in the KSPCB dataset. */
export const REPORTED_TIMELINE: { date: string; what: string }[] = [
  { date: '2026-09-30', what: 'Heavy rain' },
  { date: FIRST_DEAD_FISH, what: 'First dead fish seen' },
  { date: '2026-10-05', what: 'Thousands of dead fish reported' },
];

/** A July 2026 KSPCB reading for the lake, quoted second-hand in news coverage. */
export const NEWS_READING = {
  month: 'July 2026',
  waterClass: 'E' as const,
  do: 3,
  bod: 22,
  totalColiform: 5400,
};
