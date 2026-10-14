#!/usr/bin/env python3
"""Composite the user's exact copy and an optional logo into the empty safe zone of a clean ad frame.

Usage: composite_copy.py --in IN.png --out OUT.png --side right|top [--copy "line" ...] [--font TTF|default] [--logo PNG]
The copy is drawn word for word. The input frame is never modified.
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageStat


def load_font(path, size):
    if path and path != "default" and os.path.isfile(path):
        return ImageFont.truetype(path, size), path, False
    try:
        return ImageFont.load_default(size=size), "pillow-default", True
    except TypeError:
        return ImageFont.load_default(), "pillow-default-fixed-size", True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--copy", action="append", default=[])
    ap.add_argument("--side", choices=["right", "top"], default="right")
    ap.add_argument("--font", default=None)
    ap.add_argument("--logo", default=None)
    a = ap.parse_args()
    if os.path.abspath(a.src) == os.path.abspath(a.out):
        sys.exit("refusing to overwrite the clean frame")

    im = ImageOps.exif_transpose(Image.open(a.src)).convert("RGBA")
    W, H = im.size
    box = (int(W * 0.60), 0, W, H) if a.side == "right" else (0, 0, W, int(H * 0.40))
    bw, bh = box[2] - box[0], box[3] - box[1]
    pad = int(min(bw, bh) * 0.08)
    x0, y0 = box[0] + pad, box[1] + pad
    iw, ih = bw - 2 * pad, bh - 2 * pad

    lum = ImageStat.Stat(im.crop(box).convert("L")).mean[0]
    fill = (20, 20, 20, 255) if lum > 140 else (250, 250, 250, 255)

    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    logo_h = 0
    logo = None
    if a.logo:
        logo = ImageOps.exif_transpose(Image.open(a.logo)).convert("RGBA")
        s = min(iw * 0.5 / logo.width, ih * 0.2 / logo.height)
        logo = logo.resize((max(1, int(logo.width * s)), max(1, int(logo.height * s))), Image.LANCZOS)
        logo_h = logo.height + pad

    size = max(8, bh // 4)
    used, flagged, font = None, False, None
    while a.copy:
        font, used, flagged = load_font(a.font, size)
        boxes = [d.textbbox((0, 0), line, font=font) for line in a.copy]
        widths = [b[2] - b[0] for b in boxes]
        heights = [b[3] - b[1] for b in boxes]
        total = sum(heights) + int(size * 0.3) * (len(a.copy) - 1)
        if (max(widths) <= 0.9 * bw and total <= ih - logo_h) or size <= 8 or used == "pillow-default-fixed-size":
            break
        size = int(size * 0.92)

    y = y0
    for line in a.copy:
        b = d.textbbox((0, 0), line, font=font)
        d.text((x0 - b[0], y - b[1]), line, font=font, fill=fill)
        y += (b[3] - b[1]) + int(size * 0.3)

    out = Image.alpha_composite(im, layer)
    if logo is not None:
        out.alpha_composite(logo, (x0, box[3] - pad - logo.height))

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    out.save(a.out, "PNG")
    print(json.dumps({"out": a.out, "font": used, "size": size if a.copy else None,
                      "default_font_flag": flagged, "side": a.side, "box": box}))


if __name__ == "__main__":
    main()
