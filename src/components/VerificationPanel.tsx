import React, { useState } from 'react';
import { VerificationFact } from '../types';
import { CheckCircle2, AlertTriangle, HelpCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VerificationPanelProps {
  facts: VerificationFact[];
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ facts }) => {
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'NEEDS_CONFIRMATION' | 'UNKNOWN'>('ALL');

  const filteredFacts = facts.filter((f) => {
    if (filter === 'ALL') return true;
    return f.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            CONFIRMED
          </span>
        );
      case 'NEEDS_CONFIRMATION':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            NEEDS CONFIRMATION
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600">
            <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
            UNKNOWN
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'USER_PROVIDED':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'AI_INFERRED':
        return 'border-purple-200 bg-purple-50 text-purple-800';
      case 'SYSTEM_VERIFIED':
        return 'border-indigo-200 bg-indigo-50 text-indigo-800';
      case 'DEMO_DATA':
        return 'border-stone-200 bg-stone-100 text-stone-600';
      default:
        return 'border-stone-200 bg-stone-50 text-stone-700';
    }
  };

  return (
    <motion.div
      id="verification-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-bold tracking-wider text-stone-800 uppercase">
              VERIFICATION MATRIX
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-500 font-medium">
            Separating reported statements from externally verified facts. Never conflating AI inference with ground truth.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-[#faf8f5] p-1 text-xs">
          {(['ALL', 'CONFIRMED', 'NEEDS_CONFIRMATION', 'UNKNOWN'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                filter === opt
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {opt.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Facts Table/List */}
      <div className="mt-3 divide-y divide-stone-100">
        <AnimatePresence mode="popLayout">
          {filteredFacts.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 font-medium">
              No items matching current filter.
            </div>
          ) : (
            filteredFacts.map((fact, idx) => (
              <motion.div
                key={idx}
                id={`verification-fact-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-stone-50/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 font-mono text-[11px] text-stone-400 font-bold">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-stone-900 leading-snug">{fact.claim}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{fact.notes}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase ${getSourceBadge(
                      fact.sourceType
                    )}`}
                  >
                    {fact.sourceType.replace('_', ' ')}
                  </span>
                  {getStatusBadge(fact.status)}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
