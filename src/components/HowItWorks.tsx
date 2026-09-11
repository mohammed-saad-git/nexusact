import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
  FileCheck,
  Sliders,
  CheckCircle2,
  Lock,
  Terminal,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      step: '01',
      title: 'Messy Human Input',
      short: 'Input Ingest',
      icon: <Sparkles className="h-5 w-5 text-amber-700" />,
      color: 'amber',
      tag: 'UNSTRUCTURED TELEMETRY',
      headline: 'Accepts chaotic, high-stress input across voice, text, or multimodal photos.',
      description:
        'In genuine emergencies or complex operational breakdowns, humans cannot format structured JSON payloads. They send panic-stricken text messages, upload blurry flood water photos, or speak through voice notes while running.',
      keyPoints: [
        'Voice input via native Web Speech recognition API',
        'Multimodal imagery ingestion (e.g. flooded underpasses, damaged cargo)',
        'Resilient against emotional noise, typos, and fragmented descriptions',
      ],
      diagram: 'Panic Message / Voice / Photo → Raw Buffer',
    },
    {
      step: '02',
      title: 'Gemini Deep Understanding',
      short: 'Intent Synthesis',
      icon: <Brain className="h-5 w-5 text-indigo-700" />,
      color: 'indigo',
      tag: 'NEURAL UNDERSTANDING',
      headline: 'Decodes the fundamental human need beneath the emotional turbulence.',
      description:
        'Gemini 3.8 processes the input to extract core intent, calculate an empirical confidence score, and isolate life safety issues from administrative details.',
      keyPoints: [
        'Extracts primary intent (e.g. "Immediate extraction of stranded elder")',
        'Categorizes into operational domains (Emergency, Medical, Logistics, Community)',
        'Formulates human-readable plain language rationale',
      ],
      diagram: 'Raw Text → Intent Category + Confidence + Safety Advisory',
    },
    {
      step: '03',
      title: 'Strict Schematization',
      short: 'Entity Extraction',
      icon: <Sliders className="h-5 w-5 text-blue-700" />,
      color: 'blue',
      tag: 'STRUCTURE EXTRACTION',
      headline: 'Converts unstructured narrative into verified typed entities.',
      description:
        'Turns descriptive prose into discrete structured fields: identified persons, exact or approximate locations, known hazards, asset constraints (e.g., low battery, medical urgency).',
      keyPoints: [
        'Separates explicit user statements from AI inferences',
        'Detects operational gaps and critical ambiguities',
        'Provides recommended verification paths for missing data',
      ],
      diagram: 'Narrative → Person, Location, Hazard, Constraints Entities',
    },
    {
      step: '04',
      title: 'Fact vs Inference Matrix',
      short: 'Verification Matrix',
      icon: <FileCheck className="h-5 w-5 text-teal-700" />,
      color: 'teal',
      tag: 'TRUTH SEPARATION',
      headline: 'Prevents hallucinations by separating claims from verified ground truth.',
      description:
        'AI agents fail when they treat plausible inferences as hard facts. NEXUSACT builds a dynamic verification matrix, tagging every statement as Confirmed, Needs Confirmation, or Unknown.',
      keyPoints: [
        'Source provenance tagging (User-Provided, Inferred, System-Verified)',
        'Prevents premature action on uncorroborated assumptions',
        'Audit-ready verification ledger for regulatory accountability',
      ],
      diagram: 'Claims → Confirmed (Safe) vs Unverified (Flagged)',
    },
    {
      step: '05',
      title: 'Action Registry Governance',
      short: 'Action Planning',
      icon: <ShieldCheck className="h-5 w-5 text-amber-800" />,
      color: 'amber',
      tag: 'AUTHORITATIVE DISPATCH',
      headline: 'The code registry is the sole authority. Gemini cannot invent actions.',
      description:
        'Gemini only selects from pre-registered, cryptographically sanitized actions defined in the system. Risk levels (Low, Medium, High) are hardcoded in application logic and cannot be downgraded by the model.',
      keyPoints: [
        'Strict action schema validation on all parameters',
        'Immutable risk tier boundaries governed by application code',
        'Eliminates prompt injection risks targeting action execution',
      ],
      diagram: 'Intent → Validated Match in ACTION_REGISTRY',
    },
    {
      step: '06',
      title: 'Multi-Tier Execution & Authorization',
      short: 'Human Safeguards',
      icon: <Lock className="h-5 w-5 text-rose-700" />,
      color: 'rose',
      tag: 'SAFETY BOUNDARIES',
      headline: 'Low-risk actions execute automatically; high-risk actions require explicit human sign-off.',
      description:
        'To balance speed and safety: safe reads and non-destructive alerts execute automatically. Medium actions require 1-click confirmation. Irreversible or high-risk physical dispatches demand strict human review in an authorization modal.',
      keyPoints: [
        'Low Risk: Auto-executed instantly (e.g. logging tickets, notifying family)',
        'Medium Risk: 1-click operator confirmation (e.g. route adjustments)',
        'High Risk: Explicit simulation modal with multi-step validation checks',
      ],
      diagram: 'Low → Auto | Medium → Confirm | High → Review & Authorize',
    },
    {
      step: '07',
      title: 'Immutable Audit Trail',
      short: 'Audit Ledger',
      icon: <Terminal className="h-5 w-5 text-stone-700" />,
      color: 'stone',
      tag: 'TRANSPARENCY & TRACEABILITY',
      headline: 'Every transformation, rationale, and dispatch is sealed in an exportable ledger.',
      description:
        'A permanent record captures input hashes, Gemini intermediate reasoning, timestamped operator confirmations, and simulated execution telemetry for complete post-incident reviews.',
      keyPoints: [
        'Chronological ledger with microsecond timestamps',
        'Filterable by severity level (Info, Warning, Alert, Success)',
        'Instant JSON export and one-click clipboard copy for compliance audits',
      ],
      diagram: 'Execution Telemetry → JSON Audit Trail Ledger',
    },
  ];

  return (
    <section id="how-it-works-section" className="w-full scroll-mt-20 py-8">
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
            <Zap className="h-3.5 w-3.5 text-amber-700" />
            <span className="font-mono text-[10px] tracking-wider uppercase">ARCHITECTURAL BLUEPRINT</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-stone-900 sm:text-4xl">
            How NEXUSACT Works
          </h2>
          <p className="mt-2 text-sm text-stone-600 sm:text-base leading-relaxed font-normal">
            A seven-stage pipeline ensuring that chaotic human requests become safe, verified real-world actions without hallucinated side effects.
          </p>
        </div>

        {/* Step Selector Horizontal Bar */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {steps.map((st, idx) => {
            const isActive = activeStep === idx;
            return (
              <motion.button
                key={st.step}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveStep(idx)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'border-amber-700 bg-amber-800 text-white shadow-xs'
                    : 'border-stone-200 bg-[#faf8f5] text-stone-600 hover:border-stone-300 hover:bg-white hover:text-stone-900'
                }`}
              >
                <span className={`font-mono text-[10px] font-bold ${isActive ? 'text-amber-200' : 'text-stone-400'}`}>
                  {st.step}
                </span>
                <span>{st.short}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Interactive Step Display Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="mt-6 rounded-2xl border border-stone-200 bg-[#faf8f5] p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              {/* Left explanation (7 cols) */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200 shadow-2xs">
                    {steps[activeStep].icon}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-800">
                      PHASE {steps[activeStep].step}
                    </span>
                    <h3 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                      {steps[activeStep].title}
                    </h3>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-stone-200/80 bg-white p-3.5 text-xs sm:text-sm font-semibold text-stone-800 shadow-2xs">
                  {steps[activeStep].headline}
                </div>

                <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-stone-600 font-normal">
                  {steps[activeStep].description}
                </p>

                {/* Key Points */}
                <div className="mt-4 space-y-2">
                  {steps[activeStep].keyPoints.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-stone-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Visual Representation (5 cols) */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs lg:col-span-5">
                <div className="mb-3 flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    {steps[activeStep].tag}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-900">
                    STEP {steps[activeStep].step} / 07
                  </span>
                </div>

                <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-4 text-center font-mono text-xs text-stone-700">
                  <div className="text-[10px] uppercase text-stone-400 font-bold mb-1">DATA FLOW</div>
                  <div className="font-bold text-stone-900">{steps[activeStep].diagram}</div>
                </div>

                {/* Step navigation controls */}
                <div className="mt-5 flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                  <button
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    Previous Step
                  </button>
                  <button
                    disabled={activeStep === steps.length - 1}
                    onClick={() => setActiveStep((prev) => Math.min(steps.length - 1, prev + 1))}
                    className="flex items-center gap-1 rounded-xl border border-amber-800 bg-amber-800 px-3.5 py-1.5 font-bold text-white hover:bg-amber-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
