import React, { useState, useEffect } from 'react';
import { ProcessedAction } from '../types';
import { AlertOctagon, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthorizationModalProps {
  action: ProcessedAction | null;
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (action: ProcessedAction) => Promise<void>;
}

export const AuthorizationModal: React.FC<AuthorizationModalProps> = ({
  action,
  isOpen,
  onClose,
  onAuthorize,
}) => {
  const [executionPhase, setExecutionPhase] = useState<'IDLE' | 'EXECUTING' | 'DONE'>('IDLE');
  const [execStep, setExecStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setExecutionPhase('IDLE');
      setExecStep(0);
    }
  }, [isOpen]);

  if (!isOpen || !action) return null;

  const steps = [
    'AUTHORIZATION RECEIVED ✓',
    'VALIDATING PARAMETERS ✓',
    'ACTION REGISTRY CHECK ✓',
    'EXECUTING DEMO ACTION...',
    'ACTION COMPLETED ✓',
  ];

  const handleAuthorizeClick = async () => {
    setExecutionPhase('EXECUTING');
    setExecStep(1);

    // Simulate animated execution sequence
    setTimeout(() => setExecStep(2), 500);
    setTimeout(() => setExecStep(3), 1000);
    setTimeout(() => setExecStep(4), 1600);
    setTimeout(async () => {
      setExecStep(5);
      setExecutionPhase('DONE');
      await onAuthorize(action);
    }, 2300);
  };

  return (
    <AnimatePresence>
      <div
        id="authorization-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
      >
        <motion.div
          id="authorization-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl text-stone-800 sm:p-7"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between border-b border-rose-100 pb-3.5">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 shadow-xs">
                <AlertOctagon className="h-5 w-5 text-rose-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black tracking-wide text-rose-950 uppercase sm:text-lg">
                    AUTHORIZATION REQUIRED
                  </h2>
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-[9px] font-bold text-rose-800 uppercase border border-rose-200">
                    DEMO SIMULATION
                  </span>
                </div>
                <p className="text-xs text-rose-700 font-medium">Consequential real-world action boundary</p>
              </div>
            </div>

            {executionPhase !== 'EXECUTING' && (
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Demo Simulation Notice */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-xs">
            <span className="font-mono font-bold uppercase">HACKATHON SAFETY NOTICE: </span>
            <span className="leading-relaxed">
              This is a simulated execution. No real emergency services or external dispatchers will be contacted.
            </span>
          </div>

          {/* Content Details */}
          <div className="mt-4 space-y-3.5 font-sans">
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase">ACTION:</div>
              <div className="text-lg font-bold text-stone-900 tracking-tight">
                {action.displayName}{' '}
                <span className="text-xs font-normal text-stone-500 font-mono">({action.actionName})</span>
              </div>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed font-normal">{action.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-stone-500 uppercase">RISK LEVEL:</span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-0.5 font-mono text-xs font-black text-rose-800">
                HIGH
              </span>
            </div>

            <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-3.5 text-xs shadow-2xs">
              <div className="text-[10px] font-bold text-rose-800 uppercase">WHY THIS ACTION?</div>
              <p className="mt-1 text-stone-700 leading-relaxed">{action.rationale}</p>
            </div>

            {/* Parameters to be committed */}
            {Object.keys(action.parameters).length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-[#faf8f5] p-3.5 shadow-2xs">
                <div className="mb-2 text-[10px] font-bold text-stone-500 uppercase">
                  TARGET DISPATCH PARAMETERS
                </div>
                <div className="space-y-1.5 text-xs text-stone-700 font-mono">
                  {Object.entries(action.parameters).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-stone-200/60 pb-1">
                      <span className="text-stone-500">{k}:</span>
                      <span className="text-stone-900 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Execution Sequence Animator */}
          {executionPhase !== 'IDLE' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 font-mono text-xs shadow-xs"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-stone-600 uppercase">
                  SIMULATED EXECUTION SEQUENCE
                </span>
                {executionPhase === 'EXECUTING' && (
                  <span className="flex items-center gap-1.5 text-[10px] text-amber-800 font-bold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> RUNNING
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {steps.map((stepText, idx) => {
                  const isStepCompleted = execStep > idx;
                  const isStepCurrent = execStep === idx + 1;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 transition-all ${
                        isStepCompleted
                          ? 'text-emerald-700 font-bold'
                          : isStepCurrent
                          ? 'text-amber-800 font-bold'
                          : 'text-stone-400'
                      }`}
                    >
                      {isStepCompleted ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : isStepCurrent ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-700" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-stone-300" />
                      )}
                      <span>{stepText}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
            {executionPhase === 'IDLE' ? (
              <>
                <motion.button
                  id="btn-cancel-authorization"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs cursor-pointer"
                >
                  CANCEL
                </motion.button>
                <motion.button
                  id="btn-confirm-authorization"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAuthorizeClick}
                  className="rounded-xl border border-rose-700 bg-rose-700 px-6 py-2.5 text-xs font-bold tracking-wide text-white shadow-xs hover:bg-rose-800 active:scale-95 cursor-pointer"
                >
                  AUTHORIZE ACTION (SIMULATED)
                </motion.button>
              </>
            ) : executionPhase === 'DONE' ? (
              <motion.button
                id="btn-close-authorized-done"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="rounded-xl border border-emerald-700 bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
              >
                CLOSE & RECORD IN AUDIT TRAIL
              </motion.button>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
