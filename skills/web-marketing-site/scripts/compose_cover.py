#!/usr/bin/env python3
"""compose_cover.py: launch cover and OG cards from one generated scene (web-marketing-site).

SL8-authored for method WF50-a1 step 23. The model never draws cover text: every letter is set here,
with a local font, as the last layer. One run writes three files from the same scene:

  <slug>_cover.png     3:2 full-bleed scene + type lockup, 1800x1200 for art 1800 px or wider, else the art's own width (1536x1024 from a GPT Image 1536x1024 scene): never enlarged
  <slug>_og.png        1200x800, palette frame + stadium window + 4 corner dots + lockup
  <slug>_og_wide.png   1200x630 (1.91:1), the same card; this is the site's og:image

  python3 compose_cover.py --art scene.png --slug acme --title "Acme" --frame "#2f4b3a" \
      --font /usr/share/fonts/.../Brand-Bold.ttf [--wordmark logo.png | --wordmark-text "Acme"] \
      [--cutout scene-cutout.png] [--wide-art wide.png] [--cta "Open the shop"] \
      [--text-pos left|right|center] [--text-y 0.1] [--text-width 0.5] --out-dir artifacts/<p>/cover

Prints one JSON line of figures. Exit 0 written; 1 refused (art under 1500 px wide, more than two
title lines, a lime frame, a title that cannot fit, a missing font); 2 usage.
"""
import argparse
import colorsys
import json
import os
import subprocess
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # the machine is broken: report, never install
    print(json.dumps({"error": "Pillow is not importable; composition is blocked"}))
    sys.exit(1)

MIN_ART_WIDTH = 1500


def fail(msg, **fig):
    print(json.dumps({"refused": msg, **fig}))
    sys.exit(1)


def hex_rgb(h):
    h = h.lstrip("#")
    if len(h) != 6:
        fail(f"colour {h!r} is not #rrggbb")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def is_lime(rgb):
    hue, sat, val = colorsys.rgb_to_hsv(*[c / 255 for c in rgb])
    return 55 <= hue * 360 <= 90 and sat > 0.55 and val > 0.7


def cover_fit(img, size):
    w, h = size
    scale = max(w / img.width, h / img.height)
    r = img.resize((max(w, round(img.width * scale)), max(h, round(img.height * scale))), Image.LANCZOS)
    left = (r.width - w) // 2
    top = (r.height - h) // 2
    return r.crop((left, top, left + w, top + h)), scale, left, top


def default_font():
    try:
        out = subprocess.run(["fc-match", "-f", "%{file}", "sans:bold"], capture_output=True, text=True, check=True)
        return out.stdout.strip() or None
    except (OSError, subprocess.CalledProcessError):
        return None


def wrap_title(title, font, max_w, draw):
    if "\\n" in title or "\n" in title:
        return title.replace("\\n", "\n").split("\n")
    words = title.split()
    if draw.textlength(title, font=font) <= max_w or len(words) == 1:
        return [title]
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        width = max(draw.textlength(a, font=font), draw.textlength(b, font=font))
        if best is None or width < best[0]:
            best = (width, [a, b])
    return best[1]


def lockup(canvas, args, box):
    """Draws wordmark, title and optional CTA pill inside box (x, y, w, h). Returns figures."""
    x0, y0, bw, bh = box
    draw = ImageDraw.Draw(canvas)
    size = int(bh * 0.42)
    lines = []
    font = None
    while size >= 18:
        font = ImageFont.truetype(args.font, size)
        lines = wrap_title(args.title, font, bw, draw)
        widths = [draw.textlength(line, font=font) for line in lines]
        if len(lines) <= 2 and max(widths) <= bw and size * 1.02 * len(lines) <= bh * 0.72:
            break
        size -= 2
    if len(lines) > 2:
        fail("the title needs more than two lines; shorten og_title", lines=len(lines))
    if size < 18:
        fail("the title cannot fit the text block at a legible size; widen --text-width or shorten the title")
    cap = font.getbbox("H")[3] - font.getbbox("H")[1]
    mark_h = max(10, cap // 3)
    y = y0
    align = args.text_pos

    def place_x(w):
        if align == "center":
            return x0 + (bw - w) // 2
        if align == "right":
            return x0 + bw - w
        return x0

    mark_w = 0
    if args.wordmark:
        mark = Image.open(args.wordmark).convert("RGBA")
        mark = mark.resize((max(1, round(mark.width * mark_h / mark.height)), mark_h), Image.LANCZOS)
        mark_w = mark.width
        canvas.alpha_composite(mark, (place_x(mark.width), y))
        y += mark_h + int(cap * 0.45)
    elif args.wordmark_text:
        mf = ImageFont.truetype(args.font, int(mark_h * 1.35))
        mark_w = int(draw.textlength(args.wordmark_text, font=mf))
        draw.text((place_x(mark_w), y), args.wordmark_text, font=mf, fill=(255, 255, 255, 255))
        y += mark_h + int(cap * 0.45)
    line_h = int(size * 1.02)
    for line in lines:
        w = int(draw.textlength(line, font=font))
        draw.text((place_x(w), y), line, font=font, fill=(255, 255, 255, 255))
        y += line_h
    if args.cta:
        pf = ImageFont.truetype(args.font, max(14, int(size * 0.16)))
        tw = int(draw.textlength(args.cta, font=pf))
        ph = int(pf.size * 2.1)
        pw = tw + ph
        px = place_x(pw)
        y += int(cap * 0.35)
        draw.rounded_rectangle((px, y, px + pw, y + ph), radius=ph // 2, outline=(255, 255, 255, 255), width=max(2, ph // 14))
        draw.text((px + ph // 2, y + (ph - pf.size) // 2 - 2), args.cta, font=pf, fill=(255, 255, 255, 255))
        y += ph
    return {"title_px": size, "title_cap_px": cap, "title_lines": len(lines), "wordmark_px": mark_h if (args.wordmark or args.wordmark_text) else 0,
            "title_to_wordmark": round(cap / mark_h, 2), "lockup_bottom": y - y0, "wordmark_w": mark_w}


def text_box(size, args):
    w, h = size
    bw = int(w * args.text_width)
    x = int(w * 0.07) if args.text_pos == "left" else (w - bw - int(w * 0.07) if args.text_pos == "right" else (w - bw) // 2)
    return (x, int(h * args.text_y), bw, int(h * 0.62))


def card(art, cutout, size, frame, args):
    w, h = size
    canvas = Image.new("RGBA", size, frame + (255,))
    m = int(min(w, h) * 0.075)
    win = (m, m, w - m, h - m)
    ww, wh = win[2] - win[0], win[3] - win[1]
    fitted, scale, left, top = cover_fit(art, (ww, wh))
    mask = Image.new("L", (ww, wh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, ww - 1, wh - 1), radius=min(ww, wh) // 2, fill=255)
    canvas.paste(fitted, (win[0], win[1]), mask)
    broke_out = False
    if cutout is not None:
        c = cutout.resize((round(cutout.width * scale), round(cutout.height * scale)), Image.LANCZOS)
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        layer.alpha_composite(c, (win[0] - left, win[1] - top))
        canvas.alpha_composite(layer)
        broke_out = True
    d = ImageDraw.Draw(canvas)
    r = max(4, m // 6)
    for cx, cy in ((m // 2, m // 2), (w - m // 2, m // 2), (m // 2, h - m // 2), (w - m // 2, h - m // 2)):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))
    figs = lockup(canvas, args, text_box(size, args))  # text is the last layer
    return canvas, {**figs, "break_out": broke_out}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--art", required=True)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--frame", required=True, help="frame colour from the locked palette")
    ap.add_argument("--font")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--wordmark", help="the customer's own logo file (PNG with alpha)")
    g.add_argument("--wordmark-text", help="brand name set in the font when there is no logo file")
    ap.add_argument("--cutout", help="subject cutout aligned to --art (alpha is the mask) for the OG break-out")
    ap.add_argument("--wide-art", help="1.91:1 art for the wide card; default: the cover art")
    ap.add_argument("--cta")
    ap.add_argument("--text-pos", choices=["left", "right", "center"], default="left")
    ap.add_argument("--text-y", type=float, default=0.1)
    ap.add_argument("--text-width", type=float, default=0.5)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()
    args.font = args.font or default_font()
    if not args.font or not os.path.exists(args.font):
        fail("no local font file; composition is blocked (report it, never download one)")
    frame = hex_rgb(args.frame)
    if is_lime(frame):
        fail("the frame colour is in the acid lime family; pick another palette colour", frame=args.frame)
    art = Image.open(args.art).convert("RGBA")
    if art.width < MIN_ART_WIDTH:
        fail(f"art is {art.width} px wide; regenerate it at {MIN_ART_WIDTH} px or more, never enlarge it", art_width=art.width)
    cutout = Image.open(args.cutout).convert("RGBA") if args.cutout else None
    if cutout is not None and cutout.size != art.size:
        fail("the cutout must have the art's exact size (cut it from the same file)", art=art.size, cutout=cutout.size)
    os.makedirs(args.out_dir, exist_ok=True)
    out = {}
    cw = min(1800, art.width) // 3 * 3  # 3:2, never larger than the art
    csize = (cw, cw * 2 // 3)
    cover, _, _, _ = cover_fit(art, csize)
    figs = lockup(cover, args, text_box(csize, args))
    p = os.path.join(args.out_dir, f"{args.slug}_cover.png")
    cover.convert("RGB").save(p)
    out["cover"] = {"file": p, **figs}
    og, figs = card(art, cutout, (1200, 800), frame, args)
    p = os.path.join(args.out_dir, f"{args.slug}_og.png")
    og.convert("RGB").save(p)
    out["og"] = {"file": p, **figs}
    wide_art = Image.open(args.wide_art).convert("RGBA") if args.wide_art else art
    wide, figs = card(wide_art, cutout if not args.wide_art else None, (1200, 630), frame, args)
    p = os.path.join(args.out_dir, f"{args.slug}_og_wide.png")
    wide.convert("RGB").save(p)
    out["og_wide"] = {"file": p, **figs}
    ratio_ok = all(v["title_to_wordmark"] >= 3 for v in out.values() if v["wordmark_px"])
    print(json.dumps({"art_width": art.width, "font": args.font, "title_at_least_3x_wordmark": ratio_ok, **out}))
    sys.exit(0 if ratio_ok else 1)


if __name__ == "__main__":
    main()
