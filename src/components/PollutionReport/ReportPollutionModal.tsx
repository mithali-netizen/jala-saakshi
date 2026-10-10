import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import type { StationLocation, WaterReading } from '../../types/waterData';
import { processAndResizeImage, type ProcessedImage } from '../../utils/imageProcessing';
import { analyzePhoto, type PollutionIssue, type AnalyzePhotoResponse } from '../../services/pollutionApi';

interface ReportPollutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: StationLocation;
  currentReading?: WaterReading | null;
  onProceedToComplaint?: (analysis: {
    issue: PollutionIssue;
    severity: number;
    description: string;
    photoPreviewUrl?: string;
  }) => void;
}

const ISSUE_OPTIONS: { value: PollutionIssue; label: string; description: string }[] = [
  { value: 'froth', label: 'Froth / Chemical Foam', description: 'White foam or suds on water surface' },
  { value: 'algae', label: 'Algal Bloom / Green Scum', description: 'Dense green discoloration or surface scum' },
  { value: 'sewage_outfall', label: 'Sewage / Pipe Discharge', description: 'Dark, turbid or foul-smelling effluent entry' },
  { value: 'dead_fish', label: 'Dead Fish / Aquatic Mortality', description: 'Visible dead fish or wildlife along banks' },
  { value: 'other_pollution', label: 'Other Water Pollution', description: 'Debris, industrial oil sheen, or discoloration' },
  { value: 'nothing_wrong', label: 'Nothing Wrong (Clear Water)', description: 'Water appears normal with no visible issues' },
  { value: 'unclear', label: 'Unclear Photo', description: 'Unable to conclusively classify from this photo' },
];

export const ReportPollutionModal: React.FC<ReportPollutionModalProps> = ({
  isOpen,
  onClose,
  station,
  currentReading,
  onProceedToComplaint,
}) => {
  const [fileState, setFileState] = useState<ProcessedImage | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePhotoResponse | null>(null);

  // User corrections on detected results
  const [selectedIssue, setSelectedIssue] = useState<PollutionIssue>('froth');
  const [selectedSeverity, setSelectedSeverity] = useState<number>(3);
  const [customDescription, setCustomDescription] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessingImage(true);
    try {
      // Client-side resize to max 1024px, JPEG ~0.8
      const processed = await processAndResizeImage(file, 1024, 0.8);
      setFileState(processed);
      setAnalysisResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process selected image.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!fileState) return;

    setError(null);
    setIsAnalyzing(true);

    try {
      const res = await analyzePhoto({
        imageBase64: fileState.base64,
        mediaFormat: fileState.mediaFormat,
        lat: station.lat,
        lng: station.lng,
      });

      setAnalysisResult(res);
      setSelectedIssue(res.issue);
      setSelectedSeverity(res.severity);
      setCustomDescription(res.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFileState(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isLowOrNoIssue = selectedIssue === 'nothing_wrong' || selectedIssue === 'unclear';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 id="report-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                AI River Pollution Report
              </h2>
              <p className="text-xs text-slate-500">
                {station.station_name} • {station.river} River
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Station context summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-500">Reporting Location:</span>
              <div className="font-semibold text-slate-800">
                {station.lat.toFixed(4)}° N, {station.lng.toFixed(4)}° E
              </div>
            </div>
            {currentReading?.class && (
              <div className="text-right space-y-0.5">
                <span className="text-slate-500">Official Class:</span>
                <div>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded-md text-[11px]">
                    Class {currentReading.class}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to complete request</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Upload / Preview Screen */}
          {!analysisResult && (
            <div className="space-y-4">
              {!fileState ? (
                <div>
                  <label
                    htmlFor="photo-upload-input"
                    className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/40 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      Upload or capture a river photo
                    </span>
                    <span className="text-xs text-slate-500 mt-1 max-w-xs">
                      Take a photo of foam, algae, dead fish, or dirty water discharge.
                      Resized client-side before analysis.
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 mt-3 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                      JPEG or PNG (Max 1024px)
                    </span>
                    <input
                      id="photo-upload-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  {isProcessingImage && (
                    <div className="text-xs text-center text-slate-500 mt-2 animate-pulse">
                      Optimizing and resizing photo...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-64 shadow-inner">
                    <img
                      src={fileState.dataUrl}
                      alt="Water pollution observation preview"
                      className="object-contain w-full max-h-64"
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 backdrop-blur-xs transition-colors"
                      title="Choose another photo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>
                      Dimensions: {fileState.width} × {fileState.height}px
                    </span>
                    <span>Optimized size: {Math.round(fileState.compressedSize / 1024)} KB</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-semibold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Amazon Nova Lite AI is analyzing photo...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-sky-200" />
                        <span>Analyze Photo with Amazon Bedrock</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Analysis Results Screen */}
          {analysisResult && (
            <div className="space-y-4">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>AI-assisted, not verified:</strong> Review and correct the result before submitting.
              </div>
              {/* Photo preview thumbnail */}
              {fileState && (
                <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <img
                    src={fileState.dataUrl}
                    alt="Analyzed thumbnail"
                    className="w-14 h-14 object-cover rounded-lg shrink-0 border border-slate-200"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-slate-800 truncate">Photo Analyzed</p>
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                      {station.station_name}
                    </p>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-sky-600 hover:text-sky-800 text-[11px] font-medium mt-1"
                    >
                      Upload different photo
                    </button>
                  </div>
                </div>
              )}

              {/* Issue Type Selector (Correctable by user) */}
              <div className="space-y-1.5">
                <label htmlFor="issue-select" className="block text-xs font-bold text-slate-800">
                  Detected Issue (Verify or correct):
                </label>
                <select
                  id="issue-select"
                  value={selectedIssue}
                  onChange={(e) => setSelectedIssue(e.target.value as PollutionIssue)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 p-2.5 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {ISSUE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Level (1 - 5 Indicator) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="severity-range" className="text-xs font-bold text-slate-800">
                    Severity Rating (1 to 5):
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    Level {selectedSeverity} / 5
                  </span>
                </div>

                {/* 5-bar visual indicator */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const isFilled = lvl <= selectedSeverity;
                    let color = 'bg-slate-200';
                    if (isFilled) {
                      if (lvl === 1) color = 'bg-emerald-500';
                      else if (lvl === 2) color = 'bg-lime-500';
                      else if (lvl === 3) color = 'bg-amber-500';
                      else if (lvl === 4) color = 'bg-orange-500';
                      else color = 'bg-red-600';
                    }
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedSeverity(lvl)}
                        className={`h-3 rounded-sm transition-all cursor-pointer ${color}`}
                        title={`Set severity ${lvl}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description-input" className="block text-xs font-bold text-slate-800">
                  Description:
                </label>
                <textarea
                  id="description-input"
                  rows={2}
                  maxLength={200}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full text-xs text-slate-800 rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter a brief plain-English description..."
                />
                <div className="text-[10px] text-right text-slate-400">
                  {customDescription.length}/200 characters
                </div>
              </div>

              {/* Special notice if nothing_wrong or unclear */}
              {isLowOrNoIssue && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    The photo was classified as <strong>{selectedIssue === 'nothing_wrong' ? 'Nothing Wrong' : 'Unclear'}</strong>.
                    If you observed an active issue not caught by the model, select an issue type above or continue if you still wish to submit an observation.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Retake Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onProceedToComplaint) {
                      onProceedToComplaint({
                        issue: selectedIssue,
                        severity: selectedSeverity,
                        description: customDescription,
                        photoPreviewUrl: fileState?.dataUrl,
                      });
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Continue to Formal Complaint</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
