'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Report Preview Component (V5)
// Live HTML preview that mirrors the PDF cover + executive summary.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportExportData, IssueSeverity } from '@/types/seo';

const SEV_COLOUR: Record<IssueSeverity, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-100',    text: 'text-red-700'    },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low:      { bg: 'bg-blue-100',   text: 'text-blue-700'   },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-extrabold text-slate-700 w-16 text-right">{score}/100</span>
    </div>
  );
}

interface Props {
  data: ReportExportData;
}

export default function ReportPreview({ data }: Props) {
  const { settings: { brand, mode }, executiveSummary: es, result, schemaAudit, gscData } = data;
  const modeLabel =
    mode === 'client-summary'     ? 'Client Summary Report' :
    mode === 'developer-fix-plan' ? 'Developer Fix Plan' :
    'Full Technical Audit Report';

  return (
    <div className="font-sans text-slate-800 rounded-2xl overflow-hidden border border-slate-200 shadow-lg">

      {/* ── Cover band ── */}
      <div
        className="px-8 pt-8 pb-6 text-white"
        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.primaryColor}CC)` }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
              {brand.brandName}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight">{modeLabel}</h1>
            <p className="text-sm opacity-80 mt-1">
              {brand.clientName || result.domain} · {brand.reportDate}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-extrabold">{es.overallScore}</div>
            <div className="text-xs opacity-70">SEO score / 100</div>
          </div>
        </div>

        {/* Severity row */}
        <div className="flex gap-3 flex-wrap mt-4">
          {[
            { label: 'Critical', val: es.criticalIssues, bg: 'bg-red-500/80'    },
            { label: 'High',     val: es.highIssues,     bg: 'bg-orange-400/80' },
            { label: 'Medium',   val: es.mediumIssues,   bg: 'bg-yellow-400/80' },
            { label: 'Low',      val: es.lowIssues,      bg: 'bg-blue-400/80'   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-2 text-center min-w-[72px]`}>
              <div className="text-xl font-extrabold">{s.val}</div>
              <div className="text-xs opacity-90">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="bg-white p-6 space-y-6">

        {/* Scores */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Score Snapshot</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>SEO Health Score</span>
              </div>
              <ScoreBar score={es.overallScore} color={brand.primaryColor} />
            </div>
            {es.schemaScore !== null && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Schema Health Score</span>
                </div>
                <ScoreBar score={es.schemaScore} color="#7C3AED" />
              </div>
            )}
          </div>
        </div>

        {/* Assessment */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Assessment</p>
          <p className="text-sm text-slate-600 leading-relaxed">{es.overallHealth}</p>
        </div>

        {/* Top risks */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Risks</p>
          <ul className="space-y-1.5">
            {es.topRisks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-orange-500 mt-0.5 flex-shrink-0">⚠</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Business impact */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Business Impact</p>
          <p className="text-sm text-slate-600 leading-relaxed">{es.businessImpact}</p>
        </div>

        {/* Recommended next step */}
        <div
          className="rounded-xl p-4 text-sm font-medium leading-relaxed"
          style={{ background: `${brand.primaryColor}12`, color: brand.primaryColor }}
        >
          <span className="font-bold">Recommended Next Step: </span>
          <span className="text-slate-700">{es.recommendedNext}</span>
        </div>

        {/* Data availability badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
            ✓ {result.summary.totalPages} pages crawled
          </span>
          {schemaAudit && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-medium">
              ✓ Schema audit: {schemaAudit.score.overall}/100
            </span>
          )}
          {gscData && gscData.records.length > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
              ✓ GSC data: {gscData.summary.totalUrls} URLs
            </span>
          )}
          <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-medium">
            ✓ {data.developerTasks.length} developer tasks
          </span>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 italic leading-relaxed border-t border-slate-100 pt-4">
          {es.confidenceNote}
        </p>
      </div>
    </div>
  );
}
