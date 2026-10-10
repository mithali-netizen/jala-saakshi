/**
 * A water body with no KSPCB monitoring point.
 *
 * The full set now comes from OpenStreetMap via services/lakes.ts; this type is what the
 * featured-lake detail panel takes, so a lake and a hand-drawn polygon can both fill it.
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
