'use client';

import { useState, useMemo, Fragment } from 'react';
import type { PageData } from '@/types/seo';

interface Props {
  pages: PageData[];
}

type SortKey = 'url' | 'statusCode' | 'wordCount' | 'h1Count' | 'internalLinksCount' | 'crawlTime';
type FilterKey = 'all' | 'indexable' | 'noindex' | 'errors' | 'redirects' | 'no-title' | 'no-h1' | 'no-schema';

function StatusBadge({ page }: { page: PageData }) {
  if (page.crawlError && page.statusCode === 0) {
    return <span className="badge badge-critical">Error</span>;
  }
  if (page.statusCode >= 500) return <span className="badge badge-critical">{page.statusCode}</span>;
  if (page.statusCode >= 400) return <span className="badge badge-high">{page.statusCode}</span>;
  if (page.statusCode >= 300) return <span className="badge badge-medium">{page.statusCode}</span>;
  return <span className="badge badge-good">{page.statusCode}</span>;
}

function TitleCell({ page }: { page: PageData }) {
  if (!page.title) return <span className="text-red-500 text-xs font-medium">✗ Missing</span>;
  const cls = page.titleLength > 60 ? 'text-orange-500' : page.titleLength < 20 ? 'text-yellow-600' : 'text-slate-700';
  return (
    <span className={`text-xs ${cls}`} title={page.title}>
      {page.title.slice(0, 50)}{page.title.length > 50 ? '…' : ''}
      <span className="ml-1 text-slate-400">({page.titleLength})</span>
    </span>
  );
}

function H1Cell({ page }: { page: PageData }) {
  if (page.h1Count === 0) return <span className="text-red-500 text-xs font-medium">✗ Missing</span>;
  if (page.h1Count > 1) return (
    <span className="text-orange-500 text-xs font-medium">
      ⚠ {page.h1Count}× — {page.h1Texts[0]?.slice(0, 30)}{(page.h1Texts[0]?.length ?? 0) > 30 ? '…' : ''}
    </span>
  );
  return (
    <span className="text-green-700 text-xs" title={page.h1Texts[0]}>
      ✓ {page.h1Texts[0]?.slice(0, 35)}{(page.h1Texts[0]?.length ?? 0) > 35 ? '…' : ''}
    </span>
  );
}

function CanonicalCell({ page }: { page: PageData }) {
  if (!page.canonical) return <span className="text-slate-400 text-xs">—</span>;
  if (!page.canonicalMatchesSelf) return (
    <span className="text-orange-500 text-xs font-medium" title={page.canonical}>
      ⚠ Other
    </span>
  );
  return <span className="text-green-600 text-xs font-medium">✓ Self</span>;
}

function SchemaCell({ page }: { page: PageData }) {
  if (!page.hasStructuredData) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className="text-green-600 text-xs font-medium" title={page.structuredDataTypes.join(', ')}>
      ✓ {page.structuredDataTypes.slice(0, 2).join(', ')}
    </span>
  );
}

export default function PageTable({ pages }: Props) {
  const [filter,  setFilter]  = useState<FilterKey>('all');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState<SortKey>('statusCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page,    setPage]    = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const PER_PAGE = 25;

  const filtered = useMemo(() => {
    let list = pages;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.url.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q));
    }
    switch (filter) {
      case 'indexable':  list = list.filter(p => p.statusCode === 200 && !p.isNoindex); break;
      case 'noindex':    list = list.filter(p => p.isNoindex); break;
      case 'errors':     list = list.filter(p => p.statusCode >= 400 || (p.crawlError && p.statusCode === 0)); break;
      case 'redirects':  list = list.filter(p => p.statusCode >= 300 && p.statusCode < 400); break;
      case 'no-title':   list = list.filter(p => !p.title && p.statusCode === 200); break;
      case 'no-h1':      list = list.filter(p => p.h1Count === 0 && p.statusCode === 200); break;
      case 'no-schema':  list = list.filter(p => !p.hasStructuredData && p.statusCode === 200); break;
    }
    return list.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : (Number(av) - Number(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [pages, filter, search, sort, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setSortDir('asc'); }
    setPage(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort !== col) return <span className="text-slate-300 ml-1">⇅</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filterButtons: { key: FilterKey; label: string }[] = [
    { key: 'all',       label: `All (${pages.length})` },
    { key: 'indexable', label: `Indexable (${pages.filter(p=>p.statusCode===200&&!p.isNoindex).length})` },
    { key: 'noindex',   label: `Noindex (${pages.filter(p=>p.isNoindex).length})` },
    { key: 'errors',    label: `Errors (${pages.filter(p=>p.statusCode>=400||(p.crawlError&&p.statusCode===0)).length})` },
    { key: 'no-title',  label: `No Title (${pages.filter(p=>!p.title&&p.statusCode===200).length})` },
    { key: 'no-h1',     label: `No H1 (${pages.filter(p=>p.h1Count===0&&p.statusCode===200).length})` },
    { key: 'no-schema', label: `No Schema (${pages.filter(p=>!p.hasStructuredData&&p.statusCode===200).length})` },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-slate-800">
            Crawled Pages
            <span className="ml-2 text-slate-400 font-normal text-sm">({pages.length} total)</span>
          </h2>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search URLs or titles…"
            className="input-base max-w-72 py-2 text-sm"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => { setFilter(btn.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === btn.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="pl-5">
                <button onClick={() => toggleSort('url')} className="flex items-center gap-1">
                  URL <SortIcon col="url" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('statusCode')} className="flex items-center gap-1">
                  Status <SortIcon col="statusCode" />
                </button>
              </th>
              <th>Title</th>
              <th>H1</th>
              <th>Canonical</th>
              <th>Noindex</th>
              <th>
                <button onClick={() => toggleSort('wordCount')} className="flex items-center gap-1">
                  Words <SortIcon col="wordCount" />
                </button>
              </th>
              <th>
                <button onClick={() => toggleSort('internalLinksCount')} className="flex items-center gap-1">
                  Int. Links <SortIcon col="internalLinksCount" />
                </button>
              </th>
              <th>Schema</th>
              <th>OG</th>
              <th className="pr-5">
                <button onClick={() => toggleSort('crawlTime')} className="flex items-center gap-1">
                  Time <SortIcon col="crawlTime" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p, i) => (
              <Fragment key={p.finalUrl || p.url || String(i)}>
                <tr
                  onClick={() => setExpanded(e => e === p.url ? null : p.url)}
                  className="cursor-pointer"
                >
                  <td className="pl-5 max-w-xs">
                    <a
                      href={p.finalUrl || p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 text-xs truncate block max-w-xs"
                      title={p.url}
                    >
                      {p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </a>
                    {p.crawlError && (
                      <p className="text-xs text-red-500 truncate max-w-xs" title={p.crawlError}>
                        ⚠ {p.crawlError}
                      </p>
                    )}
                  </td>
                  <td><StatusBadge page={p} /></td>
                  <td><TitleCell page={p} /></td>
                  <td><H1Cell page={p} /></td>
                  <td><CanonicalCell page={p} /></td>
                  <td>
                    {p.isNoindex
                      ? <span className="badge badge-critical">🚫 Yes</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="text-xs text-slate-500">{p.wordCount > 0 ? p.wordCount.toLocaleString() : '—'}</td>
                  <td className="text-xs text-slate-500">{p.internalLinksCount}</td>
                  <td><SchemaCell page={p} /></td>
                  <td>
                    {p.ogTitle
                      ? <span className="text-green-600 text-xs font-medium">✓</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="pr-5 text-xs text-slate-400">
                    {p.crawlTime > 0 ? `${(p.crawlTime / 1000).toFixed(1)}s` : '—'}
                  </td>
                </tr>
                {/* Expanded row */}
                {expanded === p.url && (
                  <tr className="bg-slate-50">
                    <td colSpan={11} className="px-5 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Meta Description</p>
                          <p className="text-slate-700">
                            {p.metaDescription
                              ? `"${p.metaDescription.slice(0, 120)}…" (${p.metaDescriptionLength} chars)`
                              : <span className="text-red-500">Missing</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Canonical</p>
                          <p className="text-slate-700 truncate">
                            {p.canonical ? (
                              <a href={p.canonical} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-600 hover:underline">{p.canonical}</a>
                            ) : <span className="text-red-500">Missing</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Images</p>
                          <p className="text-slate-700">
                            {p.imageCount} total · {p.missingAltCount > 0
                              ? <span className="text-red-500">{p.missingAltCount} missing alt</span>
                              : <span className="text-green-600">All have alt</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Open Graph</p>
                          <p className="text-slate-700">
                            {p.ogTitle ? `✓ Title: "${p.ogTitle?.slice(0,40)}"` : '✗ No og:title'}<br />
                            {p.ogImage ? '✓ og:image' : '✗ No og:image'}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">H1 Text{p.h1Texts.length > 1 ? 's' : ''}</p>
                          <p className="text-slate-700">
                            {p.h1Texts.length > 0 ? p.h1Texts.join(' | ') : <span className="text-red-500">None</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Robots Meta</p>
                          <p className="text-slate-700">
                            {p.robotsMeta ?? <span className="text-slate-400">Not set</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Schema Types</p>
                          <p className="text-slate-700">
                            {p.structuredDataTypes.length > 0 ? p.structuredDataTypes.join(', ') : <span className="text-slate-400">None</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 mb-1">Links</p>
                          <p className="text-slate-700">
                            {p.internalLinksCount} internal · {p.externalLinksCount} external
                          </p>
                        </div>
                      </div>
                      {p.finalUrl !== p.url && (
                        <p className="mt-2 text-xs text-slate-500">
                          Redirected → <a href={p.finalUrl} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline">{p.finalUrl}</a>
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-10 text-slate-400">
                  No pages match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
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
