'use client';

import type { GSCImportSummary, IndexingDecisionType } from '@/types/seo';

interface Props {
  summary: GSCImportSummary;
}

// ─── Decision badge config ────────────────────────────────────────────────────

const DECISION_CONFIG: Record<IndexingDecisionType, { icon: string; color: string; bg: string }> = {
  'Index':                    { icon: '✅', color: 'text-green-700',  bg: 'bg-green-50  border-green-200'  },
  'Improve Before Indexing':  { icon: '📈', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  'Fix Accidental Noindex':   { icon: '🚨', color: 'text-red-700',    bg: 'bg-red-50    border-red-200'    },
  'Keep Noindex':             { icon: '🔒', color: 'text-slate-600',  bg: 'bg-slate-50  border-slate-200'  },
  'Fix Canonical':            { icon: '🔗', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Redirect':                 { icon: '↗️',  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Remove From Sitemap':      { icon: '🗑️',  color: 'text-slate-600',  bg: 'bg-slate-50  border-slate-200'  },
  'Fix 403 Access':           { icon: '🔐', color: 'text-red-700',    bg: 'bg-red-50    border-red-200'    },
  'Fix Server Error':         { icon: '🔥', color: 'text-red-700',    bg: 'bg-red-50    border-red-200'    },
  'Needs Review':             { icon: '🔍', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  'Fix Robots Blocking':      { icon: '🤖', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Fix Redirect Error':       { icon: '⚡', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  'Add to Sitemap':           { icon: '🗺️',  color: 'text-blue-700',   bg: 'bg-blue-50   border-blue-200'   },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, ok,
}: {
  icon: string; label: string; value: string | number; sub?: string; ok?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-slate-500 leading-tight">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-extrabold ${
        ok === true ? 'text-green-600' : ok === false ? 'text-red-600' : 'text-slate-800'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Decision pill ────────────────────────────────────────────────────────────

function DecisionPill({ decision, count }: { decision: IndexingDecisionType; count: number }) {
  const cfg = DECISION_CONFIG[decision] ?? { icon: '⚪', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
  return (
    <div className={`flex items-center justify-between border rounded-lg px-3 py-2 ${cfg.bg}`}>
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
        <span>{cfg.icon}</span>
        <span>{decision}</span>
      </span>
      <span className={`text-sm font-bold ${cfg.color}`}>{count}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GSCSummaryCards({ summary }: Props) {
  const {
    totalUrls, indexedCount, actionRequiredCount,
    matchedCount, unmatchedCount,
    priorityBreakdown, decisionBreakdown,
  } = summary;

  const actionDecisions = Object.entries(decisionBreakdown)
    .filter(([d]) => d !== 'Index')
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .filter(([, cnt]) => (cnt ?? 0) > 0) as [IndexingDecisionType, number][];

  return (
    <div className="space-y-6">

      {/* ── Top stat row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon="🔗"
          label="Total URLs Imported"
          value={totalUrls}
        />
        <StatCard
          icon="✅"
          label="Already Indexed"
          value={indexedCount}
          sub={`${Math.round((indexedCount / totalUrls) * 100)}% of total`}
          ok={indexedCount > 0}
        />
        <StatCard
          icon="⚠️"
          label="Action Required"
          value={actionRequiredCount}
          ok={actionRequiredCount === 0}
        />
        <StatCard
          icon="🔍"
          label="Matched with Crawl"
          value={`${matchedCount}/${totalUrls}`}
          sub={unmatchedCount > 0 ? `${unmatchedCount} not in crawl` : 'All matched'}
          ok={unmatchedCount === 0}
        />
      </div>

      {/* ── Priority breakdown bar ── */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Action Priority Breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { key: 'critical', label: 'Critical', color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50'    },
            { key: 'high',     label: 'High',     color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
            { key: 'medium',   label: 'Medium',   color: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50' },
            { key: 'low',      label: 'Low',      color: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
          ] as const).map(({ key, label, color, text, bg }) => {
            const cnt = priorityBreakdown[key] ?? 0;
            const pct = totalUrls > 0 ? Math.round((cnt / totalUrls) * 100) : 0;
            return (
              <div key={key} className={`rounded-xl p-3 ${bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold ${text}`}>{label}</p>
                  <p className={`text-xl font-extrabold ${text}`}>{cnt}</p>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${color} transition-all duration-700`}
                       style={{ width: `${pct}%` }} />
                </div>
                <p className={`text-xs mt-1 ${text} opacity-70`}>{pct}% of URLs</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Decision breakdown grid ── */}
      {actionDecisions.length > 0 && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Decisions — What To Do ({actionDecisions.length} action type{actionDecisions.length !== 1 ? 's' : ''})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {actionDecisions.map(([d, cnt]) => (
              <DecisionPill key={d} decision={d} count={cnt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
