'use client';

import { useState, useEffect } from 'react';
import SchemaGenerator from '@/components/SchemaGenerator';

// ─── Standalone Schema Generator Page ────────────────────────────────────────

export default function SchemaPage() {
  const [recentDomain, setRecentDomain] = useState('');
  const [recentUrl,    setRecentUrl]    = useState('');

  // Try to pre-fill from most recent scan in localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('seo-scan-history') ?? '[]') as Array<{
        id: string; domain: string;
      }>;
      if (history.length > 0) {
        const recent = history[0];
        setRecentDomain(recent.domain);
        setRecentUrl(`https://${recent.domain}/`);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2">
              <span className="text-xl">🩺</span>
              <span className="font-bold text-slate-700 hidden sm:inline">SEO Doctor</span>
            </a>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="font-bold text-slate-900 text-sm">Schema Generator</p>
                <p className="text-xs text-slate-400">Generate JSON-LD structured data for your pages</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="btn-secondary text-sm"
            >
              ← New Scan
            </a>
            {recentDomain && (
              <a
                href={`/results?url=${encodeURIComponent(recentUrl)}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hidden sm:block"
              >
                View last scan ({recentDomain}) →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Schema Generator ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Intro banner */}
        <div className="mb-8 card p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
          <div className="flex flex-wrap items-start gap-4">
            <div className="text-4xl">🤖</div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                Schema Markup Generator
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Generate production-ready JSON-LD structured data for your website.
                Structured data helps Google understand your content and can unlock rich results
                in search — including business info panels, article cards, FAQ dropdowns, and more.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  ✅ Schema.org validated templates
                </span>
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  📋 Copy-paste ready code
                </span>
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  🏢 Elitez Group defaults pre-loaded
                </span>
                <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  📖 Next.js / WordPress / GTM guides
                </span>
              </div>
            </div>
          </div>
        </div>

        <SchemaGenerator
          initialDomain={recentDomain}
          initialUrl={recentUrl}
        />

        {/* Footer */}
        <div className="text-center py-8 text-xs text-slate-400 border-t border-slate-200 mt-8">
          <p>🩺 Elitez Technical SEO Doctor v2.0 · Schema Generator</p>
          <p className="mt-1">
            Validate your schema at{' '}
            <a
              href="https://validator.schema.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              validator.schema.org
            </a>
            {' '}or{' '}
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              Google Rich Results Test
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
