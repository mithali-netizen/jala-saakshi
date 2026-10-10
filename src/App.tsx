import React, { useState, useMemo } from 'react';
import { useReadings } from './hooks/useReadings';
import { RiverMap } from './components/Map/RiverMap';
import { MonthSelector } from './components/Timeline/MonthSelector';
import { StationPanel } from './components/StationPanel/StationPanel';
import { AlertTriangle, RefreshCw, Filter } from 'lucide-react';

export const App: React.FC = () => {
  const {
    readings,
    stations,
    months,
    selectedMonth,
    setSelectedMonth,
    isLoading,
    error,
    hasRiverOrderMissingWarning,
    reload,
  } = useReadings();

  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);
  const [selectedRiverFilter, setSelectedRiverFilter] = useState<string>('all');

  // Dynamically extract rivers from loaded stations (purely data-driven)
  const availableRivers = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.river) set.add(s.river);
    });
    return Array.from(set).sort();
  }, [stations]);

  // Filter stations if user selects a specific river
  const filteredStations = useMemo(() => {
    if (selectedRiverFilter === 'all') return stations;
    return stations.filter((s) => s.river === selectedRiverFilter);
  }, [stations, selectedRiverFilter]);

  const selectedStation = useMemo(() => {
    if (!selectedStationCode) return null;
    return stations.find((s) => s.station_code === selectedStationCode) || null;
  }, [stations, selectedStationCode]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Header - Clean, professional, no logo image/icon */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                India River Water Quality Explorer
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                National Dashboard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Explore river water quality monitoring readings in plain language for citizens across India
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dynamic River Filter if dataset contains multiple rivers */}
            {availableRivers.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedRiverFilter}
                  onChange={(e) => {
                    setSelectedRiverFilter(e.target.value);
                    setSelectedStationCode(null);
                  }}
                  aria-label="Filter by River"
                  className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Rivers ({availableRivers.length})</option>
                  {availableRivers.map((r) => (
                    <option key={r} value={r}>
                      {r} River
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={reload}
              title="Refresh data"
              aria-label="Refresh data"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Dev Warning Banner if river_order is missing */}
      {hasRiverOrderMissingWarning && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b border-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950" />
          <span>
            <strong>Dev Warning:</strong> One or more station rows in the data file are missing the{' '}
            <code className="bg-amber-400/50 px-1 rounded font-mono">river_order</code> attribute.
            Stations may not follow the strict upstream-to-downstream sequence.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Month Selector Control */}
        <MonthSelector
          months={months}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />

        {/* Dynamic Data-Driven River Basin Banner */}
        {!isLoading && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-3.5 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-950">Active Monitoring Network:</span>
              <span>
                {filteredStations.length} station{filteredStations.length !== 1 ? 's' : ''} loaded
                {availableRivers.length > 0 && ` across ${availableRivers.join(', ')} River`}
              </span>
            </div>
            <div className="text-blue-700 font-medium">
              Click any station pin on the map to review plain-language insights, trends, and citizen action.
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 min-h-[450px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-700">Loading river water quality data...</p>
            <p className="text-xs text-slate-400 mt-1">Runtime fetch from data endpoint</p>
          </div>
        )}

        {/* Friendly Error State */}
        {!isLoading && error && (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-red-200 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Could not load water quality readings
            </h2>
            <p className="text-sm text-slate-600 max-w-md mb-4">
              {error}. Please verify that the data file exists and is accessible.
            </p>
            <button
              onClick={reload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Main Map + Side Panel Grid */}
        {!isLoading && !error && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[560px]">
            {/* Map column */}
            <div
              className={`h-[60vh] lg:h-[70vh] transition-all duration-300 ${
                selectedStation ? 'lg:col-span-7 xl:col-span-7' : 'lg:col-span-12'
              }`}
            >
              <RiverMap
                stations={filteredStations}
                readings={readings}
                selectedMonth={selectedMonth}
                selectedStationCode={selectedStationCode}
                onSelectStation={(code) => setSelectedStationCode(code)}
              />
            </div>

            {/* Desktop Side Panel / Mobile Bottom Sheet */}
            {selectedStation && (
              <div className="lg:col-span-5 xl:col-span-5 lg:h-[70vh] flex flex-col">
                <StationPanel
                  station={selectedStation}
                  allStations={filteredStations}
                  readings={readings}
                  months={months}
                  selectedMonth={selectedMonth}
                  onClose={() => setSelectedStationCode(null)}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* About this data footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-700">About this data:</span> Source is CPCB and State Pollution Control Board monthly water quality monitoring reports
            {months.length > 0 && ` (${months[0]} to ${months[months.length - 1]})`}. Readings are point-in-time samples.
          </div>
          <div className="text-[11px] text-slate-400">
            National Environmental Hackathon • Citizen Science
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
