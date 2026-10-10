import { API_BASE_URL } from '../config';

export interface AnalyzePhotoRequest {
  imageBase64: string;
  mediaFormat: 'jpeg' | 'png';
  lat?: number;
  lng?: number;
}

export type PollutionIssue =
  | 'dead_fish'
  | 'froth'
  | 'sewage_outfall'
  | 'algae'
  | 'other_pollution'
  | 'nothing_wrong'
  | 'unclear';

export interface AnalyzePhotoResponse {
  issue: PollutionIssue;
  severity: number;
  description: string;
}

export interface DraftComplaintRequest {
  issue: string;
  severity: number;
  description: string;
  stationName: string;
  riverName: string;
  lat?: number;
  lng?: number;
  reportDate: string;
  lastReading: {
    month?: string;
    class?: string | null;
    do?: number | null;
    bod?: number | null;
    total_coliform?: number | null;
  } | null;
  language: 'en' | 'kn' | 'hi' | 'all';
}

export interface DraftComplaintResponse {
  subjectEn: string;
  bodyEn: string;
  subjectKn: string;
  bodyKn: string;
  subjectHi: string;
  bodyHi: string;
  suggestedCc: string[];
}

export async function analyzePhoto(req: AnalyzePhotoRequest): Promise<AnalyzePhotoResponse> {
  if (!API_BASE_URL) {
    throw new Error('Photo analysis is unavailable because the report service is not configured.');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE_URL}/analyze-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 413) {
      throw new Error('Image size is too large for analysis. Please upload a smaller photo.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Analysis request failed (HTTP ${res.status}).`);
    }

    const data = (await res.json()) as AnalyzePhotoResponse;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('The photo analysis request timed out. Please try again.');
      }
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error(
          `Unable to connect to the backend server (${API_BASE_URL}). ` +
          `If running locally, make sure to start the server with: python backend/local_server.py`
        );
      }
      throw err;
    }
    throw new Error('An unexpected error occurred while analyzing the photo.');
  }
}

export async function draftComplaint(req: DraftComplaintRequest): Promise<DraftComplaintResponse> {
  if (!API_BASE_URL) {
    throw new Error('Complaint drafting is unavailable because the report service is not configured.');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_BASE_URL}/draft-complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Complaint drafting request failed (HTTP ${res.status}).`);
    }

    const data = (await res.json()) as DraftComplaintResponse;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('The complaint draft request timed out. Please try again.');
      }
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error(
          `Unable to connect to the backend server (${API_BASE_URL}). ` +
          `If running locally, make sure to start the server with: python backend/local_server.py`
        );
      }
      throw err;
    }
    throw new Error('An unexpected error occurred while drafting the complaint.');
  }
}
