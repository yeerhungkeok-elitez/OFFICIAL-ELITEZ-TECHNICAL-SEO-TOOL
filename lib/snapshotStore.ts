// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Snapshot Store (V6)
// localStorage-backed persistence for audit snapshots.
// All functions are browser-only (call only from 'use client' components).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AuditSnapshot,
  SnapshotSummary,
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  FixQueueItem,
} from '@/types/seo';

// ─── Constants ────────────────────────────────────────────────────────────────

const SNAPSHOT_KEY_PREFIX = 'seo-snapshot-';
const SNAPSHOT_INDEX_KEY  = 'seo-snapshot-index';
const MAX_INDEX_SIZE       = 50;   // max snapshots kept in index

// ─── Index entry (lightweight — stored in one key) ────────────────────────────

export interface SnapshotIndexEntry {
  id:        string;
  domain:    string;
  name:      string;
  savedAt:   string;
  crawledAt: string;
  summary:   SnapshotSummary;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getIndex(): SnapshotIndexEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_INDEX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setIndex(index: SnapshotIndexEntry[]): void {
  localStorage.setItem(SNAPSHOT_INDEX_KEY, JSON.stringify(index));
}

function buildSummary(
  result:      ScanResult,
  schemaAudit: SchemaAuditResult | null,
  fixQueue:    FixQueueItem[],
): SnapshotSummary {
  return {
    overallScore:   result.score.overall,
    schemaScore:    schemaAudit?.score.overall ?? null,
    totalPages:     result.summary.totalPages,
    criticalIssues: result.summary.criticalIssues,
    highIssues:     result.summary.highIssues,
    mediumIssues:   result.summary.mediumIssues,
    lowIssues:      result.summary.lowIssues,
    totalIssues:    result.summary.totalIssues,
    fixQueueCount:  fixQueue.length,
    indexablePages: result.summary.indexablePages,
    errorPages:     result.summary.errorPages,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build an AuditSnapshot from current audit data (does not save it yet).
 * Call saveSnapshot() to persist to localStorage.
 */
export function buildSnapshotFromCurrentData(
  result:      ScanResult,
  schemaAudit: SchemaAuditResult | null,
  gscData:     GSCDecisionSummary | null,
  fixQueue:    FixQueueItem[],
  name?:       string,
): AuditSnapshot {
  const id      = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const summary = buildSummary(result, schemaAudit, fixQueue);
  const label   = name?.trim() ||
    `Audit — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return {
    id,
    domain:     result.domain,
    name:       label,
    savedAt:    new Date().toISOString(),
    crawledAt:  result.crawledAt,
    result,
    schemaAudit,
    gscData,
    fixQueue,
    summary,
  };
}

/** Persist a snapshot to localStorage. Throws on QuotaExceededError. */
export function saveSnapshot(snapshot: AuditSnapshot): void {
  try {
    localStorage.setItem(
      `${SNAPSHOT_KEY_PREFIX}${snapshot.id}`,
      JSON.stringify(snapshot),
    );

    const index   = getIndex();
    const entry: SnapshotIndexEntry = {
      id:        snapshot.id,
      domain:    snapshot.domain,
      name:      snapshot.name,
      savedAt:   snapshot.savedAt,
      crawledAt: snapshot.crawledAt,
      summary:   snapshot.summary,
    };

    const filtered = index.filter(e => e.id !== snapshot.id);
    filtered.unshift(entry);
    setIndex(filtered.slice(0, MAX_INDEX_SIZE));
  } catch (err) {
    if ((err as Error).name === 'QuotaExceededError') {
      throw new Error(
        'Storage quota exceeded. Please delete older snapshots before saving a new one.',
      );
    }
    throw err;
  }
}

/** Return index entries for ALL domains, newest first. */
export function getSnapshots(): SnapshotIndexEntry[] {
  return getIndex();
}

/** Return index entries for a specific domain, newest first. */
export function getSnapshotsByDomain(domain: string): SnapshotIndexEntry[] {
  return getIndex().filter(e => e.domain === domain);
}

/** Load a full snapshot from localStorage. Returns null if not found. */
export function getSnapshotById(id: string): AuditSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_KEY_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as AuditSnapshot;
  } catch {
    return null;
  }
}

/** Delete a snapshot and remove it from the index. */
export function deleteSnapshot(id: string): void {
  localStorage.removeItem(`${SNAPSHOT_KEY_PREFIX}${id}`);
  setIndex(getIndex().filter(e => e.id !== id));
}

/** Rename a snapshot (updates both index entry and full snapshot object). */
export function updateSnapshotName(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  // Update lightweight index entry
  const index = getIndex();
  const entry = index.find(e => e.id === id);
  if (entry) {
    entry.name = trimmed;
    setIndex(index);
  }

  // Update full stored snapshot
  const snapshot = getSnapshotById(id);
  if (snapshot) {
    snapshot.name = trimmed;
    localStorage.setItem(`${SNAPSHOT_KEY_PREFIX}${id}`, JSON.stringify(snapshot));
  }
}

/** Delete ALL snapshots for a given domain. */
export function clearSnapshotsByDomain(domain: string): void {
  const all      = getIndex();
  const toDelete = all.filter(e => e.domain === domain);
  for (const entry of toDelete) {
    localStorage.removeItem(`${SNAPSHOT_KEY_PREFIX}${entry.id}`);
  }
  setIndex(all.filter(e => e.domain !== domain));
}
