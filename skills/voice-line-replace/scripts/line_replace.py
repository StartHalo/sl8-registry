#!/usr/bin/env python3
"""line_replace.py: the deterministic half of voice-line-replace (WF57-a1).

Written by SL8 from the behaviour the capability assessment records for WF57-a1
(steps 4, 5, 6, 9, 11, 12, 14 and 15). It never calls a paid service: speech-to-text,
speech and lip sync run through ai-gen as SKILL.md says, and this script reads their files.

Subcommands (each prints one JSON object on stdout):
  locate    probe the master, detect scene cuts, find each line's interval from the word
            timings, snap it to frames and size the word budget          (steps 4, 5, 6)
  compare   word-for-word compare of a transcript with the expected words  (steps 8, 14, 15)
  fit       measure one line's speech and check it fits its interval      (step 9)
  cut       cut each interval from the master, frame-accurately            (step 11)
  audio     build each segment's driving audio, or the full-length track   (step 12)
  check     compare a returned (synced) segment with the segment sent      (step 14)
  assemble  rebuild the video: untouched spans + synced segments, one encode (step 15)
  budget    recompute the word budget of a plan in place, keeping its work (step 9)
  set       record a returned (synced) file for a line

Exit codes: 0 ok; 1 bad input; 3 ffmpeg or ffprobe missing; 4 the plan has a problem
(a line not found, does not fit, crosses a cut or overlaps another); 5 a check failed.
"""
import argparse
import difflib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata

AIR = 0.5            # s of air each end of a line (WF57-a1 parameters)
WPS = 2.5            # max spoken words per second
VARIANCE = 0.04      # speech length varies about 4% between renders
MAX_GAIN = 12.0      # dB, the most the loudness match may move the new speech
XFADE = 0.1          # s, crossfade where a short room-tone bed repeats
MIN_SEG = 2.0        # lip-sync ceiling warning (a warning, never a rule)
FADE = 0.02          # join fade at each audio discontinuity (s)


def out(obj, code=0):
    print(json.dumps(obj, ensure_ascii=False, indent=1))
    sys.exit(code)


def fail(msg, code=1):
    out({"ok": False, "error": msg}, code)


def need_tools():
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            fail(f"{t} not found: the machine is broken, report it (HR21)", 3)


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        fail(f"command failed ({p.returncode}): {' '.join(cmd)[:300]} :: {p.stderr.strip()[-600:]}")
    return p


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError) as e:
        fail(f"cannot read {path}: {e}")


def save(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def ratio(r):
    try:
        a, b = r.split("/")
        return float(a) / float(b) if float(b) else 0.0
    except (ValueError, AttributeError):
        return 0.0


def probe(path):
    if not os.path.exists(path):
        fail(f"no such file: {path}")
    p = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path])
    d = json.loads(p.stdout)
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    info = {"file": path, "duration": float(d.get("format", {}).get("duration", 0) or 0)}
    if v:
        avg, rfr = ratio(v.get("avg_frame_rate")), ratio(v.get("r_frame_rate"))
        rot = (v.get("tags") or {}).get("rotate")
        for sd in v.get("side_data_list") or []:  # current ffmpeg carries rotation as a display matrix
            if sd.get("rotation") is not None:
                rot = sd["rotation"]
        try:
            rot = int(round(float(rot))) % 360 if rot is not None else 0
        except (TypeError, ValueError):
            rot = 0
        w, h = v.get("width"), v.get("height")
        if rot in (90, 270):  # ffmpeg turns the frames upright, so the working size is the swapped one
            w, h = h, w
        info.update({"width": w, "height": h, "codec": v.get("codec_name"),
                     "fps": avg or rfr, "fps_expr": (v.get("avg_frame_rate") if avg else v.get("r_frame_rate")),
                     "pix_fmt": v.get("pix_fmt"), "color_primaries": v.get("color_primaries"),
                     "color_transfer": v.get("color_transfer"), "color_space": v.get("color_space"),
                     "color_range": v.get("color_range"), "bits": v.get("bits_per_raw_sample"),
                     "r_frame_rate": v.get("r_frame_rate"),
                     "avg_frame_rate": v.get("avg_frame_rate"),
                     "vfr": bool(avg and rfr and abs(avg - rfr) > 0.01),
                     "frames": int(v["nb_frames"]) if str(v.get("nb_frames", "")).isdigit() else None,
                     "rotation": rot})
    if a:
        info.update({"audio_rate": int(a.get("sample_rate", 0) or 0), "audio_channels": a.get("channels"),
                     "audio_codec": a.get("codec_name"),
                     "audio_duration": float(a.get("duration", 0) or 0)})
    info["audio_streams"] = sum(1 for s in d.get("streams", []) if s.get("codec_type") == "audio")
    return info


def scene_cuts(path, threshold):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vf",
                        f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", p.stderr)]


def words_of(path):
    """Word entries from an ai-gen envelope (raw.words) or a bare Scribe answer; type 'word' only."""
    d = load(path)
    cands = [d.get("words") if isinstance(d, dict) else None]
    raw = d.get("raw") if isinstance(d, dict) else None
    if isinstance(raw, dict):
        cands += [raw.get("words"), (raw.get("output") or {}).get("words") if isinstance(raw.get("output"), dict) else None]
    ws = next((c for c in cands if isinstance(c, list) and c), None)
    if not ws:
        fail(f"{path} holds no words[] (a transcript with text but no words is a failed transcription)")
    keep = []
    for w in ws:
        if w.get("type", "word") != "word":
            continue
        t = norm(w.get("text", ""))
        if t and w.get("start") is not None and w.get("end") is not None:
            keep.append({"text": w["text"], "tok": t, "start": float(w["start"]), "end": float(w["end"])})
    if not keep:
        fail(f"{path}: no entries of type 'word'")
    return keep


def norm(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")
    return " ".join(re.findall(r"[\w']+", s)).replace("'", "")


def toks(s):
    return [t for t in norm(s).split() if t]


def find_line(words, old):
    """Windows of word tokens for the quoted old line: every exact match, else the best fuzzy one (ratio >= 0.8).
    Returns (span, score, exact) where exact lists every exact span (more than one means the phrase is said twice)."""
    want = toks(old)
    have = [w["tok"] for w in words]
    n = len(want)
    if not n:
        return None, 0.0, []
    exact = [(i, i + n - 1) for i in range(len(have) - n + 1) if have[i:i + n] == want]
    if exact:
        return exact[0], 1.0, exact
    best, score = None, 0.0
    for size in range(max(1, n - 2), n + 3):
        for i in range(0, max(0, len(have) - size) + 1):
            r = difflib.SequenceMatcher(None, have[i:i + size], want).ratio()
            if r > score:
                best, score = (i, i + size - 1), r
    return ((best, score, []) if score >= 0.8 else (None, score, []))


def lufs(path, start=None, dur=None):
    """Integrated loudness (LUFS) of a file or a window of it; None when it is too short or silent to measure."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats"]
    if start is not None:
        cmd += ["-ss", f"{start:.4f}"]
    if dur is not None:
        cmd += ["-t", f"{dur:.4f}"]
    p = subprocess.run(cmd + ["-i", path, "-vn", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"\n\s*I:\s+(-?[0-9.]+) LUFS", p.stderr)
    v = float(m[-1]) if m else None
    return v if v is not None and v > -60 else None


def mean_db(path, start, dur):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", path,
                        "-vn", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"mean_volume:\s+(-?[0-9.]+) dB", p.stderr)
    return float(m[-1]) if m else None


def cmd_locate(a):
    need_tools()
    if os.path.exists(a.out) and not a.force:
        old_plan = load(a.out)
        if any(k in l for l in old_plan.get("lines", []) for k in ("speech", "segment", "segment_audio", "synced")):
            fail(f"{a.out} already holds work (speech, segments or synced files): locate rewrites the plan from scratch. "
                 "Use `budget --plan <plan> --wps N` to change the budget, or --force to start over", 1)
    info = probe(a.video)
    if not info.get("fps"):
        fail("no video stream with a frame rate")
    fps, dur = info["fps"], info["duration"]
    cuts = scene_cuts(a.video, a.scene)
    words = words_of(a.words)
    lines = load(a.lines)
    if not isinstance(lines, list) or not lines:
        fail("--lines must be a JSON list of {id, old | start+end, new}")
    plan = {"master": info, "scene_threshold": a.scene, "cuts": cuts, "air": a.air, "wps": a.wps,
            "words_file": a.words, "lines": [], "problems": [], "warnings": []}
    for k, ln in enumerate(lines):
        lid = str(ln.get("id") or f"l{k + 1}")
        rec = {"id": lid, "new": ln.get("new", ""), "old": ln.get("old"), "say": ln.get("say"),
               "mode": ln.get("mode", "sync")}
        if not rec["new"]:
            plan["problems"].append(f"{lid}: no new words")
        if rec["mode"] not in ("sync", "audio-only"):
            plan["problems"].append(f"{lid}: mode is sync or audio-only")
        if re.search(r"[0-9$%&@#+=/€£¥]", rec["new"]) and not rec["say"]:
            plan["warnings"].append(f"{lid}: the new words hold digits or symbols and no \"say\": the speech will say them in words "
                                    "and the round trip will differ; write the spoken form in lines.json and have the customer confirm it")
        if ln.get("old"):
            span, score, exact = find_line(words, ln.get("old_spoken") or ln["old"])
            rec["match_score"] = round(score, 3)
            if len(exact) > 1:
                at = [round(words[x[0]]["start"], 2) for x in exact]
                occ = ln.get("occurrence")
                if isinstance(occ, int) and 1 <= occ <= len(exact):
                    span = exact[occ - 1]
                else:
                    rec["occurrences_at"] = at
                    plan["problems"].append(f"{lid}: ambiguous, the old line is said {len(exact)} times, at {at} s: "
                                            "give \"occurrence\" (1-based) or a start and end")
                    plan["lines"].append(rec)
                    continue
            if span is None:
                plan["problems"].append(f"{lid}: the quoted old line was not found in the transcript (best {score:.2f})")
                plan["lines"].append(rec)
                continue
            w0, w1 = words[span[0]], words[span[1]]
        elif ln.get("start") is not None and ln.get("end") is not None:
            inside = [w for w in words if w["end"] > float(ln["start"]) and w["start"] < float(ln["end"])]
            if not inside:
                plan["problems"].append(f"{lid}: no spoken word between {ln['start']} and {ln['end']}")
                plan["lines"].append(rec)
                continue
            w0, w1, rec["match_score"] = inside[0], inside[-1], None
        else:
            plan["problems"].append(f"{lid}: give the old words quoted or a start and end time")
            plan["lines"].append(rec)
            continue
        i0, i1 = words.index(w0), words.index(w1)
        rec["heard"] = " ".join(w["text"] for w in words[i0:i1 + 1])
        rec["first_word"], rec["last_word"] = w0["start"], w1["end"]
        s, e = max(0.0, w0["start"] - a.air), min(dur, w1["end"] + a.air)
        sf, ef = int(math.floor(s * fps + 1e-6)), int(math.ceil(e * fps - 1e-6))
        rec.update({"start_frame": sf, "end_frame": ef, "start": round(sf / fps, 6), "end": round(ef / fps, 6),
                    "seconds": round((ef - sf) / fps, 4), "first_word_offset": round(w0["start"] - sf / fps, 4)})
        budget = int(math.floor(a.wps * max(0.0, rec["seconds"] - 2 * a.air) + 1e-9))
        nw = len(toks(rec["say"] or rec["new"]))
        rec.update({"new_words": nw, "word_budget": budget, "fits": nw <= budget})
        if nw > budget:
            plan["problems"].append(f"{lid}: {nw} new words, budget {budget} at {a.wps} w/s with {a.air} s air: propose a shorter wording")
        inside_cuts = [c for c in cuts if rec["start"] < c < rec["end"]]
        if inside_cuts:
            rec["cuts_inside"] = inside_cuts
            plan["problems"].append(f"{lid}: scene cut at {inside_cuts} inside the interval: split the line at the cut or use whole-clip sync")
        if rec["seconds"] < MIN_SEG:
            plan["warnings"].append(f"{lid}: segment {rec['seconds']} s is under {MIN_SEG} s: expect weaker lip sync; run it as the test segment")
        plan["lines"].append(rec)
    placed = sorted([l for l in plan["lines"] if "start_frame" in l], key=lambda l: l["start_frame"])
    for p, q in zip(placed, placed[1:]):
        if q["start_frame"] < p["end_frame"]:
            plan["problems"].append(f"{p['id']} and {q['id']} overlap: merge them into one line or use whole-clip sync")
    taken = [(l["start"], l["end"]) for l in placed]
    edges = [0.0] + [x for w in words for x in (w["start"], w["end"])] + [dur]
    gaps = []
    for g0, g1 in zip(edges[0::2], edges[1::2]):
        pieces = [(g0 + 0.1, g1 - 0.1)]
        for t0, t1 in taken:  # a pause inside a line's interval is not clean room tone
            pieces = [q for p0, p1 in pieces for q in ((p0, min(p1, t0)), (max(p0, t1), p1)) if q[1] > q[0]]
        for p0, p1 in pieces:
            if p1 - p0 >= 1.0:
                gaps.append({"start": round(p0, 3), "end": round(p1, 3), "seconds": round(p1 - p0, 3)})
    plan["roomtone_candidates"] = sorted(gaps, key=lambda g: -g["seconds"])[:5]
    for g in plan["roomtone_candidates"]:
        g["level_db"] = mean_db(a.video, g["start"], g["seconds"])
    leveled = [g for g in plan["roomtone_candidates"] if g["level_db"] is not None]
    if leveled:  # the quietest stretch is the one least likely to hold breath, music or a distant voice
        plan["roomtone_preferred"] = min(leveled, key=lambda g: g["level_db"])
    if not gaps:
        plan["warnings"].append("no pause of 1 s or more outside the lines: no room tone to loop (use --no-bed and say so)")
    if info.get("rotation"):
        plan["warnings"].append(f"rotated source ({info['rotation']} degrees): sizes in the plan are after rotation, "
                                "ffmpeg turns the frames upright in every cut and the final")
    if (info.get("bits") not in (None, "8")) or "10" in str(info.get("pix_fmt")):
        plan["warnings"].append("more than 8 bits per sample: the final is re-encoded as 8-bit yuv420p (VID-D519); tell the customer")
    if info.get("color_transfer") in ("smpte2084", "arib-std-b67"):
        plan["warnings"].append("HDR source (PQ or HLG): the final is 8-bit and not tagged HDR, so colour and brightness change "
                                "on every frame; HDR output is not offered on this machine yet: tell the customer before any spend")
    if info.get("vfr"):
        plan["warnings"].append("variable frame rate: make the constant-rate working master first (SKILL.md step 4)")
    save(a.out, plan)
    out({"ok": not plan["problems"], "plan": a.out, "fps": fps, "duration": dur, "cuts": len(cuts),
         "roomtone_preferred": plan.get("roomtone_preferred"),
         "lines": [{k: l.get(k) for k in ("id", "mode", "start", "end", "seconds", "heard", "new_words", "word_budget", "match_score", "occurrences_at")}
                   for l in plan["lines"]],
         "problems": plan["problems"], "warnings": plan["warnings"]}, 0 if not plan["problems"] else 4)


def cmd_compare(a):
    ws = words_of(a.words)
    inside = (lambda w: w["end"] > a.start and w["start"] < a.end) if a.start is not None and a.end is not None else (lambda w: True)
    ws = [w for w in ws if inside(w)]
    if a.expect_words:  # expected words = another transcript's words in the same window (the master, outside the lines)
        want = [w["tok"] for w in words_of(a.expect_words) if inside(w)]
    elif a.plan and a.line:  # the line's spoken form: "say" when the plan has one, else the new words
        pl = find(load(a.plan), a.line)
        want = toks(pl.get("say") or pl.get("new") or "")
    else:
        want = toks(open(a.expect_file, encoding="utf-8").read() if a.expect_file else (a.expect or ""))
    got = [w["tok"] for w in ws]
    sm = difflib.SequenceMatcher(None, got, want)
    diff = [{"op": op, "heard": " ".join(got[i1:i2]), "expected": " ".join(want[j1:j2])}
            for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
    same = got == want
    out({"ok": same, "ratio": round(sm.ratio(), 3), "heard": " ".join(got), "expected": " ".join(want), "diff": diff},
        0 if same else 5)


def find(plan, lid):
    for l in plan["lines"]:
        if l["id"] == lid:
            return l
    fail(f"no line {lid} in the plan")


def cmd_fit(a):
    need_tools()
    plan = load(a.plan)
    ln = find(plan, a.line)
    if "seconds" not in ln:
        fail(f"{a.line} has no interval (locate reported a problem)")
    info = probe(a.speech)
    lead, speech = 0.0, info["duration"]
    if a.words:
        ws = words_of(a.words)
        lead, speech = ws[0]["start"], ws[-1]["end"] - ws[0]["start"]
    air = plan.get("air", AIR)
    starts = max(ln.get("first_word_offset", air), lead)  # where the new first word will land inside the segment
    room = ln["seconds"] - starts - air                    # what is left for the speech with the tail air kept
    status = "fits" if speech * (1 + VARIANCE) <= room else ("tight" if speech <= room else "no-fit")
    rate = round(len(toks(ln.get("say") or ln["new"])) / speech, 3) if speech > 0 else None
    tail = round(ln["seconds"] - starts - speech, 3)
    ln["speech"] = {"file": a.speech, "file_seconds": info["duration"], "lead": round(lead, 4),
                    "speech_seconds": round(speech, 4), "rate_wps": rate, "tail_air": tail, "fit": status}
    save(a.plan, plan)
    out({"ok": status != "no-fit", "line": a.line, "interval": ln["seconds"], "speech_seconds": round(speech, 3),
         "room": round(room, 3), "tail_air": tail, "fit": status, "rate_wps": rate,
         "note": {"fits": "inside the interval with the 4% render margin",
                  "tight": "fits now, but a re-render may not (4% variance): prefer a shorter wording",
                  "no-fit": "too long: shorten the wording and make the speech again; never time-stretch"}[status]},
        0 if status != "no-fit" else 4)


def fps_arg(m):
    """The probe's own rational frame rate (30000/1001), never a rounded decimal."""
    return m.get("fps_expr") if ratio(m.get("fps_expr")) else f"{m['fps']:.6f}"


def enc_video(m, crf="16"):
    cmd = ["-c:v", "libx264", "-crf", crf, "-preset", "slow", "-pix_fmt", "yuv420p", "-fps_mode", "cfr", "-r", fps_arg(m)]
    if m.get("color_transfer") not in ("smpte2084", "arib-std-b67"):  # SDR tags ride along; HDR is warned, not mislabelled
        for flag, key in (("-color_primaries", "color_primaries"), ("-color_trc", "color_transfer"),
                          ("-colorspace", "color_space"), ("-color_range", "color_range")):
            if m.get(key) and m[key] != "unknown":
                cmd += [flag, m[key]]
    return cmd


def cmd_cut(a):
    need_tools()
    plan = load(a.plan)
    m = plan["master"]
    fps = m["fps"]
    os.makedirs(a.out_dir, exist_ok=True)
    made = []
    for ln in plan["lines"]:
        if "start_frame" not in ln or ln.get("mode") == "audio-only":
            continue
        f = os.path.join(a.out_dir, f"seg_{ln['id']}.mp4")
        vf = f"trim=start_frame={ln['start_frame']}:end_frame={ln['end_frame']},setpts=PTS-STARTPTS"
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vf", vf]
        if m.get("audio_rate"):
            sr = m["audio_rate"]
            s0, s1 = round(ln["start_frame"] / fps * sr), round(ln["end_frame"] / fps * sr)
            cmd += ["-af", f"atrim=start_sample={s0}:end_sample={s1},asetpts=PTS-STARTPTS", "-c:a", "aac", "-b:a", "256k"]
        else:
            cmd += ["-an"]
        cmd += enc_video(m) + ["-movflags", "+faststart", f]
        run(cmd)
        got = probe(f)
        ln["segment"] = f
        up = os.path.join(a.out_dir, f"seg_{ln['id']}_up.mp4")  # what is uploaded: no sound (the audio file drives the sync), a lighter encode
        run(["ffmpeg", "-v", "error", "-y", "-i", f, "-an"] + enc_video(m, "20") + ["-movflags", "+faststart", up])
        ln["segment_upload"] = up
        made.append({"id": ln["id"], "file": f, "upload": up, "upload_bytes": os.path.getsize(up),
                     "seconds": ln["seconds"], "measured": round(got["duration"], 4)})
    save(a.plan, plan)
    out({"ok": True, "segments": made, "note": "seg_<id>.mp4 is H.264 CRF 16 at the master's rate with its original sound (reference); seg_<id>_up.mp4 is the copy to upload: no sound, CRF 20, same shape. Uploads over the proxy body limit fail with exit 2 (413): report it, never shrink the picture without the customer's go"})


def speech_filter(idx, ln, sr, layout, samples, air):
    sp = ln.get("speech")
    if not sp:
        fail(f"{ln['id']}: no measured speech (run fit first)")
    delay = max(0.0, ln["first_word_offset"] - sp["lead"]) if ln.get("first_word_offset") is not None else air
    ms = int(round(delay * 1000))
    g = sp.get("gain_db") or 0.0
    gain = f"volume={g}dB,alimiter=limit=0.95," if g else ""
    return (f"[{idx}:a]aresample={sr},aformat=sample_fmts=fltp:channel_layouts={layout},{gain}adelay={ms}:all=1,"
            f"apad=whole_len={samples},atrim=end_sample={samples}")


def bed_chain(sr, layout, gain, seconds, samples):
    """The room-tone bed for one segment: a stretch at least as long is trimmed; a shorter one repeats with a crossfade at each seam."""
    base = f"aresample={sr},aformat=sample_fmts=fltp:channel_layouts={layout},volume={gain}"
    n = 1 if seconds >= samples / sr else int(math.ceil((samples / sr - XFADE) / (seconds - XFADE)))
    if n <= 1:
        return f"[1:a]{base},atrim=end_sample={samples}[b]"
    outs = "".join(f"[c{i}]" for i in range(n))
    fc = f"[1:a]{base},asplit={n}{outs};[c0][c1]acrossfade=d={XFADE}:c1=tri:c2=tri[x1]"
    for i in range(2, n):
        fc += f";[x{i - 1}][c{i}]acrossfade=d={XFADE}:c1=tri:c2=tri[x{i}]"
    return fc + f";[x{n - 1}]atrim=end_sample={samples}[b]"


def cmd_audio(a):
    need_tools()
    plan = load(a.plan)
    m = plan["master"]
    fps, sr = m["fps"], m.get("audio_rate") or 48000
    layout = "mono" if (m.get("audio_channels") or 1) == 1 else "stereo"
    os.makedirs(a.out_dir, exist_ok=True)
    bed = None
    if not a.no_bed:
        if a.roomtone_start is None or a.roomtone_end is None:
            fail("give --roomtone-start and --roomtone-end (a locate roomtone candidate) or --no-bed")
        bed = os.path.join(a.out_dir, "roomtone.wav")
        if a.roomtone_end - a.roomtone_start <= 2 * XFADE:
            fail("the room-tone stretch is too short to loop with a crossfade: pick a longer one or use --no-bed")
        run(["ffmpeg", "-v", "error", "-y", "-ss", str(a.roomtone_start), "-to", str(a.roomtone_end), "-i", a.video,
             "-vn", "-ar", str(sr), "-af", f"aformat=channel_layouts={layout}", "-c:a", "pcm_s16le", bed])
    made = []
    for ln in plan["lines"]:
        if "start_frame" not in ln:
            continue
        sp = ln.get("speech") or fail(f"{ln['id']}: no measured speech (run fit first)")
        sp.pop("gain_db", None)
        if not a.no_match:  # level-match the new speech to the old line (integrated loudness), at most +-12 dB
            old_l = lufs(a.video, ln["first_word"], ln["last_word"] - ln["first_word"])
            new_l = lufs(sp["file"], sp["lead"], sp["speech_seconds"])
            if old_l is not None and new_l is not None:
                sp["gain_db"] = round(max(-MAX_GAIN, min(MAX_GAIN, old_l - new_l)), 2)
            sp["loudness"] = {"old_lufs": old_l, "new_lufs": new_l}
        samples = round(ln["end_frame"] / fps * sr) - round(ln["start_frame"] / fps * sr)
        f = os.path.join(a.out_dir, f"seg_{ln['id']}_audio.wav")
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", ln["speech"]["file"] if ln.get("speech") else fail(f"{ln['id']}: run fit first")]
        fc = speech_filter(0, ln, sr, layout, samples, plan.get("air", AIR)) + "[s]"
        if bed:
            cmd += ["-i", bed]
            fc += ";" + bed_chain(sr, layout, a.bed_gain, probe(bed)["duration"], samples)
            fc += f";[s][b]amix=inputs=2:duration=first:normalize=0,atrim=end_sample={samples}[o]"
        else:
            fc += ";[s]anull[o]"
        run(cmd + ["-filter_complex", fc, "-map", "[o]", "-ar", str(sr), "-c:a", "pcm_s16le", f])
        got = probe(f)
        ln["segment_audio"] = f
        made.append({"id": ln["id"], "file": f, "seconds": round(samples / sr, 4), "measured": round(got["duration"], 4),
                     "gain_db": sp.get("gain_db"), "loudness": sp.get("loudness")})
    if a.whole:
        full = os.path.join(a.out_dir, "full_track.wav")
        build_track(plan, a.video, full, a.fade)
        plan["full_track"] = full
        made.append({"id": "full", "file": full, "measured": round(probe(full)["duration"], 4)})
    save(a.plan, plan)
    out({"ok": True, "audio": made, "bed": bed or "none (no room tone: the replaced spans are silence under the speech)"})


def spans(plan):
    """Ordered spans over the whole master: ('keep', sf, ef) and ('line', sf, ef, line)."""
    m = plan["master"]
    total = m.get("frames") or int(round(m["duration"] * m["fps"]))
    placed = sorted([l for l in plan["lines"] if "start_frame" in l], key=lambda l: l["start_frame"])
    res, pos = [], 0
    for l in placed:
        if l["start_frame"] > pos:
            res.append(("keep", pos, l["start_frame"], None))
        res.append(("line", l["start_frame"], min(l["end_frame"], total), l))
        pos = min(l["end_frame"], total)
    if pos < total:
        res.append(("keep", pos, total, None))
    return res, total


def build_track(plan, master, outfile, fade):
    """Master audio outside the lines, each line's segment audio inside; a short fade at every join."""
    m = plan["master"]
    fps, sr = m["fps"], m.get("audio_rate") or 48000
    layout = "mono" if (m.get("audio_channels") or 1) == 1 else "stereo"
    sp, _ = spans(plan)
    inputs, parts, fc = ["-i", master], [], []
    n = 1
    for k, (kind, sf, ef, ln) in enumerate(sp):
        s0, s1 = round(sf / fps * sr), round(ef / fps * sr)
        if kind == "keep":
            src = f"[0:a]aresample={sr},aformat=sample_fmts=fltp:channel_layouts={layout},atrim=start_sample={s0}:end_sample={s1},asetpts=PTS-STARTPTS"
        else:
            if not ln.get("segment_audio"):
                fail(f"{ln['id']}: no segment audio (run audio first)")
            inputs += ["-i", ln["segment_audio"]]
            src = f"[{n}:a]aresample={sr},aformat=sample_fmts=fltp:channel_layouts={layout},atrim=end_sample={s1 - s0},asetpts=PTS-STARTPTS"
            n += 1
        d = (s1 - s0) / sr
        if k > 0 and d > 2 * fade:
            src += f",afade=t=in:st=0:d={fade}"
        if k < len(sp) - 1 and d > 2 * fade:
            src += f",afade=t=out:st={d - fade:.6f}:d={fade}"
        fc.append(src + f"[a{k}]")
        parts.append(f"[a{k}]")
    fc.append("".join(parts) + f"concat=n={len(parts)}:v=0:a=1[o]")
    run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(fc), "-map", "[o]",
                                                    "-ar", str(sr), "-c:a", "pcm_s16le", outfile])


def same_shape(sent, got, fps):
    tol = 1.0 / fps + 1e-3
    rep = {"seconds_sent": round(sent["duration"], 4), "seconds_back": round(got["duration"], 4),
           "size_sent": [sent.get("width"), sent.get("height")], "size_back": [got.get("width"), got.get("height")],
           "fps_sent": round(sent.get("fps") or 0, 4), "fps_back": round(got.get("fps") or 0, 4),
           "frames_sent": sent.get("frames"), "frames_back": got.get("frames")}
    rep["duration_ok"] = abs(sent["duration"] - got["duration"]) <= tol
    rep["size_ok"] = rep["size_sent"] == rep["size_back"]
    rep["fps_ok"] = abs((sent.get("fps") or 0) - (got.get("fps") or 0)) < 0.01
    rep["frames_ok"] = None if not (sent.get("frames") and got.get("frames")) else abs(sent["frames"] - got["frames"]) <= 1
    return rep


def edge_frames(path, d, tag):
    first, last = os.path.join(d, f"{tag}_first.png"), os.path.join(d, f"{tag}_last.png")
    run(["ffmpeg", "-v", "error", "-y", "-i", path, "-frames:v", "1", first])
    run(["ffmpeg", "-v", "error", "-y", "-sseof", "-0.5", "-i", path, "-an", "-update", "1", last])
    return first, last


def frame_diff(fa, fb, w, h):
    """Mean absolute difference (0 to 255, luma) between two frames; fb is scaled to w x h first."""
    fc = f"[0:v]format=rgb24[a];[1:v]scale={w}:{h},format=rgb24[b];[a][b]blend=all_mode=difference,format=yuv420p,signalstats,metadata=print:file=-"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", fa, "-i", fb, "-filter_complex", fc, "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"lavfi\.signalstats\.YAVG=([0-9.]+)", p.stdout)
    return round(float(m[-1]), 3) if m else None


def seam_diff(sent, got, d, w, h):
    """How far the synced segment's first and last frames are from the master's frames it replaces: a figure, not a verdict (HR14)."""
    s0, s1 = edge_frames(sent, d, "sent_edge")
    g0, g1 = edge_frames(got, d, "back_edge")
    return {"first": frame_diff(s0, g0, w, h), "last": frame_diff(s1, g1, w, h), "scale": "mean luma difference, 0 to 255"}


def cmd_budget(a):
    plan = load(a.plan)
    plan["wps"] = a.wps
    air = plan.get("air", AIR)
    rows = []
    for ln in plan["lines"]:
        if "seconds" not in ln:
            continue
        ln["word_budget"] = int(math.floor(a.wps * max(0.0, ln["seconds"] - 2 * air) + 1e-9))
        ln["new_words"] = len(toks(ln.get("say") or ln["new"]))
        ln["fits"] = ln["new_words"] <= ln["word_budget"]
        rows.append({k: ln[k] for k in ("id", "new_words", "word_budget", "fits")})
    save(a.plan, plan)
    out({"ok": all(r["fits"] for r in rows), "wps": a.wps, "lines": rows, "note": "speech, segments and synced files in the plan are untouched"},
        0 if all(r["fits"] for r in rows) else 4)


def cmd_check(a):
    need_tools()
    sent, got = probe(a.sent), probe(a.got)
    rep = same_shape(sent, got, sent.get("fps") or 25)
    if a.frames_dir:
        os.makedirs(a.frames_dir, exist_ok=True)
        stem = os.path.splitext(os.path.basename(a.got))[0]
        for name, src in (("back", a.got), ("sent", a.sent)):
            run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"fps={a.sample_fps}",
                 os.path.join(a.frames_dir, f"{stem}_{name}_%03d.png")])
        rep["frames_dir"] = a.frames_dir
    tmp = a.frames_dir or tempfile.mkdtemp(prefix="seam_")
    os.makedirs(tmp, exist_ok=True)
    rep["seam_diff"] = seam_diff(a.sent, a.got, tmp, sent.get("width"), sent.get("height"))
    ok = rep["duration_ok"] and rep["size_ok"] and rep["fps_ok"] and rep["frames_ok"] is not False
    rep["ok"] = ok
    out(rep, 0 if ok else 5)


def norm_video(idx, ln, m):
    n = ln["end_frame"] - ln["start_frame"]
    w, h = m["width"], m["height"]
    return (f"[{idx}:v]fps={fps_arg(m)},scale={w}:{h}:force_original_aspect_ratio=decrease,"
            f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop={n},"
            f"trim=end_frame={n},setpts=PTS-STARTPTS")


def cmd_assemble(a):
    need_tools()
    plan = load(a.plan)
    m = plan["master"]
    fps = m["fps"]
    if a.mode == "audio-only" or a.mode == "whole":
        track = plan.get("full_track") or fail("no full_track in the plan (run audio --whole)")
    if a.mode == "audio-only":
        run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", track, "-map", "0:v:0", "-map", "1:a:0",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", a.out])
    elif a.mode == "whole":
        if not a.synced:
            fail("whole mode needs --synced <the returned whole clip>")
        total = m.get("frames") or int(round(m["duration"] * fps))
        ln = {"start_frame": 0, "end_frame": total}
        run(["ffmpeg", "-v", "error", "-y", "-i", a.synced, "-i", track, "-filter_complex", norm_video(0, ln, m) + "[v]",
             "-map", "[v]", "-map", "1:a:0"] + enc_video(m) + ["-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", a.out])
    else:
        sp, total = spans(plan)
        track = os.path.join(os.path.dirname(os.path.abspath(a.out)), "final_track.wav") if not a.track else a.track
        build_track(plan, a.video, track, a.fade)
        inputs, fc, parts, n = ["-i", a.video], [], [], 1
        for k, (kind, sf, ef, ln) in enumerate(sp):
            if kind == "keep" or ln.get("mode") == "audio-only":  # an audio-only line keeps its picture
                fc.append(f"[0:v]trim=start_frame={sf}:end_frame={ef},setpts=PTS-STARTPTS,setsar=1[v{k}]")
            else:
                if not ln.get("synced"):
                    fail(f"{ln['id']}: no synced file in the plan (record it: set --plan <plan> {ln['id']}=<file>)")
                inputs += ["-i", ln["synced"]]
                fc.append(norm_video(n, ln, m) + f"[v{k}]")
                n += 1
            parts.append(f"[v{k}]")
        fc.append("".join(parts) + f"concat=n={len(parts)}:v=1:a=0[v]")
        inputs += ["-i", track]
        run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", ";".join(fc), "-map", "[v]", "-map", f"{n}:a:0"]
            + enc_video(m) + ["-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", a.out])
    fin = probe(a.out)
    rep = {"out": a.out, "mode": a.mode, "seconds_master": round(m["duration"], 4), "seconds_final": round(fin["duration"], 4),
           "size_final": [fin.get("width"), fin.get("height")], "fps_final": round(fin.get("fps") or 0, 4)}
    rep["duration_ok"] = abs(fin["duration"] - m["duration"]) <= 1.0 / fps + 0.03
    rep["size_ok"] = [fin.get("width"), fin.get("height")] == [m.get("width"), m.get("height")]
    rep["ok"] = rep["duration_ok"] and rep["size_ok"]
    out(rep, 0 if rep["ok"] else 5)


def cmd_set(a):
    plan = load(a.plan)
    for kv in a.pairs:
        lid, _, f = kv.partition("=")
        if not os.path.exists(f):
            fail(f"no such file: {f}")
        find(plan, lid)["synced"] = f
    save(a.plan, plan)
    out({"ok": True, "set": a.pairs})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("locate")
    p.add_argument("--video", required=True); p.add_argument("--words", required=True)
    p.add_argument("--lines", required=True); p.add_argument("--out", required=True)
    p.add_argument("--scene", type=float, default=0.3); p.add_argument("--air", type=float, default=AIR)
    p.add_argument("--wps", type=float, default=WPS); p.add_argument("--force", action="store_true")
    p = sub.add_parser("budget")
    p.add_argument("--plan", required=True); p.add_argument("--wps", type=float, required=True)
    p = sub.add_parser("compare")
    p.add_argument("--words", required=True); p.add_argument("--expect"); p.add_argument("--expect-file")
    p.add_argument("--expect-words"); p.add_argument("--plan"); p.add_argument("--line")
    p.add_argument("--start", type=float); p.add_argument("--end", type=float)
    p = sub.add_parser("fit")
    p.add_argument("--plan", required=True); p.add_argument("--line", required=True)
    p.add_argument("--speech", required=True); p.add_argument("--words")
    p = sub.add_parser("cut")
    p.add_argument("--plan", required=True); p.add_argument("--video", required=True); p.add_argument("--out-dir", required=True)
    p = sub.add_parser("audio")
    p.add_argument("--plan", required=True); p.add_argument("--video", required=True); p.add_argument("--out-dir", required=True)
    p.add_argument("--roomtone-start", type=float); p.add_argument("--roomtone-end", type=float)
    p.add_argument("--no-bed", action="store_true"); p.add_argument("--no-match", action="store_true"); p.add_argument("--bed-gain", type=float, default=1.0)
    p.add_argument("--whole", action="store_true"); p.add_argument("--fade", type=float, default=FADE)
    p = sub.add_parser("set")
    p.add_argument("--plan", required=True); p.add_argument("pairs", nargs="+")
    p = sub.add_parser("check")
    p.add_argument("--sent", required=True); p.add_argument("--got", required=True)
    p.add_argument("--frames-dir"); p.add_argument("--sample-fps", type=float, default=4)
    p = sub.add_parser("assemble")
    p.add_argument("--plan", required=True); p.add_argument("--video", required=True); p.add_argument("--out", required=True)
    p.add_argument("--mode", choices=["segment", "whole", "audio-only"], default="segment")
    p.add_argument("--synced"); p.add_argument("--track"); p.add_argument("--fade", type=float, default=FADE)
    a = ap.parse_args()
    {"locate": cmd_locate, "budget": cmd_budget, "compare": cmd_compare, "fit": cmd_fit, "cut": cmd_cut, "audio": cmd_audio,
     "set": cmd_set, "check": cmd_check, "assemble": cmd_assemble}[a.cmd](a)


if __name__ == "__main__":
    main()
