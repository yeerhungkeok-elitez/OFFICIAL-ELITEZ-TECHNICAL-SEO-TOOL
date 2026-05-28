// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — AI Prompt Builder (V4)
// Builds copy-paste Claude prompts and API call payloads.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem, FixType } from '@/types/seo';

export interface PromptPayload {
  systemPrompt: string;
  userPrompt:   string;
  copyPrompt:   string; // single combined prompt for copy-paste into claude.ai
}

// ─── Brand context ────────────────────────────────────────────────────────────

const BRAND_CTX = `You are an SEO specialist for Elitez Group (https://www.elitez.asia/), a Singapore-based HR consulting and recruitment agency. Their services include: Permanent Recruitment, Temporary & Contract Staffing, Payroll Outsourcing, Employer of Record (EOR), HR Consulting, and Career Guidance.

Important safety rules:
- Do not invent phone numbers, addresses, social media links, or credentials
- Do not make up ratings, reviews, awards, or client names
- Use [PLACEHOLDER] for missing business details
- Keep content factual, professional, and compliant with Singapore regulations`;

// ─── Per-fix-type prompt templates ───────────────────────────────────────────

function buildTitlePrompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You generate optimised SEO page titles. Rules:
- Length: 50–65 characters including brand suffix
- Format: [Page Topic] | [Brand]  OR  [Page Topic] [Location] | [Brand]
- Include primary keyword near the front
- Do not use clickbait or misleading phrasing
- Output ONLY the title text. No explanation, no quotes.`;

  const user = `Generate an SEO title for this page:
URL: ${item.url}
Current title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}
Word count: ${item.page.wordCount}

Generate one improved title (50-65 chars). Output only the title text.`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildMetaPrompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You generate optimised SEO meta descriptions. Rules:
- Length: 120–160 characters
- Include primary keyword naturally
- Include a soft call-to-action (e.g. "Contact us", "Learn more", "Get in touch")
- Do not start with the page title
- Output ONLY the meta description text. No explanation, no quotes.`;

  const user = `Generate a meta description for this page:
URL: ${item.url}
Current meta: ${item.page.metaDescription ?? 'None'}
Current title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}

Generate one improved meta description (120-160 chars). Output only the description text.`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildH1Prompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You generate H1 headings for web pages. Rules:
- Length: 20–80 characters
- Should describe the page's main topic clearly
- For service pages: include location (Singapore) if appropriate
- More descriptive and less SEO-stuffed than the title tag
- Output ONLY the H1 text. No explanation, no quotes.`;

  const user = `Generate an H1 heading for this page:
URL: ${item.url}
Current H1: ${item.page.h1Texts[0] ?? 'None'}
Page title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}

Generate one H1 heading. Output only the heading text.`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildFAQPrompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You generate FAQ content for web pages. Rules:
- Generate 5 questions and answers relevant to the page topic
- Answers should be 50-150 words each
- Questions should address real user concerns
- Do not invent specific numbers, prices, or guarantees without qualification
- Output in JSON format: [{"question": "...", "answer": "..."}, ...]
- IMPORTANT: These FAQs must be added as VISIBLE page content, not just schema`;

  const user = `Generate 5 FAQs for this page:
URL: ${item.url}
Page intent: ${item.pageIntent}
Page title: ${item.page.title ?? 'None'}
Word count: ${item.page.wordCount}

Output as JSON array: [{"question": "...", "answer": "..."}, ...]`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildSchemaPrompt(item: FixQueueItem, schemaType: string): PromptPayload {
  const sys = `${BRAND_CTX}

You generate JSON-LD structured data for web pages. Rules:
- Use Schema.org vocabulary
- Include only properties that have verified, real values
- Use [PLACEHOLDER] for values that need to be verified before publishing
- Output only valid JSON-LD wrapped in: <script type="application/ld+json">...</script>
- Do not invent phone numbers, addresses, logos, ratings, or reviews`;

  const user = `Generate a ${schemaType} schema for this page:
URL: ${item.url}
Page title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}

Generate complete, valid JSON-LD. Use [PLACEHOLDER] for unverified values.`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildInternalLinkPrompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You suggest internal linking strategies for web pages. Rules:
- Suggest anchor text using natural language keywords
- Identify the most relevant pages to link from/to
- Prioritise pages with high traffic and relevance
- Output concrete, actionable suggestions`;

  const user = `Suggest internal linking improvements for this page:
URL: ${item.url}
Page title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}
Current internal links: ${item.page.internalLinksCount}

Suggest:
1. Which types of pages should link TO this page
2. Which types of pages this page should link TO
3. Suggested anchor text for each link type`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

function buildImageAltPrompt(item: FixQueueItem): PromptPayload {
  const sys = `${BRAND_CTX}

You write alt text for web page images. Rules:
- Describe the image content accurately
- Include relevant keywords naturally (do not keyword-stuff)
- Keep to 80-125 characters
- Do not start with "image of" or "picture of"
- For decorative images: alt=""`;

  const user = `Suggest alt text guidelines for images on this page:
URL: ${item.url}
Page title: ${item.page.title ?? 'None'}
Page intent: ${item.pageIntent}
Images missing alt text: ${item.page.missingAltCount} of ${item.page.imageCount}

Provide:
1. General alt text formula for images on this type of page
2. 3 example alt texts for common image types on this page
3. When to use empty alt="" for decorative images`;

  return {
    systemPrompt: sys,
    userPrompt:   user,
    copyPrompt:   `${sys}\n\n${user}`,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildPrompt(item: FixQueueItem): PromptPayload {
  switch (item.fixType) {
    case 'SEO Title':         return buildTitlePrompt(item);
    case 'Meta Description':  return buildMetaPrompt(item);
    case 'H1':                return buildH1Prompt(item);
    case 'FAQ Content':
    case 'FAQPage Schema':    return buildFAQPrompt(item);
    case 'Organization Schema': return buildSchemaPrompt(item, 'Organization');
    case 'Service Schema':    return buildSchemaPrompt(item, 'Service');
    case 'Article Schema':    return buildSchemaPrompt(item, 'Article');
    case 'Breadcrumb Schema': return buildSchemaPrompt(item, 'BreadcrumbList');
    case 'Internal Links':    return buildInternalLinkPrompt(item);
    case 'Image Alt Text':    return buildImageAltPrompt(item);
    default: {
      const sys = `${BRAND_CTX}\nYou are an SEO specialist. Provide actionable, specific recommendations.`;
      const user = `Provide a fix recommendation for this SEO issue:\nURL: ${item.url}\nIssue: ${item.issueType}\nFix type: ${item.fixType}\nCurrent value: ${item.currentValue}\n\nProvide a specific, actionable recommendation.`;
      return { systemPrompt: sys, userPrompt: user, copyPrompt: `${sys}\n\n${user}` };
    }
  }
}
