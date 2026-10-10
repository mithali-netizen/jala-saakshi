import seeded from "../demo/reports.json";
import { daysSince, formatDay } from "./readings";
import type { DaysRow } from "../types";

export interface SeededReport {
  id: string;
  what: string;
  issue: string;
  reportedOn: string;
  sentTo: string[];
  status: "Submitted" | "Sent" | "Acknowledged" | "Action taken";
  respondedOn: string | null;
}

/** Seeded demo reports. Swap for a real call later; every row is flagged `demo`. */
export function getSeededReports(): SeededReport[] {
  return seeded as SeededReport[];
}

export function reportRows(): DaysRow[] {
  return getSeededReports().map((r) => ({
    id: r.id,
    kind: "citizen",
    what: `${r.what}: ${r.issue}`,
    detail: r.respondedOn
      ? `Sent to ${r.sentTo.join(", ")}. Response on ${formatDay(r.respondedOn)}, ${
          daysSince(r.reportedOn) - daysSince(r.respondedOn)
        } days after the report.`
      : `Sent to ${r.sentTo.join(", ")}. No response yet.`,
    since: r.reportedOn,
    status: r.status,
    demo: true,
  }));
}
