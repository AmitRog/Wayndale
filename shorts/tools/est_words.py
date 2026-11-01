#!/usr/bin/env python3
"""Estimate word timings from a script (for drafting/animating before the real voice exists).

Usage: python3 -I tools/est_words.py script.txt out/words.json [--wps 2.7]
Times are relative to the start of the voice file (same convention as tts_elevenlabs.py).
"""
import json
import re
import sys


def estimate(text, wps=2.7):
    words = re.findall(r"\S+", text.strip())
    t = 0.05
    out = []
    for w in words:
        core = re.sub(r"[^A-Za-z0-9']", '', w)
        dur = max(0.16, (1 / wps) * (0.55 + 0.09 * len(core)))
        out.append({'w': w, 's': round(t, 3), 'e': round(t + dur, 3)})
        t += dur
        if re.search(r'[.!?]$', w):
            t += 0.34
        elif re.search(r'[,;:]$', w):
            t += 0.16
        elif w.endswith('...'):
            t += 0.3
    return out


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    wps = 2.7
    if '--wps' in sys.argv:
        wps = float(sys.argv[sys.argv.index('--wps') + 1])
        args = [a for a in args if a != str(sys.argv[sys.argv.index('--wps') + 1])]
    text = open(args[0]).read()
    words = estimate(text, wps)
    json.dump(words, open(args[1], 'w'), indent=1)
    print(f'{len(words)} words, ~{words[-1]["e"]:.2f}s')
