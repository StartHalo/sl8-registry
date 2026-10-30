#!/usr/bin/env python3
"""validate_plan.py: the edit plan (work/<p>/edit-plan.json, schema sl8.edit.plan/1) that
cut_reframe.py renders. Its segments use the cut-and-reframe input shape WF26-a1 keeps as our
contract. SL8-authored from the behaviour WF26-a1 records (steps 2, 4, 7, 8); Python 3.11 stdlib.

  init    --src FILE --probe probe.json --out edit-plan.json [--project P] [--name N]
          [--size WxH] [--fps 24|25|30|50|60|source] [--segments JSON|@file] [--guardrails off]
          source facts are written from the probe only (display size after rotation, rates, VFR flag,
          audio streams, duration) with the source's sha256
  check   edit-plan.json [--words stt.json] [--verify-source]
          ranges, size, rate, framing and crop bounds; with words, no edge inside a word and the gap
          each edge sits in (>= 0.4 s natural, 0.15-0.4 s inspect the waveform strip, < 0.15 s keep
           more context); without words the word check is skipped and said so (a warning when the
          source has sound and the plan has more than one range). The source is hashed in init and in
          cut_reframe.py; check re-hashes it only with --verify-source (a large master is a full read)
          every size, speed and fade bound is a default in plan.limits (min_side, max_side, speed_min,
          speed_max, max_fade_ms, max_ranges, max_output_s, min_range_s, max_keyframes)
  deadair edit-plan.json --words stt.json [--keep 0.15] [--min-pause 0.6] [--view-over 1.5]
          [--within START,END] [--keep-pauses T1,T2] [--viewed-strips F1,F2] [--write]
           opt-in dead-air removal: pauses between words become cuts inside the plan's existing ranges
          (each keeps its framing and speed; ranges outside --within stay as they are), each pause
          shortened to --keep seconds (half each side); pauses over --view-over are listed for a
          frame-strip look first, and --write refuses until --viewed-strips names a strip file that
          exists for every one of them (--keep-pauses for any kept)
  sidecar --final F --plan edit-plan.json [--report cut.report.json] [--declared JSON] [--name N]
          [--tags a,b] [--done TEXT]... [--not-done TEXT]... [--incomplete TEXT]... [--splice-report FILE]
          writes <F stem>.json {name, tags, plan, declared, measured, checks_done, checks_not_done}.
          The report's declared and checks_done are taken only when F is byte-identical to the report's
          output; any other delivery (WebM, GIF, size cap, bookends, marks, upscale) needs --declared
          for that file and --done only for checks run on that file. A plan with more than one range
          needs --splice-report FILE (the step 18 result) or a --not-done line naming the gap
Prints one JSON line. Exit: 0 ok; 1 errors (listed); 2 usage; 3 a source guardrail is exceeded.
"""
import argparse, hashlib, json, os, sys
from fractions import Fraction

SCHEMA = "sl8.edit.plan/1"
FPS_CHOICES = (24, 25, 30, 50, 60)
DEFAULT_LIMITS = {"min_range_s": 0.15, "max_ranges": 40, "max_output_s": 300, "max_keyframes": 20,
                  "min_side": 128, "max_side": 1920, "speed_min": 0.25, "speed_max": 4, "max_fade_ms": 100}
GUARDRAILS = {"max_hours": 4, "max_gb": 10, "max_fps": 60}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rate(s):
    try:
        f = Fraction(str(s))
        return float(f) if f > 0 else None
    except (ValueError, ZeroDivisionError):
        return None


def out(obj, code):
    print(json.dumps(obj, ensure_ascii=False))
    sys.exit(code)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_words(path):
    sys.dont_write_bytecode = True   # no __pycache__ inside the installed skill
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import make_ass
    return make_ass.load_words(path)


# ---------- init
def source_facts(src, probe):
    fmt = probe.get("format", {})
    vs = [s for s in probe.get("streams", []) if s.get("codec_type") == "video" and not (s.get("disposition") or {}).get("attached_pic")]
    if not vs:
        return None, "the probe shows no video stream"
    v = vs[0]
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    if not rot and (v.get("tags") or {}).get("rotate"):
        rot = int(float(v["tags"]["rotate"]))
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    r, avg = rate(v.get("r_frame_rate")), rate(v.get("avg_frame_rate"))
    vfr = bool(r and avg and abs(r - avg) / r > 0.005)
    auds = [s for s in probe.get("streams", []) if s.get("codec_type") == "audio"]
    a_start = round(float(auds[0].get("start_time") or 0), 3) if auds else 0.0
    v_start = round(float(v.get("start_time") or 0), 3)
    dur = float(fmt.get("duration") or v.get("duration") or 0)
    return {
        "path": src, "sha256": sha256(src), "bytes": os.path.getsize(src), "duration_s": round(dur, 3),
        "width": w, "height": h, "coded_width": int(v["width"]), "coded_height": int(v["height"]), "rotation": rot,
        "r_frame_rate": v.get("r_frame_rate"), "avg_frame_rate": v.get("avg_frame_rate"),
        "avg_fps": round(avg or r or 30.0, 6), "vfr": vfr, "audio": bool(auds), "audio_streams": len(auds),
        "audio_stream_used": 0 if auds else None, "codec": v.get("codec_name"),
        "audio_start_s": a_start, "video_start_s": v_start,
    }, None


def resolve_fps(plan):
    f = plan.get("fps")
    src = plan.get("source", {})
    if f in (None, "", "average"):
        return rate(src.get("avg_frame_rate")) or src.get("avg_fps")
    if f == "source":
        return rate(src.get("r_frame_rate")) or src.get("avg_fps")
    return float(f)


def cmd_init(a):
    if not os.path.isfile(a.src):
        out({"ok": False, "errors": [f"no source file {a.src}"]}, 1)
    facts, err = source_facts(a.src, load_json(a.probe))
    if err:
        out({"ok": False, "errors": [err]}, 1)
    over = []
    if facts["duration_s"] > GUARDRAILS["max_hours"] * 3600:
        over.append(f"duration {facts['duration_s']} s is over {GUARDRAILS['max_hours']} h")
    if facts["bytes"] > GUARDRAILS["max_gb"] * 1e9:
        over.append(f"size {facts['bytes']} bytes is over {GUARDRAILS['max_gb']} GB")
    if facts["avg_fps"] > GUARDRAILS["max_fps"] + 0.5:
        over.append(f"frame rate {facts['avg_fps']} is over {GUARDRAILS['max_fps']} fps")
    if over and a.guardrails != "off":
        out({"ok": False, "errors": over, "note": "source guardrails are defaults; a kit or brief may lift them (--guardrails off)"}, 3)
    w, h = 1080, 1920
    if a.size:
        try:
            w, h = (int(x) for x in a.size.lower().split("x"))
        except ValueError:
            out({"ok": False, "errors": ["--size must be WxH"]}, 2)
    fps = a.fps
    if fps not in (None, "source"):
        try:
            fps = int(fps)
        except ValueError:
            out({"ok": False, "errors": ["--fps must be 24, 25, 30, 50, 60 or source"]}, 2)
    segs = []
    if a.segments:
        body = a.segments
        if body.startswith("@"):
            with open(body[1:], encoding="utf-8") as f:
                body = f.read()
        segs = json.loads(body)
    plan = {"schema": SCHEMA, "project": a.project, "name": a.name or os.path.splitext(os.path.basename(a.src))[0],
            "source": facts, "segments": segs, "width": w, "height": h, "fps": fps, "pad_color": "black",
            "audio_fade_ms": 30, "normalize_audio": None, "limits": dict(DEFAULT_LIMITS),
            "encode": {"vcodec": "libx264", "preset": "medium", "crf": 18, "pix_fmt": "yuv420p", "acodec": "aac", "audio_kbps": 192},
            "jobs": [], "notes": []}
    if facts["audio_streams"] > 1:
        plan["notes"].append(f"source has {facts['audio_streams']} audio streams; stream 0 is used")
    if abs(facts.get("audio_start_s", 0) - facts.get("video_start_s", 0)) > 0.05:
        plan["notes"].append(f"audio starts at {facts['audio_start_s']} s and video at {facts['video_start_s']} s: word times from the extracted audio are early or late by the difference against the picture; shift the words before checking edges")
    if facts["vfr"]:
        plan["notes"].append("variable frame rate source: the render makes it constant")
    plan["fps_resolved"] = round(resolve_fps(plan), 6)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=1, ensure_ascii=False)
    out({"ok": True, "plan": a.out, "source": {k: facts[k] for k in ("duration_s", "width", "height", "rotation", "avg_frame_rate", "vfr", "audio", "audio_streams")},
         "notes": plan["notes"]}, 0)


# ---------- check
def kf_value(kfs, t, key):
    if t <= kfs[0]["time"]:
        return kfs[0][key]
    for a, b in zip(kfs, kfs[1:]):
        if t < b["time"]:
            return a[key] + (b[key] - a[key]) * (t - a["time"]) / (b["time"] - a["time"])
    return kfs[-1][key]


def viewed_ok(fr, tag, errors):
    """A crop is allowed only from a strip that was made and looked at: viewed true plus a strip file."""
    strip = fr.get("viewed_strip")
    if fr.get("viewed") is not True:
        errors.append(f"{tag}: {fr.get('mode')} needs \"viewed\": true after you looked at the range strip (pad when unsure)")
    elif not isinstance(strip, str) or not os.path.isfile(strip):
        errors.append(f"{tag}: {fr.get('mode')} needs \"viewed_strip\" naming the strip file you looked at (an existing file under work/<p>/; run from the project root)")


def check(plan, words=None, verify_source=True):
    errors, warnings, edges = [], [], []
    lim = {**DEFAULT_LIMITS, **(plan.get("limits") or {})}
    src = plan.get("source") or {}
    if plan.get("schema") != SCHEMA:
        errors.append(f"schema is {plan.get('schema')!r}, not {SCHEMA}")
    dur = float(src.get("duration_s") or 0)
    sw, sh = int(src.get("width") or 0), int(src.get("height") or 0)
    if verify_source and src.get("path") and os.path.isfile(src["path"]) and src.get("sha256"):
        if sha256(src["path"]) != src["sha256"]:
            errors.append("the source file no longer matches the plan's sha256: re-run init on the read-only master")
    W, H = plan.get("width"), plan.get("height")
    for k, v in (("width", W), ("height", H)):
        if not isinstance(v, int) or v % 2 or not lim["min_side"] <= v <= lim["max_side"]:
            errors.append(f"{k} {v!r} must be an even integer from {lim['min_side']} to {lim['max_side']} (default; limits.min_side and limits.max_side may change it)")
    fps = plan.get("fps")
    if fps not in (None, "source") and fps not in FPS_CHOICES:
        errors.append(f"fps {fps!r} must be 24, 25, 30, 50, 60, source, or null (source average made constant)")
    fade = plan.get("audio_fade_ms", 30)
    if not isinstance(fade, int) or not 0 <= fade <= lim["max_fade_ms"]:
        errors.append(f"audio_fade_ms {fade!r} must be an integer 0-{lim['max_fade_ms']} (default 30; limits.max_fade_ms)")
    segs = plan.get("segments") or []
    if not segs:
        errors.append("no segments")
    if len(segs) > lim["max_ranges"]:
        errors.append(f"{len(segs)} ranges is over the {lim['max_ranges']}-range default (limits.max_ranges)")
    total = 0.0
    for i, s in enumerate(segs):
        tag = f"segment {i}"
        try:
            a, b = float(s["start"]), float(s["end"])
        except (KeyError, TypeError, ValueError):
            errors.append(f"{tag}: start and end must be numbers"); continue
        sp = float(s.get("speed", 1) or 1)
        if not lim["speed_min"] <= sp <= lim["speed_max"]:
            errors.append(f"{tag}: speed {sp} must be {lim['speed_min']}-{lim['speed_max']} (default; limits.speed_min and limits.speed_max)")
        if a < 0 or b <= a:
            errors.append(f"{tag}: [{a}, {b}) is empty or negative")
        if dur and b > dur + 1e-3:
            errors.append(f"{tag}: end {b} is past the source end {dur}")
        if b - a < lim["min_range_s"] - 1e-9:
            errors.append(f"{tag}: {round(b - a, 3)} s is under the {lim['min_range_s']} s minimum")
        total += (b - a) / sp
        for j in range(i):
            o = segs[j]
            try:
                oa, ob = float(o["start"]), float(o["end"])
            except (KeyError, TypeError, ValueError):
                continue
            if a < ob and oa < b:
                errors.append(f"{tag} overlaps segment {j} (duplicated or overlapping source time is not supported)")
        fr = s.get("framing") or {"mode": "pad"}
        mode = fr.get("mode")
        if mode not in ("pad", "center_crop", "crop"):
            errors.append(f"{tag}: framing mode {mode!r} must be pad, center_crop or crop"); continue
        if mode == "center_crop":
            viewed_ok(fr, tag, errors)
        if mode == "crop":
            cw, ch = fr.get("width"), fr.get("height")
            if not isinstance(cw, int) or not isinstance(ch, int) or cw <= 0 or ch <= 0:
                errors.append(f"{tag}: crop needs integer width and height in source pixels"); continue
            if cw % 2 or ch % 2:
                warnings.append(f"{tag}: crop {cw}x{ch} is odd; the render rounds down to {cw - cw % 2}x{ch - ch % 2}")
                cw, ch = cw - cw % 2, ch - ch % 2
            if isinstance(W, int) and isinstance(H, int) and H and ch:
                off = abs(cw / ch - W / H) / (W / H)
                if off > 0.01:
                    errors.append(f"{tag}: crop {cw}x{ch} ({round(cw / ch, 4)}) is {round(off * 100, 2)}% off the output aspect {W}x{H} ({round(W / H, 4)})")
            kfs = fr.get("keyframes")
            if kfs is not None and ("x" in fr or "y" in fr):
                errors.append(f"{tag}: crop takes static x/y or keyframes, not both")
            pts = []
            if kfs:
                if len(kfs) > lim["max_keyframes"]:
                    errors.append(f"{tag}: {len(kfs)} keyframes is over {lim['max_keyframes']}")
                times = [float(k.get("time", -1)) for k in kfs]
                if times != sorted(times) or times[0] < 0 or times[-1] > (b - a) + 1e-3:
                    errors.append(f"{tag}: keyframe times must rise from 0 within the range ({round(b - a, 3)} s)")
                pts = [(float(k.get("x", 0)), float(k.get("y", 0))) for k in kfs]
            else:
                pts = [(float(fr.get("x", (sw - cw) / 2)), float(fr.get("y", (sh - ch) / 2)))]
            for x, y in pts:
                if x < 0 or y < 0 or x + cw > sw + 1e-6 or y + ch > sh + 1e-6:
                    errors.append(f"{tag}: crop {cw}x{ch} at ({x}, {y}) leaves the {sw}x{sh} source (display orientation)")
                    break
            viewed_ok(fr, tag, errors)
    if total > lim["max_output_s"] + 1e-6:
        errors.append(f"output {round(total, 3)} s is over the {lim['max_output_s']} s default (limits.max_output_s)")
    word_note = None
    if words is None:
        word_note = "no transcript: the edge-inside-a-word check was skipped; edges rest on the silence map and frame strips"
        if src.get("audio") and len(segs) > 1:
            warnings.append("NO TRANSCRIPT on a source with sound and more than one range: an edge can fall inside a word and nothing here will see it; transcribe (step 5) and re-run with --words, or say in the delivery that the word check was not done")
    else:
        for i in range(1, len(words)):
            if words[i]["start"] < words[i - 1]["start"] - 1e-6:
                errors.append("words are not in source order"); break
        if words and dur and words[-1]["end"] > dur + 0.05:
            errors.append(f"last word ends at {words[-1]['end']} s, after the source end {dur} s: wrong transcript for this file")
        for i, s in enumerate(segs):
            for side in ("start", "end"):
                try:
                    t = float(s[side])
                except (KeyError, TypeError, ValueError):
                    continue
                inside = [w for w in words if w["start"] < t < w["end"]]
                if inside:
                    errors.append(f"segment {i} {side} {t} falls inside the word '{inside[0]['text']}' [{inside[0]['start']}, {inside[0]['end']})")
                    continue
                before = [w for w in words if w["end"] <= t]
                after = [w for w in words if w["start"] >= t]
                if not before or not after:
                    continue
                gap = after[0]["start"] - before[-1]["end"]
                level = "natural" if gap >= 0.4 else ("inspect" if gap >= 0.15 else "tight")
                edges.append({"segment": i, "side": side, "t": t, "gap_s": round(gap, 3), "level": level,
                              "lead_s": round(after[0]["start"] - t, 3), "tail_s": round(t - before[-1]["end"], 3)})
                if level == "inspect":
                    warnings.append(f"segment {i} {side} {t}: {round(gap, 3)} s word gap; inspect the waveform strip")
                elif level == "tight":
                    warnings.append(f"segment {i} {side} {t}: {round(gap, 3)} s word gap; keep more context")
    return errors, warnings, {"ranges": len(segs), "output_s": round(total, 3), "edges": edges, "word_check": word_note or "done"}


def cmd_check(a):
    plan = load_json(a.plan)
    words = load_words(a.words) if a.words else None
    errors, warnings, info = check(plan, words, verify_source=a.verify_source)
    if words is not None and abs((plan.get("source") or {}).get("audio_start_s", 0) - (plan.get("source") or {}).get("video_start_s", 0)) > 0.05:
        warnings.append("the audio stream starts at a different time than the video: shift the word times by the difference before trusting the edge check")
    out({"ok": not errors, "errors": errors, "warnings": warnings, **info}, 1 if errors else 0)


# ---------- deadair
def cmd_deadair(a):
    plan = load_json(a.plan)
    words = load_words(a.words)
    if not words:
        out({"ok": False, "errors": ["no word timings: dead-air removal needs a transcript"]}, 1)
    dur = float(plan["source"]["duration_s"])
    lo, hi = 0.0, dur
    if a.within:
        lo, hi = (float(x) for x in a.within.split(","))
    keep_at = {round(float(x), 2) for x in a.keep_pauses.split(",")} if a.keep_pauses else set()
    ws = [w for w in words if w["start"] >= lo and w["end"] <= hi]
    if not ws:
        out({"ok": False, "errors": ["no words inside the range"]}, 1)
    half = a.keep / 2
    cuts, to_view, kept = [], [], []
    for p, n in zip(ws, ws[1:]):
        gap = n["start"] - p["end"]
        if gap < a.min_pause:
            continue
        if round(p["end"], 2) in keep_at:
            kept.append(round(p["end"], 3)); continue
        strip = f"work/{plan.get('project') or '<p>'}/pause_{round(p['end'], 2)}.png"
        if gap > a.view_over:
            to_view.append({"pause_start": round(p["end"], 3), "pause_end": round(n["start"], 3), "gap_s": round(gap, 3), "strip_file": strip,
                            "strip": f"ffmpeg -v error -ss {round(p['end'], 3)} -to {round(n['start'], 3)} -i {plan['source']['path']} -vf \"fps=2,scale=320:-2,tile=8x1\" -frames:v 1 {strip}"})
        cuts.append((p["end"] + half, n["start"] - half, strip if gap > a.view_over else None))
    # cuts are made INSIDE the plan's existing ranges: framing and speed stay, ranges outside --within stay
    old = plan.get("segments") or [{"start": 0.0, "end": dur, "framing": {"mode": "pad"}}]
    min_r = float((plan.get("limits") or {}).get("min_range_s", DEFAULT_LIMITS["min_range_s"]))
    segs, dropped = [], 0
    for sg in old:
        a0, b0 = float(sg["start"]), float(sg["end"])
        if b0 <= lo or a0 >= hi:
            segs.append(sg); continue
        cur, parts = a0, []
        for c0, c1, _ in cuts:
            if c1 <= a0 or c0 >= b0:
                continue
            c0, c1 = max(c0, a0), min(c1, b0)
            if c0 - cur >= min_r:
                parts.append((cur, c0))
            else:
                dropped += 1
            cur = max(cur, c1)
        if b0 - cur >= min_r:
            parts.append((cur, b0))
        for x, y in parts:
            n = {k: v for k, v in sg.items() if k not in ("start", "end")}
            n.update({"start": round(x, 3), "end": round(y, 3)})
            segs.append(n)
    removed = sum(float(o["end"]) - float(o["start"]) for o in old) - sum(float(z["end"]) - float(z["start"]) for z in segs)
    res = {"ok": True, "segments": len(segs), "segments_before": len(old), "dropped_short_pieces": dropped, "removed_s": round(removed, 3),
           "pauses_cut": len(cuts), "pauses_kept": kept, "view_first": to_view,
           "note": "view each listed pause first; keep it (--keep-pauses <pause_start>) if something is happening on screen"}
    lim = {**DEFAULT_LIMITS, **(plan.get("limits") or {})}
    if len(segs) > lim["max_ranges"]:
        res["warning"] = f"{len(segs)} ranges is over the {lim['max_ranges']}-range default: raise limits.max_ranges in the plan for this request, or split the job"
    if a.write:
        listed = [v["strip_file"] for v in to_view]
        given = [x for x in (a.viewed_strips.split(",") if a.viewed_strips else []) if x]
        missing = [f for f in listed if f not in given or not os.path.isfile(f)]
        if missing:
            res["ok"] = False
            res["errors"] = ["pauses over the view threshold are listed: make and look at each strip, then re-run with --viewed-strips naming every strip file that exists (and --keep-pauses for any you keep); no strip for: " + ", ".join(missing)]
            out(res, 1)
        plan["segments"] = segs
        plan.setdefault("notes", []).append(f"dead-air removal: keep {a.keep} s of each pause of {a.min_pause} s or more; {len(cuts)} cut, {len(kept)} kept after viewing; {len(old)} ranges became {len(segs)}")
        with open(a.plan, "w", encoding="utf-8") as f:
            json.dump(plan, f, indent=1, ensure_ascii=False)
        res["written"] = a.plan
    out(res, 0)


# ---------- sidecar
def cmd_sidecar(a):
    """The delivery sidecar next to the final file: name, tags, plan, checks done and not done."""
    import subprocess
    if not os.path.isfile(a.final):
        out({"ok": False, "errors": [f"no final file {a.final}"]}, 1)
    plan = load_json(a.plan) if a.plan else {}
    rep = load_json(a.report) if a.report and os.path.isfile(a.report) else {}
    r = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", a.final], capture_output=True, text=True)
    pr = json.loads(r.stdout) if r.returncode == 0 else {}
    vs = [s for s in pr.get("streams", []) if s.get("codec_type") == "video"]
    au = [s for s in pr.get("streams", []) if s.get("codec_type") == "audio"]
    measured = {"bytes": os.path.getsize(a.final), "duration_s": round(float(pr.get("format", {}).get("duration") or 0), 3),
                "w": int(vs[0]["width"]) if vs else None, "h": int(vs[0]["height"]) if vs else None,
                "vcodec": vs[0].get("codec_name") if vs else None, "audio": au[0].get("codec_name") if au else None}
    # the report describes cut.mp4: its declared and checks_done belong to the delivery only when it is that very file
    cut = rep.get("out")
    same = bool(cut and os.path.isfile(cut) and sha256(cut) == sha256(a.final))
    if rep and not same:
        if not a.declared:
            out({"ok": False, "errors": [f"{a.final} is not the cut the report describes ({cut}): pass --declared '<json>' for the delivered file (format, size, fps, audio, duration) and --done only for checks run on it"]}, 1)
        rep = {k: v for k, v in rep.items() if k not in ("declared", "checks_done")} | {"checks_done": []}
    done = list(rep.get("checks_done", [])) + (a.done or [])
    not_done = list(rep.get("checks_not_done", [])) + (a.not_done or [])
    if len(plan.get("segments") or []) > 1:
        if a.splice_report:
            if not os.path.isfile(a.splice_report):
                out({"ok": False, "errors": [f"no splice report {a.splice_report}"]}, 1)
            done.append(f"splice review (step 18): {a.splice_report}")
        elif not any("splice" in x.lower() for x in (a.not_done or [])):
            out({"ok": False, "errors": ["a plan with more than one range needs --splice-report FILE (the step 18 result) or a --not-done line that names the splice review as not done"]}, 1)
    if not done:
        out({"ok": False, "errors": ["no check is recorded as done: run the checks (steps 18-19) and pass each with --done, or pass --incomplete"]}, 1)
    side = {"name": a.name or plan.get("name") or os.path.splitext(os.path.basename(a.final))[0],
            "file": os.path.basename(a.final), "tags": [t for t in (a.tags or "").split(",") if t],
            "plan": a.plan, "operations": plan.get("operations"), "source_sha256": (plan.get("source") or {}).get("sha256"),
            "segments": plan.get("segments"), "declared": a.declared and json.loads(a.declared) or rep.get("declared"),
            "measured": measured, "checks_done": done, "checks_not_done": not_done,
            "edits_not_completed": a.incomplete or [], "jobs": plan.get("jobs", [])}
    path = os.path.splitext(a.final)[0] + ".json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(side, f, indent=1, ensure_ascii=False)
    out({"ok": True, "sidecar": path, "checks_done": len(done), "checks_not_done": len(not_done)}, 0)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sidecar")
    s.add_argument("--final", required=True); s.add_argument("--plan"); s.add_argument("--report"); s.add_argument("--name")
    s.add_argument("--tags"); s.add_argument("--declared"); s.add_argument("--done", action="append")
    s.add_argument("--not-done", action="append"); s.add_argument("--incomplete", action="append"); s.add_argument("--splice-report")
    i = sub.add_parser("init")
    i.add_argument("--src", required=True); i.add_argument("--probe", required=True); i.add_argument("--out", required=True)
    i.add_argument("--project"); i.add_argument("--name"); i.add_argument("--size"); i.add_argument("--fps")
    i.add_argument("--segments"); i.add_argument("--guardrails", default="on")
    c = sub.add_parser("check")
    c.add_argument("plan"); c.add_argument("--words"); c.add_argument("--verify-source", action="store_true")
    d = sub.add_parser("deadair")
    d.add_argument("plan"); d.add_argument("--words", required=True)
    d.add_argument("--keep", type=float, default=0.15); d.add_argument("--min-pause", type=float, default=0.6)
    d.add_argument("--view-over", type=float, default=1.5); d.add_argument("--within"); d.add_argument("--keep-pauses")
    d.add_argument("--viewed-strips"); d.add_argument("--write", action="store_true")
    a = p.parse_args()
    {"init": cmd_init, "check": cmd_check, "deadair": cmd_deadair, "sidecar": cmd_sidecar}[a.cmd](a)


if __name__ == "__main__":
    main()
