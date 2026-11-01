import React from 'react';
import * as E000 from './E000-manhole-demo/Episode';

export type EpisodeEntry = {
  id: string; // Remotion composition id, e.g. "E001-manhole-covers"
  component: React.FC;
  duration: number; // seconds (voice end + ~0.6-0.9 s)
};

// Register each episode here (newest last).
export const EPISODES: EpisodeEntry[] = [{id: 'E000-manhole-demo', component: E000.Episode, duration: E000.DURATION}];
