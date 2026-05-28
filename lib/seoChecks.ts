// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — SEO Checks Engine
// ─────────────────────────────────────────────────────────────────────────────
import type {
  PageData, RobotsData, SitemapData,
  SEOIssue, IssueSeverity, IssueCategory, RiskLevel,
} from '@/types/seo';

let _issueId = 0;
function mkId() { return `issue_${++_issueId}`; }

function issue(
  severity: IssueSeverity,
  category: IssueCategory,
  problem: string,
  technicalDetail: string,
  clientExplanation: string,
  whyItMatters: string,
  recommendedFix: string,
  developerInstruction: string,
  riskLevel: RiskLevel,
  autoFixable: boolean,
  affectedPages: string[]
): SEOIssue {
  return {
    id: mkId(),
    severity,
    category,
    problem,
    technicalDetail,
    clientExplanation,
    whyItMatters,
    recommendedFix,
    developerInstruction,
    riskLevel,
    affectedPages,
    count: affectedPages.length,
    autoFixable,
  };
}

// ─── Page-level checks ───────────────────────────────────────────────────────

export function runPageChecks(pages: PageData[]): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const total = pages.length;
  if (total === 0) return issues;

  // ── HTTP 4xx/5xx errors ─────────────────────────────────────────────────────
  const errorPages = pages.filter(p => p.statusCode >= 400 && !p.crawlError);
  if (errorPages.length > 0) {
    issues.push(issue(
      'critical', 'crawlability',
      `${errorPages.length} page${errorPages.length > 1 ? 's' : ''} returning HTTP errors`,
      `Pages returning 4xx or 5xx status codes: ${errorPages.map(p => `${p.url} (${p.statusCode})`).join(', ')}`,
      `Some pages on your site aren't loading properly — they show error messages instead of content.`,
      'HTTP error pages waste crawl budget, cannot be indexed, and create a poor user experience. Search engines may deindex them.',
      'Fix or redirect broken pages immediately. 404s should be redirected to relevant working pages or removed from internal links.',
      'Check server logs to identify root cause. Implement 301 redirects for permanently moved content. Return 410 (Gone) only if content is permanently removed.',
      'requires-approval',
      false,
      errorPages.map(p => p.url)
    ));
  }

  // ── Crawl timeouts / errors ──────────────────────────────────────────────────
  const crawlErrors = pages.filter(p => p.crawlError && p.statusCode === 0);
  if (crawlErrors.length > 0) {
    issues.push(issue(
      'high', 'crawlability',
      `${crawlErrors.length} page${crawlErrors.length > 1 ? 's' : ''} failed to crawl`,
      `Pages that could not be fetched: ${crawlErrors.map(p => `${p.url}: ${p.crawlError}`).join('; ')}`,
      `Some pages couldn't be checked — they may be too slow or temporarily unavailable.`,
      'Crawlers and users may not be able to access these pages, reducing your site\'s visibility.',
      'Investigate server response times and availability. Ensure pages respond within 10 seconds.',
      'Monitor server health with uptime tools. Consider CDN or caching to reduce TTFB. Check for DNS issues.',
      'needs-review',
      false,
      crawlErrors.map(p => p.url)
    ));
  }

  // ── Redirect chains ──────────────────────────────────────────────────────────
  const redirectPages = pages.filter(p =>
    p.statusCode >= 300 && p.statusCode < 400 ||
    (p.finalUrl && p.finalUrl !== p.url && p.statusCode === 200)
  );
  if (redirectPages.length > 0) {
    issues.push(issue(
      'medium', 'crawlability',
      `${redirectPages.length} page${redirectPages.length > 1 ? 's' : ''} involve redirects`,
      `URLs that redirect to different final URLs — each hop adds latency and loses some link equity.`,
      `Some of your page addresses redirect to other addresses, which slows down loading and weakens SEO.`,
      'Each redirect hop slows page load, dilutes link equity, and consumes crawl budget.',
      'Update internal links to point directly to final destination URLs. Avoid redirect chains.',
      'Run: for each redirected URL, update all internal <a href> and sitemap entries to the canonical final URL. Use HTTP 301 (permanent) not 302 (temporary).',
      'safe',
      true,
      redirectPages.map(p => p.url)
    ));
  }

  // ── Noindex pages ────────────────────────────────────────────────────────────
  const noindexPages = pages.filter(p => p.isNoindex && p.statusCode === 200);
  if (noindexPages.length > 0) {
    const isCritical = noindexPages.length / total > 0.3;
    issues.push(issue(
      isCritical ? 'critical' : 'high',
      'indexability',
      `${noindexPages.length} page${noindexPages.length > 1 ? 's' : ''} blocked from Google indexing`,
      `Pages with <meta name="robots" content="noindex"> or equivalent X-Robots-Tag header.`,
      `Some of your pages have a "do not index" instruction, meaning Google cannot show them in search results.`,
      'Noindex pages cannot appear in search results, directly reducing your organic traffic potential.',
      'Review each noindex page. Remove the noindex tag from pages that should rank. Keep noindex only on thank-you pages, login screens, and duplicate content.',
      'Remove the meta tag: <meta name="robots" content="noindex">. If using a CMS, disable the "noindex" toggle in the page SEO settings.',
      'requires-approval',
      false,
      noindexPages.map(p => p.url)
    ));
  }

  // ── Missing titles ───────────────────────────────────────────────────────────
  const noTitlePages = pages.filter(p => !p.title && p.statusCode === 200);
  if (noTitlePages.length > 0) {
    issues.push(issue(
      'critical', 'on-page',
      `${noTitlePages.length} page${noTitlePages.length > 1 ? 's' : ''} missing title tags`,
      `Pages with no <title> element in the <head> section.`,
      `Some pages don't have a title — this is like a book with no title on the cover. Google may generate one automatically, but it won't be optimised.`,
      'Title tags are the most important on-page SEO element. Missing titles mean Google picks any text, often poorly.',
      'Add unique, descriptive title tags to every page. Format: "Primary Keyword – Brand Name" (50–60 characters).',
      'Add to <head>: <title>Page Topic – Elitez</title>. In Next.js: export const metadata = { title: "Page Topic – Elitez" };',
      'safe',
      true,
      noTitlePages.map(p => p.url)
    ));
  }

  // ── Title too long ───────────────────────────────────────────────────────────
  const longTitlePages = pages.filter(p => p.titleLength > 60 && p.statusCode === 200);
  if (longTitlePages.length > 0) {
    issues.push(issue(
      'medium', 'on-page',
      `${longTitlePages.length} page${longTitlePages.length > 1 ? 's' : ''} with title tags over 60 characters`,
      `Title lengths: ${longTitlePages.map(p => `"${p.title?.slice(0, 40)}…" (${p.titleLength} chars)`).slice(0, 5).join(', ')}`,
      `Some page titles are too long and will be cut off in Google search results, hiding part of your message.`,
      'Google truncates titles over ~60 characters in SERPs, causing important keywords or the brand name to be cut off.',
      'Rewrite titles to be under 60 characters. Keep the most important keyword near the start.',
      'Shorten title tags. Target 50–60 characters. Front-load primary keywords. Example: "Recruitment Solutions – Elitez Asia" (35 chars).',
      'safe',
      false,
      longTitlePages.map(p => p.url)
    ));
  }

  // ── Title too short ──────────────────────────────────────────────────────────
  const shortTitlePages = pages.filter(p => p.title && p.titleLength < 20 && p.statusCode === 200);
  if (shortTitlePages.length > 0) {
    issues.push(issue(
      'medium', 'on-page',
      `${shortTitlePages.length} page${shortTitlePages.length > 1 ? 's' : ''} with title tags under 20 characters`,
      `Short titles: ${shortTitlePages.map(p => `"${p.title}" (${p.titleLength} chars)`).slice(0, 5).join(', ')}`,
      `Some page titles are too short and don't describe the page content well enough for Google.`,
      'Very short titles fail to include target keywords and don\'t tell searchers what the page is about.',
      'Expand short titles to 30–60 characters with primary keyword and brand name.',
      'Add descriptive keywords. Example: Change "Home" to "Recruitment Agency Singapore | Elitez Asia".',
      'safe',
      false,
      shortTitlePages.map(p => p.url)
    ));
  }

  // ── Duplicate titles ─────────────────────────────────────────────────────────
  const titleMap = new Map<string, string[]>();
  pages.filter(p => p.title && p.statusCode === 200).forEach(p => {
    const t = p.title!.toLowerCase();
    if (!titleMap.has(t)) titleMap.set(t, []);
    titleMap.get(t)!.push(p.url);
  });
  const dupTitleGroups = [...titleMap.entries()].filter(([, urls]) => urls.length > 1);
  if (dupTitleGroups.length > 0) {
    const affectedUrls = dupTitleGroups.flatMap(([, urls]) => urls);
    issues.push(issue(
      'high', 'on-page',
      `${affectedUrls.length} pages share duplicate title tags (${dupTitleGroups.length} duplicate group${dupTitleGroups.length > 1 ? 's' : ''})`,
      `Duplicate title groups: ${dupTitleGroups.slice(0, 3).map(([t, urls]) => `"${t}" used on ${urls.length} pages`).join('; ')}`,
      `Multiple pages have exactly the same title, which confuses Google about which page to rank.`,
      'Duplicate titles signal to Google that pages may have duplicate content, causing ranking dilution.',
      'Write unique, descriptive titles for every page. Each title should reflect the unique purpose of that page.',
      'Audit all titles in your CMS. Ensure each page template generates a unique title using its primary keyword + page type.',
      'safe',
      false,
      affectedUrls
    ));
  }

  // ── Missing meta descriptions ────────────────────────────────────────────────
  const noDescPages = pages.filter(p => !p.metaDescription && p.statusCode === 200 && !p.isNoindex);
  if (noDescPages.length > 0) {
    const severity: IssueSeverity = noDescPages.length / total > 0.5 ? 'high' : 'medium';
    issues.push(issue(
      severity, 'on-page',
      `${noDescPages.length} page${noDescPages.length > 1 ? 's' : ''} missing meta descriptions`,
      `Pages with no <meta name="description"> tag.`,
      `Some pages don't have a description snippet, so Google will pick random text to show in search results — usually not ideal.`,
      'Without a meta description, Google auto-generates one that may not encourage clicks, reducing your click-through rate.',
      'Write compelling meta descriptions of 120–155 characters for every page. Include the primary keyword and a clear value proposition.',
      'Add to <head>: <meta name="description" content="Your compelling 120-155 char description here." />',
      'safe',
      true,
      noDescPages.map(p => p.url)
    ));
  }

  // ── Meta description too long ────────────────────────────────────────────────
  const longDescPages = pages.filter(p => p.metaDescriptionLength > 160 && p.statusCode === 200);
  if (longDescPages.length > 0) {
    issues.push(issue(
      'low', 'on-page',
      `${longDescPages.length} page${longDescPages.length > 1 ? 's' : ''} with meta descriptions over 160 characters`,
      `Descriptions will be truncated by Google in search results.`,
      `Some page descriptions are too long and will be cut off in search results, making them harder to read.`,
      'Google truncates meta descriptions around 155–160 characters, cutting off your call-to-action.',
      'Trim meta descriptions to under 155 characters. End with a call to action.',
      'Rewrite affected meta descriptions to be ≤155 characters. Use Google Search Console to preview how they appear.',
      'safe',
      false,
      longDescPages.map(p => p.url)
    ));
  }

  // ── Missing H1 ───────────────────────────────────────────────────────────────
  const noH1Pages = pages.filter(p => p.h1Count === 0 && p.statusCode === 200 && !p.isNoindex);
  if (noH1Pages.length > 0) {
    issues.push(issue(
      'high', 'on-page',
      `${noH1Pages.length} page${noH1Pages.length > 1 ? 's' : ''} missing H1 heading`,
      `Pages have no <h1> element — the main page heading is absent.`,
      `Some pages have no main headline (H1), which makes it harder for Google to understand what the page is about.`,
      'H1 is the primary heading signal. Missing H1 weakens topical relevance and can lower keyword rankings.',
      'Add exactly one H1 tag to each page. It should contain the primary keyword and describe the main topic.',
      'Add <h1>Primary Keyword Here</h1> near the top of the main content area. Never use H1 inside nav or footer.',
      'safe',
      true,
      noH1Pages.map(p => p.url)
    ));
  }

  // ── Multiple H1 ──────────────────────────────────────────────────────────────
  const multiH1Pages = pages.filter(p => p.h1Count > 1 && p.statusCode === 200);
  if (multiH1Pages.length > 0) {
    issues.push(issue(
      'medium', 'on-page',
      `${multiH1Pages.length} page${multiH1Pages.length > 1 ? 's' : ''} with multiple H1 headings`,
      `Pages with 2+ H1 tags: ${multiH1Pages.slice(0, 5).map(p => `${p.url} (${p.h1Count} H1s)`).join(', ')}`,
      `Some pages have more than one main headline, which dilutes the page's focus and can confuse search engines.`,
      'Multiple H1s dilute keyword focus. Best practice is one H1 per page that clearly defines its topic.',
      'Keep exactly one H1 per page. Convert extra H1s to H2 or H3 where appropriate.',
      'Audit HTML for multiple <h1> tags. Keep the most relevant one; change others to <h2>. In component-based frameworks, check for H1 in layout/header components.',
      'safe',
      false,
      multiH1Pages.map(p => p.url)
    ));
  }

  // ── Missing canonical ────────────────────────────────────────────────────────
  const noCanonicalPages = pages.filter(p => !p.canonical && p.statusCode === 200 && !p.isNoindex);
  if (noCanonicalPages.length > 0) {
    issues.push(issue(
      'medium', 'indexability',
      `${noCanonicalPages.length} page${noCanonicalPages.length > 1 ? 's' : ''} missing canonical tags`,
      `Pages without <link rel="canonical" href="..."> in the <head>.`,
      `Some pages don't tell Google which version is the "official" one, risking duplicate content issues.`,
      'Without canonicals, Google may index the wrong URL variant (e.g., with ?utm or trailing slash), splitting link equity.',
      'Add a self-referencing canonical tag to every page. Use absolute URLs.',
      'Add to <head>: <link rel="canonical" href="https://yourdomain.com/page-path/" />. In Next.js: use the alternates.canonical in metadata.',
      'safe',
      true,
      noCanonicalPages.map(p => p.url)
    ));
  }

  // ── Canonical pointing elsewhere ──────────────────────────────────────────────
  const wrongCanonicalPages = pages.filter(p =>
    p.canonical && !p.canonicalMatchesSelf && p.statusCode === 200
  );
  if (wrongCanonicalPages.length > 0) {
    issues.push(issue(
      'high', 'indexability',
      `${wrongCanonicalPages.length} page${wrongCanonicalPages.length > 1 ? 's' : ''} have canonical pointing to a different URL`,
      `Canonicals don't match self: ${wrongCanonicalPages.slice(0, 5).map(p => `${p.url} → ${p.canonical}`).join(', ')}`,
      `Some pages tell Google to treat a different page as the main version, which means these pages won't appear in search results.`,
      'Non-self canonicals effectively deindex the current page. If intentional, links and content should point to the canonical URL instead.',
      'Verify each cross-canonical is intentional. If a page should rank, fix the canonical to point to itself.',
      'For pages that should rank: change canonical href to match the page\'s own URL. For intentional consolidation: ensure all internal links point to the canonical target URL.',
      'requires-approval',
      false,
      wrongCanonicalPages.map(p => p.url)
    ));
  }

  // ── Low word count ───────────────────────────────────────────────────────────
  const thinPages = pages.filter(p =>
    p.wordCount > 0 && p.wordCount < 300 &&
    p.statusCode === 200 && !p.isNoindex
  );
  if (thinPages.length > 0) {
    issues.push(issue(
      'medium', 'on-page',
      `${thinPages.length} page${thinPages.length > 1 ? 's' : ''} with thin content (under 300 words)`,
      `Estimated word counts: ${thinPages.slice(0, 5).map(p => `${p.url} (~${p.wordCount}w)`).join(', ')}`,
      `Some pages don't have much content. Google prefers pages that provide real value and thorough information.`,
      'Thin content pages are unlikely to rank for competitive keywords and may trigger Panda-type quality penalties.',
      'Expand thin pages with useful, original content. Aim for at least 300 words for supporting pages, 800+ for main landing pages.',
      'Identify thin pages in CMS. Add original content: more detail, FAQ sections, case studies, or statistics. Consider merging very thin pages with related content.',
      'needs-review',
      false,
      thinPages.map(p => p.url)
    ));
  }

  // ── Missing structured data ───────────────────────────────────────────────────
  const noSchemaPages = pages.filter(p => !p.hasStructuredData && p.statusCode === 200 && !p.isNoindex);
  if (noSchemaPages.length === total && total > 0) {
    issues.push(issue(
      'high', 'structured-data',
      'No pages have structured data (Schema.org / JSON-LD)',
      'Zero pages contain <script type="application/ld+json"> with Schema.org markup.',
      `None of your pages have special code that helps Google understand your content and show rich results in search.`,
      'Structured data enables rich results (star ratings, FAQs, breadcrumbs) which significantly increase click-through rates.',
      'Implement JSON-LD structured data. Start with Organization + WebSite on homepage, BreadcrumbList on all pages.',
      'Add JSON-LD scripts to <head>. Example for Organization:\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Elitez","url":"https://elitez.asia"}</script>',
      'safe',
      true,
      noSchemaPages.map(p => p.url)
    ));
  } else if (noSchemaPages.length > 0 && noSchemaPages.length < total) {
    issues.push(issue(
      'medium', 'structured-data',
      `${noSchemaPages.length} page${noSchemaPages.length > 1 ? 's' : ''} missing structured data`,
      `These pages have no JSON-LD or microdata markup.`,
      `Some pages are missing the special code that helps Google show your content in richer formats.`,
      'Pages without structured data miss out on enhanced SERP features like FAQ boxes and breadcrumb trails.',
      'Add appropriate Schema.org markup to each page type: Article, Service, FAQPage, BreadcrumbList.',
      'Implement per-page type: Article pages → NewsArticle/BlogPosting; Service pages → Service; FAQ pages → FAQPage.',
      'safe',
      true,
      noSchemaPages.map(p => p.url)
    ));
  }

  // ── Missing OG tags ───────────────────────────────────────────────────────────
  const noOgPages = pages.filter(p =>
    !p.ogTitle && p.statusCode === 200 && !p.isNoindex
  );
  if (noOgPages.length > total * 0.5) {
    issues.push(issue(
      'medium', 'social-og',
      `${noOgPages.length} page${noOgPages.length > 1 ? 's' : ''} missing Open Graph tags`,
      'Pages lack og:title meta tags. Shares on Facebook, LinkedIn, and WhatsApp will show generic previews.',
      `When people share these pages on social media, they won't have a proper title, description, or image preview.`,
      'Poor social sharing previews reduce click-through rates from social media by up to 40%.',
      'Add og:title, og:description, and og:image to every public page. Use 1200×630px images for og:image.',
      'Add to <head>: <meta property="og:title" content="Page Title" /><meta property="og:description" content="..." /><meta property="og:image" content="https://domain.com/og-image.jpg" />',
      'safe',
      true,
      noOgPages.map(p => p.url)
    ));
  }

  // ── Missing OG image ─────────────────────────────────────────────────────────
  const noOgImagePages = pages.filter(p =>
    p.ogTitle && !p.ogImage && p.statusCode === 200
  );
  if (noOgImagePages.length > 0) {
    issues.push(issue(
      'low', 'social-og',
      `${noOgImagePages.length} page${noOgImagePages.length > 1 ? 's' : ''} missing og:image`,
      'Pages have og:title but no og:image — social shares will appear without a preview image.',
      `These pages will appear without an image when shared on social media, reducing engagement.`,
      'Social posts with images get 3× more engagement than those without.',
      'Add a compelling 1200×630px og:image to each page. A default brand image is better than none.',
      'Add: <meta property="og:image" content="https://yourdomain.com/og/page-specific-image.jpg" />. Minimum 600×315px, ideal 1200×630px.',
      'safe',
      true,
      noOgImagePages.map(p => p.url)
    ));
  }

  // ── Images missing alt text ───────────────────────────────────────────────────
  const pagesWithMissingAlt = pages.filter(p => p.missingAltCount > 0 && p.statusCode === 200);
  if (pagesWithMissingAlt.length > 0) {
    const totalMissingAlt = pagesWithMissingAlt.reduce((s, p) => s + p.missingAltCount, 0);
    issues.push(issue(
      'medium', 'image-seo',
      `${totalMissingAlt} image${totalMissingAlt > 1 ? 's' : ''} missing alt text across ${pagesWithMissingAlt.length} page${pagesWithMissingAlt.length > 1 ? 's' : ''}`,
      `Images without alt="" attributes cannot be understood by search engines or screen readers.`,
      `Some images don't have descriptions, which means search engines can't understand them, and users with visual impairments can't access your content.`,
      'Images without alt text are invisible to Google Image Search and violate WCAG accessibility guidelines.',
      'Add descriptive alt text to all meaningful images. Use empty alt="" for decorative images.',
      'Add alt attributes: <img src="photo.jpg" alt="Describe image content here" />. Decorative images: <img src="bg.png" alt="" role="presentation" />. Do NOT use keyword stuffing.',
      'safe',
      true,
      pagesWithMissingAlt.map(p => p.url)
    ));
  }

  // ── Low internal links ────────────────────────────────────────────────────────
  const orphanPages = pages.filter(p => p.internalLinksCount === 0 && p.statusCode === 200 && !p.isNoindex);
  if (orphanPages.length > 0) {
    issues.push(issue(
      'medium', 'internal-linking',
      `${orphanPages.length} page${orphanPages.length > 1 ? 's' : ''} appear to have no outgoing internal links`,
      'Pages with 0 internal links detected. These may be orphan pages or have broken link structure.',
      `Some pages seem isolated — they don't link to other pages on your site, limiting how far Google explores your site.`,
      'Pages with no internal links provide no crawling pathway, reducing crawl depth and PageRank distribution.',
      'Add relevant internal links from these pages to related content. Build a logical content hierarchy.',
      'Audit each orphan page. Add 3–5 contextual internal links to relevant service/blog pages. Ensure main navigation links to all important pages.',
      'needs-review',
      false,
      orphanPages.map(p => p.url)
    ));
  }

  return issues;
}

// ─── Site-level checks ────────────────────────────────────────────────────────

export function runSiteChecks(robots: RobotsData, sitemap: SitemapData): SEOIssue[] {
  const issues: SEOIssue[] = [];

  // robots.txt missing
  if (!robots.accessible) {
    issues.push(issue(
      'medium', 'crawlability',
      'robots.txt file is missing or inaccessible',
      `robots.txt at ${robots.url} returned status ${robots.statusCode ?? 'error'}: ${robots.error ?? 'Not accessible'}`,
      `Your site doesn't have a robots.txt file, which guides search engine crawlers on what to scan.`,
      'Without robots.txt, crawlers may crawl admin areas, duplicate pages, or waste crawl budget on low-value content.',
      'Create a robots.txt file at the root of your domain with at minimum a User-agent: * and Sitemap: directive.',
      'Create /public/robots.txt in your Next.js project:\nUser-agent: *\nAllow: /\nSitemap: https://yourdomain.com/sitemap.xml',
      'safe',
      true,
      [robots.url]
    ));
  } else if (robots.blockedPaths.includes('/') || robots.blockedPaths.some(p => p === '/*')) {
    issues.push(issue(
      'critical', 'crawlability',
      'robots.txt is blocking all crawlers from the entire site',
      `Disallow: / found in robots.txt for User-agent: *. This blocks all crawling.`,
      `Your robots.txt file is telling all search engines NOT to crawl your website — this means no pages will appear in search results.`,
      'A robots.txt with Disallow: / for all user agents blocks the entire site from being indexed by Google.',
      'Immediately update robots.txt to allow crawling. Only block specific private paths like /admin/, /api/, etc.',
      'Change robots.txt:\nUser-agent: *\nDisallow: /admin/\nDisallow: /api/private/\nAllow: /\nSitemap: https://yourdomain.com/sitemap.xml',
      'requires-approval',
      false,
      [robots.url]
    ));
  }

  // Sitemap missing
  if (!sitemap.accessible) {
    issues.push(issue(
      'medium', 'crawlability',
      'sitemap.xml is missing or inaccessible',
      `Sitemap at ${sitemap.url} returned status ${sitemap.statusCode ?? 'error'}: ${sitemap.error ?? 'Not accessible'}`,
      `Your site doesn't have a sitemap, which helps search engines discover all your pages efficiently.`,
      'Without a sitemap, Google must rely solely on following links to discover pages. New or deep pages may never be found.',
      'Create an XML sitemap listing all indexable pages and submit it to Google Search Console.',
      'In Next.js 13+: create app/sitemap.ts that returns a MetadataRoute.Sitemap array. Or use the next-sitemap package.',
      'safe',
      true,
      [sitemap.url]
    ));
  } else if (sitemap.urlCount === 0) {
    issues.push(issue(
      'medium', 'crawlability',
      'sitemap.xml exists but contains no URLs',
      `Sitemap at ${sitemap.url} was found but has ${sitemap.urlCount} <loc> entries.`,
      `Your sitemap file exists but is empty — it's not helping Google find your pages.`,
      'An empty sitemap provides no crawling benefit. Google will not use it to discover new pages.',
      'Populate the sitemap with all important, indexable URLs.',
      'Check sitemap generation logic. Ensure your sitemap.ts or next-sitemap config includes all dynamic routes.',
      'needs-review',
      false,
      [sitemap.url]
    ));
  }

  return issues;
}

// ─── Aggregate all issues ─────────────────────────────────────────────────────

export function runAllChecks(
  pages: PageData[],
  robots: RobotsData,
  sitemap: SitemapData
): SEOIssue[] {
  _issueId = 0; // Reset counter for reproducibility
  const pageIssues = runPageChecks(pages);
  const siteIssues = runSiteChecks(robots, sitemap);
  return [...pageIssues, ...siteIssues].sort((a, b) => {
    const order: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });
}
