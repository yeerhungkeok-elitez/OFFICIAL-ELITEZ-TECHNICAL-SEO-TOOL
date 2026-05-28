# Email Notification Setup Guide

When a visitor submits the public SEO audit lead form, the tool can optionally send you a notification.  
By default, new leads are logged to the **browser console** only.

---

## Default behaviour (no configuration required)

Without any env vars set, `lib/emailNotification.ts` uses the **console provider**:

- Prints a formatted lead summary to the browser DevTools console
- Completely silent on the user side
- Zero configuration needed
- Safe for local testing

---

## Option 1: Zapier Webhook (easiest, recommended)

Zapier can route the lead to Gmail, Slack, HubSpot, Notion, or any of 6,000+ apps — no backend required.

### Steps

1. Log in to [zapier.com](https://zapier.com) and create a new Zap
2. **Trigger:** Choose **Webhooks by Zapier → Catch Hook**
3. Copy the generated webhook URL (e.g. `https://hooks.zapier.com/hooks/catch/123456/abcdef/`)
4. Add the URL to `.env.local`:

```bash
NEXT_PUBLIC_ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/123456/abcdef/
```

5. **Action:** Choose your destination:
   - Gmail → Send email: map `email`, `name`, `leadTemperature`, `auditScore`
   - Slack → Post message
   - HubSpot / Pipedrive → Create contact
   - Google Sheets → Append row (for a simple spreadsheet CRM)

6. Test your Zap — the webhook receives a flat JSON object with these fields:

```json
{
  "name": "Jane Smith",
  "company": "Acme Pte Ltd",
  "email": "jane@acme.com",
  "phone": "+65 9123 4567",
  "website": "https://acme.com",
  "serviceInterest": "Technical SEO Audit",
  "message": "We want to improve our product page rankings",
  "consent": "Yes",
  "auditScore": 42,
  "schemaScore": "N/A",
  "wordpressDetected": "Yes",
  "topIssues": "Missing meta description, No H1 on homepage",
  "scoreReasons": "Low SEO score (+30 pts), WordPress detected (+10 pts)",
  "leadScore": 68,
  "leadTemperature": "Hot",
  "status": "New",
  "createdAt": "2025-01-15T08:30:00.000Z"
}
```

> **Note:** `NEXT_PUBLIC_ZAPIER_WEBHOOK_URL` is visible in the browser source.
> This is acceptable for a simple Zap catch hook, but do not use it for authenticated API calls.
> If you need to keep the webhook URL private, move the notification to a server-side API route.

---

## Option 2: Resend (server-side, recommended for production)

[Resend](https://resend.com) is a developer-first email API with a generous free tier.

### Architecture note

**Resend requires a server-side call** — never put an API key in `NEXT_PUBLIC_` variables.  
You must create an API route: `app/api/notify-lead/route.ts`.

### Steps

1. Sign up at resend.com and get your API key
2. Install the Resend SDK:
   ```bash
   npm install resend
   ```
3. Add to `.env.local` (no NEXT_PUBLIC_ prefix — server only):
   ```bash
   RESEND_API_KEY=re_...
   NOTIFY_EMAIL_TO=hello@elitez.asia
   NOTIFY_EMAIL_FROM=noreply@yourdomain.com
   ```
4. Create `app/api/notify-lead/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { Resend } from 'resend';

   const resend = new Resend(process.env.RESEND_API_KEY);

   export async function POST(req: NextRequest) {
     const lead = await req.json();
     await resend.emails.send({
       from: process.env.NOTIFY_EMAIL_FROM!,
       to:   process.env.NOTIFY_EMAIL_TO!,
       subject: `🔥 New SEO Lead: ${lead.name} (${lead.leadTemperature}) — ${lead.website}`,
       text: [
         `Name: ${lead.name}`,
         `Email: ${lead.email}`,
         `Website: ${lead.website}`,
         `SEO Score: ${lead.auditScore}/100`,
         `Lead Score: ${lead.leadScore}/100 (${lead.leadTemperature})`,
         `Service Interest: ${lead.serviceInterest || '—'}`,
         `Message: ${lead.message || '—'}`,
       ].join('\n'),
     });
     return NextResponse.json({ ok: true });
   }
   ```
5. In `lib/emailNotification.ts`, add a provider that calls `/api/notify-lead`.

---

## Option 3: SendGrid (server-side)

Similar to Resend. See the [SendGrid Node.js docs](https://github.com/sendgrid/sendgrid-nodejs).

```bash
npm install @sendgrid/mail
SENDGRID_API_KEY=SG.xxx
```

---

## Option 4: Gmail SMTP (server-side via Nodemailer)

Only works in server-side code (API routes / server actions).

```bash
npm install nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password   # Use a Gmail App Password, not your login password
```

---

## Choosing a provider

| Provider    | Config required | Frontend safe? | Cost      | Best for                    |
|-------------|-----------------|----------------|-----------|-----------------------------|
| Console     | None            | Yes            | Free      | Local development           |
| Zapier      | Webhook URL     | ⚠️ URL exposed  | Free tier | Quick setup, non-sensitive  |
| Resend      | Server API key  | No (server only)| Free tier | Production, custom templates|
| SendGrid    | Server API key  | No (server only)| Free tier | Production, high volume     |
| Gmail SMTP  | Server SMTP creds| No            | Free      | Simple personal use         |

---

## Current provider in use

The active provider is selected in `lib/emailNotification.ts` based on env vars:

1. `NEXT_PUBLIC_ZAPIER_WEBHOOK_URL` → Zapier
2. _(future)_ `RESEND_API_KEY` → Resend (add to `buildProvider()`)
3. Default → console

To check which provider is active, call `getNotificationProviderName()` — returns `"zapier"`, `"resend"`, or `"console"`.
