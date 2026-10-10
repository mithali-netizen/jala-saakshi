import { formatMonth } from "../services/readings";

export interface Point {
  month: string; // YYYY-MM
  v: number | null;
}

const W = 640;
const H = 210;
const M = { top: 14, right: 14, bottom: 30, left: 38 };
const monthIndex = (m: string) => +m.slice(0, 4) * 12 + (+m.slice(5, 7) - 1);

/**
 * Line chart on a true time axis (gaps between reports are real gaps, not squeezed out).
 * Dashed segments join readings more than 3 months apart.
 */
export default function TimeChart({
  points,
  label,
  unit,
  better,
  refLine,
  from,
  to,
}: {
  points: Point[];
  label: string;
  unit: string;
  better: "higher" | "lower";
  refLine?: { value: number; text: string };
  from: string;
  to: string;
}) {
  const data = points.filter((p): p is { month: string; v: number } => p.v != null);
  const t0 = monthIndex(from);
  const t1 = Math.max(monthIndex(to), t0 + 1);
  const vMax = Math.max(...data.map((d) => d.v), refLine?.value ?? 0, 1);
  const top = vMax <= 10 ? Math.max(4, Math.ceil(vMax / 2) * 2) : Math.ceil(vMax / 10) * 10;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (m: string) => M.left + ((monthIndex(m) - t0) / (t1 - t0)) * iw;
  const y = (v: number) => M.top + ih - (v / top) * ih;
  const years: string[] = [];
  for (let yr = +from.slice(0, 4); yr <= +to.slice(0, 4); yr++) years.push(String(yr));

  return (
    <figure>
      <figcaption className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-muted">{better} is better</span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[480px] w-full" role="img" aria-label={`${label} over time`}>
          {[0, top / 2, top].map((g) => (
            <g key={g}>
              <line x1={M.left} x2={W - M.right} y1={y(g)} y2={y(g)} stroke="#e2e8f0" />
              <text x={M.left - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#64748b">{g}</text>
            </g>
          ))}
          {years.map((yr) => {
            const m = `${yr}-01`;
            if (monthIndex(m) < t0) return null;
            return (
              <g key={yr}>
                <line x1={x(m)} x2={x(m)} y1={M.top} y2={M.top + ih} stroke="#f1f5f9" />
                <text x={x(m) + 3} y={H - 12} fontSize="11" fill="#64748b">{yr}</text>
              </g>
            );
          })}
          {refLine && (
            <g>
              <line x1={M.left} x2={W - M.right} y1={y(refLine.value)} y2={y(refLine.value)} stroke="#be123c" strokeDasharray="5 4" />
              <text x={M.left + 4} y={y(refLine.value) - 4} fontSize="11" fontWeight="600" fill="#be123c">{refLine.text}</text>
            </g>
          )}
          {data.slice(1).map((d, i) => {
            const a = data[i];
            const gap = monthIndex(d.month) - monthIndex(a.month) > 3;
            return (
              <line key={d.month} x1={x(a.month)} y1={y(a.v)} x2={x(d.month)} y2={y(d.v)} stroke="#0f766e" strokeWidth="2" strokeDasharray={gap ? "3 4" : undefined} opacity={gap ? 0.55 : 1} />
            );
          })}
          {data.map((d) => (
            <circle key={d.month} cx={x(d.month)} cy={y(d.v)} r="3.2" fill="#0f766e" stroke="#fff" strokeWidth="1">
              <title>{`${formatMonth(d.month)}: ${d.v} ${unit}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    </figure>
  );
}
