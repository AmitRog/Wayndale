import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, LINE} from './palette';
import {rng} from './math';

/** Screen-space sky gradient. */
export const Sky: React.FC<{top?: string; bottom?: string}> = ({top = C.sky, bottom = C.skyLow}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`}} />
);

/** Flat ground band in world space (place in the character's layer). */
export const Ground: React.FC<{y: number; x0?: number; x1?: number; color?: string; edge?: string; depth?: number}> = ({
  y,
  x0 = -2000,
  x1 = 4000,
  color = C.asphalt,
  edge = C.asphaltLight,
  depth = 2400,
}) => (
  <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <rect x={x0} y={y} width={x1 - x0} height={depth} fill={color} />
    <rect x={x0} y={y} width={x1 - x0} height={14} fill={edge} />
    <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.ink} strokeWidth={LINE.main} />
  </svg>
);

/** Procedural flat city skyline for far layers (world coords at its own depth). */
export const Skyline: React.FC<{y: number; x0: number; x1: number; seed?: number; color?: string; window?: string; minH?: number; maxH?: number}> = ({
  y,
  x0,
  x1,
  seed = 3,
  color = '#9FC3D9',
  window = '#C9E2F0',
  minH = 260,
  maxH = 900,
}) => {
  const r = rng(seed);
  const blocks: React.ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 160 + r() * 260;
    const h = minH + r() * (maxH - minH);
    blocks.push(<rect key={`b${i}`} x={x} y={y - h} width={w} height={h + 40} fill={color} />);
    const cols = Math.max(1, Math.floor(w / 70));
    const rows = Math.max(1, Math.floor(h / 110));
    for (let cx = 0; cx < cols; cx++)
      for (let ry = 0; ry < rows; ry++)
        if (r() > 0.35)
          blocks.push(<rect key={`w${i}-${cx}-${ry}`} x={x + 24 + cx * 70} y={y - h + 40 + ry * 110} width={30} height={50} rx={6} fill={window} />);
    x += w + 10 + r() * 40;
    i++;
  }
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {blocks}
    </svg>
  );
};

/** Puffy clouds (merged outline) drifting slowly. */
export const Clouds: React.FC<{t: number; items: {x: number; y: number; s: number}[]; speed?: number}> = ({t, items, speed = 12}) => (
  <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    {items.map((c, i) => {
      const parts = [
        [0, 0, 70],
        [70, 10, 55],
        [-70, 12, 50],
        [30, -40, 52],
        [-30, -30, 45],
      ];
      const ox = c.x + t * speed * (0.6 + 0.2 * i);
      return (
        <g key={i} transform={`translate(${ox},${c.y}) scale(${c.s})`}>
          {parts.map(([px, py, pr], j) => (
            <circle key={`o${j}`} cx={px} cy={py} r={pr + LINE.detail} fill={C.ink} />
          ))}
          {parts.map(([px, py, pr], j) => (
            <circle key={`f${j}`} cx={px} cy={py} r={pr} fill={C.white} />
          ))}
        </g>
      );
    })}
  </svg>
);
