import React, { useId } from 'react';

/** Dotted-underline term with a plain-language explanation on hover or keyboard focus. */
export const Hint: React.FC<{ text: string; children: React.ReactNode; align?: 'left' | 'right' }> = ({
  text,
  children,
  align = 'left',
}) => {
  const id = useId();
  return (
    <span className="relative inline-block group/hint">
      <span
        tabIndex={0}
        aria-describedby={id}
        className="cursor-help border-b border-dotted border-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-sm"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 top-full mt-1.5 w-56 rounded-lg bg-slate-900 px-2.5 py-2 text-[12px] font-normal normal-case leading-snug tracking-normal text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover/hint:opacity-100 group-focus-within/hint:opacity-100 ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        {text}
      </span>
    </span>
  );
};

export const DemoBadge: React.FC = () => (
  <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
    Demo data
  </span>
);
