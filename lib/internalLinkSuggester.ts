// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Internal Link Suggester (V4)
// Rule-based. Works without any API key.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem, PageData } from '@/types/seo';
import { detectPageIntent } from './schemaExtractor';

export interface LinkSuggestion {
  fromUrl:     string;
  fromTitle:   string;
  toUrl:       string;
  toTitle:     string;
  anchorText:  string;
  rationale:   string;
  direction:   'inbound' | 'outbound';
  score:       number; // 0–100, higher = more relevant
}

export interface InternalLinkResult {
  inbound:   LinkSuggestion[]; // pages that should link TO the target
  outbound:  LinkSuggestion[]; // pages the target should link TO
  rationale: string;
}

// ─── URL tokeniser ────────────────────────────────────────────────────────────

function tokenize(url: string): Set<string> {
  try {
    const path = new URL(url).pathname;
    const tokens = path
      .split(/[/\-_]/)
      .map(t => t.toLowerCase().trim())
      .filter(t => t.length > 2 && !['the', 'and', 'for', 'with', 'page'].includes(t));
    return new Set(tokens);
  } catch {
    return new Set();
  }
}

function tokenOverlap(a: Set<string>, b: Set<string>): number {
  let overlap = 0;
  for (const t of a) if (b.has(t)) overlap++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : (overlap / union) * 100;
}

function titleOverlap(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const wa = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 0 : Math.round((overlap / union) * 100);
}

// ─── Anchor text generator ────────────────────────────────────────────────────

function buildAnchorText(page: PageData): string {
  if (page.title) {
    const clean = page.title.replace(/\s*[\|—\-]\s*.*/g, '').trim();
    if (clean.length >= 5 && clean.length <= 60) return clean;
  }
  try {
    const { pathname } = new URL(page.url);
    const slug = pathname.split('/').filter(Boolean).pop() ?? '';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim() || page.url;
  } catch {
    return page.url;
  }
}

// ─── Should-link heuristics ───────────────────────────────────────────────────

function shouldLink(source: PageData, target: PageData): { score: number; reason: string } {
  const srcTokens = tokenize(source.url);
  const tgtTokens = tokenize(target.url);
  const urlScore  = tokenOverlap(srcTokens, tgtTokens);
  const titleScore = titleOverlap(source.title, target.title);
  const combined  = Math.max(urlScore, titleScore);

  const srcIntent = detectPageIntent({ url: source.url, title: source.title, h1Texts: source.h1Texts });
  const tgtIntent = detectPageIntent({ url: target.url, title: target.title, h1Texts: target.h1Texts });

  // Boost: homepage → service pages
  if (srcIntent === 'homepage' && tgtIntent === 'service') {
    return { score: 90, reason: 'Homepage should link to all service pages' };
  }
  // Boost: service → FAQ
  if (srcIntent === 'service' && tgtIntent === 'faq') {
    return { score: 85, reason: 'Service pages benefit from linking to FAQ' };
  }
  // Boost: blog → service (contextual)
  if (srcIntent === 'blog' && tgtIntent === 'service' && combined > 20) {
    return { score: Math.min(85, 60 + combined), reason: 'Blog content can contextually link to related service' };
  }
  // Boost: service → contact
  if (srcIntent === 'service' && tgtIntent === 'contact') {
    return { score: 80, reason: 'Service pages should have CTA linking to Contact page' };
  }
  // General relevance
  if (combined >= 30) {
    return { score: combined, reason: `${Math.round(combined)}% URL/title keyword overlap` };
  }

  return { score: 0, reason: '' };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function suggestInternalLinks(
  item:      FixQueueItem,
  allPages:  PageData[],
): InternalLinkResult {
  const targetUrl = item.url;
  const inbound:  LinkSuggestion[] = [];
  const outbound: LinkSuggestion[] = [];

  // Find the target page in allPages
  const targetPage = allPages.find(p => p.url === targetUrl || p.finalUrl === targetUrl);

  for (const page of allPages) {
    if (page.url === targetUrl || page.finalUrl === targetUrl) continue;
    if (page.statusCode !== 200) continue;

    // Would this page make a good inbound link (page → target)?
    if (targetPage) {
      const { score, reason } = shouldLink(page, targetPage);
      if (score >= 30) {
        inbound.push({
          fromUrl:    page.url,
          fromTitle:  page.title ?? page.url,
          toUrl:      targetUrl,
          toTitle:    targetPage.title ?? targetUrl,
          anchorText: buildAnchorText(targetPage),
          rationale:  reason,
          direction:  'inbound',
          score,
        });
      }
    }

    // Would the target page make a good outbound link (target → page)?
    if (targetPage) {
      const { score, reason } = shouldLink(targetPage, page);
      if (score >= 30) {
        outbound.push({
          fromUrl:    targetUrl,
          fromTitle:  targetPage.title ?? targetUrl,
          toUrl:      page.url,
          toTitle:    page.title ?? page.url,
          anchorText: buildAnchorText(page),
          rationale:  reason,
          direction:  'outbound',
          score,
        });
      }
    }
  }

  // Sort by score desc, cap at 8 each
  const sortByScore = (a: LinkSuggestion, b: LinkSuggestion) => b.score - a.score;
  const topInbound  = inbound.sort(sortByScore).slice(0, 8);
  const topOutbound = outbound.sort(sortByScore).slice(0, 8);

  const rationale = [
    `${topInbound.length} pages identified that should link TO this page`,
    `${topOutbound.length} pages this page should link OUT TO`,
    item.page.internalLinksCount < 3
      ? `⚠️ This page only has ${item.page.internalLinksCount} inbound internal links — adding more will improve its crawlability and PageRank`
      : '',
  ].filter(Boolean).join('. ');

  return { inbound: topInbound, outbound: topOutbound, rationale };
}
