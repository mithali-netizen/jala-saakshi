import React, { useMemo, useState } from 'react';
import { AlertTriangle, Droplet, Filter, LayoutDashboard, RefreshCw, Smartphone } from 'lucide-react';
import { useReadings } from './hooks/useReadings';
import { RiverMap } from './components/Map/RiverMap';
import { MonthSelector } from './components/Timeline/MonthSelector';
import { StationPanel } from './components/StationPanel/StationPanel';
import { SummaryStrip } from './components/Summary/SummaryStrip';
import { buildLocations, monthsWithData } from './utils/stations';
import { computeStats } from './services/stats';
import { APP_NAME } from './brand';
import { formatMonth } from './utils/months';

export { APP_NAME };

const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />
);

export const App: React.FC = () => {
  const { readings, selectedMonth: requestedMonth, setSelectedMonth, isLoading, error, reload } = useReadings();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [riverFilter, setRiverFilter] = useState('all');

  const allLocations = useMemo(() => buildLocations(readings), [readings]);
  const months = useMemo(() => monthsWithData(allLocations), [allLocations]);
  // Every figure on screen comes from here — see src/services/stats.ts.
  const stats = useMemo(() => computeStats(readings, allLocations), [readings, allLocations]);
  const selectedMonth = months.includes(requestedMonth) ? requestedMonth : (months[months.length - 1] ?? '');

  const rivers = useMemo(() => [...new Set(allLocations.map((l) => l.river))].sort(), [allLocations]);
  const locations = useMemo(
    () => (riverFilter === 'all' ? allLocations : allLocations.filter((l) => l.river === riverFilter)),
    [allLocations, riverFilter],
  );
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[0.7rem_0.7rem_0.7rem_0.2rem] bg-teal-700 text-white">
              <Droplet className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight tracking-tight text-slate-900">{APP_NAME}</h1>
              <p className="text-xs text-slate-500">Karnataka water quality: KSPCB monitoring data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#/app"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-50 sm:flex"
            >
              <Smartphone className="h-3.5 w-3.5" aria-hidden /> Mobile app
            </a>
            <a
              href="#/authority"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 sm:flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden /> Authority portal
            </a>
            {rivers.length > 1 && (
              <label className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <select
                  value={riverFilter}
                  onChange={(e) => {
                    setRiverFilter(e.target.value);
                    setSelectedId(null);
                  }}
                  aria-label="Filter by river"
                  className="cursor-pointer bg-transparent font-medium text-slate-800 focus:outline-none"
                >
                  <option value="all">All rivers ({rivers.length})</option>
                  {rivers.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={reload}
              title="Refresh data"
              aria-label="Refresh data"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 sm:px-6">
        {isLoading && (
          <>
            <Skeleton className="h-[148px]" />
            <Skeleton className="h-[132px]" />
            <Skeleton className="h-[60vh] min-h-[460px]" />
          </>
        )}

        {!isLoading && error && (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-white p-8 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-rose-600" />
            <h2 className="text-base font-semibold text-slate-900">Could not load water quality readings</h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        )}

        {!isLoading && !error && months.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            No monitoring data found.
          </div>
        )}

        {!isLoading && !error && months.length > 0 && (
          <>
            <MonthSelector months={months} selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

            <SummaryStrip
              stats={stats}
              locations={locations}
              months={months}
              selectedMonth={selectedMonth}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="relative h-[68vh] min-h-[480px]">
              <RiverMap
                locations={locations}
                selectedMonth={selectedMonth}
                selectedId={selectedLocation?.id ?? null}
                onSelect={setSelectedId}
                panelOpen={!!selectedLocation}
              />
              {selectedLocation && (
                <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[500] flex max-h-[62%] lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:max-h-none lg:w-[420px]">
                  <div className="pointer-events-auto flex max-h-full w-full">
                    <StationPanel
                      key={selectedLocation.id}
                      location={selectedLocation}
                      selectedMonth={selectedMonth}
                      onClose={() => setSelectedId(null)}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <span className="font-semibold text-slate-700">About this data:</span> KSPCB monthly water quality reports
          {months.length > 0 && `, ${formatMonth(months[0])} to ${formatMonth(months[months.length - 1])}`}. Readings are
          point-in-time samples, and only months with data are shown.
        </div>
      </footer>
    </div>
  );
};

export default App;
