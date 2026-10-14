#!/usr/bin/env python3
"""Composite supplied copy and/or a logo onto the chosen still (step 14).

Exact text and logos never pass through a generative model (HR10).
usage: overlay.py BASE OUT [--text 'exact copy'] [--font TTF] [--logo LOGO.png]
                  [--text-box x,y,w,h] [--logo-box x,y,w,h] [--color #RRGGBB]
Boxes are shares of the frame (0 to 1). Exit 3 when text is asked for and no
TTF font is found. Prints the measured w, h and format as JSON.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

FONTS = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
]


def box(spec, W, H):
    x, y, w, h = (float(v) for v in spec.split(','))
    return round(x * W), round(y * H), max(1, round(w * W)), max(1, round(h * H))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('base')
    ap.add_argument('out')
    ap.add_argument('--text')
    ap.add_argument('--font')
    ap.add_argument('--logo')
    ap.add_argument('--text-box', default='0.06,0.06,0.5,0.12')
    ap.add_argument('--logo-box', default='0.78,0.84,0.16,0.1')
    ap.add_argument('--color', default='#ffffff')
    a = ap.parse_args()

    img = ImageOps.exif_transpose(Image.open(a.base)).convert('RGBA')
    W, H = img.size
    if a.logo:
        logo = ImageOps.exif_transpose(Image.open(a.logo)).convert('RGBA')
        bx, by, bw, bh = box(a.logo_box, W, H)
        logo.thumbnail((bw, bh), Image.LANCZOS)
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        layer.paste(logo, (bx + (bw - logo.width) // 2, by + (bh - logo.height) // 2))
        img = Image.alpha_composite(img, layer)
    if a.text:
        path = a.font or next((f for f in FONTS if os.path.exists(f)), None)
        if not path:
            print(json.dumps({'error': 'no TTF font found'}))
            sys.exit(3)
        bx, by, bw, bh = box(a.text_box, W, H)
        layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        size = bh
        while True:
            font = ImageFont.truetype(path, size)
            l, t, r, b = draw.textbbox((0, 0), a.text, font=font)
            if (r - l <= bw and b - t <= bh) or size <= 8:
                break
            size -= 2
        draw.text((bx - l, by - t), a.text, font=font, fill=a.color)
        img = Image.alpha_composite(img, layer)
    out = img.convert('RGB')
    out.save(a.out, 'PNG')
    print(json.dumps({'w': out.width, 'h': out.height, 'format': 'png'}))


if __name__ == '__main__':
    main()
