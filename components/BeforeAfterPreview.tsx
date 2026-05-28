'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Before / After Preview (V9)
// Shows: tabbed before/after content view, list of changes made, score delta.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ContentChange } from '@/types/content';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface ScoreSnapshot {
  overall:   number;
  readiness: string;
}

interface Props {
  beforeContent: string;
  afterContent:  string;
  changes:       ContentChange[];
  scoreBefore?:  ScoreSnapshot;
  scoreAfter?:   ScoreSnapshot;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function renderHtmlSafe(html: string) {
  // Render HTML as text preview (strip tags for safe display)
  const plain = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return plain;
}

function ScoreDelta({ before, after }: { before: ScoreSnapshot; after: ScoreSnapshot }) {
  const delta = after.overall - before.overall;
  const sign  = delta > 0 ? '+' : '';
  const color = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-slate-500';
  return (
    <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
      <div className="text-center">
        <p className="text-xs text-slate-500">Before</p>
        <p className="text-lg font-bold text-slate-700">{before.overall}</p>
        <p className="text-xs text-slate-500">{before.readiness}</p>
      </div>
      <div className="text-2xl text-slate-300">→</div>
      <div className="text-center">
        <p className="text-xs text-slate-500">After</p>
        <p className="text-lg font-bold text-slate-700">{after.overall}</p>
        <p className="text-xs text-slate-500">{after.readiness}</p>
      </div>
      {delta !== 0 && (
        <div className={`ml-auto text-xl font-bold ${color}`}>
          {sign}{delta} pts
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Tab = 'before' | 'after' | 'changes';

export default function BeforeAfterPreview({
  beforeContent,
  afterContent,
  changes,
  scoreBefore,
  scoreAfter,
}: Props) {
  const [tab, setTab] = useState<Tab>('after');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'before',  label: `Before` },
    { id: 'after',   label: `After` },
    { id: 'changes', label: `Changes (${changes.length})` },
  ];

  const plainBefore = renderHtmlSafe(beforeContent);
  const plainAfter  = renderHtmlSafe(afterContent);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Preview</h2>
          {changes.length > 0 && (
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
              {changes.length} change{changes.length !== 1 ? 's' : ''} applied
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                ${tab === t.id
                  ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Score delta */}
        {scoreBefore && scoreAfter && tab !== 'before' && (
          <ScoreDelta before={scoreBefore} after={scoreAfter} />
        )}

        {/* Content pane */}
        {tab === 'before' && (
          <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed
                          bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-slate-100">
            {plainBefore || <span className="text-slate-400 italic">No content</span>}
          </pre>
        )}

        {tab === 'after' && (
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed
                          bg-emerald-50/40 rounded-lg p-4 max-h-96 overflow-y-auto border border-emerald-100">
            {plainAfter || <span className="text-slate-400 italic">No content</span>}
          </pre>
        )}

        {tab === 'changes' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {changes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No changes applied yet.</p>
            ) : (
              changes.map((c, i) => (
                <div key={c.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-400">#{i + 1}</span>
                    <span className="text-xs text-slate-600 font-medium">{c.description}</span>
                    <span className="ml-auto text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      {c.issueType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-red-400 font-semibold mb-1">Before</p>
                      <p className="text-xs text-slate-600 bg-red-50 border border-red-100 rounded p-2 font-mono whitespace-pre-wrap leading-relaxed">
                        {c.before || '(empty)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-600 font-semibold mb-1">After</p>
                      <p className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded p-2 font-mono whitespace-pre-wrap leading-relaxed">
                        {c.after || '(empty)'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
