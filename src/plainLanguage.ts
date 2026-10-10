import type { WaterClass, WaterReading } from './types/waterData';

/**
 * Plain-language translations and CPCB threshold interpretations.
 * All user-facing copy and thresholds are centralized in this file.
 */

// TODO: verify thresholds against CPCB designated-best-use table
export function classMeaning(waterClass: WaterClass | string | null | undefined): string {
  if (!waterClass) {
    return 'No water class rating recorded for this period.';
  }

  // TODO: verify thresholds against CPCB designated-best-use table
  switch (waterClass) {
    case 'A':
      return 'Safe to drink after basic boiling or disinfection. Clean enough to swim in, and fish thrive here.';
    case 'B':
      return 'Safe for swimming and bathing. Unsafe to drink straight from the river. Healthy for fish.';
    case 'C':
      return 'Unsafe for bathing or drinking. Usable for drinking only after conventional industrial filtration and treatment.';
    case 'D':
      return 'Unsafe for humans to drink or bathe in. Supports fish and river wildlife reproduction.';
    case 'E':
      return 'Severely contaminated with heavy waste. Unsafe for fish, drinking, or bathing; usable only for crop irrigation or factory cooling.';
    default:
      return 'Water quality status unclassified for this month.';
  }
}

// TODO: verify thresholds against CPCB designated-best-use table
export function bodMeaning(
  bod: number | null | undefined,
  upstreamBod?: number | null | undefined
): string {
  if (bod === null || bod === undefined) {
    return 'Waste measurement not recorded.';
  }

  // Comparison with upstream station if provided
  let comparison = '';
  if (upstreamBod !== null && upstreamBod !== undefined && upstreamBod > 0) {
    if (bod >= upstreamBod * 1.5) {
      const times = Math.round(bod / upstreamBod);
      comparison = `${times} times more waste in the water than upstream. `;
    } else if (bod <= upstreamBod * 0.7) {
      comparison = 'Noticeably lower waste levels than upstream. ';
    } else {
      comparison = 'Waste level is similar to the upstream station. ';
    }
  }

  // TODO: verify thresholds against CPCB designated-best-use table
  let levelDesc = '';
  if (bod <= 2) {
    levelDesc = 'Very low organic waste. Natural and clean.';
  } else if (bod <= 3) {
    levelDesc = 'Low waste levels within acceptable river limits.';
  } else if (bod <= 6) {
    levelDesc = 'Moderate waste from runoff or surrounding settlements.';
  } else if (bod <= 15) {
    levelDesc = 'High waste load. River is struggling to naturally break down sewage.';
  } else {
    levelDesc = 'Extremely high waste concentration from untreated sewage or drains.';
  }

  return `${comparison}${levelDesc}`.trim();
}

// TODO: verify thresholds against CPCB designated-best-use table
export function doMeaning(doValue: number | null | undefined): string {
  if (doValue === null || doValue === undefined) {
    return 'Oxygen level not recorded.';
  }

  // TODO: verify thresholds against CPCB designated-best-use table
  if (doValue >= 6.0) {
    return 'Plenty of oxygen in the water. Fish and aquatic life can breathe and thrive easily.';
  } else if (doValue >= 4.0) {
    return 'Adequate oxygen for most fish to survive, though sensitive species may struggle.';
  } else if (doValue >= 2.0) {
    return 'Dangerously low oxygen. Fish struggle to breathe and may suffocate during warm periods.';
  } else {
    return 'Severe oxygen depletion (near-dead zone). Most fish and aquatic animals cannot survive here.';
  }
}

// TODO: verify thresholds against CPCB designated-best-use table
export function coliformMeaning(coliform: number | null | undefined): string {
  if (coliform === null || coliform === undefined) {
    return 'Germ count not recorded.';
  }

  // TODO: verify thresholds against CPCB designated-best-use table
  if (coliform <= 50) {
    return 'Very low germ counts. Minimal sewage or runoff contamination.';
  } else if (coliform <= 500) {
    return 'Low germ levels. Safe for outdoor swimming and bathing.';
  } else if (coliform <= 5000) {
    return 'High germ levels. Raw water requires chemical disinfection and filtration before drinking.';
  } else {
    return 'Extreme sewage germ levels. Water carries high risk of stomach infections upon contact.';
  }
}

// TODO: verify thresholds against CPCB designated-best-use table
export function headline(
  reading: WaterReading | null | undefined,
  upstreamReading?: WaterReading | null | undefined
): string {
  if (!reading) {
    return 'No water quality measurements recorded for this station in this month.';
  }

  if (reading.status === 'no_access') {
    return 'Water could not be tested this month because sampling teams were unable to reach the station.';
  }

  const { class: waterClass, bod, do: doVal } = reading;
  const upstreamBod = upstreamReading?.bod;

  // Comparison multiplier if upstream is known
  let multiplierStr = '';
  if (bod && upstreamBod && upstreamBod > 0 && bod >= upstreamBod * 2) {
    const times = Math.round(bod / upstreamBod);
    multiplierStr = ` with ${times} times more waste than upstream`;
  }

  // TODO: verify thresholds against CPCB designated-best-use table
  switch (waterClass) {
    case 'A':
      return 'Pristine, healthy river water with high oxygen and minimal waste.';
    case 'B':
      return 'Good water quality safe for swimming, with healthy oxygen levels for fish.';
    case 'C':
      return `Moderate pollution from runoff${multiplierStr}; unsafe to drink without treatment.`;
    case 'D':
      return `Degraded water with reduced oxygen${multiplierStr}; unsafe for humans, marginal for fish.`;
    case 'E':
      if (doVal !== null && doVal !== undefined && doVal < 3.0) {
        return `Severely polluted water${multiplierStr}, suffocating fish and safe only for irrigation.`;
      }
      return `Severely contaminated water${multiplierStr}, unfit for bathing or drinking.`;
    default:
      return 'Water quality is currently unclassified for this testing period.';
  }
}

/**
 * Official definitions and units for the "What do these terms mean?" expander.
 * Kept in this file so all copy is maintained in one place.
 */
export const OFFICIAL_EXPLANATIONS = {
  classes: [
    {
      code: 'A',
      title: 'Drinking Water Source without conventional treatment but after disinfection',
      description: 'DO >= 6 mg/L, BOD <= 2 mg/L, Total Coliform <= 50 MPN/100ml, pH 6.5–8.5.',
    },
    {
      code: 'B',
      title: 'Outdoor Bathing (Organized)',
      description: 'DO >= 5 mg/L, BOD <= 3 mg/L, Total Coliform <= 500 MPN/100ml, pH 6.5–8.5.',
    },
    {
      code: 'C',
      title: 'Drinking water source after conventional treatment and disinfection',
      description: 'DO >= 4 mg/L, BOD <= 3 mg/L, Total Coliform <= 5,000 MPN/100ml, pH 6.0–9.0.',
    },
    {
      code: 'D',
      title: 'Propagation of Wild life and Fisheries',
      description: 'DO >= 4 mg/L, Free Ammonia <= 1.2 mg/L, pH 6.5–8.5.',
    },
    {
      code: 'E',
      title: 'Irrigation, Industrial Cooling, Controlled Waste disposal',
      description: 'Electrical Conductivity <= 2250 µmhos/cm, Sodium Absorption Ratio <= 26, Boron <= 2 mg/L.',
    },
  ],
  metrics: [
    {
      name: 'DO (Dissolved Oxygen)',
      unit: 'mg/L (milligrams per liter)',
      meaning: 'The amount of oxygen dissolved in the water available for fish and river animals to breathe. Higher is better.',
    },
    {
      name: 'BOD (Biochemical Oxygen Demand)',
      unit: 'mg/L (milligrams per liter)',
      meaning: 'The amount of oxygen consumed by bacteria while decomposing organic matter like sewage or food waste. Lower is better.',
    },
    {
      name: 'Coliform (Total & Fecal)',
      unit: 'MPN / 100ml (Most Probable Number)',
      meaning: 'Bacterial indicators that reveal fecal waste from humans and warm-blooded animals. Higher numbers indicate disease risk.',
    },
  ],
};
