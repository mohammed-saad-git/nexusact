import React from 'react';
import { Brain, ShieldAlert, Gauge } from 'lucide-react';
import { AnalysisResult } from '../types';
import { motion } from 'motion/react';

interface GeminiSynthesisProps {
  result: AnalysisResult;
}

export const GeminiSynthesis: React.FC<GeminiSynthesisProps> = ({ result }) => {
  const confidencePercent = Math.round(result.confidence * 100);

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'EMERGENCY_RESPONSE':
        return 'border-rose-200 bg-rose-50 text-rose-800';
      case 'MEDICAL_CONCERN':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'LOGISTICS_DISRUPTION':
        return 'border-indigo-200 bg-indigo-50 text-indigo-800';
      case 'COMMUNITY_AID':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      default:
        return 'border-stone-200 bg-stone-100 text-stone-800';
    }
  };

  return (
    <motion.div
      id="gemini-synthesis-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100/90 border border-amber-200 text-amber-800 shadow-xs">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-stone-900 uppercase">
                GEMINI SYNTHESIS
              </span>
              <span className="font-mono text-[11px] text-stone-500 font-medium">
                — {result.modelUsed || 'gemini-3.8-flash'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase shadow-xs ${getCategoryBadge(result.intentCategory)}`}>
            {result.intentCategory.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Content: Understood vs Intent/Confidence */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Understood explanation (Left - 8 cols) */}
        <div className="lg:col-span-8">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wide">
            <span>UNDERSTOOD</span>
            <span className="text-xs text-stone-400 font-normal">— Human Need Decoded</span>
          </div>
          <p
            id="synthesis-understood-summary"
            className="rounded-2xl border border-stone-200 bg-[#faf8f5] p-4 font-sans text-sm sm:text-base leading-relaxed text-stone-800 font-medium shadow-xs"
          >
            "{result.understoodSummary}"
          </p>

          {/* Safety Advisory if applicable */}
          {result.safetyAdvisory && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3.5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950 shadow-xs"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <span className="font-mono font-bold tracking-wide uppercase text-amber-900">SAFETY BOUNDARY: </span>
                <span className="font-medium leading-relaxed">{result.safetyAdvisory}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Primary Intent & Confidence Metrics (Right - 4 cols) */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-[#faf8f5] p-5 shadow-xs lg:col-span-4">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-stone-500 uppercase">
              PRIMARY INTENT
            </div>
            <p
              id="synthesis-primary-intent"
              className="mt-1.5 text-base font-bold text-stone-900 leading-snug"
            >
              {result.primaryIntent}
            </p>
          </div>

          <div className="border-t border-stone-200/80 pt-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-stone-700 font-bold uppercase">
                <Gauge className="h-4 w-4 text-emerald-700" />
                <span>CONFIDENCE</span>
              </div>
              <span
                id="synthesis-confidence-val"
                className="font-mono text-base font-black text-emerald-700"
              >
                {confidencePercent}%
              </span>
            </div>

            {/* Animated Confidence progress bar */}
            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-600"
              />
            </div>
            <p className="mt-2 font-mono text-[10px] text-stone-500">
              Structured probability score from Gemini analysis.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
