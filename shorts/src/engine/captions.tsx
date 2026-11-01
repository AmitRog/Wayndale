import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from './palette';
import {EASE, clamp} from './math';
import {Word} from './time';

type Chunk = {words: Word[]; s: number; e: number};

/** Split narration into short caption chunks (1-3 words, breaks on punctuation). */
export function chunkWords(words: Word[], maxChars = 16, maxWords = 3): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) chunks.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
    cur = [];
  };
  for (const w of words) {
    const len = cur.map((x) => x.w).join(' ').length;
    if (cur.length && (len + 1 + w.w.length > maxChars || cur.length >= maxWords)) flush();
    cur.push(w);
    if (/[.,!?;:]$/.test(w.w)) flush();
  }
  flush();
  return chunks;
}

const clean = (w: string) => w.replace(/[.,;:]+$/g, '').replace(/^["']|["']$/g, '');

/**
 * Word-synced captions in screen space. Current word highlights in yellow.
 * Keep y between ~1150 and ~1450 (Shorts UI covers the bottom ~380 px and the right edge).
 */
export const Captions: React.FC<{words: Word[]; t: number; y?: number; size?: number; hide?: boolean}> = ({
  words,
  t,
  y = 1380,
  size = 96,
  hide = false,
}) => {
  if (hide) return null;
  const chunks = chunkWords(words);
  const idx = chunks.findIndex((c, i) => {
    const next = chunks[i + 1];
    const end = next ? Math.min(next.s, c.e + 0.6) : c.e + 0.6;
    return t >= c.s - 0.04 && t < end;
  });
  if (idx < 0) return null;
  const c = chunks[idx];
  const pop = EASE.outBack(clamp((t - c.s + 0.04) / 0.14));
  const s = 0.82 + 0.18 * pop;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <text
          transform={`translate(540,${y}) scale(${s})`}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={FONT}
          fontWeight={700}
          fontSize={size}
          stroke={C.ink}
          strokeWidth={size * 0.2}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {c.words.map((w, i) => {
            const active = t >= w.s - 0.03 && t < (c.words[i + 1]?.s ?? c.e + 0.6);
            return (
              <tspan key={i} fill={active ? C.yellow : C.white}>
                {(i ? ' ' : '') + clean(w.w)}
              </tspan>
            );
          })}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
