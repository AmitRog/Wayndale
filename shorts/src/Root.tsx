import React from 'react';
import {Composition} from 'remotion';
import {ModelSheet} from './episodes/dev/ModelSheet';
import {Avatar, Banner, FbCover} from './episodes/dev/Branding';
import {EPISODES} from './episodes';

export const Root: React.FC = () => (
  <>
    <Composition id="ModelSheet" component={ModelSheet} durationInFrames={240} fps={60} width={1080} height={1920} />
    <Composition id="Avatar" component={Avatar} durationInFrames={1} fps={60} width={800} height={800} />
    <Composition id="Banner" component={Banner} durationInFrames={1} fps={60} width={2560} height={1440} />
    <Composition id="FbCover" component={FbCover} durationInFrames={1} fps={60} width={1640} height={924} />
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
