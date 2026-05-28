// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Markdown Report Generator
// ─────────────────────────────────────────────────────────────────────────────
import type { ScanResult, SEOIssue, PageData, SchemaIssue, GSCDecisionSummary, ReportExportData, SnapshotComparisonResult, WordPressFixGuide } from '@/types/seo';
import { getScoreLabel } from './scoring';
import { getSchemaScoreLabel } from './schemaScoring';

function severityEmoji(sev: string): string {
  switch (sev) {
    case 'critical': return '🔴';
    case 'high':     return '🟠';
    case 'medium':   return '🟡';
    case 'low':      return '🔵';
    default:         return '⚪';
  }
}

function riskEmoji(risk: string): string {
  switch (risk) {
    case 'safe':               return '✅ Safe to fix';
    case 'needs-review':       return '⚠️ Needs review';
    case 'requires-approval':  return '🚨 Requires approval';
    default:                   return risk;
  }
}

function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${score}/100`;
}

function truncate(str: string | null | undefined, max = 80): string {
  if (!str) return '—';
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

// ─── Issue section ────────────────────────────────────────────────────────────

function renderIssue(issue: SEOIssue, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index + 1}. ${severityEmoji(issue.severity)} ${issue.problem}`);
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| **Severity** | ${issue.severity.toUpperCase()} |`);
  lines.push(`| **Category** | ${issue.category} |`);
  lines.push(`| **Risk Level** | ${riskEmoji(issue.riskLevel)} |`);
  lines.push(`| **Auto-fixable** | ${issue.autoFixable ? 'Yes' : 'No'} |`);
  lines.push(`| **Affected Pages** | ${issue.count} |`);
  lines.push('');
  lines.push(`**🔍 Technical Detail:**`);
  lines.push(`> ${issue.technicalDetail}`);
  lines.push('');
  lines.push(`**💬 Client Explanation:**`);
  lines.push(`> ${issue.clientExplanation}`);
  lines.push('');
  lines.push(`**❓ Why It Matters:**`);
  lines.push(`> ${issue.whyItMatters}`);
  lines.push('');
  lines.push(`**🔧 Recommended Fix:**`);
  lines.push(`> ${issue.recommendedFix}`);
  lines.push('');
  lines.push(`**👨‍💻 Developer Instruction:**`);
  lines.push('```');
  lines.push(issue.developerInstruction);
  lines.push('```');
  if (issue.affectedPages.length > 0) {
    lines.push('');
    lines.push(`**📄 Affected URLs (showing first 10):**`);
    issue.affectedPages.slice(0, 10).forEach(url => lines.push(`- ${url}`));
    if (issue.affectedPages.length > 10) {
      lines.push(`- …and ${issue.affectedPages.length - 10} more`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ─── Page table ───────────────────────────────────────────────────────────────

function renderPageTable(pages: PageData[]): string {
  const lines: string[] = [];
  lines.push('| URL | Status | Title | H1 | Canonical | Noindex | Words | Schema |');
  lines.push('|-----|--------|-------|-----|-----------|---------|-------|--------|');

  for (const p of pages.slice(0, 100)) {
    const url      = truncate(p.finalUrl || p.url, 60);
    const status   = p.crawlError ? `ERR` : String(p.statusCode);
    const title    = truncate(p.title, 40);
    const h1       = p.h1Count === 1 ? '✓' : p.h1Count === 0 ? '✗ Missing' : `⚠ ${p.h1Count}×`;
    const canon    = p.canonical ? (p.canonicalMatchesSelf ? '✓ Self' : '⚠ Other') : '✗';
    const noindex  = p.isNoindex ? '🚫 Yes' : '—';
    const words    = p.wordCount > 0 ? String(p.wordCount) : '—';
    const schema   = p.hasStructuredData ? `✓ ${p.structuredDataTypes.join(', ')}` : '—';
    lines.push(`| ${url} | ${status} | ${title} | ${h1} | ${canon} | ${noindex} | ${words} | ${schema} |`);
  }

  if (pages.length > 100) {
    lines.push(`| …and ${pages.length - 100} more pages | | | | | | | |`);
  }
  return lines.join('\n');
}

// ─── Main report function ─────────────────────────────────────────────────────

export function generateMarkdownReport(result: ScanResult, gscData?: GSCDecisionSummary): string {
  const { domain, startUrl, crawledAt, crawlDuration, pages, robots, sitemap, issues, score, summary } = result;
  const { label: scoreLabel } = getScoreLabel(score.overall);
  const date = new Date(crawledAt).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' });

  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  lines.push(`# 🩺 Elitez Technical SEO Doctor Report`);
  lines.push('');
  lines.push(`> **Domain:** ${domain}  `);
  lines.push(`> **Start URL:** ${startUrl}  `);
  lines.push(`> **Crawled:** ${date} (SGT)  `);
  lines.push(`> **Crawl Duration:** ${crawlDuration}s  `);
  lines.push(`> **Pages Crawled:** ${summary.totalPages}  `);
  lines.push(`> **Report Generated by:** Elitez Technical SEO Doctor v1.0`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Overall Score ──────────────────────────────────────────────────────────
  lines.push(`## 📊 Overall SEO Health Score: ${score.overall}/100 — ${scoreLabel}`);
  lines.push('');
  lines.push(`\`${scoreBar(score.overall)}\``);
  lines.push('');

  lines.push(`### Score Breakdown`);
  lines.push('');
  lines.push(`| Category | Score | Weight | Contribution |`);
  lines.push(`|----------|-------|--------|--------------|`);
  lines.push(`| Crawlability | ${score.crawlability}/100 | 20% | ${Math.round(score.crawlability * 0.2)} pts |`);
  lines.push(`| Indexability | ${score.indexability}/100 | 20% | ${Math.round(score.indexability * 0.2)} pts |`);
  lines.push(`| On-page Technical SEO | ${score.onPageTechnical}/100 | 15% | ${Math.round(score.onPageTechnical * 0.15)} pts |`);
  lines.push(`| Structured Data | ${score.structuredData}/100 | 15% | ${Math.round(score.structuredData * 0.15)} pts |`);
  lines.push(`| Performance (est.) | ${score.performance}/100 | 10% | ${Math.round(score.performance * 0.10)} pts |`);
  lines.push(`| Internal Linking | ${score.internalLinking}/100 | 10% | ${Math.round(score.internalLinking * 0.10)} pts |`);
  lines.push(`| Image SEO | ${score.imageSEO}/100 | 5% | ${Math.round(score.imageSEO * 0.05)} pts |`);
  lines.push(`| Social / Open Graph | ${score.socialOpenGraph}/100 | 5% | ${Math.round(score.socialOpenGraph * 0.05)} pts |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Summary ────────────────────────────────────────────────────────────────
  lines.push(`## 📋 Crawl Summary`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Pages Crawled | **${summary.totalPages}** |`);
  lines.push(`| Indexable Pages | ${summary.indexablePages} |`);
  lines.push(`| Noindex Pages | ${summary.noindexPages} |`);
  lines.push(`| HTTP Error Pages (4xx/5xx) | ${summary.errorPages} |`);
  lines.push(`| Redirect Pages | ${summary.redirectPages} |`);
  lines.push(`| Pages Missing Title | ${summary.pagesWithMissingTitle} |`);
  lines.push(`| Pages Missing Description | ${summary.pagesWithMissingDescription} |`);
  lines.push(`| Pages Missing H1 | ${summary.pagesWithMissingH1} |`);
  lines.push(`| Pages with Multiple H1 | ${summary.pagesWithMultipleH1} |`);
  lines.push(`| Pages with Structured Data | ${summary.pagesWithStructuredData} |`);
  lines.push(`| Pages with Open Graph Tags | ${summary.pagesWithOgTags} |`);
  lines.push(`| 🔴 Critical Issues | ${summary.criticalIssues} |`);
  lines.push(`| 🟠 High Issues | ${summary.highIssues} |`);
  lines.push(`| 🟡 Medium Issues | ${summary.mediumIssues} |`);
  lines.push(`| 🔵 Low Issues | ${summary.lowIssues} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Robots & Sitemap ───────────────────────────────────────────────────────
  lines.push(`## 🤖 Robots.txt & Sitemap`);
  lines.push('');
  lines.push(`### robots.txt (${robots.url})`);
  lines.push(`- **Status:** ${robots.accessible ? '✅ Accessible' : '❌ Not accessible'} (HTTP ${robots.statusCode ?? 'N/A'})`);
  lines.push(`- **User-agent * rule:** ${robots.hasUserAgentStar ? 'Found' : 'Not found'}`);
  lines.push(`- **Sitemap directive:** ${robots.hasSitemapDirective ? `Found → ${robots.sitemapUrls.join(', ')}` : 'Not found'}`);
  if (robots.blockedPaths.length > 0) {
    lines.push(`- **Blocked paths:** ${robots.blockedPaths.slice(0, 10).join(', ')}`);
  }
  lines.push('');
  lines.push(`### sitemap.xml (${sitemap.url})`);
  lines.push(`- **Status:** ${sitemap.accessible ? '✅ Accessible' : '❌ Not accessible'} (HTTP ${sitemap.statusCode ?? 'N/A'})`);
  lines.push(`- **URL Count:** ${sitemap.urlCount}`);
  lines.push(`- **Type:** ${sitemap.isSitemapIndex ? 'Sitemap Index' : 'Standard Sitemap'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Issues ────────────────────────────────────────────────────────────────
  lines.push(`## 🚨 Issues Found (${issues.length} total)`);
  lines.push('');

  const critical = issues.filter(i => i.severity === 'critical');
  const high     = issues.filter(i => i.severity === 'high');
  const medium   = issues.filter(i => i.severity === 'medium');
  const low      = issues.filter(i => i.severity === 'low');

  if (critical.length > 0) {
    lines.push(`### 🔴 Critical Issues (${critical.length})`);
    lines.push('');
    critical.forEach((iss, i) => lines.push(renderIssue(iss, i)));
  }

  if (high.length > 0) {
    lines.push(`### 🟠 High Priority Issues (${high.length})`);
    lines.push('');
    high.forEach((iss, i) => lines.push(renderIssue(iss, i)));
  }

  if (medium.length > 0) {
    lines.push(`### 🟡 Medium Priority Issues (${medium.length})`);
    lines.push('');
    medium.forEach((iss, i) => lines.push(renderIssue(iss, i)));
  }

  if (low.length > 0) {
    lines.push(`### 🔵 Low Priority Issues (${low.length})`);
    lines.push('');
    low.forEach((iss, i) => lines.push(renderIssue(iss, i)));
  }

  // ── Page Table ────────────────────────────────────────────────────────────
  lines.push(`## 📄 Crawled Pages Detail`);
  lines.push('');
  lines.push(renderPageTable(pages));
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── V2: Schema Audit Section ──────────────────────────────────────────────
  if (result.schemaAudit) {
    const sa = result.schemaAudit;
    const { label: schemaLabel } = getSchemaScoreLabel(sa.score.overall);

    lines.push(`## 📋 Schema Markup Audit`);
    lines.push('');
    lines.push(`### Schema Health Score: ${sa.score.overall}/100 — ${schemaLabel}`);
    lines.push('');
    lines.push(`\`${scoreBar(sa.score.overall)}\``);
    lines.push('');

    lines.push(`| Sub-Score | Score | Weight |`);
    lines.push(`|-----------|-------|--------|`);
    lines.push(`| Valid JSON-LD | ${sa.score.validJson}/100 | 25% |`);
    lines.push(`| Correct Types by Page | ${sa.score.correctTypes}/100 | 25% |`);
    lines.push(`| Required Properties | ${sa.score.requiredProperties}/100 | 25% |`);
    lines.push(`| No Duplicates | ${sa.score.noDuplicates}/100 | 15% |`);
    lines.push(`| Content Consistency | ${sa.score.contentConsistency}/100 | 10% |`);
    lines.push('');

    lines.push(`### Schema Summary`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Pages with Schema | ${sa.summary.totalPagesWithSchema} |`);
    lines.push(`| Pages without Schema | ${sa.summary.totalPagesWithoutSchema} |`);
    lines.push(`| Total Schema Blocks | ${sa.summary.totalSchemaBlocks} |`);
    lines.push(`| Invalid JSON-LD Blocks | ${sa.summary.invalidSchemaBlocks} |`);
    lines.push(`| Unique Schema Types | ${sa.summary.uniqueSchemaTypes} |`);
    if (sa.summary.missingCriticalTypes.length > 0) {
      lines.push(`| Missing Critical Types | ${sa.summary.missingCriticalTypes.join(', ')} |`);
    }
    lines.push('');

    if (Object.keys(sa.typeCounts).length > 0) {
      lines.push(`### Schema Types Found`);
      lines.push('');
      lines.push(`| Type | Pages |`);
      lines.push(`|------|-------|`);
      Object.entries(sa.typeCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([t, c]) => lines.push(`| ${t} | ${c} |`));
      lines.push('');
    }

    if (sa.issues.length > 0) {
      lines.push(`### Schema Issues (${sa.issues.length})`);
      lines.push('');
      sa.issues.forEach((si, i) => {
        lines.push(`#### ${i + 1}. ${severityEmoji(si.severity)} ${si.problem}`);
        lines.push('');
        lines.push(`| Property | Value |`);
        lines.push(`|----------|-------|`);
        lines.push(`| **Severity** | ${si.severity.toUpperCase()} |`);
        lines.push(`| **Schema Type** | ${si.schemaType} |`);
        lines.push(`| **Fix Safety** | ${riskEmoji(si.fixSafety)} |`);
        lines.push(`| **Affected Pages** | ${si.count} |`);
        lines.push('');
        lines.push(`> **Client Explanation:** ${si.clientExplanation}`);
        lines.push('');
        lines.push(`> **Why it matters:** ${si.whyItMatters}`);
        lines.push('');
        lines.push(`> **Fix:** ${si.recommendedFix}`);
        lines.push('');
        if (si.developerInstruction) {
          lines.push('```json');
          lines.push(si.developerInstruction);
          lines.push('```');
          lines.push('');
        }
        if (si.suggestedSchema) {
          lines.push('**Suggested Schema:**');
          lines.push('```json');
          lines.push(JSON.stringify(si.suggestedSchema, null, 2));
          lines.push('```');
          lines.push('');
        }
        if (si.affectedPages.length > 0) {
          si.affectedPages.slice(0, 5).forEach(u => lines.push(`- ${u}`));
          if (si.affectedPages.length > 5) lines.push(`- …and ${si.affectedPages.length - 5} more`);
          lines.push('');
        }
        lines.push('---');
        lines.push('');
      });
    }

    if (sa.recommendedTypes.length > 0) {
      lines.push(`### Recommended Schema to Add`);
      lines.push('');
      sa.recommendedTypes.forEach(rt => {
        lines.push(`#### Add ${rt.schemaType} schema`);
        lines.push(`> ${rt.reason}`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(rt.suggestedSchema, null, 2));
        lines.push('```');
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('');
  }

  // ── GSC Indexing Decision Summary (optional) ────────────────────────────────
  if (gscData) {
    const { records, summary: gs, fileName: gf } = gscData;
    lines.push('---');
    lines.push('');
    lines.push(`## 📊 GSC Indexing Decisions`);
    lines.push('');
    lines.push(`> Source file: ${gf} · Imported: ${new Date(gscData.importedAt).toLocaleString('en-GB')}`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total URLs | ${gs.totalUrls} |`);
    lines.push(`| Already Indexed | ${gs.indexedCount} |`);
    lines.push(`| Action Required | ${gs.actionRequiredCount} |`);
    lines.push(`| Matched with Crawl | ${gs.matchedCount}/${gs.totalUrls} |`);
    lines.push(`| 🔴 Critical | ${gs.priorityBreakdown.critical} |`);
    lines.push(`| 🟠 High | ${gs.priorityBreakdown.high} |`);
    lines.push(`| 🟡 Medium | ${gs.priorityBreakdown.medium} |`);
    lines.push(`| 🔵 Low | ${gs.priorityBreakdown.low} |`);
    lines.push('');

    // Top action URLs
    const actionUrls = records
      .filter(r => r.decision.decision !== 'Index')
      .sort((a, b) => {
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return p[a.decision.priority] - p[b.decision.priority];
      })
      .slice(0, 20);

    if (actionUrls.length) {
      lines.push(`### Top ${actionUrls.length} Action Items`);
      lines.push('');
      lines.push(`| Priority | URL | Decision | Approval |`);
      lines.push(`|----------|-----|----------|----------|`);
      for (const r of actionUrls) {
        const ap = r.decision.approvalLevel === 'safe' ? '✅' : r.decision.approvalLevel === 'needs-review' ? '⚠️' : '🚨';
        const pr = r.decision.priority === 'critical' ? '🔴' : r.decision.priority === 'high' ? '🟠' : r.decision.priority === 'medium' ? '🟡' : '🔵';
        lines.push(`| ${pr} ${r.decision.priority} | ${r.gsc.url} | ${r.decision.decision} | ${ap} |`);
      }
      lines.push('');
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  lines.push(`*Report generated by [Elitez Technical SEO Doctor](https://elitez.asia) — ${date} (SGT)*`);
  lines.push('');

  return lines.join('\n');
}

export function downloadMarkdownReport(result: ScanResult): void {
  const md   = generateMarkdownReport(result);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `seo-report-${result.domain}-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// V5: Mode-specific Markdown reports
// ─────────────────────────────────────────────────────────────────────────────

/** Client-friendly summary report — plain language, no code blocks */
export function generateClientSummaryMarkdown(data: ReportExportData): string {
  const { settings: { brand }, executiveSummary: es, roadmap, result } = data;
  const date = new Date(result.crawledAt).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' });
  const lines: string[] = [];

  lines.push(`# ${brand.brandName} — SEO Client Summary Report`);
  lines.push('');
  lines.push(`**Prepared for:** ${brand.clientName || result.domain}  `);
  lines.push(`**Website:** ${brand.websiteUrl || result.startUrl}  `);
  lines.push(`**Report Date:** ${brand.reportDate}  `);
  lines.push(`**Prepared by:** ${brand.preparedBy}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(`## Overall SEO Health Score: ${es.overallScore}/100`);
  lines.push('');
  lines.push(`${scoreBar(es.overallScore)}`);
  lines.push('');
  if (es.schemaScore !== null) {
    lines.push(`**Schema Health Score:** ${es.schemaScore}/100 — ${scoreBar(es.schemaScore)}`);
    lines.push('');
  }

  lines.push(`## Assessment`);
  lines.push('');
  lines.push(es.overallHealth);
  lines.push('');

  lines.push(`## Key Risks Identified`);
  lines.push('');
  es.topRisks.forEach(r => lines.push(`- ${r}`));
  lines.push('');

  lines.push(`## Business Impact`);
  lines.push('');
  lines.push(es.businessImpact);
  lines.push('');

  lines.push(`## Recommended Next Step`);
  lines.push('');
  lines.push(`> ${es.recommendedNext}`);
  lines.push('');

  lines.push(`## Issue Summary`);
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Critical | ${es.criticalIssues} |`);
  lines.push(`| 🟠 High | ${es.highIssues} |`);
  lines.push(`| 🟡 Medium | ${es.mediumIssues} |`);
  lines.push(`| 🔵 Low | ${es.lowIssues} |`);
  lines.push(`| **Total** | **${es.totalFixes}** |`);
  lines.push('');

  lines.push(`## 30-Day Action Roadmap`);
  lines.push('');
  for (const week of roadmap) {
    lines.push(`### ${week.title}`);
    lines.push(`> **Goal:** ${week.goal}`);
    lines.push('');
    week.tasks.forEach(t => lines.push(`- [${t.priority.toUpperCase()}] ${t.task} — *${t.owner}*`));
    lines.push('');
    lines.push(`**Expected outcome:** ${week.expectedOutcome}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`> **Disclaimer:** ${es.confidenceNote}`);
  lines.push('');
  lines.push(`*Generated by ${brand.brandName} — ${date} (SGT)*`);

  // ── V6: Optional comparison section ──────────────────────────────────────
  if (data.comparison) {
    lines.push('');
    lines.push(generateComparisonMarkdown(data.comparison));
  }

  // ── V7: Optional WordPress section ────────────────────────────────────────
  if (data.wordpressGuide) {
    lines.push('');
    lines.push(generateWordPressMarkdownSection(data.wordpressGuide));
  }

  return lines.join('\n');
}

/** Developer-focused fix plan with instructions and task table */
export function generateDeveloperFixPlanMarkdown(data: ReportExportData): string {
  const { settings: { brand }, executiveSummary: es, roadmap, developerTasks, result } = data;
  const date = new Date(result.crawledAt).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' });
  const lines: string[] = [];

  lines.push(`# ${brand.brandName} — Developer Fix Plan`);
  lines.push('');
  lines.push(`**Domain:** ${result.domain}  `);
  lines.push(`**Scan Date:** ${date} (SGT)  `);
  lines.push(`**Prepared by:** ${brand.preparedBy}  `);
  lines.push(`**Total Tasks:** ${developerTasks.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  lines.push(`## Priority Summary`);
  lines.push('');
  lines.push(`| Priority | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| 🔴 Critical | ${es.criticalIssues} |`);
  lines.push(`| 🟠 High | ${es.highIssues} |`);
  lines.push(`| 🟡 Medium | ${es.mediumIssues} |`);
  lines.push(`| 🔵 Low | ${es.lowIssues} |`);
  lines.push('');

  lines.push(`## Developer Task List`);
  lines.push('');
  lines.push(`| # | Priority | URL | Issue | Owner | Approval | Status |`);
  lines.push(`|---|----------|-----|-------|-------|----------|--------|`);
  developerTasks.forEach((t, i) => {
    const pri = t.priority === 'critical' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🔵';
    lines.push(`| ${i + 1} | ${pri} ${t.priority} | ${truncate(t.url, 60)} | ${truncate(t.issue, 50)} | ${t.owner} | ${t.approvalLevel} | ⬜ Pending |`);
  });
  lines.push('');

  lines.push(`## Task Details`);
  lines.push('');
  developerTasks.forEach((t, i) => {
    lines.push(`### ${i + 1}. ${severityEmoji(t.priority)} ${t.issue}`);
    lines.push('');
    lines.push(`- **URL:** \`${t.url}\``);
    lines.push(`- **Priority:** ${t.priority.toUpperCase()}`);
    lines.push(`- **Approval Level:** ${t.approvalLevel}`);
    lines.push(`- **Owner:** ${t.owner}`);
    lines.push(`- **Recommended Fix:** ${t.recommendedFix}`);
    lines.push('');
    if (t.developerInstruction) {
      lines.push(`**Developer Instructions:**`);
      lines.push('```');
      lines.push(t.developerInstruction);
      lines.push('```');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  lines.push(`## 30-Day Roadmap`);
  lines.push('');
  for (const week of roadmap) {
    lines.push(`### ${week.title}`);
    lines.push(`> **Goal:** ${week.goal}`);
    lines.push('');
    week.tasks.forEach(t => lines.push(`- [${t.priority.toUpperCase()}] ${t.task} — *${t.owner}*${t.url ? ` — \`${t.url}\`` : ''}`));
    lines.push('');
    lines.push(`**Expected outcome:** ${week.expectedOutcome}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`> **Disclaimer:** ${es.confidenceNote}`);
  lines.push('');
  lines.push(`*Generated by ${brand.brandName} — ${date} (SGT)*`);

  // ── V6: Optional comparison section ──────────────────────────────────────
  if (data.comparison) {
    lines.push('');
    lines.push(generateComparisonMarkdown(data.comparison));
  }

  // ── V7: Optional WordPress section ────────────────────────────────────────
  if (data.wordpressGuide) {
    lines.push('');
    lines.push(generateWordPressMarkdownSection(data.wordpressGuide));
  }

  return lines.join('\n');
}

/** Full technical audit combining all sections */
export function generateFullAuditMarkdown(data: ReportExportData): string {
  const { result, schemaAudit, gscData, settings: { brand } } = data;

  // Start with the existing comprehensive report
  const baseReport = generateMarkdownReport(result, gscData ?? undefined);

  // Append V5 sections
  const lines: string[] = [baseReport];

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`# V5 — Fix Queue & Action Plan`);
  lines.push(`> Report prepared by: ${brand.preparedBy} · ${brand.reportDate}`);
  lines.push('');

  // Executive summary section
  const es = data.executiveSummary;
  lines.push(`## Executive Summary`);
  lines.push('');
  lines.push(es.overallHealth);
  lines.push('');
  lines.push(`### Top Risks`);
  lines.push('');
  es.topRisks.forEach(r => lines.push(`- ${r}`));
  lines.push('');
  lines.push(`**Recommended Next Step:** ${es.recommendedNext}`);
  lines.push('');

  // Fix queue
  lines.push(`## Fix Queue (${data.fixQueue.length} items)`);
  lines.push('');
  lines.push(`| Priority | Fix Type | Issue | URL | Approval |`);
  lines.push(`|----------|----------|-------|-----|----------|`);
  data.fixQueue.slice(0, 30).forEach(i => {
    const p = i.priority === 'critical' ? '🔴' : i.priority === 'high' ? '🟠' : i.priority === 'medium' ? '🟡' : '🔵';
    lines.push(`| ${p} ${i.priority} | ${i.fixType} | ${truncate(i.issueType, 50)} | ${truncate(i.url, 60)} | ${i.approvalLevel} |`);
  });
  if (data.fixQueue.length > 30) {
    lines.push(`| … | … | *+${data.fixQueue.length - 30} more items* | | |`);
  }
  lines.push('');

  // Developer tasks
  lines.push(`## Developer Tasks (${data.developerTasks.length} tasks)`);
  lines.push('');
  lines.push(`| Priority | URL | Issue | Owner | Status |`);
  lines.push(`|----------|-----|-------|-------|--------|`);
  data.developerTasks.forEach(t => {
    const p = t.priority === 'critical' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🔵';
    lines.push(`| ${p} ${t.priority} | ${truncate(t.url, 55)} | ${truncate(t.issue, 45)} | ${t.owner} | ⬜ Pending |`);
  });
  lines.push('');

  // Roadmap
  lines.push(`## 30-Day Roadmap`);
  lines.push('');
  for (const week of data.roadmap) {
    lines.push(`### ${week.title}`);
    lines.push(`> **Goal:** ${week.goal}`);
    lines.push('');
    week.tasks.forEach(t => lines.push(`- [${t.priority.toUpperCase()}] ${t.task} — *${t.owner}*`));
    lines.push('');
    lines.push(`**Expected outcome:** ${week.expectedOutcome}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`> **Disclaimer:** ${es.confidenceNote}`);

  // ── V6: Optional comparison section ──────────────────────────────────────
  if (data.comparison) {
    lines.push('');
    lines.push(generateComparisonMarkdown(data.comparison));
  }

  // ── V7: Optional WordPress section ────────────────────────────────────────
  if (data.wordpressGuide) {
    lines.push('');
    lines.push(generateWordPressMarkdownSection(data.wordpressGuide));
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// V6: Comparison Markdown Section
// ─────────────────────────────────────────────────────────────────────────────

export function generateComparisonMarkdown(comparison: SnapshotComparisonResult): string {
  const { beforeSnapshot, afterSnapshot, metrics, resolvedIssues, newIssues, persistentIssues,
    resolvedCount, newCount, persistentCount, scoreImprovement } = comparison;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const lines: string[] = [];

  lines.push(`## 📈 Progress Comparison`);
  lines.push('');
  lines.push(`> **Before:** ${beforeSnapshot.name} (crawled ${fmtDate(beforeSnapshot.crawledAt)})  `);
  lines.push(`> **After:** ${afterSnapshot.name} (crawled ${fmtDate(afterSnapshot.crawledAt)})  `);
  lines.push(`> **Score change:** ${scoreImprovement > 0 ? '+' : ''}${scoreImprovement} points`);
  lines.push('');

  lines.push(`### Metric Changes`);
  lines.push('');
  lines.push(`| Metric | Before | After | Change | Direction |`);
  lines.push(`|--------|--------|-------|--------|-----------|`);
  for (const m of metrics) {
    const dir = m.direction === 'improved' ? '↑ Improved' : m.direction === 'regressed' ? '↓ Regressed' : '→ Unchanged';
    const deltaStr = m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${m.delta}${m.unit === '/100' ? '' : m.unit ? ` ${m.unit}` : ''}`;
    lines.push(`| ${m.label} | ${m.before}${m.unit === '/100' ? '/100' : ''} | ${m.after}${m.unit === '/100' ? '/100' : ''} | ${deltaStr} | ${dir} |`);
  }
  lines.push('');

  lines.push(`### Issue Changes`);
  lines.push('');
  lines.push(`| Category | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| ✅ Resolved issues | ${resolvedCount} |`);
  lines.push(`| ⚠️ New issues | ${newCount} |`);
  lines.push(`| 🔄 Persistent issues | ${persistentCount} |`);
  lines.push('');

  if (resolvedIssues.length > 0) {
    lines.push(`### ✅ Resolved Issues (${resolvedCount})`);
    lines.push('');
    resolvedIssues.forEach(fp => {
      lines.push(`- **[${fp.severity.toUpperCase()}]** ${fp.label} *(${fp.category})*`);
    });
    lines.push('');
  }

  if (newIssues.length > 0) {
    lines.push(`### ⚠️ New Issues (${newCount})`);
    lines.push('');
    newIssues.forEach(fp => {
      lines.push(`- **[${fp.severity.toUpperCase()}]** ${fp.label} *(${fp.category})*`);
    });
    lines.push('');
  }

  lines.push(`---`);
  lines.push('');
  lines.push(`> **Progress disclaimer:** This comparison reflects differences between two automated technical SEO audits. Improvements in technical metrics do not guarantee changes in search rankings or traffic. All findings should be reviewed by a qualified SEO professional.`);
  lines.push('');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// V7: WordPress Helper Markdown Section
// ─────────────────────────────────────────────────────────────────────────────

export function generateWordPressMarkdownSection(guide: WordPressFixGuide): string {
  const lines: string[] = [];
  const cms = guide.detectedCMS;

  lines.push(`## 🟣 WordPress Fix Guide`);
  lines.push('');
  lines.push(`> **CMS Detected:** ${cms.cmsName} (${cms.confidence} confidence)  `);
  lines.push(`> **Total Items:** ${guide.summary.totalItems}  `);
  lines.push(`> **Safe:** ${guide.summary.safeItems} · **Needs Review:** ${guide.summary.needsReviewItems} · **Requires Approval:** ${guide.summary.requiresApprovalItems}`);
  lines.push('');

  // Detected plugins
  if (cms.detectedPlugins.length > 0) {
    lines.push(`### Detected Plugins`);
    lines.push('');
    lines.push(`| Plugin | Category | Confidence |`);
    lines.push(`|--------|----------|------------|`);
    cms.detectedPlugins.forEach(p => {
      lines.push(`| ${p.name} | ${p.category} | ${p.confidence} |`);
    });
    lines.push('');
  }

  // Checklist table (top 30)
  if (guide.checklistItems.length > 0) {
    const shown = guide.checklistItems.slice(0, 30);
    lines.push(`### WordPress Fix Checklist (showing ${shown.length} of ${guide.checklistItems.length})`);
    lines.push('');
    lines.push(`| Priority | Issue | URL | WP Area | Plugin | Risk |`);
    lines.push(`|----------|-------|-----|---------|--------|------|`);
    shown.forEach(item => {
      const p = item.priority === 'critical' ? '🔴' : item.priority === 'high' ? '🟠' : item.priority === 'medium' ? '🟡' : '🔵';
      const risk = item.riskLevel === 'safe' ? '✅' : item.riskLevel === 'needs-review' ? '⚠️' : '🚨';
      lines.push(`| ${p} ${item.priority} | ${truncate(item.issueType, 40)} | ${truncate(item.url, 55)} | ${truncate(item.wordpressArea, 35)} | ${item.likelyPlugin} | ${risk} ${item.riskLevel} |`);
    });
    if (guide.checklistItems.length > 30) {
      lines.push(`| … | *+${guide.checklistItems.length - 30} more items* | | | | |`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push('');
  lines.push(`> **WordPress disclaimer:** All WordPress fix instructions are rule-based and advisory only. Risk levels are estimates. Always verify with a qualified SEO professional before applying changes, especially those rated "Requires Approval." No guarantee of search ranking improvements is expressed or implied.`);
  lines.push('');

  return lines.join('\n');
}
