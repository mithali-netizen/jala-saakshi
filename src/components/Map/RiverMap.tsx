import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { GeoJsonObject } from 'geojson';
import { Maximize2 } from 'lucide-react';
import { GEOJSON_URL, RIVERS_URL } from '../../config';
import type { MonitoringLocation } from '../../utils/stations';
import { LAKES_ATTRIBUTION, type Lake } from '../../services/lakes';
import {
  LAKE_CLASS_COLOUR,
  NO_READING_COLOUR,
  NO_READING_TEXT,
  readingPopupHtml,
  type LakeReadingsFile,
} from '../../services/lakeReadings';
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
  /** Mapped Bengaluru lakes, drawn as their own layer. Null while the file loads. */
  lakes?: Lake[] | null;
  /** July 2026 KSPCB lake readings, keyed by OSM id. */
  lakeReadings?: LakeReadingsFile | null;
  showLakes?: boolean;
  onToggleLakes?: (next: boolean) => void;
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

// ─── Lakes ───────────────────────────────────────────────────────────────────

const LAKE_SELECTED: L.PathOptions = { color: '#0f766e', weight: 3, fillColor: '#0f766e', fillOpacity: 0.55 };

/**
 * Tested lakes take the colour of their class; untested ones stay the grey the legend
 * already uses for "No data". The class letter appears in the popup and the legend, so
 * colour is never the only thing carrying the meaning.
 */
function styleFor(lake: Lake, selected: boolean, readings: LakeReadingsFile | null): L.PathOptions {
  if (selected) return LAKE_SELECTED;
  const reading = readings?.byOsmId[lake.osmId];
  if (reading?.useClass) {
    const c = LAKE_CLASS_COLOUR[reading.useClass];
    return { color: c.stroke, weight: 1.5, fillColor: c.fill, fillOpacity: 0.6 };
  }
  if (lake.featured) return { color: '#be123c', weight: 2, fillColor: '#f43f5e', fillOpacity: 0.5 };
  return { color: NO_READING_COLOUR.stroke, weight: 1, fillColor: NO_READING_COLOUR.fill, fillOpacity: 0.4 };
}

/**
 * Every mapped Bengaluru lake, drawn outside the marker cluster so they are never
 * folded into a station count. None of them carries a reading in this series, and the
 * layer says so on each one rather than leaving them blank.
 */
const LAKES_ATTRIBUTION_HTML = `Lakes: ${LAKES_ATTRIBUTION}`;

function LakesLayer({
  lakes,
  readings,
  visible,
  selectedId,
  onSelect,
}: {
  lakes: Lake[] | null;
  readings: LakeReadingsFile | null;
  visible: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const live = useRef({ onSelect });
  live.current = { onSelect };
  const shapesRef = useRef(new Map<string, L.Polygon>());

  useEffect(() => {
    if (!visible || !lakes) return;
    // Canvas rendering comes from the map's preferCanvas option; clicks still work.
    const group = L.layerGroup().addTo(map);
    const shapes = shapesRef.current;

    for (const lake of lakes) {
      const reading = readings?.byOsmId[lake.osmId];
      const shape = L.polygon(lake.rings, styleFor(lake, lake.id === selectedId, readings))
        .bindTooltip(
          reading
            ? `<strong>${esc(lake.name)}</strong><br/>Class ${esc(reading.useClass ?? '—')} · KSPCB, July 2026`
            : `<strong>${esc(lake.name)}</strong><br/>${NO_READING_TEXT}`,
          { direction: 'top', sticky: true },
        )
        // No popup here: clicking opens the detail panel, and two surfaces describing the
        // same lake is how they came to disagree in the first place.
        .on('click', () => live.current.onSelect(lake.id))
        .addTo(group);
      shapes.set(lake.id, shape);
    }

    // Tested lakes we could not place on a polygon, shown where they were sampled.
    for (const r of readings?.unmatched ?? []) {
      const c = r.useClass ? LAKE_CLASS_COLOUR[r.useClass] : NO_READING_COLOUR;
      L.circleMarker([r.lat, r.lng], { radius: 6, color: '#fff', weight: 2, fillColor: c.stroke, fillOpacity: 1 })
        .bindTooltip(`<strong>${esc(r.kspcbName)}</strong><br/>Tested, not matched to a mapped lake`, {
          direction: 'top',
        })
        .bindPopup(readingPopupHtml(r.kspcbName, r))
        .addTo(group);
    }

    // The lake geometry is OpenStreetMap's, so credit it while the layer is shown.
    map.attributionControl.addAttribution(LAKES_ATTRIBUTION_HTML);

    return () => {
      map.attributionControl.removeAttribution(LAKES_ATTRIBUTION_HTML);
      map.removeLayer(group);
      shapes.clear();
    };
  }, [lakes, readings, visible, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restyle on selection rather than rebuilding 340 polygons.
  useEffect(() => {
    if (!lakes) return;
    for (const lake of lakes) {
      shapesRef.current.get(lake.id)?.setStyle(styleFor(lake, lake.id === selectedId, readings));
    }
  }, [selectedId, lakes, readings]);

  return null;
}

/** Name label for the featured lake, so it is findable without hunting. */
function FeaturedLakePin({ lake, visible, onSelect }: { lake: Lake | null; visible: boolean; onSelect: (id: string) => void }) {
  const map = useMap();
  const live = useRef({ onSelect });
  live.current = { onSelect };

  useEffect(() => {
    if (!visible || !lake) return;
    const marker = L.marker([lake.lat, lake.lng], {
      icon: L.divIcon({
        className: 'wb-pin-wrap',
        html: `<div class="wb-pin"><span class="wb-pin-dot"></span>${esc(lake.name)}
                 <small>Doddagubbi Lake</small></div>`,
        iconSize: [0, 0],
      }),
      zIndexOffset: 1000,
    })
      .on('click', () => live.current.onSelect(lake.id))
      .addTo(map);
    return () => {
      map.removeLayer(marker);
    };
  }, [lake, visible, map]);

  return null;
}

/** Re-fits the view whenever the dashboard asks for a different extent. */
function FitController({ bounds }: { bounds: L.LatLngBoundsExpression | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.flyToBounds(bounds, { padding: [32, 32], maxZoom: 14, duration: 0.6 });
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
        preferCanvas
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
        <LakesLayer
          lakes={props.lakes ?? null}
          readings={props.lakeReadings ?? null}
          visible={props.showLakes ?? false}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
        />
        <FeaturedLakePin
          lake={props.lakes?.find((l) => l.featured) ?? null}
          visible={props.showLakes ?? false}
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
        <label
          className={`inline-flex h-8 select-none items-center gap-2 rounded-lg border border-slate-300 bg-white/95 px-2.5 text-xs font-medium text-slate-700 shadow-xs backdrop-blur ${
            props.lakes ? 'cursor-pointer' : 'cursor-wait opacity-60'
          }`}
        >
          <input
            type="checkbox"
            checked={props.showLakes ?? false}
            disabled={!props.lakes}
            onChange={(e) => props.onToggleLakes?.(e.target.checked)}
            className="h-3.5 w-3.5 accent-slate-700"
          />
          {props.lakes ? `Bengaluru lakes (${props.lakes.length})` : 'Loading lakes…'}
        </label>

        <p className="text-[10px] text-slate-400 leading-snug max-w-[165px] mt-0.5 border-t border-slate-100 pt-1.5">
          Water-quality readings currently cover{' '}
          <span className="font-semibold text-slate-500">Karnataka only.</span>
        </p>
      </div>

      {/* ── Legend — bottom-left overlay ──────────────────────────────── */}
      <div
        className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm
                   p-3 rounded-xl shadow-md border border-slate-200 text-xs
                   max-w-xs pointer-events-auto"
      >
        <div className="font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>River stations</span>
          <span className="text-[10px] font-normal text-slate-500 uppercase tracking-wide">
            CPCB Classes
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          Markers display letters and distinct hues for colour-blind accessibility.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(['A', 'B', 'C', 'D', 'E', undefined] as const).map((waterClass) => {
            const config = getClassConfig(waterClass);
            return (
            <div key={config.letter} className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full text-white font-bold flex items-center justify-center text-[10px] shrink-0"
                style={{ background: config.bgHex }}
              >
                {config.letter}
              </span>
              <span className="text-slate-700 text-[11px]">{config.label}</span>
            </div>
            );
          })}
        </div>

        {/* Lake key. The lake layer uses different hues from the station markers on
            purpose: Class D and E are the only two in the lakes report and the station
            palette puts them both in the orange-red range, which is hard to tell apart
            and worse for colour-blind readers. The letter is always shown too. */}
        {props.showLakes && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="mb-1 flex items-center justify-between font-semibold text-slate-800">
              <span>Lakes</span>
              <span className="text-[10px] font-normal uppercase tracking-wide text-slate-500">KSPCB, Jul 2026</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(['D', 'E'] as const).map((c) => (
                <span key={c} className="flex items-center gap-1.5">
                  <i
                    className="inline-block h-3 w-4 rounded-sm"
                    style={{ background: LAKE_CLASS_COLOUR[c].fill, border: `1.5px solid ${LAKE_CLASS_COLOUR[c].stroke}` }}
                  />
                  <span className="text-[11px] text-slate-700">Class {c}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <i
                  className="inline-block h-3 w-4 rounded-sm"
                  style={{ background: NO_READING_COLOUR.fill, border: `1.5px solid ${NO_READING_COLOUR.stroke}` }}
                />
                <span className="text-[11px] text-slate-700">Not tested</span>
              </span>
            </div>
          </div>
        )}

        {/* River-line key */}
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-7 border-t-2 border-slate-400 opacity-60" />
            <span className="text-[11px] text-slate-600">India rivers (background)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 border-t-[4px] border-sky-500 rounded" />
            <span className="text-[11px] text-slate-600">Monitoring rivers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
