#!/usr/bin/env python3
"""story-ranking-short media helper (SL8-authored). Local only: no network, no installs.

  python3 ranking_media.py overlay --script work/<p>/script.json --out-dir work/<p>/overlay [--w 720 --h 1280]
      [--title-font <file> --menu-font <file>]
      One transparent PNG per item: the hook title and the menu as it stands on that item (lines fill
      bottom-up, a line once written is never removed). Writes overlay.json with the text block's box.
  python3 ranking_media.py cues --clip <clip.mp4> [--impact <s>]
      Audio figures for the clip checks: level of the first 0.3 s against the clip, the strongest
      low-band hits after the first 0.15 s with their times, and the nearest one's distance from the
      expected impact (impact_s in script.json). Figures only (HR14).

Exit 0 written or measured, 1 refused or failed, 2 a font or tool is missing.
"""
import argparse
import json
import os
import subprocess
import sys
import wave

LOOKS = {
    # title fill, title outline, title box, menu fill, menu outline, shadow
    "classic": dict(fill=(255, 255, 255, 255), stroke=(0, 0, 0, 255), box=None, mfill=(255, 255, 255, 255), mstroke=(0, 0, 0, 255), shadow=False),
    "boxed": dict(fill=(0, 0, 0, 255), stroke=None, box=(255, 255, 255, 255), mfill=(255, 255, 255, 255), mstroke=(0, 0, 0, 255), shadow=False),
    "yellow": dict(fill=(255, 212, 0, 255), stroke=(0, 0, 0, 255), box=None, mfill=(255, 255, 255, 255), mstroke=(0, 0, 0, 255), shadow=False),
    "clean": dict(fill=(255, 255, 255, 255), stroke=None, box=None, mfill=(255, 255, 255, 255), mstroke=None, shadow=True),
}
# Safe zones on 9:16 (research fal/falmotiongraphics-dc3541#15): top 8%, right 12%, bottom 25% unusable.
LEFT, RIGHT, TOP, BLOCK_MAX = 0.05, 0.88, 0.09, 0.50


def fc(pattern):
    try:
        f = subprocess.run(["fc-match", "-f", "%{file}", pattern], capture_output=True, text=True, check=True).stdout.strip()
        fam = subprocess.run(["fc-match", "-f", "%{family}", pattern], capture_output=True, text=True, check=True).stdout.strip()
        return f, fam
    except (OSError, subprocess.CalledProcessError):
        return None, None


def is_emoji(c):
    o = ord(c)
    return 0x1F000 <= o <= 0x1FAFF or 0x2600 <= o <= 0x27BF or o in (0xFE0F, 0x200D, 0x2B50, 0x2B55, 0x2B1B, 0x2B1C)


def split_emoji(s):
    """Split a menu or title string into (text, emoji) where emoji is the trailing run of emoji characters.
    Only emoji ranges count, so a title ending in CJK text or in a trade mark keeps it."""
    i = len(s)
    while i > 0 and is_emoji(s[i - 1]):
        i -= 1
    return s[:i].rstrip(), s[i:].strip()


def overlay(a):
    try:
        from PIL import Image, ImageDraw, ImageFont, ImageFilter
    except ImportError:
        print(json.dumps({"ok": False, "error": "Pillow is missing: the machine is broken (HR21)"}))
        return 2
    s = json.load(open(a.script))
    look = LOOKS.get(s.get("look", "classic"))
    if not look:
        print(json.dumps({"ok": False, "error": f"unknown look {s.get('look')}"}))
        return 1
    tf, tfam = (a.title_font, os.path.basename(a.title_font)) if a.title_font else fc("Anton")
    mf, mfam = (a.menu_font, os.path.basename(a.menu_font)) if a.menu_font else fc("Inter:bold")
    if not a.title_font and (not tf or "anton" not in (tfam or "").lower()):
        tf, tfam = fc("DejaVu Sans:bold")
    if not tf or not mf:
        print(json.dumps({"ok": False, "error": "no title or menu font found by fc-match"}))
        return 2
    ef, efam = fc("Noto Color Emoji")
    emoji_ok = bool(ef) and "emoji" in (efam or "").lower()
    warnings = [] if emoji_ok else ["no colour emoji font: emoji are left out of the overlay; say so in the delivery"]
    W, H = a.w, a.h
    items = s["items"]
    n = len(items)
    by_rank = {it["rank"]: it for it in items}
    os.makedirs(a.out_dir, exist_ok=True)

    def text_size(font, t):
        b = font.getbbox(t)
        return b[2] - b[0], b[3] - b[1], b

    def emoji_img(ch, px):
        try:
            ef_ = ImageFont.truetype(ef, 109)
            im = Image.new("RGBA", (160, 140), (0, 0, 0, 0))
            ImageDraw.Draw(im).text((0, 0), ch, font=ef_, embedded_color=True)
            bb = im.getbbox()
            if not bb:
                return None
            im = im.crop(bb)
            return im.resize((max(1, int(im.width * px / im.height)), px))
        except Exception:
            return None

    title_text, title_emoji = split_emoji(s["title"])
    max_w = int(W * 2 * min(0.5 - LEFT, RIGHT - 0.5))
    size = int(H * 0.06)
    while size > int(H * 0.03):
        tfont = ImageFont.truetype(tf, size)
        tw, th, _ = text_size(tfont, title_text)
        if tw + (size if title_emoji and emoji_ok else 0) <= max_w * 0.92:
            break
        size -= 2
    tfont = ImageFont.truetype(tf, size)
    tw0, _, _ = text_size(tfont, title_text)
    if tw0 + (size if title_emoji and emoji_ok else 0) > max_w:
        print(json.dumps({"ok": False, "error": f"title too wide: {tw0} px at the smallest size against {max_w} px; shorten it"}))
        return 1
    msize = max(14, int(H * 0.027))
    mfont = ImageFont.truetype(mf, msize)
    line_h = int(msize * 1.4)
    tw, th, tb = text_size(tfont, title_text)
    block_bottom = TOP * H + th + int(H * 0.02) + n * line_h
    if block_bottom > BLOCK_MAX * H:
        print(json.dumps({"ok": False, "error": f"the text block would reach {block_bottom / H:.0%} of the height; shorten the title or use fewer items"}))
        return 1
    report = {"ok": True, "look": s.get("look"), "title_font": tfam, "menu_font": mfam, "emoji": emoji_ok, "files": [], "warnings": warnings}
    for idx, it in enumerate(items):
        rank = it["rank"]
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        tx = (W - tw - (size if title_emoji and emoji_ok else 0)) // 2
        ty = int(TOP * H)
        sw = max(2, size // 12)
        if look["box"]:
            pad = size // 4
            d.rounded_rectangle([tx - pad, ty - pad + tb[1], tx + tw + pad + (size if title_emoji and emoji_ok else 0), ty + tb[3] + pad], radius=pad, fill=look["box"])
        if look["shadow"]:
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(sh).text((tx + 3, ty + 3), title_text, font=tfont, fill=(0, 0, 0, 160))
            im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)))
        d.text((tx, ty), title_text, font=tfont, fill=look["fill"], stroke_width=sw if look["stroke"] else 0, stroke_fill=look["stroke"])
        if title_emoji and emoji_ok:
            e = emoji_img(title_emoji, int(size * 0.9))
            if e:
                im.alpha_composite(e, (tx + tw + size // 8, ty + tb[1]))
        y = ty + tb[3] + int(H * 0.02)
        x = int(LEFT * W)
        msw = max(1, msize // 10)
        for k in range(1, n + 1):
            src = by_rank[k]
            written = k >= rank
            label = f"{k}. {src['line']}" if written else f"{k}."
            if look["shadow"]:
                sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                ImageDraw.Draw(sh).text((x + 2, y + 2), label, font=mfont, fill=(0, 0, 0, 160))
                im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(2)))
            d.text((x, y), label, font=mfont, fill=look["mfill"], stroke_width=msw if look["mstroke"] else 0, stroke_fill=look["mstroke"])
            lw = text_size(mfont, label)[0]
            if written and src.get("emoji") and emoji_ok:
                e = emoji_img(src["emoji"], msize)
                if e:
                    im.alpha_composite(e, (x + lw + msize // 3, y + msize // 6))
            if x + lw > RIGHT * W:
                report["warnings"].append(f"#{k} line reaches past the right safe edge; shorten it")
            y += line_h
        fp = os.path.join(a.out_dir, f"overlay_{idx + 1:02d}.png")
        im.save(fp)
        bb = im.getbbox()
        report["files"].append({"display": idx + 1, "rank": rank, "file": fp, "lines_written": n - rank + 1,
                                "block_box_pct": [round(bb[0] / W * 100, 1), round(bb[1] / H * 100, 1), round(bb[2] / W * 100, 1), round(bb[3] / H * 100, 1)] if bb else None})
    json.dump(report, open(os.path.join(a.out_dir, "overlay.json"), "w"), indent=2)
    print(json.dumps(report, indent=2))
    return 0


def cues(a):
    try:
        import numpy as np
    except ImportError:
        print(json.dumps({"ok": False, "error": "numpy is missing: the machine is broken (HR21)"}))
        return 2
    tmp = a.clip + ".cues.wav"
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.clip, "-vn", "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", tmp], check=True)
    except (OSError, subprocess.CalledProcessError):
        print(json.dumps({"ok": False, "error": "ffmpeg could not read an audio stream from the clip"}))
        return 1
    with wave.open(tmp) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    os.remove(tmp)
    if x.size < sr // 2:
        print(json.dumps({"ok": False, "error": "audio shorter than 0.5 s"}))
        return 1
    hop = int(sr * 0.01)
    win = hop * 4
    frames = [x[i:i + win] for i in range(0, x.size - win, hop)]
    rms = np.array([np.sqrt(np.mean(f ** 2)) + 1e-9 for f in frames])
    spec = [np.abs(np.fft.rfft(f * np.hanning(win))) for f in frames]
    freqs = np.fft.rfftfreq(win, 1.0 / sr)
    low = np.array([s[(freqs >= 30) & (freqs <= 150)].sum() + 1e-9 for s in spec])
    lowflux = np.maximum(0, np.diff(np.log(low)))
    t = lambda i: round(i * hop / sr, 2)
    head = int(0.3 * sr / hop)
    db = lambda v: round(float(20 * np.log10(v)), 1)
    # Ignore the first 0.15 s: the first clip's frame-0 bass drop is not the boom.
    lo = int(0.15 / (hop / sr))
    masked = lowflux.copy()
    masked[:lo] = 0
    k = int(np.argmax(masked)) + 1
    hits = [(t(k), round(float(lowflux[k - 1]), 2))]
    masked[max(0, k - 31):k + 30] = 0  # a second hit is at least 0.3 s from the first
    k2 = int(np.argmax(masked)) + 1
    if masked[k2 - 1] > 0:
        hits.append((t(k2), round(float(lowflux[k2 - 1]), 2)))
    res = {
        "ok": True, "clip": a.clip, "duration_s": round(x.size / sr, 2),
        "first_0_3s_peak_db_over_median": round(db(rms[:head].max()) - db(np.median(rms)), 1),
        "strongest_low_hit_s": t(k), "strongest_low_hit_jump": round(float(lowflux[k - 1]), 2),
        "low_hits_after_0_15s": [{"s": h[0], "jump": h[1]} for h in hits],
        "silent": bool(rms.max() < 10 ** (-50 / 20)),
        "note": "Figures only. Whether the pop, the boom and the filmer's voice sound right, and whether voices differ between clips, is a listening judgment this script does not make.",
    }
    if a.impact is not None:
        near = min(hits, key=lambda h: abs(h[0] - a.impact))
        res["boom_offset_from_impact_s"] = round(near[0] - a.impact, 2)
        res["boom_hit_s"] = near[0]
    print(json.dumps(res, indent=2))
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    o = sub.add_parser("overlay")
    o.add_argument("--script", required=True)
    o.add_argument("--out-dir", required=True)
    o.add_argument("--w", type=int, default=720)
    o.add_argument("--h", type=int, default=1280)
    o.add_argument("--title-font", help="a font file instead of Anton (a kit may name one)")
    o.add_argument("--menu-font", help="a font file instead of Inter Bold")
    c = sub.add_parser("cues")
    c.add_argument("--clip", required=True)
    c.add_argument("--impact", type=float)
    a = ap.parse_args()
    return overlay(a) if a.cmd == "overlay" else cues(a)


if __name__ == "__main__":
    sys.exit(main())
