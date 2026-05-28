// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Lead Scoring (V8)
// Scores lead quality based on audit data and form signals.
// Higher score = higher service opportunity / better fit.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditResult, LeadScoreResult, LeadTemperature } from '@/types/seo';

// ─── Free/personal email domains ─────────────────────────────────────────────

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'live.com', 'icloud.com', 'me.com', 'mail.com', 'ymail.com',
  'protonmail.com', 'aol.com', 'msn.com',
]);

function isBusinessEmail(email: string): boolean {
  try {
    const domain = email.toLowerCase().split('@')[1];
    return !!domain && !FREE_EMAIL_DOMAINS.has(domain);
  } catch {
    return false;
  }
}

// ─── Service interest signal strengths ────────────────────────────────────────

const SERVICE_SCORES: Record<string, number> = {
  'Technical SEO Audit':          15,
  'Website SEO Fixes':            12,
  'Schema Markup':                 8,
  'WordPress SEO Support':        10,
  'Google Search Console Cleanup':10,
  'AEO / AI Search Optimisation': 12,
};

// ─── Main scorer ──────────────────────────────────────────────────────────────

export function scoreLead(
  auditResult: PublicAuditResult,
  email:          string,
  serviceInterest: string,
  message:         string,
): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // ── Website health score (lower score = higher opportunity) ───────────────
  const seoScore = auditResult.score;
  if (seoScore < 30) {
    score += 40;
    reasons.push(`Very low SEO score (${seoScore}/100) — significant improvement opportunity`);
  } else if (seoScore < 50) {
    score += 30;
    reasons.push(`Low SEO score (${seoScore}/100) — clear optimisation opportunity`);
  } else if (seoScore < 70) {
    score += 18;
    reasons.push(`Moderate SEO score (${seoScore}/100) — room for improvement`);
  } else {
    score += 5;
    reasons.push(`Good SEO score (${seoScore}/100) — maintenance or advanced work opportunity`);
  }

  // ── Critical/high issues ──────────────────────────────────────────────────
  const criticalCount = auditResult.topIssues.filter(i => i.severity === 'critical').length;
  const highCount     = auditResult.topIssues.filter(i => i.severity === 'high').length;

  if (criticalCount >= 2) {
    score += 20;
    reasons.push(`${criticalCount} critical SEO issues found — urgent fix needed`);
  } else if (criticalCount === 1) {
    score += 12;
    reasons.push('1 critical SEO issue found');
  } else if (highCount >= 2) {
    score += 8;
    reasons.push(`${highCount} high-priority issues found`);
  }

  // ── WordPress detected ────────────────────────────────────────────────────
  if (auditResult.wordpressDetected) {
    score += 10;
    reasons.push('WordPress site — strong fit for WordPress SEO services');
  }

  // ── No schema detected ────────────────────────────────────────────────────
  if (!auditResult.schemaDetected) {
    score += 5;
    reasons.push('No schema markup detected — schema implementation opportunity');
  }

  // ── Service interest ──────────────────────────────────────────────────────
  const serviceScore = SERVICE_SCORES[serviceInterest] ?? 0;
  if (serviceScore > 0) {
    score += serviceScore;
    reasons.push(`Service selected: "${serviceInterest}"`);
  }

  // ── Business email ────────────────────────────────────────────────────────
  if (isBusinessEmail(email)) {
    score += 10;
    reasons.push('Business email domain — likely B2B or established business');
  }

  // ── Message provided ──────────────────────────────────────────────────────
  if (message && message.trim().length > 20) {
    score += 5;
    reasons.push('Detailed message provided — engaged prospect');
  }

  // ── Clamp to 0-100 ────────────────────────────────────────────────────────
  score = Math.min(100, Math.max(0, score));

  const leadTemperature: LeadTemperature =
    score >= 65 ? 'Hot'  :
    score >= 35 ? 'Warm' :
    'Cold';

  return { leadScore: score, leadTemperature, reasons };
}

/** Colour for temperature badge */
export function temperatureColour(temp: LeadTemperature): string {
  if (temp === 'Hot')  return 'bg-red-100 text-red-700 border-red-200';
  if (temp === 'Warm') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

/** Emoji for temperature */
export function temperatureEmoji(temp: LeadTemperature): string {
  if (temp === 'Hot')  return '🔥';
  if (temp === 'Warm') return '☀️';
  return '🧊';
}
