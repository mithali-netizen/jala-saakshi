import React from 'react';
import { formatMonth } from '../../utils/months';
import type { Stats } from '../../services/stats';
import { OPEN_AFTER_DAYS } from '../../services/tracker';

/** Which tile is active. Drives the map layers and the lists below it. */
export type Focus = 'points' | 'rivers' | 'lakes' | 'bengaluru' | 'complaints';

interface KpiRowProps {
  stats: Stats;
  focus: Focus;
  onFocus: (focus: Focus) => void;
  /** Points listed in the selected month's report. */
  listed: number;
  /** ...of those, the ones with an actual reading. */
  sampled: number;
  openComplaints: number;
  selectedMonth: string;
}

interface Tile {
  key: Focus;
  value: string;
  label: string;
  note: string;
  /** The finding: drawn in red because the number itself is the point. */
  alert?: boolean;
  demo?: boolean;
}

export const KpiRow: React.FC<KpiRowProps> = ({ stats, focus, onFocus, listed, sampled, openComplaints, selectedMonth }) => {
  const tiles: Tile[] = [
    {
      key: 'points',
      value: String(stats.locations),
      label: 'Monitoring points',
      note:
        listed === sampled
          ? `${listed} in the ${formatMonth(selectedMonth)} report`
          : `${listed} in the ${formatMonth(selectedMonth)} report, ${listed - sampled} with no reading`,
    },
    {
      key: 'rivers',
      value: String(stats.rivers),
      label: 'Rivers',
      note: `${stats.stationCodes} station codes, ${stats.months.length} reports`,
    },
    {
      key: 'lakes',
      value: String(stats.lakesInReports),
      label: 'Lakes in KSPCB reports',
      note: 'No station reads as a lake, kere or tank',
      alert: true,
    },
    {
      key: 'bengaluru',
      value: String(stats.bengaluruStations),
      label: 'Bengaluru stations',
      note: `${stats.bengaluruNoReading} with no reading · district given only in ${stats.districtMonths
        .map(formatMonth)
        .join(', ')}`,
    },
    {
      key: 'complaints',
      value: String(openComplaints),
      label: `Complaints open >${OPEN_AFTER_DAYS} days`,
      note: 'Seeded reports, no response recorded',
      demo: true,
    },
  ];

  return (
    <section aria-label="Key figures" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => {
        const active = focus === t.key;
        return (
          <button
            key={t.key}
            type="button"
            aria-pressed={active}
            onClick={() => onFocus(t.key)}
            className={`group rounded-xl border bg-white p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${
              active
                ? 'border-teal-700 ring-1 ring-teal-700'
                : t.alert
                  ? 'border-rose-200 hover:border-rose-300'
                  : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold leading-none tabular-nums ${t.alert ? 'text-rose-700' : 'text-slate-900'}`}
              >
                {t.value}
              </span>
              {t.demo && (
                <span className="rounded border border-amber-300 bg-amber-50 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-800">
                  Demo
                </span>
              )}
            </div>
            <div className={`mt-1 text-xs font-semibold ${t.alert ? 'text-rose-900' : 'text-slate-800'}`}>{t.label}</div>
            <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{t.note}</div>
          </button>
        );
      })}
    </section>
  );
};
