#!/usr/bin/env python3
"""Probe inputs and break footage into shots for a beat-cut montage (edit-beat-montage).

  shots.py probe <file>... --out work/<p>/probe.json
      ffprobe facts for every input: kind, displayed size (rotation applied), duration,
      r_frame_rate and avg_frame_rate (vfr flag), audio. The role of each file is decided by the agent.
  shots.py photo <image>... --out-dir artifacts/<p>/source
      converts a HEIC/HEIF photo, or any photo whose EXIF orientation is not upright, to an upright
      PNG (Pillow, pillow-heif); ffmpeg 5.1 has neither a HEIC decoder nor EXIF rotation. Probe
      reports "needs_photo_convert" for those files.
  shots.py scan <video> --out-dir work/<p>/shots/<name> [--threshold 0.3] [--fps 30]
                [--dark-every 4.5] [--metrics]
      scene detection with the scores kept (scores.txt), one labelled frame per shot on a contact
      sheet, the first, middle and last frame of every shot, samples every 4.5 s inside long dark
      shots, and 1 fps sheets of the whole clip for spotting burned-in subtitles. Use threshold 0.15
      for a reference edit and add --metrics for its per-frame luma, black-and-white and white-text box.

Exit 0 written; 1 bad input or ffmpeg failed; 2 ffmpeg, ffprobe or Pillow missing.
SL8-authored from the method recorded in the capability assessment (WF27-a1 steps 1, 4 and 5);
no vendor file is copied.
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def need_tools():
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            fail(2, f"{t} is not on PATH: the machine is broken (HR21), report it")


def run(cmd, binary=False):
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0:
        fail(1, f"{cmd[0]} failed: {p.stderr.decode('utf-8', 'replace').strip()[-400:]}")
    return p.stdout if binary else p.stdout.decode("utf-8", "replace")


def rate(s):
    try:
        n, d = s.split("/")
        return float(n) / float(d) if float(d) else 0.0
    except Exception:
        return 0.0


def photo_facts(path):
    """Format and EXIF orientation of a still, read with Pillow (None when Pillow cannot open it)."""
    try:
        from PIL import Image
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            pass
        with Image.open(path) as im:
            return im.format, int(im.getexif().get(274, 1))
    except Exception:
        return None, None


def probe(path):
    if not os.path.exists(path):
        fail(1, f"{path}: no such file")
    if path.lower().endswith((".heic", ".heif")):
        fmt, ori = photo_facts(path)
        return {"file": path, "kind": "image", "format": fmt or "HEIC", "exif_orientation": ori,
                "needs_photo_convert": True, "has_audio": False, "duration": 0.0}
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration,format_name:stream=index,codec_type,codec_name,width,height,"
               "r_frame_rate,avg_frame_rate,nb_frames,sample_rate,channels:stream_tags=rotate:"
               "stream_side_data=rotation", "-of", "json", path])
    d = json.loads(out)
    fmt = d.get("format", {})
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    info = {"file": path, "duration": float(fmt.get("duration") or 0), "has_audio": a is not None}
    if a:
        info["audio"] = {"codec": a.get("codec_name"), "sample_rate": a.get("sample_rate"),
                         "channels": a.get("channels")}
    if v is None:
        info["kind"] = "audio" if a else "unknown"
        return info
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    rot = 0
    try:
        rot = int(float((v.get("tags") or {}).get("rotate", 0)))
    except ValueError:
        rot = 0
    for sd in v.get("side_data_list") or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if abs(rot) % 180 == 90:
        w, h = h, w
    still = v.get("codec_name") in ("png", "mjpeg", "webp", "bmp", "tiff", "gif") and (
        info["duration"] == 0 or str(v.get("nb_frames")) in ("1", "None"))
    r, avg = rate(v.get("r_frame_rate", "0/1")), rate(v.get("avg_frame_rate", "0/1"))
    info.update({"kind": "image" if still else "video", "width": w, "height": h, "rotation": rot,
                 "codec": v.get("codec_name")})
    if still:
        fmt, ori = photo_facts(path)
        info.update({"format": fmt, "exif_orientation": ori, "needs_photo_convert": bool(ori and ori != 1)})
    if not still:
        info.update({"r_frame_rate": round(r, 3), "avg_frame_rate": round(avg, 3),
                     "vfr": bool(r and avg and abs(r - avg) / r > 0.01)})
    return info


def scene_cuts(video, fps, threshold, scores_path):
    # Constant-rate decode first, so cut times map to whole frames even for phone (VFR) footage.
    # The filter string cannot carry a quote or colon, so ffmpeg writes to a plain temp name first.
    import tempfile
    fd, tmp = tempfile.mkstemp(prefix="scores_", suffix=".txt")
    os.close(fd)
    vf = f"fps={fps},select='gt(scene,{threshold})',metadata=print:file={tmp}"
    try:
        run(["ffmpeg", "-v", "error", "-nostdin", "-i", video, "-an", "-vf", vf, "-f", "null", "-"])
        shutil.copyfile(tmp, scores_path)
    finally:
        os.path.exists(tmp) and os.remove(tmp)
    cuts, t = [], None
    with open(scores_path, encoding="utf-8") as fh:
        for line in fh:
            if "pts_time:" in line:
                t = float(line.split("pts_time:")[1].split()[0])
            elif "lavfi.scene_score=" in line and t is not None:
                cuts.append((t, float(line.split("=")[1])))
                t = None
    return cuts


def grab(video, fps, frames, out_dir, prefix, width=480):
    """One pass: write the listed frame numbers (at the constant fps) as jpgs, in order."""
    frames = sorted(set(frames))
    if not frames:
        return {}
    os.makedirs(out_dir, exist_ok=True)
    paths = {}
    for i in range(0, len(frames), 2000):
        chunk = frames[i:i + 2000]
        expr = "+".join(f"eq(n,{n})" for n in chunk)
        tmp = os.path.join(out_dir, f".{prefix}_%05d.jpg")
        run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", video, "-an", "-vf",
             f"fps={fps},select='{expr}',setpts=N/FRAME_RATE/TB,scale={width}:-2", "-q:v", "3", tmp])
        for k, n in enumerate(chunk):
            src = tmp.replace("%05d", f"{k + 1:05d}")
            dst = os.path.join(out_dir, f"{prefix}_{n:06d}.jpg")
            if os.path.exists(src):
                os.replace(src, dst)
                paths[n] = dst
    return paths


def luma_of(path):
    from PIL import Image
    import numpy as np
    a = np.asarray(Image.open(path).convert("L"), dtype=np.float32) / 255.0
    return float(a.mean())


def sheet(tiles, out, cols=6, cell=240):
    """tiles: [(path, label)] -> one labelled contact sheet (internal QC, not a deliverable)."""
    from PIL import Image, ImageDraw, ImageFont
    if not tiles:
        return None
    ims = [Image.open(p).convert("RGB") for p, _ in tiles]
    ch = max(int(cell * im.height / im.width) for im in ims)
    rows = math.ceil(len(ims) / cols)
    canvas = Image.new("RGB", (cols * cell, rows * (ch + 18)), (20, 20, 20))
    dr = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    for i, (im, (_, label)) in enumerate(zip(ims, tiles)):
        x, y = (i % cols) * cell, (i // cols) * (ch + 18)
        canvas.paste(im.resize((cell, int(cell * im.height / im.width))), (x, y))
        dr.text((x + 3, y + ch + 3), label, fill=(255, 255, 0), font=font)
    canvas.save(out, quality=88)
    return out


def metrics(video, fps, out_path):
    """Per-frame mean luma, black / white-flash flags, black-and-white test, white-text box."""
    import numpy as np
    info = probe(video)
    w = 320
    h = int(round(w * info["height"] / info["width"] / 2) * 2)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-nostdin", "-i", video, "-an", "-vf",
                          f"fps={fps},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    rows, n, size = [], 0, w * h * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        f = np.frombuffer(buf, dtype=np.uint8).reshape(h, w, 3).astype(np.float32) / 255.0
        y = 0.299 * f[..., 0] + 0.587 * f[..., 1] + 0.114 * f[..., 2]
        sat = float((f.max(axis=2) - f.min(axis=2)).mean())
        white = (f.min(axis=2) > 0.86) & ((f.max(axis=2) - f.min(axis=2)) < 0.08)
        cover = float(white.mean())
        box = None
        if 0.0005 < cover < 0.15:
            rr = np.where(white.mean(axis=1) > 0.01)[0]
            cc = np.where(white.mean(axis=0) > 0.005)[0]
            if rr.size and cc.size:
                box = {"cap_h": round((rr[-1] - rr[0] + 1) / h, 4),
                       "cx": round((cc[0] + cc[-1]) / 2 / w, 4), "cy": round((rr[0] + rr[-1]) / 2 / h, 4)}
        m = float(y.mean())
        rows.append({"f": n, "luma": round(m, 4), "black": m < 0.04, "flash": m > 0.9,
                     "bw": sat < 0.03, "text": box})
        n += 1
    p.wait()
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump({"file": video, "fps": fps, "frames": rows}, fh)
    return rows


def cmd_probe(a):
    rows = [probe(f) for f in a.files]
    text = json.dumps(rows, indent=1)
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, "w", encoding="utf-8") as fh:
            fh.write(text)
    print(text)


def cmd_photo(a):
    try:
        from PIL import Image, ImageOps
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            pass
    except ImportError as e:
        fail(2, f"{e.name} is missing: the machine is broken (HR21), report it")
    os.makedirs(a.out_dir, exist_ok=True)
    outs = []
    for f in a.files:
        if not os.path.exists(f):
            fail(1, f"{f}: no such file")
        try:
            with Image.open(f) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                dst = os.path.join(a.out_dir, os.path.splitext(os.path.basename(f))[0] + ".png")
                im.save(dst)
        except Exception as x:
            fail(1, f"{f}: cannot open ({type(x).__name__}); a HEIC needs pillow-heif on the machine")
        outs.append(dst)
    print(json.dumps({"converted": outs}))


def cmd_scan(a):
    info = probe(a.video)
    if info["kind"] != "video":
        fail(1, f"{a.video}: not a video ({info['kind']})")
    os.makedirs(a.out_dir, exist_ok=True)
    fps, dur = a.fps, info["duration"]
    total = max(1, int(math.floor(dur * fps + 1e-6)))
    cuts = scene_cuts(a.video, fps, a.threshold, os.path.join(a.out_dir, "scores.txt"))
    bounds = [0] + [int(round(t * fps)) for t, _ in cuts] + [total]
    scores = [None] + [s for _, s in cuts]
    shots = []
    for i in range(len(bounds) - 1):
        s, e = bounds[i], bounds[i + 1]
        if e - s < 1:
            continue
        shots.append({"i": len(shots) + 1, "start_f": s, "end_f": e, "start": round(s / fps, 3),
                      "end": round(e / fps, 3), "dur": round((e - s) / fps, 3), "score": scores[i]})
    wanted = []
    for sh in shots:
        sh["first_f"], sh["mid_f"], sh["last_f"] = sh["start_f"], (sh["start_f"] + sh["end_f"]) // 2, sh["end_f"] - 1
        wanted += [sh["first_f"], sh["mid_f"], sh["last_f"]]
    frames = grab(a.video, fps, wanted, os.path.join(a.out_dir, "frames"), "f")
    dark = []
    for sh in shots:
        for k in ("first", "mid", "last"):
            sh[k] = frames.get(sh[k + "_f"])
        sh["mid_luma"] = round(luma_of(sh["mid"]), 4) if sh["mid"] else None
        sh["dark"] = sh["mid_luma"] is not None and sh["mid_luma"] < a.dark_luma
        if sh["dark"] and sh["dur"] > a.dark_every:
            step = int(round(a.dark_every * fps))
            dark += list(range(sh["start_f"] + step, sh["end_f"] - 1, step))
    dpaths = grab(a.video, fps, dark, os.path.join(a.out_dir, "dark_samples"), "d")
    sheets = []
    for i in range(0, len(shots), 48):
        part = shots[i:i + 48]
        tiles = [(sh["mid"], f"S{sh['i']:02d} {sh['start']:.2f}-{sh['end']:.2f}s"
                  + (f" {sh['score']:.2f}" if sh["score"] is not None else "")) for sh in part if sh["mid"]]
        out = sheet(tiles, os.path.join(a.out_dir, f"sheet_{i // 48 + 1:02d}.jpg"))
        if out:
            sheets.append(out)
    # 1 fps sheets of the whole clip: burned-in subtitles can appear mid-shot only.
    sec_dir = os.path.join(a.out_dir, "per_second")
    sec = grab(a.video, fps, list(range(0, total, int(round(fps)))), sec_dir, "s", width=240)
    order = sorted(sec)
    sec_sheets = []
    for i in range(0, len(order), 48):
        tiles = [(sec[n], f"{n / fps:.0f}s") for n in order[i:i + 48]]
        out = sheet(tiles, os.path.join(a.out_dir, f"per_second_{i // 48 + 1:02d}.jpg"), cols=8, cell=180)
        if out:
            sec_sheets.append(out)
    report = {"file": a.video, "probe": info, "fps": fps, "threshold": a.threshold, "total_frames": total,
              "scores": os.path.join(a.out_dir, "scores.txt"), "shots": shots, "sheets": sheets,
              "per_second_sheets": sec_sheets, "dark_samples": [dpaths[n] for n in sorted(dpaths)]}
    if a.metrics:
        rows = metrics(a.video, fps, os.path.join(a.out_dir, "metrics.json"))
        for sh in shots:
            seg = rows[sh["start_f"]:sh["end_f"]]
            if seg:
                sh["luma_mean"] = round(sum(r["luma"] for r in seg) / len(seg), 4)
                sh["bw_share"] = round(sum(1 for r in seg if r["bw"]) / len(seg), 3)
                sh["text_frames"] = sum(1 for r in seg if r["text"])
                sh["black_frames"] = sum(1 for r in seg if r["black"])
                sh["flash_frames"] = sum(1 for r in seg if r["flash"])
        report["metrics"] = os.path.join(a.out_dir, "metrics.json")
    with open(os.path.join(a.out_dir, "shots.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    print(json.dumps({"shots": len(shots), "sheets": sheets, "per_second_sheets": sec_sheets,
                      "dark_samples": len(report["dark_samples"]), "vfr": info.get("vfr"),
                      "report": os.path.join(a.out_dir, "shots.json")}))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("probe")
    p.add_argument("files", nargs="+")
    p.add_argument("--out")
    ph = sub.add_parser("photo")
    ph.add_argument("files", nargs="+")
    ph.add_argument("--out-dir", required=True)
    s = sub.add_parser("scan")
    s.add_argument("video")
    s.add_argument("--out-dir", required=True)
    s.add_argument("--threshold", type=float, default=0.3)
    s.add_argument("--fps", type=float, default=30)
    s.add_argument("--dark-every", type=float, default=4.5)
    s.add_argument("--dark-luma", type=float, default=0.2)
    s.add_argument("--metrics", action="store_true")
    a = ap.parse_args()
    need_tools()
    try:
        import PIL  # noqa: F401
        import numpy  # noqa: F401
    except ImportError as e:
        fail(2, f"{e.name} is missing: the machine is broken (HR21), report it")
    {"probe": cmd_probe, "photo": cmd_photo, "scan": cmd_scan}[a.cmd](a)


if __name__ == "__main__":
    main()
