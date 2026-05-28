'use client';

import type { ScanSummary } from '@/types/seo';

interface Props {
  summary: ScanSummary;
  crawlDuration: number;
}

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'red' | 'green' | 'yellow' | 'orange' | 'slate';
}

function StatCard({ title, value, subtitle, icon, color }: CardProps) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'bg-slate-100' },
  };
  const c = colorMap[color];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            {title}
          </p>
          <p className={`text-3xl font-extrabold ${c.text} mb-1`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center text-xl flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SummaryCards({ summary, crawlDuration }: Props) {
  const indexPct = summary.totalPages > 0
    ? Math.round((summary.indexablePages / summary.totalPages) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Pages Crawled"
        value={summary.totalPages}
        subtitle={`Crawled in ${crawlDuration}s`}
        icon="📄"
        color="blue"
      />
      <StatCard
        title="Critical Issues"
        value={summary.criticalIssues}
        subtitle={`${summary.highIssues} high · ${summary.mediumIssues} medium`}
        icon="🚨"
        color={summary.criticalIssues > 0 ? 'red' : 'green'}
      />
      <StatCard
        title="Indexable Pages"
        value={`${indexPct}%`}
        subtitle={`${summary.indexablePages} of ${summary.totalPages} pages`}
        icon="📑"
        color={indexPct >= 80 ? 'green' : indexPct >= 50 ? 'yellow' : 'red'}
      />
      <StatCard
        title="Total Issues"
        value={summary.totalIssues}
        subtitle={`${summary.lowIssues} low priority`}
        icon="🔍"
        color={summary.totalIssues === 0 ? 'green' : summary.totalIssues > 10 ? 'orange' : 'yellow'}
      />

      {/* Second row */}
      <StatCard
        title="Missing Titles"
        value={summary.pagesWithMissingTitle}
        subtitle="Pages without <title>"
        icon="📝"
        color={summary.pagesWithMissingTitle === 0 ? 'green' : 'red'}
      />
      <StatCard
        title="Missing H1"
        value={summary.pagesWithMissingH1}
        subtitle="Pages without H1 heading"
        icon="H₁"
        color={summary.pagesWithMissingH1 === 0 ? 'green' : 'orange'}
      />
      <StatCard
        title="With Schema"
        value={summary.pagesWithStructuredData}
        subtitle="Pages with JSON-LD"
        icon="📋"
        color={summary.pagesWithStructuredData > 0 ? 'green' : 'orange'}
      />
      <StatCard
        title="HTTP Errors"
        value={summary.errorPages}
        subtitle="4xx / 5xx pages"
        icon="⚠️"
        color={summary.errorPages === 0 ? 'green' : 'red'}
      />
    </div>
  );
}
