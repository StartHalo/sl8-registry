#!/usr/bin/env python3
"""cut_reel.py: render one highlight Reel from a long source with local ffmpeg (SL8-authored).

Written by SL8 from the cut contract that method WF25-a1 of the SL8 capability assessment records
(our port of a hosted cut-and-reframe renderer; no vendor file is copied). It executes explicit
ranges and never decides what matters: selection is the agent's work.

  python3 cut_reel.py --preflight
      tools, filters and encoders this method needs; exit 2 names the missing ones
  python3 cut_reel.py cut_<k>.json --check [--work DIR]
      validates the spec and prints the read-back (ranges, output offsets, every crop rectangle,
      caption counts); writes the caption file to --work for review; renders nothing
  python3 cut_reel.py cut_<k>.json --audio-only -o edit_<k>.mp3
      the edit's audio only (16 kHz mono MP3), rendered from the source, for the sentence-level
      branch's re-transcription; it is a throwaway draft, never delivered
  python3 cut_reel.py cut_<k>.json -o reels/<title>.mp4 [--work DIR]
      one encode from the source: ranges, join fades, framing, optional loudness, captions burned
      last; then <out>.report.json and <out>.sheet.jpg beside the Reel, and boundary frame strips
      and audio slices (1.5 s either side of each join, the opening and the ending) in --work

Exit 0 done; 1 refused (spec invalid: nothing rendered, nothing paid) or ffmpeg failed;
2 a tool, filter, encoder or font is missing (report it; never install).

Spec (JSON): video, name, segments[{start, end, framing}], width, height, fps ("source" or 24, 25,
30, 50, 60), audio_fade_ms (30, at most 100), meaning_check (required with two or more ranges),
words_file (source-timed words.json for review and captions), captions (null, or {style plain or
karaoke, words or words_file, time_base source or output, words_per_caption 3 (1-7), font,
font_size, margin_v, joiner}), loudnorm (null, or {I, TP, LRA}). Framing: {"mode": "pad"} (optionally "background":
"blur"), {"mode": "center_crop"}, {"mode": "crop", width, height, x, y} or {"mode": "crop", width,
height, keyframes: [{time, x, y}]} with segment-relative times. Full format: references/spec.md.
"""
import argparse
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
from fractions import Fraction

FPS_OPTIONS = (24, 25, 30, 50, 60)
MIN_RANGE_S = 0.150          # contract: each range at least 150 ms
MAX_RANGES = 40              # contract: at most 40 ranges per Reel
MAX_OUTPUT_S = 300.0         # contract: at most 300 output seconds per Reel
MAX_KEYFRAMES = 20           # contract: at most 20 segment-relative crop keyframes
ASPECT_TOL_PX = 2            # even rounding moves a crop up to 2 px off the exact aspect (606x1080 is 9:16)
FADE_DEFAULT_MS = 30
FADE_CAP_MS = 100
GAP_BREAK_S = 0.40           # a caption group never runs across a pause this long
REVIEW_WINDOW_S = 1.5        # boundary re-transcription window, either side
NEED_FILTERS = ["trim", "atrim", "setpts", "asetpts", "fps", "tpad", "apad", "afade", "concat", "scale",
                "pad", "crop", "boxblur", "overlay", "split", "aresample", "loudnorm", "blackdetect",
                "silencedetect", "tile", "subtitles", "ass"]
NEED_ENCODERS = ["libx264", "aac", "libmp3lame"]


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False))


def die(rc, msg, **extra):
    emit({"ok": False, "error": msg, **extra})
    sys.exit(rc)


def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def tool_caps():
    caps = {"ffmpeg": shutil.which("ffmpeg"), "ffprobe": shutil.which("ffprobe"), "fc-list": shutil.which("fc-list"),
            "filters": set(), "encoders": set()}
    if caps["ffmpeg"]:
        for line in run(["ffmpeg", "-hide_banner", "-filters"]).stdout.splitlines():
            parts = line.split()
            if len(parts) >= 3 and "->" in parts[2]:
                caps["filters"].add(parts[1])
        for line in run(["ffmpeg", "-hide_banner", "-encoders"]).stdout.splitlines():
            parts = line.split()
            if len(parts) >= 2 and len(parts[0]) == 6:
                caps["encoders"].add(parts[1])
    return caps


def preflight():
    c = tool_caps()
    missing = [t for t in ("ffmpeg", "ffprobe") if not c[t]]
    missing += [f"filter {f}" for f in NEED_FILTERS if c["ffmpeg"] and f not in c["filters"]]
    missing += [f"encoder {e}" for e in NEED_ENCODERS if c["ffmpeg"] and e not in c["encoders"]]
    if not c["fc-list"]:
        missing.append("fc-list")
    res = {"ok": not missing, "ffmpeg": c["ffmpeg"], "ffprobe": c["ffprobe"], "missing": missing}
    if c["ffmpeg"]:
        res["ffmpeg_version"] = run(["ffmpeg", "-hide_banner", "-version"]).stdout.split("\n")[0]
    emit(res)
    sys.exit(0 if not missing else 2)


def probe(path):
    p = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path])
    if p.returncode != 0:
        die(1, f"ffprobe cannot read {path}", stderr=p.stderr.strip()[-400:])
    d = json.loads(p.stdout)
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    subs = [s.get("codec_name") for s in d.get("streams", []) if s.get("codec_type") == "subtitle"]
    if not v:
        die(1, f"{path} has no video stream")
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if not rot and v.get("tags", {}).get("rotate"):
        rot = int(float(v["tags"]["rotate"]))
    w, h = int(v["width"]), int(v["height"])
    dw, dh = (h, w) if abs(rot) % 180 == 90 else (w, h)
    fr = v.get("avg_frame_rate") or "0/0"
    if fr in ("0/0", "0") or Fraction(fr) == 0:
        fr = v.get("r_frame_rate") or "30/1"
    dur = float(d.get("format", {}).get("duration") or v.get("duration") or 0)
    return {"path": path, "duration": dur, "coded_w": w, "coded_h": h, "display_w": dw, "display_h": dh,
            "rotation": rot, "fps": str(Fraction(fr).limit_denominator(1001)), "audio": a is not None,
            "audio_rate": int(a.get("sample_rate", 0)) if a else None, "subtitle_streams": subs,
            "vcodec": v.get("codec_name"), "acodec": a.get("codec_name") if a else None,
            "pix_fmt": v.get("pix_fmt")}


def even_down(n):
    n = int(n)
    return n - (n % 2)


def num(x):
    s = f"{float(x):.6f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def piecewise(kfs, key):
    """Linear path through segment-relative keyframes as an ffmpeg expression of t."""
    pts = [(float(k["time"]), float(k.get(key, 0))) for k in kfs]
    if len(pts) == 1:
        return num(pts[0][1])
    expr = num(pts[-1][1])
    for (t0, v0), (t1, v1) in reversed(list(zip(pts, pts[1:]))):
        seg = f"{num(v0)}+({num(v1 - v0)})*(t-{num(t0)})/{num(t1 - t0)}"
        expr = f"if(lt(t,{num(t1)}),{seg},{expr})"
    return f"if(lt(t,{num(pts[0][0])}),{num(pts[0][1])},{expr})"


def lerp_at(kfs, key, t):
    pts = [(float(k["time"]), float(k.get(key, 0))) for k in kfs]
    if t <= pts[0][0]:
        return pts[0][1]
    for (t0, v0), (t1, v1) in zip(pts, pts[1:]):
        if t < t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0)
    return pts[-1][1]


def resolve_framing(fr, src, W, H, dur_q, fps, i, problems, notes):
    dw, dh = src["display_w"], src["display_h"]
    mode = (fr or {}).get("mode", "pad")
    tag = f"segment {i}"
    if mode == "pad":
        bg = (fr or {}).get("background", "black")
        if bg not in ("black", "blur"):
            problems.append(f"{tag}: pad background must be black or blur")
        fit = f"scale={W}:{H}:force_original_aspect_ratio=decrease:force_divisible_by=2"
        if bg == "blur":
            chain = (f"split=2[bg{i}][fg{i}];[bg{i}]scale={W}:{H}:force_original_aspect_ratio=increase,"
                     f"crop={W}:{H},boxblur=20:2[bgb{i}];[fg{i}]{fit}[fgs{i}];[bgb{i}][fgs{i}]"
                     f"overlay=(W-w)/2:(H-h)/2")
        else:
            chain = f"{fit},pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black"
        return {"mode": "pad", "background": bg}, chain
    if mode == "center_crop":
        if dw * H >= dh * W:
            ch = even_down(dh)
            cw = even_down(math.floor(ch * W / H))
        else:
            cw = even_down(dw)
            ch = even_down(math.floor(cw * H / W))
        x, y = (dw - cw) // 2, (dh - ch) // 2
        return {"mode": "center_crop", "width": cw, "height": ch, "x": x, "y": y}, f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}"
    if mode != "crop":
        problems.append(f"{tag}: framing mode must be pad, center_crop or crop (never stretch)")
        return {"mode": mode}, "null"
    try:
        w0, h0 = int(fr["width"]), int(fr["height"])
    except (KeyError, TypeError, ValueError):
        problems.append(f"{tag}: crop needs integer width and height")
        return {"mode": "crop"}, "null"
    cw, ch = even_down(w0), even_down(h0)
    if (cw, ch) != (w0, h0):
        notes.append(f"{tag}: crop {w0}x{h0} rounded down to even {cw}x{ch}")
    if abs(cw - ch * W / H) > ASPECT_TOL_PX:
        problems.append(f"{tag}: crop {cw}x{ch} is not the output aspect {W}x{H} (a {ch * W / H:.1f} px wide "
                        f"crop is exact; tolerance {ASPECT_TOL_PX} px)")
    if cw > dw or ch > dh or cw <= 0 or ch <= 0:
        problems.append(f"{tag}: crop {cw}x{ch} does not fit the display-oriented source {dw}x{dh}")
    has_static = "x" in fr or "y" in fr
    kfs = fr.get("keyframes")
    if has_static and kfs:
        problems.append(f"{tag}: static x/y or keyframes, not both")
    if kfs:
        if not isinstance(kfs, list) or not (1 <= len(kfs) <= MAX_KEYFRAMES):
            problems.append(f"{tag}: 1 to {MAX_KEYFRAMES} keyframes")
            return {"mode": "crop"}, "null"
        kfs = [{**k, "y": k.get("y", (dh - ch) // 2)} for k in kfs]  # a keyframe without y keeps the vertical centre
        last_t = -1.0
        for j, k in enumerate(kfs):
            t, x, y = float(k.get("time", -1)), float(k.get("x", -1)), float(k.get("y", (dh - ch) // 2))
            if t <= last_t:
                problems.append(f"{tag}: keyframe {j} time {t} must be after the previous one (a camera cut is a "
                                "new segment, never a pan)")
            if t < 0 or t > dur_q + 1e-6:
                problems.append(f"{tag}: keyframe {j} time {t} is outside the segment (0-{dur_q:.3f} s)")
            if not (0 <= x <= dw - cw and 0 <= y <= dh - ch):
                problems.append(f"{tag}: keyframe {j} rectangle {cw}x{ch}+{x:g}+{y:g} leaves the {dw}x{dh} frame")
            last_t = t
        steps = max(1, int(dur_q * float(fps)))
        for n in range(steps + 1):  # the interpolated path, frame by frame, also stays inside
            t = n / float(fps)
            x, y = lerp_at(kfs, "x", t), lerp_at(kfs, "y", t)
            if not (-0.5 <= x <= dw - cw + 0.5 and -0.5 <= y <= dh - ch + 0.5):
                problems.append(f"{tag}: path leaves the frame at t={t:.2f} s")
                break
        ex = f"clip({piecewise(kfs, 'x')},0,iw-ow)"
        ey = f"clip({piecewise(kfs, 'y')},0,ih-oh)" if any("y" in k for k in kfs) else str((dh - ch) // 2)
        chain = f"crop=w={cw}:h={ch}:x='{ex}':y='{ey}',scale={W}:{H}"
        rects = [{"time": float(k.get("time", 0)), "x": float(k.get("x", 0)), "y": float(k.get("y", (dh - ch) // 2))} for k in kfs]
        return {"mode": "crop", "width": cw, "height": ch, "keyframes": rects}, chain
    x, y = int(fr.get("x", (dw - cw) // 2)), int(fr.get("y", (dh - ch) // 2))
    if not (0 <= x <= dw - cw and 0 <= y <= dh - ch):
        problems.append(f"{tag}: crop rectangle {cw}x{ch}+{x}+{y} leaves the {dw}x{dh} frame")
    return {"mode": "crop", "width": cw, "height": ch, "x": x, "y": y}, f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}"


def load_words_file(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError(f"{path} is not a word list")
    return data


def remap(words, segs, time_base, total):
    """Source-timed words to output time. Contiguous ranges form one run (no cut between them), so a word
    spanning their join is kept; a word straddling a real discontinuity is dropped (the cut is kept)."""
    kept, straddling = [], 0
    runs = []
    for g in segs:
        if runs and g.get("contiguous_with_previous"):
            runs[-1]["b"] = g["src_start"] + g["dur_q"]
        else:
            runs.append({"a": g["src_start"], "b": g["src_start"] + g["dur_q"], "out": g["out_start"]})
    for w in words:
        s, e = float(w["start"]), float(w["end"])
        if time_base == "output":
            if 0 <= s and e <= total + 1e-6:
                kept.append({**w, "start": s, "end": e, "seg": next((g["i"] for g in segs if g["out_start"] <= s < g["out_end"]), 0)})
            continue
        for r in runs:
            if r["a"] - 1e-6 <= s and e <= r["b"] + 1e-6:
                os_, oe = s - r["a"] + r["out"], e - r["a"] + r["out"]
                seg = next((g["i"] for g in segs if g["out_start"] - 1e-6 <= os_ < g["out_end"]), segs[0]["i"])
                kept.append({**w, "start": os_, "end": oe, "seg": seg})
                break
            if s < r["b"] and e > r["a"]:
                straddling += 1
                break
    kept.sort(key=lambda w: w["start"])
    return kept, straddling


def ass_time(t):
    cs = int(round(max(0.0, t) * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def ass_text(s):
    return str(s).replace("\\", "/").replace("{", "(").replace("}", ")").replace("\n", " ")


def build_ass(words, cap, W, H):
    """One caption layer. Placement, size and hold are SL8 defaults (see references/spec.md)."""
    per = int(cap.get("words_per_caption", 3))
    joiner = cap.get("joiner", " ")
    size = int(cap.get("font_size") or round(0.065 * min(W, H)))
    # 9:16 and other tall outputs: the block's bottom sits at the lower edge of the middle 60% of the
    # frame (platform UI covers the top and bottom); other aspects: a bottom margin of 8% of height.
    mv = int(cap.get("margin_v") if cap.get("margin_v") is not None else (round(0.20 * H) if H > W else round(0.08 * H)))
    outline = max(2, round(size * 0.06))
    karaoke = cap.get("style", "plain") == "karaoke"
    primary, secondary = ("&H0000D7FF", "&H00FFFFFF") if karaoke else ("&H00FFFFFF", "&H00FFFFFF")
    groups, cur = [], []
    for w in words:
        if cur and (len(cur) >= per or w["seg"] != cur[-1]["seg"] or w["start"] - cur[-1]["end"] >= GAP_BREAK_S
                    or re.search(r"[.?!…。？！]$", cur[-1]["text"])):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    unsure = sum(1 for g in groups if any(w.get("unsure") for w in g))
    groups = [g for g in groups if not any(w.get("unsure") for w in g)]  # an unconfirmed line stays uncaptioned
    events, cap_events = [], []
    for n, g in enumerate(groups):
        start, end = g[0]["start"], g[-1]["end"]
        nxt = groups[n + 1][0]["start"] if n + 1 < len(groups) else None
        if nxt is not None and nxt - end < 0.25:
            end = nxt
        if end - start < 0.30:
            end = min(start + 0.30, nxt) if nxt is not None else start + 0.30
        if karaoke:
            parts = []
            for j, w in enumerate(g):
                upto = g[j + 1]["start"] if j + 1 < len(g) else w["end"]
                parts.append(f"{{\\k{max(1, int(round((upto - w['start']) * 100)))}}}{ass_text(w['text'])}")
            text = joiner.join(parts)
        else:
            text = joiner.join(ass_text(w["text"]) for w in g)
        cap_events.append({"start": round(start, 3), "end": round(end, 3), "caption_mid_s": round((start + end) / 2, 3),
                           "text": " ".join(w["text"] for w in g)})
        events.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{text}")
    font = cap.get("font", "Noto Sans")
    head = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0",
            "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, "
            "Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, "
            "MarginL, MarginR, MarginV, Encoding",
            f"Style: Cap,{font},{size},{primary},{secondary},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{outline},0,2,"
            f"{round(0.08 * W)},{round(0.08 * W)},{mv},1", "", "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    info = {"style": "karaoke" if karaoke else "plain", "captions": len(events), "words_used": sum(len(g) for g in groups),
            "lines_left_uncaptioned_unsure": unsure, "font": font, "font_size": size, "margin_v": mv,
            "words_per_caption": per, "caption_events": cap_events,
            "frame_check_mid_s": [cap_events[round(k * (len(cap_events) - 1) / (min(8, len(cap_events)) - 1))]["caption_mid_s"]
                                  for k in range(min(8, len(cap_events)))] if len(cap_events) > 1 else
                                 [e["caption_mid_s"] for e in cap_events]}
    return "\n".join(head + events) + "\n", info


def plan_spec(spec, spec_dir, problems, notes):
    src_path = spec.get("video")
    if not src_path:
        die(1, "spec has no video")
    if not os.path.isabs(src_path):
        src_path = os.path.abspath(src_path)
    if not os.path.exists(src_path):
        die(1, f"source {src_path} does not exist")
    src = probe(src_path)
    W, H = spec.get("width", 1080), spec.get("height", 1920)
    if not (isinstance(W, int) and isinstance(H, int) and 128 <= W <= 1920 and 128 <= H <= 1920 and W % 2 == 0 and H % 2 == 0):
        problems.append(f"width and height must be even integers 128-1920, got {W}x{H}")
        W, H = 1080, 1920
    fps_in = spec.get("fps", "source")
    if fps_in == "source":
        fps = Fraction(src["fps"])
    elif fps_in in FPS_OPTIONS:
        fps = Fraction(fps_in)
    else:
        problems.append(f"fps must be source or one of {FPS_OPTIONS}")
        fps = Fraction(30)
    fade_ms = spec.get("audio_fade_ms", FADE_DEFAULT_MS)
    if not (isinstance(fade_ms, (int, float)) and 0 <= fade_ms <= FADE_CAP_MS):
        problems.append(f"audio_fade_ms must be 0-{FADE_CAP_MS}")
        fade_ms = FADE_DEFAULT_MS
    raw = spec.get("segments") or []
    if not (1 <= len(raw) <= MAX_RANGES):
        problems.append(f"1 to {MAX_RANGES} segments, got {len(raw)}")
    segs, out_t = [], 0.0
    for i, r in enumerate(raw):
        try:
            s, e = float(r["start"]), float(r["end"])
        except (KeyError, TypeError, ValueError):
            problems.append(f"segment {i}: start and end in source seconds are required")
            continue
        contiguous = bool(segs) and abs(segs[-1]["src_end"] - s) < 0.001
        s_eff = segs[-1]["src_start"] + segs[-1]["dur_q"] if contiguous else s
        if s < 0 or e > src["duration"] + 1e-3 or e <= s:
            problems.append(f"segment {i}: [{s}, {e}) is outside the source (0-{src['duration']:.3f} s) or empty")
        if e - s < MIN_RANGE_S:
            problems.append(f"segment {i}: {e - s:.3f} s is under the {MIN_RANGE_S * 1000:.0f} ms minimum")
        frames = max(1, int(round((e - s_eff) * fps)))
        dur_q = float(Fraction(frames) / fps)
        segs.append({"i": i, "src_start": s_eff, "src_end": e, "requested": [s, e], "dur_q": dur_q, "frames": frames,
                     "out_start": out_t, "out_end": out_t + dur_q, "contiguous_with_previous": contiguous,
                     "framing_in": r.get("framing")})
        out_t += dur_q
    for a in range(len(segs)):
        for b in range(a + 1, len(segs)):
            A, B = segs[a]["requested"], segs[b]["requested"]
            if A[0] < B[1] - 1e-6 and B[0] < A[1] - 1e-6:
                problems.append(f"segments {a} and {b} overlap in the source (duplicate ranges are not allowed)")
    reordered = any(segs[k]["src_start"] < segs[k - 1]["src_start"] for k in range(1, len(segs)))
    if len(segs) > 1 and not str(spec.get("meaning_check") or "").strip():
        problems.append("two or more ranges (an internal removal or a reorder) need a meaning_check sentence")
    if out_t > MAX_OUTPUT_S:
        problems.append(f"output {out_t:.1f} s is over the {MAX_OUTPUT_S:.0f} s per-Reel limit")
    fade = fade_ms / 1000.0
    for k, g in enumerate(segs):
        g["fade_in"] = min(fade, g["dur_q"] / 2) if (k == 0 or not g["contiguous_with_previous"]) else 0.0
        nxt_contig = k + 1 < len(segs) and segs[k + 1]["contiguous_with_previous"]
        g["fade_out"] = min(fade, g["dur_q"] / 2) if not nxt_contig else 0.0
        g["framing"], g["chain"] = resolve_framing(g["framing_in"], src, W, H, g["dur_q"], fps, g["i"], problems, notes)
    words_file = spec.get("words_file")
    review_words = []
    if words_file:
        wf = words_file if os.path.isabs(words_file) else os.path.abspath(words_file)
        try:
            review_words = load_words_file(wf)
        except (OSError, ValueError) as exc:
            problems.append(f"words_file: {exc}")
    cap = spec.get("captions")
    cap_words, cap_info, ass = None, None, None
    if cap:
        if cap.get("style", "plain") not in ("plain", "karaoke"):
            problems.append("captions.style must be plain or karaoke (styled captions are not offered)")
        if not (1 <= int(cap.get("words_per_caption", 3)) <= 7):
            problems.append("captions.words_per_caption must be 1-7")
        tb = cap.get("time_base", "source")
        if tb not in ("source", "output"):
            problems.append("captions.time_base must be source or output")
        words = cap.get("words")
        if words is None and cap.get("words_file"):
            cwf = cap["words_file"] if os.path.isabs(cap["words_file"]) else os.path.abspath(cap["words_file"])
            try:
                words = load_words_file(cwf)
            except (OSError, ValueError) as exc:
                problems.append(f"captions.words_file: {exc}")
                words = []
        if words is None:
            words = review_words
        if not words or len(words) > 10000:
            problems.append("captions need 1-10,000 verified words (captions.words or words_file)")
        elif not src["audio"]:
            problems.append("captions on a source with no audio stream: there is no speech to caption")
        else:
            cap_words, straddle = remap(words, segs, tb, out_t)
            ass, cap_info = build_ass(cap_words, cap, W, H)
            cap_info["dropped_straddling_a_cut"] = straddle
            cap_info["time_base"] = tb
    loud = spec.get("loudnorm")
    if loud:
        I, TP, LRA = float(loud.get("I", -14)), float(loud.get("TP", -1.5)), float(loud.get("LRA", 11))
        if not (-70 <= I <= -5 and -9 <= TP <= 0 and 1 <= LRA <= 50):
            problems.append("loudnorm I -70..-5, TP -9..0, LRA 1..50")
        loud = {"I": I, "TP": TP, "LRA": LRA}
        if not src["audio"]:
            notes.append("loudnorm skipped: the source has no audio stream")
            loud = None
    rw, _ = remap(review_words, segs, "source", out_t) if review_words else ([], 0)
    return {"src": src, "W": W, "H": H, "fps": fps, "segs": segs, "total": out_t, "reordered": reordered,
            "captions": cap_info, "ass": ass, "loudnorm": loud, "review_words": rw,
            "name": spec.get("name") or "reel"}


def graph(plan, audio_only=False, loud_measured=None, loud_measure_pass=False):
    fps = plan["fps"]
    fps_s = f"{fps.numerator}/{fps.denominator}"
    parts, labels = [], []
    has_a = plan["src"]["audio"]
    for g in plan["segs"]:
        i = g["i"]
        if not audio_only:
            parts.append(f"[{i}:v:0]setpts=PTS-STARTPTS,fps={fps_s},tpad=stop_mode=clone:stop_duration=1,"
                         f"trim=end_frame={g['frames']},setpts=PTS-STARTPTS,{g['chain']},setsar=1[v{i}]")
        if has_a:
            fades = ""
            if g["fade_in"] > 0:
                fades += f",afade=t=in:st=0:d={g['fade_in']:.3f}"
            if g["fade_out"] > 0:
                fades += f",afade=t=out:st={g['dur_q'] - g['fade_out']:.6f}:d={g['fade_out']:.3f}"
            parts.append(f"[{i}:a:0]asetpts=PTS-STARTPTS,aresample=48000,apad,atrim=end={g['dur_q']:.6f},"
                         f"asetpts=PTS-STARTPTS{fades}[a{i}]")
        labels.append((f"[v{i}]" if not audio_only else "") + (f"[a{i}]" if has_a else ""))
    n = len(plan["segs"])
    if audio_only:
        parts.append("".join(labels) + f"concat=n={n}:v=0:a=1[ac]")
    else:
        parts.append("".join(labels) + f"concat=n={n}:v=1:a={1 if has_a else 0}[vc]" + ("[ac]" if has_a else ""))
    vout, aout = "vc", "ac"
    L = plan["loudnorm"]
    if has_a and L and (loud_measure_pass or loud_measured):
        base = f"loudnorm=I={L['I']}:TP={L['TP']}:LRA={L['LRA']}"
        if loud_measure_pass:
            parts.append(f"[ac]{base}:print_format=json[an]")
        else:
            m = loud_measured
            parts.append(f"[ac]{base}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
                         f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json,"
                         f"aresample=48000[an]")
        aout = "an"
    if not audio_only and plan["ass"]:
        parts.append("[vc]subtitles=filename=cap.ass[vs]")  # the last video filter: after all cuts and framing
        vout = "vs"
    return ";".join(parts), vout, aout


def inputs(plan):
    args = []
    for g in plan["segs"]:
        args += ["-ss", f"{g['src_start']:.6f}", "-t", f"{g['dur_q'] + 0.5:.6f}", "-i", plan["src"]["path"]]
    return args


def last_json(text):
    m = None
    for m in re.finditer(r"\{[^{}]*\}", text, re.S):
        pass
    return json.loads(m.group(0)) if m else None


def review(plan, out_path, work, report_path, sheet_path):
    o = probe(out_path)
    D = o["duration"]
    fps = float(plan["fps"])
    cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-i", out_path, "-vf", "blackdetect=d=0.1:pix_th=0.10"]
    if o["audio"]:
        cmd += ["-af", "silencedetect=n=-45dB:d=0.4"]
    cmd += ["-f", "null", "-"]
    err = run(cmd).stderr
    black = [{k: float(v) for k, v in re.findall(r"(black_start|black_end|black_duration):([\d.]+)", ln)}
             for ln in err.splitlines() if "black_start" in ln]
    sil, cur = [], {}
    for ln in err.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", ln)
        if m:
            cur = {"start": float(m.group(1))}
        m = re.search(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", ln)
        if m:
            cur.update({"end": float(m.group(1)), "duration": float(m.group(2))})
            sil.append(cur)
            cur = {}
    if cur:
        sil.append({**cur, "end": D, "duration": round(D - cur["start"], 3)})
    run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", out_path, "-vf",
         f"fps={12 / max(D, 0.1):.6f},scale=320:-2,tile=4x3", "-frames:v", "1", "-q:v", "3", sheet_path])
    points = [("open", 0.0, False)] + [("join", g["out_start"], g["contiguous_with_previous"]) for g in plan["segs"][1:]] \
        + [("end", D, False)]
    joins = []
    for n, (kind, t, contiguous) in enumerate(points):
        strip = os.path.join(work, f"boundary_{n:02d}_{kind}.jpg")
        t0 = min(max(0.0, t - 0.2), max(0.0, D - 0.4))
        # Four frames 0.1 s apart from t-0.2: t-0.2, t-0.1, t and t+0.1 (three consecutive frames miss the join).
        run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", f"{t0:.3f}", "-i", out_path, "-t", "0.4", "-vf",
             "fps=10,scale=320:-2,tile=4x1", "-frames:v", "1", "-q:v", "3", strip])
        a, b = max(0.0, t - REVIEW_WINDOW_S), min(D, t + REVIEW_WINDOW_S)
        row = {"n": n, "kind": kind, "t_out": round(t, 3), "frames": strip,
               "frames_at": [round(t0 + 0.1 * k, 2) for k in range(4)], "contiguous": contiguous}
        if o["audio"]:
            sl = os.path.join(work, f"boundary_{n:02d}_{kind}.mp3")
            run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", out_path,
                 "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", sl])
            row.update({"slice": sl, "slice_window": [round(a, 3), round(b, 3)],
                        "expected_words": " ".join(w["text"] for w in plan["review_words"]
                                                   if w["start"] >= a and w["end"] <= b)})
        joins.append(row)
    W, H = plan["W"], plan["H"]
    exp = plan["total"]
    rep = {"schema": "sl8.edit-highlights.report/1", "name": plan["name"], "job": plan["job"],
           "source": {k: plan["src"][k] for k in ("path", "duration", "display_w", "display_h", "rotation", "fps", "audio", "subtitle_streams")},
           "output": {"path": out_path, "width": o["display_w"], "height": o["display_h"], "fps": o["fps"],
                      "duration_s": round(D, 3), "audio": o["audio"], "vcodec": o["vcodec"], "acodec": o["acodec"],
                      "pix_fmt": o["pix_fmt"]},
           "declared": {"width": W, "height": H, "fps": f"{plan['fps'].numerator}/{plan['fps'].denominator}",
                        "duration_s": round(exp, 3), "audio": plan["src"]["audio"]},
           "duration_diff_s": round(D - exp, 3), "one_frame_s": round(1 / fps, 4),
           "segments": [{"i": g["i"], "source": [round(g["src_start"], 3), round(g["src_start"] + g["dur_q"], 3)],
                         "requested": g["requested"], "output": [round(g["out_start"], 3), round(g["out_end"], 3)],
                         "framing": g["framing"], "fade_in_s": g["fade_in"], "fade_out_s": g["fade_out"]} for g in plan["segs"]],
           "boundaries_quantised": "each range moves by up to half an output frame; never claim sample-exact boundaries",
           "joins": joins, "captions": plan["captions"], "loudnorm": plan.get("loudnorm_result"),
           "blackdetect": black, "silencedetect": sil, "sheet": sheet_path, "notes": plan["notes"]}
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(rep, fh, ensure_ascii=False, indent=1)
    return rep


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec", nargs="?")
    ap.add_argument("-o", "--out")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--audio-only", action="store_true")
    ap.add_argument("--preflight", action="store_true")
    ap.add_argument("--work")
    a = ap.parse_args()
    if a.preflight:
        preflight()
    if not a.spec:
        die(1, "name the cut spec (cut_<k>.json)")
    caps = tool_caps()
    if not caps["ffmpeg"] or not caps["ffprobe"]:
        die(2, "ffmpeg and ffprobe are required (report the broken machine; never install)")
    with open(a.spec, "rb") as fh:
        blob = fh.read()
    spec = json.loads(blob)
    digest = hashlib.sha256(blob).hexdigest()
    problems, notes = [], []
    plan = plan_spec(spec, os.path.dirname(os.path.abspath(a.spec)), problems, notes)
    plan["notes"] = notes
    plan["job"] = {"plan_sha256": digest, "job_id": f"{os.getpid()}-{digest[:12]}"}
    stem = os.path.splitext(os.path.basename(a.out or a.spec))[0]
    work = os.path.abspath(a.work or os.path.join("work", stem))
    os.makedirs(work, exist_ok=True)
    if plan["ass"]:
        with open(os.path.join(work, f"{stem}.ass"), "w", encoding="utf-8") as fh:
            fh.write(plan["ass"])
    readback = {"source": {k: plan["src"][k] for k in ("duration", "display_w", "display_h", "rotation", "fps", "audio")},
                "output": f"{plan['W']}x{plan['H']} at {plan['fps']} fps, {plan['total']:.3f} s",
                "reordered": plan["reordered"],
                "segments": [{"i": g["i"], "source": [round(g["src_start"], 3), round(g["src_start"] + g["dur_q"], 3)],
                              "output": [round(g["out_start"], 3), round(g["out_end"], 3)], "frames": g["frames"],
                              "framing": g["framing"], "fade_in_s": g["fade_in"], "fade_out_s": g["fade_out"]}
                             for g in plan["segs"]],
                "captions": plan["captions"], "loudnorm": plan["loudnorm"], "notes": notes,
                "caption_file": os.path.join(work, f"{stem}.ass") if plan["ass"] else None}
    if problems:
        die(1, "spec refused; nothing rendered", problems=problems, readback=readback)
    if a.check:
        emit({"ok": True, "check": True, **readback, "job": plan["job"]})
        return
    if not a.out:
        die(1, "-o is required to render")
    out_path = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    need = [f for f in ("trim", "atrim", "concat", "afade", "tpad", "apad", "fps") if f not in caps["filters"]]
    if plan["ass"] and "subtitles" not in caps["filters"]:
        need.append("subtitles (libass)")
    if plan["loudnorm"] and "loudnorm" not in caps["filters"]:
        need.append("loudnorm")
    enc = ["libmp3lame"] if a.audio_only else ["libx264"] + (["aac"] if plan["src"]["audio"] else [])
    need += [f"encoder {e}" for e in enc if e not in caps["encoders"]]
    if need:
        die(2, "missing on this machine (report it; never install)", missing=need)
    if plan["ass"] and caps["fc-list"]:
        font = (spec.get("captions") or {}).get("font", "Noto Sans")
        if not run(["fc-list", f":family={font}", "family"]).stdout.strip():
            die(2, f"caption font '{font}' is not installed (fc-list): pick an installed Noto family")
    tmp = tempfile.mkdtemp(prefix="cutreel-")
    try:
        if plan["ass"]:
            with open(os.path.join(tmp, "cap.ass"), "w", encoding="utf-8") as fh:
                fh.write(plan["ass"])
        if a.audio_only:
            if not plan["src"]["audio"]:
                die(1, "the source has no audio stream")
            g, _, aout = graph(plan, audio_only=True)
            p = run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *inputs(plan), "-filter_complex", g, "-map", f"[{aout}]",
                     "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", out_path], cwd=tmp)
            if p.returncode != 0:
                die(1, "ffmpeg failed", stderr=p.stderr.strip()[-1500:])
            emit({"ok": True, "audio_only": out_path, "duration_s": round(plan["total"], 3),
                  "joins_out": [round(s["out_start"], 3) for s in plan["segs"][1:]], "job": plan["job"]})
            return
        measured = None
        if plan["loudnorm"]:
            g, _, aout = graph(plan, audio_only=True, loud_measure_pass=True)
            p = run(["ffmpeg", "-hide_banner", "-nostdin", *inputs(plan), "-filter_complex", g, "-map", f"[{aout}]",
                     "-f", "null", "-"], cwd=tmp)
            measured = last_json(p.stderr) if p.returncode == 0 else None
            if not measured:
                die(1, "loudnorm measure pass failed", stderr=p.stderr.strip()[-800:])
        g, vout, aout = graph(plan, loud_measured=measured)
        cmd = ["ffmpeg", "-hide_banner", "-nostdin", "-y", *inputs(plan), "-filter_complex", g, "-map", f"[{vout}]"]
        if plan["src"]["audio"]:
            cmd += ["-map", f"[{aout}]", "-c:a", "aac", "-b:a", "192k"]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                "-r", f"{plan['fps'].numerator}/{plan['fps'].denominator}", "-movflags", "+faststart", out_path]
        p = run(cmd, cwd=tmp)
        if p.returncode != 0:
            die(1, "ffmpeg failed", stderr=p.stderr.strip()[-1500:])
        if measured:
            second = last_json(p.stderr) or {}
            plan["loudnorm_result"] = {"target": plan["loudnorm"], "measured_first_pass": measured,
                                       "normalization_type": second.get("normalization_type"),
                                       "output_i": second.get("output_i"), "output_tp": second.get("output_tp")}
        base = os.path.splitext(out_path)[0]
        rep = review(plan, out_path, work, base + ".report.json", base + ".sheet.jpg")
        emit({"ok": True, "out": out_path, "report": base + ".report.json", "sheet": base + ".sheet.jpg",
              "duration_s": rep["output"]["duration_s"], "duration_diff_s": rep["duration_diff_s"],
              "black": len(rep["blackdetect"]), "silences": len(rep["silencedetect"]), "joins": len(rep["joins"]),
              "job": plan["job"]})
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
