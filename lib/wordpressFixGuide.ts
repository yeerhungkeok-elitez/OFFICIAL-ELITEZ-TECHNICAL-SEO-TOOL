// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Fix Guide (V7)
// Maps FixQueueItems + SEO issues to actionable WordPress admin instructions.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  ScanResult, SchemaAuditResult, GSCDecisionSummary,
  FixQueueItem, CMSDetectionResult,
  WordPressFixGuide, WordPressChecklistItem,
  WordPressArea, FixType,
  PluginInstruction, WordPressFixStep, IssueSeverity,
} from '@/types/seo';
import { evaluateRisk } from './wordpressRiskRules';

// ─── Compact step/plugin builders ─────────────────────────────────────────────

function S(instruction: string, isWarning = false, notes?: string): WordPressFixStep {
  return { stepNumber: 0, instruction, ...(isWarning ? { isWarning } : {}), ...(notes ? { notes } : {}) };
}

function W(instruction: string): WordPressFixStep {
  return { stepNumber: 0, instruction, isWarning: true };
}

function numbered(steps: WordPressFixStep[]): WordPressFixStep[] {
  return steps.map((step, i) => ({ ...step, stepNumber: i + 1 }));
}

function PI(
  name: string, slug: string,
  steps: WordPressFixStep[], verify: string[], prereq?: string,
): PluginInstruction {
  return {
    pluginName: name, pluginSlug: slug,
    steps: numbered(steps),
    verificationSteps: verify,
    ...(prereq ? { prerequisite: prereq } : {}),
  };
}

// ─── Common verification phrases ──────────────────────────────────────────────

const V_SOURCE    = 'View Page Source in incognito and search for the affected element.';
const V_GSC       = 'Use Google Search Console → URL Inspection to check the live URL.';
const V_CACHE     = 'Clear any page / server cache before re-checking.';
const V_RICHTEST  = 'Validate with Google Rich Results Test (search.google.com/test/rich-results).';
const V_SCREAMING = 'Re-crawl the site or re-run this audit to confirm the issue is resolved.';

// ─── Guide template type ──────────────────────────────────────────────────────

interface GuideTemplate {
  area:        WordPressArea;
  plugin:      string;
  risk:        'safe' | 'needs-review' | 'requires-approval';
  approval:    'safe' | 'needs-review' | 'needs-developer';
  notes:       string;
  warnings:    string[];
  plugins:     PluginInstruction[];
  verify:      string[];
}

// ─── Shared Yoast/RM navigation prefix ────────────────────────────────────────

const NAV_WP = 'Log in to WordPress Admin (yourdomain.com/wp-admin).';
const NAV_YOAST_PAGE = [
  NAV_WP,
  'Go to Posts or Pages in the left menu.',
  'Find the affected URL and click Edit.',
  'Scroll down to the Yoast SEO block below the editor.',
];
const NAV_RM_PAGE = [
  NAV_WP,
  'Go to Posts or Pages in the left menu.',
  'Find the affected URL and click Edit.',
  'Open the Rank Math sidebar panel (icon in top-right toolbar).',
];

// ─── Master guide templates ────────────────────────────────────────────────────

const TEMPLATES: Partial<Record<string, GuideTemplate>> = {

  // ── SEO Title ──────────────────────────────────────────────────────────────
  'SEO Title': {
    area: 'Yoast SEO → Page Analysis', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'SEO titles should be 50–60 characters. Use the primary keyword near the beginning.',
    warnings: [],
    verify: [V_SOURCE + ' Search for <title> tag.', V_GSC, V_CACHE],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Click the SEO tab in the Yoast panel.'),
        S('Click the Google preview to expand it.'),
        S('Edit the SEO title field. Use %%title%% %%sep%% %%sitename%% or type a custom title.', false, 'Keep under 60 characters.'),
        S('Click Update to save.'),
      ], ['View source → search <title>.', V_GSC]),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click Edit Snippet.'),
        S('Update the Title field.', false, 'Keep under 60 characters.'),
        S('Click Update to save.'),
      ], ['View source → search <title>.', V_GSC]),

      PI('WordPress Core (no SEO plugin)', 'wp-core', [
        S(NAV_WP),
        S('Go to Posts or Pages > Edit the page.'),
        S('Update the Page Title field at the top of the editor.', false, 'Without an SEO plugin, the page title becomes the <title> tag via your theme.'),
        W('Without an SEO plugin, you cannot set a custom SEO title separately. Install Yoast SEO or Rank Math for full control.'),
        S('Click Update.'),
      ], ['View source → confirm <title> matches.']),

      PI('Elementor', 'elementor', [
        S('Edit the page with Elementor.'),
        S('Use the Yoast SEO or Rank Math panel (visible in the WP editor, not inside Elementor itself) to set the SEO title.'),
        W('Elementor does not natively control <title> tags. You must use an SEO plugin alongside Elementor.'),
      ], ['Publish and verify in page source.']),
    ],
  },

  // ── Meta Description ───────────────────────────────────────────────────────
  'Meta Description': {
    area: 'Yoast SEO → Page Analysis', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'Meta descriptions should be 120–158 characters. They affect CTR, not rankings directly.',
    warnings: [],
    verify: [V_SOURCE + ' Search for meta name="description".', V_GSC, V_CACHE],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Click the SEO tab.'),
        S('Click the Google preview.'),
        S('Find the Meta description field and enter a description.', false, '120–158 characters ideal.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for meta name="description".', V_GSC]),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click Edit Snippet.'),
        S('Fill in the Description field.', false, '120–158 characters.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for meta name="description".']),

      PI('WordPress Core (no SEO plugin)', 'wp-core', [
        W('WordPress core does not support custom meta descriptions without a plugin.'),
        S('Install Yoast SEO (free) or Rank Math (free) to control meta descriptions per page.'),
      ], ['After installing a plugin, verify in page source.']),
    ],
  },

  // ── H1 / Heading Structure ─────────────────────────────────────────────────
  'H1': {
    area: 'WordPress Core Editor', plugin: 'WordPress Core / Elementor / Flatsome',
    risk: 'safe', approval: 'safe',
    notes: 'Every indexable page should have exactly one H1. The page title in WordPress often auto-generates an H1 via the theme.',
    warnings: [],
    verify: [V_SOURCE + ' Search for <h1>.', V_SCREAMING],
    plugins: [
      PI('WordPress Core (Block Editor)', 'wp-core', [
        S(NAV_WP),
        S('Edit the affected page.'),
        S('Confirm the page title field exists — most themes output this as the H1.'),
        S('If no H1 is set by the title, add a Heading block at the top of the content.'),
        S('In the Heading block settings (right panel), set "Level" to H1.'),
        S('If multiple H1s exist, change the extra ones to H2 or H3.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for <h1> — should appear exactly once.']),

      PI('Elementor', 'elementor', [
        S('Open the page in Elementor.'),
        S('Locate all Heading widgets on the page.'),
        S('For the primary heading, set HTML Tag to h1 in the Content tab.'),
        S('Change all other headings to h2, h3, etc. so only one h1 exists.'),
        S('Click Update and Publish.'),
      ], ['View source or use a heading checker tool to verify one H1.']),

      PI('Flatsome UX Builder', 'flatsome', [
        S('Edit the page with UX Builder.'),
        S('Locate heading elements. Click to edit.'),
        S('In the heading settings, find "HTML Tag" and set it to h1 for the main heading.'),
        S('Ensure only one heading is set to h1.'),
        S('Save and publish.'),
      ], ['View source → verify single <h1>.']),
    ],
  },

  'Heading Structure': {
    area: 'WordPress Core Editor', plugin: 'WordPress Core / Elementor / Flatsome',
    risk: 'safe', approval: 'safe',
    notes: 'Use heading hierarchy: H1 > H2 > H3. Do not skip levels (e.g. H1 to H3). One H1 per page only.',
    warnings: [],
    verify: [V_SOURCE + ' Search for h1, h2, h3 to review heading order.', V_SCREAMING],
    plugins: [
      PI('WordPress Core (Block Editor)', 'wp-core', [
        S('Edit the page in WordPress.'),
        S('Review all Heading blocks in the editor.'),
        S('Ensure exactly one H1. All section titles should be H2. Subsections should be H3.'),
        S('Do not skip heading levels (e.g. H1 → H3 without H2 in between).'),
        S('Click Update.'),
      ], ['View source and map the heading order.', V_SCREAMING]),

      PI('Elementor', 'elementor', [
        S('Edit with Elementor.'),
        S('Click on each Heading widget to check its HTML Tag setting.'),
        S('Set the main title to h1, section titles to h2, subsections to h3.'),
        S('Update and publish.'),
      ], ['View source → verify heading hierarchy.']),
    ],
  },

  // ── Noindex ────────────────────────────────────────────────────────────────
  'Noindex': {
    area: 'Yoast SEO → Page Analysis', plugin: 'Yoast SEO / Rank Math / All in One SEO',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Verify that this page SHOULD be indexed before removing noindex. Many pages (archives, cart, search results) should remain noindex.',
    warnings: [
      '⚠️ Do NOT remove noindex from: category/tag archives, author pages, cart, checkout, thank-you, search results, admin pages, or duplicate content pages.',
      '⚠️ If you added noindex intentionally, review the original reason before removing it.',
    ],
    verify: [V_SOURCE + ' Search for robots meta tag.', V_GSC + ' Check indexing status.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Click the Advanced tab in the Yoast panel.'),
        S('Find "Allow search engines to show this Page in search results?"'),
        S('Change to "Yes, show this page in search results" (default).', false, 'Only do this if you are certain this page should be indexed.'),
        W('Do not do this for WooCommerce transactional pages, search pages, or archive pages you intentionally noindexed.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for robots.', V_GSC]),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Advanced tab.'),
        S('Under Robots Meta, uncheck "No Index".', false, 'Only do this for pages that should be indexed.'),
        W('Never remove noindex from WooCommerce cart, checkout, or transactional pages.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for robots meta.', V_GSC]),

      PI('WordPress Admin → Settings → Reading', 'wp-core', [
        S('If the entire site is set to discourage search engines, go to Settings → Reading.'),
        S('Uncheck "Discourage search engines from indexing this site."'),
        W('This setting affects the entire site. Only change if the entire site was accidentally set to noindex.'),
        S('Click Save Changes.'),
      ], [V_SOURCE + ' Search for noindex site-wide.']),

      PI('All in One SEO', 'all-in-one-seo-pack', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Find the AIOSEO meta box below the editor.'),
        S('Click the Advanced tab.'),
        S('Under Robot Instructions, set to "index" or remove "noindex".'),
        S('Click Update.'),
      ], [V_SOURCE + ' Verify robots meta.']),
    ],
  },

  // ── Canonical ──────────────────────────────────────────────────────────────
  'Canonical': {
    area: 'Yoast SEO → Page Analysis', plugin: 'Yoast SEO / Rank Math',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Canonical tags tell search engines which version of a URL is the primary one. Set to the clean, non-parameterised URL.',
    warnings: [
      '⚠️ Verify the correct canonical URL before making changes. An incorrect canonical can suppress the wrong page.',
    ],
    verify: [V_SOURCE + ' Search for rel="canonical".', V_GSC, V_CACHE],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Click the Advanced tab in the Yoast panel.'),
        S('Find the "Canonical URL" field.'),
        S('Enter the correct full URL (e.g. https://yourdomain.com/page-slug/).', false, 'Leave blank to use the page\'s own URL as canonical (default self-canonical).'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for rel="canonical".', V_GSC]),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Advanced tab.'),
        S('Find Canonical URL field and enter the correct URL.'),
        S('Click Update.'),
      ], [V_SOURCE + ' Verify rel="canonical" points to correct URL.']),
    ],
  },

  // ── Image Alt Text ─────────────────────────────────────────────────────────
  'Image Alt Text': {
    area: 'WordPress Admin → Settings → Media', plugin: 'WordPress Media Library / Elementor',
    risk: 'safe', approval: 'safe',
    notes: 'Alt text describes the image for screen readers and search engines. Be descriptive and concise (under 125 characters).',
    warnings: [],
    verify: [V_SOURCE + ' Search for img tags and check alt="" attributes.', V_SCREAMING],
    plugins: [
      PI('WordPress Media Library', 'wp-core', [
        S(NAV_WP),
        S('Go to Media → Library.'),
        S('Find the image (you can search by file name).'),
        S('Click on the image to open its details.'),
        S('Enter descriptive text in the Alt Text field.', false, 'Describe what the image shows. Do not keyword-stuff alt text.'),
        S('Click Save to save the media attachment.'),
        S('Note: Updating media alt text updates it globally. Also check the image in the page editor.'),
      ], ['View page source → verify alt attribute on the <img> tag.', V_SCREAMING]),

      PI('WordPress Block Editor (per-page)', 'wp-core', [
        S('Edit the page containing the image.'),
        S('Click on the image block to select it.'),
        S('In the right panel, find "Alt text (alternative text)".'),
        S('Enter descriptive alt text for this instance.', false, 'Page-level alt text overrides the media library alt for this specific usage.'),
        S('Click Update.'),
      ], ['View source on the specific page to verify alt attribute.']),

      PI('Elementor', 'elementor', [
        S('Edit the page with Elementor.'),
        S('Click on the Image widget or the image in any widget.'),
        S('In the Content tab, find "Image Alt" and enter descriptive text.'),
        S('Click Update / Publish.'),
      ], ['View page source and verify alt attribute.']),

      PI('WooCommerce (Product Images)', 'woocommerce', [
        S(NAV_WP),
        S('Go to Products and edit the affected product.'),
        S('Click on the Product Image or Gallery Image.'),
        S('In the media library popup, find the Alt Text field.'),
        S('Enter descriptive alt text.'),
        S('Click Set product image / Save.'),
        S('Click Update on the product.'),
      ], ['View product page source → check img alt attributes.']),
    ],
  },

  // ── FAQPage Schema ─────────────────────────────────────────────────────────
  'FAQPage Schema': {
    area: 'Rank Math → Schema', plugin: 'Yoast SEO (FAQ Block) / Rank Math / Schema Pro',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'FAQPage schema must exactly match visible FAQ content on the page. Do not add schema for hidden or non-existent FAQs.',
    warnings: [
      '⚠️ FAQPage schema that does not match visible page content may trigger a Google manual penalty for structured data misuse.',
    ],
    verify: [V_RICHTEST, V_CACHE, V_SCREAMING],
    plugins: [
      PI('Yoast SEO (FAQ Block)', 'wordpress-seo', [
        S('Edit the page in the WordPress Block Editor.'),
        S('Place your cursor where the FAQ section should appear.'),
        S('Add a "Yoast FAQ" block (search for "Yoast" in the block inserter).'),
        S('Add each question and answer pair in the block.', false, 'The Yoast FAQ block automatically generates FAQPage JSON-LD schema.'),
        S('Ensure the questions and answers are visible and legible on the page.'),
        W('The FAQ content MUST be visible to users — do not hide it with CSS.'),
        S('Click Update.'),
      ], [V_RICHTEST, 'View source → search for FAQPage in JSON-LD.']),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Schema tab (if visible).'),
        S('Add a Schema → FAQ schema.'),
        S('Add each question and answer matching the visible page content.'),
        W('FAQ content must be visible on the page.'),
        S('Click Update.'),
      ], [V_RICHTEST, V_SOURCE + ' Search for FAQPage.']),

      PI('Developer (manual JSON-LD)', 'wp-core', [
        S('Edit the page.'),
        S('Add a Custom HTML block (Block Editor) or use your theme\'s header injection.'),
        S('Insert the FAQPage JSON-LD script block.', false, 'Each Q&A in the schema must match visible content exactly.'),
        W('All questions/answers must be visible on the page — not hidden by CSS or JavaScript.'),
        S('Validate using Google Rich Results Test before publishing.'),
      ], [V_RICHTEST]),
    ],
  },

  // ── Organization Schema ────────────────────────────────────────────────────
  'Organization Schema': {
    area: 'Yoast SEO → Search Appearance', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'Organization schema is typically set site-wide via SEO plugin settings, not per-page.',
    warnings: [],
    verify: [V_RICHTEST + ' On the homepage.', V_SOURCE + ' On homepage, search for Organization.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Settings.'),
        S('Click the Site representation section.'),
        S('Select "Organisation" and fill in name, logo, and social profiles.'),
        S('Save changes.'),
      ], [V_RICHTEST + ' Test homepage.', V_SOURCE + ' Search for Organization.']),

      PI('Rank Math', 'seo-by-rank-math', [
        S(NAV_WP),
        S('Go to Rank Math → General Settings.'),
        S('Click the Knowledge Graph & Schema section.'),
        S('Choose Person or Organisation and fill in the details.'),
        S('Save Changes.'),
      ], [V_RICHTEST + ' Test homepage.']),
    ],
  },

  // ── Article / Service Schema ───────────────────────────────────────────────
  'Article Schema': {
    area: 'Rank Math → Schema', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'Article schema is typically auto-generated by SEO plugins for blog posts. Verify it is being output correctly.',
    warnings: [],
    verify: [V_RICHTEST, V_SOURCE + ' Search for "Article" in JSON-LD.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Settings → Content Types.'),
        S('Find your Post type and ensure schema type is set to "Article" or "BlogPosting".'),
        S('Save.'),
      ], [V_RICHTEST, V_SOURCE]),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Schema tab.'),
        S('Set schema type to Article.'),
        S('Click Update.'),
      ], [V_RICHTEST, V_SOURCE]),
    ],
  },

  'Service Schema': {
    area: 'Rank Math → Schema', plugin: 'Rank Math / Schema Pro / Developer',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Service schema should describe an actual service offered on the page. Ensure all required fields are present.',
    warnings: ['⚠️ Only add Service schema to pages that genuinely describe a specific service.'],
    verify: [V_RICHTEST, V_SOURCE],
    plugins: [
      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Schema tab.'),
        S('Select Schema Type → Service.'),
        S('Fill in name, description, provider, and areaServed fields.'),
        S('Click Update.'),
      ], [V_RICHTEST]),

      PI('Developer (manual JSON-LD)', 'wp-core', [
        S('Edit the page.'),
        S('Add a Custom HTML block and insert Service JSON-LD schema.'),
        S('Include @type, name, description, provider, and serviceType at minimum.'),
        S('Validate with Google Rich Results Test.'),
      ], [V_RICHTEST]),
    ],
  },

  // ── Breadcrumb Schema ──────────────────────────────────────────────────────
  'Breadcrumb Schema': {
    area: 'Yoast SEO → Search Appearance', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'Breadcrumb schema helps Google understand site structure. Enable in SEO plugin settings.',
    warnings: [],
    verify: [V_RICHTEST, V_SOURCE + ' Search for BreadcrumbList.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Settings → Breadcrumbs.'),
        S('Toggle breadcrumbs on.'),
        S('Add the Yoast breadcrumb function to your theme template, or use the breadcrumb widget/block.'),
        S('Save changes.'),
      ], [V_RICHTEST, V_SOURCE]),

      PI('Rank Math', 'seo-by-rank-math', [
        S('Rank Math enables Breadcrumb schema automatically when breadcrumb markup is present.'),
        S('Go to Rank Math → General Settings → Breadcrumbs to configure.'),
        S('Add breadcrumbs to your theme using the Rank Math breadcrumb shortcode: [rank_math_breadcrumb]'),
        S('Save.'),
      ], [V_RICHTEST]),
    ],
  },

  // ── Internal Links ─────────────────────────────────────────────────────────
  'Internal Links': {
    area: 'WordPress Core Editor', plugin: 'WordPress Core / Yoast (link suggestions)',
    risk: 'safe', approval: 'safe',
    notes: 'Add 2–5 internal links to relevant pages. Use descriptive anchor text. Avoid over-linking.',
    warnings: [],
    verify: ['Re-run the audit and check internal link count for this page.', V_SCREAMING],
    plugins: [
      PI('WordPress Core (Block Editor)', 'wp-core', [
        S('Edit the page.'),
        S('Identify a paragraph where you can naturally link to a related page.'),
        S('Highlight the anchor text (the words that will become the link).'),
        S('Click the Link icon in the toolbar (or press Ctrl+K / ⌘K).'),
        S('Search for and select the target page from your site.', false, 'Use descriptive anchor text — not "click here" or "read more".'),
        S('Click Update.'),
      ], ['View page source → count anchor tags.', V_SCREAMING]),

      PI('Yoast SEO (Link Suggestions)', 'wordpress-seo', [
        S('When editing a post/page, scroll to the Yoast SEO panel.'),
        S('Check if Yoast shows an Internal Links section with suggestions.', false, 'This feature may require Yoast Premium.'),
        S('Use suggested links to add relevant internal links.'),
        S('Click Update.'),
      ], ['Re-run audit to verify internal link count.']),

      PI('Elementor', 'elementor', [
        S('Open the page in Elementor.'),
        S('Click on a Text Editor or Heading widget to edit.'),
        S('Highlight anchor text and use the link tool in the editor.'),
        S('Set the URL to an internal page URL.'),
        S('Publish.'),
      ], ['View page source → count anchor tags.']),
    ],
  },

  // ── Robots.txt ─────────────────────────────────────────────────────────────
  'Robots.txt': {
    area: 'Yoast SEO → Tools → Bulk Editor', plugin: 'Yoast SEO / Rank Math / Developer',
    risk: 'requires-approval', approval: 'needs-developer',
    notes: 'Robots.txt controls crawler access. Incorrect changes can block your entire site from Google.',
    warnings: [
      '🚨 Robots.txt changes REQUIRE developer review. A single wrong Disallow rule can de-index your entire site.',
      '🚨 Always test changes with Google Search Console URL Inspection after editing.',
      '🚨 Do not block /wp-admin/admin-ajax.php — this is required for many WP functions.',
    ],
    verify: ['Test affected URLs with Google Search Console → URL Inspection.', 'Use Fetch as Google to verify crawlability.', V_GSC],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Tools → File Editor.'),
        W('Read the current robots.txt carefully before making any changes.'),
        S('Make the minimal required change only.'),
        S('Save.'),
        W('Immediately verify the affected URL is still crawlable using GSC URL Inspection.'),
      ], [V_GSC + ' Test affected URLs immediately after changes.']),

      PI('Rank Math', 'seo-by-rank-math', [
        S(NAV_WP),
        S('Go to Rank Math → General Settings → Edit robots.txt.'),
        W('Read carefully before editing.'),
        S('Make the minimal required change.'),
        S('Save Changes.'),
        W('Test immediately with Google Search Console.'),
      ], [V_GSC]),

      PI('Developer (FTP / File Manager)', 'wp-core', [
        S('Access the server via FTP, SFTP, or hosting file manager.'),
        S('Open robots.txt in the web root directory (public_html or www).'),
        W('Back up the current robots.txt before editing.'),
        S('Make the required change.'),
        S('Save and upload.'),
        W('Test immediately with Google Search Console URL Inspection.'),
      ], [V_GSC, 'Verify with: curl -I yourdomain.com/robots.txt']),
    ],
  },

  // ── Redirect ───────────────────────────────────────────────────────────────
  'Redirect': {
    area: 'WordPress Admin → Tools → Redirection', plugin: 'Redirection Plugin / Rank Math / Developer',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Use 301 for permanent redirects. Avoid redirect chains. Ensure the destination URL is correct and stable.',
    warnings: [
      '⚠️ 301 redirects permanently pass link equity. Ensure the destination is the final intended URL.',
      '⚠️ Avoid redirect chains (A → B → C). Always redirect directly to the final URL.',
    ],
    verify: ['Test with curl: curl -I OLD_URL to confirm 301 and correct location.', V_GSC, 'Check for redirect chains.'],
    plugins: [
      PI('Redirection Plugin', 'redirection', [
        S(NAV_WP),
        S('Go to Tools → Redirection.'),
        S('Click Add New.'),
        S('Enter the Source URL (old URL, relative path e.g. /old-page/).'),
        S('Enter the Target URL (new URL, full URL or relative path).'),
        S('Set Match to "URL only" for simple redirects.'),
        S('Click Add Redirect.'),
      ], ['Test old URL in browser — should redirect to new URL.', V_GSC]),

      PI('Rank Math', 'seo-by-rank-math', [
        S(NAV_WP),
        S('Go to Rank Math → Redirections.'),
        S('Click Add New.'),
        S('Set Source URL (old URL).'),
        S('Set Destination URL (new URL).'),
        S('Set Redirect Type to 301 Permanent.'),
        S('Click Save.'),
      ], ['Test old URL → should redirect with 301 to new URL.']),

      PI('Developer (.htaccess / nginx)', 'wp-core', [
        S('For Apache, edit .htaccess in the web root.'),
        S('Add: Redirect 301 /old-page/ https://yourdomain.com/new-page/'),
        S('For nginx, add in server block: return 301 https://yourdomain.com/new-page/;'),
        W('Back up your .htaccess / nginx config before editing.'),
        S('Test after saving: curl -I https://yourdomain.com/old-page/'),
      ], ['curl -I old URL → confirm 301 and correct Location header.']),
    ],
  },

  // ── Sitemap ────────────────────────────────────────────────────────────────
  'Sitemap': {
    area: 'Yoast SEO → Search Appearance', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'Submit your sitemap URL to Google Search Console after generating. Ensure key pages are included.',
    warnings: [],
    verify: ['Visit yourdomain.com/sitemap_index.xml or /wp-sitemap.xml to confirm it exists.', 'Check Google Search Console → Sitemaps for submission status.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Settings.'),
        S('Click Features.'),
        S('Ensure "XML Sitemaps" is toggled ON.'),
        S('Click Save.'),
        S('Visit yoursite.com/sitemap_index.xml to confirm it loads.'),
        S('Go to Google Search Console → Sitemaps → Submit your sitemap URL.'),
      ], ['Browse to /sitemap_index.xml.', 'Check GSC Sitemaps for errors.']),

      PI('Rank Math', 'seo-by-rank-math', [
        S(NAV_WP),
        S('Go to Rank Math → Sitemap Settings.'),
        S('Enable the sitemap toggle.'),
        S('Configure which post types and taxonomies to include.'),
        S('Save Changes.'),
        S('Submit to Google Search Console → Sitemaps.'),
      ], ['Browse to /sitemap_index.xml or /wp-sitemap.xml.', 'Check GSC Sitemaps.']),
    ],
  },

  // ── Open Graph / Social ────────────────────────────────────────────────────
  'open-graph': {
    area: 'Yoast SEO → Social', plugin: 'Yoast SEO / Rank Math',
    risk: 'safe', approval: 'safe',
    notes: 'OG image should be 1200×630px minimum. Missing OG images result in poor social sharing previews.',
    warnings: [],
    verify: [V_SOURCE + ' Search for og:image.', 'Test with Facebook Sharing Debugger (developers.facebook.com/tools/debug/).'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        ...NAV_YOAST_PAGE.map(i => S(i)),
        S('Click the Social tab in the Yoast panel.'),
        S('Find the Facebook section.'),
        S('Upload or select an image (recommended: 1200×630px).'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for og:image meta tag.']),

      PI('Rank Math', 'seo-by-rank-math', [
        ...NAV_RM_PAGE.map(i => S(i)),
        S('Click the Social tab.'),
        S('Set the Facebook / Twitter image (1200×630px recommended).'),
        S('Click Update.'),
      ], [V_SOURCE + ' Search for og:image.']),
    ],
  },

  // ── Thin Content ───────────────────────────────────────────────────────────
  'thin-content': {
    area: 'WordPress Core Editor', plugin: 'WordPress Core / Elementor',
    risk: 'safe', approval: 'safe',
    notes: 'Google may undervalue pages with fewer than 300 words. Aim for comprehensive, helpful content relevant to the page topic.',
    warnings: [
      '⚠️ Do not add "filler" content just to increase word count. Content must be genuinely helpful to users.',
    ],
    verify: ['Re-run audit and check word count for this page.', V_GSC + ' Monitor for indexing changes after content update.'],
    plugins: [
      PI('WordPress Core (Block Editor)', 'wp-core', [
        S('Edit the page.'),
        S('Add substantive, relevant content: expanded descriptions, FAQs, process steps, examples, or related information.'),
        S('Aim for at least 300 words for standard pages; 500+ for service/product pages.', false, 'Quality matters more than quantity. Add content that genuinely helps users.'),
        W('Do not copy content from other pages — this creates duplicate content issues.'),
        S('Click Update.'),
      ], ['Re-run audit to check word count.', V_SCREAMING]),

      PI('Elementor', 'elementor', [
        S('Edit the page with Elementor.'),
        S('Add Text Editor, Icon Box, or other content widgets with substantive information.'),
        S('Consider adding an FAQ section, benefits list, or expanded service description.'),
        S('Publish.'),
      ], ['Re-run audit to verify increased word count.']),
    ],
  },

  // ── Archive Indexability ───────────────────────────────────────────────────
  'archive-indexability': {
    area: 'Yoast SEO → Search Appearance', plugin: 'Yoast SEO / Rank Math',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Taxonomy and archive indexability is a strategic decision. Many sites benefit from noindexing thin archives.',
    warnings: [
      '⚠️ Do not blindly index all archives. Thin category/tag pages without unique content can harm overall site quality.',
      '⚠️ WooCommerce category pages with products can benefit from being indexed if they have unique descriptions.',
    ],
    verify: [V_GSC + ' Monitor coverage report after changes.', 'Re-crawl site after 2–4 weeks.'],
    plugins: [
      PI('Yoast SEO', 'wordpress-seo', [
        S(NAV_WP),
        S('Go to Yoast SEO → Settings.'),
        S('Click Content Types or Taxonomies.'),
        S('Find the specific archive type (Category, Tag, etc.).'),
        S('Set "Show in search results" to Yes (index) or No (noindex).'),
        W('Only index archives that have unique, valuable content and are not thin/duplicate.'),
        S('Save.'),
      ], [V_GSC + ' Check Coverage tab for affected archive pages.', V_CACHE]),

      PI('Rank Math', 'seo-by-rank-math', [
        S(NAV_WP),
        S('Go to Rank Math → Titles & Meta.'),
        S('Click Taxonomies (for categories/tags) or Post Types (for archives).'),
        S('Find Robots Meta and set to index or noindex.'),
        W('Review carefully — blanket indexing of archives can create duplicate content.'),
        S('Save Changes.'),
      ], [V_GSC + ' Monitor Coverage report.']),
    ],
  },

  // ── 404 Error ──────────────────────────────────────────────────────────────
  '404': {
    area: 'WordPress Admin → Tools → Redirection', plugin: 'Redirection Plugin / Rank Math / Developer',
    risk: 'needs-review', approval: 'needs-review',
    notes: 'Fix 404s by restoring content, creating a redirect to the most relevant live page, or removing from sitemap.',
    warnings: ['⚠️ Do not redirect all 404s to the homepage. Redirect to the most relevant page or a relevant category.'],
    verify: ['Test the URL in a browser to confirm the 404 is resolved.', V_GSC + ' Remove URL from Index if it was a dead URL.'],
    plugins: [
      PI('Redirection Plugin', 'redirection', [
        S('Option 1: Restore the deleted page if the content should still exist.'),
        S('Option 2: Add a 301 redirect from the dead URL to the most relevant live page.'),
        S(NAV_WP),
        S('Go to Tools → Redirection → Add New.'),
        S('Source URL: the 404 URL. Target URL: the best matching live page.'),
        S('Set type to 301.'),
        S('Save.'),
      ], ['Test 404 URL in browser — should 301 to new page.']),

      PI('WordPress Admin (Content Restore)', 'wp-core', [
        S('If a published page was accidentally deleted, go to Posts or Pages → Trash.'),
        S('Find the deleted page and click Restore.'),
        S('Verify the URL matches the original 404 URL.'),
        S('Publish.'),
      ], ['Test URL — should now load with 200 status.']),
    ],
  },

  // ── 403 Error ──────────────────────────────────────────────────────────────
  '403': {
    area: 'Cache Plugin → Settings', plugin: 'Cache Plugin / Server / Developer',
    risk: 'requires-approval', approval: 'needs-developer',
    notes: '403 errors are typically caused by server-level security rules, cache plugin blocks, or file permissions. These require server access.',
    warnings: [
      '🚨 403 errors usually require server or hosting provider intervention. Do not attempt to fix these without developer or hosting support.',
      '🚨 If this URL is in your sitemap, consider removing it until the access issue is resolved.',
    ],
    verify: ['Test URL in browser in incognito mode.', 'Ask your hosting provider to check server error logs.'],
    plugins: [
      PI('Cache Plugin (LiteSpeed / WP Rocket)', 'cache-plugin', [
        S('Check if the cache plugin has IP blocking or security rules enabled.'),
        S('Go to your cache plugin settings → Security.'),
        S('Review any URL or IP blocking rules that may be blocking the affected URL.'),
        W('Changes to security rules require careful review — consult your hosting provider.'),
      ], ['Test URL after clearing cache.']),

      PI('Developer / Hosting (Server-level)', 'wp-core', [
        S('Check server error logs for the specific 403 cause.'),
        S('For Apache: review .htaccess deny rules and ModSecurity rules.'),
        S('For nginx: review location block deny rules.'),
        S('Check file permissions: the WordPress files/folders should typically be 644/755.'),
        W('Server-level changes require developer expertise. Incorrect changes can break the site.'),
      ], ['Test URL with curl -I to confirm HTTP status code.']),
    ],
  },

  // ── FAQ Content ────────────────────────────────────────────────────────────
  'FAQ Content': {
    area: 'WordPress Core Editor', plugin: 'WordPress Core / Elementor',
    risk: 'safe', approval: 'safe',
    notes: 'Add real, visible FAQ content to the page before adding FAQPage schema.',
    warnings: ['⚠️ FAQ schema without visible content on the page may violate Google\'s structured data policies.'],
    verify: ['View the page in a browser and confirm FAQ questions/answers are visible.', V_RICHTEST],
    plugins: [
      PI('WordPress Core (Block Editor)', 'wp-core', [
        S('Edit the page.'),
        S('Add an FAQ section using Heading (H2/H3) + Paragraph blocks.'),
        S('Format as: Q: [Question] → A: [Answer].'),
        S('After adding visible FAQ content, add FAQPage schema (Yoast FAQ block or Rank Math schema).'),
        S('Update.'),
      ], ['View page in browser — FAQ must be visible.', V_RICHTEST]),

      PI('Elementor', 'elementor', [
        S('Edit with Elementor.'),
        S('Add an Accordion or Toggle widget for FAQ content.'),
        S('Ensure each item has a visible question and answer.'),
        S('Add FAQPage schema separately via Rank Math or a Custom HTML block.'),
        S('Publish.'),
      ], ['FAQ must be visible on page.', V_RICHTEST]),
    ],
  },

};

// ─── Key normalisation ────────────────────────────────────────────────────────

function getTemplateKey(fixType: FixType, issueType: string, category?: string): string {
  if (TEMPLATES[fixType]) return fixType;
  const lc = issueType.toLowerCase();
  if (lc.includes('thin content') || lc.includes('word count') || lc.includes('low content')) return 'thin-content';
  if (lc.includes('archive') || lc.includes('category') || lc.includes('taxonomy')) return 'archive-indexability';
  if (lc.includes('og:image') || lc.includes('open graph') || lc.includes('og image')) return 'open-graph';
  if (lc.includes('h1') || lc.includes('heading')) return 'H1';
  if (lc.includes('404') || lc.includes('not found')) return '404';
  if (lc.includes('403') || lc.includes('forbidden') || lc.includes('access denied')) return '403';
  if (category === 'social-og') return 'open-graph';
  return fixType;
}

// ─── Default fallback template ────────────────────────────────────────────────

function fallbackTemplate(fixType: FixType, issueType: string): GuideTemplate {
  return {
    area: 'WordPress Core Editor',
    plugin: 'WordPress Admin',
    risk: 'needs-review',
    approval: 'needs-review',
    notes: `Address this issue through the relevant WordPress admin area. Issue: ${issueType}`,
    warnings: ['⚠️ Verify the correct fix approach before making changes.'],
    verify: [V_SOURCE, V_GSC, V_SCREAMING],
    plugins: [
      PI('WordPress Admin', 'wp-core', [
        S(NAV_WP),
        S(`Navigate to the relevant area for: ${fixType}.`),
        S(`Apply the recommended fix for: ${issueType}.`),
        W('Review this change with your SEO strategist before applying.'),
      ], [V_SOURCE, V_GSC]),
    ],
  };
}

// ─── Build single checklist item ──────────────────────────────────────────────

export function buildChecklistItemFromFixQueueItem(
  item:    FixQueueItem,
  source:  'seo' | 'schema' | 'gsc' | 'fix-queue' = 'fix-queue',
): WordPressChecklistItem {
  const key      = getTemplateKey(item.fixType, item.issueType);
  const template = (TEMPLATES[key] ?? fallbackTemplate(item.fixType, item.issueType)) as GuideTemplate;
  const risk     = evaluateRisk(item.url, item.fixType);

  // Merge template warnings with risk-rule warnings
  const allWarnings = [...template.warnings, ...risk.warnings];

  // Risk level is the more restrictive of template and risk-rule
  const riskOrder = { safe: 0, 'needs-review': 1, 'requires-approval': 2 };
  const finalRisk = riskOrder[risk.riskLevel] > riskOrder[template.risk]
    ? risk.riskLevel
    : template.risk;
  const finalApproval = finalRisk === 'requires-approval'
    ? 'needs-developer'
    : (template.approval as 'safe' | 'needs-review' | 'needs-developer');

  // Build generic fix steps from the first plugin instruction as baseline
  const genericSteps: WordPressFixStep[] = template.plugins[0]
    ? template.plugins[0].steps.slice(0, 6)
    : [{ stepNumber: 1, instruction: `Fix "${item.issueType}" on this URL via WordPress Admin.` }];

  return {
    id:                 item.id,
    url:                item.url,
    issueType:          item.issueType,
    priority:           item.priority,
    wordpressArea:      template.area,
    likelyPlugin:       template.plugin,
    fixSteps:           genericSteps,
    pluginInstructions: template.plugins,
    verificationSteps:  template.verify,
    riskLevel:          finalRisk,
    approvalLevel:      finalApproval,
    notes:              template.notes,
    source,
    originalIssue:      item.issueType,
    warnings:           allWarnings,
  };
}

// ─── Lightweight export for FixQueuePanel ─────────────────────────────────────

export function getWordPressStepsForItem(item: FixQueueItem) {
  const key      = getTemplateKey(item.fixType, item.issueType);
  const template = (TEMPLATES[key] ?? fallbackTemplate(item.fixType, item.issueType)) as GuideTemplate;
  const risk     = evaluateRisk(item.url, item.fixType);
  return {
    wordpressArea:      template.area,
    likelyPlugin:       template.plugin,
    pluginInstructions: template.plugins,
    verificationSteps:  template.verify,
    warnings:           [...template.warnings, ...risk.warnings],
    riskLevel:          risk.riskLevel !== 'safe' ? risk.riskLevel : template.risk,
    notes:              template.notes,
  };
}

// ─── Main guide builder ───────────────────────────────────────────────────────

export function generateWordPressFixGuide(
  result:      ScanResult,
  cmsDetection: CMSDetectionResult,
  fixQueue:    FixQueueItem[],
  schemaAudit?: SchemaAuditResult | null,
  gscData?:    GSCDecisionSummary | null,
): WordPressFixGuide {
  const items: WordPressChecklistItem[] = [];

  // Build from Fix Queue (primary source)
  for (const fq of fixQueue) {
    items.push(buildChecklistItemFromFixQueueItem(fq, 'fix-queue'));
  }

  // Supplement from SEO issues not already in fix queue
  const fixQueueUrls = new Set(fixQueue.map(f => `${f.fixType}||${f.url}`));
  for (const issue of result.issues) {
    for (const url of issue.affectedPages.slice(0, 5)) {
      const fakeKey = `${mapCategoryToFixType(issue.category)}||${url}`;
      if (!fixQueueUrls.has(fakeKey)) {
        const fakeItem: FixQueueItem = {
          id:              `seo-${issue.id}-${url.slice(-20)}`,
          url,
          pageIntent:      'page',
          issueType:       issue.problem,
          priority:        issue.severity,
          fixType:         mapCategoryToFixType(issue.category),
          source:          'seo-crawl',
          currentValue:    '',
          suggestedAction: issue.recommendedFix,
          approvalLevel:   issue.riskLevel === 'requires-approval' ? 'needs-developer'
                         : issue.riskLevel === 'needs-review'      ? 'needs-review'
                         : 'safe',
          estimatedImpact: issue.severity === 'critical' ? 'high'
                         : issue.severity === 'high'     ? 'high' : 'medium',
          affectedIssueIds: [issue.id],
          page: {
            title: null, titleLength: 0, metaDescription: null,
            metaDescriptionLength: 0, h1Texts: [], h2Count: 0,
            wordCount: 0, internalLinksCount: 0, schemaTypes: [],
            canonical: null, canonicalMatchesSelf: false,
            isNoindex: false, missingAltCount: 0, imageCount: 0, statusCode: 200,
          },
        };
        items.push(buildChecklistItemFromFixQueueItem(fakeItem, 'seo'));
      }
    }
  }

  // Build summary
  const byPlugin: Record<string, number>             = {};
  const byArea:   Partial<Record<WordPressArea, number>> = {};

  for (const item of items) {
    byPlugin[item.likelyPlugin] = (byPlugin[item.likelyPlugin] ?? 0) + 1;
    byArea[item.wordpressArea]  = (byArea[item.wordpressArea]  ?? 0) + 1;
  }

  return {
    domain:         result.domain,
    detectedCMS:    cmsDetection,
    checklistItems: items,
    summary: {
      totalItems:            items.length,
      safeItems:             items.filter(i => i.riskLevel === 'safe').length,
      needsReviewItems:      items.filter(i => i.riskLevel === 'needs-review').length,
      requiresApprovalItems: items.filter(i => i.riskLevel === 'requires-approval').length,
      byPlugin,
      byArea,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Category → FixType mapper ────────────────────────────────────────────────

function mapCategoryToFixType(category: string): FixType {
  switch (category) {
    case 'crawlability':    return 'Robots.txt';
    case 'indexability':    return 'Noindex';
    case 'on-page':         return 'SEO Title';
    case 'structured-data': return 'Article Schema';
    case 'internal-linking':return 'Internal Links';
    case 'image-seo':       return 'Image Alt Text';
    case 'social-og':       return 'SEO Title';
    case 'performance':     return 'Redirect';
    default:                return 'SEO Title';
  }
}
