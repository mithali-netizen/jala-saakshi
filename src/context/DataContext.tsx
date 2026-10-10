import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useReadings } from '../hooks/useReadings';
import { buildLocations, monthsWithData, type MonitoringLocation } from '../utils/stations';
import { computeStats, type Stats } from '../services/stats';
import { loadLakes, type Lake } from '../services/lakes';
import type { WaterReading } from '../types/waterData';

/**
 * One fetch, one set of derived figures, shared by every surface.
 *
 * Before this, the dashboard and the story pages each loaded and counted the data for
 * themselves, which is how they came to disagree. Anything that needs a number now takes
 * it from here, and the loader itself (hooks/useReadings) is untouched.
 */
interface DataValue {
  readings: WaterReading[];
  locations: MonitoringLocation[];
  months: string[];
  stats: Stats;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  /** OpenStreetMap lakes; null while the file is still loading or if it failed. */
  lakes: Lake[] | null;
  lakesError: string | null;
}

const DataContext = createContext<DataValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { readings, selectedMonth: requested, setSelectedMonth, isLoading, error, reload } = useReadings();

  // The lake file is large, so it loads alongside rather than blocking the dashboard.
  const [lakes, setLakes] = useState<Lake[] | null>(null);
  const [lakesError, setLakesError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLakes()
      .then((l) => !cancelled && setLakes(l))
      .catch((e: Error) => !cancelled && setLakesError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DataValue>(() => {
    const locations = buildLocations(readings);
    const months = monthsWithData(locations);
    return {
      readings,
      locations,
      months,
      stats: computeStats(readings, locations, lakes?.length ?? null),
      isLoading,
      error,
      reload,
      // Fall back to the latest month whenever the requested one has no data.
      selectedMonth: months.includes(requested) ? requested : (months[months.length - 1] ?? ''),
      setSelectedMonth,
      lakes,
      lakesError,
    };
  }, [readings, requested, setSelectedMonth, isLoading, error, reload, lakes, lakesError]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData(): DataValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
