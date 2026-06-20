#!/usr/bin/env python3
"""Compose the AB-723 altered+original pairing into one image.

Why: AB-723 requires the unaltered original to appear immediately adjacent to the altered version
(on the MLS, right before/after it). When the agent can only attach one file, a side-by-side
ORIGINAL-then-ALTERED composite satisfies the "immediately before/after" intent and makes the
disclosure unmistakable.

Usage: python3 pair.py --altered <path> --original <path> [--out <path>]
Layout: unaltered ORIGINAL on the left, ALTERED on the right, equal height, labelled.
Prints PAIR::<path>.
"""
import argparse
import os


def _font(size):
    from PIL import ImageFont
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _label(draw, x, y, text, font):
    pad = 6
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        tw, th = r - l, b - t
    except Exception:
        tw, th = int(draw.textlength(text, font=font)), 16
    draw.rectangle([x, y, x + tw + 2 * pad, y + th + 2 * pad], fill=(0, 0, 0, 185))
    draw.text((x + pad, y + pad), text, font=font, fill=(255, 255, 255))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--altered", required=True)
    ap.add_argument("--original", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    from PIL import Image, ImageDraw

    o = Image.open(a.original).convert("RGB")
    al = Image.open(a.altered).convert("RGB")
    H = min(o.height, al.height, 1080)

    def rz(im):
        return im.resize((max(1, int(im.width * H / im.height)), H))

    o, al = rz(o), rz(al)
    gap = 12
    canvas = Image.new("RGB", (o.width + al.width + gap, H), (255, 255, 255))
    canvas.paste(o, (0, 0))
    canvas.paste(al, (o.width + gap, 0))
    d = ImageDraw.Draw(canvas, "RGBA")
    font = _font(max(16, H // 36))
    _label(d, 10, 10, "ORIGINAL (unaltered)", font)
    _label(d, o.width + gap + 10, 10, "ALTERED", font)

    out = a.out or os.path.splitext(a.altered)[0] + "-pair.jpg"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    canvas.save(out, quality=90)
    print("PAIR::" + out)


if __name__ == "__main__":
    main()
