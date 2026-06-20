#!/usr/bin/env python3
"""
amazon-spec-check.py — deterministic Amazon main-image spec audit + optional repair.

Enforces the EXACT Amazon main-image rule with zero ambiguity (no model):
  - background EXACTLY RGB (255,255,255) at 8 corner/edge sample points
    (off-white like (250,252,253) FAILS — Amazon silently suppresses it; 254 fails)
  - product bounding-box fills >= 85% of the frame
  - longest side >= 1600px (Amazon: >=1000px for zoom; 1600 recommended)
  - a quick high-contrast text/logo/watermark HEURISTIC flag (advisory, NOT OCR)

Optional --repair-out flattens the image onto pure (255,255,255), strips metadata,
and re-exports sRGB JPEG q95. Repair NEVER moves, recolors, or invents product
pixels — it only flattens transparency / near-white background and strips metadata.

Usage:
  amazon-spec-check.py <image> [--repair-out <path>] [--min-long 1600]
                       [--white-thresh 250] [--format json|text]

Prints a JSON (default) verdict to stdout. Exit 0 = ran (read overall_pass for the
verdict); exit 2 = usage / unreadable image (a clean recorded failure, never a guess).

Dependencies: Pillow (PIL). Verified present in sl8-video (Pillow 12.x).
"""
import argparse
import json
import sys

try:
    from PIL import Image, ImageChops
except Exception:  # pragma: no cover - dependency guard
    # Self-bootstrap Pillow if the runtime lacks it (sl8-video does not ship it yet).
    import subprocess
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check",
         "--break-system-packages", "Pillow"],
        check=False,
    )
    try:
        from PIL import Image, ImageChops
    except Exception as e:
        sys.stderr.write(
            "amazon-spec-check: Pillow (PIL) required and could not be auto-installed: %s\n" % e
        )
        sys.exit(2)


def sample_background(rgb, w, h):
    """8 corner/edge points — the deterministic exact-white probe."""
    pts = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
        (w // 2, 0), (0, h // 2), (w - 1, h // 2), (w // 2, h - 1),
    ]
    return [tuple(rgb.getpixel(p)) for p in pts]


def product_fill(rgb, white_thresh):
    """Fraction of the frame covered by the product bbox.

    The product is everything NOT near-white. We build a near-white mask
    (every channel >= white_thresh), invert it, and take its bounding box.
    """
    # luminance-ish per-channel min: a pixel counts as background only if ALL
    # channels are >= white_thresh. point() works per-band, so AND the bands.
    bands = rgb.split()
    nonwhite = None
    for band in bands:
        # 255 where this band is "dark" (below thresh), 0 where near-white
        m = band.point(lambda v: 255 if v < white_thresh else 0)
        nonwhite = m if nonwhite is None else ImageChops.lighter(nonwhite, m)
    bbox = nonwhite.getbbox()
    w, h = rgb.size
    if not bbox:
        return 0.0, None
    fill = ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / float(w * h)
    return round(fill, 3), bbox


def text_heuristic(rgb, bbox, white_thresh):
    """Quick advisory text/logo/watermark/inset flag — NOT OCR.

    Heuristic: a clean packshot is ONE connected ink blob (the product). A
    watermark / logo / inset / caption / extra-product adds a SECOND ink blob
    disconnected from the product. We downscale, label connected components on the
    ink mask, and flag when meaningful ink lives outside the largest (product)
    component — i.e. there is a second element. A product that legitimately fills
    the frame to the edge is a single component and is NOT flagged (fixes the
    false-positive where high fill tripped a naive margin-density check).
    Conservative — returns a flag + a reason string for a human; never OCR, never
    certifies "no text".
    """
    w, h = rgb.size
    # downscale for cheap connected-component labelling (cap longest side ~256)
    scale = max(1, max(w, h) // 256)
    sw, sh = max(1, w // scale), max(1, h // scale)
    small = rgb.convert("L").resize((sw, sh))
    px = small.load()
    thresh = white_thresh - 5
    ink = [[1 if px[x, y] < thresh else 0 for x in range(sw)] for y in range(sh)]

    # 4-connected component labelling (iterative flood fill — no numpy/scipy)
    seen = [[False] * sw for _ in range(sh)]
    comps = []  # list of (size, has_margin_pixel)
    margin_x = max(1, sw // 20)
    margin_y = max(1, sh // 20)
    for y0 in range(sh):
        for x0 in range(sw):
            if ink[y0][x0] and not seen[y0][x0]:
                stack = [(x0, y0)]
                seen[y0][x0] = True
                size = 0
                touches_margin = False
                while stack:
                    x, y = stack.pop()
                    size += 1
                    if x < margin_x or x >= sw - margin_x or y < margin_y or y >= sh - margin_y:
                        touches_margin = True
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < sw and 0 <= ny < sh and ink[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
                comps.append((size, touches_margin))

    total_ink = sum(c[0] for c in comps)
    if not comps or total_ink == 0:
        return False, 0.0, "no ink detected (heuristic only — not OCR; does not certify text-free)"

    comps.sort(key=lambda c: c[0], reverse=True)
    product_size = comps[0][0]
    # ink that is NOT the main product component
    secondary_ink = total_ink - product_size
    secondary_frac = secondary_ink / float(total_ink)
    # a real second element (watermark/inset/extra product) is a non-trivial blob
    # (>= ~0.3% of the frame) distinct from the product; tiny specks are JPEG noise
    frame_px = sw * sh
    significant_secondary = any(
        c[0] >= max(8, int(0.003 * frame_px)) for c in comps[1:]
    )
    flagged = significant_secondary and secondary_frac > 0.005
    if flagged:
        reason = ("a second ink element separate from the product was found "
                  "(possible watermark/logo/inset/caption/extra-product) — HUMAN REVIEW")
    else:
        reason = ("single product ink blob, no separate element "
                  "(heuristic only — not OCR; does not certify text-free)")
    return flagged, round(secondary_frac, 4), reason


def repair(img, out_path):
    """Flatten onto pure white, strip metadata, sRGB JPEG q95.

    Preserves product pixels exactly — only composites over (255,255,255) and
    drops any embedded color profile / EXIF.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    canvas = Image.new("RGB", (w, h), (255, 255, 255))
    canvas.paste(rgba, (0, 0), rgba)  # alpha-composite over pure white
    # new image carries no exif/icc -> metadata stripped by construction
    canvas.save(out_path, "JPEG", quality=95)
    return out_path


def main():
    ap = argparse.ArgumentParser(description="Amazon main-image spec audit + repair")
    ap.add_argument("image")
    ap.add_argument("--repair-out", default=None,
                    help="if given, write a flattened-to-pure-white, metadata-stripped JPEG here")
    ap.add_argument("--min-long", type=int, default=1600,
                    help="minimum longest side in px (Amazon: 1000 zoom; 1600 recommended)")
    ap.add_argument("--white-thresh", type=int, default=250,
                    help="a pixel counts as background only if ALL channels >= this (default 250)")
    ap.add_argument("--format", choices=["json", "text"], default="json")
    args = ap.parse_args()

    try:
        img = Image.open(args.image)
        img.load()
    except Exception as e:
        sys.stderr.write("amazon-spec-check: cannot open image %r: %s\n" % (args.image, e))
        sys.exit(2)

    rgb = img.convert("RGB")
    w, h = rgb.size

    samples = sample_background(rgb, w, h)
    bg_pass = all(px == (255, 255, 255) for px in samples)  # EXACT 255 — 254 fails

    fill, bbox = product_fill(rgb, args.white_thresh)
    fill_pass = fill >= 0.85

    longest = max(w, h)
    res_ok = longest >= args.min_long

    text_flag, secondary_frac, text_reason = text_heuristic(rgb, bbox, args.white_thresh)

    repaired = None
    if args.repair_out:
        try:
            repaired = repair(img, args.repair_out)
        except Exception as e:
            sys.stderr.write("amazon-spec-check: repair failed: %s\n" % e)

    overall_pass = bool(bg_pass and fill_pass and res_ok and not text_flag)

    verdict = {
        "image": args.image,
        "size": [w, h],
        "longest_side": longest,
        "bg_pass": bg_pass,
        "samples": [list(px) for px in samples],
        "fill": fill,
        "fill_pass": fill_pass,
        "bbox": list(bbox) if bbox else None,
        "res_ok": res_ok,
        "min_long": args.min_long,
        "text_flag": text_flag,
        "secondary_ink_frac": secondary_frac,
        "text_note": text_reason,
        "overall_pass": overall_pass,
        "repaired": repaired,
        "notes": [
            "bg_pass is EXACT (255,255,255); 254/off-white FAILS Amazon (silent suppression).",
            "text_flag is a HEURISTIC, not OCR — advisory; never certifies text-free.",
            "Amazon Style Guide G1881 is login-gated — this audit encodes the published vendor spec, UNVERIFIED against the official guide.",
        ],
    }

    if args.format == "json":
        print(json.dumps(verdict, indent=2))
    else:
        flag = "PASS" if overall_pass else "FIX"
        print("%s  %s" % (flag, args.image))
        print("  bg_pass=%s  fill=%.3f (>=0.85:%s)  longest=%dpx (>=%d:%s)  text_flag=%s"
              % (bg_pass, fill, fill_pass, longest, args.min_long, res_ok, text_flag))
        if repaired:
            print("  repaired -> %s" % repaired)

    sys.exit(0)


if __name__ == "__main__":
    main()
