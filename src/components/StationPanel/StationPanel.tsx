import React, { useState } from 'react';
import type { WaterReading, StationLocation } from '../../types/waterData';
import { getClassConfig } from '../../utils/waterQuality';
import { TrendChart } from './TrendChart';
import { formatMonthName } from '../Timeline/MonthSelector';
import { COMPLAINT_EMAIL, COMPLAINT_PHONES, RESPONSIBLE_AUTHORITY } from '../../config';
import {
  classMeaning,
  bodMeaning,
  doMeaning,
  coliformMeaning,
  headline,
  OFFICIAL_EXPLANATIONS,
} from '../../plainLanguage';
import {
  X,
  MapPin,
  ArrowDownCircle,
  ChevronDown,
  Info,
  AlertTriangle,
  HelpCircle,
  Wind,
  Trash2,
  Bug,
  Mail,
  Phone,
  ShieldAlert,
  Check,
  Copy,
} from 'lucide-react';

interface StationPanelProps {
  station: StationLocation;
  allStations: StationLocation[];
  readings: WaterReading[];
  months: string[];
  selectedMonth: string;
  onClose: () => void;
}

export const StationPanel: React.FC<StationPanelProps> = ({
  station,
  allStations,
  readings,
  months,
  selectedMonth,
  onClose,
}) => {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // All historical readings for this station
  const stationReadings = readings.filter((r) => r.station_code === station.station_code);

  // Reading for the currently selected month
  const currentReading = stationReadings.find((r) => r.month === selectedMonth);

  // Find upstream station (station with immediate preceding river_order)
  const upstreamStation = React.useMemo(() => {
    if (!station.river_order || station.river_order <= 1) return null;
    return allStations.find((s) => s.river_order === (station.river_order! - 1)) || null;
  }, [station, allStations]);

  // Upstream reading in current month
  const upstreamReading = React.useMemo(() => {
    if (!upstreamStation) return null;
    return readings.find(
      (r) => r.station_code === upstreamStation.station_code && r.month === selectedMonth
    );
  }, [upstreamStation, readings, selectedMonth]);

  const classVisual = getClassConfig(currentReading?.class);

  // Plain-language interpretations from src/plainLanguage.ts
  const stationHeadline = headline(currentReading, upstreamReading);
  const classExplanation = classMeaning(currentReading?.class);
  const bodExplanation = bodMeaning(currentReading?.bod, upstreamReading?.bod);
  const doExplanation = doMeaning(currentReading?.do);
  const coliformExplanation = coliformMeaning(currentReading?.total_coliform);

  // Generate pre-filled complaint email body
  const generateComplaintBody = () => [
    `CITIZEN WATER QUALITY / POLLUTION REPORT`,
    `=========================================`,
    `Station: ${station.station_name} (${station.station_code})`,
    `River: ${station.river}`,
    `River Flow Order: #${station.river_order ?? 'N/A'}`,
    `Monitoring Month: ${selectedMonth}`,
    `Water Quality Class: Class ${currentReading?.class || 'Unclassified'}`,
    `-----------------------------------------`,
    `Measurements:`,
    `  Dissolved Oxygen (DO): ${currentReading?.do != null ? `${currentReading.do} mg/L` : 'Not recorded'}`,
    `  Biochemical Oxygen Demand (BOD): ${currentReading?.bod != null ? `${currentReading.bod} mg/L` : 'Not recorded'}`,
    `  Total Coliform: ${currentReading?.total_coliform != null ? `${currentReading.total_coliform.toLocaleString()} MPN/100ml` : 'Not recorded'}`,
    `  Fecal Coliform: ${currentReading?.fecal_coliform != null ? `${currentReading.fecal_coliform.toLocaleString()} MPN/100ml` : 'Not recorded'}`,
    `-----------------------------------------`,
    `Location: ${station.lat.toFixed(5)} N, ${station.lng.toFixed(5)} E`,
    `Summary: ${stationHeadline}`,
    ``,
    `Responsible Authority: ${RESPONSIBLE_AUTHORITY.name}`,
    `Division: ${RESPONSIBLE_AUTHORITY.division}`,
  ].join('\n');

  const handleReportPollution = async () => {
    const body = generateComplaintBody();
    const subject = encodeURIComponent(
      `Pollution Report: ${station.station_name} — ${station.river} River (${selectedMonth})`
    );
    const encodedBody = encodeURIComponent(body);

    // Attempt to copy the plain text to clipboard as a backup
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(body);
      }
    } catch (_) {
      // clipboard optional; the mailto: still opens
    }

    // Open pre-filled mailto: link (opens user's default email client)
    window.location.href = `mailto:${COMPLAINT_EMAIL}?subject=${subject}&body=${encodedBody}`;

    setCopyStatus('copied');
    setTimeout(() => setCopyStatus(null), 5000);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="station-panel-title"
      className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col h-full overflow-hidden max-h-[85vh] lg:max-h-none"
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
              {station.station_code}
            </span>
            <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {station.river} River
            </span>
          </div>
          <h2
            id="station-panel-title"
            className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
          >
            {station.station_name}
          </h2>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              Flow Position: <strong>#{station.river_order ?? 'N/A'}</strong> of {allStations.length}
            </span>
            <span>•</span>
            <span>Month: <strong>{formatMonthName(selectedMonth)}</strong></span>
            {currentReading?.district && (
              <>
                <span>•</span>
                <span>District: <strong>{currentReading.district}</strong></span>
              </>
            )}
          </div>
          {currentReading?.stretch && (
            <div className="text-[11px] text-slate-400 mt-0.5 italic truncate">
              Stretch: {currentReading.stretch}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close station details"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
        {/* 1. Plain-Language Headline Box */}
        <div
          className="p-3.5 rounded-xl border flex items-start gap-3 shadow-2xs"
          style={{
            backgroundColor: `${classVisual.bgHex}15`,
            borderColor: `${classVisual.bgHex}40`,
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm"
            style={{
              backgroundColor: classVisual.bgHex,
              color: classVisual.textHex,
            }}
          >
            {classVisual.letter}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {classVisual.label}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5 leading-snug">
              {stationHeadline}
            </p>
            <p className="text-xs text-slate-700 mt-1 leading-normal">
              {classExplanation}
            </p>
          </div>
        </div>

        {/* 2. Plain-Language Key Signals Cards */}
        {currentReading && currentReading.status !== 'no_access' && (
          <div className="grid grid-cols-1 gap-2.5">
            {/* Waste (BOD) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Organic Waste (BOD)</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">
                  {currentReading.bod !== null ? `${currentReading.bod} mg/L` : '—'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{bodExplanation}</p>
            </div>

            {/* Oxygen (DO) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-sky-700">
                  <Wind className="w-3.5 h-3.5" />
                  <span>River Oxygen (DO)</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">
                  {currentReading.do !== null ? `${currentReading.do} mg/L` : '—'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{doExplanation}</p>
            </div>

            {/* Germs (Coliform) */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <Bug className="w-3.5 h-3.5" />
                  <span>Bacteria & Germs</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">
                  {currentReading.total_coliform !== null
                    ? `${currentReading.total_coliform.toLocaleString()} MPN`
                    : '—'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{coliformExplanation}</p>
            </div>
          </div>
        )}

        {/* 3. Upstream Comparison Banner */}
        {upstreamStation && (
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
            <ArrowDownCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-slate-800 block">
                Upstream River Comparison ({upstreamStation.station_name})
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Waste (BOD):{' '}
                  <strong>
                    {upstreamReading?.bod !== null && upstreamReading?.bod !== undefined
                      ? `${upstreamReading.bod} upstream`
                      : '— upstream'}
                  </strong>
                  ,{' '}
                  <strong className="text-blue-900 font-bold">
                    {currentReading?.bod !== null && currentReading?.bod !== undefined
                      ? `${currentReading.bod} here`
                      : '— here'}
                  </strong>
                </span>
                {upstreamReading?.bod &&
                  currentReading?.bod &&
                  currentReading.bod >= upstreamReading.bod * 1.5 && (
                    <span className="bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                      {Math.round(currentReading.bod / upstreamReading.bod)}x more waste here
                    </span>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* 4. Action Layer: Report Pollution & Responsible Authority */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Citizen Action & Grievance
                </h4>
                <p className="text-xs text-amber-800">
                  Submit observations or report non-compliance directly to authorities.
                </p>
              </div>
            </div>
          </div>

          {/* Responsible Authority Contact Card */}
          <div className="bg-white/80 border border-amber-200/60 rounded-lg p-3 text-xs text-slate-700 space-y-2">
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold block tracking-wide mb-0.5">
                Responsible Authority
              </span>
              <div className="font-bold text-slate-900">{RESPONSIBLE_AUTHORITY.name}</div>
              <div className="text-slate-500 text-[11px]">{RESPONSIBLE_AUTHORITY.division}</div>
            </div>

            {/* Phone numbers */}
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold block tracking-wide mb-1">
                Landline Numbers
              </span>
              <div className="grid grid-cols-2 gap-1">
                {COMPLAINT_PHONES.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone.replace(/-/g, '')}`}
                    className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-mono text-[11px] font-semibold"
                  >
                    <Phone className="w-3 h-3 shrink-0 text-amber-700" />
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <span className="text-[11px] text-slate-500 uppercase font-semibold block tracking-wide mb-1">
                Email
              </span>
              <a
                href={`mailto:${COMPLAINT_EMAIL}`}
                className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1.5 rounded-lg hover:bg-amber-100 transition-colors text-[11px] font-semibold w-full"
              >
                <Mail className="w-3 h-3 shrink-0 text-amber-700" />
                {COMPLAINT_EMAIL}
              </a>
            </div>
          </div>

          {/* Action Button — opens mailto: with prefilled details */}
          <button
            type="button"
            onClick={handleReportPollution}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all transform active:scale-[0.99]"
          >
            {copyStatus === 'copied' ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Email drafted — sending via your mail app</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Report this pollution</span>
                <Copy className="w-3.5 h-3.5 opacity-70" />
              </>
            )}
          </button>

          {copyStatus === 'copied' && (
            <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>
                Pre-filled email opened in your mail app addressed to {COMPLAINT_EMAIL}.
                The complaint details are also copied to your clipboard.
              </span>
            </div>
          )}

          <p className="text-[11px] text-amber-800/80 italic">
            * Opens your mail app with station name, river, month, water class, and readings pre-filled.
            You can also call the KSPCB ICCC directly on any of the landline numbers above.
          </p>
        </div>

        {/* 5. 8-Month Trend Chart */}
        <TrendChart
          months={months}
          stationReadings={stationReadings}
          selectedMonth={selectedMonth}
        />

        {/* 6. "What do these terms mean?" Expander */}
        <details className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
          <summary className="p-3 text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors list-none">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>What do these terms mean?</span>
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="p-3.5 pt-1 border-t border-slate-200/60 text-xs space-y-3 mt-1 text-slate-600">
            <div>
              <h4 className="font-bold text-slate-800 mb-1">Official CPCB Water Quality Classes</h4>
              <p className="text-[11px] text-slate-500 mb-2">
                CPCB classifies inland surface waters according to Designated-Best-Use:
              </p>
              <ul className="space-y-1.5">
                {OFFICIAL_EXPLANATIONS.classes.map((c) => (
                  <li key={c.code} className="bg-white p-2 rounded border border-slate-200">
                    <strong className="text-slate-800 font-mono">Class {c.code}:</strong>{' '}
                    <span className="font-semibold text-slate-700">{c.title}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">{c.description}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">Measurements & Scientific Units</h4>
              <ul className="space-y-1.5">
                {OFFICIAL_EXPLANATIONS.metrics.map((m) => (
                  <li key={m.name} className="bg-white p-2 rounded border border-slate-200">
                    <div className="font-semibold text-slate-800">{m.name}</div>
                    <div className="text-[11px] text-blue-700 font-mono">Unit: {m.unit}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{m.meaning}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>

        {/* 7. Collapsed Raw Measurements */}
        <details className="group bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all">
          <summary className="p-3 text-xs font-semibold text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors list-none">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              <span>See the measurements</span>
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>

          <div className="p-3.5 pt-0 border-t border-slate-200/60 text-xs space-y-2 mt-2">
            {currentReading?.status === 'no_access' ? (
              <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Site Access Restricted:</strong> {currentReading.note || 'Unable to collect sample.'}
                </div>
              </div>
            ) : currentReading ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Dissolved Oxygen (DO)</span>
                  <span className="text-sm font-bold text-slate-800">
                    {currentReading.do !== null ? `${currentReading.do} mg/L` : 'Missing'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Biochemical Oxygen Demand (BOD)</span>
                  <span className="text-sm font-bold text-slate-800">
                    {currentReading.bod !== null ? `${currentReading.bod} mg/L` : 'Missing'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Total Coliform</span>
                  <span className="text-sm font-bold text-slate-800">
                    {currentReading.total_coliform !== null
                      ? `${currentReading.total_coliform.toLocaleString()} MPN/100ml`
                      : 'Missing'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-500 text-[11px] block">Fecal Coliform</span>
                  <span className="text-sm font-bold text-slate-800">
                    {currentReading.fecal_coliform !== null
                      ? `${currentReading.fecal_coliform.toLocaleString()} MPN/100ml`
                      : 'Missing'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200 col-span-2">
                  <span className="text-slate-500 text-[11px] block">Coordinates</span>
                  <span className="font-mono text-xs text-slate-700">
                    {station.lat.toFixed(4)}° N, {station.lng.toFixed(4)}° E
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic">No measurement recorded for {selectedMonth}.</p>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
