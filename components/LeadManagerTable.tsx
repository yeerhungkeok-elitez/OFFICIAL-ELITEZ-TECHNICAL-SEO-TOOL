'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Lead Manager Table (V8.1)
// V8.1: adapter-based export (async), adapter-based status update,
//       score reasons display, lead source label, safer delete confirm.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { PublicAuditLead, LeadStatus, LeadTemperature } from '@/types/seo';
import {
  getLeads,
  updateLeadStatus,
  deleteLead,
  downloadLeadsCsv,
  downloadLeadsJson,
  getStorageMode,
} from '@/lib/leadStorageAdapter';
import { temperatureColour, temperatureEmoji } from '@/lib/leadScoring';

// ─── Status options ────────────────────────────────────────────────────────────

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Closed', 'Not Suitable'];

const STATUS_COLOUR: Record<LeadStatus, string> = {
  'New':          'bg-blue-100  text-blue-700   border-blue-200',
  'Contacted':    'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Qualified':    'bg-green-100 text-green-700   border-green-200',
  'Closed':       'bg-slate-100 text-slate-600   border-slate-200',
  'Not Suitable': 'bg-red-100   text-red-700     border-red-200',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const colour =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-yellow-500' :
    score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{score}</span>
    </div>
  );
}

function LeadDetail({ lead }: { lead: PublicAuditLead }) {
  return (
    <tr>
      <td colSpan={10} className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">

          {/* Contact */}
          <div>
            <p className="font-bold text-slate-600 mb-1">Contact Details</p>
            <p>
              <span className="text-slate-400">Email:</span>{' '}
              <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a>
            </p>
            <p><span className="text-slate-400">Phone:</span> {lead.phone || '—'}</p>
            <p>
              <span className="text-slate-400">Website:</span>{' '}
              <a href={lead.website} target="_blank" rel="noopener noreferrer"
                 className="text-blue-600 hover:underline">{lead.website}</a>
            </p>
            <p className="mt-1">
              <span className="text-slate-400">Source:</span>{' '}
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                🌐 Public Audit
              </span>
            </p>
          </div>

          {/* Audit snapshot */}
          <div>
            <p className="font-bold text-slate-600 mb-1">Audit Snapshot</p>
            <p><span className="text-slate-400">SEO Score:</span> <strong>{lead.auditScore}/100</strong></p>
            <p><span className="text-slate-400">Schema Score:</span> {lead.schemaScore ?? 'N/A'}</p>
            <p><span className="text-slate-400">WordPress:</span> {lead.wordpressDetected ? '✅ Yes' : '❌ No'}</p>
            <p><span className="text-slate-400">Service:</span> {lead.serviceInterest || '—'}</p>
          </div>

          {/* Top issues */}
          <div>
            <p className="font-bold text-slate-600 mb-1">Top Issues Found</p>
            {lead.topIssues.length > 0
              ? lead.topIssues.map((iss, i) => <p key={i}>• {iss}</p>)
              : <p className="text-slate-400">None recorded</p>}
          </div>

          {/* Message */}
          {lead.message && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="font-bold text-slate-600 mb-1">Message</p>
              <p className="text-slate-700 leading-relaxed">{lead.message}</p>
            </div>
          )}

          {/* Lead quality */}
          <div>
            <p className="font-bold text-slate-600 mb-1">Lead Quality</p>
            <p><span className="text-slate-400">Lead Score:</span> <strong>{lead.leadScore}/100</strong></p>
            <p>
              <span className="text-slate-400">Temperature:</span>{' '}
              {temperatureEmoji(lead.leadTemperature)} {lead.leadTemperature}
            </p>
          </div>

          {/* Score reasons (V8.1) */}
          {lead.scoreReasons && lead.scoreReasons.length > 0 && (
            <div>
              <p className="font-bold text-slate-600 mb-1">Score Reasons</p>
              {lead.scoreReasons.map((r, i) => (
                <p key={i} className="text-slate-600">• {r}</p>
              ))}
            </div>
          )}

          {/* Meta */}
          <div>
            <p className="font-bold text-slate-600 mb-1">Meta</p>
            <p>
              <span className="text-slate-400">ID:</span>{' '}
              <code className="bg-slate-100 px-1 rounded text-[10px]">{lead.id}</code>
            </p>
            <p><span className="text-slate-400">Submitted:</span> {new Date(lead.createdAt).toLocaleString('en-GB')}</p>
            <p><span className="text-slate-400">Consent:</span> {lead.consent ? '✅ Yes' : '❌ No'}</p>
          </div>

        </div>
      </td>
    </tr>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LeadManagerTable() {
  const [leads,          setLeads]         = useState<PublicAuditLead[]>([]);
  const [filterStatus,   setFilterStatus]  = useState<LeadStatus | 'all'>('all');
  const [filterTemp,     setFilterTemp]    = useState<LeadTemperature | 'all'>('all');
  const [searchQuery,    setSearchQuery]   = useState('');
  const [expandedId,     setExpandedId]    = useState<string | null>(null);
  const [deleteConfirm,  setDeleteConfirm] = useState<string | null>(null);
  const [exportLoading,  setExportLoading] = useState<'csv' | 'json' | null>(null);
  const [loading,        setLoading]       = useState(true);

  const storageMode = getStorageMode();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getLeads();
      setLeads(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function handleStatusChange(id: string, status: LeadStatus) {
    await updateLeadStatus(id, status);
    reload();
  }

  async function handleDelete(id: string) {
    if (deleteConfirm === id) {
      await deleteLead(id);
      setDeleteConfirm(null);
      setExpandedId(prev => prev === id ? null : prev);
      reload();
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(prev => prev === id ? null : prev), 4000);
    }
  }

  async function handleExportCsv() {
    setExportLoading('csv');
    try { await downloadLeadsCsv(); } finally { setExportLoading(null); }
  }

  async function handleExportJson() {
    setExportLoading('json');
    try { await downloadLeadsJson(); } finally { setExportLoading(null); }
  }

  const filtered = useMemo(() => {
    let list = leads;
    if (filterStatus !== 'all') list = list.filter(l => l.status === filterStatus);
    if (filterTemp   !== 'all') list = list.filter(l => l.leadTemperature === filterTemp);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        l.name.toLowerCase().includes(q)    ||
        l.email.toLowerCase().includes(q)   ||
        l.company.toLowerCase().includes(q) ||
        l.website.toLowerCase().includes(q),
      );
    }
    return list;
  }, [leads, filterStatus, filterTemp, searchQuery]);

  const newCount  = leads.filter(l => l.status === 'New').length;
  const hotCount  = leads.filter(l => l.leadTemperature === 'Hot').length;
  const warmCount = leads.filter(l => l.leadTemperature === 'Warm').length;

  return (
    <div className="space-y-5">

      {/* Storage mode badge */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">Storage:</span>
        <span className={`px-2 py-0.5 rounded-full font-semibold border ${
          storageMode === 'supabase'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {storageMode === 'supabase' ? '☁️ Supabase' : '💾 localStorage'}
        </span>
        {storageMode === 'localStorage' && (
          <span className="text-slate-400">
            — set <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> to enable cloud storage
          </span>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads',   value: leads.length, bg: 'bg-slate-50  border-slate-200', text: 'text-slate-700' },
          { label: '🔥 Hot Leads',  value: hotCount,     bg: 'bg-red-50    border-red-100',   text: 'text-red-700'   },
          { label: '☀️ Warm Leads', value: warmCount,    bg: 'bg-orange-50 border-orange-100',text: 'text-orange-700'},
          { label: '🆕 New Leads',  value: newCount,     bg: 'bg-blue-50   border-blue-100',  text: 'text-blue-700'  },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-extrabold ${s.text}`}>{loading ? '…' : s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + export */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, email, company, website…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as LeadStatus | 'all')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterTemp}
          onChange={e => setFilterTemp(e.target.value as LeadTemperature | 'all')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="all">All temperatures</option>
          <option value="Hot">🔥 Hot</option>
          <option value="Warm">☀️ Warm</option>
          <option value="Cold">🧊 Cold</option>
        </select>

        {(filterStatus !== 'all' || filterTemp !== 'all' || searchQuery) && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterTemp('all'); setSearchQuery(''); }}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Clear
          </button>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={handleExportCsv}
            disabled={leads.length === 0 || exportLoading !== null}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            {exportLoading === 'csv' ? '⏳' : '⬇️'} CSV
          </button>
          <button
            onClick={handleExportJson}
            disabled={leads.length === 0 || exportLoading !== null}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            {exportLoading === 'json' ? '⏳' : '⬇️'} JSON
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Showing {filtered.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
      </p>

      {/* Loading state */}
      {loading && (
        <div className="card p-8 text-center text-slate-400 text-sm">
          Loading leads…
        </div>
      )}

      {/* Empty state */}
      {!loading && leads.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No leads yet</h3>
          <p className="text-sm text-slate-500">
            Leads will appear here once visitors submit the public audit form at{' '}
            <code className="bg-slate-100 px-1 rounded">/public-audit</code>
          </p>
        </div>
      )}

      {!loading && filtered.length === 0 && leads.length > 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-500">No leads match your filters.</p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Name / Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Website</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">SEO Score</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(lead => (
                  <>
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        expandedId === lead.id ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => setExpandedId(id => id === lead.id ? null : lead.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.company || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-blue-600 hover:underline text-xs"
                          onClick={e => e.stopPropagation()}
                        >
                          {lead.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate block"
                          onClick={e => e.stopPropagation()}
                        >
                          {lead.website.replace(/^https?:\/\//, '')}
                        </a>
                      </td>
                      <td className="px-4 py-3 w-28">
                        <ScoreBar score={lead.auditScore} />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            temperatureColour(lead.leadTemperature)
                          }`}>
                            {temperatureEmoji(lead.leadTemperature)} {lead.leadTemperature}
                          </span>
                          <span className="text-xs text-slate-500">{lead.leadScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer ${
                            STATUS_COLOUR[lead.status]
                          }`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            deleteConfirm === lead.id
                              ? 'bg-red-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={deleteConfirm === lead.id ? 'Click again to confirm deletion' : 'Delete lead'}
                        >
                          {deleteConfirm === lead.id ? 'Confirm?' : '🗑'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === lead.id && (
                      <LeadDetail key={`${lead.id}-detail`} lead={lead} />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        {storageMode === 'localStorage'
          ? 'Leads stored in browser localStorage. Export regularly to avoid data loss. Max 200 leads.'
          : 'Leads stored in Supabase. localStorage used as local cache.'}
      </p>
    </div>
  );
}
