import { useData } from "../../context/DataContext";
import { lakeCoverageSentence } from "../../services/lakeReadings";
import { useRef } from "react";
import GapMap from "../components/GapMap";
import { Card, SourceTag, Stat } from "../components/ui";
import { formatMonth } from "../../utils/months";

/** KSPCB class legend, verbatim (KSPCB August 2026 report, p. 3). Do not reword. */
const LEGEND: [string, string][] = [
  ["A", "drinking water after disinfection"],
  ["B", "outdoor bathing"],
  ["C", "drinking water with conventional treatment"],
  ["D", "propagation of wildlife, fisheries"],
  ["E", "irrigation, industrial cooling, controlled waste disposal"],
];

export default function Home() {
  const { stats, lakeStats } = useData();
  const api = useRef<{ karnataka: () => void; bengaluru: () => void } | null>(null);
  const chip =
    "rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-red-700">The monitoring gap</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          KSPCB's monthly <b>river</b> reports cover {stats.locations} monitoring points on {stats.rivers} rivers.{" "}
          <span className="text-red-700">None of them is a lake.</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          Lakes are reported separately, and less often.{" "}
          {lakeStats ? lakeCoverageSentence(lakeStats, stats.lakesMapped) : ""} Doddagubbi Lake, where news coverage
          reports thousands of dead fish in early October 2026, was one of those tested.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#/lake" className="btn btn-primary">See what happened at Doddagubbi</a>
          <a href="#/tracker" className="btn btn-secondary">Open the tracker</a>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat value={stats.locations} label="Monitoring points" note={`${stats.stationCodes} station codes over ${stats.months.length} monthly reports, ${formatMonth(stats.firstMonth)} to ${formatMonth(stats.lastMonth)}`} />
        <Stat value={stats.rivers} label="Rivers" note="Spelling variants across the PDFs merged" />
        <Stat
          value={lakeStats ? lakeStats.tested : '—'}
          label="Lakes tested, July 2026"
          note={
            lakeStats
              ? `${Object.entries(lakeStats.byClass)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([c, n]) => `${n} Class ${c}`)
                  .join(', ')}${
                  stats.lakesMapped === null
                    ? ''
                    : ` · ${lakeStats.withoutReading(stats.lakesMapped)} of ${stats.lakesMapped} mapped lakes untested`
                }`
              : 'Loading the July 2026 lakes report…'
          }
          tone="alert"
        />
        <Stat
          value={stats.bengaluruStations}
          label="Stations in Bengaluru district"
          note={`${stats.bengaluruNoReading} with no reading in the ${formatMonth(stats.lastMonth)} report. District is recorded only in that report.`}
        />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">Every KSPCB monitoring point in the dataset</h2>
          <div className="flex gap-2">
            <button type="button" className={chip} onClick={() => api.current?.karnataka()}>Karnataka</button>
            <button type="button" className={chip} onClick={() => api.current?.bengaluru()}>Zoom to Doddagubbi</button>
          </div>
        </div>
        <GapMap onReady={(a) => (api.current = a)} />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white shadow" /> KSPCB monitoring point (hover for name)</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-4 rounded-sm border-2 border-red-700 bg-red-400/40" /> Doddagubbi Lake (outline from the team's lake polygon)</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-4 border-t-2 border-dashed border-red-700" /> Distance to the nearest point</span>
        </div>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-ink">KSPCB does sample lakes</h2>
          <SourceTag>Bangalore Mirror, Apr 2021</SourceTag>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">
          This finding is about one published series, not about whether lakes are ever tested. A 2021 ActionAid
          analysis of <b>106 Bengaluru lakes</b> reported none in Class A or B, with nearly all samples
          unsatisfactory. That work sits outside the monthly river reports this dashboard reads, which is why no lake
          appears in the figures above.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">What the classes mean</h2>
            <SourceTag>KSPCB, Aug 2026 report, p. 3</SourceTag>
          </div>
          <ul className="space-y-1.5 text-sm">
            {LEGEND.map(([c, t]) => (
              <li key={c} className={`flex gap-2 rounded-lg px-2 py-1.5 ${c === "E" ? "bg-red-50 ring-1 ring-red-200" : ""}`}>
                <b className="w-16 shrink-0 whitespace-nowrap text-ink">{c} =</b>
                <span className="text-slate-700">{t}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">A reading that did not make it into the dataset</h2>
            <SourceTag>News coverage</SourceTag>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            News coverage quotes a July 2026 KSPCB reading for Doddagubbi Lake: <b>Class E</b>, dissolved oxygen{" "}
            <b>3 mg/L</b>, BOD <b>22 mg/L</b>, coliform <b>5,400 MPN/100 ml</b>. It is a single reading, quoted
            second-hand. It does not appear in the {stats.locations} monthly station points above.
          </p>
          <p className="mt-2 text-xs text-muted">
            So the gap is not that nobody ever sampled the lake. It is that the lake is absent from the monthly
            river-station reports this app, and the public, can see.
          </p>
        </Card>
      </div>
    </div>
  );
}
