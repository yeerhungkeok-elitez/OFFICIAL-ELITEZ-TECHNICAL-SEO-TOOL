// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — GSC URL Matcher (V3)
// Matches imported GSC URLs against crawled PageData records.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  GSCRecord,
  GSCImportSummary,
  MatchedGSCRecord,
  MatchedPageData,
  PageData,
  DecisionPriority,
  IndexingDecisionType,
} from '@/types/seo';
import { detectPageIntent } from './schemaExtractor';
import { makeDecision } from './indexingDecisionEngine';

// ─── Extended page intent detection ─────────────────────────────────────────
// detectPageIntent returns the V2 PageIntent ('homepage'|'blog'|'service'|…|'other')
// We supplement with URL-pattern–based low-value intent detection.

const INTENT_URL_PATTERNS: Array<{ pattern: RegExp; intent: string }> = [
  { pattern: /\/(tag|tags)\//i,                                intent: 'tag'         },
  { pattern: /\/(category|categories|cat)\//i,                 intent: 'category'    },
  { pattern: /[?&]s=/i,                                        intent: 'search'      },
  { pattern: /\/search[/?]/i,                                  intent: 'search'      },
  { pattern: /\/(wp-admin|admin|backend|dashboard)\//i,        intent: 'admin'       },
  { pattern: /\/(thank[-_]?you|order[-_]?received|success|confirmation)[/?]/i,
                                                               intent: 'thank-you'   },
  { pattern: /\/(cart|basket)[/?]/i,                           intent: 'cart'        },
  { pattern: /\/(checkout)[/?]/i,                              intent: 'checkout'    },
  { pattern: /\/author\//i,                                    intent: 'author'      },
  { pattern: /\/page\/\d+[/?]?$/i,                             intent: 'pagination'  },
  { pattern: /\/(login|register|sign[-_]?up|logout|reset[-_]?password)[/?]/i,
                                                               intent: 'login'       },
  { pattern: /\/feed\/?$/i,                                    intent: 'utility'     },
  { pattern: /\/print\//i,                                     intent: 'utility'     },
  { pattern: /\/(about|our[-_]?story|who[-_]?we[-_]?are)\//i, intent: 'about'       },
  { pattern: /\/(location|office|branch)\//i,                  intent: 'location'    },
  { pattern: /\/landing\//i,                                   intent: 'landing'     },
];

function extendedPageIntent(url: string, baseIntent: string): string {
  // If base intent is something specific (not 'other'), trust it
  if (baseIntent !== 'other') return baseIntent;
  // Otherwise try URL-pattern matching
  for (const { pattern, intent } of INTENT_URL_PATTERNS) {
    if (pattern.test(url)) return intent;
  }
  return 'other';
}

// ─── URL normalisation ────────────────────────────────────────────────────────

const STRIP_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'utm_source_platform', 'fbclid', 'gclid', 'gclsrc', 'dclid',
  'zanpid', 'igshid', 'mc_eid', 'ref', '_ga', '_gl',
]);

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());

    // Lowercase hostname
    url.hostname = url.hostname.toLowerCase();

    // Strip fragment
    url.hash = '';

    // Remove tracking params
    const keysToDelete: string[] = [];
    for (const key of url.searchParams.keys()) {
      if (STRIP_PARAMS.has(key.toLowerCase())) keysToDelete.push(key);
    }
    keysToDelete.forEach(k => url.searchParams.delete(k));

    // Remove trailing slash (but keep root path /)
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Normalise to https for comparison
    url.protocol = 'https:';

    return url.toString();
  } catch {
    return raw.trim().replace(/\/$/, '').toLowerCase();
  }
}

// ─── Page map builder ─────────────────────────────────────────────────────────

function buildPageMap(pages: PageData[]): Map<string, PageData> {
  const map = new Map<string, PageData>();
  for (const page of pages) {
    // Index by normalised URL (with and without trailing slash variants)
    const base = normalizeUrl(page.url);
    map.set(base, page);

    // Also index the www ↔ non-www variant
    try {
      const u = new URL(base);
      if (u.hostname.startsWith('www.')) {
        u.hostname = u.hostname.slice(4);
      } else {
        u.hostname = 'www.' + u.hostname;
      }
      map.set(u.toString(), page);
    } catch { /* skip */ }
  }
  return map;
}

// ─── Page data extraction ─────────────────────────────────────────────────────

function extractMatchedPageData(page: PageData): MatchedPageData {
  const baseIntent = detectPageIntent({
    url:      page.url,
    title:    page.title,
    h1Texts:  page.h1Texts,
  });

  const pageIntent = extendedPageIntent(page.url, baseIntent);

  // Derive technical issue strings from page fields
  const technicalIssues: string[] = [];
  if (page.statusCode >= 400)                technicalIssues.push(`HTTP ${page.statusCode} error`);
  if (page.isNoindex)                        technicalIssues.push('noindex tag present');
  if (!page.canonicalMatchesSelf && page.canonical)
                                             technicalIssues.push(`canonical → ${page.canonical}`);
  if (page.redirectChain.length > 0)         technicalIssues.push(`redirect chain (${page.redirectChain.length} hop${page.redirectChain.length > 1 ? 's' : ''})`);
  if (page.titleLength === 0)                technicalIssues.push('missing title tag');
  if (page.h1Count === 0)                    technicalIssues.push('no H1 heading');
  if (page.missingAltCount > 0)              technicalIssues.push(`${page.missingAltCount} image${page.missingAltCount > 1 ? 's' : ''} missing alt text`);
  if (page.crawlError)                       technicalIssues.push(`crawl error: ${page.crawlError}`);

  return {
    statusCode:           page.statusCode,
    title:                page.title,
    metaDescription:      page.metaDescription,
    canonical:            page.canonical,
    canonicalMatchesSelf: page.canonicalMatchesSelf,
    noindex:              page.isNoindex,
    wordCount:            page.wordCount,
    internalLinksCount:   page.internalLinksCount,
    schemaTypes:          page.structuredDataTypes ?? [],
    technicalIssues,
    pageIntent,
    hasH1:                page.h1Count > 0,
    titleLength:          page.titleLength,
    metaDescLength:       page.metaDescriptionLength,
    missingAltCount:      page.missingAltCount,
  };
}

// ─── Main matcher ─────────────────────────────────────────────────────────────

export function matchGSCRecords(
  gscRecords: GSCRecord[],
  pages: PageData[],
): MatchedGSCRecord[] {
  const pageMap = buildPageMap(pages);

  return gscRecords.map(gsc => {
    const normKey     = normalizeUrl(gsc.url);
    const matchedPage = pageMap.get(normKey) ?? null;

    const crawledPage  = matchedPage ? extractMatchedPageData(matchedPage) : null;
    const crawlStatus: 'matched' | 'not-crawled' = matchedPage ? 'matched' : 'not-crawled';
    const decision     = makeDecision(gsc, crawledPage);

    return { gsc, crawledPage, crawlStatus, decision };
  });
}

// ─── Summary builder ─────────────────────────────────────────────────────────

export function buildGSCSummary(records: MatchedGSCRecord[]): GSCImportSummary {
  const reasonBreakdown:   Record<string, number>   = {};
  const decisionBreakdown: Partial<Record<IndexingDecisionType, number>> = {};
  const priorityBreakdown: Record<DecisionPriority, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  };

  let matchedCount       = 0;
  let indexedCount       = 0;
  let actionRequiredCount = 0;

  for (const r of records) {
    // Reason breakdown
    const reason = r.gsc.reason || 'Unknown';
    reasonBreakdown[reason] = (reasonBreakdown[reason] ?? 0) + 1;

    // Decision breakdown
    const d = r.decision.decision;
    decisionBreakdown[d] = ((decisionBreakdown[d] ?? 0) as number) + 1;

    // Priority
    priorityBreakdown[r.decision.priority]++;

    // Counts
    if (r.crawlStatus === 'matched') matchedCount++;
    if (r.gsc.reasonCategory === 'indexed') indexedCount++;
    if (r.decision.decision !== 'Index' && r.decision.priority !== 'low') actionRequiredCount++;
  }

  return {
    totalUrls:           records.length,
    reasonBreakdown,
    decisionBreakdown,
    priorityBreakdown,
    matchedCount,
    unmatchedCount:      records.length - matchedCount,
    indexedCount,
    actionRequiredCount,
  };
}
