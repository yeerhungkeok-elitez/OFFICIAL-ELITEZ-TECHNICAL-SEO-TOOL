// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Indexing Decision Engine (V3)
// Assigns clear, actionable indexing decisions for every GSC URL.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  GSCRecord,
  MatchedPageData,
  IndexingDecision,
  IndexingDecisionType,
  ApprovalLevel,
  DecisionPriority,
} from '@/types/seo';

// ─── Intent classification ────────────────────────────────────────────────────

/** Page intents that should generally be indexed */
const INDEXABLE_INTENTS = new Set([
  'homepage', 'service', 'article', 'blog', 'product',
  'contact', 'faq', 'location', 'about', 'landing',
]);

/** Page intents that should generally keep noindex */
const NOINDEX_INTENTS = new Set([
  'tag', 'category', 'search', 'admin', 'thank-you',
  'cart', 'checkout', 'author', 'archive', 'pagination',
  'login', 'register', 'utility',
]);

/** High-priority page types where noindex is almost certainly accidental */
const CRITICAL_INTENTS = new Set(['homepage', 'service', 'product', 'location']);

/** URL patterns that strongly suggest low-value pages */
const LOW_VALUE_PATTERNS: RegExp[] = [
  /\/(tag|tags)\//i,
  /\/(category|categories|cat)\//i,
  /[?&]s=/i,
  /\/search[/?]/i,
  /\/(wp-admin|admin|backend|dashboard)\//i,
  /\/(thank[-_]?you|order[-_]?received|success|confirmation)[/?]/i,
  /\/(cart|basket|checkout)[/?]/i,
  /\/author\//i,
  /\/page\/\d+[/?]?$/i,
  /\/(login|register|sign[-_]?up|logout|reset[-_]?password)[/?]/i,
  /\/feed\/?$/i,
  /\/print\//i,
  /[?&](utm_source|fbclid|gclid)/i,
  /\/(attachment)\//i,
  /\/\?p=\d+$/i,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLowValueUrl(url: string): boolean {
  return LOW_VALUE_PATTERNS.some(p => p.test(url));
}

function isImportant(url: string, intent: string | undefined): boolean {
  if (intent && INDEXABLE_INTENTS.has(intent)) return true;
  // Root-ish path suggests importance
  try {
    const { pathname } = new URL(url);
    const depth = pathname.split('/').filter(Boolean).length;
    if (depth <= 1 && !isLowValueUrl(url)) return true;
  } catch { /* ignore */ }
  return false;
}

function isLowValue(url: string, intent: string | undefined): boolean {
  if (intent && NOINDEX_INTENTS.has(intent)) return true;
  return isLowValueUrl(url);
}

function hasGoodContent(page: MatchedPageData | null): boolean {
  if (!page) return false;
  return page.wordCount >= 300 &&
         !!page.title && page.titleLength >= 20 &&
         !!page.metaDescription && page.metaDescLength >= 50 &&
         page.hasH1;
}

function getWeaknesses(page: MatchedPageData | null): string[] {
  if (!page) return ['Page was not found in crawl results'];
  const w: string[] = [];
  if (page.wordCount < 150)       w.push(`Thin content — only ${page.wordCount} words (aim for 300+)`);
  else if (page.wordCount < 300)  w.push(`Short content — ${page.wordCount} words (aim for 300+)`);
  if (!page.title || page.titleLength < 15) w.push('Missing or very short title tag');
  if (!page.metaDescription || page.metaDescLength < 50) w.push('Missing or short meta description');
  if (!page.hasH1)                w.push('No H1 heading');
  if (page.internalLinksCount < 2) w.push(`Only ${page.internalLinksCount} internal links — very low authority signal`);
  return w;
}

function hasCanonicalIssue(page: MatchedPageData | null, gscUrl: string): boolean {
  if (!page || !page.canonical || page.canonicalMatchesSelf) return false;
  try {
    const cp = new URL(page.canonical).pathname.replace(/\/$/, '');
    const gp = new URL(gscUrl).pathname.replace(/\/$/, '');
    return cp !== gp;
  } catch {
    return false;
  }
}

// ─── Decision functions ───────────────────────────────────────────────────────

function makeIndexed(_gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  return {
    decision:             'Index',
    priority:             'low',
    approvalLevel:        'safe',
    clientExplanation:    'This page is already in Google\'s index. No action needed.',
    explanation:          'Page is successfully indexed by Google.',
    likelyCauses:         [],
    recommendedActions:   [
      'Monitor performance in Google Search Console → Performance report',
      'Continue improving content quality for better rankings',
    ],
    developerInstructions: 'No action needed. Page is indexed and working correctly.',
  };
}

function makeNoindex(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  if (isLowValue(url, intent)) {
    return {
      decision:          'Keep Noindex',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'This page has a noindex tag — and that\'s correct. It\'s a utility or archive page that doesn\'t benefit from appearing in Google. No action needed.',
      explanation:       'Noindex on low-value page (tag/category/admin/utility). Intentional and correct.',
      likelyCauses:      ['Page type (tag/category/archive) is intentionally excluded from Google'],
      recommendedActions: [
        'No action needed — this is working correctly',
        'Confirm the noindex tag is applied consistently to all pages of this type',
      ],
      developerInstructions: 'No changes required. Verify <meta name="robots" content="noindex"> or X-Robots-Tag is applied consistently.',
    };
  }

  if (isImportant(url, intent)) {
    const isCritical = !!intent && CRITICAL_INTENTS.has(intent);
    return {
      decision:          'Fix Accidental Noindex',
      priority:          isCritical ? 'critical' : 'high',
      approvalLevel:     'needs-developer',
      clientExplanation:
        `This is an important ${intent ?? 'page'}, but it has a "noindex" tag that tells Google NOT to show it in search results. This is almost certainly a mistake. Fixing it could restore lost search visibility for this page.`,
      explanation:
        `Page intent "${intent}" should be indexed. noindex tag is likely accidental.`,
      likelyCauses: [
        'noindex tag was added during development and not removed before going live',
        'CMS plugin (Yoast SEO, RankMath) setting was set to "noindex" by mistake',
        'WordPress "Discourage search engines from indexing this site" option is enabled',
        'Staging/dev noindex config was accidentally copied to production',
      ],
      recommendedActions: [
        'Remove the noindex directive from this page immediately',
        'Check your SEO plugin settings — look for an "Indexing" or "Advanced" tab',
        'After removing noindex, use Google Search Console → URL Inspection to request re-indexing',
        'Confirm the page appears in Google by searching: site:' + (() => { try { return new URL(url).hostname; } catch { return url; } })(),
      ],
      developerInstructions:
        `Remove the noindex directive. Check: ` +
        `(1) <meta name="robots" content="noindex"> in HTML <head>, ` +
        `(2) X-Robots-Tag: noindex in HTTP response headers, ` +
        `(3) CMS plugin settings (Yoast: Advanced tab → Robots meta). ` +
        `After fixing, submit in GSC URL Inspection → Request Indexing.`,
    };
  }

  // Unknown intent — needs review
  return {
    decision:          'Needs Review',
    priority:          'medium',
    approvalLevel:     'needs-review',
    clientExplanation: 'This page has a noindex tag. We need to decide whether this is intentional. If this page is important for your business, the noindex should be removed.',
    explanation:       'Page has noindex but intent is unclear from URL alone. Manual review needed.',
    likelyCauses:      ['noindex may be accidental', 'Page purpose unclear from URL alone'],
    recommendedActions: [
      'Open the page and check its purpose',
      'If it\'s important content (service, product, article): remove the noindex tag',
      'If it\'s private, utility, or low-value: keep noindex',
    ],
    developerInstructions:
      'Review page intent manually. ' +
      'Check for <meta name="robots" content="noindex"> and remove if page should be indexed.',
  };
}

function makeCrawledNotIndexed(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  // Canonical pointing elsewhere
  if (hasCanonicalIssue(page, url)) {
    return {
      decision:          'Fix Canonical',
      priority:          'high',
      approvalLevel:     'needs-developer',
      clientExplanation:
        'Google crawled this page but isn\'t indexing it because it found a canonical tag pointing to a different URL. This tells Google "index the other page, not this one." We need to check whether that\'s intentional.',
      explanation:
        `Canonical tag points to "${page?.canonical}" — Google defers to that URL instead.`,
      likelyCauses: [
        'Canonical tag points to a slightly different URL variant (www vs non-www, http vs https)',
        'CMS generated an incorrect canonical during a migration',
        'Canonical was set on a page template but not customised for this specific URL',
      ],
      recommendedActions: [
        `Review the canonical tag — it currently points to: "${page?.canonical}"`,
        'If THIS page is the correct version to index, update the canonical to match this URL',
        'If the canonical target is correct, this page is intentionally deferred — no action needed',
        'Check your SEO plugin\'s canonical URL settings',
      ],
      developerInstructions:
        `Current canonical: <link rel="canonical" href="${page?.canonical}">. ` +
        `If this page should be indexed, change canonical to "${url}" (self-referential). ` +
        `If the canonical target should be indexed, ensure that URL is accessible and indexed.`,
    };
  }

  // Low-value — should stay un-indexed
  if (isLowValue(url, intent)) {
    return {
      decision:          'Keep Noindex',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'Google crawled this page but decided not to index it — which is the right call for this type of page. Consider adding a noindex tag to make this explicit.',
      explanation:       'Google correctly chose not to index this low-value page.',
      likelyCauses:      ['Page is an archive, utility, or low-quality page that Google correctly deprioritised'],
      recommendedActions: [
        'Consider adding <meta name="robots" content="noindex,follow"> to make exclusion explicit',
        'Remove from XML sitemap if present',
      ],
      developerInstructions: 'Add <meta name="robots" content="noindex,follow"> to <head>. Remove URL from sitemap.xml.',
    };
  }

  // Content quality problems
  const weaknesses = getWeaknesses(page);
  if (weaknesses.length >= 1) {
    const isCritical = !!intent && CRITICAL_INTENTS.has(intent);
    return {
      decision:          'Improve Before Indexing',
      priority:          isCritical ? 'high' : 'medium',
      approvalLevel:     'needs-review',
      clientExplanation:
        'Google crawled this page but decided it\'s not good enough to show in search results yet. This usually means the page needs more content, better titles, or more internal links pointing to it.',
      explanation:
        `Google crawled but declined to index. Quality issues: ${weaknesses.join('; ')}`,
      likelyCauses: [
        ...weaknesses,
        'Content may be too similar to other pages on the site',
        'Page may not provide enough unique value for search users',
      ],
      recommendedActions: [
        ...((page?.wordCount ?? 0) < 300     ? ['Expand page content to at least 300 words of unique, helpful information'] : []),
        ...(!page?.title || (page?.titleLength ?? 0) < 15 ? ['Add a clear, descriptive title tag (50–60 characters)']          : []),
        ...(!page?.metaDescription           ? ['Write a compelling meta description (120–160 characters)']                   : []),
        ...(!page?.hasH1                     ? ['Add an H1 heading that describes the main topic of the page']                : []),
        ...((page?.internalLinksCount ?? 0) < 2 ? ['Add internal links from your homepage and key pages to this one']        : []),
        'After improving, use Google Search Console URL Inspection → Request Indexing',
        'Allow 2–4 weeks for Google to re-evaluate',
      ],
      developerInstructions:
        'Content quality improvements needed: ' +
        weaknesses.join('; ') +
        '. After fixing, submit via GSC URL Inspection.',
    };
  }

  // Good content — timing / quality gap
  return {
    decision:          'Improve Before Indexing',
    priority:          'medium',
    approvalLevel:     'needs-review',
    clientExplanation:
      'Google crawled this page but hasn\'t indexed it. This can happen when Google considers the content too similar to other pages on the site, or when the page hasn\'t built enough internal authority yet.',
    explanation:
      'No obvious content quality issues detected. May be uniqueness or authority issue.',
    likelyCauses: [
      'Content may overlap with other pages on the site (near-duplicate)',
      'Not enough internal links pointing to this page from authoritative sections',
      'Page may be relatively new — Google may index it on the next crawl',
    ],
    recommendedActions: [
      'Make the page content more unique — add specific information not found elsewhere on the site',
      'Add internal links from your most important pages (homepage, top service pages)',
      'Submit via Google Search Console → URL Inspection → Request Indexing',
      'Monitor for 3–6 weeks',
    ],
    developerInstructions:
      'No critical technical issues. Focus on content differentiation and internal link authority. ' +
      'Use GSC URL Inspection to manually request a crawl.',
  };
}

function makeDiscoveredNotIndexed(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  if (isLowValue(url, intent)) {
    return {
      decision:          'Remove From Sitemap',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'Google found this URL but hasn\'t crawled it. Since this looks like a utility or archive page, remove it from your sitemap and add a noindex tag.',
      explanation:       'Discovered but not crawled. Low-value page — should be excluded explicitly.',
      likelyCauses:      ['Page was found via a link but Google deprioritised crawling it'],
      recommendedActions: [
        'Remove from XML sitemap',
        'Add noindex meta tag',
        'Remove internal links pointing to this URL',
      ],
      developerInstructions:
        'Remove URL from sitemap.xml. Add <meta name="robots" content="noindex,follow"> to page.',
    };
  }

  return {
    decision:          isImportant(url, intent) ? 'Improve Before Indexing' : 'Add to Sitemap',
    priority:          isImportant(url, intent) ? 'high' : 'medium',
    approvalLevel:     'safe',
    clientExplanation:
      'Google found this page but hasn\'t crawled or indexed it yet. This typically means Google doesn\'t see it as a priority. Adding it to your sitemap and linking to it from important pages will signal that it matters.',
    explanation:
      'Page discovered but not yet crawled. Needs better discoverability via sitemap + internal links.',
    likelyCauses: [
      'Page is not in the XML sitemap',
      'Very few internal links pointing to this page',
      'Google used its crawl budget on higher-priority pages',
      'Page may be relatively new',
    ],
    recommendedActions: [
      'Add this URL to your XML sitemap',
      'Add internal links from your homepage and most popular pages',
      'Use Google Search Console → URL Inspection → Request Indexing',
      'Improve page content so Google sees it as worthwhile',
    ],
    developerInstructions:
      'Add to sitemap.xml. Add internal links from high-authority pages. ' +
      'Use GSC URL Inspection to trigger an initial crawl.',
  };
}

function makeDuplicateNoCanonical(gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  return {
    decision:          'Fix Canonical',
    priority:          'high',
    approvalLevel:     'needs-developer',
    clientExplanation:
      'Google found multiple versions of this page with very similar content, but your site hasn\'t told Google which one is the "main" version. This can split your search rankings across multiple URLs. You need to add a canonical tag.',
    explanation:
      'Duplicate content without a user-specified canonical. Google is uncertain which URL to index.',
    likelyCauses: [
      'Same content accessible via multiple URL variants (www / non-www, http / https, trailing slash)',
      'URL parameters creating duplicates (e.g. ?sort=name, ?color=red)',
      'Printer-friendly or filtered pages without canonical tags',
      'CMS generating multiple URL variants automatically',
    ],
    recommendedActions: [
      `Add <link rel="canonical" href="${gsc.url}"> to your preferred version of this page`,
      'Set up 301 redirects from non-canonical variants to the main URL',
      'Ensure your XML sitemap only includes the canonical URL',
      'Check your CMS settings for auto-generated URL variants',
    ],
    developerInstructions:
      `Add self-referential canonical: <link rel="canonical" href="${gsc.url}"> in <head>. ` +
      `Implement 301 redirects from all URL variants to the canonical URL. ` +
      `Verify with GSC URL Inspection after deploying.`,
  };
}

function makeCanonicalAlternate(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const target = page?.canonical ?? 'another URL';
  return {
    decision:          'Needs Review',
    priority:          'low',
    approvalLevel:     'needs-review',
    clientExplanation:
      `This page has a canonical tag pointing to a different URL (${target}), telling Google to show that other URL in search results instead. This is often intentional — please confirm this is what you want.`,
    explanation:
      `Page defers to canonical "${target}". May be intentional.`,
    likelyCauses: [
      'This is a variant page (different colour, language, or region) that points to the main version',
      'The canonical was deliberately set to consolidate search signals',
    ],
    recommendedActions: [
      `Confirm the canonical target (${target}) is accessible and indexed`,
      'If this page should be indexed independently, remove or update the canonical tag',
      'If this is intentional, no action is needed',
    ],
    developerInstructions:
      `Canonical: <link rel="canonical" href="${target}">. ` +
      `If this page should be independently indexed, change canonical to self-referential: "${gsc.url}".`,
  };
}

function makeRobotsBlocked(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  if (isLowValue(url, intent)) {
    return {
      decision:          'Keep Noindex',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'This page is blocked by your robots.txt file, which is correct for this type of page.',
      explanation:       'robots.txt blocking is intentional for this low-value page.',
      likelyCauses:      ['Intentional robots.txt Disallow rule'],
      recommendedActions: ['No action needed — robots.txt blocking is correct'],
      developerInstructions: 'No changes needed.',
    };
  }

  const siteOrigin = (() => { try { return new URL(url).origin; } catch { return url; } })();
  return {
    decision:          'Fix Robots Blocking',
    priority:          'high',
    approvalLevel:     'needs-developer',
    clientExplanation:
      'Your robots.txt file is blocking Google from crawling this important page. If it should appear in Google search results, you need to update your robots.txt file to allow access.',
    explanation:
      'Important page is blocked by robots.txt. Google cannot crawl or index it.',
    likelyCauses: [
      'robots.txt has a Disallow rule matching this URL path',
      'An overly broad Disallow rule is blocking too many pages',
      'robots.txt was modified accidentally during a site migration',
    ],
    recommendedActions: [
      `Check your robots.txt file at ${siteOrigin}/robots.txt`,
      'Remove or narrow the Disallow rule that\'s blocking this URL',
      'Use Google Search Console → robots.txt Tester to verify the fix',
      'After updating, request re-crawl via GSC URL Inspection',
    ],
    developerInstructions:
      `Check /robots.txt for Disallow rules matching this URL. ` +
      `Remove the blocking rule or add Allow: [url-path] before the Disallow. ` +
      `Test at: https://search.google.com/search-console/robots-testing-tool`,
  };
}

function makeNotFound(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  if (isLowValue(url, intent)) {
    return {
      decision:          'Remove From Sitemap',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'This page returned a 404 "not found" error. Since it appears to be a utility page, just remove it from your sitemap and any internal links.',
      explanation:       '404 on low-value page. Clean up sitemap and internal links.',
      likelyCauses:      ['Page was deleted or URL changed'],
      recommendedActions: [
        'Remove from XML sitemap',
        'Remove internal links pointing to this URL',
        'No redirect needed',
      ],
      developerInstructions: 'Remove from sitemap.xml. Find and remove internal links to this URL.',
    };
  }

  return {
    decision:          'Redirect',
    priority:          'high',
    approvalLevel:     'needs-developer',
    clientExplanation:
      'This page returned a "404 not found" error. If this page previously had visitors or ranked in Google, setting up a redirect to the most relevant current page will preserve your SEO value.',
    explanation:
      'Important page returns 404. SEO equity is being lost without a redirect.',
    likelyCauses: [
      'Page URL was changed without setting up a redirect',
      'Page was deleted without a replacement',
      'URL structure changed during a site migration',
    ],
    recommendedActions: [
      'Set up a 301 permanent redirect from this URL to the most relevant current page',
      'If no equivalent page exists, redirect to the category or homepage',
      'Remove from XML sitemap after setting up the redirect',
    ],
    developerInstructions:
      `Set up a 301 redirect from "${url}" to the most relevant current URL. ` +
      `In Next.js: add to next.config.mjs redirects[]. ` +
      `In WordPress: use Yoast SEO redirects or the Redirection plugin. ` +
      `In .htaccess: Redirect 301 /old-path /new-path`,
  };
}

function makeServerError(gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  return {
    decision:          'Fix Server Error',
    priority:          'critical',
    approvalLevel:     'needs-developer',
    clientExplanation:
      'This page is returning a server error. Google cannot index it and if this persists, any existing rankings for this page may drop. This needs to be fixed as soon as possible.',
    explanation:
      'Page returns 5xx server error. Immediate developer attention required.',
    likelyCauses: [
      'Web server or application is crashing on this page',
      'Database connection failure',
      'Missing or misconfigured server/application file',
      'Memory or resource exhaustion on the server',
      'Recent code deployment introduced a bug',
    ],
    recommendedActions: [
      'Ask your developer to check the server error logs immediately',
      'Try opening the URL in a browser and reproduce the error',
      'Check if the issue affects multiple pages or just this one',
      'After fixing, use GSC URL Inspection to request re-crawl',
    ],
    developerInstructions:
      `URL returns 5xx. Check: ` +
      `(1) Application error logs for unhandled exceptions, ` +
      `(2) Server logs (nginx/apache error.log), ` +
      `(3) Database connectivity, ` +
      `(4) Server memory/CPU usage. ` +
      `Verify fix: curl -I "${gsc.url}"`,
  };
}

function makeForbidden(gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  return {
    decision:          'Fix 403 Access',
    priority:          'critical',
    approvalLevel:     'needs-developer',
    clientExplanation:
      'Google is being blocked from accessing this page with a "403 Forbidden" error. If this page should appear in Google search results, you need to ensure Google\'s crawler is allowed through.',
    explanation:
      'Page returns 403 Forbidden. Google\'s crawler is denied access.',
    likelyCauses: [
      'Page is protected by a login / authentication wall',
      'IP-based access restriction blocking Google\'s crawler IP addresses',
      'Firewall or security plugin (Wordfence, Cloudflare WAF) blocking Googlebot',
      'Password-protected directory (.htpasswd)',
      'CDN geo-blocking rules affecting Googlebot',
    ],
    recommendedActions: [
      'Check if the page is intended to be publicly accessible',
      'Review your firewall and WAF rules for Googlebot blocking',
      'Whitelist Googlebot\'s user agent in your security settings',
      'Test using the GSC URL Inspection tool to see what Google sees',
    ],
    developerInstructions:
      `URL returns 403. Check: ` +
      `(1) .htaccess/nginx for deny rules, ` +
      `(2) Security plugins for Googlebot blocking, ` +
      `(3) Cloudflare/CDN rules. ` +
      `Verify Googlebot access: curl -H "User-Agent: Googlebot/2.1 (+http://www.google.com/bot.html)" -I "${gsc.url}"`,
  };
}

function makeRedirect(gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  const reason = gsc.reason.toLowerCase();
  const isError = reason.includes('error') || reason.includes('loop') ||
                  reason.includes('chain') || reason.includes('issue');

  if (isError) {
    return {
      decision:          'Fix Redirect Error',
      priority:          'high',
      approvalLevel:     'needs-developer',
      clientExplanation:
        'This URL has a redirect problem — it\'s either redirecting in a loop, chaining through too many URLs, or the redirect leads nowhere. Google can\'t follow it.',
      explanation:
        'Redirect error: loop, chain, or invalid redirect target detected.',
      likelyCauses: [
        'Redirect loop: A redirects to B, B redirects back to A',
        'Redirect chain: too many hops (A → B → C → D)',
        'Redirect points to a page that also returns a 404 or error',
        'HTTP ↔ HTTPS or www ↔ non-www conflict causing a loop',
      ],
      recommendedActions: [
        'Trace the full redirect chain (use httpstatus.io or curl -L)',
        'Update all redirects to go directly to the final destination in one hop',
        'Fix any redirect loops',
        'Ensure the redirect target returns a 200 OK response',
      ],
      developerInstructions:
        `Debug redirect chain: curl -L -I "${gsc.url}". ` +
        `Resolve to a single 301 redirect to the final URL. ` +
        `Check for conflicting http/https and www/non-www rules.`,
    };
  }

  return {
    decision:          'Needs Review',
    priority:          'low',
    approvalLevel:     'safe',
    clientExplanation:
      'This URL redirects to another page. This is usually fine — it just means the page was moved. Confirm the redirect goes to the right destination.',
    explanation:
      'Page has a redirect. Likely intentional. Verify the destination is correct.',
    likelyCauses: ['Page was moved with a proper 301 redirect'],
    recommendedActions: [
      'Confirm the redirect destination is the correct final URL',
      'Remove the original URL from your XML sitemap',
    ],
    developerInstructions:
      `Confirm 301 redirect destination. Remove "${gsc.url}" from sitemap.xml.`,
  };
}

function makeSoftNotFound(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  return {
    decision:          'Improve Before Indexing',
    priority:          'medium',
    approvalLevel:     'needs-review',
    clientExplanation:
      'Google thinks this page looks like a "not found" page even though it technically loads. This usually means the page has very little content or shows a mostly empty state (like an empty search result or category with no items).',
    explanation:
      'Soft 404: page returns 200 but content signals empty/error-like state.',
    likelyCauses: [
      'Empty category or tag archive with no posts',
      'Search results page showing zero results',
      'Very thin content that resembles a placeholder',
      'Product page with no description',
    ],
    recommendedActions: [
      'Add meaningful content to this page',
      'If it\'s an empty category page, either add content or redirect to a parent page',
      'For empty search results pages, consider returning a 404 or adding a noindex tag',
      'Remove from XML sitemap if it cannot be improved',
    ],
    developerInstructions:
      'Page returns 200 but Google sees it as empty. ' +
      'Add real content or return a proper 404 status code. ' +
      'For empty search/filter pages: add noindex or 404.',
  };
}

function makeUrlUnknown(gsc: GSCRecord, page: MatchedPageData | null): IndexingDecision {
  const { url } = gsc;
  const intent  = page?.pageIntent;

  if (isLowValue(url, intent)) {
    return {
      decision:          'Remove From Sitemap',
      priority:          'low',
      approvalLevel:     'safe',
      clientExplanation: 'Google hasn\'t seen this URL at all — and since it appears to be a utility page, there\'s no need to try to get it indexed.',
      explanation:       'URL unknown to Google. Low-value page. Exclude explicitly.',
      likelyCauses:      ['No internal links or sitemap entry for this URL'],
      recommendedActions: ['Ensure URL is not in sitemap', 'Remove any internal links'],
      developerInstructions: 'Verify URL is absent from sitemap.xml. Add noindex if needed.',
    };
  }

  return {
    decision:          'Add to Sitemap',
    priority:          'medium',
    approvalLevel:     'safe',
    clientExplanation:
      'Google hasn\'t discovered this page at all. To help Google find and index it, add it to your XML sitemap and link to it from your main pages.',
    explanation:
      'URL unknown to Google. Important page needs discovery via sitemap and internal links.',
    likelyCauses: [
      'Page is not in the XML sitemap',
      'No internal links pointing to this URL',
      'Very new page not yet crawled',
    ],
    recommendedActions: [
      'Add this URL to your XML sitemap',
      'Add internal links from your homepage and main navigation',
      'Use GSC URL Inspection → Request Indexing to trigger a crawl',
    ],
    developerInstructions:
      'Add to sitemap.xml. Add <a href="..."> internal links from high-authority pages. ' +
      'Use GSC URL Inspection to manually submit URL.',
  };
}

function makeDefault(gsc: GSCRecord, _page: MatchedPageData | null): IndexingDecision {
  return {
    decision:          'Needs Review',
    priority:          'medium',
    approvalLevel:     'needs-review',
    clientExplanation:
      `This URL has an unusual status: "${gsc.reason}". Manual review is needed to determine the best action.`,
    explanation:       `Unmatched GSC reason: "${gsc.reason}". Manual review required.`,
    likelyCauses:      ['Non-standard or unrecognised GSC coverage status'],
    recommendedActions: [
      'Use Google Search Console URL Inspection to get more details about this URL',
      'Review the page manually and check for any obvious issues',
    ],
    developerInstructions:
      'Check the URL in GSC URL Inspection tool for detailed crawl/index information.',
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function makeDecision(
  gsc: GSCRecord,
  page: MatchedPageData | null,
): IndexingDecision {
  switch (gsc.reasonCategory) {
    case 'indexed':                return makeIndexed(gsc, page);
    case 'noindex-excluded':       return makeNoindex(gsc, page);
    case 'crawled-not-indexed':    return makeCrawledNotIndexed(gsc, page);
    case 'discovered-not-indexed': return makeDiscoveredNotIndexed(gsc, page);
    case 'duplicate-no-canonical': return makeDuplicateNoCanonical(gsc, page);
    case 'canonical-alternate':    return makeCanonicalAlternate(gsc, page);
    case 'robots-blocked':         return makeRobotsBlocked(gsc, page);
    case 'not-found-404':          return makeNotFound(gsc, page);
    case 'server-error-5xx':       return makeServerError(gsc, page);
    case 'forbidden-403':          return makeForbidden(gsc, page);
    case 'unauthorized-401':       return makeForbidden(gsc, page);  // treat same as 403
    case 'redirect':               return makeRedirect(gsc, page);
    case 'soft-404':               return makeSoftNotFound(gsc, page);
    case 'url-unknown':            return makeUrlUnknown(gsc, page);
    default:                       return makeDefault(gsc, page);
  }
}
