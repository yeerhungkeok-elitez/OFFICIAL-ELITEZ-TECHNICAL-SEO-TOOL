'use client';

import { useEffect, useState } from 'react';
import { getScoreLabel } from '@/lib/scoring';

interface Props {
  score: number;
  size?: number;
}

// Convert polar coordinates to Cartesian
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Describe SVG arc path
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function ScoreGauge({ score, size = 220 }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const { label, color } = getScoreLabel(score);
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r  = size * 0.38;
  const sw = size * 0.08; // stroke width

  // Arc: from -210° to 30° = 240° total sweep (nice open gauge)
  const startDeg =  -210;
  const endDeg   =    30;
  const totalDeg = endDeg - startDeg; // 240

  // Current angle based on animated score
  const currentDeg = startDeg + (animated / 100) * totalDeg;

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  // Gradient stops for the arc
  const gradientColors = [
    { offset: '0%',   color: '#ef4444' },
    { offset: '33%',  color: '#f97316' },
    { offset: '58%',  color: '#eab308' },
    { offset: '80%',  color: '#84cc16' },
    { offset: '100%', color: '#22c55e' },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.75}
        viewBox={`0 0 ${size} ${size * 0.75}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientColors.map(g => (
              <stop key={g.offset} offset={g.offset} stopColor={g.color} />
            ))}
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={arcPath(cx, cy, r, startDeg, endDeg)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* Coloured value arc */}
        <path
          d={arcPath(cx, cy, r, startDeg, animated <= 0 ? startDeg + 0.1 : currentDeg)}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={sw}
          strokeLinecap="round"
          style={{ transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Needle dot at current position */}
        {animated > 0 && (() => {
          const pt = polar(cx, cy, r, currentDeg);
          return (
            <circle
              cx={pt.x}
              cy={pt.y}
              r={sw * 0.7}
              fill={color}
              filter="url(#glow)"
              style={{ transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          );
        })()}

        {/* Tick labels */}
        {ticks.map(tick => {
          const deg = startDeg + (tick / 100) * totalDeg;
          const pt  = polar(cx, cy, r * 1.22, deg);
          return (
            <text
              key={tick}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.06}
              fill="#94a3b8"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
            >{tick}</text>
          );
        })}

        {/* Center: score number */}
        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="800"
          fill={color}
          fontFamily="Inter, sans-serif"
          style={{ transition: 'fill 0.5s ease' }}
        >
          {Math.round(animated)}
        </text>

        {/* Center: label */}
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          fontSize={size * 0.08}
          fontWeight="600"
          fill={color}
          fontFamily="Inter, sans-serif"
          style={{ transition: 'fill 0.5s ease' }}
        >
          {label}
        </text>

        {/* Centre: /100 */}
        <text
          x={cx}
          y={cy + size * 0.23}
          textAnchor="middle"
          fontSize={size * 0.065}
          fill="#94a3b8"
          fontFamily="Inter, sans-serif"
        >out of 100</text>
      </svg>
    </div>
  );
}
