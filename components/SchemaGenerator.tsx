'use client';

import { useState, useCallback, useEffect } from 'react';
import SchemaPreview from './SchemaPreview';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez default profile
// ─────────────────────────────────────────────────────────────────────────────
const ELITEZ_DEFAULTS = {
  orgName:     'Elitez Group',
  websiteUrl:  'https://www.elitez.asia/',
  description: 'Leading HR consulting and recruitment agency in Singapore, specialising in permanent recruitment, contract staffing, payroll outsourcing, and employer of record services.',
  country:     'Singapore',
  addressCountry: 'SG',
  businessType:'ProfessionalService',
  services: [
    'Permanent Recruitment',
    'Temporary & Contract Staffing',
    'Payroll Outsourcing',
    'Employer of Record',
    'HR Consulting',
    'Career Guidance',
  ],
  // These MUST be verified before use — leave as placeholders
  telephone:   '',     // e.g. +65-6XXX-XXXX
  address:     '',     // e.g. 100 Cecil Street #XX-XX Singapore 069532
  logoUrl:     '',     // e.g. https://www.elitez.asia/logo.png
  linkedIn:    'https://www.linkedin.com/company/elitez-asia',
  facebook:    '',
  twitter:     '',
  instagram:   '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema type definitions
// ─────────────────────────────────────────────────────────────────────────────
type SchemaType = 'Organization' | 'LocalBusiness' | 'WebSite' | 'BreadcrumbList' | 'FAQPage' | 'Article' | 'Service';

const SCHEMA_TYPES: { type: SchemaType; icon: string; label: string; desc: string }[] = [
  { type: 'Organization',   icon: '🏢', label: 'Organization',    desc: 'Brand identity, logo, social links' },
  { type: 'LocalBusiness',  icon: '📍', label: 'Local Business',   desc: 'Address, phone, opening hours' },
  { type: 'WebSite',        icon: '🌐', label: 'WebSite',          desc: 'Site name, URL, search action' },
  { type: 'BreadcrumbList', icon: '🍞', label: 'Breadcrumbs',      desc: 'Navigation trail for any page' },
  { type: 'FAQPage',        icon: '❓', label: 'FAQ Page',          desc: 'Q&A pairs for rich results' },
  { type: 'Article',        icon: '📰', label: 'Article / Blog',   desc: 'Blog post, news, thought leadership' },
  { type: 'Service',        icon: '⚙️', label: 'Service',          desc: 'Services you offer' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Form state shape — all fields for all types
// ─────────────────────────────────────────────────────────────────────────────
interface FormState {
  // Shared
  orgName:       string;
  websiteUrl:    string;
  description:   string;
  logoUrl:       string;
  email:         string;
  linkedIn:      string;
  facebook:      string;
  twitter:       string;
  instagram:     string;
  youtube:       string;
  // LocalBusiness
  telephone:     string;
  streetAddress: string;
  city:          string;
  region:        string;
  postalCode:    string;
  country:       string;
  addressCountry:string;
  bizType:       string;
  openingHours:  { days: string; opens: string; closes: string }[];
  // WebSite
  hasSearchAction: boolean;
  searchTemplate:  string;
  // Breadcrumb
  breadcrumbs: { name: string; url: string }[];
  // FAQPage
  faqs: { question: string; answer: string }[];
  // Article
  artHeadline:       string;
  artUrl:            string;
  artImage:          string;
  artAuthorName:     string;
  artPublisherName:  string;
  artPublisherLogo:  string;
  artDatePublished:  string;
  artDateModified:   string;
  artDescription:    string;
  // Service
  svcName:        string;
  svcDescription: string;
  svcUrl:         string;
  svcProviderName:string;
  svcProviderUrl: string;
  svcAreaServed:  string;
  svcType:        string;
}

const DEFAULT_FORM: FormState = {
  orgName:       '',
  websiteUrl:    '',
  description:   '',
  logoUrl:       '',
  email:         '',
  linkedIn:      '',
  facebook:      '',
  twitter:       '',
  instagram:     '',
  youtube:       '',
  telephone:     '',
  streetAddress: '',
  city:          '',
  region:        '',
  postalCode:    '',
  country:       'Singapore',
  addressCountry:'SG',
  bizType:       'ProfessionalService',
  openingHours:  [{ days: 'Mo-Fr', opens: '09:00', closes: '18:00' }],
  hasSearchAction: false,
  searchTemplate: '',
  breadcrumbs: [
    { name: 'Home', url: '' },
    { name: 'Page Name', url: '' },
  ],
  faqs: [
    { question: '', answer: '' },
    { question: '', answer: '' },
  ],
  artHeadline:      '',
  artUrl:           '',
  artImage:         '',
  artAuthorName:    '',
  artPublisherName: '',
  artPublisherLogo: '',
  artDatePublished: new Date().toISOString().slice(0, 10),
  artDateModified:  new Date().toISOString().slice(0, 10),
  artDescription:   '',
  svcName:        '',
  svcDescription: '',
  svcUrl:         '',
  svcProviderName:'',
  svcProviderUrl: '',
  svcAreaServed:  'Singapore',
  svcType:        '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Schema builders
// ─────────────────────────────────────────────────────────────────────────────
function buildOrganization(f: FormState): Record<string, unknown> {
  const sameAs = [f.linkedIn, f.facebook, f.twitter, f.instagram, f.youtube]
    .filter(Boolean);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': f.websiteUrl ? `${f.websiteUrl.replace(/\/$/, '')}/#organization` : undefined,
    name: f.orgName || undefined,
    url: f.websiteUrl || undefined,
    description: f.description || undefined,
    email: f.email || undefined,
  };

  if (f.logoUrl) {
    schema.logo = {
      '@type': 'ImageObject',
      url: f.logoUrl,
      width: 200,
      height: 60,
    };
  }
  if (sameAs.length > 0) schema.sameAs = sameAs;

  return removeUndefined(schema);
}

function buildLocalBusiness(f: FormState): Record<string, unknown> {
  const base = buildOrganization(f);

  const oh = f.openingHours
    .filter(h => h.days && h.opens && h.closes)
    .map(h => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes }));

  const schema: Record<string, unknown> = {
    ...base,
    '@type': 'LocalBusiness',
    '@id': f.websiteUrl ? `${f.websiteUrl.replace(/\/$/, '')}/#localbusiness` : undefined,
    telephone: f.telephone || undefined,
    address: (f.streetAddress || f.city || f.postalCode) ? {
      '@type': 'PostalAddress',
      streetAddress:    f.streetAddress || undefined,
      addressLocality:  f.city          || undefined,
      addressRegion:    f.region        || undefined,
      postalCode:       f.postalCode    || undefined,
      addressCountry:   f.addressCountry || undefined,
    } : undefined,
  };

  if (oh.length > 0) schema.openingHoursSpecification = oh;

  return removeUndefined(schema);
}

function buildWebSite(f: FormState): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': f.websiteUrl ? `${f.websiteUrl.replace(/\/$/, '')}/#website` : undefined,
    name: f.orgName || undefined,
    url: f.websiteUrl || undefined,
  };

  if (f.hasSearchAction && f.searchTemplate) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: f.searchTemplate,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  return removeUndefined(schema);
}

function buildBreadcrumbList(f: FormState): Record<string, unknown> {
  const items = f.breadcrumbs
    .filter(b => b.name)
    .map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: b.url || undefined,
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(removeUndefined),
  };
}

function buildFAQPage(f: FormState): Record<string, unknown> {
  const pairs = f.faqs.filter(q => q.question && q.answer);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

function buildArticle(f: FormState): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': f.artUrl ? `${f.artUrl}#article` : undefined,
    headline: f.artHeadline || undefined,
    description: f.artDescription || undefined,
    url: f.artUrl || undefined,
    datePublished: f.artDatePublished || undefined,
    dateModified:  f.artDateModified  || undefined,
  };

  if (f.artImage) {
    schema.image = { '@type': 'ImageObject', url: f.artImage, width: 1200, height: 630 };
  }
  if (f.artAuthorName) {
    schema.author = { '@type': 'Person', name: f.artAuthorName };
  }
  if (f.artPublisherName) {
    schema.publisher = {
      '@type': 'Organization',
      name: f.artPublisherName,
      logo: f.artPublisherLogo ? { '@type': 'ImageObject', url: f.artPublisherLogo } : undefined,
    };
    if (!(schema.publisher as Record<string, unknown>).logo) {
      delete (schema.publisher as Record<string, unknown>).logo;
    }
  }

  return removeUndefined(schema);
}

function buildService(f: FormState): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': f.svcUrl ? `${f.svcUrl}#service` : undefined,
    name: f.svcName || undefined,
    description: f.svcDescription || undefined,
    url: f.svcUrl || undefined,
    serviceType: f.svcType || undefined,
    areaServed: f.svcAreaServed ? { '@type': 'Country', name: f.svcAreaServed } : undefined,
    provider: (f.svcProviderName || f.svcProviderUrl) ? {
      '@type': 'Organization',
      name: f.svcProviderName || undefined,
      url:  f.svcProviderUrl  || undefined,
    } : undefined,
  };

  return removeUndefined(schema);
}

function buildSchema(type: SchemaType, f: FormState): Record<string, unknown> {
  switch (type) {
    case 'Organization':   return buildOrganization(f);
    case 'LocalBusiness':  return buildLocalBusiness(f);
    case 'WebSite':        return buildWebSite(f);
    case 'BreadcrumbList': return buildBreadcrumbList(f);
    case 'FAQPage':        return buildFAQPage(f);
    case 'Article':        return buildArticle(f);
    case 'Service':        return buildService(f);
  }
}

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Installation instructions
// ─────────────────────────────────────────────────────────────────────────────
function InstallInstructions({ schema, type }: { schema: Record<string, unknown>; type: SchemaType }) {
  const [tab, setTab] = useState<'nextjs' | 'wordpress' | 'gtm' | 'validate'>('nextjs');
  const [copied, setCopied] = useState(false);

  const scriptTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  const jsonString = JSON.stringify(schema, null, 2);

  const TABS = [
    { key: 'nextjs',    label: '⚛️ Next.js' },
    { key: 'wordpress', label: '🔷 WordPress' },
    { key: 'gtm',       label: '📦 GTM' },
    { key: 'validate',  label: '✅ Validate' },
  ] as const;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  }

  return (
    <div className="card mt-4">
      <div className="card-header">
        <h4 className="font-semibold text-slate-800 text-sm mb-3">📥 Installation Instructions</h4>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      tab === t.key ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                    }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-body text-sm text-slate-700 space-y-3">
        {tab === 'nextjs' && (
          <>
            <p className="font-semibold text-slate-800">Method 1 — layout.tsx (global, e.g. for Organization)</p>
            <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{
`// app/layout.tsx
import Script from 'next/script';

const schema = ${jsonString};

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          id="schema-${type.toLowerCase()}"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`}</pre>
            <p className="font-semibold text-slate-800 mt-4">Method 2 — Metadata API (Next.js 13+)</p>
            <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{
`// app/page.tsx  (or any page file)
export async function generateMetadata() {
  return {
    other: {
      'script:ld+json': JSON.stringify(${jsonString.slice(0, 60)}...),
    },
  };
}`}</pre>
            <p className="text-xs text-slate-500">→ For page-specific schema, add the Script component directly in the page component, not the layout.</p>
          </>
        )}

        {tab === 'wordpress' && (
          <>
            <p className="font-semibold text-slate-800">Option 1 — Plugin (Recommended)</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Install the <strong>Insert Headers and Footers</strong> plugin (free, WP Beginner)</li>
              <li>Go to <strong>Settings → Insert Headers and Footers</strong></li>
              <li>Paste the script tag below into the "Scripts in Header" box</li>
              <li>Click <strong>Save</strong></li>
            </ol>
            <p className="font-semibold text-slate-800 mt-3">Option 2 — Theme functions.php</p>
            <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap">{
`// Add to functions.php — child theme only
function elitez_schema_${type.toLowerCase()}() {
  if ( is_front_page() ) { // adjust condition as needed
    echo '${scriptTag.replace(/'/g, "\\'")}';
  }
}
add_action('wp_head', 'elitez_schema_${type.toLowerCase()}');`}</pre>
            <p className="text-xs text-slate-500">⚠️ Always use a child theme. Never edit the parent theme directly.</p>
          </>
        )}

        {tab === 'gtm' && (
          <>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Open <strong>Google Tag Manager → New Tag → Custom HTML</strong></li>
              <li>Paste the script tag below into the HTML field</li>
              <li>Set trigger: <strong>Page View — All Pages</strong> (or a specific page trigger)</li>
              <li>Name the tag: <strong>"Schema — {type}"</strong></li>
              <li>Click <strong>Save → Submit → Publish</strong></li>
            </ol>
            <p className="mt-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg">
              ⚠️ GTM renders schema client-side. Google can generally index client-rendered JSON-LD, but server-side injection is preferred for reliability.
            </p>
          </>
        )}

        {tab === 'validate' && (
          <>
            <p className="text-slate-700 text-sm">After adding your schema, validate it using these tools:</p>
            <div className="space-y-3">
              <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-semibold text-blue-800 text-sm">Google Rich Results Test</p>
                  <p className="text-xs text-blue-600">search.google.com/test/rich-results</p>
                </div>
              </a>
              <a href="https://validator.schema.org" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold text-green-800 text-sm">Schema.org Validator</p>
                  <p className="text-xs text-green-600">validator.schema.org</p>
                </div>
              </a>
              <a href="https://www.bing.com/webmasters/markup-validator" target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                <span className="text-2xl">🔷</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Bing Markup Validator</p>
                  <p className="text-xs text-slate-500">bing.com/webmasters/markup-validator</p>
                </div>
              </a>
            </div>
          </>
        )}

        {tab !== 'validate' && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Script Tag to Copy</p>
              <button onClick={() => copy(scriptTag)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                {copied ? '✓ Copied!' : '⎘ Copy Script Tag'}
              </button>
            </div>
            <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto whitespace-pre-wrap max-h-40">
              {scriptTag}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form field helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {hint && <span className="font-normal text-slate-400 ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-base text-sm py-2"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-base text-sm py-2 resize-y"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-type form panels
// ─────────────────────────────────────────────────────────────────────────────

function SharedOrgFields({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Business / Organisation Name" hint="required">
          <Input value={f.orgName} onChange={v => set('orgName', v)} placeholder="Elitez Group" />
        </Field>
        <Field label="Website URL" hint="required">
          <Input value={f.websiteUrl} onChange={v => set('websiteUrl', v)} placeholder="https://www.elitez.asia/" />
        </Field>
      </div>
      <Field label="Description">
        <Textarea value={f.description} onChange={v => set('description', v)}
                  placeholder="One or two sentences describing your organisation…" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Logo URL" hint="200×60px or larger PNG/SVG">
          <Input value={f.logoUrl} onChange={v => set('logoUrl', v)} placeholder="https://www.elitez.asia/logo.png" />
        </Field>
        <Field label="Email (optional)">
          <Input value={f.email} onChange={v => set('email', v)} placeholder="hello@elitez.asia" />
        </Field>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">Social Profiles (sameAs links)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'linkedIn',  icon: '💼', placeholder: 'https://linkedin.com/company/…' },
            { key: 'facebook',  icon: '👥', placeholder: 'https://facebook.com/…' },
            { key: 'twitter',   icon: '🐦', placeholder: 'https://twitter.com/…' },
            { key: 'instagram', icon: '📸', placeholder: 'https://instagram.com/…' },
            { key: 'youtube',   icon: '▶️', placeholder: 'https://youtube.com/@…' },
          ].map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="text-lg w-6 text-center flex-shrink-0">{s.icon}</span>
              <input
                type="url"
                value={f[s.key as keyof FormState] as string}
                onChange={e => set(s.key as keyof FormState, e.target.value)}
                placeholder={s.placeholder}
                className="input-base text-sm py-2 flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function OrganizationForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SharedOrgFields f={f} set={set} />
    </div>
  );
}

function LocalBusinessForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  function updateHours(i: number, field: string, value: string) {
    const updated = f.openingHours.map((h, idx) => idx === i ? { ...h, [field]: value } : h);
    set('openingHours', updated);
  }

  return (
    <div className="space-y-4">
      <SharedOrgFields f={f} set={set} />
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">📍 Physical Location</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Telephone" hint="E.164 format: +65-6XXX-XXXX">
            <Input value={f.telephone} onChange={v => set('telephone', v)} placeholder="+65-6XXX-XXXX" />
          </Field>
          <Field label="Business Type" hint="Schema.org LocalBusiness subtype">
            <Input value={f.bizType} onChange={v => set('bizType', v)} placeholder="ProfessionalService" />
          </Field>
          <Field label="Street Address" hint="required for Local SEO">
            <Input value={f.streetAddress} onChange={v => set('streetAddress', v)} placeholder="100 Cecil Street #20-01" />
          </Field>
          <Field label="City / Locality">
            <Input value={f.city} onChange={v => set('city', v)} placeholder="Singapore" />
          </Field>
          <Field label="Region / State (optional)">
            <Input value={f.region} onChange={v => set('region', v)} placeholder="" />
          </Field>
          <Field label="Postal Code">
            <Input value={f.postalCode} onChange={v => set('postalCode', v)} placeholder="069532" />
          </Field>
          <Field label="Country Name">
            <Input value={f.country} onChange={v => set('country', v)} placeholder="Singapore" />
          </Field>
          <Field label="Country Code" hint="ISO 3166-1 alpha-2">
            <Input value={f.addressCountry} onChange={v => set('addressCountry', v)} placeholder="SG" />
          </Field>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">🕐 Opening Hours</p>
          <button onClick={() => set('openingHours', [...f.openingHours, { days: 'Sa', opens: '09:00', closes: '13:00' }])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Row</button>
        </div>
        <div className="space-y-2">
          {f.openingHours.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={h.days}   onChange={e => updateHours(i, 'days', e.target.value)}
                     placeholder="Mo-Fr" className="input-base text-sm py-2 w-24 flex-shrink-0" />
              <input value={h.opens}  onChange={e => updateHours(i, 'opens', e.target.value)}
                     type="time" className="input-base text-sm py-2 w-28 flex-shrink-0" />
              <span className="text-slate-400 text-sm">–</span>
              <input value={h.closes} onChange={e => updateHours(i, 'closes', e.target.value)}
                     type="time" className="input-base text-sm py-2 w-28 flex-shrink-0" />
              {f.openingHours.length > 1 && (
                <button onClick={() => set('openingHours', f.openingHours.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WebSiteForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Site Name" hint="required">
          <Input value={f.orgName} onChange={v => set('orgName', v)} placeholder="Elitez Group" />
        </Field>
        <Field label="Homepage URL" hint="required">
          <Input value={f.websiteUrl} onChange={v => set('websiteUrl', v)} placeholder="https://www.elitez.asia/" />
        </Field>
      </div>
      <Field label="">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.hasSearchAction}
                 onChange={e => set('hasSearchAction', e.target.checked)}
                 className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Enable Sitelinks Search Box (SearchAction)</span>
        </label>
      </Field>
      {f.hasSearchAction && (
        <Field label="Search URL Template" hint="use {search_term_string} as placeholder">
          <Input value={f.searchTemplate} onChange={v => set('searchTemplate', v)}
                 placeholder="https://www.elitez.asia/search?q={search_term_string}" />
        </Field>
      )}
    </div>
  );
}

function BreadcrumbForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  function updateCrumb(i: number, field: 'name' | 'url', value: string) {
    const updated = f.breadcrumbs.map((b, idx) => idx === i ? { ...b, [field]: value } : b);
    set('breadcrumbs', updated);
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Define each level of the breadcrumb trail, starting from Home.</p>
      {f.breadcrumbs.map((b, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-slate-400 w-6 text-center flex-shrink-0">{i + 1}.</span>
          <input value={b.name} onChange={e => updateCrumb(i, 'name', e.target.value)}
                 placeholder="Level name (e.g. Home, Services, Recruitment)"
                 className="input-base text-sm py-2 flex-1" />
          <input value={b.url} onChange={e => updateCrumb(i, 'url', e.target.value)}
                 placeholder="https://…"
                 className="input-base text-sm py-2 flex-1" />
          {f.breadcrumbs.length > 2 && (
            <button onClick={() => set('breadcrumbs', f.breadcrumbs.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 text-lg leading-none flex-shrink-0">×</button>
          )}
        </div>
      ))}
      <button onClick={() => set('breadcrumbs', [...f.breadcrumbs, { name: '', url: '' }])}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Level</button>
    </div>
  );
}

function FAQPageForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  function updateFAQ(i: number, field: 'question' | 'answer', value: string) {
    const updated = f.faqs.map((faq, idx) => idx === i ? { ...faq, [field]: value } : faq);
    set('faqs', updated);
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Add your FAQ pairs. These should match the visible Q&amp;A content on the page exactly.</p>
      {f.faqs.map((faq, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Q&amp;A #{i + 1}</span>
            {f.faqs.length > 1 && (
              <button onClick={() => set('faqs', f.faqs.filter((_, idx) => idx !== i))}
                      className="text-xs text-red-400 hover:text-red-600">Remove</button>
            )}
          </div>
          <Input value={faq.question} onChange={v => updateFAQ(i, 'question', v)}
                 placeholder="What services does Elitez offer?" />
          <Textarea value={faq.answer} onChange={v => updateFAQ(i, 'answer', v)}
                    placeholder="Elitez offers permanent recruitment, contract staffing, payroll outsourcing…"
                    rows={2} />
        </div>
      ))}
      <button onClick={() => set('faqs', [...f.faqs, { question: '', answer: '' }])}
              className="btn-secondary text-sm">+ Add Q&amp;A</button>
    </div>
  );
}

function ArticleForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Article Headline" hint="matches H1, max 110 chars">
        <Input value={f.artHeadline} onChange={v => set('artHeadline', v)}
               placeholder="10 Trends in HR Outsourcing for 2025" />
      </Field>
      <Field label="Short Description" hint="160 chars max">
        <Textarea value={f.artDescription} onChange={v => set('artDescription', v)}
                  placeholder="Key takeaways about HR outsourcing trends…" rows={2} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Article URL">
          <Input value={f.artUrl} onChange={v => set('artUrl', v)} placeholder="https://www.elitez.asia/blog/hr-outsourcing-trends" />
        </Field>
        <Field label="Featured Image URL" hint="1200×630px recommended">
          <Input value={f.artImage} onChange={v => set('artImage', v)} placeholder="https://…/featured-image.jpg" />
        </Field>
        <Field label="Author Name">
          <Input value={f.artAuthorName} onChange={v => set('artAuthorName', v)} placeholder="Jane Smith" />
        </Field>
        <Field label="Publisher Name">
          <Input value={f.artPublisherName} onChange={v => set('artPublisherName', v)} placeholder="Elitez Group" />
        </Field>
        <Field label="Publisher Logo URL">
          <Input value={f.artPublisherLogo} onChange={v => set('artPublisherLogo', v)} placeholder="https://…/logo.png" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date Published">
          <Input type="date" value={f.artDatePublished} onChange={v => set('artDatePublished', v)} />
        </Field>
        <Field label="Date Modified">
          <Input type="date" value={f.artDateModified} onChange={v => set('artDateModified', v)} />
        </Field>
      </div>
    </div>
  );
}

function ServiceForm({ f, set }: { f: FormState; set: (k: keyof FormState, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Service Name" hint="required">
        <Input value={f.svcName} onChange={v => set('svcName', v)} placeholder="Permanent Recruitment" />
      </Field>
      <Field label="Description">
        <Textarea value={f.svcDescription} onChange={v => set('svcDescription', v)}
                  placeholder="End-to-end permanent recruitment solutions…" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Service Page URL">
          <Input value={f.svcUrl} onChange={v => set('svcUrl', v)} placeholder="https://www.elitez.asia/services/recruitment" />
        </Field>
        <Field label="Service Type / Category">
          <Input value={f.svcType} onChange={v => set('svcType', v)} placeholder="Recruitment Service" />
        </Field>
        <Field label="Provider Name">
          <Input value={f.svcProviderName} onChange={v => set('svcProviderName', v)} placeholder="Elitez Group" />
        </Field>
        <Field label="Provider URL">
          <Input value={f.svcProviderUrl} onChange={v => set('svcProviderUrl', v)} placeholder="https://www.elitez.asia/" />
        </Field>
        <Field label="Area Served">
          <Input value={f.svcAreaServed} onChange={v => set('svcAreaServed', v)} placeholder="Singapore" />
        </Field>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SchemaGenerator component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialDomain?: string;
  initialUrl?: string;
}

export default function SchemaGenerator({ initialDomain, initialUrl }: Props) {
  const [activeType, setActiveType] = useState<SchemaType>('Organization');
  const [form, setForm]             = useState<FormState>({
    ...DEFAULT_FORM,
    websiteUrl:  initialUrl    ? (initialUrl.startsWith('http') ? initialUrl : `https://${initialUrl}`) : '',
    orgName:     initialDomain ? initialDomain : '',
    svcProviderUrl: initialUrl  ? (initialUrl.startsWith('http') ? initialUrl : `https://${initialUrl}`) : '',
    artPublisherName: initialDomain ?? '',
  });

  const set = useCallback((key: keyof FormState, value: unknown) => {
    setForm(f => ({ ...f, [key]: value as FormState[keyof FormState] }));
  }, []);

  function applyElitezDefaults() {
    setForm(f => ({
      ...f,
      orgName:     ELITEZ_DEFAULTS.orgName,
      websiteUrl:  ELITEZ_DEFAULTS.websiteUrl,
      description: ELITEZ_DEFAULTS.description,
      country:     ELITEZ_DEFAULTS.country,
      addressCountry: ELITEZ_DEFAULTS.addressCountry,
      bizType:     ELITEZ_DEFAULTS.businessType,
      linkedIn:    ELITEZ_DEFAULTS.linkedIn,
      // Leave phone/address/logo blank — must be verified
      artPublisherName: ELITEZ_DEFAULTS.orgName,
      svcProviderName:  ELITEZ_DEFAULTS.orgName,
      svcProviderUrl:   ELITEZ_DEFAULTS.websiteUrl,
      svcAreaServed:    ELITEZ_DEFAULTS.country,
    }));
  }

  const generatedSchema = buildSchema(activeType, form);
  const schemaJson      = JSON.stringify(generatedSchema, null, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Schema Markup Generator</h2>
          <p className="text-sm text-slate-500 mt-1">
            Build valid JSON-LD schema for any page type. Copy the output and add it to your site.
          </p>
        </div>
        <button onClick={applyElitezDefaults}
                className="btn-secondary flex items-center gap-2">
          <span>🏢</span>
          Use Elitez Defaults
        </button>
      </div>

      {/* Elitez defaults notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">ℹ️ About "Use Elitez Defaults"</p>
        <p>Pre-fills business name, website URL, country, and known social profiles.
           <strong> Telephone, physical address, and logo URL must be verified and added manually</strong> before publishing.</p>
      </div>

      {/* Schema type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SCHEMA_TYPES.map(st => (
          <button
            key={st.type}
            onClick={() => setActiveType(st.type)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
              activeType === st.type
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <span className="text-2xl">{st.icon}</span>
            <span className="text-xs font-semibold leading-tight">{st.label}</span>
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {SCHEMA_TYPES.find(s => s.type === activeType)?.icon}{' '}
              {activeType} Schema Fields
            </h3>
          </div>
          <div className="card-body space-y-4">
            {activeType === 'Organization'   && <OrganizationForm  f={form} set={set} />}
            {activeType === 'LocalBusiness'  && <LocalBusinessForm f={form} set={set} />}
            {activeType === 'WebSite'        && <WebSiteForm       f={form} set={set} />}
            {activeType === 'BreadcrumbList' && <BreadcrumbForm    f={form} set={set} />}
            {activeType === 'FAQPage'        && <FAQPageForm       f={form} set={set} />}
            {activeType === 'Article'        && <ArticleForm       f={form} set={set} />}
            {activeType === 'Service'        && <ServiceForm       f={form} set={set} />}
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-800">Live Preview — Generated JSON-LD</h3>
              <p className="text-xs text-slate-400 mt-1">Updates in real-time as you fill in the form</p>
            </div>
            <div className="card-body">
              <SchemaPreview
                raw={schemaJson}
                isValid
                types={[activeType]}
                defaultExpanded
              />
            </div>
          </div>

          {/* Installation instructions */}
          <InstallInstructions schema={generatedSchema} type={activeType} />
        </div>
      </div>
    </div>
  );
}
