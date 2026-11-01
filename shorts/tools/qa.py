#!/usr/bin/env python3
"""Render QA: verify an MP4 and scan it for unintended pops/glitches.

  python3 -I tools/qa.py out/ep.mp4            # verify + pop scan
Pop scan: mean frame-to-frame difference (blurred, 270x480 gray); frames above 2.2x the
local median are listed – each must be an intended cut/swap.
"""
import json
import subprocess
import sys

import numpy as np


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def frames(path, w=270, h=480):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={w}:{h},gblur=sigma=1.5,format=gray', '-f', 'rawvideo', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def main(path):
    info = probe(path)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a = [s for s in info['streams'] if s['codec_type'] == 'audio']
    num, den = map(int, v['r_frame_rate'].split('/'))
    fps = num / den
    dur = float(info['format']['duration'])
    print(f"video {v['width']}x{v['height']} @ {fps:.2f} fps, {dur:.2f}s, codec {v['codec_name']}, pix {v.get('pix_fmt')}")
    if a:
        print(f"audio {a[0]['codec_name']} {a[0].get('sample_rate')} Hz, {float(a[0].get('duration', dur)):.2f}s")
    else:
        print('WARNING: no audio stream')
    f = frames(path)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    flags = []
    for i, x in enumerate(d):
        lo, hi = max(0, i - 15), min(len(d), i + 16)
        med = float(np.median(d[lo:hi])) + 0.15
        if x > max(2.5, 2.4 * med):
            flags.append((i + 1, x))
    # group consecutive flagged frames into events
    events = []
    for fr, x in flags:
        if events and fr - events[-1]['end'] <= 3:
            events[-1]['end'] = fr
            events[-1]['peak'] = max(events[-1]['peak'], x)
        else:
            events.append({'start': fr, 'end': fr, 'peak': x})
    print(f'pop scan: {len(events)} event(s) – each must be an intended cut / wipe / impact shake')
    for e in events:
        print(f"  t={e['start'] / fps:6.2f}s .. {e['end'] / fps:6.2f}s  peak diff {e['peak']:5.1f}  ({e['end'] - e['start'] + 1} frames)")
    tail = d[-int(fps * 0.5):].mean() if len(d) > fps else d.mean()
    print(f'motion in last 0.5s: {tail:.3f} ' + ('(OK)' if tail > 0.02 else '(WARNING: frozen ending?)'))


if __name__ == '__main__':
    main(sys.argv[1])
