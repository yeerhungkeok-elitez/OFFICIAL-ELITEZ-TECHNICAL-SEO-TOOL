'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Fix Issue Card (V9)
// Displays a single content issue with: severity badge, safety level,
// description, why-it-matters, suggested fix, preview, and action buttons.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ContentIssue } from '@/types/content';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  issue:       ContentIssue;
  onApplyFix:  (issueId: string) => void;
  onIgnore:    (issueId: string) => void;
  isFixing?:   boolean;   // shows spinner on Apply button
}

// ─── Severity config ────────────────────────────────────────────────────────────

function severityConfig(s: ContentIssue['severity']) {
  switch (s) {
    case 'critical': return { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50 border-red-200' };
    case 'high':     return { label: 'High',     dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
    case 'medium':   return { label: 'Medium',   dot: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' };
    case 'low':      return { label: 'Low',      dot: 'bg-slate-400',  text: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' };
  }
}

// ─── Safety config ───────────────────────────────────────────────────────────

function safetyConfig(s: ContentIssue['safetyLevel']) {
  switch (s) {
    case 'safe':         return { label: '🟢 Safe to auto-fix',   color: 'text-emerald-700' };
    case 'needs-review': return { label: '🟡 Needs review after', color: 'text-amber-700'   };
    case 'manual-only':  return { label: '🔴 Manual only',        color: 'text-red-700'     };
  }
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FixIssueCard({ issue, onApplyFix, onIgnore, isFixing }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (issue.isIgnored || issue.isFixed) return null;

  const severity = severityConfig(issue.severity);
  const safety   = safetyConfig(issue.safetyLevel);
  const canFix   = issue.canAutoFix && issue.safetyLevel !== 'manual-only';

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${severity.bg}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${severity.dot}`} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-snug">{issue.title}</p>
            <p className={`text-xs font-medium mt-0.5 ${severity.text}`}>{severity.label}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-400 hover:text-slate-600 shrink-0 text-xs underline-offset-2 hover:underline"
        >
          {expanded ? 'Less ▲' : 'More ▼'}
        </button>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 leading-relaxed">{issue.description}</p>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-2 pt-1">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Why It Matters</p>
            <p className="text-sm text-slate-700">{issue.whyItMatters}</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Suggested Fix</p>
            <p className="text-sm text-slate-700">{issue.suggestedFix}</p>
          </div>
          {issue.previewFix && (
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Preview</p>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                {issue.previewFix}
              </pre>
            </div>
          )}
          <p className={`text-xs font-medium ${safety.color}`}>{safety.label}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {canFix ? (
          <button
            onClick={() => onApplyFix(issue.id)}
            disabled={isFixing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                       bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60
                       transition-colors"
          >
            {isFixing ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Fixing…
              </>
            ) : (
              <>⚡ Apply Fix</>
            )}
          </button>
        ) : (
          <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
            ✏️ Manual Fix Required
          </span>
        )}

        <button
          onClick={() => onIgnore(issue.id)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200
                     text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
