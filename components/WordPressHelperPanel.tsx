'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Helper Panel (V7)
// Main orchestrator for WordPress CMS detection, fix checklist, and exports.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type {
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  WordPressFixGuide,
  CMSDetectionResult,
} from '@/types/seo';
import { detectCMS }                  from '@/lib/cmsDetector';
import { buildFixQueue }              from '@/lib/fixQueueBuilder';
import { generateWordPressFixGuide }  from '@/lib/wordpressFixGuide';
import { downloadWordPressMarkdown, downloadWordPressCSV } from '@/lib/wordpressChecklistExporter';
import CMSDetectionCard               from './CMSDetectionCard';
import WordPressFixChecklist          from './WordPressFixChecklist';
import { RiskSummary }                from './WordPressRiskWarnings';

// ─── Tab type ──────────────────────────────────────────────────────────────────

type WPTab = 'detection' | 'checklist' | 'export';

// ─── Header banner ────────────────────────────────────────────────────────────

function WPHeaderBanner({
  cms,
  guide,
  onTabChange,
}: {
  cms:         CMSDetectionResult;
  guide:       WordPressFixGuide;
  onTabChange: (t: WPTab) => void;
}) {
  const isWP    = cms.isWordPress || cms.hasWooCommerce;
  const bgClass = isWP
    ? 'bg-gradient-to-r from-blue-600 to-indigo-700'
    : 'bg-gradient-to-r from-slate-600 to-slate-700';

  const seoPlugin = cms.detectedPlugins.find(p => p.category === 'seo');

  return (
    <div className={`card p-6 ${bgClass} text-white`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold mb-1">🟣 WordPress Helper Mode</h2>
          {isWP ? (
            <p className="text-blue-100 text-sm">
              {cms.cmsName} detected with {cms.confidence} confidence.
              {seoPlugin && ` Primary SEO plugin: ${seoPlugin.name}.`}
              {' '}WordPress-specific fix instructions are active for all {guide.summary.totalItems} items.
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              CMS: <strong>{cms.cmsName}</strong>. WordPress-specific instructions may not apply to this site.
              Generic fix guidance is still available.
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onTabChange('checklist')}
            className="px-4 py-2 bg-white text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors"
          >
            Open Checklist →
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { label: 'Total Items',       value: guide.summary.totalItems,            bg: 'bg-white/20' },
          { label: '✅ Safe',           value: guide.summary.safeItems,             bg: 'bg-green-500/30' },
          { label: '⚠️ Needs Review',   value: guide.summary.needsReviewItems,      bg: 'bg-yellow-500/30' },
          { label: '🚨 Req. Approval',  value: guide.summary.requiresApprovalItems, bg: 'bg-red-500/30' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.bg}`}>
            <p className="text-2xl font-extrabold leading-none">{s.value}</p>
            <p className="text-xs text-blue-100 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Export panel ─────────────────────────────────────────────────────────────

function ExportPanel({ guide }: { guide: WordPressFixGuide }) {
  const [exporting, setExporting] = useState<'md' | 'csv' | null>(null);

  const doExport = async (type: 'md' | 'csv') => {
    setExporting(type);
    try {
      if (type === 'md')  downloadWordPressMarkdown(guide);
      if (type === 'csv') downloadWordPressCSV(guide);
    } finally {
      setTimeout(() => setExporting(null), 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <h3 className="text-lg font-bold mb-1">📤 Export WordPress Checklist</h3>
        <p className="text-sm text-slate-300">
          Export the full checklist with plugin-specific steps for your client or developer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Markdown */}
        <div className="card p-6 space-y-3">
          <div>
            <h4 className="font-bold text-slate-800">📄 Markdown Report</h4>
            <p className="text-sm text-slate-500 mt-1">
              Full checklist with issue details, plugin instructions, verification steps, and risk warnings.
              Ideal for sharing with SEO strategists or developers via GitHub, Notion, or email.
            </p>
          </div>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>✓ CMS detection summary + evidence</li>
            <li>✓ All {guide.summary.totalItems} checklist items</li>
            <li>✓ Step-by-step plugin instructions</li>
            <li>✓ Risk warnings and approval requirements</li>
          </ul>
          <button
            onClick={() => doExport('md')}
            disabled={exporting !== null}
            className="btn-primary w-full"
          >
            {exporting === 'md' ? '⏳ Downloading…' : '⬇️ Download Markdown (.md)'}
          </button>
        </div>

        {/* CSV */}
        <div className="card p-6 space-y-3">
          <div>
            <h4 className="font-bold text-slate-800">📊 CSV Spreadsheet</h4>
            <p className="text-sm text-slate-500 mt-1">
              Flat table format with one row per issue. Import into Excel, Google Sheets,
              Notion, or your project management tool.
            </p>
          </div>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>✓ URL, Issue, Priority, WordPress Area</li>
            <li>✓ Likely Plugin, Risk Level, Approval Level</li>
            <li>✓ Fix steps and verification (pipe-separated)</li>
            <li>✓ Warnings and notes per row</li>
          </ul>
          <button
            onClick={() => doExport('csv')}
            disabled={exporting !== null}
            className="btn-secondary w-full"
          >
            {exporting === 'csv' ? '⏳ Downloading…' : '⬇️ Download CSV (.csv)'}
          </button>
        </div>
      </div>

      {/* Plugin breakdown */}
      {Object.keys(guide.summary.byPlugin).length > 0 && (
        <div className="card p-5">
          <h4 className="font-bold text-slate-700 mb-3">Items by Plugin</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(guide.summary.byPlugin)
              .sort(([, a], [, b]) => b - a)
              .map(([plugin, count]) => (
                <div key={plugin} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 truncate">{plugin}</span>
                  <span className="text-sm font-bold text-slate-900 flex-shrink-0">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
        ⚠️ <strong>Disclaimer:</strong> All fix recommendations are rule-based and advisory only.
        Risk levels are estimates. Always review with a qualified SEO professional before applying any change,
        particularly those rated "Requires Approval." No guarantee of search ranking improvements is expressed or implied.
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  result:      ScanResult;
  schemaAudit?: SchemaAuditResult | null;
  gscData?:    GSCDecisionSummary | null;
}

export default function WordPressHelperPanel({ result, schemaAudit, gscData }: Props) {
  const [activeTab, setActiveTab] = useState<WPTab>('detection');

  const cms = useMemo(() => detectCMS(result), [result]);

  const fixQueue = useMemo(
    () => buildFixQueue(result, schemaAudit ?? undefined, gscData ?? undefined),
    [result, schemaAudit, gscData],
  );

  const guide = useMemo(
    () => generateWordPressFixGuide(result, cms, fixQueue, schemaAudit ?? undefined, gscData ?? undefined),
    [result, cms, fixQueue, schemaAudit, gscData],
  );

  const tabs: { key: WPTab; icon: string; label: string }[] = [
    { key: 'detection', icon: '🔍', label: 'CMS Detection' },
    { key: 'checklist', icon: '📋', label: `Checklist (${guide.summary.totalItems})` },
    { key: 'export',    icon: '📤', label: 'Export' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <WPHeaderBanner cms={cms} guide={guide} onTabChange={setActiveTab} />

      {/* Risk summary */}
      <RiskSummary
        safe={guide.summary.safeItems}
        needsReview={guide.summary.needsReviewItems}
        requiresApproval={guide.summary.requiresApprovalItems}
      />

      {/* Non-WP notice */}
      {!cms.isWordPress && !cms.hasWooCommerce && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>⚠️ Note:</strong> This site does not appear to be WordPress.
          The checklist below contains generic SEO fix instructions.
          WordPress-specific plugin steps may not apply to your CMS ({cms.cmsName}).
        </div>
      )}

      {/* Tab strip */}
      <div className="flex gap-0 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'detection' && (
        <CMSDetectionCard detection={cms} />
      )}

      {activeTab === 'checklist' && (
        <WordPressFixChecklist guide={guide} />
      )}

      {activeTab === 'export' && (
        <ExportPanel guide={guide} />
      )}

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        <p>
          🟣 WordPress Helper Mode — {guide.summary.totalItems} items ·{' '}
          {cms.detectedPlugins.length} plugin{cms.detectedPlugins.length !== 1 ? 's' : ''} detected ·{' '}
          {cms.cmsName} ({cms.confidence} confidence)
        </p>
        <p className="mt-1">
          All fix instructions are rule-based. Verify each change with a qualified SEO professional.
        </p>
      </div>
    </div>
  );
}
