#!/usr/bin/env python3
"""Two-pass loudness normalisation of a rendered MP4 (video stream copied untouched).

  python3 -I tools/loudnorm.py out/<ID>.mp4 [--target -14] [--tp -1.5]

YouTube plays Shorts at about -14 LUFS; quieter uploads just sound weak next to other Shorts.
"""
import argparse
import json
import os
import re
import subprocess
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mp4')
    ap.add_argument('--target', type=float, default=-14.0)
    ap.add_argument('--tp', type=float, default=-1.5)
    a = ap.parse_args()
    flt = f'loudnorm=I={a.target}:TP={a.tp}:LRA=11'
    p1 = subprocess.run(['ffmpeg', '-hide_banner', '-i', a.mp4, '-af', flt + ':print_format=json', '-vn', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.search(r'\{[^{}]*"input_i"[^{}]*\}', p1.stderr, re.S)
    if not m:
        sys.exit('loudnorm analysis failed:\n' + p1.stderr[-800:])
    st = json.loads(m.group(0))
    flt2 = (f"{flt}:measured_I={st['input_i']}:measured_TP={st['input_tp']}:measured_LRA={st['input_lra']}"
            f":measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true")
    tmp = a.mp4 + '.norm.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.mp4, '-c:v', 'copy', '-af', flt2, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp], check=True)
    os.replace(tmp, a.mp4)
    print(f"loudness {float(st['input_i']):.1f} LUFS -> {a.target} LUFS (true peak {float(st['input_tp']):.1f} -> <= {a.tp} dBTP)")


if __name__ == '__main__':
    main()
