'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Lead Capture Form (V8.1)
// Collects visitor details and unlocks the full public report on submit.
// V8.1: honeypot field, timing check, spam detection, email notification,
//       async save via leadStorageAdapter (localStorage + Supabase-ready).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { PublicAuditResult, PublicAuditLead } from '@/types/seo';
import { saveLead }         from '@/lib/leadStorageAdapter';
import { scoreLead }        from '@/lib/leadScoring';
import { runSpamChecks, recordSubmission } from '@/lib/spamProtection';
import { notifyNewLead }    from '@/lib/emailNotification';

// ─── Service options ───────────────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  'Technical SEO Audit',
  'Website SEO Fixes',
  'Schema Markup',
  'WordPress SEO Support',
  'Google Search Console Cleanup',
  'AEO / AI Search Optimisation',
];

// ─── Field component ───────────────────────────────────────────────────────────

function Field({
  label, required, children, error,
}: {
  label: string; required?: boolean; children: React.ReactNode; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
    err ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
  }`;

// ─── Validation ────────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateUrl(url: string): boolean {
  try {
    const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    new URL(u);
    return true;
  } catch { return false; }
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  auditResult:  PublicAuditResult;
  onUnlock:     (lead: PublicAuditLead) => void;
}

export default function LeadCaptureForm({ auditResult, onUnlock }: Props) {
  const [form, setForm] = useState({
    name:            '',
    company:         '',
    email:           '',
    phone:           '',
    website:         auditResult.websiteUrl,
    serviceInterest: '',
    message:         '',
    consent:         false,
  });

  // ── V8.1 spam-protection state ──────────────────────────────────────────────
  /** Hidden honeypot field — bots fill it, humans don't see it */
  const [honeypot,       setHoneypot]   = useState('');
  /** Timestamp (ms) when the form first rendered — used for timing check */
  const formStartTimeRef                = useRef<number>(Date.now());
  /** Non-empty if spam was detected */
  const [spamMessage,    setSpamMessage] = useState('');

  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // Record the moment the form renders so timing check is accurate
  useEffect(() => {
    formStartTimeRef.current = Date.now();
  }, []);

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
    setSpamMessage('');
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!form.name.trim())               errs.name    = 'Name is required';
    if (!form.email.trim())              errs.email   = 'Email is required';
    else if (!validateEmail(form.email)) errs.email   = 'Please enter a valid email address';
    if (!form.website.trim())            errs.website = 'Website is required';
    else if (!validateUrl(form.website)) errs.website = 'Please enter a valid website URL';
    if (!form.consent)                   errs.consent = 'Please confirm your consent to continue';
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSpamMessage('');

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // ── Spam check ──────────────────────────────────────────────────────────
    const spam = runSpamChecks({
      honeypot,
      formStartTime: formStartTimeRef.current,
      email:         form.email,
      message:       form.message,
      website:       form.website,
    });
    if (spam.isSpam) {
      setSpamMessage(spam.message);
      return;
    }

    setSubmitting(true);

    const { leadScore, leadTemperature, reasons } = scoreLead(
      auditResult, form.email, form.serviceInterest, form.message,
    );

    const leadData: Omit<PublicAuditLead, 'id' | 'createdAt'> = {
      name:              form.name.trim(),
      company:           form.company.trim(),
      email:             form.email.trim().toLowerCase(),
      phone:             form.phone.trim(),
      website:           form.website.trim(),
      serviceInterest:   form.serviceInterest,
      message:           form.message.trim(),
      consent:           form.consent,
      auditScore:        auditResult.score,
      schemaScore:       auditResult.schemaScore,
      wordpressDetected: auditResult.wordpressDetected,
      topIssues:         auditResult.topIssues.map(i => i.problem),
      status:            'New',
      leadScore,
      leadTemperature,
      scoreReasons:      reasons,
    };

    // ── Save (adapter handles localStorage + optional Supabase) ────────────
    const id       = await saveLead(leadData);
    const savedLead: PublicAuditLead = { ...leadData, id, createdAt: new Date().toISOString() };

    // ── Record submission for dedup ─────────────────────────────────────────
    recordSubmission(form.email, form.website);

    // ── Notify (fire-and-forget, never blocks UI) ───────────────────────────
    notifyNewLead(savedLead).catch(() => { /* ignore */ });

    setSubmitted(true);
    setSubmitting(false);
    onUnlock(savedLead);
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center bg-green-50 border border-green-200">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-extrabold text-green-800 mb-2">Report Unlocked!</h3>
        <p className="text-sm text-green-700 leading-relaxed">
          Your full SEO snapshot is ready below. Our team may reach out to discuss
          your recommended next steps — no obligation.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-lg font-extrabold text-slate-900 mb-1">
          🔓 Unlock Your Free SEO Report
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Enter your details to unlock the full snapshot — including recommended next steps,
          schema findings, and a downloadable report. No credit card required.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {/* ── Honeypot field (hidden from real users, catches bots) ────────── */}
        {/* aria-hidden + tabIndex=-1 + position:absolute keeps it invisible  */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          <label htmlFor="lf-website-url">Leave this blank</label>
          <input
            id="lf-website-url"
            name="website_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
          />
        </div>

        {/* Row 1: Name + Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Your Name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Jane Smith"
              className={inputCls(errors.name)}
              autoComplete="name"
            />
          </Field>
          <Field label="Company / Business Name">
            <input
              type="text"
              value={form.company}
              onChange={e => set('company', e.target.value)}
              placeholder="Acme Pte Ltd"
              className={inputCls()}
              autoComplete="organization"
            />
          </Field>
        </div>

        {/* Row 2: Email + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Work Email" required error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@company.com"
              className={inputCls(errors.email)}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+65 9000 0000"
              className={inputCls()}
              autoComplete="tel"
            />
          </Field>
        </div>

        {/* Website */}
        <Field label="Website URL" required error={errors.website}>
          <input
            type="url"
            value={form.website}
            onChange={e => set('website', e.target.value)}
            placeholder="https://www.yoursite.com"
            className={inputCls(errors.website)}
            autoComplete="url"
          />
        </Field>

        {/* Service interest */}
        <Field label="What can we help you with?">
          <select
            value={form.serviceInterest}
            onChange={e => set('serviceInterest', e.target.value)}
            className={inputCls()}
          >
            <option value="">Select a service (optional)</option>
            {SERVICE_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        {/* Message */}
        <Field label="Tell us about your goals (optional)">
          <textarea
            value={form.message}
            onChange={e => set('message', e.target.value)}
            placeholder="e.g. We want to improve our Google rankings for product pages…"
            rows={3}
            className={`${inputCls()} resize-none`}
          />
        </Field>

        {/* Consent */}
        <div>
          <label className={`flex items-start gap-3 cursor-pointer ${errors.consent ? 'text-red-700' : ''}`}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={e => set('consent', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600
                         focus:ring-blue-300 flex-shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to be contacted by Elitez Asia regarding my SEO audit results and
              relevant services. My details will be stored securely and not sold to third parties.
              {' '}
              <span className="text-slate-400">
                (We will not spam you — we genuinely want to help you fix your SEO issues.)
              </span>
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-red-600 mt-1 ml-7">{errors.consent}</p>
          )}
        </div>

        {/* Spam notice */}
        {spamMessage && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
            ⚠️ {spamMessage}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base
                     rounded-xl transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? '⏳ Unlocking…' : '🔓 Unlock My Free SEO Report →'}
        </button>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Free of charge · No credit card · No obligation to buy
        </p>
      </form>
    </div>
  );
}
