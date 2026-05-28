'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Plugin Instruction Tabs (V7)
// Renders plugin-specific step-by-step fix instructions in a tabbed UI.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { PluginInstruction, WordPressFixStep } from '@/types/seo';

// ─── Plugin icon map ──────────────────────────────────────────────────────────

const PLUGIN_ICON: Record<string, string> = {
  'Yoast SEO':        '🟩',
  'Rank Math':        '🟥',
  'All in One SEO':   '🟦',
  'WooCommerce':      '🟣',
  'Elementor':        '🩵',
  'Flatsome':         '🟤',
  'WordPress Core':   '🔵',
  'WordPress Admin':  '🔵',
  'Developer':        '👨‍💻',
};

function pluginIcon(name: string): string {
  for (const [key, icon] of Object.entries(PLUGIN_ICON)) {
    if (name.includes(key)) return icon;
  }
  return '🔌';
}

// ─── Step list ────────────────────────────────────────────────────────────────

function StepList({ steps }: { steps: WordPressFixStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map(step => (
        <li key={step.stepNumber} className={`flex items-start gap-3 ${step.isWarning ? 'bg-amber-50 border border-amber-200 rounded-xl p-3' : ''}`}>
          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step.isWarning
              ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {step.stepNumber}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm leading-relaxed ${step.isWarning ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>
              {step.isWarning && '⚠️ '}{step.instruction}
            </p>
            {step.notes && (
              <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">
                📝 {step.notes}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Verification steps ───────────────────────────────────────────────────────

function VerificationList({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
      <p className="text-xs font-bold text-green-700 mb-2">✅ Verification Steps</p>
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={i} className="text-xs text-green-800 flex items-start gap-2">
            <span className="flex-shrink-0 font-bold">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  instructions: PluginInstruction[];
  preferredPlugin?: string;
}

export default function PluginInstructionTabs({ instructions, preferredPlugin }: Props) {
  const defaultIdx = preferredPlugin
    ? Math.max(0, instructions.findIndex(pi => pi.pluginName.includes(preferredPlugin)))
    : 0;

  const [activeIdx, setActiveIdx] = useState(defaultIdx);

  if (instructions.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
        No plugin-specific instructions available for this issue.
      </div>
    );
  }

  const active = instructions[activeIdx];

  return (
    <div className="space-y-3">
      {/* Plugin tab strip */}
      <div className="flex flex-wrap gap-1.5">
        {instructions.map((pi, idx) => (
          <button
            key={pi.pluginSlug}
            onClick={() => setActiveIdx(idx)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              activeIdx === idx
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{pluginIcon(pi.pluginName)}</span>
            <span>{pi.pluginName}</span>
          </button>
        ))}
      </div>

      {/* Active instruction panel */}
      <div className="border border-slate-200 rounded-xl bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{pluginIcon(active.pluginName)}</span>
          <div>
            <p className="font-bold text-slate-800">{active.pluginName}</p>
            {active.prerequisite && (
              <p className="text-xs text-amber-700 mt-0.5">
                ⚠️ Prerequisite: {active.prerequisite}
              </p>
            )}
          </div>
        </div>

        <StepList steps={active.steps} />
        <VerificationList steps={active.verificationSteps} />
      </div>
    </div>
  );
}
