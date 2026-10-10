import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { GeoJsonObject } from 'geojson';
import { Maximize2 } from 'lucide-react';
import { GEOJSON_URL, RIVERS_URL } from '../../config';
import type { MonitoringLocation } from '../../utils/stations';
import type { WaterBody } from '../../services/waterBodies';
import { getClassConfig } from '../../utils/waterQuality';
import { formatMonth } from '../../utils/months';

/** Whole of Karnataka, so the first view is the state and not the subcontinent. */
const KARNATAKA_BOUNDS = L.latLngBounds(L.latLng(11.5, 74.0), L.latLng(18.5, 78.6));

interface RiverMapProps {
  locations: MonitoringLocation[];
  selectedMonth: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Panel docked over the map; used to keep the selected pin out from under it. */
  panelOpen: boolean;
  /** Water bodies with no KSPCB monitoring point, drawn as their own layer. */
  waterBodies?: WaterBody[];
  showWaterBodies?: boolean;
  onToggleWaterBodies?: (next: boolean) => void;
  /** Dims the station pins so the gap layer reads clearly. */
  dimStations?: boolean;
  /** Fit the view to these bounds when they change. */
  fitTo?: L.LatLngBoundsExpression | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ─── Rivers background (lazy, canvas-rendered) ───────────────────────────────

const RIVER_STYLE: L.PathOptions = { color: '#94a3b8', weight: 1, opacity: 0.55, fillOpacity: 0 };

function NationalRiversLayer({ url, visible }: { url: string; visible: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const startedRef = useRef(false);

  // Fetch the large file only the first time the layer is switched on.
  useEffect(() => {
    if (!visible || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: GeoJsonObject) => {
        if (cancelled) return;
        const layer = L.geoJSON(data, {
          style: RIVER_STYLE,
          renderer: L.canvas({ padding: 0.3 }),
          interactive: false,
        } as L.GeoJSONOptions);
        layerRef.current = layer;
        layer.addTo(map);
        layer.bringToBack();
      })
      .catch((err) => console.warn('[NationalRiversLayer] Failed to load:', err));
    return () => {
      cancelled = true;
      // Strict Mode remount: allow the fetch to run again.
      if (!layerRef.current) startedRef.current = false;
    };
  }, [url, visible, map]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    if (visible && !map.hasLayer(layer)) layer.addTo(map).bringToBack();
    if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
  }, [visible, map]);

  return null;
}

// ─── Station markers (imperative, updated in place) ──────────────────────────

function pinIcon(waterClass: string | null | undefined, selected: boolean) {
  const v = getClassConfig(waterClass as never);
  return L.divIcon({
    className: 'stn-pin-wrap',
    html: `<div class="stn-pin${selected ? ' is-selected' : ''}" style="background:${v.bgHex}">${v.letter}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 32 : n < 30 ? 38 : 44;
  return L.divIcon({
    className: 'stn-cluster-wrap',
    html: `<div class="stn-cluster" style="width:${size}px;height:${size}px">${n}</div>`,
    iconSize: [size, size],
  });
}

function StationsLayer({ locations, selectedMonth, selectedId, onSelect, panelOpen }: RiverMapProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const iconKeyRef = useRef(new Map<string, string>());
  const shownRef = useRef(new Set<string>());

  // Latest values for event handlers, without re-binding them.
  const live = useRef({ locations, selectedMonth, onSelect });
  live.current = { locations, selectedMonth, onSelect };

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 38,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: clusterIcon,
    });
    clusterRef.current = group;
    map.addLayer(group);
    const markers = markersRef.current;
    const iconKeys = iconKeyRef.current;
    const shown = shownRef.current;
    return () => {
      map.removeLayer(group);
      clusterRef.current = null;
      markers.clear();
      iconKeys.clear();
      shown.clear();
    };
  }, [map]);

  // Sync markers with the filter, month and selection. Existing markers are reused;
  // only the ones whose class or selected state changed get a new icon.
  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;
    const markers = markersRef.current;
    const shown = shownRef.current;
    const toAdd: [string, L.Marker][] = [];
    const toRemove: [string, L.Marker][] = [];
    const wanted = new Set<string>();

    for (const loc of locations) {
      const reading = loc.byMonth.get(selectedMonth);
      if (!reading) continue;
      wanted.add(loc.id);

      const cls = reading.class ?? null;
      const selected = loc.id === selectedId;
      const key = `${cls}|${selected}`;

      let marker = markers.get(loc.id);
      if (!marker) {
        marker = L.marker([loc.lat, loc.lng], {
          icon: pinIcon(cls, selected),
          riseOnHover: true,
          keyboard: false,
        });
        marker.bindTooltip(
          () => {
            const l = live.current.locations.find((x) => x.id === loc.id);
            const r = l?.byMonth.get(live.current.selectedMonth);
            const v = getClassConfig(r?.class);
            return `<div class="stn-tip"><strong>${esc(l?.name ?? loc.name)}</strong>
              <span>${esc(l?.river ?? loc.river)} · ${esc(formatMonth(live.current.selectedMonth))}</span>
              <span class="stn-tip-class"><i style="background:${v.bgHex}">${v.letter}</i>${
                r?.class ? `Class ${r.class}` : 'No class recorded'
              }</span></div>`;
          },
          { direction: 'top', offset: [0, -12], opacity: 1, className: 'stn-tooltip' },
        );
        marker.on('click', () => live.current.onSelect(loc.id));
        markers.set(loc.id, marker);
        iconKeyRef.current.set(loc.id, key);
      } else if (iconKeyRef.current.get(loc.id) !== key) {
        marker.setIcon(pinIcon(cls, selected));
        iconKeyRef.current.set(loc.id, key);
      }
      if (!shown.has(loc.id)) toAdd.push([loc.id, marker]);
    }

    for (const id of shown) {
      if (!wanted.has(id)) {
        const m = markers.get(id);
        if (m) toRemove.push([id, m]);
      }
    }
    if (toRemove.length) group.removeLayers(toRemove.map(([, m]) => m));
    if (toAdd.length) group.addLayers(toAdd.map(([, m]) => m));
    toRemove.forEach(([id]) => shown.delete(id));
    toAdd.forEach(([id]) => shown.add(id));
  }, [locations, selectedMonth, selectedId]);

  // Bring the selected pin into view (opening its cluster if needed), clear of the docked panel.
  useEffect(() => {
    if (!selectedId) return;
    const group = clusterRef.current;
    const marker = markersRef.current.get(selectedId);
    if (!group || !marker || !shownRef.current.has(selectedId)) return;
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    const reveal = () => {
      const pad = panelOpen ? (wide ? { right: 440, bottom: 20 } : { right: 20, bottom: map.getSize().y * 0.55 }) : { right: 20, bottom: 20 };
      map.panInside(marker.getLatLng(), {
        paddingTopLeft: [60, 60],
        paddingBottomRight: [pad.right, pad.bottom],
        animate: true,
      });
    };
    group.zoomToShowLayer(marker, reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, map]);

  return null;
}

// ─── Unmonitored water bodies ────────────────────────────────────────────────

/**
 * Drawn outside the marker cluster: these are the gap, so they must never be folded
 * into a station count bubble.
 */
function WaterBodiesLayer({
  bodies,
  visible,
  selectedId,
  onSelect,
}: {
  bodies: WaterBody[];
  visible: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const live = useRef({ onSelect });
  live.current = { onSelect };

  useEffect(() => {
    if (!visible) return;
    const group = L.layerGroup().addTo(map);

    for (const body of bodies) {
      const selected = body.id === selectedId;
      if (body.outline) {
        L.polygon(body.outline, {
          color: '#be123c',
          weight: selected ? 3 : 2,
          fillColor: '#f43f5e',
          fillOpacity: selected ? 0.45 : 0.3,
        })
          .on('click', () => live.current.onSelect(body.id))
          .addTo(group);
      }
      L.marker([body.lat, body.lng], {
        icon: L.divIcon({
          className: 'wb-pin-wrap',
          html: `<div class="wb-pin${selected ? ' is-selected' : ''}">
                   <span class="wb-pin-dot"></span>${esc(body.name)}
                   <small>${esc(body.status)}</small>
                 </div>`,
          iconSize: [0, 0],
        }),
        zIndexOffset: 1000,
      })
        .on('click', () => live.current.onSelect(body.id))
        .addTo(group);
    }

    return () => {
      map.removeLayer(group);
    };
  }, [bodies, visible, selectedId, map]);

  return null;
}

/** Re-fits the view whenever the dashboard asks for a different extent. */
function FitController({ bounds }: { bounds: L.LatLngBoundsExpression | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 11, duration: 0.6 });
  }, [bounds, map]);
  return null;
}

// ─── Container: keeps the map sized correctly when the layout shifts ─────────

function SizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

// ─── Main component ──────────────────────────────────────────────────────────

export const RiverMap: React.FC<RiverMapProps> = (props) => {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [monitoringRivers, setMonitoringRivers] = useState<GeoJsonObject | null>(null);
  const [showAllRivers, setShowAllRivers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((d) => {
        if (!cancelled) setMonitoringRivers(d);
      })
      .catch((e) => console.warn('Monitoring rivers GeoJSON load error:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const fitKarnataka = useCallback(() => {
    mapInstance?.fitBounds(KARNATAKA_BOUNDS, { padding: [12, 12] });
  }, [mapInstance]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs ${
        props.dimStations ? 'dim-stations' : ''
      }`}
    >
      <MapContainer
        ref={setMapInstance}
        bounds={KARNATAKA_BOUNDS}
        boundsOptions={{ padding: [12, 12] }}
        minZoom={5}
        keyboard={false}
        scrollWheelZoom
        zoomSnap={0.5}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <NationalRiversLayer url={RIVERS_URL} visible={showAllRivers} />
        {monitoringRivers && (
          <GeoJSON
            data={monitoringRivers}
            style={{ color: '#4f46e5', weight: 3, opacity: 0.55, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        <StationsLayer {...props} />
        <WaterBodiesLayer
          bodies={props.waterBodies ?? []}
          visible={props.showWaterBodies ?? false}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
        />
        <FitController bounds={props.fitTo} />
        <SizeWatcher />
      </MapContainer>

      {/* Map tools */}
      <div className="absolute left-14 right-3 top-3 z-[400] flex flex-wrap items-center justify-end gap-2 sm:justify-start">
        <button
          type="button"
          onClick={fitKarnataka}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs backdrop-blur hover:bg-white focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Karnataka
        </button>
        <label className="inline-flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs backdrop-blur">
          <input
            type="checkbox"
            checked={showAllRivers}
            onChange={(e) => setShowAllRivers(e.target.checked)}
            className="h-3.5 w-3.5 accent-teal-700"
          />
          River lines
        </label>
        {props.waterBodies && props.waterBodies.length > 0 && (
          <label className="inline-flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border border-rose-200 bg-white/95 px-2.5 text-xs font-medium text-rose-800 shadow-xs backdrop-blur">
            <input
              type="checkbox"
              checked={props.showWaterBodies ?? false}
              onChange={(e) => props.onToggleWaterBodies?.(e.target.checked)}
              className="h-3.5 w-3.5 accent-rose-700"
            />
            Unmonitored water bodies ({props.waterBodies.length})
          </label>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[400] hidden rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xs backdrop-blur sm:block">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">CPCB water class</div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
          {(
            [
              ['A', 'Pristine'],
              ['B', 'Bathing'],
              ['C', 'Treat to drink'],
              ['D', 'Fish only'],
              ['E', 'Irrigation'],
              ['NONE', 'No data'],
            ] as const
          ).map(([k, label]) => {
            const v = getClassConfig(k === 'NONE' ? null : k);
            return (
              <div key={k} className="flex items-center gap-1.5">
                <span
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: v.bgHex }}
                >
                  {v.letter}
                </span>
                <span className="text-slate-700">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
