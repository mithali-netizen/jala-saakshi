import { useEffect, useState, useMemo } from 'react';
import { DATA_URL } from '../config';
import type { WaterReading, StationLocation } from '../types/waterData';

export interface UseReadingsState {
  readings: WaterReading[];
  stations: StationLocation[];
  months: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  isLoading: boolean;
  error: string | null;
  hasRiverOrderMissingWarning: boolean;
  reload: () => void;
}

export function useReadings(): UseReadingsState {
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const reload = () => setReloadTrigger((prev) => prev + 1);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(DATA_URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load water readings (${res.status} ${res.statusText})`);
        }
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        if (!Array.isArray(data)) {
          throw new Error('Data format error: expected an array of water readings');
        }
        setReadings(data as WaterReading[]);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('Error fetching water quality readings:', err);
        setError(err instanceof Error ? err.message : 'Unknown network error loading readings');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [reloadTrigger]);

  // Extract distinct chronological months
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    readings.forEach((r) => {
      if (r.month) monthSet.add(r.month);
    });
    return Array.from(monthSet).sort();
  }, [readings]);

  // Default selectedMonth to the latest month if not set or invalid
  useEffect(() => {
    if (months.length > 0 && (!selectedMonth || !months.includes(selectedMonth))) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  // Check if river_order is missing on any row
  const hasRiverOrderMissingWarning = useMemo(() => {
    if (readings.length === 0) return false;
    const missing = readings.some((r) => r.river_order === undefined || r.river_order === null);
    if (missing) {
      console.warn(
        '[WaterQuality Map] Warning: One or more stations lack "river_order". Flow-based sorting may be inaccurate.'
      );
    }
    return missing;
  }, [readings]);

  // Extract unique stations, sorted by river_order (if present)
  const stations = useMemo(() => {
    const stationMap = new Map<string, StationLocation>();

    readings.forEach((r) => {
      if (!stationMap.has(r.station_code)) {
        stationMap.set(r.station_code, {
          station_code: r.station_code,
          station_name: r.station_name,
          river: r.river,
          lat: r.lat,
          lng: r.lng,
          river_order: r.river_order,
        });
      } else if (r.river_order !== undefined && stationMap.get(r.station_code)?.river_order === undefined) {
        const existing = stationMap.get(r.station_code)!;
        stationMap.set(r.station_code, { ...existing, river_order: r.river_order });
      }
    });

    const list = Array.from(stationMap.values());
    list.sort((a, b) => {
      if (a.river_order !== undefined && b.river_order !== undefined) {
        return a.river_order - b.river_order;
      }
      return a.station_name.localeCompare(b.station_name);
    });

    return list;
  }, [readings]);

  return {
    readings,
    stations,
    months,
    selectedMonth,
    setSelectedMonth,
    isLoading,
    error,
    hasRiverOrderMissingWarning,
    reload,
  };
}
