import React, { useMemo } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { MonitoringLocation } from '../../utils/stations';
import { countByClass, worstStations } from '../../utils/stations';
import { getClassConfig } from '../../utils/waterQuality';
import { formatMonth } from '../../utils/months';
import { Hint } from '../ui/Hint';
import type { Stats } from '../../services/stats';

interface SummaryStripProps {
  stats: Stats;
  locations: MonitoringLocation[];
  months: string[];
  selectedMonth: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TILES = [
  { key: 'A', label: 'Pristine' },
  { key: 'B', label: 'Bathing' },
  { key: 'C', label: 'Treat to drink' },
  { key: 'D', label: 'Fish only' },
  { key: 'E', label: 'Irrigation only' },
  { key: 'none', label: 'No class' },
] as const;

const Delta: React.FC<{ diff: number | null }> = ({ diff }) => {
  if (diff === null) return <span className="text-[11px] text-slate-400">first month</span>;
  if (diff === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
        <Minus className="h-3 w-3" aria-hidden /> no change
      </span>
    );
  const Icon = diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-700">
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(diff)}
      <span className="sr-only">{diff > 0 ? ' more' : ' fewer'} than previous month</span>
    </span>
  );
};

export const SummaryStrip: React.FC<SummaryStripProps> = ({ stats, locations, months, selectedMonth, selectedId, onSelect }) => {
  const idx = months.indexOf(selectedMonth);
  const prevMonth = idx > 0 ? months[idx - 1] : null;

  const counts = useMemo(() => countByClass(locations, selectedMonth), [locations, selectedMonth]);
  const prevCounts = useMemo(() => (prevMonth ? countByClass(locations, prevMonth) : null), [locations, prevMonth]);
  const worst = useMemo(() => worstStations(locations, selectedMonth, 5), [locations, selectedMonth]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <section aria-label="Summary for the month" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {total} of {stats.locations} monitoring points sampled in {formatMonth(selectedMonth)}
          </h2>
          <span className="text-[11px] text-slate-500">{prevMonth ? `change vs ${formatMonth(prevMonth)}` : ''}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {TILES.map(({ key, label }) => {
            const v = getClassConfig(key === 'none' ? null : key);
            return (
              <div key={key} className="rounded-xl border border-slate-200 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: v.bgHex }}
                    aria-hidden
                  >
                    {v.letter}
                  </span>
                  <span className="text-xl font-bold leading-none tabular-nums text-slate-900">{counts[key]}</span>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-600" title={label}>
                  {key === 'none' ? label : `Class ${key}`}
                </div>
                <Delta diff={prevCounts ? counts[key] - prevCounts[key] : null} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="mb-2 text-sm font-bold text-slate-900">
          <Hint text="Ranked by CPCB class first, then by lowest dissolved oxygen." align="left">
            Worst 5 stations
          </Hint>
        </h2>
        {worst.length === 0 ? (
          <p className="text-xs text-slate-500">No classified readings this month.</p>
        ) : (
          <ol className="space-y-0.5">
            {worst.map(({ location, reading }, i) => {
              const v = getClassConfig(reading.class);
              const active = location.id === selectedId;
              return (
                <li key={location.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(location.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                      active ? 'bg-teal-50' : ''
                    }`}
                  >
                    <span className="w-3 text-[11px] text-slate-400 tabular-nums">{i + 1}</span>
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: v.bgHex }}
                      aria-hidden
                    >
                      {v.letter}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800" title={location.name}>
                      {location.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      DO {reading.do ?? '—'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
};
