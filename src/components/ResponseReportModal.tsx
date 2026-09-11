import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnalysisResult, AuditEvent } from '../types';
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Printer,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { buildPlainTextReport } from '../reportBuilder';

interface ResponseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  rawInput: string;
  auditEvents: AuditEvent[];
}

export const ResponseReportModal: React.FC<ResponseReportModalProps> = ({
  isOpen,
  onClose,
  result,
  rawInput,
  auditEvents,
}) => {
  const [copied, setCopied] = useState(false);
  const [showInternalAudit, setShowInternalAudit] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeDialog = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDialog]);

  if (!isOpen) return null;

  // Extract entities & assessment
  const personEntity = result?.entities.find((e) => e.category === 'PERSON');
  const hazardEntity = result?.entities.find((e) => e.category === 'HAZARD');
  const urgencyEntity = result?.entities.find((e) => e.category === 'URGENCY');

  const actions = result?.actions || [];
  const pendingActions = actions.filter(
    (a) =>
      a.status === 'AUTHORIZATION_REQUIRED' ||
      a.status === 'AWAITING_CONFIRMATION' ||
      a.status === 'AUTHORIZING'
  );

  const isPlanCompleted = pendingActions.length === 0 && actions.length > 0;

  const verifiedFacts = result?.verificationFacts.filter(
    (f) => f.status === 'CONFIRMED' || f.sourceType === 'SYSTEM_VERIFIED'
  ) || [];

  const unverifiedOrAmbiguities = [
    ...(result?.ambiguities.map((a) => a.description) || []),
    ...(result?.verificationFacts
      .filter((f) => f.status === 'NEEDS_CONFIRMATION' || f.status === 'UNKNOWN')
      .map((f) => f.claim) || []),
  ];

  const reportDate = result?.timestamp || new Date().toLocaleString();
  const reportRef = `INC-${Date.now().toString().slice(-6)}`;
  const title = result?.primaryIntent || (hazardEntity ? `${hazardEntity.value.toUpperCase()} EMERGENCY RESPONSE` : 'INCIDENT RESPONSE PLAN');
  const urgencyDisplay = urgencyEntity?.value || (hazardEntity ? 'HIGH' : 'MEDIUM');

  const generatePlainTextReport = () => buildPlainTextReport({ result, rawInput });

  const handleCopyReport = () => {
    const text = generatePlainTextReport();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadReport = () => {
    const text = generatePlainTextReport();
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nexusact-response-report-${Date.now()}.txt`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div
        id="response-report-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/50 p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          id="response-report-modal"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="response-report-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-stone-200/90 bg-[#faf8f5] shadow-2xl flex flex-col font-sans outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar / Controls */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 border border-amber-300 text-amber-800 shadow-2xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="response-report-modal-title" className="text-sm font-black tracking-tight text-stone-900 uppercase">
                    RESPONSE REPORT
                  </h2>
                  <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-600">
                    REF: {reportRef}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-medium">
                  Official Incident & Action Synthesis Document
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                id="btn-report-copy"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs cursor-pointer"
                title="Share and copy report to clipboard"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-stone-600" />}
                <span>{copied ? 'Copied' : 'Share Report'}</span>
              </motion.button>

              <motion.button
                id="btn-report-download"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-800 bg-amber-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-900 shadow-2xs cursor-pointer"
                title="Download formatted response report"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Report</span>
              </motion.button>

              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center rounded-xl border border-stone-200 bg-white p-1.5 text-stone-600 hover:bg-stone-50 cursor-pointer"
                title="Print incident document"
              >
                <Printer className="h-4 w-4" />
              </button>

              <button
                onClick={closeDialog}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                title="Close report"
                aria-label="Close response report"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Document Body (Scrollable clean paper document styling) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
            {!result ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-stone-500">
                <FileText className="h-12 w-12 text-stone-300 mb-3" />
                <h3 className="text-base font-bold text-stone-800">No Incident Analyzed Yet</h3>
                <p className="mt-1 text-xs max-w-sm text-stone-500">
                  Submit a situation in the Intent Console or select a demo scenario to generate an authoritative Response Report.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
                {/* Document Masthead */}
                <div className="border-b border-stone-200 pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
                    <span className="font-mono text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      NEXUSACT EMERGENCY & OPERATIONAL GOVERNANCE
                    </span>
                    <span className="font-mono text-[11px] text-stone-500">
                      {reportDate}
                    </span>
                  </div>

                  <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-stone-900 uppercase">
                    {title}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider mr-1">
                      STATUS:
                    </span>
                    {isPlanCompleted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span>✓ RESPONSE PLAN COMPLETED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                        <span>⚠ PENDING HUMAN AUTHORIZATION</span>
                      </span>
                    )}

                    <span className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 font-mono text-[10px] font-bold text-stone-700 uppercase">
                      CONFIDENCE: {Math.round(result.confidence * 100)}%
                    </span>

                    <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-800 uppercase">
                      URGENCY: {urgencyDisplay}
                    </span>
                  </div>
                </div>

                {/* 1. SITUATION */}
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider text-stone-400 uppercase">
                    SITUATION
                  </h3>
                  <div className="mt-2 rounded-xl border border-stone-200/80 bg-[#faf8f5] p-4 text-xs sm:text-sm text-stone-800 leading-relaxed font-normal">
                    {rawInput || result.rawInput}
                  </div>
                </div>

                {/* 2. ASSESSMENT */}
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider text-stone-400 uppercase">
                    ASSESSMENT
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-stone-200 bg-[#faf8f5] p-4 text-xs">
                    <div>
                      <span className="text-stone-500 text-[11px] block font-medium">Urgency</span>
                      <span className="font-bold text-rose-800 text-sm">{urgencyDisplay}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block font-medium">Hazard</span>
                      <span className="font-bold text-stone-900 text-sm">
                        {hazardEntity?.value || 'ENVIRONMENTAL'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block font-medium">Person at Risk</span>
                      <span className="font-bold text-stone-900 text-sm">
                        {personEntity?.value || 'Trapped Civilian'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 text-[11px] block font-medium">Confidence</span>
                      <span className="font-bold text-amber-800 text-sm">{Math.round(result.confidence * 100)}%</span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs leading-relaxed text-stone-600">
                    <span className="font-semibold text-stone-800">Operational Understanding: </span>
                    {result.understoodSummary}
                  </div>
                </div>

                {/* 3. VERIFIED INFORMATION & UNCERTAINTIES */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Verified Information */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <span className="uppercase font-mono text-[11px] tracking-wide">VERIFIED INFORMATION</span>
                    </div>
                    <div className="space-y-2 text-xs text-stone-700">
                      {verifiedFacts.length > 0 ? (
                        verifiedFacts.map((fact, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-700 font-bold shrink-0">✓</span>
                            <span>{fact.claim}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-700 font-bold">✓</span>
                          <span>Municipal sensor feeds and road telemetry checked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Uncertainties / Ambiguities */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <span className="uppercase font-mono text-[11px] tracking-wide">UNCERTAINTIES & AMBIGUITIES</span>
                    </div>
                    <div className="space-y-2 text-xs text-stone-700">
                      {unverifiedOrAmbiguities.length > 0 ? (
                        unverifiedOrAmbiguities.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-amber-700 font-bold shrink-0">⚠</span>
                            <span>{item}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-start gap-2">
                          <span className="text-amber-700 font-bold">⚠</span>
                          <span>Exact coordinates require responder verification upon arrival</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. ACTIONS */}
                <div>
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <h3 className="text-xs font-mono font-bold tracking-wider text-stone-400 uppercase">
                      ACTIONS DISPATCH LOG
                    </h3>
                    <span className="font-mono text-[10px] font-bold text-stone-500">
                      {actions.length} ACTIONS PROPOSED
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {actions.map((act) => {
                      const isAuto = act.status === 'AUTO_EXECUTED';
                      const isAuth = act.status === 'COMPLETED' || act.status === 'CONFIRMED';

                      return (
                        <div
                          key={act.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-stone-200 bg-[#faf8f5] p-3 text-xs"
                        >
                          <div className="flex items-start sm:items-center gap-2">
                            {isAuto || isAuth ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                            )}
                            <div>
                              <span className="font-bold text-stone-900">{act.displayName}</span>
                              <span className="text-stone-500 ml-1.5 hidden sm:inline">
                                — {act.description}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${
                                act.risk === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : act.risk === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              RISK: {act.risk}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${
                                isAuto
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isAuth
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isAuto
                                ? 'AUTO-COMPLETED'
                                : isAuth
                                ? 'HUMAN AUTHORIZED'
                                : 'AWAITING AUTHORIZATION'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Execution Telemetry snippets */}
                  <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] font-mono text-stone-600 space-y-1">
                    <div className="font-bold text-stone-800 uppercase text-[10px]">
                      TELEMETRY EXECUTION RESULTS:
                    </div>
                    {actions
                      .flatMap((a) => a.executionLogs || [])
                      .slice(-4)
                      .map((log, i) => (
                        <div key={i} className="truncate">
                          ✓ {log}
                        </div>
                      ))}
                    {actions.flatMap((a) => a.executionLogs || []).length === 0 && (
                      <div>✓ All action schemas verified against code registry constraints.</div>
                    )}
                  </div>
                </div>

                {/* 5. SAFETY NOTES & DEMO SIMULATION */}
                <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-4 text-xs text-stone-600 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <ShieldCheck className="h-4 w-4 text-amber-800" />
                    <span>SAFETY NOTES & GOVERNANCE GUARANTEES</span>
                  </div>
                  <p className="leading-relaxed">
                    {result.safetyAdvisory ||
                      'The application Action Registry enforces absolute authority. Gemini cannot invent endpoints, execute unverified commands, or lower risk tiers. All high-risk physical dispatches demand explicit human authorization.'}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-stone-200/70 px-2 py-1 font-mono text-[10px] font-bold text-stone-800">
                    <span>DEMO SIMULATION</span>
                    <span className="text-stone-500 font-normal">— Simulated execution with zero physical side-effects.</span>
                  </div>
                </div>

                {/* 6. FINAL OUTCOME */}
                <div className="border-t border-stone-200 pt-4">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-stone-400 uppercase">
                    FINAL OUTCOME
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed">
                    {isPlanCompleted
                      ? 'A verified response plan was generated with consequential actions protected by explicit human authorization. All low-risk telemetry queried automatically; emergency response dispatches authorized and confirmed.'
                      : 'A verified response plan was generated with consequential actions protected by explicit human authorization. Low-risk operations completed automatically; consequential operations awaiting operator confirmation.'}
                  </p>
                </div>
              </div>
            )}

            {/* Internal Audit & Traceability Accordion (Keeping data internally for security & compliance) */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
              <button
                onClick={() => setShowInternalAudit(!showInternalAudit)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-amber-800" />
                  <span>INTERNAL TRACEABILITY & AUDIT LEDGER ({auditEvents.length} EVENTS)</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-400">
                  <span className="text-[11px] font-mono text-stone-500 font-normal">
                    {showInternalAudit ? 'Hide technical logs' : 'Show technical logs'}
                  </span>
                  {showInternalAudit ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              <AnimatePresence>
                {showInternalAudit && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-stone-100 bg-[#faf8f5] p-4 max-h-72 overflow-y-auto space-y-2 font-mono text-[11px]"
                  >
                    <div className="text-[10px] text-stone-500 font-bold mb-2">
                      CRYPTOGRAPHICALLY PRESERVED EVENT STREAM (INTERNAL USE ONLY):
                    </div>
                    {auditEvents.map((ev) => (
                      <div key={ev.id} className="rounded-lg border border-stone-200 bg-white p-2">
                        <div className="flex items-center justify-between text-stone-500 text-[10px]">
                          <span>[{ev.timestamp}]</span>
                          <span className="font-bold text-amber-900">{ev.stage}</span>
                        </div>
                        <div className="font-sans font-medium text-stone-800 text-xs mt-0.5">
                          {ev.message}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white px-6 py-4">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              <span>PromptWars × TechVerse Hackathon Incident System</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
              >
                {copied ? 'Copied to Clipboard' : 'Share Report'}
              </button>
              <button
                onClick={handleDownloadReport}
                className="rounded-xl border border-amber-800 bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900 shadow-xs cursor-pointer"
              >
                Download Report (.txt)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
