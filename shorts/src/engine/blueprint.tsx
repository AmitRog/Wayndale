import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from './palette';
import {EASE, clamp} from './math';

/**
 * BLUEPRINT MODE – the channel's signature "how it actually works" look: the world turns
 * into a technical drawing (white lines on blueprint blue) to explain the mechanism.
 */
export const BlueprintBG: React.FC<{t?: number}> = ({t = 0}) => {
  const step = 60;
  const lines: React.ReactNode[] = [];
  const drift = (t * 6) % step;
  for (let x = -step; x <= 1080 + step; x += step) {
    const major = Math.round(x / step) % 5 === 0;
    lines.push(<line key={`x${x}`} x1={x + drift} y1={0} x2={x + drift} y2={1920} stroke={major ? 'rgba(255,255,255,0.24)' : C.bpGrid} strokeWidth={major ? 3 : 1.5} />);
  }
  for (let y = -step; y <= 1920 + step; y += step) {
    const major = Math.round(y / step) % 5 === 0;
    lines.push(<line key={`y${y}`} x1={0} y1={y + drift} x2={1080} y2={y + drift} stroke={major ? 'rgba(255,255,255,0.24)' : C.bpGrid} strokeWidth={major ? 3 : 1.5} />);
  }
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, ${C.bp} 0%, ${C.bpDeep} 100%)`}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        {lines}
      </svg>
    </AbsoluteFill>
  );
};

/** Circular wipe: children are revealed from (x, y) between t0 and t0 + dur (reverse = hide). */
export const CircleWipe: React.FC<{
  t: number;
  t0: number;
  dur?: number;
  x?: number;
  y?: number;
  reverse?: boolean;
  children: React.ReactNode;
}> = ({t, t0, dur = 0.45, x = 540, y = 960, reverse = false, children}) => {
  let u = EASE.inOut(clamp((t - t0) / dur));
  if (reverse) u = 1 - u;
  if (u <= 0) return null;
  const r = u * 2300;
  return <AbsoluteFill style={{clipPath: u >= 1 ? undefined : `circle(${r}px at ${x}px ${y}px)`}}>{children}</AbsoluteFill>;
};

/** Ring drawn at the edge of a circle wipe so the transition reads as a "lens". */
export const WipeRing: React.FC<{t: number; t0: number; dur?: number; x?: number; y?: number; reverse?: boolean}> = ({
  t,
  t0,
  dur = 0.45,
  x = 540,
  y = 960,
  reverse = false,
}) => {
  let u = EASE.inOut(clamp((t - t0) / dur));
  if (reverse) u = 1 - u;
  if (u <= 0 || u >= 1) return null;
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <circle cx={x} cy={y} r={u * 2300} fill="none" stroke={C.ink} strokeWidth={18} />
        <circle cx={x} cy={y} r={u * 2300 - 14} fill="none" stroke={C.bpAccent} strokeWidth={8} />
      </svg>
    </AbsoluteFill>
  );
};

/** Line that draws itself from a to b with progress u (0..1). */
export const DrawLine: React.FC<{
  a: {x: number; y: number};
  b: {x: number; y: number};
  u: number;
  color?: string;
  width?: number;
  dash?: string;
}> = ({a, b, u, color = C.bpLine, width = 7, dash}) => {
  if (u <= 0) return null;
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={a.x + (b.x - a.x) * clamp(u)}
      y2={a.y + (b.y - a.y) * clamp(u)}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={dash}
    />
  );
};

/** Dimension line with end ticks and a label in the middle (blueprint style). */
export const Dim: React.FC<{
  a: {x: number; y: number};
  b: {x: number; y: number};
  u: number;
  label?: string;
  color?: string;
  labelColor?: string;
  offset?: number; // label offset perpendicular to the line
  size?: number;
}> = ({a, b, u, label, color = C.bpAccent, labelColor = C.bpAccent, offset = -46, size = 52}) => {
  if (u <= 0) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const flip = ang > 90 || ang < -90 ? 180 : 0;
  const mid = {x: (a.x + b.x) / 2 + nx * offset, y: (a.y + b.y) / 2 + ny * offset};
  const lu = EASE.outBack(clamp((u - 0.6) / 0.4));
  const tick = (p: {x: number; y: number}) => (
    <line x1={p.x - nx * 22} y1={p.y - ny * 22} x2={p.x + nx * 22} y2={p.y + ny * 22} stroke={color} strokeWidth={6} strokeLinecap="round" />
  );
  return (
    <g>
      {tick(a)}
      <DrawLine a={a} b={b} u={clamp(u / 0.6)} color={color} width={6} />
      {u >= 0.6 ? tick(b) : null}
      {label && lu > 0 ? (
        <text
          transform={`translate(${mid.x},${mid.y}) rotate(${ang + flip}) scale(${lu})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={size}
          fill={labelColor}
          stroke={C.bpDeep}
          strokeWidth={10}
          paintOrder="stroke"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** Big blueprint title / label text. */
export const BpText: React.FC<{x: number; y: number; text: string; size?: number; u?: number; color?: string; anchor?: 'start' | 'middle' | 'end'}> = ({
  x,
  y,
  text,
  size = 64,
  u = 1,
  color = C.bpLine,
  anchor = 'middle',
}) => {
  if (u <= 0) return null;
  const s = EASE.outBack(clamp(u));
  return (
    <text
      transform={`translate(${x},${y}) scale(${s})`}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily={FONT}
      fontWeight={700}
      fontSize={size}
      fill={color}
      stroke={C.bpDeep}
      strokeWidth={size * 0.16}
      paintOrder="stroke"
      letterSpacing={2}
    >
      {text}
    </text>
  );
};
