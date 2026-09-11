import React from 'react';
import { ProcessedAction } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActionPlanPanelProps {
  actions: ProcessedAction[];
  onConfirmMediumAction: (actionId: string) => void;
  onOpenHighRiskAuth: (action: ProcessedAction) => void;
  isProcessingAction?: string | null;
}

export const ActionPlanPanel: React.FC<ActionPlanPanelProps> = ({
  actions,
  onConfirmMediumAction,
  onOpenHighRiskAuth,
  isProcessingAction,
}) => {
  const [expandedLogs, setExpandedLogs] = React.useState<Record<string, boolean>>({});

  const toggleLogs = (actionId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
            RISK: LOW (AUTO)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-amber-800 uppercase">
            RISK: MEDIUM (CONFIRM)
          </span>
        );
      case 'HIGH':
        return (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-rose-800 uppercase">
            RISK: HIGH (AUTHORIZE)
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, isSimulated: boolean) => {
    switch (status) {
      case 'AUTO_EXECUTED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            AUTO-EXECUTED ✓
          </span>
        );
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
            AWAITING CONFIRMATION
          </span>
        );
      case 'CONFIRMED':
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {isSimulated ? 'COMPLETED (SIMULATED) ✓' : 'COMPLETED ✓'}
          </span>
        );
      case 'AUTHORIZATION_REQUIRED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <Lock className="h-4 w-4 text-rose-600" />
            AUTHORIZATION REQUIRED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500">
            REJECTED BY REGISTRY
          </span>
        );
      default:
        return <span className="text-xs text-stone-500 font-medium">{status}</span>;
    }
  };

  const getCardStyling = (risk: string, status: string) => {
    if (status === 'REJECTED') {
      return 'border-stone-200 bg-stone-50 opacity-70';
    }
    switch (risk) {
      case 'LOW':
        return 'border-emerald-200/90 bg-[#f7fcf9]';
      case 'MEDIUM':
        return 'border-amber-200/90 bg-[#fffdf7]';
      case 'HIGH':
        return 'border-rose-200/90 bg-[#fff9f9]';
      default:
        return 'border-stone-200 bg-white';
    }
  };

  return (
    <motion.div
      id="verified-action-plan-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full space-y-4"
    >
      {/* Registry Source of Truth Banner */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:flex-row sm:items-center shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-800" />
            <h2 className="text-lg font-black tracking-tight text-stone-900">
              VERIFIED ACTION PLAN
            </h2>
          </div>
          <p className="mt-1 text-xs text-stone-600 font-medium">
            The Authoritative Action Registry governs execution. Gemini cannot invent actions or alter risk levels.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-amber-300 bg-amber-100/90 px-3 py-1 text-amber-900 font-bold shadow-xs">
            REGISTRY ENFORCED
          </span>
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-stone-700 font-semibold shadow-xs">
            {actions.length} ACTIONS PROPOSED
          </span>
        </div>
      </div>

      {/* Action Cards List */}
      <div className="space-y-4">
        {actions.map((act, index) => {
          const isPendingProcessing = isProcessingAction === act.id;
          const isLogsOpen = expandedLogs[act.id] ?? (act.status === 'AUTO_EXECUTED');

          return (
            <motion.div
              key={act.id}
              id={`action-card-${act.actionName}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className={`rounded-2xl border p-5 shadow-xs transition-all sm:p-6 ${getCardStyling(
                act.risk,
                act.status
              )}`}
            >
              {/* Action Card Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-stone-900 tracking-tight">
                    {act.displayName}
                  </span>
                  <span className="font-mono text-xs text-stone-500 font-medium">
                    ({act.actionName})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {act.isSimulated && (
                    <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 font-mono text-[9px] font-bold text-stone-600 uppercase shadow-xs">
                      DEMO SIMULATION
                    </span>
                  )}
                  {getRiskBadge(act.risk)}
                </div>
              </div>

              {/* Action Description & Rationale */}
              <div className="mt-3.5">
                <p className="text-sm text-stone-700 font-normal leading-relaxed">{act.description}</p>
                <div className="mt-2.5 rounded-xl border border-stone-200 bg-white p-3.5 text-xs text-stone-800 shadow-2xs">
                  <span className="font-bold text-amber-900 uppercase">
                    GEMINI RATIONALE:{' '}
                  </span>
                  <span className="leading-relaxed">{act.rationale}</span>
                </div>
              </div>

              {/* Action Parameters */}
              {Object.keys(act.parameters).length > 0 && (
                <div className="mt-3.5 rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                  <div className="mb-2 text-[10px] font-bold tracking-wider text-stone-500 uppercase">
                    ACTION PARAMETERS (REGISTRY-SANITIZED)
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    {Object.entries(act.parameters).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-[#faf8f5] border border-stone-100 px-3 py-1.5">
                        <span className="text-stone-500 font-medium">{key}:</span>
                        <span className="font-semibold text-stone-900 truncate ml-1 font-mono text-[11px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Footer: Status & Trigger Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 uppercase font-semibold">STATUS:</span>
                  {getStatusBadge(act.status, act.isSimulated)}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Medium Risk Confirmation Button */}
                  {act.risk === 'MEDIUM' && act.status === 'AWAITING_CONFIRMATION' && (
                    <motion.button
                      id={`btn-confirm-${act.id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onConfirmMediumAction(act.id)}
                      disabled={isPendingProcessing}
                      className="rounded-xl border border-amber-800 bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-amber-900 active:scale-95 cursor-pointer"
                    >
                      {isPendingProcessing ? 'CONFIRMING...' : 'CONFIRM ACTION'}
                    </motion.button>
                  )}

                  {/* High Risk Authorization Button */}
                  {act.risk === 'HIGH' && act.status === 'AUTHORIZATION_REQUIRED' && (
                    <motion.button
                      id={`btn-review-auth-${act.id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onOpenHighRiskAuth(act)}
                      className="flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-800 active:scale-95 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>REVIEW & AUTHORIZE</span>
                    </motion.button>
                  )}

                  {/* Logs expansion toggle */}
                  {act.executionLogs && act.executionLogs.length > 0 && (
                    <button
                      onClick={() => toggleLogs(act.id)}
                      className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                    >
                      <span>{isLogsOpen ? 'Hide Logs' : 'View Logs'}</span>
                      {isLogsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Execution Logs */}
              <AnimatePresence>
                {isLogsOpen && act.executionLogs && act.executionLogs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3.5 rounded-xl border border-stone-200 bg-white p-4 font-mono text-xs text-stone-700 shadow-2xs"
                  >
                    <div className="mb-2 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                      EXECUTION TELEMETRY STREAM
                    </div>
                    <div className="space-y-1.5">
                      {act.executionLogs.map((log, lIdx) => (
                        <div key={lIdx} className="text-stone-600 leading-relaxed">
                          {log}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
