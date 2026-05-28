// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Spam Protection (V8.1)
// Honeypot, timing, suspicious email/message detection, session dedup.
// All checks are client-side signals only; no third-party service required.
// ─────────────────────────────────────────────────────────────────────────────

import type { SpamCheckResult } from '@/types/seo';

// ─── Configuration ─────────────────────────────────────────────────────────────

/** Minimum seconds a human would plausibly take to fill the form */
const MIN_FORM_SECONDS = 5;

/**
 * Regex patterns for obviously fake / disposable / test email addresses.
 * These are signals, not blocks — a single match doesn't reject the submission.
 */
const SPAM_EMAIL_PATTERNS = [
  /^test@test\./i,
  /^noreply@/i,
  /^spam@/i,
  /^bot@/i,
  /\d{6,}@/,              // 6+ consecutive digits before @
  /@example\.com$/i,
  /@test\.com$/i,
  /@mailinator\.com$/i,
  /@guerrillamail\./i,
  /@10minutemail\./i,
  /@tempmail\./i,
  /@yopmail\./i,
  /@throwam\.com$/i,
  /@trashmail\./i,
];

/**
 * Regex patterns for spam messages (SEO spam offers, unrelated pitches, etc.).
 */
const SPAM_MESSAGE_PATTERNS = [
  /\bI can get you (to )?#?1\b/i,
  /\bguaranteed (page )?1 (of google|rankings?)\b/i,
  /\bboost.*rank.*\$\d/i,
  /https?:\/\/\S+\s+https?:\/\//i,  // two bare URLs in message
  /\bcasino\b/i,
  /\bviagra\b/i,
  /\bpayday loan\b/i,
  /\bwork from home\b.{0,30}\$\d{3,}/i,
  /\bI found (\d+ )?broken? link\b/i,
  /\bbacklink(s)? (for sale|package|offer)\b/i,
];

// ─── Individual check functions ────────────────────────────────────────────────

/**
 * Returns true if the hidden honeypot field was filled — indicates a bot.
 * The honeypot field name should be visually hidden and never autofilled.
 */
export function checkHoneypot(honeypotValue: string): boolean {
  return honeypotValue.trim().length > 0;
}

/**
 * Returns true if the form was submitted suspiciously quickly.
 * Bots typically submit forms in under a second.
 * @param formStartTime — Date.now() when the form became visible
 * @param submitTime    — Date.now() at submit (defaults to now)
 */
export function checkTiming(formStartTime: number, submitTime = Date.now()): boolean {
  const seconds = (submitTime - formStartTime) / 1000;
  return seconds < MIN_FORM_SECONDS;
}

/**
 * Returns true if the email matches a known spam/disposable pattern.
 * Single match is a soft signal — not enough to block on its own.
 */
export function checkSuspiciousEmail(email: string): boolean {
  return SPAM_EMAIL_PATTERNS.some(p => p.test(email.trim()));
}

/**
 * Returns true if the message text matches a known spam pattern.
 * Single match is a soft signal — not enough to block on its own.
 */
export function checkSuspiciousMessage(message: string): boolean {
  if (!message.trim()) return false;
  return SPAM_MESSAGE_PATTERNS.some(p => p.test(message));
}

/**
 * Returns true if the same email or website was submitted in the last 60 seconds.
 * Prevents rapid re-submission from the same session.
 */
export function checkRecentDuplicate(email: string, website: string): boolean {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem('elitez-recent-leads') ?? '[]',
    ) as Array<{ email: string; website: string; at: number }>;
    const now = Date.now();
    const recent = stored.filter(r => now - r.at < 60_000);
    const emailNorm = email.trim().toLowerCase();
    const siteNorm  = website.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    return recent.some(r =>
      r.email   === emailNorm ||
      r.website === siteNorm,
    );
  } catch {
    return false;
  }
}

/**
 * Record a successful lead submission so future checks can detect duplicates.
 * Call this AFTER a lead has been accepted and saved.
 */
export function recordSubmission(email: string, website: string): void {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem('elitez-recent-leads') ?? '[]',
    ) as Array<{ email: string; website: string; at: number }>;
    const emailNorm = email.trim().toLowerCase();
    const siteNorm  = website.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const updated = [
      { email: emailNorm, website: siteNorm, at: Date.now() },
      ...stored.filter(r => Date.now() - r.at < 300_000), // keep last 5 min
    ].slice(0, 20);
    sessionStorage.setItem('elitez-recent-leads', JSON.stringify(updated));
  } catch { /* ignore storage errors */ }
}

// ─── Aggregated check ─────────────────────────────────────────────────────────

/**
 * Run all spam checks and return an aggregated result.
 *
 * Hard block: honeypot filled — always spam.
 * Soft block: 2 or more other signals — treat as spam.
 */
export function runSpamChecks({
  honeypot,
  formStartTime,
  email,
  message,
  website,
}: {
  honeypot:      string;
  formStartTime: number;
  email:         string;
  message:       string;
  website:       string;
}): SpamCheckResult {
  const reasons: string[] = [];

  if (checkHoneypot(honeypot))             reasons.push('honeypot-filled');
  if (checkTiming(formStartTime))          reasons.push('too-fast');
  if (checkSuspiciousEmail(email))         reasons.push('suspicious-email');
  if (checkSuspiciousMessage(message))     reasons.push('suspicious-message');
  if (checkRecentDuplicate(email, website))reasons.push('recent-duplicate');

  // Hard block on honeypot; soft block on 2+ other signals
  const isSpam = reasons.includes('honeypot-filled') || reasons.length >= 2;

  return {
    isSpam,
    reasons,
    message: isSpam
      ? 'Your submission looks unusual. Please wait a moment and try again, or contact us directly at hello@elitez.asia.'
      : '',
  };
}
