'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Public Audit Page (V8)
// Lead magnet: visitor scans their site → sees teaser → submits form → unlocks.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, FormEvent } from 'react';
import Link from 'next/link';
import type { ScanResult, CrawlProgressEvent, PublicAuditResult, PublicAuditLead } from '@/types/seo';
import { buildPublicAuditResult }        from '@/lib/publicAuditRunner';
import PublicAuditResults                from '@/components/PublicAuditResults';
import LeadCaptureForm                   from '@/components/LeadCaptureForm';
import PublicCTA                         from '@/components/PublicCTA';
import {
  downloadPublicMarkdownReport,
  downloadPublicPDFReport,
}                                        from '@/lib/publicReportGenerator';

// ─── Page state ───────────────────────────────────────────────────────────────

type PageState = 'idle' | 'crawling' | 'teaser' | 'unlocked' | 'error';

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressView({
  crawled, message, currentUrl,
}: {
  crawled: number; message: string; currentUrl: string;
}) {
  const pct = Math.min(95, crawled * 10);  // 10 pages max → 100%
  return (
    <div className="card max-w-xl mx-auto p-8 text-center">
      <div className="text-5xl mb-5 animate-pulse">🕷️</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Scanning Your Website…</h2>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        We&apos;re analysing your pages for technical SEO issues. This takes 20–60 seconds.
      </p>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(5, pct)}%` }}
        />
      </div>
      <p className="text-sm font-semibold text-slate-700">{crawled} pages scanned</p>
      {currentUrl && (
        <p className="text-xs text-slate-400 mt-2 font-mono truncate max-w-sm mx-auto">
          ↳ {currentUrl}
        </p>
      )}
      {message && <p className="text-xs text-slate-400 mt-1">{message}</p>}
    </div>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────

function Hero({
  url, setUrl, onScan, isLoading, error,
}: {
  url: string;
  setUrl: (v: string) => void;
  onScan: (e: FormEvent) => void;
  isLoading: boolean;
  error: string;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-700/50 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Free Website SEO Scan by Elitez Asia
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          Discover What&apos;s Holding Your
          <span className="block text-blue-300 mt-1">Website Back in Search</span>
        </h1>

        <p className="text-lg text-blue-200 mb-4 max-w-2xl mx-auto leading-relaxed">
          Enter your website URL for a free technical SEO scan. We&apos;ll identify issues
          that may affect your visibility in search results — in under 60 seconds.
        </p>

        <p className="text-xs text-blue-300/60 mb-8">
          Scans up to 10 pages · No credit card · No login required · Google outcomes not guaranteed
        </p>

        {/* URL form */}
        <form onSubmit={onScan} className="max-w-2xl mx-auto">
          <div className="flex gap-3 p-2 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <div className="flex-1 flex items-center gap-3 bg-white rounded-xl px-4">
              <span className="text-slate-400 text-lg">🌐</span>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.yourwebsite.com"
                className="flex-1 py-3.5 bg-transparent text-slate-900 placeholder-slate-400
                           outline-none text-base font-medium"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-7 py-3.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base
                         rounded-xl transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? <><span className="animate-spin">⟳</span>Scanning…</> : 'Scan My Site →'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-red-300 text-sm font-medium">⚠️ {error}</p>
          )}
        </form>

        {/* Trust bullets */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8 text-xs text-blue-300/80">
          <span>✓ 20+ technical SEO checks</span>
          <span>✓ WordPress detection</span>
          <span>✓ Schema markup analysis</span>
          <span>✓ Prioritised issue list</span>
          <span>✓ Free downloadable report</span>
        </div>
      </div>
    </div>
  );
}

// ─── Why it matters section ───────────────────────────────────────────────────

function WhyItMatters() {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-xl font-bold text-center mb-2">Why technical SEO matters</h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          Technical issues are often invisible — but they affect how search engines find and rank your pages.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: '🔍',
              title: 'Crawlability',
              body: 'If search engines can\'t crawl your pages, those pages won\'t appear in search results — no matter how good the content is.',
            },
            {
              icon: '📋',
              title: 'Structured Data',
              body: 'Schema markup helps search engines understand what your page is about and can enable enhanced results like FAQs and ratings.',
            },
            {
              icon: '⚡',
              title: 'Page Quality Signals',
              body: 'Missing titles, duplicate H1s, and broken canonicals are signals that may affect how a page is evaluated during ranking.',
            },
          ].map(c => (
            <div key={c.title} className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-bold text-white mb-2">{c.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          Results are advisory. Fixing technical SEO issues may improve search visibility over time —
          specific ranking or traffic outcomes are not guaranteed.
        </p>
      </div>
    </div>
  );
}

// ─── What you get after unlocking ─────────────────────────────────────────────

function WhatYouGet() {
  return (
    <div className="card p-5 bg-blue-50 border border-blue-100">
      <h3 className="text-sm font-extrabold text-blue-900 mb-3">
        🔓 What you get after unlocking
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-800">
        {[
          { icon: '📊', text: 'Full SEO health score breakdown across 8 categories' },
          { icon: '🚨', text: 'Complete prioritised issue list with fix instructions' },
          { icon: '📋', text: 'Schema / structured data findings per page' },
          { icon: '📝', text: 'Recommended next steps tailored to your site' },
          { icon: '⬇️', text: 'Downloadable Markdown and PDF report' },
          { icon: '👋', text: 'Optional follow-up from the Elitez team — no obligation' },
        ].map(i => (
          <div key={i.text} className="flex items-start gap-2">
            <span className="text-base flex-shrink-0">{i.icon}</span>
            <span className="leading-relaxed">{i.text}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-blue-600/70 mt-3 leading-relaxed">
        Free · No credit card · No obligation · Report saved to your device only
      </p>
    </div>
  );
}

// ─── What we check section ────────────────────────────────────────────────────

function WhatWeCheck() {
  return (
    <div className="bg-white border-t border-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-xl font-bold text-center text-slate-800 mb-8">
          What does the scan check?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { icon: '📄', label: 'Titles & Meta Descriptions' },
            { icon: '🔍', label: 'Heading Structure (H1/H2)' },
            { icon: '🗺️', label: 'Sitemap & Robots.txt' },
            { icon: '🔒', label: 'Canonical & Noindex Tags' },
            { icon: '📋', label: 'Schema / Structured Data' },
            { icon: '🖼️', label: 'Image Alt Text' },
            { icon: '🔗', label: 'Internal Linking' },
            { icon: '🟦', label: 'WordPress Detection' },
            { icon: '📊', label: 'Overall SEO Health Score' },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xl">{c.icon}</span>
              <span className="text-sm text-slate-700 font-medium">{c.label}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">
          Results are advisory only. Technical improvements may affect search visibility over time —
          Google outcomes including rankings and traffic are not guaranteed.
        </p>
      </div>
    </div>
  );
}

// ─── Unlocked full report ─────────────────────────────────────────────────────

function UnlockedReport({
  auditResult, lead,
}: {
  auditResult: PublicAuditResult;
  lead:        PublicAuditLead;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handlePDF() {
    setPdfLoading(true);
    try {
      await downloadPublicPDFReport({
        lead, auditResult,
        generatedAt: new Date().toISOString(),
      });
    } finally {
      setPdfLoading(false);
    }
  }

  function handleMarkdown() {
    downloadPublicMarkdownReport({
      lead, auditResult,
      generatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="card p-5 bg-green-50 border border-green-200">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-green-800">✅ Report Unlocked</h3>
          <p className="text-xs text-green-700 mt-0.5">
            Hi {lead.name.split(' ')[0]}! Your full SEO snapshot is ready. Download it below.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleMarkdown}
            className="btn-secondary text-sm"
          >
            ⬇️ Download Markdown
          </button>
          <button
            onClick={handlePDF}
            disabled={pdfLoading}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {pdfLoading ? '⏳ Generating…' : '⬇️ Download PDF'}
          </button>
        </div>
      </div>
      <p className="text-xs text-green-700">
        Reports contain only your audit snapshot. They are saved to your device and not stored on our servers.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicAuditPage() {
  const [pageState,   setPageState]   = useState<PageState>('idle');
  const [url,         setUrl]         = useState('');
  const [urlError,    setUrlError]    = useState('');
  const [progress,    setProgress]    = useState({ crawled: 0, message: '', currentUrl: '' });
  const [auditResult, setAuditResult] = useState<PublicAuditResult | null>(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [lead,        setLead]        = useState<PublicAuditLead | null>(null);

  const abortRef      = useRef<AbortController | null>(null);
  const resultsRef    = useRef<HTMLDivElement>(null);

  function validateUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('Please enter a URL');
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    new URL(withProtocol);
    return withProtocol;
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    setUrlError('');

    let validUrl: string;
    try {
      validUrl = validateUrl(url);
    } catch {
      setUrlError('Please enter a valid website URL (e.g. https://example.com)');
      return;
    }

    // Abort any previous crawl
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPageState('crawling');
    setProgress({ crawled: 0, message: '', currentUrl: '' });
    setAuditResult(null);
    setLead(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/crawl', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: validUrl, maxPages: 10, publicMode: true }),
        signal:  controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const chunk of lines) {
          const dataLine = chunk.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;

          let event: CrawlProgressEvent;
          try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }

          if (event.type === 'progress') {
            setProgress({ crawled: event.crawled, message: event.message ?? '', currentUrl: event.currentUrl ?? '' });
          } else if (event.type === 'complete' && event.result) {
            const pubResult = buildPublicAuditResult(event.result as ScanResult, true);
            setAuditResult(pubResult);
            setPageState('teaser');
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          } else if (event.type === 'error') {
            setErrorMsg(event.error ?? 'An error occurred during the scan.');
            setPageState('error');
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setErrorMsg(err instanceof Error ? err.message : 'Scan failed. Please try again.');
      setPageState('error');
    }
  }

  function handleUnlock(savedLead: PublicAuditLead) {
    setLead(savedLead);
    setPageState('unlocked');
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  }

  function handleReset() {
    setPageState('idle');
    setUrl('');
    setAuditResult(null);
    setLead(null);
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showHero      = pageState === 'idle' || pageState === 'error';
  const showCrawling  = pageState === 'crawling';
  const showResults   = pageState === 'teaser' || pageState === 'unlocked';
  const isUnlocked    = pageState === 'unlocked';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Nav */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <div>
              <span className="font-bold text-slate-900 text-lg">Elitez</span>
              <span className="text-blue-600 font-bold text-lg"> SEO Doctor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 font-medium">
              Internal Tool
            </Link>
            <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
              Lead Manager →
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">

        {/* Hero (idle/error) */}
        {showHero && (
          <>
            <Hero
              url={url}
              setUrl={v => { setUrl(v); setUrlError(''); }}
              onScan={handleScan}
              isLoading={false}
              error={urlError}
            />
            <WhyItMatters />
            <WhatWeCheck />
          </>
        )}

        {/* Crawling */}
        {showCrawling && (
          <div className="max-w-4xl mx-auto px-6 py-16">
            <ProgressView
              crawled={progress.crawled}
              message={progress.message}
              currentUrl={progress.currentUrl}
            />
          </div>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <div className="max-w-md mx-auto px-6 py-8">
            <div className="card p-8 text-center">
              <div className="text-4xl mb-4">😵</div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Scan Failed</h2>
              <p className="text-slate-500 text-sm mb-5 leading-relaxed">{errorMsg}</p>
              <button onClick={handleReset} className="btn-primary w-full">
                ⟳ Try Again
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Common causes: site is down, blocks crawlers, or URL is incorrect.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && auditResult && (
          <div ref={resultsRef} className="max-w-4xl mx-auto px-6 py-8 space-y-6">

            {/* Result header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {isUnlocked ? '✅ Your SEO Report' : '🔍 Your SEO Snapshot'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {auditResult.domain} · {auditResult.pagesScanned} pages scanned
                </p>
              </div>
              <button onClick={handleReset} className="btn-secondary text-sm">
                ← Scan another site
              </button>
            </div>

            {/* Unlocked report download */}
            {isUnlocked && lead && (
              <UnlockedReport auditResult={auditResult} lead={lead} />
            )}

            {/* Audit results (teaser or full) */}
            <PublicAuditResults result={auditResult} unlocked={isUnlocked} />

            {/* Lead form (before unlock only) */}
            {!isUnlocked && (
              <div id="unlock-form" className="space-y-4">
                <WhatYouGet />
                <LeadCaptureForm
                  auditResult={auditResult}
                  onUnlock={handleUnlock}
                />
              </div>
            )}

            {/* CTA (after unlock) */}
            {isUnlocked && lead && (
              <PublicCTA lead={lead} score={auditResult.score} />
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          <p className="text-center text-xs text-slate-500 font-semibold">
            🩺 Elitez Technical SEO Doctor · Free Website SEO Scan · elitez.asia
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed space-y-1.5">
            <p className="font-semibold text-slate-600">Advisory disclaimer</p>
            <p>
              This tool provides a technical snapshot of publicly accessible pages. Results reflect
              observations at the time of scanning and may not cover all SEO factors.
            </p>
            <p>
              Recommendations are advisory only. Implementing changes may affect search visibility
              over time — specific rankings, impressions, or traffic outcomes are not guaranteed
              and depend on many factors outside of technical SEO.
            </p>
            <p>
              All data is processed on our servers during the scan and stored locally on your device
              after unlock. We do not retain your website data on our servers beyond the scan session.
              Your contact details are stored securely and used only to follow up on your audit results.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
