// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Content Scorer (V1)
// Scores an article draft across SEO, Readability, and Completeness.
// Pure string/regex — no DOM, no API, works in any context.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ArticleDraft,
  ContentScoreResult,
  ContentScoreBreakdown,
  ContentReadiness,
  ContentIssue,
  ContentIssueType,
  ContentIssueSeverity,
  ContentSafetyLevel,
} from '@/types/content';

// ─── HTML/text helpers ────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function extractParagraphTexts(html: string): string[] {
  const raw = html.replace(/<\/p>/gi, '\n<SEP>\n');
  const stripped = stripHtml(raw);
  return stripped
    .split('<SEP>')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

export function extractHeadings(html: string): { level: number; text: string }[] {
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  const results: { level: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    results.push({ level: parseInt(m[1]), text: stripHtml(m[2]).trim() });
  }
  return results;
}

export function getIntroText(html: string, wordLimit = 200): string {
  const paras = extractParagraphTexts(html);
  const combined = paras.slice(0, 3).join(' ');
  return combined.split(/\s+/).slice(0, wordLimit).join(' ');
}

export function getLastSectionText(html: string, wordLimit = 150): string {
  const paras = extractParagraphTexts(html);
  return paras.slice(-2).join(' ').split(/\s+/).slice(0, wordLimit).join(' ');
}

// ─── Placeholder detection ────────────────────────────────────────────────────

const PLACEHOLDER_PATTERNS = [
  /\[[^\]]{2,80}\]/g,        // [anything like this]
  /\{\{[^}]{2,80}\}\}/g,     // {{anything like this}}
  /\bTODO:[^\n]{2,100}/gi,   // TODO: do this
  /\bINSERT:[^\n]{2,100}/gi, // INSERT: this content
  /lorem ipsum/gi,            // lorem ipsum
  /\[⚠️[^\]]*\]/g,           // already-marked needs-review (don't double count)
];

export function detectPlaceholders(content: string): string[] {
  const found = new Set<string>();
  for (const re of PLACEHOLDER_PATTERNS) {
    const cloned = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = cloned.exec(content)) !== null) {
      // Skip already-reviewed markers
      if (!m[0].includes('⚠️')) found.add(m[0]);
    }
  }
  return [...found];
}

// ─── Structural detectors ──────────────────────────────────────────────────────

const CONCLUSION_KEYWORDS = ['conclusion', 'summary', 'final thoughts', 'wrapping up', 'in summary', 'to summarise', 'to conclude', 'key takeaway'];
const CTA_KEYWORDS = ['contact us', 'get in touch', 'get started', 'enquire now', 'request a quote', 'learn more', 'schedule a call', 'book a consultation', 'reach out', 'speak to us', 'talk to us'];
const FAQ_KEYWORDS = ['frequently asked', 'common question', 'faq', 'q:', 'a:', 'q&a'];

export function detectConclusion(html: string): boolean {
  const lower = html.toLowerCase();
  return CONCLUSION_KEYWORDS.some(k => lower.includes(k));
}

export function detectCTA(html: string): boolean {
  const lower = html.toLowerCase();
  return CTA_KEYWORDS.some(k => lower.includes(k));
}

export function detectFAQ(html: string): boolean {
  const lower = html.toLowerCase();
  return FAQ_KEYWORDS.some(k => lower.includes(k));
}

export function countKeyphraseOccurrences(text: string, keyphrase: string): number {
  if (!keyphrase.trim()) return 0;
  const escaped = keyphrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return (text.match(re) ?? []).length;
}

export function keyphraseInText(text: string, keyphrase: string): boolean {
  return countKeyphraseOccurrences(text, keyphrase) > 0;
}

// ─── Issue builder ─────────────────────────────────────────────────────────────

let _idCounter = 0;
function makeIssue(
  type:         ContentIssueType,
  severity:     ContentIssueSeverity,
  title:        string,
  description:  string,
  whyItMatters: string,
  suggestedFix: string,
  safety:       ContentSafetyLevel,
  canAutoFix:   boolean,
  previewFix?:  string,
): ContentIssue {
  return {
    id:           `${type}-${++_idCounter}`,
    type,
    severity,
    title,
    description,
    whyItMatters,
    suggestedFix,
    previewFix,
    safetyLevel:  safety,
    canAutoFix,
    isIgnored:    false,
    isFixed:      false,
  };
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

export function scoreContent(draft: ArticleDraft): ContentScoreResult {
  _idCounter = 0; // reset for deterministic IDs

  const { content, focusKeyphrase, metaTitle, metaDescription } = draft;
  const plainText  = stripHtml(content);
  const wordCount  = countWords(plainText);
  const paras      = extractParagraphTexts(content);
  const headings   = extractHeadings(content);
  const h2s        = headings.filter(h => h.level === 2);
  const introText  = getIntroText(content);
  const placeholders = detectPlaceholders(content);

  const hasCTA        = detectCTA(content);
  const hasFAQ        = detectFAQ(content);
  const hasConclusion = detectConclusion(content);

  const issues: ContentIssue[] = [];

  // ── SEO scoring (max 40) ──────────────────────────────────────────────────
  let seoScore = 40;

  // 1. Keyphrase in intro (+10)
  const keyphraseInIntro = focusKeyphrase.trim()
    ? keyphraseInText(introText, focusKeyphrase)
    : true; // no keyphrase set → skip check
  if (focusKeyphrase.trim() && !keyphraseInIntro) {
    seoScore -= 10;
    issues.push(makeIssue(
      'keyphrase-in-intro', 'critical',
      `Focus keyphrase "${focusKeyphrase}" missing from intro`,
      `The first 200 words of the article don't include the focus keyphrase "${focusKeyphrase}".`,
      'Google places strong weight on the introduction. Including your keyphrase early signals to search engines what the article is about.',
      `Add the keyphrase "${focusKeyphrase}" naturally in the first 1–2 paragraphs.`,
      'safe', true,
      `Add to opening paragraph: "...${focusKeyphrase}..."`,
    ));
  }

  // 2. Keyphrase in title / H1 (+7)
  const titleText = draft.title.toLowerCase();
  const keyphraseInTitle = focusKeyphrase.trim()
    ? titleText.includes(focusKeyphrase.toLowerCase())
    : true;
  if (focusKeyphrase.trim() && !keyphraseInTitle) {
    seoScore -= 7;
    issues.push(makeIssue(
      'keyphrase-in-title', 'high',
      `Focus keyphrase missing from article title`,
      `The article title "${draft.title}" doesn't contain the focus keyphrase "${focusKeyphrase}".`,
      'The title/H1 is one of the strongest on-page SEO signals. The keyphrase should appear near the start of the title.',
      `Rewrite the title to naturally include "${focusKeyphrase}".`,
      'safe', true,
      `Suggested title: "${focusKeyphrase.charAt(0).toUpperCase() + focusKeyphrase.slice(1)}${draft.city ? ' in ' + draft.city : ''}: ${draft.title}"`,
    ));
  }

  // 3. Keyphrase in at least one H2 (+5)
  const keyphraseInH2 = focusKeyphrase.trim()
    ? h2s.some(h => keyphraseInText(h.text, focusKeyphrase))
    : true;
  if (focusKeyphrase.trim() && h2s.length > 0 && !keyphraseInH2) {
    seoScore -= 5;
    issues.push(makeIssue(
      'keyphrase-in-h2', 'medium',
      `Focus keyphrase missing from subheadings`,
      `None of the H2 subheadings contain the focus keyphrase "${focusKeyphrase}".`,
      'H2 headings signal content structure to search engines. Including the keyphrase in at least one H2 can improve relevance signals.',
      `Edit one of your H2s to naturally include "${focusKeyphrase}".`,
      'safe', true,
    ));
  }

  // 4. Meta title (+8)
  if (!metaTitle.trim()) {
    seoScore -= 8;
    const suggestedMeta = `${draft.title} | ${draft.brandName || 'Your Brand'}`;
    issues.push(makeIssue(
      'meta-title-missing', 'critical',
      'Meta title is missing',
      'No meta title has been set for this article.',
      'The meta title is what appears as the blue link in Google search results. Without it, Google will use the page title, which may not be optimised.',
      'Add a meta title of 50–65 characters that includes the focus keyphrase.',
      'safe', true,
      suggestedMeta.slice(0, 65),
    ));
  } else if (metaTitle.length < 30 || metaTitle.length > 65) {
    seoScore -= 4;
    issues.push(makeIssue(
      'meta-title-weak', 'medium',
      `Meta title length is ${metaTitle.length} chars (ideal: 50–65)`,
      `Current meta title: "${metaTitle}" (${metaTitle.length} characters).`,
      'Meta titles that are too short look sparse in search results. Titles over 65 characters get truncated by Google.',
      `Rewrite the meta title to be 50–65 characters. ${metaTitle.length > 65 ? 'Shorten by removing filler words.' : 'Add more descriptive content.'}`,
      'safe', true,
      metaTitle.length > 65
        ? metaTitle.slice(0, 62) + '…'
        : `${metaTitle} | ${draft.brandName || 'Your Brand'}`.slice(0, 65),
    ));
  }

  // 5. Meta description (+8)
  if (!metaDescription.trim()) {
    seoScore -= 8;
    const city = draft.city || 'Singapore';
    const kp   = focusKeyphrase || draft.serviceType || 'our services';
    const suggested = `Learn about ${kp} from ${draft.brandName || 'our team'} in ${city}. Get expert insights and actionable advice. Contact us for a free consultation.`.slice(0, 160);
    issues.push(makeIssue(
      'meta-description-missing', 'critical',
      'Meta description is missing',
      'No meta description has been set for this article.',
      'The meta description appears under the blue link in Google search results and directly affects click-through rate. Missing it lets Google auto-generate one that may not be compelling.',
      'Add a meta description of 120–160 characters that includes the focus keyphrase and a soft CTA.',
      'safe', true,
      suggested,
    ));
  } else if (metaDescription.length < 100 || metaDescription.length > 165) {
    seoScore -= 4;
    issues.push(makeIssue(
      'meta-description-weak', 'medium',
      `Meta description length is ${metaDescription.length} chars (ideal: 120–160)`,
      `Current: "${metaDescription}" (${metaDescription.length} chars).`,
      'Descriptions under 100 characters often get auto-expanded by Google. Descriptions over 165 chars get truncated mid-sentence.',
      metaDescription.length > 165
        ? 'Shorten the meta description by removing less important details.'
        : 'Expand the meta description to include more context and a CTA.',
      'safe', true,
      metaDescription.length > 165 ? metaDescription.slice(0, 157) + '…' : undefined,
    ));
  }

  // ── Readability scoring (max 30) ──────────────────────────────────────────
  let readScore = 30;

  // 6. Long paragraphs (deduct 3 per offending para, max -12)
  const longParas = paras.filter(p => countWords(p) > 150);
  if (longParas.length > 0) {
    const deduct = Math.min(12, longParas.length * 3);
    readScore -= deduct;
    issues.push(makeIssue(
      'long-paragraph', 'medium',
      `${longParas.length} paragraph${longParas.length > 1 ? 's are' : ' is'} too long (>150 words)`,
      `${longParas.length} paragraph${longParas.length > 1 ? 's exceed' : ' exceeds'} 150 words. The longest is ~${Math.max(...longParas.map(p => countWords(p)))} words.`,
      'Long paragraphs increase cognitive load and reduce readability scores on tools like Yoast. They also reduce engagement, especially on mobile.',
      'Break paragraphs longer than 150 words into 2–3 shorter paragraphs. Each paragraph should cover one clear idea.',
      'safe', true,
      `Split: "${longParas[0].slice(0, 80)}…"`,
    ));
  }

  // 7. Heading structure (H2s) — lose 10 if none, 5 if too sparse
  if (h2s.length === 0 && wordCount > 300) {
    readScore -= 10;
    issues.push(makeIssue(
      'heading-structure-weak', 'high',
      'No H2 subheadings found',
      'The article has no H2 subheadings. This makes it a wall of text for readers and search engines.',
      'H2 headings divide content into scannable sections and help search engines understand your content hierarchy. They also improve featured snippet eligibility.',
      'Add at least one H2 every 300–400 words. Use descriptive headings that include relevant keywords.',
      'safe', true,
      `Add H2s like: <h2>What is ${focusKeyphrase || draft.serviceType || 'This Topic'}?</h2>`,
    ));
  } else if (wordCount > 600 && h2s.length < Math.floor(wordCount / 400)) {
    readScore -= 5;
    issues.push(makeIssue(
      'heading-structure-weak', 'medium',
      `Heading density is low (${h2s.length} H2${h2s.length !== 1 ? 's' : ''} for ${wordCount} words)`,
      `This article has ${wordCount} words but only ${h2s.length} H2 subheading${h2s.length !== 1 ? 's' : ''}. Ideal: 1 H2 per 300–400 words.`,
      'Readers scan articles using headings. Low heading density makes long articles hard to navigate.',
      `Add ${Math.floor(wordCount / 400) - h2s.length} more H2 subheadings to improve scannability.`,
      'safe', true,
    ));
  }

  // ── Completeness scoring (max 30) ─────────────────────────────────────────
  let compScore = 30;

  // 8. Placeholders — deduct 3 per placeholder, max -15
  if (placeholders.length > 0) {
    const deduct = Math.min(15, placeholders.length * 3);
    compScore -= deduct;
    issues.push(makeIssue(
      'placeholder-detected', 'critical',
      `${placeholders.length} unresolved placeholder${placeholders.length > 1 ? 's' : ''} found`,
      `Found: ${placeholders.slice(0, 4).map(p => `"${p}"`).join(', ')}${placeholders.length > 4 ? ` + ${placeholders.length - 4} more` : ''}.`,
      'Placeholders like [Company Name] or {{year}} that aren\'t replaced will appear as raw text to readers and may confuse search engines.',
      'Replace all placeholders with real, verified content. Use the Placeholder Fixer to auto-fill known values.',
      'safe', true,
      `${placeholders.length} placeholder${placeholders.length > 1 ? 's' : ''} will be replaced or flagged for review.`,
    ));
  }

  // 9. Word count — deduct up to 10
  if (wordCount < 300) {
    compScore -= 10;
    issues.push(makeIssue(
      'word-count-low', 'high',
      `Article is too short (${wordCount} words)`,
      `This article has only ${wordCount} words. Most Google-ranking articles for competitive keywords are 600–1500 words.`,
      'Thin content (under 300 words) is less likely to rank and may be considered low-quality by search engines.',
      'Expand the article to at least 600 words by adding more detail, examples, FAQs, or a conclusion section.',
      'manual-only', false,
    ));
  } else if (wordCount < 600) {
    compScore -= 5;
    issues.push(makeIssue(
      'word-count-low', 'medium',
      `Article is short (${wordCount} words — aim for 600+)`,
      `This article has ${wordCount} words. Comprehensive articles typically rank better.`,
      'Longer, well-structured articles tend to cover a topic more thoroughly, which can improve organic rankings.',
      'Consider expanding to 600–1,000 words by adding context, examples, or a FAQ section.',
      'manual-only', false,
    ));
  }

  // 10. No conclusion (-5)
  if (!hasConclusion && wordCount > 300) {
    compScore -= 5;
    issues.push(makeIssue(
      'no-conclusion', 'medium',
      'Article has no conclusion section',
      'The article ends without a clear conclusion or summary.',
      'A conclusion wraps up key points, reinforces the value proposition, and naturally leads the reader to a CTA. It also improves time-on-page.',
      'Add a "Conclusion" or "Summary" section summarising the main points and a next step.',
      'safe', true,
      `<h2>Conclusion</h2>\n<p>In summary, ${focusKeyphrase || draft.serviceType || 'this topic'} is an important part of your strategy. ${draft.brandName ? `At ${draft.brandName}, ` : ''}we help businesses across ${draft.city || 'Singapore'} navigate this effectively. Contact us to learn how we can support your goals.</p>`,
    ));
  }

  // 11. No CTA (-5)
  if (!hasCTA && wordCount > 200) {
    compScore -= 5;
    issues.push(makeIssue(
      'no-cta', 'high',
      'No call-to-action found',
      'The article doesn\'t include a clear call-to-action (CTA).',
      'Without a CTA, readers who finish the article have no clear next step. This reduces lead generation and conversion opportunities.',
      'Add a CTA at the end: "Contact us", "Get a free consultation", or link to a relevant service page.',
      'safe', true,
      `<h2>Ready to Get Started?</h2>\n<p>${draft.brandName ? draft.brandName : 'Our team'} specialises in ${focusKeyphrase || draft.serviceType || 'helping businesses like yours'}${draft.city ? ' in ' + draft.city : ''}. <a href="/contact">Contact us today</a> for a free consultation — no obligation.</p>`,
    ));
  }

  // 12. No FAQ (-5)
  if (!hasFAQ && wordCount > 400) {
    compScore -= 5;
    issues.push(makeIssue(
      'no-faq', 'low',
      'No FAQ section found',
      'The article doesn\'t include a FAQ section.',
      'FAQ sections can earn "People Also Ask" rich results in Google. They also answer reader questions upfront, improving engagement.',
      'Add a FAQ section with 3–5 questions relevant to the article topic.',
      'safe', true,
      `<h2>Frequently Asked Questions</h2>\n<h3>What is ${focusKeyphrase || draft.serviceType || 'this service'}?</h3>\n<p>[Add your answer here]</p>\n<h3>How can ${draft.brandName || 'we'} help?</h3>\n<p>[Add your answer here]</p>\n<h3>How do I get started?</h3>\n<p>Contact us at ${draft.brandName || 'our team'} for a free consultation.</p>`,
    ));
  }

  // ── Clamp and assemble ────────────────────────────────────────────────────
  seoScore  = Math.max(0, Math.min(40, seoScore));
  readScore = Math.max(0, Math.min(30, readScore));
  compScore = Math.max(0, Math.min(30, compScore));
  const overall = seoScore + readScore + compScore;

  const breakdown: ContentScoreBreakdown = { seo: seoScore, readability: readScore, completeness: compScore };

  const readiness: ContentReadiness =
    overall >= 80 ? 'Ready to Export'     :
    overall >= 60 ? 'Needs Minor Fixes'   :
    overall >= 40 ? 'Needs Work'          : 'Not Ready';

  return {
    overall,
    breakdown,
    readiness,
    issues,
    stats: {
      wordCount,
      paragraphCount:   paras.length,
      h2Count:          h2s.length,
      placeholderCount: placeholders.length,
      keyphraseCount:   countKeyphraseOccurrences(plainText, focusKeyphrase),
      hasIntro:         wordCount > 50,
      hasConclusion,
      hasFAQ,
      hasCTA,
    },
  };
}
