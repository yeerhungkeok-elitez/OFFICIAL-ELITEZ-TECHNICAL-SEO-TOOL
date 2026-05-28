'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Report Builder Panel (V5)
// Orchestrates mode selection, branding, preview, and export.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type {
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  SnapshotComparisonResult,
  WordPressFixGuide,
  ReportMode,
  ReportBrand,
  ReportExportData,
} from '@/types/seo';
import { buildFixQueue }             from '@/lib/fixQueueBuilder';
import { generateExecutiveSummary }  from '@/lib/reportExecutiveSummary';
import { buildRoadmap, buildDeveloperTasks } from '@/lib/reportRoadmapBuilder';
import ReportModeSelector            from './ReportModeSelector';
import BrandingSelector, { DEFAULT_BRANDS } from './BrandingSelector';
import ReportPreview                 from './ReportPreview';
import ActionRoadmap                 from './ActionRoadmap';
import DeveloperTaskList             from './DeveloperTaskList';
import ExportPDFButton               from './ExportPDFButton';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  result:           ScanResult;
  schemaAudit?:     SchemaAuditResult | null;
  gscData?:         GSCDecisionSummary | null;
  comparison?:      SnapshotComparisonResult | null;
  wordpressGuide?:  WordPressFixGuide | null;
}

type PreviewTab = 'summary' | 'roadmap' | 'tasks';

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ReportBuilderPanel({ result, schemaAudit, gscData, comparison, wordpressGuide }: Props) {
  const [mode,        setMode]       = useState<ReportMode>('client-summary');
  const [brand,       setBrand]      = useState<ReportBrand>({
    ...DEFAULT_BRANDS.elitez,
    websiteUrl:  result.startUrl,
    clientName:  '',
  });
  const [activeTab,   setActiveTab]  = useState<PreviewTab>('summary');
  const [settingsOpen, setSettingsOpen] = useState(true);

  // ── Compute derived data (memo for perf) ─────────────────────────────────
  const fixQueue = useMemo(
    () => buildFixQueue(result, schemaAudit ?? undefined, gscData ?? undefined),
    [result, schemaAudit, gscData],
  );

  const executiveSummary = useMemo(
    () => generateExecutiveSummary(result, fixQueue, schemaAudit, gscData),
    [result, fixQueue, schemaAudit, gscData],
  );

  const roadmap = useMemo(() => buildRoadmap(fixQueue), [fixQueue]);

  const developerTasks = useMemo(() => buildDeveloperTasks(fixQueue), [fixQueue]);

  const exportData: ReportExportData = useMemo(() => ({
    settings:        { mode, brand: { ...brand, websiteUrl: brand.websiteUrl || result.startUrl } },
    executiveSummary,
    roadmap,
    developerTasks,
    result,
    schemaAudit:     schemaAudit ?? null,
    gscData:         gscData ?? null,
    fixQueue,
    comparison:      comparison ?? null,
    wordpressGuide:  wordpressGuide ?? null,
  }), [mode, brand, result, schemaAudit, gscData, comparison, wordpressGuide, executiveSummary, roadmap, developerTasks, fixQueue]);

  const filename = `seo-report-${result.domain.replace(/\./g, '-')}-${new Date().toISOString().slice(0, 10)}`;

  const previewTabs: { key: PreviewTab; label: string; icon: string }[] = [
    { key: 'summary',  label: 'Summary Preview', icon: '📄' },
    { key: 'roadmap',  label: '30-Day Roadmap',  icon: '🗓' },
    { key: 'tasks',    label: `Dev Tasks (${developerTasks.length})`, icon: '🛠' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="card p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold mb-1">📋 Report Builder</h2>
            <p className="text-sm text-slate-300">
              Build a professional PDF, Markdown, or CSV report from your audit data.
              Choose the report mode, set branding, preview, then export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
              {result.summary.totalPages} pages
            </span>
            {schemaAudit && (
              <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
                Schema: {schemaAudit.score.overall}/100
              </span>
            )}
            {gscData && gscData.records.length > 0 && (
              <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
                GSC: {gscData.summary.totalUrls} URLs
              </span>
            )}
            <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
              {fixQueue.length} fixes queued
            </span>
          </div>
        </div>
      </div>

      {/* ── Comparison data notice ── */}
      {comparison && (
        <div className="card p-4 bg-indigo-50 border border-indigo-200">
          <p className="text-sm text-indigo-800 font-medium mb-1">📊 Comparison data included</p>
          <p className="text-xs text-indigo-700 leading-relaxed">
            A before/after comparison between{' '}
            <strong>{comparison.beforeSnapshot.name}</strong> and{' '}
            <strong>{comparison.afterSnapshot.name}</strong> will be included in exported reports.
            Score change: {comparison.scoreImprovement > 0 ? '+' : ''}{comparison.scoreImprovement} pts ·{' '}
            {comparison.resolvedCount} resolved · {comparison.newCount} new issues.
          </p>
        </div>
      )}

      {/* ── WordPress data notice ── */}
      {wordpressGuide && (
        <div className="card p-4 bg-purple-50 border border-purple-200">
          <p className="text-sm text-purple-800 font-medium mb-1">🟣 WordPress checklist included</p>
          <p className="text-xs text-purple-700 leading-relaxed">
            WordPress Helper data ({wordpressGuide.detectedCMS.cmsName} · {wordpressGuide.summary.totalItems} items) will be appended to exported reports.
            Safe: {wordpressGuide.summary.safeItems} · Needs Review: {wordpressGuide.summary.needsReviewItems} · Requires Approval: {wordpressGuide.summary.requiresApprovalItems}.
          </p>
        </div>
      )}

      {/* ── Data availability notice ── */}
      {(!schemaAudit || !gscData || gscData.records.length === 0) && (
        <div className="card p-4 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-medium mb-1">💡 Optional data not loaded</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            {!schemaAudit && '• Schema Audit data not available — re-scan to include it. '}
            {(!gscData || gscData.records.length === 0) && '• GSC data not imported — go to the GSC Import tab to add it. '}
            Reports can be generated without this data, but will include fewer insights.
          </p>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

        {/* ── LEFT: Settings Panel ── */}
        <div className="space-y-4">

          {/* Settings accordion toggle on small screens */}
          <div className="xl:hidden">
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="w-full card p-4 flex items-center justify-between text-sm font-bold text-slate-700"
            >
              <span>⚙️ Report Settings</span>
              <span>{settingsOpen ? '▲' : '▼'}</span>
            </button>
          </div>

          <div className={`space-y-4 ${!settingsOpen ? 'hidden xl:block' : ''}`}>

            {/* Report Mode */}
            <div className="card p-5">
              <p className="text-sm font-bold text-slate-700 mb-3">1. Report Mode</p>
              <ReportModeSelector value={mode} onChange={setMode} />
            </div>

            {/* Branding */}
            <div className="card p-5">
              <p className="text-sm font-bold text-slate-700 mb-3">2. Branding & Client Info</p>
              <BrandingSelector
                value={brand}
                onChange={setBrand}
                domain={result.domain}
              />
            </div>

            {/* Export */}
            <div className="card p-5">
              <p className="text-sm font-bold text-slate-700 mb-3">3. Export</p>
              <ExportPDFButton data={exportData} filename={filename} />
            </div>

          </div>
        </div>

        {/* ── RIGHT: Preview Panel ── */}
        <div className="space-y-4">

          {/* Preview tabs */}
          <div className="card p-1 flex gap-1 overflow-x-auto">
            {previewTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                style={activeTab === t.key ? { backgroundColor: brand.primaryColor } : {}}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'summary' && (
            <ReportPreview data={exportData} />
          )}

          {activeTab === 'roadmap' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">🗓 30-Day Action Roadmap</h3>
                <span className="text-xs text-slate-400">
                  {roadmap.reduce((n, w) => n + w.tasks.length, 0)} total tasks
                </span>
              </div>
              <ActionRoadmap roadmap={roadmap} />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-slate-800">🛠 Developer Task List</h3>
                <div className="flex gap-2 text-xs">
                  <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                    {developerTasks.filter(t => t.priority === 'critical').length} critical
                  </span>
                  <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                    {developerTasks.filter(t => t.priority === 'high').length} high
                  </span>
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                    {developerTasks.filter(t => t.approvalLevel === 'safe').length} safe
                  </span>
                </div>
              </div>
              <DeveloperTaskList tasks={developerTasks} />
            </div>
          )}

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Issues',      value: fixQueue.length,                                         color: 'text-slate-700' },
              { label: 'Critical',          value: executiveSummary.criticalIssues,                         color: 'text-red-600'   },
              { label: 'Safe Fixes',        value: fixQueue.filter(i => i.approvalLevel === 'safe').length, color: 'text-green-600' },
              { label: 'Dev Tasks',         value: developerTasks.filter(t => t.approvalLevel === 'needs-developer').length, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="card p-3 text-center">
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        <p>
          📋 Report Builder V5 — {mode === 'client-summary' ? 'Client Summary' : mode === 'developer-fix-plan' ? 'Developer Fix Plan' : 'Full Technical Audit'}
          {' · '}{brand.brandName}{' · '}{result.domain}
        </p>
        <p className="mt-1 text-slate-300 italic">
          All reports include disclaimer: "Google indexing and ranking outcomes are not guaranteed."
        </p>
      </div>
    </div>
  );
}
