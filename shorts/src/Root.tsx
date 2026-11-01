import React from 'react';
import {Composition} from 'remotion';
import {ModelSheet} from './episodes/dev/ModelSheet';
import {EPISODES} from './episodes';

export const Root: React.FC = () => (
  <>
    <Composition id="ModelSheet" component={ModelSheet} durationInFrames={240} fps={60} width={1080} height={1920} />
    {EPISODES.map((ep) => (
      <Composition
        key={ep.id}
        id={ep.id}
        component={ep.component}
        durationInFrames={Math.ceil(ep.duration * 60)}
        fps={60}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
