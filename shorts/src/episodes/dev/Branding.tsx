import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ARMS, At, BASE_POSE, C, EXPR, FONT, Frame, Mascot} from '../../engine';

const Grid: React.FC<{w: number; h: number; step?: number}> = ({w, h, step = 64}) => {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= w; x += step) {
    const major = Math.round(x / step) % 5 === 0;
    lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={h} stroke={major ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'} strokeWidth={major ? 3 : 1.5} />);
  }
  for (let y = 0; y <= h; y += step) {
    const major = Math.round(y / step) % 5 === 0;
    lines.push(<line key={`y${y}`} x1={0} y1={y} x2={w} y2={y} stroke={major ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'} strokeWidth={major ? 3 : 1.5} />);
  }
  return (
    <svg width={w} height={h} style={{position: 'absolute'}}>
      {lines}
    </svg>
  );
};

/** 800x800 profile picture (YouTube/TikTok/Instagram crop it to a circle). */
export const Avatar: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, ${C.bp} 0%, ${C.bpDeep} 100%)`}} />
    <Grid w={800} h={800} step={50} />
    <At x={400} y={1010}>
      <Mascot pose={{...BASE_POSE, ...EXPR.happy, ...ARMS.wave, turn: 0.25, lookX: 0.1, lookY: 0.1}} scale={2.05} />
    </At>
  </Frame>
);

/** 2560x1440 channel banner; everything important inside the central 1546x423 safe area. */
export const Banner: React.FC = () => (
  <Frame>
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, ${C.bp} 0%, ${C.bpDeep} 100%)`}} />
    <Grid w={2560} h={1440} />
    <svg width={2560} height={1440} style={{position: 'absolute'}}>
      {/* dimension-line motif */}
      <g stroke={C.bpAccent} strokeWidth={6} strokeLinecap="round" opacity={0.9}>
        <line x1={1010} y1={850} x2={2010} y2={850} />
        <line x1={1010} y1={828} x2={1010} y2={872} />
        <line x1={2010} y1={828} x2={2010} y2={872} />
      </g>
      <text x={1510} y={705} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={150} fill={C.white} stroke={C.ink} strokeWidth={26} paintOrder="stroke" strokeLinejoin="round">
        Built This Way
      </text>
      <text x={1510} y={808} textAnchor="middle" fontFamily={FONT} fontWeight={500} fontSize={54} fill={C.bpAccent} stroke={C.bpDeep} strokeWidth={10} paintOrder="stroke">
        the hidden engineering behind everyday things
      </text>
    </svg>
    <At x={775} y={912}>
      <Mascot pose={{...BASE_POSE, ...EXPR.happy, ...ARMS.point, turn: 0.5, lookX: 0.8}} scale={0.92} />
    </At>
  </Frame>
);
