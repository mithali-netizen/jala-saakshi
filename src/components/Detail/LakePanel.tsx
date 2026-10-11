import React, { useMemo } from 'react';
import { Droplet, X } from 'lucide-react';
import type { Lake } from '../../services/lakes';
import type { MonitoringLocation } from '../../utils/stations';
import { hasValues } from '../../utils/stations';
import { formatMonth } from '../../utils/months';
import { LAKE_CLASS_COLOUR, NO_READING_TEXT, type LakeReading } from '../../services/lakeReadings';

/**
 * Any mapped lake other than the featured one.
 *
 * There is nothing to show from the KSPCB monthly series for these, and that absence is
 * the point of the layer — so the panel states it plainly instead of rendering an empty
 * chart or hiding the lake.
 */

function nearest(lake: Lake, locations: MonitoringLocation[]) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const km = (la: number, ln: number) => {
    const h =
      Math.sin(rad(la - lake.lat) / 2) ** 2 +
      Math.cos(rad(lake.lat)) * Math.cos(rad(la)) * Math.sin(rad(ln - lake.lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return locations
    .map((l) => ({ location: l, km: km(l.lat, l.lng) }))
    .sort((a, b) => a.km - b.km)[0];
}

export const LakePanel: React.FC<{
  lake: Lake;
  locations: MonitoringLocation[];
  /** This lake's July 2026 KSPCB reading, when it was one of those tested. */
  lakeReading?: LakeReading | null;
  onClose: () => void;
  onReport: (lake: Lake) => void;
}> = ({ lake, locations, lakeReading, onClose, onReport }) => {
  const near = useMemo(() => nearest(lake, locations), [lake, locations]);
  const lastReal = near && [...near.location.months].reverse().find((m) => hasValues(near.location.byMonth.get(m)!));
  const reading = lastReal ? near.location.byMonth.get(lastReal)! : null;

  return (
    <aside
      role="dialog"
      aria-labelledby="lake-panel-title"
      className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Droplet className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Bengaluru lake · OpenStreetMap</span>
          </div>
          <h2 id="lake-panel-title" className="mt-0.5 text-base font-bold leading-snug text-slate-900">
            {lake.name}
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

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {lakeReading ? (
          <div className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tested July 2026</h3>
              {lakeReading.useClass && (
                <span
                  className="rounded px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ background: LAKE_CLASS_COLOUR[lakeReading.useClass].stroke }}
                >
                  Class {lakeReading.useClass}
                </span>
              )}
            </div>
            <dl className="mt-2 space-y-1 text-xs">
              {[
                ['Dissolved oxygen', lakeReading.do_mg_l, ' mg/L'],
                ['BOD', lakeReading.bod_mg_l, ' mg/L'],
                ['Total coliform', lakeReading.total_coliform, ' MPN/100ml'],
                ['Fecal coliform', lakeReading.fecal_coliform, ' MPN/100ml'],
                ['pH', lakeReading.ph, ''],
              ].map(([label, value, unit]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {value === null || value === undefined ? '—' : `${Number(value).toLocaleString()}${unit}`}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-slate-500">
              KSPCB Bengaluru lakes report, July 2026
              {lakeReading.kspcbName !== lake.name ? ` · listed there as “${lakeReading.kspcbName}”` : ''}. One survey,
              not a monthly series.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
            <div className="text-sm font-bold text-slate-900">{NO_READING_TEXT}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              This lake was not among those tested for that report, and it has no figure in the monthly river series
              either.
            </p>
          </div>
        )}

        {near && (
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Nearest river monitoring point
            </h3>
            <p className="text-sm font-semibold text-slate-900">{near.location.name}</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {near.km.toFixed(1)} km away
              {reading && lastReal ? (
                <>
                  {' · '}
                  {formatMonth(lastReal)}: DO {reading.do ?? '—'} mg/L, BOD {reading.bod ?? '—'} mg/L
                  {reading.class ? `, Class ${reading.class}` : ''}
                </>
              ) : (
                ' · no reading recorded there either'
              )}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
              A reading from a river station several kilometres away does not describe this lake. It is shown for
              context only.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onReport(lake)}
          className="w-full rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Report a problem here
        </button>
      </div>
    </aside>
  );
};
