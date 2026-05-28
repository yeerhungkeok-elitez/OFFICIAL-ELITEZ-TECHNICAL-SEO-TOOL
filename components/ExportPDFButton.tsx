'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Export PDF Button (V5)
// Handles PDF generation, CSV export, and Markdown export.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ReportExportData } from '@/types/seo';
import { generatePDFBlob, generateDeveloperTasksCSV, downloadBlob } from '@/lib/pdfReportGenerator';
import {
  generateClientSummaryMarkdown,
  generateDeveloperFixPlanMarkdown,
  generateFullAuditMarkdown,
} from '@/lib/reportGenerator';

interface Props {
  data:     ReportExportData;
  filename: string;
}

export default function ExportPDFButton({ data, filename }: Props) {
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [csvLoading,  setCsvLoading]  = useState(false);
  const [mdLoading,   setMdLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleExportPDF() {
    setError(null);
    setPdfLoading(true);
    try {
      const blob = await generatePDFBlob(data);
      downloadBlob(blob, `${filename}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setError('PDF export failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  function handleExportCSV() {
    setCsvLoading(true);
    try {
      const csv  = generateDeveloperTasksCSV(data.developerTasks);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `${filename}-developer-tasks.csv`);
    } catch (err) {
      console.error('CSV generation failed:', err);
      setError('CSV export failed.');
    } finally {
      setCsvLoading(false);
    }
  }

  function handleExportMarkdown() {
    setMdLoading(true);
    try {
      let md: string;
      if (data.settings.mode === 'client-summary') {
        md = generateClientSummaryMarkdown(data);
      } else if (data.settings.mode === 'developer-fix-plan') {
        md = generateDeveloperFixPlanMarkdown(data);
      } else {
        md = generateFullAuditMarkdown(data);
      }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      downloadBlob(blob, `${filename}.md`);
    } catch (err) {
      console.error('Markdown generation failed:', err);
      setError('Markdown export failed.');
    } finally {
      setMdLoading(false);
    }
  }

  const modeLabel =
    data.settings.mode === 'client-summary'     ? 'Client Summary' :
    data.settings.mode === 'developer-fix-plan' ? 'Developer Plan' :
    'Full Audit';

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* PDF Export — primary action */}
      <button
        onClick={handleExportPDF}
        disabled={pdfLoading}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-sm ${
          pdfLoading
            ? 'opacity-60 cursor-wait bg-slate-400'
            : 'hover:opacity-90 active:scale-95'
        }`}
        style={{ backgroundColor: data.settings.brand.primaryColor }}
      >
        {pdfLoading ? (
          <>
            <span className="animate-spin">⚙️</span>
            <span>Generating PDF…</span>
          </>
        ) : (
          <>
            <span>📥</span>
            <span>Export {modeLabel} as PDF</span>
          </>
        )}
      </button>

      {/* Secondary exports */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleExportMarkdown}
          disabled={mdLoading}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60"
        >
          {mdLoading ? <span className="animate-spin">⚙️</span> : <span>📝</span>}
          <span>Export Markdown</span>
        </button>

        <button
          onClick={handleExportCSV}
          disabled={csvLoading}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60"
        >
          {csvLoading ? <span className="animate-spin">⚙️</span> : <span>📊</span>}
          <span>Export Tasks CSV</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        PDF includes {data.developerTasks.length} tasks · {data.fixQueue.length} queue items
      </p>
    </div>
  );
}
