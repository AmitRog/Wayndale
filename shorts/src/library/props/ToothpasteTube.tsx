import React, {useId} from 'react';
import {C} from '../../engine';

/**
 * Toothpaste tube, side view, lying down: crimped end on the LEFT, cap on the RIGHT, centred on (0, 0).
 * ~600 x 190 px. The eye mark sits on the crimped end at MARK (local coords).
 * `eye` 0..1 opens a cartoon eye inside the mark (the "eye mark" gag); look* move the pupil.
 */
export const TUBE_MARK = {x: -230, y: -60, size: 46};

export const ToothpasteTube: React.FC<{
  mark?: string;
  eye?: number;
  lookX?: number;
  lookY?: number;
  cap?: string;
  band?: string;
  markScale?: number; // > 1 makes the mark "pop" (e.g. when it comes alive)
}> = ({mark = '#16181D', eye = 0, lookX = 0, lookY = 0, cap = C.red, band = C.blue, markScale = 1}) => {
  const id = useId().replace(/:/g, '');
  const body =
    'M-300,-95 C-100,-95 100,-80 150,-78 C185,-76 205,-55 205,-34 L205,34 C205,55 185,76 150,78 C100,80 -100,95 -300,95 Z';
  const m = TUBE_MARK;
  const h = m.size / 2;
  return (
    <g>
      <defs>
        <clipPath id={`tb${id}`}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* cap */}
      <rect x={196} y={-46} width={92} height={92} rx={12} fill={cap} stroke={C.ink} strokeWidth={9} />
      {[214, 232, 250, 268].map((x) => (
        <line key={x} x1={x} y1={-34} x2={x} y2={34} stroke={C.ink} strokeWidth={4} opacity={0.35} />
      ))}
      {/* body */}
      <g clipPath={`url(#tb${id})`}>
        <rect x={-310} y={-100} width={520} height={200} fill="#F5F8FC" />
        <rect x={-310} y={30} width={520} height={80} fill="#DCE4EE" />
        <path d="M-200,-34 C-120,-58 -40,-10 40,-30 C90,-42 120,-36 150,-40 L150,40 C110,30 60,52 0,36 C-80,16 -140,52 -200,34 Z" fill={band} />
        <path d="M-180,-6 C-110,-26 -40,14 30,-8 C80,-22 110,-14 140,-16" fill="none" stroke={C.white} strokeWidth={10} strokeLinecap="round" />
        {/* crimp band with ridges */}
        <rect x={-310} y={-100} width={46} height={200} fill="#E9EEF5" />
        {Array.from({length: 6}, (_, i) => (
          <line key={i} x1={-298 + i * 6.5} y1={-90} x2={-298 + i * 6.5} y2={90} stroke={C.ink} strokeWidth={2.5} opacity={0.35} />
        ))}
        <line x1={-264} y1={-100} x2={-264} y2={100} stroke={C.ink} strokeWidth={5} opacity={0.5} />
      </g>
      <path d={body} fill="none" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      {/* the eye mark */}
      <g transform={`translate(${m.x},${m.y}) scale(${markScale}) translate(${-m.x},${-m.y})`}>
      <rect x={m.x - h} y={m.y - h} width={m.size} height={m.size} rx={4} fill={mark} stroke={C.ink} strokeWidth={4} />
      {eye > 0.02 ? (
        <g>
          <ellipse cx={m.x} cy={m.y} rx={h * 0.72} ry={h * 0.72 * eye} fill={C.white} />
          <circle cx={m.x + lookX * 6} cy={m.y + lookY * 6 * eye} r={h * 0.34 * Math.min(1, eye * 1.4)} fill={C.ink} />
          <circle cx={m.x + lookX * 6 - 3} cy={m.y + lookY * 6 * eye - 4} r={2.6 * Math.min(1, eye * 1.4)} fill={C.white} />
        </g>
      ) : null}
      </g>
    </g>
  );
};

/**
 * Upright tube on the filling line (open end UP, cap down), front view, centred on (0, 0).
 * `spin` = rotation angle (rad) of the tube about its axis: the mark slides around the cylinder.
 * `crimp` 0..1 flattens the open top into a sealed, ridged seam; `trim` 0..1 hides the cut-off strip.
 * Drawn in blueprint style (white outlines) unless `real` is set.
 */
export const UprightTube: React.FC<{spin?: number; crimp?: number; mark?: string; markOutline?: string; real?: boolean}> = ({
  spin = 0,
  crimp = 0,
  mark = '#16181D',
  markOutline = C.white,
  real = false,
}) => {
  const id = useId().replace(/:/g, '');
  const line = real ? C.ink : C.bpLine;
  const fill = real ? '#F5F8FC' : 'rgba(255,255,255,0.88)';
  const W = 86; // half width at the top
  const top = -230 + crimp * 6;
  const body = `M${-W},${top} L${-W + 6},150 C${-W + 8},190 -40,205 -26,214 L26,214 C40,205 ${W - 8},190 ${W - 6},150 L${W},${top} Z`;
  // mark position on the cylinder
  const s = Math.sin(spin);
  const c = Math.cos(spin);
  const markW = 46 * Math.max(0, c);
  const markX = s * (W - 20);
  return (
    <g>
      <defs>
        <clipPath id={`ut${id}`}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill={fill} />
      <g clipPath={`url(#ut${id})`}>
        {/* turning stripes give a sense of spin */}
        {[0, 1, 2].map((k) => {
          const a = spin + (k * Math.PI * 2) / 3;
          if (Math.cos(a) <= 0) return null;
          const x = Math.sin(a) * (W - 6);
          return <rect key={k} x={x - 14 * Math.cos(a)} y={-60} width={28 * Math.cos(a)} height={170} fill={C.blue} opacity={0.75} />;
        })}
        {c > 0.05 ? (
          <rect x={markX - markW / 2} y={-205} width={markW} height={46} rx={3} fill={mark} stroke={markOutline} strokeWidth={3} />
        ) : null}
        {crimp > 0.01 ? (
          <g opacity={crimp}>
            <rect x={-W - 4} y={top - 4} width={2 * W + 8} height={38} fill={real ? '#E9EEF5' : 'rgba(255,255,255,0.95)'} />
            {Array.from({length: 13}, (_, i) => (
              <line key={i} x1={-W + 8 + i * 13} y1={top + 4} x2={-W + 8 + i * 13} y2={top + 30} stroke={real ? C.ink : C.bp} strokeWidth={3} opacity={0.6} />
            ))}
          </g>
        ) : null}
      </g>
      <path d={body} fill="none" stroke={line} strokeWidth={7} strokeLinejoin="round" />
      {/* open rim before crimping */}
      {crimp < 0.99 ? (
        <ellipse cx={0} cy={top} rx={W} ry={18 * (1 - crimp)} fill={real ? '#C9D3DE' : 'rgba(29,91,166,0.85)'} stroke={line} strokeWidth={6} />
      ) : null}
      {/* cap below */}
      <rect x={-34} y={212} width={68} height={56} rx={8} fill={real ? C.red : 'rgba(255,255,255,0.25)'} stroke={line} strokeWidth={6} />
    </g>
  );
};
