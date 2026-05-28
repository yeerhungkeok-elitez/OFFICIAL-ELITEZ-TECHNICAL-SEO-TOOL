'use client';

import { useState } from 'react';
import type { RobotsData, SitemapData } from '@/types/seo';

interface Props {
  robots: RobotsData;
  sitemap: SitemapData;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0 ${
      ok ? 'bg-green-500' : 'bg-red-500'
    }`} />
  );
}

function RobotsCard({ robots }: { robots: RobotsData }) {
  const [expanded, setExpanded] = useState(false);

  const isBlocking = robots.blockedPaths.some(p => p === '/' || p === '/*');
  const severity   = !robots.accessible ? 'error' : isBlocking ? 'error' : 'ok';

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center">
          🤖 robots.txt
        </h3>
        <span className={`badge ${
          severity === 'ok' ? 'badge-good' : 'badge-critical'
        }`}>
          {severity === 'ok' ? '✓ OK' : '✗ Issue'}
        </span>
      </div>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Status</span>
          <span className={`font-medium flex items-center ${robots.accessible ? 'text-green-600' : 'text-red-600'}`}>
            <StatusDot ok={robots.accessible} />
            {robots.accessible ? `HTTP ${robots.statusCode} — Accessible` : `Not accessible (${robots.statusCode ?? 'Error'})`}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">User-agent * rule</span>
          <span className={`font-medium flex items-center ${robots.hasUserAgentStar ? 'text-green-600' : 'text-yellow-600'}`}>
            <StatusDot ok={robots.hasUserAgentStar} />
            {robots.hasUserAgentStar ? 'Found' : 'Missing'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Sitemap directive</span>
          <span className={`font-medium flex items-center ${robots.hasSitemapDirective ? 'text-green-600' : 'text-yellow-600'}`}>
            <StatusDot ok={robots.hasSitemapDirective} />
            {robots.hasSitemapDirective ? 'Found' : 'Missing'}
          </span>
        </div>

        {isBlocking && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ <strong>Warning:</strong> robots.txt is blocking all crawlers with <code>Disallow: /</code>
          </div>
        )}

        {robots.blockedPaths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Blocked Paths ({robots.blockedPaths.length})
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {robots.blockedPaths.slice(0, 20).map(path => (
                <code key={path} className="block text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                  Disallow: {path}
                </code>
              ))}
              {robots.blockedPaths.length > 20 && (
                <p className="text-xs text-slate-400">…and {robots.blockedPaths.length - 20} more</p>
              )}
            </div>
          </div>
        )}

        {robots.sitemapUrls.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Sitemap Directives
            </p>
            {robots.sitemapUrls.map(u => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                 className="block text-xs text-blue-600 hover:text-blue-800 truncate">
                → {u}
              </a>
            ))}
          </div>
        )}

        {robots.content && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              {expanded ? '▴ Hide content' : '▾ View raw content'}
            </button>
            {expanded && (
              <pre className="bg-slate-900 text-green-400 text-xs rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                {robots.content}
              </pre>
            )}
          </>
        )}

        {robots.error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
            Error: {robots.error}
          </p>
        )}
      </div>
    </div>
  );
}

function SitemapCard({ sitemap }: { sitemap: SitemapData }) {
  const [showUrls, setShowUrls] = useState(false);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center">
          🗺️ sitemap.xml
        </h3>
        <span className={`badge ${sitemap.accessible && sitemap.urlCount > 0 ? 'badge-good' : 'badge-critical'}`}>
          {sitemap.accessible && sitemap.urlCount > 0 ? '✓ OK' : '✗ Issue'}
        </span>
      </div>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Status</span>
          <span className={`font-medium flex items-center ${sitemap.accessible ? 'text-green-600' : 'text-red-600'}`}>
            <StatusDot ok={sitemap.accessible} />
            {sitemap.accessible ? `HTTP ${sitemap.statusCode} — Accessible` : `Not accessible (${sitemap.statusCode ?? 'Error'})`}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">URL count</span>
          <span className={`font-bold ${sitemap.urlCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {sitemap.urlCount.toLocaleString()} URLs
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Type</span>
          <span className="font-medium text-slate-700">
            {sitemap.isSitemapIndex ? '📚 Sitemap Index' : '📄 Standard Sitemap'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Location</span>
          <a
            href={sitemap.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-xs truncate max-w-48"
          >
            {sitemap.url} ↗
          </a>
        </div>

        {sitemap.urls.length > 0 && (
          <>
            <button
              onClick={() => setShowUrls(s => !s)}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium"
            >
              {showUrls ? '▴ Hide URLs' : `▾ Preview URLs (${Math.min(sitemap.urls.length, 150)} shown)`}
            </button>
            {showUrls && (
              <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {sitemap.urls.slice(0, 50).map(url => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:text-blue-800 truncate py-0.5"
                  >
                    {url}
                  </a>
                ))}
                {sitemap.urlCount > 50 && (
                  <p className="text-xs text-slate-400 mt-2">
                    …and {sitemap.urlCount - 50} more URLs in sitemap
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {sitemap.error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
            Error: {sitemap.error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RobotsSitemapPanel({ robots, sitemap }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RobotsCard robots={robots} />
      <SitemapCard sitemap={sitemap} />
    </div>
  );
}
