// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Public Audit Runner (V8)
// Transforms a full ScanResult into a limited PublicAuditResult.
// Used after crawling with maxPages=10 & publicMode=true.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanResult, PublicAuditResult, PublicAuditTopIssue, IssueSeverity } from '@/types/seo';

// ─── Severity priority ────────────────────────────────────────────────────────

const SEV_ORDER: Record<IssueSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ─── Teaser summary generator ─────────────────────────────────────────────────

function buildTeaserSummary(
  score:   number,
  issues:  PublicAuditTopIssue[],
  isWP:    boolean,
  pages:   number,
): string {
  const label =
    score >= 80 ? 'in good health' :
    score >= 60 ? 'with room for improvement' :
    score >= 40 ? 'with significant issues' :
    'with critical technical problems';

  const critCount = issues.filter(i => i.severity === 'critical').length;

  let summary = `We scanned ${pages} page${pages !== 1 ? 's' : ''} of your website and found it to be ${label} `;
  summary += `(score: ${score}/100).`;

  if (critCount > 0) {
    summary += ` ${critCount} critical issue${critCount > 1 ? 's were' : ' was'} detected that may affect your visibility in search results.`;
  } else if (issues.length > 0) {
    summary += ` ${issues.length} technical issue${issues.length > 1 ? 's were' : ' was'} found.`;
  }

  if (isWP) {
    summary += ' Your site appears to be running WordPress — we have specialist WordPress SEO fix guides available.';
  }

  return summary;
}

// ─── Recommended next steps ────────────────────────────────────────────────────

function buildNextSteps(
  score:   number,
  issues:  PublicAuditTopIssue[],
  isWP:    boolean,
  hasSchema: boolean,
): string[] {
  const steps: string[] = [];

  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasHigh     = issues.some(i => i.severity === 'high');

  if (hasCritical) {
    steps.push('Address critical technical SEO issues that may affect your ability to be found in search results');
  }
  if (hasHigh) {
    steps.push('Resolve high-priority on-page issues including missing titles, descriptions, and heading structure');
  }
  if (!hasSchema) {
    steps.push('Implement structured data markup to help search engines better understand your content');
  }
  if (isWP) {
    steps.push('Configure your WordPress SEO plugin (Yoast SEO or Rank Math) with the recommended settings');
  }
  if (score < 60) {
    steps.push('Review your robots.txt and sitemap configuration to ensure key pages are crawlable and indexable');
  }
  if (score >= 60 && score < 80) {
    steps.push('Improve internal linking structure to distribute link equity more effectively across your site');
  }
  if (score >= 80) {
    steps.push('Consider advanced technical SEO optimisations such as Core Web Vitals and international SEO');
  }

  // Always include a CTA step
  steps.push('Request a full technical SEO audit and fix proposal tailored to your website and business goals');

  return steps.slice(0, 5);
}

// ─── Locked section labels ────────────────────────────────────────────────────

const LOCKED_SECTIONS = [
  'Full issue list with all ' + '20+ checks',
  'Page-by-page detailed breakdown',
  'WordPress plugin-specific fix instructions',
  'Schema markup recommendations',
  'Developer task list with code snippets',
  'AI-generated fix prompts',
  'PDF report download',
  '30-day action roadmap',
];

// ─── WordPress detection from ScanResult ─────────────────────────────────────

function detectWordPressFromResult(result: ScanResult): boolean {
  const robots = result.robots.content ?? '';
  if (robots.includes('/wp-admin/') || robots.includes('wp-content')) return true;
  if (result.robots.sitemapUrls.some(u => u.includes('wp-sitemap.xml') || u.includes('sitemap_index.xml'))) return true;
  const allUrls = result.pages.map(p => p.url);
  return allUrls.some(u =>
    u.includes('/wp-content/') || u.includes('/wp-admin/') ||
    u.includes('/category/') || u.includes('/wp-json/'),
  );
}

// ─── Main transform ───────────────────────────────────────────────────────────

export function buildPublicAuditResult(
  result:     ScanResult,
  includeRaw: boolean = false,
): PublicAuditResult {
  const { score, issues, pages, schemaAudit } = result;

  const wordpressDetected = detectWordPressFromResult(result);
  const schemaDetected    = pages.some(p => p.hasStructuredData);
  const schemaScore       = schemaAudit?.score.overall ?? null;

  // Top 3 issues by severity then count
  const topIssues: PublicAuditTopIssue[] = issues
    .slice()
    .sort((a, b) => {
      const sevDiff = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (sevDiff !== 0) return sevDiff;
      return b.count - a.count;
    })
    .slice(0, 3)
    .map(i => ({
      problem:  i.problem,
      severity: i.severity,
      count:    i.count,
    }));

  const teaserSummary = buildTeaserSummary(
    score.overall, topIssues, wordpressDetected, pages.length,
  );

  const recommendedNextSteps = buildNextSteps(
    score.overall, topIssues, wordpressDetected, schemaDetected,
  );

  return {
    websiteUrl:           result.startUrl,
    domain:               result.domain,
    scannedAt:            result.crawledAt,
    score:                score.overall,
    schemaScore,
    wordpressDetected,
    schemaDetected,
    pagesScanned:         pages.length,
    topIssues,
    teaserSummary,
    lockedSections:       LOCKED_SECTIONS,
    recommendedNextSteps,
    ...(includeRaw ? { rawResult: result } : {}),
  };
}
