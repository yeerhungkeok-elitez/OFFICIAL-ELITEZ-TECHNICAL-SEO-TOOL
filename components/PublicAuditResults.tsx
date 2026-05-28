'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Public Audit Results (V8)
// Teaser result shown before lead form submission.
// Locked sections are blurred until unlock.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditResult } from '@/types/seo';

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const size  = 120;
  const r     = 48;
  const cx    = size / 2;
  const circ  = 2 * Math.PI * r;
  const fill  = (score / 100) * circ;
  const colour =
    score >= 80 ? '#16a34a' :
    score >= 60 ? '#ca8a04' :
    score >= 40 ? '#ea580c' : '#dc2626';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={colour} strokeWidth="10"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="text-center -mt-20 mb-12">
        <p className="text-3xl font-extrabold" style={{ color: colour }}>{score}</p>
        <p className="text-xs text-slate-500 font-semibold">/100</p>
      </div>
    </div>
  );
}

// ─── Issue severity pill ──────────────────────────────────────────────────────

const SEV_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-blue-100 text-blue-700 border-blue-200',
};

// ─── Locked section blur ──────────────────────────────────────────────────────

function LockedSection({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 opacity-60">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-slate-400">🔒</span>
        <span className="text-sm text-slate-500 truncate">{label}</span>
      </div>
      <span className="text-xs font-semibold text-blue-600 flex-shrink-0">Unlock →</span>
    </div>
  );
}

// ─── Score label ──────────────────────────────────────────────────────────────

function scoreLabel(score: number): { label: string; colour: string } {
  if (score >= 80) return { label: 'Good',              colour: 'text-green-600' };
  if (score >= 60) return { label: 'Needs Improvement', colour: 'text-yellow-600' };
  if (score >= 40) return { label: 'Poor',              colour: 'text-orange-600' };
  return               { label: 'Critical',           colour: 'text-red-600'    };
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  result:   PublicAuditResult;
  unlocked: boolean;
}

export default function PublicAuditResults({ result, unlocked }: Props) {
  const { label, colour } = scoreLabel(result.score);

  return (
    <div className="space-y-6">

      {/* Score hero */}
      <div className="card p-6 bg-gradient-to-br from-slate-50 to-blue-50 border border-blue-100">
        <div className="flex flex-wrap items-center gap-8">

          {/* Ring + score */}
          <div className="flex flex-col items-center">
            <ScoreRing score={result.score} />
            <p className={`text-lg font-extrabold mt-1 ${colour}`}>{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">SEO Health Score</p>
          </div>

          {/* Quick stats */}
          <div className="flex-1 min-w-[200px] grid grid-cols-2 gap-3">
            {[
              {
                icon: '📄',
                label: 'Pages Scanned',
                value: String(result.pagesScanned),
                sub: 'public pages checked',
              },
              {
                icon: result.wordpressDetected ? '🟦' : '⚪',
                label: 'WordPress',
                value: result.wordpressDetected ? 'Detected' : 'Not detected',
                sub: result.wordpressDetected ? 'WP fix guide available' : '',
              },
              {
                icon: result.schemaDetected ? '✅' : '❌',
                label: 'Schema Markup',
                value: result.schemaDetected ? 'Found' : 'None found',
                sub: result.schemaDetected ? 'structured data present' : 'opportunity identified',
              },
              {
                icon: '📊',
                label: 'Schema Score',
                value: result.schemaScore !== null ? `${result.schemaScore}/100` : 'N/A',
                sub: result.schemaScore !== null ? scoreLabel(result.schemaScore).label : '',
              },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-bold text-slate-500">{s.label}</span>
                </div>
                <p className="text-sm font-extrabold text-slate-800">{s.value}</p>
                {s.sub && <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teaser summary */}
      <div className="card p-5 bg-blue-50 border border-blue-100">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">🔍 Audit Summary</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.teaserSummary}</p>
        <p className="text-xs text-slate-400 mt-2">
          Scanned: {new Date(result.scannedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Top 3 issues */}
      {result.topIssues.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            🚨 Top Issues Found ({result.topIssues.length} shown)
          </h3>
          <div className="space-y-3">
            {result.topIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 mt-0.5 ${SEV_STYLE[issue.severity]}`}>
                  {issue.severity.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{issue.problem}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    May affect approximately <strong>{issue.count}</strong> page{issue.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!unlocked && (
            <p className="text-xs text-slate-400 mt-3 italic">
              ↓ Unlock the full report to see all issues across every page.
            </p>
          )}
        </div>
      )}

      {/* Locked sections — shown before unlock */}
      {!unlocked && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-1">🔒 Full Report Includes</h3>
          <p className="text-xs text-slate-500 mb-3">
            Submit your details below to unlock your complete SEO report — free of charge.
          </p>
          <div className="space-y-2">
            {result.lockedSections.map((section, i) => (
              <LockedSection key={i} label={section} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended next steps — shown after unlock */}
      {unlocked && result.recommendedNextSteps.length > 0 && (
        <div className="card p-5 bg-green-50 border border-green-100">
          <h3 className="text-sm font-bold text-green-800 mb-3">✅ Recommended Next Steps</h3>
          <ol className="space-y-2">
            {result.recommendedNextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="flex-shrink-0 w-5 h-5 bg-green-200 text-green-800 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Safety disclaimer */}
      <p className="text-xs text-slate-400 leading-relaxed px-1">
        ⚠️ This snapshot is based on an automated scan of {result.pagesScanned} pages.
        Findings are advisory only. Google outcomes including rankings and traffic are not guaranteed.
      </p>
    </div>
  );
}
