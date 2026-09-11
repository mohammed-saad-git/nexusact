import React from 'react';
import { DEMO_SCENARIOS } from '../demoScenarios';
import { DemoScenario } from '../types';
import { Sparkles, ChevronDown } from 'lucide-react';

interface DemoScenariosProps {
  onSelectScenario: (scenario: DemoScenario) => void;
  selectedId: string | null;
  disabled?: boolean;
}

export const DemoScenarios: React.FC<DemoScenariosProps> = ({
  onSelectScenario,
  selectedId,
  disabled = false,
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const scenario = DEMO_SCENARIOS.find((sc) => sc.id === val);
    if (scenario) {
      onSelectScenario(scenario);
    }
  };

  const currentScenario = DEMO_SCENARIOS.find((sc) => sc.id === selectedId);

  return (
    <div id="demo-scenarios-panel" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl border border-stone-200/90 bg-white px-4 py-2.5 shadow-2xs">
        {/* Left Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 border border-amber-200 text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wide text-stone-800 uppercase">
              DEMO SCENARIOS
            </span>
            <span className="hidden md:inline text-xs text-stone-500 ml-1.5 font-normal">
              — Quick load tested crisis prompts
            </span>
          </div>
        </div>

        {/* Right Dropdown Selector */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md lg:max-w-lg justify-end">
          <div className="relative w-full">
            <select
              id="demo-scenario-dropdown"
              value={selectedId || ''}
              onChange={handleSelectChange}
              disabled={disabled}
              className="w-full appearance-none rounded-xl border border-stone-200 bg-[#faf8f5] px-3.5 py-2 pr-9 text-xs font-medium text-stone-800 hover:border-amber-400 hover:bg-white focus:border-amber-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all font-sans"
            >
              <option value="" disabled>
                ⚡ Select a scenario preset to populate input...
              </option>
              {DEMO_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id} className="py-1">
                  [{sc.tag}] {sc.title} — {sc.subtitle}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>

          {currentScenario && (
            <span className="hidden sm:inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 font-mono text-[10px] font-bold text-amber-900 shrink-0">
              {currentScenario.tag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
