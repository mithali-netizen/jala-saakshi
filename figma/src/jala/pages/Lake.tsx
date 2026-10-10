import { useCallback, useEffect, useState } from "react";
import RainChart from "../components/RainChart";
import SatelliteStrip from "../components/SatelliteStrip";
import ComplaintCard from "../components/ComplaintCard";
import { Card, SourceTag } from "../components/ui";
import { DO_LOW_MG_L, RAIN_TRIGGER_MM, getRainfall, rainRuleMet, type RainResult } from "../services/rainfall";
import { DODDAGUBBI_NAME, FIRST_DEAD_FISH, formatDay } from "../services/readings";

/** Dates as reported in news coverage (supplied by the team; not in the KSPCB dataset). */
const HEAVY_RAIN_REPORTED = "2026-09-30";
const THOUSANDS_REPORTED = "2026-10-05";

/** July 2026 KSPCB reading for the lake, quoted in news coverage. */
const NEWS_READING = { month: "July 2026", cls: "E", doMgL: 3, bod: 22, coliform: 5400 };

const dayDiff = (a: string, b: string) =>
  Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8))) / 86_400_000);

function useRain() {
  const [state, setState] = useState<{ status: "loading" | "ok" | "error"; data?: RainResult; error?: string }>({ status: "loading" });
  const load = useCallback(() => {
    setState({ status: "loading" });
    getRainfall()
      .then((data) => setState({ status: "ok", data }))
      .catch((e: Error) => setState({ status: "error", error: e.message }));
  }, []);
  useEffect(load, [load]);
  return { ...state, retry: load };
}

function RainSection() {
  const rain = useRain();

  if (rain.status === "loading")
    return <div className="h-72 animate-pulse rounded-xl bg-slate-100" aria-label="Loading rainfall" />;
  if (rain.status === "error" || !rain.data)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Could not load rainfall from Open-Meteo ({rain.error}). Nothing is shown in its place.{" "}
        <button type="button" onClick={rain.retry} className="font-semibold underline">Try again</button>
      </div>
    );

  const { days, gridLat, gridLng, fromCache, fetchedAt } = rain.data;
  const top = days.reduce((a, d) => (d.mm > a.mm ? d : a), days[0]);
  const get = (d: string) => days.find((x) => x.date === d);
  const rainBefore = get(HEAVY_RAIN_REPORTED);
  const dayOfFish = get(FIRST_DEAD_FISH);
  const topBeforeFish = top.date < FIRST_DEAD_FISH;

  return (
    <>
      <RainChart
        days={days}
        events={[
          { date: HEAVY_RAIN_REPORTED, label: "30 Sep: heavy rain reported" },
          { date: FIRST_DEAD_FISH, label: "1 Oct: first dead fish reported" },
          { date: THOUSANDS_REPORTED, label: "5 Oct: thousands reported" },
        ]}
      />
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        The wettest day in this window was <b>{formatDay(top.date)} ({top.mm} mm)</b>
        {rainBefore && top.date !== HEAVY_RAIN_REPORTED && (
          <>, with {rainBefore.mm} mm on {formatDay(HEAVY_RAIN_REPORTED)}, the date news coverage gives for the heavy rain</>
        )}
        {dayOfFish && <>. On {formatDay(FIRST_DEAD_FISH)}, when the first dead fish were reported, the total was {dayOfFish.mm} mm</>}
        . {topBeforeFish ? "The rain came first, one to two days before the first dead fish were reported." : ""} A sequence in time
        is not proof of cause.
      </p>
      <p className="mt-2 text-xs text-muted">
        Source: Open-Meteo historical weather API, gridded reanalysis rather than a rain gauge, for the grid cell nearest the
        lake ({gridLat.toFixed(2)}°N, {gridLng.toFixed(2)}°E). Daily totals in millimetres, Asia/Kolkata days.
        {fromCache && ` Showing a cached copy fetched ${new Date(fetchedAt).toLocaleString()}; the live request failed.`}
      </p>
    </>
  );
}

function RuleSection() {
  const rain = useRain();
  const met = rain.data ? rain.data.days.map((_, i) => rainRuleMet(rain.data!.days, i)) : [];
  const firstIdx = met.indexOf(true);
  const firstDate = firstIdx >= 0 ? rain.data!.days[firstIdx].date : null;
  const lowDO = NEWS_READING.doMgL < DO_LOW_MG_L;
  const elevated = lowDO && firstDate !== null;

  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        <b>Elevated risk = a heavy-rain day plus chronically low dissolved oxygen.</b> We apply it as two checks that anyone can
        read:
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        <li className="flex gap-3 rounded-lg border border-line p-3">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${firstDate ? "bg-brand" : "bg-slate-400"}`}>1</span>
          <span>
            <b>Rain.</b> A day of {RAIN_TRIGGER_MM} mm or more in the last 3 days.{" "}
            {rain.status === "ok" && (firstDate ? <>Met first on <b>{formatDay(firstDate)}</b>.</> : <>Not met in this window.</>)}
            {rain.status === "loading" && "Checking…"}
            {rain.status === "error" && "Rainfall unavailable."}
          </span>
        </li>
        <li className="flex gap-3 rounded-lg border border-line p-3">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${lowDO ? "bg-brand" : "bg-slate-400"}`}>2</span>
          <span>
            <b>Low oxygen.</b> The latest KSPCB dissolved-oxygen reading is below {DO_LOW_MG_L} mg/L, the level under which fish
            start to struggle. For this lake the only value we have is {NEWS_READING.doMgL} mg/L ({NEWS_READING.month}, quoted in
            news coverage). <SourceTag>News coverage</SourceTag>
          </span>
        </li>
      </ol>

      {rain.status === "ok" && firstDate && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">
          <b>Applied to this event, the rule shows {elevated ? "Elevated" : "Low"} from {formatDay(firstDate)}</b>
          {dayDiff(firstDate, FIRST_DEAD_FISH) > 0 && (
            <>, {dayDiff(firstDate, FIRST_DEAD_FISH)} day{dayDiff(firstDate, FIRST_DEAD_FISH) === 1 ? "" : "s"} before the first dead fish were reported on {formatDay(FIRST_DEAD_FISH)}</>
          )}
          .
        </p>
      )}

      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
        <li>This is a rule we wrote, run after the fact on one event. It shows the rule would have been met, not that it works.</li>
        <li>The {RAIN_TRIGGER_MM} mm threshold is ours, chosen for this demo. It is not an official rainfall category.</li>
        <li>One oxygen value cannot show that oxygen is chronically low. It would take repeated monthly readings, which this lake does not have in the dataset.</li>
        <li>
          Low oxygen with BOD of {NEWS_READING.bod} mg/L (well above the 3 mg/L limit for Class B and C) is consistent with sewage and organic load. This page does not establish a cause.
        </li>
      </ul>
    </div>
  );
}

export default function Lake() {
  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-red-700">Featured case</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{DODDAGUBBI_NAME}, Bengaluru</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          What is known, from where. Items tagged <SourceTag>News coverage</SourceTag> were reported in the press and are not in
          the KSPCB dataset. Each section says what it can and cannot show.
        </p>
      </header>

      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Reported timeline</h2>
          <SourceTag>News coverage</SourceTag>
        </div>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li><b className="inline-block w-24">30 Sep 2026</b> Heavy rain.</li>
          <li><b className="inline-block w-24">1 Oct 2026</b> First dead fish seen.</li>
          <li><b className="inline-block w-24">5 Oct 2026</b> Thousands of dead fish reported.</li>
          <li>
            <b className="inline-block w-24">{NEWS_READING.month}</b> KSPCB reading quoted: Class {NEWS_READING.cls}, dissolved oxygen {NEWS_READING.doMgL} mg/L, BOD{" "}
            {NEWS_READING.bod} mg/L, coliform {NEWS_READING.coliform.toLocaleString()} MPN/100 ml.
          </li>
        </ul>
      </Card>

      <Card>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Rainfall before the fish kill</h2>
          <SourceTag>Open-Meteo</SourceTag>
        </div>
        <p className="mb-3 text-xs text-muted">Daily rainfall, 1 September to the latest available day, against the dates in the news reports.</p>
        <RainSection />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">Risk indicator</h2>
          <SourceTag>A stated rule, not a measurement</SourceTag>
        </div>
        <RuleSection />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">The lake from space</h2>
          <SourceTag>Sentinel-2</SourceTag>
        </div>
        <SatelliteStrip eventDate={FIRST_DEAD_FISH} />
      </Card>

      <ComplaintCard />
    </div>
  );
}
