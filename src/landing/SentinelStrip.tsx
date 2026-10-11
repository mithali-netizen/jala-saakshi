import { formatDay } from '../utils/dates';

/**
 * Doddagubbi from Sentinel-2, as a row of small stills.
 *
 * Shown near their native size on purpose. The source scenes are 96x83 px — Sentinel-2
 * is 10 m per pixel and the lake is only a few hundred metres across — so blowing them
 * up buys no detail and only makes the softness obvious. At this size they stay sharp.
 *
 * Clear scenes only, in date order. No two of them are a before-and-after pair.
 */

const files = import.meta.glob('../assets/frames/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const FRAMES = Object.entries(files)
  .map(([path, url]) => ({ date: path.match(/(\d{4}-\d{2}-\d{2})\.png$/)?.[1] ?? '', url }))
  .filter((f) => f.date)
  .sort((a, b) => a.date.localeCompare(b.date));

export function SentinelStrip() {
  if (FRAMES.length === 0) return null;

  return (
    <figure className="m-0">
      <ul className="m-0 flex list-none flex-wrap justify-center gap-4 p-0 sm:justify-start">
        {FRAMES.map((frame, i) => (
          <li key={frame.date} className="w-[8.5rem] shrink-0">
            <img
              src={frame.url}
              alt={`Doddagubbi Lake from Sentinel-2 on ${formatDay(frame.date)}`}
              width={96}
              height={83}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="block aspect-[96/83] w-full rounded-lg border border-slate-200 bg-slate-100 object-cover"
            />
            <span className="mt-1.5 block text-center text-xs font-medium tabular-nums text-slate-600 sm:text-left">
              {formatDay(frame.date)}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-500">
        Doddagubbi Lake from Sentinel-2, May–October 2026. Clear scenes only — cloud cover leaves gaps, and this
        imagery does not isolate the October event.
      </figcaption>
    </figure>
  );
}
