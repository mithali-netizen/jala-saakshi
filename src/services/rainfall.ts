import { DODDAGUBBI } from "./doddagubbi";

export interface RainDay {
  date: string; // YYYY-MM-DD
  mm: number;
}

export interface RainResult {
  days: RainDay[];
  /** Grid cell Open-Meteo actually used. */
  gridLat: number;
  gridLng: number;
  fetchedAt: string;
  fromCache: boolean;
}

const CACHE_KEY = "jala-rain-v1";

export const RAIN_START = "2026-09-01";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Open-Meteo historical weather API: free, no key. It is gridded reanalysis, not a rain gauge.
 * Swap this function to change source; components only see RainResult.
 */
export async function getRainfall(): Promise<RainResult> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const end = iso(yesterday);
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${DODDAGUBBI.lat.toFixed(4)}&longitude=${DODDAGUBBI.lng.toFixed(4)}` +
    `&start_date=${RAIN_START}&end_date=${end}&daily=precipitation_sum&timezone=Asia%2FKolkata`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
    const j = await res.json();
    const times: string[] = j.daily.time;
    const vals: (number | null)[] = j.daily.precipitation_sum;
    const days = times
      .map((date, i) => ({ date, mm: vals[i] }))
      .filter((d): d is RainDay => typeof d.mm === "number");
    const out: RainResult = {
      days,
      gridLat: j.latitude,
      gridLng: j.longitude,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(out));
    } catch {
      /* storage unavailable */
    }
    return out;
  } catch (err) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return { ...(JSON.parse(cached) as RainResult), fromCache: true };
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/** The stated risk rule's rain condition: any day at or above this in the last 3 days. */
export const RAIN_TRIGGER_MM = 20;
export const DO_LOW_MG_L = 4;

export function rainRuleMet(days: RainDay[], index: number): boolean {
  return days.slice(Math.max(0, index - 2), index + 1).some((d) => d.mm >= RAIN_TRIGGER_MM);
}
