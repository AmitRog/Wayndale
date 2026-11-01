import {MascotPose} from './Mascot';
import {rng} from '../math';

type P = Partial<MascotPose>;

/** Facial expressions (combine with an ARMS pose: {...EXPR.curious, ...ARMS.scratch}). */
export const EXPR = {
  neutral: {browY: 0, browTilt: 0, browAsym: 0, mouthOpen: 0, smile: 0.35, mouthW: 1, tongue: 0, eyeOpen: 1, squint: 0, arcEyes: 0, blink: 0},
  happy: {browY: 0.35, browTilt: 0, browAsym: 0, mouthOpen: 0.4, smile: 1, mouthW: 1.12, tongue: 0.7, eyeOpen: 1, squint: 0, arcEyes: 0, blink: 0},
  joy: {browY: 0.5, browTilt: 0, browAsym: 0, mouthOpen: 0.65, smile: 1, mouthW: 1.2, tongue: 0.8, eyeOpen: 1, squint: 0, arcEyes: 1, blink: 0},
  curious: {browY: 0.25, browTilt: 0.1, browAsym: 0.9, mouthOpen: 0.12, smile: 0, mouthW: 0.45, tongue: 0, eyeOpen: 1.05, squint: 0, arcEyes: 0, blink: 0},
  thinking: {browY: 0.1, browTilt: 0.2, browAsym: 0.8, mouthOpen: 0, smile: -0.25, mouthW: 0.6, tongue: 0, eyeOpen: 0.95, squint: 0, arcEyes: 0, blink: 0, lookY: -0.7, lookX: 0.5},
  surprised: {browY: 1, browTilt: 0.2, browAsym: 0, mouthOpen: 0.55, smile: 0, mouthW: 0.55, tongue: 0, eyeOpen: 1.28, squint: 0, arcEyes: 0, blink: 0},
  shocked: {browY: 1, browTilt: 0.6, browAsym: 0, mouthOpen: 1, smile: -0.5, mouthW: 1.15, tongue: 0.6, eyeOpen: 1.35, squint: 0, arcEyes: 0, blink: 0},
  scared: {browY: 0.6, browTilt: 1, browAsym: 0, mouthOpen: 0.35, smile: -0.9, mouthW: 1.2, tongue: 0, eyeOpen: 1.18, squint: 0, arcEyes: 0, blink: 0},
  worried: {browY: 0.25, browTilt: 0.85, browAsym: 0, mouthOpen: 0, smile: -0.55, mouthW: 0.85, tongue: 0, eyeOpen: 1, squint: 0, arcEyes: 0, blink: 0},
  smug: {browY: -0.15, browTilt: -0.15, browAsym: 0.6, mouthOpen: 0, smile: 0.9, mouthW: 0.85, tongue: 0, eyeOpen: 1, squint: 0, arcEyes: 0, blink: 0.42},
  proud: {browY: 0.2, browTilt: -0.1, browAsym: 0, mouthOpen: 0.3, smile: 1, mouthW: 1.05, tongue: 0.5, eyeOpen: 1, squint: 0, arcEyes: 1, blink: 0},
  angry: {browY: -0.6, browTilt: -1, browAsym: 0, mouthOpen: 0.15, smile: -0.7, mouthW: 0.9, tongue: 0, eyeOpen: 0.92, squint: 0, arcEyes: 0, blink: 0.15},
  wince: {browY: -0.2, browTilt: 0.7, browAsym: 0, mouthOpen: 0.4, smile: -0.4, mouthW: 1.2, tongue: 0, eyeOpen: 1, squint: 1, arcEyes: 0, blink: 0},
  deadpan: {browY: -0.1, browTilt: 0, browAsym: 0, mouthOpen: 0, smile: 0, mouthW: 0.8, tongue: 0, eyeOpen: 1, squint: 0, arcEyes: 0, blink: 0.5},
} satisfies Record<string, P>;

/** Arm poses (hand offsets from the shoulders; +x = outward). */
export const ARMS = {
  down: {fx: 22, fy: 105, fb: 0.4, bx: 22, by: 105, bb: -0.4, fOpen: 0, bOpen: 0},
  hips: {fx: -4, fy: 92, fb: -1, bx: -4, by: 92, bb: 1, fOpen: 0, bOpen: 0},
  shrug: {fx: 78, fy: -18, fb: 0.8, bx: 78, by: -18, bb: -0.8, fOpen: 1, bOpen: 1},
  cheer: {fx: 52, fy: -148, fb: 0.4, bx: 52, by: -148, bb: -0.4, fOpen: 1, bOpen: 1},
  wave: {fx: 58, fy: -130, fb: 0.5, bx: 22, by: 105, bb: -0.4, fOpen: 1, bOpen: 0},
  point: {fx: 138, fy: -46, fb: 0.15, bx: 20, by: 100, bb: -0.4, fOpen: 0, bOpen: 0},
  pointUp: {fx: 70, fy: -150, fb: 0.2, bx: 20, by: 100, bb: -0.4, fOpen: 0, bOpen: 0},
  scratch: {fx: 12, fy: -150, fb: 0.9, bx: 22, by: 100, bb: -0.4, fOpen: 0, bOpen: 0},
  chin: {fx: -62, fy: 10, fb: 1, bx: 0, by: 70, bb: 1, fOpen: 0, bOpen: 0},
  // two-handed hold in front of the chest (use Mascot hold={{at: 'mid'}})
  hold: {fx: 30, fy: 20, fb: 0.7, bx: -140, by: 20, bb: -0.2, fOpen: 0, bOpen: 0},
  holdHigh: {fx: 40, fy: -150, fb: 0.5, bx: -130, by: -150, bb: -0.3, fOpen: 0, bOpen: 0},
  holdOut: {fx: 120, fy: -10, fb: 0.4, bx: -70, by: -10, bb: -0.2, fOpen: 0, bOpen: 0},
  windup: {fx: -150, fy: -130, fb: -0.6, bx: 40, by: 40, bb: -0.4, fOpen: 0, bOpen: 0},
  release: {fx: 150, fy: -60, fb: 0.2, bx: -30, by: 70, bb: -0.4, fOpen: 1, bOpen: 0},
  oops: {fx: 60, fy: -60, fb: 0.6, bx: 60, by: -60, bb: -0.6, fOpen: 1, bOpen: 1},
  run: {fx: 40, fy: 40, fb: 1, bx: 40, by: 40, bb: -1, fOpen: 0, bOpen: 0},
} satisfies Record<string, P>;

/**
 * Secondary motion so the mascot never looks frozen: breathing, auto blinks and,
 * when walking, a body bob. Apply last: alive(t, pose).
 */
export function alive(t: number, p: MascotPose, opts: {seed?: number; breath?: number; blinks?: boolean} = {}) {
  const breath = (opts.breath ?? 1) * 0.012 * Math.sin(2 * Math.PI * 0.55 * t);
  let blink = 0;
  if (opts.blinks !== false) {
    const r = rng(opts.seed ?? 7);
    let tb = 0.8 + r() * 1.5;
    while (tb < t + 1) {
      const dt = t - tb;
      if (dt >= 0 && dt < 0.16) blink = Math.max(blink, Math.sin((Math.PI * dt) / 0.16));
      tb += 2.2 + r() * 2.4;
    }
  }
  const walkBob = p.walkAmp > 0 ? -7 * Math.abs(Math.sin(p.walk)) * p.walkAmp : 0;
  return {
    ...p,
    sy: p.sy * (1 + breath),
    sx: p.sx * (1 - breath * 0.5),
    blink: Math.max(p.blink, blink),
    bob: p.bob + walkBob,
  };
}

/** Walk phase for a walk starting at t0 with `stepsPerSec` steps per second. */
export const walkPhase = (t: number, t0: number, stepsPerSec = 2.4) =>
  Math.max(0, t - t0) * Math.PI * stepsPerSec;
