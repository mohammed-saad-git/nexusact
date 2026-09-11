import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const Hero: React.FC = () => {
  return (
    <section id="hero-section" className="relative pt-6 pb-4 sm:pt-10 sm:pb-8 text-center">
      {/* Soft warm light glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
        <div className="h-[280px] w-[600px] rounded-full bg-gradient-to-b from-amber-200/40 via-orange-100/25 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* Architectural label */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/90 px-4 py-1.5 text-xs font-semibold text-amber-900 shadow-xs backdrop-blur-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-700" />
          <span className="font-mono text-[11px] font-bold tracking-wider uppercase">
            Autonomous Verification & Execution Layer
          </span>
        </motion.div>

        {/* Editorial Modern Headline */}
        <motion.h1
          id="hero-headline"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-black tracking-tight text-stone-900 sm:text-6xl lg:text-7xl leading-[1.08]"
        >
          Turn Human Intent into{' '}
          <span className="bg-gradient-to-r from-amber-800 via-amber-700 to-orange-800 bg-clip-text text-transparent">
            Verified Action.
          </span>
        </motion.h1>

        {/* Subheading with modern typography */}
        <motion.p
          id="hero-subheading"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg font-normal"
        >
          Gemini transforms unstructured, messy real-world situations into structured, safe, and auditable actions governed by real application registries.
        </motion.p>

        {/* Paradigm differentiator flow bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium"
        >
          <span className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-stone-700 shadow-xs font-semibold">
            Messy Human Input
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900 shadow-xs font-semibold">
            Understood Intent
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-900 shadow-xs font-semibold">
            Registry Verified
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-900 shadow-xs font-semibold">
            Human Authorization
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
          <span className="rounded-xl border border-stone-200 bg-stone-100 px-3 py-1.5 text-stone-800 shadow-xs font-semibold">
            Auditable Execution
          </span>
        </motion.div>

        {/* Report a Problem Red Button */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.38 }}
          className="mt-6 flex justify-center"
        >
          <motion.button
            id="btn-hero-report-problem"
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const el = document.getElementById('intent-console-container');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
              setTimeout(() => {
                const ta = document.getElementById('intent-input-textarea');
                if (ta) ta.focus();
              }, 400);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 hover:border-rose-800 transition-all cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-200 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
            </span>
            <span>Report a Problem</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
