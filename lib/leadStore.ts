// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Lead Store (V8)
// localStorage-based CRUD for captured leads.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditLead, LeadStatus } from '@/types/seo';

const LEADS_KEY  = 'elitez-leads';
const MAX_LEADS  = 200;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLeads(): PublicAuditLead[] {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) ?? '[]') as PublicAuditLead[];
  } catch {
    return [];
  }
}

function storeLeads(leads: PublicAuditLead[]): void {
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  } catch {
    throw new Error('Storage quota exceeded. Please export and delete older leads.');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Save a new lead. Returns the generated ID. */
export function saveLead(lead: Omit<PublicAuditLead, 'id' | 'createdAt'>): string {
  const leads = loadLeads();
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newLead: PublicAuditLead = {
    ...lead,
    id,
    createdAt: new Date().toISOString(),
    status: lead.status ?? 'New',
  };
  // Trim to max, newest first
  const updated = [newLead, ...leads].slice(0, MAX_LEADS);
  storeLeads(updated);
  return id;
}

/** Get all leads, newest first. */
export function getLeads(): PublicAuditLead[] {
  return loadLeads().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Get a single lead by ID. */
export function getLeadById(id: string): PublicAuditLead | null {
  return loadLeads().find(l => l.id === id) ?? null;
}

/** Update a lead's status. */
export function updateLeadStatus(id: string, status: LeadStatus): void {
  const leads = loadLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return;
  leads[idx] = { ...leads[idx], status };
  storeLeads(leads);
}

/** Delete a lead by ID. */
export function deleteLead(id: string): void {
  storeLeads(loadLeads().filter(l => l.id !== id));
}

/** Export all leads as a CSV string. */
export function exportLeadsCsv(): string {
  const leads = getLeads();
  const esc = (s: string | number | boolean | null | undefined) =>
    `"${String(s ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'ID', 'Created At', 'Name', 'Company', 'Email', 'Phone',
    'Website', 'Service Interest', 'Message', 'Consent',
    'Audit Score', 'Schema Score', 'WordPress', 'Top Issues',
    'Lead Score', 'Lead Temperature', 'Status',
  ];

  const rows = leads.map(l => [
    esc(l.id),
    esc(new Date(l.createdAt).toLocaleString('en-GB')),
    esc(l.name),
    esc(l.company),
    esc(l.email),
    esc(l.phone),
    esc(l.website),
    esc(l.serviceInterest),
    esc(l.message),
    esc(l.consent),
    esc(l.auditScore),
    esc(l.schemaScore ?? 'N/A'),
    esc(l.wordpressDetected ? 'Yes' : 'No'),
    esc(l.topIssues.join(' | ')),
    esc(l.leadScore),
    esc(l.leadTemperature),
    esc(l.status),
  ].join(','));

  return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
}

/** Export all leads as a JSON string. */
export function exportLeadsJson(): string {
  return JSON.stringify(getLeads(), null, 2);
}

/** Download leads as CSV file. */
export function downloadLeadsCsv(): void {
  const csv  = exportLeadsCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `elitez-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download leads as JSON file. */
export function downloadLeadsJson(): void {
  const json = exportLeadsJson();
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `elitez-leads-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Get lead count. */
export function getLeadCount(): number {
  return loadLeads().length;
}
