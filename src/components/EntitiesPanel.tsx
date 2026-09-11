import React from 'react';
import { StructuredEntity, AmbiguityItem } from '../types';
import { User, MapPin, AlertTriangle, BatteryWarning, Clock, Box, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface EntitiesPanelProps {
  entities: StructuredEntity[];
  ambiguities: AmbiguityItem[];
}

export const EntitiesPanel: React.FC<EntitiesPanelProps> = ({ entities, ambiguities }) => {
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'PERSON':
        return <User className="h-3.5 w-3.5 text-blue-700" />;
      case 'LOCATION':
        return <MapPin className="h-3.5 w-3.5 text-rose-700" />;
      case 'HAZARD':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />;
      case 'CONSTRAINT':
        return <BatteryWarning className="h-3.5 w-3.5 text-purple-700" />;
      case 'URGENCY':
        return <Clock className="h-3.5 w-3.5 text-orange-700" />;
      case 'ASSET':
        return <Box className="h-3.5 w-3.5 text-emerald-700" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-stone-600" />;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Structured Entities (Left / 7 cols) */}
      <motion.div
        id="structured-entities-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm lg:col-span-7"
      >
        <div className="mb-3.5 flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-stone-800 uppercase">
              STRUCTURED ENTITIES
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[10px] text-amber-900 font-bold">
              {entities.length} EXTRACTED
            </span>
          </div>
          <span className="text-xs text-stone-500 font-semibold tracking-wide">MESSY → SCHEMATIZED</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {entities.map((ent, idx) => (
            <motion.div
              key={idx}
              id={`entity-item-${idx}`}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="rounded-xl border border-stone-200/90 bg-[#faf8f5] p-3 transition-colors hover:border-amber-300 hover:bg-white shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-stone-600 uppercase">
                  {getCategoryIcon(ent.category)}
                  <span>{ent.category}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                    ent.source === 'USER_PROVIDED'
                      ? 'border border-blue-200 bg-blue-50 text-blue-800'
                      : 'border border-purple-200 bg-purple-50 text-purple-800'
                  }`}
                >
                  {ent.source === 'USER_PROVIDED' ? 'USER' : 'INFERRED'}
                </span>
              </div>

              <div className="mt-2 text-xs font-bold text-stone-900">
                {ent.label}
              </div>
              <p className="mt-0.5 text-xs text-stone-700 leading-relaxed font-normal">
                {ent.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Critical Ambiguities & Gaps (Right / 5 cols) */}
      <motion.div
        id="ambiguities-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm lg:col-span-5"
      >
        <div className="mb-3.5 flex items-center justify-between border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>AMBIGUITIES & GAPS</span>
          </div>
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 font-mono text-[10px] text-amber-900 font-bold">
            TRUST BOUNDARY
          </span>
        </div>

        <p className="text-xs italic leading-relaxed text-amber-950 mb-3 font-medium">
          "Some information requires verification before consequential actions."
        </p>

        <div className="space-y-2.5">
          {ambiguities.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-3.5 text-xs text-stone-500 font-medium">
              No critical operational ambiguities detected.
            </div>
          ) : (
            ambiguities.map((amb, idx) => (
              <motion.div
                key={idx}
                id={`ambiguity-item-${idx}`}
                whileHover={{ scale: 1.01 }}
                className="rounded-xl border border-amber-200 bg-white p-3.5 text-xs shadow-2xs"
              >
                <div className="font-bold text-amber-950 flex items-start gap-2">
                  <span className="text-amber-700 font-mono font-bold">⚠</span>
                  <span className="leading-snug">{amb.description}</span>
                </div>

                <div className="mt-2 pl-4 text-xs text-stone-600">
                  <span className="font-bold text-stone-800">Impact: </span>
                  {amb.impact}
                </div>

                <div className="mt-1.5 pl-4 text-xs text-amber-900 font-medium">
                  <span className="font-bold text-amber-950">Verification: </span>
                  {amb.recommendedVerification}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
