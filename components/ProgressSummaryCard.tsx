'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Progress Summary Card (V6)
// Displays the narrative progress summary generated from a comparison.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProgressSummary } from '@/types/seo';

interface Props {
  summary: ProgressSummary;
}

export default function ProgressSummaryCard({ summary }: Props) {
  const {
    headline,
    scoreChange,
    resolvedNote,
    newIssuesNote,
    persistentNote,
    overallAssessment,
    recommendations,
    disclaimer,
  } = summary;

  return (
    <div className="space-y-4">

      {/* Headline */}
      <div className="card p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <p className="text-base font-bold text-slate-800">📈 {headline}</p>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{scoreChange}</p>
      </div>

      {/* Three-column narrative */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Resolved */}
        <div className="card p-4 bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <p className="text-sm font-bold text-emerald-800">Resolved Issues</p>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">{resolvedNote}</p>
        </div>

        {/* New issues */}
        <div className="card p-4 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-bold text-amber-800">New Issues</p>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">{newIssuesNote}</p>
        </div>

        {/* Persistent */}
        <div className="card p-4 bg-orange-50 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🔄</span>
            <p className="text-sm font-bold text-orange-800">Persistent Issues</p>
          </div>
          <p className="text-xs text-orange-700 leading-relaxed">{persistentNote}</p>
        </div>
      </div>

      {/* Overall assessment */}
      <div className="card p-4 bg-slate-50 border border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-2">🎯 Overall Assessment</p>
        <p className="text-sm text-slate-600 leading-relaxed">{overallAssessment}</p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">💡 Recommendations</p>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="card p-3 bg-slate-50 border border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold">Disclaimer: </span>
          {disclaimer}
        </p>
      </div>
    </div>
  );
}
