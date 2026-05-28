// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Core Crawler
// ─────────────────────────────────────────────────────────────────────────────
import * as cheerio from 'cheerio';
import type { PageData, RobotsData, SitemapData, SchemaBlock } from '@/types/seo';
import { parseSchemaBlock } from '@/lib/schemaExtractor';

const CRAWL_TIMEOUT_MS  = 15_000;
const REQUEST_DELAY_MS  = 300;
const MAX_REDIRECT_HOPS = 5;

const SKIP_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.avif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.css', '.js', '.mjs', '.map',
  '.mp4', '.mp3', '.avi', '.mov', '.webm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.json', '.xml', '.rss', '.atom',
]);

const TRACKING_PARAMS = [
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'fbclid','gclid','msclkid','ref','source','_ga',
];

const CRAWLER_UA = 'ElitezSEODoctor/1.0 (Technical SEO Audit Tool; contact@elitez.asia)';

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function getDomain(rawUrl: string): string {
  try { return new URL(rawUrl).hostname; } catch { return ''; }
}

export function getOrigin(rawUrl: string): string {
  try { const u = new URL(rawUrl); return `${u.protocol}//${u.hostname}`; } catch { return ''; }
}

export function normalizeUrl(href: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;

    TRACKING_PARAMS.forEach(p => resolved.searchParams.delete(p));
    resolved.hash = '';

    let out = resolved.toString();
    // Remove trailing slash unless it's the root path
    if (out.endsWith('/') && resolved.pathname !== '/') out = out.slice(0, -1);
    return out;
  } catch { return null; }
}

export function shouldCrawlUrl(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== domain) return false;
    const path = parsed.pathname.toLowerCase();
    const ext  = path.slice(path.lastIndexOf('.'));
    if (SKIP_EXTENSIONS.has(ext)) return false;
    return true;
  } catch { return false; }
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function timedFetch(url: string, timeout = CRAWL_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': CRAWLER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(tid);
    return res;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

// ─── Single-page crawler ──────────────────────────────────────────────────────

interface PageCrawlResult {
  pageData: PageData;
  outlinks: string[];
}

export async function fetchAndAnalyzePage(
  url: string,
  domain: string
): Promise<PageCrawlResult> {
  const t0 = Date.now();

  const pd: PageData = {
    url,
    finalUrl: url,
    statusCode: 0,
    redirectChain: [],
    title: null,
    titleLength: 0,
    metaDescription: null,
    metaDescriptionLength: 0,
    h1Count: 0,
    h1Texts: [],
    h2Count: 0,
    canonical: null,
    canonicalMatchesSelf: false,
    robotsMeta: null,
    isNoindex: false,
    isNofollow: false,
    wordCount: 0,
    internalLinksCount: 0,
    externalLinksCount: 0,
    imageCount: 0,
    missingAltCount: 0,
    imagesWithAlt: 0,
    hasStructuredData: false,
    structuredDataTypes: [],
    schemaBlocks: [],        // V2: full schema block data
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    twitterCard: null,
    crawlError: null,
    crawlTime: 0,
    contentType: null,
  };

  const outlinks: string[] = [];

  try {
    const res = await timedFetch(url);
    pd.statusCode  = res.status;
    pd.finalUrl    = res.url;
    pd.contentType = res.headers.get('content-type');
    pd.crawlTime   = Date.now() - t0;

    if (res.status >= 400) {
      pd.crawlError = `HTTP ${res.status} — ${res.statusText || 'Error'}`;
      return { pageData: pd, outlinks };
    }

    const ct = pd.contentType ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      pd.crawlError = `Non-HTML content-type: ${ct}`;
      return { pageData: pd, outlinks };
    }

    const html = await res.text();
    const $    = cheerio.load(html);

    // ── Title ────────────────────────────────────────────────────────────────
    const titleText = $('title').first().text().trim();
    pd.title       = titleText || null;
    pd.titleLength = titleText.length;

    // ── Meta description ──────────────────────────────────────────────────────
    const desc = $('meta[name="description"]').attr('content')?.trim() ?? null;
    pd.metaDescription       = desc;
    pd.metaDescriptionLength = desc?.length ?? 0;

    // ── Headings ─────────────────────────────────────────────────────────────
    $('h1').each((_, el) => {
      const t = $(el).text().trim();
      if (t) pd.h1Texts.push(t);
    });
    pd.h1Count = pd.h1Texts.length;
    pd.h2Count = $('h2').length;

    // ── Canonical ────────────────────────────────────────────────────────────
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? null;
    pd.canonical = canonical;
    if (canonical) {
      const normCanon = normalizeUrl(canonical, pd.finalUrl);
      const normSelf  = normalizeUrl(pd.finalUrl, pd.finalUrl);
      pd.canonicalMatchesSelf = !!(normCanon && normSelf &&
        (normCanon === normSelf || normCanon === normalizeUrl(url, url)));
    }

    // ── Robots meta ──────────────────────────────────────────────────────────
    const robotsMeta = (
      $('meta[name="robots"]').attr('content') ??
      $('meta[name="googlebot"]').attr('content') ??
      null
    )?.toLowerCase() ?? null;
    pd.robotsMeta = robotsMeta;
    pd.isNoindex  = robotsMeta ? /noindex/.test(robotsMeta) : false;
    pd.isNofollow = robotsMeta ? /nofollow/.test(robotsMeta) : false;

    // ── Word count ───────────────────────────────────────────────────────────
    // Remove scripts/styles before counting
    $('script, style, noscript').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    pd.wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

    // ── Links ────────────────────────────────────────────────────────────────
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const norm = normalizeUrl(href, pd.finalUrl);
      if (!norm) return;
      try {
        const parsed = new URL(norm);
        if (parsed.hostname === domain) {
          pd.internalLinksCount++;
          if (shouldCrawlUrl(norm, domain)) outlinks.push(norm);
        } else {
          pd.externalLinksCount++;
        }
      } catch { /* skip */ }
    });

    // ── Images ───────────────────────────────────────────────────────────────
    $('img').each((_, el) => {
      pd.imageCount++;
      const alt = $(el).attr('alt');
      if (alt === undefined || alt === null) pd.missingAltCount++;
      else pd.imagesWithAlt++;
    });

    // ── Structured data (V2: full block extraction) ──────────────────────────
    const schemaBlocks: SchemaBlock[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).html();
      if (!raw) return;
      const block = parseSchemaBlock(raw);
      schemaBlocks.push(block);
      if (block.isValid && block.types.length > 0) {
        pd.hasStructuredData = true;
        block.types.forEach(t => {
          if (!pd.structuredDataTypes.includes(t)) pd.structuredDataTypes.push(t);
        });
      }
    });
    pd.schemaBlocks = schemaBlocks;

    // ── Open Graph ───────────────────────────────────────────────────────────
    pd.ogTitle       = $('meta[property="og:title"]').attr('content')?.trim()       ?? null;
    pd.ogDescription = $('meta[property="og:description"]').attr('content')?.trim() ?? null;
    pd.ogImage       = $('meta[property="og:image"]').attr('content')?.trim()       ?? null;
    pd.twitterCard   = $('meta[name="twitter:card"]').attr('content')?.trim()       ?? null;

  } catch (err: unknown) {
    const e = err as Error;
    pd.crawlTime  = Date.now() - t0;
    pd.crawlError = e.name === 'AbortError'
      ? 'Timeout: page took too long to load'
      : (e.message || 'Unknown error');
  }

  return { pageData: pd, outlinks };
}

// ─── robots.txt checker ──────────────────────────────────────────────────────

export async function checkRobotsTxt(origin: string): Promise<RobotsData> {
  const robotsUrl = `${origin}/robots.txt`;

  const rd: RobotsData = {
    url: robotsUrl,
    accessible: false,
    statusCode: null,
    content: null,
    hasUserAgentStar: false,
    hasSitemapDirective: false,
    sitemapUrls: [],
    blockedPaths: [],
    error: null,
  };

  try {
    const res = await timedFetch(robotsUrl, 10_000);
    rd.statusCode = res.status;
    rd.accessible = res.status === 200;

    if (res.status === 200) {
      const text = await res.text();
      rd.content = text.slice(0, 4_000); // cap stored content

      let currentUA = '';
      for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const [key, ...vals] = line.split(':');
        const k = key.trim().toLowerCase();
        const v = vals.join(':').trim();

        if (k === 'user-agent') {
          currentUA = v.toLowerCase();
          if (currentUA === '*') rd.hasUserAgentStar = true;
        } else if (k === 'disallow' && (currentUA === '*' || currentUA === 'googlebot')) {
          if (v) rd.blockedPaths.push(v);
        } else if (k === 'sitemap') {
          rd.hasSitemapDirective = true;
          if (v) rd.sitemapUrls.push(v);
        }
      }
    }
  } catch (err: unknown) {
    rd.error = (err as Error).message;
  }

  return rd;
}

// ─── sitemap.xml checker ─────────────────────────────────────────────────────

export async function checkSitemap(origin: string, robotsSitemapUrls: string[]): Promise<SitemapData> {
  const candidates = robotsSitemapUrls.length
    ? robotsSitemapUrls
    : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];

  let sd: SitemapData = {
    url: candidates[0],
    accessible: false,
    statusCode: null,
    urlCount: 0,
    urls: [],
    isSitemapIndex: false,
    error: null,
  };

  for (const candidate of candidates) {
    try {
      const res = await timedFetch(candidate, 10_000);
      sd.url        = candidate;
      sd.statusCode = res.status;
      sd.accessible = res.status === 200;

      if (res.status === 200) {
        const text = await res.text();
        sd.isSitemapIndex = text.includes('<sitemapindex');

        // Extract all <loc> values
        const locMatches = [...text.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)];
        const allUrls    = locMatches.map(m => m[1].trim()).filter(Boolean);
        sd.urlCount = allUrls.length;
        sd.urls     = allUrls.slice(0, 150); // Cap display
        break; // Successfully found sitemap
      }
    } catch (err: unknown) {
      sd.error = (err as Error).message;
    }
  }

  return sd;
}

// ─── Main website crawler ─────────────────────────────────────────────────────

export interface CrawlWebsiteResult {
  pages: PageData[];
  robots: RobotsData;
  sitemap: SitemapData;
}

export async function crawlWebsite(
  startUrl: string,
  maxPages = 50,
  onProgress?: (crawled: number, queued: number, currentUrl: string) => void
): Promise<CrawlWebsiteResult> {
  const origin = getOrigin(startUrl);
  const domain = getDomain(startUrl);

  if (!origin || !domain) throw new Error('Invalid start URL');

  // ── Parallel: robots.txt + sitemap ──────────────────────────────────────────
  const robotsPromise  = checkRobotsTxt(origin);
  const robotsData     = await robotsPromise;
  const sitemapData    = await checkSitemap(origin, robotsData.sitemapUrls);

  // ── Seed queue ───────────────────────────────────────────────────────────────
  const normalizedStart = normalizeUrl(startUrl, startUrl) ?? startUrl;
  const visited  = new Set<string>([normalizedStart]);
  const queue: string[] = [normalizedStart];

  // Add sitemap URLs to seed (prioritise homepage first)
  for (const sUrl of sitemapData.urls) {
    const norm = normalizeUrl(sUrl, sUrl);
    if (norm && shouldCrawlUrl(norm, domain) && !visited.has(norm)) {
      visited.add(norm);
      queue.push(norm);
    }
  }

  const pages: PageData[] = [];

  // ── BFS crawl ────────────────────────────────────────────────────────────────
  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;

    onProgress?.(pages.length, queue.length, url);

    const { pageData, outlinks } = await fetchAndAnalyzePage(url, domain);
    pages.push(pageData);

    // Enqueue discovered links
    for (const link of outlinks) {
      const norm = normalizeUrl(link, link) ?? link;
      if (!visited.has(norm) && shouldCrawlUrl(norm, domain) && pages.length + queue.length < maxPages) {
        visited.add(norm);
        queue.push(norm);
      }
    }

    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }
  }

  return { pages, robots: robotsData, sitemap: sitemapData };
}
