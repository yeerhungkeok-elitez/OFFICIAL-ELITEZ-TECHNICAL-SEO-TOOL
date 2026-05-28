// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Schema Audit Checks (V2)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PageData, SchemaIssue, SchemaAuditResult, PageSchemaInfo,
  IssueSeverity, RecommendedSchemaType,
} from '@/types/seo';
import {
  detectPageIntent, checkSchemaProperties, stripParsed,
  RECOMMENDED_TYPES_BY_INTENT, UNIVERSAL_RECOMMENDED,
  ARTICLE_TYPES, ORGANIZATION_TYPES,
} from './schemaExtractor';

let _id = 0;
function mkId() { return `si_${++_id}`; }

// ─── Schema issue builder ─────────────────────────────────────────────────────

function si(
  type: string,
  severity: IssueSeverity,
  schemaType: string,
  problem: string,
  technicalDetail: string,
  clientExplanation: string,
  whyItMatters: string,
  recommendedFix: string,
  developerInstruction: string,
  fixSafety: SchemaIssue['fixSafety'],
  affectedPages: string[],
  suggestedSchema: Record<string, unknown> | null = null,
): SchemaIssue {
  return {
    id: mkId(),
    type,
    severity,
    schemaType,
    problem,
    technicalDetail,
    clientExplanation,
    whyItMatters,
    recommendedFix,
    developerInstruction,
    fixSafety,
    affectedPages,
    count: affectedPages.length,
    suggestedSchema,
  };
}

// ─── Schema template builders ──────────────────────────────────────────────────

function orgSchema(domain: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `https://${domain}/#organization`,
    name: 'Your Organisation Name',
    url: `https://${domain}/`,
    logo: {
      '@type': 'ImageObject',
      url: `https://${domain}/logo.png`,
      width: 200,
      height: 60,
    },
    description: 'Describe your organisation in 1–2 sentences.',
    sameAs: [
      'https://www.linkedin.com/company/your-company',
      'https://www.facebook.com/your-company',
    ],
  };
}

function websiteSchema(domain: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `https://${domain}/#website`,
    name: 'Your Site Name',
    url: `https://${domain}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `https://${domain}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbSchema(url: string, title: string): Record<string, unknown> {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  let domain = '';
  try { domain = new URL(url).origin; } catch { domain = ''; }

  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: domain + '/' },
    ...parts.map((part, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: title || part.replace(/-/g, ' '),
      item: domain + '/' + parts.slice(0, i + 1).join('/') + '/',
    })),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function articleSchema(url: string, title: string | null, domain: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: title ?? 'Article Headline',
    description: 'Article description (160 characters max).',
    url,
    image: {
      '@type': 'ImageObject',
      url: `https://${domain}/og-image.jpg`,
      width: 1200,
      height: 630,
    },
    datePublished: new Date().toISOString().slice(0, 10),
    dateModified: new Date().toISOString().slice(0, 10),
    author: {
      '@type': 'Person',
      name: 'Author Name',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Publisher Name',
      logo: {
        '@type': 'ImageObject',
        url: `https://${domain}/logo.png`,
      },
    },
  };
}

function serviceSchema(url: string, title: string | null, domain: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: title ?? 'Service Name',
    description: 'Describe what this service does and who it is for.',
    url,
    provider: {
      '@type': 'Organization',
      name: 'Your Organisation Name',
      url: `https://${domain}/`,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Singapore',
    },
    serviceType: 'Your Service Category',
  };
}

function faqSchema(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faqpage`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is your first frequently asked question?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your detailed answer to the first question.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is your second frequently asked question?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your detailed answer to the second question.',
        },
      },
    ],
  };
}

// ─── Core check functions ──────────────────────────────────────────────────────

export function runSchemaChecks(pages: PageData[]): SchemaIssue[] {
  _id = 0; // reset counter
  const issues: SchemaIssue[] = [];

  let domain = '';
  try { domain = new URL(pages[0]?.url ?? '').hostname; } catch { domain = 'example.com'; }

  // ── 1. Invalid JSON-LD ─────────────────────────────────────────────────────
  const invalidPages = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => !b.isValid)
  );
  if (invalidPages.length > 0) {
    const detail = invalidPages.flatMap(p =>
      (p.schemaBlocks ?? [])
        .filter(b => !b.isValid)
        .map(b => `${p.url}: ${b.parseError ?? 'Parse error'}`)
    ).slice(0, 5).join('; ');

    issues.push(si(
      'invalid-json',
      'critical',
      'JSON-LD',
      `${invalidPages.length} page${invalidPages.length > 1 ? 's have' : ' has'} invalid JSON-LD that Google cannot read`,
      `Malformed JSON-LD detected: ${detail}`,
      `Some pages have broken structured data code that Google cannot process — it's like a form with a syntax error.`,
      `Invalid JSON-LD is silently ignored by Google. All rich result eligibility is lost for affected pages.`,
      `Fix JSON syntax errors. Use a JSON validator at jsonlint.com. Common causes: trailing commas, unquoted keys, single quotes.`,
      `Run each block through JSON.parse() in your browser console. Fix: trailing commas before }, unescaped quotes in strings, ensure double-quoted keys.`,
      'requires-approval',
      invalidPages.map(p => p.url),
      null,
    ));
  }

  // ── 2. Missing Organization on homepage ────────────────────────────────────
  const homepage = pages.find(p => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  }) ?? pages.find(p => detectPageIntent(p) === 'homepage');

  if (homepage) {
    const hasOrg = (homepage.schemaBlocks ?? []).some(b =>
      b.types.some(t => ORGANIZATION_TYPES.has(t))
    );
    if (!hasOrg) {
      issues.push(si(
        'missing-organization',
        'critical',
        'Organization',
        'Homepage is missing Organization schema',
        `The homepage at ${homepage.url} has no Organization or LocalBusiness JSON-LD block.`,
        `Your homepage doesn't tell Google who you are as a business. This is the most important schema to have.`,
        `Organization schema establishes your brand entity in Google's Knowledge Graph. It enables rich results for branded searches and improves entity recognition.`,
        `Add an Organization (or LocalBusiness) JSON-LD block to the homepage. Include: name, url, logo, sameAs social links, and description.`,
        `Add to homepage <head> or _document.tsx:\n<script type="application/ld+json">\n${JSON.stringify(orgSchema(domain), null, 2)}\n</script>`,
        'safe',
        [homepage.url],
        orgSchema(domain),
      ));
    }
  }

  // ── 3. Missing WebSite on homepage ─────────────────────────────────────────
  if (homepage) {
    const hasWebSite = (homepage.schemaBlocks ?? []).some(b => b.types.includes('WebSite'));
    if (!hasWebSite) {
      issues.push(si(
        'missing-website',
        'high',
        'WebSite',
        'Homepage is missing WebSite schema',
        `No WebSite JSON-LD found on ${homepage.url}.`,
        `Your homepage is missing the WebSite schema that enables Google's sitelinks search box and confirms your site's identity.`,
        `WebSite schema enables the sitelinks search box in branded search results and formally registers your site URL with Google.`,
        `Add a WebSite JSON-LD block to the homepage alongside Organization schema. Include name, url, and potentialAction for search.`,
        `Add to homepage:\n<script type="application/ld+json">\n${JSON.stringify(websiteSchema(domain), null, 2)}\n</script>`,
        'safe',
        [homepage.url],
        websiteSchema(domain),
      ));
    }
  }

  // ── 4. Missing BreadcrumbList on non-homepage pages ────────────────────────
  const nonHomeIndexable = pages.filter(p => {
    if (p.statusCode !== 200 || p.isNoindex) return false;
    try { return new URL(p.url).pathname !== '/'; } catch { return true; }
  });

  const noBreadcrumbPages = nonHomeIndexable.filter(p =>
    !(p.schemaBlocks ?? []).some(b => b.types.includes('BreadcrumbList'))
  );

  if (noBreadcrumbPages.length > 0 && nonHomeIndexable.length > 0) {
    const ratio = noBreadcrumbPages.length / nonHomeIndexable.length;
    const sev: IssueSeverity = ratio > 0.7 ? 'high' : ratio > 0.3 ? 'medium' : 'low';

    issues.push(si(
      'missing-breadcrumb',
      sev,
      'BreadcrumbList',
      `${noBreadcrumbPages.length} page${noBreadcrumbPages.length > 1 ? 's' : ''} missing BreadcrumbList schema`,
      `${noBreadcrumbPages.length} of ${nonHomeIndexable.length} non-homepage indexable pages have no BreadcrumbList JSON-LD.`,
      `Most pages don't have breadcrumb code, so Google won't show navigation trail breadcrumbs in search results.`,
      `Breadcrumbs in SERPs improve click-through rate by showing content hierarchy. They help Google understand your site structure.`,
      `Add BreadcrumbList schema to every non-homepage page. Use a layout component to generate it dynamically from the URL path.`,
      `Example BreadcrumbList:\n${JSON.stringify(breadcrumbSchema(noBreadcrumbPages[0].url, noBreadcrumbPages[0].title ?? ''), null, 2)}\n\nIn Next.js layout.tsx, generate dynamically from usePathname().`,
      'safe',
      noBreadcrumbPages.map(p => p.url),
      breadcrumbSchema(noBreadcrumbPages[0].url, noBreadcrumbPages[0].title ?? ''),
    ));
  }

  // ── 5. Missing Article on blog/news pages ──────────────────────────────────
  const blogPages = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex && detectPageIntent(p) === 'blog'
  );
  const blogNoArticle = blogPages.filter(p =>
    !(p.schemaBlocks ?? []).some(b => b.types.some(t => ARTICLE_TYPES.has(t)))
  );
  if (blogNoArticle.length > 0) {
    issues.push(si(
      'missing-article',
      'high',
      'Article',
      `${blogNoArticle.length} blog/article page${blogNoArticle.length > 1 ? 's' : ''} missing Article schema`,
      `Blog/article pages detected without Article, BlogPosting, or NewsArticle JSON-LD.`,
      `Your blog posts don't have article schema — this means they won't be eligible for rich results in Google News or article carousels.`,
      `Article schema is required to appear in Google News, Top Stories, and article rich results. These placements can drive significant traffic.`,
      `Add Article (or BlogPosting) JSON-LD to each blog/article page. Minimum: headline, author, datePublished, publisher, image.`,
      `Add to article pages:\n${JSON.stringify(articleSchema(blogNoArticle[0].url, blogNoArticle[0].title, domain), null, 2)}`,
      'safe',
      blogNoArticle.map(p => p.url),
      articleSchema(blogNoArticle[0].url, blogNoArticle[0].title, domain),
    ));
  }

  // ── 6. Missing Service on service pages ────────────────────────────────────
  const servicePages = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex && detectPageIntent(p) === 'service'
  );
  const serviceNoSchema = servicePages.filter(p =>
    !(p.schemaBlocks ?? []).some(b => b.types.includes('Service'))
  );
  if (serviceNoSchema.length > 0) {
    issues.push(si(
      'missing-service',
      'high',
      'Service',
      `${serviceNoSchema.length} service page${serviceNoSchema.length > 1 ? 's' : ''} missing Service schema`,
      `Service pages detected without Service JSON-LD.`,
      `Your service pages don't tell Google what specific services you offer, limiting your visibility in service-related searches.`,
      `Service schema helps Google understand and match your services to relevant user queries. It's especially important for B2B service businesses.`,
      `Add Service schema to each service page with name, description, provider (your Organisation), and areaServed.`,
      `Add to service pages:\n${JSON.stringify(serviceSchema(serviceNoSchema[0].url, serviceNoSchema[0].title, domain), null, 2)}`,
      'safe',
      serviceNoSchema.map(p => p.url),
      serviceSchema(serviceNoSchema[0].url, serviceNoSchema[0].title, domain),
    ));
  }

  // ── 7. Missing FAQPage on FAQ pages ────────────────────────────────────────
  const faqPages = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex && detectPageIntent(p) === 'faq'
  );
  const faqNoSchema = faqPages.filter(p =>
    !(p.schemaBlocks ?? []).some(b => b.types.includes('FAQPage'))
  );
  if (faqNoSchema.length > 0) {
    issues.push(si(
      'missing-faqpage',
      'high',
      'FAQPage',
      `${faqNoSchema.length} FAQ page${faqNoSchema.length > 1 ? 's' : ''} missing FAQPage schema`,
      `Pages with FAQ-like URLs/titles detected without FAQPage JSON-LD.`,
      `Your FAQ pages are missing the special code that makes Google show questions and answers directly in search results.`,
      `FAQPage schema can produce rich results showing expanded Q&A directly in the SERP, dramatically increasing visibility and click-through rate.`,
      `Add FAQPage JSON-LD with mainEntity array of Question/Answer pairs matching the visible FAQ content on the page.`,
      `Add to FAQ pages:\n${JSON.stringify(faqSchema(faqNoSchema[0].url), null, 2)}\n\nEnsure questions in schema match questions visible on the page.`,
      'needs-review',
      faqNoSchema.map(p => p.url),
      faqSchema(faqNoSchema[0].url),
    ));
  }

  // ── 8. Duplicate schema types on same page ─────────────────────────────────
  const dupPages = pages.filter(p => {
    const blocks = p.schemaBlocks ?? [];
    const allTypes = blocks.flatMap(b => b.types);
    const seen = new Set<string>();
    return allTypes.some(t => { if (seen.has(t)) return true; seen.add(t); return false; });
  });
  if (dupPages.length > 0) {
    issues.push(si(
      'duplicate-type',
      'medium',
      'Multiple',
      `${dupPages.length} page${dupPages.length > 1 ? 's' : ''} with duplicate schema types`,
      `Multiple JSON-LD blocks declare the same @type on a single page. Google may process only one.`,
      `Some pages have the same type of structured data added more than once, which can confuse Google about which one to use.`,
      `Duplicate schema of the same type on one page may lead to Google ignoring all duplicates except one, or flagging as spam.`,
      `Merge duplicate schema objects into one, or use the @graph pattern to include multiple types in a single script tag.`,
      `Merge into a single @graph block:\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@graph": [/* all schema objects */]\n}\n</script>`,
      'needs-review',
      dupPages.map(p => p.url),
      null,
    ));
  }

  // ── 9. Organization schema missing logo ────────────────────────────────────
  const orgNoLogo = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      const orgBlock = b.types.some(t => ORGANIZATION_TYPES.has(t));
      if (!orgBlock || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties(
        b.types.find(t => ORGANIZATION_TYPES.has(t)) ?? 'Organization',
        b.parsed
      );
      return missingProperties.includes('logo');
    })
  );
  if (orgNoLogo.length > 0) {
    issues.push(si(
      'missing-property-org-logo',
      'medium',
      'Organization',
      `${orgNoLogo.length} page${orgNoLogo.length > 1 ? 's' : ''} have Organization schema missing the logo property`,
      `Organization JSON-LD blocks found without a "logo" property (ImageObject).`,
      `Your business schema doesn't include a logo, so Google can't show your logo in Knowledge Panel search results.`,
      `The logo property in Organization schema populates your brand logo in Google's Knowledge Panel and branded search results.`,
      `Add a logo property to your Organization schema: "logo": { "@type": "ImageObject", "url": "https://domain.com/logo.png", "width": 200, "height": 60 }`,
      `Add to Organization schema:\n"logo": {\n  "@type": "ImageObject",\n  "url": "https://${domain}/logo.png",\n  "width": 200,\n  "height": 60\n}`,
      'safe',
      orgNoLogo.map(p => p.url),
      null,
    ));
  }

  // ── 10. Organization schema missing sameAs ─────────────────────────────────
  const orgNoSameAs = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      const hasOrgType = b.types.some(t => ORGANIZATION_TYPES.has(t));
      if (!hasOrgType || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties(
        b.types.find(t => ORGANIZATION_TYPES.has(t)) ?? 'Organization',
        b.parsed
      );
      return missingProperties.includes('sameAs');
    })
  );
  if (orgNoSameAs.length > 0) {
    issues.push(si(
      'missing-property-org-sameas',
      'medium',
      'Organization',
      `${orgNoSameAs.length} page${orgNoSameAs.length > 1 ? 's' : ''} have Organization schema missing sameAs social links`,
      `Organization JSON-LD blocks without a "sameAs" array linking to social profiles.`,
      `Your business schema doesn't link to your social media profiles, which weakens your brand's credibility signals in Google's eyes.`,
      `The sameAs property connects your website to your verified social profiles, strengthening your brand entity in the Knowledge Graph.`,
      `Add a "sameAs" array with your LinkedIn, Facebook, Twitter, and other social profile URLs.`,
      `"sameAs": [\n  "https://www.linkedin.com/company/your-company",\n  "https://www.facebook.com/your-company",\n  "https://twitter.com/your-company"\n]`,
      'safe',
      orgNoSameAs.map(p => p.url),
      null,
    ));
  }

  // ── 11. LocalBusiness missing address ──────────────────────────────────────
  const lbNoAddress = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      if (!b.types.includes('LocalBusiness') || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties('LocalBusiness', b.parsed);
      return missingProperties.some(mp => mp.startsWith('address'));
    })
  );
  if (lbNoAddress.length > 0) {
    issues.push(si(
      'missing-property-lb-address',
      'high',
      'LocalBusiness',
      `${lbNoAddress.length} page${lbNoAddress.length > 1 ? 's' : ''} have LocalBusiness schema missing address`,
      `LocalBusiness JSON-LD without a PostalAddress object in the "address" property.`,
      `Your local business schema is missing the address, which limits your eligibility for local search results and Google Maps prominence.`,
      `Address is essential for Local SEO. Without it, your LocalBusiness schema cannot contribute to local pack rankings.`,
      `Add a complete PostalAddress object with streetAddress, addressLocality, postalCode, and addressCountry.`,
      `"address": {\n  "@type": "PostalAddress",\n  "streetAddress": "123 Business Street",\n  "addressLocality": "Singapore",\n  "postalCode": "018989",\n  "addressCountry": "SG"\n}`,
      'needs-review',
      lbNoAddress.map(p => p.url),
      null,
    ));
  }

  // ── 12. LocalBusiness missing telephone ────────────────────────────────────
  const lbNoPhone = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      if (!b.types.includes('LocalBusiness') || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties('LocalBusiness', b.parsed);
      return missingProperties.includes('telephone');
    })
  );
  if (lbNoPhone.length > 0) {
    issues.push(si(
      'missing-property-lb-telephone',
      'medium',
      'LocalBusiness',
      `${lbNoPhone.length} page${lbNoPhone.length > 1 ? 's' : ''} have LocalBusiness schema missing telephone`,
      `LocalBusiness JSON-LD without a "telephone" property.`,
      `Your local business schema is missing a phone number, which means customers can't call you directly from search results.`,
      `A telephone number in LocalBusiness schema can enable click-to-call features in mobile search and Google Maps.`,
      `Add "telephone": "+65-XXXX-XXXX" to your LocalBusiness schema. Use E.164 format: +[country code][number].`,
      `"telephone": "+65-6XXX-XXXX"`,
      'needs-review',
      lbNoPhone.map(p => p.url),
      null,
    ));
  }

  // ── 13. Article missing headline ───────────────────────────────────────────
  const artNoHeadline = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      const artType = b.types.find(t => ARTICLE_TYPES.has(t));
      if (!artType || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties(artType, b.parsed);
      return missingProperties.includes('headline');
    })
  );
  if (artNoHeadline.length > 0) {
    issues.push(si(
      'missing-property-article-headline',
      'medium',
      'Article',
      `${artNoHeadline.length} article${artNoHeadline.length > 1 ? 's' : ''} missing required "headline" property`,
      `Article/BlogPosting JSON-LD blocks without a "headline" property.`,
      `Some articles have structured data but are missing the required headline field, which Google needs to create article rich results.`,
      `"headline" is a required property for Article rich results. Without it, Google may reject the schema entirely.`,
      `Add "headline" to Article schema. It should match the page's H1/title tag and be under 110 characters.`,
      `"headline": "${artNoHeadline[0].title ?? 'Your Article Headline Here'}"`,
      'safe',
      artNoHeadline.map(p => p.url),
      null,
    ));
  }

  // ── 14. Article missing datePublished ──────────────────────────────────────
  const artNoPubDate = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      const artType = b.types.find(t => ARTICLE_TYPES.has(t));
      if (!artType || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties(artType, b.parsed);
      return missingProperties.includes('datePublished');
    })
  );
  if (artNoPubDate.length > 0) {
    issues.push(si(
      'missing-property-article-date',
      'medium',
      'Article',
      `${artNoPubDate.length} article${artNoPubDate.length > 1 ? 's' : ''} missing "datePublished" property`,
      `Article JSON-LD blocks without a "datePublished" ISO-8601 date string.`,
      `Some articles don't have a published date in their structured data, which limits their eligibility for time-sensitive search features.`,
      `datePublished is required for Top Stories and News results. It also signals content freshness to Google.`,
      `Add "datePublished": "YYYY-MM-DD" in ISO 8601 format. Also add "dateModified" for update tracking.`,
      `"datePublished": "${new Date().toISOString().slice(0, 10)}",\n"dateModified": "${new Date().toISOString().slice(0, 10)}"`,
      'safe',
      artNoPubDate.map(p => p.url),
      null,
    ));
  }

  // ── 15. Article missing image ──────────────────────────────────────────────
  const artNoImage = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      const artType = b.types.find(t => ARTICLE_TYPES.has(t));
      if (!artType || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties(artType, b.parsed);
      return missingProperties.includes('image');
    })
  );
  if (artNoImage.length > 0) {
    issues.push(si(
      'missing-property-article-image',
      'medium',
      'Article',
      `${artNoImage.length} article${artNoImage.length > 1 ? 's' : ''} missing "image" property`,
      `Article JSON-LD blocks without an "image" property (ImageObject or URL).`,
      `Some articles are missing an image in their structured data, which prevents them from appearing with visual thumbnails in search results.`,
      `The image property is required for Top Stories and article carousels. Articles without images are less likely to get rich result treatment.`,
      `Add an "image" property pointing to the article's featured image (minimum 696px wide, ideally 1200×630px).`,
      `"image": {\n  "@type": "ImageObject",\n  "url": "https://${domain}/images/article-featured.jpg",\n  "width": 1200,\n  "height": 630\n}`,
      'safe',
      artNoImage.map(p => p.url),
      null,
    ));
  }

  // ── 16. BreadcrumbList missing itemListElement ─────────────────────────────
  const bcNoItems = pages.filter(p =>
    (p.schemaBlocks ?? []).some(b => {
      if (!b.types.includes('BreadcrumbList') || !b.parsed) return false;
      const { missingProperties } = checkSchemaProperties('BreadcrumbList', b.parsed);
      return missingProperties.includes('itemListElement') ||
             missingProperties.includes('itemListElement[items]');
    })
  );
  if (bcNoItems.length > 0) {
    issues.push(si(
      'missing-property-breadcrumb-items',
      'medium',
      'BreadcrumbList',
      `${bcNoItems.length} page${bcNoItems.length > 1 ? 's' : ''} have BreadcrumbList schema with no items`,
      `BreadcrumbList JSON-LD found with empty or missing itemListElement array.`,
      `Some pages have breadcrumb schema code but it's empty — it has no breadcrumb items, so Google cannot use it.`,
      `An empty BreadcrumbList is invalid and will be rejected by Google's Rich Results Test.`,
      `Populate itemListElement with an array of ListItem objects, one per breadcrumb level.`,
      `"itemListElement": [\n  {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://${domain}/"},\n  {"@type": "ListItem", "position": 2, "name": "Page Name", "item": "${bcNoItems[0].url}"}\n]`,
      'safe',
      bcNoItems.map(p => p.url),
      null,
    ));
  }

  // ── 17. Schema URL does not match canonical ────────────────────────────────
  const urlMismatch = pages.filter(p => {
    if (!p.canonical) return false;
    return (p.schemaBlocks ?? []).some(b => {
      if (!b.parsed) return false;
      const schemaUrl = (b.parsed as Record<string, unknown>)['url'];
      if (typeof schemaUrl !== 'string') return false;
      // Normalise trailing slashes for comparison
      const norm1 = schemaUrl.replace(/\/$/, '');
      const norm2 = p.canonical!.replace(/\/$/, '');
      return norm1 !== norm2 && norm1 !== p.url.replace(/\/$/, '');
    });
  });
  if (urlMismatch.length > 0) {
    issues.push(si(
      'url-mismatch',
      'low',
      'Multiple',
      `${urlMismatch.length} page${urlMismatch.length > 1 ? 's' : ''} have schema URL that doesn't match canonical`,
      `Schema objects contain a "url" property that differs from the page's canonical tag.`,
      `Some pages have a mismatch between their schema URL and their canonical tag, which can confuse Google about the definitive page address.`,
      `URL inconsistencies signal poor data hygiene. Google may distrust other schema properties on the same page.`,
      `Ensure the "url" property in all schema objects matches the canonical URL exactly (including https:// and trailing slash consistency).`,
      `Update schema "url" to match canonical: "${urlMismatch[0].canonical}".\nUse the same URL in both <link rel="canonical"> and schema "url" properties.`,
      'safe',
      urlMismatch.map(p => p.url),
      null,
    ));
  }

  return issues.sort((a, b) => {
    const order: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });
}

// ─── Build recommended schema types ──────────────────────────────────────────

export function buildRecommendedTypes(pages: PageData[]): RecommendedSchemaType[] {
  const recommended: RecommendedSchemaType[] = [];
  let domain = 'example.com';
  try { domain = new URL(pages[0]?.url ?? '').hostname; } catch { /* ok */ }

  // Check homepage
  const home = pages.find(p => {
    try { return new URL(p.url).pathname === '/'; } catch { return false; }
  }) ?? pages.find(p => detectPageIntent(p) === 'homepage');

  if (home) {
    const hasOrg = (home.schemaBlocks ?? []).some(b => b.types.some(t => ORGANIZATION_TYPES.has(t)));
    if (!hasOrg) {
      recommended.push({
        schemaType: 'Organization',
        reason: 'Every business homepage should declare its identity with Organization schema.',
        pages: [home.url],
        priority: 'critical',
        suggestedSchema: orgSchema(domain),
      });
    }
    const hasSite = (home.schemaBlocks ?? []).some(b => b.types.includes('WebSite'));
    if (!hasSite) {
      recommended.push({
        schemaType: 'WebSite',
        reason: 'WebSite schema enables sitelinks search box and confirms your root URL.',
        pages: [home.url],
        priority: 'high',
        suggestedSchema: websiteSchema(domain),
      });
    }
  }

  // Blog pages missing Article
  const blogNeedingArticle = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex &&
    detectPageIntent(p) === 'blog' &&
    !(p.schemaBlocks ?? []).some(b => b.types.some(t => ARTICLE_TYPES.has(t)))
  );
  if (blogNeedingArticle.length > 0) {
    recommended.push({
      schemaType: 'Article',
      reason: 'Blog/article pages should use Article or BlogPosting schema for News/article rich results.',
      pages: blogNeedingArticle.map(p => p.url),
      priority: 'high',
      suggestedSchema: articleSchema(blogNeedingArticle[0].url, blogNeedingArticle[0].title, domain),
    });
  }

  // Service pages missing Service
  const serviceNeedingSchema = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex &&
    detectPageIntent(p) === 'service' &&
    !(p.schemaBlocks ?? []).some(b => b.types.includes('Service'))
  );
  if (serviceNeedingSchema.length > 0) {
    recommended.push({
      schemaType: 'Service',
      reason: 'Service pages should use Service schema to describe what you offer and to whom.',
      pages: serviceNeedingSchema.map(p => p.url),
      priority: 'high',
      suggestedSchema: serviceSchema(serviceNeedingSchema[0].url, serviceNeedingSchema[0].title, domain),
    });
  }

  // FAQ pages missing FAQPage
  const faqNeedingSchema = pages.filter(p =>
    p.statusCode === 200 && !p.isNoindex &&
    detectPageIntent(p) === 'faq' &&
    !(p.schemaBlocks ?? []).some(b => b.types.includes('FAQPage'))
  );
  if (faqNeedingSchema.length > 0) {
    recommended.push({
      schemaType: 'FAQPage',
      reason: 'FAQ pages should use FAQPage schema to show Q&A rich results in Google.',
      pages: faqNeedingSchema.map(p => p.url),
      priority: 'high',
      suggestedSchema: faqSchema(faqNeedingSchema[0].url),
    });
  }

  return recommended;
}

// ─── Build full schema audit result ──────────────────────────────────────────

export function buildSchemaAudit(pages: PageData[]): SchemaAuditResult {
  const issues = runSchemaChecks(pages);
  const recommendedTypes = buildRecommendedTypes(pages);

  // Build per-page schema info
  const pageSchemas: PageSchemaInfo[] = pages.map(p => {
    const blocks = p.schemaBlocks ?? [];
    const allTypes = [...new Set(blocks.flatMap(b => b.types))];
    const invalidCount = blocks.filter(b => !b.isValid).length;

    // Find duplicate types within this page
    const typeSeen = new Set<string>();
    const duplicateTypes: string[] = [];
    allTypes.forEach(t => {
      const count = blocks.filter(b => b.types.includes(t)).length;
      if (count > 1 && !duplicateTypes.includes(t)) duplicateTypes.push(t);
      typeSeen.add(t);
    });

    const intent = detectPageIntent(p);
    const recommended = RECOMMENDED_TYPES_BY_INTENT[intent] ?? [];
    const missingRecommended = recommended.filter(t => !allTypes.includes(t));

    return {
      url: p.url,
      hasSchema: blocks.some(b => b.isValid && b.types.length > 0),
      allTypes,
      invalidCount,
      duplicateTypes,
      pageIntent: intent,
      missingRecommended,
      blocks: blocks.map(b => stripParsed(b)),
    };
  });

  // Count schema types across all pages
  const typeCounts: Record<string, number> = {};
  pageSchemas.forEach(ps => {
    ps.allTypes.forEach(t => {
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    });
  });

  const totalBlocks     = pages.reduce((s, p) => s + (p.schemaBlocks ?? []).length, 0);
  const invalidBlocks   = pages.reduce((s, p) => s + (p.schemaBlocks ?? []).filter(b => !b.isValid).length, 0);
  const withSchema      = pageSchemas.filter(ps => ps.hasSchema).length;
  const withoutSchema   = pageSchemas.length - withSchema;
  const uniqueTypes     = Object.keys(typeCounts).length;
  const missingCritical = [
    ...(!typeCounts['Organization'] && !typeCounts['LocalBusiness'] ? ['Organization'] : []),
    ...(!typeCounts['WebSite'] ? ['WebSite'] : []),
  ];

  return {
    pageSchemas,
    issues,
    score: { overall: 0, validJson: 0, correctTypes: 0, requiredProperties: 0, noDuplicates: 0, contentConsistency: 0 }, // filled by schemaScoring
    typeCounts,
    recommendedTypes,
    summary: {
      totalPagesWithSchema: withSchema,
      totalPagesWithoutSchema: withoutSchema,
      totalSchemaBlocks: totalBlocks,
      invalidSchemaBlocks: invalidBlocks,
      uniqueSchemaTypes: uniqueTypes,
      missingCriticalTypes: missingCritical,
    },
  };
}
