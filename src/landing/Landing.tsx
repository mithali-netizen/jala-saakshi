import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Cloud,
  Droplet,
  FileText,
  Languages,
  Map as MapIcon,
  ScanSearch,
  Smartphone,
  Users,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import GapMap from '../story/components/GapMap';
import { formatMonth } from '../utils/months';
import { APP_NAME } from '../brand';

/* ── Motion helpers ─────────────────────────────────────────────────────────── */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Adds `.in` once the element scrolls into view. Pure CSS does the rest (see index.css). */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Counts up from zero when first visible. Falls back to the final figure for reduced motion. */
function CountUp({ to, className = '' }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1400);
        setValue(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {Math.round(value).toLocaleString('en-IN')}
    </span>
  );
}

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ── Device frames ──────────────────────────────────────────────────────────── */

/**
 * Renders a live page of this site inside a device frame. The page is laid out at its real
 * size (w x h) and scaled down to fit, so the screens are always the current build rather
 * than a stale screenshot. Pointer events are off: the frame is a picture, not a trap.
 */
function ScaledFrame({ src, w, h, title }: { src: string; w: number; h: number; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setScale(node.clientWidth / w);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={box} className="relative w-full overflow-hidden bg-white" style={{ height: h * scale }}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: w + 24, height: h, transform: `scale(${scale})` }}
      />
    </div>
  );
}

function Laptop({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`device-float ${className}`}>
      <div className="rounded-t-2xl border border-slate-700 bg-slate-900 p-2.5 pb-2 shadow-2xl shadow-blue-950/40">
        <div className="mb-1.5 flex justify-center">
          <i className="h-1 w-1 rounded-full bg-slate-600" />
        </div>
        <div className="overflow-hidden rounded-md">{children}</div>
      </div>
      <div className="mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-2xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-lg" />
    </div>
  );
}

function Phone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`device-float relative rounded-[2.4rem] border-[7px] border-slate-900 bg-slate-900 shadow-2xl shadow-blue-950/40 ${className}`}>
      <div className="relative overflow-hidden rounded-[1.9rem] bg-white">
        <div className="relative h-7 bg-white" aria-hidden>
          <span className="absolute left-1/2 top-1.5 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Small building blocks ──────────────────────────────────────────────────── */

type Tone = 'brand' | 'alert' | 'light';

const Eyebrow = ({ children, tone = 'brand' }: { children: ReactNode; tone?: Tone }) => (
  <p
    className={`font-display text-sm font-semibold uppercase tracking-[0.2em] ${
      tone === 'alert' ? 'text-rose-600' : tone === 'light' ? 'text-sky-300' : 'text-blue-700'
    }`}
  >
    {children}
  </p>
);

const H2 = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <h2
    className={`font-display mt-3 max-w-4xl text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.7rem] ${
      dark ? 'text-white' : 'text-slate-900'
    }`}
  >
    {children}
  </h2>
);

const Source = ({ children, dark = false }: { children: ReactNode; dark?: boolean }) => (
  <p className={`mt-4 text-[13px] leading-snug ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
    <span className="font-semibold uppercase tracking-wider">Source </span>
    {children}
  </p>
);

const SourceChip = ({ children, tone = 'ours' }: { children: ReactNode; tone?: 'ours' | 'cited' }) => (
  <span
    className={`mt-3 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
      tone === 'ours' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-300 bg-amber-50 text-amber-800'
    }`}
  >
    {children}
  </span>
);

const NAV = [
  { id: 'evidence', label: 'Evidence' },
  { id: 'showcase', label: 'Product' },
  { id: 'features', label: 'Features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'aws', label: 'AWS' },
];

/* ── Content ────────────────────────────────────────────────────────────────── */

const NOTICE = [
  { name: 'BBMP', role: 'Bruhat Bengaluru Mahanagara Palike' },
  { name: 'KSPCB', role: 'Karnataka State Pollution Control Board' },
  { name: 'CPCB', role: 'Central Pollution Control Board' },
  { name: 'Fisheries', role: 'Principal Secretary for Fisheries' },
  { name: 'DC Bengaluru', role: 'Deputy Commissioner of Bengaluru' },
];

const FEATURES = [
  {
    icon: MapIcon,
    title: 'Month-by-month river map',
    body: 'Every KSPCB monitoring point on one map, coloured by CPCB class and lettered so it reads without colour. Step through the monthly reports on a timeline.',
  },
  {
    icon: Droplet,
    title: 'The lake gap layer',
    body: 'Bengaluru lakes mapped from OpenStreetMap and laid over the monitoring points, so you can see which water bodies have no station near them.',
  },
  {
    icon: ScanSearch,
    title: 'Plain-language readings',
    body: 'Dissolved oxygen, BOD and coliform translated into what they mean for drinking, bathing and fish. Official definitions stay one tap away.',
  },
  {
    icon: Smartphone,
    title: 'Photo reports from the lake',
    body: 'Attach a photo, pin the location and tick what you saw: dead fish, froth, sewage inflow, algae, foul smell, floating waste.',
  },
  {
    icon: FileText,
    title: 'Complaint drafts',
    body: 'A polite, structured complaint to the responsible authority is drafted from the report. The resident reviews it and sends it themselves.',
  },
  {
    icon: Languages,
    title: 'Kannada and English',
    body: 'The reporting flow switches between ಕನ್ನಡ and English in one tap, so a report can be filed in the language people use at the lake.',
  },
  {
    icon: Bell,
    title: 'Alerts and a case tracker',
    body: 'Follow reports over time and see which have had no response recorded after seven days. Tracker figures are seeded demo data and labelled as such.',
  },
  {
    icon: Building2,
    title: 'Authority portal',
    body: 'A triage view for the agencies named in the tribunal’s notices: incoming reports, location, photos and status in one queue.',
  },
];

const JOURNEY = [
  { n: 1, t: 'Extract', b: 'KSPCB monthly PDFs are extracted by a Python pipeline and stored for the dashboard to read.' },
  { n: 2, t: 'Report', b: 'A resident reports from the lake with a photo, a geotag and, in the design, their voice in Kannada.' },
  { n: 3, t: 'Classify and draft', b: 'Bedrock classifies the photo and Lambda drafts the complaint for the resident to send.' },
  { n: 4, t: 'Track', b: 'The accountability tracker clocks how many days a report has gone unanswered.' },
];

type Status = 'deployed' | 'designed' | 'planned' | 'source';
const STATUS_LABEL: Record<Status, string> = {
  deployed: 'Deployed',
  designed: 'Designed',
  planned: 'Planned',
  source: 'Data source',
};
const STATUS_STYLE: Record<Status, string> = {
  deployed: 'bg-emerald-400/15 text-emerald-300',
  designed: 'bg-sky-400/15 text-sky-200',
  planned: 'bg-white/10 text-slate-300',
  source: 'bg-amber-400/15 text-amber-200',
};

const AWS_SERVICES: { name: string; role: string; body: string; status: Status }[] = [
  {
    name: 'AWS Amplify Hosting',
    role: 'Build and deploy',
    body: 'Builds the Vite React site from GitHub commits and publishes it with CI/CD and branch previews.',
    status: 'deployed',
  },
  {
    name: 'Amazon CloudFront',
    role: 'Global CDN',
    body: 'Created by Amplify. Serves the site and the readings data over HTTPS from edge locations across India.',
    status: 'deployed',
  },
  {
    name: 'Amazon S3',
    role: 'Storage',
    body: 'Holds readings.json, GeoJSON and satellite frames. The site can read its dataset from any S3 URL.',
    status: 'designed',
  },
  {
    name: 'AWS Lambda',
    role: 'Serverless · Python 3.12',
    body: 'Runs the analyze-photo and draft-complaint handlers, so no AWS credentials reach the browser.',
    status: 'designed',
  },
  {
    name: 'Amazon API Gateway',
    role: 'HTTP API',
    body: 'Managed endpoints with CORS enforcement and throttling at 5 requests per second, burst 10.',
    status: 'designed',
  },
  {
    name: 'Amazon Bedrock',
    role: 'Amazon Nova Lite',
    body: 'Classifies the photo (froth, algae, sewage, dead fish) and drafts the bilingual observation report.',
    status: 'designed',
  },
  {
    name: 'Amazon Transcribe',
    role: 'Kannada speech to text',
    body: 'Server-side Kannada transcription, replacing the browser’s Web Speech once deployed.',
    status: 'planned',
  },
  {
    name: 'Amazon CloudWatch',
    role: 'Logs and metrics',
    body: 'Collects Lambda logs and performance metrics, with raw image bytes kept out of the log streams.',
    status: 'designed',
  },
  {
    name: 'AWS IAM',
    role: 'Least privilege',
    body: 'The Lambda role is limited to bedrock:InvokeModel on the Nova Lite model and inference profile.',
    status: 'designed',
  },
  {
    name: 'AWS Open Data',
    role: 'Sentinel-2 L2A on public S3',
    body: 'Satellite imagery of the lakes comes from the public Sentinel-2 archive hosted on AWS.',
    status: 'source',
  },
];

/* ── Page ───────────────────────────────────────────────────────────────────── */

export default function Landing() {
  const { stats, locations, isLoading, error } = useData();
  const ready = !isLoading && !error && locations.length > 0;
  const mapApi = useRef<{ karnataka: () => void; bengaluru: () => void } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const chip =
    'rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-xs transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow focus-visible:outline-2 focus-visible:outline-blue-700';

  return (
    <div className="blue-wash min-h-screen font-sans text-slate-800">
      {/* Navigation */}
      <header
        className={`sticky top-0 z-[1000] border-b backdrop-blur-md transition-colors duration-300 ${
          scrolled ? 'border-blue-100 bg-white/85' : 'border-white/10 bg-[#071a33]/70'
        }`}
      >
        <div className="shell flex items-center gap-x-6 py-3.5">
          <a href="#/" className="group flex items-center gap-3 no-underline" aria-label={`${APP_NAME} home`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.8rem_0.8rem_0.8rem_0.2rem] bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-900/30 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
              <Droplet className="h-5 w-5" aria-hidden />
            </span>
            <span className="leading-none">
              <span className={`font-display block text-xl font-bold tracking-tight ${scrolled ? 'text-slate-900' : 'text-white'}`}>
                {APP_NAME}
              </span>
              <span className={`font-display mt-1 block text-[11px] font-medium ${scrolled ? 'text-slate-500' : 'text-sky-200'}`}>
                ಜಲ ಸಾಕ್ಷಿ
              </span>
            </span>
          </a>
          <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => scrollToId(n.id)}
                className={`nav-link rounded-md px-3.5 py-2 text-[15px] font-medium transition-colors ${
                  scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="#/story/tracker"
              className={`hidden h-10 items-center rounded-xl border px-4 text-sm font-semibold no-underline transition sm:flex ${
                scrolled ? 'border-blue-200 text-slate-700 hover:bg-blue-50' : 'border-white/25 text-slate-100 hover:bg-white/10'
              }`}
            >
              Tracker
            </a>
            <a
              href="#/dashboard"
              className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white no-underline shadow-lg shadow-blue-900/20 transition hover:bg-blue-700"
            >
              Open dashboard <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-surface relative overflow-hidden text-white">
          <img
            src="/images/dead-fish.jpg"
            alt=""
            aria-hidden
            className="hero-fish pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="shell relative grid gap-12 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:pb-28 lg:pt-24">
            <div>
              <Reveal>
                <p className="font-display text-2xl font-bold tracking-tight text-sky-200 sm:text-3xl">
                  {APP_NAME} <span className="ml-2 font-medium text-sky-300/80">· ಜಲ ಸಾಕ್ಷಿ</span>
                </p>
                <h1 className="font-display mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.2rem]">
                  <CountUp to={149} /> Bengaluru lakes tested.{' '}
                  <span className="bg-gradient-to-r from-rose-300 to-orange-200 bg-clip-text text-transparent">
                    None of them clean enough to bathe in.
                  </span>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl">
                  KSPCB’s own sampling, April–November 2025: zero lakes in Class A, B or C. About four in ten sit in
                  Class E every month, the Board’s designation for irrigation, industrial cooling and waste disposal.
                </p>
                <Source dark>KSPCB MINARS data, reported by News Karnataka, Feb 2026.</Source>
              </Reveal>

              <Reveal delay={220}>
                <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
                  <p className="font-display max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">
                    {ready ? (
                      <>
                        KSPCB’s monthly river reports cover {stats.locations} monitoring points on {stats.rivers} rivers.{' '}
                        <span className="text-rose-300">None of them is a lake.</span>
                      </>
                    ) : (
                      <span className="inline-block h-14 w-full max-w-xl animate-pulse rounded bg-white/10" />
                    )}
                  </p>
                  {ready && (
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
                      Doddagubbi Lake in Bengaluru, where news coverage reports thousands of dead fish in early October
                      2026, is not one of them. The nearest monitoring point is {stats.nearestToDoddagubbi.km.toFixed(1)}{' '}
                      km away, on the {stats.nearestToDoddagubbi.river}.
                    </p>
                  )}
                  <Source dark>Our extraction of KSPCB monthly river reports.</Source>
                </div>
              </Reveal>

              <Reveal delay={320}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a href="#/story/lake" className="btn btn-lg btn-light group no-underline">
                    See what happened at Doddagubbi
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                  </a>
                  <a href="#/story/tracker" className="btn btn-lg border-white/30 bg-white/5 text-white no-underline hover:bg-white/15">
                    Open the tracker
                  </a>
                  <a href="#/dashboard" className="btn btn-lg text-sky-200 no-underline hover:bg-white/10">
                    Open the dashboard
                  </a>
                </div>
              </Reveal>
            </div>

            <Reveal delay={200}>
              <figure className="group relative mx-auto w-full max-w-xl -rotate-1 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl shadow-black/50 transition-transform duration-500 hover:rotate-0">
                <img
                  src="/images/news-doddagubbi.jpg"
                  alt="News report: thousands of dead fish at Doddagubbi Lake, 5 October 2026"
                  className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-snug text-slate-600">
                  News coverage, 5 Oct 2026. Residents are quoted as suspecting sewage and dumpyard leachate.
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* Evidence: KPI tiles + map */}
        <section id="evidence" className="shell scroll-mt-20 py-20">
          <Reveal>
            <Eyebrow>The evidence</Eyebrow>
            <H2>What the Board publishes every month, and what it leaves out.</H2>
          </Reveal>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {ready ? (
              <>
                <Tile
                  value={stats.locations}
                  label="Monitoring points"
                  note={`${stats.stationCodes} station codes over ${stats.months.length} monthly reports, ${formatMonth(stats.firstMonth)} to ${formatMonth(stats.lastMonth)}`}
                  delay={0}
                />
                <Tile value={stats.rivers} label="Rivers" note="Spelling variants across the PDFs merged" delay={80} />
                <Tile
                  value={stats.lakesInReports}
                  label="Lakes in this series"
                  note={
                    stats.lakesMapped === null
                      ? 'No station name, river or stretch reads as a lake, kere or tank'
                      : `None of the ${stats.lakesMapped} mapped Bengaluru lakes appears in it`
                  }
                  tone="alert"
                  delay={160}
                />
                <Tile
                  value={stats.bengaluruStations}
                  label="Stations in Bengaluru district"
                  note={`${stats.bengaluruNoReading} with no reading in the ${formatMonth(stats.lastMonth)} report. District is recorded only in that report.`}
                  delay={240}
                />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/60" />)
            )}
          </div>

          <Reveal className="mt-8">
            <div className="rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-xl shadow-blue-900/5 backdrop-blur sm:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-slate-900">Every KSPCB monitoring point in the dataset</h3>
                <div className="flex gap-2">
                  <button type="button" className={chip} onClick={() => mapApi.current?.karnataka()}>
                    Karnataka
                  </button>
                  <button type="button" className={chip} onClick={() => mapApi.current?.bengaluru()}>
                    Zoom to Doddagubbi
                  </button>
                </div>
              </div>
              {ready ? (
                <GapMap onReady={(a) => (mapApi.current = a)} />
              ) : (
                <div className="h-[420px] animate-pulse rounded-xl bg-slate-200/70 sm:h-[480px]" />
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block h-3 w-3 rounded-full bg-brand shadow ring-2 ring-white" /> KSPCB monitoring point
                  (hover for name)
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block h-3 w-5 rounded-sm border-2 border-red-700 bg-red-400/40" /> Doddagubbi Lake
                  (outline from the team’s lake polygon)
                </span>
                <span className="inline-flex items-center gap-2">
                  <i className="inline-block w-5 border-t-2 border-dashed border-red-700" /> Distance to the nearest point
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* This keeps happening */}
        <section id="problem" className="fish-section relative scroll-mt-20 overflow-hidden py-24 text-white">
          <img
            src="/images/dead-fish.jpg"
            alt=""
            aria-hidden
            className="fish-bg pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="shell relative">
            <Reveal>
              <Eyebrow tone="light">This keeps happening</Eyebrow>
              <H2 dark>Doddagubbi is not the first lake where fish have died.</H2>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <BigNumber to={61} label="fish kills in Bengaluru lakes, 2017–2023" delay={0} />
              <BigNumber custom="All" label="water quality analysis found sewage the primary cause in every one of them" delay={100} />
              <BigNumber
                to={4}
                label="repeat-offender lakes (Bhattarahalli, Munnekolala, Chelekere, Iblur) have their own sewage treatment plants"
                delay={200}
              />
            </div>
            <Source dark>NGT suo motu proceedings, via Deccan Herald, June 2024.</Source>

            <div className="mt-20">
              <Reveal>
                <Eyebrow tone="light">Who is on notice</Eyebrow>
                <H2 dark>The National Green Tribunal issued notices to five agencies.</H2>
              </Reveal>
              <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="absolute left-0 right-0 top-[3.1rem] hidden border-t-2 border-dashed border-sky-300/30 lg:block" aria-hidden />
                {NOTICE.map((a, i) => (
                  <Reveal key={a.name} delay={i * 90}>
                    <div className="notice-card group relative h-full rounded-2xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm">
                      <span className="font-display flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/40 bg-[#0b2447] text-sm font-bold text-sky-200 transition-colors group-hover:bg-sky-400 group-hover:text-slate-900">
                        {i + 1}
                      </span>
                      <p className="font-display mt-5 text-xl font-bold tracking-tight">{a.name}</p>
                      <p className="mt-1.5 text-sm leading-snug text-slate-300">{a.role}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Source dark>NGT suo motu proceedings, via Deccan Herald, June 2024.</Source>
            </div>
          </div>
        </section>

        {/* Product showcase: laptops */}
        <section id="showcase" className="shell scroll-mt-20 py-24">
          <Reveal>
            <Eyebrow>The product · web</Eyebrow>
            <H2>One dashboard for the public record, one portal for whoever has to act on it.</H2>
          </Reveal>
          <div className="relative mt-14 grid items-start gap-10 lg:block lg:h-[560px]">
            <Reveal className="lg:absolute lg:left-0 lg:top-0 lg:w-[62%]">
              <a href="#/dashboard" className="block no-underline" aria-label="Open the dashboard">
                <Laptop>
                  <ScaledFrame src="/#/dashboard" w={1440} h={900} title="The Jala Saakshi dashboard" />
                </Laptop>
              </a>
              <p className="font-display mt-5 text-lg font-bold text-slate-900">Web dashboard</p>
              <p className="text-base text-slate-600">KPI tiles, river map, lakes layer and class breakdown by month.</p>
            </Reveal>
            <Reveal delay={150} className="lg:absolute lg:right-0 lg:top-24 lg:z-10 lg:w-[52%]">
              <a href="#/authority" className="block no-underline" aria-label="Open the authority portal">
                <Laptop>
                  <ScaledFrame src="/#/authority" w={1440} h={900} title="The Jala Saakshi authority portal" />
                </Laptop>
              </a>
              <p className="font-display mt-5 text-lg font-bold text-slate-900">Authority portal</p>
              <p className="text-base text-slate-600">A triage queue of citizen reports with status and response clock. Prototype.</p>
            </Reveal>
          </div>
        </section>

        {/* Product showcase: phones */}
        <section id="app" className="app-surface scroll-mt-20 overflow-hidden py-24">
          <div className="shell">
            <Reveal>
              <Eyebrow>The app · for citizens</Eyebrow>
              <H2>A report from the lakeside, in Kannada or English.</H2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
                The app is for residents. It is a mobile-first prototype that runs in the browser today and is not yet
                published to an app store, so each screen below links to the live preview.
              </p>
            </Reveal>

            <div className="mt-14 flex flex-wrap items-end justify-center gap-8 lg:flex-nowrap lg:gap-10">
              <Reveal delay={0} className="w-[240px] shrink-0 lg:w-[270px]">
                <div className="lg:translate-y-6 lg:-rotate-[7deg]">
                  <a href="#/app" className="block no-underline" aria-label="Open the app home screen">
                    <Phone>
                      <ScaledFrame src="/#/app" w={390} h={844} title="App home screen" />
                    </Phone>
                  </a>
                </div>
                <p className="font-display mt-8 text-center text-base font-bold text-slate-900">Home</p>
              </Reveal>
              <Reveal delay={120} className="w-[240px] shrink-0 lg:w-[270px]">
                <div className="lg:-translate-y-4">
                  <a href="#/app/report" className="block no-underline" aria-label="Start a report">
                    <Phone>
                      <ScaledFrame src="/#/app/report" w={390} h={844} title="App report screen" />
                    </Phone>
                  </a>
                </div>
                <p className="font-display mt-4 text-center text-base font-bold text-slate-900 lg:-translate-y-4">
                  Report · ಕನ್ನಡ / English
                </p>
              </Reveal>
              <Reveal delay={240} className="w-[240px] shrink-0 lg:w-[270px]">
                <div className="lg:translate-y-6 lg:rotate-[7deg]">
                  <a href="#/app/map" className="block no-underline" aria-label="Open the app map">
                    <Phone>
                      <ScaledFrame src="/#/app/map" w={390} h={844} title="App map screen" />
                    </Phone>
                  </a>
                </div>
                <p className="font-display mt-8 text-center text-base font-bold text-slate-900">Map</p>
              </Reveal>
            </div>

            <Reveal delay={150}>
              <div className="mt-14 flex flex-wrap justify-center gap-3">
                <a href="#/app" className="btn btn-lg btn-primary group no-underline">
                  <Smartphone className="h-5 w-5" aria-hidden /> View our app
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
                </a>
                <a href="#/app/report" className="btn btn-lg btn-secondary no-underline">
                  Start a report
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Who it is for */}
        <section id="users" className="shell scroll-mt-20 py-24">
          <Reveal>
            <Eyebrow>Who it is for</Eyebrow>
            <H2>Built for the people who see the problem and the people who answer for it.</H2>
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <UserCard
                icon={Users}
                title="Citizens"
                sub="Mobile app · Kannada and English"
                items={[
                  'Residents and regular walkers at a lake',
                  'Resident welfare associations and lake groups',
                  'Students, journalists and volunteers checking a water body',
                ]}
                text="Photograph it, tick what you saw, and get a complaint ready to send."
                href="#/app"
                cta="Preview the citizen app"
                primary
              />
            </Reveal>
            <Reveal delay={120}>
              <UserCard
                icon={Building2}
                title="Authorities"
                sub="Web dashboard and authority portal"
                items={[
                  'Pollution control and civic body officers',
                  'Fisheries and district administration teams',
                  'Anyone following up on the tribunal’s notices',
                ]}
                text="See incoming reports against the monitoring map, with location, photos and status in one queue."
                href="#/authority"
                cta="Open the authority portal"
              />
            </Reveal>
          </div>
        </section>

        {/* Features as cards */}
        <section id="features" className="scroll-mt-20 border-y border-blue-100 bg-white/50 py-24">
          <div className="shell">
            <Reveal>
              <Eyebrow>Features</Eyebrow>
              <H2>One place to see the data, and one place to report what the data misses.</H2>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 4) * 80}>
                  <article className="feature-card group h-full rounded-2xl border border-blue-100 bg-white p-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-blue-700 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                      <f.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <h3 className="font-display mt-5 text-lg font-bold leading-snug text-slate-900">{f.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* Roadmap-style journey */}
            <div className="mt-24">
              <Reveal>
                <Eyebrow>How it fits together</Eyebrow>
                <H2>From a PDF to a complaint, in four steps.</H2>
              </Reveal>
              <div className="relative mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <div className="absolute left-[12.5%] right-[12.5%] top-6 hidden border-t-2 border-dashed border-blue-400/60 lg:block" aria-hidden />
                <div className="absolute bottom-0 left-6 top-6 border-l-2 border-dashed border-blue-400/60 md:hidden" aria-hidden />
                {JOURNEY.map((s, i) => (
                  <Reveal key={s.n} delay={i * 120}>
                    <div className="journey-step relative pl-16 md:pl-0 lg:text-center">
                      <span className="font-display absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-500 bg-white text-lg font-bold text-blue-700 shadow-lg shadow-blue-900/10 md:static md:mx-0 lg:mx-auto">
                        {s.n}
                      </span>
                      <h3 className="font-display mt-0 text-lg font-bold text-slate-900 md:mt-5">{s.t}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.b}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="shell scroll-mt-20 py-24">
          <Reveal>
            <Eyebrow>Architecture</Eyebrow>
            <H2>Data sources, storage, serverless backend, delivery and people, all on AWS.</H2>
          </Reveal>
          <Reveal delay={100} className="mt-10">
            <a
              href="/images/architecture.jpg"
              target="_blank"
              rel="noreferrer"
              className="arch-frame group block overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/10 no-underline"
              aria-label="Open the architecture diagram at full size"
            >
              <div className="overflow-hidden">
                <img
                  src="/images/architecture.jpg"
                  alt="Jala Saakshi AWS architecture: KSPCB PDFs, OpenStreetMap, Sentinel-2 and Open-Meteo feed Python extraction and Amazon S3; API Gateway, Lambda and Bedrock form the serverless backend; GitHub, Amplify and CloudFront deliver the web app, mobile app, tracker and authority portal."
                  className="-mt-[8.4%] w-full transition-transform duration-700 group-hover:scale-[1.012]"
                  loading="lazy"
                />
              </div>
            </a>
          </Reveal>
          <p className="mt-4 text-sm text-slate-500">
            Solid lines are the runtime data path, dashed lines are build and deploy, dotted lines are planned and not yet
            deployed. Click to open at full size.
          </p>
        </section>

        {/* AWS */}
        <section id="aws" className="aws-surface scroll-mt-20 py-24 text-white">
          <div className="shell">
            <Reveal>
              <Eyebrow tone="light">Built on AWS</Eyebrow>
              <H2 dark>Hosted on Amplify and CloudFront. A serverless backend designed around Bedrock.</H2>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
                The website is deployed today. The AI reporting backend is described as an AWS SAM template and runs
                locally against a mock of Amazon Bedrock until it is deployed. Each service below is marked with where it
                stands.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {AWS_SERVICES.map((s, i) => (
                <Reveal key={s.name} delay={(i % 5) * 70}>
                  <div className="aws-card group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                      <Cloud className="h-6 w-6 text-amber-300 transition-transform duration-300 group-hover:scale-110" aria-hidden />
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-base font-bold leading-snug">{s.name}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-sky-300">{s.role}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-blue-100 bg-white py-12">
        <div className="shell flex flex-col gap-8 text-sm text-slate-500 md:flex-row md:justify-between">
          <div className="max-w-xl space-y-3 leading-relaxed">
            <p className="font-display text-xl font-bold text-slate-900">
              {APP_NAME} <span className="ml-1 text-base font-medium text-slate-500">ಜಲ ಸಾಕ್ಷಿ</span>
            </p>
            <p>
              Sources: KSPCB monthly water quality reports (our extraction); KSPCB MINARS data via News Karnataka, Feb
              2026; NGT suo motu proceedings via Deccan Herald, June 2024; news coverage of Doddagubbi Lake, Oct 2026.
              Readings are point-in-time samples. Anything marked Demo is seeded and is not from those sources. Causes are
              attributed to the tribunal or to residents as reported, never to this site.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-6 gap-y-2 font-semibold text-slate-700">
            <a href="#/dashboard" className="hover:text-blue-700">Dashboard</a>
            <a href="#/story/lake" className="hover:text-blue-700">Doddagubbi</a>
            <a href="#/story/tracker" className="hover:text-blue-700">Tracker</a>
            <a href="#/story/explorer" className="hover:text-blue-700">KSPCB explorer</a>
            <a href="#/app" className="hover:text-blue-700">App preview</a>
            <a href="#/authority" className="hover:text-blue-700">Authority portal</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ── Local components ───────────────────────────────────────────────────────── */

function Tile({
  value,
  label,
  note,
  tone = 'default',
  delay = 0,
}: {
  value: number;
  label: string;
  note: string;
  tone?: 'default' | 'alert';
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div
        className={`lift h-full rounded-2xl border p-5 ${
          tone === 'alert' ? 'border-rose-200 bg-rose-50' : 'border-blue-100 bg-white/90'
        }`}
      >
        <div className={`font-display text-5xl font-bold leading-none tracking-tight ${tone === 'alert' ? 'text-rose-600' : 'text-slate-900'}`}>
          <CountUp to={value} />
        </div>
        <div className="mt-3 text-[15px] font-semibold text-slate-900">{label}</div>
        <div className="mt-1 text-[13px] leading-snug text-slate-500">{note}</div>
        <SourceChip>Our extraction</SourceChip>
      </div>
    </Reveal>
  );
}

function BigNumber({ to, custom, label, delay = 0 }: { to?: number; custom?: string; label: string; delay?: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className="notice-card h-full rounded-2xl border border-white/15 bg-white/[0.07] p-7 backdrop-blur-sm">
        <div className="font-display bg-gradient-to-r from-rose-300 to-orange-200 bg-clip-text text-7xl font-extrabold leading-none tracking-tight text-transparent">
          {to !== undefined ? <CountUp to={to} /> : custom}
        </div>
        <p className="mt-5 text-base leading-snug text-slate-100">{label}</p>
        <SourceChip tone="cited">NGT via Deccan Herald</SourceChip>
      </div>
    </Reveal>
  );
}

function UserCard({
  icon: Icon,
  title,
  sub,
  items,
  text,
  href,
  cta,
  primary = false,
}: {
  icon: typeof Users;
  title: string;
  sub: string;
  items: string[];
  text: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <div className="lift h-full rounded-3xl border border-blue-100 bg-white/90 p-8">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h3 className="font-display text-2xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{sub}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-base text-slate-700">
        {items.map((t) => (
          <li key={t} className="flex gap-3">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-base text-slate-600">{text}</p>
      <a href={href} className={`btn btn-lg group mt-7 no-underline ${primary ? 'btn-primary' : 'btn-secondary'}`}>
        {cta}
        <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
      </a>
    </div>
  );
}
