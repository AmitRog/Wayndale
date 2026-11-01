import React, {useId} from 'react';
import {C, LINE} from '../palette';

/**
 * "Hardy": the channel mascot. A teal bean with a yellow hard hat, drawn and rigged in code
 * so every pose/expression is consistent and free. Origin (0, 0) = between the feet on the
 * ground; up is negative y. Unscaled height ~ 430 px including the hat.
 *
 * All pose fields are plain numbers so they can be keyframed with track().
 */
export type MascotPose = {
  // whole body
  sx: number; // squash/stretch about the feet
  sy: number;
  lean: number; // degrees, about the feet (+ = lean forward when facing right)
  bob: number; // vertical offset of the upper body (px, + = down)
  // face
  turn: number; // -1..1 face features slide toward facing direction (3/4 view)
  lookX: number; // -1..1 pupils
  lookY: number;
  blink: number; // 0 open .. 1 closed (0.4 = half-lidded / smug)
  eyeOpen: number; // eye height multiplier (1.3 = wide / shocked)
  squint: number; // > 0.5 => squeezed "> <" eyes
  arcEyes: number; // > 0.5 => happy "^ ^" eyes
  browY: number; // -1 low .. 1 high
  browTilt: number; // -1 angry (inner ends down) .. 1 worried (inner ends up)
  browAsym: number; // raises the image-left brow (curious / skeptical)
  mouthOpen: number; // 0..1
  smile: number; // -1 frown .. 1 smile
  mouthW: number; // width multiplier
  tongue: number; // 0..1
  blush: number; // 0..1
  // arms: hand offset from shoulder; +x = outward from the body on that side, +y = down
  fx: number;
  fy: number;
  fb: number; // elbow bend -1..1
  bx: number;
  by: number;
  bb: number;
  fOpen: number; // 0 = fist/mitten, 1 = open hand (fingers spread) – front hand
  bOpen: number;
  // legs
  walk: number; // walk phase in radians (advance ~ 2*PI*steps)
  walkAmp: number; // 0..1
  stance: number; // extra foot spread (px)
  // hat
  hatLift: number;
  hatTilt: number;
};

export const BASE_POSE: MascotPose = {
  sx: 1,
  sy: 1,
  lean: 0,
  bob: 0,
  turn: 0.35,
  lookX: 0.3,
  lookY: 0,
  blink: 0,
  eyeOpen: 1,
  squint: 0,
  arcEyes: 0,
  browY: 0,
  browTilt: 0,
  browAsym: 0,
  mouthOpen: 0,
  smile: 0.35,
  mouthW: 1,
  tongue: 0,
  blush: 0.35,
  fx: 22,
  fy: 105,
  fb: 0.4,
  bx: 22,
  by: 105,
  bb: -0.4,
  fOpen: 0,
  bOpen: 0,
  walk: 0,
  walkAmp: 0,
  stance: 0,
  hatLift: 0,
  hatTilt: -7,
};

export const RIG = {
  shoulderF: {x: 100, y: -200},
  shoulderB: {x: -100, y: -200},
  hip: 44,
  hipY: -64,
  eyeY: -262,
  eyeDX: 41,
  mouthY: -194,
  hatY: -350,
  armLen: 140,
};

const BODY =
  'M0,-52 C72,-52 128,-82 128,-172 C128,-282 110,-372 0,-372 C-110,-372 -128,-282 -128,-172 C-128,-82 -72,-52 0,-52 Z';

type Pt = {x: number; y: number};

const noodle = (s: Pt, h: Pt, bend: number) => {
  const dx = h.x - s.x;
  const dy = h.y - s.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  // a fixed-length rubber hose bows out when the hand comes closer than the arm length
  const slack = len < RIG.armLen ? Math.sqrt(RIG.armLen * RIG.armLen - len * len) * 0.5 : 0;
  const bow = (slack + 14) * bend * 1.33;
  const c1 = {x: s.x + dx * 0.28 + nx * bow, y: s.y + dy * 0.28 + ny * bow};
  const c2 = {x: s.x + dx * 0.72 + nx * bow, y: s.y + dy * 0.72 + ny * bow};
  return `M${s.x},${s.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${h.x},${h.y}`;
};

/** Hand positions in rig-local coordinates (before facing / scale). */
export function localHands(p: MascotPose) {
  const sF = {x: RIG.shoulderF.x, y: RIG.shoulderF.y + p.bob};
  const sB = {x: RIG.shoulderB.x, y: RIG.shoulderB.y + p.bob};
  return {
    sF,
    sB,
    f: {x: sF.x + p.fx, y: sF.y + p.fy},
    b: {x: sB.x - p.bx, y: sB.y + p.by},
  };
}

/** World position of a hand ('f' | 'b' | 'mid') for a mascot placed at (x, y). */
export function handWorld(
  p: MascotPose,
  which: 'f' | 'b' | 'mid',
  at: {x: number; y: number},
  facing: 1 | -1 = 1,
  scale = 1,
) {
  const h = localHands(p);
  const q = which === 'f' ? h.f : which === 'b' ? h.b : {x: (h.f.x + h.b.x) / 2, y: (h.f.y + h.b.y) / 2};
  // same order as the SVG transform: scale(sx,sy) -> rotate(lean) -> scale(facing*scale, scale)
  let x = q.x * p.sx;
  let y = q.y * p.sy;
  const a = (p.lean * Math.PI) / 180;
  const xr = x * Math.cos(a) - y * Math.sin(a);
  const yr = x * Math.sin(a) + y * Math.cos(a);
  x = xr * facing * scale;
  y = yr * scale;
  return {x: at.x + x, y: at.y + y};
}

const Hand: React.FC<{at: Pt; from: Pt; open: number}> = ({at, from, open}) => {
  const ang = (Math.atan2(at.y - from.y, at.x - from.x) * 180) / Math.PI;
  const fingers = open > 0.5;
  return (
    <g transform={`translate(${at.x},${at.y}) rotate(${ang})`}>
      {fingers
        ? [-52, -18, 16, 50].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <rect x={2} y={-8.5} width={40} height={17} rx={8.5} fill={C.teal} stroke={C.ink} strokeWidth={6} />
            </g>
          ))
        : null}
      <circle cx={-4} cy={fingers ? -22 : -17} r={fingers ? 12 : 10} fill={C.teal} stroke={C.ink} strokeWidth={LINE.detail} />
      <circle r={fingers ? 23 : 21} fill={C.teal} stroke={C.ink} strokeWidth={LINE.detail} />
    </g>
  );
};

const Eye: React.FC<{
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  side: -1 | 1;
  p: MascotPose;
  id: string;
}> = ({cx, cy, rx, ry, side, p, id}) => {
  if (p.squint > 0.5) {
    const d = side < 0 ? 'M-15,-16 L13,0 L-15,16' : 'M15,-16 L-13,0 L15,16';
    return (
      <path
        d={d}
        transform={`translate(${cx},${cy})`}
        fill="none"
        stroke={C.ink}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (p.arcEyes > 0.5) {
    return (
      <path
        d={`M${cx - rx * 0.8},${cy + 6} Q${cx},${cy - ry * 0.9} ${cx + rx * 0.8},${cy + 6}`}
        fill="none"
        stroke={C.ink}
        strokeWidth={9}
        strokeLinecap="round"
      />
    );
  }
  const pr = Math.min(rx, ry) * 0.46;
  const px = cx + p.lookX * rx * 0.45;
  const py = cy + p.lookY * ry * 0.42;
  const lidY = cy - ry + p.blink * 2 * ry;
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.white} />
      <g clipPath={`url(#${id})`}>
        <circle cx={px} cy={py} r={pr} fill={C.ink} />
        <circle cx={px - pr * 0.35} cy={py - pr * 0.42} r={pr * 0.34} fill={C.white} />
        {p.blink > 0.01 ? (
          <>
            <rect x={cx - rx - 4} y={cy - ry - 4} width={rx * 2 + 8} height={lidY - (cy - ry) + 4} fill={C.teal} />
            <line x1={cx - rx - 4} y1={lidY} x2={cx + rx + 4} y2={lidY} stroke={C.ink} strokeWidth={7} />
          </>
        ) : null}
      </g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={C.ink} strokeWidth={LINE.detail} />
    </g>
  );
};

export const Mascot: React.FC<{
  pose: MascotPose;
  facing?: 1 | -1;
  scale?: number;
  /** SVG content held by the hands; drawn above the body, below the hands. */
  hold?: {node: React.ReactNode; at?: 'f' | 'b' | 'mid'; dx?: number; dy?: number; rot?: number};
}> = ({pose: p, facing = 1, scale = 1, hold}) => {
  const uid = useId().replace(/:/g, '');
  const h = localHands(p);
  const turnX = p.turn * 26;

  // legs
  const walkF = p.walk;
  const walkB = p.walk + Math.PI;
  const foot = (phase: number, side: 1 | -1) => ({
    x: side * (RIG.hip + p.stance) + Math.sin(phase) * 30 * p.walkAmp,
    y: -Math.max(0, Math.cos(phase)) * 22 * p.walkAmp,
  });
  const fF = foot(walkF, 1);
  const fB = foot(walkB, -1);
  const hipY = RIG.hipY + p.bob;

  // face
  const eyeRy = 39 * p.eyeOpen;
  const farShrink = 1 - 0.22 * Math.abs(p.turn);
  const eL = {cx: -RIG.eyeDX + turnX, rx: 31 * (p.turn > 0 ? farShrink : 1)};
  const eR = {cx: RIG.eyeDX + turnX, rx: 31 * (p.turn < 0 ? farShrink : 1)};
  const eyeY = RIG.eyeY + p.bob;
  const browBase = eyeY - 56 - (p.eyeOpen - 1) * 34 - p.browY * 15;
  const tilt = p.browTilt * 17;

  const mY = RIG.mouthY + p.bob;
  const mX = turnX * 1.1;
  const w = 34 * p.mouthW;
  const cy = mY - p.smile * 9;
  const tc = p.smile * 12;
  const open = Math.max(0, p.mouthOpen);
  const topCtrl = cy + 2 * tc * (open > 0.04 ? 0.6 : 1);
  const botCtrl = cy + 2 * (tc + open * 56);

  const hatY = RIG.hatY + p.bob - p.hatLift;

  const legPath = (hx: number, f: Pt) => `M${hx},${hipY} L${f.x},${f.y - 12}`;

  const holdPt = hold ? (hold.at === 'f' ? h.f : hold.at === 'b' ? h.b : {x: (h.f.x + h.b.x) / 2, y: (h.f.y + h.b.y) / 2}) : null;

  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`scale(${facing * scale},${scale}) rotate(${p.lean}) scale(${p.sx},${p.sy})`}>
        {/* legs + boots (behind body) */}
        {[
          {hx: -RIG.hip * 0.9, f: fB},
          {hx: RIG.hip * 0.9, f: fF},
        ].map(({hx, f}, i) => (
          <g key={i}>
            <path d={legPath(hx, f)} stroke={C.ink} strokeWidth={30} strokeLinecap="round" fill="none" />
            <path d={legPath(hx, f)} stroke={C.teal} strokeWidth={15} strokeLinecap="round" fill="none" />
            <ellipse cx={f.x + 9} cy={f.y - 13} rx={33} ry={17} fill={C.ink} />
            <ellipse cx={f.x + 1} cy={f.y - 19} rx={13} ry={5} fill="#3B4868" />
          </g>
        ))}

        {/* arms (behind body; hands are drawn on top later) */}
        {[
          {s: h.sB, e: h.b, bend: p.bb},
          {s: h.sF, e: h.f, bend: p.fb},
        ].map(({s, e, bend}, i) => (
          <g key={i}>
            <path d={noodle(s, e, bend)} stroke={C.ink} strokeWidth={32} strokeLinecap="round" fill="none" />
            <path d={noodle(s, e, bend)} stroke={C.teal} strokeWidth={16} strokeLinecap="round" fill="none" />
          </g>
        ))}

        {/* body */}
        <g transform={`translate(0,${p.bob})`}>
          <defs>
            <clipPath id={`body${uid}`}>
              <path d={BODY} />
            </clipPath>
          </defs>
          <g clipPath={`url(#body${uid})`}>
            <rect x={-140} y={-390} width={280} height={350} fill={C.tealShade} />
            <path d={BODY} fill={C.teal} transform="translate(-24,-10)" />
            <ellipse cx={10 + turnX * 0.6} cy={-150} rx={80} ry={66} fill={C.tealLight} opacity={0.85} />
          </g>
          <path d={BODY} fill="none" stroke={C.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
        </g>

        {/* cheeks */}
        {p.blush > 0.01 ? (
          <g opacity={0.5 * p.blush}>
            <ellipse cx={-66 + turnX} cy={eyeY + 44} rx={19} ry={10} fill={C.blush} />
            <ellipse cx={66 + turnX} cy={eyeY + 44} rx={19} ry={10} fill={C.blush} />
          </g>
        ) : null}

        {/* eyes */}
        <Eye cx={eL.cx} cy={eyeY} rx={eL.rx} ry={eyeRy} side={-1} p={p} id={`eL${uid}`} />
        <Eye cx={eR.cx} cy={eyeY} rx={eR.rx} ry={eyeRy} side={1} p={p} id={`eR${uid}`} />

        {/* brows */}
        <path
          d="M-24,0 Q0,-9 24,0"
          transform={`translate(${eL.cx},${browBase - p.browAsym * 14}) rotate(${-tilt})`}
          stroke={C.ink}
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M-24,0 Q0,-9 24,0"
          transform={`translate(${eR.cx},${browBase}) rotate(${tilt})`}
          stroke={C.ink}
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />

        {/* mouth */}
        {open <= 0.04 ? (
          <path
            d={`M${mX - w},${cy} Q${mX},${topCtrl} ${mX + w},${cy}`}
            stroke={C.ink}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <g>
            <defs>
              <clipPath id={`m${uid}`}>
                <path d={`M${mX - w},${cy} Q${mX},${topCtrl} ${mX + w},${cy} Q${mX},${botCtrl} ${mX - w},${cy} Z`} />
              </clipPath>
            </defs>
            <path
              d={`M${mX - w},${cy} Q${mX},${topCtrl} ${mX + w},${cy} Q${mX},${botCtrl} ${mX - w},${cy} Z`}
              fill={C.mouth}
            />
            {p.tongue > 0.01 ? (
              <g clipPath={`url(#m${uid})`}>
                <ellipse
                  cx={mX + w * 0.1}
                  cy={(cy + botCtrl) / 2 + open * 20}
                  rx={w * 0.62}
                  ry={10 + open * 16}
                  fill={C.tongue}
                  opacity={p.tongue}
                />
              </g>
            ) : null}
            <path
              d={`M${mX - w},${cy} Q${mX},${topCtrl} ${mX + w},${cy} Q${mX},${botCtrl} ${mX - w},${cy} Z`}
              fill="none"
              stroke={C.ink}
              strokeWidth={7}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* hard hat */}
        <g transform={`translate(${turnX * 0.35},${hatY}) rotate(${p.hatTilt})`}>
          <defs>
            <clipPath id={`hat${uid}`}>
              <path d="M-92,0 A92,84 0 0 1 92,0 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#hat${uid})`}>
            <rect x={-100} y={-100} width={200} height={110} fill={C.hatShade} />
            <path d="M-92,0 A92,84 0 0 1 92,0 Z" fill={C.hat} transform="translate(-16,-6)" />
          </g>
          <rect x={-16} y={-82} width={32} height={80} rx={12} fill={C.hatLight} stroke={C.ink} strokeWidth={6} />
          <path d="M-92,0 A92,84 0 0 1 92,0 Z" fill="none" stroke={C.ink} strokeWidth={LINE.main} strokeLinejoin="round" />
          <rect x={-120} y={-8} width={240} height={24} rx={12} fill={C.hat} stroke={C.ink} strokeWidth={LINE.main} />
          <rect x={-104} y={-2} width={70} height={7} rx={3.5} fill={C.hatLight} />
        </g>

        {/* held item, then hands on top */}
        {hold && holdPt ? (
          <g transform={`translate(${holdPt.x + (hold.dx ?? 0)},${holdPt.y + (hold.dy ?? 0)}) rotate(${hold.rot ?? 0})`}>
            {hold.node}
          </g>
        ) : null}
        <Hand at={h.b} from={h.sB} open={p.bOpen} />
        <Hand at={h.f} from={h.sF} open={p.fOpen} />
      </g>
    </svg>
  );
};
