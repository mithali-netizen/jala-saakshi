import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { formatMonth, groupMonthsByYear, monthAbbr } from '../../utils/months';

interface MonthSelectorProps {
  /** Months that have data, ascending. */
  months: string[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

const PLAY_INTERVAL_MS = 1400;

export const MonthSelector: React.FC<MonthSelectorProps> = ({ months, selectedMonth, onSelectMonth }) => {
  const [playing, setPlaying] = useState(false);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  const index = Math.max(0, months.indexOf(selectedMonth));
  const groups = useMemo(() => groupMonthsByYear(months), [months]);

  const step = useCallback(
    (dir: -1 | 1) => {
      const next = months[index + dir];
      if (next) onSelectMonth(next);
    },
    [months, index, onSelectMonth],
  );

  const manual = (fn: () => void) => () => {
    setPlaying(false);
    fn();
  };

  // Play: advance until the last month, then stop. Wrap back to the start if pressed at the end.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const i = months.indexOf(selectedMonth);
      if (i >= months.length - 1) {
        setPlaying(false);
      } else {
        onSelectMonth(months[i + 1]);
      }
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, months, selectedMonth, onSelectMonth]);

  const togglePlay = () => {
    if (!playing && index >= months.length - 1) onSelectMonth(months[0]);
    setPlaying((p) => !p);
  };

  // Keyboard arrows, unless the user is typing or on the slider (which handles arrows itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      setPlaying(false);
      step(e.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Keep the selected chip visible inside the scroller without scrolling the page.
  useEffect(() => {
    chipRefs.current.get(selectedMonth)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [selectedMonth]);

  if (months.length === 0) return null;

  const btn =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-indigo-600';

  return (
    <section aria-label="Time period" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Calendar className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Time period</div>
            <div className="text-lg font-bold leading-tight text-slate-900 tabular-nums">{formatMonth(selectedMonth)}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play through months'}
            className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className={btn} onClick={manual(() => step(-1))} disabled={index <= 0} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center font-mono text-xs text-slate-600 tabular-nums">
            {index + 1} / {months.length}
          </span>
          <button
            type="button"
            className={btn}
            onClick={manual(() => step(1))}
            disabled={index >= months.length - 1}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={months.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          onSelectMonth(months[Number(e.target.value)]);
        }}
        aria-label="Month slider"
        aria-valuetext={formatMonth(selectedMonth)}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
      />

      {/* Chips, grouped by year. Scrolls sideways when there are many years. */}
      <div className="mt-3 flex items-start gap-4 overflow-x-auto pb-1" role="listbox" aria-label="Months with data">
        {groups.map((g) => (
          <div key={g.year} className="shrink-0">
            <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500">{g.year}</div>
            <div className="flex gap-1">
              {g.months.map((m) => {
                const selected = m === selectedMonth;
                return (
                  <button
                    key={m}
                    ref={(el) => {
                      if (el) chipRefs.current.set(m, el);
                      else chipRefs.current.delete(m);
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={manual(() => onSelectMonth(m))}
                    className={`h-7 min-w-[2.75rem] rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                      selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {monthAbbr(m)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
