import { useSyncExternalStore } from 'react';
import { DEMO_CASE_PREFIX } from '../brand';

/**
 * Citizen reports made in this prototype.
 *
 * There is no server. Reports live in this browser only, in localStorage, and every
 * surface that shows them says so. Storage can fail (private windows, blocked site data,
 * a full quota), so every read and write is wrapped and the app renders fine with none.
 */

export type ReportStatus = 'Submitted' | 'Sent' | 'Acknowledged' | 'Action taken';

export interface CitizenReport {
  id: string;
  lakeId: string;
  lakeName: string;
  lat: number;
  lng: number;
  /** Issue chips chosen on the report screen. */
  issues: string[];
  note: string;
  /** Downscaled JPEG data URL, or null if no photo was attached. */
  photo: string | null;
  /** ISO date the report was made. */
  date: string;
  createdAt: string;
  status: ReportStatus;
  sentTo: string[];
}

export const STORAGE_KEY = 'jala-reports-v1';

/** Who a complaint goes to. Shown on screen before anything is sent. */
export const AUTHORITIES = ['KSPCB', 'BBMP Lakes', 'Minor Irrigation', 'Fisheries'];

let cache: CitizenReport[] | null = null;
const listeners = new Set<() => void>();

function read(): CitizenReport[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as CitizenReport[]) : [];
  } catch {
    cache = []; // unavailable or corrupt: behave as if there are none
  }
  return cache;
}

function persist(next: CitizenReport[]): string | null {
  cache = next;
  listeners.forEach((fn) => fn());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return null;
  } catch {
    // Out of quota or storage blocked. The report stays for this session only.
    return 'Saved for this session only — this browser would not store it.';
  }
}

export const getReports = (): CitizenReport[] => read();

function nextId(existing: CitizenReport[]): string {
  const year = new Date().getFullYear();
  return `${DEMO_CASE_PREFIX}-${year}-${String(existing.length + 1).padStart(4, '0')}`;
}

export interface NewReport {
  lakeId: string;
  lakeName: string;
  lat: number;
  lng: number;
  issues: string[];
  note: string;
  photo: string | null;
  date: string;
}

export function addReport(input: NewReport): { report: CitizenReport; warning: string | null } {
  const existing = read();
  const report: CitizenReport = {
    ...input,
    id: nextId(existing),
    createdAt: new Date().toISOString(),
    status: 'Submitted',
    sentTo: AUTHORITIES,
  };
  const warning = persist([report, ...existing]);
  return { report, warning };
}

export function updateStatus(id: string, status: ReportStatus): void {
  persist(read().map((r) => (r.id === id ? { ...r, status } : r)));
}

export function clearReports(): void {
  persist([]);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Live list, shared by the app, the tracker and the authority portal. */
export function useReports(): CitizenReport[] {
  return useSyncExternalStore(subscribe, getReports, getReports);
}

// ── Photos ───────────────────────────────────────────────────────────────────

/** Longest edge kept, so a phone photo fits in localStorage. */
const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.7;

/**
 * Read a picked photo into a downscaled data URL. A full-size phone photo as base64
 * would be several MB and blow the storage quota on the first report.
 */
export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image we can read.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not process that image.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        } catch {
          reject(new Error('Could not process that image.'));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
