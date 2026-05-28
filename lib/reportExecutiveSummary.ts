// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Executive Summary Generator (V5)
// Produces a business-friendly narrative based on scan + fix queue data.
// Safety: uses hedged language — no promises of rankings or guaranteed outcomes.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  FixQueueItem,
  ExecutiveSummary,
} from '@/types/seo';
import { getQueueStats } from './fixQueueBuilder';

export function generateExecutiveSummary(
  result:      ScanResult,
  fixQueue:    FixQueueItem[],
  schemaAudit?: SchemaAuditResult | null,
  gscData?:    GSCDecisionSummary | null,
): ExecutiveSummary {
  const score       = result.score.overall;
  const schemaScore = schemaAudit?.score.overall ?? null;
  const stats       = getQueueStats(fixQueue);
  const { critical: criticalIssues, high: highIssues, medium: mediumIssues, low: lowIssues, total: totalFixes } = stats;

  // ── Overall health statement ──────────────────────────────────────────────
  let overallHealth: string;
  if (score >= 85) {
    overallHealth =
      `${result.domain} has a strong technical SEO foundation with an overall health score of ${score}/100. ` +
      `The site is broadly well-configured for crawling and indexing. Minor refinements are recommended ` +
      `to maintain performance and reduce future risk.`;
  } else if (score >= 70) {
    overallHealth =
      `${result.domain} shows a moderate SEO health score of ${score}/100. ` +
      `The site is functional, but several on-page, technical, and schema improvements are recommended ` +
      `to strengthen its visibility in search results.`;
  } else if (score >= 50) {
    overallHealth =
      `${result.domain} has a below-average SEO health score of ${score}/100. ` +
      `A number of technical and on-page issues have been detected that may be limiting how effectively ` +
      `the site is crawled, indexed, and understood by search engines.`;
  } else {
    overallHealth =
      `${result.domain} has a low SEO health score of ${score}/100. ` +
      `Critical issues have been detected that are likely affecting the site's ability to be discovered ` +
      `and ranked in Google search results. Immediate action is recommended.`;
  }

  // ── Top risks (hedged wording) ────────────────────────────────────────────
  const topRisks: string[] = [];

  if (criticalIssues > 0) {
    topRisks.push(
      `${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} detected ` +
      `that may directly impact indexing or search visibility — these should be reviewed first.`,
    );
  }
  if (result.summary.noindexPages > 0) {
    topRisks.push(
      `${result.summary.noindexPages} page${result.summary.noindexPages > 1 ? 's are' : ' is'} marked noindex ` +
      `and will not appear in Google search results. Verify these are intentionally excluded.`,
    );
  }
  if (result.summary.pagesWithMissingTitle > 0) {
    topRisks.push(
      `${result.summary.pagesWithMissingTitle} page${result.summary.pagesWithMissingTitle > 1 ? 's are' : ' is'} ` +
      `missing a title tag, which can reduce click-through rates in search results.`,
    );
  }
  if (schemaScore !== null && schemaScore < 60) {
    topRisks.push(
      `Schema markup health score is ${schemaScore}/100. Improving structured data may enhance ` +
      `eligibility for Google rich results and featured snippets.`,
    );
  }
  if (gscData && gscData.summary.actionRequiredCount > 0) {
    topRisks.push(
      `${gscData.summary.actionRequiredCount} URL${gscData.summary.actionRequiredCount > 1 ? 's' : ''} imported ` +
      `from Google Search Console require review — including potential noindex, canonical, and indexing issues.`,
    );
  }
  if (result.summary.errorPages > 0) {
    topRisks.push(
      `${result.summary.errorPages} page${result.summary.errorPages > 1 ? 's return' : ' returns'} HTTP errors ` +
      `(4xx/5xx). These should be redirected or fixed to preserve crawl budget.`,
    );
  }
  if (topRisks.length === 0) {
    topRisks.push(
      `No critical issues detected. The site appears to meet core technical SEO standards. ` +
      `Focus on ongoing content improvements and schema optimisation.`,
    );
  }

  // ── Business impact ───────────────────────────────────────────────────────
  let businessImpact: string;
  if (criticalIssues >= 3 || score < 50) {
    businessImpact =
      `The issues detected may be limiting organic search traffic and reducing the site's ability to ` +
      `compete in search results. Addressing critical items first can improve crawlability and indexing. ` +
      `These changes are not guaranteed to change rankings immediately, but they remove barriers that ` +
      `can prevent Google from properly evaluating the site's content.`;
  } else if (criticalIssues > 0 || score < 70) {
    businessImpact =
      `The site is broadly accessible to search engines, but targeted improvements to metadata, schema ` +
      `markup, and internal linking can improve how pages are presented in search results. Better titles, ` +
      `descriptions, and structured data may increase click-through rates and visibility over time.`;
  } else {
    businessImpact =
      `The site has a solid technical foundation. Continued improvements to content quality, schema ` +
      `markup, and internal linking structures can help strengthen organic performance. Regular audits ` +
      `are recommended to catch new issues introduced by site updates.`;
  }

  // ── Recommended next step ─────────────────────────────────────────────────
  let recommendedNext: string;
  if (criticalIssues > 0) {
    recommendedNext =
      `Begin with the ${criticalIssues} critical ${criticalIssues > 1 ? 'issues' : 'issue'} listed in the Fix Queue. ` +
      `These are the highest-priority items and should be reviewed within the first week. ` +
      `Most can be implemented without significant development effort.`;
  } else if (highIssues > 0) {
    recommendedNext =
      `Focus on the ${highIssues} high-priority ${highIssues > 1 ? 'items' : 'item'} in the Fix Queue as your first sprint. ` +
      `Completing these within 2 weeks should improve the site's technical SEO score measurably.`;
  } else if (totalFixes > 0) {
    recommendedNext =
      `Work through the ${totalFixes} medium and low priority items in the Fix Queue systematically ` +
      `using the 30-Day Roadmap. Prioritise schema additions and internal linking improvements ` +
      `for the best long-term return.`;
  } else {
    recommendedNext =
      `Maintain the current strong technical setup. Schedule a re-audit in 60–90 days to catch ` +
      `any new issues introduced by site updates or content changes.`;
  }

  const confidenceNote =
    `This report is based on automated analysis of crawl data, schema markup, and any uploaded ` +
    `Google Search Console data. Findings should be reviewed by an SEO specialist before ` +
    `implementation. Google indexing and ranking outcomes are not guaranteed. Recommendations ` +
    `reflect current best practices and should be validated against the live site.`;

  return {
    overallHealth,
    topRisks,
    businessImpact,
    recommendedNext,
    confidenceNote,
    overallScore:  score,
    schemaScore,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    totalFixes,
  };
}
