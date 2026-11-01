import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ARMS, At, BASE_POSE, C, EXPR, FONT, Frame, Mascot, MascotPose, Shadow, alive, useTime} from '../../engine';

const CELLS: {label: string; p: Partial<MascotPose>; facing?: 1 | -1}[] = [
  {label: 'neutral', p: {...EXPR.neutral, ...ARMS.down}},
  {label: 'happy / wave', p: {...EXPR.happy, ...ARMS.wave}},
  {label: 'curious / scratch', p: {...EXPR.curious, ...ARMS.scratch}},
  {label: 'shocked / oops', p: {...EXPR.shocked, ...ARMS.oops}},
  {label: 'smug / hips', p: {...EXPR.smug, ...ARMS.hips}},
  {label: 'joy / cheer', p: {...EXPR.joy, ...ARMS.cheer}},
  {label: 'scared / shrug', p: {...EXPR.scared, ...ARMS.shrug}, facing: -1},
  {label: 'thinking / chin', p: {...EXPR.thinking, ...ARMS.chin}},
  {label: 'wince / point', p: {...EXPR.wince, ...ARMS.point}},
];

/** Dev composition: every expression + arm preset, gently alive. Check the rig here. */
export const ModelSheet: React.FC = () => {
  const t = useTime();
  return (
    <Frame>
      <AbsoluteFill style={{background: C.cream}} />
      {CELLS.map((c, i) => {
        const x = 190 + (i % 3) * 350;
        const y = 560 + Math.floor(i / 3) * 600;
        const pose = alive(t, {...BASE_POSE, ...c.p}, {seed: i + 3});
        return (
          <React.Fragment key={i}>
            <Shadow x={x} y={y} rx={95} />
            <At x={x} y={y}>
              <Mascot pose={pose} scale={0.72} facing={c.facing ?? 1} />
            </At>
            <div style={{position: 'absolute', left: x - 170, top: y + 24, width: 340, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.ink}}>
              {c.label}
            </div>
          </React.Fragment>
        );
      })}
    </Frame>
  );
};
