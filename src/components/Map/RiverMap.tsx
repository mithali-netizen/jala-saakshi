import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import { GEOJSON_URL, RIVERS_URL } from '../../config';
import type { WaterReading, StationLocation } from '../../types/waterData';
import { getClassConfig } from '../../utils/waterQuality';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Leaflet LatLngBounds covering all of India */
const INDIA_BOUNDS = L.latLngBounds(
  L.latLng(6.5, 68.0),
  L.latLng(37.5, 97.5),
);

/** Snug bounds around the Karnataka monitoring cluster */
const KARNATAKA_BOUNDS = L.latLngBounds(
  L.latLng(11.5, 75.5),
  L.latLng(15.5, 78.5),
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiverMapProps {
  stations: StationLocation[];
  readings: WaterReading[];
  selectedMonth: string;
  selectedStationCode?: string | null;
  onSelectStation?: (stationCode: string) => void;
}

// ─── MapController: initial India view + fly-to-station ──────────────────────

/**
 * Sets the initial map view to all of India.
 * When selectedStationCode changes, flies first to the Karnataka cluster
 * then zooms to the individual station.
 */
function MapController({
  stations,
  selectedStationCode,
}: {
  stations: StationLocation[];
  selectedStationCode?: string | null;
}) {
  const map = useMap();

  // First mount: show all of India
  useEffect(() => {
    map.fitBounds(INDIA_BOUNDS, { animate: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Station selected → fly to Karnataka, then zoom to the station pin
  useEffect(() => {
    if (!selectedStationCode) return;
    const station = stations.find((s) => s.station_code === selectedStationCode);
    if (!station) return;

    // Step 1: pull back to show Karnataka context
    map.flyToBounds(KARNATAKA_BOUNDS, { padding: [60, 60], maxZoom: 10, duration: 0.8 });

    // Step 2: after the pan settles, pin on the station
    const timer = setTimeout(() => {
      map.flyTo([station.lat, station.lng], 12, { duration: 1.0 });
    }, 900);

    return () => clearTimeout(timer);
  }, [selectedStationCode, stations, map]);

  return null;
}

// ─── NationalRiversLayer: SVG-rendered, clickable river lines ────────────────

/**
 * Fetches rivers-india.geojson once and renders each river as a clickable SVG
 * polyline. Clicking opens a Leaflet popup with the river name and state(s).
 * Hover brightens the line. Toggled on/off by `visible` without re-fetching.
 */
function NationalRiversLayer({ url, visible }: { url: string; visible: boolean }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const fetchedRef = useRef(false);

  const DEFAULT_STYLE: L.PathOptions = {
    color: '#94a3b8',
    weight: 1.2,
    opacity: 0.6,
    fillOpacity: 0,
  };
  const HOVER_STYLE: L.PathOptions = {
    color: '#38bdf8',
    weight: 2.8,
    opacity: 0.9,
  };

  // Fetch once and build the SVG layer
  useEffect(() => {
    if (fetchedRef.current) return;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: GeoJsonObject) => {
        fetchedRef.current = true;

        layerRef.current = L.geoJSON(data, {
          style: DEFAULT_STYLE,
          interactive: true,
          onEachFeature(feature, layer) {
            const p = feature.properties as Record<string, unknown>;
            const name = (p['rivname'] as string) || (p['name'] as string) || 'Unknown River';
            const state = (p['state_al'] as string) || (p['st_loc_ste'] as string) || '';

            // Popup content — name + state only
            const popupContent = `
              <div style="
                font-family: 'Inter', system-ui, sans-serif;
                min-width: 160px;
                padding: 4px 2px;
              ">
                <div style="
                  font-size: 13px;
                  font-weight: 700;
                  color: #0f172a;
                  margin-bottom: 4px;
                  line-height: 1.3;
                ">${name}</div>
                ${state ? `
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    color: #475569;
                  ">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    ${state.split(',').map((s: string) => s.trim()).join(' · ')}
                  </div>
                ` : ''}
              </div>
            `;

            layer.bindPopup(popupContent, {
              closeButton: true,
              className: 'river-popup',
              maxWidth: 240,
            });

            // Hover highlight
            layer.on('mouseover', () => {
              (layer as L.Path).setStyle(HOVER_STYLE);
              (layer as L.Path).bringToFront();
            });
            layer.on('mouseout', () => {
              (layer as L.Path).setStyle(DEFAULT_STYLE);
            });
          },
        });

        if (visible) layerRef.current!.addTo(map);
      })
      .catch((err) =>
        console.warn('[NationalRiversLayer] Failed to load:', err),
      );
  }, [url, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility without re-fetching
  useEffect(() => {
    if (!layerRef.current) return;
    if (visible) {
      if (!map.hasLayer(layerRef.current)) layerRef.current.addTo(map);
    } else {
      if (map.hasLayer(layerRef.current)) map.removeLayer(layerRef.current);
    }
  }, [visible, map]);

  return null;
}

// Create an accessible DivIcon with Class letter and color-coded badge
function createStationIcon(waterClass: string | null | undefined, isSelected: boolean) {
  const visual = getClassConfig(waterClass as any);

  const html = `
    <div class="station-marker-pin ${isSelected ? 'selected' : ''}" style="background-color: ${visual.bgHex}; border-color: ${visual.borderHex};">
      ${isSelected ? `<span class="marker-pulse-ring" style="background-color: ${visual.bgHex};"></span>` : ''}
      <span>${visual.letter}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-station-pin',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export const RiverMap: React.FC<RiverMapProps> = ({
  stations,
  readings,
  selectedMonth,
  selectedStationCode,
  onSelectStation,
}) => {
  const [arkavathiData, setArkavathiData] = useState<GeoJsonObject | null>(null);
  const [showAllRivers, setShowAllRivers] = useState(true);

  // Fetch Arkavathi / Karnataka monitoring-station river geometry
  useEffect(() => {
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((d) => { if (!cancelled) setArkavathiData(d); })
      .catch((e) => console.warn('Arkavathi GeoJSON load error:', e));
    return () => { cancelled = true; };
  }, []);

  // Map station_code to its reading in selectedMonth
  const readingsByStation = React.useMemo(() => {
    const map = new Map<string, WaterReading>();
    readings
      .filter((r) => r.month === selectedMonth)
      .forEach((r) => map.set(r.station_code, r));
    return map;
  }, [readings, selectedMonth]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom
        className="w-full h-full min-h-[500px]"
      >
        {/* Base tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* National rivers — Canvas renderer, bottom layer */}
        <NationalRiversLayer url={RIVERS_URL} visible={showAllRivers} />

        {/* Arkavathi / monitoring rivers — SVG, drawn on top */}
        {arkavathiData && (
          <GeoJSON
            key={JSON.stringify(arkavathiData)}
            data={arkavathiData}
            style={{
              color: '#0284c7',
              weight: 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Station Markers */}
        {stations.map((station) => {
          const reading = readingsByStation.get(station.station_code);
          const currentClass = reading ? reading.class : null;
          const isSelected = selectedStationCode === station.station_code;
          const classVisual = getClassConfig(currentClass);

          return (
            <Marker
              key={station.station_code}
              position={[station.lat, station.lng]}
              icon={createStationIcon(currentClass, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectStation) {
                    onSelectStation(station.station_code);
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                <div className="text-xs font-sans p-1">
                  <div className="font-semibold text-slate-900">{station.station_name}</div>
                  <div className="text-slate-600">
                    River flow order: #{station.river_order ?? 'N/A'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-medium">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: classVisual.bgHex }}
                    />
                    <span>{classVisual.label}</span>
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="p-1 max-w-xs font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                      {station.station_code}
                    </span>
                    <span
                      className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
                      style={{ backgroundColor: classVisual.bgHex }}
                    >
                      Class {classVisual.letter}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-slate-800 leading-tight mb-1">
                    {station.station_name}
                  </h3>

                  <p className="text-xs text-slate-500 mb-2">
                    Flow order #{station.river_order ?? 'N/A'} (1 = upstream)
                  </p>

                  {reading?.status === 'no_access' ? (
                    <div className="bg-amber-50 text-amber-800 border border-amber-200 text-xs rounded p-2 mb-2">
                      <strong>No Access:</strong> {reading.note || 'Site could not be sampled this month.'}
                    </div>
                  ) : reading ? (
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded text-xs mb-2">
                      <div>
                        <span className="text-slate-500 block">DO (Oxygen):</span>
                        <strong className="text-slate-800">
                          {reading.do !== null ? `${reading.do} mg/L` : '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">BOD (Waste):</span>
                        <strong className="text-slate-800">
                          {reading.bod !== null ? `${reading.bod} mg/L` : '—'}
                        </strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-200">
                        <span className="text-slate-500 block">Total Coliform:</span>
                        <strong className="text-slate-800">
                          {reading.total_coliform !== null
                            ? `${reading.total_coliform.toLocaleString()} MPN/100ml`
                            : '—'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 text-slate-600 text-xs rounded p-2 mb-2">
                      No measurements recorded for {selectedMonth}.
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 italic">
                    Month: {selectedMonth || 'N/A'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Map controller — no DOM output */}
        <MapController stations={stations} selectedStationCode={selectedStationCode} />
      </MapContainer>

      {/* ── Layer toggle — top-right overlay ─────────────────────────── */}
      <div
        className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-sm
                   rounded-xl shadow-md border border-slate-200 px-3 py-2.5
                   flex flex-col gap-1.5 text-xs pointer-events-auto"
        role="group"
        aria-label="Map layer controls"
      >
        <div className="font-semibold text-slate-700 mb-0.5 text-[11px] uppercase tracking-wide">
          Layers
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none" htmlFor="toggle-all-rivers">
          <button
            id="toggle-all-rivers"
            role="switch"
            aria-checked={showAllRivers}
            onClick={() => setShowAllRivers((v) => !v)}
            className={`
              relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
              transition-colors duration-200 focus:outline-none focus:ring-2
              focus:ring-sky-500 focus:ring-offset-1
              ${showAllRivers ? 'bg-sky-500' : 'bg-slate-300'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-4 w-4 transform rounded-full
                bg-white shadow transition-transform duration-200
                ${showAllRivers ? 'translate-x-4' : 'translate-x-0'}
              `}
            />
          </button>
          <span className="text-slate-700 leading-tight">All rivers</span>
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
          <span>Water Quality Scale</span>
          <span className="text-[10px] font-normal text-slate-500 uppercase tracking-wide">
            CPCB Classes
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          Markers display letters and distinct hues for colour-blind accessibility.
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { cls: 'A', bg: 'bg-emerald-600', label: 'Pristine' },
            { cls: 'B', bg: 'bg-sky-600',     label: 'Bathing' },
            { cls: 'C', bg: 'bg-amber-600',   label: 'Drink treated' },
            { cls: 'D', bg: 'bg-orange-600',  label: 'Fisheries' },
            { cls: 'E', bg: 'bg-red-600',     label: 'Irrigation' },
            { cls: '—', bg: 'bg-slate-500',   label: 'No data' },
          ] as const).map(({ cls, bg, label }) => (
            <div key={cls} className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full ${bg} text-white font-bold
                            flex items-center justify-center text-[10px] shrink-0`}
              >
                {cls}
              </span>
              <span className="text-slate-700 text-[11px]">{label}</span>
            </div>
          ))}
        </div>

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
