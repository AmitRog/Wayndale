import React from 'react';
import {C, LINE} from '../palette';
import {EASE, clamp, rng} from '../math';

/**
 * Cartoon smoke / steam / dust: clusters of circles sharing ONE merged outline
 * (all ink circles first, then all fill circles). Puffs grow, drift, then SHRINK away.
 */
export const Puffs: React.FC<{
  t: number;
  t0: number; // first puff
  x: number;
  y: number;
  count?: number;
  every?: number; // seconds between puffs
  life?: number;
  r?: [number, number];
  spread?: number;
  vx?: number;
  vy?: number; // px/s (negative = up)
  fill?: string;
  outline?: string;
  seed?: number;
}> = ({t, t0, x, y, count = 6, every = 0.05, life = 0.9, r = [28, 54], spread = 70, vx = 0, vy = -160, fill = C.white, outline = C.ink, seed = 1}) => {
  const rand = rng(seed);
  const puffs: {cx: number; cy: number; rr: number}[] = [];
  for (let i = 0; i < count; i++) {
    const born = t0 + i * every + rand() * every;
    const ang = rand() * Math.PI * 2;
    const dist = rand() * spread;
    const rad = r[0] + rand() * (r[1] - r[0]);
    const sv = 0.6 + rand() * 0.8;
    const age = t - born;
    if (age < 0 || age > life) continue;
    const u = age / life;
    const grow = EASE.outBack(clamp(u / 0.3));
    const shrink = u > 0.6 ? 1 - EASE.in(clamp((u - 0.6) / 0.4)) : 1;
    puffs.push({
      cx: x + Math.cos(ang) * dist * (0.4 + u) + vx * age * sv,
      cy: y + Math.sin(ang) * dist * 0.5 * (0.4 + u) + vy * age * sv,
      rr: rad * grow * shrink,
    });
  }
  if (puffs.length === 0) return null;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {puffs.map((p, i) => (
        <circle key={`o${i}`} cx={p.cx} cy={p.cy} r={p.rr + LINE.detail} fill={outline} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`f${i}`} cx={p.cx} cy={p.cy} r={p.rr} fill={fill} />
      ))}
    </svg>
  );
};
