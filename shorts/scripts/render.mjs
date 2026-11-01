#!/usr/bin/env node
/**
 * Bundle once, then render a composition (and/or stills for a contact sheet).
 *
 *   node scripts/render.mjs <CompId>                       -> out/<CompId>.mp4 (1080x1920)
 *   node scripts/render.mjs <CompId> --preview             -> out/<CompId>-preview.mp4 (0.5x, fast)
 *   node scripts/render.mjs <CompId> --stills 0,1.5,3.2    -> out/stills/<CompId>/still_<t>.png
 *   node scripts/render.mjs <CompId> --stills-only --stills 0,2
 *   options: --out <file> --scale <n> --frames <a-b> --concurrency <n>
 */
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('--')) {
  console.error('usage: node scripts/render.mjs <CompId> [--preview] [--stills t1,t2] [--stills-only] [--out file] [--scale n] [--frames a-b]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browserExecutable =
  process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const preview = flag('preview');
const scale = Number(opt('scale', preview ? 0.5 : 1));
const concurrency = Number(opt('concurrency', Math.max(1, os.cpus().length)));

const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src/index.ts'),
  outDir: path.join(root, 'build'),
  publicDir: path.join(root, 'public'),
});
const composition = await selectComposition({serveUrl, id, browserExecutable});
const {fps, durationInFrames, width, height} = composition;
console.log(`[${id}] ${width}x${height} @${fps}fps, ${durationInFrames} frames (${(durationInFrames / fps).toFixed(2)}s), bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const stills = opt('stills', '')
  .split(',')
  .filter(Boolean)
  .map(Number);
if (stills.length) {
  const dir = path.join(root, 'out/stills', id);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  for (const t of stills) {
    const frame = Math.min(durationInFrames - 1, Math.max(0, Math.round(t * fps)));
    const output = path.join(dir, `still_${t.toFixed(2)}.png`);
    await renderStill({composition, serveUrl, output, frame, browserExecutable, scale: Number(opt('still-scale', 0.5))});
    console.log('still', output);
  }
}
if (flag('stills-only')) process.exit(0);

const out = opt('out', path.join(root, 'out', `${id}${preview ? '-preview' : ''}.mp4`));
fs.mkdirSync(path.dirname(out), {recursive: true});
const fr = opt('frames', '');
const frameRange = fr ? fr.split('-').map(Number) : null;
let last = -1;
const t1 = Date.now();
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: out,
  browserExecutable,
  scale,
  crf: preview ? 26 : 17,
  pixelFormat: 'yuv420p',
  colorSpace: 'bt709',
  imageFormat: 'jpeg',
  jpegQuality: preview ? 80 : 94,
  concurrency,
  frameRange: frameRange ? [frameRange[0], frameRange[1]] : null,
  onProgress: ({progress}) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      console.log(`  ${(progress * 100).toFixed(0)}%  ${((Date.now() - t1) / 1000).toFixed(0)}s`);
    }
  },
});
console.log(`rendered ${out} in ${((Date.now() - t1) / 1000).toFixed(1)}s`);
