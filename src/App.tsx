import React, { useMemo, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, BookOpen, Droplet, Filter, LayoutDashboard, RefreshCw, Smartphone } from 'lucide-react';
import { useData } from './context/DataContext';
import { RiverMap } from './components/Map/RiverMap';
import { MonthSelector } from './components/Timeline/MonthSelector';
import { StationPanel } from './components/StationPanel/StationPanel';
import { SummaryStrip } from './components/Summary/SummaryStrip';
import { KpiRow, type Focus } from './components/Dashboard/KpiRow';
import { WaterBodyPanel } from './components/Detail/WaterBodyPanel';
import { LakePanel } from './components/Detail/LakePanel';
import { complaintRows, openComplaints } from './services/tracker';
import { APP_NAME, APP_TAGLINE } from './brand';

export { APP_NAME };

const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />
);

/** Karnataka, the Bengaluru district, and a close view where individual lakes read. */
const KARNATAKA = L.latLngBounds(L.latLng(11.5, 74.0), L.latLng(18.5, 78.6));
const BENGALURU = L.latLngBounds(L.latLng(12.7, 77.2), L.latLng(13.35, 77.95));
const LAKES_VIEW = L.latLngBounds(L.latLng(12.9, 77.55), L.latLng(13.11, 77.76));

export const App: React.FC = () => {
  const { locations: allLocations, months, stats, selectedMonth, setSelectedMonth, isLoading, error, reload, lakes } =
    useData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [riverFilter, setRiverFilter] = useState('all');
  const [focus, setFocus] = useState<Focus>('points');
  const [showLakes, setShowLakes] = useState(true);

  const rivers = useMemo(() => [...new Set(allLocations.map((l) => l.river))].sort(), [allLocations]);

  /** River dropdown first, then the KPI tile currently held down. */
  const locations = useMemo(() => {
    const byRiver = riverFilter === 'all' ? allLocations : allLocations.filter((l) => l.river === riverFilter);
    if (focus !== 'bengaluru') return byRiver;
    return byRiver.filter((l) =>
      [...l.byMonth.values()].some((r) => /bengaluru|bangalore/i.test(r.district ?? '')),
    );
  }, [allLocations, riverFilter, focus]);

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedId) ?? null,
    [locations, selectedId],
  );
  const selectedLake = useMemo(() => lakes?.find((l) => l.id === selectedId) ?? null, [lakes, selectedId]);
  const panelOpen = !!selectedLocation || !!selectedLake;

  const complaints = useMemo(() => complaintRows(), []);
  const openCount = useMemo(() => openComplaints(complaints).length, [complaints]);

  // The gap layer is the point of the lakes and complaints views, so it leads there.
  const gapFocus = focus === 'lakes' || focus === 'complaints';
  // Lakes are a few hundred metres across, so their view has to be close enough to read.
  const fitTo = useMemo(
    () => (gapFocus ? LAKES_VIEW : focus === 'bengaluru' ? BENGALURU : KARNATAKA),
    [gapFocus, focus],
  );

  const handleFocus = (next: Focus) => {
    setFocus(next);
    setSelectedId(null);
    if (next === 'lakes' || next === 'complaints' || next === 'bengaluru') setShowLakes(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="shell shell-wide flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <a href="#/" className="flex items-center gap-2.5 no-underline" aria-label={`${APP_NAME} home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.6rem_0.6rem_0.6rem_0.15rem] bg-teal-700 text-white">
              <Droplet className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
              <p className="text-[11px] text-slate-500">{APP_TAGLINE}</p>
            </div>
          </a>

          {months.length > 0 && (
            <div className="order-last w-full border-t border-slate-100 pt-2 lg:order-none lg:w-auto lg:border-0 lg:pt-0">
              <MonthSelector
                variant="bar"
                months={months}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
              />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {rivers.length > 1 && (
              <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <select
                  value={riverFilter}
                  onChange={(e) => {
                    setRiverFilter(e.target.value);
                    setSelectedId(null);
                  }}
                  aria-label="Filter by river"
                  className="max-w-[9rem] cursor-pointer bg-transparent font-medium text-slate-800 focus:outline-none"
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
            <a
              href="#/story"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:flex"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> The case
            </a>
            <a
              href="#/app"
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 sm:flex"
            >
              <Smartphone className="h-3.5 w-3.5" aria-hidden /> Mobile app
            </a>
            <a
              href="#/authority"
              className="hidden h-8 items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 text-xs font-semibold text-white hover:bg-teal-800 sm:flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden /> Authority portal
            </a>
            <button
              type="button"
              onClick={reload}
              title="Refresh data"
              aria-label="Refresh data"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="shell shell-wide flex flex-1 flex-col gap-4 py-5">
        {isLoading && (
          <>
            <Skeleton className="h-[92px]" />
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
            <KpiRow
              stats={stats}
              focus={focus}
              onFocus={handleFocus}
              listed={stats.listedIn(selectedMonth)}
              sampled={stats.sampledIn(selectedMonth)}
              openComplaints={openCount}
              selectedMonth={selectedMonth}
            />

            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
              <div className="relative h-[56vh] min-h-[420px] lg:h-auto lg:min-h-[520px]">
                <RiverMap
                  locations={locations}
                  selectedMonth={selectedMonth}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  panelOpen={panelOpen}
                  lakes={lakes}
                  showLakes={showLakes}
                  onToggleLakes={setShowLakes}
                  dimStations={gapFocus}
                  fitTo={fitTo}
                />
                {panelOpen && (
                  <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[500] flex max-h-[62%] lg:inset-x-auto lg:bottom-3 lg:right-3 lg:top-3 lg:max-h-none lg:w-[400px]">
                    <div className="pointer-events-auto flex max-h-full w-full">
                      {selectedLocation ? (
                        <StationPanel
                          key={selectedLocation.id}
                          location={selectedLocation}
                          selectedMonth={selectedMonth}
                          onClose={() => setSelectedId(null)}
                        />
                      ) : (
                        selectedLake &&
                        (selectedLake.featured ? (
                          <WaterBodyPanel
                            body={{
                              id: selectedLake.id,
                              name: selectedLake.name,
                              lat: selectedLake.lat,
                              lng: selectedLake.lng,
                              status: "Not in KSPCB's monthly river reports",
                            }}
                            stats={stats}
                            onClose={() => setSelectedId(null)}
                          />
                        ) : (
                          <LakePanel
                            lake={selectedLake}
                            locations={allLocations}
                            onClose={() => setSelectedId(null)}
                            onReport={(l) => {
                              window.location.hash = `#/app/report?lake=${encodeURIComponent(l.id)}`;
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex flex-col gap-4" aria-label="Month summary">
                <SummaryStrip
                  show="classes"
                  stats={stats}
                  locations={locations}
                  months={months}
                  selectedMonth={selectedMonth}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <SummaryStrip
                  show="worst"
                  stats={stats}
                  locations={locations}
                  months={months}
                  selectedMonth={selectedMonth}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="mt-2 border-t border-slate-200 bg-white py-3.5 text-[11px] text-slate-500">
        <div className="shell shell-wide">
          KSPCB monthly water quality reports, point-in-time samples. Only months with data are shown. Anything marked
          Demo is seeded and not from that dataset.
        </div>
      </footer>
    </div>
  );
};

export default App;
