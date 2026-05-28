'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ScanResult, CrawlProgressEvent, GSCDecisionSummary } from '@/types/seo';
import ScoreGauge from '@/components/ScoreGauge';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import SummaryCards from '@/components/SummaryCards';
import TopIssues from '@/components/TopIssues';
import PageTable from '@/components/PageTable';
import RobotsSitemapPanel from '@/components/RobotsSitemapPanel';
import ExportButton from '@/components/ExportButton';
import SchemaAuditPanel from '@/components/SchemaAuditPanel';
import SchemaGenerator from '@/components/SchemaGenerator';
import GSCImportPanel from '@/components/GSCImportPanel';
import FixQueuePanel from '@/components/FixQueuePanel';
import ReportBuilderPanel from '@/components/ReportBuilderPanel';
import HistoryPanel         from '@/components/HistoryPanel';
import WordPressHelperPanel  from '@/components/WordPressHelperPanel';
import { getScoreLabel }     from '@/lib/scoring';

type DashboardTab = 'overview' | 'schema-audit' | 'schema-generator' | 'gsc-import' | 'fix-queue' | 'report-builder' | 'history' | 'wordpress-helper';

// ─── Loading / Progress View ──────────────────────────────────────────────────
function CrawlProgress({
  crawled, queued, currentUrl, message,
}: {
  crawled: number; queued: number; currentUrl: string; message: string;
}) {
  const total   = crawled + queued;
  const pct     = total > 0 ? Math.round((crawled / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="card max-w-xl w-full p-8 text-center">
        <div className="text-5xl mb-6 animate-pulse">🕷️</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Crawling Website…</h2>
        <p className="text-slate-500 mb-8">
          Analysing SEO signals on every page. This may take 1–3 minutes.
        </p>

        {/* Progress bar */}
        <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, pct)}%` }}
          />
          {/* Animated shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
        </div>

        <div className="flex justify-between text-sm text-slate-500 mb-6">
          <span>{crawled} pages crawled</span>
          <span>{pct}%</span>
          <span>~{queued} queued</span>
        </div>

        {currentUrl && (
          <div className="bg-slate-50 rounded-lg px-4 py-2 text-xs text-slate-500 font-mono truncate">
            ↳ {currentUrl}
          </div>
        )}

        {message && (
          <p className="mt-3 text-xs text-slate-400">{message}</p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-slate-400">
          <span>✓ Checking titles & descriptions</span>
          <span>✓ Detecting noindex / canonicals</span>
          <span>✓ Analysing structured data</span>
          <span>✓ Counting internal links</span>
        </div>
      </div>
    </div>
  );
}

// ─── Error View ───────────────────────────────────────────────────────────────
function ErrorView({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">Crawl Failed</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
        <div className="space-y-3">
          <button onClick={onRetry} className="btn-primary w-full">
            ⟳ Try Again
          </button>
          <a href="/" className="btn-secondary w-full block">
            ← Back to Home
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Common causes: site is down, blocks crawlers, or took too long to respond.
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ result }: { result: ScanResult }) {
  const { label: scoreLabel, color: scoreColor } = getScoreLabel(result.score.overall);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [gscData,   setGscData]   = useState<GSCDecisionSummary | null>(null);

  const tabs: { key: DashboardTab; label: string; icon: string; disabled?: boolean }[] = [
    { key: 'overview',          icon: '🩺', label: 'SEO Overview' },
    { key: 'schema-audit',      icon: '📋', label: result.schemaAudit
        ? `Schema Audit${result.schemaAudit.score.overall > 0 ? ` (${result.schemaAudit.score.overall})` : ''}`
        : 'Schema Audit',
      disabled: !result.schemaAudit },
    { key: 'schema-generator',  icon: '🤖', label: 'Schema Generator' },
    { key: 'gsc-import',        icon: '📊', label: 'GSC Import' },
    { key: 'fix-queue',         icon: '🔧', label: 'Fix Queue' },
    { key: 'report-builder',   icon: '📋', label: 'Report Builder' },
    { key: 'history',           icon: '🕰️', label: 'History' },
    { key: 'wordpress-helper', icon: '🟣', label: 'WordPress Helper' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="text-xl">🩺</span>
              <span className="ml-2 font-bold text-slate-700 hidden sm:inline">SEO Doctor</span>
            </a>
            <span className="text-slate-200">|</span>
            <div>
              <p className="font-bold text-slate-900 text-sm">{result.domain}</p>
              <p className="text-xs text-slate-400">
                {result.summary.totalPages} pages · {result.crawlDuration}s ·{' '}
                {new Date(result.crawledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Health Score</p>
              <p className="font-extrabold text-lg" style={{ color: scoreColor }}>
                {result.score.overall}/100 — {scoreLabel}
              </p>
            </div>
            <ExportButton result={result} />
          </div>
        </div>

        {/* ── Tab navigation strip ── */}
        <div className="max-w-7xl mx-auto px-6 pb-0 flex gap-0 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              disabled={tab.disabled}
              className={`
                flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                  : tab.disabled
                    ? 'border-transparent text-slate-300 cursor-not-allowed'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'schema-audit' && !result.schemaAudit && (
                <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded ml-1">
                  Re-scan needed
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Overview tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* Hero: Score + Summary */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Gauge */}
              <div className="card p-6 flex flex-col items-center justify-center">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  SEO Health Score
                </p>
                <ScoreGauge score={result.score.overall} size={240} />

                {/* Quick severity summary */}
                <div className="flex gap-4 mt-4 text-center">
                  {result.summary.criticalIssues > 0 && (
                    <div>
                      <p className="text-xl font-extrabold text-red-600">{result.summary.criticalIssues}</p>
                      <p className="text-xs text-slate-500">Critical</p>
                    </div>
                  )}
                  {result.summary.highIssues > 0 && (
                    <div>
                      <p className="text-xl font-extrabold text-orange-500">{result.summary.highIssues}</p>
                      <p className="text-xs text-slate-500">High</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xl font-extrabold text-yellow-500">{result.summary.mediumIssues}</p>
                    <p className="text-xs text-slate-500">Medium</p>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-blue-400">{result.summary.lowIssues}</p>
                    <p className="text-xs text-slate-500">Low</p>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="lg:col-span-2">
                <ScoreBreakdown score={result.score} />
              </div>
            </section>

            {/* Summary Cards */}
            <section>
              <SummaryCards summary={result.summary} crawlDuration={result.crawlDuration} />
            </section>

            {/* Robots & Sitemap */}
            <section>
              <h2 className="text-lg font-bold text-slate-800 mb-4">🤖 Crawl Infrastructure</h2>
              <RobotsSitemapPanel robots={result.robots} sitemap={result.sitemap} />
            </section>

            {/* Issues */}
            <section>
              <TopIssues issues={result.issues} />
            </section>

            {/* Page Table */}
            <section>
              <PageTable pages={result.pages} />
            </section>

            {/* Schema teaser — prompt to view Schema tab if audit exists */}
            {result.schemaAudit && (
              <section className="card p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">📋 Schema Markup Audit Available</h3>
                    <p className="text-sm text-slate-600">
                      Schema Health Score:{' '}
                      <strong className="text-purple-700">{result.schemaAudit.score.overall}/100</strong>
                      {' · '}
                      {result.schemaAudit.issues.length} issue{result.schemaAudit.issues.length !== 1 ? 's' : ''} detected
                      {' · '}
                      {result.schemaAudit.summary.uniqueSchemaTypes} unique schema type{result.schemaAudit.summary.uniqueSchemaTypes !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('schema-audit')}
                    className="btn-primary text-sm"
                  >
                    View Schema Audit →
                  </button>
                </div>
              </section>
            )}

            {/* Fix Queue + Report Builder teasers */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                <h3 className="font-bold text-slate-900 mb-1">🔧 Fix Queue</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Prioritised fixes with WordPress instructions, developer code snippets, and AI prompts.
                </p>
                <button onClick={() => setActiveTab('fix-queue')} className="btn-primary text-sm">
                  Open Fix Queue →
                </button>
              </div>
              <div className="card p-6 bg-gradient-to-r from-slate-800 to-slate-900">
                <h3 className="font-bold text-white mb-1">📋 Report Builder</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Export a branded PDF client report, developer fix plan, or full technical audit with roadmap.
                </p>
                <button
                  onClick={() => setActiveTab('report-builder')}
                  className="px-4 py-2 bg-white text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Build Report →
                </button>
              </div>
            </section>

            {/* WordPress Helper teaser */}
            <section className="card p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold mb-1">🟣 WordPress Helper Mode</h3>
                  <p className="text-sm text-blue-100">
                    Automatic CMS &amp; plugin detection. Get plugin-specific step-by-step instructions
                    for Yoast SEO, Rank Math, WooCommerce, and more — with risk guardrails built in.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('wordpress-helper')}
                  className="px-4 py-2 bg-white text-blue-700 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                  Open WordPress Helper →
                </button>
              </div>
            </section>

            {/* Footer */}
            <div className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
              <p>🩺 Elitez Technical SEO Doctor v4.0 · {result.domain} · {new Date(result.crawledAt).toLocaleString()}</p>
              <p className="mt-1">Scan ID: {result.id}</p>
            </div>
          </div>
        )}

        {/* ── Schema Audit tab ── */}
        {activeTab === 'schema-audit' && result.schemaAudit && (
          <SchemaAuditPanel
            audit={result.schemaAudit}
            totalPages={result.summary.totalPages}
            onOpenGenerator={() => setActiveTab('schema-generator')}
          />
        )}

        {/* ── Schema Generator tab ── */}
        {activeTab === 'schema-generator' && (
          <SchemaGenerator
            initialDomain={result.domain}
            initialUrl={result.startUrl}
          />
        )}

        {/* ── GSC Import tab ── */}
        {activeTab === 'gsc-import' && (
          <GSCImportPanel
            pages={result.pages}
            schemaAudit={result.schemaAudit}
            onGSCLoaded={setGscData}
          />
        )}

        {/* ── Fix Queue tab ── */}
        {activeTab === 'fix-queue' && (
          <FixQueuePanel
            result={result}
            schemaAudit={result.schemaAudit}
            gscData={gscData}
          />
        )}

        {/* ── Report Builder tab ── */}
        {activeTab === 'report-builder' && (
          <ReportBuilderPanel
            result={result}
            schemaAudit={result.schemaAudit}
            gscData={gscData}
          />
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <HistoryPanel
            result={result}
            schemaAudit={result.schemaAudit}
            gscData={gscData}
          />
        )}

        {/* ── WordPress Helper tab ── */}
        {activeTab === 'wordpress-helper' && (
          <WordPressHelperPanel
            result={result}
            schemaAudit={result.schemaAudit}
            gscData={gscData}
          />
        )}

      </div>
    </div>
  );
}

// ─── Main Results Page ────────────────────────────────────────────────────────
function ResultsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const urlParam = searchParams.get('url');
  const idParam  = searchParams.get('id');

  const [state,      setState]      = useState<'idle' | 'crawling' | 'done' | 'error'>('idle');
  const [result,     setResult]     = useState<ScanResult | null>(null);
  const [error,      setError]      = useState('');
  const [progress,   setProgress]   = useState({ crawled: 0, queued: 0, currentUrl: '', message: '' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Load existing scan by ID
    if (idParam) {
      try {
        const saved = localStorage.getItem(`seo-scan-${idParam}`);
        if (saved) {
          setResult(JSON.parse(saved));
          setState('done');
          return;
        }
      } catch { /* fall through to fresh crawl */ }
    }

    // Start fresh crawl from URL
    if (urlParam) {
      startCrawl(urlParam);
    } else {
      router.replace('/');
    }

    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlParam, idParam]);

  async function startCrawl(url: string) {
    setError('');
    setState('crawling');
    setProgress({ crawled: 0, queued: 0, currentUrl: url, message: 'Initialising crawl…' });

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages: 50 }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';  // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: CrawlProgressEvent = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setProgress({
                crawled:    event.crawled,
                queued:     event.queued,
                currentUrl: event.currentUrl ?? '',
                message:    event.message ?? '',
              });

            } else if (event.type === 'complete' && event.result) {
              const scanResult = event.result;
              setResult(scanResult);
              setState('done');

              // Persist to localStorage
              try {
                localStorage.setItem(`seo-scan-${scanResult.id}`, JSON.stringify(scanResult));

                const history: object[] = JSON.parse(localStorage.getItem('seo-scan-history') ?? '[]');
                history.unshift({
                  id:         scanResult.id,
                  domain:     scanResult.domain,
                  crawledAt:  scanResult.crawledAt,
                  score:      scanResult.score.overall,
                  totalPages: scanResult.summary.totalPages,
                });
                localStorage.setItem('seo-scan-history', JSON.stringify(history.slice(0, 10)));
              } catch { /* storage may be full */ }

            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Crawl failed');
            }
          } catch (parseErr) {
            if ((parseErr as Error).message !== 'Unexpected end of JSON input') {
              console.warn('Parse error:', parseErr);
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || 'An unexpected error occurred';
      setError(msg);
      setState('error');
    }
  }

  if (state === 'idle' || state === 'crawling') {
    return (
      <CrawlProgress
        crawled={progress.crawled}
        queued={progress.queued}
        currentUrl={progress.currentUrl}
        message={progress.message}
      />
    );
  }

  if (state === 'error') {
    return (
      <ErrorView
        error={error}
        onRetry={() => {
          if (urlParam) startCrawl(urlParam);
          else router.push('/');
        }}
      />
    );
  }

  if (result) {
    return <Dashboard result={result} />;
  }

  return null;
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-lg animate-pulse">Loading…</div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
