import React from 'react';
import {C} from '../../engine';

/**
 * Toothpaste carton, centred on (0, 0), ~320 x 130. `side` 0 = front (brand band),
 * 1 = back panel with ingredient lines; `highlight` 0..1 sweeps a marker over the lines.
 */
export const ToothpasteBox: React.FC<{side?: number; highlight?: number}> = ({side = 0, highlight = 0}) => {
  const back = side > 0.5;
  return (
    <g>
      <rect x={-160} y={-65} width={320} height={130} rx={10} fill="#F5F8FC" stroke={C.ink} strokeWidth={8} />
      {!back ? (
        <>
          <path d="M-160,-10 C-90,-40 -20,20 60,-8 C110,-26 140,-18 160,-24 L160,40 C110,30 60,52 0,36 C-60,20 -120,48 -160,30 Z" fill={C.blue} />
          <path d="M-140,8 C-80,-12 -20,26 50,4 C100,-10 130,-4 150,-8" fill="none" stroke={C.white} strokeWidth={8} strokeLinecap="round" />
          <rect x={-150} y={-55} width={60} height={22} rx={6} fill={C.red} />
        </>
      ) : (
        <>
          <rect x={-148} y={-54} width={150} height={16} rx={6} fill={C.ink} opacity={0.85} />
          {Array.from({length: 5}, (_, i) => {
            const w = [270, 240, 285, 210, 250][i];
            const y = -28 + i * 17;
            return (
              <g key={i}>
                {highlight > 0 ? (
                  <rect x={-150} y={y - 7} width={(w + 6) * Math.max(0, Math.min(1, highlight * 5 - i))} height={14} rx={4} fill={C.yellow} opacity={0.8} />
                ) : null}
                <rect x={-147} y={y - 3} width={w} height={6} rx={3} fill={C.ink} opacity={0.55} />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
};
