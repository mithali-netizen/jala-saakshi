import { useMemo } from "react";
import { formatDay } from "../../utils/dates";

const files = import.meta.glob("../../assets/frames/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

interface Frame {
  date: string;
  url: string;
  /** Share of the lake that was cloud-free in this scene. */
  clear: number;
}

/**
 * The six dates that passed the lake-level cloud check in our Sentinel-2 run (lake_sat.py output).
 * Other dates in frames/ are black or cloud-covered and are deliberately not shown.
 */
const CLEAR_SHARE: Record<string, number> = {
  "2026-05-02": 1,
  "2026-05-12": 1,
  "2026-06-01": 1,
  "2026-06-16": 1,
  "2026-08-10": 0.63,
  "2026-10-04": 0.99,
};

const frames: Frame[] = Object.entries(files)
  .map(([path, url]) => ({ date: path.match(/(\d{4}-\d{2}-\d{2})\.png$/)![1], url }))
  .filter((f) => f.date in CLEAR_SHARE)
  .map((f) => ({ ...f, clear: CLEAR_SHARE[f.date] }))
  .sort((a, b) => a.date.localeCompare(b.date));

const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

export default function SatelliteStrip({ eventDate }: { eventDate: string }) {
  // No bundled frames (or none that passed the cloud check): say so rather than crash.
  if (frames.length === 0) {
    return <p className="text-xs text-muted">No cloud-free Sentinel-2 scenes are bundled for this lake.</p>;
  }
  const first = frames[0].date;
  const last = frames[frames.length - 1].date;
  const bigGaps = useMemo(
    () =>
      frames
        .slice(1)
        .map((f, i) => ({ from: frames[i].date, to: f.date, days: dayNum(f.date) - dayNum(frames[i].date) }))
        .filter((g) => g.days > 30),
    [],
  );
  const span = dayNum(last) - dayNum(first);
  const pos = (d: string) => `${((dayNum(d) - dayNum(first)) / span) * 100}%`;

  return (
    <div>
      {/* when we actually have an image */}
      <div className="relative mt-1 h-9" aria-hidden>
        <div className="absolute inset-x-0 top-4 h-px bg-line" />
        {frames.map((f) => (
          <i key={f.date} className="absolute top-2.5 h-3 w-px bg-brand" style={{ left: pos(f.date) }} />
        ))}
        <i className="absolute top-0 h-9 w-0.5 bg-red-600" style={{ left: pos(eventDate) }} />
        <span className="absolute -top-0.5 whitespace-nowrap text-[10px] font-bold text-red-700" style={{ right: `calc(100% - ${pos(eventDate)} + 4px)` }}>
          1 Oct: first dead fish reported
        </span>
      </div>
      <p className="mb-3 mt-1 text-xs text-muted">
        Each tick is a date with a clear image. {bigGaps.map((g) => `No clear scene between ${formatDay(g.from)} and ${formatDay(g.to)}.`).join(" ")}
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {frames.map((f) => (
          <li key={f.date} className="text-center">
            <img
              src={f.url}
              alt={`Doddagubbi Lake from space on ${formatDay(f.date)}`}
              className="aspect-[96/83] w-full rounded-md border border-line bg-slate-100 object-cover [image-rendering:pixelated]"
              loading="lazy"
            />
            <span className="mt-1 block text-xs font-semibold leading-tight text-slate-800">{formatDay(f.date)}</span>
            <span className="block text-[11px] leading-tight text-muted">{Math.round(f.clear * 100)}% of lake clear</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-slate-700">
        <b>The lake over five months: {frames.length} clear images, {formatDay(first)} to {formatDay(last)}.</b> Sentinel-2
        true-colour, 10 m pixels, so the lake is only a few hundred pixels across. Dates with heavy cloud are left out. Our algae index (NDCI) is saturated, with about
        99% of lake pixels over the bloom threshold on every date we processed, so it does not isolate the October event.
        Images this far apart are not a before and after pair.
      </p>
    </div>
  );
}
