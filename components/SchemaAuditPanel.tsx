'use client';

import { useState } from 'react';
import type { SchemaAuditResult } from '@/types/seo';
import { getSchemaScoreLabel } from '@/lib/schemaScoring';
import SchemaIssueCard from './SchemaIssueCard';
import SchemaTypeSummary from './SchemaTypeSummary';
import SchemaPageTable from './SchemaPageTable';
import SchemaPreview from './SchemaPreview';

interface Props {
  audit: SchemaAuditResult;
  totalPages: number;
  onOpenGenerator?: () => void;
}

// ─── Mini score gauge (horizontal bar style) ─────────────────────────────────

function ScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const color =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-lime-500' :
    score >= 40 ? 'bg-yellow-500' :
    score >= 20 ? 'bg-orange-500' : 'bg-red-500';

  const textColor =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-lime-600' :
    score >= 40 ? 'text-yellow-600' :
    score >= 20 ? 'text-orange-600' : 'text-red-600';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="w-40 flex-shrink-0">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{weight}</p>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`}
             style={{ width: `${score}%` }} />
      </div>
      <span className={`w-14 text-right font-bold text-sm ${textColor}`}>{score}/100</span>
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, ok }: { icon: string; label: string; value: string | number; ok?: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className={`text-2xl font-extrabold ${ok === true ? 'text-green-600' : ok === false ? 'text-red-600' : 'text-slate-800'}`}>
            {value}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function SchemaAuditPanel({ audit, totalPages, onOpenGenerator }: Props) {
  const [tab, setTab]       = useState<'issues' | 'types' | 'pages' | 'recommended'>('issues');
  const [sevFilter, setSev] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const { label: scoreLabel, color: scoreColor } = getSchemaScoreLabel(audit.score.overall);

  const filteredIssues = audit.issues.filter(i =>
    sevFilter === 'all' || i.severity === sevFilter
  );

  const issueCounts = {
    all:      audit.issues.length,
    critical: audit.issues.filter(i => i.severity === 'critical').length,
    high:     audit.issues.filter(i => i.severity === 'high').length,
    medium:   audit.issues.filter(i => i.severity === 'medium').length,
    low:      audit.issues.filter(i => i.severity === 'low').length,
  };

  return (
    <div className="space-y-6">

      {/* ── Hero Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Score card */}
        <div className="card p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Schema Health Score
          </p>
          <div className="flex items-center gap-5 mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold flex-shrink-0 border-4"
              style={{ color: scoreColor, borderColor: scoreColor }}
            >
              {audit.score.overall}
            </div>
            <div>
              <p className="font-bold text-xl" style={{ color: scoreColor }}>{scoreLabel}</p>
              <p className="text-sm text-slate-500 mt-0.5">out of 100</p>
            </div>
          </div>

          {/* Sub-score bars */}
          <div>
            <ScoreBar label="Valid JSON-LD"          weight="25%" score={audit.score.validJson} />
            <ScoreBar label="Correct Types"          weight="25%" score={audit.score.correctTypes} />
            <ScoreBar label="Required Properties"    weight="25%" score={audit.score.requiredProperties} />
            <ScoreBar label="No Duplicates"          weight="15%" score={audit.score.noDuplicates} />
            <ScoreBar label="Content Consistency"    weight="10%" score={audit.score.contentConsistency} />
          </div>
        </div>

        {/* Summary stats */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
          <StatCard
            icon="📋"
            label="Pages with Schema"
            value={audit.summary.totalPagesWithSchema}
            ok={audit.summary.totalPagesWithSchema > 0}
          />
          <StatCard
            icon="🚫"
            label="Pages without Schema"
            value={audit.summary.totalPagesWithoutSchema}
            ok={audit.summary.totalPagesWithoutSchema === 0}
          />
          <StatCard
            icon="🧩"
            label="Total Schema Blocks"
            value={audit.summary.totalSchemaBlocks}
          />
          <StatCard
            icon="⚠️"
            label="Invalid JSON-LD"
            value={audit.summary.invalidSchemaBlocks}
            ok={audit.summary.invalidSchemaBlocks === 0}
          />
          <StatCard
            icon="🏷️"
            label="Unique Schema Types"
            value={audit.summary.uniqueSchemaTypes}
          />
          <StatCard
            icon="🚨"
            label="Schema Issues"
            value={audit.issues.length}
            ok={audit.issues.length === 0}
          />

          {/* Missing critical types banner */}
          {audit.summary.missingCriticalTypes.length > 0 && (
            <div className="col-span-2 sm:col-span-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-2">
                🔴 Missing critical schema types:
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {audit.summary.missingCriticalTypes.map(t => (
                  <span key={t} className="badge badge-critical">{t}</span>
                ))}
              </div>
              {onOpenGenerator && (
                <button onClick={onOpenGenerator} className="btn-primary text-sm">
                  🤖 Generate Missing Schema →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {([
          { key: 'issues',      label: `Issues (${audit.issues.length})` },
          { key: 'types',       label: `Types (${audit.summary.uniqueSchemaTypes})` },
          { key: 'pages',       label: `Pages (${audit.pageSchemas.length})` },
          { key: 'recommended', label: `Recommended (${audit.recommendedTypes.length})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Issues tab ── */}
      {tab === 'issues' && (
        <div className="card">
          <div className="card-header">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-800">Schema Issues</h3>
              <div className="flex flex-wrap gap-2">
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map(sev => {
                  const cnt = issueCounts[sev];
                  if (sev !== 'all' && cnt === 0) return null;
                  const active = sevFilter === sev;
                  const cls = {
                    all:      active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600',
                    critical: active ? 'bg-red-600 text-white'   : 'bg-red-50 text-red-600',
                    high:     active ? 'bg-orange-500 text-white': 'bg-orange-50 text-orange-600',
                    medium:   active ? 'bg-yellow-500 text-white': 'bg-yellow-50 text-yellow-600',
                    low:      active ? 'bg-blue-500 text-white'  : 'bg-blue-50 text-blue-600',
                  }[sev];
                  const dot = { all: '', critical: '🔴 ', high: '🟠 ', medium: '🟡 ', low: '🔵 ' }[sev];
                  return (
                    <button key={sev} onClick={() => setSev(sev)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${cls}`}>
                      {dot}{sev === 'all' ? `All (${cnt})` : `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${cnt})`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-medium">No schema issues found for this filter!</p>
              </div>
            ) : (
              filteredIssues.map(issue => (
                <SchemaIssueCard
                  key={issue.id}
                  issue={issue}
                  defaultExpanded={issue.severity === 'critical'}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Types tab ── */}
      {tab === 'types' && (
        <SchemaTypeSummary typeCounts={audit.typeCounts} totalPages={totalPages} />
      )}

      {/* ── Pages tab ── */}
      {tab === 'pages' && (
        <SchemaPageTable pageSchemas={audit.pageSchemas} />
      )}

      {/* ── Recommended tab ── */}
      {tab === 'recommended' && (
        <div className="space-y-4">
          {audit.recommendedTypes.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium text-slate-600">All recommended schema types are in place!</p>
            </div>
          ) : (
            audit.recommendedTypes.map((rt, i) => (
              <div key={i} className="card">
                <div className="card-header flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${
                        rt.priority === 'critical' ? 'badge-critical' :
                        rt.priority === 'high'     ? 'badge-high' :
                        rt.priority === 'medium'   ? 'badge-medium' : 'badge-low'
                      }`}>
                        {rt.priority === 'critical' ? '🔴' : rt.priority === 'high' ? '🟠' : '🟡'}{' '}
                        {rt.priority.charAt(0).toUpperCase() + rt.priority.slice(1)}
                      </span>
                      <span className="font-semibold text-slate-900">Add {rt.schemaType} schema</span>
                    </div>
                    <p className="text-sm text-slate-600">{rt.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {rt.pages.length} page{rt.pages.length !== 1 ? 's' : ''} affected
                    </p>
                  </div>
                  {onOpenGenerator && (
                    <button onClick={onOpenGenerator} className="btn-primary text-sm flex-shrink-0">
                      Open Generator →
                    </button>
                  )}
                </div>
                <div className="card-body">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Suggested Template
                  </p>
                  <SchemaPreview
                    raw={JSON.stringify(rt.suggestedSchema, null, 2)}
                    isValid
                    types={[rt.schemaType]}
                    defaultExpanded={false}
                    label="Template — customise before using"
                  />
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pages needing this</p>
                    {rt.pages.slice(0, 5).map(url => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                         className="block text-xs text-blue-600 hover:text-blue-800 truncate bg-blue-50 px-3 py-1.5 rounded-lg">
                        🔗 {url}
                      </a>
                    ))}
                    {rt.pages.length > 5 && (
                      <p className="text-xs text-slate-400 px-3">…and {rt.pages.length - 5} more</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
