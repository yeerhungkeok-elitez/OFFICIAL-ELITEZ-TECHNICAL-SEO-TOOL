'use client';

import type { MatchedGSCRecord } from '@/types/seo';
import GSCDecisionCard, { PriorityBadge, DecisionBadge, ApprovalBadge } from './GSCDecisionCard';

interface Props {
  record: MatchedGSCRecord;
}

function Field({ label, value, mono }: { label: string; value: string | number | boolean | undefined | null; mono?: boolean }) {
  const display = value === null || value === undefined || value === ''
    ? <span className="text-slate-300">—</span>
    : typeof value === 'boolean'
      ? <span className={value ? 'text-red-600 font-semibold' : 'text-green-600'}>{value ? 'Yes' : 'No'}</span>
      : <span className={mono ? 'font-mono text-xs' : ''}>{String(value)}</span>;

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-700">{display}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3">
      {children}
    </p>
  );
}

export default function GSCUrlDetailPanel({ record }: Props) {
  const { gsc, crawledPage, crawlStatus, decision } = record;

  // Additional raw columns (excluding known mapped ones)
  const knownCols = new Set(['URL', 'Page', 'Pages', 'Reason', 'Status', 'Validation', 'Last crawled',
    'Last Crawled', 'Source', 'Indexing status', 'Coverage status']);
  const extraCols = Object.entries(gsc.rawRow).filter(([k]) => !knownCols.has(k));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">

      {/* ── Left: GSC data + crawl data ── */}
      <div className="space-y-5">

        {/* GSC data */}
        <div>
          <SectionHeading>📊 Google Search Console Data</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <Field label="GSC Status"        value={gsc.reason || 'Unknown'} />
            <Field label="Last Crawled"       value={gsc.lastCrawled || 'Not available'} />
            <Field label="Validation Status"  value={gsc.validationStatus || 'N/A'} />
            <Field label="Discovery Source"   value={gsc.source || 'N/A'} />
          </div>
          {/* Extra columns from the file */}
          {extraCols.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {extraCols.map(([k, v]) => (
                <Field key={k} label={k} value={v} />
              ))}
            </div>
          )}
        </div>

        {/* Crawl data */}
        <div>
          <SectionHeading>🕷️ Crawl Data (from your scan)</SectionHeading>
          {crawlStatus === 'not-crawled' ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">
                This URL was not found in the crawl results.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                This may be because it was not crawled within the 50-page limit, or it requires authentication.
              </p>
            </div>
          ) : crawledPage ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="HTTP Status"       value={crawledPage.statusCode} />
                <Field label="Word Count"         value={`${crawledPage.wordCount} words`} />
                <Field label="Page Intent"        value={crawledPage.pageIntent} />
                <Field label="Internal Links"     value={crawledPage.internalLinksCount} />
                <Field label="Has H1"             value={crawledPage.hasH1} />
                <Field label="Noindex Tag"        value={crawledPage.noindex} />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2">
                  {crawledPage.title || <span className="text-red-500 italic">Missing!</span>}
                  {crawledPage.titleLength > 0 && (
                    <span className={`ml-2 text-xs ${crawledPage.titleLength < 30 || crawledPage.titleLength > 65
                      ? 'text-orange-500' : 'text-green-600'}`}>
                      ({crawledPage.titleLength} chars)
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Meta Description</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2">
                  {crawledPage.metaDescription || <span className="text-red-500 italic">Missing!</span>}
                  {crawledPage.metaDescLength > 0 && (
                    <span className={`ml-2 text-xs ${crawledPage.metaDescLength < 70 || crawledPage.metaDescLength > 160
                      ? 'text-orange-500' : 'text-green-600'}`}>
                      ({crawledPage.metaDescLength} chars)
                    </span>
                  )}
                </p>
              </div>

              {crawledPage.canonical && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Canonical Tag</p>
                  <p className={`text-xs font-mono bg-slate-50 rounded-lg p-2 break-all ${
                    !crawledPage.canonicalMatchesSelf ? 'text-orange-600 border border-orange-200' : 'text-slate-700'
                  }`}>
                    {crawledPage.canonical}
                    {!crawledPage.canonicalMatchesSelf && (
                      <span className="ml-2 text-orange-600 font-sans font-semibold not-italic">⚠️ Points elsewhere</span>
                    )}
                  </p>
                </div>
              )}

              {crawledPage.schemaTypes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Schema Types</p>
                  <div className="flex flex-wrap gap-1">
                    {crawledPage.schemaTypes.map(t => (
                      <span key={t} className="badge badge-neutral text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {crawledPage.technicalIssues.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Technical Issues Detected</p>
                  <div className="space-y-1">
                    {crawledPage.technicalIssues.map((issue, i) => (
                      <p key={i} className="text-xs text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded">
                        ⚠️ {issue}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Right: Decision ── */}
      <div>
        <SectionHeading>🎯 Indexing Decision</SectionHeading>
        <GSCDecisionCard decision={decision} defaultExpanded />
      </div>
    </div>
  );
}
