import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ArrowRight, Megaphone, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { LAKES_ATTRIBUTION } from '../services/lakes';
import { DODDAGUBBI, FIRST_DEAD_FISH, NEWS_READING } from '../services/doddagubbi';
import { formatDay } from '../utils/dates';
import { useGeotag } from '../services/geotag';
import {
  BENGALURU_CENTRE,
  CLASS_LEGEND,
  NEARBY_RADIUS_KM,
  computeFacts,
  formatKm,
  formatMonth,
  type TourFacts,
} from './steps';

/**
 * A guided tour of what the published data does and does not say about the lakes near
 * someone. Seven steps, every figure worked out at runtime, every outside fact carrying
 * its source on the card.
 */

const STEP_COUNT = 7;

interface Step {
  title: string;
  body: React.ReactNode;
  source?: string;
}

export default function NearMeStory() {
  const { lakes, locations, stats, isLoading } = useData();
  const geo = useGeotag();
  const [step, setStep] = useState(0);

  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Device fix when we have one; otherwise the city centre, said plainly on the card.
  const origin = geo.fix ? { lat: geo.fix.lat, lng: geo.fix.lng } : BENGALURU_CENTRE;
  const located = !!geo.fix;
  const settled = geo.status === 'done' || geo.status === 'unavailable';

  const facts: TourFacts | null = useMemo(
    () => (lakes && locations.length > 0 ? computeFacts(origin, located, lakes, locations) : null),
    // origin is derived from geo.fix, so that is the real dependency
    [lakes, locations, geo.fix, located, origin],
  );

  // ── map ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const map = L.map(host.current, { preferCanvas: true, zoomControl: false, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    map.setView([BENGALURU_CENTRE.lat, BENGALURU_CENTRE.lng], 12);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(host.current);
    return () => {
      ro.disconnect();
      layerRef.current?.remove();
      layerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Redraw for the current step.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !facts) return;
    layerRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    const youIcon = L.divIcon({
      className: 'nm-you-wrap',
      html: '<span class="nm-you"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const you = () => L.marker([facts.origin.lat, facts.origin.lng], { icon: youIcon }).addTo(group);

    const drawNearby = (dim: boolean) => {
      for (const n of facts.nearby) {
        L.polygon(n.lake.rings, {
          color: n.hasReading ? '#0f766e' : '#475569',
          weight: 1.5,
          fillColor: n.hasReading ? '#14b8a6' : '#64748b',
          fillOpacity: dim ? 0.3 : 0.5,
        })
          .bindTooltip(`<strong>${n.lake.name}</strong><br/>${formatKm(n.km)} away`, { direction: 'top' })
          .addTo(group);
      }
      map.attributionControl.addAttribution(`Lakes: ${LAKES_ATTRIBUTION}`);
    };

    const fitNearby = () => {
      const pts: [number, number][] = [
        [facts.origin.lat, facts.origin.lng],
        ...facts.nearby.map((n) => [n.lake.lat, n.lake.lng] as [number, number]),
      ];
      map.flyToBounds(L.latLngBounds(pts).pad(0.25), { duration: 1.1, maxZoom: 14 });
    };

    switch (step) {
      case 0:
        you();
        map.flyTo([facts.origin.lat, facts.origin.lng], 14, { duration: 1.1 });
        break;
      case 1:
      case 2:
        you();
        drawNearby(step === 2);
        fitNearby();
        break;
      case 3: {
        you();
        drawNearby(true);
        if (facts.nearest) {
          const to: [number, number] = [facts.nearest.location.lat, facts.nearest.location.lng];
          L.polyline([[facts.origin.lat, facts.origin.lng], to], {
            color: '#be123c',
            weight: 3,
            dashArray: '8 6',
          }).addTo(group);
          L.circleMarker(to, { radius: 7, color: '#fff', weight: 2, fillColor: '#be123c', fillOpacity: 1 })
            .bindTooltip(`<strong>${facts.nearest.location.name}</strong>`, { direction: 'top' })
            .addTo(group);
          map.flyToBounds(L.latLngBounds([[facts.origin.lat, facts.origin.lng], to]).pad(0.3), { duration: 1.2 });
        }
        break;
      }
      case 4:
        you();
        drawNearby(true);
        break;
      case 5:
      case 6:
        L.polygon(DODDAGUBBI.outline, {
          color: '#be123c',
          weight: 2.5,
          fillColor: '#f43f5e',
          fillOpacity: 0.45,
        }).addTo(group);
        map.flyTo([DODDAGUBBI.lat, DODDAGUBBI.lng], 15, { duration: 1.3 });
        break;
    }

    return () => {
      map.attributionControl.removeAttribution(`Lakes: ${LAKES_ATTRIBUTION}`);
      if (mapRef.current === map) group.remove();
    };
  }, [step, facts]);

  // ── keyboard ───────────────────────────────────────────────────────────────
  const go = useCallback((delta: number) => setStep((s) => Math.min(STEP_COUNT - 1, Math.max(0, s + delta))), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // ── copy ───────────────────────────────────────────────────────────────────
  const steps: Step[] = useMemo(() => {
    if (!facts) return [];
    const n = facts.nearby.length;
    const list = facts.nearby.slice(0, 4).map((x) => `${x.lake.name} (${formatKm(x.km)})`).join(', ');
    const nearest = facts.nearest;

    return [
      {
        title: facts.located ? 'You are here' : 'Starting from central Bengaluru',
        body: facts.located ? (
          <>
            This is where your browser places you. Everything that follows is measured from this point. Nothing about
            your location leaves this page.
          </>
        ) : (
          <>
            Your location was not available, so this starts from the centre of Bengaluru ({BENGALURU_CENTRE.lat},{' '}
            {BENGALURU_CENTRE.lng}). Allow location and reload to centre it on you.
          </>
        ),
      },
      {
        title: n === 0 ? `No mapped lakes within ${NEARBY_RADIUS_KM} km` : `${n} lake${n === 1 ? '' : 's'} within ${NEARBY_RADIUS_KM} km`,
        body:
          n === 0 ? (
            <>No water body in the OpenStreetMap lake layer falls within {NEARBY_RADIUS_KM} km of this point.</>
          ) : (
            <>
              The closest {n === 1 ? 'is' : 'are'} {list}
              {n > 4 ? `, and ${n - 4} more` : ''}. Shapes and names come from OpenStreetMap.
            </>
          ),
        source: 'Lake shapes: OpenStreetMap contributors',
      },
      {
        title:
          facts.withoutReading === n
            ? `None of these ${n === 1 ? 'has' : 'have'} a reading`
            : `${facts.withoutReading} of ${n} have no reading`,
        body: (
          <>
            KSPCB's monthly series covers {stats.locations} river monitoring points. We counted how many of the lakes
            near you have a monitoring point close enough to be measuring them: {n - facts.withoutReading}. Across the
            whole city, {stats.lakesMapped ?? '—'} lakes are mapped and {stats.lakesInReports} appear in that series.
          </>
        ),
        source: 'Our extraction of KSPCB monthly river reports',
      },
      {
        title: nearest ? `Nearest monitoring point: ${formatKm(nearest.km)} away` : 'No monitoring point found',
        body: nearest ? (
          <>
            The closest point in the published series is {nearest.location.name}, on the {nearest.location.river}.
            {nearest.month ? (
              <>
                {' '}Its {formatMonth(nearest.month)} reading was dissolved oxygen {nearest.do ?? '—'} mg/L and BOD{' '}
                {nearest.bod ?? '—'} mg/L{nearest.waterClass ? `, Class ${nearest.waterClass}` : ''}.
              </>
            ) : (
              <> No reading is recorded there.</>
            )}{' '}
            It measures a river, not any of these lakes. It is the nearest official number, not a number about the
            lakes near you — the two are not connected by anything we can show.
          </>
        ) : (
          <>No monitoring point could be matched.</>
        ),
        source: 'Our extraction of KSPCB monthly river reports',
      },
      {
        title: 'What the Board’s classes mean',
        body: (
          <ul className="mt-1 space-y-1">
            {CLASS_LEGEND.map((c) => (
              <li key={c.code} className={c.code === 'E' ? 'font-semibold text-rose-200' : ''}>
                <b className="inline-block w-6">{c.code}</b> {c.text}
              </li>
            ))}
          </ul>
        ),
        source: 'KSPCB August 2026 report, p. 3, quoted verbatim',
      },
      {
        title: 'Doddagubbi Lake, October 2026',
        body: (
          <>
            Thousands of dead fish were reported at Doddagubbi from {formatDay(FIRST_DEAD_FISH)}. The last readings we
            have for it are from {NEWS_READING.month}, quoted second-hand: Class {NEWS_READING.waterClass}, dissolved
            oxygen {NEWS_READING.do} mg/L, BOD {NEWS_READING.bod} mg/L, coliform{' '}
            {NEWS_READING.totalColiform.toLocaleString()} MPN/100 ml. The lake is not in the monthly series.
          </>
        ),
        source: 'Bangalore Mirror, 5 Oct 2026',
      },
      {
        title: 'Report what you see',
        body: (
          <>
            If something looks wrong at a lake near you — dead fish, froth, a smell — a photo and a date are worth more
            than nothing on record. The report drafts a complaint you send yourself.
          </>
        ),
      },
    ];
  }, [facts, stats]);

  const current = steps[step];
  const reportHref = facts?.nearby[0]
    ? `#/app/report?lake=${encodeURIComponent(facts.nearby[0].lake.id)}`
    : '#/app/report';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">
      <a
        href="#nm-card"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
      >
        Skip to the step text
      </a>

      <div ref={host} className="absolute inset-0" />

      <a
        href="#/"
        className="absolute left-4 top-4 z-[1000] inline-flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-2 text-sm font-semibold text-white no-underline backdrop-blur hover:bg-slate-900"
      >
        <X className="h-4 w-4" aria-hidden /> Close
      </a>

      {(isLoading || !facts || !settled) && (
        <div className="absolute inset-0 z-[900] grid place-items-center bg-slate-900/70">
          <p className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
            {settled ? 'Loading lakes and readings…' : 'Finding your location…'}
          </p>
        </div>
      )}

      {current && (
        <section
          id="nm-card"
          aria-live="polite"
          className="absolute bottom-4 right-4 z-[1000] w-[min(29rem,calc(100vw-2rem))] rounded-2xl border border-teal-500/40 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
            Step {step + 1} of {STEP_COUNT}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug">{current.title}</h2>
          <div className="mt-2 text-sm leading-relaxed text-slate-200">{current.body}</div>
          {current.source && <p className="mt-3 text-[11px] text-slate-400">Source: {current.source}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
            </button>
            {step < STEP_COUNT - 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <a
                href={reportHref}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-500"
              >
                <Megaphone className="h-4 w-4" aria-hidden /> Report a problem
              </a>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Use the left and right arrow keys to move between steps.</p>
        </section>
      )}
    </div>
  );
}
