// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Placeholder Fixer (V9)
// Replaces [bracket], {{mustache}}, TODO:, INSERT:, lorem ipsum placeholders.
//
// SAFETY RULES:
//   • Safe replacements: brand name, current year, city, service type, keyphrase
//   • Needs-review: statistics, client names, testimonials, prices, case studies
//   • NEVER auto-invent: fake stats, fake client names, fake awards, fake pricing
//   • Unknown placeholders → [⚠️ NEEDS REVIEW: original text]
// ─────────────────────────────────────────────────────────────────────────────

import type { ArticleContext, ContentChange } from '@/types/content';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlaceholderFixResult {
  content:  string;
  changes:  ContentChange[];
  needsReviewCount: number;
  safeFixCount:     number;
}

// ─── Safe replacement map builders ─────────────────────────────────────────────

/**
 * Build a map of patterns that can be safely replaced with known context values.
 * All keys are lowercased for case-insensitive matching.
 */
function buildSafeReplacements(ctx: ArticleContext): Record<string, string> {
  const year = String(new Date().getFullYear());
  const map: Record<string, string> = {};

  // Brand name variants
  if (ctx.brandName) {
    map['brand name']    = ctx.brandName;
    map['brand']         = ctx.brandName;
    map['company name']  = ctx.brandName;
    map['company']       = ctx.brandName;
    map['your company']  = ctx.brandName;
    map['your brand']    = ctx.brandName;
    map[ctx.brandName.toLowerCase()] = ctx.brandName;
  }

  // Year
  map['year']         = year;
  map['current year'] = year;
  map['this year']    = year;

  // City / location
  if (ctx.city) {
    map['city']         = ctx.city;
    map['your city']    = ctx.city;
    map['location']     = ctx.city;
    map['your location']= ctx.city;
  }

  // Service type
  if (ctx.serviceType) {
    map['service']       = ctx.serviceType;
    map['service type']  = ctx.serviceType;
    map['your service']  = ctx.serviceType;
    map['service name']  = ctx.serviceType;
  }

  // Keyphrase / topic
  if (ctx.focusKeyphrase) {
    map['keyphrase']      = ctx.focusKeyphrase;
    map['focus keyword']  = ctx.focusKeyphrase;
    map['keyword']        = ctx.focusKeyphrase;
    map['topic']          = ctx.focusKeyphrase;
    map['your keyword']   = ctx.focusKeyphrase;
  }

  return map;
}

/**
 * Patterns whose placeholder text indicates sensitive data that must NOT be
 * auto-invented. These are marked as [⚠️ NEEDS REVIEW: ...] instead.
 */
const NEEDS_REVIEW_PATTERNS: RegExp[] = [
  /statistic|stat\b|%|percent|number of|figure|data point/i,
  /client name|customer name|testimonial|quote|review|case study/i,
  /price|pricing|cost|fee|rate|per month|per year/i,
  /award|certification|accreditation|ranked|voted/i,
  /phone|email|address|contact/i,
  /url|link|href|http/i,
  /name|person|individual|author/i,
];

/**
 * Determine whether a placeholder value should be treated as needs-review
 * (i.e., it matches a pattern that implies sensitive or inventable data).
 */
function isNeedsReview(placeholderText: string): boolean {
  return NEEDS_REVIEW_PATTERNS.some(re => re.test(placeholderText));
}

// ─── Core replacement logic ─────────────────────────────────────────────────────

let _changeCounter = 0;
function nextId(): string {
  return `ph-fix-${Date.now()}-${++_changeCounter}`;
}

/**
 * Try to resolve a placeholder value using the safe replacement map.
 * Returns `null` if not found (caller should mark as needs-review).
 */
function resolveWithContext(
  inner: string,
  safeMap: Record<string, string>,
): string | null {
  const key = inner.trim().toLowerCase();
  return safeMap[key] ?? null;
}

/**
 * Replace all [bracket] style placeholders.
 */
function replaceBrackets(
  content: string,
  ctx: ArticleContext,
  safeMap: Record<string, string>,
  changes: ContentChange[],
): { content: string; safe: number; review: number } {
  let safe   = 0;
  let review = 0;

  const result = content.replace(/\[([^\]]{2,80})\]/g, (match, inner) => {
    // Skip markdown links like [text](url)
    const afterMatch = content.indexOf(match);
    const charAfter  = content[afterMatch + match.length];
    if (charAfter === '(') return match; // likely a markdown link

    const resolved = resolveWithContext(inner, safeMap);

    if (resolved !== null) {
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: `Replaced [${inner}] with context value`,
        before:      match,
        after:       resolved,
      });
      safe++;
      return resolved;
    }

    if (isNeedsReview(inner)) {
      const replacement = `[⚠️ NEEDS REVIEW: ${inner}]`;
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: `Flagged [${inner}] for manual review`,
        before:      match,
        after:       replacement,
      });
      review++;
      return replacement;
    }

    // Generic unknown → needs review
    const replacement = `[⚠️ NEEDS REVIEW: ${inner}]`;
    changes.push({
      id:          nextId(),
      issueType:   'placeholder-detected',
      description: `Flagged unknown placeholder [${inner}] for review`,
      before:      match,
      after:       replacement,
    });
    review++;
    return replacement;
  });

  return { content: result, safe, review };
}

/**
 * Replace all {{mustache}} style placeholders.
 */
function replaceMustache(
  content: string,
  ctx: ArticleContext,
  safeMap: Record<string, string>,
  changes: ContentChange[],
): { content: string; safe: number; review: number } {
  let safe   = 0;
  let review = 0;

  const result = content.replace(/\{\{([^}]{2,80})\}\}/g, (_match, inner) => {
    const match    = `{{${inner}}}`;
    const resolved = resolveWithContext(inner, safeMap);

    if (resolved !== null) {
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: `Replaced {{${inner}}} with context value`,
        before:      match,
        after:       resolved,
      });
      safe++;
      return resolved;
    }

    if (isNeedsReview(inner)) {
      const replacement = `[⚠️ NEEDS REVIEW: ${inner}]`;
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: `Flagged {{${inner}}} for manual review`,
        before:      match,
        after:       replacement,
      });
      review++;
      return replacement;
    }

    const replacement = `[⚠️ NEEDS REVIEW: ${inner}]`;
    changes.push({
      id:          nextId(),
      issueType:   'placeholder-detected',
      description: `Flagged unknown mustache placeholder {{${inner}}} for review`,
      before:      match,
      after:       replacement,
    });
    review++;
    return replacement;
  });

  return { content: result, safe, review };
}

/**
 * Replace TODO: ... lines.
 * These are always marked as needs-review since we don't know the intent.
 */
function replaceTodoLines(
  content: string,
  changes: ContentChange[],
): { content: string; review: number } {
  let review = 0;

  // Match TODO: ... to end of line (HTML or plain text)
  const result = content.replace(/TODO:\s*([^\n<]{0,200})/gi, (_match, rest) => {
    const before      = `TODO: ${rest}`;
    const replacement = `[⚠️ NEEDS REVIEW: TODO — ${rest.trim()}]`;
    changes.push({
      id:          nextId(),
      issueType:   'placeholder-detected',
      description: `Flagged TODO item for manual completion`,
      before,
      after:       replacement,
    });
    review++;
    return replacement;
  });

  return { content: result, review };
}

/**
 * Replace INSERT: ... markers.
 */
function replaceInsertMarkers(
  content: string,
  ctx: ArticleContext,
  safeMap: Record<string, string>,
  changes: ContentChange[],
): { content: string; safe: number; review: number } {
  let safe   = 0;
  let review = 0;

  const result = content.replace(/INSERT:\s*([^\n<]{0,200})/gi, (_match, rest) => {
    const before   = `INSERT: ${rest}`;
    const resolved = resolveWithContext(rest.trim(), safeMap);

    if (resolved !== null) {
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: `Replaced INSERT: ${rest.trim()} with context value`,
        before,
        after:       resolved,
      });
      safe++;
      return resolved;
    }

    const replacement = `[⚠️ NEEDS REVIEW: INSERT — ${rest.trim()}]`;
    changes.push({
      id:          nextId(),
      issueType:   'placeholder-detected',
      description: `Flagged INSERT marker for manual completion`,
      before,
      after:       replacement,
    });
    review++;
    return replacement;
  });

  return { content: result, safe, review };
}

/**
 * Replace lorem ipsum filler text with a needs-review marker.
 * We don't auto-generate replacement content — that would be fake data.
 */
function replaceLorem(
  content: string,
  changes: ContentChange[],
): { content: string; review: number } {
  let review = 0;

  // Match full lorem ipsum blocks (greedy within reasonable length)
  const result = content.replace(
    /lorem\s+ipsum[^<]{0,500}/gi,
    (match) => {
      const trimmed = match.trim();
      const replacement = `[⚠️ NEEDS REVIEW: Replace lorem ipsum filler text with real content]`;
      changes.push({
        id:          nextId(),
        issueType:   'placeholder-detected',
        description: 'Flagged lorem ipsum filler text for replacement',
        before:      trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
        after:       replacement,
      });
      review++;
      return replacement;
    },
  );

  return { content: result, review };
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fix all placeholders in the given content string.
 * Safe context-based replacements are applied automatically.
 * Sensitive or unknown placeholders are marked as [⚠️ NEEDS REVIEW: ...].
 */
export function fixPlaceholders(
  content: string,
  ctx: ArticleContext,
): PlaceholderFixResult {
  const changes: ContentChange[] = [];
  const safeMap = buildSafeReplacements(ctx);

  let safe   = 0;
  let review = 0;
  let text   = content;

  // 1. Lorem ipsum (before bracket pass to avoid false positives)
  const lorem = replaceLorem(text, changes);
  text   = lorem.content;
  review += lorem.review;

  // 2. Mustache {{...}}
  const mustache = replaceMustache(text, ctx, safeMap, changes);
  text   = mustache.content;
  safe   += mustache.safe;
  review += mustache.review;

  // 3. TODO: lines
  const todo = replaceTodoLines(text, changes);
  text   = todo.content;
  review += todo.review;

  // 4. INSERT: markers
  const insertM = replaceInsertMarkers(text, ctx, safeMap, changes);
  text   = insertM.content;
  safe   += insertM.safe;
  review += insertM.review;

  // 5. [bracket] placeholders (last — avoid eating NEEDS REVIEW markers)
  const brackets = replaceBrackets(text, ctx, safeMap, changes);
  text   = brackets.content;
  safe   += brackets.safe;
  review += brackets.review;

  return {
    content:          text,
    changes,
    needsReviewCount: review,
    safeFixCount:     safe,
  };
}

/**
 * Count how many placeholders remain in content (for re-score checks).
 */
export function countRemainingPlaceholders(content: string): number {
  const brackets  = (content.match(/\[[^\]]{2,80}\]/g) ?? [])
    .filter(m => !m.startsWith('[⚠️')).length;
  const mustaches = (content.match(/\{\{[^}]{2,80}\}\}/g) ?? []).length;
  const todos     = (content.match(/TODO:/gi) ?? []).length;
  const inserts   = (content.match(/INSERT:/gi) ?? []).length;
  const lorems    = (content.match(/lorem\s+ipsum/gi) ?? []).length;
  return brackets + mustaches + todos + inserts + lorems;
}
