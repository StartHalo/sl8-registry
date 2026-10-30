#!/usr/bin/env python3
"""Exact hook text on a cover, composited locally (HR10: exact text never passes through a model).

  cover_text.py --image work/<p>/cover_clean.png --text "The ocean nobody has seen" \
      --out artifacts/<p>/final/cover.jpg [--position bottom|top|center] [--font-file <ttf>]

Fits the hook on at most two lines inside 90% of the width, white face with a dark stroke, and
writes a 16:9 JPEG (centre-cropped when the render is another shape). Default face: Anton through
fontconfig; a kit or brief may name another. Exit 0 written; 1 the text does not fit; 2 bad input.
"""
import argparse, json, subprocess, sys

sys.dont_write_bytecode = True


def font_path(name, exact=False):
    """fc-match always answers with the nearest face; exact=True accepts it only when the family is the one asked for."""
    fmt = "%{family}|%{file}" if exact else "%{file}"
    try:
        r = subprocess.run(["fc-match", "-f", fmt, name], capture_output=True, text=True)
    except OSError:
        return None
    out = r.stdout.strip() if r.returncode == 0 else ""
    if not out:
        return None
    if exact:
        fam, _, path = out.partition("|")
        return path if name.split(":")[0].lower() in fam.lower().split(",") or name.split(":")[0].lower() in fam.lower() else None
    return out


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--image", required=True)
    p.add_argument("--text", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--position", choices=["bottom", "top", "center"], default="bottom")
    p.add_argument("--font-file")
    p.add_argument("--font", default="Anton")
    a = p.parse_args()
    from PIL import Image, ImageDraw, ImageFont
    words = a.text.split()
    if not 1 <= len(words) <= 8:
        print(json.dumps({"ok": False, "error": "a hook is 3-6 words (8 at most)"}))
        return 1
    img = Image.open(a.image).convert("RGB")
    W, H = img.size
    tw, th = (W, round(W * 9 / 16)) if W / H < 16 / 9 else (round(H * 16 / 9), H)
    img = img.crop(((W - tw) // 2, (H - th) // 2, (W - tw) // 2 + tw, (H - th) // 2 + th))
    W, H = img.size
    notes = []
    ff = a.font_file or font_path(a.font, exact=True)
    if not ff:
        notes.append(f"{a.font} is not installed: the nearest face was used")
        ff = font_path("DejaVu Sans:bold")
    if not ff:
        print(json.dumps({"ok": False, "error": "no font found through fontconfig"}))
        return 2
    if any(ord(ch) > 0x24F and ch.isalpha() for ch in a.text):
        notes.append("the hook has non-Latin letters and the default face is Latin: pass --font-file for that script and look at the cover")
    draw = ImageDraw.Draw(img)
    best = None
    splits = [[a.text]] + [[" ".join(words[:k]), " ".join(words[k:])] for k in range(1, len(words))]
    for size in range(int(H * 0.22), int(H * 0.06), -2):
        font = ImageFont.truetype(ff, size)
        stroke = max(2, size // 14)
        for lines in splits:
            ws = [draw.textbbox((0, 0), ln, font=font, stroke_width=stroke) for ln in lines]
            if max(b[2] - b[0] for b in ws) <= W * 0.90:
                best = (font, stroke, lines, ws)
                break
        if best:
            break
    if not best:
        print(json.dumps({"ok": False, "error": "the hook does not fit at a readable size: shorten it"}))
        return 1
    font, stroke, lines, ws = best
    gap = int(font.size * 0.12)
    block = sum(b[3] - b[1] for b in ws) + gap * (len(lines) - 1)
    y = {"top": int(H * 0.07), "center": (H - block) // 2, "bottom": H - block - int(H * 0.08)}[a.position]
    for ln, b in zip(lines, ws):
        x = (W - (b[2] - b[0])) // 2 - b[0]
        draw.text((x, y - b[1]), ln, font=font, fill=(255, 255, 255), stroke_width=stroke, stroke_fill=(12, 12, 12))
        y += (b[3] - b[1]) + gap
    img.save(a.out, quality=92)
    print(json.dumps({"ok": True, "out": a.out, "size": [W, H], "lines": lines, "font": ff, "font_px": font.size, "notes": notes}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
