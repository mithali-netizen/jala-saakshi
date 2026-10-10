/**
 * Seeded cases for the authority portal and the app's example screens.
 *
 * The lake names here are deliberately fictional. An earlier version used Bellandur,
 * Varthur, Agara and Kaikondrahalli with invented risk levels and incident text — real
 * water bodies with real reputations, described with data we do not have. A Demo badge
 * elsewhere on the page does not travel with a cropped screenshot, but a name that says
 * "Demo" does.
 *
 * Real lake names are used only where the content is also real: the OpenStreetMap lake
 * layer, and reports the user actually files.
 */

export type RiskLevel = 'High' | 'Elevated' | 'Low';
export type CaseStatus = 'New' | 'Reviewing' | 'Acknowledged' | 'Assigned';

export interface SeededCase {
  id: string;
  title: string;
  lake: string;
  level: RiskLevel;
  status: CaseStatus;
}

export const DEMO_LAKE_NAMES = {
  north: 'Demo Lake North',
  east: 'Demo Lake East',
  south: 'Demo Lake South',
  west: 'Demo Lake West',
} as const;

export const SEEDED_CASES: SeededCase[] = [
  { id: 'JS-1048', title: 'Surface froth', lake: DEMO_LAKE_NAMES.east, level: 'High', status: 'Acknowledged' },
  { id: 'JS-1047', title: 'Sewage inflow', lake: DEMO_LAKE_NAMES.north, level: 'High', status: 'New' },
  { id: 'JS-1044', title: 'Algae observation', lake: DEMO_LAKE_NAMES.south, level: 'Elevated', status: 'Reviewing' },
  { id: 'JS-1041', title: 'Floating waste', lake: DEMO_LAKE_NAMES.west, level: 'Low', status: 'Assigned' },
];

export const seededHighRisk = SEEDED_CASES.filter((c) => c.level === 'High').length;
export const seededAcknowledged = SEEDED_CASES.filter((c) => c.status === 'Acknowledged').length;
