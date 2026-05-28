// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Content Diff (V9)
// Compute a human-readable diff between original and fixed content.
// Returns a list of ContentChange objects (before/after pairs).
//
// Uses a line-level diff; for large articles this is fast enough in-browser.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContentChange, ContentIssueType } from '@/types/content';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DiffLine {
  type:    'added' | 'removed' | 'unchanged';
  content: string;
  lineNo?: number;
}

export interface ContentDiff {
  lines:        DiffLine[];
  addedCount:   number;
  removedCount: number;
  hasChanges:   boolean;
}

// ─── LCS-based line diff ───────────────────────────────────────────────────────

/**
 * Compute the Longest Common Subsequence of two string arrays.
 * Returns the LCS table (lengths only, to save memory).
 */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  // Use two-row rolling array for memory efficiency
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);
  // We need the full table for backtracking — fall back for small inputs
  if (m * n <= 100_000) {
    const table: number[][] = Array.from({ length: m + 1 }, () =>
      new Array<number>(n + 1).fill(0),
    );
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        table[i][j] =
          a[i - 1] === b[j - 1]
            ? table[i - 1][j - 1] + 1
            : Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
    return table;
  }
  // For very large inputs just return rolling pair (backtrack won't be used)
  for (let i = 1; i <= m; i++) {
    curr = new Array<number>(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1] + 1
          : Math.max(prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return [prev]; // only one row available
}

/**
 * Backtrack LCS table to produce a list of DiffLine entries.
 */
function backtrack(
  table: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number,
  lines: DiffLine[],
): void {
  if (i === 0 && j === 0) return;
  if (i === 0) {
    backtrack(table, a, b, i, j - 1, lines);
    lines.push({ type: 'added', content: b[j - 1] });
  } else if (j === 0) {
    backtrack(table, a, b, i - 1, j, lines);
    lines.push({ type: 'removed', content: a[i - 1] });
  } else if (a[i - 1] === b[j - 1]) {
    backtrack(table, a, b, i - 1, j - 1, lines);
    lines.push({ type: 'unchanged', content: a[i - 1] });
  } else if (table[i - 1][j] >= table[i][j - 1]) {
    backtrack(table, a, b, i - 1, j, lines);
    lines.push({ type: 'removed', content: a[i - 1] });
  } else {
    backtrack(table, a, b, i, j - 1, lines);
    lines.push({ type: 'added', content: b[j - 1] });
  }
}

/**
 * Compute a line-level diff between two strings.
 * For very large inputs, falls back to a simpler comparison.
 */
export function diffContent(original: string, updated: string): ContentDiff {
  if (original === updated) {
    return { lines: [], addedCount: 0, removedCount: 0, hasChanges: false };
  }

  const aLines = original.split('\n');
  const bLines = updated.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  let lines: DiffLine[];

  // For very large diffs, use a simplified approach to avoid stack overflow
  if (m * n > 100_000) {
    lines = simpleDiff(aLines, bLines);
  } else {
    const table = lcsTable(aLines, bLines);
    lines = [];
    backtrack(table, aLines, bLines, m, n, lines);
  }

  const addedCount   = lines.filter(l => l.type === 'added').length;
  const removedCount = lines.filter(l => l.type === 'removed').length;

  return {
    lines,
    addedCount,
    removedCount,
    hasChanges: addedCount > 0 || removedCount > 0,
  };
}

/**
 * Simple diff fallback for large inputs: show removed lines then added lines
 * in changed regions (no LCS).
 */
function simpleDiff(a: string[], b: string[]): DiffLine[] {
  const lines: DiffLine[] = [];
  const maxCommon = Math.min(a.length, b.length);
  let commonStart = 0;
  let commonEnd   = 0;

  while (commonStart < maxCommon && a[commonStart] === b[commonStart]) {
    commonStart++;
  }
  while (
    commonEnd < maxCommon - commonStart &&
    a[a.length - 1 - commonEnd] === b[b.length - 1 - commonEnd]
  ) {
    commonEnd++;
  }

  for (let i = 0; i < commonStart; i++) {
    lines.push({ type: 'unchanged', content: a[i] });
  }

  const removedSlice = a.slice(commonStart, a.length - commonEnd);
  const addedSlice   = b.slice(commonStart, b.length - commonEnd);

  for (const line of removedSlice) lines.push({ type: 'removed', content: line });
  for (const line of addedSlice)   lines.push({ type: 'added',   content: line });

  const tailStart = a.length - commonEnd;
  for (let i = tailStart; i < a.length; i++) {
    lines.push({ type: 'unchanged', content: a[i] });
  }

  return lines;
}

// ─── ContentChange list from diff ─────────────────────────────────────────────

/**
 * Convert a raw diff into a list of ContentChange objects, grouping consecutive
 * removed/added pairs into a single change record.
 */
export function diffToChanges(
  diff: ContentDiff,
  issueType: ContentIssueType = 'long-paragraph',
): ContentChange[] {
  const changes: ContentChange[] = [];
  let counter = 0;

  const lines = diff.lines;
  let i = 0;

  while (i < lines.length) {
    if (lines[i].type === 'unchanged') {
      i++;
      continue;
    }

    // Collect a block of removed lines
    const removedLines: string[] = [];
    while (i < lines.length && lines[i].type === 'removed') {
      removedLines.push(lines[i].content);
      i++;
    }

    // Collect the following block of added lines
    const addedLines: string[] = [];
    while (i < lines.length && lines[i].type === 'added') {
      addedLines.push(lines[i].content);
      i++;
    }

    if (removedLines.length > 0 || addedLines.length > 0) {
      const before = removedLines.join('\n');
      const after  = addedLines.join('\n');
      const previewBefore = before.slice(0, 80) + (before.length > 80 ? '…' : '');
      const previewAfter  = after.slice(0, 80)  + (after.length  > 80 ? '…' : '');

      changes.push({
        id:          `diff-${Date.now()}-${++counter}`,
        issueType,
        description: `Changed ${removedLines.length} line(s) → ${addedLines.length} line(s)`,
        before:      previewBefore,
        after:       previewAfter,
      });
    }
  }

  return changes;
}

// ─── Summary helpers ───────────────────────────────────────────────────────────

/**
 * Return a short human-readable summary of a diff.
 */
export function diffSummary(diff: ContentDiff): string {
  if (!diff.hasChanges) return 'No changes made.';
  const parts: string[] = [];
  if (diff.addedCount)   parts.push(`+${diff.addedCount} lines added`);
  if (diff.removedCount) parts.push(`${diff.removedCount} lines removed`);
  return parts.join(', ');
}

/**
 * Extract only the changed sections (context lines around each hunk),
 * suitable for displaying a compact diff view.
 */
export function getChangedHunks(diff: ContentDiff, contextLines = 2): DiffLine[][] {
  const { lines } = diff;
  const changedIndices = new Set<number>();

  lines.forEach((l, i) => {
    if (l.type !== 'unchanged') {
      for (let j = Math.max(0, i - contextLines); j <= Math.min(lines.length - 1, i + contextLines); j++) {
        changedIndices.add(j);
      }
    }
  });

  const hunks: DiffLine[][] = [];
  let currentHunk: DiffLine[] = [];
  let prevIncluded = false;

  lines.forEach((line, i) => {
    if (changedIndices.has(i)) {
      currentHunk.push(line);
      prevIncluded = true;
    } else {
      if (prevIncluded && currentHunk.length > 0) {
        hunks.push(currentHunk);
        currentHunk = [];
      }
      prevIncluded = false;
    }
  });
  if (currentHunk.length > 0) hunks.push(currentHunk);

  return hunks;
}
