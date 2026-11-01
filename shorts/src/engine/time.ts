import {useCurrentFrame, useVideoConfig} from 'remotion';

/** Current time in seconds. */
export const useTime = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

export type Word = {w: string; s: number; e: number};

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, '');

/**
 * Beat anchors from word timings: at('round') = start of the first "round",
 * at('round', 2) = second one, at('round', 1, 'e') = its end.
 * Throws if the word is missing so script edits can't silently desync the animation.
 */
export function wordClock(words: Word[]) {
  return (word: string, nth = 1, edge: 's' | 'e' = 's') => {
    let n = 0;
    for (const x of words) {
      if (norm(x.w) === norm(word) && ++n === nth) return edge === 's' ? x.s : x.e;
    }
    throw new Error(`wordClock: "${word}" #${nth} not found`);
  };
}

/** Shift word times (voice file time -> composition time). */
export const offsetWords = (words: Word[], at: number): Word[] => words.map((w) => ({...w, s: w.s + at, e: w.e + at}));
