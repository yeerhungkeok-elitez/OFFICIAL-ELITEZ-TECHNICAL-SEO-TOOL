'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Content Checker — Auto Fix Panel (V9)
// Combines AutoFixControls + list of FixIssueCard components.
// Manages issue state: apply / ignore per-issue.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContentScoreResult, ContentIssue } from '@/types/content';
import AutoFixControls from '@/components/AutoFixControls';
import FixIssueCard    from '@/components/FixIssueCard';

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  scoreResult:    ContentScoreResult | null;
  onFixSingle:    (issueId: string) => void;
  onIgnoreIssue:  (issueId: string) => void;
  onFixCritical:  () => void;
  onFixSafe:      () => void;
  onFixAll:       () => void;
  onRescore:      () => void;
  fixingIssueId?: string | null;
  isProcessing?:  boolean;
  hasContent?:    boolean;
}

// ─── Group issues by severity ──────────────────────────────────────────────────

const SEV_ORDER: ContentIssue['severity'][] = ['critical', 'high', 'medium', 'low'];

function groupIssues(issues: ContentIssue[]): Record<ContentIssue['severity'], ContentIssue[]> {
  const groups = { critical: [], high: [], medium: [], low: [] } as Record<ContentIssue['severity'], ContentIssue[]>;
  for (const issue of issues) {
    groups[issue.severity].push(issue);
  }
  return groups;
}

const SEV_LABELS: Record<ContentIssue['severity'], string> = {
  critical: '🔴 Critical',
  high:     '🟠 High',
  medium:   '🟡 Medium',
  low:      '⚪ Low',
};

// ─── Main component ────────────────────────────────────────────────────────────

export default function AutoFixPanel({
  scoreResult,
  onFixSingle,
  onIgnoreIssue,
  onFixCritical,
  onFixSafe,
  onFixAll,
  onRescore,
  fixingIssueId,
  isProcessing,
  hasContent,
}: Props) {
  const issues = scoreResult?.issues ?? [];
  const activeIssues = issues.filter(i => !i.isIgnored && !i.isFixed);
  const ignoredCount = issues.filter(i => i.isIgnored).length;
  const fixedCount   = issues.filter(i => i.isFixed).length;

  const groups = groupIssues(activeIssues);

  return (
    <div className="space-y-4">
      {/* Top-level actions */}
      <AutoFixControls
        scoreResult={scoreResult}
        onFixCritical={onFixCritical}
        onFixSafe={onFixSafe}
        onFixAll={onFixAll}
        onRescore={onRescore}
        isProcessing={isProcessing}
        hasContent={hasContent}
      />

      {/* Issue list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Issues
            {activeIssues.length > 0 && (
              <span className="ml-2 text-xs font-medium text-slate-400">
                ({activeIssues.length} active)
              </span>
            )}
          </h2>
          {(fixedCount + ignoredCount) > 0 && (
            <div className="flex gap-2 text-xs text-slate-500">
              {fixedCount > 0 && (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✅ {fixedCount} fixed
                </span>
              )}
              {ignoredCount > 0 && (
                <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                  ○ {ignoredCount} ignored
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {activeIssues.length === 0 ? (
            <div className="text-center py-10">
              {!hasContent ? (
                <>
                  <p className="text-3xl mb-3">📝</p>
                  <p className="text-sm text-slate-500">Paste your article content and click Score to see issues.</p>
                </>
              ) : (
                <>
                  <p className="text-3xl mb-3">🎉</p>
                  <p className="text-sm font-medium text-emerald-700">All issues resolved!</p>
                  <p className="text-xs text-slate-500 mt-1">Your content looks great. Review any [⚠️ NEEDS REVIEW] markers before publishing.</p>
                </>
              )}
            </div>
          ) : (
            SEV_ORDER.map(sev => {
              const sevIssues = groups[sev];
              if (sevIssues.length === 0) return null;
              return (
                <div key={sev}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    {SEV_LABELS[sev]} — {sevIssues.length} issue{sevIssues.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {sevIssues.map(issue => (
                      <FixIssueCard
                        key={issue.id}
                        issue={issue}
                        onApplyFix={onFixSingle}
                        onIgnore={onIgnoreIssue}
                        isFixing={fixingIssueId === issue.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
