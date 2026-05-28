'use client';

import { useState } from 'react';
import { downloadMarkdownReport } from '@/lib/reportGenerator';
import type { ScanResult } from '@/types/seo';

interface Props {
  result: ScanResult;
}

export default function ExportButton({ result }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exported,  setExported]  = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      downloadMarkdownReport(result);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  function handleCopyJson() {
    try {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    } catch { /* ignore */ }
  }

  if (exported) {
    return (
      <button className="btn-primary bg-green-600 hover:bg-green-700" disabled>
        ✅ Report downloaded!
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-primary"
      >
        {exporting ? '⏳ Exporting…' : '📄 Export Markdown Report'}
      </button>
      <button
        onClick={handleCopyJson}
        className="btn-secondary"
        title="Copy raw JSON data"
      >
        { } JSON
      </button>
    </div>
  );
}
