'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Fix Checklist (V7)
// Filterable checklist of WordPress-specific fix instructions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { WordPressChecklistItem, WordPressFixGuide, IssueSeverity } from '@/types/seo';
import PluginInstructionTabs      from './PluginInstructionTabs';
import { WarningList, RiskBadge } from './WordPressRiskWarnings';

// ─── Priority colours ─────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<IssueSeverity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-400',
};

const PRIORITY_BADGE: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-blue-100 text-blue-700 border-blue-200',
};

const SOURCE_COLOUR: Record<string, string> = {
  'fix-queue':  'bg-blue-50 text-blue-700',
  'seo':        'bg-teal-50 text-teal-700',
  'schema':     'bg-purple-50 text-purple-700',
  'gsc':        'bg-indigo-50 text-indigo-700',
};

// ─── Expanded item detail ─────────────────────────────────────────────────────

function ChecklistItemDetail({ item }: { item: WordPressChecklistItem }) {
  return (
    <div className="border-t border-slate-100 pt-4 space-y-4">

      {/* Risk warnings */}
      {item.warnings.length > 0 && (
        <WarningList warnings={item.warnings} />
      )}

      {/* Notes */}
      {item.notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
          📝 {item.notes}
        </div>
      )}

      {/* Area + plugin info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-500 mb-1">WordPress Area</p>
          <p className="text-sm font-semibold text-slate-800">{item.wordpressArea}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-500 mb-1">Likely Plugin</p>
          <p className="text-sm font-semibold text-slate-800">{item.likelyPlugin}</p>
        </div>
      </div>

      {/* Plugin instruction tabs */}
      {item.pluginInstructions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-700 mb-2">🔧 Plugin-Specific Instructions</p>
          <PluginInstructionTabs instructions={item.pluginInstructions} />
        </div>
      )}

      {/* Fallback generic steps if no plugin instructions */}
      {item.pluginInstructions.length === 0 && item.fixSteps.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-700 mb-2">🔧 Fix Steps</p>
          <ol className="space-y-2">
            {item.fixSteps.map(step => (
              <li key={step.stepNumber} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                  {step.stepNumber}
                </span>
                <span>{step.instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Verification steps */}
      {item.verificationSteps.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs font-bold text-green-700 mb-1.5">✅ Verification</p>
          <ol className="space-y-1">
            {item.verificationSteps.map((v, i) => (
              <li key={i} className="text-xs text-green-800 flex items-start gap-2">
                <span className="font-bold flex-shrink-0">{i + 1}.</span>
                <span>{v}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Single checklist card ────────────────────────────────────────────────────

function ChecklistCard({ item, forceExpand }: { item: WordPressChecklistItem; forceExpand: boolean }) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  let path = item.url;
  try { path = new URL(item.url).pathname || '/'; } catch { /* keep full url */ }

  return (
    <div className={`card border transition-all ${
      item.priority === 'critical' ? 'border-red-200 bg-red-50/30' :
      item.priority === 'high'     ? 'border-orange-200 bg-orange-50/20' :
      'border-slate-200 bg-white'
    }`}>
      <button className="w-full text-left p-4" onClick={() => setLocalExpanded(e => !e)}>
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[item.priority]}`}>
                {item.priority.toUpperCase()}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLOUR[item.source] ?? 'bg-slate-100 text-slate-600'}`}>
                {item.source}
              </span>
              <RiskBadge riskLevel={item.riskLevel} />
              {item.warnings.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  ⚠️ {item.warnings.length} warning{item.warnings.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800">{item.issueType}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{path}</p>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-600">{item.wordpressArea}</span>
              {' · '}
              {item.likelyPlugin}
            </p>
          </div>
          <div className="flex-shrink-0 text-slate-400 text-lg">{expanded ? '▲' : '▼'}</div>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 ml-5">
          <ChecklistItemDetail item={item} />
        </div>
      )}
    </div>
  );
}

// ─── Main checklist component ─────────────────────────────────────────────────

interface Props {
  guide: WordPressFixGuide;
}

type RiskFilter     = 'all' | 'safe' | 'needs-review' | 'requires-approval';
type PriorityFilter = IssueSeverity | 'all';

export default function WordPressFixChecklist({ guide }: Props) {
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all');
  const [filterRisk,     setFilterRisk]     = useState<RiskFilter>('all');
  const [filterPlugin,   setFilterPlugin]   = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [expandAll,      setExpandAll]      = useState(false);

  // Unique plugin list
  const pluginOptions = useMemo(() => {
    const set = new Set<string>();
    guide.checklistItems.forEach(item => set.add(item.likelyPlugin));
    return Array.from(set).sort();
  }, [guide.checklistItems]);

  const filtered = useMemo(() => {
    let items = guide.checklistItems;
    if (filterPriority !== 'all') items = items.filter(i => i.priority === filterPriority);
    if (filterRisk !== 'all')     items = items.filter(i => i.riskLevel === filterRisk);
    if (filterPlugin !== 'all')   items = items.filter(i => i.likelyPlugin === filterPlugin);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.url.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.wordpressArea.toLowerCase().includes(q) ||
        i.likelyPlugin.toLowerCase().includes(q),
      );
    }
    return items;
  }, [guide.checklistItems, filterPriority, filterRisk, filterPlugin, searchQuery]);

  const hasFilters = filterPriority !== 'all' || filterRisk !== 'all' || filterPlugin !== 'all' || searchQuery.trim();

  const clearFilters = () => {
    setFilterPriority('all');
    setFilterRisk('all');
    setFilterPlugin('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by URL, issue, plugin…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as PriorityFilter)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>

          <select
            value={filterRisk}
            onChange={e => setFilterRisk(e.target.value as RiskFilter)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All risk levels</option>
            <option value="safe">✅ Safe</option>
            <option value="needs-review">⚠️ Needs Review</option>
            <option value="requires-approval">🚨 Requires Approval</option>
          </select>

          <select
            value={filterPlugin}
            onChange={e => setFilterPlugin(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All plugins</option>
            {pluginOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-700 underline">
              Clear filters
            </button>
          )}

          <button
            onClick={() => setExpandAll(e => !e)}
            className="btn-secondary text-sm ml-auto"
          >
            {expandAll ? '▲ Collapse All' : '▼ Expand All'}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Showing {filtered.length} of {guide.checklistItems.length} items
          {filtered.length !== guide.checklistItems.length && (
            <span className="ml-1 text-blue-500">({guide.checklistItems.length - filtered.length} filtered)</span>
          )}
        </p>
      </div>

      {/* Empty states */}
      {guide.checklistItems.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-slate-600 font-semibold">No WordPress fix items found.</p>
          <p className="text-sm text-slate-400 mt-1">Run a full crawl with a populated fix queue to generate items.</p>
        </div>
      )}

      {filtered.length === 0 && guide.checklistItems.length > 0 && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-500">No items match your current filters.</p>
          <button onClick={clearFilters} className="mt-3 btn-secondary text-sm">
            Clear filters
          </button>
        </div>
      )}

      {/* Checklist items */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => (
            <ChecklistCard key={item.id} item={item} forceExpand={expandAll} />
          ))}
        </div>
      )}
    </div>
  );
}
