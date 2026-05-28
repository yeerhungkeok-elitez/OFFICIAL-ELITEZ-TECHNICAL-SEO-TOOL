// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Content Auto Fixer (V9)
// Orchestrates all fixers: placeholder → seo → readability.
// Supports: fix-all, fix-all-safe, fix-all-critical, fix-single-issue.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ArticleDraft,
  ArticleContext,
  ContentFixResult,
  ContentIssue,
  ContentIssueType,
} from '@/types/content';

import { scoreContent }             from '@/lib/contentScorer';
import { fixPlaceholders }          from '@/lib/placeholderFixer';
import { fixSeoContent, fixSingleSeoIssue } from '@/lib/seoContentFixer';
import { fixReadability, fixSingleReadabilityIssue } from '@/lib/readabilityFixer';

// ─── Fix scope options ──────────────────────────────────────────────────────────

export type FixScope =
  | 'all'
  | 'safe-only'
  | 'critical-only'
  | 'single';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function draftToContext(draft: ArticleDraft): ArticleContext {
  return {
    title:          draft.title,
    focusKeyphrase: draft.focusKeyphrase,
    brandName:      draft.brandName,
    city:           draft.city,
    serviceType:    draft.serviceType,
    category:       draft.category,
  };
}

/** Issue types handled by the placeholder fixer */
const PLACEHOLDER_TYPES: ContentIssueType[] = ['placeholder-detected'];

/** Issue types handled by the SEO fixer */
const SEO_TYPES: ContentIssueType[] = [
  'keyphrase-in-intro',
  'keyphrase-in-title',
  'keyphrase-in-h2',
  'meta-title-missing',
  'meta-title-weak',
  'meta-description-missing',
  'meta-description-weak',
  'no-cta',
  'no-conclusion',
  'no-faq',
];

/** Issue types handled by the readability fixer */
const READABILITY_TYPES: ContentIssueType[] = [
  'long-paragraph',
  'heading-structure-weak',
];

// ─── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * Auto-fix a draft based on the current score result issues.
 *
 * @param draft     The current draft to fix
 * @param scope     Which issues to fix
 * @param issueId   Required when scope === 'single'
 */
export function autoFixDraft(
  draft: ArticleDraft,
  scope: FixScope,
  issueId?: string,
): ContentFixResult {
  const ctx = draftToContext(draft);

  // Rescore to get fresh issue list
  const scoreResult  = scoreContent(draft);
  const activeIssues = scoreResult.issues.filter(i => !i.isIgnored && !i.isFixed);

  // Determine which issues to fix
  let issuesToFix: ContentIssue[];

  switch (scope) {
    case 'all':
      issuesToFix = activeIssues;
      break;

    case 'safe-only':
      issuesToFix = activeIssues.filter(i => i.canAutoFix && i.safetyLevel === 'safe');
      break;

    case 'critical-only':
      issuesToFix = activeIssues.filter(i => i.severity === 'critical' || i.severity === 'high');
      break;

    case 'single':
      if (!issueId) {
        throw new Error('autoFixDraft: issueId is required for scope=single');
      }
      issuesToFix = activeIssues.filter(i => i.id === issueId);
      break;
  }

  if (issuesToFix.length === 0) {
    return {
      updatedContent:         draft.content,
      updatedMetaTitle:       draft.metaTitle,
      updatedMetaDescription: draft.metaDescription,
      changes:                [],
      issueIdsFixed:          [],
    };
  }

  const fixedTypes = new Set(issuesToFix.map(i => i.type));
  const allChanges: ContentFixResult['changes'] = [];
  let content    = draft.content;
  let metaTitle  = draft.metaTitle;
  let metaDesc   = draft.metaDescription;

  // ── Phase 1: Placeholder fixer ───────────────────────────────────────────────
  const runPlaceholders = issuesToFix.some(i => PLACEHOLDER_TYPES.includes(i.type));
  if (runPlaceholders) {
    const result = fixPlaceholders(content, ctx);
    content = result.content;
    allChanges.push(...result.changes);
  }

  // ── Phase 2: SEO fixer ────────────────────────────────────────────────────────
  const seoIssuesToFix = issuesToFix.filter(i => SEO_TYPES.includes(i.type));

  if (seoIssuesToFix.length > 0) {
    const seoResult = fixSeoContent(content, metaTitle, metaDesc, ctx, {
      fixKeyphraseInIntro:  fixedTypes.has('keyphrase-in-intro'),
      fixMetaTitle:         fixedTypes.has('meta-title-missing') || fixedTypes.has('meta-title-weak'),
      fixMetaDescription:   fixedTypes.has('meta-description-missing') || fixedTypes.has('meta-description-weak'),
      addCTA:               fixedTypes.has('no-cta'),
      addConclusion:        fixedTypes.has('no-conclusion'),
      addFAQ:               fixedTypes.has('no-faq'),
    });
    content   = seoResult.content;
    metaTitle = seoResult.metaTitle;
    metaDesc  = seoResult.metaDescription;
    allChanges.push(...seoResult.changes);
  }

  // ── Phase 3: Readability fixer ────────────────────────────────────────────────
  const readIssuesToFix = issuesToFix.filter(i => READABILITY_TYPES.includes(i.type));

  if (readIssuesToFix.length > 0) {
    const readResult = fixReadability(content, ctx);
    content = readResult.content;
    allChanges.push(...readResult.changes);
  }

  return {
    updatedContent:         content,
    updatedMetaTitle:       metaTitle,
    updatedMetaDescription: metaDesc,
    changes:                allChanges,
    issueIdsFixed:          issuesToFix.map(i => i.id),
  };
}

/**
 * Fix a single issue by its type (used when issue ID is not needed but type is known).
 */
export function fixIssueByType(
  draft: ArticleDraft,
  issueType: ContentIssueType,
): ContentFixResult {
  const ctx = draftToContext(draft);
  const allChanges: ContentFixResult['changes'] = [];
  let content   = draft.content;
  let metaTitle = draft.metaTitle;
  let metaDesc  = draft.metaDescription;

  if (PLACEHOLDER_TYPES.includes(issueType)) {
    const r = fixPlaceholders(content, ctx);
    content = r.content;
    allChanges.push(...r.changes);
  } else if (SEO_TYPES.includes(issueType)) {
    const r = fixSingleSeoIssue(content, metaTitle, metaDesc, ctx, issueType);
    content   = r.content;
    metaTitle = r.metaTitle;
    metaDesc  = r.metaDescription;
    allChanges.push(...r.changes);
  } else if (READABILITY_TYPES.includes(issueType)) {
    const r = fixSingleReadabilityIssue(content, ctx, issueType);
    content = r.content;
    allChanges.push(...r.changes);
  }

  return {
    updatedContent:         content,
    updatedMetaTitle:       metaTitle,
    updatedMetaDescription: metaDesc,
    changes:                allChanges,
    issueIdsFixed:          [],
  };
}

/**
 * Apply a ContentFixResult to an ArticleDraft, returning an updated draft.
 * Does NOT mutate the original.
 */
export function applyFixResult(
  draft: ArticleDraft,
  result: ContentFixResult,
  fixedIssueIds: string[],
): ArticleDraft {
  const now = new Date().toISOString();

  // Rescore the updated content
  const updatedDraft: ArticleDraft = {
    ...draft,
    content:         result.updatedContent,
    metaTitle:       result.updatedMetaTitle,
    metaDescription: result.updatedMetaDescription,
    updatedAt:       now,
  };

  const newScore = scoreContent(updatedDraft);

  return {
    ...updatedDraft,
    scoreHistory: [
      ...draft.scoreHistory,
      {
        score:      newScore.overall,
        readiness:  newScore.readiness,
        issueCount: newScore.issues.length,
        scoredAt:   now,
      },
    ],
  };
}

/**
 * Quick fix-all-safe convenience wrapper.
 * Applies all safe auto-fixable issues and returns an updated draft.
 */
export function quickFixSafe(draft: ArticleDraft): {
  draft:  ArticleDraft;
  result: ContentFixResult;
} {
  const result       = autoFixDraft(draft, 'safe-only');
  const updatedDraft = applyFixResult(draft, result, result.issueIdsFixed);
  return { draft: updatedDraft, result };
}

/**
 * Fix all critical + high severity issues.
 */
export function quickFixCritical(draft: ArticleDraft): {
  draft:  ArticleDraft;
  result: ContentFixResult;
} {
  const result       = autoFixDraft(draft, 'critical-only');
  const updatedDraft = applyFixResult(draft, result, result.issueIdsFixed);
  return { draft: updatedDraft, result };
}
