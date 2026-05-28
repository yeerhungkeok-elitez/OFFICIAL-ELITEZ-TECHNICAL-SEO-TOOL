// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Fix Writer (V4)
// Orchestrates rule-based fix generation for all FixQueueItem types.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem, FixSuggestion, FixApprovalLevel } from '@/types/seo';
import { generateMeta }           from './metaGenerator';
import { generateHeadings }       from './headingGenerator';
import { generateFAQs }           from './faqGenerator';
import { buildPrompt }            from './aiPromptBuilder';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }

function base(
  item:      FixQueueItem,
  value:     string,
  rationale: string,
  before:    string,
  after:     string,
  wpInstr:   string,
  devInstr:  string,
  approval:  FixApprovalLevel = 'safe',
  risk?:     string,
  conf:      'high' | 'medium' | 'low' = 'medium',
): FixSuggestion {
  const { copyPrompt } = buildPrompt(item);
  return {
    fixType:              item.fixType,
    suggestedValue:       value,
    rationale,
    beforeCode:           before,
    afterCode:            after,
    wordpressInstruction: wpInstr,
    developerInstruction: devInstr,
    claudePrompt:         copyPrompt,
    approvalLevel:        approval,
    riskWarning:          risk,
    confidence:           conf,
    source:               'rule-based',
    generatedAt:          now(),
  };
}

// ─── Per-type fix generators ──────────────────────────────────────────────────

function fixSEOTitle(item: FixQueueItem): FixSuggestion {
  const { title, titleLen, meta: _m, rationale, brand } = generateMeta(item);
  const cur = item.page.title ?? '';

  return base(
    item,
    title,
    rationale,
    `<title>${cur || '(missing)'}</title>`,
    `<title>${title}</title>`,
    `1. Go to the page in WordPress.\n2. Scroll to the Yoast SEO / RankMath box.\n3. In the "SEO Title" field, enter:\n\n${title}\n\n4. Click "Update" to save.`,
    `Update the <title> tag in the page's <head> to:\n<title>${title}</title>\n\nIn Next.js: update the metadata export:\nexport const metadata = { title: '${title}' };`,
    'safe',
    undefined,
    titleLen >= 30 && titleLen <= 65 ? 'high' : 'medium',
  );
}

function fixMetaDescription(item: FixQueueItem): FixSuggestion {
  const { meta, metaLen, rationale } = generateMeta(item);
  const cur = item.page.metaDescription ?? '';

  return base(
    item,
    meta,
    rationale,
    cur
      ? `<meta name="description" content="${cur}">`
      : '<!-- meta description missing -->',
    `<meta name="description" content="${meta}">`,
    `1. Go to the page in WordPress.\n2. Scroll to the Yoast SEO / RankMath box.\n3. In the "Meta Description" field, enter:\n\n${meta}\n\n4. Click "Update" to save.`,
    `Add or update the meta description in <head>:\n<meta name="description" content="${meta}">\n\nIn Next.js:\nexport const metadata = { description: '${meta}' };`,
    'safe',
    undefined,
    metaLen >= 120 && metaLen <= 165 ? 'high' : 'medium',
  );
}

function fixH1(item: FixQueueItem): FixSuggestion {
  const { h1, h2s, rationale } = generateHeadings(item);
  const cur = item.page.h1Texts[0] ?? '';

  const h2preview = h2s.slice(0, 3).map(h => `  <h2>${h}</h2>`).join('\n');

  return base(
    item,
    h1,
    rationale + `\n\nSuggested H2 structure:\n${h2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
    cur ? `<h1>${cur}</h1>` : '<!-- H1 missing -->',
    `<h1>${h1}</h1>\n${h2preview}`,
    `1. Open the page in WordPress editor.\n2. Find the main heading (or add one at the top of content).\n3. Set it as "Heading 1 (H1)":\n\n${h1}\n\n4. Add these H2 sub-sections below:\n${h2s.map((h, i) => `   - ${h}`).join('\n')}\n\n5. Update the page.`,
    `Update (or add) the <h1> tag in the page content:\n<h1>${h1}</h1>\n\nSuggested H2 structure:\n${h2s.map(h => `<h2>${h}</h2>`).join('\n')}`,
    'safe',
    undefined,
    'high',
  );
}

function fixHeadingStructure(item: FixQueueItem): FixSuggestion {
  const { h2s, rationale } = generateHeadings(item);

  return base(
    item,
    h2s.join(' | '),
    rationale,
    `<!-- Current H2 count: ${item.page.h2Count} -->`,
    h2s.map(h => `<h2>${h}</h2>`).join('\n'),
    `Add the following H2 sections to your page content in WordPress:\n${h2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
    `Add these H2 elements to the page content:\n${h2s.map(h => `<h2>${h}</h2>`).join('\n')}`,
    'safe',
    undefined,
    'medium',
  );
}

function fixFAQContent(item: FixQueueItem): FixSuggestion {
  const { faqs, safetyWarning, rationale } = generateFAQs(item);
  const faqText = faqs.map((f, i) => `Q${i + 1}: ${f.question}\nA: ${f.answer}`).join('\n\n');

  return base(
    item,
    faqText,
    rationale,
    '<!-- No FAQ content detected on this page -->',
    faqs.map(f => `<div class="faq-item">\n  <h3>${f.question}</h3>\n  <p>${f.answer}</p>\n</div>`).join('\n'),
    `Add these FAQ questions as visible page content:\n\n${faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}\n\nThen add the FAQPage schema (use Schema Generator tab).`,
    `Add FAQ content as HTML to the page:\n${faqs.map(f => `<h3>${f.question}</h3>\n<p>${f.answer}</p>`).join('\n')}`,
    'needs-review',
    safetyWarning,
    'medium',
  );
}

function fixFAQSchema(item: FixQueueItem): FixSuggestion {
  const { faqs, schemaJson, safetyWarning, rationale } = generateFAQs(item);
  const scriptTag = `<script type="application/ld+json">\n${schemaJson}\n</script>`;

  return base(
    item,
    schemaJson,
    rationale,
    '<!-- No FAQPage schema detected -->',
    scriptTag,
    `FIRST add the FAQ questions as visible page content, THEN:\n1. In WordPress, go to Yoast SEO → Schema tab or use a custom HTML block.\n2. Add this JSON-LD to the page <head>:\n\n${scriptTag}`,
    `Add to <head> ONLY after adding visible FAQ content to the page:\n${scriptTag}`,
    'needs-review',
    safetyWarning,
    'medium',
  );
}

function fixOrganizationSchema(item: FixQueueItem): FixSuggestion {
  const schema = {
    '@context':   'https://schema.org',
    '@type':      'Organization',
    'name':       'Elitez Group',
    'url':        'https://www.elitez.asia/',
    'logo':       '[PLACEHOLDER: https://www.elitez.asia/logo.png]',
    'sameAs':     [
      '[PLACEHOLDER: LinkedIn URL]',
      '[PLACEHOLDER: Facebook URL]',
    ],
    'description': 'Elitez Group is a Singapore-based HR consulting and recruitment agency offering permanent recruitment, contract staffing, payroll outsourcing, and HR consulting services.',
    'address': {
      '@type':           'PostalAddress',
      'addressLocality': 'Singapore',
      'addressCountry':  'SG',
      'streetAddress':   '[PLACEHOLDER: Street Address]',
    },
    'telephone': '[PLACEHOLDER: +65 XXXX XXXX]',
    'email':     '[PLACEHOLDER: contact@elitez.asia]',
  };
  const json = JSON.stringify(schema, null, 2);
  const script = `<script type="application/ld+json">\n${json}\n</script>`;

  return base(
    item,
    json,
    'Organization schema helps Google display a knowledge panel for your business. Fill in all [PLACEHOLDER] fields with verified business information before publishing.',
    '<!-- No Organization schema detected -->',
    script,
    `1. Replace all [PLACEHOLDER] values with your real business information.\n2. In WordPress, use Yoast SEO → Search Appearance → Organization section, or add the schema to your theme's header.php.`,
    `Add to <head> in your site's layout file after replacing all [PLACEHOLDER] values:\n${script}\n\n⚠️ Never publish with placeholder values.`,
    'needs-review',
    '⚠️ Replace all [PLACEHOLDER] values with verified business information before publishing. Never invent phone numbers, addresses, or social links.',
    'high',
  );
}

function fixServiceSchema(item: FixQueueItem): FixSuggestion {
  const topicRaw = (() => {
    try {
      const parts = new URL(item.url).pathname.split('/').filter(Boolean);
      return parts.reverse()[0] ?? 'service';
    } catch { return 'service'; }
  })();
  const svcName = topicRaw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const schema = {
    '@context':   'https://schema.org',
    '@type':      'Service',
    'name':       `${svcName} in Singapore`,
    'description':'[PLACEHOLDER: Add a 1-2 sentence description of this service]',
    'provider': {
      '@type': 'Organization',
      'name':  'Elitez Group',
      'url':   'https://www.elitez.asia/',
    },
    'areaServed':     'Singapore',
    'serviceType':    svcName,
    'url':            item.url,
  };
  const json = JSON.stringify(schema, null, 2);
  const script = `<script type="application/ld+json">\n${json}\n</script>`;

  return base(
    item,
    json,
    `Service schema for "${svcName}" enables rich service descriptions in Google search. Fill in the description placeholder with real service details.`,
    '<!-- No Service schema detected on this page -->',
    script,
    `1. Replace [PLACEHOLDER] with a real service description.\n2. Add to the page via Yoast SEO custom schema, or add the script tag to your theme's header for this page.`,
    `Add to this page's <head> after customising:\n${script}`,
    'needs-review',
    '⚠️ Replace [PLACEHOLDER] with accurate service descriptions only.',
    'medium',
  );
}

function fixArticleSchema(item: FixQueueItem): FixSuggestion {
  const schema = {
    '@context':      'https://schema.org',
    '@type':         'Article',
    'headline':      item.page.title ?? '[PLACEHOLDER: Article headline]',
    'image':         '[PLACEHOLDER: https://example.com/article-image.jpg]',
    'author': {
      '@type': 'Person',
      'name':  '[PLACEHOLDER: Author Name]',
    },
    'publisher': {
      '@type': 'Organization',
      'name':  'Elitez Group',
      'logo': {
        '@type': 'ImageObject',
        'url':   '[PLACEHOLDER: https://www.elitez.asia/logo.png]',
      },
    },
    'datePublished':  '[PLACEHOLDER: YYYY-MM-DD]',
    'dateModified':   '[PLACEHOLDER: YYYY-MM-DD]',
    'description':    item.page.metaDescription ?? '[PLACEHOLDER: Article description]',
    'url':            item.url,
  };
  const json = JSON.stringify(schema, null, 2);
  const script = `<script type="application/ld+json">\n${json}\n</script>`;

  return base(
    item,
    json,
    'Article schema enables rich results in Google News and Google Search. Replace all [PLACEHOLDER] values with real article metadata.',
    '<!-- No Article schema detected on this page -->',
    script,
    `1. In WordPress, Yoast SEO handles Article schema automatically for blog posts. Check: Yoast SEO → Settings → Content types → Posts → Schema type → "Article".\n2. If using custom schema: replace all [PLACEHOLDER] values and add to the post's <head>.`,
    `Add to the post's <head> after replacing placeholders:\n${script}`,
    'needs-review',
    '⚠️ Replace all [PLACEHOLDER] values. Especially image URL and datePublished.',
    'medium',
  );
}

function fixBreadcrumbSchema(item: FixQueueItem): FixSuggestion {
  let path: string[];
  try {
    const { pathname } = new URL(item.url);
    path = pathname.split('/').filter(Boolean);
  } catch {
    path = ['page'];
  }

  const items = [
    { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.elitez.asia/' },
    ...path.map((seg, i) => ({
      '@type':    'ListItem',
      'position': i + 2,
      'name':     seg.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      'item':     `https://www.elitez.asia/${path.slice(0, i + 1).join('/')}/`,
    })),
  ];

  const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items };
  const json   = JSON.stringify(schema, null, 2);
  const script = `<script type="application/ld+json">\n${json}\n</script>`;

  return base(
    item,
    json,
    'Breadcrumb schema displays the page path in Google search results and improves site structure understanding.',
    '<!-- No BreadcrumbList schema detected -->',
    script,
    `In WordPress, Yoast SEO generates breadcrumb schema automatically. Enable: Yoast SEO → Settings → Breadcrumbs → Enable breadcrumbs.\nAlternatively, add this JSON-LD to the page <head>.`,
    `Add to <head>:\n${script}`,
    'safe',
    undefined,
    'high',
  );
}

function fixImageAlt(item: FixQueueItem): FixSuggestion {
  const count = item.page.missingAltCount;
  const intent = item.pageIntent;

  const examples = [
    `For team photos: alt="Elitez Group recruitment consultants in Singapore office"`,
    `For service illustrations: alt="[Service name] process diagram"`,
    `For decorative backgrounds: alt="" (empty — tells screen readers to skip)`,
    `For logos: alt="Elitez Group logo"`,
  ];

  return base(
    item,
    `${count} image${count > 1 ? 's' : ''} need alt text`,
    `${count} image${count > 1 ? 's' : ''} on this page are missing alt text. Alt text improves accessibility and Google Images ranking.`,
    `<!-- ${count} <img> tags missing alt="" attribute -->`,
    `<img src="team.jpg" alt="Elitez Group HR consultants at our Singapore office">`,
    `In WordPress:\n1. Go to Media Library.\n2. Click each image used on this page.\n3. Fill in the "Alt Text" field.\n4. Click "Update".\n\nOr edit the page and click each image → "Edit" → add Alt Text.`,
    `Find all <img> tags missing alt attributes on this page.\nAdd descriptive alt text:\n${examples.join('\n')}\n\nFor decorative images use: alt=""`,
    'safe',
    undefined,
    'high',
  );
}

function fixCanonical(item: FixQueueItem): FixSuggestion {
  const canon = item.page.canonical;
  const isWrong = !item.page.canonicalMatchesSelf && !!canon;

  return base(
    item,
    `<link rel="canonical" href="${item.url}">`,
    isWrong
      ? `Canonical currently points to "${canon}" instead of this page's URL. This tells Google to index the other URL instead. Fix if this page should be indexed.`
      : `No canonical tag detected. Adding a self-referential canonical prevents duplicate content issues.`,
    isWrong
      ? `<link rel="canonical" href="${canon}">  <!-- ⚠️ pointing elsewhere -->`
      : '<!-- canonical tag missing -->',
    `<link rel="canonical" href="${item.url}">`,
    `In WordPress (Yoast SEO):\n1. Open the page.\n2. Yoast SEO → Advanced tab.\n3. In "Canonical URL" field, enter:\n\n${item.url}\n\n4. Update the page.`,
    `Add or update in <head>:\n<link rel="canonical" href="${item.url}">\n\nThis should be the definitive URL for this page.`,
    'needs-developer',
    isWrong
      ? '⚠️ Changing a canonical from one URL to another may affect which URL Google indexes. Confirm this page is the primary version before changing.'
      : undefined,
    isWrong ? 'high' : 'medium',
  );
}

function fixNoindex(item: FixQueueItem): FixSuggestion {
  const isImportant = ['homepage', 'service', 'product', 'contact'].includes(item.pageIntent);

  return base(
    item,
    'Remove noindex directive',
    isImportant
      ? `This ${item.pageIntent} page has a noindex tag, preventing it from appearing in Google search. This is likely accidental.`
      : `This page has a noindex tag. If this page should be visible in Google, the noindex must be removed.`,
    `<meta name="robots" content="noindex">  <!-- currently blocking indexing -->`,
    `<!-- noindex removed: page can now be indexed -->`,
    `In WordPress:\n1. Open the page.\n2. Yoast SEO → Advanced tab.\n3. Change "Allow search engines to show this Page in search results" to "Yes".\n4. Update the page.\n5. In Google Search Console, use URL Inspection → Request Indexing.`,
    `Remove the noindex directive from this page:\n- Remove: <meta name="robots" content="noindex">\n- Or: Change X-Robots-Tag header from "noindex" to "index"\n\nAfter fix: submit URL in GSC → URL Inspection → Request Indexing.`,
    'needs-developer',
    '🚨 Only remove noindex from pages that SHOULD appear in Google search results. Never remove noindex from tag archives, admin pages, cart, checkout, or search results pages.',
    isImportant ? 'high' : 'medium',
  );
}

function fixSitemap(item: FixQueueItem): FixSuggestion {
  return base(
    item,
    `Add ${item.url} to sitemap.xml`,
    `This important page is not included in the XML sitemap. Adding it helps Google discover and index it faster.`,
    `<!-- URL not found in sitemap.xml -->`,
    `<url>\n  <loc>${item.url}</loc>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>`,
    `In WordPress:\n1. Yoast SEO → Settings → XML Sitemaps → enable.\n2. Yoast SEO automatically includes published pages. Confirm this page is published and not set to noindex.\n3. Regenerate sitemap: delete transients via Tools → Delete Transients or WP Rocket cache clear.`,
    `Add to sitemap.xml:\n<url>\n  <loc>${item.url}</loc>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>\n\nIn Next.js: update app/sitemap.ts to include this URL.`,
    'safe',
    undefined,
    'medium',
  );
}

function fixRedirect(item: FixQueueItem): FixSuggestion {
  return base(
    item,
    `301 redirect from ${item.url} to [replacement page URL]`,
    `This page returns a 404 error. If it previously had traffic or rankings, a 301 redirect preserves SEO value.`,
    `HTTP 404 — page not found`,
    `HTTP 301 → [new URL]`,
    `In WordPress:\n1. Install the "Redirection" plugin (by John Godley).\n2. Go to Tools → Redirection.\n3. Add redirect: From: ${item.url}, To: [replacement URL], Type: 301.\n4. Save and test.`,
    `Set up a 301 redirect from "${item.url}" to the most relevant current URL.\n\nNext.js (next.config.mjs):\nredirects: async () => [{ source: '/old-path', destination: '/new-path', permanent: true }]\n\n.htaccess:\nRedirect 301 /old-path /new-path\n\nnginx:\nrewrite ^/old-path$ /new-path permanent;`,
    'needs-developer',
    '⚠️ Only redirect to a genuinely relevant replacement page. Redirecting to the homepage as a catch-all can hurt SEO.',
    'high',
  );
}

function fixInternalLinks(item: FixQueueItem): FixSuggestion {
  const count = item.page.internalLinksCount;
  return base(
    item,
    `Add internal links to/from this page`,
    `This page has only ${count} internal link${count !== 1 ? 's' : ''} pointing to it. Internal links distribute PageRank and help Google discover pages.`,
    `<!-- Internal links to this page: ${count} -->`,
    `<a href="${item.url}">Learn more about [topic]</a>  <!-- Add to related pages -->`,
    `In WordPress:\n1. Edit your most relevant pages (homepage, service pages, related blog posts).\n2. In the content, find relevant mentions of this page's topic.\n3. Highlight the text and insert a link to this page.\n4. Use descriptive anchor text (not "click here").`,
    `Add <a href="${item.url}">[descriptive anchor text]</a> to:\n- Your homepage (in the services section)\n- Related service pages\n- Related blog articles\n\nAim for 3-5 high-quality internal links to important pages.`,
    'safe',
    undefined,
    'medium',
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateFix(item: FixQueueItem): FixSuggestion {
  switch (item.fixType) {
    case 'SEO Title':           return fixSEOTitle(item);
    case 'Meta Description':    return fixMetaDescription(item);
    case 'H1':                  return fixH1(item);
    case 'Heading Structure':   return fixHeadingStructure(item);
    case 'FAQ Content':         return fixFAQContent(item);
    case 'FAQPage Schema':      return fixFAQSchema(item);
    case 'Organization Schema': return fixOrganizationSchema(item);
    case 'Service Schema':      return fixServiceSchema(item);
    case 'Article Schema':      return fixArticleSchema(item);
    case 'Breadcrumb Schema':   return fixBreadcrumbSchema(item);
    case 'Image Alt Text':      return fixImageAlt(item);
    case 'Canonical':           return fixCanonical(item);
    case 'Noindex':             return fixNoindex(item);
    case 'Sitemap':             return fixSitemap(item);
    case 'Redirect':            return fixRedirect(item);
    case 'Internal Links':      return fixInternalLinks(item);
    default:                    return fixInternalLinks(item); // fallback
  }
}
