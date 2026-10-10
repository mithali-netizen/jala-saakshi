import type { WaterClass } from '../types/waterData';

export interface ClassVisualConfig {
  letter: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  badgeClass: string;
  label: string;
  description: string;
}

export const WATER_CLASS_CONFIG: Record<string, ClassVisualConfig> = {
  A: {
    letter: 'A',
    bgHex: '#16a34a',
    borderHex: '#15803d',
    textHex: '#ffffff',
    badgeClass: 'bg-emerald-600 text-white border-emerald-700',
    label: 'Class A: Pristine / Untreated Drinking',
    description: 'Highest purity; safe for drinking after disinfection.',
  },
  B: {
    letter: 'B',
    bgHex: '#0284c7',
    borderHex: '#0369a1',
    textHex: '#ffffff',
    badgeClass: 'bg-sky-600 text-white border-sky-700',
    label: 'Class B: Outdoor Bathing',
    description: 'Safe for bathing and swimming.',
  },
  C: {
    letter: 'C',
    bgHex: '#d97706',
    borderHex: '#b45309',
    textHex: '#ffffff',
    badgeClass: 'bg-amber-600 text-white border-amber-700',
    label: 'Class C: Conventional Treatment Drinking',
    description: 'Drinkable only after treatment and filtration.',
  },
  D: {
    letter: 'D',
    bgHex: '#ea580c',
    borderHex: '#c2410c',
    textHex: '#ffffff',
    badgeClass: 'bg-orange-600 text-white border-orange-700',
    label: 'Class D: Wildlife & Fisheries',
    description: 'Fish and aquatic life survive, but not fit for humans.',
  },
  E: {
    letter: 'E',
    bgHex: '#dc2626',
    borderHex: '#b91c1c',
    textHex: '#ffffff',
    badgeClass: 'bg-red-600 text-white border-red-700',
    label: 'Class E: Irrigation & Industrial',
    description: 'Severely degraded; suitable only for irrigation or cooling.',
  },
  NONE: {
    letter: '—',
    bgHex: '#64748b',
    borderHex: '#475569',
    textHex: '#ffffff',
    badgeClass: 'bg-slate-500 text-white border-slate-600',
    label: 'No Data / No Access',
    description: 'Site was not sampled or data is unavailable for this month.',
  },
};

export function getClassConfig(waterClass: WaterClass | undefined): ClassVisualConfig {
  if (!waterClass || !WATER_CLASS_CONFIG[waterClass]) {
    return WATER_CLASS_CONFIG.NONE;
  }
  return WATER_CLASS_CONFIG[waterClass];
}
