'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — New Issues Table (V6)
// Issues present in the "after" snapshot but absent in the "before" snapshot.
// ─────────────────────────────────────────────────────────────────────────────

import type { IssueFingerprint } from '@/types/seo';

interface Props {
  issues: IssueFingerprint[];
}

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-blue-100 text-blue-700',
};

const SOURCE_LABELS: Record<string, string> = {
  seo:    'SEO',
  schema: 'Schema',
  fix:    'Fix Queue',
};

export default function NewIssuesTable({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No new issues detected since the previous audit. 🎉
      </div>
    );
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...issues].sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  return (
    <div className="overflow-x-auto rounded-xl border border-amber-200">
      <table className="w-full text-sm">
        <thead className="bg-amber-50 text-amber-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Severity</th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Source</th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Issue</th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">Pages</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-amber-100">
          {sorted.map(fp => (
            <tr key={fp.key} className="hover:bg-amber-50/40 transition-colors">
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${SEV_STYLES[fp.severity] ?? 'bg-slate-100 text-slate-600'}`}>
                  {fp.severity}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {SOURCE_LABELS[fp.source] ?? fp.source}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-700 font-medium max-w-sm">
                <span className="line-clamp-2">{fp.label}</span>
              </td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">
                {fp.category}
              </td>
              <td className="px-4 py-2.5 text-right text-slate-600 font-medium text-xs">
                {fp.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
