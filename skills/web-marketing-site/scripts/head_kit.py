#!/usr/bin/env python3
"""head_kit.py: favicon, touch and manifest icons from one mark (web-marketing-site).

SL8-authored for method WF50-a1 step 22. The mark is the customer's own logo when they have one;
otherwise a typographic monogram set here in a local font (no generated lettering). Never upscales.

  python3 head_kit.py --source logo.png --ground "#14211b" --name "Acme Bakery" --short-name Acme \
      --theme-light "#f3efe6" --theme-dark "#14211b" --out artifacts/<p>/app/public [--small small-glyph.png]
  python3 head_kit.py --monogram AB --font Brand-Bold.ttf --ink "#f3efe6" --ground "#14211b" ... (no logo)

Writes favicon.ico (16/32/48), favicon-32.png, favicon-16.png, apple-touch-icon.png (180, opaque),
icon-192.png, icon-512.png, icon-maskable-512.png (mark inside the 80% safe zone) and
site.webmanifest, then prints the <head> lines as JSON. Exit 0 written; 1 refused (source under
512 px, no font); 2 usage.
"""
import argparse
import json
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print(json.dumps({"error": "Pillow is not importable; the head kit is blocked"}))
    sys.exit(1)


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def monogram(text, font_path, ink, size=1024):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fs = size
    while fs > 32:
        f = ImageFont.truetype(font_path, fs)
        l, t, r, b = d.textbbox((0, 0), text, font=f)
        if r - l <= size * 0.9 and b - t <= size * 0.9:
            break
        fs -= 16
    d.text(((size - (r - l)) / 2 - l, (size - (b - t)) / 2 - t), text, font=f, fill=rgb(ink) + (255,))
    return img


def on_ground(mark, size, ground, fill):
    """Mark scaled so its longer side is fill * size, centred on an opaque ground."""
    canvas = Image.new("RGBA", (size, size), rgb(ground) + (255,))
    bbox = mark.getbbox() or (0, 0, mark.width, mark.height)
    m = mark.crop(bbox)
    scale = fill * size / max(m.width, m.height)
    m = m.resize((max(1, round(m.width * scale)), max(1, round(m.height * scale))), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--source", help="the customer's logo, at least 512 px on its short side")
    src.add_argument("--monogram", help="1-2 letters set in --font when there is no logo")
    ap.add_argument("--font")
    ap.add_argument("--ink", default="#ffffff")
    ap.add_argument("--ground", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--short-name")
    ap.add_argument("--theme-light", required=True)
    ap.add_argument("--theme-dark")
    ap.add_argument("--small", help="a simpler glyph for 16 and 32 px when the full mark turns to noise")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    if a.source:
        mark = Image.open(a.source).convert("RGBA")
        if min(mark.size) < 512:
            print(json.dumps({"refused": f"source is {mark.size[0]}x{mark.size[1]}; the head kit needs 512 px or more (never upscale)"}))
            sys.exit(1)
    else:
        if not a.font or not os.path.exists(a.font):
            print(json.dumps({"refused": "--monogram needs a local --font file"}))
            sys.exit(1)
        mark = monogram(a.monogram, a.font, a.ink)
    small = Image.open(a.small).convert("RGBA") if a.small else mark
    os.makedirs(a.out, exist_ok=True)
    w = {}
    for n, size, m, fill in (("favicon-16.png", 16, small, 0.86), ("favicon-32.png", 32, small, 0.86),
                             ("apple-touch-icon.png", 180, mark, 0.7), ("icon-192.png", 192, mark, 0.8),
                             ("icon-512.png", 512, mark, 0.8), ("icon-maskable-512.png", 512, mark, 0.6)):
        img = on_ground(m, size, a.ground, fill)
        img.convert("RGB").save(os.path.join(a.out, n))
        w[n] = size
    ico = on_ground(small, 48, a.ground, 0.86)
    ico.save(os.path.join(a.out, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    manifest = {"name": a.name, "short_name": a.short_name or a.name, "start_url": "/", "display": "standalone",
                "background_color": a.ground, "theme_color": a.theme_light,
                "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
                          {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
                          {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
    with open(os.path.join(a.out, "site.webmanifest"), "w") as f:
        json.dump(manifest, f, indent=2)
    head = [
        '<link rel="icon" href="/favicon.ico" sizes="48x48">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
        '<link rel="manifest" href="/site.webmanifest">',
        f'<meta name="theme-color" media="(prefers-color-scheme: light)" content="{a.theme_light}">',
    ]
    if a.theme_dark:
        head.append(f'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="{a.theme_dark}">')
    print(json.dumps({"written": sorted(list(w) + ["favicon.ico", "site.webmanifest"]), "head": head,
                      "check": "view favicon-16.png at 1:1; if the mark is noise, rerun with --small"}))


if __name__ == "__main__":
    main()
