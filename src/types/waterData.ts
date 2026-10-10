export type WaterClass = 'A' | 'B' | 'C' | 'D' | 'E' | null;
export type StationStatus = 'ok' | 'no_access' | 'missing';

export interface WaterReading {
  station_name: string;
  station_code: string;
  river: string;
  month: string; // "YYYY-MM"
  class: WaterClass;
  do: number | null;
  bod: number | null;
  total_coliform: number | null;
  fecal_coliform: number | null;
  lat: number;
  lng: number;
  river_order?: number;
  status?: StationStatus;
  note?: string;
}

export interface StationLocation {
  station_code: string;
  station_name: string;
  river: string;
  lat: number;
  lng: number;
  river_order?: number;
}
