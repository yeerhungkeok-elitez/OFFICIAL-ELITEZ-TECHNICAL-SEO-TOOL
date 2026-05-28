'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Auto Fix Controls (V9)
// Top-level action buttons: Fix Critical Issues, Fix All Safe, Re-Score.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContentScoreResult } from '@/types/content';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  scoreResult:      ContentScoreResult | null;
  onFixCritical:    () => void;
  onFixSafe:        () => void;
  onFixAll:         () => void;
  onRescore:        () => void;
  isProcessing?:    boolean;
  hasContent?:      boolean;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function AutoFixControls({
  scoreResult,
  onFixCritical,
  onFixSafe,
  onFixAll,
  onRescore,
  isProcessing,
  hasContent,
}: Props) {
  const issues = scoreResult?.issues.filter(i => !i.isIgnored && !i.isFixed) ?? [];

  const criticalCount = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const safeCount     = issues.filter(i => i.canAutoFix && i.safetyLevel === 'safe').length;
  const totalFixable  = issues.filter(i => i.canAutoFix).length;

  const disabled = !hasContent || isProcessing;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Auto-Fix Actions</h2>
        {isProcessing && (
          <span className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
            <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Fix Critical */}
        <button
          onClick={onFixCritical}
          disabled={disabled || criticalCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
                     bg-red-600 text-white hover:bg-red-700
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={criticalCount === 0 ? 'No critical/high issues to fix' : undefined}
        >
          🔴 Fix Critical
          {criticalCount > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">
              {criticalCount}
            </span>
          )}
        </button>

        {/* Fix Safe */}
        <button
          onClick={onFixSafe}
          disabled={disabled || safeCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
                     bg-emerald-600 text-white hover:bg-emerald-700
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={safeCount === 0 ? 'No safe auto-fixable issues' : undefined}
        >
          🟢 Auto-Fix Safe
          {safeCount > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">
              {safeCount}
            </span>
          )}
        </button>

        {/* Fix All */}
        <button
          onClick={onFixAll}
          disabled={disabled || totalFixable === 0}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
                     bg-indigo-600 text-white hover:bg-indigo-700
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ⚡ Fix All Issues
          {totalFixable > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">
              {totalFixable}
            </span>
          )}
        </button>

        {/* Re-score */}
        <button
          onClick={onRescore}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg
                     border border-slate-200 text-slate-600 bg-slate-50
                     hover:bg-slate-100 hover:text-slate-800
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          🔄 Re-Score
        </button>
      </div>

      {/* Safety notice */}
      {scoreResult && issues.some(i => i.safetyLevel === 'needs-review') && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          🟡 Some fixes insert placeholder text marked{' '}
          <strong>[⚠️ NEEDS REVIEW]</strong>. Review all generated content before publishing.
        </p>
      )}
    </div>
  );
}
