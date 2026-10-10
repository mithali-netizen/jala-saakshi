import React, { useMemo } from 'react';
import { Droplet, X } from 'lucide-react';
import type { Lake } from '../../services/lakes';
import type { MonitoringLocation } from '../../utils/stations';
import { hasValues } from '../../utils/stations';
import { formatMonth } from '../../utils/months';

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
  onClose: () => void;
  onReport: (lake: Lake) => void;
}> = ({ lake, locations, onClose, onReport }) => {
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
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
          <div className="text-sm font-bold text-slate-900">No reading in KSPCB's monthly river reports</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            This lake has no dissolved oxygen, BOD or coliform figure in the series this dashboard reads. That is true
            of every mapped lake here, not just this one.
          </p>
        </div>

        {near && (
          <div>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Nearest monitoring point</h3>
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
