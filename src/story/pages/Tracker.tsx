import { useData } from "../../context/DataContext";
import { useMemo, useState } from "react";
import { Card, DemoBadge } from "../components/ui";
import { complaintRows, gapRows, yourReportRows, type TrackerRow } from "../../services/tracker";
import { useReports } from "../../services/reportStore";
import { daysSince, formatDay } from "../../utils/dates";
import { formatMonth } from "../../utils/months";

const STATUS_STYLE: Record<string, string> = {
  "Not in monthly reports": "bg-red-50 text-red-800 border-red-200",
  "No reading in latest report": "bg-amber-50 text-amber-800 border-amber-200",
  "Not in latest report": "bg-slate-100 text-slate-700 border-line",
  Submitted: "bg-slate-100 text-slate-700 border-line",
  Sent: "bg-blue-50 text-blue-800 border-blue-200",
  Acknowledged: "bg-teal-50 text-teal-800 border-teal-200",
  "Action taken": "bg-green-50 text-green-800 border-green-200",
};

function Table({ rows, caption, empty }: { rows: TrackerRow[]; caption: string; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div role="table" aria-label={caption} className="overflow-hidden rounded-xl border border-line">
      <div
        role="row"
        className="hidden grid-cols-[minmax(0,1fr)_8rem_6rem_12rem] gap-3 bg-slate-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted md:grid"
      >
        <span role="columnheader">What</span>
        <span role="columnheader">When</span>
        <span role="columnheader" className="text-right">Days elapsed</span>
        <span role="columnheader">Response status</span>
      </div>
      {rows.map((r) => {
        const days = daysSince(r.since);
        return (
          <div
            role="row"
            key={r.id}
            className="grid grid-cols-2 items-start gap-x-3 gap-y-1 border-t border-line px-4 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_8rem_6rem_12rem] md:border-t"
          >
            <div role="cell" className="col-span-2 min-w-0 md:col-span-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{r.what}</span>
                {r.demo && <DemoBadge />}
                {r.yours && (
                  <span className="shrink-0 rounded-md border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                    Your report
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-muted">{r.detail}</p>
            </div>
            <div role="cell" className="text-sm text-slate-700">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted md:hidden">When </span>
              {formatDay(r.since)}
            </div>
            <div role="cell" className="text-sm font-bold tabular-nums text-ink md:text-right">
              {days.toLocaleString()} <span className="text-xs font-medium text-muted">days</span>
            </div>
            <div role="cell" className="col-span-2 md:col-span-1">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  STATUS_STYLE[r.status] ?? "bg-slate-100 text-slate-700 border-line"
                }`}
              >
                {r.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SHOW_FIRST = 6;

export default function Tracker() {
  const { stats, locations } = useData();
  const unmonitored = useMemo(() => gapRows(locations, stats), []);
  const mine = useReports();
  const yours = useMemo(() => yourReportRows(mine), [mine]);
  const reports = useMemo(() => complaintRows(), []);
  const [all, setAll] = useState(false);
  const shown = all ? unmonitored : unmonitored.slice(0, SHOW_FIRST);
  const today = formatDay(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Accountability tracker</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          How long has each gap been open?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Days are counted up to today, {today}. Water bodies come from the KSPCB dataset. Citizen reports on this page
          are seeded examples, and each one is marked Demo.
        </p>
      </header>

      <Card>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">Unmonitored water bodies</h2>
          <span className="text-xs font-semibold text-brand">Derived from the KSPCB dataset</span>
        </div>
        <p className="mb-3 text-xs text-muted">
          Doddagubbi Lake is not among the {stats.locations} points. The rows below it are points that are in the
          dataset but missing or blank in the latest ({formatMonth(stats.lastMonth)}) report, shown with the date of their
          last reading.
        </p>
        <Table rows={shown} caption="Unmonitored water bodies" empty="No gaps found." />
        {unmonitored.length > SHOW_FIRST && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="mt-3 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            {all ? "Show fewer" : `Show ${unmonitored.length - SHOW_FIRST} more`}
          </button>
        )}
      </Card>

      <Card>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold">Citizen reports</h2>
          <DemoBadge />
        </div>
        <p className="mb-3 text-xs text-muted">
          Seeded examples around the Doddagubbi fish kill, to show how the tracker will look. They are not real
          complaints.
        </p>
        {yours.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Made in this browser</h3>
            <Table rows={yours} caption="Your reports" empty="None yet." />
          </div>
        )}
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">Seeded examples</h3>
        <Table rows={reports} caption="Citizen reports (demo)" empty="No reports yet." />
      </Card>
    </div>
  );
}
