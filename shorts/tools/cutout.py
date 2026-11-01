#!/usr/bin/env python3
"""Cut-out helpers for AI-generated props.

  python3 -I tools/cutout.py trim in.png out.png [--margin 12]   # crop to alpha box, print size
  python3 -I tools/cutout.py key  in.png out.png                 # flat background colour -> transparent
  python3 -I tools/cutout.py sheet <dir> out.jpg                 # every PNG on coloured tiles for QA
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def trim(src, dst, margin=12):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im)[:, :, 3]
    ys, xs = np.nonzero(a > 8)
    if len(xs) == 0:
        sys.exit('empty image')
    x0, x1 = max(0, xs.min() - margin), min(im.width, xs.max() + margin + 1)
    y0, y1 = max(0, ys.min() - margin), min(im.height, ys.max() + margin + 1)
    out = im.crop((x0, y0, x1, y1))
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    semi = np.asarray(out)[:, :, 3]
    frac = float(((semi > 20) & (semi < 200)).sum()) / max(1, (semi > 20).sum())
    print(f'{dst}: {out.width}x{out.height} (offset {x0},{y0}); semi-transparent fraction {frac:.3f}' + ('  <-- check for see-through fills' if frac > 0.08 else ''))


def key(src, dst):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((im - bg) ** 2).sum(axis=2))
    near = dist < 60
    # flood fill from the border through "near background" pixels
    mask = np.zeros(near.shape, bool)
    mask[0, :] = near[0, :]
    mask[-1, :] = near[-1, :]
    mask[:, 0] = near[:, 0]
    mask[:, -1] = near[:, -1]
    while True:
        grown = mask.copy()
        grown[1:, :] |= mask[:-1, :]
        grown[:-1, :] |= mask[1:, :]
        grown[:, 1:] |= mask[:, :-1]
        grown[:, :-1] |= mask[:, 1:]
        grown &= near
        if (grown == mask).all():
            break
        mask = grown
    alpha = np.where(mask, 0, 255).astype(np.float32)
    # soften a 2 px edge band by colour distance
    edge = np.zeros_like(mask)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        edge |= np.roll(mask, (dy, dx), axis=(0, 1)) & ~mask
    alpha[edge] = np.clip(dist[edge] / 120.0, 0, 1) * 255
    out = np.dstack([im, alpha]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(dst)
    print('keyed', dst, 'background', bg.astype(int).tolist())


def sheet(folder, dst, tile=360):
    files = sorted(Path(folder).glob('*.png'))
    if not files:
        sys.exit('no PNGs')
    colors = [(255, 105, 180), (60, 200, 120), (40, 40, 40)]
    out = Image.new('RGB', (tile * len(colors), tile * len(files) + 24 * len(files)), 'white')
    dr = ImageDraw.Draw(out)
    for r, f in enumerate(files):
        im = Image.open(f).convert('RGBA')
        im.thumbnail((tile - 20, tile - 20))
        for c, col in enumerate(colors):
            bg = Image.new('RGBA', (tile, tile), col + (255,))
            bg.alpha_composite(im, ((tile - im.width) // 2, (tile - im.height) // 2))
            out.paste(bg.convert('RGB'), (c * tile, r * (tile + 24) + 24))
        dr.text((6, r * (tile + 24) + 6), f.name, fill='black')
    out.save(dst, quality=88)
    print('wrote', dst)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'trim':
        m = int(sys.argv[sys.argv.index('--margin') + 1]) if '--margin' in sys.argv else 12
        trim(sys.argv[2], sys.argv[3], m)
    elif cmd == 'key':
        key(sys.argv[2], sys.argv[3])
    elif cmd == 'sheet':
        sheet(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)
