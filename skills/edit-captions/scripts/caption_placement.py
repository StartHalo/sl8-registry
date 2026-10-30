#!/usr/bin/env python3
"""Placement search for the guarded (safe) profile (SL8-authored from WF24-a1 step 14).

Used by burn_captions.py --profile safe. For one caption it tries, in order:
  1. the low band: the ink's bottom edge starts at the floor (83% of H portrait, 90% landscape or
     square) and moves up in steps of 2.5% of H while it stays at or below 60% of H;
  2. the upper band: the ink's top edge starts at 12% of H and moves down in 2.5% steps while the
     ink stays above 40% of H;
each position at centre, then left, then right. A position is taken only when the caption's real
ink box (outline, shadow and paper included) keeps 1.5% of H clear of every protected box shown
during the cue, stays inside the side margins (11% of W portrait, 7.5% landscape) and below the top
10% of H. No position: the caller returns caption_incomplete for that interval.

  python3 caption_placement.py --frame 1080x1920 --ink 600x150 --box 0.3,0.1,0.7,0.6   # prints the position
Exit: 0 placed; 3 no position fits.
"""
import argparse, json, sys

STEP = 0.025
PAD = 0.015
TOP_LIMIT = 0.10


def bands(W, H):
    portrait = H > W
    floor = 0.83 if portrait else 0.90
    side = (0.11 if portrait else 0.075) * W
    return floor, side


def place(ink_w, ink_h, W, H, boxes):
    """Top-left of the ink rectangle, or None. boxes: protected boxes in pixels (x0, y0, x1, y1)."""
    floor, side = bands(W, H)
    pad = PAD * H
    padded = [(x0 - pad, y0 - pad, x1 + pad, y1 + pad) for x0, y0, x1, y1 in boxes]
    if ink_w > W - 2 * side:
        return None
    xs = [("centre", (W - ink_w) / 2), ("left", side), ("right", W - side - ink_w)]

    def clear(x, y):
        if y < TOP_LIMIT * H or y + ink_h > H:
            return False
        return all(x + ink_w <= b[0] or x >= b[2] or y + ink_h <= b[1] or y >= b[3] for b in padded)

    k = 0
    while True:  # low band, from the floor upwards
        bottom = (floor - k * STEP) * H
        if bottom < 0.60 * H - 1e-6:
            break
        for name, x in xs:
            if clear(x, bottom - ink_h):
                return {"x": round(x), "y": round(bottom - ink_h), "band": "low", "align": name}
        k += 1
    k = 0
    while True:  # upper band, from 12% downwards
        top = (0.12 + k * STEP) * H
        if top + ink_h > 0.40 * H + 1e-6:
            break
        for name, x in xs:
            if clear(x, top):
                return {"x": round(x), "y": round(top), "band": "upper", "align": name}
        k += 1
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--frame", required=True, help="WxH")
    p.add_argument("--ink", required=True, help="wxh of the caption's ink box")
    p.add_argument("--box", action="append", default=[], help="protected box left,top,right,bottom as fractions")
    a = p.parse_args()
    W, H = (int(v) for v in a.frame.split("x"))
    w, h = (int(v) for v in a.ink.split("x"))
    boxes = []
    for b in a.box:
        l, t, r, btm = (float(v) for v in b.split(","))
        boxes.append((l * W, t * H, r * W, btm * H))
    got = place(w, h, W, H, boxes)
    print(json.dumps(got))
    sys.exit(0 if got else 3)


if __name__ == "__main__":
    main()
