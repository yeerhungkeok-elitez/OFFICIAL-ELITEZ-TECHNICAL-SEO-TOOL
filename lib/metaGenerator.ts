// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Meta Title + Description Generator (V4)
// Rule-based generator. Works without any API key.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem } from '@/types/seo';

// ─── Brand context ────────────────────────────────────────────────────────────

const ELITEZ_DOMAIN = 'elitez.asia';

export interface BrandContext {
  name:     string;
  short:    string;
  city:     string;
  tagline:  string;
  industry: string;
  services: string[];
}

function detectBrand(url: string): BrandContext {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    if (hostname.includes(ELITEZ_DOMAIN)) {
      return {
        name:     'Elitez Group',
        short:    'Elitez',
        city:     'Singapore',
        tagline:  'Your Trusted HR & Recruitment Partner in Singapore',
        industry: 'HR Consulting & Recruitment',
        services: [
          'Permanent Recruitment', 'Contract Staffing', 'Payroll Outsourcing',
          'Employer of Record', 'HR Consulting', 'Career Guidance',
        ],
      };
    }
    // Generic fallback — extract brand from domain
    const brandFromDomain = hostname.split('.')[0];
    const brandName = brandFromDomain.charAt(0).toUpperCase() + brandFromDomain.slice(1);
    return {
      name:     brandName,
      short:    brandName,
      city:     '',
      tagline:  `${brandName} — Expert Solutions`,
      industry: '',
      services: [],
    };
  } catch {
    return { name: 'Company', short: 'Company', city: '', tagline: '', industry: '', services: [] };
  }
}

// ─── Topic extraction ─────────────────────────────────────────────────────────

export function extractTopicFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    // Use last meaningful segment
    const slug = segments.reverse().find(s =>
      !['index', 'home', 'default', 'en', 'sg', 'my', 'page'].includes(s.toLowerCase()) &&
      !/^\d+$/.test(s)
    ) ?? segments[0] ?? '';
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  } catch {
    return '';
  }
}

function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trim() + '…' : s;
}

// ─── Title templates ─────────────────────────────────────────────────────────

function buildTitle(item: FixQueueItem, brand: BrandContext): string {
  const topic   = extractTopicFromUrl(item.url) || (item.page.title ?? 'Page');
  const loc     = brand.city ? ` ${brand.city}` : '';
  const cur     = item.page.title?.trim() ?? '';
  const intent  = item.pageIntent;

  // If current title exists but is just too short/missing brand — enhance it
  if (cur && cur.length >= 20 && !cur.includes(brand.short)) {
    const candidate = `${cur} | ${brand.name}`;
    if (candidate.length <= 65) return candidate;
  }

  switch (intent) {
    case 'homepage':
      return clamp(`${brand.name} | ${brand.tagline}`, 65);
    case 'service':
      return clamp(`${topic} Services${loc} | ${brand.name}`, 65);
    case 'blog':
    case 'article':
      return clamp(cur && cur.length > 15 ? `${cur} | ${brand.name}` : `${topic} | ${brand.name}`, 65);
    case 'contact':
      return clamp(`Contact ${brand.name}${loc ? ' | ' + loc : ''}`, 65);
    case 'faq':
      return clamp(`FAQ | ${brand.name} — ${brand.industry || 'Expert Services'}`, 65);
    case 'product':
      return clamp(`${topic}${loc} | ${brand.name}`, 65);
    default:
      return clamp(`${topic} | ${brand.name}`, 65);
  }
}

// ─── Meta description templates ──────────────────────────────────────────────

function buildMeta(item: FixQueueItem, brand: BrandContext): string {
  const topic   = extractTopicFromUrl(item.url) || 'our services';
  const topicL  = topic.toLowerCase();
  const loc     = brand.city || 'Singapore';
  const intent  = item.pageIntent;

  switch (intent) {
    case 'homepage':
      return clamp(
        `${brand.name} is ${loc}'s trusted ${brand.industry || 'HR consulting'} firm offering ${
          brand.services.slice(0, 3).join(', ')
        }. Contact us to find out how we can support your business.`,
        165,
      );
    case 'service':
      return clamp(
        `Looking for ${topicL} solutions in ${loc}? ${brand.name} provides expert ${topicL} services tailored to your needs. Contact us for a free consultation.`,
        165,
      );
    case 'blog':
    case 'article': {
      const titleHint = item.page.title?.trim() ?? topic;
      return clamp(
        `${titleHint} — Get expert insights from ${brand.name}'s ${brand.industry || ''} specialists. Read our latest article and learn how to apply it to your business.`,
        165,
      );
    }
    case 'contact':
      return clamp(
        `Contact ${brand.name} today. Our ${loc}-based team of ${brand.industry || ''} experts is ready to help with your HR and staffing needs. Reach out now.`,
        165,
      );
    case 'faq':
      return clamp(
        `Have questions about ${brand.name}'s services? Find answers to the most frequently asked questions about our ${brand.industry || 'HR & recruitment'} solutions in ${loc}.`,
        165,
      );
    case 'product':
      return clamp(
        `Explore ${topicL} offered by ${brand.name}. Trusted by businesses in ${loc} for expert HR and staffing solutions. Get in touch for more information.`,
        165,
      );
    default:
      return clamp(
        `Learn more about ${topicL} from ${brand.name} — ${loc}'s ${brand.industry || 'trusted service provider'}. Visit our website for detailed information and expert guidance.`,
        165,
      );
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface MetaResult {
  title:      string;
  titleLen:   number;
  meta:       string;
  metaLen:    number;
  rationale:  string;
  brand:      BrandContext;
}

export function generateMeta(item: FixQueueItem): MetaResult {
  const brand   = detectBrand(item.url);
  const title   = buildTitle(item, brand);
  const meta    = buildMeta(item, brand);

  const titleOk = title.length >= 30 && title.length <= 65;
  const metaOk  = meta.length >= 120 && meta.length <= 165;

  const rationale = [
    titleOk  ? `Title is ${title.length} chars (ideal: 30–65)` : `Title is ${title.length} chars — adjusted for optimal length`,
    metaOk   ? `Meta is ${meta.length} chars (ideal: 120–165)` : `Meta is ${meta.length} chars — adjusted for optimal length`,
    `Brand "${brand.name}" included for recognition`,
    brand.city ? `Location "${brand.city}" included for local SEO` : '',
  ].filter(Boolean).join('. ');

  return { title, titleLen: title.length, meta, metaLen: meta.length, rationale, brand };
}
