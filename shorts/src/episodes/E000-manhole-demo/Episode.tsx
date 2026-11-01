/**
 * E000 – DEMO: "Why are manhole covers round?"
 * Engine showcase: rigged mascot, multiplane camera, physics, blueprint mode, captions, SFX.
 * Uses ESTIMATED word timings (tools/est_words.py) until a real voice exists – every beat is
 * anchored to a word, so swapping in ElevenLabs timings re-times the whole animation.
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  ARMS,
  At,
  BASE_POSE,
  BlueprintBG,
  BpText,
  Burst,
  C,
  Captions,
  CircleWipe,
  Clouds,
  Cue,
  Dim,
  EXPR,
  Frame,
  Ground,
  Layer,
  Mark,
  Mascot,
  MascotPose,
  Puffs,
  Scene,
  Shadow,
  Skyline,
  Sky,
  Sound,
  SpeedLines,
  SweatDrop,
  Word,
  WipeRing,
  alive,
  camAt,
  clamp,
  fall,
  handWorld,
  lerp,
  offsetWords,
  prog,
  shake,
  springOffset,
  toScreen,
  track,
  useTime,
  walkPhase,
  wordClock,
  zoomZ,
  EASE,
} from '../../engine';
import rawWords from './words.json';
import {RoundCover, SquareCover, superellipse} from './props';

const VO_AT = 0.1;
const words: Word[] = offsetWords(rawWords as Word[], VO_AT);
const W = wordClock(words);
export const DURATION = words[words.length - 1].e + 0.9;

// ---- world layout (Z = 1000 plane, 1080x1920 screen coords at zoom 1) ----
const S = 1.15; // mascot scale
const MX = 470; // mascot feet
const MY = 1335;
const HX = 735; // manhole
const HY = 1415;
const HRX = 176;
const HRY = 44;
const HORIZON = 1175;
const SQ = 190; // square cover size (rig units)
const RR = 158; // round cover radius (rig units)

// ---- beats (all anchored to words) ----
const T = {
  q: 0.35,
  lift: W('square') - 0.12,
  turn: W('edge'),
  drop: W('slips') - 0.08,
  bp: W('square', 2) - 0.3,
  corner: W('corner'),
  side: W('side'),
  fallA: W('side', 2) + 0.15,
  circle: W('circle') - 0.12,
  same: W('same'),
  back: W('so') - 0.3,
  drop2: W('never') - 0.08,
  bonus: W('bonus'),
  roll: W('roll') - 0.25,
};
const RUN = T.roll + 0.35;

// one-handed dangle over the hole (front hand holds the cover's top edge)
const DANGLE = {fx: 92, fy: -66, fb: 0.35, bx: 22, by: 100, bb: -0.4, fOpen: 0, bOpen: 0};
const CHEST_OFF = {x: -45, y: 20};
const DANGLE_OFF = {x: 0, y: SQ / 2 + 18};
const DANGLE_OFF_R = {x: 0, y: RR + 18};

const poseAt = (t: number): MascotPose =>
  track(t, {...BASE_POSE, ...EXPR.curious, ...ARMS.hold}, [
    {t: T.lift, p: {...EXPR.smug, ...DANGLE}, d: 0.35, e: 'outBack'},
    {t: T.turn, p: {...EXPR.thinking, lookX: 0.9, lookY: 0.5}, d: 0.2},
    {t: T.drop + 0.04, p: {...EXPR.surprised, ...ARMS.oops, lookX: 0.8, lookY: 1}, d: 0.12, e: 'out'},
    {t: T.drop + 0.4, p: {...EXPR.shocked, lookX: 0.8, lookY: 1}, d: 0.1},
    {t: T.back - 0.2, p: {...EXPR.smug, ...DANGLE, lookX: 0.6, lookY: 0.3}, d: 0},
    {t: T.drop2, p: {...EXPR.surprised, ...ARMS.oops, lookY: 1}, d: 0.12},
    {t: T.drop2 + 0.5, p: {...EXPR.joy, ...ARMS.cheer}, d: 0.25, e: 'outBack'},
    {t: T.bonus + 0.3, p: {...EXPR.surprised, ...ARMS.oops, lookX: 1}, d: 0.12},
    {t: RUN, p: {...EXPR.happy, ...ARMS.run, lean: 9, lookX: 1}, d: 0.2},
  ]);

const runX = (t: number) => {
  const dt = Math.max(0, t - RUN);
  return MX + 470 * dt - 120 * (1 - Math.exp(-dt / 0.25));
};

// where the held cover is (world) for a given pose/time
const heldCover = (t: number, p: MascotPose, offFrom: {x: number; y: number}, offTo: {x: number; y: number}, liftT: number) => {
  const hand = handWorld(p, 'f', {x: MX, y: MY}, 1, S);
  const u = EASE.outBack(clamp((t - liftT) / 0.35));
  return {x: hand.x + lerp(offFrom.x, offTo.x, u) * S, y: hand.y + lerp(offFrom.y, offTo.y, u) * S};
};

// square cover release point (frozen at drop time)
const SQ_REL = heldCover(T.drop, poseAt(T.drop), CHEST_OFF, DANGLE_OFF, T.lift);
// round cover: dangled from the start of the second street section
const RC_REL = heldCover(T.drop2, poseAt(T.drop2), DANGLE_OFF_R, DANGLE_OFF_R, 0);
const RC_G = 3800;
const RC_LAND_Y = HY + 6 - RR * S; // centre y when the bottom touches the hole
const RC_CONTACT = T.drop2 + Math.sqrt((2 * Math.max(1, RC_LAND_Y - RC_REL.y)) / RC_G);
const RC_FLAT = 0.26; // squash factor when lying flat (seen at an angle)

const roundCoverState = (t: number) => {
  if (t < T.drop2) return null; // still held
  if (t < RC_CONTACT) {
    return {x: lerp(RC_REL.x, HX, prog(t, T.drop2, RC_CONTACT - T.drop2, 'out')), y: fall(t, T.drop2, RC_REL.y, RC_G), sy: 1, rot: 0};
  }
  const flop = prog(t, RC_CONTACT, 0.14, 'in');
  const bounce = springOffset(t, RC_CONTACT + 0.14, 0.18, 4, 0.35);
  let sy = lerp(1, RC_FLAT, flop) * (1 + bounce);
  let y = lerp(RC_LAND_Y, HY - 4, flop);
  let x = HX;
  let rot = 0;
  if (t > T.bonus + 0.05) {
    const up = EASE.outBack(clamp((t - T.bonus - 0.05) / 0.28));
    sy = lerp(RC_FLAT, 1, up);
    y = lerp(HY - 4, HY + 8 - RR * S, up);
  }
  if (t > T.roll) {
    const dt = t - T.roll;
    const dx = 330 * dt + 260 * dt * dt;
    x = HX + dx;
    rot = (dx / (RR * S)) * (180 / Math.PI);
    y += -Math.abs(Math.sin(dt * 9)) * 6;
  }
  return {x, y, sy, rot};
};

const camKeys = [
  {t: 0, x: 560, y: 1080, z: zoomZ(1.0)},
  {t: T.lift, x: 575, y: 1100, z: zoomZ(1.07)},
  {t: T.drop - 0.05, x: 600, y: 1120, z: zoomZ(1.1)},
  {t: T.drop + 0.4, x: 630, y: 1160, z: zoomZ(1.22), e: 'out' as const},
  {t: T.drop + 1.4, x: 628, y: 1158, z: zoomZ(1.25)},
  {t: T.back - 0.25, x: 600, y: 1130, z: zoomZ(1.12), e: 'hold' as const},
  {t: T.drop2 + 0.6, x: 620, y: 1150, z: zoomZ(1.16)},
  {t: T.roll, x: 640, y: 1130, z: zoomZ(1.05)},
];

const cues = (): Cue[] => [
  {src: 'sfx/pop.wav', at: T.q, db: -16},
  {src: 'sfx/swish.wav', at: T.lift, db: -22},
  {src: 'sfx/scrape.wav', at: T.turn, db: -30},
  {src: 'sfx/fall_whistle.wav', at: T.drop, db: -20},
  {src: 'sfx/clang_far.wav', at: T.drop + 0.95, db: -12},
  {src: 'sfx/whoosh.wav', at: T.bp - 0.05, db: -20},
  {src: 'sfx/click.wav', at: T.bp + 0.25, db: -24},
  {src: 'sfx/click.wav', at: T.corner, db: -24},
  {src: 'sfx/click.wav', at: T.side, db: -24},
  {src: 'sfx/fall_whistle.wav', at: T.fallA, db: -24, dur: 0.6},
  {src: 'sfx/sparkle.wav', at: T.circle, db: -24},
  {src: 'sfx/thud.wav', at: W('never') + 0.05, db: -20},
  {src: 'sfx/whoosh.wav', at: T.back - 0.05, db: -22},
  {src: 'sfx/clang.wav', at: RC_CONTACT, db: -12},
  {src: 'sfx/thud.wav', at: RC_CONTACT + 0.14, db: -14},
  {src: 'sfx/ding.wav', at: T.drop2 + 0.55, db: -20},
  {src: 'sfx/boing.wav', at: T.bonus + 0.05, db: -18},
  {src: 'sfx/roll.wav', at: T.roll, db: -18},
  ...Array.from({length: 8}, (_, i) => ({src: 'sfx/step.wav', at: RUN + 0.1 + i * 0.21, db: -26})),
];

// ---------------------------------------------------------------------------------------

const Street: React.FC<{t: number}> = ({t}) => {
  const p0 = poseAt(t);
  const running = t > RUN;
  const mx = running ? runX(t) : MX;
  const pose = alive(t, {...p0, walk: walkPhase(t, RUN, 3.4), walkAmp: running ? 1 : 0}, {seed: 11});
  const sh = shake(t, [
    {t: T.drop + 0.95, amp: 7, decay: 6},
    {t: RC_CONTACT, amp: 16, decay: 7},
  ]);
  const cam = camAt(t, camKeys);
  if (t > T.roll) {
    // follow the mascot (the cover is allowed to roll out of frame)
    cam.x = lerp(cam.x, Math.max(cam.x, mx + 230), prog(t, T.roll, 0.6));
  }
  cam.x += sh.x;
  cam.y += sh.y;
  cam.r = sh.r;

  // held covers
  const squareHeld = t < T.drop;
  const sqRot = 45 * prog(t, T.turn, 0.45, 'inOut') + Math.sin(t * 7) * 2 * prog(t, T.turn, 0.2);
  const sqFallY = fall(t, T.drop, SQ_REL.y, 3600);
  const sqFallX = lerp(SQ_REL.x, HX, prog(t, T.drop, 0.25, 'out'));
  const roundHeld = t >= T.back - 0.2 && t < T.drop2;
  const rc = roundCoverState(t);
  const heldU = EASE.outBack(clamp((t - T.lift) / 0.35));
  const holdOff = {x: lerp(CHEST_OFF.x, DANGLE_OFF.x, heldU), y: lerp(CHEST_OFF.y, DANGLE_OFF.y, heldU)};
  const jump = -70 * Math.max(0, Math.sin(Math.PI * clamp((t - (T.drop2 + 0.5)) / 0.38)));

  return (
    <Scene cam={cam}>
      <Sky />
      <Layer z={4200}>
        <Clouds t={t} items={[{x: -900, y: -1500, s: 3.2}, {x: 900, y: -1900, s: 2.6}, {x: 2600, y: -1400, s: 3}]} />
      </Layer>
      <Layer z={2600}>
        <Skyline y={1520} x0={-1600} x1={5200} seed={4} />
      </Layer>
      <Layer z={1000}>
        {/* sidewalk + street */}
        <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
          <rect x={-2000} y={HORIZON - 70} width={7000} height={80} fill="#C9CED8" />
          <line x1={-2000} y1={HORIZON - 70} x2={5000} y2={HORIZON - 70} stroke={C.ink} strokeWidth={8} />
        </svg>
        <Ground y={HORIZON} />
        <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
          {Array.from({length: 14}, (_, i) => (
            <rect key={i} x={-600 + i * 420} y={1660} width={220} height={26} rx={13} fill="#E9ECF2" opacity={0.85} />
          ))}
          {/* the manhole */}
          <ellipse cx={HX} cy={HY} rx={HRX + 20} ry={HRY + 10} fill={C.asphaltDark} stroke={C.ink} strokeWidth={8} />
          <ellipse cx={HX} cy={HY + 3} rx={HRX} ry={HRY} fill={C.hole} />
          <path d={`M${HX - HRX + 14},${HY - 6} Q${HX},${HY - HRY - 8} ${HX + HRX - 14},${HY - 6}`} stroke="#3A4152" strokeWidth={10} fill="none" />
        </svg>

        {/* falling square cover, clipped to "above ground or inside the opening" */}
        {t >= T.drop && t < T.bp + 0.5 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 6000,
              height: 4000,
              clipPath: `path(nonzero, 'M0 0 H6000 V${HY} H0 Z M${HX - HRX} ${HY + 3} A${HRX} ${HRY} 0 1 1 ${HX + HRX} ${HY + 3} A${HRX} ${HRY} 0 1 1 ${HX - HRX} ${HY + 3} Z')`,
            }}
          >
            <At x={sqFallX} y={sqFallY} rot={45} sx={S} sy={S}>
              <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
                <SquareCover size={SQ} />
              </svg>
            </At>
          </div>
        ) : null}
        <Puffs t={t} t0={T.drop + 1.0} x={HX} y={HY - 10} count={7} fill="#C9CED8" vy={-150} spread={90} seed={5} />

        {/* round cover after release */}
        {rc ? (
          <>
            {t > T.roll ? <SpeedLines x={rc.x - RR * S - 10} y={rc.y} dir={0} len={110} opacity={prog(t, T.roll, 0.3)} /> : null}
            {t > T.bonus ? <Shadow x={rc.x} y={HY + 6 + (t > T.roll ? 0 : 0)} rx={RR * S * 0.6} opacity={0.18} /> : null}
            <At x={rc.x} y={rc.y} rot={rc.rot} sx={S} sy={S * rc.sy}>
              <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
                <RoundCover r={RR} />
              </svg>
            </At>
          </>
        ) : null}
        <Burst t={t} t0={RC_CONTACT} x={HX + 120} y={HY - 30} size={70} />

        {/* mascot */}
        <Shadow x={mx} y={MY} rx={120 * (1 + jump / 400)} opacity={0.2} />
        <At x={mx} y={MY + jump}>
          <Mascot
            pose={pose}
            scale={S}
            hold={
              squareHeld
                ? {at: 'f', dx: holdOff.x, dy: holdOff.y, rot: sqRot, node: <SquareCover size={SQ} />}
                : roundHeld
                  ? {at: 'f', dx: DANGLE_OFF_R.x, dy: DANGLE_OFF_R.y, rot: Math.sin(t * 3) * 3, node: <RoundCover r={RR} />}
                  : undefined
            }
          />
        </At>
        <Mark t={t} t0={T.q} dur={T.lift - T.q + 0.1} x={MX + 175} y={MY - 590} text="?" size={130} />
        <SweatDrop t={t} t0={T.drop + 0.5} x={MX + 100} y={MY - 420} scale={1.1} />
        <Mark t={t} t0={RC_CONTACT + 0.35} dur={0.9} x={HX + 40} y={HY - 240} text="✓" color={C.grass} size={110} rot={-6} />
      </Layer>
    </Scene>
  );
};

// ---------------------------------------------------------------------------------------

const BP_CX = 540;
const BP_CY = 1110;
const HOLE = 520; // hole width in the diagram
const SEG = 600; // cover on its edge (longer than the hole is wide)

const Blueprint: React.FC<{t: number}> = ({t}) => {
  const morph = prog(t, T.circle, 0.55, 'inOut');
  const n = lerp(14, 2, morph);
  const outlineU = prog(t, T.bp + 0.2, 0.5, 'out');
  const shape = superellipse(HOLE / 2, n, BP_CX, BP_CY);

  // square phase: segment turns to the diagonal, then drops through
  const turnA = -45 * prog(t, T.corner, 0.6, 'inOut'); // onto the BL-TR diagonal, same as the dim line
  const dropU = prog(t, T.fallA, 0.45, 'in');
  // circle phase: a fresh segment spins and always overhangs
  const segB = prog(t, T.circle + 0.35, 0.25, 'outBack');
  const spin = 180 * prog(t, T.same, T.back - T.same - 0.1, 'inOutSine');
  const bonk = springOffset(t, W('never'), 18, 5, 0.3);

  const seg = (ang: number, scale: number, opacity: number, overhang = false) => {
    const a = (ang * Math.PI) / 180;
    const hx = (Math.cos(a) * SEG) / 2;
    const hy = (Math.sin(a) * SEG) / 2;
    const ix = (Math.cos(a) * HOLE) / 2;
    const iy = (Math.sin(a) * HOLE) / 2;
    return (
      <g transform={`translate(${BP_CX},${BP_CY}) scale(${scale}) translate(${-BP_CX},${-BP_CY})`} opacity={opacity}>
        <line x1={BP_CX - hx} y1={BP_CY - hy} x2={BP_CX + hx} y2={BP_CY + hy} stroke={C.bpLine} strokeWidth={26} strokeLinecap="round" />
        <line x1={BP_CX - hx} y1={BP_CY - hy} x2={BP_CX + hx} y2={BP_CY + hy} stroke={C.metal} strokeWidth={12} strokeLinecap="round" />
        {overhang ? (
          <>
            <line x1={BP_CX - hx} y1={BP_CY - hy} x2={BP_CX - ix} y2={BP_CY - iy} stroke={C.bpAccent} strokeWidth={14} strokeLinecap="round" />
            <line x1={BP_CX + hx} y1={BP_CY + hy} x2={BP_CX + ix} y2={BP_CY + iy} stroke={C.bpAccent} strokeWidth={14} strokeLinecap="round" />
          </>
        ) : null}
      </g>
    );
  };

  const h = HOLE / 2;
  const dimFade = 1 - prog(t, T.circle, 0.25);
  const rot = (spin * Math.PI) / 180;
  return (
    <AbsoluteFill>
      <BlueprintBG t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <BpText x={540} y={790} text={t < T.circle ? 'TOP VIEW' : 'TOP VIEW'} size={46} u={prog(t, T.bp + 0.3, 0.3)} color="rgba(255,255,255,0.8)" />
        <path
          d={shape}
          fill="rgba(255,255,255,0.07)"
          stroke={C.bpLine}
          strokeWidth={9}
          strokeDasharray={`${outlineU * 2200} 2200`}
          strokeLinejoin="round"
        />
        {/* square phase */}
        {t < T.circle + 0.1 ? (
          <g opacity={dimFade}>
            <Dim a={{x: BP_CX - h, y: BP_CY + h + 70}} b={{x: BP_CX + h, y: BP_CY + h + 70}} u={prog(t, T.side, 0.5, 'out')} label="side" offset={52} />
            {seg(turnA, 1 - dropU * 0.85, 1 - dropU)}
            <Dim a={{x: BP_CX - h + 8, y: BP_CY + h - 8}} b={{x: BP_CX + h - 8, y: BP_CY - h + 8}} u={prog(t, T.corner, 0.6, 'out')} label="corner to corner" offset={-62} size={46} />
          </g>
        ) : null}
        {/* circle phase */}
        {t >= T.circle ? (
          <g transform={`translate(0,${bonk})`}>
            <Dim
              a={{x: BP_CX - Math.cos(rot) * h, y: BP_CY - Math.sin(rot) * h}}
              b={{x: BP_CX + Math.cos(rot) * h, y: BP_CY + Math.sin(rot) * h}}
              u={prog(t, T.same, 0.4, 'out')}
              label="same width"
              offset={-70}
              size={46}
            />
            {seg(spin, segB, segB > 0 ? 1 : 0, true)}
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------

export const Episode: React.FC = () => {
  const t = useTime();
  const camForWipe = camAt(t, camKeys);
  const hole = toScreen(camForWipe, HX, HY);
  const inBp = t >= T.bp && t < T.back + 0.5;
  return (
    <Frame>
      <Street t={t} />
      {inBp ? (
        <>
          <CircleWipe t={t} t0={t < T.back ? T.bp : T.back} dur={0.45} x={hole.x} y={hole.y} reverse={t >= T.back}>
            <Blueprint t={t} />
          </CircleWipe>
          <WipeRing t={t} t0={t < T.back ? T.bp : T.back} x={hole.x} y={hole.y} reverse={t >= T.back} />
        </>
      ) : null}
      <Captions words={words} t={t} y={470} />
      <Sound cues={cues()} />
    </Frame>
  );
};
