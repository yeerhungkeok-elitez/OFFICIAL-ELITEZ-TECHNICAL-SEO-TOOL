'use client';

import { useState } from 'react';
import IssueCard from './IssueCard';
import type { SEOIssue, IssueSeverity, IssueCategory } from '@/types/seo';

interface Props {
  issues: SEOIssue[];
}

const SEVERITY_ORDER: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  'crawlability':    'Crawlability',
  'indexability':    'Indexability',
  'on-page':         'On-page',
  'structured-data': 'Structured Data',
  'internal-linking':'Internal Linking',
  'image-seo':       'Image SEO',
  'social-og':       'Social / OG',
  'performance':     'Performance',
};

export default function TopIssues({ issues }: Props) {
  const [filter, setFilter]   = useState<IssueSeverity | 'all'>('all');
  const [catFilter, setCat]   = useState<IssueCategory | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = issues
    .filter(i => filter === 'all' || i.severity === filter)
    .filter(i => catFilter === 'all' || i.category === catFilter);

  const displayed = showAll ? filtered : filtered.slice(0, 10);

  const counts = {
    all:      issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high:     issues.filter(i => i.severity === 'high').length,
    medium:   issues.filter(i => i.severity === 'medium').length,
    low:      issues.filter(i => i.severity === 'low').length,
  };

  const categories = [...new Set(issues.map(i => i.category))] as IssueCategory[];

  const filterBtnCls = (active: boolean, color: string) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
      active
        ? `${color} shadow-sm`
        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">
            Issues Found
            <span className="ml-2 text-slate-400 font-normal text-sm">
              ({issues.length} total)
            </span>
          </h2>
          {/* Severity filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={filterBtnCls(filter === 'all', 'bg-slate-800 text-white')}
            >
              All ({counts.all})
            </button>
            {counts.critical > 0 && (
              <button
                onClick={() => setFilter('critical')}
                className={filterBtnCls(filter === 'critical', 'bg-red-100 text-red-700')}
              >
                🔴 Critical ({counts.critical})
              </button>
            )}
            {counts.high > 0 && (
              <button
                onClick={() => setFilter('high')}
                className={filterBtnCls(filter === 'high', 'bg-orange-100 text-orange-700')}
              >
                🟠 High ({counts.high})
              </button>
            )}
            {counts.medium > 0 && (
              <button
                onClick={() => setFilter('medium')}
                className={filterBtnCls(filter === 'medium', 'bg-yellow-100 text-yellow-700')}
              >
                🟡 Medium ({counts.medium})
              </button>
            )}
            {counts.low > 0 && (
              <button
                onClick={() => setFilter('low')}
                className={filterBtnCls(filter === 'low', 'bg-blue-100 text-blue-700')}
              >
                🔵 Low ({counts.low})
              </button>
            )}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setCat('all')}
              className={filterBtnCls(catFilter === 'all', 'bg-slate-800 text-white')}
            >
              All categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCat(cat)}
                className={filterBtnCls(catFilter === cat, 'bg-blue-100 text-blue-700')}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-medium">No issues found for this filter!</p>
          </div>
        ) : (
          displayed.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              defaultExpanded={issue.severity === 'critical'}
            />
          ))
        )}

        {filtered.length > 10 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setShowAll(s => !s)}
              className="btn-secondary text-sm"
            >
              {showAll
                ? `▴ Show top 10 only`
                : `▾ Show all ${filtered.length} issues`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
