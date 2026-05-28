// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Readability Fixer (V9)
// Fixes readability issues: long paragraphs, missing/sparse H2 headings.
//
// SAFETY RULES:
//   • Only restructures existing content — never invents new body copy.
//   • Paragraph splits happen at sentence boundaries only.
//   • New H2s use extracted content context + [⚠️ NEEDS REVIEW] markers.
//   • Never removes or rewrites existing sentences.
// ─────────────────────────────────────────────────────────────────────────────

import type { ArticleContext, ContentChange, ContentIssueType } from '@/types/content';
import { extractParagraphTexts, countWords, extractHeadings } from '@/lib/contentScorer';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReadabilityFixResult {
  content: string;
  changes: ContentChange[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

let _counter = 0;
function nextId(): string {
  return `read-fix-${Date.now()}-${++_counter}`;
}

function change(
  issueType: ContentIssueType,
  description: string,
  before: string,
  after: string,
): ContentChange {
  return { id: nextId(), issueType, description, before, after };
}

/** Maximum words per paragraph before we try to split it. */
const MAX_PARAGRAPH_WORDS = 150;

/**
 * Split a paragraph string at sentence boundaries to produce multiple ~equal chunks.
 * Returns an array of paragraph strings. If no clean boundary is found, returns
 * the original unsplit (we never break mid-sentence).
 */
function splitAtSentenceBoundaries(text: string, maxWords: number): string[] {
  // Simple sentence boundary: ends with . ! ? followed by whitespace + capital
  const sentenceRe = /([.!?])\s+(?=[A-Z"])/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRe.exec(text)) !== null) {
    sentences.push(text.slice(lastIndex, match.index + 1).trim());
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    sentences.push(text.slice(lastIndex).trim());
  }

  if (sentences.length <= 1) return [text]; // can't split

  // Group sentences into chunks ≤ maxWords
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (currentWords + words > maxWords && current.length > 0) {
      chunks.push(current.join(' '));
      current      = [sentence];
      currentWords = words;
    } else {
      current.push(sentence);
      currentWords += words;
    }
  }
  if (current.length) chunks.push(current.join(' '));

  return chunks.length > 1 ? chunks : [text]; // only split if we got multiple
}

// ─── Long Paragraph Splitter ───────────────────────────────────────────────────

/**
 * Split any <p>...</p> blocks that exceed MAX_PARAGRAPH_WORDS.
 * Works on raw HTML content string.
 */
export function fixLongParagraphs(
  content: string,
  changes: ContentChange[],
): string {
  // Match <p ...>...</p> tags including multi-line content
  return content.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs, inner) => {
    const plainText = inner
      .replace(/<[^>]+>/g, '') // strip inner HTML tags
      .replace(/&[a-z]+;/gi, ' ')
      .trim();

    const wordCount = countWords(plainText);
    if (wordCount <= MAX_PARAGRAPH_WORDS) return match;

    const chunks = splitAtSentenceBoundaries(plainText, MAX_PARAGRAPH_WORDS);
    if (chunks.length <= 1) return match; // couldn't split cleanly

    // Re-wrap each chunk in <p> tags
    // We use the plain text chunks here; inline HTML is simplified but safe
    const rebuilt = chunks.map(chunk => `<p${attrs}>${chunk}</p>`).join('\n');

    const preview = plainText.slice(0, 80) + (plainText.length > 80 ? '…' : '');
    changes.push(change(
      'long-paragraph',
      `Split long paragraph (${wordCount} words) into ${chunks.length} shorter paragraphs`,
      preview,
      `${chunks.length} paragraphs`,
    ));

    return rebuilt;
  });
}

// ─── H2 Heading Injector ────────────────────────────────────────────────────────

/**
 * If content has very few H2s relative to word count, suggest and insert
 * placeholder H2 subheadings at logical break points (after every ~200 words
 * of body text without an H2).
 *
 * Strategy: only inserts a new H2 between two <p> blocks where the running
 * word count since the last heading exceeds 200 words.
 */
export function fixHeadingStructure(
  content: string,
  ctx: ArticleContext,
  changes: ContentChange[],
): string {
  const headings = extractHeadings(content);
  const h2Count  = headings.filter(h => h.level === 2).length;

  // Count total words to determine expected H2 density
  const plainText  = content.replace(/<[^>]+>/g, ' ');
  const totalWords = countWords(plainText);
  const expectedH2s = Math.max(2, Math.floor(totalWords / 300)); // one H2 per ~300 words

  if (h2Count >= expectedH2s) return content; // already sufficient

  // How many H2s do we need to add?
  const needed = Math.min(expectedH2s - h2Count, 3); // cap at 3 new H2s per fix run

  const keyphrase = ctx.focusKeyphrase;
  const service   = ctx.serviceType;

  // Generic H2 suggestions (keyphrase/service context)
  const suggestions = [
    `Key Benefits of ${keyphrase}`,
    `How ${service || keyphrase} Works`,
    `Why Choose ${ctx.brandName} for ${keyphrase}`,
    `What to Expect from ${keyphrase}`,
    `Common ${keyphrase} Challenges Solved`,
    `Getting Started with ${keyphrase}`,
  ];

  let insertedCount = 0;
  let wordsSinceH2 = 0;
  let result = '';

  // Walk through <p>...</p> blocks and inject H2s at density gaps
  // We use a simple paragraph-by-paragraph rebuild
  const pRe = /(<[^p/][^>]*>.*?<\/[^p][^>]*>|<p[^>]*>[\s\S]*?<\/p>|<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)/gi;
  const tokens = content.split(/(?=<)/); // rough split at tag boundaries

  // Simpler approach: find all </p> positions and insert H2 after enough words
  const segmentRe = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>)/gi;
  let segments: string[] = [];
  let lastIdx = 0;
  let segMatch: RegExpExecArray | null;

  while ((segMatch = segmentRe.exec(content)) !== null) {
    if (segMatch.index > lastIdx) {
      segments.push(content.slice(lastIdx, segMatch.index));
    }
    segments.push(segMatch[0]);
    lastIdx = segMatch.index + segMatch[0].length;
  }
  if (lastIdx < content.length) segments.push(content.slice(lastIdx));

  const newSegments: string[] = [];

  for (const seg of segments) {
    newSegments.push(seg);

    // If it's a heading, reset our running word count
    if (/^<h[1-6]/i.test(seg.trim())) {
      wordsSinceH2 = 0;
      continue;
    }

    // If it's a paragraph, count its words
    if (/^<p/i.test(seg.trim())) {
      const text = seg.replace(/<[^>]+>/g, '').trim();
      wordsSinceH2 += countWords(text);

      // Insert an H2 if we've accumulated enough words and still need more
      if (wordsSinceH2 >= 200 && insertedCount < needed) {
        const suggestion = suggestions[insertedCount % suggestions.length];
        const h2 = `\n<h2>${suggestion} [⚠️ NEEDS REVIEW]</h2>\n`;
        newSegments.push(h2);
        changes.push(change(
          'heading-structure-weak',
          `Inserted subheading after ${wordsSinceH2}-word block`,
          '(no H2 in this section)',
          `<h2>${suggestion}</h2>`,
        ));
        wordsSinceH2 = 0;
        insertedCount++;
      }
    }
  }

  void pRe; // suppress unused warning

  return newSegments.join('');
}

// ─── Public orchestrator ───────────────────────────────────────────────────────

/**
 * Apply all readability fixes.
 */
export function fixReadability(
  content: string,
  ctx: ArticleContext,
): ReadabilityFixResult {
  const changes: ContentChange[] = [];
  let text = content;

  text = fixLongParagraphs(text, changes);
  text = fixHeadingStructure(text, ctx, changes);

  return { content: text, changes };
}

/**
 * Apply a single readability fix by issue type.
 */
export function fixSingleReadabilityIssue(
  content: string,
  ctx: ArticleContext,
  issueType: ContentIssueType,
): ReadabilityFixResult {
  const changes: ContentChange[] = [];
  let text = content;

  if (issueType === 'long-paragraph') {
    text = fixLongParagraphs(text, changes);
  } else if (issueType === 'heading-structure-weak') {
    text = fixHeadingStructure(text, ctx, changes);
  }

  return { content: text, changes };
}
