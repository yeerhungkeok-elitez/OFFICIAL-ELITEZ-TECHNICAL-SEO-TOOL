// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Draft Store (V9)
// localStorage CRUD for ArticleDraft objects.
// Key: elitez-content-drafts (array of all drafts)
// ─────────────────────────────────────────────────────────────────────────────

import type { ArticleDraft, ContentScoreSnapshot } from '@/types/content';

const STORAGE_KEY = 'elitez-content-drafts';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readAll(): ArticleDraft[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ArticleDraft[];
  } catch {
    return [];
  }
}

function writeAll(drafts: ArticleDraft[]): void {
  if (!isClient()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function generateId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Create a new draft and save it to localStorage.
 * Returns the generated draft ID.
 */
export function createDraft(
  data: Omit<ArticleDraft, 'id' | 'createdAt' | 'updatedAt' | 'scoreHistory'>,
): ArticleDraft {
  const now = new Date().toISOString();
  const draft: ArticleDraft = {
    ...data,
    id:           generateId(),
    createdAt:    now,
    updatedAt:    now,
    scoreHistory: [],
  };

  const all = readAll();
  all.unshift(draft); // newest first
  writeAll(all);
  return draft;
}

/**
 * Save / upsert a draft.
 * If a draft with the same id already exists it is replaced; otherwise appended.
 */
export function saveDraft(draft: ArticleDraft): void {
  const all     = readAll();
  const idx     = all.findIndex(d => d.id === draft.id);
  const updated = { ...draft, updatedAt: new Date().toISOString() };

  if (idx >= 0) {
    all[idx] = updated;
  } else {
    all.unshift(updated);
  }
  writeAll(all);
}

/**
 * Load a single draft by ID. Returns null if not found.
 */
export function loadDraft(id: string): ArticleDraft | null {
  return readAll().find(d => d.id === id) ?? null;
}

/**
 * Return all saved drafts, newest first.
 */
export function getAllDrafts(): ArticleDraft[] {
  return readAll();
}

/**
 * Update specific fields on an existing draft (partial update).
 */
export function patchDraft(id: string, patch: Partial<ArticleDraft>): ArticleDraft | null {
  const all = readAll();
  const idx = all.findIndex(d => d.id === id);
  if (idx < 0) return null;

  const updated = { ...all[idx], ...patch, id, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

/**
 * Append a score snapshot to a draft's history.
 */
export function recordScore(id: string, snapshot: ContentScoreSnapshot): void {
  const all = readAll();
  const idx = all.findIndex(d => d.id === id);
  if (idx < 0) return;

  all[idx] = {
    ...all[idx],
    scoreHistory: [...all[idx].scoreHistory, snapshot],
    updatedAt:    new Date().toISOString(),
  };
  writeAll(all);
}

/**
 * Delete a draft by ID.
 */
export function deleteDraft(id: string): void {
  writeAll(readAll().filter(d => d.id !== id));
}

/**
 * Delete all drafts.
 */
export function clearAllDrafts(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Count all stored drafts (synchronous, fast).
 */
export function getDraftCount(): number {
  return readAll().length;
}

/**
 * Create an empty/starter draft with default values.
 * Useful for the "New Article" button.
 */
export function createEmptyDraft(
  overrides: Partial<Omit<ArticleDraft, 'id' | 'createdAt' | 'updatedAt' | 'scoreHistory'>> = {},
): ArticleDraft {
  return createDraft({
    title:           overrides.title           ?? '',
    focusKeyphrase:  overrides.focusKeyphrase  ?? '',
    content:         overrides.content         ?? '',
    metaTitle:       overrides.metaTitle        ?? '',
    metaDescription: overrides.metaDescription  ?? '',
    brandName:       overrides.brandName        ?? '',
    city:            overrides.city             ?? '',
    serviceType:     overrides.serviceType      ?? '',
    category:        overrides.category         ?? 'blog',
  });
}

/**
 * Export a draft as a JSON string (for download).
 */
export function exportDraftJson(draft: ArticleDraft): string {
  return JSON.stringify(draft, null, 2);
}

/**
 * Export all drafts as a JSON string.
 */
export function exportAllDraftsJson(): string {
  return JSON.stringify(readAll(), null, 2);
}
