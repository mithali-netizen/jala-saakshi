import React, { useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  ChevronDown,
  HelpCircle,
  Mail,
  MapPin,
  Megaphone,
  Minus,
  Phone,
  Camera,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { MonitoringLocation, TrendDirection } from '../../utils/stations';
import { computeTrend } from '../../utils/stations';
import {
  barPosition,
  classVerdict,
  getClassConfig,
  PARAM_LIMITS,
  type ParamKey,
} from '../../utils/waterQuality';
import { formatMonth } from '../../utils/months';
import { API_BASE_URL, COMPLAINT_EMAIL, COMPLAINT_PHONES, RESPONSIBLE_AUTHORITY } from '../../config';
import { classMeaning, coliformMeaning, bodMeaning, doMeaning, headline, OFFICIAL_EXPLANATIONS } from '../../plainLanguage';
import { Hint } from '../ui/Hint';
import { TrendChart } from './TrendChart';
import { ReportPollutionModal } from '../PollutionReport/ReportPollutionModal';
import { ComplaintDraftModal, type ComplaintDraftInput } from '../PollutionReport/ComplaintDraftModal';

interface StationPanelProps {
  location: MonitoringLocation;
  selectedMonth: string;
  onClose: () => void;
}

const TREND_UI: Record<TrendDirection, { label: string; cls: string; Icon: typeof Minus }> = {
  improving: { label: 'Improving', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', Icon: TrendingUp },
  worsening: { label: 'Worsening', cls: 'bg-rose-50 text-rose-800 border-rose-200', Icon: TrendingDown },
  stable: { label: 'Stable', cls: 'bg-slate-100 text-slate-700 border-slate-200', Icon: Minus },
  unknown: { label: 'Not enough readings', cls: 'bg-slate-100 text-slate-500 border-slate-200', Icon: Minus },
};

const ALERT_KEY = 'jala-alerts';

function readAlerts(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ALERT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

const ParamBar: React.FC<{ param: ParamKey; value: number | null | undefined; explanation: string }> = ({
  param,
  value,
  explanation,
}) => {
  const limit = PARAM_LIMITS[param];
  const has = value != null;
  const best = has ? limit.bestClass(value) : null;
  const visual = getClassConfig(best);
  const verdict = !has ? 'Not recorded' : best ? `Meets Class ${best} limit` : limit.failText;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <Hint text={limit.explain}>
          <span className="font-medium text-slate-800">{limit.label}</span>
        </Hint>
        <span className="font-semibold tabular-nums text-slate-900">
          {has ? `${value.toLocaleString()} ` : '—'}
          <span className="text-xs font-normal text-slate-500">{limit.unit}</span>
        </span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-slate-200">
        {has && (
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${Math.max(2, barPosition(limit, value) * 100)}%`, background: best ? visual.bgHex : '#be123c' }}
          />
        )}
        {limit.ticks.map((t) => (
          <span
            key={t.value}
            className="absolute -top-1 h-4 w-px bg-slate-700/60"
            style={{ left: `${barPosition(limit, t.value) * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <div className="relative mt-0.5 h-4 text-[10px] text-slate-500" aria-hidden>
        {limit.ticks.map((t) => (
          <span key={t.value} className="absolute -translate-x-1/2" style={{ left: `${barPosition(limit, t.value) * 100}%` }}>
            {t.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-600">
        <span className="font-semibold text-slate-700">{verdict}.</span> {explanation}
      </p>

    </div>
  );
};

export const StationPanel: React.FC<StationPanelProps> = ({ location, selectedMonth, onClose }) => {
  const reading = location.byMonth.get(selectedMonth);
  const sampled = !!reading && reading.status !== 'no_access';
  const visual = getClassConfig(sampled ? reading.class : null);
  const trend = useMemo(() => computeTrend(location, selectedMonth), [location, selectedMonth]);
  const T = TREND_UI[trend];

  const lastMonth = useMemo(
    () => [...location.months].reverse().find((m) => m <= selectedMonth && location.byMonth.get(m)?.status !== 'no_access'),
    [location, selectedMonth],
  );

  const [alertsOn, setAlertsOn] = useState(() => readAlerts().includes(location.id));
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintInput, setComplaintInput] = useState<ComplaintDraftInput | null>(null);
  const reportStation = {
    station_code: location.codes[0] ?? location.id,
    station_name: location.name,
    river: location.river,
    lat: location.lat,
    lng: location.lng,
  };
  const toggleAlerts = () => {
    const next = !alertsOn;
    setAlertsOn(next);
    try {
      const set = new Set(readAlerts());
      if (next) set.add(location.id);
      else set.delete(location.id);
      localStorage.setItem(ALERT_KEY, JSON.stringify([...set]));
    } catch {
      /* storage unavailable: keep the in-memory toggle */
    }
  };

  const reportByEmail = () => {
    const f = (v: number | null | undefined, unit: string) => (v != null ? `${v.toLocaleString()} ${unit}` : 'Not recorded');
    const body = [
      'CITIZEN WATER QUALITY / POLLUTION REPORT',
      `Location: ${location.name}`,
      `River: ${location.river}`,
      `Month of monitoring data: ${formatMonth(selectedMonth)}`,
      `CPCB class: ${reading?.class ? `Class ${reading.class}` : 'Unclassified'}`,
      `DO: ${f(reading?.do, 'mg/L')}`,
      `BOD: ${f(reading?.bod, 'mg/L')}`,
      `Total coliform: ${f(reading?.total_coliform, 'MPN/100ml')}`,
      `Coordinates: ${location.lat.toFixed(5)} N, ${location.lng.toFixed(5)} E`,
      '',
      `To: ${RESPONSIBLE_AUTHORITY.name}, ${RESPONSIBLE_AUTHORITY.division}`,
    ].join('\n');
    window.open(`mailto:${COMPLAINT_EMAIL}?subject=${encodeURIComponent(
      `Pollution report: ${location.name} (${formatMonth(selectedMonth)})`,
    )}&body=${encodeURIComponent(body)}`, '_self');
  };

  return (
    <aside
      role="dialog"
      aria-labelledby="station-panel-title"
      className="flex max-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location.river}</span>
          </div>
          <h2 id="station-panel-title" className="mt-0.5 text-base font-bold leading-snug text-slate-900">
            {location.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Class + plain meaning */}
        <section className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: visual.bgHex }}
            aria-hidden
          >
            {visual.letter}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {sampled && reading.class ? `Class ${reading.class}` : 'No class'} · {formatMonth(selectedMonth)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${T.cls}`}>
                <T.Icon className="h-3 w-3" /> {T.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{classVerdict(sampled ? reading.class : null)}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {sampled ? classMeaning(reading.class) : headline(reading)}
            </p>
          </div>
        </section>

        {!sampled && lastMonth && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Not sampled in {formatMonth(selectedMonth)}. Last reading was {formatMonth(lastMonth)}.
          </p>
        )}
        {location.names.length > 1 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            KSPCB lists {location.names.length} stations at this point; the worst reading each month is shown.
          </p>
        )}

        {/* Parameters against CPCB limits */}
        {sampled && (
          <section aria-label="Key readings" className="space-y-4">
            <ParamBar param="do" value={reading.do} explanation={doMeaning(reading.do)} />
            <ParamBar param="bod" value={reading.bod} explanation={bodMeaning(reading.bod)} />
            <ParamBar param="coliform" value={reading.total_coliform} explanation={coliformMeaning(reading.total_coliform)} />
            <p className="text-[11px] text-slate-500">
              Tick marks show CPCB class limits. pH was not reported in this data.
            </p>
          </section>
        )}

        {/* Trend */}
        <section aria-label="Trend over time">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            All readings, {formatMonth(location.months[0])} to {formatMonth(location.months[location.months.length - 1])}
          </h3>
          <TrendChart location={location} selectedMonth={selectedMonth} />
        </section>

        {/* Actions */}
        <section className="grid grid-cols-2 gap-2">
          {API_BASE_URL && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <Camera className="h-4 w-4" /> Report pollution <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleAlerts}
            aria-pressed={alertsOn}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
              alertsOn ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            {alertsOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {alertsOn ? 'Alerts on' : 'Get alerts'}
          </button>
          <button
            type="button"
            onClick={reportByEmail}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <Megaphone className="h-3.5 w-3.5" /> Draft a direct email without a photo
          </button>
          {alertsOn && (
            <p className="col-span-2 text-[11px] text-slate-500">
              Saved on this device. Alert delivery starts when the 48-hour risk engine goes live.
            </p>
          )}
        </section>

        <details className="group rounded-xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-500" /> What do the classes and terms mean?
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-slate-200 px-3 py-3 text-xs text-slate-600">
            {OFFICIAL_EXPLANATIONS.classes.map((c) => (
              <p key={c.code}>
                <strong className="text-slate-800">Class {c.code}</strong> · {c.title}.{' '}
                <span className="text-slate-500">{c.description}</span>
              </p>
            ))}
          </div>
        </details>

        <details className="group rounded-xl border border-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" /> Contact KSPCB directly
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-slate-200 px-3 py-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              {RESPONSIBLE_AUTHORITY.name}
              <span className="block font-normal text-slate-500">{RESPONSIBLE_AUTHORITY.division}</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMPLAINT_PHONES.map((p) => (
                <a
                  key={p}
                  href={`tel:${p.replace(/-/g, '')}`}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-800 hover:bg-slate-200"
                >
                  <Phone className="h-3 w-3" /> {p}
                </a>
              ))}
            </div>
            <a href={`mailto:${COMPLAINT_EMAIL}`} className="text-teal-800 underline">
              {COMPLAINT_EMAIL}
            </a>
          </div>
        </details>
      </div>
      <ReportPollutionModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        station={reportStation}
        currentReading={reading}
        onProceedToComplaint={(analysis) => {
          setComplaintInput(analysis);
          setIsReportModalOpen(false);
          setIsComplaintModalOpen(true);
        }}
      />
      {complaintInput && (
        <ComplaintDraftModal
          isOpen={isComplaintModalOpen}
          onClose={() => {
            setIsComplaintModalOpen(false);
            setComplaintInput(null);
          }}
          onBack={() => {
            setIsComplaintModalOpen(false);
            setIsReportModalOpen(true);
          }}
          station={reportStation}
          currentReading={reading}
          selectedMonth={selectedMonth}
          input={complaintInput}
        />
      )}
    </aside>
  );
};
