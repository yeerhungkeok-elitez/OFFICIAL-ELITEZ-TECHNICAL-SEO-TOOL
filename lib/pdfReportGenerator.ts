// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — PDF Report Generator (V5)
// Browser-only module — only call from 'use client' components.
// Uses jsPDF + jspdf-autotable via dynamic imports to avoid SSR issues.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportExportData, IssueSeverity, SnapshotComparisonResult } from '@/types/seo';

// ─── Types (local to this module) ────────────────────────────────────────────

type RGB = [number, number, number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsDoc = any; // jsPDF instance — typed loosely to avoid complex module augmentation issues

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexToRGB(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  // eslint-disable-next-line no-bitwise
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function severityRGB(sev: IssueSeverity): RGB {
  switch (sev) {
    case 'critical': return [220, 38, 38];
    case 'high':     return [234, 88, 12];
    case 'medium':   return [202, 138, 4];
    case 'low':      return [37, 99, 235];
    default:         return [100, 116, 139];
  }
}

function approvalLabel(a: string): string {
  if (a === 'safe')             return 'Safe';
  if (a === 'needs-review')     return 'Needs Review';
  if (a === 'needs-developer')  return 'Needs Dev';
  return a;
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function trunc(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  return s.length <= max ? s : s.slice(0, max) + '…';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generatePDFBlob(data: ReportExportData): Promise<Blob> {
  // ── Dynamic imports (browser-only) ─────────────────────────────────────────
  const { jsPDF }    = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const { settings, executiveSummary: es, roadmap, developerTasks, result, schemaAudit, gscData, fixQueue, comparison, wordpressGuide } = data;
  const { brand, mode } = settings;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsDoc;

  const W   = 210;   // page width mm
  const H   = 297;   // page height mm
  const ML  = 20;    // left margin
  const MR  = 20;    // right margin
  const MT  = 22;    // top margin
  const MB  = 18;    // bottom margin
  const CW  = W - ML - MR;  // content width = 170mm

  const [pr, pg, pb] = hexToRGB(brand.primaryColor);

  // ── Y tracker ──────────────────────────────────────────────────────────────
  let y = MT;

  function newPage() {
    doc.addPage();
    y = MT;
  }

  function needsPage(height: number) {
    if (y + height > H - MB) newPage();
  }

  // ── Typography helpers ─────────────────────────────────────────────────────

  function setBody(size = 10) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(30, 41, 59);
  }

  function setBold(size = 10) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(30, 41, 59);
  }

  function setGray(size = 9) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(100, 116, 139);
  }

  function sectionHeader(title: string) {
    needsPage(16);
    doc.setFillColor(pr, pg, pb);
    doc.rect(ML, y, CW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 4, y + 7);
    doc.setTextColor(30, 41, 59);
    y += 14;
  }

  function subHeader(title: string) {
    needsPage(10);
    setBold(10);
    doc.setTextColor(pr, pg, pb);
    doc.text(title, ML, y);
    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(0.3);
    doc.line(ML, y + 1.5, ML + CW, y + 1.5);
    setBody();
    y += 8;
  }

  function paragraph(text: string, indent = 0) {
    const lines = doc.splitTextToSize(text, CW - indent) as string[];
    for (const line of lines) {
      needsPage(7);
      setBody(9.5);
      doc.text(line, ML + indent, y);
      y += 5.5;
    }
    y += 2;
  }

  function bullet(text: string, indent = 4) {
    const lines = doc.splitTextToSize('• ' + text, CW - indent) as string[];
    for (let i = 0; i < lines.length; i++) {
      needsPage(6);
      setBody(9);
      doc.text(i === 0 ? lines[0] : '  ' + lines[i], ML + indent, y);
      y += 5;
    }
  }

  function keyValue(key: string, value: string) {
    needsPage(6);
    setBold(9);
    doc.text(key + ':', ML, y);
    setBody(9);
    doc.text(value, ML + 45, y);
    y += 5.5;
  }

  function infoBox(text: string, fillRGB: RGB = [239, 246, 255], textRGB: RGB = [30, 58, 138]) {
    const lines = doc.splitTextToSize(text, CW - 8) as string[];
    const bh    = lines.length * 5 + 6;
    needsPage(bh);
    doc.setFillColor(...fillRGB);
    doc.roundedRect(ML, y - 1, CW, bh, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textRGB);
    lines.forEach((l, i) => doc.text(l, ML + 4, y + 3.5 + i * 5));
    doc.setTextColor(30, 41, 59);
    y += bh + 4;
  }

  function scoreBar(score: number, w = 80, h = 6) {
    needsPage(12);
    const fill = Math.round((score / 100) * w);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(ML, y, w, h, 1.5, 1.5, 'F');
    doc.setFillColor(pr, pg, pb);
    doc.roundedRect(ML, y, fill, h, 1.5, 1.5, 'F');
    setBold(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`${score}/100`, ML + w + 4, y + 4.5);
    y += h + 6;
  }

  // ── After-table Y update ───────────────────────────────────────────────────
  function afterTable() {
    y = (doc as JsDoc).lastAutoTable?.finalY ?? y;
    y += 6;
  }

  // ── Page headers & footers (applied at end) ───────────────────────────────
  function addPageDecorations() {
    const total = doc.internal.getNumberOfPages();
    for (let i = 2; i <= total; i++) {   // skip cover (page 1)
      doc.setPage(i);
      // Top thin accent line
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, W, 6, 'F');
      // Domain in top bar
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text(result.domain, ML, 4.2);
      doc.text(brand.brandName, W - MR, 4.2, { align: 'right' });
      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${brand.brandName} — Technical SEO Report — Confidential`,
        ML, H - 6,
      );
      doc.text(`${i - 1} / ${total - 1}`, W - MR, H - 6, { align: 'right' });
      // Bottom line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(ML, H - 9, W - MR, H - 9);
    }
    doc.setPage(total);
  }

  // ════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════════════════

  // Header band
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, W, 95, 'F');

  // Diagonal accent rectangle
  doc.setFillColor(Math.max(0, pr - 30), Math.max(0, pg - 30), Math.max(0, pb - 30));
  doc.rect(0, 65, W, 30, 'F');

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(255, 255, 255);
  doc.text(brand.brandName, W / 2, 32, { align: 'center' });

  // Report type
  const modeLabel =
    mode === 'client-summary'      ? 'Client Summary Report' :
    mode === 'developer-fix-plan'  ? 'Developer Fix Plan' :
    'Full Technical Audit Report';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255, 0.85);
  doc.text(modeLabel, W / 2, 44, { align: 'center' });

  // Divider
  doc.setDrawColor(255, 255, 255, 0.4);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 30, 49, W / 2 + 30, 49);

  // Domain
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255, 0.9);
  doc.text(result.domain, W / 2, 57, { align: 'center' });

  // Score badge in header area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text(`${es.overallScore}`, W / 2, 80, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text('SEO HEALTH SCORE / 100', W / 2, 87, { align: 'center' });

  // Info panel
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 95, W, 202, 'F');

  let cy = 115;
  const leftX  = ML + 5;
  const rightX = W / 2 + 10;

  const coverItem = (label: string, value: string, x: number, yy: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(trunc(value, 30), x, yy + 6);
  };

  coverItem('Prepared For',  brand.clientName  || result.domain, leftX,  cy);
  coverItem('Prepared By',   brand.preparedBy,                   rightX, cy);
  cy += 22;
  coverItem('Website',       brand.websiteUrl  || result.startUrl, leftX,  cy);
  coverItem('Report Date',   brand.reportDate,                   rightX, cy);
  cy += 22;
  coverItem('Pages Crawled', String(result.summary.totalPages),  leftX,  cy);
  coverItem('Issues Found',  String(es.totalFixes),              rightX, cy);
  cy += 22;
  coverItem('Critical Issues', String(es.criticalIssues),        leftX,  cy);
  if (es.schemaScore !== null) {
    coverItem('Schema Score', `${es.schemaScore}/100`,           rightX, cy);
  }
  cy += 22;

  // Severity row
  const severityBox = (label: string, count: number, rgb: RGB, x: number, yy: number) => {
    doc.setFillColor(...rgb);
    doc.roundedRect(x, yy, 35, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(String(count), x + 17.5, yy + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label, x + 17.5, yy + 14.5, { align: 'center' });
  };

  cy += 5;
  severityBox('CRITICAL', es.criticalIssues, [220, 38, 38],   ML + 2,      cy);
  severityBox('HIGH',     es.highIssues,     [234, 88, 12],   ML + 42,     cy);
  severityBox('MEDIUM',   es.mediumIssues,   [202, 138, 4],   ML + 82,     cy);
  severityBox('LOW',      es.lowIssues,      [37, 99, 235],   ML + 122,    cy);

  // Disclaimer strip at bottom of cover
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, H - 18, W, 18, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255, 0.85);
  doc.text(
    'This report provides SEO recommendations based on crawl and uploaded data. Google indexing and ranking outcomes are not guaranteed.',
    W / 2, H - 8, { align: 'center', maxWidth: W - 20 },
  );

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2+: CONTENT
  // ════════════════════════════════════════════════════════════════════════
  newPage();

  // ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
  sectionHeader('Executive Summary');

  subHeader('Overall Assessment');
  paragraph(es.overallHealth);

  subHeader('Score Snapshot');
  needsPage(30);

  // Score grid
  const scores: [string, number, string][] = [
    ['SEO Health Score',    es.overallScore,       brand.primaryColor],
    ...(es.schemaScore !== null ? [['Schema Health Score', es.schemaScore, '#7C3AED'] as [string, number, string]] : []),
  ];

  for (const [label, score, color] of scores) {
    needsPage(14);
    const [sr, sg, sb] = hexToRGB(color);
    setBold(9);
    doc.text(`${label}`, ML, y);
    y += 1;
    const bw   = 100;
    const fill = Math.round((score / 100) * bw);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(ML, y, bw, 5, 1.2, 1.2, 'F');
    doc.setFillColor(sr, sg, sb);
    doc.roundedRect(ML, y, Math.max(2, fill), 5, 1.2, 1.2, 'F');
    setBold(9);
    doc.text(`${score}/100`, ML + bw + 4, y + 4);
    y += 10;
  }
  y += 2;

  subHeader('Key Risks Identified');
  for (const risk of es.topRisks) {
    bullet(risk);
  }

  subHeader('Business Impact');
  paragraph(es.businessImpact);

  subHeader('Recommended Next Step');
  infoBox('➡ ' + es.recommendedNext, [240, 253, 244], [20, 83, 45]);

  // ── ISSUE SNAPSHOT (shown in all modes) ────────────────────────────────────
  needsPage(20);
  sectionHeader('Issue Priority Breakdown');

  const topIssues = fixQueue
    .filter(i => i.priority === 'critical' || i.priority === 'high')
    .slice(0, 15);

  if (topIssues.length > 0) {
    autoTable(doc as never, {
      startY:    y,
      margin:    { left: ML, right: MR },
      head:      [['Priority', 'Fix Type', 'Issue', 'URL', 'Approval']],
      body:      topIssues.map(i => [
        { content: i.priority.toUpperCase(), styles: { textColor: severityRGB(i.priority), fontStyle: 'bold' as const } },
        i.fixType,
        trunc(i.issueType, 45),
        trunc(i.url.replace(/^https?:\/\/[^/]+/, '') || '/', 35),
        approvalLabel(i.approvalLevel),
      ]),
      headStyles:           { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' as const },
      bodyStyles:           { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles:   { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 55 },
        3: { cellWidth: 45 },
        4: { cellWidth: 20 },
      },
      styles: { cellPadding: 2.2, overflow: 'linebreak' },
    });
    afterTable();

    if (fixQueue.length > 15) {
      setGray(8.5);
      doc.text(
        `Showing top ${topIssues.length} of ${fixQueue.length} items. See Fix Queue tab for full list.`,
        ML, y,
      );
      y += 7;
    }
  } else {
    paragraph('No critical or high-priority issues detected. Review medium and low items in the Fix Queue.');
  }

  // ── SCHEMA SUMMARY (if available and mode is not client-only) ──────────────
  if (schemaAudit && mode !== 'client-summary') {
    needsPage(20);
    sectionHeader('Schema Markup Summary');

    keyValue('Schema Health Score', `${schemaAudit.score.overall}/100`);
    keyValue('Pages with Schema',   `${schemaAudit.summary.totalPagesWithSchema}`);
    keyValue('Pages without Schema',`${schemaAudit.summary.totalPagesWithoutSchema}`);
    keyValue('Unique Schema Types', `${schemaAudit.summary.uniqueSchemaTypes}`);
    if (schemaAudit.summary.missingCriticalTypes.length > 0) {
      keyValue('Missing Critical Types', schemaAudit.summary.missingCriticalTypes.join(', '));
    }
    y += 4;

    const schemaIssues = schemaAudit.issues.slice(0, 10);
    if (schemaIssues.length > 0) {
      autoTable(doc as never, {
        startY:  y,
        margin:  { left: ML, right: MR },
        head:    [['Severity', 'Schema Type', 'Issue', 'Pages Affected']],
        body:    schemaIssues.map(i => [
          { content: i.severity.toUpperCase(), styles: { textColor: severityRGB(i.severity), fontStyle: 'bold' as const } },
          i.schemaType,
          trunc(i.problem, 65),
          String(i.count),
        ]),
        headStyles:         { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' as const },
        bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 35 },
          2: { cellWidth: 90 },
          3: { cellWidth: 23 },
        },
        styles: { cellPadding: 2.2, overflow: 'linebreak' },
      });
      afterTable();
    }
  }

  // ── GSC SUMMARY (if available) ─────────────────────────────────────────────
  if (gscData && gscData.records.length > 0) {
    needsPage(20);
    sectionHeader('Google Search Console — Indexing Summary');

    const gs = gscData.summary;
    keyValue('Total URLs Imported',  String(gs.totalUrls));
    keyValue('Already Indexed',      String(gs.indexedCount));
    keyValue('Action Required',      String(gs.actionRequiredCount));
    keyValue('Matched with Crawl',   `${gs.matchedCount} of ${gs.totalUrls}`);
    y += 4;

    const gscActions = gscData.records
      .filter(r => r.decision.decision !== 'Index' && r.decision.decision !== 'Keep Noindex')
      .sort((a, b) => {
        const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (p[a.decision.priority] ?? 3) - (p[b.decision.priority] ?? 3);
      })
      .slice(0, 15);

    if (gscActions.length > 0) {
      autoTable(doc as never, {
        startY:  y,
        margin:  { left: ML, right: MR },
        head:    [['Priority', 'URL', 'Decision', 'Approval']],
        body:    gscActions.map(r => [
          { content: r.decision.priority.toUpperCase(), styles: { textColor: severityRGB(r.decision.priority), fontStyle: 'bold' as const } },
          trunc(r.gsc.url.replace(/^https?:\/\/[^/]+/, '') || '/', 50),
          r.decision.decision,
          approvalLabel(r.decision.approvalLevel),
        ]),
        headStyles:         { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' as const },
        bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 75 },
          2: { cellWidth: 45 },
          3: { cellWidth: 28 },
        },
        styles: { cellPadding: 2.2, overflow: 'linebreak' },
      });
      afterTable();
    }
  }

  // ── 30-DAY ROADMAP ─────────────────────────────────────────────────────────
  needsPage(20);
  sectionHeader('30-Day Action Roadmap');

  for (const week of roadmap) {
    needsPage(16);
    subHeader(week.title);
    setGray(8.5);
    doc.text(`Goal: ${week.goal}`, ML, y);
    y += 6;

    const taskRows = week.tasks.map(t => [
      { content: t.priority.toUpperCase(), styles: { textColor: severityRGB(t.priority), fontStyle: 'bold' as const } },
      trunc(t.task, 90),
      t.owner,
    ]);

    autoTable(doc as never, {
      startY:  y,
      margin:  { left: ML, right: MR },
      head:    [['Priority', 'Task', 'Owner']],
      body:    taskRows,
      headStyles:         { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' as const },
      bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 120 },
        2: { cellWidth: 28 },
      },
      styles: { cellPadding: 2, overflow: 'linebreak' },
    });
    afterTable();

    // Expected outcome box
    infoBox(`✓ Expected Outcome: ${week.expectedOutcome}`, [240, 253, 244], [20, 83, 45]);
    y += 3;
  }

  // ── DEVELOPER TASK TABLE (developer & full audit modes) ───────────────────
  if (mode === 'developer-fix-plan' || mode === 'full-technical-audit') {
    needsPage(20);
    sectionHeader('Developer Task List');

    paragraph(
      `The following tasks are derived from the Fix Queue and are sorted by priority. ` +
      `Each task includes the approval level and implementation instructions. ` +
      `Status should be updated as tasks are completed.`,
    );

    const devBody = developerTasks.slice(0, 40).map(t => [
      { content: t.priority.toUpperCase(), styles: { textColor: severityRGB(t.priority), fontStyle: 'bold' as const } },
      trunc(t.url.replace(/^https?:\/\/[^/]+/, '') || '/', 35),
      trunc(t.issue, 45),
      approvalLabel(t.approvalLevel),
      t.owner,
      'Pending',
    ]);

    autoTable(doc as never, {
      startY:  y,
      margin:  { left: ML, right: MR },
      head:    [['Priority', 'Path', 'Issue', 'Approval', 'Owner', 'Status']],
      body:    devBody,
      headStyles:         { fillColor: [pr, pg, pb], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' as const },
      bodyStyles:         { fontSize: 7.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 38 },
        2: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { cellWidth: 22 },
        5: { cellWidth: 15 },
      },
      styles: { cellPadding: 2, overflow: 'linebreak' },
    });
    afterTable();

    if (developerTasks.length > 40) {
      setGray(8.5);
      doc.text(`Showing 40 of ${developerTasks.length} tasks. Export full CSV for complete list.`, ML, y);
      y += 7;
    }
  }

  // ── URL APPENDIX (full audit mode) ────────────────────────────────────────
  if (mode === 'full-technical-audit') {
    needsPage(20);
    sectionHeader('Appendix — Crawled URL Summary');

    const urlRows = result.pages.slice(0, 60).map(p => [
      trunc(p.url.replace(/^https?:\/\/[^/]+/, '') || '/', 60),
      String(p.statusCode),
      p.title ? trunc(p.title, 40) : '—',
      p.isNoindex ? 'noindex' : p.statusCode === 200 ? 'Indexable' : 'Excluded',
    ]);

    autoTable(doc as never, {
      startY:  y,
      margin:  { left: ML, right: MR },
      head:    [['URL Path', 'Status', 'Title', 'Index Status']],
      body:    urlRows,
      headStyles:         { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' as const },
      bodyStyles:         { fontSize: 7.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 18 },
        2: { cellWidth: 50 },
        3: { cellWidth: 22 },
      },
      styles: { cellPadding: 2, overflow: 'linebreak' },
    });
    afterTable();

    if (result.pages.length > 60) {
      setGray(8.5);
      doc.text(`Showing 60 of ${result.pages.length} pages. See Markdown export for full URL list.`, ML, y);
      y += 7;
    }
  }

  // ── V6: COMPARISON SECTION (if provided) ──────────────────────────────────
  if (comparison) {
    needsPage(20);
    sectionHeader('Progress Comparison — Before vs After');

    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    paragraph(
      `Before: ${comparison.beforeSnapshot.name} (${fmtDate(comparison.beforeSnapshot.crawledAt)})   →   ` +
      `After: ${comparison.afterSnapshot.name} (${fmtDate(comparison.afterSnapshot.crawledAt)})`,
    );

    const scoreChange = comparison.scoreImprovement;
    const changeLabel = scoreChange > 0
      ? `Score improved by +${scoreChange} points`
      : scoreChange < 0
      ? `Score decreased by ${scoreChange} points`
      : 'Score unchanged';

    infoBox(
      `${changeLabel}  ·  ✅ ${comparison.resolvedCount} resolved  ·  ⚠️ ${comparison.newCount} new  ·  🔄 ${comparison.persistentCount} persistent`,
      scoreChange > 0 ? [240, 253, 244] : scoreChange < 0 ? [254, 242, 242] : [248, 250, 252],
      scoreChange > 0 ? [20, 83, 45] : scoreChange < 0 ? [153, 27, 27] : [51, 65, 85],
    );

    // Metrics table
    const metricRows = comparison.metrics.map(m => {
      const dir = m.direction === 'improved' ? '↑ Better' : m.direction === 'regressed' ? '↓ Worse' : '—';
      const deltaStr = m.delta === 0 ? '—' : `${m.delta > 0 ? '+' : ''}${m.delta}`;
      return [
        m.label,
        `${m.before}${m.unit === '/100' ? '/100' : ''}`,
        `${m.after}${m.unit === '/100' ? '/100' : ''}`,
        deltaStr,
        { content: dir, styles: {
          textColor: m.direction === 'improved' ? [16, 185, 129] as [number, number, number] :
                     m.direction === 'regressed' ? [220, 38, 38] as [number, number, number] :
                     [100, 116, 139] as [number, number, number],
          fontStyle: 'bold' as const,
        }},
      ];
    });

    autoTable(doc as never, {
      startY:  y,
      margin:  { left: ML, right: MR },
      head:    [['Metric', 'Before', 'After', 'Change', 'Direction']],
      body:    metricRows,
      headStyles:         { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' as const },
      bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 35 },
      },
      styles: { cellPadding: 2.2, overflow: 'linebreak' },
    });
    afterTable();

    // Resolved issues (top 10)
    if (comparison.resolvedIssues.length > 0) {
      subHeader(`✅ Resolved Issues (${comparison.resolvedCount})`);
      const topResolved = comparison.resolvedIssues.slice(0, 10);
      autoTable(doc as never, {
        startY:  y,
        margin:  { left: ML, right: MR },
        head:    [['Severity', 'Issue', 'Category']],
        body:    topResolved.map(fp => [
          { content: fp.severity.toUpperCase(), styles: { textColor: severityRGB(fp.severity), fontStyle: 'bold' as const } },
          trunc(fp.label, 90),
          trunc(fp.category, 35),
        ]),
        headStyles:         { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' as const },
        bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 110 },
          2: { cellWidth: 38 },
        },
        styles: { cellPadding: 2, overflow: 'linebreak' },
      });
      afterTable();
    }

    // New issues (top 10)
    if (comparison.newIssues.length > 0) {
      subHeader(`⚠️ New Issues (${comparison.newCount})`);
      const topNew = comparison.newIssues.slice(0, 10);
      autoTable(doc as never, {
        startY:  y,
        margin:  { left: ML, right: MR },
        head:    [['Severity', 'Issue', 'Category']],
        body:    topNew.map(fp => [
          { content: fp.severity.toUpperCase(), styles: { textColor: severityRGB(fp.severity), fontStyle: 'bold' as const } },
          trunc(fp.label, 90),
          trunc(fp.category, 35),
        ]),
        headStyles:         { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' as const },
        bodyStyles:         { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 110 },
          2: { cellWidth: 38 },
        },
        styles: { cellPadding: 2, overflow: 'linebreak' },
      });
      afterTable();
    }

    infoBox(
      'Progress disclaimer: This comparison reflects differences between two automated technical SEO audits. ' +
      'Improvements in technical metrics do not guarantee changes in search rankings or organic traffic. ' +
      'All findings should be reviewed by a qualified SEO professional.',
      [255, 251, 235], [120, 53, 15],
    );
  }

  // ── V7: WORDPRESS HELPER SECTION (if provided) ────────────────────────────
  if (wordpressGuide) {
    const cms = wordpressGuide.detectedCMS;
    needsPage(20);
    sectionHeader('WordPress Helper Mode — Fix Checklist');

    paragraph(
      `CMS: ${cms.cmsName} (${cms.confidence} confidence)  ·  ` +
      `${wordpressGuide.summary.totalItems} items  ·  ` +
      `✅ ${wordpressGuide.summary.safeItems} safe  ·  ` +
      `⚠️ ${wordpressGuide.summary.needsReviewItems} needs review  ·  ` +
      `🚨 ${wordpressGuide.summary.requiresApprovalItems} requires approval`,
    );

    // Detected plugins table
    if (cms.detectedPlugins.length > 0) {
      subHeader('Detected Plugins');
      autoTable(doc as never, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Plugin', 'Category', 'Confidence', 'Evidence']],
        body: cms.detectedPlugins.map(p => [p.name, p.category, p.confidence, trunc(p.evidence, 60)]),
        styles:     { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [pr, pg, pb] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
        columnStyles: { 0: { fontStyle: 'bold' as const }, 3: { textColor: [100, 116, 139] as [number, number, number] } },
      });
      afterTable();
    }

    // Checklist table (first 25)
    if (wordpressGuide.checklistItems.length > 0) {
      const shown = wordpressGuide.checklistItems.slice(0, 25);
      subHeader(`Fix Checklist (${shown.length} of ${wordpressGuide.checklistItems.length} items)`);
      autoTable(doc as never, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Priority', 'Issue', 'URL', 'WP Area', 'Plugin', 'Risk']],
        body: shown.map(item => [
          item.priority.toUpperCase(),
          trunc(item.issueType, 35),
          trunc(item.url, 50),
          trunc(item.wordpressArea, 30),
          trunc(item.likelyPlugin, 20),
          item.riskLevel,
        ]),
        styles:     { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
        bodyStyles: { textColor: [30, 41, 59] as [number, number, number] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        didParseCell: (hookData: any) => {
          if (hookData.section === 'body') {
            const risk = hookData.row.raw[5] as string;
            if (risk === 'requires-approval') hookData.cell.styles.textColor = [153, 27, 27];
            else if (risk === 'needs-review')   hookData.cell.styles.textColor = [120, 53, 15];
            else                                hookData.cell.styles.textColor = [21, 128, 61];
          }
        },
      });
      afterTable();
    }

    infoBox(
      'WordPress disclaimer: All WordPress fix instructions are rule-based and advisory only. ' +
      'Risk levels are estimates. Always verify with a qualified SEO professional before applying changes.',
      [237, 233, 254], [76, 29, 149],
    );
  }

  // ── DISCLAIMER ────────────────────────────────────────────────────────────
  needsPage(30);
  sectionHeader('Disclaimer & Methodology');
  infoBox(
    'This report provides SEO recommendations based on automated crawl analysis and any uploaded data. ' +
    'Findings reflect the state of the website at the time of the scan. ' +
    'Google indexing, ranking, and traffic outcomes are not guaranteed and may vary based on many external factors. ' +
    'All recommendations should be reviewed by a qualified SEO specialist before implementation. ' +
    'Elitez Technical SEO Doctor does not guarantee that implementing these recommendations will improve search rankings or traffic.',
    [255, 251, 235],
    [120, 53, 15],
  );
  paragraph(
    `Scan completed: ${new Date(result.crawledAt).toLocaleString('en-GB', { timeZone: 'Asia/Singapore' })} (SGT). ` +
    `Pages crawled: ${result.summary.totalPages}. ` +
    `Report generated: ${brand.reportDate}. ` +
    `Prepared by: ${brand.preparedBy}.`,
  );

  // ── Apply page decorations (headers/footers) ───────────────────────────────
  addPageDecorations();

  return doc.output('blob');
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function generateDeveloperTasksCSV(tasks: import('@/types/seo').DeveloperTask[]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const headers = ['Priority', 'URL', 'Issue', 'Recommended Fix', 'Owner', 'Approval Level', 'Developer Instruction', 'Status'];
  const rows = tasks.map(t => [
    escape(t.priority),
    escape(t.url),
    escape(t.issue),
    escape(t.recommendedFix),
    escape(t.owner),
    escape(t.approvalLevel),
    escape(t.developerInstruction.replace(/\n/g, ' ')),
    escape(t.status),
  ].join(','));
  return [headers.map(escape).join(','), ...rows].join('\n');
}

// ─── Download helpers ─────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
