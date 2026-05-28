'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Branding Selector (V5)
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportBrand, ReportBrandPreset } from '@/types/seo';

export const DEFAULT_BRANDS: Record<ReportBrandPreset, ReportBrand> = {
  'elitez': {
    preset:       'elitez',
    brandName:    'Elitez Group',
    logoUrl:      '',
    primaryColor: '#F97316',
    preparedBy:   'Elitez Marketing',
    clientName:   '',
    websiteUrl:   '',
    reportDate:   new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  },
  'xince-ai': {
    preset:       'xince-ai',
    brandName:    'XinceAI',
    logoUrl:      '',
    primaryColor: '#2563EB',
    preparedBy:   'XinceAI Team',
    clientName:   '',
    websiteUrl:   '',
    reportDate:   new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  },
  'white-label': {
    preset:       'white-label',
    brandName:    'Your Agency',
    logoUrl:      '',
    primaryColor: '#0F172A',
    preparedBy:   'Your Team',
    clientName:   '',
    websiteUrl:   '',
    reportDate:   new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  },
};

const PRESETS: { key: ReportBrandPreset; label: string; color: string; emoji: string }[] = [
  { key: 'elitez',      label: 'Elitez',     color: '#F97316', emoji: '🟠' },
  { key: 'xince-ai',    label: 'XinceAI',    color: '#2563EB', emoji: '🔵' },
  { key: 'white-label', label: 'White Label', color: '#0F172A', emoji: '⚪' },
];

const COLORS = ['#F97316', '#2563EB', '#0F172A', '#7C3AED', '#059669', '#DC2626', '#0284C7', '#9333EA'];

interface Props {
  value:    ReportBrand;
  onChange: (brand: ReportBrand) => void;
  domain:   string;
}

export default function BrandingSelector({ value, onChange, domain }: Props) {
  function selectPreset(preset: ReportBrandPreset) {
    const base = DEFAULT_BRANDS[preset];
    onChange({
      ...base,
      clientName: value.clientName,
      websiteUrl:  value.websiteUrl || domain,
    });
  }

  function update(field: keyof ReportBrand, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div className="space-y-5">
      {/* Preset buttons */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Brand Preset</p>
        <div className="flex gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => selectPreset(p.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                value.preset === p.key
                  ? 'border-current shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              style={value.preset === p.key ? { color: p.color, borderColor: p.color, background: `${p.color}10` } : {}}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brand fields */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Brand Details</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Brand Name *</span>
            <input
              type="text"
              value={value.brandName}
              onChange={e => update('brandName', e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Elitez Group"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Prepared By *</span>
            <input
              type="text"
              value={value.preparedBy}
              onChange={e => update('preparedBy', e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. SEO Team"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Client Name</span>
            <input
              type="text"
              value={value.clientName}
              onChange={e => update('clientName', e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. Acme Corp"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Report Date</span>
            <input
              type="text"
              value={value.reportDate}
              onChange={e => update('reportDate', e.target.value)}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="e.g. 1 June 2026"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Website URL</span>
          <input
            type="text"
            value={value.websiteUrl}
            onChange={e => update('websiteUrl', e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="https://www.example.com"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-600">Logo URL <span className="text-slate-400">(optional — appears as text if left blank)</span></span>
          <input
            type="text"
            value={value.logoUrl}
            onChange={e => update('logoUrl', e.target.value)}
            className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="https://yourdomain.com/logo.png"
          />
        </label>

        {/* Color picker */}
        <div>
          <span className="text-xs font-medium text-slate-600">Primary Colour</span>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => update('primaryColor', c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  value.primaryColor === c ? 'border-slate-700 scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="color"
                value={value.primaryColor}
                onChange={e => update('primaryColor', e.target.value)}
                className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                title="Custom colour"
              />
              <input
                type="text"
                value={value.primaryColor}
                onChange={e => update('primaryColor', e.target.value)}
                className="w-24 text-xs border border-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview strip */}
      <div
        className="rounded-xl p-3 text-white text-sm font-semibold text-center"
        style={{ backgroundColor: value.primaryColor }}
      >
        {value.brandName} — SEO Report Preview
      </div>
    </div>
  );
}
