import React from 'react';
import {
  ShieldAlert,
  Target,
  Layers,
  HeartHandshake,
  Waves,
  Pill,
  Truck,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'motion/react';

export const AboutSection: React.FC = () => {
  const corePillars = [
    {
      title: 'Action Registry Sovereignty',
      icon: <Layers className="h-5 w-5 text-amber-800" />,
      description:
        'AI agents must never hallucinate capabilities or invent arbitrary API calls. In NEXUSACT, the Action Registry in code is the sole authority. Gemini only matches intent to pre-registered, cryptographically sanitized actions with hardcoded risk tiers.',
    },
    {
      title: 'Graduated Human Safeguards',
      icon: <ShieldAlert className="h-5 w-5 text-rose-700" />,
      description:
        'Not all actions carry equal risk. Low-risk actions (logging tickets, alerts) execute automatically. Medium actions require quick one-click confirmation. High-risk actions (physical dispatches, power cutoffs) demand strict multi-step human authorization.',
    },
    {
      title: 'Truth vs. Inference Matrix',
      icon: <Target className="h-5 w-5 text-indigo-700" />,
      description:
        'NEXUSACT never treats AI guesswork as established fact. Every detail is split into User-Provided data, Inferred assumptions, or System-Verified facts, highlighting critical ambiguities before operations are committed.',
    },
    {
      title: 'Post-Incident Audit Ledger',
      icon: <HeartHandshake className="h-5 w-5 text-emerald-700" />,
      description:
        'Full operational accountability. Every prompt, image attachment, Gemini reasoning step, operator approval, and simulated dispatch is saved in a tamper-evident, exportable JSON audit ledger.',
    },
  ];

  const domains = [
    {
      name: 'Disaster & Flood Rescue',
      icon: <Waves className="h-4 w-4 text-sky-700" />,
      example: 'Rapid boat dispatch, evacuation routing, family pinging',
    },
    {
      name: 'Medical & Medication Triage',
      icon: <Pill className="h-4 w-4 text-amber-700" />,
      example: 'Drug interaction isolation, nurse alerts, emergency transport',
    },
    {
      name: 'Supply Chain & Logistics',
      icon: <Truck className="h-4 w-4 text-indigo-700" />,
      example: 'Blizzard highway rerouting, perishable reefer protection',
    },
    {
      name: 'Community Mutual Aid',
      icon: <Users className="h-4 w-4 text-emerald-700" />,
      example: 'Perishable food redistribution, shelter bed allocation',
    },
  ];

  return (
    <section id="about-section" className="w-full scroll-mt-20 py-8">
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
        {/* About Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 shadow-2xs">
            <span className="font-mono text-[10px] tracking-wider uppercase">THE MISSION & FOUNDATION</span>
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-stone-900 sm:text-4xl">
            About NEXUSACT
          </h2>
          <p className="mt-2 text-sm text-stone-600 sm:text-base leading-relaxed font-normal">
            Created for <span className="font-semibold text-stone-900">PromptWars × TechVerse</span> to solve the fundamental chasm between messy, panic-stricken human communication and rigid real-world execution systems.
          </p>
        </div>

        {/* The Core Problem & Solution Narrative */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-[#faf8f5] p-6 shadow-2xs">
            <span className="font-mono text-xs font-bold text-rose-800 uppercase tracking-wide">THE PROBLEM</span>
            <h3 className="mt-1.5 text-lg font-bold text-stone-900">
              Why Generic Chatbots & Unchecked Autonomous Agents Fail
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-stone-600">
              When disaster strikes, people don't submit structured API tickets. They cry into voice notes, post frantic fragments, and upload blurry hazard photos.
            </p>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-stone-600">
              Traditional chatbots respond with verbose essays that waste critical seconds. Unconstrained autonomous agents, on the other hand, frequently hallucinate endpoints, bypass permissions, and execute dangerous actions without human oversight.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-6 shadow-2xs">
            <span className="font-mono text-xs font-bold text-amber-800 uppercase tracking-wide">THE NEXUSACT ARCHITECTURE</span>
            <h3 className="mt-1.5 text-lg font-bold text-stone-900">
              Intelligence Governed by Sovereign Code
            </h3>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-stone-700">
              NEXUSACT pairs Gemini 3.8's state-of-the-art multimodal reasoning with a rigid, code-governed Action Registry.
            </p>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-stone-700">
              Gemini decodes the nuance, strips the panic, extracts structured parameters, and builds a truth matrix. But the application's registry strictly enforces whether an action can execute automatically, requires operator confirmation, or demands cryptographic human sign-off.
            </p>
          </div>
        </div>

        {/* 4 Architectural Pillars */}
        <div className="mt-10">
          <div className="mb-4">
            <span className="font-mono text-xs font-bold tracking-wider text-stone-800 uppercase">
              CORE SYSTEM PILLARS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {corePillars.map((pillar, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="rounded-2xl border border-stone-200/90 bg-[#faf8f5] p-5 transition-colors hover:border-amber-300 hover:bg-white shadow-2xs"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-stone-200/90 shadow-2xs">
                  {pillar.icon}
                </div>
                <h4 className="mt-3.5 text-sm font-bold text-stone-900 leading-snug">
                  {pillar.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-stone-600 font-normal">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Real-World Use Domains */}
        <div className="mt-10 rounded-2xl border border-stone-200 bg-[#faf8f5] p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs font-bold tracking-wider text-stone-800 uppercase">
              TARGET REAL-WORLD DEPLOYMENT DOMAINS
            </span>
            <span className="font-mono text-[10px] text-stone-500 font-bold">4 PROVEN TEST CASES</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {domains.map((dom, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-stone-200/80 bg-white p-3.5 shadow-2xs"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-50 border border-stone-200">
                  {dom.icon}
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900">{dom.name}</div>
                  <div className="mt-1 text-[11px] text-stone-500 leading-tight">{dom.example}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety & Compliance Badge */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="font-semibold">
              Hackathon Safety Protocol: All external dispatches and high-risk actions are simulated safely in-memory.
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-emerald-800 uppercase bg-white/80 border border-emerald-300 rounded-full px-2.5 py-0.5">
            ZERO EXTERNAL SIDE EFFECTS
          </span>
        </div>
      </div>
    </section>
  );
};
