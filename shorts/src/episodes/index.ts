import React from 'react';
import * as E000 from './E000-manhole-demo/Episode';
import * as E001 from './E001-toothpaste-eye-marks/Episode';

export type EpisodeEntry = {
  id: string; // Remotion composition id, e.g. "E001-manhole-covers"
  component: React.FC;
  duration: number; // seconds (voice end + ~0.6-0.9 s)
};

// Register each episode here (newest last).
export const EPISODES: EpisodeEntry[] = [
  {id: 'E000-manhole-demo', component: E000.Episode, duration: E000.DURATION},
  {id: 'E001-toothpaste-eye-marks', component: E001.Episode, duration: E001.DURATION},
];
