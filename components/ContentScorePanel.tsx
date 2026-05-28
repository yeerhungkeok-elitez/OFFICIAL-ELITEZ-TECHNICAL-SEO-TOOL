'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Content Score Panel (V9)
// Shows: overall score gauge, SEO/Readability/Completeness breakdown, readiness.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContentScoreResult, ContentReadiness } from '@/types/content';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  result: ContentScoreResult;
}

// ─── Readiness badge ────────────────────────────────────────────────────────────

function readinessConfig(r: ContentReadiness): { label: string; color: string; bg: string } {
  switch (r) {
    case 'Ready to Export':
      return { label: '✅ Ready to Export',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    case 'Needs Minor Fixes':
      return { label: '🟡 Needs Minor Fixes', color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' };
    case 'Needs Work':
      return { label: '🟠 Needs Work',        color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' };
    case 'Not Ready':
      return { label: '🔴 Not Ready',         color: 'text-red-700',     bg: 'bg-red-50 border-red-200' };
  }
}

// ─── Score gauge ─────────────────────────────────────────────────────────────────

function gaugeColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

function progressColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-red-500';
}

interface ProgressBarProps {
  label:    string;
  value:    number;
  max:      number;
}

function ProgressBar({ label, value, max }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-medium">{value} / {max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

interface StatBadgeProps { label: string; value: string | number; ok?: boolean }
function StatBadge({ label, value, ok }: StatBadgeProps) {
  return (
    <div className="flex flex-col items-center bg-slate-50 rounded-lg px-3 py-2 min-w-[72px]">
      <span className="text-xs text-slate-500 text-center leading-tight mb-1">{label}</span>
      <span className={`text-sm font-semibold ${ok === false ? 'text-red-500' : ok === true ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ContentScorePanel({ result }: Props) {
  const { overall, breakdown, readiness, issues, stats } = result;
  const badge = readinessConfig(readiness);

  const criticalCount = issues.filter(i => i.severity === 'critical' && !i.isIgnored && !i.isFixed).length;
  const highCount     = issues.filter(i => i.severity === 'high'     && !i.isIgnored && !i.isFixed).length;
  const medCount      = issues.filter(i => i.severity === 'medium'   && !i.isIgnored && !i.isFixed).length;
  const lowCount      = issues.filter(i => i.severity === 'low'      && !i.isIgnored && !i.isFixed).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Content Score</h2>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.bg} ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Overall score */}
        <div className="flex items-center gap-5">
          <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${overall * 0.942} 100`}
                strokeLinecap="round"
                className={gaugeColor(overall)}
              />
            </svg>
            <span className={`absolute text-xl font-bold ${gaugeColor(overall)}`}>{overall}</span>
          </div>
          <div className="flex-1 space-y-2">
            <ProgressBar label="SEO"          value={breakdown.seo}          max={40} />
            <ProgressBar label="Readability"  value={breakdown.readability}  max={30} />
            <ProgressBar label="Completeness" value={breakdown.completeness} max={30} />
          </div>
        </div>

        {/* Issue summary */}
        {(criticalCount + highCount + medCount + lowCount) > 0 && (
          <div className="flex flex-wrap gap-2">
            {criticalCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-700 font-medium border border-red-200">
                🔴 {criticalCount} Critical
              </span>
            )}
            {highCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md bg-orange-50 text-orange-700 font-medium border border-orange-200">
                🟠 {highCount} High
              </span>
            )}
            {medCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                🟡 {medCount} Medium
              </span>
            )}
            {lowCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 font-medium border border-slate-200">
                ⚪ {lowCount} Low
              </span>
            )}
          </div>
        )}

        {/* Article stats */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Article Stats</p>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="Words"       value={stats.wordCount}        ok={stats.wordCount >= 600} />
            <StatBadge label="Paragraphs"  value={stats.paragraphCount} />
            <StatBadge label="H2s"         value={stats.h2Count}          ok={stats.h2Count >= 2} />
            <StatBadge label="Keyphrase ×" value={stats.keyphraseCount}   ok={stats.keyphraseCount >= 2} />
            <StatBadge label="Placeholders" value={stats.placeholderCount} ok={stats.placeholderCount === 0} />
            <StatBadge label="Intro"       value={stats.hasIntro    ? '✓' : '✗'} ok={stats.hasIntro} />
            <StatBadge label="Conclusion"  value={stats.hasConclusion ? '✓' : '✗'} ok={stats.hasConclusion} />
            <StatBadge label="FAQ"         value={stats.hasFAQ      ? '✓' : '✗'} ok={stats.hasFAQ} />
            <StatBadge label="CTA"         value={stats.hasCTA      ? '✓' : '✗'} ok={stats.hasCTA} />
          </div>
        </div>
      </div>
    </div>
  );
}
