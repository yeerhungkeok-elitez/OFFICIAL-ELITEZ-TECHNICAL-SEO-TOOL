'use client';

import type { IndexingDecision, IndexingDecisionType, ApprovalLevel, DecisionPriority } from '@/types/seo';

// ─── Badge configs ────────────────────────────────────────────────────────────

export const DECISION_COLORS: Record<IndexingDecisionType, string> = {
  'Index':                   'bg-green-100  text-green-800  border border-green-200',
  'Improve Before Indexing': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'Fix Accidental Noindex':  'bg-red-100    text-red-800    border border-red-200',
  'Keep Noindex':            'bg-slate-100  text-slate-600  border border-slate-200',
  'Fix Canonical':           'bg-orange-100 text-orange-800 border border-orange-200',
  'Redirect':                'bg-orange-100 text-orange-800 border border-orange-200',
  'Remove From Sitemap':     'bg-slate-100  text-slate-600  border border-slate-200',
  'Fix 403 Access':          'bg-red-100    text-red-800    border border-red-200',
  'Fix Server Error':        'bg-red-100    text-red-800    border border-red-200',
  'Needs Review':            'bg-purple-100 text-purple-800 border border-purple-200',
  'Fix Robots Blocking':     'bg-orange-100 text-orange-800 border border-orange-200',
  'Fix Redirect Error':      'bg-orange-100 text-orange-800 border border-orange-200',
  'Add to Sitemap':          'bg-blue-100   text-blue-800   border border-blue-200',
};

export const DECISION_ICONS: Record<IndexingDecisionType, string> = {
  'Index':                   '✅',
  'Improve Before Indexing': '📈',
  'Fix Accidental Noindex':  '🚨',
  'Keep Noindex':            '🔒',
  'Fix Canonical':           '🔗',
  'Redirect':                '↗️',
  'Remove From Sitemap':     '🗑️',
  'Fix 403 Access':          '🔐',
  'Fix Server Error':        '🔥',
  'Needs Review':            '🔍',
  'Fix Robots Blocking':     '🤖',
  'Fix Redirect Error':      '⚡',
  'Add to Sitemap':          '🗺️',
};

export const PRIORITY_COLORS: Record<DecisionPriority, string> = {
  critical: 'bg-red-600    text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-yellow-400 text-slate-900',
  low:      'bg-blue-100   text-blue-800',
};

export const PRIORITY_BORDER: Record<DecisionPriority, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-400',
  medium:   'border-l-yellow-400',
  low:      'border-l-blue-300',
};

export const APPROVAL_CONFIG: Record<ApprovalLevel, { cls: string; icon: string; label: string }> = {
  'safe':             { cls: 'bg-green-50  text-green-700  border border-green-200',  icon: '✅', label: 'Safe to Implement' },
  'needs-review':     { cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '⚠️', label: 'Needs SEO Review'  },
  'needs-developer':  { cls: 'bg-red-50    text-red-700    border border-red-200',    icon: '🚨', label: 'Needs Developer'   },
};

// ─── Decision badge (reusable) ────────────────────────────────────────────────

export function DecisionBadge({ decision }: { decision: IndexingDecisionType }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${DECISION_COLORS[decision] ?? 'bg-slate-100 text-slate-700'}`}>
      {DECISION_ICONS[decision] ?? '⚪'} {decision}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: DecisionPriority }) {
  const dot = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[priority];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_COLORS[priority]}`}>
      {dot} {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export function ApprovalBadge({ level }: { level: ApprovalLevel }) {
  const cfg = APPROVAL_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Full decision card (expandable) ─────────────────────────────────────────

interface Props {
  decision: IndexingDecision;
  defaultExpanded?: boolean;
}

export default function GSCDecisionCard({ decision, defaultExpanded = false }: Props) {
  return (
    <div className="space-y-4">
      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        <DecisionBadge decision={decision.decision} />
        <PriorityBadge priority={decision.priority} />
        <ApprovalBadge level={decision.approvalLevel} />
      </div>

      {/* Client explanation */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          💬 What This Means
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">{decision.clientExplanation}</p>
      </div>

      {/* Likely causes */}
      {decision.likelyCauses.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
            🔍 Likely Causes
          </p>
          <ul className="space-y-1">
            {decision.likelyCauses.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">
          ✅ What To Do
        </p>
        <ol className="space-y-1.5">
          {decision.recommendedActions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="text-green-600 font-bold flex-shrink-0 w-4">{i + 1}.</span>
              {a}
            </li>
          ))}
        </ol>
      </div>

      {/* Developer instructions */}
      {decision.approvalLevel === 'needs-developer' && (
        <div className="bg-slate-900 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            🧑‍💻 Developer Instructions
          </p>
          <p className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
            {decision.developerInstructions}
          </p>
        </div>
      )}
    </div>
  );
}
