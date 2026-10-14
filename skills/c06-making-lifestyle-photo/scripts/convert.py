#!/usr/bin/env python3
"""Normalise a product attachment to an upright PNG (kit-product-lifestyle step 3).

usage: convert.py SRC OUT.png [--max-long 2048]
Applies the EXIF orientation (ImageOps.exif_transpose), opens HEIC (pillow_heif)
and RAW (rawpy), writes PNG. When the PNG is over 3 MB (the data-URI inline
limit) the long side is capped at --max-long, then stepped down until it fits.
Prints w, h, format, bytes, orientation_in and resized as JSON for the tool row.
"""
import argparse
import json
import os
from pathlib import Path

from PIL import Image, ImageOps

RAW = {'.dng', '.cr2', '.cr3', '.nef', '.arw', '.raf', '.orf', '.rw2'}
LIMIT = 3 * 1024 * 1024


def load(src):
    ext = Path(src).suffix.lower()
    if ext in RAW:
        import rawpy
        with rawpy.imread(src) as raw:
            return Image.fromarray(raw.postprocess(use_camera_wb=True, output_bps=8)), 1
    if ext in ('.heic', '.heif'):
        import pillow_heif
        pillow_heif.register_heif_opener()
    im = Image.open(src)
    orient = im.getexif().get(274, 1)
    return ImageOps.exif_transpose(im), orient


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--max-long', type=int, default=2048)
    a = ap.parse_args()

    im, orient = load(a.src)
    has_alpha = im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info
    im = im.convert('RGBA' if has_alpha else 'RGB')
    resized = False
    im.save(a.out, 'PNG')
    if os.path.getsize(a.out) > LIMIT and max(im.size) > a.max_long:
        im.thumbnail((a.max_long, a.max_long), Image.LANCZOS)
        resized = True
        im.save(a.out, 'PNG')
    while os.path.getsize(a.out) > LIMIT and max(im.size) > 512:
        im = im.resize((max(1, round(im.width * 0.85)), max(1, round(im.height * 0.85))), Image.LANCZOS)
        resized = True
        im.save(a.out, 'PNG')
    print(json.dumps({'w': im.width, 'h': im.height, 'format': 'png',
                      'bytes': os.path.getsize(a.out), 'orientation_in': orient,
                      'resized': resized}))


if __name__ == '__main__':
    main()
