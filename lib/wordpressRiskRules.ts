// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Risk Rules (V7)
// Safety guardrails for WordPress fix recommendations.
// All checks are advisory — do not apply any change blindly.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixType } from '@/types/seo';

// ─── URL pattern helpers ──────────────────────────────────────────────────────

const ARCHIVE_PATTERNS = [
  '/category/', '/tag/', '/author/', '/page/', '/date/', '/feed/',
  '/search/', '/?s=', '/archives/',
];

const WOOCOMMERCE_NOINDEX_PATTERNS = [
  '/cart/', '/checkout/', '/thank-you/', '/order-received/',
  '/my-account/', '/wc-api/', '/wp-login.php', '/wp-admin/',
];

const ADMIN_PATTERNS = [
  '/wp-admin/', '/wp-login.php', '/admin/', '/?feed=',
];

const CANONICAL_RISK_PATTERNS = [
  '/product/', '/collections/', '?variation', '?color', '?size',
];

const AGGRESSIVE_SCHEMA_PATTERNS = [
  'review', 'rating', 'testimonial',
];

// ─── Risk evaluation ──────────────────────────────────────────────────────────

export interface RiskResult {
  hasRisk:      boolean;
  warnings:     string[];
  riskLevel:    'safe' | 'needs-review' | 'requires-approval';
  approvalNote: string;
}

export function evaluateRisk(
  url:      string,
  fixType:  FixType,
  rawSchema?: string,
): RiskResult {
  const warnings:  string[] = [];
  let riskLevel: 'safe' | 'needs-review' | 'requires-approval' = 'safe';

  const urlLower = url.toLowerCase();

  // ── Never index these regardless of fix type ───────────────────────────
  if (ADMIN_PATTERNS.some(p => urlLower.includes(p))) {
    warnings.push('⚠️ This URL appears to be an admin or system URL. Do not attempt to index it.');
    riskLevel = 'requires-approval';
  }

  // ── Noindex rules ──────────────────────────────────────────────────────
  if (fixType === 'Noindex') {
    if (ARCHIVE_PATTERNS.some(p => urlLower.includes(p))) {
      warnings.push(
        '⚠️ This is a taxonomy or archive page. Removing noindex from archive pages requires careful consideration — ' +
        'they can cause duplicate content issues. Review your SEO strategy before enabling indexing.',
      );
      riskLevel = 'needs-review';
    }
    if (WOOCOMMERCE_NOINDEX_PATTERNS.some(p => urlLower.includes(p))) {
      warnings.push(
        '🚨 This appears to be a WooCommerce transactional page (cart, checkout, my-account). ' +
        'These pages should typically remain noindex. Do NOT remove noindex from these pages.',
      );
      riskLevel = 'requires-approval';
    }
    if (urlLower.includes('/author/')) {
      warnings.push(
        '⚠️ Author archive pages are often best kept noindex to avoid thin content issues. ' +
        'Only enable if author pages have substantial unique content.',
      );
      riskLevel = 'needs-review';
    }
  }

  // ── Robots.txt rules ───────────────────────────────────────────────────
  if (fixType === 'Robots.txt') {
    warnings.push(
      '🚨 Editing robots.txt can accidentally block Google from crawling your entire site or key sections. ' +
      'Always test changes with Google Search Console URL Inspection before publishing.',
    );
    warnings.push(
      '🚨 Any robots.txt change requires developer approval. A single misplaced Disallow rule can remove your site from search results.',
    );
    riskLevel = 'requires-approval';
  }

  // ── Redirect rules ─────────────────────────────────────────────────────
  if (fixType === 'Redirect') {
    warnings.push(
      '⚠️ 301 redirects permanently transfer link equity from old URLs to new ones. ' +
      'Ensure the target URL is correct and will remain stable. Incorrect redirects can cause ranking loss.',
    );
    warnings.push(
      '⚠️ Redirect chains (redirect A → B → C) should be avoided. ' +
      'Always redirect directly to the final destination URL.',
    );
    riskLevel = 'needs-review';
  }

  // ── Canonical rules ────────────────────────────────────────────────────
  if (fixType === 'Canonical') {
    if (CANONICAL_RISK_PATTERNS.some(p => urlLower.includes(p))) {
      warnings.push(
        '⚠️ This page may be a product variant or filtered page. ' +
        'Canonical tags on product variant pages must point to the correct primary product URL. ' +
        'Verify which URL should be the canonical before making changes.',
      );
      riskLevel = 'needs-review';
    } else {
      warnings.push(
        '⚠️ Changing canonical tags affects duplicate content signals. ' +
        'Confirm the target canonical URL is the definitive version of this content.',
      );
      if (riskLevel === 'safe') riskLevel = 'needs-review';
    }
  }

  // ── FAQ Schema rules ───────────────────────────────────────────────────
  if (fixType === 'FAQPage Schema') {
    warnings.push(
      '⚠️ FAQPage schema must match visible FAQ content on the page. ' +
      'Adding schema for questions that are not visible to users may violate Google\'s structured data guidelines.',
    );
    if (riskLevel === 'safe') riskLevel = 'needs-review';
  }

  // ── Review/Rating schema ───────────────────────────────────────────────
  if (rawSchema && AGGRESSIVE_SCHEMA_PATTERNS.some(p => rawSchema.toLowerCase().includes(p))) {
    warnings.push(
      '⚠️ Review or AggregateRating schema requires real, verifiable reviews visible on the page. ' +
      'Fabricated or non-visible review schema may result in a manual penalty.',
    );
    if (riskLevel === 'safe') riskLevel = 'needs-review';
  }

  // ── Product schema rules ────────────────────────────────────────────────
  if (fixType === 'Service Schema' && urlLower.includes('/product')) {
    warnings.push(
      '⚠️ Use Product schema (not Service schema) for e-commerce product pages. ' +
      'Verify the schema type matches the actual content of the page.',
    );
    if (riskLevel === 'safe') riskLevel = 'needs-review';
  }

  // ── Cache plugin 403 rules ──────────────────────────────────────────────
  if (urlLower.includes('403') || fixType === 'Redirect') {
    if (urlLower.includes('/wp-content/') || urlLower.includes('/uploads/')) {
      warnings.push(
        '⚠️ 403 errors on wp-content or uploads paths may be caused by server or cache plugin security rules. ' +
        'This requires server/hosting access to resolve. Do not attempt client-side fixes.',
      );
      riskLevel = 'requires-approval';
    }
  }

  const approvalNote =
    riskLevel === 'safe'               ? 'Safe to apply after content verification.' :
    riskLevel === 'needs-review'       ? 'Review with your SEO strategist before applying.' :
    'Requires developer or SEO specialist approval before applying.';

  return {
    hasRisk:     warnings.length > 0,
    warnings,
    riskLevel,
    approvalNote,
  };
}

// ─── Archive URL checker ──────────────────────────────────────────────────────

export function isArchiveUrl(url: string): boolean {
  const u = url.toLowerCase();
  return ARCHIVE_PATTERNS.some(p => u.includes(p));
}

export function isWooTransactionalUrl(url: string): boolean {
  const u = url.toLowerCase();
  return WOOCOMMERCE_NOINDEX_PATTERNS.some(p => u.includes(p));
}
