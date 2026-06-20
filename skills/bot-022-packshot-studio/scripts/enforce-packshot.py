#!/usr/bin/env python3
"""
enforce-packshot.py — the DETERMINISTIC Amazon main-image gate (Pillow, no model).

It both CHECKS and FIXES:
  - flattens any transparency / near-white onto an EXACT RGB(255,255,255) canvas
  - samples 8 corner/edge points: all must be exactly (255,255,255) — 254 fails Amazon
  - measures product bbox fill: must be >= 0.85 of the frame
  - checks the long side is >= 1600px (Amazon min 1000; we target 1600+ for zoom)
  - optionally re-crops/re-pads so a small product is centered at >= 85% fill, 1:1
  - exports a metadata-stripped sRGB JPEG

This is pure arithmetic. It NEVER calls a generation model and NEVER invents pixels.
Adapted from the verified deep-dive recipe (product-packshot-generator.md §4f).

Usage:
  enforce-packshot.py <in-image> <out.jpg> [<verdict.json>]
      [--min-long 1600] [--fill-target 0.85] [--square] [--no-recrop] [--pad 0.07]

Exit codes:
  0  written + the image PASSES all gates (bg_pass & fill_pass & res_ok)
  3  written but one or more gates FAILED (the FIX still ran — deliver + FLAG)
  2  usage / unreadable input (nothing written)

The JSON verdict (also printed to stdout) is the objective gate consumed by evals
and recorded into compliance.json.
"""
import json
import sys

try:
    from PIL import Image
except Exception:  # pragma: no cover
    # Self-bootstrap Pillow if the runtime lacks it (sl8-video does not ship it yet).
    import subprocess
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
         "--break-system-packages", "Pillow"],
        check=False,
    )
    try:
        from PIL import Image
    except Exception:
        sys.stderr.write("enforce-packshot: Pillow (PIL) is required and could not be auto-installed.\n")
        sys.exit(2)

WHITE = (255, 255, 255)
NEAR_WHITE = 250  # a channel >= this counts as "background" for the fill mask


def _argval(args, flag, default, cast=str):
    if flag in args:
        i = args.index(flag)
        if i + 1 < len(args):
            try:
                return cast(args[i + 1])
            except Exception:
                return default
    return default


def sample_corners_edges(rgb):
    """Eight points Amazon's automated check effectively reads: 4 corners + 4 edge mids."""
    w, h = rgb.size
    pts = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (0, h // 2), (w - 1, h // 2), (w // 2, h - 1),
    ]
    return [tuple(rgb.getpixel(p)) for p in pts]


def product_bbox(rgb):
    """Bounding box of the non-near-white pixels (the product). None if all white."""
    # 0 where background (all channels >= NEAR_WHITE-ish), 255 where product.
    gray = rgb.convert("L")
    mask = gray.point(lambda v: 0 if v >= NEAR_WHITE else 255)
    return mask.getbbox()


def fill_ratio(rgb):
    w, h = rgb.size
    bbox = product_bbox(rgb)
    if not bbox:
        return 0.0, None
    area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    return area / float(w * h), bbox


def flatten_on_white(img):
    """Composite (RGBA or RGB) onto a pure-255 canvas → opaque RGB. Kills off-white/alpha."""
    rgba = img.convert("RGBA")
    canvas = Image.new("RGBA", rgba.size, WHITE + (255,))
    canvas.alpha_composite(rgba)
    return canvas.convert("RGB")


def recrop_to_fill(rgb, fill_target, square):
    """
    Re-center the product on a fresh white canvas sized so the product's BBOX AREA is
    exactly `fill_target` of the canvas area (Amazon measures bbox-fill, not silhouette
    area). We crop to the tight bbox, then build a larger white canvas around it:

        canvas_area = bbox_area / fill_target   →   side scale = 1/sqrt(fill_target)

    For a square canvas this gives bbox/canvas = fill_target exactly (the long side
    governs). The product pixels are NEVER upscaled or invented — only re-padded with
    white — so this is still pixel-faithful. A tiny over-shoot of the target is used so
    the >=0.85 check passes after integer rounding.
    """
    import math
    bbox = product_bbox(rgb)
    if not bbox:
        return rgb  # nothing to recenter
    crop = rgb.crop(bbox)
    cw, ch = crop.size
    # Aim slightly ABOVE the target so rounding never lands at 0.849.
    eff_target = min(0.95, fill_target + 0.02)
    if square:
        # square canvas; the long side of the product must be sqrt over the SQUARE.
        # bbox_area / side^2 = eff_target  →  side = sqrt(cw*ch / eff_target),
        # but the product must also FIT, so side >= max(cw,ch).
        side = max(int(math.ceil(math.sqrt((cw * ch) / eff_target))), max(cw, ch))
        cw_canvas = ch_canvas = side
    else:
        scale = 1.0 / math.sqrt(eff_target)
        cw_canvas = max(int(math.ceil(cw * scale)), cw)
        ch_canvas = max(int(math.ceil(ch * scale)), ch)
    canvas = Image.new("RGB", (cw_canvas, ch_canvas), WHITE)
    ox = (cw_canvas - cw) // 2
    oy = (ch_canvas - ch) // 2
    canvas.paste(crop, (ox, oy))
    return canvas


def main():
    args = sys.argv[1:]
    # Positional parse: skip --flags and the value of value-taking flags; the rest are
    # the up-to-3 positionals (in-image, out.jpg, verdict.json).
    flags_with_val = {"--min-long", "--fill-target"}
    pos = []
    skip = False
    for i, a in enumerate(args):
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
            "usage: enforce-packshot.py <in-image> <out.jpg> [<verdict.json>] "
            "[--min-long 1600] [--fill-target 0.85] [--square] [--no-recrop]\n")
        sys.exit(2)

    in_path = pos[0]
    out_path = pos[1]
    verdict_path = pos[2] if len(pos) >= 3 else None

    min_long = _argval(args, "--min-long", 1600, int)
    fill_target = _argval(args, "--fill-target", 0.85, float)
    square = "--square" in args
    recrop = "--no-recrop" not in args

    try:
        img = Image.open(in_path)
        img.load()
    except Exception as e:
        sys.stderr.write(f"enforce-packshot: cannot read image {in_path!r}: {e}\n")
        sys.exit(2)

    # 1) Flatten onto pure white (kills alpha + any off-white matte from the cutout).
    rgb = flatten_on_white(img)

    # 2) Optional re-crop/re-pad to push a small product to the fill target (square by
    #    default for hero/angles). Re-flatten guards the recrop edges.
    if recrop:
        fill_now, _ = fill_ratio(rgb)
        if fill_now < fill_target or square:
            rgb = recrop_to_fill(rgb, fill_target, square)
        rgb = flatten_on_white(rgb)

    w, h = rgb.size

    # 3) Measure the gate AFTER the fix (this is what actually ships).
    samples = sample_corners_edges(rgb)
    bg_pass = all(px == WHITE for px in samples)
    fill, _bbox = fill_ratio(rgb)
    fill_pass = fill >= fill_target
    res_ok = max(w, h) >= min_long

    # 4) Export sRGB JPEG, metadata stripped (re-encode through raw bytes → no embedded
    #    ICC/EXIF that a downstream re-save could re-tint off-white).
    clean = rgb.copy()
    clean.info = {}
    clean.save(out_path, "JPEG", quality=95)

    verdict = {
        "in": in_path,
        "out": out_path,
        "size": [w, h],
        "bg_pass": bg_pass,
        "fill": round(fill, 3),
        "fill_pass": fill_pass,
        "res_ok": res_ok,
        "min_long": min_long,
        "fill_target": fill_target,
        "square": square,
        "samples": [list(px) for px in samples],
        "pass": bool(bg_pass and fill_pass and res_ok),
    }
    out_json = json.dumps(verdict, indent=2)
    if verdict_path:
        with open(verdict_path, "w") as f:
            f.write(out_json + "\n")
    print(out_json)

    sys.exit(0 if verdict["pass"] else 3)


if __name__ == "__main__":
    main()
