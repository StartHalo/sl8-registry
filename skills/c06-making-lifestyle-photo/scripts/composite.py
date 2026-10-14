#!/usr/bin/env python3
"""Pixel-exact lifestyle composite (kit-product-lifestyle step 11).

Pastes the untouched product cutout onto the empty setting, with a contact
shadow made from the cutout's blurred alpha, offset away from the light.

usage: composite.py CUTOUT SETTING OUT [--scale 0] [--x 0.5] [--y 0.8]
                    [--light left|right|top] [--shadow 0.45]
  --scale  product height as a share of the setting height; 0 keeps the
           cutout's own pixels (no resampling unless it cannot fit)
  --x      product centre as a share of the setting width
  --y      where the product stands (its base) as a share of the setting height
  --light  side the key light comes from (the brief's direction)
  --shadow shadow opacity, 0 to 1
Prints the measured w, h, format, product box and resampled as JSON.
"""
import argparse
import json
import sys

from PIL import Image, ImageFilter, ImageOps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cutout')
    ap.add_argument('setting')
    ap.add_argument('out')
    ap.add_argument('--scale', type=float, default=0.0)
    ap.add_argument('--x', type=float, default=0.5)
    ap.add_argument('--y', type=float, default=0.8)
    ap.add_argument('--light', choices=['left', 'right', 'top'], default='left')
    ap.add_argument('--shadow', type=float, default=0.45)
    a = ap.parse_args()

    bg = ImageOps.exif_transpose(Image.open(a.setting)).convert('RGBA')
    fg = ImageOps.exif_transpose(Image.open(a.cutout)).convert('RGBA')
    box = fg.split()[-1].getbbox()
    if box is None:
        sys.exit('cutout has no opaque pixels')
    fg = fg.crop(box)

    w, h = fg.size
    if a.scale > 0:
        h = max(1, round(bg.height * a.scale))
        w = max(1, round(fg.width * h / fg.height))
    if w > bg.width * 0.9 or h > bg.height:
        k = min(bg.width * 0.9 / w, bg.height / h)
        w, h = max(1, round(w * k)), max(1, round(h * k))
    resampled = (w, h) != fg.size
    if resampled:
        fg = fg.resize((w, h), Image.LANCZOS)

    left = min(max(0, round(bg.width * a.x - w / 2)), bg.width - w)
    top = min(max(0, round(bg.height * a.y - h)), bg.height - h)

    alpha = fg.split()[-1]
    sh_h = max(2, h // 10)
    pad = max(4, w // 8)
    mask = Image.new('L', (w + 2 * pad, sh_h + 2 * pad), 0)
    mask.paste(alpha.resize((w, sh_h), Image.LANCZOS), (pad, pad))
    mask = mask.filter(ImageFilter.GaussianBlur(pad / 2))
    op = max(0.0, min(1.0, a.shadow))
    mask = mask.point(lambda v: int(v * op))
    shadow = Image.new('RGBA', mask.size, (0, 0, 0, 255))
    shadow.putalpha(mask)
    dx = {'left': 1, 'right': -1, 'top': 0}[a.light] * round(w * 0.06)

    layer = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    layer.paste(shadow, (left - pad + dx, top + h - sh_h // 2 - pad))
    out = Image.alpha_composite(bg, layer)
    prod = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    prod.paste(fg, (left, top))
    out = Image.alpha_composite(out, prod).convert('RGB')
    out.save(a.out, 'PNG')
    print(json.dumps({'w': out.width, 'h': out.height, 'format': 'png',
                      'product_box': [left, top, w, h], 'resampled': resampled}))


if __name__ == '__main__':
    main()
