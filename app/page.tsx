'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecentScan {
  id: string;
  domain: string;
  crawledAt: string;
  score: number;
  totalPages: number;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('seo-scan-history') ?? '[]');
      setRecentScans(history.slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  function validateUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) throw new Error('Please enter a URL');
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    new URL(withProtocol); // throws if invalid
    return withProtocol;
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    setError('');

    let validUrl: string;
    try {
      validUrl = validateUrl(url);
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com)');
      return;
    }

    setIsLoading(true);
    // Navigate to results page — it will start the crawl
    router.push(`/results?url=${encodeURIComponent(validUrl)}`);
  }

  function handleRecentScan(scan: RecentScan) {
    const fullScan = JSON.parse(localStorage.getItem(`seo-scan-${scan.id}`) ?? 'null');
    if (fullScan) {
      localStorage.setItem('seo-scan-current', JSON.stringify(fullScan));
      router.push(`/results?id=${scan.id}`);
    }
  }

  const features = [
    { icon: '🕷️', title: 'Smart Crawler', desc: 'Crawls up to 50 pages, discovers links, respects structure' },
    { icon: '🔍', title: '30+ SEO Checks', desc: 'Title, meta, H1, canonical, noindex, structured data & more' },
    { icon: '📊', title: 'Health Score', desc: 'Weighted 0–100 score across 8 technical SEO categories' },
    { icon: '🚨', title: 'Prioritised Issues', desc: 'Critical → High → Medium → Low with fix instructions' },
    { icon: '👨‍💻', title: 'Dev Instructions', desc: 'Code-level fixes with client-friendly explanations' },
    { icon: '📄', title: 'Markdown Export', desc: 'Full audit report exportable as Markdown' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <div>
              <span className="font-bold text-slate-900 text-lg">Elitez</span>
              <span className="text-blue-600 font-bold text-lg"> SEO Doctor</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
              v1.0 · Local Tool
            </span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1">
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-700/50 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Technical SEO Audit Tool by Elitez
            </div>
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">
              Find & Fix Technical SEO Issues
              <span className="block text-blue-300 mt-1">in Minutes</span>
            </h1>
            <p className="text-xl text-blue-200 mb-12 max-w-2xl mx-auto leading-relaxed">
              Crawl any website, get a health score, prioritised issues,
              and developer-ready fix instructions — all in one tool.
            </p>

            {/* URL Input Form */}
            <form onSubmit={handleScan} className="max-w-2xl mx-auto">
              <div className="flex gap-3 p-2 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
                <div className="flex-1 flex items-center gap-3 bg-white rounded-xl px-4">
                  <span className="text-slate-400 text-lg">🌐</span>
                  <input
                    type="text"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setError(''); }}
                    placeholder="https://www.elitez.asia"
                    className="flex-1 py-3.5 bg-transparent text-slate-900 placeholder-slate-400
                               outline-none text-lg font-medium"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3.5 bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                             text-white font-bold text-lg rounded-xl
                             transition-all duration-150 shadow-lg hover:shadow-xl
                             disabled:opacity-60 disabled:cursor-not-allowed
                             flex items-center gap-2 whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Starting...
                    </>
                  ) : (
                    <>Scan Site →</>
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-red-300 text-sm font-medium">
                  ⚠️ {error}
                </p>
              )}
              <p className="mt-3 text-blue-300/70 text-sm">
                Crawls up to 50 pages · Runs locally · No login required
              </p>
            </form>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12 text-slate-700">
            What gets checked?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Score Categories */}
        <div className="bg-white border-t border-slate-100">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-2xl font-bold text-center mb-10 text-slate-700">
              Score breakdown across 8 categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Crawlability',       weight: '20%', icon: '🕷️' },
                { name: 'Indexability',       weight: '20%', icon: '📑' },
                { name: 'On-page Technical',  weight: '15%', icon: '🔍' },
                { name: 'Structured Data',    weight: '15%', icon: '📋' },
                { name: 'Performance',        weight: '10%', icon: '⚡' },
                { name: 'Internal Linking',   weight: '10%', icon: '🔗' },
                { name: 'Image SEO',          weight: '5%',  icon: '🖼️' },
                { name: 'Social / OG',        weight: '5%',  icon: '📣' },
              ].map(cat => (
                <div key={cat.name} className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
                    <p className="text-xs text-blue-600 font-bold">{cat.weight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <h2 className="text-xl font-bold mb-6 text-slate-700">Recent Scans</h2>
            <div className="card overflow-hidden">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Score</th>
                    <th>Pages</th>
                    <th>Scanned</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map(scan => (
                    <tr key={scan.id}>
                      <td className="font-medium">{scan.domain}</td>
                      <td>
                        <span className={`font-bold ${
                          scan.score >= 80 ? 'text-green-600' :
                          scan.score >= 60 ? 'text-yellow-600' :
                          scan.score >= 40 ? 'text-orange-600' : 'text-red-600'
                        }`}>{scan.score}/100</span>
                      </td>
                      <td>{scan.totalPages} pages</td>
                      <td className="text-slate-500 text-xs">
                        {new Date(scan.crawledAt).toLocaleString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRecentScan(scan)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── V8: Tool Navigation Cards ── */}
      <div className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-xl font-bold text-center text-slate-700 mb-8">All Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Internal SEO Doctor */}
            <div className="card p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <div className="text-3xl mb-3">🩺</div>
              <h3 className="font-extrabold text-lg mb-1">Internal SEO Doctor</h3>
              <p className="text-blue-200 text-sm leading-relaxed mb-4">
                Full-featured technical SEO audit tool with schema audit, GSC import,
                fix queue, PDF reports, history tracking, and WordPress helper mode.
                Up to 50 pages.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-xs bg-blue-500/50 text-white px-2 py-1 rounded-full">50 pages</span>
                <span className="text-xs bg-blue-500/50 text-white px-2 py-1 rounded-full">Schema Audit</span>
                <span className="text-xs bg-blue-500/50 text-white px-2 py-1 rounded-full">PDF Export</span>
                <span className="text-xs bg-blue-500/50 text-white px-2 py-1 rounded-full">WP Helper</span>
              </div>
            </div>

            {/* Public Audit */}
            <Link
              href="/public-audit"
              className="card p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white hover:shadow-lg transition-shadow cursor-pointer block"
            >
              <div className="text-3xl mb-3">🌐</div>
              <h3 className="font-extrabold text-lg mb-1">Public SEO Audit</h3>
              <p className="text-emerald-100 text-sm leading-relaxed mb-4">
                Lead magnet for prospects. Visitors scan their website (10 pages),
                see a teaser result, submit their details, and unlock a free report.
                Automatically saves leads.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-xs bg-emerald-500/50 text-white px-2 py-1 rounded-full">10 pages</span>
                <span className="text-xs bg-emerald-500/50 text-white px-2 py-1 rounded-full">Lead Capture</span>
                <span className="text-xs bg-emerald-500/50 text-white px-2 py-1 rounded-full">Free Report</span>
                <span className="text-xs bg-emerald-500/50 text-white px-2 py-1 rounded-full">CTA</span>
              </div>
            </Link>

            {/* Lead Manager */}
            <Link
              href="/admin/leads"
              className="card p-6 bg-gradient-to-br from-slate-700 to-slate-900 text-white hover:shadow-lg transition-shadow cursor-pointer block"
            >
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-extrabold text-lg mb-1">Lead Manager</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Review and manage leads captured from the public audit tool.
                Filter by status and temperature, update lead status, export CSV/JSON.
                Internal use only — no authentication.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded-full">Lead Scoring</span>
                <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded-full">CSV Export</span>
                <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded-full">Status Track</span>
                <span className="text-xs bg-amber-600/60 text-amber-100 px-2 py-1 rounded-full">⚠️ No Auth</span>
              </div>
            </Link>

            {/* Content Checker */}
            <Link
              href="/content-checker"
              className="card p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white hover:shadow-lg transition-shadow cursor-pointer block"
            >
              <div className="text-3xl mb-3">✍️</div>
              <h3 className="font-extrabold text-lg mb-1">Content Checker</h3>
              <p className="text-violet-200 text-sm leading-relaxed mb-4">
                Score articles on SEO, readability &amp; completeness. Auto-fix
                placeholders, meta tags, missing sections. Preview before/after.
                Export clean HTML for WordPress.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-xs bg-violet-500/50 text-white px-2 py-1 rounded-full">Auto-Fix</span>
                <span className="text-xs bg-violet-500/50 text-white px-2 py-1 rounded-full">SEO Score</span>
                <span className="text-xs bg-violet-500/50 text-white px-2 py-1 rounded-full">WP Export</span>
                <span className="text-xs bg-violet-500/50 text-white px-2 py-1 rounded-full">Readability</span>
              </div>
            </Link>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-400">
          <p>🩺 Elitez Technical SEO Doctor v1.0 · Built for Elitez Asia · Runs 100% locally</p>
        </div>
      </footer>
    </div>
  );
}
