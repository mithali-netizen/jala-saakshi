export type WaterClass = "A" | "B" | "C" | "D" | "E" | null;

/** One row of tiramisu/public/data/readings.json (do not change how it is parsed). */
export interface Reading {
  station_name: string;
  station_code: string;
  river: string;
  month: string; // YYYY-MM
  class: WaterClass;
  do: number | null;
  bod: number | null;
  total_coliform: number | null;
  fecal_coliform: number | null;
  lat: number;
  lng: number;
  river_order?: number;
  status?: "ok" | "no_access" | "missing";
  note?: string;
  district?: string;
  stretch?: string;
  lab?: string;
}

export interface MonitoringLocation {
  id: string;
  name: string;
  river: string;
  lat: number;
  lng: number;
  riverOrder: number | null;
  codes: string[];
  byMonth: Map<string, Reading>;
  /** Months with a row, ascending. */
  months: string[];
}

export interface GapFacts {
  locations: number;
  stationCodes: number;
  rivers: number;
  lakeLocations: number;
  firstMonth: string;
  lastMonth: string;
  reportsMonths: number;
  bengaluruStations: number;
  bengaluruNoReading: number;
  nearest: { name: string; river: string; km: number };
}

export interface DaysRow {
  id: string;
  kind: "unmonitored" | "citizen";
  what: string;
  detail: string;
  /** ISO date the clock started. */
  since: string;
  status: string;
  demo: boolean;
}
