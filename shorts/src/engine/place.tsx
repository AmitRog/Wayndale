import React from 'react';
import {Img, staticFile} from 'remotion';

/** Position children at world point (x, y); children draw around their own (0, 0). */
export const At: React.FC<{
  x: number;
  y: number;
  rot?: number; // degrees
  sx?: number;
  sy?: number;
  opacity?: number;
  z?: number; // zIndex within a layer
  children: React.ReactNode;
}> = ({x, y, rot = 0, sx = 1, sy = 1, opacity = 1, z, children}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 0,
      height: 0,
      opacity,
      zIndex: z,
      transformOrigin: '0 0',
      transform: `rotate(${rot}deg) scale(${sx}, ${sy})`,
    }}
  >
    {children}
  </div>
);

/** An overflow-visible SVG anchored at (0, 0) of its parent. Draw with negative coords freely. */
export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <svg
    width={1}
    height={1}
    style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}
  >
    {children}
  </svg>
);

/**
 * Image cut-out from public/ (e.g. an AI-generated prop). (x, y) is the anchor point;
 * anchor (0.5, 1) = bottom centre (feet / base). w and h in world px.
 */
export const Sprite: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ax?: number;
  ay?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  opacity?: number;
  style?: React.CSSProperties;
}> = ({src, x, y, w, h, ax = 0.5, ay = 1, rot = 0, sx = 1, sy = 1, opacity = 1, style}) => (
  <Img
    src={staticFile(src)}
    style={{
      position: 'absolute',
      left: x - w * ax,
      top: y - h * ay,
      width: w,
      height: h,
      opacity,
      transformOrigin: `${ax * 100}% ${ay * 100}%`,
      transform: `rotate(${rot}deg) scale(${sx}, ${sy})`,
      ...style,
    }}
  />
);

/** Soft contact shadow ellipse on the ground. */
export const Shadow: React.FC<{x: number; y: number; rx: number; ry?: number; opacity?: number}> = ({
  x,
  y,
  rx,
  ry = rx * 0.16,
  opacity = 0.22,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - rx,
      top: y - ry,
      width: rx * 2,
      height: ry * 2,
      borderRadius: '50%',
      background: `rgba(31, 42, 68, ${opacity})`,
      filter: 'blur(3px)',
    }}
  />
);
