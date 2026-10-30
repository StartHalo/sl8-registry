#!/usr/bin/env python3
"""cut_reframe.py: render an edit plan (validate_plan.py, schema sl8.edit.plan/1) as ONE ffmpeg filter
graph: one input per range (seeked on input, so reordered ranges buffer nothing), setpts/asetpts with
trim/atrim to the range length, framing (pad | center_crop | crop static or keyframed),
optional speed (setpts N = 1/speed, atempo chained within 0.5-2.0), constant fps, setsar, audio fades
at discontinuities only, concat, then captions last (an ASS file through libass) in the same encode.
Optional two-pass loudness normalization of the whole output (audio only; video stream-copied).
Writes the exact command, a JSON technical report and a 4x3 contact sheet next to the output.
SL8-authored from the behaviour WF26-a1 records (steps 8, 9, 10, 18); Python 3.11 stdlib only.

  python3 cut_reframe.py edit-plan.json --out work/<p>/cut.mp4 [--words stt.json]
        [--captions caps.ass [--fontsdir DIR] [--captions-report caps.json]] [--dry-run]

Exit: 0 rendered and the duration / stream checks hold; 1 plan refused, render failed or a check
failed (report written); 2 usage, or a filter or encoder this render needs is missing.
"""
import argparse, json, os, re, shlex, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True   # no __pycache__ inside the installed skill
sys.path.insert(0, HERE)
import validate_plan as vp  # noqa: E402


def fail(code, msg, report=None, path=None):
    if report is not None and path:
        report.setdefault("errors", []).append(msg)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=1, ensure_ascii=False)
    print(f"cut_reframe: {msg}", file=sys.stderr)
    sys.exit(code)


def fesc(path):
    """Escape a path for use as a filter option value inside -filter_complex."""
    return "'" + path.replace("\\", "\\\\").replace("'", "'\\''").replace(":", "\\:") + "'"


def have_filter(name):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True)
    return re.search(rf"^\s*\S+\s+{re.escape(name)}\s", r.stdout, re.M) is not None


def have_encoder(name):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"], capture_output=True, text=True)
    return re.search(rf"^\s*\S+\s+{re.escape(name)}\s", r.stdout, re.M) is not None


def num(x):
    return f"{float(x):.6f}".rstrip("0").rstrip(".")


def piecewise(kfs, key):
    """x or y as a piecewise-linear expression of t (seconds from the range start)."""
    if len(kfs) == 1:
        return num(kfs[0][key])
    expr = num(kfs[-1][key])
    for a, b in reversed(list(zip(kfs, kfs[1:]))):
        t0, t1, v0, v1 = float(a["time"]), float(b["time"]), float(a[key]), float(b[key])
        seg = f"{num(v0)}+({num(v1 - v0)})*(t-{num(t0)})/{num(t1 - t0)}" if t1 > t0 else num(v1)
        expr = f"if(lt(t,{num(t1)}),{seg},{expr})"
    return f"if(lt(t,{num(kfs[0]['time'])}),{num(kfs[0][key])},{expr})"


def framing_filter(fr, W, H, pad_color):
    mode = (fr or {}).get("mode", "pad")
    if mode == "pad":
        return (f"scale={W}:{H}:force_original_aspect_ratio=decrease:force_divisible_by=2,"
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={pad_color}")
    if mode == "center_crop":
        return f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    cw, ch = int(fr["width"]) // 2 * 2, int(fr["height"]) // 2 * 2
    if fr.get("keyframes"):
        kfs = sorted(fr["keyframes"], key=lambda k: float(k["time"]))
        x, y = piecewise(kfs, "x"), piecewise(kfs, "y")
        return f"crop=w={cw}:h={ch}:x='{x}':y='{y}',scale={W}:{H}"
    x = fr.get("x", f"(iw-{cw})/2")
    y = fr.get("y", f"(ih-{ch})/2")
    return f"crop={cw}:{ch}:{x}:{y},scale={W}:{H}"


def atempo_chain(speed):
    parts, s = [], float(speed)
    while s > 2.0:
        parts.append("atempo=2.0"); s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5"); s /= 0.5
    if abs(s - 1.0) > 1e-9:
        parts.append(f"atempo={num(s)}")
    return parts


def build(plan, captions=None, fontsdir=None):
    src = plan["source"]
    W, H = int(plan["width"]), int(plan["height"])
    fps = vp.resolve_fps(plan)
    fps_txt = {None: src.get("avg_frame_rate"), "": src.get("avg_frame_rate"), "source": src.get("r_frame_rate")}.get(plan.get("fps"), str(plan.get("fps")))
    if not fps_txt or not vp.rate(fps_txt):   # "0/0" (some WebM and screen captures): use the average init wrote
        fps_txt = num(fps)
    fade = int(plan.get("audio_fade_ms", 30)) / 1000.0
    audio = bool(src.get("audio"))
    ai = int(src.get("audio_stream_used") or 0)
    segs = plan["segments"]
    dur_src = float(src.get("duration_s") or 0)
    chains, labels, ranges, joins, inputs, t_out = [], [], [], [], [], 0.0
    for i, s in enumerate(segs):
        a, b = float(s["start"]), float(s["end"])
        sp = float(s.get("speed", 1) or 1)
        # one input per range, seeked on input (-ss/-t): nothing is buffered when ranges are reordered
        inputs += ["-ss", num(a), "-t", num(b - a), "-i", src["path"]]
        v = [f"[{i}:v:0]setpts=PTS-STARTPTS", f"trim=duration={num(b - a)}", framing_filter(s.get("framing"), W, H, plan.get("pad_color", "black"))]
        if abs(sp - 1) > 1e-9:
            v.append(f"setpts={num(1 / sp)}*PTS")
        v += [f"fps={fps_txt}", "setsar=1", f"format=yuv420p[v{i}]"]
        chains.append(",".join(v))
        length = (b - a) / sp
        if audio:
            prev_cont = i > 0 and abs(float(segs[i - 1]["end"]) - a) < 1e-3 and float(segs[i - 1].get("speed", 1) or 1) == sp
            next_cont = i + 1 < len(segs) and abs(float(segs[i + 1]["start"]) - b) < 1e-3 and float(segs[i + 1].get("speed", 1) or 1) == sp
            fade_in = fade > 0 and not prev_cont and a > 1e-3
            fade_out = fade > 0 and not next_cont and (dur_src == 0 or b < dur_src - 1e-3)
            au = [f"[{i}:a:{ai}]asetpts=PTS-STARTPTS", f"atrim=duration={num(b - a)}"] + atempo_chain(sp)
            au += ["aresample=48000", "aformat=channel_layouts=stereo"]
            if fade_in:
                au.append(f"afade=t=in:st=0:d={num(fade)}")
            if fade_out:
                au.append(f"afade=t=out:st={num(max(0, length - fade))}:d={num(fade)}")
            chains.append(",".join(au) + f"[a{i}]")
            labels.append(f"[v{i}][a{i}]")
        else:
            labels.append(f"[v{i}]")
        ranges.append({"i": i, "src_start": a, "src_end": b, "speed": sp, "out_start": round(t_out, 3), "out_end": round(t_out + length, 3),
                       "framing": (s.get("framing") or {"mode": "pad"}).get("mode")})
        if i > 0:
            joins.append({"between": [i - 1, i], "at_out_s": round(t_out, 3),
                          "continuous": abs(float(segs[i - 1]["end"]) - a) < 1e-3})
        t_out += length
    n = len(segs)
    concat = "".join(labels) + f"concat=n={n}:v=1:a={1 if audio else 0}" + ("[vc][ac]" if audio else "[vc]")
    chains.append(concat)
    vout = "[vc]"
    if captions:
        opt = f"subtitles=filename={fesc(captions)}" + (f":fontsdir={fesc(fontsdir)}" if fontsdir else "")
        chains.append(f"[vc]{opt}[vcap]")
        vout = "[vcap]"
    graph = ";".join(chains)
    enc = plan.get("encode") or {}
    args = ["ffmpeg", "-hide_banner", "-y"] + inputs + ["-filter_complex", graph, "-map", vout]
    if audio:
        args += ["-map", "[ac]"]
    args += ["-c:v", enc.get("vcodec", "libx264"), "-preset", str(enc.get("preset", "medium")), "-crf", str(enc.get("crf", 18)),
             "-pix_fmt", enc.get("pix_fmt", "yuv420p")]
    if audio:
        args += ["-c:a", enc.get("acodec", "aac"), "-b:a", f"{enc.get('audio_kbps', 192)}k", "-ar", "48000"]
    else:
        args += ["-an"]
    args += ["-movflags", "+faststart"]
    return args, {"ranges": ranges, "joins": joins, "expected_s": round(t_out, 3), "fps": fps, "fps_filter": fps_txt, "audio": audio}


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", path], capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def loudnorm(path, target, tp, lra, kbps):
    """Two-pass loudnorm with measured values and linear=true on the whole output (audio only)."""
    base = f"loudnorm=I={target}:TP={tp}:LRA={lra}"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-vn", "-af", base + ":print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if r.returncode or not m:
        return None, "loudness measure pass failed: delivered un-normalized"
    meas = json.loads(m[-1])
    stem, ext = os.path.splitext(path)
    pre = f"{stem}.prenorm{ext}"
    os.replace(path, pre)
    af = (f"{base}:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:measured_LRA={meas['input_lra']}"
          f":measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true")
    r2 = subprocess.run(["ffmpeg", "-hide_banner", "-y", "-i", pre, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", af,
                         "-c:a", "aac", "-b:a", f"{kbps}k", "-ar", "48000", "-movflags", "+faststart", path], capture_output=True, text=True)
    if r2.returncode:
        os.replace(pre, path)
        return None, "loudness apply pass failed: delivered un-normalized"
    return {"measured": meas, "applied": af, "prenorm": pre}, None


def words_near(words, src_t, before):
    if not words:
        return None
    if before:
        sel = [w["text"] for w in words if w["end"] <= src_t + 1e-6][-3:]
    else:
        sel = [w["text"] for w in words if w["start"] >= src_t - 1e-6][:3]
    return " ".join(sel)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("plan")
    p.add_argument("--out", required=True)
    p.add_argument("--words")
    p.add_argument("--captions")
    p.add_argument("--fontsdir")
    p.add_argument("--captions-report")
    p.add_argument("--dry-run", action="store_true")
    a = p.parse_args()
    plan = vp.load_json(a.plan)
    words = vp.load_words(a.words) if a.words else None
    stem = os.path.splitext(a.out)[0]
    rep_path = f"{stem}.report.json"
    errors, warnings, info = vp.check(plan, words)
    report = {"plan": a.plan, "out": a.out, "source": plan.get("source", {}).get("path"), "source_sha256": plan.get("source", {}).get("sha256"),
              "validation": {"errors": errors, "warnings": warnings, **info}, "checks_done": [], "checks_not_done": []}
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    if errors:
        fail(1, "plan refused by validate_plan: " + "; ".join(errors), report, rep_path)
    if a.captions and not os.path.isfile(a.captions):
        fail(2, f"no captions file {a.captions}")
    need = ["trim", "atrim", "setpts", "asetpts", "concat", "fps", "setsar", "scale", "pad", "crop", "afade", "aresample", "aformat"]
    if a.captions:
        need.append("subtitles")
    if any(abs(float(s.get("speed", 1) or 1) - 1) > 1e-9 for s in plan["segments"]):
        need.append("atempo")
    if plan.get("normalize_audio"):
        need.append("loudnorm")
    missing = [f for f in need if not have_filter(f)]
    enc = plan.get("encode") or {}
    for e in (enc.get("vcodec", "libx264"), enc.get("acodec", "aac") if plan["source"].get("audio") else None):
        if e and not have_encoder(e):
            missing.append(f"encoder {e}")
    if missing:
        what = ", ".join(missing)
        hint = " (libass: captions cannot be burned on this machine; render without --captions and name the gap)" if "subtitles" in missing else ""
        fail(2, f"missing on this machine: {what}{hint}", report, rep_path)
    args, meta = build(plan, a.captions, a.fontsdir)
    partial = f"{stem}.partial{os.path.splitext(a.out)[1]}"   # renamed on success, so a failed render leaves no cut.mp4
    args.append(partial)
    with open(f"{stem}.cmd.txt", "w", encoding="utf-8") as f:
        f.write(" ".join(shlex.quote(x) for x in args) + "\n")
    for j in meta["joins"]:
        prev = plan["segments"][j["between"][0]]; nxt = plan["segments"][j["between"][1]]
        j["planned_words_before"] = words_near(words, float(prev["end"]), True)
        j["planned_words_after"] = words_near(words, float(nxt["start"]), False)
    report.update({"ranges": meta["ranges"], "joins": meta["joins"], "expected_duration_s": meta["expected_s"],
                   "fps": round(meta["fps"], 6), "command": f"{stem}.cmd.txt"})
    if a.captions_report and os.path.isfile(a.captions_report):
        cr = vp.load_json(a.captions_report)
        report["captions"] = {"file": a.captions, "dropped_straddling_words": cr.get("dropped_straddling_words", []),
                              "captions": cr.get("captions"), "look": cr.get("look"), "font": cr.get("font")}
    if a.dry_run:
        with open(rep_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=1, ensure_ascii=False)
        print(json.dumps({"dry_run": True, "command": f"{stem}.cmd.txt", "expected_duration_s": meta["expected_s"], "ranges": len(meta["ranges"])}))
        return
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        if os.path.isfile(partial):
            os.remove(partial)
        fail(1, "ffmpeg failed: " + r.stderr.strip()[-600:], report, rep_path)
    os.replace(partial, a.out)
    norm = plan.get("normalize_audio")
    if norm and meta["audio"]:
        res, err = loudnorm(a.out, norm.get("target_lufs", -14), norm.get("tp", -1.5), norm.get("lra", 11), enc.get("audio_kbps", 192))
        if err:
            report["checks_not_done"].append(err)
        else:
            report["loudness"] = res
            report["checks_done"].append(f"two-pass loudnorm to {norm.get('target_lufs', -14)} LUFS (measured input {res['measured']['input_i']} LUFS)")
    pr = probe(a.out)
    if not pr:
        fail(1, "ffprobe cannot read the output", report, rep_path)
    report["output_probe"] = pr
    vs = [s for s in pr["streams"] if s.get("codec_type") == "video"]
    au = [s for s in pr["streams"] if s.get("codec_type") == "audio"]
    vdur = float(vs[0].get("duration") or pr["format"].get("duration") or 0) if vs else 0
    tol = (len(plan["segments"]) + 1) / meta["fps"]
    bad = []
    if abs(vdur - meta["expected_s"]) > tol:
        bad.append(f"video runs {round(vdur, 3)} s, the plan {meta['expected_s']} s (tolerance {round(tol, 3)} s)")
    else:
        report["checks_done"].append(f"duration {round(vdur, 3)} s = sum of ranges {meta['expected_s']} s within {round(tol, 3)} s")
    if bool(au) != meta["audio"]:
        bad.append(f"audio stream {'present' if au else 'missing'} but the source {'has' if meta['audio'] else 'has no'} audio")
    else:
        report["checks_done"].append("audio stream present iff the source has one")
    if au and vs:
        adur = float(au[0].get("duration") or 0)
        if abs(adur - vdur) > 0.2:
            bad.append(f"audio ends {round(adur - vdur, 3)} s from the picture (more than 0.2 s): a range lost its sound or sync")
        else:
            report["checks_done"].append(f"audio ends within 0.2 s of the picture ({round(adur - vdur, 3)} s)")
    if vs and (int(vs[0]["width"]), int(vs[0]["height"])) != (int(plan["width"]), int(plan["height"])):
        bad.append(f"output {vs[0]['width']}x{vs[0]['height']}, planned {plan['width']}x{plan['height']}")
    else:
        report["checks_done"].append(f"frame {plan['width']}x{plan['height']}")
    sheet = f"{stem}.contact.png"
    rs = subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", a.out, "-vf",
                         f"fps=12/{max(vdur, 0.1):.3f},scale=360:-2,tile=4x3", "-frames:v", "1", sheet], capture_output=True, text=True)
    report["contact_sheet"] = sheet if rs.returncode == 0 else None
    if words is None and meta["audio"] and len(plan["segments"]) > 1:
        report["checks_not_done"].append("word check: no transcript, so no edge was checked against word times")
    report["checks_not_done"].append("listening: splice review uses transcripts, frame strips and click proxies (step 18)")
    report["declared"] = {"w": int(plan["width"]), "h": int(plan["height"]), "duration_s": meta["expected_s"],
                          "fps": round(meta["fps"], 3), "audio": "required" if meta["audio"] else "none", "format": "mp4"}
    if bad:
        fail(1, "; ".join(bad), report, rep_path)
    with open(rep_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print(json.dumps({"out": a.out, "duration_s": round(vdur, 3), "expected_s": meta["expected_s"], "report": rep_path, "contact_sheet": report["contact_sheet"]}))


if __name__ == "__main__":
    main()
