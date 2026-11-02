#!/usr/bin/env python3
"""frame.py: framing help for a vertical Reel cut from a wide source (SL8-authored).

It proposes and measures; the agent decides. Both commands print one JSON line.

  python3 frame.py faces <src> --start S --end E --width W --height H [--fps 2] [--work DIR]
      samples the range at --fps (lowered so a range gives at most 80 frames; they go in a fresh temp
      folder under --work that is deleted afterwards), finds the largest face per frame with OpenCV's frontal-face
      cascade, and proposes a `crop` framing at the output aspect that follows it: the full source
      height, x centred on the face, smoothed, static when the face holds still, else at most 20
      segment-relative keyframes. Paste the proposal into the range's `framing` and check it on frames.
  python3 frame.py text <frame> --framing JSON --size WxH [--min-fraction 0.015]
      estimates the cap height of on-screen text in a full-size source frame (a slide, a demo) as it
      lands on the output frame under that framing (pad, center_crop, or crop, static or the first
      keyframe), and compares it with the floor: cap height / output height >= --min-fraction.

Exit 0 a proposal, or text at or above the floor, or no text found; 1 no steady face (faces), or text
below the floor (text); 2 a tool or module is missing, or bad usage (report it; never install).

The text figure is an estimate from ink rows (Otsu threshold, row profile, cap height about 0.8 of a
line's ink height); it is an observation for the report, never a pass (HR14).
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut_reel import even_down, probe  # noqa: E402

MAX_KEYFRAMES = 20
MAX_SAMPLES = MAX_KEYFRAMES * 4  # at most 80 sampled frames per range: a long range lowers the sampling rate
CAP_OF_LINE = 0.8            # cap height as a share of a text line's ink height (capitals plus descenders; measured 0.75-1.0 on Arial)
MIN_FRACTION = 0.015         # SL8 starting value: cap height at least 1.5% of the output height (29 px of 1920)
STATIC_SPREAD = 0.10         # face centre moves less than 10% of the crop width: one static crop


def emit(obj, rc=0):
    print(json.dumps(obj, ensure_ascii=False))
    sys.exit(rc)


def need(module):
    try:
        return __import__(module)
    except ImportError:
        emit({"ok": False, "error": f"python module {module} is not available on this machine"}, 2)


# ---- faces -------------------------------------------------------------------------------------

def crop_path(dets, dw, dh, W, H, duration):
    """dets: [(t, cx or None)] in source pixels, t segment-relative. Returns (framing, figures)."""
    ch = even_down(dh)
    cw = even_down(ch * W / H)
    if cw > dw:  # the output is wider than the source: full width instead
        cw = even_down(dw)
        ch = even_down(cw * H / W)
    hits = [(t, cx) for t, cx in dets if cx is not None]
    figures = {"frames": len(dets), "faces": len(hits), "coverage": round(len(hits) / len(dets), 3) if dets else 0.0,
               "crop": [cw, ch]}
    if not dets or figures["coverage"] < 0.5:
        return None, figures
    xmax = dw - cw
    clamp = lambda x: int(max(0, min(xmax, round(x))))
    xs = [clamp(cx - cw / 2) for _, cx in hits]
    y = (dh - ch) // 2
    srt = sorted(xs)
    if srt[-1] - srt[0] <= STATIC_SPREAD * cw:
        figures["movement"] = "static"
        return {"mode": "crop", "width": cw, "height": ch, "x": srt[len(srt) // 2], "y": y}, figures
    # smooth: median of each sample and its neighbours, then keep the turning points
    pts = [(t, clamp(cx - cw / 2)) for t, cx in hits]
    sm = []
    for i in range(len(pts)):
        win = sorted(p[1] for p in pts[max(0, i - 1):i + 2])
        sm.append((pts[i][0], win[len(win) // 2]))
    keep = [sm[0]]
    for i in range(1, len(sm) - 1):
        if abs(sm[i][1] - keep[-1][1]) >= 0.05 * cw:
            keep.append(sm[i])
    if sm[-1] is not keep[-1]:
        keep.append(sm[-1])
    if len(keep) > MAX_KEYFRAMES:
        step = (len(keep) - 1) / (MAX_KEYFRAMES - 1)
        keep = [keep[round(i * step)] for i in range(MAX_KEYFRAMES)]
    kfs, last = [], -1.0
    for t, x in keep:
        t = round(min(max(t, 0.0), duration), 3)
        if t > last:
            kfs.append({"time": t, "x": x, "y": y})
            last = t
    if kfs[0]["time"] > 0:
        kfs.insert(0, {"time": 0.0, "x": kfs[0]["x"], "y": y})
        if len(kfs) > MAX_KEYFRAMES:
            del kfs[1]
    moves = [b["x"] - a["x"] for a, b in zip(kfs, kfs[1:]) if b["x"] != a["x"]]
    reversals = sum(1 for m, n in zip(moves, moves[1:]) if (m > 0) != (n > 0))
    figures["reversals"] = reversals
    if len(moves) >= 4 and reversals > len(moves) / 2:
        figures["movement"] = "jumps"            # two people, or a false detection: split the range instead
        return None, figures
    figures["movement"] = "follows"
    return {"mode": "crop", "width": cw, "height": ch, "keyframes": kfs}, figures


def faces(a):
    cv2 = need("cv2")
    cascade_dir = getattr(getattr(cv2, "data", None), "haarcascades", None)
    path = os.path.join(cascade_dir or "", "haarcascade_frontalface_default.xml")
    det = cv2.CascadeClassifier(path) if cascade_dir and os.path.exists(path) else None
    if det is None or det.empty():
        emit({"ok": False, "error": "OpenCV's frontal-face cascade is not available on this machine: place the crop from frame observations"}, 2)
    src = probe(a.src)
    dw, dh = src["display_w"], src["display_h"]
    dur = a.end - a.start
    if dur <= 0:
        emit({"ok": False, "error": "--end must be after --start"}, 2)
    fps = min(a.fps, MAX_SAMPLES / dur)
    if a.work:
        os.makedirs(a.work, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="faces_", dir=a.work or None)  # a fresh folder: only it is deleted
    try:
        sw = 640 if dw > 640 else dw
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{a.start:.3f}", "-t", f"{dur:.3f}", "-i", a.src,
               "-vf", f"fps={fps:.6f},scale={sw}:-2", "-frames:v", str(MAX_SAMPLES), os.path.join(tmp, "face_%04d.jpg")]
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if p.returncode != 0:
            emit({"ok": False, "error": "ffmpeg could not sample the range", "stderr": p.stderr[-400:]}, 2)
        scale = dw / sw
        dets = []
        for i, f in enumerate(sorted(glob.glob(os.path.join(tmp, "face_*.jpg")))):
            img = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
            found = det.detectMultiScale(img, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24)) if img is not None else ()
            cx = None
            if len(found):
                x, _y, w, _h = max(found, key=lambda r: r[2] * r[3])
                cx = (x + w / 2) * scale
            dets.append((i / fps, cx))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    framing, figures = crop_path(dets, dw, dh, a.width, a.height, dur)
    if framing is None:
        emit({"ok": False, "check": "faces", "error": "no steady face (found in under half the sampled frames, or its position "
              "jumps between two places): split the range at the speaker change, place the crop from frame "
              "observations, or crop the slide region", **figures}, 1)
    emit({"ok": True, "check": "faces", "framing": framing, **figures,
          "note": "a proposal from a face detector: look at the frames before you use it"})


# ---- text --------------------------------------------------------------------------------------

def visible_rect(fr, dw, dh, W, H):
    """The source rectangle that reaches the output, and the scale from source to output pixels."""
    mode = fr.get("mode", "pad")
    if mode == "pad":
        s = min(W / dw, H / dh)
        return (0, 0, dw, dh), s
    if mode == "center_crop":
        if dw * H >= dh * W:
            ch = even_down(dh); cw = even_down(ch * W / H)
        else:
            cw = even_down(dw); ch = even_down(cw * H / W)
        return ((dw - cw) // 2, (dh - ch) // 2, cw, ch), H / ch
    if mode == "crop":
        cw, ch = int(fr["width"]), int(fr["height"])
        k = (fr.get("keyframes") or [fr])[0]
        x, y = int(k.get("x", (dw - cw) // 2)), int(k.get("y", (dh - ch) // 2))
        return (x, y, cw, ch), H / ch
    emit({"ok": False, "error": f"framing mode {mode} is not pad, center_crop or crop"}, 2)


def otsu(gray, np):
    hist = np.bincount(gray.ravel(), minlength=256).astype(float)
    total = gray.size
    omega = np.cumsum(hist) / total
    mu = np.cumsum(hist * np.arange(256)) / total
    mu_t = mu[-1]
    with np.errstate(divide="ignore", invalid="ignore"):
        sigma = (mu_t * omega - mu) ** 2 / (omega * (1 - omega))
    sigma = np.nan_to_num(sigma)
    return int(np.argmax(sigma))


def line_heights(gray, np):
    """Ink-row runs of a grey region: the height of each text line's ink, in pixels."""
    th = otsu(gray, np)
    dark = gray <= th
    ink = dark if dark.mean() < 0.5 else ~dark      # text is the minority class
    h, w = ink.shape
    rows = ink.sum(axis=1) >= max(2, 0.005 * w)
    runs, start, gap = [], None, 0
    for i, r in enumerate(list(rows) + [False, False]):
        if r:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap > 1:                              # a one-row break inside a letter is not a new line
                runs.append(i - gap + 1 - start)
                start, gap = None, 0
    return [r for r in runs if 3 <= r <= 0.25 * h]


def text(a):
    np = need("numpy")
    need("PIL")
    from PIL import Image
    try:
        W, H = (int(v) for v in a.size.lower().split("x"))
        fr = json.loads(a.framing)
    except (ValueError, json.JSONDecodeError):
        emit({"ok": False, "error": "--size is WxH and --framing is the range's framing JSON"}, 2)
    img = Image.open(a.frame).convert("L")
    dw, dh = img.size
    (x, y, w, h), scale = visible_rect(fr, dw, dh, W, H)
    region = np.asarray(img.crop((x, y, x + w, y + h)), dtype=np.uint8)
    runs = line_heights(region, np)
    base = {"check": "text", "frame": a.frame, "source_size": [dw, dh], "visible_rect": [x, y, w, h],
            "scale": round(scale, 4), "output_size": [W, H], "min_fraction": a.min_fraction,
            "min_cap_px": round(a.min_fraction * H, 1), "lines": len(runs)}
    if not runs:
        emit({"ok": True, **base, "verdict": "no text found",
              "note": "no text lines in the visible area; look at the frame to confirm"})
    runs.sort()
    line_src = runs[len(runs) // 2]
    cap_src = CAP_OF_LINE * line_src
    cap_out = cap_src * scale
    frac = cap_out / H
    verdict = "readable" if frac >= a.min_fraction else "unreadable"
    emit({"ok": True, **base, "line_px_source_median": line_src, "cap_px_source": round(cap_src, 1),
          "cap_px_output": round(cap_out, 1), "fraction": round(frac, 4), "verdict": verdict,
          "note": "an estimate from ink rows; look at the frame before you rely on it"},
         0 if verdict == "readable" else 1)


def main():
    ap = argparse.ArgumentParser(description="framing help for a vertical Reel (proposes and measures)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("faces")
    f.add_argument("src")
    f.add_argument("--start", type=float, required=True)
    f.add_argument("--end", type=float, required=True)
    f.add_argument("--width", type=int, required=True)
    f.add_argument("--height", type=int, required=True)
    f.add_argument("--fps", type=float, default=2.0)
    f.add_argument("--work")
    t = sub.add_parser("text")
    t.add_argument("frame")
    t.add_argument("--framing", required=True)
    t.add_argument("--size", required=True)
    t.add_argument("--min-fraction", type=float, default=MIN_FRACTION)
    a = ap.parse_args()
    if a.cmd == "faces":
        faces(a)
    else:
        text(a)


if __name__ == "__main__":
    main()
