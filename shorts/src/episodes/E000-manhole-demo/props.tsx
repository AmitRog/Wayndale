import React from 'react';
import {C} from '../../engine';

/** Square manhole cover, face-on, centred on (0, 0). */
export const SquareCover: React.FC<{size?: number}> = ({size = 190}) => {
  const h = size / 2;
  const n = 4;
  const cell = (size - 56) / n;
  return (
    <g>
      <rect x={-h} y={-h} width={size} height={size} rx={16} fill={C.metal} stroke={C.ink} strokeWidth={10} />
      <rect x={-h + 14} y={-h + 14} width={size - 28} height={size - 28} rx={9} fill={C.metalDark} opacity={0.3} />
      {Array.from({length: n * n}, (_, i) => (
        <rect
          key={i}
          x={-h + 28 + (i % n) * cell + 5}
          y={-h + 28 + Math.floor(i / n) * cell + 5}
          width={cell - 10}
          height={cell - 10}
          rx={5}
          fill={C.metalLight}
          stroke={C.ink}
          strokeWidth={4}
        />
      ))}
    </g>
  );
};

/** Round manhole cover, face-on, centred on (0, 0). */
export const RoundCover: React.FC<{r?: number}> = ({r = 160}) => (
  <g>
    <circle r={r} fill={C.metal} stroke={C.ink} strokeWidth={10} />
    <circle r={r - 20} fill="none" stroke={C.metalDark} strokeWidth={8} opacity={0.6} />
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return <circle key={i} cx={Math.cos(a) * (r - 52)} cy={Math.sin(a) * (r - 52)} r={13} fill={C.metalLight} stroke={C.ink} strokeWidth={4} />;
    })}
    {Array.from({length: 6}, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      return <circle key={`b${i}`} cx={Math.cos(a) * (r - 100)} cy={Math.sin(a) * (r - 100)} r={11} fill={C.metalLight} stroke={C.ink} strokeWidth={4} />;
    })}
    <circle r={30} fill={C.metalLight} stroke={C.ink} strokeWidth={5} />
  </g>
);

/** Superellipse outline path: n = 2 circle ... n -> large = square. */
export const superellipse = (a: number, n: number, cx = 0, cy = 0, steps = 96) => {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = a * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${i ? 'L' : 'M'}${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
};
