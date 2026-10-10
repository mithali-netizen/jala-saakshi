import { DODDAGUBBI } from './doddagubbi';

/**
 * Water bodies that are NOT in the KSPCB monthly river reports.
 *
 * Only entries with a real outline or coordinates belong here. Our seeded watchlist count
 * (src/demo/watchlist.ts) is deliberately not turned into map pins: we do not have real
 * coordinates for those lakes and will not invent them.
 */
export interface WaterBody {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** [lat, lng] ring, when we have the shape. */
  outline?: [number, number][];
  /** Why it is on this layer. */
  status: string;
}

export const UNMONITORED_WATER_BODIES: WaterBody[] = [
  {
    id: DODDAGUBBI.id,
    name: DODDAGUBBI.name,
    lat: DODDAGUBBI.lat,
    lng: DODDAGUBBI.lng,
    outline: DODDAGUBBI.outline,
    status: "Not in KSPCB's monthly reports",
  },
];
