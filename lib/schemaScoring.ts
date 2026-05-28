// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Schema Health Score (V2)
// Weights: validJson 25% | correctTypes 25% | requiredProperties 25%
//          noDuplicates 15% | contentConsistency 10%
// ─────────────────────────────────────────────────────────────────────────────

import type { PageData, SchemaIssue, SchemaScore, SchemaAuditResult } from '@/types/seo';
import { detectPageIntent, ARTICLE_TYPES, ORGANIZATION_TYPES } from './schemaExtractor';

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, v)));
}

function pct(n: number, total: number): number {
  return total === 0 ? 0 : n / total;
}

// ─── Sub-score functions ──────────────────────────────────────────────────────

/**
 * Valid JSON-LD score (25%).
 * Full marks if all blocks parse; 0 if no schema at all.
 */
function scoreValidJson(pages: PageData[]): number {
  const allBlocks = pages.flatMap(p => p.schemaBlocks ?? []);
  if (allBlocks.length === 0) {
    // Extra penalty: if pages exist and none have any schema, score = 0
    return pages.length > 0 ? 0 : 50;
  }
  const validRatio = pct(allBlocks.filter(b => b.isValid).length, allBlocks.length);
  return clamp(Math.round(validRatio * 100));
}

/**
 * Correct schema types by page intent (25%).
 * Checks: org+website on homepage, Article on blog, Service on service pages, FAQPage on faq pages.
 */
function scoreCorrectTypes(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (indexable.length === 0) return 50;

  let points = 0;
  const MAX  = 100;

  // Homepage: Organization (30 pts) + WebSite (20 pts)
  const home = indexable.find(p => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  }) ?? indexable.find(p => detectPageIntent(p) === 'homepage');

  if (home) {
    const homeTypes = (home.schemaBlocks ?? []).flatMap(b => b.types);
    if (homeTypes.some(t => ORGANIZATION_TYPES.has(t))) points += 30;
    else points -= 10; // Explicit penalty for missing org
    if (homeTypes.includes('WebSite'))                  points += 20;
  }

  // Blog pages with Article (20 pts pool)
  const blogPages = indexable.filter(p => detectPageIntent(p) === 'blog');
  if (blogPages.length > 0) {
    const covered = blogPages.filter(p =>
      (p.schemaBlocks ?? []).some(b => b.types.some(t => ARTICLE_TYPES.has(t)))
    ).length;
    points += Math.round(pct(covered, blogPages.length) * 20);
  } else {
    points += 10; // N/A pages — partial credit
  }

  // Service pages with Service (15 pts pool)
  const servicePages = indexable.filter(p => detectPageIntent(p) === 'service');
  if (servicePages.length > 0) {
    const covered = servicePages.filter(p =>
      (p.schemaBlocks ?? []).some(b => b.types.includes('Service'))
    ).length;
    points += Math.round(pct(covered, servicePages.length) * 15);
  } else {
    points += 8;
  }

  // FAQ pages with FAQPage (15 pts pool)
  const faqPages = indexable.filter(p => detectPageIntent(p) === 'faq');
  if (faqPages.length > 0) {
    const covered = faqPages.filter(p =>
      (p.schemaBlocks ?? []).some(b => b.types.includes('FAQPage'))
    ).length;
    points += Math.round(pct(covered, faqPages.length) * 15);
  } else {
    points += 7;
  }

  return clamp(points, 0, MAX);
}

/**
 * Required properties score (25%).
 * Based on count of property-related issues found.
 */
function scoreRequiredProperties(issues: SchemaIssue[]): number {
  const propIssues = issues.filter(i => i.type.startsWith('missing-property'));
  if (propIssues.length === 0) return 100;
  // Each property issue deducts 15–25 points depending on severity
  const deduction = propIssues.reduce((sum, i) => {
    const d = { critical: 25, high: 20, medium: 15, low: 10 }[i.severity] ?? 10;
    return sum + d;
  }, 0);
  return clamp(100 - deduction);
}

/**
 * No duplicates score (15%).
 * Penalise pages with duplicate schema types.
 */
function scoreNoDuplicates(issues: SchemaIssue[]): number {
  const dupIssues = issues.filter(i => i.type === 'duplicate-type');
  if (dupIssues.length === 0) return 100;
  const affected = dupIssues.reduce((s, i) => s + i.count, 0);
  return clamp(100 - affected * 25);
}

/**
 * Content-schema consistency score (10%).
 * Penalise FAQ pages without FAQPage schema, or FAQPage without visible FAQ content.
 */
function scoreContentConsistency(issues: SchemaIssue[]): number {
  const consistencyIssues = issues.filter(i =>
    ['missing-faqpage', 'faq-schema-missing', 'faq-content-missing', 'url-mismatch'].includes(i.type)
  );
  if (consistencyIssues.length === 0) return 100;
  return clamp(100 - consistencyIssues.length * 30);
}

// ─── Main scoring function ────────────────────────────────────────────────────

const WEIGHTS = {
  validJson:           0.25,
  correctTypes:        0.25,
  requiredProperties:  0.25,
  noDuplicates:        0.15,
  contentConsistency:  0.10,
} as const;

export function calculateSchemaScore(pages: PageData[], issues: SchemaIssue[]): SchemaScore {
  const validJson           = scoreValidJson(pages);
  const correctTypes        = scoreCorrectTypes(pages);
  const requiredProperties  = scoreRequiredProperties(issues);
  const noDuplicates        = scoreNoDuplicates(issues);
  const contentConsistency  = scoreContentConsistency(issues);

  const overall = clamp(
    Math.round(
      validJson          * WEIGHTS.validJson          +
      correctTypes       * WEIGHTS.correctTypes       +
      requiredProperties * WEIGHTS.requiredProperties +
      noDuplicates       * WEIGHTS.noDuplicates       +
      contentConsistency * WEIGHTS.contentConsistency
    )
  );

  return { overall, validJson, correctTypes, requiredProperties, noDuplicates, contentConsistency };
}

/** Attach the calculated score to an existing SchemaAuditResult */
export function attachSchemaScore(audit: SchemaAuditResult, pages: PageData[]): SchemaAuditResult {
  return { ...audit, score: calculateSchemaScore(pages, audit.issues) };
}

/** Human-readable label for a schema score */
export function getSchemaScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Well Structured',  color: '#22c55e' };
  if (score >= 60) return { label: 'Mostly OK',        color: '#84cc16' };
  if (score >= 40) return { label: 'Needs Improvement',color: '#f59e0b' };
  if (score >= 20) return { label: 'Poorly Structured', color: '#f97316' };
  return              { label: 'Missing / Broken',    color: '#ef4444' };
}
