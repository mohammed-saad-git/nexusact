import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { DemoScenarios } from './components/DemoScenarios';
import { IntentConsole } from './components/IntentConsole';
import { ProcessingPipeline } from './components/ProcessingPipeline';
import { GeminiSynthesis } from './components/GeminiSynthesis';
import { EntitiesPanel } from './components/EntitiesPanel';
import { VerificationPanel } from './components/VerificationPanel';
import { ActionPlanPanel } from './components/ActionPlanPanel';
import { AuthorizationModal } from './components/AuthorizationModal';
import { AuditTrail } from './components/AuditTrail';
import { ResponseReportModal } from './components/ResponseReportModal';
import { HowItWorks } from './components/HowItWorks';
import { AboutSection } from './components/AboutSection';
import { AnalysisResult, AuditEvent, DemoScenario, ProcessedAction } from './types';
import { ArrowRight, FileCheck, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [input, setInput] = useState<string>('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [pipelineStage, setPipelineStage] = useState<number>(0);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [authModalAction, setAuthModalAction] = useState<ProcessedAction | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [geminiActive, setGeminiActive] = useState<boolean>(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setGeminiActive(Boolean(data.geminiActive));
      })
      .catch((err) => {
        console.warn('Health check warning:', err);
      });
  }, []);

  // Prepopulate with hero flood scenario on first launch for instant discovery
  useEffect(() => {
    if (!input && !analysisResult) {
      setInput(
        'My elderly neighbor is stuck near the flooded underpass. The water is rising and their phone is almost dead. I don\'t know exactly how bad the flooding is but someone needs to help them.'
      );
      setSelectedScenarioId('flood_response');
    }
  }, []);

  const handleSelectScenario = (scenario: DemoScenario) => {
    setSelectedScenarioId(scenario.id);
    setInput(scenario.prompt);
  };

  const handleAnalyze = async (
    text: string,
    image?: { data: string; mimeType: string; name: string }
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setPipelineStage(1);

    // Progressive visual pipeline stages
    const timer1 = setTimeout(() => setPipelineStage(2), 350);
    const timer2 = setTimeout(() => setPipelineStage(3), 700);
    const timer3 = setTimeout(() => setPipelineStage(4), 1050);

    try {
      const response = await fetch('/api/analyze-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, image }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: AnalysisResult = await response.json();

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setAnalysisResult(data);
      setPipelineStage(5);

      // Append new events to overall audit log
      if (data.auditTrail && data.auditTrail.length > 0) {
        setAuditLog((prev) => [...data.auditTrail, ...prev]);
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.warn('Analysis note:', errMessage);
      setAnalysisError('Unable to connect to the analysis service. Please try submitting again or choose a demo scenario.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmMediumAction = (actionId: string) => {
    if (!analysisResult) return;
    setIsProcessingAction(actionId);

    setTimeout(() => {
      setAnalysisResult((prev) => {
        if (!prev) return null;
        const updated = prev.actions.map((act) => {
          if (act.id === actionId) {
            return {
              ...act,
              status: 'CONFIRMED' as const,
              executedAt: new Date().toISOString(),
              executionLogs: [
                ...(act.executionLogs || []),
                `[${new Date().toLocaleTimeString()}] Human operator confirmation granted`,
                `[${new Date().toLocaleTimeString()}] Parameter routing updated in live dispatch engine`,
              ],
            };
          }
          return act;
        });
        return { ...prev, actions: updated };
      });

      const confirmedAction = analysisResult.actions.find((a) => a.id === actionId);
      const auditEv: AuditEvent = {
        id: `audit-confirm-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        rawTime: Date.now(),
        stage: '06 CONFIRMATION',
        type: 'CONFIRMATION_GRANTED',
        message: `Operator confirmed medium-risk action [${confirmedAction?.actionName || actionId}].`,
        severity: 'success',
      };
      setAuditLog((prev) => [auditEv, ...prev]);
      setIsProcessingAction(null);
    }, 400);
  };

  const handleAuthorizeHighRiskAction = async (action: ProcessedAction) => {
    try {
      const response = await fetch('/api/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: action.id,
          actionName: action.actionName,
          parameters: action.parameters,
          authConfirmed: true,
        }),
      });

      const data = await response.json();

      setAnalysisResult((prev) => {
        if (!prev) return null;
        const updated = prev.actions.map((act) => {
          if (act.id === action.id) {
            return {
              ...act,
              status: 'COMPLETED' as const,
              executedAt: data.executedAt,
              executionLogs: data.executionLogs,
            };
          }
          return act;
        });
        return { ...prev, actions: updated };
      });

      if (data.auditEntry) {
        setAuditLog((prev) => [data.auditEntry, ...prev]);
      }

      // Progress pipeline stage to stage 7 (Execution)
      setPipelineStage(7);
    } catch (err) {
      console.error('Execution simulation error:', err);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setInput('');
    setSelectedScenarioId(null);
    setPipelineStage(0);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f6] font-sans text-stone-800 selection:bg-amber-100 selection:text-amber-900">
      {/* 1. HEADER */}
      <Header
        geminiActive={geminiActive}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onReset={handleReset}
        auditCount={auditLog.length}
        hasActiveResult={Boolean(analysisResult)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* 2. HERO */}
        <Hero />

        {/* 3. DEMO SCENARIOS & INTENT CONSOLE */}
        <div id="intent-console-container" className="scroll-mt-20 space-y-6">
          <DemoScenarios
            onSelectScenario={handleSelectScenario}
            selectedId={selectedScenarioId}
            disabled={isAnalyzing}
          />

          <IntentConsole
            input={input}
            onChangeInput={(val) => {
              setInput(val);
              if (selectedScenarioId) setSelectedScenarioId(null);
            }}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />

          <AnimatePresence>
            {analysisError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" />
                  <span>{analysisError}</span>
                </div>
                <button
                  onClick={() => setAnalysisError(null)}
                  className="rounded-lg p-1 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 5. PROCESSING PIPELINE */}
        <AnimatePresence>
          {(pipelineStage > 0 || isAnalyzing || analysisResult) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2"
            >
              <ProcessingPipeline
                currentStageIndex={pipelineStage}
                isAnalyzing={isAnalyzing}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. DYNAMIC SYNTHESIS & VERIFIED ACTION WORKFLOW */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 pt-2"
            >
              {/* RESPONSE REPORT BANNER */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-300 text-amber-800 shadow-2xs">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">
                        INCIDENT RESPONSE REPORT
                      </h3>
                      <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                        {analysisResult.actions.every(
                          (a) =>
                            a.status === 'COMPLETED' ||
                            a.status === 'AUTO_EXECUTED' ||
                            a.status === 'CONFIRMED'
                        )
                          ? '✓ PLAN COMPLETED'
                          : 'AWAITING OPERATOR AUTHORIZATION'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-normal mt-0.5">
                      Human-readable incident document summarizing detected entities, truth matrix findings, and verified actions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    id="btn-view-response-report-banner"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsReportOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-800 bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900 shadow-2xs cursor-pointer"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>View Response Report</span>
                  </motion.button>
                </div>
              </div>

              {/* GEMINI SYNTHESIS */}
              <GeminiSynthesis result={analysisResult} />

              {/* STRUCTURED ENTITIES & AMBIGUITIES */}
              <EntitiesPanel
                entities={analysisResult.entities}
                ambiguities={analysisResult.ambiguities}
              />

              {/* VERIFICATION MATRIX */}
              <VerificationPanel facts={analysisResult.verificationFacts} />

              {/* VERIFIED ACTION PLAN (Centerpiece) */}
              <ActionPlanPanel
                actions={analysisResult.actions}
                onConfirmMediumAction={handleConfirmMediumAction}
                onOpenHighRiskAuth={(act) => setAuthModalAction(act)}
                isProcessingAction={isProcessingAction}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Human-Readable Response Report Summary Bar on bottom */}
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/80 border border-amber-200/70 text-amber-800">
                  <FileCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  RESPONSE REPORT:
                </span>
                <span className="text-xs text-stone-600 font-medium">
                  {analysisResult.primaryIntent} • Confidence: {Math.round(analysisResult.confidence * 100)}%
                </span>
              </div>
              <motion.button
                id="btn-open-report-bottom"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsReportOpen(true)}
                className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-bold cursor-pointer"
              >
                <span>Open Complete Response Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* 7. HOW IT WORKS SECTION */}
        <HowItWorks />

        {/* 8. ABOUT SECTION */}
        <AboutSection />
      </main>

      {/* HIGH-RISK AUTHORIZATION MODAL */}
      <AuthorizationModal
        action={authModalAction}
        isOpen={Boolean(authModalAction)}
        onClose={() => setAuthModalAction(null)}
        onAuthorize={handleAuthorizeHighRiskAction}
      />

      {/* RESPONSE REPORT MODAL (Primary user-facing document) */}
      <ResponseReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        result={analysisResult}
        rawInput={input}
        auditEvents={auditLog}
      />

      {/* AUDIT TRAIL DRAWER (Available as secondary/fallback) */}
      <AuditTrail
        events={auditLog}
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        isDrawer={true}
      />

      {/* Footer with modern styling */}
      <footer className="mt-16 border-t border-stone-200/80 bg-white py-8 text-center text-xs text-stone-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
          <span className="font-bold text-stone-700">NEXUSACT Universal Intent → Action Engine</span>
          <span>PromptWars × TechVerse Hackathon Entry</span>
          <span className="font-mono text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200/60 rounded-full px-3 py-1">
            Powered by Gemini 3 Series
          </span>
        </div>
      </footer>
    </div>
  );
}
