// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — FAQ Generator (V4)
// Generates FAQ content + FAQPage schema from page context.
// SAFETY: Always warns that FAQ content must appear as visible page content,
//         not just in schema markup.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem } from '@/types/seo';

export interface FAQItem {
  question: string;
  answer:   string;
}

export interface FAQResult {
  faqs:           FAQItem[];
  schemaJson:     string;
  safetyWarning:  string;
  rationale:      string;
}

// ─── Service FAQ bank ─────────────────────────────────────────────────────────

const SERVICE_FAQS: Record<string, FAQItem[]> = {
  'permanent-recruitment': [
    {
      question: 'What is permanent recruitment?',
      answer:   'Permanent recruitment is the process of finding and placing qualified candidates in full-time, long-term positions within your organisation. Elitez Group manages the complete hiring process — from job profiling and candidate sourcing to interviews and offer management.',
    },
    {
      question: 'How long does the permanent recruitment process take?',
      answer:   'The timeline depends on the seniority and complexity of the role. Typically, for mid-level positions, the process takes 3–6 weeks from briefing to offer acceptance. Senior or specialised roles may take longer.',
    },
    {
      question: 'What industries does Elitez recruit for?',
      answer:   'We recruit across a wide range of industries including financial services, technology, healthcare, manufacturing, logistics, retail, and professional services in Singapore and the region.',
    },
    {
      question: 'Do you offer a replacement guarantee?',
      answer:   'Yes. We offer a replacement guarantee period for all permanent placements. Please contact our team for specific terms applicable to your engagement.',
    },
    {
      question: 'What information do you need to start a recruitment search?',
      answer:   'We need a job description, required qualifications, salary range, start date, and any specific requirements. An initial briefing call with our consultant helps us understand your team culture and expectations.',
    },
  ],
  'temporary-staffing': [
    {
      question: 'What is temporary staffing?',
      answer:   'Temporary staffing provides businesses with pre-screened workers on a short-term or project basis. Elitez Group handles employment administration, payroll, and compliance — so you can focus on your core operations.',
    },
    {
      question: 'How quickly can Elitez provide temporary staff?',
      answer:   'For most roles, we can provide pre-screened temporary staff within 24–72 hours, depending on the specialisation and volume required.',
    },
    {
      question: 'What are the minimum contract durations?',
      answer:   'We offer flexible arrangements from as short as one day to multi-month contracts. Most engagements range from one week to six months.',
    },
    {
      question: 'Who handles payroll and benefits for temp workers?',
      answer:   'Elitez Group handles all payroll, CPF contributions, and statutory benefits for temporary staff deployed on our payroll. This simplifies administration for your business.',
    },
    {
      question: 'Can I convert a temporary worker to a permanent employee?',
      answer:   'Yes. We offer a temp-to-perm conversion option. Contact your Elitez consultant to discuss the applicable terms.',
    },
  ],
  'payroll-outsourcing': [
    {
      question: 'What is payroll outsourcing?',
      answer:   'Payroll outsourcing means delegating your company\'s payroll processing — including salary calculations, CPF contributions, leave management, and statutory filings — to a specialist provider like Elitez Group.',
    },
    {
      question: 'Is payroll outsourcing compliant with Singapore MOM regulations?',
      answer:   'Yes. Our payroll services are fully compliant with Ministry of Manpower (MOM) regulations, including CPF, SDL, IRAS reporting, and the Employment Act.',
    },
    {
      question: 'How secure is my employee data?',
      answer:   'We handle payroll data with strict confidentiality controls and secure systems. Data is processed in compliance with the Personal Data Protection Act (PDPA) in Singapore.',
    },
    {
      question: 'Can you handle payroll for a small team?',
      answer:   'Yes. We work with companies of all sizes — from startups with a handful of employees to large enterprises with hundreds of staff.',
    },
    {
      question: 'What are the benefits of outsourcing payroll?',
      answer:   'Outsourcing payroll reduces administrative burden, minimises compliance risk, saves time, and ensures accurate, on-time salary disbursement. It also gives your HR team more time for strategic work.',
    },
  ],
  'employer-of-record': [
    {
      question: 'What is an Employer of Record (EOR)?',
      answer:   'An Employer of Record (EOR) is a service where Elitez Group legally employs workers on your behalf, handling all employment obligations — payroll, benefits, tax, and compliance — while you retain day-to-day management of the employees.',
    },
    {
      question: 'When should I use an EOR instead of setting up a legal entity?',
      answer:   'EOR is ideal when you want to hire in a new country quickly without the cost and time of incorporating a local entity. It\'s also useful for testing a new market before committing to a permanent legal presence.',
    },
    {
      question: 'Which countries does Elitez support for EOR services?',
      answer:   'We provide EOR services across Singapore, Malaysia, Indonesia, Thailand, Philippines, and other APAC countries. Contact us for a full list of supported countries.',
    },
    {
      question: 'Who manages the employee day-to-day?',
      answer:   'You manage the employee\'s daily work, tasks, and performance. Elitez handles all employment administration, payroll processing, and statutory compliance as the Employer of Record.',
    },
    {
      question: 'What is the difference between EOR and staffing?',
      answer:   'With staffing, Elitez sources candidates for you. With EOR, you have already identified your hire — we simply employ them legally on your behalf while you direct the work.',
    },
  ],
  'hr-consulting': [
    {
      question: 'What HR consulting services does Elitez Group offer?',
      answer:   'Our HR consulting services include HR audits, HR policy and handbook development, compensation benchmarking, job evaluation frameworks, performance management systems, and strategic HR transformation advisory.',
    },
    {
      question: 'How can HR consulting benefit my organisation?',
      answer:   'HR consulting helps you identify gaps in your HR practices, improve employee engagement, ensure legal compliance, and align your HR strategy with business objectives — ultimately reducing costs and improving retention.',
    },
    {
      question: 'Do you work with SMEs or only large enterprises?',
      answer:   'We work with organisations of all sizes — from growing SMEs setting up their first HR function to large enterprises undertaking strategic HR transformation.',
    },
    {
      question: 'How long does an HR consulting project take?',
      answer:   'Duration varies by scope. A basic HR audit typically takes 2–4 weeks. Comprehensive HR strategy projects may span 2–6 months. We tailor our engagement to your timeline and budget.',
    },
    {
      question: 'Is the advice Singapore-specific?',
      answer:   'Yes. All our HR consulting advice is aligned with Singapore employment law, MOM guidelines, and local market practices.',
    },
  ],
  'hr': [
    {
      question: 'What HR services does Elitez Group provide?',
      answer:   'Elitez Group offers a comprehensive suite of HR services including permanent recruitment, temporary staffing, payroll outsourcing, employer of record, HR consulting, and career guidance.',
    },
    {
      question: 'How does Elitez Group help businesses in Singapore?',
      answer:   'We help businesses across Singapore by providing end-to-end HR solutions — from sourcing and hiring top talent to managing payroll and ensuring employment compliance.',
    },
    {
      question: 'What industries does Elitez Group specialise in?',
      answer:   'We specialise in financial services, technology, healthcare, logistics, manufacturing, retail, and professional services, among others.',
    },
    {
      question: 'How do I get started with Elitez Group?',
      answer:   'Simply contact us through our website to speak with one of our HR consultants. We\'ll arrange a free initial consultation to understand your needs.',
    },
    {
      question: 'Is Elitez Group licensed in Singapore?',
      answer:   'Yes, Elitez Group operates in full compliance with Singapore\'s employment agency regulations under the Ministry of Manpower (MOM).',
    },
  ],
};

// Generic FAQs by page intent
const GENERIC_FAQS: Record<string, FAQItem[]> = {
  service: [
    {
      question: 'What services do you offer?',
      answer:   'Please update this answer with specific details about your services.',
    },
    {
      question: 'How do I get started?',
      answer:   'Contact our team for a free initial consultation. We\'ll guide you through the process.',
    },
    {
      question: 'What areas do you serve?',
      answer:   'We serve [location]. Please contact us for coverage details.',
    },
    {
      question: 'How much do your services cost?',
      answer:   'Pricing varies depending on your specific requirements. Contact us for a customised quote.',
    },
  ],
  homepage: [
    {
      question: 'What does your company do?',
      answer:   'Please update this with a brief description of your company\'s core services.',
    },
    {
      question: 'Where are you located?',
      answer:   'Please update with your office address.',
    },
    {
      question: 'How can I contact you?',
      answer:   'Please update with your contact information.',
    },
  ],
};

// ─── Slug-based FAQ matching ──────────────────────────────────────────────────

function findFAQsForUrl(url: string, intent: string): FAQItem[] {
  const path = (() => { try { return new URL(url).pathname.toLowerCase(); } catch { return url.toLowerCase(); } })();

  for (const [key, faqs] of Object.entries(SERVICE_FAQS)) {
    if (path.includes(key)) return faqs;
  }

  // Fallback by intent
  return GENERIC_FAQS[intent] ?? GENERIC_FAQS.service;
}

// ─── Schema builder ───────────────────────────────────────────────────────────

function buildFAQSchema(url: string, faqs: FAQItem[]): Record<string, unknown> {
  return {
    '@context':   'https://schema.org',
    '@type':      'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type':          'Question',
      'name':           faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text':  faq.answer,
      },
    })),
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateFAQs(item: FixQueueItem): FAQResult {
  const faqs    = findFAQsForUrl(item.url, item.pageIntent);
  const schema  = buildFAQSchema(item.url, faqs);
  const json    = JSON.stringify(schema, null, 2);

  const isGeneric = faqs === GENERIC_FAQS.service || faqs === GENERIC_FAQS.homepage;

  return {
    faqs,
    schemaJson: json,
    safetyWarning:
      '⚠️ IMPORTANT: These FAQ questions and answers must appear as VISIBLE text content on your page, not just inside the schema markup. Google requires that schema FAQ content matches what visitors can see. Add the Q&A section to the page HTML first, then add the schema.',
    rationale: isGeneric
      ? `Generic FAQ template generated. Please customise these questions and answers with real, accurate information about your business. Do not publish placeholder answers.`
      : `${faqs.length} service-specific FAQs generated for this page type. Review and customise before publishing. Verify all answers are accurate and up-to-date.`,
  };
}
