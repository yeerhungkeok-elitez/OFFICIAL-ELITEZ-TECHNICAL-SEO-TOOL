// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Schema Extractor (V2)
// Parses JSON-LD blocks safely; handles objects, arrays, and @graph patterns.
// ─────────────────────────────────────────────────────────────────────────────

import type { SchemaBlock, PageIntent, PageData } from '@/types/seo';

const RAW_CAP = 10_000; // characters stored per block

// ─── Type extraction ──────────────────────────────────────────────────────────

/**
 * Recursively pull every @type value from a parsed JSON-LD object.
 * Handles: plain object, @graph array, nested @type arrays.
 */
export function extractAllTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];

  const obj = node as Record<string, unknown>;
  const types: string[] = [];

  // Direct @type
  if (obj['@type']) {
    const t = obj['@type'];
    if (typeof t === 'string') {
      types.push(t);
    } else if (Array.isArray(t)) {
      (t as unknown[]).forEach(item => {
        if (typeof item === 'string') types.push(item);
      });
    }
  }

  // @graph children
  if (Array.isArray(obj['@graph'])) {
    (obj['@graph'] as unknown[]).forEach(child => types.push(...extractAllTypes(child)));
  }

  return types;
}

// ─── Single-block parser ──────────────────────────────────────────────────────

/**
 * Parse one raw JSON-LD string.
 * Never throws — errors are recorded in `isValid`/`parseError`.
 */
export function parseSchemaBlock(rawInput: string): SchemaBlock {
  const raw = rawInput.trim().slice(0, RAW_CAP);

  try {
    const parsed = JSON.parse(rawInput.trim()); // parse full string, store capped raw

    const types: string[] = [];

    if (Array.isArray(parsed)) {
      // Array of schema objects in one script tag
      (parsed as unknown[]).forEach(item => types.push(...extractAllTypes(item)));
    } else {
      types.push(...extractAllTypes(parsed));
    }

    const uniqueTypes = [...new Set(types)];

    const isGraph =
      !Array.isArray(parsed) &&
      typeof parsed === 'object' &&
      parsed !== null &&
      '@graph' in parsed;

    return {
      raw,
      parsed: typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null,
      isValid: true,
      types: uniqueTypes,
      isGraph,
    };
  } catch (err) {
    return {
      raw,
      parsed: null,
      isValid: false,
      parseError: (err as Error).message,
      types: [],
      isGraph: false,
    };
  }
}

// ─── Page intent detection ────────────────────────────────────────────────────

/**
 * Infer the intent/type of a page from its URL path, title, and H1.
 * Used to determine which schema types are recommended.
 */
export function detectPageIntent(page: Pick<PageData, 'url' | 'title' | 'h1Texts'>): PageIntent {
  let path = '';
  try {
    path = new URL(page.url).pathname.toLowerCase();
  } catch {
    path = page.url.toLowerCase();
  }

  const title    = (page.title ?? '').toLowerCase();
  const h1       = page.h1Texts.join(' ').toLowerCase();
  const combined = `${path} ${title} ${h1}`;

  // Homepage: root path or extremely short path
  if (path === '/' || path === '' || path === '/index' || path === '/home') {
    return 'homepage';
  }

  // FAQ — check before blog to avoid false positives on articles about FAQs
  if (/\/faq|\/faqs|frequently.asked|\/q-and-a|\/q&a/.test(combined)) {
    return 'faq';
  }

  // Blog / article / news
  if (/\/(blog|article|post|news|insight|thought-leadership|case-study|press|update|story)/.test(path)) {
    return 'blog';
  }

  // Service / solution
  if (/\/(service|solution|staffing|recruitment|consulting|offering|what-we-do|capabilities|expertise)/.test(path)) {
    return 'service';
  }

  // Contact / about / location
  if (/\/(contact|about|location|office|reach-us|team|our-story|careers|career)/.test(path)) {
    return 'contact';
  }

  // Product / shop / pricing
  if (/\/(product|shop|store|buy|item|pricing|price|plan|package)/.test(path)) {
    return 'product';
  }

  return 'other';
}

// ─── Expected schema types per page intent ────────────────────────────────────

export const RECOMMENDED_TYPES_BY_INTENT: Record<PageIntent, string[]> = {
  homepage: ['Organization', 'WebSite'],
  blog:     ['Article'],              // or BlogPosting / NewsArticle
  service:  ['Service'],
  faq:      ['FAQPage'],
  contact:  ['LocalBusiness'],
  product:  ['Product'],
  other:    [],                        // No specific recommendation
};

/** Schema types considered "always useful" for any page */
export const UNIVERSAL_RECOMMENDED = ['BreadcrumbList'];

/** Article-family types */
export const ARTICLE_TYPES = new Set(['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'ScholarlyArticle']);

/** Organization-family types */
export const ORGANIZATION_TYPES = new Set(['Organization', 'LocalBusiness', 'Corporation', 'EducationalOrganization', 'NGO']);

// ─── Property validators ──────────────────────────────────────────────────────

type JsonObj = Record<string, unknown>;

/** Safe deep property getter */
function prop(obj: JsonObj, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as JsonObj)[k];
  }
  return cur;
}

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export interface PropertyCheckResult {
  missingProperties: string[];
  presentProperties: string[];
}

/**
 * Check which recommended properties are present / missing for a given schema object.
 */
export function checkSchemaProperties(type: string, obj: JsonObj): PropertyCheckResult {
  const missing: string[] = [];
  const present: string[] = [];

  function chk(label: string, value: unknown) {
    if (hasValue(value)) present.push(label);
    else missing.push(label);
  }

  if (ORGANIZATION_TYPES.has(type)) {
    chk('name',        prop(obj, 'name'));
    chk('url',         prop(obj, 'url'));
    chk('logo',        prop(obj, 'logo'));
    chk('sameAs',      prop(obj, 'sameAs'));
    chk('description', prop(obj, 'description'));
  }

  if (type === 'LocalBusiness') {
    chk('telephone',              prop(obj, 'telephone'));
    chk('address.streetAddress',  prop(obj, 'address', 'streetAddress'));
    chk('address.addressLocality',prop(obj, 'address', 'addressLocality'));
    chk('address.addressCountry', prop(obj, 'address', 'addressCountry'));
  }

  if (ARTICLE_TYPES.has(type)) {
    chk('headline',       prop(obj, 'headline'));
    chk('image',          prop(obj, 'image'));
    chk('author',         prop(obj, 'author'));
    chk('datePublished',  prop(obj, 'datePublished'));
    chk('publisher',      prop(obj, 'publisher'));
  }

  if (type === 'FAQPage') {
    const me = prop(obj, 'mainEntity');
    chk('mainEntity', me);
    if (Array.isArray(me) && me.length === 0) missing.push('mainEntity[items]');
  }

  if (type === 'BreadcrumbList') {
    const ile = prop(obj, 'itemListElement');
    chk('itemListElement', ile);
    if (Array.isArray(ile) && ile.length === 0) missing.push('itemListElement[items]');
  }

  if (type === 'Service') {
    chk('name',        prop(obj, 'name'));
    chk('description', prop(obj, 'description'));
    chk('provider',    prop(obj, 'provider'));
  }

  if (type === 'WebSite') {
    chk('name', prop(obj, 'name'));
    chk('url',  prop(obj, 'url'));
  }

  if (type === 'Product') {
    chk('name',        prop(obj, 'name'));
    chk('image',       prop(obj, 'image'));
    chk('description', prop(obj, 'description'));
  }

  return { missingProperties: missing, presentProperties: present };
}

// ─── Strip parsed objects before storage ─────────────────────────────────────

/**
 * Return a version of `SchemaBlock` safe for JSON serialisation / localStorage
 * (removes the potentially-large `parsed` object).
 */
export function stripParsed(block: SchemaBlock): SchemaBlock {
  return { ...block, parsed: null };
}
