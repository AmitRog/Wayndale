// Small, dependency-free animation math used by every episode.
// Times are in SECONDS (use useTime()), positions in world pixels.

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const invLerp = (a: number, b: number, v: number) =>
  a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, invLerp(a, b, v));

export type Ease =
  | 'linear'
  | 'in'
  | 'out'
  | 'inOut'
  | 'inOutSine'
  | 'outQuint'
  | 'outBack'
  | 'inBack'
  | 'outElastic'
  | 'hold';

export const EASE: Record<Ease, (u: number) => number> = {
  linear: (u) => u,
  in: (u) => u * u * u,
  out: (u) => 1 - (1 - u) ** 3,
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  inOutSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
  outQuint: (u) => 1 - (1 - u) ** 5,
  outBack: (u) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
  },
  inBack: (u) => {
    const c1 = 1.70158;
    return (c1 + 1) * u * u * u - c1 * u * u;
  },
  outElastic: (u) =>
    u <= 0 ? 0 : u >= 1 ? 1 : 2 ** (-10 * u) * Math.sin(((u * 10 - 0.75) * (2 * Math.PI)) / 3) + 1,
  hold: (u) => (u < 1 ? 0 : 1),
};

/** Eased 0..1 progress of time t through [t0, t0 + dur]. */
export const prog = (t: number, t0: number, dur: number, e: Ease = 'inOut') =>
  EASE[e](invLerp(t0, t0 + Math.max(1e-6, dur), t));

/** Bell 0 -> 1 -> 0 over [t0, t0 + dur] (sine), handy for one-off pulses. */
export const pulse = (t: number, t0: number, dur: number) =>
  t < t0 || t > t0 + dur ? 0 : Math.sin((Math.PI * (t - t0)) / dur);

export type Key = {t: number; v: number; e?: Ease};

/** Keyframed scalar. `e` on a key = easing used to ARRIVE at that key. Holds outside the range. */
export function kf(t: number, keys: Key[]): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.t) {
      const p = keys[i - 1];
      const u = clamp((t - p.t) / Math.max(1e-6, k.t - p.t));
      return lerp(p.v, k.v, EASE[k.e ?? 'inOut'](u));
    }
  }
  return keys[keys.length - 1].v;
}

export type NumRecord = Record<string, number>;
export type TrackKey<P extends NumRecord> = {
  t: number; // when the change starts
  p: Partial<P>; // fields that change (others carry over)
  d?: number; // blend duration (s), default 0.25
  e?: Ease; // blend easing, default inOut
};

/**
 * Pose/parameter track: each key changes some fields, blending from whatever the value
 * actually was at the key time (so overlapping keys never pop).
 */
export function track<P extends NumRecord>(t: number, base: P, keys: TrackKey<P>[]): P {
  if (keys.length === 0) return base;
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  let start: P = {...base}; // actual value when segment i begins
  let target: P = {...base, ...sorted[0].p} as P;
  if (t < sorted[0].t) return base;
  for (let i = 0; i < sorted.length; i++) {
    const k = sorted[i];
    const d = k.d ?? 0.25;
    const next = sorted[i + 1];
    const segEnd = next ? next.t : Infinity;
    const blendAt = (time: number): P => {
      const u = d <= 0 ? 1 : EASE[k.e ?? 'inOut'](clamp((time - k.t) / d));
      const out = {} as NumRecord;
      for (const key of Object.keys(target)) out[key] = lerp(start[key] ?? target[key], target[key], u);
      return out as P;
    };
    if (t < segEnd) return blendAt(t);
    // advance to next segment
    const actual = blendAt(next.t);
    start = actual;
    target = {...target, ...next.p} as P;
  }
  return target;
}

/** Damped oscillation offset after an event at t0 (0 before t0). */
export function springOffset(t: number, t0: number, amp: number, freq = 3, zeta = 0.32) {
  const dt = t - t0;
  if (dt < 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return amp * Math.exp(-zeta * w * dt) * Math.cos(wd * dt);
}

/**
 * Squash & stretch from a list of impulses. amt > 0 stretches (taller), amt < 0 squashes.
 * Returns {sx, sy} multipliers that preserve volume.
 */
export function squash(t: number, events: {t: number; amt: number; freq?: number}[]) {
  let s = 0;
  for (const ev of events) s += springOffset(t, ev.t, ev.amt, ev.freq ?? 3.2, 0.3);
  const sy = 1 + s;
  return {sx: 1 / Math.sqrt(Math.max(0.2, sy)), sy};
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ballistic arc between two points: y follows gravity with the apex at fraction `apex`
 * of the flight (0.5 = symmetric, later = lower arc). x moves at constant speed.
 * Returns position at time t (clamped to [t0, t0 + dur]).
 */
export function arc(
  t: number,
  t0: number,
  dur: number,
  from: {x: number; y: number},
  to: {x: number; y: number},
  apex = 0.5,
) {
  const tau = clamp(t - t0, 0, dur);
  const ta = apex * dur;
  const denom = ta * ta - (dur - ta) * (dur - ta);
  const x = lerp(from.x, to.x, tau / dur);
  if (Math.abs(denom) < 1e-6) {
    // symmetric case with equal heights: pick a nice default height
    const h = 0.35 * Math.abs(to.x - from.x) + 120;
    const u = tau / dur;
    return {x, y: lerp(from.y, to.y, u) - 4 * h * u * (1 - u)};
  }
  const g = (2 * (from.y - to.y)) / denom;
  const ya = from.y - 0.5 * g * ta * ta;
  return {x, y: ya + 0.5 * g * (tau - ta) * (tau - ta)};
}

/** Free fall from rest (or with initial vy) under gravity g (px/s^2). */
export const fall = (t: number, t0: number, y0: number, g = 4200, vy0 = 0) => {
  const dt = Math.max(0, t - t0);
  return y0 + vy0 * dt + 0.5 * g * dt * dt;
};

/** Screen shake: sums of sines under decaying envelopes. Never random per-frame jitter. */
export function shake(t: number, events: {t: number; amp: number; decay?: number}[]) {
  let x = 0;
  let y = 0;
  let r = 0;
  for (const ev of events) {
    const dt = t - ev.t;
    if (dt < 0) continue;
    const env = ev.amp * Math.exp(-dt * (ev.decay ?? 7));
    if (env < 0.05) continue;
    x += env * (Math.sin(2 * Math.PI * 13.3 * dt) + 0.5 * Math.sin(2 * Math.PI * 7.1 * dt + 1.3));
    y += env * (Math.sin(2 * Math.PI * 11.7 * dt + 0.7) + 0.5 * Math.sin(2 * Math.PI * 5.3 * dt + 2.1));
    r += env * 0.02 * Math.sin(2 * Math.PI * 9.1 * dt + 0.4);
  }
  return {x, y, r};
}
