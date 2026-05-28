'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — WordPress Risk Warnings (V7)
// Displays risk-level warnings for WordPress fix checklist items.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Individual warning banner ────────────────────────────────────────────────

interface RiskBannerProps {
  riskLevel:   'safe' | 'needs-review' | 'requires-approval';
  approvalNote?: string;
}

export function RiskBanner({ riskLevel, approvalNote }: RiskBannerProps) {
  if (riskLevel === 'safe') {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
        <span className="text-green-600 text-base">✅</span>
        <span className="text-green-800 font-medium">
          {approvalNote ?? 'Safe to apply after content verification.'}
        </span>
      </div>
    );
  }

  if (riskLevel === 'needs-review') {
    return (
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-sm">
        <span className="text-yellow-600 text-base">⚠️</span>
        <span className="text-yellow-800 font-medium">
          {approvalNote ?? 'Review with your SEO strategist before applying.'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm">
      <span className="text-red-600 text-base">🚨</span>
      <span className="text-red-800 font-medium">
        {approvalNote ?? 'Requires developer or SEO specialist approval before applying.'}
      </span>
    </div>
  );
}

// ─── Warning list ─────────────────────────────────────────────────────────────

interface WarningListProps {
  warnings: string[];
}

export function WarningList({ warnings }: WarningListProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => {
        const isRequires = w.includes('🚨');
        const isWarning  = w.includes('⚠️');
        const bg = isRequires ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200';
        const text = isRequires ? 'text-red-800' : isWarning ? 'text-amber-800' : 'text-blue-800';
        return (
          <div key={i} className={`border rounded-xl px-4 py-3 text-xs leading-relaxed ${bg} ${text}`}>
            {w}
          </div>
        );
      })}
    </div>
  );
}

// ─── Risk level badge ─────────────────────────────────────────────────────────

interface RiskBadgeProps {
  riskLevel: 'safe' | 'needs-review' | 'requires-approval';
  size?: 'sm' | 'xs';
}

export function RiskBadge({ riskLevel, size = 'xs' }: RiskBadgeProps) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-xs';

  if (riskLevel === 'safe') {
    return (
      <span className={`${textSize} font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200`}>
        ✅ Safe
      </span>
    );
  }
  if (riskLevel === 'needs-review') {
    return (
      <span className={`${textSize} font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200`}>
        ⚠️ Needs Review
      </span>
    );
  }
  return (
    <span className={`${textSize} font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200`}>
      🚨 Requires Approval
    </span>
  );
}

// ─── Summary risk stats ───────────────────────────────────────────────────────

interface RiskSummaryProps {
  safe:              number;
  needsReview:       number;
  requiresApproval:  number;
}

export function RiskSummary({ safe, needsReview, requiresApproval }: RiskSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-extrabold text-green-700">{safe}</p>
        <p className="text-xs text-green-600 mt-1">✅ Safe</p>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-extrabold text-yellow-700">{needsReview}</p>
        <p className="text-xs text-yellow-600 mt-1">⚠️ Needs Review</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
        <p className="text-2xl font-extrabold text-red-700">{requiresApproval}</p>
        <p className="text-xs text-red-600 mt-1">🚨 Req. Approval</p>
      </div>
    </div>
  );
}
