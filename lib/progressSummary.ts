// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Progress Summary Generator (V6)
// Generates hedged narrative language from a snapshot comparison.
// No ranking promises — all wording is cautious and professional.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProgressSummary, SnapshotComparisonResult } from '@/types/seo';

export function generateProgressSummary(
  comparison: SnapshotComparisonResult,
): ProgressSummary {
  const {
    scoreImprovement,
    resolvedCount,
    newCount,
    persistentCount,
    metrics,
    beforeSnapshot,
    afterSnapshot,
  } = comparison;

  const domain      = afterSnapshot.domain;
  const beforeScore = beforeSnapshot.summary.overallScore;
  const afterScore  = afterSnapshot.summary.overallScore;

  // ── Headline ──────────────────────────────────────────────────────────────
  let headline: string;
  if (scoreImprovement > 10) {
    headline = `${domain} has shown notable technical SEO progress since the previous audit.`;
  } else if (scoreImprovement > 0) {
    headline = `${domain} shows modest technical improvement compared to the previous audit.`;
  } else if (scoreImprovement === 0) {
    headline = `${domain}'s SEO health score is unchanged since the previous audit.`;
  } else {
    headline = `${domain}'s technical SEO health score has declined since the previous audit.`;
  }

  // ── Score change ──────────────────────────────────────────────────────────
  let scoreChange: string;
  if (scoreImprovement > 0) {
    scoreChange =
      `The overall SEO score may have improved from ${beforeScore}/100 to ${afterScore}/100 (+${scoreImprovement} points). ` +
      `This change may reflect resolved technical issues, but does not guarantee changes in search rankings or organic traffic.`;
  } else if (scoreImprovement < 0) {
    scoreChange =
      `The overall SEO score decreased from ${beforeScore}/100 to ${afterScore}/100 (${scoreImprovement} points). ` +
      `This may indicate new technical issues that could benefit from attention.`;
  } else {
    scoreChange =
      `The overall SEO score remains at ${afterScore}/100, unchanged from the previous audit. ` +
      `Stability can indicate consistent site health, though active issues remain to be addressed.`;
  }

  // ── Resolved issues ───────────────────────────────────────────────────────
  const resolvedNote = resolvedCount > 0
    ? `${resolvedCount} issue${resolvedCount !== 1 ? 's' : ''} identified in the previous audit ` +
      `appear${resolvedCount === 1 ? 's' : ''} to have been addressed. ` +
      `Resolving technical issues is generally positive for site health, though the impact on search rankings ` +
      `is not guaranteed and may take time to appear in search performance data.`
    : `No issues from the previous audit appear to have been resolved during this period.`;

  // ── New issues ────────────────────────────────────────────────────────────
  const newIssuesNote = newCount > 0
    ? `${newCount} new issue${newCount !== 1 ? 's' : ''} ${newCount === 1 ? 'was' : 'were'} detected ` +
      `that ${newCount === 1 ? 'was' : 'were'} not present in the previous audit. ` +
      `These may warrant review to understand their origin and potential impact.`
    : `No new SEO issues were detected compared to the previous audit period.`;

  // ── Persistent issues ─────────────────────────────────────────────────────
  const persistentNote = persistentCount > 0
    ? `${persistentCount} issue${persistentCount !== 1 ? 's' : ''} remain${persistentCount === 1 ? 's' : ''} ` +
      `unresolved from the previous audit. Persistent issues, particularly at critical or high severity, ` +
      `may continue to affect technical site health and are recommended for prioritisation.`
    : `All previously identified issues appear to have been addressed. ` +
      `Running follow-up audits is still recommended to confirm resolution and detect any regressions.`;

  // ── Overall assessment ────────────────────────────────────────────────────
  let overallAssessment: string;
  if (scoreImprovement > 5 && resolvedCount > newCount) {
    overallAssessment =
      `Overall, this audit period reflects positive momentum in technical SEO health. ` +
      `Continued attention to remaining issues and regular monitoring may help sustain this trajectory.`;
  } else if (scoreImprovement < -5 || (newCount > 0 && newCount > resolvedCount * 2)) {
    overallAssessment =
      `This audit period shows signs of technical SEO regression. ` +
      `Prioritising critical and high-severity issues is recommended to minimise potential impact ` +
      `on site visibility and crawlability.`;
  } else {
    overallAssessment =
      `Technical SEO health is relatively stable. Focused effort on unresolved high-priority issues ` +
      `and monitoring for new regressions is recommended.`;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations: string[] = [];
  const critMetric = metrics.find(m => m.label === 'Critical Issues');
  if (critMetric && critMetric.after > 0) {
    recommendations.push(
      `Address ${critMetric.after} remaining critical issue${critMetric.after !== 1 ? 's' : ''} as the highest priority.`,
    );
  }
  if (newCount > 0) {
    recommendations.push(
      `Investigate ${newCount} newly detected issue${newCount !== 1 ? 's' : ''} to understand their source.`,
    );
  }
  if (scoreImprovement >= 5) {
    recommendations.push(`Maintain current optimisation approach — the trend appears positive.`);
  }
  if (persistentCount > 0) {
    recommendations.push(
      `Develop a plan to resolve the ${persistentCount} persistent issue${persistentCount !== 1 ? 's' : ''} still outstanding.`,
    );
  }
  recommendations.push(`Schedule follow-up audits at regular intervals to track trend direction over time.`);
  recommendations.push(
    `Cross-reference with Google Search Console data for actual changes in impressions, clicks, and indexing status.`,
  );

  return {
    headline,
    scoreChange,
    resolvedNote,
    newIssuesNote,
    persistentNote,
    overallAssessment,
    recommendations,
    disclaimer:
      `This progress summary is generated from automated technical SEO checks and reflects differences ` +
      `between two point-in-time audits. Improvements in technical SEO metrics do not guarantee changes ` +
      `in search engine rankings or organic traffic. Google's indexing and ranking decisions are influenced ` +
      `by many factors outside of technical SEO alone. All findings should be reviewed by a qualified SEO ` +
      `professional before strategic decisions are made.`,
  };
}
