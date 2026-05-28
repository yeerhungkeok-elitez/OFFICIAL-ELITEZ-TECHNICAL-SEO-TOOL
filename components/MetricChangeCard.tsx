'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Metric Change Card (V6)
// Displays a single before/after metric comparison with delta indicator.
// ─────────────────────────────────────────────────────────────────────────────

import type { MetricComparison } from '@/types/seo';

interface Props {
  metric: MetricComparison;
  compact?: boolean;
}

export default function MetricChangeCard({ metric, compact = false }: Props) {
  const { label, before, after, delta, deltaPercent, direction, unit } = metric;

  const isImproved  = direction === 'improved';
  const isRegressed = direction === 'regressed';
  const isUnchanged = direction === 'unchanged';

  const arrowIcon = isImproved ? '↑' : isRegressed ? '↓' : '→';
  const deltaColor = isImproved
    ? 'text-emerald-600'
    : isRegressed
    ? 'text-red-600'
    : 'text-slate-400';
  const bgColor = isImproved
    ? 'bg-emerald-50 border-emerald-200'
    : isRegressed
    ? 'bg-red-50 border-red-200'
    : 'bg-slate-50 border-slate-200';

  const fmt = (n: number) => (unit === '/100' ? String(n) : n.toLocaleString());
  const deltaLabel = delta === 0
    ? 'No change'
    : `${delta > 0 ? '+' : ''}${delta}${unit === '/100' ? '' : ''} (${delta > 0 ? '+' : ''}${deltaPercent}%)`;

  if (compact) {
    return (
      <div className={`rounded-xl border p-3 ${bgColor}`}>
        <p className="text-xs text-slate-500 font-medium truncate mb-1">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-xl font-extrabold text-slate-800">{fmt(after)}</span>
            {unit && unit !== '/100' && <span className="text-xs text-slate-400 ml-0.5">{unit}</span>}
            {unit === '/100' && <span className="text-xs text-slate-400 ml-0.5">/100</span>}
          </div>
          <span className={`text-sm font-bold ${deltaColor}`}>
            {arrowIcon}{' '}{Math.abs(delta)}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">from {fmt(before)}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      {/* Label */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</p>

      {/* Before / Arrow / After */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-0.5">Before</p>
          <p className="text-2xl font-extrabold text-slate-500">
            {fmt(before)}
            {unit === '/100' && <span className="text-sm font-normal">/100</span>}
          </p>
        </div>

        <div className={`text-2xl font-extrabold ${deltaColor} flex-shrink-0`}>{arrowIcon}</div>

        <div className="text-center">
          <p className="text-xs text-slate-400 mb-0.5">After</p>
          <p className="text-2xl font-extrabold text-slate-800">
            {fmt(after)}
            {unit === '/100' && <span className="text-sm font-normal">/100</span>}
          </p>
        </div>
      </div>

      {/* Delta badge */}
      <div className="mt-3 pt-3 border-t border-current/10">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${deltaColor}`}>
          {isUnchanged ? (
            <span className="text-slate-400">{deltaLabel}</span>
          ) : (
            <>
              <span>{arrowIcon}</span>
              <span>{deltaLabel}</span>
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                isImproved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {isImproved ? 'Improved' : 'Regressed'}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
