# Supabase Leads Setup Guide

This guide sets up cloud lead storage for the Elitez SEO Doctor public audit tool.  
Without this setup, leads are stored only in the browser's **localStorage** (default, always works).

---

## Prerequisites

- A free [Supabase](https://supabase.com) account
- A project created at app.supabase.com

---

## 1. Create the `leads` table

Run this SQL in your Supabase project → **SQL Editor**:

```sql
-- Create the leads table
create table public.leads (
  id                 uuid          primary key default gen_random_uuid(),
  created_at         timestamptz   not null default now(),
  name               text          not null,
  company            text,
  email              text          not null,
  phone              text,
  website            text          not null,
  service_interest   text,
  message            text,
  consent            boolean       not null default false,
  audit_score        integer       not null,
  schema_score       integer,
  wordpress_detected boolean       not null default false,
  top_issues         text[]        not null default '{}',
  score_reasons      text[]        not null default '{}',
  lead_score         integer       not null default 0,
  lead_temperature   text          not null check (lead_temperature in ('Hot', 'Warm', 'Cold')),
  status             text          not null default 'New'
                                   check (status in ('New', 'Contacted', 'Qualified', 'Closed', 'Not Suitable'))
);

-- Index for common filter/sort patterns in Lead Manager
create index idx_leads_created_at    on public.leads (created_at desc);
create index idx_leads_email         on public.leads (email);
create index idx_leads_status        on public.leads (status);
create index idx_leads_temperature   on public.leads (lead_temperature);
```

---

## 2. Configure Row-Level Security (RLS)

The public audit runs in the browser with the **anon** key. Because the anon key is public, you **must** restrict what it can do via RLS.

Run in SQL Editor:

```sql
-- Enable RLS on the leads table
alter table public.leads enable row level security;

-- Allow anyone with the anon key to INSERT (submit the lead capture form)
create policy "Public can insert leads"
  on public.leads
  for insert
  to anon
  with check (true);

-- Only the service-role key (server-side) can SELECT / UPDATE / DELETE
-- The Lead Manager uses the anon key — so to view leads from the browser,
-- you need the policy below. Skip it if you'll only read leads from
-- a server-side API route that uses the service-role key.

-- OPTION A: Allow anon to read leads (simpler, fine for internal local tool)
create policy "Anon can read leads"
  on public.leads
  for select
  to anon
  using (true);

create policy "Anon can update lead status"
  on public.leads
  for update
  to anon
  using (true)
  with check (true);

create policy "Anon can delete leads"
  on public.leads
  for delete
  to anon
  using (true);

-- OPTION B: If you add auth later, replace the above with:
-- using (auth.uid() is not null)
```

> ⚠️ **Security note:** The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is visible in the browser.
> RLS is your only protection. Never use the `service_role` key in any frontend file.

---

## 3. Get your Supabase credentials

1. Go to **Project Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon / public** key

---

## 4. Configure environment variables

Create or edit `.env.local` in the project root:

```bash
# Supabase (optional — leave blank to use localStorage only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

Restart the dev server after changing `.env.local`:

```bash
npm run dev
```

---

## 5. Install the Supabase client library (if not already installed)

```bash
npm install @supabase/supabase-js
```

The adapter uses a **dynamic import** — Supabase is only loaded when the env vars are present, so there's no bundle cost for localStorage-only mode.

---

## 6. Test the integration

1. Set the env vars and restart the server
2. Open `/public-audit`, scan a site, and submit the lead form
3. Check your Supabase Table Editor → `leads` — the row should appear
4. Open `/admin/leads` — the Lead Manager should load from Supabase

**Expected admin UI indicator:**  
The Lead Manager shows a ☁️ **Supabase** badge in the top-left when the adapter is in Supabase mode.  
It shows 💾 **localStorage** when running without env vars.

---

## 7. Data schema reference

| Column              | Type       | Notes                                  |
|---------------------|------------|----------------------------------------|
| `id`                | uuid       | Auto-generated primary key             |
| `created_at`        | timestamptz| Auto-set to now()                      |
| `name`              | text       | Required                               |
| `company`           | text       | Optional                               |
| `email`             | text       | Required                               |
| `phone`             | text       | Optional                               |
| `website`           | text       | Required                               |
| `service_interest`  | text       | Optional dropdown selection            |
| `message`           | text       | Optional free-text                     |
| `consent`           | boolean    | Required checkbox                      |
| `audit_score`       | integer    | 0–100 SEO health score                 |
| `schema_score`      | integer    | 0–100 schema score, nullable           |
| `wordpress_detected`| boolean    | Was WordPress detected?                |
| `top_issues`        | text[]     | Array of top issue labels              |
| `score_reasons`     | text[]     | Human-readable lead score reasons      |
| `lead_score`        | integer    | 0–100 composite lead quality score     |
| `lead_temperature`  | text       | Hot / Warm / Cold                      |
| `status`            | text       | New / Contacted / Qualified / Closed / Not Suitable |

---

## Fallback behaviour

If Supabase is configured but **unavailable** (network error, quota, etc.):

- **Save:** Falls back to localStorage — lead is not lost
- **Load:** Falls back to localStorage cache
- **Update / Delete:** localStorage is updated; Supabase failure logged to console

All errors are non-fatal and logged with the prefix `[LeadAdapter]`.
