// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Email Notification (V8.1)
// Disabled by default. Logs to console in dev/local.
// Enable a real provider by setting the relevant env var:
//   NEXT_PUBLIC_ZAPIER_WEBHOOK_URL  → sends a JSON POST to your Zapier catch hook
//   (future)  RESEND_API_KEY        → server-side Resend integration
//   (future)  SENDGRID_API_KEY      → server-side SendGrid integration
//
// See docs/email-notification-setup.md for setup instructions.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditLead, LeadNotificationResult } from '@/types/seo';

// ─── Provider interface ────────────────────────────────────────────────────────

interface EmailProvider {
  name: string;
  send(lead: PublicAuditLead): Promise<void>;
}

// ─── Console provider (always available — zero config) ───────────────────────

const consoleProvider: EmailProvider = {
  name: 'console',
  async send(lead) {
    const line = '─'.repeat(55);
    console.log(
      `\n[EmailNotification] ✉️  New Lead Captured\n${line}\n` +
      `  Name:        ${lead.name}\n` +
      `  Company:     ${lead.company || '—'}\n` +
      `  Email:       ${lead.email}\n` +
      `  Phone:       ${lead.phone || '—'}\n` +
      `  Website:     ${lead.website}\n` +
      `  Service:     ${lead.serviceInterest || '—'}\n` +
      `  SEO Score:   ${lead.auditScore}/100\n` +
      `  Lead Score:  ${lead.leadScore}/100 (${lead.leadTemperature})\n` +
      `  WordPress:   ${lead.wordpressDetected ? 'Yes' : 'No'}\n` +
      `  Top Issues:  ${lead.topIssues.join(', ') || 'none'}\n` +
      `  Submitted:   ${new Date(lead.createdAt).toLocaleString('en-GB')}\n` +
      `${line}\n`,
    );
  },
};

// ─── Zapier webhook provider (set NEXT_PUBLIC_ZAPIER_WEBHOOK_URL to activate) ─

function buildZapierProvider(): EmailProvider | null {
  const webhookUrl = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL;
  if (!webhookUrl) return null;

  return {
    name: 'zapier',
    async send(lead) {
      const res = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Flat fields for easy Zapier field mapping
          name:              lead.name,
          company:           lead.company,
          email:             lead.email,
          phone:             lead.phone,
          website:           lead.website,
          serviceInterest:   lead.serviceInterest,
          message:           lead.message,
          consent:           lead.consent ? 'Yes' : 'No',
          auditScore:        lead.auditScore,
          schemaScore:       lead.schemaScore ?? 'N/A',
          wordpressDetected: lead.wordpressDetected ? 'Yes' : 'No',
          topIssues:         lead.topIssues.join(', '),
          scoreReasons:      (lead.scoreReasons ?? []).join(', '),
          leadScore:         lead.leadScore,
          leadTemperature:   lead.leadTemperature,
          status:            lead.status,
          createdAt:         lead.createdAt,
        }),
      });
      if (!res.ok) throw new Error(`Zapier webhook returned HTTP ${res.status}`);
    },
  };
}

// ─── Provider selection ───────────────────────────────────────────────────────

let _cachedProvider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (_cachedProvider) return _cachedProvider;
  // Priority: Zapier > console
  // Future: add Resend / SendGrid here keyed off their respective env vars
  _cachedProvider = buildZapierProvider() ?? consoleProvider;
  return _cachedProvider;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Notify about a new lead capture.
 * Always resolves — never throws. A notification failure must not block the unlock flow.
 */
export async function notifyNewLead(lead: PublicAuditLead): Promise<LeadNotificationResult> {
  const provider = getProvider();
  try {
    await provider.send(lead);
    return { sent: true, provider: provider.name };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`[EmailNotification] Provider "${provider.name}" failed:`, error);
    return { sent: false, provider: provider.name, error };
  }
}

/**
 * Returns the name of the currently active notification provider.
 * Useful for admin UI status display.
 */
export function getNotificationProviderName(): string {
  return getProvider().name;
}
