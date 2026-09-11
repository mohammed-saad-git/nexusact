import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuditEvent } from '../types';
import {
  X,
  Download,
  Copy,
  Check,
  Clock,
  Terminal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditTrailProps {
  events: AuditEvent[];
  isOpen: boolean;
  onClose: () => void;
  isDrawer?: boolean;
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  events,
  isOpen,
  onClose,
  isDrawer = true,
}) => {
  const [copied, setCopied] = useState(false);
  const filterSeverity = 'ALL';
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (isDrawer && isOpen) {
      drawerRef.current?.focus();
    }
  }, [isDrawer, isOpen]);

  useEffect(() => {
    if (!isDrawer || !isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawer, isOpen, closeDrawer]);

  if (isDrawer && !isOpen) return null;

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === 'ALL') return true;
    return ev.severity === filterSeverity;
  });

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'success':
        return 'text-emerald-900 border-emerald-200 bg-emerald-50/80';
      case 'warning':
        return 'text-amber-900 border-amber-200 bg-amber-50/80';
      case 'alert':
      case 'danger':
        return 'text-rose-900 border-rose-200 bg-rose-50/80';
      default:
        return 'text-stone-900 border-stone-200 bg-[#faf8f5]';
    }
  };

  const handleCopyLogs = () => {
    const text = events
      .map((ev) => `[${ev.timestamp}] [${ev.stage}] [${ev.type}] ${ev.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nexusact-audit-trail-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const content = (
    <div className="flex h-full flex-col font-sans bg-white text-stone-800">
      {/* Drawer / Panel Header */}
      <div className="flex items-center justify-between border-b border-stone-200 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100/80 border border-amber-200 text-amber-800 shadow-2xs">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="audit-trail-title" className="text-sm font-bold tracking-tight text-stone-900 uppercase">
                AUDIT TRAIL & LEDGER
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                {events.length}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">Immutable sequence records</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 shadow-xs cursor-pointer"
            title="Copy audit log"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 shadow-xs cursor-pointer"
            title="Download JSON audit ledger"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </motion.button>

          {isDrawer && (
            <button
              onClick={closeDrawer}
              className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              aria-label="Close audit trail"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Philosophy banner */}
      <div className="border-b border-stone-200 bg-[#faf8f5] px-5 py-2.5 text-xs font-medium text-stone-600">
        <span className="text-amber-800 font-bold uppercase tracking-wider font-mono text-[11px]">PRINCIPLES: </span>
        <span>Transparency • Accountability • Traceability</span>
      </div>

      {/* Events Stream */}
      <div
        id="audit-trail-stream"
        className="flex-1 overflow-y-auto p-5 space-y-3 font-sans text-xs"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Clock className="h-9 w-9 mb-3 stroke-[1.5]" />
            <p className="font-semibold text-sm">No audit events recorded yet.</p>
            <p className="text-xs text-stone-500 mt-1">Run an intent analysis to record dispatch telemetry.</p>
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className={`rounded-2xl border p-3.5 transition-all shadow-2xs ${getSeverityStyle(ev.severity)}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-stone-500 font-bold">{ev.timestamp}</span>
                <span className="rounded-full border border-stone-200/80 bg-white/90 px-2 py-0.5 font-mono text-[9px] text-stone-700 font-bold uppercase shadow-2xs">
                  {ev.stage}
                </span>
              </div>

              <div className="mt-1.5 font-bold text-xs leading-snug">
                {ev.message}
              </div>

              <div className="mt-1.5 font-mono text-[9px] text-stone-500 font-medium">
                TYPE: {ev.type}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  if (!isDrawer) {
    return (
      <div className="w-full rounded-2xl border border-stone-200 bg-white shadow-xs">
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div
        id="audit-trail-drawer-backdrop"
        className="fixed inset-0 z-50 flex justify-end bg-stone-900/30 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          id="audit-trail-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-trail-title"
          tabIndex={-1}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="h-full w-full max-w-md border-l border-stone-200 bg-white shadow-2xl outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
