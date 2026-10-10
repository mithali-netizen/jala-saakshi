import type { ReactNode } from "react";

export const DemoBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ${className}`}
    title="Seeded demo data. Not a real report."
  >
    Demo
  </span>
);

export const SourceTag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-md border border-line bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
    {children}
  </span>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-line bg-white p-4 shadow-xs sm:p-5 ${className}`}>{children}</section>
);

export const Stat = ({
  value,
  label,
  note,
  tone = "default",
}: {
  value: ReactNode;
  label: string;
  note?: string;
  tone?: "default" | "alert";
}) => (
  <div className={`rounded-xl border p-3 ${tone === "alert" ? "border-red-200 bg-red-50" : "border-line bg-white"}`}>
    <div className={`text-3xl font-bold leading-none tracking-tight tabular-nums ${tone === "alert" ? "text-red-700" : "text-ink"}`}>
      {value}
    </div>
    <div className="mt-1.5 text-xs font-semibold text-ink">{label}</div>
    {note && <div className="mt-0.5 text-[11px] leading-snug text-muted">{note}</div>}
  </div>
);
