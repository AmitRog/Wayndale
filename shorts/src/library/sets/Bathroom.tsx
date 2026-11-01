import React from 'react';
import {C} from '../../engine';

/**
 * Bathroom: tiled wall, mirror, counter. World coords on the Z = 1000 plane.
 * Counter top surface at `counterY` (characters/props stand on it).
 */
export const Bathroom: React.FC<{counterY?: number; x0?: number; x1?: number}> = ({counterY = 1262, x0 = -800, x1 = 1900}) => {
  const tile = 120;
  const tiles: React.ReactNode[] = [];
  for (let x = x0 - (x0 % tile) - tile; x < x1; x += tile) {
    tiles.push(<line key={`v${x}`} x1={x} y1={-400} x2={x} y2={counterY} stroke="#EBCFB5" strokeWidth={5} />);
  }
  for (let y = counterY - tile; y > -400; y -= tile) {
    tiles.push(<line key={`h${y}`} x1={x0} y1={y} x2={x1} y2={y} stroke="#EBCFB5" strokeWidth={5} />);
  }
  return (
    <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
      <rect x={x0} y={-400} width={x1 - x0} height={counterY + 400} fill="#FCEBDD" />
      {tiles}
      {/* mirror */}
      <rect x={110} y={250} width={860} height={640} rx={36} fill="#CFE9F7" stroke={C.ink} strokeWidth={12} />
      <path d="M200,820 L470,330 M300,840 L560,370" stroke={C.white} strokeWidth={26} strokeLinecap="round" opacity={0.65} />
      <rect x={130} y={270} width={820} height={600} rx={26} fill="none" stroke="#9FC9E2" strokeWidth={6} />
      {/* counter */}
      <rect x={x0} y={counterY - 18} width={x1 - x0} height={46} fill="#F4F6FA" stroke={C.ink} strokeWidth={10} />
      <rect x={x0} y={counterY + 28} width={x1 - x0} height={900} fill="#C9D3DE" />
      <line x1={x0} y1={counterY + 28} x2={x1} y2={counterY + 28} stroke={C.ink} strokeWidth={8} />
      {Array.from({length: 8}, (_, i) => (
        <rect key={i} x={x0 + 140 + i * 330} y={counterY + 120} width={250} height={340} rx={18} fill="#B9C5D2" stroke="#A3B1C1" strokeWidth={6} />
      ))}
    </svg>
  );
};
