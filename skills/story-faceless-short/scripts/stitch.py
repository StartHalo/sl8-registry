#!/usr/bin/env python3
"""Stitch for story-faceless-short (SL8-authored from WF35-a2 steps 19-20 and the WF35 enrichment).

  python3 stitch.py --plan SHOT_PLAN_JSON --timing TIMING_JSON --clips DIR --narration NARRATION
      --out artifacts/<p>/final/stitched.mp4 --work work/<p>
      [--fps 24] [--size 720x1280] [--clip-sound on|off] [--duck on|off] [--bed-gain-db 0]
      [--lufs -16] [--flag-step-db 6] [--frames DIR]

Each clip (the clip's "file" in the plan, else clip-NN.mp4 or clip-NN/*.mp4 in --clips) is trimmed from its start to
its planned length, frame-exact on the cumulative timeline, normalised to one size, rate, pixel
format and 48 kHz stereo, then joined with hard cuts. The clip sound becomes one bed under the
single narration take, ducked by a sidechain keyed to the narration, mixed, and loudness-normalised
after the mix (never before), in two passes (measure, then apply the measured figures). Writes the video, the bed as mixed (work/bed_mixed.wav, for the
loudness figures) and work/stitch.json, and prints the report.

Exit 0 written; 1 refused (a clip missing or shorter than its plan, clip sound on some clips but not
all, the total off the target by more than 0.25 s); 2 a tool missing or bad input. Cut loudness
steps and the narration-to-bed separation are printed as figures with flags, never as a pass.
"""
import argparse, array, glob, json, math, os, re, shutil, subprocess, sys, wave

problems, flags = [], []


def die(msg, code=2):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        die(f"{' '.join(cmd[:6])} ... failed: {r.stderr.strip()[-400:]}")
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration:format=duration", "-of", "json", path])
    d = json.loads(out)
    v = [s for s in d.get("streams", []) if s.get("codec_type") == "video"]
    a = [s for s in d.get("streams", []) if s.get("codec_type") == "audio"]
    vdur = float(v[0].get("duration") or d.get("format", {}).get("duration") or 0) if v else 0.0
    return {"video_s": round(vdur, 3), "has_audio": bool(a)}


def read_pcm(path):
    with wave.open(path, "rb") as w:
        ch, rate, n = w.getnchannels(), w.getframerate(), w.getnframes()
        data = array.array("h")
        data.frombytes(w.readframes(n))
    return data, ch, rate


def rms_db(data, ch, rate, t0, t1):
    a, b = max(0, int(t0 * rate) * ch), min(len(data), int(t1 * rate) * ch)
    if b <= a:
        return None
    s = sum(x * x for x in data[a:b]) / (b - a)
    return round(20 * math.log10(math.sqrt(s) / 32768), 1) if s > 0 else -120.0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--plan", required=True); p.add_argument("--timing", required=True); p.add_argument("--clips", required=True)
    p.add_argument("--narration", required=True); p.add_argument("--out", required=True); p.add_argument("--work", required=True)
    p.add_argument("--fps", type=int, default=24); p.add_argument("--size", default="720x1280")
    p.add_argument("--clip-sound", choices=["on", "off"], default="on"); p.add_argument("--duck", choices=["on", "off"], default="on")
    p.add_argument("--bed-gain-db", type=float, default=0.0); p.add_argument("--lufs", type=float, default=-16.0)
    p.add_argument("--flag-step-db", type=float, default=6.0); p.add_argument("--frames")
    a = p.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            die(f"{tool} is not on this machine (HR21: report it, never install)")
    plan = json.load(open(a.plan, encoding="utf-8"))
    tim = json.load(open(a.timing, encoding="utf-8"))
    clips = sorted(plan.get("clips", []), key=lambda c: c["n"])
    target = float(tim.get("targetSeconds") or tim["durationSeconds"])
    W, H = (int(x) for x in a.size.lower().split("x"))
    seg = os.path.join(a.work, "stitch"); os.makedirs(seg, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)

    rows, t = [], 0.0
    for c in clips:
        src = c.get("file") or os.path.join(a.clips, f"clip-{c['n']:02d}.mp4")
        if not os.path.exists(src):  # step 17 downloads to clips/clip-NN/<name from the route>
            hits = sorted(glob.glob(os.path.join(a.clips, f"clip-{c['n']:02d}", "*.mp4")))
            src = hits[0] if hits else src
        if not os.path.exists(src):
            problems.append(f"clip {c['n']}: {src} is missing (no stitch before every clip has landed)")
            continue
        pr = probe(src)
        ln = float(c["planned_len_s"])
        if pr["video_s"] + 0.05 < ln:
            problems.append(f"clip {c['n']}: source {pr['video_s']} s is shorter than its planned {ln} s (it would freeze): re-render it")
        rows.append({"n": c["n"], "file": src, "start_s": round(t, 3), "planned_s": ln, **pr})
        t += ln
    if a.clip_sound == "on" and rows and len({r["has_audio"] for r in rows}) > 1:
        silent = [r["n"] for r in rows if not r["has_audio"]]
        problems.append(f"clip sound must be on every clip or none: clips {silent} have no audio (re-render them, or --clip-sound off)")
    if abs(t - target) > 0.25:
        problems.append(f"planned lengths sum to {round(t, 3)} s against the target {target} s")
    if problems:
        for x in problems:
            print(f"FAIL {x}", file=sys.stderr)
        sys.exit(1)

    # Frame-exact boundaries on the cumulative timeline, so every cut lands where the plan put it.
    bounds = [round(r["start_s"] * a.fps) for r in rows] + [round(t * a.fps)]
    vlist, apcm = os.path.join(seg, "video.txt"), []
    vf = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={a.fps},format=yuv420p"
    with open(vlist, "w") as L:
        for k, r in enumerate(rows):
            frames = bounds[k + 1] - bounds[k]
            dur = frames / a.fps
            v = os.path.join(seg, f"v{r['n']:02d}.mp4")
            run(["ffmpeg", "-v", "error", "-y", "-i", r["file"], "-vf", vf, "-frames:v", str(frames), "-an",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-r", str(a.fps), v])
            L.write("file '" + os.path.abspath(v).replace("'", "'\\''") + "'\n")
            w = os.path.join(seg, f"a{r['n']:02d}.wav")
            if a.clip_sound == "on":
                run(["ffmpeg", "-v", "error", "-y", "-i", r["file"], "-vn", "-af", f"aresample=48000,atrim=0:{dur:.6f},apad=whole_dur={dur:.6f}",
                     "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", w])
            else:
                run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{dur:.6f}", "-c:a", "pcm_s16le", w])
            apcm.append(w)
            r["frames"] = frames
    total = bounds[-1] / a.fps
    video = os.path.join(seg, "video.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", vlist, "-c", "copy", video])

    bed = os.path.join(seg, "bed.wav")  # exact sample concat of the trimmed clip sounds
    with wave.open(bed, "wb") as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(48000)
        for w in apcm:
            with wave.open(w, "rb") as i:
                out.writeframes(i.readframes(i.getnframes()))
    nar = os.path.join(seg, "narration48.wav")
    run(["ffmpeg", "-v", "error", "-y", "-i", a.narration, "-af", f"aresample=48000,apad=whole_dur={total:.6f},atrim=0:{total:.6f}",
         "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", nar])
    bed_mixed = os.path.join(a.work, "bed_mixed.wav")
    if a.clip_sound == "off":
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{total:.6f}", "-c:a", "pcm_s16le", bed_mixed])
    elif a.duck == "on":  # starting values: ~4:1, fast attack, 300 ms release, keyed to the narration
        run(["ffmpeg", "-v", "error", "-y", "-i", bed, "-i", nar, "-filter_complex",
             f"[0:a]volume={a.bed_gain_db}dB[b];[b][1:a]sidechaincompress=threshold=0.03:ratio=4:attack=5:release=300:makeup=1[d]",
             "-map", "[d]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", bed_mixed])
    else:
        run(["ffmpeg", "-v", "error", "-y", "-i", bed, "-af", f"volume={a.bed_gain_db}dB", "-c:a", "pcm_s16le", bed_mixed])
    mix = os.path.join(seg, "mix.wav")  # loudnorm after the mix and the duck, never before
    pre = f"[0:a][1:a]amix=inputs=2:normalize=0:duration=first[m];[m]"
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-y", "-i", nar, "-i", bed_mixed, "-filter_complex",
                           pre + f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11:print_format=json[o]", "-map", "[o]", "-f", "null", "-"],
                          capture_output=True, text=True)
    mm = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", meas.stderr, re.S)
    ln2 = f"loudnorm=I={a.lufs}:TP=-1.5:LRA=11"
    if mm:  # second pass with the measured figures (linear), so the target is met, not approached
        m = json.loads(mm.group(0))
        ln2 += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    else:
        flags.append("loudnorm first pass gave no figures; single-pass loudnorm used: run media-qc loudness and re-stitch with --lufs adjusted by the error")
    run(["ffmpeg", "-v", "error", "-y", "-i", nar, "-i", bed_mixed, "-filter_complex", pre + ln2 + "[o]",
         "-map", "[o]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", mix])
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", mix, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac",
         "-b:a", "192k", "-ar", "48000", "-t", f"{total:.6f}", "-movflags", "+faststart", a.out])

    # Figures: the bed's loudness step across each cut, and the narration's lead over the bed while it speaks.
    bd, bch, brate = read_pcm(bed_mixed)
    cuts = []
    for k in range(1, len(rows)):
        tc = bounds[k] / a.fps
        before, after = rms_db(bd, bch, brate, tc - 0.3, tc - 0.02), rms_db(bd, bch, brate, tc + 0.02, tc + 0.3)
        step = None if before is None or after is None else round(after - before, 1)
        cuts.append({"cut": k, "at_s": round(tc, 3), "bed_before_db": before, "bed_after_db": after, "step_db": step})
        if step is not None and abs(step) >= a.flag_step_db and a.clip_sound == "on":
            flags.append(f"cut {k} at {round(tc, 2)} s: bed jumps {step} dB (flag at {a.flag_step_db}); check the next clip's first sound")
    nd, nch, nrate = read_pcm(nar)
    s0, s1 = float(tim.get("speechStartSeconds", 0)), float(tim.get("speechEndSeconds", total))
    nar_db, bed_db = rms_db(nd, nch, nrate, s0, s1), rms_db(bd, bch, brate, s0, s1)
    sep = None if nar_db is None or bed_db is None else round(nar_db - bed_db, 1)
    final = probe(a.out)
    if abs(final["video_s"] - target) > 0.25:
        problems.append(f"stitched video is {final['video_s']} s against the target {target} s")
    frames = []
    if a.frames:
        os.makedirs(a.frames, exist_ok=True)
        marks = [(f"cut-{k:02d}", bounds[k] / a.fps + 0.05) for k in range(1, len(rows))]
        marks += [(f"mid-{r['n']:02d}", (bounds[k] + bounds[k + 1]) / 2 / a.fps) for k, r in enumerate(rows)]
        for name, ts in marks:
            f = os.path.join(a.frames, f"{name}.jpg")
            run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ts:.3f}", "-i", a.out, "-frames:v", "1", "-q:v", "3", f])
            frames.append(f)
    report = {"out": a.out, "duration_s": final["video_s"], "target_s": target, "frames_total": bounds[-1], "fps": a.fps,
              "size": f"{W}x{H}", "clip_sound": a.clip_sound, "duck": a.duck, "bed_gain_db": a.bed_gain_db, "lufs_target": a.lufs,
              "narration_rms_db": nar_db, "bed_under_speech_rms_db": bed_db, "separation_db": sep,
              "clips": [{k: r[k] for k in ("n", "start_s", "planned_s", "frames", "video_s", "has_audio")} for r in rows],
              "cuts": cuts, "bed_mixed": bed_mixed, "frames": frames, "flags": flags,
              "note": "rms figures are dBFS over the window, not LUFS; run media-qc loudness on the output for LUFS and true peak"}
    with open(os.path.join(a.work, "stitch.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    print(json.dumps(report, indent=1))
    for x in flags:
        print(f"FLAG {x}", file=sys.stderr)
    for x in problems:
        print(f"FAIL {x}", file=sys.stderr)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
