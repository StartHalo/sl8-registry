#!/usr/bin/env python3
"""
resize-variants.py — DETERMINISTIC per-channel resizer (Pillow, no model).

Takes ONE master creative and produces the exact channel canvases by cropping/padding
to the target aspect, then resizing to the exact pixel spec. This is the highest-ROI,
lowest-risk part of the bot: zero generation cost, zero re-imagining drift. The text
that the text-capable model already rendered is preserved verbatim — we never regenerate
to change size.

Channel canvases (see references/ad-templates.md + the deep-dive §4):
  meta-1-1     1080x1080  (Meta feed square)
  meta-4-5     1080x1350  (Meta feed portrait — Meta-recommended; ~1/3 more mobile screen)
  tiktok-9-16  1080x1920  (TikTok / Reels / Stories vertical)
  aplus-std    970x600    (Amazon A+ standard image+text; 24px min font, RGB, <2MB)
  aplus-ovl    970x300    (Amazon A+ text overlay)

Crop mode (default `cover`): scale to fill the target then center-crop — fills the
frame, may clip the edges of the master. Use `contain` (pad) to keep the WHOLE master
on a brand/white background — safer when the master's text would be clipped.

Pillow self-bootstrap: sl8-video ships NO Pillow, so install on first import.

Usage:
  resize-variants.py <master.png> <out-dir> [channels] [--mode cover|contain]
      [--pad-color "#RRGGBB"] [--max-bytes 2097152] [--prefix NN]
    channels  comma-separated subset of:
              meta-1-1,meta-4-5,tiktok-9-16,aplus-std,aplus-ovl
              (default: all five)

Writes per channel:  <out-dir>/<prefix><channel>.jpg  (RGB, sRGB, metadata-stripped)
And a manifest:      <out-dir>/variants-manifest.json
  [{channel, file, size:[w,h], mode, bytes, under_max}]

Exit 0 = all requested variants written. Exit 3 = at least one channel exceeded
--max-bytes after max compression (written + flagged under_max=false). Exit 2 = usage.
"""
import json
import sys

try:
    from PIL import Image
except Exception:
    import subprocess
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
         "--break-system-packages", "Pillow"],
        check=False,
    )
    try:
        from PIL import Image
    except Exception:
        sys.stderr.write("resize-variants: Pillow (PIL) is required and could not be auto-installed.\n")
        sys.exit(2)

# channel -> (width, height). The single source of truth for channel specs.
CHANNELS = {
    "meta-1-1":    (1080, 1080),
    "meta-4-5":    (1080, 1350),
    "tiktok-9-16": (1080, 1920),
    "aplus-std":   (970, 600),
    "aplus-ovl":   (970, 300),
}
DEFAULT_ORDER = ["meta-1-1", "meta-4-5", "tiktok-9-16", "aplus-std", "aplus-ovl"]


def _argval(args, flag, default, cast=str):
    if flag in args:
        i = args.index(flag)
        if i + 1 < len(args):
            try:
                return cast(args[i + 1])
            except Exception:
                return default
    return default


def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except Exception:
        return (255, 255, 255)


def cover(master, tw, th):
    """Scale to fill the target box then center-crop. Fills the frame; may clip edges."""
    mw, mh = master.size
    scale = max(tw / mw, th / mh)
    nw, nh = max(1, round(mw * scale)), max(1, round(mh * scale))
    resized = master.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def contain(master, tw, th, pad_rgb):
    """Scale to fit INSIDE the target box then pad onto a solid canvas. Keeps whole master."""
    mw, mh = master.size
    scale = min(tw / mw, th / mh)
    nw, nh = max(1, round(mw * scale)), max(1, round(mh * scale))
    resized = master.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (tw, th), pad_rgb)
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def save_under_bytes(img, path, max_bytes):
    """Save JPEG, stepping quality down until under max_bytes (or floor 60). Returns (bytes, ok)."""
    import io
    clean = img.copy()
    clean.info = {}
    for q in (95, 90, 85, 80, 75, 70, 65, 60):
        buf = io.BytesIO()
        clean.save(buf, "JPEG", quality=q)
        data = buf.getvalue()
        if max_bytes <= 0 or len(data) <= max_bytes:
            with open(path, "wb") as f:
                f.write(data)
            return len(data), True
    # floor: write the smallest we produced, flag over-size
    with open(path, "wb") as f:
        f.write(data)
    return len(data), (max_bytes <= 0)


def main():
    args = sys.argv[1:]
    flags_with_val = {"--mode", "--pad-color", "--max-bytes", "--prefix"}
    pos = []
    skip = False
    for a in args:
        if skip:
            skip = False
            continue
        if a in flags_with_val:
            skip = True
            continue
        if a.startswith("--"):
            continue
        pos.append(a)

    if len(pos) < 2:
        sys.stderr.write(
            "usage: resize-variants.py <master.png> <out-dir> [channels-csv] "
            "[--mode cover|contain] [--pad-color #FFFFFF] [--max-bytes 2097152] [--prefix NN]\n")
        sys.exit(2)

    master_path = pos[0]
    out_dir = pos[1]
    channels_csv = pos[2] if len(pos) >= 3 else ",".join(DEFAULT_ORDER)

    mode = _argval(args, "--mode", "cover", str).lower()
    pad_rgb = hex_to_rgb(_argval(args, "--pad-color", "#FFFFFF", str))
    max_bytes = _argval(args, "--max-bytes", 2 * 1024 * 1024, int)
    prefix = _argval(args, "--prefix", "", str)

    if mode not in ("cover", "contain"):
        sys.stderr.write(f"resize-variants: --mode must be cover|contain, got {mode!r}\n")
        sys.exit(2)

    try:
        master = Image.open(master_path)
        master.load()
        master = master.convert("RGB")
    except Exception as e:
        sys.stderr.write(f"resize-variants: cannot read master {master_path!r}: {e}\n")
        sys.exit(2)

    requested = []
    for c in channels_csv.split(","):
        c = c.strip().lower()
        if not c:
            continue
        if c not in CHANNELS:
            sys.stderr.write(f"resize-variants: unknown channel {c!r} (skipped). "
                             f"valid: {','.join(DEFAULT_ORDER)}\n")
            continue
        requested.append(c)
    if not requested:
        sys.stderr.write("resize-variants: no valid channels requested.\n")
        sys.exit(2)

    import os
    os.makedirs(out_dir, exist_ok=True)

    manifest = []
    any_oversize = False
    for c in requested:
        tw, th = CHANNELS[c]
        out_img = cover(master, tw, th) if mode == "cover" else contain(master, tw, th, pad_rgb)
        out_path = os.path.join(out_dir, f"{prefix}{c}.jpg")
        nbytes, under = save_under_bytes(out_img, out_path, max_bytes)
        if not under:
            any_oversize = True
        manifest.append({
            "channel": c,
            "file": out_path,
            "size": [tw, th],
            "mode": mode,
            "bytes": nbytes,
            "under_max": under,
        })
        flag = "" if under else "  [OVER --max-bytes — flag]"
        sys.stderr.write(f"  {c}: {tw}x{th} -> {out_path} ({nbytes} bytes){flag}\n")

    man_path = os.path.join(out_dir, "variants-manifest.json")
    with open(man_path, "w") as f:
        f.write(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))

    sys.exit(3 if any_oversize else 0)


if __name__ == "__main__":
    main()
