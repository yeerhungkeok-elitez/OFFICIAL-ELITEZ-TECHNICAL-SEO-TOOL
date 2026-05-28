// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Fix Queue Builder (V4)
// Collects issues from V1 (SEO crawl) + V2 (schema) + page analysis
// into a unified FixQueueItem[].
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScanResult,
  SchemaAuditResult,
  GSCDecisionSummary,
  FixQueueItem,
  FixType,
  FixSource,
  FixApprovalLevel,
  EstimatedImpact,
  PageData,
  FixPageSnapshot,
  IssueSeverity,
} from '@/types/seo';
import { detectPageIntent } from './schemaExtractor';

// ─── ID generator ─────────────────────────────────────────────────────────────

let _seq = 0;
function nextId(prefix: string) { return `${prefix}-${++_seq}-${Date.now()}`; }

// ─── PageData → FixPageSnapshot ───────────────────────────────────────────────

function snapshot(page: PageData): FixPageSnapshot {
  return {
    title:                  page.title,
    titleLength:            page.titleLength,
    metaDescription:        page.metaDescription,
    metaDescriptionLength:  page.metaDescriptionLength,
    h1Texts:                page.h1Texts,
    h2Count:                page.h2Count,
    wordCount:              page.wordCount,
    internalLinksCount:     page.internalLinksCount,
    schemaTypes:            page.structuredDataTypes ?? [],
    canonical:              page.canonical,
    canonicalMatchesSelf:   page.canonicalMatchesSelf,
    isNoindex:              page.isNoindex,
    missingAltCount:        page.missingAltCount,
    imageCount:             page.imageCount,
    statusCode:             page.statusCode,
  };
}

function intent(page: PageData): string {
  return detectPageIntent({ url: page.url, title: page.title, h1Texts: page.h1Texts });
}

function makeItem(
  url:              string,
  pageIntent:       string,
  issueType:        string,
  priority:         IssueSeverity,
  fixType:          FixType,
  source:           FixSource,
  currentValue:     string,
  suggestedAction:  string,
  approvalLevel:    FixApprovalLevel,
  estimatedImpact:  EstimatedImpact,
  affectedIssueIds: string[],
  page:             FixPageSnapshot,
): FixQueueItem {
  return {
    id:              nextId(fixType.toLowerCase().replace(/\s+/g, '-')),
    url,
    pageIntent,
    issueType,
    priority,
    fixType,
    source,
    currentValue,
    suggestedAction,
    approvalLevel,
    estimatedImpact,
    affectedIssueIds,
    page,
  };
}

// ─── From page-level data ─────────────────────────────────────────────────────

function fromPageData(page: PageData, snap: FixPageSnapshot, pi: string): FixQueueItem[] {
  const items: FixQueueItem[] = [];
  const url = page.url;

  if (page.statusCode !== 200) return items; // skip error pages — GSC/crawl issues handle those

  // ── SEO Title ──────────────────────────────────────────────────────────
  if (!page.title || page.titleLength < 20) {
    items.push(makeItem(
      url, pi,
      !page.title ? 'Missing title tag' : `Title too short (${page.titleLength} chars)`,
      !page.title ? 'critical' : 'high',
      'SEO Title', 'page-analysis',
      page.title ?? '(missing)',
      'Add a descriptive, keyword-rich title (50–65 characters)',
      'safe', 'high', [],
      snap,
    ));
  } else if (page.titleLength > 70) {
    items.push(makeItem(
      url, pi,
      `Title too long (${page.titleLength} chars)`,
      'medium', 'SEO Title', 'page-analysis',
      page.title ?? '',
      'Trim title to under 65 characters',
      'safe', 'medium', [],
      snap,
    ));
  }

  // ── Meta Description ───────────────────────────────────────────────────
  if (!page.metaDescription || page.metaDescriptionLength < 70) {
    items.push(makeItem(
      url, pi,
      !page.metaDescription ? 'Missing meta description' : `Meta description too short (${page.metaDescriptionLength} chars)`,
      !page.metaDescription ? 'high' : 'medium',
      'Meta Description', 'page-analysis',
      page.metaDescription ?? '(missing)',
      'Write a compelling meta description (120–160 characters)',
      'safe', 'high', [],
      snap,
    ));
  } else if (page.metaDescriptionLength > 165) {
    items.push(makeItem(
      url, pi,
      `Meta description too long (${page.metaDescriptionLength} chars — may be truncated)`,
      'medium', 'Meta Description', 'page-analysis',
      page.metaDescription ?? '',
      'Trim meta description to under 160 characters',
      'safe', 'medium', [],
      snap,
    ));
  }

  // ── H1 ──────────────────────────────────────────────────────────────────
  if (page.h1Count === 0) {
    items.push(makeItem(
      url, pi,
      'Missing H1 heading',
      'high', 'H1', 'page-analysis',
      '(no H1 found)',
      'Add a descriptive H1 heading to the page',
      'safe', 'medium', [],
      snap,
    ));
  } else if (page.h1Count > 1) {
    items.push(makeItem(
      url, pi,
      `Multiple H1s (${page.h1Count} found — should be exactly 1)`,
      'medium', 'H1', 'page-analysis',
      page.h1Texts.join(' / '),
      'Consolidate to a single H1 heading',
      'safe', 'medium', [],
      snap,
    ));
  }

  // ── Image Alt Text ─────────────────────────────────────────────────────
  if (page.missingAltCount > 0) {
    items.push(makeItem(
      url, pi,
      `${page.missingAltCount} image${page.missingAltCount > 1 ? 's' : ''} missing alt text`,
      page.missingAltCount >= 3 ? 'medium' : 'low',
      'Image Alt Text', 'page-analysis',
      `${page.missingAltCount} of ${page.imageCount} images have no alt attribute`,
      'Add descriptive alt text to all images',
      'safe', 'medium', [],
      snap,
    ));
  }

  // ── Canonical ──────────────────────────────────────────────────────────
  if (!page.canonicalMatchesSelf && page.canonical) {
    items.push(makeItem(
      url, pi,
      `Canonical points elsewhere: ${page.canonical}`,
      'high', 'Canonical', 'page-analysis',
      page.canonical,
      'Verify canonical is intentional or fix to be self-referential',
      'needs-developer', 'high', [],
      snap,
    ));
  } else if (!page.canonical && page.statusCode === 200) {
    items.push(makeItem(
      url, pi,
      'No canonical tag — may cause duplicate content issues',
      'low', 'Canonical', 'page-analysis',
      '(missing)',
      'Add self-referential canonical tag',
      'safe', 'low', [],
      snap,
    ));
  }

  // ── Internal Links ─────────────────────────────────────────────────────
  const isImportant = ['homepage', 'service', 'product', 'contact', 'faq'].includes(pi);
  if (page.internalLinksCount < 2 && isImportant) {
    items.push(makeItem(
      url, pi,
      `Only ${page.internalLinksCount} internal link${page.internalLinksCount !== 1 ? 's' : ''} — low discoverability`,
      'medium', 'Internal Links', 'page-analysis',
      `${page.internalLinksCount} inbound internal links`,
      'Add internal links from homepage and related pages',
      'safe', 'medium', [],
      snap,
    ));
  }

  // ── Noindex on important pages ─────────────────────────────────────────
  if (page.isNoindex && isImportant) {
    items.push(makeItem(
      url, pi,
      `noindex tag on important ${pi} page`,
      'critical', 'Noindex', 'page-analysis',
      'meta robots: noindex',
      'Remove noindex directive — this page should be indexed',
      'needs-developer', 'high', [],
      snap,
    ));
  }

  return items;
}

// ─── From schema audit ────────────────────────────────────────────────────────

const SCHEMA_FIX_MAP: Partial<Record<string, FixType>> = {
  'missing-organization':        'Organization Schema',
  'missing-website':             'Organization Schema',
  'missing-service':             'Service Schema',
  'missing-article':             'Article Schema',
  'missing-faqpage':             'FAQPage Schema',
  'missing-breadcrumb':          'Breadcrumb Schema',
  'missing-property-org-logo':   'Organization Schema',
  'missing-property-org-sameas': 'Organization Schema',
  'missing-property-article-headline':   'Article Schema',
  'missing-property-article-date':       'Article Schema',
  'missing-property-article-image':      'Article Schema',
  'missing-property-breadcrumb-items':   'Breadcrumb Schema',
  'duplicate-type':              'Organization Schema',
  'invalid-json':                'Organization Schema',
};

function fromSchemaAudit(
  schemaAudit: SchemaAuditResult,
  pageMap: Map<string, PageData>,
): FixQueueItem[] {
  const items: FixQueueItem[] = [];

  for (const issue of schemaAudit.issues) {
    const fixType: FixType = SCHEMA_FIX_MAP[issue.type] ?? 'Organization Schema';
    const affectedUrls = issue.affectedPages.slice(0, 5);

    for (const url of affectedUrls) {
      const page = pageMap.get(url);
      const snap: FixPageSnapshot = page ? snapshot(page) : {
        title: null, titleLength: 0, metaDescription: null, metaDescriptionLength: 0,
        h1Texts: [], h2Count: 0, wordCount: 0, internalLinksCount: 0, schemaTypes: [],
        canonical: null, canonicalMatchesSelf: true, isNoindex: false,
        missingAltCount: 0, imageCount: 0, statusCode: 200,
      };
      const pi = page ? intent(page) : 'other';

      items.push(makeItem(
        url, pi,
        issue.problem,
        issue.severity,
        fixType, 'schema-audit',
        issue.technicalDetail,
        issue.recommendedFix,
        issue.fixSafety === 'safe' ? 'safe' : issue.fixSafety === 'needs-review' ? 'needs-review' : 'needs-developer',
        issue.severity === 'critical' || issue.severity === 'high' ? 'high' : 'medium',
        [issue.id],
        snap,
      ));

      // Only first affected URL per issue to avoid queue explosion
      break;
    }
  }

  return items;
}

// ─── From GSC decisions ───────────────────────────────────────────────────────

const GSC_FIX_MAP: Partial<Record<string, FixType>> = {
  'Fix Accidental Noindex':   'Noindex',
  'Fix Canonical':            'Canonical',
  'Improve Before Indexing':  'SEO Title',
  'Add to Sitemap':           'Sitemap',
  'Remove From Sitemap':      'Sitemap',
  'Redirect':                 'Redirect',
};

function fromGSC(
  gscData: GSCDecisionSummary,
  pageMap: Map<string, PageData>,
): FixQueueItem[] {
  const items: FixQueueItem[] = [];

  for (const r of gscData.records) {
    const fixType: FixType | undefined = GSC_FIX_MAP[r.decision.decision];
    if (!fixType) continue;
    if (r.decision.decision === 'Index' || r.decision.decision === 'Keep Noindex') continue;

    const page = pageMap.get(r.gsc.url);
    const snap: FixPageSnapshot = page ? snapshot(page) : {
      title: r.crawledPage?.title ?? null, titleLength: r.crawledPage?.titleLength ?? 0,
      metaDescription: r.crawledPage?.metaDescription ?? null, metaDescriptionLength: r.crawledPage?.metaDescLength ?? 0,
      h1Texts: [], h2Count: 0, wordCount: r.crawledPage?.wordCount ?? 0,
      internalLinksCount: r.crawledPage?.internalLinksCount ?? 0, schemaTypes: r.crawledPage?.schemaTypes ?? [],
      canonical: r.crawledPage?.canonical ?? null, canonicalMatchesSelf: r.crawledPage?.canonicalMatchesSelf ?? true,
      isNoindex: r.crawledPage?.noindex ?? false, missingAltCount: 0, imageCount: 0,
      statusCode: r.crawledPage?.statusCode ?? 200,
    };
    const pi = r.crawledPage?.pageIntent ?? 'other';

    const priority: IssueSeverity =
      r.decision.priority === 'critical' ? 'critical' :
      r.decision.priority === 'high'     ? 'high'     :
      r.decision.priority === 'medium'   ? 'medium'   : 'low';

    items.push(makeItem(
      r.gsc.url, pi,
      r.gsc.reason || r.decision.decision,
      priority, fixType, 'gsc',
      r.gsc.reason,
      r.decision.recommendedActions[0] ?? r.decision.clientExplanation,
      r.decision.approvalLevel === 'needs-developer' ? 'needs-developer' :
      r.decision.approvalLevel === 'needs-review'    ? 'needs-review'    : 'safe',
      priority === 'critical' || priority === 'high' ? 'high' : 'medium',
      [],
      snap,
    ));
  }

  return items;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicate(items: FixQueueItem[]): FixQueueItem[] {
  const seen = new Map<string, boolean>();
  return items.filter(item => {
    const key = `${item.url}||${item.fixType}`;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

// ─── Priority sort ────────────────────────────────────────────────────────────

const PRI: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const IMP: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortQueue(items: FixQueueItem[]): FixQueueItem[] {
  return [...items].sort((a, b) => {
    const p = (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3);
    if (p !== 0) return p;
    return (IMP[a.estimatedImpact] ?? 2) - (IMP[b.estimatedImpact] ?? 2);
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildFixQueue(
  result:      ScanResult,
  schemaAudit?: SchemaAuditResult,
  gscData?:    GSCDecisionSummary,
): FixQueueItem[] {
  _seq = 0; // reset sequence each build

  const pageMap = new Map<string, PageData>();
  for (const p of result.pages) {
    pageMap.set(p.url, p);
    pageMap.set(p.finalUrl, p);
  }

  const all: FixQueueItem[] = [];

  // ── Page-level analysis ────────────────────────────────────────────────
  for (const page of result.pages) {
    if (page.statusCode !== 200) continue;
    const snap = snapshot(page);
    const pi   = intent(page);
    all.push(...fromPageData(page, snap, pi));
  }

  // ── Schema audit ───────────────────────────────────────────────────────
  if (schemaAudit) {
    all.push(...fromSchemaAudit(schemaAudit, pageMap));
  }

  // ── GSC decisions ──────────────────────────────────────────────────────
  if (gscData) {
    all.push(...fromGSC(gscData, pageMap));
  }

  return sortQueue(deduplicate(all));
}

export function getQueueStats(items: FixQueueItem[]) {
  return {
    total:     items.length,
    critical:  items.filter(i => i.priority === 'critical').length,
    high:      items.filter(i => i.priority === 'high').length,
    medium:    items.filter(i => i.priority === 'medium').length,
    low:       items.filter(i => i.priority === 'low').length,
    safe:      items.filter(i => i.approvalLevel === 'safe').length,
    review:    items.filter(i => i.approvalLevel === 'needs-review').length,
    developer: items.filter(i => i.approvalLevel === 'needs-developer').length,
  };
}
