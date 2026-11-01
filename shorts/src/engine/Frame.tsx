import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/700.css';

/** Root wrapper for every episode: waits for fonts, clips to the frame, optional safe-area guides. */
export const Frame: React.FC<{children: React.ReactNode; guides?: boolean}> = ({children, guides = false}) => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load('700 80px Fredoka'), document.fonts.load('500 80px Fredoka')])
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {children}
      {guides ? (
        <AbsoluteFill style={{pointerEvents: 'none'}}>
          {/* YouTube Shorts UI: title/channel bottom ~380px, action buttons right ~150px */}
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, background: 'rgba(255,0,0,0.18)'}} />
          <div style={{position: 'absolute', right: 0, top: 700, width: 150, bottom: 380, background: 'rgba(255,0,0,0.18)'}} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
