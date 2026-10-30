#!/usr/bin/env python3
"""film_check.py: a free local check that a returned film is not the storyboard sheet itself (web-marketing-site, SL8-authored).

  python3 film_check.py <film.mp4> <storyboard.png> <out-dir>

Extracts the frames at 0 %, 50 % and the end into <out-dir>/film-f0.png, film-f50.png, film-f100.png and
prints one JSON line with each frame's normalised RMSE against the storyboard (both scaled to 128x72,
0 is identical). A frame under 0.12 is reported as matching. Exit 0 when the first frame does not match;
1 when it does (the model treated the sheet as content: one regeneration, HR7); 2 usage or missing input;
127 ffmpeg missing. It reports figures; the sheet media-qc makes is still looked at in the delivery review.
"""
import json
import os
import subprocess
import sys
import warnings

warnings.simplefilter("ignore")

THRESHOLD = 0.12


def run(*a):
    return subprocess.run(a, check=True, capture_output=True, text=True).stdout


def main():
    if len(sys.argv) != 4:
        print("usage: film_check.py <film.mp4> <storyboard.png> <out-dir>", file=sys.stderr)
        return 2
    film, board, out = sys.argv[1:]
    if not (os.path.isfile(film) and os.path.isfile(board)):
        print("film_check: input not found", file=sys.stderr)
        return 2
    try:
        from PIL import Image
        dur = float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", film).strip())
    except FileNotFoundError:
        print("film_check: ffmpeg or ffprobe not found", file=sys.stderr)
        return 127
    os.makedirs(out, exist_ok=True)
    frames = {"f0": ["-ss", "0"], "f50": ["-ss", f"{dur / 2:.3f}"], "f100": ["-sseof", "-0.2"]}
    sb = list(Image.open(board).convert("RGB").resize((128, 72)).getdata())
    res = {"matches_below": THRESHOLD}
    for k, pre in frames.items():
        p = os.path.join(out, f"film-{k}.png")
        cmd = ["ffmpeg", "-hide_banner", "-v", "error", "-y", *pre, "-i", film]
        cmd += ["-update", "1", p] if k == "f100" else ["-frames:v", "1", p]
        run(*cmd)
        fr = list(Image.open(p).convert("RGB").resize((128, 72)).getdata())
        diff = sum((a - b) ** 2 for x, y in zip(fr, sb) for a, b in zip(x, y))
        res[k] = round((diff / (128 * 72 * 3)) ** 0.5 / 255, 4)
    res["first_frame_matches_storyboard"] = res["f0"] < THRESHOLD
    print(json.dumps(res))
    return 1 if res["first_frame_matches_storyboard"] else 0


if __name__ == "__main__":
    sys.exit(main())
