// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Types (V1)
// Separate from types/seo.ts (which covers technical website audits).
// These types cover article/blog content scoring and auto-fixing.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Article draft ─────────────────────────────────────────────────────────────

export interface ArticleDraft {
  id:               string;
  title:            string;
  focusKeyphrase:   string;
  content:          string;          // Article body: HTML, Markdown, or plain text
  metaTitle:        string;
  metaDescription:  string;
  brandName:        string;          // e.g. "Elitez Group"
  city:             string;          // e.g. "Singapore"
  serviceType:      string;          // e.g. "HR Consulting"
  category:         'blog' | 'service' | 'landing' | 'faq' | 'other';
  createdAt:        string;
  updatedAt:        string;
  scoreHistory:     ContentScoreSnapshot[];
}

export interface ContentScoreSnapshot {
  score:      number;
  readiness:  ContentReadiness;
  issueCount: number;
  scoredAt:   string;
}

// ─── Scoring ───────────────────────────────────────────────────────────────────

export type ContentReadiness =
  | 'Ready to Export'
  | 'Needs Minor Fixes'
  | 'Needs Work'
  | 'Not Ready';

export type ContentIssueType =
  | 'placeholder-detected'
  | 'keyphrase-in-intro'
  | 'keyphrase-in-title'
  | 'keyphrase-in-h2'
  | 'meta-title-missing'
  | 'meta-title-weak'
  | 'meta-description-missing'
  | 'meta-description-weak'
  | 'long-paragraph'
  | 'heading-structure-weak'
  | 'no-conclusion'
  | 'no-cta'
  | 'no-faq'
  | 'word-count-low'
  | 'repeated-phrases';

export type ContentIssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ContentSafetyLevel   = 'safe' | 'needs-review' | 'manual-only';

export interface ContentIssue {
  id:           string;
  type:         ContentIssueType;
  severity:     ContentIssueSeverity;
  title:        string;
  description:  string;
  whyItMatters: string;
  suggestedFix: string;
  /** The text that would actually be inserted / changed */
  previewFix?:  string;
  safetyLevel:  ContentSafetyLevel;
  canAutoFix:   boolean;
  isIgnored:    boolean;
  isFixed:      boolean;
}

export interface ContentScoreBreakdown {
  seo:          number;   // max 40
  readability:  number;   // max 30
  completeness: number;   // max 30
}

export interface ContentScoreResult {
  overall:    number;
  breakdown:  ContentScoreBreakdown;
  readiness:  ContentReadiness;
  issues:     ContentIssue[];
  stats: {
    wordCount:        number;
    paragraphCount:   number;
    h2Count:          number;
    placeholderCount: number;
    keyphraseCount:   number;
    hasIntro:         boolean;
    hasConclusion:    boolean;
    hasFAQ:           boolean;
    hasCTA:           boolean;
  };
}

// ─── Fixing ────────────────────────────────────────────────────────────────────

export interface ContentChange {
  id:          string;
  issueType:   ContentIssueType;
  description: string;
  before:      string;
  after:       string;
}

export interface ContentFixResult {
  updatedContent:        string;
  updatedMetaTitle:      string;
  updatedMetaDescription: string;
  changes:               ContentChange[];
  issueIdsFixed:         string[];
}

// Context object passed to all fixers
export interface ArticleContext {
  title:          string;
  focusKeyphrase: string;
  brandName:      string;
  city:           string;
  serviceType:    string;
  category:       ArticleDraft['category'];
}
