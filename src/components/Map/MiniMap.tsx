import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useData } from '../../context/DataContext';
import { useReports, type CitizenReport } from '../../services/reportStore';
import { getClassConfig } from '../../utils/waterQuality';
import { formatDay } from '../../utils/dates';
import { LAKES_ATTRIBUTION, type Lake } from '../../services/lakes';
import { NO_READING_TEXT } from '../../services/lakeReadings';
import { hasValues } from '../../utils/stations';

/**
 * The map used inside the phone frame and the authority portal.
 *
 * Same stack as the dashboard: Leaflet with OpenStreetMap tiles. It shows the real lake
 * layer, real citizen reports from this browser, and optionally the KSPCB stations.
 * Seeded demo entities are drawn in a different colour and say "Demo" in their popup, so
 * nothing invented can be mistaken for something observed.
 */

const BENGALURU = L.latLngBounds(L.latLng(12.83, 77.45), L.latLng(13.15, 77.80));

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const LAKE_STYLE: L.PathOptions = { color: '#475569', weight: 1, fillColor: '#64748b', fillOpacity: 0.45 };
const LAKE_FEATURED: L.PathOptions = { color: '#be123c', weight: 2, fillColor: '#f43f5e', fillOpacity: 0.5 };

export interface SeededPin {
  id: string;
  lakeName: string;
  title: string;
  level: string;
}

interface MiniMapProps {
  /** KSPCB river stations, coloured by their latest class. */
  showStations?: boolean;
  /** Seeded incidents, matched to a lake by name and drawn as clearly-marked demo pins. */
  seeded?: SeededPin[];
  onSelectLake?: (lake: Lake) => void;
  className?: string;
}

function reportPopup(r: CitizenReport): string {
  return `<div class="mm-pop">
    ${r.photo ? `<img src="${r.photo}" alt="Photo attached to report ${esc(r.id)}" />` : ''}
    <strong>${esc(r.issues.join(', ') || 'Report')}</strong>
    <span>${esc(r.lakeName)}</span>
    <span>${esc(formatDay(r.date))} · ${esc(r.id)}</span>
    <em class="mm-tag-you">Your report · this browser</em>
  </div>`;
}

export const MiniMap: React.FC<MiniMapProps> = ({ showStations = false, seeded = [], onSelectLake, className = '' }) => {
  const { lakes, locations, selectedMonth } = useData();
  const reports = useReports();
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const live = useRef({ onSelectLake });
  live.current = { onSelectLake };

  // Create the map once.
  useEffect(() => {
    if (!host.current || mapRef.current) return;
    // preferCanvas lets Leaflet own the renderer lifecycle; managing one by hand left
    // pending redraw frames firing against a torn-down map.
    const map = L.map(host.current, { preferCanvas: true, zoomSnap: 0.5, scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.fitBounds(BENGALURU, { padding: [8, 8] });
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(host.current);
    return () => {
      ro.disconnect();
      // Drop the overlay while the map is still alive, then cancel the renderer's pending
      // redraw frame, then tear the map down. Any other order throws on a missing canvas.
      overlayRef.current?.remove();
      overlayRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Redraw everything that can change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    overlayRef.current?.remove();
    const group = L.layerGroup().addTo(map);
    overlayRef.current = group;

    if (lakes) {
      for (const lake of lakes) {
        L.polygon(lake.rings, lake.featured ? LAKE_FEATURED : LAKE_STYLE)
          .bindTooltip(`<strong>${esc(lake.name)}</strong><br/>${NO_READING_TEXT}`, {
            direction: 'top',
            sticky: true,
          })
          .on('click', () => live.current.onSelectLake?.(lake))
          .addTo(group);
      }
      map.attributionControl.addAttribution(`Lakes: ${LAKES_ATTRIBUTION}`);
    }

    if (showStations) {
      for (const l of locations) {
        const month = [...l.months].reverse().find((m) => hasValues(l.byMonth.get(m)!));
        const reading = month ? l.byMonth.get(month)! : null;
        const visual = getClassConfig(reading?.class);
        L.circleMarker([l.lat, l.lng], {
          radius: 5,
          color: '#fff',
          weight: 1.5,
          fillColor: visual.bgHex,
          fillOpacity: 0.95,
        })
          .bindPopup(
            `<div class="mm-pop"><strong>${esc(l.name)}</strong><span>KSPCB monitoring point</span>` +
              `<span>${reading && month ? `${esc(month)}: DO ${reading.do ?? '—'}, BOD ${reading.bod ?? '—'}` : 'No reading recorded'}</span></div>`,
          )
          .addTo(group);
      }
    }

    // Seeded incidents: matched to a real lake by name so they sit somewhere plausible,
    // and drawn amber with a Demo label so they read as examples.
    for (const s of seeded) {
      const lake = lakes?.find((l) => l.name.toLowerCase().includes(s.lakeName.toLowerCase().replace(/ lake$/, '')));
      if (!lake) continue;
      L.marker([lake.lat, lake.lng], {
        icon: L.divIcon({ className: 'mm-pin-wrap', html: `<span class="mm-pin mm-pin-demo"></span>`, iconSize: [16, 16] }),
      })
        .bindPopup(
          `<div class="mm-pop"><strong>${esc(s.title)}</strong><span>${esc(lake.name)}</span>` +
            `<span>${esc(s.level)} · ${esc(s.id)}</span><em class="mm-tag-demo">Seeded demo case</em></div>`,
        )
        .addTo(group);
    }

    for (const r of reports) {
      L.marker([r.lat, r.lng], {
        icon: L.divIcon({ className: 'mm-pin-wrap', html: `<span class="mm-pin mm-pin-you"></span>`, iconSize: [16, 16] }),
        zIndexOffset: 500,
      })
        .bindPopup(reportPopup(r), { maxWidth: 220 })
        .addTo(group);
    }

    // Frame whatever the viewer came to see.
    if (reports.length > 0) {
      map.fitBounds(L.latLngBounds(reports.map((r) => [r.lat, r.lng] as [number, number])).pad(0.6), {
        maxZoom: 13,
        animate: false,
      });
    }

    return () => {
      // React runs this component's cleanups in declaration order, so the map may already
      // be gone. Unwinding layers against a destroyed map schedules a redraw on a
      // renderer with no canvas context, which throws a frame later.
      if (mapRef.current !== map) return;
      map.attributionControl.removeAttribution(`Lakes: ${LAKES_ATTRIBUTION}`);
      group.remove();
    };
  }, [lakes, locations, reports, seeded, showStations, selectedMonth]);

  return <div ref={host} className={className} />;
};
