'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Fix Queue Panel (V4)
// Displays the prioritised list of SEO fix-queue items with full suggestions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type {
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  FixQueueItem,
  FixSuggestion,
  FixType,
  FixApprovalLevel,
  IssueSeverity,
  FixSource,
} from '@/types/seo';
import { buildFixQueue, getQueueStats }    from '@/lib/fixQueueBuilder';
import { generateFix }                     from '@/lib/fixWriter';
import { suggestInternalLinks }            from '@/lib/internalLinkSuggester';
import { getWordPressStepsForItem }        from '@/lib/wordpressFixGuide';
import PluginInstructionTabs              from './PluginInstructionTabs';
import { RiskBadge, WarningList }         from './WordPressRiskWarnings';

// ─── Colour maps ──────────────────────────────────────────────────────────────

const PRIORITY_COLOUR: Record<IssueSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-blue-100 text-blue-700 border-blue-200',
};
const PRIORITY_DOT: Record<IssueSeverity, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-400',
};
const APPROVAL_COLOUR: Record<FixApprovalLevel, string> = {
  'safe':             'bg-green-50 text-green-700 border-green-200',
  'needs-review':     'bg-yellow-50 text-yellow-700 border-yellow-200',
  'needs-developer':  'bg-red-50 text-red-700 border-red-200',
};
const SOURCE_COLOUR: Record<FixSource, string> = {
  'page-analysis': 'bg-blue-50 text-blue-700',
  'schema-audit':  'bg-purple-50 text-purple-700',
  'gsc':           'bg-indigo-50 text-indigo-700',
  'seo-crawl':     'bg-teal-50 text-teal-700',
};
const SOURCE_LABEL: Record<FixSource, string> = {
  'page-analysis': 'SEO Crawl',
  'schema-audit':  'Schema',
  'gsc':           'GSC',
  'seo-crawl':     'Crawl',
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select a textarea
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
    >
      {copied ? '✅ Copied!' : `📋 ${label}`}
    </button>
  );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ label, code, variant = 'neutral' }: {
  label: string; code: string; variant?: 'before' | 'after' | 'neutral';
}) {
  const bg =
    variant === 'before'  ? 'bg-red-50   border-red-100'   :
    variant === 'after'   ? 'bg-green-50 border-green-100' :
    'bg-slate-50 border-slate-200';
  const prefix =
    variant === 'before' ? '- ' :
    variant === 'after'  ? '+ ' : '';
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <pre className={`text-xs rounded-lg border p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed ${bg}`}>
        {prefix}{code}
      </pre>
    </div>
  );
}

// ─── Fix Detail Panel ─────────────────────────────────────────────────────────

function FixDetail({ item, allPages }: { item: FixQueueItem; allPages: ScanResult['pages'] }) {
  const [activeView, setActiveView] = useState<'fix' | 'links' | 'prompt' | 'wp-steps'>('fix');
  const fix = useMemo(() => generateFix(item), [item]);
  const linkResult = useMemo(
    () => item.fixType === 'Internal Links' ? suggestInternalLinks(item, allPages) : null,
    [item, allPages],
  );
  const wpSteps = useMemo(() => getWordPressStepsForItem(item), [item]);

  const views = [
    { key: 'fix'      as const, label: '🔧 Fix Details' },
    ...(linkResult ? [{ key: 'links' as const, label: '🔗 Link Map' }] : []),
    { key: 'prompt'   as const, label: '🤖 AI Prompt' },
    { key: 'wp-steps' as const, label: '🟣 WP Steps' },
  ];

  return (
    <div className="border-t border-slate-100 pt-4 space-y-4">
      {/* View tabs */}
      <div className="flex gap-1 border-b border-slate-100 pb-3">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              activeView === v.key
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {v.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <CopyButton text={fix.suggestedValue} label="Copy Value" />
          <CopyButton text={fix.claudePrompt}   label="Copy AI Prompt" />
        </div>
      </div>

      {/* Fix view */}
      {activeView === 'fix' && (
        <div className="space-y-4">

          {/* Suggested value */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 mb-2">💡 Suggested Fix</p>
            <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">{fix.suggestedValue}</p>
          </div>

          {/* Rationale */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Why this fix?</p>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{fix.rationale}</p>
          </div>

          {/* Risk warning */}
          {fix.riskWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
              {fix.riskWarning}
            </div>
          )}

          {/* Before / After code */}
          {(fix.beforeCode || fix.afterCode) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fix.beforeCode && <CodeBlock label="Before" code={fix.beforeCode} variant="before" />}
              {fix.afterCode  && <CodeBlock label="After"  code={fix.afterCode}  variant="after" />}
            </div>
          )}

          {/* Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fix.wordpressInstruction && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-700 mb-2">🟣 WordPress Instructions</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{fix.wordpressInstruction}</p>
              </div>
            )}
            {fix.developerInstruction && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">👨‍💻 Developer Instructions</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">{fix.developerInstruction}</p>
              </div>
            )}
          </div>

          {/* Confidence + Approval badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${APPROVAL_COLOUR[fix.approvalLevel]}`}>
              {fix.approvalLevel === 'safe'
                ? '✅ Safe to implement'
                : fix.approvalLevel === 'needs-review'
                  ? '👁 Needs review first'
                  : '🛠 Needs developer'}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              fix.confidence === 'high'   ? 'bg-green-100 text-green-700' :
              fix.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-slate-100 text-slate-500'
            }`}>
              Confidence: {fix.confidence}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
              Rule-based
            </span>
          </div>
        </div>
      )}

      {/* Internal link map */}
      {activeView === 'links' && linkResult && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{linkResult.rationale}</p>

          {linkResult.inbound.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">
                ⬇️ Pages that should link TO this page ({linkResult.inbound.length})
              </p>
              <div className="space-y-2">
                {linkResult.inbound.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 text-xs">
                    <span className="text-green-600 font-bold mt-0.5">{s.score}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{s.fromTitle}</p>
                      <p className="text-slate-400 truncate">{s.fromUrl}</p>
                      <p className="text-slate-500 mt-0.5">{s.rationale}</p>
                      <p className="text-blue-600 mt-1">Anchor: "{s.anchorText}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkResult.outbound.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">
                ⬆️ Pages this page should link OUT TO ({linkResult.outbound.length})
              </p>
              <div className="space-y-2">
                {linkResult.outbound.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 text-xs">
                    <span className="text-blue-600 font-bold mt-0.5">{s.score}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{s.toTitle}</p>
                      <p className="text-slate-400 truncate">{s.toUrl}</p>
                      <p className="text-slate-500 mt-0.5">{s.rationale}</p>
                      <p className="text-blue-600 mt-1">Anchor: "{s.anchorText}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkResult.inbound.length === 0 && linkResult.outbound.length === 0 && (
            <p className="text-sm text-slate-400 italic">No link suggestions found for this page based on URL/title overlap.</p>
          )}
        </div>
      )}

      {/* AI Prompt view */}
      {activeView === 'prompt' && (
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-96">
            <pre className="text-xs text-green-300 whitespace-pre-wrap font-mono leading-relaxed">
              {fix.claudePrompt}
            </pre>
          </div>
          <p className="text-xs text-slate-400">
            Copy this prompt and paste into{' '}
            <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              claude.ai
            </a>{' '}
            to generate AI-written content for this fix.
          </p>
          <CopyButton text={fix.claudePrompt} label="Copy Full Prompt" />
        </div>
      )}

      {/* WP Steps view */}
      {activeView === 'wp-steps' && (
        <div className="space-y-4">
          {/* Area + plugin badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-0.5">WordPress Area</p>
              <p className="text-sm font-semibold text-slate-800">{wpSteps.wordpressArea}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500 mb-0.5">Likely Plugin</p>
              <p className="text-sm font-semibold text-slate-800">{wpSteps.likelyPlugin}</p>
            </div>
          </div>

          {/* Risk level */}
          <div className="flex items-center gap-3 flex-wrap">
            <RiskBadge riskLevel={wpSteps.riskLevel} size="sm" />
            <span className="text-xs text-slate-500">{wpSteps.notes}</span>
          </div>

          {/* Warnings */}
          {wpSteps.warnings.length > 0 && (
            <WarningList warnings={wpSteps.warnings} />
          )}

          {/* Plugin instruction tabs */}
          {wpSteps.pluginInstructions.length > 0 ? (
            <PluginInstructionTabs instructions={wpSteps.pluginInstructions} />
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
              No plugin-specific WordPress steps found for this fix type.
              Check the Fix Details tab for generic instructions.
            </div>
          )}

          {/* Verification */}
          {wpSteps.verificationSteps.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-bold text-green-700 mb-2">✅ Verification Steps</p>
              <ol className="space-y-1">
                {wpSteps.verificationSteps.map((v, i) => (
                  <li key={i} className="text-xs text-green-800 flex items-start gap-2">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-xs text-slate-400">
            🟣 WordPress-specific steps. For the full checklist with all pages, visit the <strong>WordPress Helper</strong> tab.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Fix Queue Item Card ──────────────────────────────────────────────────────

function FixItemCard({ item, allPages }: { item: FixQueueItem; allPages: ScanResult['pages'] }) {
  const [expanded, setExpanded] = useState(false);

  let domain = '';
  try { domain = new URL(item.url).hostname; } catch { domain = item.url; }
  const path = item.url.replace(/^https?:\/\/[^/]+/, '') || '/';

  return (
    <div className={`card border transition-all ${
      item.priority === 'critical' ? 'border-red-200 bg-red-50/30' :
      item.priority === 'high'     ? 'border-orange-200 bg-orange-50/20' :
      'border-slate-200 bg-white'
    }`}>
      {/* Header row */}
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Priority dot */}
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLOUR[item.priority]}`}>
                {item.priority.toUpperCase()}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLOUR[item.source]}`}>
                {SOURCE_LABEL[item.source]}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {item.fixType}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${APPROVAL_COLOUR[item.approvalLevel]}`}>
                {item.approvalLevel === 'safe' ? '✅ Safe' :
                 item.approvalLevel === 'needs-review' ? '👁 Review' : '🛠 Dev'}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 leading-tight">{item.issueType}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {path} <span className="text-slate-300">·</span> {item.pageIntent}
            </p>

            {item.currentValue && item.currentValue !== '(missing)' && (
              <p className="text-xs text-slate-400 italic mt-1 truncate">
                Current: "{item.currentValue.substring(0, 80)}{item.currentValue.length > 80 ? '…' : ''}"
              </p>
            )}
          </div>

          {/* Expand icon */}
          <div className="flex-shrink-0 text-slate-400 text-lg leading-none mt-0.5">
            {expanded ? '▲' : '▼'}
          </div>
        </div>

        {/* Suggested action preview */}
        {!expanded && (
          <p className="text-xs text-slate-500 mt-2 ml-5 leading-relaxed">
            → {item.suggestedAction}
          </p>
        )}
      </button>

      {/* Expanded fix detail */}
      {expanded && (
        <div className="px-4 pb-4 ml-5">
          <FixDetail item={item} allPages={allPages} />
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: FixQueueItem[] }) {
  const stats = getQueueStats(items);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {[
        { label: 'Total',      value: stats.total,    colour: 'text-slate-700', bg: 'bg-slate-50  border-slate-200' },
        { label: 'Critical',   value: stats.critical, colour: 'text-red-700',   bg: 'bg-red-50    border-red-100'   },
        { label: 'High',       value: stats.high,     colour: 'text-orange-700',bg: 'bg-orange-50 border-orange-100' },
        { label: 'Medium',     value: stats.medium,   colour: 'text-yellow-700',bg: 'bg-yellow-50 border-yellow-100' },
        { label: 'Low',        value: stats.low,      colour: 'text-blue-700',  bg: 'bg-blue-50   border-blue-100'  },
        { label: 'Safe fixes', value: stats.safe,     colour: 'text-green-700', bg: 'bg-green-50  border-green-100' },
        { label: 'Need dev',   value: stats.developer,colour: 'text-red-700',   bg: 'bg-red-50    border-red-100'   },
      ].map(s => (
        <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
          <p className={`text-2xl font-extrabold leading-none ${s.colour}`}>{s.value}</p>
          <p className="text-xs text-slate-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  result:      ScanResult;
  schemaAudit?: SchemaAuditResult;
  gscData?:    GSCDecisionSummary | null;
}

const FIX_TYPE_OPTIONS: FixType[] = [
  'SEO Title', 'Meta Description', 'H1', 'Heading Structure',
  'FAQ Content', 'FAQPage Schema', 'Service Schema', 'Article Schema',
  'Organization Schema', 'Breadcrumb Schema',
  'Internal Links', 'Image Alt Text', 'Canonical', 'Noindex',
  'Robots.txt', 'Redirect', 'Sitemap',
];

export default function FixQueuePanel({ result, schemaAudit, gscData }: Props) {
  const allItems = useMemo(
    () => buildFixQueue(result, schemaAudit ?? undefined, gscData ?? undefined),
    [result, schemaAudit, gscData],
  );

  const [filterPriority, setFilterPriority]   = useState<IssueSeverity | 'all'>('all');
  const [filterApproval, setFilterApproval]   = useState<FixApprovalLevel | 'all'>('all');
  const [filterSource,   setFilterSource]     = useState<FixSource | 'all'>('all');
  const [filterFixType,  setFilterFixType]    = useState<FixType | 'all'>('all');
  const [searchQuery,    setSearchQuery]      = useState('');
  const [expandAll,      setExpandAll]        = useState(false);

  const filtered = useMemo(() => {
    let items = allItems;
    if (filterPriority !== 'all') items = items.filter(i => i.priority === filterPriority);
    if (filterApproval !== 'all') items = items.filter(i => i.approvalLevel === filterApproval);
    if (filterSource   !== 'all') items = items.filter(i => i.source === filterSource);
    if (filterFixType  !== 'all') items = items.filter(i => i.fixType === filterFixType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        i.url.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.fixType.toLowerCase().includes(q) ||
        i.pageIntent.toLowerCase().includes(q),
      );
    }
    return items;
  }, [allItems, filterPriority, filterApproval, filterSource, filterFixType, searchQuery]);

  const hasGSC = !!gscData && gscData.records.length > 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">🔧 AI Fix Queue</h2>
            <p className="text-sm text-slate-600">
              Prioritised list of SEO issues with ready-to-implement fixes, WordPress instructions, and AI prompts.
              {!hasGSC && (
                <span className="ml-2 text-amber-600 font-medium">
                  💡 Import GSC data for additional URL indexing issues.
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setExpandAll(e => !e)}
              className="btn-secondary text-sm"
            >
              {expandAll ? '▲ Collapse All' : '▼ Expand All'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar items={allItems} />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by URL, issue type, fix type…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as IssueSeverity | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All priorities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>

          <select
            value={filterApproval}
            onChange={e => setFilterApproval(e.target.value as FixApprovalLevel | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All approvals</option>
            <option value="safe">✅ Safe fixes</option>
            <option value="needs-review">👁 Needs review</option>
            <option value="needs-developer">🛠 Needs developer</option>
          </select>

          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value as FixSource | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All sources</option>
            <option value="page-analysis">SEO Crawl</option>
            <option value="schema-audit">Schema Audit</option>
            <option value="gsc">GSC Import</option>
          </select>

          <select
            value={filterFixType}
            onChange={e => setFilterFixType(e.target.value as FixType | 'all')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="all">All fix types</option>
            {FIX_TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {(filterPriority !== 'all' || filterApproval !== 'all' || filterSource !== 'all' || filterFixType !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterPriority('all');
                setFilterApproval('all');
                setFilterSource('all');
                setFilterFixType('all');
                setSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Showing {filtered.length} of {allItems.length} items
          {filtered.length !== allItems.length && (
            <span className="ml-1 text-blue-500">
              ({allItems.length - filtered.length} filtered out)
            </span>
          )}
        </p>
      </div>

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No issues found!</h3>
          <p className="text-slate-500">
            All crawled pages appear to meet basic SEO standards.
          </p>
        </div>
      )}

      {filtered.length === 0 && allItems.length > 0 && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-500">No items match your current filters.</p>
          <button
            onClick={() => {
              setFilterPriority('all'); setFilterApproval('all');
              setFilterSource('all');  setFilterFixType('all'); setSearchQuery('');
            }}
            className="mt-3 btn-secondary text-sm"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Fix list */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => (
            <FixItemCardControlled
              key={item.id}
              item={item}
              allPages={result.pages}
              forceExpand={expandAll}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        <p>
          🔧 Fix Queue — {allItems.length} issues · {getQueueStats(allItems).safe} safe to implement immediately
          {hasGSC && ` · includes ${gscData!.summary.actionRequiredCount} GSC action items`}
        </p>
        <p className="mt-1">
          All fix suggestions are rule-based. Use the AI Prompt view to generate copy with Claude.
        </p>
      </div>
    </div>
  );
}

// Wrapper that respects forceExpand
function FixItemCardControlled({
  item, allPages, forceExpand,
}: {
  item: FixQueueItem;
  allPages: ScanResult['pages'];
  forceExpand: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  let path = item.url.replace(/^https?:\/\/[^/]+/, '') || '/';

  return (
    <div className={`card border transition-all ${
      item.priority === 'critical' ? 'border-red-200 bg-red-50/30' :
      item.priority === 'high'     ? 'border-orange-200 bg-orange-50/20' :
      'border-slate-200 bg-white'
    }`}>
      <button
        className="w-full text-left p-4"
        onClick={() => setLocalExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[item.priority]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLOUR[item.priority]}`}>
                {item.priority.toUpperCase()}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOURCE_COLOUR[item.source]}`}>
                {SOURCE_LABEL[item.source]}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {item.fixType}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${APPROVAL_COLOUR[item.approvalLevel]}`}>
                {item.approvalLevel === 'safe' ? '✅ Safe' :
                 item.approvalLevel === 'needs-review' ? '👁 Review' : '🛠 Dev'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{item.issueType}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {path} <span className="text-slate-300">·</span> {item.pageIntent}
            </p>
            {item.currentValue && item.currentValue !== '(missing)' && (
              <p className="text-xs text-slate-400 italic mt-1 truncate">
                Current: &ldquo;{item.currentValue.substring(0, 80)}{item.currentValue.length > 80 ? '…' : ''}&rdquo;
              </p>
            )}
          </div>
          <div className="flex-shrink-0 text-slate-400 text-lg leading-none mt-0.5">
            {expanded ? '▲' : '▼'}
          </div>
        </div>
        {!expanded && (
          <p className="text-xs text-slate-500 mt-2 ml-5 leading-relaxed">
            → {item.suggestedAction}
          </p>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 ml-5">
          <FixDetail item={item} allPages={allPages} />
        </div>
      )}
    </div>
  );
}
