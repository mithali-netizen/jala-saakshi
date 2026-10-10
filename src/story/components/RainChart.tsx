import { formatDay } from "../../utils/dates";
import { RAIN_TRIGGER_MM, rainRuleMet, type RainDay } from "../../services/rainfall";

export interface ChartEvent {
  date: string;
  label: string;
}

const W = 760;
const H = 300;
const M = { top: 64, right: 12, bottom: 56, left: 34 };

export default function RainChart({ days, events }: { days: RainDay[]; events: ChartEvent[] }) {
  const max = Math.max(10, Math.ceil(Math.max(...days.map((d) => d.mm)) / 10) * 10);
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const step = iw / days.length;
  const x = (i: number) => M.left + i * step;
  const y = (mm: number) => M.top + ih - (mm / max) * ih;
  const idx = (date: string) => days.findIndex((d) => d.date === date);
  const top = days.reduce((a, d) => (d.mm > a.mm ? d : a), days[0]);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img"
        aria-label="Daily rainfall near Doddagubbi Lake from 1 September to 9 October 2026, with the dates reported in news coverage marked">
        {/* grid */}
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
            <text x={M.left - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">{v}</text>
          </g>
        ))}
        <text x={M.left - 28} y={M.top - 10} fontSize="11" fill="#64748b">mm per day</text>

        {/* rule threshold */}
        {RAIN_TRIGGER_MM < max && (
          <g>
            <line x1={M.left} x2={W - M.right} y1={y(RAIN_TRIGGER_MM)} y2={y(RAIN_TRIGGER_MM)} stroke="#d97706" strokeDasharray="4 4" />
            <text x={M.left + 4} y={y(RAIN_TRIGGER_MM) - 4} fontSize="10.5" fill="#b45309">
              rule threshold {RAIN_TRIGGER_MM} mm
            </text>
          </g>
        )}

        {/* bars */}
        {days.map((d, i) => (
          <rect
            key={d.date}
            x={x(i) + 1.5}
            y={y(d.mm)}
            width={Math.max(2, step - 3)}
            height={Math.max(0, M.top + ih - y(d.mm))}
            rx="2"
            fill={rainRuleMet(days, i) ? "#0f766e" : "#7dd3c8"}
          >
            <title>{`${formatDay(d.date)}: ${d.mm} mm`}</title>
          </rect>
        ))}

        {/* value on the biggest day */}
        <text x={x(days.indexOf(top)) + step / 2} y={y(top.mm) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
          {top.mm}
        </text>

        {/* events from news coverage */}
        {events.map((e, n) => {
          const i = idx(e.date);
          if (i < 0) return null;
          const cx = x(i) + step / 2;
          const ty = 14 + n * 15;
          return (
            <g key={e.date}>
              <line x1={cx} x2={cx} y1={ty + 4} y2={M.top + ih} stroke="#b91c1c" strokeWidth="1.5" />
              <circle cx={cx} cy={ty + 4} r="3" fill="#b91c1c" />
              <text
                x={cx > W - 220 ? cx - 7 : cx + 7}
                y={ty + 8}
                textAnchor={cx > W - 220 ? "end" : "start"}
                fontSize="11.5"
                fontWeight="600"
                fill="#7f1d1d"
              >
                {e.label}
              </text>
            </g>
          );
        })}

        {/* x labels */}
        {days.map((d, i) =>
          i % 7 === 0 || d.date === days[days.length - 1].date ? (
            <text key={d.date} x={x(i) + step / 2} y={H - 30} textAnchor="middle" fontSize="11" fill="#64748b">
              {formatDay(d.date).replace(/ 2026$/, "")}
            </text>
          ) : null,
        )}
        <g transform={`translate(${M.left}, ${H - 14})`} fontSize="11" fill="#475569">
          <rect width="10" height="10" y="-9" rx="2" fill="#0f766e" />
          <text x="15">rain rule met (a day of {RAIN_TRIGGER_MM}+ mm in the last 3 days)</text>
          <rect x="330" width="10" height="10" y="-9" rx="2" fill="#7dd3c8" />
          <text x="345">other days</text>
          <circle cx="440" cy="-4" r="3.5" fill="#b91c1c" />
          <text x="449">date reported in news coverage</text>
        </g>
      </svg>
    </div>
  );
}
