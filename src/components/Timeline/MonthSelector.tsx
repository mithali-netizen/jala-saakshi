import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  months: string[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

// Format "2026-01" -> "Jan 2026"
export function formatMonthName(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  months,
  selectedMonth,
  onSelectMonth,
}) => {
  if (months.length === 0) return null;

  const currentIndex = months.indexOf(selectedMonth);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const handlePrev = () => {
    if (safeIndex > 0) {
      onSelectMonth(months[safeIndex - 1]);
    }
  };

  const handleNext = () => {
    if (safeIndex < months.length - 1) {
      onSelectMonth(months[safeIndex + 1]);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (months[idx]) {
      onSelectMonth(months[idx]);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
      {/* Top row: Label & Prev/Next navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Time Period
            </span>
            <span className="text-base font-bold text-slate-900 leading-tight">
              {formatMonthName(selectedMonth)}
            </span>
          </div>
        </div>

        {/* Step buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            disabled={safeIndex <= 0}
            aria-label="Previous Month"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-600 px-1">
            {safeIndex + 1} / {months.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={safeIndex >= months.length - 1}
            aria-label="Next Month"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider for smooth dragging through months */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={months.length - 1}
          value={safeIndex}
          onChange={handleSliderChange}
          aria-label="Month timeline slider"
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
        />
      </div>

      {/* Month pill buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {months.map((m) => {
          const isSelected = m === selectedMonth;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-[11px] block opacity-80">
                {m.split('-')[1]}
              </span>
              <span>{formatMonthName(m).split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
