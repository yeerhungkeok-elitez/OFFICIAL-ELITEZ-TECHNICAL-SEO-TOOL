'use client';

import { useEffect, useState } from 'react';
import type { SEOScore } from '@/types/seo';

interface Props {
  score: SEOScore;
}

const CATEGORIES = [
  { key: 'crawlability',    label: 'Crawlability',      weight: '20%', icon: '🕷️' },
  { key: 'indexability',    label: 'Indexability',      weight: '20%', icon: '📑' },
  { key: 'onPageTechnical', label: 'On-page Technical', weight: '15%', icon: '🔍' },
  { key: 'structuredData',  label: 'Structured Data',   weight: '15%', icon: '📋' },
  { key: 'performance',     label: 'Performance (est.)',weight: '10%', icon: '⚡' },
  { key: 'internalLinking', label: 'Internal Linking',  weight: '10%', icon: '🔗' },
  { key: 'imageSEO',        label: 'Image SEO',         weight: '5%',  icon: '🖼️' },
  { key: 'socialOpenGraph', label: 'Social / Open Graph',weight:'5%',  icon: '📣' },
] as const;

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function getTextColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-lime-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-red-600';
}

function ScoreRow({
  icon, label, weight, score
}: { icon: string; label: string; weight: string; score: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-lg w-6 text-center flex-shrink-0">{icon}</span>
      <div className="w-36 flex-shrink-0">
        <p className="text-sm font-medium text-slate-700 leading-tight">{label}</p>
        <p className="text-xs text-slate-400">{weight} weight</p>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(score)}`}
          style={{
            width: `${width}%`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <span className={`w-14 text-right font-bold text-sm ${getTextColor(score)}`}>
        {score}/100
      </span>
    </div>
  );
}

export default function ScoreBreakdown({ score }: Props) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Score Breakdown</h2>
        <span className="text-xs text-slate-400">8 weighted categories</span>
      </div>
      <div className="card-body">
        {CATEGORIES.map(cat => (
          <ScoreRow
            key={cat.key}
            icon={cat.icon}
            label={cat.label}
            weight={cat.weight}
            score={score[cat.key as keyof SEOScore]}
          />
        ))}
      </div>
    </div>
  );
}
