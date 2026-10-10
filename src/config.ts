/**
 * Application configuration
 * Allows swapping the data source via VITE_DATA_URL environment variable
 * or by simply replacing public/data/readings.json.
 */
export const DATA_URL = import.meta.env.VITE_DATA_URL || '/data/readings.json';

/** Backend API base URL for AI photo analysis and complaint drafting */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '';

/** Karnataka monitoring stations river geometry (Arkavathi etc.) */
export const GEOJSON_URL = import.meta.env.VITE_GEOJSON_URL || '/data/river.geojson';

/**
 * National rivers background layer.
 * Switch to a PMTiles file on S3/CloudFront by setting VITE_RIVERS_URL
 * e.g.  VITE_RIVERS_URL=https://cdn.example.com/rivers-india.pmtiles
 * The component reads this constant — no other code changes needed.
 */
export const RIVERS_URL = import.meta.env.VITE_RIVERS_URL || '/data/rivers-india.geojson';

// Action layer configuration — KSPCB Integrated Command & Control Centre
// Real contact details provided by project team
export const COMPLAINT_EMAIL = 'ICCC.kspcb@gmail.com';
export const COMPLAINT_PHONES = [
  '080-25589112',
  '080-25589113',
  '080-25581383',
  '080-25581388',
];

// COMPLAINT_URL is used as the mailto: link for the complaint action button.
// Opens the user's email client with a pre-addressed message.
export const COMPLAINT_URL = `mailto:${COMPLAINT_EMAIL}`;

export interface AuthorityConfig {
  name: string;
  division: string;
  contactEmail: string;
  phones: string[];
}

export const RESPONSIBLE_AUTHORITY: AuthorityConfig = {
  name: 'Karnataka State Pollution Control Board (KSPCB)',
  division: 'Integrated Command & Control Centre (ICCC)',
  contactEmail: COMPLAINT_EMAIL,
  phones: COMPLAINT_PHONES,
};
