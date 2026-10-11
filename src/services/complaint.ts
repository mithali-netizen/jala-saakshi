import { COMPLAINT_EMAIL, RESPONSIBLE_AUTHORITY } from '../config';
import { formatDay } from '../utils/dates';
import { formatMonth } from '../utils/months';
import { hasValues, type MonitoringLocation } from '../utils/stations';
import type { CitizenReport } from './reportStore';
import type { Stats } from './stats';

/**
 * Builds the complaint text for a citizen report.
 *
 * It states what was observed, what the nearest published readings are, and what is NOT
 * known — never a cause. The person reads and sends it from their own mail app; nothing
 * is sent from the page.
 */

function nearestStation(lat: number, lng: number, locations: MonitoringLocation[]) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const km = (la: number, ln: number) => {
    const h =
      Math.sin(rad(la - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(la)) * Math.sin(rad(ln - lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  return locations.map((l) => ({ location: l, km: km(l.lat, l.lng) })).sort((a, b) => a.km - b.km)[0] ?? null;
}

export function complaintSubject(report: CitizenReport): string {
  const what = report.issues.length ? report.issues.join(', ').toLowerCase() : 'a water quality problem';
  return `${report.lakeName}, Bengaluru: ${what} observed on ${formatDay(report.date)}`;
}

export function complaintBody(report: CitizenReport, locations: MonitoringLocation[], stats: Stats): string {
  const near = nearestStation(report.lat, report.lng, locations);
  const lastReal = near && [...near.location.months].reverse().find((m) => hasValues(near.location.byMonth.get(m)!));
  const reading = near && lastReal ? near.location.byMonth.get(lastReal)! : null;

  const lines = [
    `To: ${RESPONSIBLE_AUTHORITY.name}, ${RESPONSIBLE_AUTHORITY.division}`,
    `Date: ${formatDay(new Date().toISOString().slice(0, 10))}`,
    '',
    `I am reporting a problem at ${report.lakeName}, Bengaluru (${report.lat.toFixed(5)}°N, ${report.lng.toFixed(5)}°E).`,
    report.locationSource === 'device' && report.accuracyM != null
      ? `The coordinate is from my device, accurate to about ${Math.round(report.accuracyM)} m.`
      : report.locationSource === 'edited'
        ? 'The coordinate was entered by hand.'
        : 'The coordinate is the centre of the lake, not a reading from my device.',
    '',
    'What I observed:',
    `- Date observed: ${formatDay(report.date)}`,
    `- ${report.issues.length ? report.issues.join(', ') : 'Not specified'}`,
  ];
  if (report.note.trim()) lines.push(`- Note: ${report.note.trim()}`);
  if (report.photo) lines.push('- A photograph was taken and can be provided on request.');

  lines.push('', 'What the published data does and does not show:');
  lines.push(
    `- This lake has no reading in KSPCB's monthly river reports (${formatMonth(stats.firstMonth)} to ${formatMonth(
      stats.lastMonth,
    )}), which cover ${stats.locations} river monitoring points and no lakes.`,
  );
  if (near && reading && lastReal) {
    lines.push(
      `- The nearest monitoring point is ${near.location.name}, ${near.km.toFixed(1)} km away. Its ${formatMonth(
        lastReal,
      )} reading was dissolved oxygen ${reading.do ?? 'not recorded'} mg/L, BOD ${reading.bod ?? 'not recorded'} mg/L${
        reading.class ? `, Class ${reading.class}` : ''
      }. A river station that far away does not describe this lake; it is context only.`,
    );
  } else if (near) {
    lines.push(
      `- The nearest monitoring point is ${near.location.name}, ${near.km.toFixed(
        1,
      )} km away, and it has no reading recorded either.`,
    );
  }
  lines.push('- I am not asserting a cause. I am asking for the water to be tested.');

  lines.push(
    '',
    'Could you please:',
    '1. Test the water at this lake and share the readings.',
    '2. Tell me whether this lake is on any monitoring schedule, and how often.',
    '3. Tell me what action is being taken.',
    '',
    'Please acknowledge this message.',
    '',
    `Reference (this prototype): ${report.id}`,
    '',
    '[Your name]',
    '[Your phone number]',
  );
  return lines.join('\n');
}

export function complaintMailto(report: CitizenReport, locations: MonitoringLocation[], stats: Stats): string {
  return `mailto:${COMPLAINT_EMAIL}?subject=${encodeURIComponent(
    complaintSubject(report),
  )}&body=${encodeURIComponent(complaintBody(report, locations, stats))}`;
}
