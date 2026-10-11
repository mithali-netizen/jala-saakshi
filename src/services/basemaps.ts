/**
 * Basemaps the maps can switch between.
 *
 * All keyless and free to use with attribution.
 *
 * Two things were tried and rejected. CARTO's dark style returns HTTP 200 with an
 * "API KEY REQUIRED" watermark tile, so it looks like it works until you inspect the
 * pixels. Inverting the OpenStreetMap tiles in CSS gives an almost empty map, because
 * OSM draws roads lighter than the land and inverting makes them darker than it — the
 * detail disappears. Esri's Dark Gray Canvas is a real dark cartography instead.
 */

export type BasemapId = 'map' | 'satellite' | 'dark';

export interface Basemap {
  id: BasemapId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  /** Second tile layer drawn on top, for styles that ship labels separately. */
  labelsUrl?: string;
  /** Vector overlays need more contrast over imagery. */
  overOpaqueImagery?: boolean;
}

const OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
};

export const BASEMAPS: Record<BasemapId, Basemap> = {
  map: { id: 'map', label: 'Map', ...OSM },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    overOpaqueImagery: true,
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    // Esri splits this style: the base carries no place names.
    labelsUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Basemap &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, and the GIS User Community',
    maxZoom: 16,
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['map', 'satellite', 'dark'];

const KEY = 'jala-basemap';

export function loadBasemap(): BasemapId {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && saved in BASEMAPS) return saved as BasemapId;
  } catch {
    /* storage blocked; use the default */
  }
  return 'map';
}

export function saveBasemap(id: BasemapId): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* the choice just will not persist */
  }
}
