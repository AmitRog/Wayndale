import React from 'react';
import {Audio, Sequence, staticFile, useVideoConfig} from 'remotion';

export type Cue = {
  src: string; // path under public/, e.g. 'sfx/whoosh.wav'
  at: number; // seconds
  db?: number; // gain in dB (0 = as is). Under a voice: whoosh -26, impact -16, beds -30
  dur?: number; // optional cut length (s)
  rate?: number; // playback rate (pitch shifts too)
};

const gain = (db: number) => Math.pow(10, db / 20);

/** Voice-over + one cue list for every sound effect. */
export const Sound: React.FC<{voice?: string; voiceAt?: number; voiceDb?: number; cues?: Cue[]; music?: {src: string; db?: number}}> = ({
  voice,
  voiceAt = 0.1,
  voiceDb = 0,
  cues = [],
  music,
}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {voice ? (
        <Sequence from={Math.round(voiceAt * fps)} layout="none" name="voice">
          <Audio src={staticFile(voice)} volume={gain(voiceDb)} />
        </Sequence>
      ) : null}
      {music ? <Audio src={staticFile(music.src)} volume={gain(music.db ?? -30)} loop /> : null}
      {cues.map((c, i) => (
        <Sequence
          key={i}
          from={Math.max(0, Math.round(c.at * fps))}
          durationInFrames={c.dur ? Math.max(1, Math.round(c.dur * fps)) : undefined}
          layout="none"
          name={c.src}
        >
          <Audio src={staticFile(c.src)} volume={gain(c.db ?? -14)} playbackRate={c.rate ?? 1} />
        </Sequence>
      ))}
    </>
  );
};
