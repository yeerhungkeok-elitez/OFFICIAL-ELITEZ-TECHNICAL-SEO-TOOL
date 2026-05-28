// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — 30-Day Roadmap Builder (V5)
// Groups fix-queue items into a 4-week action plan.
// Also builds the DeveloperTask list from FixQueueItem + FixSuggestion.
// ─────────────────────────────────────────────────────────────────────────────

import type { FixQueueItem, RoadmapWeek, RoadmapTask, DeveloperTask } from '@/types/seo';
import { generateFix } from './fixWriter';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ownerFor(item: FixQueueItem): string {
  if (item.approvalLevel === 'needs-developer') return 'Developer';
  if (item.approvalLevel === 'needs-review')    return 'SEO Specialist';
  return 'Content / SEO';
}

function truncate(str: string, max = 80): string {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

// ─── Developer Task List ──────────────────────────────────────────────────────

export function buildDeveloperTasks(fixQueue: FixQueueItem[]): DeveloperTask[] {
  return fixQueue.map(item => {
    let devInstr = '';
    try {
      const fix = generateFix(item);
      devInstr = fix.developerInstruction || fix.wordpressInstruction || item.suggestedAction;
    } catch {
      devInstr = item.suggestedAction;
    }

    return {
      priority:             item.priority,
      url:                  item.url,
      issue:                item.issueType,
      recommendedFix:       truncate(item.suggestedAction, 120),
      owner:                ownerFor(item),
      approvalLevel:        item.approvalLevel,
      developerInstruction: truncate(devInstr, 200),
      status:               'pending',
    };
  });
}

// ─── Roadmap Builder ──────────────────────────────────────────────────────────

export function buildRoadmap(fixQueue: FixQueueItem[]): RoadmapWeek[] {
  // ── Week 1: Critical Indexing & Access Fixes ──────────────────────────────
  const w1Items = fixQueue.filter(i =>
    i.priority === 'critical' ||
    ['Noindex', 'Canonical', 'Redirect', 'Sitemap', 'Robots.txt'].includes(i.fixType),
  );
  const week1Tasks: RoadmapTask[] = w1Items.slice(0, 8).map(i => ({
    task:     truncate(i.issueType, 80),
    priority: i.priority,
    owner:    ownerFor(i),
    url:      i.url,
    fixType:  i.fixType,
  }));
  if (week1Tasks.length === 0) {
    week1Tasks.push({
      task:     'Review and verify current indexing status of all key pages in GSC',
      priority: 'medium',
      owner:    'SEO Manager',
    });
  }

  // ── Week 2: Metadata, Schema & On-Page Fixes ──────────────────────────────
  const w2Items = fixQueue.filter(i =>
    ['SEO Title', 'Meta Description', 'H1', 'Heading Structure',
     'Organization Schema', 'Service Schema', 'Article Schema', 'Breadcrumb Schema'].includes(i.fixType),
  );
  const week2Tasks: RoadmapTask[] = w2Items.slice(0, 8).map(i => ({
    task:     truncate(i.issueType, 80),
    priority: i.priority,
    owner:    ownerFor(i),
    url:      i.url,
    fixType:  i.fixType,
  }));
  if (week2Tasks.length === 0) {
    week2Tasks.push({
      task:     'Audit and refresh page titles and meta descriptions across all key pages',
      priority: 'high',
      owner:    'SEO / Content',
    });
  }

  // ── Week 3: Content, FAQ & Internal Linking ───────────────────────────────
  const w3Items = fixQueue.filter(i =>
    ['FAQ Content', 'FAQPage Schema', 'Internal Links', 'Image Alt Text'].includes(i.fixType),
  );
  const week3Tasks: RoadmapTask[] = w3Items.slice(0, 8).map(i => ({
    task:     truncate(i.issueType, 80),
    priority: i.priority,
    owner:    ownerFor(i),
    url:      i.url,
    fixType:  i.fixType,
  }));
  if (week3Tasks.length === 0) {
    week3Tasks.push({
      task:     'Add FAQ sections with FAQPage schema to key service pages',
      priority: 'medium',
      owner:    'Content Team',
    });
    week3Tasks.push({
      task:     'Review and strengthen internal linking from homepage to service pages',
      priority: 'medium',
      owner:    'Content / SEO',
    });
  }

  // ── Week 4: Validation, GSC Resubmission & Monitoring ────────────────────
  const week4Tasks: RoadmapTask[] = [
    {
      task:     'Validate all implemented fixes using Google Search Console → URL Inspection',
      priority: 'medium',
      owner:    'SEO Manager',
    },
    {
      task:     'Submit updated sitemap.xml to Google Search Console → Sitemaps',
      priority: 'medium',
      owner:    'SEO Manager',
    },
    {
      task:     'Request re-indexing for all fixed pages via GSC URL Inspection tool',
      priority: 'medium',
      owner:    'SEO Manager',
    },
    {
      task:     'Test all schema markup using Google Rich Results Test (search.google.com/test/rich-results)',
      priority: 'medium',
      owner:    'Developer / SEO',
    },
    {
      task:     'Verify canonical tags are correctly set on all indexed pages',
      priority: 'low',
      owner:    'Developer',
    },
    {
      task:     'Review Core Web Vitals in Google Search Console → Experience → Core Web Vitals',
      priority: 'low',
      owner:    'Developer',
    },
    {
      task:     'Document completed fixes and schedule next monthly SEO health check',
      priority: 'low',
      owner:    'SEO Manager',
    },
  ];

  return [
    {
      week:            1,
      title:           'Week 1: Critical Indexing & Access Fixes',
      goal:            'Ensure all important pages can be found, accessed, and indexed by Google.',
      tasks:           week1Tasks,
      expectedOutcome: 'No critical pages blocked from indexing. Canonical issues resolved. Sitemap updated and correct.',
    },
    {
      week:            2,
      title:           'Week 2: Metadata, Schema & On-Page Fixes',
      goal:            'Improve how Google reads and displays your pages in search results.',
      tasks:           week2Tasks,
      expectedOutcome: 'All key pages have optimised titles (50–65 chars), meta descriptions (120–160 chars), correct H1s, and relevant schema markup.',
    },
    {
      week:            3,
      title:           'Week 3: Content, FAQ & Internal Linking',
      goal:            'Strengthen content quality signals and site structure for improved crawl depth.',
      tasks:           week3Tasks,
      expectedOutcome: 'FAQPage schema added to key service pages. Internal link network strengthened. All images have descriptive alt text.',
    },
    {
      week:            4,
      title:           'Week 4: Validation, GSC Resubmission & Monitoring',
      goal:            'Verify all fixes are live and re-submit updated pages to Google for indexing.',
      tasks:           week4Tasks,
      expectedOutcome: 'All fixes validated. Updated sitemap submitted. Key pages requested for re-indexing. Ongoing monitoring schedule established.',
    },
  ];
}
