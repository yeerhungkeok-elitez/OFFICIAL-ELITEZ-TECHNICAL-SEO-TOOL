// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Snapshot Comparison (V6)
// Fingerprints issues and diffs two audit snapshots.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AuditSnapshot,
  IssueFingerprint,
  MetricComparison,
  SnapshotComparisonResult,
} from '@/types/seo';

// ─── Fingerprint builders ─────────────────────────────────────────────────────

function buildSEOFingerprints(snapshot: AuditSnapshot): Map<string, IssueFingerprint> {
  const map = new Map<string, IssueFingerprint>();
  for (const issue of snapshot.result.issues) {
    // Key: source || category || severity || issue-id
    const key = `seo||${issue.category}||${issue.severity}||${issue.id}`;
    map.set(key, {
      key,
      label:         issue.problem,
      severity:      issue.severity,
      category:      issue.category,
      source:        'seo',
      affectedPages: issue.affectedPages,
      count:         issue.count,
    });
  }
  return map;
}

function buildSchemaFingerprints(snapshot: AuditSnapshot): Map<string, IssueFingerprint> {
  const map = new Map<string, IssueFingerprint>();
  if (!snapshot.schemaAudit) return map;

  for (const issue of snapshot.schemaAudit.issues) {
    // Key: source || issue-type || schemaType (schema issues are type-level, not page-level)
    const key = `schema||${issue.type}||${issue.schemaType}`;
    map.set(key, {
      key,
      label:         issue.problem,
      severity:      issue.severity,
      category:      `Schema: ${issue.schemaType}`,
      source:        'schema',
      affectedPages: issue.affectedPages,
      count:         issue.count,
    });
  }
  return map;
}

function buildFixFingerprints(snapshot: AuditSnapshot): Map<string, IssueFingerprint> {
  const map = new Map<string, IssueFingerprint>();
  for (const fix of snapshot.fixQueue) {
    // Key: source || fixType || url (one per unique URL+type combo)
    const key = `fix||${fix.fixType}||${fix.url}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label:         `${fix.fixType}: ${fix.issueType}`,
        severity:      fix.priority,
        category:      fix.fixType,
        source:        'fix',
        affectedPages: [fix.url],
        count:         1,
      });
    }
  }
  return map;
}

function buildAllFingerprints(snapshot: AuditSnapshot): Map<string, IssueFingerprint> {
  const merged = new Map<string, IssueFingerprint>();
  for (const [k, v] of buildSEOFingerprints(snapshot))    merged.set(k, v);
  for (const [k, v] of buildSchemaFingerprints(snapshot)) merged.set(k, v);
  for (const [k, v] of buildFixFingerprints(snapshot))    merged.set(k, v);
  return merged;
}

// ─── Metric builder ───────────────────────────────────────────────────────────

function makeMetric(
  label:          string,
  before:         number,
  after:          number,
  higherIsBetter: boolean,
  unit?:          string,
): MetricComparison {
  const delta        = after - before;
  const deltaPercent = before !== 0 ? Math.round((delta / Math.abs(before)) * 100) : 0;
  const improved     = higherIsBetter ? delta > 0 : delta < 0;
  return {
    label,
    before,
    after,
    delta,
    deltaPercent,
    direction: delta === 0 ? 'unchanged' : improved ? 'improved' : 'regressed',
    unit,
  };
}

// ─── Main comparison function ─────────────────────────────────────────────────

export function compareSnapshots(
  before: AuditSnapshot,
  after:  AuditSnapshot,
): SnapshotComparisonResult {
  const beforeFP = buildAllFingerprints(before);
  const afterFP  = buildAllFingerprints(after);

  const resolvedIssues:   IssueFingerprint[] = [];
  const newIssues:        IssueFingerprint[] = [];
  const persistentIssues: IssueFingerprint[] = [];

  for (const [key, fp] of beforeFP) {
    if (afterFP.has(key)) {
      persistentIssues.push(fp);
    } else {
      resolvedIssues.push(fp);
    }
  }
  for (const [key, fp] of afterFP) {
    if (!beforeFP.has(key)) {
      newIssues.push(fp);
    }
  }

  const metrics: MetricComparison[] = [
    makeMetric('Overall SEO Score',  before.summary.overallScore,   after.summary.overallScore,   true,  '/100'),
    makeMetric('Total Issues',        before.summary.totalIssues,    after.summary.totalIssues,    false),
    makeMetric('Critical Issues',     before.summary.criticalIssues, after.summary.criticalIssues, false),
    makeMetric('High Issues',         before.summary.highIssues,     after.summary.highIssues,     false),
    makeMetric('Pages Crawled',       before.summary.totalPages,     after.summary.totalPages,     true,  'pages'),
    makeMetric('Indexable Pages',     before.summary.indexablePages, after.summary.indexablePages, true,  'pages'),
    makeMetric('Error Pages',         before.summary.errorPages,     after.summary.errorPages,     false, 'pages'),
    makeMetric('Fix Queue Items',     before.summary.fixQueueCount,  after.summary.fixQueueCount,  false),
  ];

  // Insert schema score if both snapshots have it
  if (before.summary.schemaScore !== null && after.summary.schemaScore !== null) {
    metrics.splice(1, 0,
      makeMetric('Schema Score', before.summary.schemaScore, after.summary.schemaScore, true, '/100'),
    );
  }

  return {
    beforeSnapshot:   before,
    afterSnapshot:    after,
    metrics,
    resolvedIssues,
    newIssues,
    persistentIssues,
    resolvedCount:    resolvedIssues.length,
    newCount:         newIssues.length,
    persistentCount:  persistentIssues.length,
    scoreImprovement: after.summary.overallScore - before.summary.overallScore,
    comparedAt:       new Date().toISOString(),
  };
}
