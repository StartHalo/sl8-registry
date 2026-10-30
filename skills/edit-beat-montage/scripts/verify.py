#!/usr/bin/env python3
"""The four gates of a beat-cut montage master, plus the sheet the agent looks at (edit-beat-montage).

  verify.py <edl.json> <master.mp4> --out work/<p>/verify.json --sheet artifacts/<p>/qc/sheet.jpg
            [--ref <reference.mp4>] [--scene 0.3] [--lufs -14] [--lufs-tol 1.0] [--tp -1.0]
            [--band 3] [--bright 0.25] [--cut-tol 2] [--edge-jump 20] [--beats work/<p>/beats.json]

  beats     with --beats: the beat number and frame offset of every shot start and of the last frame
            (the skill's promise: cuts on the beat). Fails when an offset is over 1 frame, unless the
            EDL lists the frame in "off_grid" with a reason.
  format    ffprobe: decoded frame count, frame rate (constant), width and height equal the EDL header.
  cuts      scene detection on the master at --scene: every detected cut must sit within --cut-tol
            frames of a planned cut (--cut-tol, widened to the shot's own transition frames + 1, or 3
            when it has a punch) or 1 frame of a flash; an extra cut means junk inside a source piece.
            A planned cut that is not detected is reported (two similar shots), not failed.
  edges     on every frame whose centre has a mean luma of at least --bright: a black bar fails, dark
            content does not. A side has a bar when its outermost lines (at least 1% of the side, 4 px)
            average under --band on the 0-255 scale AND the picture steps up by at least --edge-jump
            within a few lines of where the dark run ends (a hard edge). A night shot or a subject on a
            black backdrop fades in gradually and passes.
  loudness  ebur128: integrated loudness within --lufs-tol of --lufs, true peak at most --tp.
  sheet     each shot's middle frame, source (or reference, with --ref) beside ours.

Prints figures, never a verdict on taste. Exit 0 every gate passed; 1 a gate failed; 2 a tool is
missing or an input is unreadable.
SL8-authored from the verify checklist recorded in the capability assessment (WF27-a1 step 14).
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def rate(s):
    n, _, d = s.partition("/")
    return float(n) / float(d or 1)


def fmt_gate(e, master):
    p = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                        "stream=nb_read_frames,r_frame_rate,avg_frame_rate,width,height,duration", "-of", "json",
                        master], capture_output=True, text=True)
    if p.returncode != 0:
        fail(2, f"{master}: ffprobe cannot read it")
    s = json.loads(p.stdout)["streams"][0]
    got = {"frames": int(s.get("nb_read_frames") or 0), "fps": round(rate(s["r_frame_rate"]), 3),
           "avg_fps": round(rate(s["avg_frame_rate"]), 3), "w": s["width"], "h": s["height"],
           "duration": float(s.get("duration") or 0)}
    want = {"frames": int(e["total_frames"]), "fps": float(e["fps"]), "w": int(e["w"]), "h": int(e["h"])}
    fails = [f"{k}: {got[k]} != {want[k]}" for k in want if (abs(got[k] - want[k]) > 0.01 if k == "fps" else got[k] != want[k])]
    if abs(got["avg_fps"] - got["fps"]) > 0.01:
        fails.append(f"variable frame rate: avg {got['avg_fps']} vs {got['fps']}")
    return {"pass": not fails, "figures": got, "want": want, "fails": fails}


def cuts_gate(e, master, scene, tol):
    fps = float(e["fps"])
    p = subprocess.run(["ffmpeg", "-nostdin", "-i", master, "-an", "-vf",
                        f"select='gt(scene,{scene})',metadata=print:file=-", "-f", "null", "-"],
                       capture_output=True, text=True)
    found, t = [], None
    for line in p.stdout.splitlines():
        if "pts_time:" in line:
            t = float(line.split("pts_time:")[1].split()[0])
        elif "lavfi.scene_score=" in line and t is not None:
            found.append((int(round(t * fps)), float(line.split("=")[1])))
            t = None
    shots = e["shots"]
    planned = []
    for i, sh in enumerate(shots[1:], 1):
        w = tol
        for tr in (shots[i - 1].get("tout"), sh.get("tin")):
            if tr:
                w = max(w, int(tr.get("f", 3)) + 1)
        if float(sh.get("punch", 0)) > 0:
            w = max(w, 3)
        planned.append((sh["start_f"], w))
    flashes = [int(k) for k, v in (e.get("flashes") or {}).items() if float(v) > 0]
    extra = []
    for f, sc in found:
        if any(abs(f - c) <= w for c, w in planned) or any(abs(f - fl) <= 1 for fl in flashes):
            continue
        shot = next((i + 1 for i, s in enumerate(e["shots"]) if s["start_f"] <= f < s["end_f"]), None)
        extra.append({"frame": f, "score": round(sc, 3), "shot": shot})
    missed = [c for c, w in planned if not any(abs(f - c) <= w for f, _ in found)]
    return {"pass": not extra, "figures": {"detected": len(found), "planned": len(planned), "extra": extra,
                                           "not_detected": missed},
            "fails": [f"extra cut at frame {x['frame']} in shot {x['shot']} (score {x['score']}): junk in that "
                      "source piece; check its first and last frames" for x in extra]}


def beats_gate(e, beats_path):
    g = json.load(open(beats_path, encoding="utf-8"))
    bf = g["timeline"]["beat_frames"]
    allowed = {int(x["f"]) for x in e.get("off_grid", [])}
    rows, fails = [], []
    pts = [(f"shot {i + 1}", s["start_f"]) for i, s in enumerate(e["shots"])] + [("end", int(e["total_frames"]))]
    for name, f in pts:
        j = min(range(len(bf)), key=lambda i: abs(bf[i] - f)) if bf else None
        off = None if j is None else f - bf[j]
        rows.append({"at": name, "frame": f, "beat": j, "offset": off})
        if off is None or (abs(off) > 1 and f not in allowed):
            fails.append(f"{name} at frame {f}: beat {j} sits at {bf[j] if bf else None}, offset {off} frames")
    on = sum(1 for r in rows if r["offset"] is not None and abs(r["offset"]) <= 1)
    return {"pass": not fails, "figures": {"on_beat": on, "points": len(rows), "rows": rows[:60]}, "fails": fails}


def frames_of(master, w, h):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-i", master, "-an", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    size = w * h * 3
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield buf
    finally:
        p.stdout.close()
        p.kill()
        p.wait()


def bar_run(prof, lim, jump, cap):
    """Length of the dark run from the start of a line profile (mean luma per line) when it ends in a
    hard step up, else 0."""
    n = 0
    while n < min(cap, len(prof)) and prof[n] < lim:
        n += 1
    if n == 0 or n >= cap or n + 3 > len(prof):
        return 0
    return n if prof[n:n + 3].mean() - prof[max(0, n - 3):n].mean() >= jump else 0


def edges_and_mids(e, master, band_max, bright, jump, np):
    W, H = int(e["w"]), int(e["h"])
    bw, bh = max(4, round(0.01 * W)), max(4, round(0.01 * H))
    mids = {(s["start_f"] + s["end_f"]) // 2: i for i, s in enumerate(e["shots"])}
    bad, checked, keep = [], 0, {}
    for n, buf in enumerate(frames_of(master, W, H)):
        f = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        if n in mids:
            keep[mids[n]] = f.copy()
        # "Bright" is judged on the centre of the frame, so a heavy letterbox cannot hide itself.
        c = f[H // 4:3 * H // 4:2, W // 4:3 * W // 4:2].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
        if c.mean() / 255 < bright:
            continue
        checked += 1
        yy = f.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
        rows, cols = yy.mean(axis=1), yy.mean(axis=0)
        capy, capx = H // 4, W // 4
        runs = {"top": (bar_run(rows, band_max, jump, capy), bh), "bottom": (bar_run(rows[::-1], band_max, jump, capy), bh),
                "left": (bar_run(cols, band_max, jump, capx), bw), "right": (bar_run(cols[::-1], band_max, jump, capx), bw)}
        dark = {k: r for k, (r, need_px) in runs.items() if r >= need_px}
        if dark:
            bad.append({"frame": n, "bands": dark})
    return ({"pass": not bad, "figures": {"bright_frames_checked": checked, "band_px": [bw, bh],
                                          "dark_bands": bad[:40], "dark_band_frames": len(bad)},
             "fails": [f"{len(bad)} bright frame(s) with a black bar at the edge, under {band_max} then a hard step (first at frame "
                       f"{bad[0]['frame']}: {bad[0]['bands']})"] if bad else []}, keep)


def loud_gate(master, target, tol, tp_max):
    has_a = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                            "-of", "csv=p=0", master], capture_output=True, text=True).stdout.strip()
    if not has_a:
        return {"pass": False, "figures": {}, "fails": ["no audio stream in the master"]}
    err = subprocess.run(["ffmpeg", "-nostdin", "-i", master, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):]
    mi = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", tail)
    mt = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", tail)
    i = float(mi.group(1)) if mi and mi.group(1) != "-inf" else None
    tp = float(mt.group(1)) if mt and mt.group(1) != "-inf" else None
    fails = []
    if i is None or abs(i - target) > tol:
        fails.append(f"integrated {i} LUFS, want {target} +/- {tol}")
    if tp is None or tp > tp_max:
        fails.append(f"true peak {tp} dBTP, want at most {tp_max}")
    return {"pass": not fails, "figures": {"I": i, "TP": tp, "target": target}, "fails": fails}


def source_frame(path, t, w):
    p = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-ss", f"{max(0.0, t):.3f}", "-i", path, "-frames:v", "1",
                        "-vf", f"scale={w}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
    return p.stdout if p.returncode == 0 and p.stdout else None


def build_sheet(e, keep, out, ref, Image, ImageDraw, ImageFont, io):
    cell = 200
    fps = float(e["fps"])
    pairs = []
    for i, s in enumerate(e["shots"]):
        mid = (s["start_f"] + s["end_f"]) // 2
        if ref:
            src = source_frame(ref, mid / fps, cell)
        elif str(s["src"]).lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            src = source_frame(s["src"], 0, cell)
        else:
            src = source_frame(s["src"], s.get("in", 0) + (mid - s["start_f"]) / fps * s.get("speed", 1), cell)
        ours = Image.fromarray(keep[i]) if i in keep else None
        pairs.append((i + 1, Image.open(io.BytesIO(src)).convert("RGB") if src else None, ours))
    if not pairs:
        return []
    ch = int(cell * int(e["h"]) / int(e["w"]))
    cols, outs = 4, []
    font = ImageFont.load_default()
    for start in range(0, len(pairs), 24):
        part = pairs[start:start + 24]
        rows = math.ceil(len(part) / cols)
        canvas = Image.new("RGB", (cols * (2 * cell + 10), rows * (ch + 18)), (20, 20, 20))
        dr = ImageDraw.Draw(canvas)
        for j, (n, src, ours) in enumerate(part):
            x, y = (j % cols) * (2 * cell + 10), (j // cols) * (ch + 18)
            for k, im in enumerate((src, ours)):
                if im is not None:
                    im = im.copy()
                    im.thumbnail((cell, ch))
                    canvas.paste(im, (x + k * cell, y))
            dr.text((x + 3, y + ch + 3), f"S{n:02d} {'ref' if ref else 'source'} | ours", fill=(255, 255, 0), font=font)
        path = out if start == 0 else out.replace(".jpg", f"_{start // 24 + 1:02d}.jpg")
        canvas.save(path, quality=88)
        outs.append(path)
    return outs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("edl")
    ap.add_argument("master")
    ap.add_argument("--out", required=True)
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--ref")
    ap.add_argument("--scene", type=float, default=0.3)
    ap.add_argument("--cut-tol", type=int, default=2)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--lufs-tol", type=float, default=1.0)
    ap.add_argument("--tp", type=float, default=-1.0)
    ap.add_argument("--band", type=float, default=3.0)
    ap.add_argument("--bright", type=float, default=0.25)
    ap.add_argument("--edge-jump", type=float, default=20.0, help="luma step (0-255) that makes a dark run a bar")
    ap.add_argument("--beats", help="beats.json: also measure every cut against the beat grid")
    a = ap.parse_args()
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            fail(2, f"{t} is not on PATH: the machine is broken (HR21), report it")
    try:
        import io
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as x:
        fail(2, f"{x.name} is missing: the machine is broken (HR21), report it")
    for p in (a.edl, a.master):
        if not os.path.exists(p):
            fail(2, f"{p}: no such file")
    e = json.load(open(a.edl, encoding="utf-8"))
    e["shots"] = sorted(e["shots"], key=lambda s: s["start_f"])
    gates = {"format": fmt_gate(e, a.master), "cuts": cuts_gate(e, a.master, a.scene, a.cut_tol)}
    gates["edges"], keep = edges_and_mids(e, a.master, a.band, a.bright, a.edge_jump, np)
    if a.beats:
        gates["beats"] = beats_gate(e, a.beats)
    gates["loudness"] = loud_gate(a.master, a.lufs, a.lufs_tol, a.tp)
    os.makedirs(os.path.dirname(os.path.abspath(a.sheet)), exist_ok=True)
    sheets = build_sheet(e, keep, a.sheet, a.ref, Image, ImageDraw, ImageFont, io)
    ok = all(g["pass"] for g in gates.values())
    report = {"master": a.master, "pass": ok, "gates": gates, "sheets": sheets}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    for name, g in gates.items():
        print(f"{name:9s} {'pass' if g['pass'] else 'FAIL'} {json.dumps(g['figures'])[:300]}")
        for x in g["fails"]:
            print(f"  - {x}")
    print(json.dumps({"pass": ok, "report": a.out, "sheets": sheets}))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
