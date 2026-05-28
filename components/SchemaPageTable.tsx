'use client';

import { useState, useMemo } from 'react';
import type { PageSchemaInfo } from '@/types/seo';
import SchemaPreview from './SchemaPreview';

interface Props {
  pageSchemas: PageSchemaInfo[];
}

type FilterKey = 'all' | 'has-schema' | 'no-schema' | 'invalid' | 'missing-recommended' | 'duplicates';

const INTENT_LABELS: Record<string, string> = {
  homepage: '🏠 Homepage',
  blog:     '📰 Blog/Article',
  service:  '⚙️ Service',
  faq:      '❓ FAQ',
  contact:  '📍 Contact',
  product:  '📦 Product',
  other:    '📄 Other',
};

function TypeBadges({ types }: { types: string[] }) {
  if (types.length === 0) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.slice(0, 4).map(t => (
        <span key={t} className="badge badge-neutral text-xs">{t}</span>
      ))}
      {types.length > 4 && (
        <span className="text-slate-400 text-xs">+{types.length - 4}</span>
      )}
    </div>
  );
}

function MissingBadges({ missing }: { missing: string[] }) {
  if (missing.length === 0) return <span className="text-green-600 text-xs font-medium">✓ Complete</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {missing.map(t => (
        <span key={t} className="inline-flex items-center gap-0.5 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded">
          ✗ {t}
        </span>
      ))}
    </div>
  );
}

export default function SchemaPageTable({ pageSchemas }: Props) {
  const [filter,    setFilter]   = useState<FilterKey>('all');
  const [search,    setSearch]   = useState('');
  const [expanded,  setExpanded] = useState<string | null>(null);
  const [page,      setPage]     = useState(1);

  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    let list = pageSchemas;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.url.toLowerCase().includes(q) || p.allTypes.join(' ').toLowerCase().includes(q));
    }
    switch (filter) {
      case 'has-schema':          list = list.filter(p => p.hasSchema); break;
      case 'no-schema':           list = list.filter(p => !p.hasSchema); break;
      case 'invalid':             list = list.filter(p => p.invalidCount > 0); break;
      case 'missing-recommended': list = list.filter(p => p.missingRecommended.length > 0); break;
      case 'duplicates':          list = list.filter(p => p.duplicateTypes.length > 0); break;
    }
    return list;
  }, [pageSchemas, filter, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = {
    all:                  pageSchemas.length,
    'has-schema':         pageSchemas.filter(p => p.hasSchema).length,
    'no-schema':          pageSchemas.filter(p => !p.hasSchema).length,
    invalid:              pageSchemas.filter(p => p.invalidCount > 0).length,
    'missing-recommended':pageSchemas.filter(p => p.missingRecommended.length > 0).length,
    duplicates:           pageSchemas.filter(p => p.duplicateTypes.length > 0).length,
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all',                   label: `All (${counts.all})` },
    { key: 'has-schema',            label: `Has Schema (${counts['has-schema']})` },
    { key: 'no-schema',             label: `No Schema (${counts['no-schema']})` },
    { key: 'invalid',               label: `Invalid JSON (${counts.invalid})` },
    { key: 'missing-recommended',   label: `Missing Types (${counts['missing-recommended']})` },
    { key: 'duplicates',            label: `Duplicates (${counts.duplicates})` },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-slate-800">
            Page Schema Status
            <span className="ml-2 text-slate-400 font-normal text-sm">({pageSchemas.length} pages)</span>
          </h3>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search URLs or types…"
            className="input-base max-w-64 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th className="pl-5">Page</th>
              <th>Intent</th>
              <th>Schema Types Found</th>
              <th>Issues</th>
              <th className="pr-5">Missing Recommended</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(ps => (
              <>
                <tr
                  key={ps.url}
                  onClick={() => setExpanded(e => e === ps.url ? null : ps.url)}
                  className="cursor-pointer"
                >
                  <td className="pl-5 max-w-xs">
                    <a href={ps.url} target="_blank" rel="noopener noreferrer"
                       onClick={e => e.stopPropagation()}
                       className="text-blue-600 hover:text-blue-800 text-xs truncate block max-w-xs"
                       title={ps.url}>
                      {ps.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </a>
                  </td>
                  <td className="text-xs text-slate-500">
                    {INTENT_LABELS[ps.pageIntent] ?? ps.pageIntent}
                  </td>
                  <td>
                    <TypeBadges types={ps.allTypes} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {ps.invalidCount > 0 && (
                        <span className="badge badge-critical">{ps.invalidCount} Invalid</span>
                      )}
                      {ps.duplicateTypes.length > 0 && (
                        <span className="badge badge-medium">Dup: {ps.duplicateTypes.join(', ')}</span>
                      )}
                      {ps.invalidCount === 0 && ps.duplicateTypes.length === 0 && (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="pr-5">
                    <MissingBadges missing={ps.missingRecommended} />
                  </td>
                </tr>
                {/* Expanded row: show schema blocks */}
                {expanded === ps.url && ps.blocks.length > 0 && (
                  <tr key={`${ps.url}-detail`} className="bg-slate-50">
                    <td colSpan={5} className="px-5 py-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        JSON-LD Blocks on this page ({ps.blocks.length})
                      </p>
                      <div className="space-y-2">
                        {ps.blocks.map((block, i) => (
                          <SchemaPreview
                            key={i}
                            raw={block.raw}
                            isValid={block.isValid}
                            types={block.types}
                            parseError={block.parseError}
                            label={`Block ${i + 1}${block.isGraph ? ' (@graph)' : ''}`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                {expanded === ps.url && ps.blocks.length === 0 && (
                  <tr key={`${ps.url}-no-schema`} className="bg-slate-50">
                    <td colSpan={5} className="px-5 py-3">
                      <p className="text-xs text-slate-400 italic">No JSON-LD blocks found on this page.</p>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  No pages match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        page === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
