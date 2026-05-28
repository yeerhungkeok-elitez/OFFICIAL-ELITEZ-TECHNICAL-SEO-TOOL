'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Snapshot Library (V6)
// Domain-filtered list of saved snapshots with rename and delete.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { SnapshotIndexEntry } from '@/lib/snapshotStore';
import { updateSnapshotName, deleteSnapshot } from '@/lib/snapshotStore';

interface Props {
  snapshots:        SnapshotIndexEntry[];
  selectedBefore:   string | null;
  selectedAfter:    string | null;
  onSelectBefore:   (id: string) => void;
  onSelectAfter:    (id: string) => void;
  onDeleted:        (id: string) => void;
  onRenamed:        (id: string, name: string) => void;
}

export default function SnapshotLibrary({
  snapshots,
  selectedBefore,
  selectedAfter,
  onSelectBefore,
  onSelectAfter,
  onDeleted,
  onRenamed,
}: Props) {
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editName,   setEditName]   = useState('');
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No snapshots saved yet. Save this audit above to start tracking history.
      </div>
    );
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  function handleRenameStart(entry: SnapshotIndexEntry) {
    setEditingId(entry.id);
    setEditName(entry.name);
  }

  function handleRenameSave(id: string) {
    const trimmed = editName.trim();
    if (trimmed) {
      updateSnapshotName(id, trimmed);
      onRenamed(id, trimmed);
    }
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteSnapshot(id);
    onDeleted(id);
    setDeleteId(null);
  }

  function scoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  }

  return (
    <div className="space-y-2">
      {/* Column header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Snapshot</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Score</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Before</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">After</p>
      </div>

      {snapshots.map((entry, idx) => (
        <div
          key={entry.id}
          className={`card p-3 transition-all ${
            selectedBefore === entry.id || selectedAfter === entry.id
              ? 'ring-2 ring-blue-400 bg-blue-50/30'
              : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">

            {/* Name + date */}
            <div className="min-w-0">
              {editingId === entry.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameSave(entry.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                  <button
                    onClick={() => handleRenameSave(entry.id)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{entry.name}</p>
                    <p className="text-xs text-slate-400">
                      Crawled {fmtDate(entry.crawledAt)} · {entry.summary.totalPages} pages
                      {entry.summary.criticalIssues > 0 && (
                        <span className="ml-1 text-red-500">{entry.summary.criticalIssues} critical</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-1">
                    <button
                      onClick={() => handleRenameStart(entry)}
                      title="Rename"
                      className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
                    >
                      ✏️
                    </button>
                    {deleteId === entry.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Confirm delete"
                        >
                          🗑 Confirm
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 p-1 rounded"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteId(entry.id)}
                        title="Delete snapshot"
                        className="text-xs text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Score */}
            <div className="text-center w-14">
              <p className={`text-lg font-extrabold ${scoreColor(entry.summary.overallScore)}`}>
                {entry.summary.overallScore}
              </p>
              <p className="text-xs text-slate-400">/100</p>
            </div>

            {/* Before radio */}
            <div className="flex justify-center w-12">
              <button
                onClick={() => onSelectBefore(entry.id)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold ${
                  selectedBefore === entry.id
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-300 text-slate-400 hover:border-blue-400'
                }`}
                title="Select as 'before' snapshot"
              >
                {selectedBefore === entry.id ? '✓' : idx + 1}
              </button>
            </div>

            {/* After radio */}
            <div className="flex justify-center w-12">
              <button
                onClick={() => onSelectAfter(entry.id)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all text-xs font-bold ${
                  selectedAfter === entry.id
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 text-slate-400 hover:border-emerald-400'
                }`}
                title="Select as 'after' snapshot"
              >
                {selectedAfter === entry.id ? '✓' : idx + 1}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 px-3 pt-1 text-xs text-slate-400">
        <span><span className="inline-block w-3 h-3 rounded-full bg-blue-600 mr-1" />Before</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-emerald-600 mr-1" />After</span>
        <span className="ml-auto text-slate-300">{snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
