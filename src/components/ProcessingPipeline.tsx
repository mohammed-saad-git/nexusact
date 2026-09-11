import React from 'react';
import { Check, ArrowRight, Circle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export interface PipelineStageInfo {
  code: string;
  number: string;
  label: string;
}

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  { code: 'INPUT_RECEIVED', number: '01', label: 'INPUT RECEIVED' },
  { code: 'UNDERSTANDING', number: '02', label: 'UNDERSTANDING' },
  { code: 'STRUCTURING', number: '03', label: 'STRUCTURING' },
  { code: 'VERIFYING', number: '04', label: 'VERIFYING' },
  { code: 'ACTION_PLAN', number: '05', label: 'ACTION PLAN' },
  { code: 'CONFIRMATION', number: '06', label: 'CONFIRMATION' },
  { code: 'EXECUTION', number: '07', label: 'EXECUTION' },
];

interface ProcessingPipelineProps {
  currentStageIndex: number; // 0 to 7
  isAnalyzing: boolean;
}

export const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({
  currentStageIndex,
  isAnalyzing,
}) => {
  return (
    <motion.div
      id="processing-pipeline-bar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider text-stone-800 uppercase">
            PROCESSING PIPELINE
          </span>
          <span className="text-xs text-amber-800 font-semibold">
            {isAnalyzing
              ? '— Synthesis stream in progress'
              : currentStageIndex >= 5
              ? '— Verified state active'
              : '— Standby'}
          </span>
        </div>
        <span className="font-mono text-xs text-stone-500 font-semibold">
          STAGE {Math.min(currentStageIndex, 7)} OF 07
        </span>
      </div>

      {/* Pipeline Grid / Flow */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {PIPELINE_STAGES.map((stg, index) => {
          const isDone = currentStageIndex > index + 1;
          const isActive = currentStageIndex === index + 1;

          let statusClass = 'border-stone-200/80 bg-stone-50/70 text-stone-400';
          let icon = <Circle className="h-3.5 w-3.5 text-stone-300" />;

          if (isDone) {
            statusClass = 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-2xs';
            icon = <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />;
          } else if (isActive) {
            statusClass = 'border-amber-500 bg-amber-50/90 text-amber-900 ring-2 ring-amber-400/25 shadow-xs';
            icon = isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-800" />
            ) : (
              <ArrowRight className="h-4 w-4 text-amber-800 animate-pulse" />
            );
          }

          return (
            <motion.div
              key={stg.code}
              id={`pipeline-stage-${stg.code}`}
              animate={isActive ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`flex items-center justify-between rounded-xl border p-2.5 transition-all duration-200 ${statusClass}`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-mono text-[10px] font-bold text-stone-400">
                  {stg.number}
                </span>
                <span className="truncate text-[11px] font-bold tracking-tight">
                  {stg.label}
                </span>
              </div>
              <div className="ml-1 shrink-0">{icon}</div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
