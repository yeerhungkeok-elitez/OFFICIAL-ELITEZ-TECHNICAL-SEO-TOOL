// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Scoring Engine
// ─────────────────────────────────────────────────────────────────────────────
import type { PageData, RobotsData, SitemapData, SEOScore, ScanSummary } from '@/types/seo';

function clamp(val: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, val)));
}

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return count / total;
}

// ─── Category scorers ─────────────────────────────────────────────────────────

function scoreCrawlability(pages: PageData[], robots: RobotsData, sitemap: SitemapData): number {
  let score = 100;

  // robots.txt issues
  if (!robots.accessible) score -= 15;
  if (robots.blockedPaths.some(p => p === '/' || p === '/*')) score -= 50;

  // sitemap issues
  if (!sitemap.accessible)   score -= 15;
  if (sitemap.urlCount === 0 && sitemap.accessible) score -= 8;

  // HTTP errors (4xx/5xx)
  const errorRatio = pct(pages.filter(p => p.statusCode >= 400).length, pages.length);
  score -= Math.round(errorRatio * 35);

  // Crawl failures (0 status)
  const failRatio = pct(pages.filter(p => p.statusCode === 0 && p.crawlError).length, pages.length);
  score -= Math.round(failRatio * 20);

  // Redirects (small penalty)
  const redirectRatio = pct(
    pages.filter(p => p.finalUrl && p.finalUrl !== p.url && p.statusCode === 200).length,
    pages.length
  );
  score -= Math.round(redirectRatio * 10);

  return clamp(score);
}

function scoreIndexability(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (pages.length === 0) return 50;

  let score = 100;

  // Noindex pages
  const noindexRatio = pct(pages.filter(p => p.isNoindex).length, pages.length);
  score -= Math.round(noindexRatio * 50);

  // Missing canonicals
  const noCanonRatio = pct(
    indexable.filter(p => !p.canonical).length,
    indexable.length || 1
  );
  score -= Math.round(noCanonRatio * 20);

  // Wrong canonicals
  const wrongCanonRatio = pct(
    indexable.filter(p => p.canonical && !p.canonicalMatchesSelf).length,
    indexable.length || 1
  );
  score -= Math.round(wrongCanonRatio * 30);

  return clamp(score);
}

function scoreOnPage(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (indexable.length === 0) return 50;

  let score = 100;

  // Missing titles
  const noTitleRatio = pct(indexable.filter(p => !p.title).length, indexable.length);
  score -= Math.round(noTitleRatio * 30);

  // Bad title length
  const badTitleRatio = pct(
    indexable.filter(p => p.title && (p.titleLength < 20 || p.titleLength > 65)).length,
    indexable.length
  );
  score -= Math.round(badTitleRatio * 10);

  // Missing descriptions
  const noDescRatio = pct(indexable.filter(p => !p.metaDescription).length, indexable.length);
  score -= Math.round(noDescRatio * 20);

  // Missing H1
  const noH1Ratio = pct(indexable.filter(p => p.h1Count === 0).length, indexable.length);
  score -= Math.round(noH1Ratio * 20);

  // Multiple H1
  const multiH1Ratio = pct(indexable.filter(p => p.h1Count > 1).length, indexable.length);
  score -= Math.round(multiH1Ratio * 10);

  // Thin content
  const thinRatio = pct(
    indexable.filter(p => p.wordCount > 0 && p.wordCount < 300).length,
    indexable.length
  );
  score -= Math.round(thinRatio * 10);

  return clamp(score);
}

function scoreStructuredData(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (indexable.length === 0) return 50;

  const withSchema = indexable.filter(p => p.hasStructuredData).length;
  const schemaRatio = pct(withSchema, indexable.length);

  // Exponential reward for adoption
  if (schemaRatio === 0)    return 10;
  if (schemaRatio < 0.2)   return 30;
  if (schemaRatio < 0.5)   return 55;
  if (schemaRatio < 0.8)   return 75;
  return clamp(40 + Math.round(schemaRatio * 60));
}

function scorePerformance(_pages: PageData[]): number {
  // V1 placeholder — real perf data requires Lighthouse / CrUX API
  // We approximate using crawl response times
  if (_pages.length === 0) return 70;
  const avgCrawlTime = _pages.reduce((s, p) => s + p.crawlTime, 0) / _pages.length;
  if (avgCrawlTime < 1000) return 85;
  if (avgCrawlTime < 2000) return 75;
  if (avgCrawlTime < 4000) return 60;
  if (avgCrawlTime < 8000) return 45;
  return 30;
}

function scoreInternalLinking(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (indexable.length === 0) return 50;

  let score = 100;

  // Orphan pages (0 internal links going OUT)
  const orphanRatio = pct(
    indexable.filter(p => p.internalLinksCount === 0).length,
    indexable.length
  );
  score -= Math.round(orphanRatio * 60);

  // Low internal links average
  const avgLinks = indexable.reduce((s, p) => s + p.internalLinksCount, 0) / indexable.length;
  if (avgLinks < 2)  score -= 30;
  else if (avgLinks < 5)  score -= 15;
  else if (avgLinks < 10) score -= 5;

  return clamp(score);
}

function scoreImageSEO(pages: PageData[]): number {
  const pagesWithImages = pages.filter(p => p.imageCount > 0 && p.statusCode === 200);
  if (pagesWithImages.length === 0) return 80; // No images = neutral

  const totalImages   = pagesWithImages.reduce((s, p) => s + p.imageCount, 0);
  const imagesWithAlt = pagesWithImages.reduce((s, p) => s + p.imagesWithAlt, 0);
  const altRatio      = pct(imagesWithAlt, totalImages);

  return clamp(Math.round(altRatio * 100));
}

function scoreSocialOG(pages: PageData[]): number {
  const indexable = pages.filter(p => p.statusCode === 200 && !p.isNoindex);
  if (indexable.length === 0) return 50;

  let score = 0;

  const withOgTitle = pct(indexable.filter(p => !!p.ogTitle).length, indexable.length);
  const withOgDesc  = pct(indexable.filter(p => !!p.ogDescription).length, indexable.length);
  const withOgImage = pct(indexable.filter(p => !!p.ogImage).length, indexable.length);

  score += Math.round(withOgTitle  * 40);
  score += Math.round(withOgDesc   * 30);
  score += Math.round(withOgImage  * 30);

  return clamp(score);
}

// ─── Weights ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  crawlability:   0.20,
  indexability:   0.20,
  onPageTechnical: 0.15,
  structuredData: 0.15,
  performance:    0.10,
  internalLinking: 0.10,
  imageSEO:       0.05,
  socialOpenGraph: 0.05,
} as const;

// ─── Main scoring function ────────────────────────────────────────────────────

export function calculateScore(
  pages: PageData[],
  robots: RobotsData,
  sitemap: SitemapData
): SEOScore {
  const crawlability    = scoreCrawlability(pages, robots, sitemap);
  const indexability    = scoreIndexability(pages);
  const onPageTechnical = scoreOnPage(pages);
  const structuredData  = scoreStructuredData(pages);
  const performance     = scorePerformance(pages);
  const internalLinking = scoreInternalLinking(pages);
  const imageSEO        = scoreImageSEO(pages);
  const socialOpenGraph = scoreSocialOG(pages);

  const overall = clamp(
    Math.round(
      crawlability    * WEIGHTS.crawlability    +
      indexability    * WEIGHTS.indexability    +
      onPageTechnical * WEIGHTS.onPageTechnical +
      structuredData  * WEIGHTS.structuredData  +
      performance     * WEIGHTS.performance     +
      internalLinking * WEIGHTS.internalLinking +
      imageSEO        * WEIGHTS.imageSEO        +
      socialOpenGraph * WEIGHTS.socialOpenGraph
    )
  );

  return {
    overall,
    crawlability,
    indexability,
    onPageTechnical,
    structuredData,
    performance,
    internalLinking,
    imageSEO,
    socialOpenGraph,
  };
}

// ─── Summary builder ──────────────────────────────────────────────────────────

export function buildSummary(pages: PageData[], issues: { severity: string }[]): ScanSummary {
  const total       = pages.length;
  const indexable   = pages.filter(p => p.statusCode === 200 && !p.isNoindex).length;
  const noindex     = pages.filter(p => p.isNoindex).length;
  const errorPages  = pages.filter(p => p.statusCode >= 400).length;
  const redirectPages = pages.filter(p =>
    (p.statusCode >= 300 && p.statusCode < 400) ||
    (p.statusCode === 200 && p.finalUrl && p.finalUrl !== p.url)
  ).length;

  return {
    totalPages:    total,
    indexablePages: indexable,
    noindexPages:  noindex,
    errorPages,
    redirectPages,
    criticalIssues: issues.filter(i => i.severity === 'critical').length,
    highIssues:     issues.filter(i => i.severity === 'high').length,
    mediumIssues:   issues.filter(i => i.severity === 'medium').length,
    lowIssues:      issues.filter(i => i.severity === 'low').length,
    totalIssues:    issues.length,
    pagesWithMissingTitle:       pages.filter(p => !p.title && p.statusCode === 200).length,
    pagesWithMissingDescription: pages.filter(p => !p.metaDescription && p.statusCode === 200).length,
    pagesWithMultipleH1:         pages.filter(p => p.h1Count > 1).length,
    pagesWithMissingH1:          pages.filter(p => p.h1Count === 0 && p.statusCode === 200).length,
    pagesWithStructuredData:     pages.filter(p => p.hasStructuredData).length,
    pagesWithOgTags:             pages.filter(p => !!p.ogTitle).length,
  };
}

// ─── Score label helper ───────────────────────────────────────────────────────

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 81) return { label: 'Excellent',     color: '#22c55e' };
  if (score >= 61) return { label: 'Good',          color: '#84cc16' };
  if (score >= 41) return { label: 'Needs Work',    color: '#f59e0b' };
  if (score >= 21) return { label: 'Poor',          color: '#f97316' };
  return              { label: 'Critical',          color: '#ef4444' };
}
