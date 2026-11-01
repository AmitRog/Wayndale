import React from 'react';
import {C, FONT} from '../palette';
import {EASE, clamp} from '../math';

/** Pop-up "?" / "!" / any short text with a thick outline, wiggling while visible. */
export const Mark: React.FC<{
  t: number;
  t0: number;
  dur?: number;
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  rot?: number;
}> = ({t, t0, dur = 1.2, x, y, text, size = 120, color = C.yellow, rot = 8}) => {
  const age = t - t0;
  if (age < 0 || age > dur) return null;
  const sIn = EASE.outBack(clamp(age / 0.22));
  const sOut = age > dur - 0.18 ? 1 - EASE.in(clamp((age - (dur - 0.18)) / 0.18)) : 1;
  const wig = Math.sin(age * 9) * 6;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`translate(${x},${y}) rotate(${rot + wig}) scale(${sIn * sOut})`}>
        <text
          x={0}
          y={size * 0.36}
          textAnchor="middle"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={size}
          fill={color}
          stroke={C.ink}
          strokeWidth={size * 0.12}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {text}
        </text>
      </g>
    </svg>
  );
};

/** Sweat drop that pops on, slides down, pops off. (x, y) = start point near the head. */
export const SweatDrop: React.FC<{t: number; t0: number; x: number; y: number; dur?: number; scale?: number}> = ({
  t,
  t0,
  x,
  y,
  dur = 1.1,
  scale = 1,
}) => {
  const age = t - t0;
  if (age < 0 || age > dur) return null;
  const s = EASE.outBack(clamp(age / 0.2)) * (age > dur - 0.15 ? 1 - clamp((age - (dur - 0.15)) / 0.15) : 1);
  const slide = EASE.inOut(clamp(age / dur)) * 46;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`translate(${x},${y + slide}) scale(${s * scale})`}>
        <path d="M0,-30 C12,-12 20,0 20,10 C20,22 11,30 0,30 C-11,30 -20,22 -20,10 C-20,0 -12,-12 0,-30 Z" fill={C.sweat} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        <ellipse cx={-7} cy={8} rx={4} ry={7} fill={C.white} />
      </g>
    </svg>
  );
};

/** Motion lines trailing behind a moving object (direction = angle of travel, degrees). */
export const SpeedLines: React.FC<{x: number; y: number; dir: number; len?: number; opacity?: number; spread?: number}> = ({
  x,
  y,
  dir,
  len = 120,
  opacity = 1,
  spread = 60,
}) => {
  if (opacity <= 0.01) return null;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`translate(${x},${y}) rotate(${dir + 180})`} opacity={opacity}>
        {[-1, 0, 1].map((k) => (
          <line key={k} x1={40} y1={k * spread * 0.5} x2={40 + len * (k === 0 ? 1 : 0.7)} y2={k * spread * 0.5} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
};
