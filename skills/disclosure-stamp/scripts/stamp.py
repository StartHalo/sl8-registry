#!/usr/bin/env python3
"""Stamp a conspicuous AB-723 "digitally altered" disclosure caption onto listing media.

Why this exists: California AB-723 (and every major MLS) requires altered listing media to carry a
clear-and-conspicuous "digitally altered" statement. This stamps that statement legibly without
obstructing the room, using the wording the rule expects per alteration type.

Usage:
  python3 stamp.py --media <path> --type <alteration-type> [--out <path>] [--jurisdiction CA-AB723]

Alteration type -> caption (see ../references/disclosure-formats.md):
  virtual-staging                      -> "Virtually Staged"
  twilight | sky | declutter | restyle -> "Digitally Altered"
  renovation-concept                   -> "Conceptual Rendering - Not Actual Condition"

Images (.png/.jpg/.jpeg/.webp): draws a semi-opaque bar bottom-left with white text.
Video (.mp4/.mov/.webm): prints the first-frame card text + a ready ffmpeg drawtext command
  (kept as a suggestion so callers control re-encode cost).

Prints machine-readable lines: STAMPED::<path>, CAPTION::<text>, or CARD_TEXT::<text> for video.
"""
import argparse
import os
import sys

CAPTIONS = {
    "virtual-staging": "Virtually Staged",
    "twilight": "Digitally Altered",
    "sky": "Digitally Altered",
    "declutter": "Digitally Altered",
    "restyle": "Digitally Altered",
    "renovation-concept": "Conceptual Rendering - Not Actual Condition",
}
VIDEO_CARD = "Video created from listing photos using AI motion technology"
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/sl8-webfonts/Inter-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size):
    from PIL import ImageFont
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _text_wh(draw, text, font):
    try:
        l, t, r, b = draw.textbbox((0, 0), text, font=font)
        return r - l, b - t
    except Exception:
        return int(draw.textlength(text, font=font)), 16


def stamp_image(media, caption, out):
    from PIL import Image, ImageDraw
    img = Image.open(media).convert("RGBA")
    w, h = img.size
    fs = max(20, w // 38)               # scales with width; legible on phone + desktop
    font = _font(fs)
    bar = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(bar)
    tw, th = _text_wh(d, caption, font)
    pad = max(8, w // 120)
    d.rectangle([0, h - th - 2 * pad, tw + 2 * pad, h], fill=(0, 0, 0, 165))
    d.text((pad, h - th - pad - max(2, th // 8)), caption, font=font, fill=(255, 255, 255, 255))
    Image.alpha_composite(img, bar).convert("RGB").save(out, quality=92)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--media", required=True)
    ap.add_argument("--type", dest="atype", default="virtual-staging")
    ap.add_argument("--out")
    ap.add_argument("--jurisdiction", default="CA-AB723")
    a = ap.parse_args()

    caption = CAPTIONS.get(a.atype, "Digitally Altered")
    ext = os.path.splitext(a.media)[1].lower()
    stem = os.path.splitext(os.path.basename(a.media))[0]
    out = a.out or os.path.join(os.path.dirname(a.media) or ".", "disclosed",
                                stem + "-disclosed" + (ext if ext in (".png", ".jpg", ".jpeg") else ".jpg"))
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)

    if ext in (".mp4", ".mov", ".webm", ".m4v"):
        ff = ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        print("VIDEO: first-frame disclosure card required.")
        print("CARD_TEXT::" + VIDEO_CARD)
        print("FFMPEG_SUGGESTION:: ffmpeg -i \"%s\" -vf \"drawtext=fontfile=%s:text='%s':"
              "fontcolor=white:fontsize=h/22:box=1:boxcolor=black@0.6:boxborderw=12:x=20:y=20:"
              "enable='lt(t,3)'\" -c:a copy \"%s\"" % (a.media, ff, VIDEO_CARD, out))
        return

    try:
        path = stamp_image(a.media, caption, out)
    except ImportError:
        print("ERROR: Pillow not installed. Run scripts/ensure-pillow.sh first.", file=sys.stderr)
        sys.exit(3)
    print("STAMPED::" + path)
    print("CAPTION::" + caption)


if __name__ == "__main__":
    main()
