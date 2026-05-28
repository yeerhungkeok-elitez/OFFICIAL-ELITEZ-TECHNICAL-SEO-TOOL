'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Snapshot Comparison View (V6)
// Renders metric grids, issue tables, and progress narrative for two snapshots.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { SnapshotComparisonResult } from '@/types/seo';
import { generateProgressSummary } from '@/lib/progressSummary';
import MetricChangeCard     from './MetricChangeCard';
import ProgressSummaryCard  from './ProgressSummaryCard';
import ResolvedIssuesTable  from './ResolvedIssuesTable';
import NewIssuesTable       from './NewIssuesTable';

interface Props {
  comparison: SnapshotComparisonResult;
}

type CompTab = 'overview' | 'resolved' | 'new' | 'persistent' | 'narrative';

export default function SnapshotComparison({ comparison }: Props) {
  const [activeTab, setActiveTab] = useState<CompTab>('overview');

  const { beforeSnapshot, afterSnapshot, metrics, resolvedIssues, newIssues, persistentIssues,
    resolvedCount, newCount, persistentCount, scoreImprovement } = comparison;

  const progressSummary = generateProgressSummary(comparison);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const scoreDeltaColor = scoreImprovement > 0
    ? 'text-emerald-600'
    : scoreImprovement < 0
    ? 'text-red-600'
    : 'text-slate-500';

  const tabs: { key: CompTab; label: string; count?: number }[] = [
    { key: 'overview',   label: '📊 Metrics' },
    { key: 'resolved',   label: '✅ Resolved',   count: resolvedCount },
    { key: 'new',        label: '⚠️ New Issues',  count: newCount },
    { key: 'persistent', label: '🔄 Persistent', count: persistentCount },
    { key: 'narrative',  label: '📝 Summary' },
  ];

  return (
    <div className="space-y-4">

      {/* ── Comparison header ── */}
      <div className="card p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <h3 className="text-base font-bold mb-1">⚖️ Audit Comparison</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">Before</p>
                <p className="font-semibold">{beforeSnapshot.name}</p>
                <p className="text-xs text-slate-400">{fmtDate(beforeSnapshot.crawledAt)}</p>
              </div>
              <span className="text-slate-400 text-xl font-bold">→</span>
              <div className="bg-white/10 px-3 py-1.5 rounded-lg">
                <p className="text-xs text-slate-400 mb-0.5">After</p>
                <p className="font-semibold">{afterSnapshot.name}</p>
                <p className="text-xs text-slate-400">{fmtDate(afterSnapshot.crawledAt)}</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Score Change</p>
            <p className={`text-3xl font-extrabold ${scoreDeltaColor}`}>
              {scoreImprovement > 0 ? '+' : ''}{scoreImprovement}
            </p>
            <p className="text-xs text-slate-400">pts</p>
          </div>
        </div>

        {/* Quick badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="bg-emerald-600/30 text-emerald-200 text-xs px-2.5 py-1 rounded-full font-medium">
            ✅ {resolvedCount} resolved
          </span>
          <span className="bg-amber-600/30 text-amber-200 text-xs px-2.5 py-1 rounded-full font-medium">
            ⚠️ {newCount} new
          </span>
          <span className="bg-orange-600/30 text-orange-200 text-xs px-2.5 py-1 rounded-full font-medium">
            🔄 {persistentCount} persistent
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="card p-1 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === t.key ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Metrics overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {metrics.map(m => (
            <MetricChangeCard key={m.label} metric={m} compact />
          ))}
        </div>
      )}

      {/* ── Resolved issues ── */}
      {activeTab === 'resolved' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700">
              ✅ {resolvedCount} Resolved Issue{resolvedCount !== 1 ? 's' : ''}
            </h4>
            <p className="text-xs text-slate-400">Present in "before", absent in "after"</p>
          </div>
          <ResolvedIssuesTable issues={resolvedIssues} />
        </div>
      )}

      {/* ── New issues ── */}
      {activeTab === 'new' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700">
              ⚠️ {newCount} New Issue{newCount !== 1 ? 's' : ''}
            </h4>
            <p className="text-xs text-slate-400">Absent in "before", present in "after"</p>
          </div>
          <NewIssuesTable issues={newIssues} />
        </div>
      )}

      {/* ── Persistent issues ── */}
      {activeTab === 'persistent' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700">
              🔄 {persistentCount} Persistent Issue{persistentCount !== 1 ? 's' : ''}
            </h4>
            <p className="text-xs text-slate-400">Present in both "before" and "after"</p>
          </div>
          {persistentIssues.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              No persistent issues — all previous issues have been addressed! 🎉
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-orange-200">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 text-orange-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Issue</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">Pages</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-orange-100">
                  {[...persistentIssues]
                    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 4) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 4))
                    .map(fp => (
                    <tr key={fp.key} className="hover:bg-orange-50/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          fp.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          fp.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                          fp.severity === 'medium'   ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {fp.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {fp.source === 'seo' ? 'SEO' : fp.source === 'schema' ? 'Schema' : 'Fix Queue'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium max-w-sm">
                        <span className="line-clamp-2">{fp.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{fp.category}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600 font-medium text-xs">{fp.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Narrative summary ── */}
      {activeTab === 'narrative' && (
        <ProgressSummaryCard summary={progressSummary} />
      )}
    </div>
  );
}
