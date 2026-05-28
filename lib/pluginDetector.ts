// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Plugin Detector (V7)
// Infers WordPress plugins from ScanResult signals (no raw HTML required).
// Confidence levels reflect the quality of available evidence.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanResult, DetectedPlugin } from '@/types/seo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlContains(urls: string[], s: string): boolean {
  return urls.some(u => u.includes(s));
}

function rawContains(raws: string[], s: string): boolean {
  return raws.some(r => r.toLowerCase().includes(s.toLowerCase()));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectPlugins(result: ScanResult, isWordPress: boolean): DetectedPlugin[] {
  if (!isWordPress) return [];

  const plugins: DetectedPlugin[] = [];

  const allUrls = [
    ...result.pages.map(p => p.url),
    ...result.pages.map(p => p.finalUrl).filter(Boolean),
    ...result.sitemap.urls,
    ...result.robots.sitemapUrls,
  ];

  const robotsContent = result.robots.content ?? '';
  const schemaTypes   = Object.keys(result.schemaAudit?.typeCounts ?? {});

  // Raw schema strings from all crawled pages
  const allRaws: string[] = result.schemaAudit
    ? result.schemaAudit.pageSchemas.flatMap(ps => ps.blocks.map(b => b.raw))
    : result.pages.flatMap(p => (p.schemaBlocks ?? []).map(b => b.raw));

  const hasGraph       = allRaws.some(r => r.includes('"@graph"'));
  const hasSitemapIdx  = result.robots.sitemapUrls.some(u => u.includes('sitemap_index.xml'));
  const hasWpSitemap   = result.robots.sitemapUrls.some(u => u.includes('wp-sitemap.xml'));

  // ── Yoast SEO ──────────────────────────────────────────────────────────────
  {
    const ev: string[] = [];
    let score = 0;

    if (hasSitemapIdx && !hasWpSitemap) {
      ev.push('sitemap_index.xml in robots.txt (Yoast pattern)'); score += 25;
    }
    if (hasGraph) {
      ev.push('@graph JSON-LD structure (Yoast/Rank Math pattern)'); score += 10;
    }
    if (rawContains(allRaws, '"potentialAction"') && rawContains(allRaws, '"WebSite"')) {
      ev.push('WebSite + potentialAction schema (Yoast SearchAction)'); score += 25;
    }
    if (rawContains(allRaws, 'yoast')) {
      ev.push('Yoast keyword in schema output'); score += 40;
    }
    if (schemaTypes.includes('WebPage') && schemaTypes.includes('Organization') && hasGraph) {
      ev.push('WebPage + Organization in @graph (Yoast default output)'); score += 15;
    }

    if (score >= 20) {
      plugins.push({
        name: 'Yoast SEO',
        slug: 'wordpress-seo',
        confidence: score >= 45 ? 'high' : 'medium',
        evidence: ev.join('; '),
        category: 'seo',
      });
    }
  }

  // ── Rank Math ──────────────────────────────────────────────────────────────
  {
    const ev: string[] = [];
    let score = 0;

    if (hasWpSitemap) {
      ev.push('wp-sitemap.xml (Rank Math or WP 5.5+ core)'); score += 15;
    }
    if (rawContains(allRaws, 'rank-math') || rawContains(allRaws, 'rank_math')) {
      ev.push('Rank Math identifier in schema output'); score += 50;
    }
    if (rawContains(allRaws, '"inLanguage"') && hasGraph) {
      ev.push('inLanguage property in @graph (Rank Math pattern)'); score += 15;
    }
    // Rank Math tends to output BreadcrumbList on every page
    if (schemaTypes.includes('BreadcrumbList') && hasGraph && score === 0) {
      ev.push('BreadcrumbList in @graph without clear Yoast signals'); score += 10;
    }

    if (score >= 20) {
      plugins.push({
        name: 'Rank Math',
        slug: 'seo-by-rank-math',
        confidence: score >= 45 ? 'high' : 'medium',
        evidence: ev.join('; '),
        category: 'seo',
      });
    }
  }

  // ── All in One SEO ─────────────────────────────────────────────────────────
  {
    if (rawContains(allRaws, 'aioseo')) {
      plugins.push({
        name: 'All in One SEO',
        slug: 'all-in-one-seo-pack',
        confidence: 'high',
        evidence: 'AIOSEO identifier in schema output',
        category: 'seo',
      });
    }
  }

  // ── WooCommerce ────────────────────────────────────────────────────────────
  {
    const wooUrls = allUrls.filter(u =>
      u.includes('/product/') || u.includes('/product-category/') ||
      u.includes('/shop/')    || u.includes('/cart/') ||
      u.includes('/checkout/') || u.includes('/my-account/'),
    );
    if (wooUrls.length > 0) {
      plugins.push({
        name: 'WooCommerce',
        slug: 'woocommerce',
        confidence: wooUrls.length >= 3 ? 'high' : 'medium',
        evidence: `WooCommerce URLs found: ${wooUrls.slice(0, 2).join(', ')}${wooUrls.length > 2 ? '…' : ''}`,
        category: 'ecommerce',
      });
    }
  }

  // ── Elementor ──────────────────────────────────────────────────────────────
  {
    if (urlContains(allUrls, 'elementor')) {
      plugins.push({
        name: 'Elementor',
        slug: 'elementor',
        confidence: 'medium',
        evidence: 'Elementor URL reference detected',
        category: 'pagebuilder',
      });
    }
  }

  // ── Flatsome ───────────────────────────────────────────────────────────────
  {
    if (urlContains(allUrls, 'flatsome') || rawContains(allRaws, 'flatsome')) {
      plugins.push({
        name: 'Flatsome',
        slug: 'flatsome',
        confidence: 'medium',
        evidence: 'Flatsome theme references in site data',
        category: 'pagebuilder',
      });
    }
  }

  // ── LiteSpeed Cache ────────────────────────────────────────────────────────
  {
    if (robotsContent.includes('litespeed') || urlContains(allUrls, 'litespeed')) {
      plugins.push({
        name: 'LiteSpeed Cache',
        slug: 'litespeed-cache',
        confidence: 'medium',
        evidence: 'LiteSpeed references in robots.txt or URLs',
        category: 'cache',
      });
    }
  }

  // ── WP Rocket (hard to detect without HTTP headers) ───────────────────────
  {
    if (rawContains(allRaws, 'wprocket') || robotsContent.includes('wp-rocket')) {
      plugins.push({
        name: 'WP Rocket',
        slug: 'wp-rocket',
        confidence: 'low',
        evidence: 'WP Rocket reference detected',
        category: 'cache',
      });
    }
  }

  // ── Schema Pro / WP Schema Pro ─────────────────────────────────────────────
  {
    const hasServiceOrLocal = allRaws.some(r =>
      (r.includes('"Service"') || r.includes('"LocalBusiness"')) && !r.includes('"@graph"'),
    );
    if (hasServiceOrLocal) {
      plugins.push({
        name: 'Schema Pro (possible)',
        slug: 'wp-schema-pro',
        confidence: 'low',
        evidence: 'Service/LocalBusiness schema without @graph may indicate Schema Pro',
        category: 'schema',
      });
    }
  }

  return plugins;
}
