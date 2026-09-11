import React from 'react';
import { ShieldCheck, RotateCcw, FileCheck, Compass, Sparkles, BookOpen, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  geminiActive: boolean;
  onOpenReport: () => void;
  onOpenAudit?: () => void;
  onReset: () => void;
  auditCount?: number;
  hasActiveResult: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  geminiActive,
  onOpenReport,
  onOpenAudit,
  onReset,
  auditCount = 0,
  hasActiveResult,
}) => {
  const scrollToSection = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.header
      id="app-header"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-[#fbf9f6]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-100/80 text-amber-800 shadow-xs"
            >
              <ShieldCheck className="h-5 w-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-stone-900">
                  NEXUS<span className="text-amber-700">ACT</span>
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider text-amber-900 uppercase">
                  PROMPTWARS × TECHVERSE
                </span>
              </div>
              <p className="hidden text-xs font-medium text-stone-500 sm:block">
                Universal Intent → Action Engine
              </p>
            </div>
          </div>
        </div>

        {/* Center Navigation Buttons */}
        <nav
          id="main-navigation"
          className="hidden md:flex items-center gap-1 rounded-xl border border-stone-200/90 bg-white p-1 shadow-2xs"
        >
          <motion.button
            id="nav-btn-console"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => scrollToSection('intent-console-container')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5 text-amber-700" />
            <span>Console</span>
          </motion.button>

          <motion.button
            id="nav-btn-how-it-works"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => scrollToSection('how-it-works-section')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
            <span>How It Works</span>
          </motion.button>

          <motion.button
            id="nav-btn-about"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => scrollToSection('about-section')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-700" />
            <span>About</span>
          </motion.button>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Mobile Quick Nav (visible on small screens) */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={() => scrollToSection('how-it-works-section')}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('about-section')}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              About
            </button>
          </div>

          {/* Status badge */}
          <div
            id="status-gemini-active"
            className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 shadow-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
            </span>
            <span className="font-mono text-[10px] font-bold tracking-wide uppercase">
              {geminiActive ? 'GEMINI ACTIVE' : 'ENGINE READY'}
            </span>
          </div>

          {/* Response Report Button */}
          <motion.button
            id="btn-open-response-report"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenReport}
            className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              hasActiveResult
                ? 'border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100 hover:border-amber-400'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <FileCheck className="h-4 w-4 text-amber-700" />
            <span className="hidden sm:inline">Response Report</span>
            {hasActiveResult ? (
              <span
                id="report-active-badge"
                className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-100 px-1 font-mono text-[9px] font-bold text-emerald-800"
              >
                ✓ Ready
              </span>
            ) : null}
          </motion.button>

          {/* Audit Ledger Drawer Button */}
          {onOpenAudit && (
            <motion.button
              id="btn-open-audit-trail"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAudit}
              className="relative flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
              title="Open Compliance & Audit Ledger Drawer"
            >
              <Terminal className="h-4 w-4 text-amber-800" />
              <span className="hidden md:inline">Audit Trail</span>
              {auditCount > 0 && (
                <span
                  id="audit-counter-badge"
                  className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-100 px-1 font-mono text-[10px] font-bold text-amber-800"
                >
                  {auditCount}
                </span>
              )}
            </motion.button>
          )}

          {/* Reset button */}
          <motion.button
            id="btn-reset-app"
            whileHover={hasActiveResult ? { scale: 1.02 } : {}}
            whileTap={hasActiveResult ? { scale: 0.98 } : {}}
            onClick={onReset}
            disabled={!hasActiveResult}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              hasActiveResult
                ? 'border-stone-200 bg-white text-stone-700 shadow-xs hover:border-stone-300 hover:bg-stone-50 cursor-pointer'
                : 'cursor-not-allowed border-stone-200/50 bg-stone-100/50 text-stone-400'
            }`}
            title="Reset Intent & Actions"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};
