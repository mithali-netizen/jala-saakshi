import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import type { StationLocation, WaterReading } from '../../types/waterData';
import type { PollutionIssue } from '../../services/pollutionApi';
import { draftComplaint, type DraftComplaintResponse } from '../../services/pollutionApi';
import { COMPLAINT_EMAIL, RESPONSIBLE_AUTHORITY } from '../../config';

export interface ComplaintDraftInput {
  issue: PollutionIssue;
  severity: number;
  description: string;
  photoPreviewUrl?: string;
}

interface ComplaintDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  station: StationLocation;
  currentReading?: WaterReading | null;
  selectedMonth: string;
  input: ComplaintDraftInput;
}

interface CcRecipient {
  id: string;
  label: string;
  email: string;
  defaultChecked: boolean;
}

const CC_RECIPIENTS: CcRecipient[] = [
  { id: 'kspcb', label: 'KSPCB ICCC', email: 'ICCC.kspcb@gmail.com', defaultChecked: true },
  { id: 'ngt', label: 'NGT Southern Zone Registry', email: 'ngt-sz@gov.in', defaultChecked: false },
  { id: 'collector', label: 'District Collector (local authority)', email: 'collector@karnataka.gov.in', defaultChecked: false },
];

function severityLabel(s: number): string {
  if (s <= 1) return 'Very Low';
  if (s === 2) return 'Low';
  if (s === 3) return 'Moderate';
  if (s === 4) return 'High';
  return 'Critical';
}

function issueDisplayLabel(issue: PollutionIssue): string {
  const map: Record<PollutionIssue, string> = {
    dead_fish: 'Dead Fish / Aquatic Mortality',
    froth: 'Froth / Chemical Foam',
    sewage_outfall: 'Sewage / Effluent Discharge',
    algae: 'Algal Bloom',
    other_pollution: 'Other Water Pollution',
    nothing_wrong: 'No Issue Observed',
    unclear: 'Inconclusive Observation',
  };
  return map[issue] ?? issue;
}

export const ComplaintDraftModal: React.FC<ComplaintDraftModalProps> = ({
  isOpen,
  onClose,
  onBack,
  station,
  currentReading,
  selectedMonth,
  input,
}) => {
  const [activeTab, setActiveTab] = useState<'en' | 'kn' | 'hi'>('en');
  const [draft, setDraft] = useState<DraftComplaintResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [checkedCc, setCheckedCc] = useState<Record<string, boolean>>(
    Object.fromEntries(CC_RECIPIENTS.map((r) => [r.id, r.defaultChecked]))
  );
  const [showRawDetails, setShowRawDetails] = useState(false);

  const fetchDraft = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDraft(null);
    try {
      const result = await draftComplaint({
        issue: input.issue,
        severity: input.severity,
        description: input.description,
        stationName: station.station_name,
        riverName: station.river,
        lat: station.lat,
        lng: station.lng,
        reportDate: new Date().toISOString().split('T')[0],
        lastReading: currentReading
          ? { month: selectedMonth, class: currentReading.class ?? null, do: currentReading.do ?? null, bod: currentReading.bod ?? null, total_coliform: currentReading.total_coliform ?? null }
          : null,
        language: 'all',
      });
      if (result.suggestedCc?.length) {
        setCheckedCc((prev) => {
          const next = { ...prev };
          CC_RECIPIENTS.forEach((r) => { if (result.suggestedCc.includes(r.email)) next[r.id] = true; });
          return next;
        });
      }
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft complaint.');
    } finally {
      setIsLoading(false);
    }
  }, [input, station, currentReading, selectedMonth]);

  useEffect(() => { if (isOpen) { void fetchDraft(); } }, [isOpen, fetchDraft]);

  if (!isOpen) return null;

  const selectedCcEmails = CC_RECIPIENTS.filter((r) => checkedCc[r.id]).map((r) => r.email);
  const currentSubject =
    activeTab === 'en' ? draft?.subjectEn
      : activeTab === 'kn' ? draft?.subjectKn
        : draft?.subjectHi;
  const currentBody =
    activeTab === 'en' ? draft?.bodyEn
      : activeTab === 'kn' ? draft?.bodyKn
        : draft?.bodyHi;
  const hasContent = !!currentBody?.trim();

  const handleCopyBody = async () => {
    if (!currentBody) return;
    try { await navigator.clipboard.writeText(currentBody); } catch { /* ignore */ }
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 3000);
  };

  const handleOpenMailto = () => {
    if (!currentBody || !currentSubject) return;
    const to = COMPLAINT_EMAIL;
    const ccParam = selectedCcEmails.filter((e) => e !== to).join(',');
    const subject = encodeURIComponent(currentSubject);
    const body = encodeURIComponent(currentBody);
    const href = `mailto:${to}${ccParam ? `?cc=${encodeURIComponent(ccParam)}&` : '?'}subject=${subject}&body=${body}`;
    window.open(href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="complaint-modal-title">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="complaint-modal-title" className="text-base sm:text-lg font-bold text-slate-900">AI-Drafted Formal Complaint</h2>
              <p className="text-xs text-slate-500">{station.station_name} &bull; {station.river} River</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs font-medium" aria-label="Go back">
              <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1" aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* AI disclaimer */}
          <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <p><strong>Notice:</strong> Review before sending.</p>
          </div>

          {/* Observation summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <button type="button" onClick={() => setShowRawDetails((v) => !v)} className="w-full flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
              <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-slate-500" />Observation Summary</span>
              {showRawDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showRawDetails && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div><span className="text-slate-500">Issue</span><p className="font-semibold text-slate-800">{issueDisplayLabel(input.issue)}</p></div>
                <div><span className="text-slate-500">Severity</span><p className="font-semibold text-slate-800">{input.severity}/5 ({severityLabel(input.severity)})</p></div>
                <div className="col-span-2"><span className="text-slate-500">Description</span><p className="font-semibold text-slate-800 leading-relaxed">{input.description}</p></div>
                {input.photoPreviewUrl && (
                  <div className="col-span-2 flex items-center gap-2 mt-1">
                    <img src={input.photoPreviewUrl} alt="Evidence" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                    <span className="text-slate-400 italic">Photo evidence (not embedded in email)</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="py-10 flex flex-col items-center gap-3 text-sm text-slate-500">
              <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span>Amazon Nova Lite is drafting your complaint&hellip;</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Could not generate draft</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">{error}</p>
                <button type="button" onClick={() => void fetchDraft()} className="mt-2 text-red-700 underline font-medium hover:text-red-900">Retry</button>
              </div>
            </div>
          )}

          {/* Draft content */}
          {!isLoading && draft && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-semibold">
                <button id="tab-en" type="button" onClick={() => setActiveTab('en')} className={`flex-1 py-2 transition-colors ${activeTab === 'en' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  English
                </button>
                <button id="tab-hi" type="button" onClick={() => setActiveTab('hi')} className={`flex-1 py-2 border-l border-slate-200 transition-colors ${activeTab === 'hi' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  हिन्दी
                </button>
                <button id="tab-kn" type="button" onClick={() => setActiveTab('kn')} className={`flex-1 py-2 border-l border-slate-200 transition-colors ${activeTab === 'kn' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  ಕನ್ನಡ
                </button>
              </div>

              {/* Subject */}
              {currentSubject && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 leading-relaxed">{currentSubject}</div>
                </div>
              )}

              {/* Body */}
              {hasContent && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Body</label>
                    <button type="button" id="copy-draft-body" onClick={() => void handleCopyBody()} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-sky-700 transition-colors">
                      {copyStatus === 'copied' ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">Copied!</span></> : <><Copy className="w-3.5 h-3.5" /><span>Copy text</span></>}
                    </button>
                  </div>
                  <textarea readOnly id={`draft-body-${activeTab}`} value={currentBody ?? ''} rows={12} className="w-full text-[12px] text-slate-800 rounded-xl border border-slate-200 p-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono leading-relaxed resize-y" aria-label={`Draft complaint body in ${activeTab === 'en' ? 'English' : activeTab === 'hi' ? 'Hindi' : 'Kannada'}`} />
                </div>
              )}

              {/* Hindi not available */}
              {activeTab === 'hi' && !draft.bodyHi?.trim() && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <p>Hindi draft not available. Please use the English version.</p>
                </div>
              )}

              {/* Kannada not available */}
              {activeTab === 'kn' && !draft.bodyKn?.trim() && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <p>Kannada draft not available. Please use the English version.</p>
                </div>
              )}

              {/* CC checkboxes */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">CC Recipients</p>
                <div className="space-y-2">
                  {CC_RECIPIENTS.map((r) => (
                    <label key={r.id} htmlFor={`cc-${r.id}`} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-sky-50 hover:border-sky-200 transition-colors group">
                      <input id={`cc-${r.id}`} type="checkbox" checked={!!checkedCc[r.id]} onChange={(e) => setCheckedCc((prev) => ({ ...prev, [r.id]: e.target.checked }))} className="accent-sky-600 w-3.5 h-3.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-800">{r.label}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{r.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {draft && !isLoading && (
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="flex-1 text-[11px] text-slate-400 space-y-0.5 leading-snug min-w-0">
              <p className="font-semibold text-slate-500">{RESPONSIBLE_AUTHORITY.name}</p>
              <p className="truncate">{RESPONSIBLE_AUTHORITY.division}</p>
              <p className="font-mono">{COMPLAINT_EMAIL}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button type="button" id="copy-complaint-btn" onClick={() => void handleCopyBody()} className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors">
                {copyStatus === 'copied' ? <><Check className="w-4 h-4 text-emerald-500" /><span>Copied!</span></> : <><Copy className="w-4 h-4" /><span>Copy Draft</span></>}
              </button>
              <button type="button" id="open-complaint-email-btn" onClick={handleOpenMailto} disabled={!hasContent} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold shadow-sm transition-colors">
                <Mail className="w-4 h-4" /><span>Open Official Complaint</span><ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};