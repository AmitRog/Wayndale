#!/usr/bin/env python3
"""Grid of stills (from scripts/render.mjs --stills) with time labels: one image to review every beat.

  python3 -I tools/contact_sheet.py out/stills/<id> out/<id>-sheet.jpg
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main(src, dst, cols=5, w=270):
    files = sorted(Path(src).glob('*.png'), key=lambda p: float(p.stem.split('_')[-1]))
    if not files:
        sys.exit('no stills found')
    ims = [Image.open(p).convert('RGB') for p in files]
    h = int(ims[0].height * w / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * (h + 30)), 'white')
    dr = ImageDraw.Draw(sheet)
    for i, (im, p) in enumerate(zip(ims, files)):
        x, y = (i % cols) * w, (i // cols) * (h + 30)
        sheet.paste(im.resize((w, h)), (x, y + 30))
        dr.text((x + 6, y + 8), f't={float(p.stem.split("_")[-1]):.2f}s', fill='black')
    sheet.save(dst, quality=88)
    print('wrote', dst)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
