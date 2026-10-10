import { useData } from "../../context/DataContext";
import { useMemo, useState } from "react";
import TimeChart from "../components/TimeChart";
import { Card, SourceTag } from "../components/ui";
import { formatMonth } from "../../utils/months";
import { hasValues } from "../../utils/stations";
import type { WaterClass } from "../../types/waterData";
import type { MonitoringLocation } from "../../utils/stations";

const CLASS_COLOR: Record<string, string> = { A: "#16a34a", B: "#0284c7", C: "#d97706", D: "#ea580c", E: "#dc2626" };

const ClassChip = ({ c }: { c: WaterClass }) => (
  <span
    className="inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
    style={{ background: c ? CLASS_COLOR[c] : "#64748b" }}
    title={c ? `Class ${c}` : "No class recorded"}
  >
    {c ?? "–"}
  </span>
);

const latestWithValues = (l: MonitoringLocation) => {
  const m = [...l.months].reverse().find((x) => hasValues(l.byMonth.get(x)!));
  return m ? { month: m, r: l.byMonth.get(m)! } : null;
};

export default function Explorer() {
  const { locations, months } = useData();
  const rivers = useMemo(() => [...new Set(locations.map((l) => l.river))].sort(), []);
  const kanakapura = useMemo(
    () => locations.find((l) => l.river === "Arkavathi" && /kanakapura/i.test(l.name) && /d\/s/i.test(l.name)),
    [],
  );
  const [river, setRiver] = useState(kanakapura?.river ?? rivers[0]);
  const stations = useMemo(
    // The dataset has no upstream-to-downstream order (river_order is 1 for every station), so: alphabetical.
    () => locations.filter((l) => l.river === river).sort((a, b) => a.name.localeCompare(b.name)),
    [river],
  );
  const [selId, setSelId] = useState<string | null>(kanakapura?.id ?? null);
  const selected = stations.find((l) => l.id === selId) ?? stations[0];

  const series = (key: "do" | "bod") =>
    selected.months.map((m) => ({ month: m, v: selected.byMonth.get(m)![key] }));
  const first = months[0];
  const last = months[months.length - 1];

  const apr = kanakapura?.byMonth.get("2018-04");
  const aug = kanakapura?.byMonth.get(last);

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">KSPCB explorer</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">What the monthly reports say</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Dissolved oxygen (DO) and waste load (BOD) at each station, {formatMonth(first)} to {formatMonth(last)}. Months with no
          report are gaps, not zeros.
        </p>
      </header>

      {kanakapura && apr && aug && (
        <Card className="border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">Arkavathi, downstream of Kanakapura</h2>
            <button
              type="button"
              className="text-sm font-semibold text-brand underline"
              onClick={() => {
                setRiver(kanakapura.river);
                setSelId(kanakapura.id);
              }}
            >
              Show this station
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-800">
            <b>{formatMonth("2018-04")}:</b> DO {apr.do} mg/L, BOD {apr.bod} mg/L. <b>{formatMonth(last)}:</b> DO {aug.do} mg/L,
            BOD {aug.bod} mg/L, Class {aug.class}.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Read with care: April is dry season and August is monsoon, and the readings in between swing both ways. Two months
            do not make a clean trend.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">River</span>
            <select
              value={river}
              onChange={(e) => {
                setRiver(e.target.value);
                setSelId(null);
              }}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand"
            >
              {rivers.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <p className="mb-2 mt-3 text-[11px] leading-snug text-muted">
            {stations.length} station{stations.length === 1 ? "" : "s"}, listed alphabetically. The dataset does not carry an
            upstream-to-downstream order.
          </p>
          <ul className="space-y-1" aria-label={`Stations on the ${river}`}>
            {stations.map((l) => {
              const lv = latestWithValues(l);
              const active = l.id === selected.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelId(l.id)}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                      active ? "border-brand bg-brand-soft/50" : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <ClassChip c={lv?.r.class ?? null} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-ink">{l.name.replace(/^[^ ]+ at /, "")}</span>
                      <span className="block text-xs text-muted">
                        {lv ? `${formatMonth(lv.month)}: DO ${lv.r.do ?? "–"}, BOD ${lv.r.bod ?? "–"}` : "No reading recorded"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-snug">{selected.name}</h2>
              <p className="text-xs text-muted">
                {selected.months.length} monthly reading{selected.months.length === 1 ? "" : "s"}, {formatMonth(selected.months[0])} to{" "}
                {formatMonth(selected.months[selected.months.length - 1])}
              </p>
            </div>
            <SourceTag>KSPCB dataset</SourceTag>
          </div>
          <div className="space-y-5">
            <TimeChart
              points={series("do")}
              label="Dissolved oxygen (DO), mg/L"
              unit="mg/L"
              better="higher"
              refLine={{ value: 4, text: "Fish at risk below this" }}
              from={first}
              to={last}
            />
            <TimeChart points={series("bod")} label="Waste load (BOD), mg/L" unit="mg/L" better="lower" from={first} to={last} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Dashed lines join readings more than three months apart. Hover a dot for its month and value.
          </p>
        </Card>
      </div>
    </div>
  );
}
