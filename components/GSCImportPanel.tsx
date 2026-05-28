'use client';

import { useState, useCallback, useRef } from 'react';
import type { PageData, GSCDecisionSummary, SchemaAuditResult } from '@/types/seo';
import { parseGSCFile }     from '@/lib/gscParser';
import { matchGSCRecords, buildGSCSummary } from '@/lib/gscMatcher';
import { downloadGSCMarkdown, downloadGSCCSV } from '@/lib/gscExporter';
import GSCSummaryCards from './GSCSummaryCards';
import GSCActionTable  from './GSCActionTable';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  pages:        PageData[];
  schemaAudit?: SchemaAuditResult;
  onGSCLoaded?: (data: GSCDecisionSummary | null) => void;
}

// ─── Upload drop zone ─────────────────────────────────────────────────────────

function DropZone({
  onFile,
  isProcessing,
}: {
  onFile: (file: File) => void;
  isProcessing: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer select-none
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
        }
        ${isProcessing ? 'cursor-wait opacity-60' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {isProcessing ? (
        <>
          <div className="text-5xl mb-4 animate-spin inline-block">⚙️</div>
          <p className="text-lg font-semibold text-slate-700">Processing file…</p>
          <p className="text-sm text-slate-400 mt-1">Parsing URLs and running indexing analysis</p>
        </>
      ) : (
        <>
          <div className="text-6xl mb-5">📊</div>
          <p className="text-xl font-bold text-slate-800 mb-2">
            Drop your GSC export here
          </p>
          <p className="text-sm text-slate-500 mb-5">
            or <span className="text-blue-600 font-semibold underline">click to browse</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500 mb-6">
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">.xlsx</span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">.xls</span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">.csv</span>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-lg mx-auto text-left">
            <p className="text-xs font-semibold text-blue-700 mb-2">📖 How to export from Google Search Console:</p>
            <ol className="text-xs text-slate-600 space-y-1">
              <li>1. Go to <strong>Google Search Console</strong> → <strong>Indexing</strong> → <strong>Pages</strong></li>
              <li>2. Select any status tab (e.g. <em>Not indexed</em>, <em>All</em>)</li>
              <li>3. Click the <strong>Export</strong> button (top right) → <strong>Download Excel</strong></li>
              <li>4. Upload the downloaded .xlsx file here</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

// ─── GSC Import Panel ─────────────────────────────────────────────────────────

export default function GSCImportPanel({ pages, schemaAudit, onGSCLoaded }: Props) {
  const [gscData,      setGscData]      = useState<GSCDecisionSummary | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName,     setFileName]     = useState('');
  const [parseInfo,    setParseInfo]    = useState<{
    sheetName: string; rowCount: number; detectedColumns: Record<string, string>;
  } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const { records, sheetName, rowCount, detectedColumns } = await parseGSCFile(buffer, file.name);

      const matched  = matchGSCRecords(records, pages);
      const summary  = buildGSCSummary(matched);

      setParseInfo({ sheetName, rowCount, detectedColumns });
      const newGscData = {
        records:    matched,
        summary,
        importedAt: new Date().toISOString(),
        fileName:   file.name,
      };
      setGscData(newGscData);
      onGSCLoaded?.(newGscData);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to parse file.');
    } finally {
      setIsProcessing(false);
    }
  }, [pages]);

  const handleReset = () => {
    setGscData(null);
    onGSCLoaded?.(null);
    setError(null);
    setFileName('');
    setParseInfo(null);
  };

  // ── Upload state ──────────────────────────────────────────────────────
  if (!gscData) {
    return (
      <div className="space-y-6">
        {/* Intro card */}
        <div className="card p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
          <div className="flex flex-wrap items-start gap-4">
            <div className="text-4xl">📊</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                Google Search Console Import
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Upload your GSC Coverage or Indexing report to get clear, actionable decisions for
                every URL — matched against your crawl data. The tool tells you exactly what to fix,
                what to leave alone, and what needs developer attention.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                  🔍 Matches GSC URLs to crawl data
                </span>
                <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                  🎯 Assigns clear indexing decisions
                </span>
                <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                  📋 Exports Markdown + CSV fix plans
                </span>
                <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
                  🔒 All processing done locally — data never leaves your browser
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* No crawl data warning */}
        {pages.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">⚠️ No crawl data available</p>
            <p className="text-sm text-amber-700 mt-1">
              Run a crawl first for best results. You can still import GSC data — decisions will be
              based on GSC status alone without page-level data.
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">❌ File parsing error</p>
            <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-3 text-xs text-red-600 hover:text-red-800 font-semibold underline"
            >
              Try another file
            </button>
          </div>
        )}

        <DropZone onFile={handleFile} isProcessing={isProcessing} />
      </div>
    );
  }

  // ── Results state ─────────────────────────────────────────────────────
  const { records, summary } = gscData;

  return (
    <div className="space-y-6">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 card p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="font-bold text-slate-900 text-sm">{fileName}</p>
            {parseInfo && (
              <p className="text-xs text-slate-400">
                Sheet: {parseInfo.sheetName} ·{' '}
                {parseInfo.rowCount} rows ·{' '}
                {records.length} valid URLs ·{' '}
                Columns detected: {Object.keys(parseInfo.detectedColumns).join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadGSCMarkdown(gscData)}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            ⬇️ Download Fix Plan (.md)
          </button>
          <button
            onClick={() => downloadGSCCSV(gscData)}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            ⬇️ Download Fix Plan (.csv)
          </button>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            ✕ Clear & Re-upload
          </button>
        </div>
      </div>

      {/* ── Unmatched warning ── */}
      {summary.unmatchedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">
            ℹ️ {summary.unmatchedCount} URL{summary.unmatchedCount > 1 ? 's' : ''} not found in crawl data
          </p>
          <p className="text-sm text-amber-700 mt-1">
            These URLs exist in your GSC export but were not crawled by the tool (crawl is limited to 50 pages,
            or they may require login). Decisions for these URLs are based on GSC status alone.
          </p>
        </div>
      )}

      {/* ── Summary cards ── */}
      <GSCSummaryCards summary={summary} />

      {/* ── Safety note ── */}
      <div className="card p-4 bg-slate-50 border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>⚠️ Important:</strong> Always review decisions before making changes.
          <span className="text-green-700 font-semibold"> ✅ Safe</span> items can be implemented by your content team.
          <span className="text-yellow-700 font-semibold"> ⚠️ Needs Review</span> items should be reviewed by your SEO specialist.
          <span className="text-red-700 font-semibold"> 🚨 Needs Developer</span> items require code or server changes.
          Never remove noindex from archive, tag, search, cart, checkout, or admin pages.
        </p>
      </div>

      {/* ── Action table ── */}
      <GSCActionTable records={records} />
    </div>
  );
}
