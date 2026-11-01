import React from 'react';
import {C, LINE} from '../palette';
import {EASE, clamp} from '../math';

/** Impact star (spiky) + radiating lines; pops in with overshoot then shrinks away. */
export const Burst: React.FC<{t: number; t0: number; x: number; y: number; size?: number; life?: number; fill?: string; points?: number}> = ({
  t,
  t0,
  x,
  y,
  size = 90,
  life = 0.45,
  fill = C.yellow,
  points = 10,
}) => {
  const age = t - t0;
  if (age < 0 || age > life) return null;
  const u = age / life;
  const s = EASE.outBack(clamp(u / 0.35)) * (u > 0.55 ? 1 - EASE.in(clamp((u - 0.55) / 0.45)) : 1);
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + 0.2;
    const rr = (i % 2 === 0 ? 1 : 0.5) * size * s;
    pts.push(`${Math.cos(a) * rr},${Math.sin(a) * rr}`);
  }
  const lines = Array.from({length: 8}, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const r1 = size * (1.05 + u * 0.9);
    const r2 = size * (1.35 + u * 1.1);
    return {x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * r2, y2: Math.sin(a) * r2};
  });
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`translate(${x},${y})`}>
        {lines.map((l, i) => (
          <line key={i} {...l} stroke={C.ink} strokeWidth={LINE.detail} strokeLinecap="round" opacity={1 - u} />
        ))}
        <polygon points={pts.join(' ')} fill={fill} stroke={C.ink} strokeWidth={LINE.detail} strokeLinejoin="round" />
      </g>
    </svg>
  );
};
