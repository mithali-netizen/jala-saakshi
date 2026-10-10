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

/**
 * CPCB limits used for the parameter bars. Values are the ones already listed in
 * OFFICIAL_EXPLANATIONS (src/plainLanguage.ts); nothing new is introduced here.
 */
export const DO_FISH_RISK = 4; // mg/L, Class C/D limit: fish struggle below this

export type ParamKey = 'do' | 'bod' | 'coliform';

export interface ParamLimit {
  label: string;
  unit: string;
  /** Upper end of the bar. */
  max: number;
  /** Which direction is good. */
  better: 'higher' | 'lower';
  /** Bar uses a log scale (coliform spans several orders of magnitude). */
  log?: boolean;
  /** Shown when the value fails every class limit. */
  failText: string;
  ticks: { value: number; label: string }[];
  /** Best class whose limit this value satisfies, or null if it fails all. */
  bestClass: (v: number) => WaterClass;
  explain: string;
}

export const PARAM_LIMITS: Record<ParamKey, ParamLimit> = {
  do: {
    label: 'Dissolved oxygen',
    unit: 'mg/L',
    max: 12,
    better: 'higher',
    failText: 'Below the 4 mg/L fish limit',
    ticks: [
      { value: 4, label: '4' },
      { value: 6, label: '6' },
    ],
    bestClass: (v) => (v >= 6 ? 'A' : v >= 5 ? 'B' : v >= 4 ? 'C' : null),
    explain:
      'DO is the oxygen dissolved in the water. Fish breathe it. Below 4 mg/L fish start to suffer; above 6 is healthy.',
  },
  bod: {
    label: 'Waste load (BOD)',
    unit: 'mg/L',
    max: 20,
    better: 'lower',
    failText: 'Above the 3 mg/L limit',
    ticks: [
      { value: 2, label: '2' },
      { value: 3, label: '3' },
    ],
    bestClass: (v) => (v <= 2 ? 'A' : v <= 3 ? 'B' : null),
    explain:
      'BOD is how much oxygen bacteria use up eating sewage and organic waste. Lower is cleaner; above 3 mg/L means a heavy waste load.',
  },
  coliform: {
    label: 'Germs (total coliform)',
    unit: 'MPN/100ml',
    max: 100000,
    better: 'lower',
    log: true,
    failText: 'Above the 5,000 limit',
    ticks: [
      { value: 500, label: '500' },
      { value: 5000, label: '5,000' },
    ],
    bestClass: (v) => (v <= 50 ? 'A' : v <= 500 ? 'B' : v <= 5000 ? 'C' : null),
    explain:
      'Coliform bacteria come from human and animal waste. High counts mean a higher chance of stomach infections.',
  },
};

/** One-line verdict for people, derived from the CPCB class. */
export function classVerdict(waterClass: WaterClass | undefined): string {
  switch (waterClass) {
    case 'A':
      return 'Clean. Safe for bathing; drinkable after disinfection.';
    case 'B':
      return 'Safe for bathing. Not for drinking without treatment.';
    case 'C':
      return 'Not safe for bathing. Drinkable only after treatment.';
    case 'D':
      return 'Not safe for bathing or drinking. Fish can survive.';
    case 'E':
      return 'Heavily polluted. Not safe for bathing, drinking or fish.';
    default:
      return 'No class recorded this month.';
  }
}

/** 0..1 position of a value along its bar. */
export function barPosition(limit: ParamLimit, v: number): number {
  const p = limit.log ? Math.log10(Math.max(v, 1)) / Math.log10(limit.max) : v / limit.max;
  return Math.min(1, Math.max(0, p));
}
