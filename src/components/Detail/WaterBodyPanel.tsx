import React from 'react';
import { MapPin, X } from 'lucide-react';
import { LAKE_READING, REPORTED_TIMELINE } from '../../services/doddagubbi';
import type { WaterBody } from '../../services/waterBodies';
import type { Stats } from '../../services/stats';
import { daysSince, formatDay } from '../../utils/dates';
import { FIRST_DEAD_FISH } from '../../services/doddagubbi';

/**
 * Detail for a water body with no KSPCB monitoring point.
 *
 * Nothing here comes from the KSPCB dataset, so every figure is tagged with where it does
 * come from. The one number that is ours — the distance to the nearest monitoring point —
 * is computed in src/services/stats.ts like everything else.
 */

const Source: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="shrink-0 rounded border border-slate-300 bg-slate-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-600">
    {children}
  </span>
);

export const WaterBodyPanel: React.FC<{
  body: WaterBody;
  stats: Stats;
  onClose: () => void;
}> = ({ body, stats, onClose }) => (
  <aside
    role="dialog"
    aria-labelledby="wb-panel-title"
    className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-xl"
  >
    <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-rose-50/60 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{body.status}</span>
        </div>
        <h2 id="wb-panel-title" className="mt-0.5 text-base font-bold leading-snug text-slate-900">
          {body.name}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-700"
      >
        <X className="h-5 w-5" />
      </button>
    </header>

    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200 p-2.5">
          <div className="text-xl font-bold leading-none tabular-nums text-slate-900">
            {stats.nearestToDoddagubbi.km.toFixed(1)} <span className="text-xs font-medium text-slate-500">km</span>
          </div>
          <div className="mt-1 text-[11px] leading-snug text-slate-600">
            to the nearest monitoring point, on the {stats.nearestToDoddagubbi.river}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5">
          <div className="text-xl font-bold leading-none tabular-nums text-rose-700">{daysSince(FIRST_DEAD_FISH)}</div>
          <div className="mt-1 text-[11px] leading-snug text-rose-900">
            days since the first dead fish was reported
          </div>
        </div>
      </div>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Reported timeline</h3>
          <Source>News coverage</Source>
        </div>
        <ul className="space-y-1 text-xs text-slate-700">
          {REPORTED_TIMELINE.map((e) => (
            <li key={e.date} className="flex gap-2">
              <b className="w-[4.75rem] shrink-0 tabular-nums text-slate-900">{formatDay(e.date).replace(' 2026', '')}</b>
              <span>{e.what}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {LAKE_READING.month} reading
          </h3>
          <Source>News coverage</Source>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { k: 'Class', v: LAKE_READING.waterClass },
            { k: 'DO', v: `${LAKE_READING.do}` },
            { k: 'BOD', v: `${LAKE_READING.bod}` },
            { k: 'Coliform', v: LAKE_READING.totalColiform.toLocaleString() },
          ].map((m) => (
            <div key={m.k} className="rounded-lg border border-slate-200 px-1 py-1.5">
              <div className="text-sm font-bold tabular-nums text-slate-900">{m.v}</div>
              <div className="text-[10px] text-slate-500">{m.k}</div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          Quoted second-hand; we have not seen the original report. DO in mg/L, BOD in mg/L, coliform in MPN/100 ml.
          Not part of the {stats.locations} monitoring points.
        </p>
      </section>
    </div>
  </aside>
);
