'use client';

import { useState } from 'react';
import type { SchemaIssue } from '@/types/seo';
import SchemaPreview from './SchemaPreview';

interface Props {
  issue: SchemaIssue;
  defaultExpanded?: boolean;
}

function SafetyBadge({ safety }: { safety: string }) {
  const map = {
    'safe':               { cls: 'bg-green-50 text-green-700 border border-green-200',   icon: '✅', label: 'Safe to Generate' },
    'needs-review':       { cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: '⚠️', label: 'Needs Review' },
    'requires-approval':  { cls: 'bg-red-50 text-red-700 border border-red-200',          icon: '🚨', label: 'Requires Approval' },
  };
  const cfg = map[safety as keyof typeof map] ?? map['needs-review'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cls = {
    critical: 'badge-critical',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
  }[severity] ?? 'badge-neutral';
  const dot = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[severity] ?? '⚪';
  return <span className={cls}>{dot} {severity.charAt(0).toUpperCase() + severity.slice(1)}</span>;
}

export default function SchemaIssueCard({ issue, defaultExpanded = false }: Props) {
  const [expanded,   setExpanded]   = useState(defaultExpanded);
  const [viewMode,   setViewMode]   = useState<'client' | 'developer'>('client');
  const [showAll,    setShowAll]    = useState(false);
  const [copiedFix,  setCopiedFix]  = useState(false);

  const borderColor = {
    critical: 'border-l-red-500',
    high:     'border-l-orange-400',
    medium:   'border-l-yellow-400',
    low:      'border-l-blue-400',
  }[issue.severity] ?? 'border-l-slate-300';

  function copySuggestedSchema() {
    if (!issue.suggestedSchema) return;
    const script = `<script type="application/ld+json">\n${JSON.stringify(issue.suggestedSchema, null, 2)}\n</script>`;
    navigator.clipboard.writeText(script).then(() => {
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2000);
    }).catch(() => { /* ignore */ });
  }

  const visiblePages = showAll ? issue.affectedPages : issue.affectedPages.slice(0, 5);

  return (
    <div className={`card border-l-4 ${borderColor}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-50 rounded-xl transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <SeverityBadge severity={issue.severity} />
            <span className="badge badge-neutral">📋 {issue.schemaType}</span>
            <SafetyBadge safety={issue.fixSafety} />
          </div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug pr-4">
            {issue.problem}
          </h3>
          {!expanded && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{issue.clientExplanation}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-400">Affected</p>
            <p className="font-bold text-slate-700 text-sm">{issue.count}</p>
          </div>
          {issue.suggestedSchema && (
            <span className="badge bg-purple-50 text-purple-700 border border-purple-200 text-xs">
              🤖 Schema Ready
            </span>
          )}
          <span className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {/* View toggle */}
          <div className="flex gap-1 mt-4 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
            {(['client', 'developer'] as const).map(m => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === m ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'client' ? '💬 Client View' : '👨‍💻 Developer View'}
              </button>
            ))}
          </div>

          {viewMode === 'client' ? (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What's the problem?</p>
                <p className="text-sm text-slate-700 leading-relaxed">{issue.clientExplanation}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">Why does it matter?</p>
                <p className="text-sm text-slate-700 leading-relaxed">{issue.whyItMatters}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">How to fix it</p>
                <p className="text-sm text-slate-700 leading-relaxed">{issue.recommendedFix}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Technical Detail</p>
                <p className="text-sm text-slate-700 font-mono leading-relaxed">{issue.technicalDetail}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Developer Instruction</p>
                <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {issue.developerInstruction}
                </pre>
              </div>
            </div>
          )}

          {/* Suggested Schema Block */}
          {issue.suggestedSchema && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  🤖 Ready-to-use Schema
                </p>
                <button
                  onClick={copySuggestedSchema}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors"
                >
                  {copiedFix ? '✓ Copied!' : '⎘ Copy Script Tag'}
                </button>
              </div>
              <SchemaPreview
                raw={JSON.stringify(issue.suggestedSchema, null, 2)}
                isValid
                types={[issue.schemaType]}
                defaultExpanded
              />
            </div>
          )}

          {/* Affected Pages */}
          {issue.affectedPages.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Affected URLs ({issue.count})
              </p>
              <div className="space-y-1">
                {visiblePages.map(url => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                     className="block text-xs text-blue-600 hover:text-blue-800 truncate
                                bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                    🔗 {url}
                  </a>
                ))}
                {issue.affectedPages.length > 5 && (
                  <button onClick={() => setShowAll(s => !s)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1">
                    {showAll ? '▴ Show fewer' : `▾ Show all ${issue.affectedPages.length} URLs`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
