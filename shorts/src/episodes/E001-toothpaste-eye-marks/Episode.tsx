/**
 * E001 – "What does the colored square on your toothpaste mean?"
 *
 * Verified: the coloured square is an "eye mark" read by a light sensor on the tube filling/sealing line
 * (positions the tube so the crimp seal and cut land in the right place); it is NOT an ingredient code.
 * Sources: colgate.com (what-is-a-toothpaste-color-code), mentalfloss.com (630094), blackdotresearch.sg,
 * thip.media fact check; mechanism: USPTO tube-filling patent (tubes rotated into position before sealing),
 * manufacturing.net (IWK tube filler vision/print alignment).
 *
 * BEAT SHEET (anchored to words)
 * | anchor              | on screen                                             | gag / sfx                 |
 * | 0                   | Hardy points at the black square on a giant tube      | "?" pop                   |
 * | black / chemicals   | myth card: black square = beaker                      | Hardy scared, sweat, pop  |
 * | green / natural     | myth card: green square = leaf                        | Hardy relieved, sparkle   |
 * | Nope                | red X stamps over both cards                          | thud + shake, deadpan     |
 * | eye / mark          | push into the square – it opens an EYE and looks up   | squeak                    |
 * | At (factory)        | BLUEPRINT wipe out of the square                      | whoosh                    |
 * | factory / spins     | upright tube on the line starts spinning              | pop, roll                 |
 * | sensor / spots      | sensor + beam; mark hits the beam -> tube stops       | click, BEEP, ✓            |
 * | squeeze / seal / end| jaws clamp, crimp + steam, blade trims the end        | thud, hiss, snip          |
 * | color / stand / tube| 3 tubes: black ✓, blue ✓, white ✗ (no contrast)       | beep, beep, buzz          |
 * | Want                | reverse wipe to the bathroom; Hardy holds the box     | whoosh                    |
 * | ingredients/printed | box turns to the back panel, lines highlighted        | swish, sparkle            |
 * | box                 | the tube's mark opens its eye and WINKS at us         | squeak + ding             |
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
  Cue,
  DrawLine,
  EASE,
  EXPR,
  Frame,
  Layer,
  Mark,
  Mascot,
  MascotPose,
  Puffs,
  Scene,
  Shadow,
  Sound,
  SweatDrop,
  WipeRing,
  Word,
  alive,
  camAt,
  clamp,
  lerp,
  offsetWords,
  prog,
  pulse,
  shake,
  squash,
  toScreen,
  track,
  useTime,
  wordClock,
  zoomZ,
} from '../../engine';
import {Bathroom} from '../../library/sets/Bathroom';
import {TUBE_MARK, ToothpasteTube, UprightTube} from '../../library/props/ToothpasteTube';
import {ToothpasteBox} from '../../library/props/ToothpasteBox';
import rawWords from './words.json';

const VOICE: string | null = 'episodes/E001-toothpaste-eye-marks/vo.mp3'; // ElevenLabs v4, Chris
const VO_AT = 0.1;
const words: Word[] = offsetWords(rawWords as Word[], VO_AT);
const W = wordClock(words);
export const DURATION = words[words.length - 1].e + 1.0;

// ---- layout (Z = 1000 plane) ----
const COUNTER = 1262;
const MX = 205;
const S = 0.95;
const TX = 655; // tube centre
const TY = COUNTER - 92;
const MARK = {x: TX + TUBE_MARK.x, y: TY + TUBE_MARK.y};

// ---- beats ----
const T = {
  q: 0.35,
  black: W('black'),
  chem: W('chemicals'),
  green: W('green'),
  nope: W('Nope.'),
  eye: W('eye'),
  mark: W('mark.'),
  bp: W('At') - 0.12,
  factory: W('factory,'),
  spins: W('spins'),
  sensor: W('sensor'),
  spot: W('square', 2) - 0.05, // the 2nd 'square' ("spots the square")
  squeeze: W('squeeze'),
  seal: W('seal'),
  end: W('end.'),
  color: W('color'),
  stand: W('stand'),
  out: W('out'),
  tube2: W('tube', 2), // "from the tube"
  back: W('Want') - 0.15,
  ingr: W('ingredients?'),
  printed: W('printed'),
  box: W('box.'),
};

const poseAt = (t: number): MascotPose =>
  track(t, {...BASE_POSE, ...EXPR.curious, ...ARMS.point, fx: 150, fy: -40, lookX: 0.9, lookY: 0.3}, [
    {t: T.black + 0.15, p: {...EXPR.scared, ...ARMS.oops, lookX: 0.6, lookY: -0.6}, d: 0.15, e: 'out'},
    {t: T.green + 0.1, p: {...EXPR.happy, ...ARMS.down, lookX: 0.8, lookY: -0.6}, d: 0.25},
    {t: T.nope, p: {...EXPR.deadpan, ...ARMS.hips, lookX: 0, lookY: 0}, d: 0.12},
    {t: T.eye + 0.3, p: {...EXPR.surprised, lookX: 1, lookY: 0.3}, d: 0.12},
    // after the blueprint: holding the box
    {t: T.back - 0.3, p: {...EXPR.happy, ...ARMS.hold, lookX: 0.4, lookY: 0.2}, d: 0},
    {t: T.ingr, p: {...EXPR.curious, lookX: 0.5, lookY: 0.6}, d: 0.2},
    {t: T.printed, p: {...EXPR.smug, lookX: 0.4, lookY: 0.5}, d: 0.2},
    {t: T.box + 0.15, p: {...EXPR.surprised, lookX: 1, lookY: 0.4, hatLift: 26}, d: 0.12, e: 'outBack'},
  ]);

const camKeys = [
  {t: 0, x: 508, y: 1040, z: zoomZ(1.18)},
  {t: T.nope - 0.1, x: 512, y: 1035, z: zoomZ(1.22)},
  {t: T.eye - 0.05, x: 512, y: 1035, z: zoomZ(1.22)},
  {t: T.eye + 0.45, x: MARK.x, y: MARK.y, z: zoomZ(2.7), e: 'out' as const},
  {t: T.back - 0.3, x: MARK.x, y: MARK.y, z: zoomZ(2.7), e: 'hold' as const},
  {t: T.back - 0.29, x: 520, y: 1040, z: zoomZ(1.2), e: 'hold' as const},
  {t: T.ingr + 0.1, x: 520, y: 1040, z: zoomZ(1.2)},
  {t: T.printed + 0.25, x: 330, y: 1090, z: zoomZ(1.6)}, // gentle ~1 s push onto the box
  {t: T.box - 0.02, x: 330, y: 1090, z: zoomZ(1.6)},
  {t: T.box + 0.33, x: 340, y: 1060, z: zoomZ(1.85)}, // quick but eased punch-in on the wink
];

const cues = (): Cue[] => [
  {src: 'sfx/pop.wav', at: T.q, db: -18},
  {src: 'sfx/pop.wav', at: T.black, db: -16},
  {src: 'sfx/squeak.wav', at: T.chem, db: -24},
  {src: 'sfx/pop.wav', at: T.green, db: -16},
  {src: 'sfx/sparkle.wav', at: T.green + 0.4, db: -28},
  {src: 'sfx/thud.wav', at: T.nope, db: -10},
  {src: 'sfx/click.wav', at: T.nope + 0.08, db: -18},
  {src: 'sfx/whoosh.wav', at: T.eye - 0.05, db: -24},
  {src: 'sfx/squeak.wav', at: T.mark - 0.05, db: -20},
  {src: 'sfx/whoosh.wav', at: T.bp, db: -20},
  {src: 'sfx/pop.wav', at: T.factory, db: -20},
  {src: 'sfx/roll.wav', at: T.spins, db: -26, dur: T.spot - T.spins + 0.1},
  {src: 'sfx/click.wav', at: T.sensor, db: -20},
  {src: 'sfx/beep.wav', at: T.spot + 0.05, db: -14},
  {src: 'sfx/thud.wav', at: T.squeeze + 0.2, db: -14},
  {src: 'sfx/hiss.wav', at: T.seal, db: -22},
  {src: 'sfx/snip.wav', at: T.end + 0.1, db: -16},
  {src: 'sfx/beep.wav', at: T.stand, db: -18},
  {src: 'sfx/beep.wav', at: T.out, db: -18},
  {src: 'sfx/buzz.wav', at: T.tube2, db: -20},
  {src: 'sfx/whoosh.wav', at: T.back - 0.05, db: -20},
  {src: 'sfx/swish.wav', at: T.ingr, db: -22},
  {src: 'sfx/sparkle.wav', at: T.printed + 0.1, db: -26},
  {src: 'sfx/squeak.wav', at: T.box, db: -20},
  {src: 'sfx/ding.wav', at: T.box + 0.45, db: -22},
];

// ---------------------------------------------------------------------------------------

const Beaker: React.FC = () => (
  <g>
    <path d="M-14,-40 L14,-40 L14,-12 L34,30 C38,40 32,46 22,46 L-22,46 C-32,46 -38,40 -34,30 L-14,-12 Z" fill="#E7F4FF" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-27,22 L27,22 L33,32 C36,40 31,44 22,44 L-22,44 C-31,44 -36,40 -33,32 Z" fill="#B86BF2" />
    <circle cx={-6} cy={8} r={5} fill="#B86BF2" />
    <circle cx={8} cy={-4} r={4} fill="#B86BF2" />
    <rect x={-18} y={-46} width={36} height={10} rx={4} fill={C.ink} />
  </g>
);

const Leaf: React.FC = () => (
  <g transform="rotate(-30)">
    <path d="M0,-44 C34,-24 34,24 0,44 C-34,24 -34,-24 0,-44 Z" fill={C.grass} stroke={C.ink} strokeWidth={6} />
    <path d="M0,-34 L0,40" stroke={C.ink} strokeWidth={4} />
    <path d="M0,-6 L14,-18 M0,10 L-14,-2 M0,22 L12,12" stroke={C.ink} strokeWidth={3} />
  </g>
);

const MythCard: React.FC<{square: string; icon: React.ReactNode}> = ({square, icon}) => (
  <g>
    <rect x={-125} y={-80} width={250} height={160} rx={22} fill={C.white} stroke={C.ink} strokeWidth={8} />
    <rect x={-95} y={-30} width={60} height={60} rx={6} fill={square} stroke={C.ink} strokeWidth={5} />
    <g stroke={C.ink} strokeWidth={8} strokeLinecap="round">
      <line x1={-18} y1={-10} x2={6} y2={-10} />
      <line x1={-18} y1={10} x2={6} y2={10} />
    </g>
    <g transform="translate(62,0)">{icon}</g>
  </g>
);

const pop = (t: number, t0: number, out?: number) =>
  EASE.outBack(clamp((t - t0) / 0.25)) * (out !== undefined ? 1 - EASE.in(clamp((t - out) / 0.2)) : 1);

const Bath: React.FC<{t: number}> = ({t}) => {
  const pose = alive(t, poseAt(t), {seed: 21});
  const sh = shake(t, [{t: T.nope, amp: 9, decay: 8}]);
  const cam = camAt(t, camKeys);
  cam.x += sh.x;
  cam.y += sh.y;
  cam.r = sh.r;
  const sq = squash(t, [
    {t: T.black + 0.15, amt: 0.08},
    {t: T.nope, amt: -0.06},
    {t: T.box + 0.15, amt: 0.09},
  ]);

  // the eye on the tube's mark: opens at "mark", closes for the blueprint; at "box" it opens and winks
  let eye = 0;
  let lookX = 0;
  let lookY = 0;
  if (t < T.back) {
    eye = EASE.outBack(clamp((t - T.mark + 0.05) / 0.25));
    eye *= 1 - pulse(t, T.mark + 0.55, 0.16); // blink
    lookX = -0.6;
    lookY = -0.7;
  } else {
    eye = EASE.outBack(clamp((t - T.box + 0.05) / 0.25));
    eye *= 1 - Math.min(1, pulse(t, T.box + 0.45, 0.3) * 1.2); // the wink
    lookX = 0.2;
    lookY = 0.2;
  }

  const afterBp = t >= T.back - 0.3;
  const xU = prog(t, T.nope, 0.18, 'outBack');
  const cardsOut = T.nope + 0.55;
  const boxSide = prog(t, T.ingr, 0.01) > 0 ? 1 : 0;
  const boxTurn = 1 - Math.abs(Math.sin(Math.PI * clamp((t - T.ingr + 0.12) / 0.24))) * 0.9; // squash-swap

  return (
    <Scene cam={cam}>
      <Layer z={1000}>
        <Bathroom counterY={COUNTER} />
        <Shadow x={TX - 30} y={COUNTER + 4} rx={300} opacity={0.16} />
        <At x={TX} y={TY}>
          <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
            <ToothpasteTube eye={eye} lookX={lookX} lookY={lookY} markScale={1 + 0.45 * EASE.outBack(clamp((t - T.box + 0.05) / 0.3)) * (t > T.back ? 1 : 0)} />
          </svg>
        </At>

        {/* myth cards + the big red X */}
        {t < cardsOut + 0.3 ? (
          <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
            <g transform={`translate(430,760) scale(${pop(t, T.black, cardsOut)}) rotate(-4)`}>
              <MythCard square="#16181D" icon={<Beaker />} />
            </g>
            <g transform={`translate(760,760) scale(${pop(t, T.green, cardsOut)}) rotate(4)`}>
              <MythCard square={C.grass} icon={<Leaf />} />
            </g>
            {xU > 0 ? (
              <g transform={`translate(595,760) scale(${xU * (1 - EASE.in(clamp((t - cardsOut) / 0.2)))})`} strokeLinecap="round">
                <line x1={-300} y1={-110} x2={300} y2={110} stroke={C.ink} strokeWidth={62} />
                <line x1={-300} y1={110} x2={300} y2={-110} stroke={C.ink} strokeWidth={62} />
                <line x1={-300} y1={-110} x2={300} y2={110} stroke={C.red} strokeWidth={40} />
                <line x1={-300} y1={110} x2={300} y2={-110} stroke={C.red} strokeWidth={40} />
              </g>
            ) : null}
          </svg>
        ) : null}
        <Burst t={t} t0={T.nope} x={595} y={760} size={80} fill={C.yellow} />

        {/* Hardy */}
        <Shadow x={MX} y={COUNTER} rx={105} opacity={0.18} />
        <At x={MX} y={COUNTER}>
          <Mascot
            pose={{...pose, sx: pose.sx * sq.sx, sy: pose.sy * sq.sy}}
            scale={S}
            hold={
              afterBp
                ? {at: 'mid', dx: -40, dy: 95, rot: -4, node: <g transform={`scale(${0.82 * boxTurn},0.82)`}><ToothpasteBox side={boxSide} highlight={prog(t, T.printed, 0.6)} /></g>}
                : undefined
            }
          />
        </At>
        <Mark t={t} t0={T.q} dur={T.black - T.q - 0.1} x={MX + 130} y={COUNTER - 520} text="?" size={120} />
        <SweatDrop t={t} t0={T.chem} x={MX + 95} y={COUNTER - 380} />
        <Mark t={t} t0={T.box + 0.2} dur={0.9} x={MX + 205} y={COUNTER - 375} text="!" size={100} rot={10} />
      </Layer>
    </Scene>
  );
};

// ---------------------------------------------------------------------------------------

const BX = 430; // main tube (screen space)
const BY = 1060;
const SENSOR = {x: 790, y: 820};
const BK = 1.45; // the whole factory diagram is drawn at 1.45x around (540, 1100)
const bpT = (x: number, y: number) => ({x: 540 + BK * (x - 540), y: 1100 + BK * (y - 1100)});
const STOP = Math.PI / 4; // mark faces the sensor beam at 45°

const Blueprint: React.FC<{t: number}> = ({t}) => {
  // spin: accelerate from "spins", ease to a stop exactly at the beam when the sensor "spots" it
  const turns = 3;
  const spinU = clamp((t - T.spins) / Math.max(0.3, T.spot - T.spins));
  const eased = spinU < 1 ? EASE.inOutSine(spinU) : 1;
  const spin = t < T.spins ? -Math.PI * 0.9 : -Math.PI * 0.9 + eased * (turns * Math.PI * 2 + STOP + Math.PI * 0.9);
  const detected = t >= T.spot;
  const flash = pulse(t, T.spot, 0.35);

  // crimp + trim
  const jaws = t < T.seal + 0.35 ? prog(t, T.squeeze, 0.22, 'in') : 1 - prog(t, T.seal + 0.35, 0.25, 'out');
  const crimp = prog(t, T.squeeze + 0.18, 0.25, 'out');
  const blade = prog(t, T.end + 0.05, 0.25, 'inOut');
  const stripFall = Math.max(0, t - (T.end + 0.2));

  // trio phase
  const mainOut = prog(t, T.color - 0.1, 0.3, 'in');
  const trio = (i: number) => pop(t, T.color + 0.1 + i * 0.08);
  const check = [T.stand, T.out, T.tube2];

  const markScreen = {x: BX + Math.sin(STOP) * 66, y: BY - 182};
  const beamU = prog(t, T.sensor + 0.1, 0.35, 'out');

  return (
    <AbsoluteFill>
      <BlueprintBG t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <BpText x={540} y={590} text="TUBE FILLING LINE" size={42} u={prog(t, T.factory, 0.3)} color="rgba(255,255,255,0.8)" />
        <g opacity={1 - mainOut} transform={`translate(540,1100) scale(${BK}) translate(-540,-1100)`}>
          {/* conveyor + holder */}
          <DrawLine a={{x: 120, y: BY + 300}} b={{x: 960, y: BY + 300}} u={prog(t, T.bp + 0.25, 0.5)} width={6} />
          {[180, 330, 480, 630, 780, 930].map((x) => (
            <circle key={x} cx={x - ((t * 120) % 150) * (t < T.spins ? 1 : 0)} cy={BY + 322} r={16} fill="none" stroke={C.bpLine} strokeWidth={5} opacity={prog(t, T.bp + 0.4, 0.3)} />
          ))}
          <g transform={`translate(${BX},${BY}) scale(${pop(t, T.factory)})`}>
            <rect x={-60} y={250} width={120} height={50} rx={10} fill="none" stroke={C.bpLine} strokeWidth={6} />
            <UprightTube spin={spin} crimp={crimp} />
            {/* cut-off strip falling away */}
            {blade >= 1 ? (
              <rect x={-90} y={-262 + stripFall * stripFall * 900} width={180} height={14} rx={5} fill="rgba(255,255,255,0.9)" stroke={C.bpLine} strokeWidth={3} transform={`rotate(${stripFall * 60})`} opacity={1 - clamp(stripFall / 0.6)} />
            ) : null}
          </g>
          {/* spin arrows while turning */}
          {t > T.spins && t < T.spot ? (
            <g opacity={pulse(t, T.spins, T.spot - T.spins)}>
              <path d={`M${BX - 130},${BY - 60} A140,40 0 0 0 ${BX + 130},${BY - 60}`} fill="none" stroke={C.bpAccent} strokeWidth={8} strokeLinecap="round" />
              <path d={`M${BX + 130},${BY - 60} l-30,-6 l14,26 z`} fill={C.bpAccent} />
            </g>
          ) : null}
          {/* sensor */}
          <g transform={`translate(${SENSOR.x},${SENSOR.y}) scale(${pop(t, T.sensor)})`}>
            <rect x={-70} y={-50} width={140} height={100} rx={16} fill="rgba(255,255,255,0.12)" stroke={C.bpLine} strokeWidth={7} />
            <circle cx={-70} cy={0} r={24} fill={detected ? C.bpAccent : C.bp} stroke={C.bpLine} strokeWidth={7} />
            <line x1={-40} y1={-80} x2={-40} y2={-50} stroke={C.bpLine} strokeWidth={6} />
            <circle cx={-40} cy={-86} r={8} fill={detected ? C.grass : 'none'} stroke={C.bpLine} strokeWidth={5} />
            <BpText x={30} y={0} text="EYE" size={30} u={1} />
          </g>
          {beamU > 0 ? (
            <line
              x1={SENSOR.x - 94}
              y1={SENSOR.y}
              x2={lerp(SENSOR.x - 94, markScreen.x + 12, beamU)}
              y2={lerp(SENSOR.y, markScreen.y + 23, beamU)}
              stroke={C.bpAccent}
              strokeWidth={detected ? 10 + flash * 10 : 6}
              strokeDasharray={detected ? undefined : '18 14'}
              strokeLinecap="round"
              opacity={0.95}
            />
          ) : null}
          {/* crimp jaws + blade */}
          {jaws > 0.001 ? (
            <g>
              <rect x={lerp(120, BX - 86 - 70, jaws)} y={BY - 248} width={70} height={56} rx={10} fill="rgba(255,255,255,0.2)" stroke={C.bpLine} strokeWidth={7} />
              <rect x={lerp(870, BX + 86, jaws)} y={BY - 248} width={70} height={56} rx={10} fill="rgba(255,255,255,0.2)" stroke={C.bpLine} strokeWidth={7} />
            </g>
          ) : null}
          {blade > 0 && blade < 1 ? (
            <g transform={`translate(${lerp(BX - 220, BX + 220, blade)},${BY - 236})`}>
              <path d="M-40,-10 L40,-10 L30,10 L-40,10 Z" fill={C.bpAccent} stroke={C.bpLine} strokeWidth={4} />
            </g>
          ) : null}
        </g>
        {null}
        {/* contrast trio */}
        {t > T.color ? (
          <g>
            {[
              {x: 245, mark: '#16181D', ok: true},
              {x: 540, mark: C.blue, ok: true},
              {x: 835, mark: '#FFFFFF', ok: false},
            ].map((c, i) => {
              const s = trio(i);
              const lit = t >= check[i];
              return (
                <g key={i}>
                  <g transform={`translate(${c.x},1110) scale(${0.85 * s})`}>
                    <UprightTube spin={0.35} crimp={1} mark={c.mark} markOutline={c.ok ? C.white : 'rgba(255,255,255,0.35)'} />
                  </g>
                  <g transform={`translate(${c.x},770) scale(${1.25 * s})`}>
                    <rect x={-46} y={-30} width={92} height={60} rx={12} fill="rgba(255,255,255,0.12)" stroke={C.bpLine} strokeWidth={6} />
                    <circle cx={0} cy={30} r={13} fill={lit ? (c.ok ? C.grass : C.red) : C.bp} stroke={C.bpLine} strokeWidth={5} />
                    {lit ? <line x1={0} y1={44} x2={0} y2={92} stroke={c.ok ? C.bpAccent : 'rgba(255,255,255,0.4)'} strokeWidth={8} strokeLinecap="round" strokeDasharray={c.ok ? undefined : '10 10'} /> : null}
                  </g>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>
      {[0, 1, 2].map((i) => (
        <Mark
          key={i}
          t={t}
          t0={check[i] + 0.05}
          dur={T.back - check[i] + 0.2}
          x={[245, 540, 835][i] + 60}
          y={1430}
          text={i < 2 ? '✓' : '✗'}
          color={i < 2 ? C.grass : C.red}
          size={110}
          rot={i < 2 ? -6 : 6}
        />
      ))}
      <Mark t={t} t0={T.spot + 0.05} dur={1.1} x={bpT(SENSOR.x, SENSOR.y).x - 40} y={bpT(SENSOR.x, SENSOR.y).y - 200} text="✓" color={C.grass} size={120} />
      <Puffs t={t} t0={T.seal} x={bpT(BX, BY - 260).x} y={bpT(BX, BY - 260).y} count={8} every={0.05} r={[30, 56]} spread={110} vy={-170} fill={C.white} outline={C.bpDeep} seed={9} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------

export const Episode: React.FC = () => {
  const t = useTime();
  const cam = camAt(t, camKeys);
  const markOnScreen = toScreen(cam, MARK.x, MARK.y);
  const inBp = t >= T.bp && t < T.back + 0.5;
  const goingBack = t >= T.back;
  return (
    <Frame>
      <Bath t={t} />
      {inBp ? (
        <>
          <CircleWipe t={t} t0={goingBack ? T.back : T.bp} dur={0.45} x={markOnScreen.x} y={markOnScreen.y} reverse={goingBack}>
            <Blueprint t={t} />
          </CircleWipe>
          <WipeRing t={t} t0={goingBack ? T.back : T.bp} x={markOnScreen.x} y={markOnScreen.y} reverse={goingBack} />
        </>
      ) : null}
      <Captions words={words} t={t} y={470} />
      <Sound voice={VOICE ?? undefined} voiceAt={VO_AT} cues={cues()} />
    </Frame>
  );
};

