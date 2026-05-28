'use client';

interface Props {
  typeCounts: Record<string, number>;
  totalPages: number;
}

const TYPE_COLORS: Record<string, string> = {
  Organization:      'bg-blue-100 text-blue-800 border-blue-200',
  LocalBusiness:     'bg-indigo-100 text-indigo-800 border-indigo-200',
  WebSite:           'bg-cyan-100 text-cyan-800 border-cyan-200',
  WebPage:           'bg-sky-100 text-sky-800 border-sky-200',
  BreadcrumbList:    'bg-teal-100 text-teal-800 border-teal-200',
  Article:           'bg-green-100 text-green-800 border-green-200',
  BlogPosting:       'bg-emerald-100 text-emerald-800 border-emerald-200',
  NewsArticle:       'bg-lime-100 text-lime-800 border-lime-200',
  FAQPage:           'bg-yellow-100 text-yellow-800 border-yellow-200',
  Service:           'bg-orange-100 text-orange-800 border-orange-200',
  Product:           'bg-red-100 text-red-800 border-red-200',
  Person:            'bg-pink-100 text-pink-800 border-pink-200',
  Review:            'bg-purple-100 text-purple-800 border-purple-200',
  AggregateRating:   'bg-violet-100 text-violet-800 border-violet-200',
  JobPosting:        'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
};

const TYPE_ICONS: Record<string, string> = {
  Organization:   '🏢',
  LocalBusiness:  '📍',
  WebSite:        '🌐',
  WebPage:        '📄',
  BreadcrumbList: '🍞',
  Article:        '📰',
  BlogPosting:    '✍️',
  NewsArticle:    '📡',
  FAQPage:        '❓',
  Service:        '⚙️',
  Product:        '📦',
  Person:         '👤',
  Review:         '⭐',
  AggregateRating:'🌟',
  JobPosting:     '💼',
};

function SchemaTypeCard({ type, count, totalPages }: { type: string; count: number; totalPages: number }) {
  const cls  = TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const icon = TYPE_ICONS[type] ?? '📋';
  const pct  = totalPages > 0 ? Math.round((count / totalPages) * 100) : 0;

  return (
    <div className={`border rounded-xl p-4 ${cls.split(' ').slice(2).join(' ')}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
          {count} page{count !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="font-semibold text-sm mb-1">{type}</p>
      <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
        <div
          className={`h-1.5 rounded-full ${cls.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-400')}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs mt-1 opacity-70">{pct}% of pages</p>
    </div>
  );
}

export default function SchemaTypeSummary({ typeCounts, totalPages }: Props) {
  const entries = Object.entries(typeCounts).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="font-medium text-slate-600">No schema markup found across crawled pages</p>
        <p className="text-sm mt-1">Use the Schema Generator to create structured data for your site.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Schema Types Detected</h3>
        <span className="text-xs text-slate-400">{entries.length} unique type{entries.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {entries.map(([type, count]) => (
            <SchemaTypeCard key={type} type={type} count={count} totalPages={totalPages} />
          ))}
        </div>
      </div>
    </div>
  );
}
