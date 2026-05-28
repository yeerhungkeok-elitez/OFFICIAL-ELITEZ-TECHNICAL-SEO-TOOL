// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — H1 + H2 Generator (V4)
// Rule-based. Works without any API key.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem } from '@/types/seo';
import { extractTopicFromUrl } from './metaGenerator';

export interface HeadingResult {
  h1:         string;
  h2s:        string[];
  rationale:  string;
}

// ─── Service-specific H2 templates ───────────────────────────────────────────

const SERVICE_H2S: Record<string, string[]> = {
  'permanent-recruitment': [
    'What is Permanent Recruitment?',
    'Our Permanent Recruitment Process',
    'Industries We Recruit For',
    'Why Choose Elitez for Permanent Hiring?',
    'Get Started Today',
  ],
  'temporary-staffing': [
    'What is Temporary Staffing?',
    'Benefits of Contract Staffing',
    'How Quickly Can You Provide Staff?',
    'Industries We Cover',
    'Contact Our Staffing Team',
  ],
  'contract-staffing': [
    'What is Contract Staffing?',
    'Contract vs Permanent Employees',
    'Industries We Cover',
    'How Our Contract Staffing Works',
    'Get Flexible Staffing Solutions',
  ],
  'payroll-outsourcing': [
    'What is Payroll Outsourcing?',
    'Benefits of Outsourcing Payroll',
    'Our Payroll Management Process',
    'Compliance and Accuracy',
    'Get a Payroll Outsourcing Quote',
  ],
  'employer-of-record': [
    'What is an Employer of Record?',
    'How EOR Works',
    'EOR vs Entity Setup',
    'Countries We Cover',
    'Get Started with EOR Services',
  ],
  'hr-consulting': [
    'What is HR Consulting?',
    'Our HR Consulting Services',
    'HR Audit and Strategy',
    'Compensation and Benefits Benchmarking',
    'Contact Our HR Consultants',
  ],
  'career-guidance': [
    'How Career Guidance Helps You',
    'Our Career Coaching Process',
    'Resume and Interview Preparation',
    'Industries We Place Candidates In',
    'Start Your Career Journey Today',
  ],
};

// ─── Slug matcher ─────────────────────────────────────────────────────────────

function matchServiceSlug(url: string): string | null {
  const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return url.toLowerCase(); } })();
  for (const key of Object.keys(SERVICE_H2S)) {
    if (path.includes(key)) return key;
  }
  return null;
}

// ─── Generic H2 templates ─────────────────────────────────────────────────────

const GENERIC_H2S: Record<string, string[]> = {
  homepage: [
    'Our Services',
    'Why Choose Us',
    'Industries We Serve',
    'What Our Clients Say',
    'Get In Touch',
  ],
  service: [
    'What We Offer',
    'Our Process',
    'Key Benefits',
    'Who This Is For',
    'Get a Consultation',
  ],
  blog: [
    'Key Takeaways',
    'Why This Matters',
    'How to Apply This',
    'Common Mistakes to Avoid',
    'Final Thoughts',
  ],
  contact: [
    'Our Office Location',
    'How to Reach Us',
    'Frequently Asked Questions',
    'What to Expect Next',
  ],
  faq: [
    'General Questions',
    'Our Services',
    'Pricing and Process',
    'Getting Started',
    'Still Have Questions?',
  ],
  product: [
    'Key Features',
    'How It Works',
    'Who Is This For',
    'Pricing',
    'Get Started',
  ],
};

// ─── H1 generator ─────────────────────────────────────────────────────────────

function buildH1(item: FixQueueItem, topic: string): string {
  const intent = item.pageIntent;
  const city   = 'Singapore'; // use brand city if detected
  const cur    = item.page.h1Texts[0]?.trim() ?? '';

  // If there's already an H1, just suggest improvement
  if (cur && cur.length >= 15 && cur.length <= 80) {
    // Already decent — but if it's a service page without location, add it
    if (intent === 'service' && !cur.toLowerCase().includes(city.toLowerCase())) {
      const candidate = `${cur} in ${city}`;
      if (candidate.length <= 80) return candidate;
    }
    return cur;
  }

  switch (intent) {
    case 'homepage':
      return 'Your Trusted HR & Recruitment Partner in Singapore';
    case 'service': {
      const svcSlug = matchServiceSlug(item.url);
      if (svcSlug) {
        const svcName = svcSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return `${svcName} Services in ${city}`;
      }
      return `${topic} Services in ${city}`;
    }
    case 'blog':
    case 'article':
      return topic || 'Article Title Here';
    case 'contact':
      return `Contact Elitez Group`;
    case 'faq':
      return 'Frequently Asked Questions';
    case 'product':
      return `${topic} in ${city}`;
    default:
      return topic || 'Page Title Here';
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateHeadings(item: FixQueueItem): HeadingResult {
  const topic  = extractTopicFromUrl(item.url);
  const h1     = buildH1(item, topic);
  const svcKey = matchServiceSlug(item.url);

  const h2s: string[] = svcKey
    ? SERVICE_H2S[svcKey]
    : (GENERIC_H2S[item.pageIntent] ?? GENERIC_H2S.service);

  const rationale = [
    `H1 "${h1}" is descriptive and includes relevant keyword`,
    item.pageIntent === 'service' ? 'Location "Singapore" included for local search relevance' : '',
    `${h2s.length} H2 sections suggested for content structure and featured snippet eligibility`,
  ].filter(Boolean).join('. ');

  return { h1, h2s, rationale };
}
