// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Public Report Generator (V8)
// Generates simplified Markdown and PDF reports for public audit leads.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicReportData, PublicAuditTopIssue } from '@/types/seo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${score}/100`;
}

function severityEmoji(sev: string): string {
  if (sev === 'critical') return '🔴';
  if (sev === 'high')     return '🟠';
  if (sev === 'medium')   return '🟡';
  return '🔵';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Needs Improvement';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

// ─── Markdown report ──────────────────────────────────────────────────────────

export function generatePublicMarkdownReport(data: PublicReportData): string {
  const { lead, auditResult, generatedAt } = data;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });

  const lines: string[] = [];

  // Header
  lines.push(`# 🩺 Website SEO Snapshot — ${auditResult.domain}`);
  lines.push('');
  lines.push(`> **Prepared for:** ${lead.name}${lead.company ? ` · ${lead.company}` : ''}  `);
  lines.push(`> **Website:** ${auditResult.websiteUrl}  `);
  lines.push(`> **Scanned:** ${fmtDate(auditResult.scannedAt)} (SGT)  `);
  lines.push(`> **Report generated:** ${fmtDate(generatedAt)}  `);
  lines.push(`> **Prepared by:** Elitez Asia — Technical SEO & AI Search Specialists`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Score summary
  lines.push(`## 📊 SEO Health Score`);
  lines.push('');
  lines.push(`### Overall Score: ${auditResult.score}/100 — ${scoreLabel(auditResult.score)}`);
  lines.push('');
  lines.push(`\`${scoreBar(auditResult.score)}\``);
  lines.push('');
  if (auditResult.schemaScore !== null) {
    lines.push(`**Schema Health Score:** ${auditResult.schemaScore}/100 — ${scoreLabel(auditResult.schemaScore)}`);
    lines.push('');
    lines.push(`\`${scoreBar(auditResult.schemaScore)}\``);
    lines.push('');
  }

  // Quick facts
  lines.push(`### Snapshot Summary`);
  lines.push('');
  lines.push(`| Property | Status |`);
  lines.push(`|----------|--------|`);
  lines.push(`| Pages Scanned | ${auditResult.pagesScanned} |`);
  lines.push(`| WordPress Detected | ${auditResult.wordpressDetected ? '✅ Yes' : '❌ No'} |`);
  lines.push(`| Schema Markup Found | ${auditResult.schemaDetected ? '✅ Yes' : '❌ None detected'} |`);
  lines.push('');

  // Assessment
  lines.push(`## 🔍 Assessment`);
  lines.push('');
  lines.push(auditResult.teaserSummary);
  lines.push('');

  // Top issues
  if (auditResult.topIssues.length > 0) {
    lines.push(`## 🚨 Key Issues Found`);
    lines.push('');
    auditResult.topIssues.forEach((issue, i) => {
      lines.push(`### ${i + 1}. ${severityEmoji(issue.severity)} ${issue.problem}`);
      lines.push('');
      lines.push(`- **Severity:** ${issue.severity.toUpperCase()}`);
      lines.push(`- **Affected pages (estimated):** ${issue.count}`);
      lines.push('');
    });
    lines.push('> *This is a snapshot of the top issues found. A full audit reveals all technical SEO issues across every page.*');
    lines.push('');
  }

  // Recommended next steps
  lines.push(`## ✅ Recommended Next Steps`);
  lines.push('');
  auditResult.recommendedNextSteps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push('');

  // What's in the full audit
  lines.push(`## 🔒 Full Audit Includes`);
  lines.push('');
  lines.push('Your full technical SEO audit from Elitez would include:');
  lines.push('');
  lines.push('- Complete page-by-page analysis of all technical SEO factors');
  lines.push('- 20+ checks including titles, descriptions, canonicals, schema, and more');
  lines.push('- WordPress plugin-specific fix instructions (if applicable)');
  lines.push('- Developer task list with ready-to-implement code snippets');
  lines.push('- 30-day prioritised action roadmap');
  lines.push('- Branded PDF report for stakeholder presentations');
  lines.push('- AI-generated fix prompts for each issue');
  lines.push('');

  // CTA
  lines.push('---');
  lines.push('');
  lines.push(`## 📞 Get Your Full SEO Fix Plan`);
  lines.push('');
  lines.push('Ready to fix these issues and improve your website\'s search visibility?');
  lines.push('');
  lines.push(`- **Book a consultation:** [elitez.asia/contact](https://elitez.asia/contact)`);
  lines.push(`- **Request a fix proposal:** [elitez.asia/seo](https://elitez.asia/seo)`);
  lines.push(`- **Email:** hello@elitez.asia`);
  lines.push('');

  // Disclaimer
  lines.push('---');
  lines.push('');
  lines.push(`## ⚠️ Disclaimer`);
  lines.push('');
  lines.push(
    'This report is based on an automated technical SEO crawl of the publicly accessible pages of your website. ' +
    'It reflects the state of your site at the time of the scan. ' +
    'Technical SEO recommendations may affect search engine visibility over time, but Google outcomes — ' +
    'including ranking positions and organic traffic — are not guaranteed and depend on many factors beyond technical SEO. ' +
    'All recommendations should be reviewed by a qualified SEO professional before implementation.',
  );
  lines.push('');
  lines.push(`*Report generated by [Elitez Technical SEO Doctor](https://elitez.asia) — ${fmtDate(generatedAt)} (SGT)*`);

  return lines.join('\n');
}

// ─── PDF report ───────────────────────────────────────────────────────────────

export async function generatePublicPDFBlob(data: PublicReportData): Promise<Blob> {
  const { jsPDF }           = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { lead, auditResult, generatedAt } = data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as any;

  const W = 210, H = 297, ML = 20, MR = 20, MT = 22, MB = 18, CW = W - ML - MR;
  const PR = 37, PG = 99, PB = 235; // Elitez blue #2563EB

  let y = MT;
  const newPage  = () => { doc.addPage(); y = MT; };
  const needsPage = (h: number) => { if (y + h > H - MB) newPage(); };

  function sectionHeader(title: string) {
    needsPage(16);
    doc.setFillColor(PR, PG, PB);
    doc.rect(ML, y, CW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 4, y + 7);
    doc.setTextColor(30, 41, 59);
    y += 14;
  }

  function paragraph(text: string, size = 10) {
    needsPage(14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, CW) as string[];
    doc.text(lines, ML, y);
    y += lines.length * (size * 0.45) + 4;
  }

  function bold(text: string, size = 10) {
    needsPage(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(30, 41, 59);
    doc.text(text, ML, y);
    y += size * 0.45 + 3;
  }

  function afterTable() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY ?? y;
    y += 6;
  }

  function infoBox(text: string, bg: [number,number,number], fg: [number,number,number]) {
    needsPage(20);
    doc.setFillColor(...bg);
    doc.roundedRect(ML, y, CW, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...fg);
    const lines = doc.splitTextToSize(text, CW - 8) as string[];
    doc.text(lines, ML + 4, y + 6);
    y += 18;
    doc.setTextColor(30, 41, 59);
  }

  // ── Cover ──────────────────────────────────────────────────────────────────
  doc.setFillColor(PR, PG, PB);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Website SEO Snapshot', ML, 28);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(auditResult.domain, ML, 40);
  doc.setFontSize(9);
  doc.text(
    `Prepared for ${lead.name}${lead.company ? ` · ${lead.company}` : ''} · ${new Date(generatedAt).toLocaleDateString('en-GB')}`,
    ML, 52,
  );
  doc.setTextColor(30, 41, 59);
  y = 70;

  // ── Score hero ─────────────────────────────────────────────────────────────
  sectionHeader('SEO Health Score');
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  const scoreColour =
    auditResult.score >= 80 ? [21, 128, 61]  :
    auditResult.score >= 60 ? [161, 98, 7]   :
    auditResult.score >= 40 ? [194, 65, 12]  : [185, 28, 28];
  doc.setTextColor(...scoreColour);
  doc.text(`${auditResult.score}/100`, ML, y + 4);
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`— ${scoreLabel(auditResult.score)}`, ML + 30, y + 4);
  y += 14;
  doc.setTextColor(30, 41, 59);

  // Score progress bar
  const barW = CW;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(ML, y, barW, 5, 2, 2, 'F');
  const fillW = Math.round((auditResult.score / 100) * barW);
  doc.setFillColor(...scoreColour);
  doc.roundedRect(ML, y, fillW, 5, 2, 2, 'F');
  y += 12;

  // Quick stats
  autoTable(doc, {
    startY: y, margin: { left: ML, right: MR },
    head: [['Pages Scanned', 'WordPress', 'Schema Markup', 'Schema Score']],
    body: [[
      String(auditResult.pagesScanned),
      auditResult.wordpressDetected ? '✅ Detected' : '❌ Not detected',
      auditResult.schemaDetected    ? '✅ Found'    : '❌ None found',
      auditResult.schemaScore !== null ? `${auditResult.schemaScore}/100` : 'N/A',
    ]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [PR, PG, PB] as [number,number,number], textColor: 255, fontStyle: 'bold' as const },
  });
  afterTable();

  // ── Assessment ─────────────────────────────────────────────────────────────
  sectionHeader('Assessment');
  paragraph(auditResult.teaserSummary);

  // ── Top issues ─────────────────────────────────────────────────────────────
  if (auditResult.topIssues.length > 0) {
    sectionHeader('Key Issues Found');
    autoTable(doc, {
      startY: y, margin: { left: ML, right: MR },
      head: [['Severity', 'Issue', 'Affected Pages']],
      body: auditResult.topIssues.map((i: PublicAuditTopIssue) => [
        i.severity.toUpperCase(),
        i.problem,
        String(i.count),
      ]),
      styles:     { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [PR, PG, PB] as [number,number,number], textColor: 255, fontStyle: 'bold' as const },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 0) {
          const sev = (hookData.row.raw[0] as string).toLowerCase();
          if (sev === 'critical')      hookData.cell.styles.textColor = [185, 28, 28];
          else if (sev === 'high')     hookData.cell.styles.textColor = [194, 65, 12];
          else if (sev === 'medium')   hookData.cell.styles.textColor = [161, 98, 7];
        }
      },
    });
    afterTable();
    infoBox(
      'This snapshot shows the top issues found. A full audit reveals all technical SEO issues across every page of your website.',
      [255, 251, 235], [120, 53, 15],
    );
  }

  // ── Next steps ─────────────────────────────────────────────────────────────
  sectionHeader('Recommended Next Steps');
  auditResult.recommendedNextSteps.forEach((step, i) => {
    needsPage(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(`${i + 1}. ${step}`, CW - 4) as string[];
    doc.text(lines, ML + 2, y);
    y += lines.length * 5 + 3;
  });
  y += 4;

  // ── CTA ────────────────────────────────────────────────────────────────────
  sectionHeader('Get Your Full SEO Fix Plan');
  bold('Ready to fix these issues and improve your search visibility?');
  paragraph('Contact Elitez Asia to receive a full technical SEO audit and prioritised fix plan tailored to your website.');
  y += 2;
  autoTable(doc, {
    startY: y, margin: { left: ML, right: MR },
    head: [['Contact', 'Details']],
    body: [
      ['Website',   'elitez.asia'],
      ['Email',     'hello@elitez.asia'],
      ['Consult',   'elitez.asia/contact'],
      ['SEO Fix',   'elitez.asia/seo'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [PR, PG, PB] as [number,number,number], textColor: 255, fontStyle: 'bold' as const },
  });
  afterTable();

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  sectionHeader('Disclaimer');
  paragraph(
    'This report is based on an automated technical SEO crawl. ' +
    'Technical SEO changes may affect search engine visibility over time, but Google outcomes including rankings and traffic are not guaranteed. ' +
    'All recommendations should be reviewed by a qualified SEO professional before implementation.',
    9,
  );

  // ── Page decorations ───────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Elitez Technical SEO Doctor · ${auditResult.domain}`, ML, H - 8);
    doc.text(`Page ${i} of ${totalPages}`, W - MR, H - 8, { align: 'right' });
  }

  return doc.output('blob');
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadPublicMarkdownReport(data: PublicReportData): void {
  const md   = generatePublicMarkdownReport(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `seo-snapshot-${data.auditResult.domain}-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPublicPDFReport(data: PublicReportData): Promise<void> {
  const blob = await generatePublicPDFBlob(data);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `seo-snapshot-${data.auditResult.domain}-${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
