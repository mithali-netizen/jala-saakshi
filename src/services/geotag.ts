import { useCallback, useEffect, useState } from 'react';
import type { Lake } from './lakes';

/**
 * Where the report is.
 *
 * The device fix is used only when it is good enough to mean something: a reading
 * accurate to several kilometres cannot tell one lake from another, so past the
 * threshold we fall back to the lake the person picked and label the location
 * approximate rather than quietly showing a precise-looking coordinate.
 */

/** Worse than this and a fix cannot distinguish neighbouring lakes. */
export const ACCURACY_LIMIT_M = 1000;

export type LocationSource = 'device' | 'lake' | 'edited';

export interface Fix {
  lat: number;
  lng: number;
  /** Radius in metres the browser reports, or null when it came from a lake. */
  accuracyM: number | null;
  source: LocationSource;
}

export interface GeotagState {
  status: 'idle' | 'locating' | 'done' | 'unavailable';
  fix: Fix | null;
  /** Why we are not using a device fix, in plain words. */
  note: string | null;
  request: () => void;
  setManual: (lat: number, lng: number) => void;
}

function messageFor(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied, so the lake you pick sets the location.';
    case err.POSITION_UNAVAILABLE:
      return 'Could not get a location fix, so the lake you pick sets the location.';
    case err.TIMEOUT:
      return 'Location took too long, so the lake you pick sets the location.';
    default:
      return 'Location unavailable, so the lake you pick sets the location.';
  }
}

export function useGeotag(): GeotagState {
  const [status, setStatus] = useState<GeotagState['status']>('idle');
  const [fix, setFix] = useState<Fix | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setNote('This browser cannot share a location, so the lake you pick sets it.');
      return;
    }
    setStatus('locating');
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracyM = pos.coords.accuracy;
        if (accuracyM > ACCURACY_LIMIT_M) {
          // Honest about why we are ignoring a fix we did receive.
          setFix(null);
          setNote(
            `Location was only accurate to about ${Math.round(accuracyM / 100) / 10} km, too rough to tell lakes apart, so the lake you pick sets it.`,
          );
          setStatus('done');
          return;
        }
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM, source: 'device' });
        setStatus('done');
      },
      (err) => {
        setFix(null);
        setNote(messageFor(err));
        setStatus('done');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const setManual = useCallback((lat: number, lng: number) => {
    setFix({ lat, lng, accuracyM: null, source: 'edited' });
  }, []);

  // Ask as soon as the report screen opens.
  useEffect(() => {
    request();
  }, [request]);

  return { status, fix, note, request, setManual };
}

/** Nearest lake to a point, for suggesting which one is being reported. */
export function nearestLake(lat: number, lng: number, lakes: Lake[] | null): Lake | null {
  if (!lakes || lakes.length === 0) return null;
  const rad = (x: number) => (x * Math.PI) / 180;
  const km = (a: number, b: number) => {
    const h =
      Math.sin(rad(a - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(a)) * Math.sin(rad(b - lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return lakes.reduce((best, l) => (km(l.lat, l.lng) < km(best.lat, best.lng) ? l : best), lakes[0]);
}
