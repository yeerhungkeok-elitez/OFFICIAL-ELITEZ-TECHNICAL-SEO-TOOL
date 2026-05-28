'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  MatchedGSCRecord,
  IndexingDecisionType,
  DecisionPriority,
  GSCReasonCategory,
} from '@/types/seo';
import {
  DecisionBadge,
  PriorityBadge,
  ApprovalBadge,
  PRIORITY_BORDER,
} from './GSCDecisionCard';
import GSCUrlDetailPanel from './GSCUrlDetailPanel';

interface Props {
  records: MatchedGSCRecord[];
}

const PER_PAGE = 25;

type SortKey = 'url' | 'reason' | 'decision' | 'priority' | 'crawlStatus';
type SortDir  = 'asc' | 'desc';

const PRIORITY_ORDER: Record<DecisionPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ─── Category labels for the reason filter ───────────────────────────────────

const REASON_CATEGORY_LABELS: Partial<Record<GSCReasonCategory, string>> = {
  'indexed':                '✅ Already Indexed',
  'noindex-excluded':       '🔒 Noindex Tag',
  'crawled-not-indexed':    '📄 Crawled, Not Indexed',
  'discovered-not-indexed': '🔍 Discovered, Not Indexed',
  'duplicate-no-canonical': '🔗 Duplicate (No Canonical)',
  'canonical-alternate':    '📌 Canonical Alternate',
  'robots-blocked':         '🤖 Robots.txt Blocked',
  'not-found-404':          '❌ 404 Not Found',
  'server-error-5xx':       '🔥 Server Error (5xx)',
  'forbidden-403':          '🔐 403 Forbidden',
  'redirect':               '↗️ Redirect',
  'soft-404':               '⚠️ Soft 404',
  'other':                  '❓ Other',
};

export default function GSCActionTable({ records }: Props) {
  const [search,      setSearch]      = useState('');
  const [decFilter,   setDecFilter]   = useState<IndexingDecisionType | 'all'>('all');
  const [priFilter,   setPriFilter]   = useState<DecisionPriority | 'all'>('all');
  const [catFilter,   setCatFilter]   = useState<GSCReasonCategory | 'all'>('all');
  const [sortKey,     setSortKey]     = useState<SortKey>('priority');
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [page,        setPage]        = useState(1);

  // ── Unique filter options ─────────────────────────────────────────────
  const decisions = useMemo(() =>
    [...new Set(records.map(r => r.decision.decision))].sort(),
    [records],
  );

  const reasonCats = useMemo(() =>
    [...new Set(records.map(r => r.gsc.reasonCategory))],
    [records],
  );

  // ── Filtered + sorted records ─────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = records;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.gsc.url.toLowerCase().includes(q) ||
        r.gsc.reason.toLowerCase().includes(q) ||
        r.decision.decision.toLowerCase().includes(q),
      );
    }
    if (decFilter !== 'all') list = list.filter(r => r.decision.decision === decFilter);
    if (priFilter !== 'all') list = list.filter(r => r.decision.priority === priFilter);
    if (catFilter !== 'all') list = list.filter(r => r.gsc.reasonCategory === catFilter);

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'url':        return dir * a.gsc.url.localeCompare(b.gsc.url);
        case 'reason':     return dir * a.gsc.reason.localeCompare(b.gsc.reason);
        case 'decision':   return dir * a.decision.decision.localeCompare(b.decision.decision);
        case 'priority':   return dir * (PRIORITY_ORDER[a.decision.priority] - PRIORITY_ORDER[b.decision.priority]);
        case 'crawlStatus':return dir * a.crawlStatus.localeCompare(b.crawlStatus);
        default:           return 0;
      }
    });

    return list;
  }, [records, search, decFilter, priFilter, catFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }, [sortKey]);

  const resetFilters = () => {
    setSearch(''); setDecFilter('all'); setPriFilter('all');
    setCatFilter('all'); setPage(1);
  };

  const hasFilters = search || decFilter !== 'all' || priFilter !== 'all' || catFilter !== 'all';

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="card">
      {/* ── Header + filters ── */}
      <div className="card-header space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-800">
            All URLs
            <span className="ml-2 text-slate-400 font-normal text-sm">({filtered.length} of {records.length})</span>
          </h3>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search URLs, reasons, decisions…"
            className="input-base max-w-64 py-2 text-sm"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2">
          {/* Decision filter */}
          <select
            value={decFilter}
            onChange={e => { setDecFilter(e.target.value as IndexingDecisionType | 'all'); setPage(1); }}
            className="input-base py-1.5 text-xs max-w-52"
          >
            <option value="all">All Decisions</option>
            {decisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Priority filter */}
          <select
            value={priFilter}
            onChange={e => { setPriFilter(e.target.value as DecisionPriority | 'all'); setPage(1); }}
            className="input-base py-1.5 text-xs max-w-40"
          >
            <option value="all">All Priorities</option>
            {(['critical', 'high', 'medium', 'low'] as const).map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>

          {/* GSC category filter */}
          <select
            value={catFilter}
            onChange={e => { setCatFilter(e.target.value as GSCReasonCategory | 'all'); setPage(1); }}
            className="input-base py-1.5 text-xs max-w-52"
          >
            <option value="all">All GSC Statuses</option>
            {reasonCats.map(c => (
              <option key={c} value={c}>{REASON_CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2"
            >
              ✕ Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="pl-5">
                <button onClick={() => toggleSort('url')} className="flex items-center text-left">
                  URL <SortIcon col="url" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('reason')} className="flex items-center">
                  GSC Status <SortIcon col="reason" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('decision')} className="flex items-center">
                  Decision <SortIcon col="decision" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('priority')} className="flex items-center">
                  Priority <SortIcon col="priority" />
                </button>
              </th>
              <th className="pr-5">Approval</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <>
                <tr
                  key={r.gsc.url}
                  onClick={() => setExpandedUrl(e => e === r.gsc.url ? null : r.gsc.url)}
                  className={`cursor-pointer border-l-4 ${PRIORITY_BORDER[r.decision.priority]}`}
                >
                  <td className="pl-5 max-w-xs">
                    <div>
                      <a
                        href={r.gsc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={r.gsc.url}
                        className="text-blue-600 hover:text-blue-800 text-xs block truncate max-w-xs"
                      >
                        {(() => {
                          try {
                            const u = new URL(r.gsc.url);
                            return (u.pathname + u.search) || '/';
                          } catch { return r.gsc.url; }
                        })()}
                      </a>
                      {r.crawlStatus === 'not-crawled' && (
                        <span className="text-xs text-slate-400 italic">Not crawled by tool</span>
                      )}
                      {r.gsc.lastCrawled && (
                        <span className="text-xs text-slate-400">Last crawled: {r.gsc.lastCrawled}</span>
                      )}
                    </div>
                  </td>

                  <td className="text-xs text-slate-600 max-w-48">
                    <span
                      title={r.gsc.reason}
                      className="line-clamp-2 leading-snug"
                    >
                      {r.gsc.reason || <span className="text-slate-300">—</span>}
                    </span>
                  </td>

                  <td>
                    <DecisionBadge decision={r.decision.decision} />
                  </td>

                  <td>
                    <PriorityBadge priority={r.decision.priority} />
                  </td>

                  <td className="pr-5">
                    <div className="flex items-center gap-2">
                      <ApprovalBadge level={r.decision.approvalLevel} />
                      <span className={`text-slate-400 transition-transform duration-200 ml-auto ${expandedUrl === r.gsc.url ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedUrl === r.gsc.url && (
                  <tr key={`${r.gsc.url}-detail`} className="bg-slate-50">
                    <td colSpan={5} className="p-0">
                      <GSCUrlDetailPanel record={r} />
                    </td>
                  </tr>
                )}
              </>
            ))}

            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  No URLs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  page === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {n}
              </button>
            ))}
            {totalPages > 5 && page < totalPages - 2 && (
              <span className="py-1.5 px-1 text-slate-400 text-xs">…</span>
            )}
            {totalPages > 5 && (
              <button
                onClick={() => setPage(totalPages)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  page === totalPages ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
