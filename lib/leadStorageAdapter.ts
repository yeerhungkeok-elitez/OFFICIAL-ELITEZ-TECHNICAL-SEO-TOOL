// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Lead Storage Adapter (V8.1)
// Dual-mode: localStorage (default) or Supabase (when env vars present).
// Supabase code only loads if NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
// localStorage is always kept in sync as a local cache / offline fallback.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditLead, LeadStatus, LeadStorageMode } from '@/types/seo';

// ─── Re-export the sync localStorage functions from leadStore ─────────────────
export {
  saveLead       as saveLeadSync,
  getLeads       as getLeadsSync,
  updateLeadStatus as updateLeadStatusSync,
  deleteLead     as deleteLeadSync,
  exportLeadsCsv as exportLeadsCsvSync,
  exportLeadsJson as exportLeadsJsonSync,
  downloadLeadsCsv as downloadLeadsCsvSync,
  downloadLeadsJson as downloadLeadsJsonSync,
} from '@/lib/leadStore';

import {
  saveLead       as lsSaveLead,
  getLeads       as lsGetLeads,
  updateLeadStatus as lsUpdateStatus,
  deleteLead     as lsDeleteLead,
  exportLeadsCsv as lsExportCsv,
  exportLeadsJson as lsExportJson,
  getLeadCount   as lsGetCount,
} from '@/lib/leadStore';

// ─── Mode detection ────────────────────────────────────────────────────────────

export function getStorageMode(): LeadStorageMode {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return 'supabase';
  }
  return 'localStorage';
}

// ─── Supabase helpers (only executed when env vars are present) ────────────────

async function getSupabaseClient() {
  // Dynamic import so the package is only loaded when Supabase mode is active.
  // This avoids a hard dependency for users running in localStorage-only mode.
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, key);
}

async function sbSaveLead(lead: Omit<PublicAuditLead, 'id' | 'createdAt'>): Promise<string> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      name:               lead.name,
      company:            lead.company,
      email:              lead.email,
      phone:              lead.phone,
      website:            lead.website,
      service_interest:   lead.serviceInterest,
      message:            lead.message,
      consent:            lead.consent,
      audit_score:        lead.auditScore,
      schema_score:       lead.schemaScore,
      wordpress_detected: lead.wordpressDetected,
      top_issues:         lead.topIssues,
      score_reasons:      lead.scoreReasons ?? [],
      lead_score:         lead.leadScore,
      lead_temperature:   lead.leadTemperature,
      status:             lead.status,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Supabase insert error: ${error.message}`);
  return (data as { id: string }).id;
}

async function sbGetLeads(): Promise<PublicAuditLead[]> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase select error: ${error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any): PublicAuditLead => ({
    id:                row.id,
    createdAt:         row.created_at,
    name:              row.name,
    company:           row.company ?? '',
    email:             row.email,
    phone:             row.phone ?? '',
    website:           row.website,
    serviceInterest:   row.service_interest ?? '',
    message:           row.message ?? '',
    consent:           row.consent,
    auditScore:        row.audit_score,
    schemaScore:       row.schema_score ?? null,
    wordpressDetected: row.wordpress_detected,
    topIssues:         row.top_issues ?? [],
    scoreReasons:      row.score_reasons ?? [],
    leadScore:         row.lead_score,
    leadTemperature:   row.lead_temperature,
    status:            row.status,
  }));
}

async function sbUpdateStatus(id: string, status: LeadStatus): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('leads').update({ status }).eq('id', id);
  if (error) throw new Error(`Supabase update error: ${error.message}`);
}

async function sbDelete(id: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw new Error(`Supabase delete error: ${error.message}`);
}

// ─── Public async Adapter API ──────────────────────────────────────────────────

/**
 * Save a new lead. Supabase if configured; localStorage otherwise.
 * localStorage is always written as a local cache — safe for offline use.
 */
export async function saveLead(lead: Omit<PublicAuditLead, 'id' | 'createdAt'>): Promise<string> {
  const lsId = lsSaveLead(lead); // always write locally first
  if (getStorageMode() === 'supabase') {
    try {
      return await sbSaveLead(lead);
    } catch (err) {
      console.warn('[LeadAdapter] Supabase save failed, using localStorage id:', err);
    }
  }
  return lsId;
}

/**
 * Get all leads, newest first. Supabase if configured; localStorage otherwise.
 */
export async function getLeads(): Promise<PublicAuditLead[]> {
  if (getStorageMode() === 'supabase') {
    try {
      return await sbGetLeads();
    } catch (err) {
      console.warn('[LeadAdapter] Supabase fetch failed, falling back to localStorage:', err);
    }
  }
  return lsGetLeads();
}

/**
 * Update lead status in both stores.
 */
export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  lsUpdateStatus(id, status); // keep localStorage in sync
  if (getStorageMode() === 'supabase') {
    try {
      await sbUpdateStatus(id, status);
    } catch (err) {
      console.warn('[LeadAdapter] Supabase status update failed (localStorage updated):', err);
    }
  }
}

/**
 * Delete a lead from both stores.
 */
export async function deleteLead(id: string): Promise<void> {
  lsDeleteLead(id);
  if (getStorageMode() === 'supabase') {
    try {
      await sbDelete(id);
    } catch (err) {
      console.warn('[LeadAdapter] Supabase delete failed (localStorage deleted):', err);
    }
  }
}

// ─── Export / download ─────────────────────────────────────────────────────────

function buildCsv(leads: PublicAuditLead[]): string {
  const esc = (s: string | number | boolean | null | undefined) =>
    `"${String(s ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'ID', 'Created At', 'Name', 'Company', 'Email', 'Phone',
    'Website', 'Service Interest', 'Message', 'Consent',
    'Audit Score', 'Schema Score', 'WordPress', 'Top Issues',
    'Score Reasons', 'Lead Score', 'Lead Temperature', 'Status',
  ];

  const rows = leads.map(l => [
    esc(l.id),
    esc(new Date(l.createdAt).toLocaleString('en-GB')),
    esc(l.name), esc(l.company), esc(l.email), esc(l.phone),
    esc(l.website), esc(l.serviceInterest), esc(l.message),
    esc(l.consent ? 'Yes' : 'No'),
    esc(l.auditScore), esc(l.schemaScore ?? 'N/A'),
    esc(l.wordpressDetected ? 'Yes' : 'No'),
    esc(l.topIssues.join(' | ')),
    esc((l.scoreReasons ?? []).join(' | ')),
    esc(l.leadScore), esc(l.leadTemperature), esc(l.status),
  ].join(','));

  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
}

export async function exportLeadsCsv(): Promise<string> {
  const leads = await getLeads();
  return buildCsv(leads);
}

export async function exportLeadsJson(): Promise<string> {
  const leads = await getLeads();
  return JSON.stringify(leads, null, 2);
}

export async function downloadLeadsCsv(): Promise<void> {
  const csv  = await exportLeadsCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `elitez-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadLeadsJson(): Promise<void> {
  const json = await exportLeadsJson();
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `elitez-leads-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Quick count — always from localStorage (fast, no async). */
export function getLeadCount(): number {
  return lsGetCount();
}
