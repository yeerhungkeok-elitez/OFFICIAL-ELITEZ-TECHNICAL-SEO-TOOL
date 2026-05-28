'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — History Panel (V6)
// Main History tab: save snapshot + library + before/after comparison.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { ScanResult, SchemaAuditResult, GSCDecisionSummary, SnapshotComparisonResult } from '@/types/seo';
import { buildFixQueue } from '@/lib/fixQueueBuilder';
import {
  buildSnapshotFromCurrentData,
  saveSnapshot,
  getSnapshotsByDomain,
  getSnapshotById,
} from '@/lib/snapshotStore';
import type { SnapshotIndexEntry } from '@/lib/snapshotStore';
import { compareSnapshots } from '@/lib/snapshotComparison';
import SnapshotLibrary  from './SnapshotLibrary';
import SnapshotComparison from './SnapshotComparison';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  result:      ScanResult;
  schemaAudit?: SchemaAuditResult | null;
  gscData?:    GSCDecisionSummary | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPanel({ result, schemaAudit, gscData }: Props) {
  const [snapshots,       setSnapshots]       = useState<SnapshotIndexEntry[]>([]);
  const [snapshotName,    setSnapshotName]     = useState('');
  const [isSaving,        setIsSaving]         = useState(false);
  const [saveError,       setSaveError]        = useState<string | null>(null);
  const [saveSuccess,     setSaveSuccess]      = useState(false);

  const [selectedBefore,  setSelectedBefore]   = useState<string | null>(null);
  const [selectedAfter,   setSelectedAfter]    = useState<string | null>(null);
  const [comparison,      setComparison]       = useState<SnapshotComparisonResult | null>(null);
  const [isComparing,     setIsComparing]      = useState(false);
  const [compareError,    setCompareError]     = useState<string | null>(null);

  // ── Load snapshots on mount ───────────────────────────────────────────────
  const loadSnapshots = useCallback(() => {
    setSnapshots(getSnapshotsByDomain(result.domain));
  }, [result.domain]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // ── Save current audit as a snapshot ─────────────────────────────────────
  function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const fixQueue  = buildFixQueue(result, schemaAudit ?? undefined, gscData ?? undefined);
      const snapshot  = buildSnapshotFromCurrentData(
        result,
        schemaAudit ?? null,
        gscData     ?? null,
        fixQueue,
        snapshotName,
      );
      saveSnapshot(snapshot);
      setSaveSuccess(true);
      setSnapshotName('');
      loadSnapshots();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Compare two selected snapshots ───────────────────────────────────────
  function handleCompare() {
    if (!selectedBefore || !selectedAfter) return;
    if (selectedBefore === selectedAfter) {
      setCompareError('Please select two different snapshots to compare.');
      return;
    }

    setIsComparing(true);
    setCompareError(null);
    setComparison(null);

    try {
      const beforeSnap = getSnapshotById(selectedBefore);
      const afterSnap  = getSnapshotById(selectedAfter);

      if (!beforeSnap || !afterSnap) {
        throw new Error('One or both snapshots could not be loaded. They may have been deleted.');
      }

      const result = compareSnapshots(beforeSnap, afterSnap);
      setComparison(result);
    } catch (err) {
      setCompareError((err as Error).message);
    } finally {
      setIsComparing(false);
    }
  }

  const canCompare = selectedBefore && selectedAfter && selectedBefore !== selectedAfter;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="card p-6 bg-gradient-to-r from-indigo-800 to-slate-900 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold mb-1">🕰️ Audit History</h2>
            <p className="text-sm text-slate-300">
              Save this audit as a snapshot, then compare any two snapshots to measure SEO progress over time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
              {result.domain}
            </span>
            <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
              {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
            </span>
            <span className="bg-white/10 text-xs px-3 py-1 rounded-full">
              Score: {result.score.overall}/100
            </span>
          </div>
        </div>
      </div>

      {/* ── Save current audit ── */}
      <div className="card p-5">
        <p className="text-sm font-bold text-slate-700 mb-3">💾 Save Current Audit as Snapshot</p>
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={snapshotName}
              onChange={e => setSnapshotName(e.target.value)}
              placeholder={`e.g. "Post-migration audit" (optional)`}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              onKeyDown={e => e.key === 'Enter' && !isSaving && handleSave()}
            />
            <p className="text-xs text-slate-400 mt-1">
              Current audit: {result.summary.totalPages} pages · {result.score.overall}/100 ·{' '}
              {new Date(result.crawledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Saving…</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Snapshot</span>
              </>
            )}
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
            <span>✅</span>
            <span>Snapshot saved successfully. It will appear in the list below.</span>
          </div>
        )}
        {saveError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
            <span>❌</span>
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* ── Snapshot library ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-700">
            📚 Snapshot Library — {result.domain}
          </p>
          {snapshots.length >= 2 && (
            <p className="text-xs text-slate-400">
              Select one as "Before" and one as "After" to compare
            </p>
          )}
        </div>

        <SnapshotLibrary
          snapshots={snapshots}
          selectedBefore={selectedBefore}
          selectedAfter={selectedAfter}
          onSelectBefore={id => {
            setSelectedBefore(id);
            setComparison(null);
            setCompareError(null);
          }}
          onSelectAfter={id => {
            setSelectedAfter(id);
            setComparison(null);
            setCompareError(null);
          }}
          onDeleted={id => {
            if (selectedBefore === id) setSelectedBefore(null);
            if (selectedAfter === id)  setSelectedAfter(null);
            loadSnapshots();
          }}
          onRenamed={() => loadSnapshots()}
        />
      </div>

      {/* ── Compare button ── */}
      {snapshots.length >= 2 && (
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1">
            {canCompare ? (
              <p className="text-sm text-slate-600">
                Ready to compare{' '}
                <strong>{snapshots.find(s => s.id === selectedBefore)?.name ?? 'snapshot'}</strong>
                {' → '}
                <strong>{snapshots.find(s => s.id === selectedAfter)?.name ?? 'snapshot'}</strong>
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                Select a "Before" and "After" snapshot above to enable comparison.
              </p>
            )}
          </div>
          <button
            onClick={handleCompare}
            disabled={!canCompare || isComparing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isComparing ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Comparing…</span>
              </>
            ) : (
              <>
                <span>⚖️</span>
                <span>Compare Snapshots</span>
              </>
            )}
          </button>
        </div>
      )}

      {compareError && (
        <div className="card p-4 bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <span>❌</span>
          <span>{compareError}</span>
        </div>
      )}

      {/* ── Comparison results ── */}
      {comparison && (
        <SnapshotComparison comparison={comparison} />
      )}

      {/* ── No snapshots hint ── */}
      {snapshots.length === 0 && (
        <div className="card p-8 text-center bg-slate-50">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-base font-semibold text-slate-700 mb-2">No Snapshots Yet</p>
          <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Save this audit above to create your first snapshot. After running additional audits and saving them,
            you can compare any two snapshots to measure SEO progress over time.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Snapshots are stored in your browser's localStorage. They remain available until you clear your browser data or delete them manually.
          </p>
        </div>
      )}

      {/* ── Only one snapshot hint ── */}
      {snapshots.length === 1 && (
        <div className="card p-4 bg-blue-50 border border-blue-100 text-sm text-blue-700">
          💡 You have 1 snapshot saved. Save another audit after making changes to enable before/after comparison.
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
        <p>🕰️ Audit History V6 — {result.domain}</p>
        <p className="mt-1 text-slate-300 italic">
          Progress comparisons reflect technical SEO metrics only and do not predict ranking changes.
        </p>
      </div>

    </div>
  );
}
