// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Checklist Exporter (V7)
// Generates Markdown and CSV exports from a WordPressFixGuide.
// ─────────────────────────────────────────────────────────────────────────────

import type { WordPressFixGuide, WordPressChecklistItem, CMSDetectionResult } from '@/types/seo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function csvCell(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',');
}

function riskEmoji(risk: string): string {
  if (risk === 'safe')               return '✅ Safe';
  if (risk === 'needs-review')       return '⚠️ Needs Review';
  if (risk === 'requires-approval')  return '🚨 Requires Approval';
  return risk;
}

function approvalLabel(approval: string): string {
  if (approval === 'safe')           return '✅ Safe to Apply';
  if (approval === 'needs-review')   return '⚠️ Review First';
  if (approval === 'needs-developer')return '🛠 Needs Developer';
  return approval;
}

function priorityEmoji(p: string): string {
  if (p === 'critical') return '🔴 Critical';
  if (p === 'high')     return '🟠 High';
  if (p === 'medium')   return '🟡 Medium';
  return '🔵 Low';
}

// ─── CMS detection summary ────────────────────────────────────────────────────

function renderCMSMarkdown(cms: CMSDetectionResult): string {
  const lines: string[] = [];
  lines.push(`## 🔍 CMS Detection`);
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| CMS | **${cms.cmsName}** |`);
  lines.push(`| Confidence | ${cms.confidence} |`);
  lines.push(`| WordPress | ${cms.isWordPress ? '✅ Yes' : '❌ No'} |`);
  lines.push(`| WooCommerce | ${cms.hasWooCommerce ? '✅ Yes' : '❌ No'} |`);
  if (cms.detectedTheme) {
    lines.push(`| Theme | ${cms.detectedTheme.name} (${cms.detectedTheme.confidence}) |`);
  }
  lines.push('');

  if (cms.detectedPlugins.length > 0) {
    lines.push(`### Detected Plugins`);
    lines.push('');
    lines.push(`| Plugin | Confidence | Category | Evidence |`);
    lines.push(`|--------|------------|----------|----------|`);
    for (const p of cms.detectedPlugins) {
      lines.push(`| ${p.name} | ${p.confidence} | ${p.category} | ${p.evidence.slice(0, 80)} |`);
    }
    lines.push('');
  }

  if (cms.evidence.length > 0) {
    lines.push(`### Detection Evidence`);
    lines.push('');
    cms.evidence.forEach(e => lines.push(`- ${e}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ─── Single checklist item markdown ──────────────────────────────────────────

function renderItemMarkdown(item: WordPressChecklistItem, index: number): string {
  const lines: string[] = [];

  const riskIcon =
    item.riskLevel === 'safe'               ? '✅' :
    item.riskLevel === 'needs-review'       ? '⚠️' : '🚨';

  lines.push(`### ${index + 1}. ${riskIcon} ${item.issueType}`);
  lines.push('');
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| **URL** | \`${item.url}\` |`);
  lines.push(`| **Priority** | ${priorityEmoji(item.priority)} |`);
  lines.push(`| **WordPress Area** | ${item.wordpressArea} |`);
  lines.push(`| **Likely Plugin** | ${item.likelyPlugin} |`);
  lines.push(`| **Risk Level** | ${riskEmoji(item.riskLevel)} |`);
  lines.push(`| **Approval** | ${approvalLabel(item.approvalLevel)} |`);
  lines.push(`| **Source** | ${item.source} |`);
  lines.push('');

  if (item.warnings.length > 0) {
    lines.push(`> **⚠️ Warnings:**`);
    item.warnings.forEach(w => lines.push(`> - ${w}`));
    lines.push('');
  }

  if (item.notes) {
    lines.push(`> **Notes:** ${item.notes}`);
    lines.push('');
  }

  if (item.pluginInstructions.length > 0) {
    const primary = item.pluginInstructions[0];
    lines.push(`#### Fix Steps (${primary.pluginName})`);
    lines.push('');
    if (primary.prerequisite) {
      lines.push(`> **Prerequisite:** ${primary.prerequisite}`);
      lines.push('');
    }
    primary.steps.forEach(step => {
      const warn = step.isWarning ? ' ⚠️' : '';
      lines.push(`${step.stepNumber}. ${step.instruction}${warn}`);
      if (step.notes) lines.push(`   > ${step.notes}`);
    });
    lines.push('');

    if (primary.verificationSteps.length > 0) {
      lines.push(`#### Verification`);
      lines.push('');
      primary.verificationSteps.forEach((v, i) => lines.push(`${i + 1}. ${v}`));
      lines.push('');
    }

    // Additional plugin options
    if (item.pluginInstructions.length > 1) {
      lines.push(`<details>`);
      lines.push(`<summary>Alternative plugin instructions (${item.pluginInstructions.length - 1} more)</summary>`);
      lines.push('');
      for (const pi of item.pluginInstructions.slice(1)) {
        lines.push(`**${pi.pluginName}:**`);
        if (pi.prerequisite) lines.push(`> Prerequisite: ${pi.prerequisite}`);
        pi.steps.forEach(s => lines.push(`${s.stepNumber}. ${s.instruction}${s.isWarning ? ' ⚠️' : ''}`));
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// ─── Main Markdown export ─────────────────────────────────────────────────────

export function generateWordPressMarkdown(guide: WordPressFixGuide): string {
  const lines: string[] = [];
  const date = new Date(guide.generatedAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Singapore',
  });

  lines.push(`# 🟣 WordPress Fix Checklist — ${guide.domain}`);
  lines.push('');
  lines.push(`> **Generated:** ${date} (SGT)  `);
  lines.push(`> **CMS:** ${guide.detectedCMS.cmsName} (${guide.detectedCMS.confidence} confidence)  `);
  lines.push(`> **Total items:** ${guide.summary.totalItems} · Safe: ${guide.summary.safeItems} · Needs review: ${guide.summary.needsReviewItems} · Requires approval: ${guide.summary.requiresApprovalItems}`);
  lines.push('');
  lines.push('> ⚠️ **Disclaimer:** These are rule-based recommendations. All changes should be reviewed by a qualified SEO professional before implementation. Risk assessments are advisory only.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // CMS section
  lines.push(renderCMSMarkdown(guide.detectedCMS));

  // Summary table
  lines.push(`## 📊 Issue Summary`);
  lines.push('');
  lines.push(`| Risk Level | Count |`);
  lines.push(`|------------|-------|`);
  lines.push(`| ✅ Safe | ${guide.summary.safeItems} |`);
  lines.push(`| ⚠️ Needs Review | ${guide.summary.needsReviewItems} |`);
  lines.push(`| 🚨 Requires Approval | ${guide.summary.requiresApprovalItems} |`);
  lines.push('');

  if (Object.keys(guide.summary.byPlugin).length > 0) {
    lines.push(`### Items by Plugin`);
    lines.push('');
    lines.push(`| Plugin | Items |`);
    lines.push(`|--------|-------|`);
    for (const [plugin, count] of Object.entries(guide.summary.byPlugin).sort(([, a], [, b]) => b - a)) {
      lines.push(`| ${plugin} | ${count} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Checklist items grouped by risk
  const critical = guide.checklistItems.filter(i => i.priority === 'critical');
  const high     = guide.checklistItems.filter(i => i.priority === 'high');
  const medium   = guide.checklistItems.filter(i => i.priority === 'medium');
  const low      = guide.checklistItems.filter(i => i.priority === 'low');

  if (critical.length > 0) {
    lines.push(`## 🔴 Critical Priority (${critical.length})`);
    lines.push('');
    critical.forEach((item, i) => lines.push(renderItemMarkdown(item, i)));
  }
  if (high.length > 0) {
    lines.push(`## 🟠 High Priority (${high.length})`);
    lines.push('');
    high.forEach((item, i) => lines.push(renderItemMarkdown(item, i)));
  }
  if (medium.length > 0) {
    lines.push(`## 🟡 Medium Priority (${medium.length})`);
    lines.push('');
    medium.forEach((item, i) => lines.push(renderItemMarkdown(item, i)));
  }
  if (low.length > 0) {
    lines.push(`## 🔵 Low Priority (${low.length})`);
    lines.push('');
    low.forEach((item, i) => lines.push(renderItemMarkdown(item, i)));
  }

  lines.push('---');
  lines.push('');
  lines.push(`*WordPress Fix Checklist generated by Elitez Technical SEO Doctor — ${date} (SGT)*`);

  return lines.join('\n');
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function generateWordPressCSV(guide: WordPressFixGuide): string {
  const rows: string[] = [];

  // Header
  rows.push(csvRow([
    'URL',
    'Issue',
    'Priority',
    'WordPress Area',
    'Likely Plugin',
    'Risk Level',
    'Approval Level',
    'Source',
    'Warnings',
    'Primary Steps',
    'Verification Steps',
    'Notes',
  ]));

  for (const item of guide.checklistItems) {
    const primaryPI = item.pluginInstructions[0];
    const steps = primaryPI
      ? primaryPI.steps.map(s => `${s.stepNumber}. ${s.instruction}${s.isWarning ? ' [WARNING]' : ''}`).join(' | ')
      : item.fixSteps.map(s => `${s.stepNumber}. ${s.instruction}`).join(' | ');
    const verify = primaryPI
      ? primaryPI.verificationSteps.join(' | ')
      : item.verificationSteps.join(' | ');

    rows.push(csvRow([
      item.url,
      item.issueType,
      item.priority,
      item.wordpressArea,
      item.likelyPlugin,
      item.riskLevel,
      item.approvalLevel,
      item.source,
      item.warnings.join(' | '),
      steps,
      verify,
      item.notes,
    ]));
  }

  return rows.join('\n');
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadWordPressMarkdown(guide: WordPressFixGuide): void {
  const md   = generateWordPressMarkdown(guide);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `wordpress-fix-checklist-${guide.domain}-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadWordPressCSV(guide: WordPressFixGuide): void {
  const csv  = generateWordPressCSV(guide);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `wordpress-fix-checklist-${guide.domain}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
