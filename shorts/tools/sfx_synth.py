#!/usr/bin/env python3
"""Synthesize a small royalty-free cartoon SFX library into public/sfx/ (48 kHz mono WAV).

Free fallback for every episode; special sounds (lava, engines, crowds...) can come from
Higgsfield `seed_audio`. Run:  python3 -I tools/sfx_synth.py public/sfx
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rs = np.random.default_rng(42)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def onepole_lp(x, cutoff):
    """Time-varying one-pole low-pass; cutoff may be scalar or per-sample array (Hz)."""
    cut = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def bandpass(x, lo, hi):
    return onepole_lp(x, hi) - onepole_lp(x, lo)


def norm(x, peak_db=-1.0):
    m = np.max(np.abs(x)) or 1.0
    return x / m * 10 ** (peak_db / 20)


def fade(x, fin=0.004, fout=0.01):
    n_in, n_out = int(SR * fin), int(SR * fout)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def chirp(f0, f1, dur, exp=True):
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / dur) if exp else f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR), t


def whoosh(dur=0.5, lo=300, hi=3500):
    t = t_axis(dur)
    env = np.sin(np.pi * t / dur) ** 1.6
    cut = lo + (hi - lo) * np.sin(np.pi * t / dur)
    return onepole_lp(rs.standard_normal(len(t)), cut) * env


def pop():
    s, t = chirp(480, 1250, 0.09)
    return s * np.exp(-t * 38)


def boing():
    t = t_axis(0.65)
    f = 210 * (1 + 0.32 * np.exp(-4 * t) * np.sin(2 * np.pi * 15 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.exp(-t * 4.5)


def thud():
    t = t_axis(0.4)
    f = 80 * np.exp(-t * 3) + 40
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    click = onepole_lp(rs.standard_normal(len(t)), 900) * np.exp(-t * 60) * 0.8
    return body + click


def clang(dur=1.8, bright=1.0):
    t = t_axis(dur)
    partials = [(523, 1.0, 1.9), (1307, 0.6, 1.3), (2213, 0.45, 0.9), (3407, 0.3, 0.6), (4601, 0.2, 0.4), (787, 0.5, 1.5)]
    x = sum(a * np.sin(2 * np.pi * f * t + rs.random() * 6) * np.exp(-t / d) for f, a, d in partials)
    x += onepole_lp(rs.standard_normal(len(t)), 6000 * bright) * np.exp(-t * 45) * 1.2
    return x


def echo(x, delays=(0.09, 0.17, 0.29), gains=(0.5, 0.33, 0.2), tail=0.8):
    out = np.concatenate([x, np.zeros(int(SR * tail))])
    for d, g in zip(delays, gains):
        n = int(SR * d)
        out[n : n + len(x)] += x * g
    return out


def ding():
    t = t_axis(1.4)
    return sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in [(1318.5, 1, 0.9), (2637, 0.4, 0.5), (3955, 0.2, 0.3)])


def fall_whistle(up=False):
    s, t = chirp(1500, 330, 0.95) if not up else chirp(330, 1500, 0.8)
    vib = 1 + 0.02 * np.sin(2 * np.pi * 6 * t)
    env = np.minimum(1, t / 0.05) * np.minimum(1, (t[-1] - t) / 0.08)
    return s * env * vib


def click():
    t = t_axis(0.03)
    return rs.standard_normal(len(t)) * np.exp(-t * 300)


def scrape():
    t = t_axis(0.7)
    x = bandpass(rs.standard_normal(len(t)), 1800, 4200)
    return x * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / 0.7)


def roll():
    t = t_axis(1.6)
    x = onepole_lp(rs.standard_normal(len(t)), 260) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 4.5 * t)))
    ring = 0.15 * np.sin(2 * np.pi * 523 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 4.5 * t))
    return (x + ring) * np.minimum(1, t / 0.1) * np.minimum(1, (1.6 - t) / 0.3)


def sparkle():
    out = np.zeros(int(SR * 0.9))
    for i, f in enumerate([1568, 1976, 2349, 3136, 3951]):
        t = t_axis(0.35)
        blip = np.sin(2 * np.pi * f * t) * np.exp(-t * 14)
        n = int(SR * i * 0.08)
        out[n : n + len(blip)] += blip * (1 - i * 0.12)
    return out


def squeak():
    t = t_axis(0.16)
    f = 900 + 1400 * t / 0.16 + 60 * np.sin(2 * np.pi * 40 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.16)


def step():
    t = t_axis(0.12)
    return onepole_lp(rs.standard_normal(len(t)), 500) * np.exp(-t * 40)


def rumble():
    t = t_axis(1.8)
    return onepole_lp(rs.standard_normal(len(t)), 110) * np.minimum(1, t / 0.3) * np.minimum(1, (1.8 - t) / 0.5)


SFX = {
    'whoosh': lambda: whoosh(0.5),
    'swish': lambda: whoosh(0.28, 900, 6000),
    'pop': pop,
    'boing': boing,
    'thud': thud,
    'clang': clang,
    'clang_far': lambda: echo(onepole_lp(clang(1.6, 0.5), 2500)),
    'ding': ding,
    'fall_whistle': fall_whistle,
    'rise_whistle': lambda: fall_whistle(up=True),
    'click': click,
    'scrape': scrape,
    'roll': roll,
    'sparkle': sparkle,
    'squeak': squeak,
    'step': step,
    'rumble': rumble,
}


def write(path, x):
    x = fade(norm(np.asarray(x, dtype=float)))
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/sfx')
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in SFX.items():
        write(out / f'{name}.wav', fn())
        print('wrote', out / f'{name}.wav')


if __name__ == '__main__':
    main()
