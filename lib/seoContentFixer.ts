// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — SEO Content Fixer (V9)
// Fixes SEO-layer issues: keyphrase in intro, meta title, meta description,
// CTA section, conclusion section, FAQ section.
//
// SAFETY RULES:
//   • All generated text is marked [⚠️ NEEDS REVIEW: ...] when it contains
//     brand-specific content the tool cannot verify.
//   • Structural additions (conclusion, CTA, FAQ) use context values only.
//   • Keyphrase injection into intro only when intro text exists.
//   • Meta title / description use context values; no fake statistics.
// ─────────────────────────────────────────────────────────────────────────────

import type { ArticleContext, ContentChange, ContentIssueType } from '@/types/content';
import {
  getIntroText,
  detectCTA,
  detectConclusion,
  detectFAQ,
  keyphraseInText,
  stripHtml,
  extractHeadings,
} from '@/lib/contentScorer';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SeoFixOptions {
  fixKeyphraseInIntro?:    boolean;
  fixMetaTitle?:           boolean;
  fixMetaDescription?:     boolean;
  addCTA?:                 boolean;
  addConclusion?:          boolean;
  addFAQ?:                 boolean;
}

export interface SeoFixResult {
  content:            string;
  metaTitle:          string;
  metaDescription:    string;
  changes:            ContentChange[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

let _counter = 0;
function nextId(): string {
  return `seo-fix-${Date.now()}-${++_counter}`;
}

function change(
  issueType: ContentIssueType,
  description: string,
  before: string,
  after: string,
): ContentChange {
  return { id: nextId(), issueType, description, before, after };
}

/**
 * Capitalise the first letter of each word (title case, basic).
 */
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Truncate to maxLen with ellipsis.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1).trimEnd() + '…';
}

// ─── Meta Title ────────────────────────────────────────────────────────────────

export function fixMetaTitle(
  existing: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  const keyphrase = toTitleCase(ctx.focusKeyphrase);
  const brand     = ctx.brandName;
  const city      = ctx.city;
  const service   = ctx.serviceType;

  // Already contains the keyphrase → just ensure length is fine
  const lower = existing.toLowerCase();
  const hasKeyphrase = lower.includes(ctx.focusKeyphrase.toLowerCase());

  if (existing && hasKeyphrase && existing.length >= 30 && existing.length <= 60) {
    return existing; // already good
  }

  let generated: string;

  if (city && service) {
    generated = `${keyphrase} in ${city} | ${brand}`;
  } else if (city) {
    generated = `${keyphrase} in ${city} | ${brand}`;
  } else if (service) {
    generated = `${keyphrase} | ${service} | ${brand}`;
  } else {
    generated = `${keyphrase} | ${brand}`;
  }

  generated = truncate(generated, 60);

  const markedGenerated = `${generated} [⚠️ NEEDS REVIEW]`;

  changes.push(change(
    'meta-title-weak',
    existing
      ? 'Improved meta title to include focus keyphrase'
      : 'Generated meta title from article context',
    existing || '(empty)',
    markedGenerated,
  ));

  return markedGenerated;
}

// ─── Meta Description ──────────────────────────────────────────────────────────

export function fixMetaDescription(
  existing: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  const keyphrase = ctx.focusKeyphrase;
  const brand     = ctx.brandName;
  const city      = ctx.city;
  const service   = ctx.serviceType;

  const lower = existing.toLowerCase();
  const hasKeyphrase = lower.includes(keyphrase.toLowerCase());

  if (existing && hasKeyphrase && existing.length >= 120 && existing.length <= 160) {
    return existing; // already good
  }

  let generated: string;

  if (city && service) {
    generated = `Looking for ${keyphrase} in ${city}? ${brand} offers expert ${service} solutions. Contact us today for a free consultation.`;
  } else if (city) {
    generated = `${brand} provides professional ${keyphrase} services in ${city}. Get expert guidance — contact us today.`;
  } else {
    generated = `${brand} specialises in ${keyphrase}. Discover how our services can help your business grow. Get in touch today.`;
  }

  generated = truncate(generated, 160);
  const markedGenerated = `${generated} [⚠️ NEEDS REVIEW]`;

  changes.push(change(
    'meta-description-weak',
    existing
      ? 'Improved meta description to include focus keyphrase and call-to-action'
      : 'Generated meta description from article context',
    existing || '(empty)',
    markedGenerated,
  ));

  return markedGenerated;
}

// ─── Keyphrase in Intro ─────────────────────────────────────────────────────────

/**
 * Inject the keyphrase into the first paragraph if it doesn't already appear.
 * Strategy: append a short sentence referencing the keyphrase after the first
 * sentence of the first paragraph.
 */
export function fixKeyphraseInIntro(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  const introText = getIntroText(content, 80);
  if (!introText.trim()) return content;

  if (keyphraseInText(introText, ctx.focusKeyphrase)) return content; // already there

  const keyphrase = ctx.focusKeyphrase;
  const injection = ` This article covers everything you need to know about <strong>${keyphrase}</strong>. [⚠️ NEEDS REVIEW: Adjust this sentence to match article tone]`;

  // Insert after closing tag of first paragraph (</p>) or after first line break
  const firstP = /<\/p>/i.exec(content);
  if (firstP) {
    const before = content.slice(0, firstP.index);
    const after  = content.slice(firstP.index);
    const patched = before + injection + after;
    changes.push(change(
      'keyphrase-in-intro',
      'Added focus keyphrase reference to introduction',
      introText.slice(0, 100) + (introText.length > 100 ? '…' : ''),
      injection.trim(),
    ));
    return patched;
  }

  // Fallback: prepend a sentence before content
  const sentence = `<p>${injection.trim()}</p>\n`;
  changes.push(change(
    'keyphrase-in-intro',
    'Prepended focus keyphrase sentence before introduction',
    '(no paragraph found)',
    sentence.trim(),
  ));
  return sentence + content;
}

// ─── CTA Section ───────────────────────────────────────────────────────────────

export function addCtaSection(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  if (detectCTA(content)) return content; // already has one

  const keyphrase = ctx.focusKeyphrase;
  const brand     = ctx.brandName;
  const city      = ctx.city;

  const locationLine = city ? ` in ${city}` : '';

  const cta = `
<section class="cta-section">
  <h2>Ready to Get Started with ${keyphrase}?</h2>
  <p>
    Whether you're exploring ${keyphrase} options${locationLine} or ready to take the next step,
    ${brand} is here to help. [⚠️ NEEDS REVIEW: Customise this CTA with specific service offer,
    pricing, or contact details]
  </p>
  <p>
    <strong>Contact ${brand} today</strong> for a free consultation.
    [⚠️ NEEDS REVIEW: Add real phone number, email, or booking link here]
  </p>
</section>`.trim();

  changes.push(change(
    'no-cta',
    'Added call-to-action section at end of article',
    '(no CTA found)',
    cta.slice(0, 120) + '…',
  ));

  return content + '\n\n' + cta;
}

// ─── Conclusion ────────────────────────────────────────────────────────────────

export function addConclusionSection(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  if (detectConclusion(content)) return content;

  const keyphrase = ctx.focusKeyphrase;
  const brand     = ctx.brandName;

  const conclusion = `
<h2>Conclusion</h2>
<p>
  Understanding ${keyphrase} is essential for businesses looking to stay competitive.
  [⚠️ NEEDS REVIEW: Replace this with a genuine summary of your article's key points]
</p>
<p>
  ${brand} has the expertise to guide you through every step of the process.
  [⚠️ NEEDS REVIEW: Personalise this closing statement to match your brand voice and article topic]
</p>`.trim();

  changes.push(change(
    'no-conclusion',
    'Added conclusion section',
    '(no conclusion found)',
    'Added <h2>Conclusion</h2> + summary paragraph',
  ));

  return content + '\n\n' + conclusion;
}

// ─── FAQ Section ───────────────────────────────────────────────────────────────

export function addFaqSection(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  if (detectFAQ(content)) return content;

  const keyphrase = ctx.focusKeyphrase;
  const brand     = ctx.brandName;
  const city      = ctx.city;
  const locationLine = city ? ` in ${city}` : '';

  const faq = `
<h2>Frequently Asked Questions</h2>

<h3>What is ${keyphrase}?</h3>
<p>[⚠️ NEEDS REVIEW: Provide a clear, accurate definition of ${keyphrase} relevant to your audience]</p>

<h3>How does ${brand} help with ${keyphrase}?</h3>
<p>[⚠️ NEEDS REVIEW: Describe your specific service offering and what makes it different]</p>

<h3>How much does ${keyphrase} cost${locationLine}?</h3>
<p>[⚠️ NEEDS REVIEW: Add real pricing or a pricing range — never invent figures]</p>

<h3>How do I get started?</h3>
<p>[⚠️ NEEDS REVIEW: Describe your onboarding or contact process — add a real link or phone number]</p>`.trim();

  changes.push(change(
    'no-faq',
    'Added FAQ section with placeholder questions',
    '(no FAQ found)',
    'Added FAQ h2 + 4 question/answer pairs (all marked for review)',
  ));

  return content + '\n\n' + faq;
}

// ─── Keyphrase in H2 ───────────────────────────────────────────────────────────

/**
 * Add a new H2 containing the keyphrase if none of the existing H2s mention it.
 */
export function fixKeyphraseInH2(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  const headings = extractHeadings(content);
  const h2s = headings.filter(h => h.level === 2);

  const hasKeyphraseH2 = h2s.some(h =>
    h.text.toLowerCase().includes(ctx.focusKeyphrase.toLowerCase()),
  );

  if (hasKeyphraseH2) return content;

  const keyphrase  = toTitleCase(ctx.focusKeyphrase);
  const newH2text  = `Why ${keyphrase} Matters`;
  const newH2      = `\n<h2>${newH2text}</h2>\n<p>[⚠️ NEEDS REVIEW: Add a paragraph explaining the importance of ${ctx.focusKeyphrase} here]</p>`;

  // Insert before the first H2 if one exists, otherwise append
  const firstH2Match = /<h2[^>]*>/i.exec(content);
  if (firstH2Match) {
    const before = content.slice(0, firstH2Match.index);
    const after  = content.slice(firstH2Match.index);
    changes.push(change(
      'keyphrase-in-h2',
      `Added H2 containing focus keyphrase: "${newH2text}"`,
      '(no H2 with keyphrase)',
      `<h2>${newH2text}</h2>`,
    ));
    return before + newH2 + '\n' + after;
  }

  changes.push(change(
    'keyphrase-in-h2',
    `Appended H2 containing focus keyphrase: "${newH2text}"`,
    '(no H2 with keyphrase)',
    `<h2>${newH2text}</h2>`,
  ));

  return content + newH2;
}

// ─── Public orchestrator ───────────────────────────────────────────────────────

/**
 * Apply all requested SEO fixes to the content and meta fields.
 * Returns updated content, metaTitle, metaDescription, and list of changes made.
 */
export function fixSeoContent(
  content: string,
  metaTitle: string,
  metaDescription: string,
  ctx: ArticleContext,
  options: SeoFixOptions = {},
): SeoFixResult {
  const changes: ContentChange[] = [];
  let text = content;
  let title = metaTitle;
  let desc  = metaDescription;

  const opts: Required<SeoFixOptions> = {
    fixKeyphraseInIntro:  options.fixKeyphraseInIntro  ?? true,
    fixMetaTitle:         options.fixMetaTitle         ?? true,
    fixMetaDescription:   options.fixMetaDescription   ?? true,
    addCTA:               options.addCTA               ?? true,
    addConclusion:        options.addConclusion        ?? true,
    addFAQ:               options.addFAQ               ?? true,
  };

  if (opts.fixMetaTitle)        title = fixMetaTitle(title, ctx, changes);
  if (opts.fixMetaDescription)  desc  = fixMetaDescription(desc, ctx, changes);
  if (opts.fixKeyphraseInIntro) text  = fixKeyphraseInIntro(text, ctx, changes);
  if (opts.addConclusion)       text  = addConclusionSection(text, ctx, changes);
  if (opts.addFAQ)              text  = addFaqSection(text, ctx, changes);
  if (opts.addCTA)              text  = addCtaSection(text, ctx, changes);

  // Keyphrase in H2 is always attempted if other SEO fixes run
  text = fixKeyphraseInH2(text, ctx, changes);

  return { content: text, metaTitle: title, metaDescription: desc, changes };
}

/**
 * Apply a single SEO fix identified by issue type.
 */
export function fixSingleSeoIssue(
  content: string,
  metaTitle: string,
  metaDescription: string,
  ctx: ArticleContext,
  issueType: ContentIssueType,
): SeoFixResult {
  return fixSeoContent(content, metaTitle, metaDescription, ctx, {
    fixKeyphraseInIntro:  issueType === 'keyphrase-in-intro',
    fixMetaTitle:         issueType === 'meta-title-missing' || issueType === 'meta-title-weak',
    fixMetaDescription:   issueType === 'meta-description-missing' || issueType === 'meta-description-weak',
    addCTA:               issueType === 'no-cta',
    addConclusion:        issueType === 'no-conclusion',
    addFAQ:               issueType === 'no-faq',
  });
}
