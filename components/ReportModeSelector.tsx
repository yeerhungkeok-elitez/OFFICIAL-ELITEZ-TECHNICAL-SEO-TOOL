'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Report Mode Selector (V5)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportMode } from '@/types/seo';

const MODES: {
  key:         ReportMode;
  icon:        string;
  label:       string;
  description: string;
  audience:    string;
}[] = [
  {
    key:         'client-summary',
    icon:        '📄',
    label:       'Client Summary',
    description: 'Plain-language overview of health score, key risks, and 30-day roadmap. No code blocks.',
    audience:    'For: clients, management, stakeholders',
  },
  {
    key:         'developer-fix-plan',
    icon:        '👨‍💻',
    label:       'Developer Fix Plan',
    description: 'Prioritised task list with developer instructions, before/after code, and implementation notes.',
    audience:    'For: developers, technical leads',
  },
  {
    key:         'full-technical-audit',
    icon:        '🔬',
    label:       'Full Technical Audit',
    description: 'Complete audit including all sections — issues, schema, GSC, fix queue, roadmap, and URL appendix.',
    audience:    'For: internal SEO team, senior management',
  },
];

interface Props {
  value:    ReportMode;
  onChange: (mode: ReportMode) => void;
}

export default function ReportModeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {MODES.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
            value === m.key
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">{m.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-bold text-sm ${value === m.key ? 'text-blue-700' : 'text-slate-800'}`}>
                  {m.label}
                </p>
                {value === m.key && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.description}</p>
              <p className="text-xs text-slate-400 mt-1 italic">{m.audience}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
