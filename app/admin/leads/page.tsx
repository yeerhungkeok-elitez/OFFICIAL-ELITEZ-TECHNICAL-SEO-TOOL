'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Admin Leads Page (V8)
// Local admin page for reviewing leads captured via the public audit tool.
// ⚠️ No authentication — internal testing only. Add auth before public deploy.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LeadManagerTable    from '@/components/LeadManagerTable';
import AdminPasswordGate   from '@/components/AdminPasswordGate';
import { getLeadCount }   from '@/lib/leadStore';

export default function AdminLeadsPage() {
  const [leadCount, setLeadCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setLeadCount(getLeadCount());
    const d = sessionStorage.getItem('admin-warning-dismissed');
    if (d === '1') setDismissed(true);
  }, []);

  function dismiss() {
    sessionStorage.setItem('admin-warning-dismissed', '1');
    setDismissed(true);
  }

  return (
    <AdminPasswordGate>
    <div className="min-h-screen bg-slate-50">

      {/* Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-2">
              <span className="text-xl">🩺</span>
              <span className="font-bold text-slate-700 hidden sm:inline">SEO Doctor</span>
            </Link>
            <span className="text-slate-200">|</span>
            <h1 className="font-extrabold text-slate-900">📋 Lead Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
              {leadCount} lead{leadCount !== 1 ? 's' : ''} stored
            </span>
            <Link
              href="/public-audit"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Public Audit →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Security warning */}
        {!dismissed && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Internal Testing Only</h3>
              <p className="text-sm text-amber-800 leading-relaxed">
                This local admin page has <strong>no authentication</strong>.
                It is intended for internal testing and local development only.
                <strong> Do not deploy this page to a public server without adding authentication.</strong>
                {' '}Leads are stored in your browser&apos;s localStorage — clear browser data to remove them.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 text-amber-600 hover:text-amber-800 text-xl font-bold"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Lead Manager</h2>
            <p className="text-slate-500 text-sm mt-1">
              Review and manage leads captured from the public SEO audit tool.
              Click any row to expand lead details.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/public-audit"
              className="btn-secondary text-sm"
            >
              🔍 View Public Audit
            </Link>
            <Link href="/" className="btn-secondary text-sm">
              🩺 SEO Doctor
            </Link>
          </div>
        </div>

        {/* Lead table */}
        <LeadManagerTable />

        {/* Info panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-xs font-bold text-blue-700 mb-1">🔥 Hot Leads</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Hot leads score 65+ and typically have critical SEO issues, a business email,
              WordPress sites, and a specific service interest. Follow up within 24 hours.
            </p>
          </div>
          <div className="card p-4 bg-orange-50 border-orange-100">
            <p className="text-xs font-bold text-orange-700 mb-1">☀️ Warm Leads</p>
            <p className="text-xs text-orange-700 leading-relaxed">
              Warm leads score 35–64. They have clear SEO problems but may not have a specific
              service in mind yet. Nurture with educational content before pitching.
            </p>
          </div>
          <div className="card p-4 bg-slate-50">
            <p className="text-xs font-bold text-slate-600 mb-1">🧊 Cold Leads</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cold leads score under 35. Their site may already perform well, or they may not
              be ready to engage. Add to a drip campaign or newsletter.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
          <p>📋 Elitez Lead Manager · localStorage only · No database · No authentication</p>
          <p className="mt-1">
            Public audit URL: <code className="bg-slate-100 px-1 rounded">/public-audit</code>
            {' · '}
            Max 200 leads stored locally
          </p>
        </div>

      </div>
    </div>
    </AdminPasswordGate>
  );
}
