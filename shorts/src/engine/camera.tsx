import React, {createContext, useContext} from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {EASE, Ease, clamp, lerp} from './math';

/**
 * 2.5D multiplane camera. Every layer is a flat plane at depth Z; on screen it is scaled by
 * k = F / (Z - cam.z). With the camera at (540, 960, 0) a layer at Z = 1000 shows world
 * pixels 1:1, so author scenes at Z = 1000 in plain 1080x1920 screen coordinates.
 */
export const F = 1000;
export type Cam = {x: number; y: number; z: number; r?: number};
export type CamKey = {t: number; x: number; y: number; z: number; e?: Ease};

const CamCtx = createContext<Cam>({x: 540, y: 960, z: 0, r: 0});
export const useCam = () => useContext(CamCtx);

/** Camera from keyframes. Zoom is interpolated in log-scale space so pushes feel even. */
export function camAt(t: number, keys: CamKey[]): Cam {
  if (keys.length === 0) return {x: 540, y: 960, z: 0};
  if (t <= keys[0].t) return {...keys[0]};
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.t) {
      const p = keys[i - 1];
      const u = EASE[k.e ?? 'inOut'](clamp((t - p.t) / Math.max(1e-6, k.t - p.t)));
      const kp = F / (F - p.z);
      const kk = F / (F - k.z);
      const kz = Math.exp(lerp(Math.log(kp), Math.log(kk), u));
      return {x: lerp(p.x, k.x, u), y: lerp(p.y, k.y, u), z: F - F / kz};
    }
  }
  const last = keys[keys.length - 1];
  return {...last};
}

/** Convenience: camera z that gives zoom factor `zoom` on the Z = 1000 plane. */
export const zoomZ = (zoom: number) => F - F / zoom;

export const Scene: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => (
  <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>
);

/** One depth plane. Children are absolutely positioned in world pixels. */
export const Layer: React.FC<{
  z: number;
  blur?: number; // screen-space px
  minDepth?: number;
  children: React.ReactNode;
}> = ({z, blur = 0, minDepth = 250, children}) => {
  const cam = useCam();
  const {width, height} = useVideoConfig();
  const d = z - cam.z;
  if (d < minDepth) return null;
  const k = F / d;
  const rot = cam.r ?? 0;
  return (
    <AbsoluteFill style={{filter: blur > 0.05 ? `blur(${blur}px)` : undefined, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${width / 2}px, ${height / 2}px) rotate(${rot}rad) scale(${k}) translate(${-cam.x}px, ${-cam.y}px)`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** World width visible at depth Z for a camera at depth camZ (for sizing far backdrops). */
export const spanAt = (z: number, camZ = 0, screenW = 1080) => (screenW * (z - camZ)) / F;

/** Screen position of a world point on depth plane z (for screen-space overlays that track the world). */
export const toScreen = (cam: Cam, x: number, y: number, z = 1000, w = 1080, h = 1920) => {
  const k = F / (z - cam.z);
  return {x: w / 2 + k * (x - cam.x), y: h / 2 + k * (y - cam.y), k};
};
