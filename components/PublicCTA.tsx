'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — Public CTA (V8)
// Post-unlock call-to-action section.
// Edit CONTACT_LINKS below to update contact URLs.
// ─────────────────────────────────────────────────────────────────────────────

import type { PublicAuditLead } from '@/types/seo';

// ─── Edit these to update contact destinations ────────────────────────────────

const CONTACT_LINKS = {
  elitezConsult:  'https://elitez.asia/contact',
  elitezProposal: 'https://elitez.asia/seo',
  elitezEmail:    'hello@elitez.asia',
  elitezWebsite:  'https://elitez.asia',
  xincePlatform:  'https://xince.ai',
  xinceEmail:     'hello@xince.ai',
};

// ─── CTA card ─────────────────────────────────────────────────────────────────

function CTACard({
  icon, title, description, primaryLabel, primaryHref, secondaryLabel, secondaryHref,
  variant = 'light',
}: {
  icon:           string;
  title:          string;
  description:    string;
  primaryLabel:   string;
  primaryHref:    string;
  secondaryLabel?: string;
  secondaryHref?:  string;
  variant?:        'light' | 'dark' | 'accent';
}) {
  const bg =
    variant === 'dark'   ? 'bg-slate-900 border-slate-800 text-white' :
    variant === 'accent' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500 text-white' :
    'bg-white border-slate-200';

  const textMain    = variant === 'light' ? 'text-slate-900' : 'text-white';
  const textSub     = variant === 'light' ? 'text-slate-600' : 'text-white/80';
  const primaryCls  = variant === 'light'
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-white hover:bg-slate-100 text-slate-900';
  const secondCls   = variant === 'light'
    ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
    : 'border border-white/40 text-white hover:bg-white/10';

  return (
    <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${bg}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <h3 className={`font-extrabold text-lg mb-1 ${textMain}`}>{title}</h3>
        <p className={`text-sm leading-relaxed ${textSub}`}>{description}</p>
      </div>
      <div className="flex flex-wrap gap-2 mt-auto">
        <a
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${primaryCls}`}
        >
          {primaryLabel} →
        </a>
        {secondaryLabel && secondaryHref && (
          <a
            href={secondaryHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${secondCls}`}
          >
            {secondaryLabel}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lead:  PublicAuditLead;
  score: number;
}

export default function PublicCTA({ lead, score }: Props) {
  const isLowScore = score < 60;
  const hasWP      = lead.wordpressDetected;

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white text-center">
        <h2 className="text-2xl font-extrabold mb-2">
          {isLowScore
            ? '⚡ Your site needs attention — let\'s fix it'
            : '🚀 Ready to take your SEO to the next level?'}
        </h2>
        <p className="text-blue-200 text-sm max-w-2xl mx-auto leading-relaxed">
          {lead.name ? `Hi ${lead.name.split(' ')[0]}, ` : ''}
          your audit is complete. Our team can help you turn these findings into real improvements.
          All recommendations are advisory — outcomes depend on implementation quality and market conditions.
        </p>
      </div>

      {/* CTA cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <CTACard
          icon="📋"
          title="Book a Free Consultation"
          description="Speak with an Elitez SEO specialist about your audit results. We'll walk you through the findings and recommend a prioritised fix plan."
          primaryLabel="Book with Elitez"
          primaryHref={CONTACT_LINKS.elitezConsult}
          secondaryLabel="Email us"
          secondaryHref={`mailto:${CONTACT_LINKS.elitezEmail}?subject=SEO Audit Consultation — ${lead.website}&body=Hi Elitez team,%0A%0AI just completed an SEO audit for ${lead.website} (score: ${score}/100). I'd like to discuss the results.%0A%0ARegards,%0A${lead.name}`}
          variant="accent"
        />

        <CTACard
          icon="🔧"
          title="Request an SEO Fix Proposal"
          description="Get a detailed proposal for fixing the technical SEO issues found in your audit — with clear pricing and a realistic timeline."
          primaryLabel="Request Proposal"
          primaryHref={CONTACT_LINKS.elitezProposal}
          secondaryLabel="Visit Elitez"
          secondaryHref={CONTACT_LINKS.elitezWebsite}
          variant="dark"
        />

        {hasWP && (
          <CTACard
            icon="🟣"
            title="WordPress SEO Support"
            description="Your site runs WordPress. We provide specialist WordPress SEO services including plugin configuration, technical fixes, and ongoing optimisation."
            primaryLabel="Get WordPress Help"
            primaryHref={CONTACT_LINKS.elitezConsult}
            variant="light"
          />
        )}

        <CTACard
          icon="🤖"
          title="AI Search Optimisation (AEO)"
          description="Is your website visible to AI search tools like ChatGPT, Perplexity, and Gemini? XinceAI helps businesses get found in the AI-powered search era."
          primaryLabel="Explore XinceAI"
          primaryHref={CONTACT_LINKS.xincePlatform}
          secondaryLabel="Email XinceAI"
          secondaryHref={`mailto:${CONTACT_LINKS.xinceEmail}`}
          variant="light"
        />
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '🏆', label: 'Elitez Asia', sub: 'Technical SEO experts' },
          { icon: '🤖', label: 'XinceAI',    sub: 'AI search specialists' },
          { icon: '🔒', label: 'No Spam',    sub: 'Your data is safe' },
          { icon: '💬', label: 'Free chat',  sub: 'No obligation' },
        ].map(t => (
          <div key={t.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl mb-1">{t.icon}</p>
            <p className="text-xs font-bold text-slate-700">{t.label}</p>
            <p className="text-xs text-slate-400">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Fine print */}
      <p className="text-xs text-slate-400 text-center leading-relaxed px-4">
        SEO recommendations are based on automated analysis of publicly accessible pages.
        Results may vary. Google search outcomes including rankings and organic traffic are not guaranteed
        and are influenced by many factors beyond technical SEO.
        Elitez Asia and XinceAI are independent businesses.
      </p>
    </div>
  );
}
