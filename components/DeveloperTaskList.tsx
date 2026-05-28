'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Developer Task List Component (V5)
// Filterable, sortable table of developer tasks derived from the fix queue.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { DeveloperTask, IssueSeverity, FixApprovalLevel } from '@/types/seo';

const PRIORITY_BADGE: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-blue-100 text-blue-700 border-blue-200',
};
const APPROVAL_BADGE: Record<FixApprovalLevel, string> = {
  'safe':            'text-green-700',
  'needs-review':    'text-yellow-700',
  'needs-developer': 'text-red-700',
};
const PRI_ORDER: Record<IssueSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

interface Props {
  tasks:     DeveloperTask[];
  compact?:  boolean;
  maxRows?:  number;
}

export default function DeveloperTaskList({ tasks, compact = false, maxRows }: Props) {
  const [search,    setSearch]    = useState('');
  const [filterPri, setFilterPri] = useState<IssueSeverity | 'all'>('all');
  const [filterApp, setFilterApp] = useState<FixApprovalLevel | 'all'>('all');
  const [expanded,  setExpanded]  = useState<Set<number>>(new Set());
  const [showAll,   setShowAll]   = useState(false);

  const filtered = useMemo(() => {
    let t = tasks;
    if (filterPri !== 'all')   t = t.filter(x => x.priority === filterPri);
    if (filterApp !== 'all')   t = t.filter(x => x.approvalLevel === filterApp);
    if (search.trim()) {
      const q = search.toLowerCase();
      t = t.filter(x =>
        x.url.toLowerCase().includes(q) ||
        x.issue.toLowerCase().includes(q) ||
        x.owner.toLowerCase().includes(q),
      );
    }
    return t;
  }, [tasks, filterPri, filterApp, search]);

  const display = maxRows && !showAll ? filtered.slice(0, maxRows) : filtered;

  function toggleExpand(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (compact) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2 font-semibold text-slate-600 w-20">Priority</th>
              <th className="text-left p-2 font-semibold text-slate-600">Issue</th>
              <th className="text-left p-2 font-semibold text-slate-600 hidden md:table-cell">URL</th>
              <th className="text-left p-2 font-semibold text-slate-600 w-24">Owner</th>
              <th className="text-left p-2 font-semibold text-slate-600 w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {display.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-2">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[t.priority]}`}>
                    {t.priority.slice(0,4).toUpperCase()}
                  </span>
                </td>
                <td className="p-2 text-slate-700 max-w-[200px] truncate">{t.issue}</td>
                <td className="p-2 text-slate-400 font-mono max-w-[160px] truncate hidden md:table-cell">
                  {t.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                </td>
                <td className="p-2 text-slate-600">{t.owner}</td>
                <td className="p-2">
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⬜ Pending</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {maxRows && !showAll && filtered.length > maxRows && (
          <div className="p-3 text-center border-t border-slate-200">
            <button onClick={() => setShowAll(true)} className="text-xs text-blue-600 hover:underline">
              Show all {filtered.length} tasks
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search URL or issue…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <select
          value={filterPri}
          onChange={e => setFilterPri(e.target.value as IssueSeverity | 'all')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">All priorities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🔵 Low</option>
        </select>
        <select
          value={filterApp}
          onChange={e => setFilterApp(e.target.value as FixApprovalLevel | 'all')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="all">All approvals</option>
          <option value="safe">✅ Safe</option>
          <option value="needs-review">👁 Needs review</option>
          <option value="needs-developer">🛠 Needs developer</option>
        </select>
        <p className="text-xs text-slate-400 ml-auto">
          {filtered.length} of {tasks.length} tasks
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">#</th>
              <th className="text-left p-3 font-semibold text-slate-600">Priority</th>
              <th className="text-left p-3 font-semibold text-slate-600">Issue</th>
              <th className="text-left p-3 font-semibold text-slate-600 hidden lg:table-cell">URL</th>
              <th className="text-left p-3 font-semibold text-slate-600">Approval</th>
              <th className="text-left p-3 font-semibold text-slate-600">Owner</th>
              <th className="text-left p-3 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {display.map((t, i) => (
              <>
                <tr
                  key={`row-${i}`}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleExpand(i)}
                >
                  <td className="p-3 text-slate-400">{i + 1}</td>
                  <td className="p-3">
                    <span className={`font-bold px-2 py-0.5 rounded border text-xs ${PRIORITY_BADGE[t.priority]}`}>
                      {t.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-800 font-medium max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{t.issue}</span>
                      <span className="text-slate-300 flex-shrink-0">{expanded.has(i) ? '▲' : '▼'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 font-mono max-w-[180px] truncate hidden lg:table-cell">
                    {t.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </td>
                  <td className={`p-3 font-semibold ${APPROVAL_BADGE[t.approvalLevel]}`}>
                    {t.approvalLevel === 'safe' ? '✅ Safe' :
                     t.approvalLevel === 'needs-review' ? '👁 Review' : '🛠 Dev'}
                  </td>
                  <td className="p-3 text-slate-600">{t.owner}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs">⬜ Pending</span>
                  </td>
                </tr>
                {expanded.has(i) && (
                  <tr key={`detail-${i}`}>
                    <td colSpan={7} className="px-3 pb-3 bg-slate-50/60">
                      <div className="ml-8 space-y-2 border-l-2 border-slate-200 pl-3">
                        <div>
                          <span className="text-xs font-semibold text-slate-500">Recommended Fix: </span>
                          <span className="text-xs text-slate-700">{t.recommendedFix}</span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500">Developer Instruction:</span>
                          <pre className="text-xs bg-slate-100 rounded p-2 mt-1 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-32">
                            {t.developerInstruction}
                          </pre>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500">Full URL: </span>
                          <span className="text-xs font-mono text-slate-500 break-all">{t.url}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-6">No tasks match the current filters.</p>
      )}
    </div>
  );
}
