'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Elitez Technical SEO Doctor — CMS Detection Card (V7)
// Displays the CMS detection result with evidence and detected plugins.
// ─────────────────────────────────────────────────────────────────────────────

import type { CMSDetectionResult, DetectedPlugin } from '@/types/seo';

// ─── CMS icon map ─────────────────────────────────────────────────────────────

const CMS_ICON: Record<string, string> = {
  WordPress:       '🟦',
  WooCommerce:     '🟣',
  Shopify:         '🟢',
  Wix:             '🔵',
  Webflow:         '⚫',
  'Custom/Unknown':'⚪',
};

const CATEGORY_COLOUR: Record<DetectedPlugin['category'], string> = {
  seo:         'bg-blue-100 text-blue-700',
  pagebuilder: 'bg-purple-100 text-purple-700',
  ecommerce:   'bg-green-100 text-green-700',
  cache:       'bg-yellow-100 text-yellow-700',
  schema:      'bg-indigo-100 text-indigo-700',
  forms:       'bg-pink-100 text-pink-700',
  other:       'bg-slate-100 text-slate-600',
};

const CONFIDENCE_COLOUR: Record<string, string> = {
  high:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-slate-100 text-slate-500',
};

// ─── Plugin chip ──────────────────────────────────────────────────────────────

function PluginChip({ plugin }: { plugin: DetectedPlugin }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{plugin.name}</span>
        <div className="flex gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOUR[plugin.category]}`}>
            {plugin.category}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONFIDENCE_COLOUR[plugin.confidence]}`}>
            {plugin.confidence}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{plugin.evidence}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  detection: CMSDetectionResult;
}

export default function CMSDetectionCard({ detection }: Props) {
  const icon = CMS_ICON[detection.cmsName] ?? '⚪';
  const isWP = detection.isWordPress || detection.hasWooCommerce;

  const confidenceBg =
    detection.confidence === 'high'   ? 'bg-green-50 border-green-200' :
    detection.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
    'bg-slate-50 border-slate-200';

  const confidenceText =
    detection.confidence === 'high'   ? 'text-green-700' :
    detection.confidence === 'medium' ? 'text-yellow-700' :
    'text-slate-500';

  const seoPlugins   = detection.detectedPlugins.filter(p => p.category === 'seo');
  const otherPlugins = detection.detectedPlugins.filter(p => p.category !== 'seo');

  return (
    <div className="space-y-4">

      {/* CMS identity card */}
      <div className={`card p-5 border ${confidenceBg}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-extrabold text-slate-900">{detection.cmsName}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${confidenceBg} ${confidenceText}`}>
                {detection.confidence} confidence
              </span>
              {detection.hasWooCommerce && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                  + WooCommerce
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isWP
                ? 'WordPress site detected. WordPress Helper Mode is fully active.'
                : detection.cmsName === 'Custom/Unknown'
                  ? 'CMS could not be determined from crawl data. Generic fix instructions are available.'
                  : `${detection.cmsName} site detected. WordPress-specific instructions may not apply.`}
            </p>
          </div>
          {detection.detectedTheme && (
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 text-center flex-shrink-0">
              <p className="text-xs text-slate-400">Theme</p>
              <p className="font-bold text-slate-800">{detection.detectedTheme.name}</p>
              <p className="text-xs text-slate-400">{detection.detectedTheme.confidence} confidence</p>
            </div>
          )}
        </div>
      </div>

      {/* SEO plugins */}
      {seoPlugins.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2">📌 SEO Plugin(s) Detected</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {seoPlugins.map(p => <PluginChip key={p.slug} plugin={p} />)}
          </div>
        </div>
      )}

      {/* Other plugins */}
      {otherPlugins.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2">🔌 Other Plugins Detected</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherPlugins.map(p => <PluginChip key={p.slug} plugin={p} />)}
          </div>
        </div>
      )}

      {detection.detectedPlugins.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          No plugins detected from crawl data. Detection requires schema output, URL patterns, or sitemap references.
        </div>
      )}

      {/* Evidence list */}
      {detection.evidence.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700 list-none flex items-center gap-1.5">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            View detection evidence ({detection.evidence.length} signals)
          </summary>
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
            {detection.evidence.map((e, i) => (
              <p key={i} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                {e}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
