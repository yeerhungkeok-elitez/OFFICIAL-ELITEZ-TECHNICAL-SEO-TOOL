// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Core Types  (V1 + V2)
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════
// V1 TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface PageData {
  url: string;
  finalUrl: string;
  statusCode: number;
  redirectChain: string[];
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Texts: string[];
  h2Count: number;
  canonical: string | null;
  canonicalMatchesSelf: boolean;
  robotsMeta: string | null;
  isNoindex: boolean;
  isNofollow: boolean;
  wordCount: number;
  internalLinksCount: number;
  externalLinksCount: number;
  imageCount: number;
  missingAltCount: number;
  imagesWithAlt: number;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  crawlError: string | null;
  crawlTime: number; // ms
  contentType: string | null;
  // ── V2 addition (optional for backward-compat with saved V1 results) ──
  schemaBlocks?: SchemaBlock[];
}

export interface RobotsData {
  url: string;
  accessible: boolean;
  statusCode: number | null;
  content: string | null;
  hasUserAgentStar: boolean;
  hasSitemapDirective: boolean;
  sitemapUrls: string[];
  blockedPaths: string[];
  error: string | null;
}

export interface SitemapData {
  url: string;
  accessible: boolean;
  statusCode: number | null;
  urlCount: number;
  urls: string[];
  isSitemapIndex: boolean;
  error: string | null;
}

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskLevel   = 'safe' | 'needs-review' | 'requires-approval';
export type IssueCategory =
  | 'crawlability'
  | 'indexability'
  | 'on-page'
  | 'structured-data'
  | 'internal-linking'
  | 'image-seo'
  | 'social-og'
  | 'performance';

export interface SEOIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  problem: string;
  technicalDetail: string;
  clientExplanation: string;
  whyItMatters: string;
  recommendedFix: string;
  developerInstruction: string;
  riskLevel: RiskLevel;
  affectedPages: string[];
  count: number;
  autoFixable: boolean;
}

export interface SEOScore {
  overall: number;
  crawlability: number;
  indexability: number;
  onPageTechnical: number;
  structuredData: number;
  performance: number;
  internalLinking: number;
  imageSEO: number;
  socialOpenGraph: number;
}

export interface ScanSummary {
  totalPages: number;
  indexablePages: number;
  noindexPages: number;
  errorPages: number;
  redirectPages: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  totalIssues: number;
  pagesWithMissingTitle: number;
  pagesWithMissingDescription: number;
  pagesWithMultipleH1: number;
  pagesWithMissingH1: number;
  pagesWithStructuredData: number;
  pagesWithOgTags: number;
}

export interface ScanResult {
  id: string;
  domain: string;
  startUrl: string;
  crawledAt: string;
  crawlDuration: number;
  pages: PageData[];
  robots: RobotsData;
  sitemap: SitemapData;
  issues: SEOIssue[];
  score: SEOScore;
  summary: ScanSummary;
  // ── V2 addition ──────────────────────────────────────────────────────
  schemaAudit?: SchemaAuditResult;
}

export interface CrawlProgressEvent {
  type: 'progress' | 'complete' | 'error';
  crawled: number;
  queued: number;
  currentUrl?: string;
  message?: string;
  result?: ScanResult;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// V2 TYPES — Schema Audit & Generator
// ═══════════════════════════════════════════════════════════════════════

/**
 * A single <script type="application/ld+json"> block extracted from a page.
 * `parsed` is populated server-side for checks only; set to null in stored results
 * to avoid hitting localStorage size limits. The UI re-parses from `raw` on demand.
 */
export interface SchemaBlock {
  /** Raw JSON string, capped at 10 000 characters */
  raw: string;
  /** Parsed object — populated transiently; null in stored ScanResult */
  parsed: Record<string, unknown> | null;
  isValid: boolean;
  /** JSON parse error message if isValid === false */
  parseError?: string;
  /** All @type values extracted from this block (incl. @graph children) */
  types: string[];
  /** True when the root object uses the @graph pattern */
  isGraph: boolean;
}

/** Inferred intent of a crawled page — used to determine expected schema types */
export type PageIntent =
  | 'homepage'
  | 'blog'
  | 'service'
  | 'faq'
  | 'contact'
  | 'product'
  | 'other';

/** How safe it is to auto-generate/apply a schema fix */
export type SchemaFixSafety = 'safe' | 'needs-review' | 'requires-approval';

/** A single schema-level issue found during the audit */
export interface SchemaIssue {
  id: string;
  /** Machine-readable issue key, e.g. "missing-organization" */
  type: string;
  severity: IssueSeverity;
  /** The schema @type this issue relates to */
  schemaType: string;
  problem: string;
  technicalDetail: string;
  clientExplanation: string;
  whyItMatters: string;
  recommendedFix: string;
  developerInstruction: string;
  fixSafety: SchemaFixSafety;
  affectedPages: string[];
  count: number;
  /** Ready-to-use generated schema object (null if not applicable) */
  suggestedSchema: Record<string, unknown> | null;
}

/** Sub-score breakdown for the Schema Health Score */
export interface SchemaScore {
  overall: number;
  /** Were all JSON-LD blocks parseable? */
  validJson: number;
  /** Does each page type have the right schema types? */
  correctTypes: number;
  /** Are recommended properties present? */
  requiredProperties: number;
  /** No duplicate/conflicting schema on same page */
  noDuplicates: number;
  /** Does visible page content match schema claims? */
  contentConsistency: number;
}

/** A schema type that should be added to one or more pages */
export interface RecommendedSchemaType {
  schemaType: string;
  reason: string;
  pages: string[];
  priority: IssueSeverity;
  /** Pre-filled template for this schema type */
  suggestedSchema: Record<string, unknown>;
}

/** Per-page schema summary for the audit table */
export interface PageSchemaInfo {
  url: string;
  hasSchema: boolean;
  allTypes: string[];
  invalidCount: number;
  duplicateTypes: string[];
  pageIntent: PageIntent;
  missingRecommended: string[];
  /** Lightweight block info (no `parsed` object) */
  blocks: Array<{
    raw: string;
    isValid: boolean;
    types: string[];
    parseError?: string;
    isGraph: boolean;
  }>;
}

/** Full schema audit result attached to ScanResult */
export interface SchemaAuditResult {
  pageSchemas: PageSchemaInfo[];
  issues: SchemaIssue[];
  score: SchemaScore;
  /** Map of @type → count of pages that have it */
  typeCounts: Record<string, number>;
  recommendedTypes: RecommendedSchemaType[];
  summary: {
    totalPagesWithSchema: number;
    totalPagesWithoutSchema: number;
    totalSchemaBlocks: number;
    invalidSchemaBlocks: number;
    uniqueSchemaTypes: number;
    missingCriticalTypes: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════
// V3 TYPES — Google Search Console Import + Indexing Decision Engine
// ═══════════════════════════════════════════════════════════════════════

/** Categories derived from GSC coverage reason strings */
export type GSCReasonCategory =
  | 'indexed'                // Good: submitted and indexed
  | 'noindex-excluded'       // Excluded by noindex tag
  | 'crawled-not-indexed'    // Crawled - currently not indexed
  | 'discovered-not-indexed' // Discovered - currently not indexed
  | 'duplicate-no-canonical' // Duplicate without user-selected canonical
  | 'canonical-alternate'    // Alternate page with proper canonical tag
  | 'robots-blocked'         // Blocked by robots.txt
  | 'not-found-404'          // Not found (404)
  | 'server-error-5xx'       // Server error (5xx)
  | 'forbidden-403'          // Blocked due to access forbidden (403)
  | 'unauthorized-401'       // Unauthorized request (401)
  | 'redirect'               // Page with redirect
  | 'soft-404'               // Soft 404
  | 'url-unknown'            // URL is unknown to Google
  | 'page-removal-blocked'   // Blocked by page removal tool
  | 'other';                 // Unrecognised status

/** Raw record parsed from a GSC coverage/indexing report export */
export interface GSCRecord {
  url: string;
  reason: string;                    // Raw reason string from GSC
  reasonCategory: GSCReasonCategory;
  validationStatus: string;
  lastCrawled: string;
  source: string;
  rawRow: Record<string, string>;    // All columns from the spreadsheet row
}

/** Crawl-data snapshot for a page matched from the crawler */
export interface MatchedPageData {
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  canonicalMatchesSelf: boolean;
  noindex: boolean;
  wordCount: number;
  internalLinksCount: number;
  schemaTypes: string[];
  technicalIssues: string[];          // Derived from page fields
  pageIntent: string;                 // PageIntent + extended: tag/category/archive etc.
  hasH1: boolean;
  titleLength: number;
  metaDescLength: number;
  missingAltCount: number;
}

export type IndexingDecisionType =
  | 'Index'
  | 'Improve Before Indexing'
  | 'Fix Accidental Noindex'
  | 'Keep Noindex'
  | 'Fix Canonical'
  | 'Redirect'
  | 'Remove From Sitemap'
  | 'Fix 403 Access'
  | 'Fix Server Error'
  | 'Needs Review'
  | 'Fix Robots Blocking'
  | 'Fix Redirect Error'
  | 'Add to Sitemap';

export type ApprovalLevel   = 'safe' | 'needs-review' | 'needs-developer';
export type DecisionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface IndexingDecision {
  decision: IndexingDecisionType;
  priority: DecisionPriority;
  explanation: string;
  likelyCauses: string[];
  recommendedActions: string[];
  developerInstructions: string;
  clientExplanation: string;
  approvalLevel: ApprovalLevel;
}

export interface MatchedGSCRecord {
  gsc: GSCRecord;
  crawledPage: MatchedPageData | null;
  crawlStatus: 'matched' | 'not-crawled';
  decision: IndexingDecision;
}

export interface GSCImportSummary {
  totalUrls: number;
  reasonBreakdown: Record<string, number>;
  decisionBreakdown: Partial<Record<IndexingDecisionType, number>>;
  priorityBreakdown: Record<DecisionPriority, number>;
  matchedCount: number;
  unmatchedCount: number;
  indexedCount: number;
  actionRequiredCount: number;
}

export interface GSCDecisionSummary {
  records: MatchedGSCRecord[];
  summary: GSCImportSummary;
  importedAt: string;
  fileName: string;
}

// ═══════════════════════════════════════════════════════════════════════
// V4 TYPES — AI Fix Writer + Action Generator
// ═══════════════════════════════════════════════════════════════════════

export type FixType =
  | 'SEO Title'
  | 'Meta Description'
  | 'H1'
  | 'Heading Structure'
  | 'FAQ Content'
  | 'FAQPage Schema'
  | 'Service Schema'
  | 'Article Schema'
  | 'Organization Schema'
  | 'Breadcrumb Schema'
  | 'Internal Links'
  | 'Image Alt Text'
  | 'Canonical'
  | 'Noindex'
  | 'Robots.txt'
  | 'Redirect'
  | 'Sitemap';

export type FixSource       = 'seo-crawl' | 'schema-audit' | 'gsc' | 'page-analysis';
export type FixApprovalLevel = 'safe' | 'needs-review' | 'needs-developer';
export type EstimatedImpact  = 'high' | 'medium' | 'low';
export type AIFixMode        = 'anthropic' | 'openai' | 'rule-based';

/** Snapshot of page data embedded in each fix-queue item so generators are self-contained */
export interface FixPageSnapshot {
  title:                   string | null;
  titleLength:             number;
  metaDescription:         string | null;
  metaDescriptionLength:   number;
  h1Texts:                 string[];
  h2Count:                 number;
  wordCount:               number;
  internalLinksCount:      number;
  schemaTypes:             string[];
  canonical:               string | null;
  canonicalMatchesSelf:    boolean;
  isNoindex:               boolean;
  missingAltCount:         number;
  imageCount:              number;
  statusCode:              number;
}

export interface FixQueueItem {
  id:               string;
  url:              string;
  pageIntent:       string;
  issueType:        string;
  priority:         IssueSeverity;
  fixType:          FixType;
  source:           FixSource;
  currentValue:     string;
  suggestedAction:  string;
  approvalLevel:    FixApprovalLevel;
  estimatedImpact:  EstimatedImpact;
  affectedIssueIds: string[];
  page:             FixPageSnapshot;
}

export interface FixSuggestion {
  fixType:              FixType;
  suggestedValue:       string;
  rationale:            string;
  beforeCode:           string;
  afterCode:            string;
  wordpressInstruction: string;
  developerInstruction: string;
  claudePrompt:         string;
  approvalLevel:        FixApprovalLevel;
  riskWarning?:         string;
  confidence:           'high' | 'medium' | 'low';
  source:               AIFixMode;
  generatedAt:          string;
}

export interface GeneratedFix {
  queueItem:  FixQueueItem;
  suggestion: FixSuggestion;
}

// ═══════════════════════════════════════════════════════════════════════
// V5 TYPES — Client PDF Report + White-Label Export
// ═══════════════════════════════════════════════════════════════════════

export type ReportMode =
  | 'client-summary'
  | 'developer-fix-plan'
  | 'full-technical-audit';

export type ReportBrandPreset = 'elitez' | 'xince-ai' | 'white-label';

export interface ReportBrand {
  preset:       ReportBrandPreset;
  brandName:    string;
  logoUrl:      string;
  primaryColor: string;
  preparedBy:   string;
  clientName:   string;
  websiteUrl:   string;
  reportDate:   string;
}

export interface ExecutiveSummary {
  overallHealth:   string;
  topRisks:        string[];
  businessImpact:  string;
  recommendedNext: string;
  confidenceNote:  string;
  overallScore:    number;
  schemaScore:     number | null;
  criticalIssues:  number;
  highIssues:      number;
  mediumIssues:    number;
  lowIssues:       number;
  totalFixes:      number;
}

export interface RoadmapTask {
  task:     string;
  priority: IssueSeverity;
  owner:    string;
  url?:     string;
  fixType?: FixType;
}

export interface RoadmapWeek {
  week:            number;
  title:           string;
  goal:            string;
  tasks:           RoadmapTask[];
  expectedOutcome: string;
}

export interface DeveloperTask {
  priority:             IssueSeverity;
  url:                  string;
  issue:                string;
  recommendedFix:       string;
  owner:                string;
  approvalLevel:        FixApprovalLevel;
  developerInstruction: string;
  status:               'pending';
}

export interface ReportSettings {
  mode:  ReportMode;
  brand: ReportBrand;
}

export interface ReportExportData {
  settings:         ReportSettings;
  executiveSummary: ExecutiveSummary;
  roadmap:          RoadmapWeek[];
  developerTasks:   DeveloperTask[];
  result:           ScanResult;
  schemaAudit?:     SchemaAuditResult | null;
  gscData?:         GSCDecisionSummary | null;
  fixQueue:         FixQueueItem[];
  // ── V6 addition ──────────────────────────────────────────────────────
  comparison?:      SnapshotComparisonResult | null;
  // ── V7 addition ──────────────────────────────────────────────────────
  wordpressGuide?:  WordPressFixGuide | null;
}

// ═══════════════════════════════════════════════════════════════════════
// V6 TYPES — Historical Tracking + Before/After Comparison
// ═══════════════════════════════════════════════════════════════════════

/** Lightweight metrics summary stored on each snapshot for fast index listing */
export interface SnapshotSummary {
  overallScore:   number;
  schemaScore:    number | null;
  totalPages:     number;
  criticalIssues: number;
  highIssues:     number;
  mediumIssues:   number;
  lowIssues:      number;
  totalIssues:    number;
  fixQueueCount:  number;
  indexablePages: number;
  errorPages:     number;
}

/** A saved point-in-time audit snapshot stored in localStorage */
export interface AuditSnapshot {
  id:         string;
  domain:     string;
  /** User-editable label, e.g. "Post-migration audit" */
  name:       string;
  savedAt:    string;   // ISO — when user clicked Save
  crawledAt:  string;   // ISO — from ScanResult
  result:     ScanResult;
  schemaAudit: SchemaAuditResult | null;
  gscData:    GSCDecisionSummary | null;
  fixQueue:   FixQueueItem[];
  summary:    SnapshotSummary;
}

/**
 * A unique fingerprint for a single issue across audits.
 * Used to compute resolved / new / persistent issue sets.
 */
export interface IssueFingerprint {
  /** Composite key, e.g. "seo||on-page||critical||missing-title" */
  key:          string;
  label:        string;
  severity:     IssueSeverity;
  category:     string;
  source:       'seo' | 'schema' | 'fix';
  affectedPages: string[];
  count:        number;
}

/** Before-vs-after comparison for a single metric */
export interface MetricComparison {
  label:        string;
  before:       number;
  after:        number;
  delta:        number;
  deltaPercent: number;
  direction:    'improved' | 'regressed' | 'unchanged';
  unit?:        string;
}

/** Full result of comparing two AuditSnapshots */
export interface SnapshotComparisonResult {
  beforeSnapshot:  AuditSnapshot;
  afterSnapshot:   AuditSnapshot;
  metrics:         MetricComparison[];
  resolvedIssues:  IssueFingerprint[];
  newIssues:       IssueFingerprint[];
  persistentIssues: IssueFingerprint[];
  resolvedCount:   number;
  newCount:        number;
  persistentCount: number;
  scoreImprovement: number;
  comparedAt:      string;
}

/** Narrative progress summary generated from a comparison result */
export interface ProgressSummary {
  headline:          string;
  scoreChange:       string;
  resolvedNote:      string;
  newIssuesNote:     string;
  persistentNote:    string;
  overallAssessment: string;
  disclaimer:        string;
  recommendations:   string[];
}

// ═══════════════════════════════════════════════════════════════════════
// V7 TYPES — WordPress Helper Mode
// ═══════════════════════════════════════════════════════════════════════

export type CMSName =
  | 'WordPress'
  | 'WooCommerce'
  | 'Shopify'
  | 'Wix'
  | 'Webflow'
  | 'Custom/Unknown';

export interface DetectedPlugin {
  name:       string;
  slug:       string;
  confidence: 'high' | 'medium' | 'low';
  evidence:   string;
  category:   'seo' | 'pagebuilder' | 'ecommerce' | 'cache' | 'schema' | 'forms' | 'other';
}

export interface DetectedTheme {
  name:       string;
  confidence: 'high' | 'medium' | 'low';
  evidence:   string;
}

export interface CMSDetectionResult {
  cmsName:         CMSName;
  confidence:      'high' | 'medium' | 'low';
  evidence:        string[];
  detectedTheme:   DetectedTheme | null;
  detectedPlugins: DetectedPlugin[];
  isWordPress:     boolean;
  hasWooCommerce:  boolean;
}

export type WordPressArea =
  | 'WordPress Admin → Posts'
  | 'WordPress Admin → Pages'
  | 'WordPress Admin → Products'
  | 'WordPress Admin → Settings → Reading'
  | 'WordPress Admin → Settings → Permalinks'
  | 'WordPress Admin → Settings → Media'
  | 'WordPress Admin → Appearance → Menus'
  | 'WordPress Admin → Plugins'
  | 'WordPress Admin → Tools → Redirection'
  | 'Yoast SEO → Search Appearance'
  | 'Yoast SEO → Social'
  | 'Yoast SEO → Tools → Bulk Editor'
  | 'Yoast SEO → Page Analysis'
  | 'Rank Math → Titles & Meta'
  | 'Rank Math → Sitemap'
  | 'Rank Math → Schema'
  | 'Rank Math → Redirections'
  | 'All in One SEO → Search Appearance'
  | 'WooCommerce → Settings'
  | 'WooCommerce → Products'
  | 'Elementor → Page Settings'
  | 'Flatsome → UX Builder'
  | 'Cache Plugin → Settings'
  | 'Functions.php / Child Theme'
  | 'Server / .htaccess / nginx.conf'
  | 'WordPress Core Editor';

export interface WordPressFixStep {
  stepNumber:  number;
  instruction: string;
  notes?:      string;
  isWarning?:  boolean;
}

export interface PluginInstruction {
  pluginName:        string;
  pluginSlug:        string;
  steps:             WordPressFixStep[];
  prerequisite?:     string;
  verificationSteps: string[];
}

export interface WordPressChecklistItem {
  id:                 string;
  url:                string;
  issueType:          string;
  priority:           IssueSeverity;
  wordpressArea:      WordPressArea;
  likelyPlugin:       string;
  fixSteps:           WordPressFixStep[];
  pluginInstructions: PluginInstruction[];
  verificationSteps:  string[];
  riskLevel:          'safe' | 'needs-review' | 'requires-approval';
  approvalLevel:      'safe' | 'needs-review' | 'needs-developer';
  notes:              string;
  source:             'seo' | 'schema' | 'gsc' | 'fix-queue';
  originalIssue?:     string;
  warnings:           string[];
}

export interface WordPressFixGuide {
  domain:         string;
  detectedCMS:    CMSDetectionResult;
  checklistItems: WordPressChecklistItem[];
  summary: {
    totalItems:            number;
    safeItems:             number;
    needsReviewItems:      number;
    requiresApprovalItems: number;
    byPlugin:              Record<string, number>;
    byArea:                Partial<Record<WordPressArea, number>>;
  };
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// V8 TYPES — Public Lead Magnet Version
// ═══════════════════════════════════════════════════════════════════════

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Closed'
  | 'Not Suitable';

export type LeadTemperature = 'Cold' | 'Warm' | 'Hot';

export interface PublicAuditTopIssue {
  problem:  string;
  severity: IssueSeverity;
  count:    number;
}

export interface PublicAuditResult {
  websiteUrl:           string;
  domain:               string;
  scannedAt:            string;
  score:                number;
  schemaScore:          number | null;
  wordpressDetected:    boolean;
  schemaDetected:       boolean;
  pagesScanned:         number;
  topIssues:            PublicAuditTopIssue[];
  teaserSummary:        string;
  lockedSections:       string[];
  recommendedNextSteps: string[];
  // Available after unlock (lead form submitted)
  rawResult?:           ScanResult;
}

export interface PublicAuditLead {
  id:                string;
  createdAt:         string;
  name:              string;
  company:           string;
  email:             string;
  phone:             string;
  website:           string;
  serviceInterest:   string;
  message:           string;
  consent:           boolean;
  auditScore:        number;
  schemaScore:       number | null;
  wordpressDetected: boolean;
  topIssues:         string[];
  status:            LeadStatus;
  leadScore:         number;
  leadTemperature:   LeadTemperature;
  // ── V8.1 addition ──────────────────────────────────────────────────
  /** Human-readable reasons for the lead score, e.g. "Low SEO score (+30 pts)" */
  scoreReasons?:     string[];
}

export interface LeadScoreResult {
  leadScore:       number;
  leadTemperature: LeadTemperature;
  reasons:         string[];
}

export interface PublicReportData {
  lead:        PublicAuditLead;
  auditResult: PublicAuditResult;
  generatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// V8.1 TYPES — Production Readiness + Real Lead Capture
// ═══════════════════════════════════════════════════════════════════════

/** Which storage backend is currently active */
export type LeadStorageMode = 'localStorage' | 'supabase';

/** Result of running spam-protection checks on a lead capture submission */
export interface SpamCheckResult {
  isSpam:  boolean;
  /** Machine-readable reasons, e.g. "honeypot-filled", "too-fast" */
  reasons: string[];
  /** User-friendly message to show when spam is detected */
  message: string;
}

/** Result of attempting to send a new-lead notification */
export interface LeadNotificationResult {
  sent:      boolean;
  /** e.g. "console", "resend", "sendgrid", "zapier" */
  provider:  string;
  error?:    string;
}
