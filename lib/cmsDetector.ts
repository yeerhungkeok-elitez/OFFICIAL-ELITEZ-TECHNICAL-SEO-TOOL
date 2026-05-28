// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — CMS Detector (V7)
// Infers the CMS from crawl signals in ScanResult (no raw HTML required).
// Uses robots.txt content, URL patterns, sitemap patterns, and schema types.
// ─────────────────────────────────────────────────────────────────────────────

import type { ScanResult, CMSDetectionResult, DetectedTheme, CMSName } from '@/types/seo';
import { detectPlugins } from './pluginDetector';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlsInclude(urls: string[], pattern: string): boolean {
  return urls.some(u => u.includes(pattern));
}

function robotsIncludes(content: string, pattern: string): boolean {
  return content.includes(pattern);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function detectCMS(result: ScanResult): CMSDetectionResult {
  const pageUrls = [
    ...result.pages.map(p => p.url),
    ...result.pages.map(p => p.finalUrl).filter(Boolean),
  ];
  const sitemapUrls  = [...result.sitemap.urls, ...result.robots.sitemapUrls];
  const allUrls      = [...pageUrls, ...sitemapUrls];
  const robots       = result.robots.content ?? '';
  const schemaTypes  = Object.keys(result.schemaAudit?.typeCounts ?? {});

  const allRaws: string[] = result.schemaAudit
    ? result.schemaAudit.pageSchemas.flatMap(ps => ps.blocks.map(b => b.raw))
    : result.pages.flatMap(p => (p.schemaBlocks ?? []).map(b => b.raw));

  const evidence: string[] = [];

  // ─── WordPress signals ──────────────────────────────────────────────────
  let wpScore = 0;

  if (robotsIncludes(robots, '/wp-admin/')) {
    evidence.push('robots.txt disallows /wp-admin/ — strong WordPress signal');
    wpScore += 35;
  }
  if (robotsIncludes(robots, 'wp-content')) {
    evidence.push('robots.txt references /wp-content/');
    wpScore += 20;
  }
  if (robotsIncludes(robots, 'wp-includes')) {
    evidence.push('robots.txt references /wp-includes/');
    wpScore += 15;
  }
  if (result.robots.sitemapUrls.some(u => u.includes('sitemap_index.xml'))) {
    evidence.push('sitemap_index.xml in robots.txt (Yoast SEO pattern)');
    wpScore += 20;
  }
  if (result.robots.sitemapUrls.some(u => u.includes('wp-sitemap.xml'))) {
    evidence.push('wp-sitemap.xml (WordPress 5.5+ core sitemap)');
    wpScore += 25;
  }
  if (urlsInclude(allUrls, '/wp-content/')) {
    evidence.push('/wp-content/ path in crawled or sitemap URLs');
    wpScore += 30;
  }
  if (urlsInclude(pageUrls, '/category/')) {
    evidence.push('WordPress /category/ archive URL structure detected');
    wpScore += 15;
  }
  if (urlsInclude(pageUrls, '/tag/')) {
    evidence.push('WordPress /tag/ archive URL structure detected');
    wpScore += 10;
  }
  if (urlsInclude(pageUrls, '/author/')) {
    evidence.push('WordPress /author/ archive URL structure detected');
    wpScore += 10;
  }
  if (urlsInclude(pageUrls, '/?p=') || urlsInclude(pageUrls, '/?page_id=')) {
    evidence.push('WordPress default query parameter URLs (e.g. ?p=123)');
    wpScore += 20;
  }
  if (allRaws.some(r => r.includes('"@graph"'))) {
    evidence.push('JSON-LD @graph pattern (characteristic of Yoast SEO / Rank Math)');
    wpScore += 10;
  }
  if (schemaTypes.includes('WebSite') || schemaTypes.includes('Organization')) {
    evidence.push('WebSite / Organization schema common with WordPress SEO plugins');
    wpScore += 5;
  }
  if (result.sitemap.url.includes('sitemap') && result.sitemap.accessible) {
    // WordPress always has a sitemap; slight signal
    wpScore += 5;
  }

  // ─── WooCommerce signals ────────────────────────────────────────────────
  let wooScore = 0;

  if (urlsInclude(allUrls, '/product/') || urlsInclude(allUrls, '/product-category/')) {
    evidence.push('WooCommerce /product/ URL structure detected');
    wooScore += 25;
  }
  if (urlsInclude(pageUrls, '/shop/') || urlsInclude(pageUrls, '/store/')) {
    evidence.push('WooCommerce /shop/ or /store/ page detected');
    wooScore += 20;
  }
  if (urlsInclude(pageUrls, '/cart/') || urlsInclude(pageUrls, '/checkout/')) {
    evidence.push('Cart and Checkout pages detected (WooCommerce standard pages)');
    wooScore += 25;
  }
  if (urlsInclude(pageUrls, '/my-account/') || urlsInclude(pageUrls, '/wc-api/')) {
    evidence.push('/my-account/ detected (WooCommerce customer account page)');
    wooScore += 20;
  }
  if (schemaTypes.includes('Product') || schemaTypes.includes('Offer')) {
    evidence.push('Product / Offer schema types detected (WooCommerce)');
    wooScore += 15;
  }

  // ─── Shopify signals ────────────────────────────────────────────────────
  let shopifyScore = 0;

  if (result.domain.includes('myshopify.com')) {
    evidence.push('myshopify.com domain — definitive Shopify signal');
    shopifyScore += 80;
  }
  if (
    urlsInclude(allUrls, '/collections/') &&
    urlsInclude(allUrls, '/products/') &&
    !robotsIncludes(robots, '/wp-admin/')
  ) {
    evidence.push('/collections/ and /products/ URL patterns (Shopify)');
    shopifyScore += 40;
  }
  if (
    robotsIncludes(robots, 'Disallow: /checkout') &&
    !robotsIncludes(robots, '/wp-admin/')
  ) {
    evidence.push('Shopify-style robots.txt checkout block detected');
    shopifyScore += 20;
  }
  if (robotsIncludes(robots, 'cdn.shopify.com')) {
    evidence.push('Shopify CDN reference in robots.txt');
    shopifyScore += 30;
  }

  // ─── Wix signals ────────────────────────────────────────────────────────
  let wixScore = 0;

  if (result.domain.includes('wix.com') || result.domain.includes('wixsite.com')) {
    evidence.push('Wix hosted domain — definitive Wix signal');
    wixScore += 80;
  }
  if (robotsIncludes(robots, 'wix.com') || robotsIncludes(robots, 'wixstatic.com')) {
    evidence.push('Wix references found in robots.txt');
    wixScore += 50;
  }

  // ─── Webflow signals ────────────────────────────────────────────────────
  let webflowScore = 0;

  if (result.domain.includes('webflow.io')) {
    evidence.push('Webflow hosted domain — definitive Webflow signal');
    webflowScore += 80;
  }
  if (robotsIncludes(robots, 'webflow')) {
    evidence.push('Webflow reference in robots.txt');
    webflowScore += 40;
  }

  // ─── Determine CMS ──────────────────────────────────────────────────────
  let cmsName: CMSName = 'Custom/Unknown';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let isWordPress = false;
  let hasWooCommerce = false;

  if (wixScore >= 50) {
    cmsName    = 'Wix';
    confidence = wixScore >= 70 ? 'high' : 'medium';
  } else if (webflowScore >= 40) {
    cmsName    = 'Webflow';
    confidence = webflowScore >= 60 ? 'high' : 'medium';
  } else if (shopifyScore >= 40) {
    cmsName    = 'Shopify';
    confidence = shopifyScore >= 60 ? 'high' : 'medium';
  } else if (wpScore >= 15) {
    isWordPress = true;
    if (wooScore >= 35) {
      hasWooCommerce = true;
      cmsName    = 'WooCommerce';
      confidence = wooScore >= 60 ? 'high' : 'medium';
    } else {
      cmsName    = 'WordPress';
      confidence = wpScore >= 45 ? 'high' : wpScore >= 25 ? 'medium' : 'low';
    }
  }

  if (cmsName === 'Custom/Unknown' && evidence.length === 0) {
    evidence.push('No CMS-specific signals found in crawl data');
    evidence.push('Tip: Detection relies on robots.txt, URL patterns, and schema types');
  }

  // ─── Theme detection ────────────────────────────────────────────────────
  let detectedTheme: DetectedTheme | null = null;

  if (isWordPress || hasWooCommerce) {
    if (
      allRaws.some(r => r.toLowerCase().includes('flatsome')) ||
      allUrls.some(u => u.toLowerCase().includes('flatsome'))
    ) {
      detectedTheme = {
        name:       'Flatsome',
        confidence: 'medium',
        evidence:   'Flatsome theme references detected in crawl data',
      };
    } else if (
      allUrls.some(u => u.toLowerCase().includes('divi')) ||
      allRaws.some(r => r.toLowerCase().includes('divi'))
    ) {
      detectedTheme = {
        name:       'Divi',
        confidence: 'low',
        evidence:   'Divi theme references detected',
      };
    } else if (
      allUrls.some(u => u.toLowerCase().includes('avada')) ||
      allRaws.some(r => r.toLowerCase().includes('avada'))
    ) {
      detectedTheme = {
        name:       'Avada',
        confidence: 'low',
        evidence:   'Avada theme references detected',
      };
    }
  }

  // ─── Plugin detection ────────────────────────────────────────────────────
  const detectedPlugins = detectPlugins(result, isWordPress || hasWooCommerce);

  return {
    cmsName,
    confidence,
    evidence,
    detectedTheme,
    detectedPlugins,
    isWordPress,
    hasWooCommerce,
  };
}
