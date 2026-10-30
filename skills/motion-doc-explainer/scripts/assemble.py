#!/usr/bin/env python3
"""Audio checks, assembly and frame sampling for motion-doc-explainer (SL8-authored; ffmpeg, ffprobe, Pillow).

  python3 assemble.py audio <job>     every say file: duration, all-silent, clipped peaks; total <= ~600 s
  python3 assemble.py join <job> [--out explainer.mp4] [--lufs -16]
        per slide: pre-roll + its say files + gaps + tail -> one audio track; mux with render/slide-NN.mp4
        (an animation clip is retimed to that length first); concat in order; loudness-normalise;
        H.264 yuv420p + AAC 192k -> <job>/<out>
  python3 assemble.py frames <job> [--video explainer.mp4] [--cues]
        one frame per slide midpoint and per infographic zoom -> <job>/qc/*.png, plus qc/sheet.png
        (one labelled contact sheet to read as one image). --cues: also one frame 0.1 s after each
        pointer cue starts (every encoded frame of a short cue) -> qc/cues.png, and a count of
        highlight-coloured pixels in each, so the pointer is a number: a cue with none FAILs
  python3 assemble.py probe <job> [--video explainer.mp4]
        one video and one audio stream; duration = sum of slides within 0.5 s; slide count = the document's; frame size = config;
        integrated loudness (ebur128)

Reads render/plan.json (build_slides.py). Prints figures; exit 0 pass, 1 a check failed, 2 usage.
"""
import json, os, re, subprocess, sys

SIZE = {"square": (1080, 1080), "portrait": (1080, 1920), "landscape": (1920, 1080)}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def ffdur(path, stream=None):
    cmd = ["ffprobe", "-v", "error"] + (["-select_streams", stream] if stream else []) + \
          ["-show_entries", "stream=duration" if stream else "format=duration", "-of", "csv=p=0", path]
    try:
        return float(run(cmd).stdout.strip().split("\n")[0])
    except ValueError:
        return None


def load(job):
    plan = json.load(open(os.path.join(job, "render", "plan.json"), encoding="utf-8"))
    cfg = json.load(open(os.path.join(job, "config.json"), encoding="utf-8"))
    return plan, cfg


def audio_check(job):
    ad = os.path.join(job, "audio")
    files = sorted(f for f in os.listdir(ad) if re.fullmatch(r"say-\d+\.mp3", f))
    bad, total = 0, 0.0
    for f in files:
        p = os.path.join(ad, f)
        d = ffdur(p) or 0.0
        total += d
        sd = run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "silencedetect=n=-50dB:d=0.5,astats=metadata=0", "-f", "null", "-"]).stderr
        sil = sum(float(x) for x in re.findall(r"silence_duration: ([\d.]+)", sd))
        peak = max([float(x) for x in re.findall(r"Peak level dB: ([-\d.]+)", sd)] or [-99])
        flags = []
        if d < 0.3:
            flags.append("too short")
        if d and sil >= d - 0.1:
            flags.append("silent")
        if peak >= -0.1:
            flags.append(f"peak {peak} dBFS (clipped?)")
        print(f"{f} {d:.2f} s silence {sil:.2f} s peak {peak} dBFS {'FAIL ' + ', '.join(flags) if flags else 'ok'}")
        bad += bool(flags)
    print(f"{len(files)} say files, {total:.1f} s narration (at most ~600 s)")
    if total > 600:
        print("FAIL narration over ~600 s: cut or tighten says")
        bad += 1
    return 1 if bad or not files else 0


def join(job, out, lufs):
    plan, cfg = load(job)
    W, H = SIZE[cfg["mode"]]
    fps = plan["fps"]
    wd = os.path.join(job, "render", "seg")
    os.makedirs(wd, exist_ok=True)
    for s in plan["slides"]:  # audio changed since build_slides.py would be cut mid-sentence
        for sa in s["says"]:
            d = ffdur(os.path.join(job, "audio", f"say-{sa['n']:02d}.mp3"))
            if d is None or abs(d - sa["duration"]) > 0.05:
                print(f"FAIL slide {s['n']:02d}: say {sa['n']:02d} is {d if d is None else round(d, 2)} s, plan has {sa['duration']} s: "
                      "audio changed since build_slides; rerun align.py and build_slides.py")
                return 1
    segs, wavs = [], []
    for s in plan["slides"]:
        nn = f"{s['n']:02d}"
        D = s["duration"]
        video = os.path.join(job, s["video"])
        if s.get("clip"):  # variant B: retime the Manim clip to the narration (nothing stretches it for us)
            clip = os.path.join(job, s["clip"])
            cd = ffdur(clip)
            if not cd:
                print(f"FAIL slide {nn}: {clip} missing")
                return 1
            r = run(["ffmpeg", "-v", "error", "-y", "-i", clip, "-vf",
                     f"setpts={D / cd:.6f}*PTS,fps={fps},scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2",
                     "-an", "-t", f"{D}", "-c:v", "libx264", "-pix_fmt", "yuv420p", video])
            if r.returncode:
                print(f"FAIL slide {nn}: retime: {r.stderr[-300:]}")
                return 1
        if not os.path.exists(video):
            print(f"FAIL slide {nn}: {video} missing (render it first)")
            return 1
        # audio: pre-roll, each say at its offset, silence elsewhere, exactly D seconds
        inputs, filt = [], []
        for k, sa in enumerate(s["says"]):
            inputs += ["-i", os.path.join(job, "audio", f"say-{sa['n']:02d}.mp3")]
            ms = int(round(sa["offset"] * 1000))
            filt.append(f"[{k + 1}:a]aresample=48000,aformat=channel_layouts=mono,adelay={ms}[a{k}]")
        mix = "".join(f"[a{k}]" for k in range(len(s["says"])))
        if s["says"]:
            filt.append(f"[0:a]{mix}amix=inputs={len(s['says']) + 1}:normalize=0:duration=first[aout]")
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-t", f"{D}", "-i", "anullsrc=r=48000:cl=mono"] + inputs
        wav = os.path.join(wd, f"slide-{nn}.wav")
        cmd += (["-filter_complex", ";".join(filt), "-map", "[aout]"] if s["says"] else []) + ["-t", f"{D}", wav]
        r = run(cmd)
        if r.returncode:
            print(f"FAIL slide {nn}: audio: {r.stderr[-300:]}")
            return 1
        seg = os.path.join(wd, f"seg-{nn}.mp4")
        r = run(["ffmpeg", "-v", "error", "-y", "-i", video, "-map", "0:v:0",
                 "-vf", f"fps={fps},scale={W}:{H},format=yuv420p", "-c:v", "libx264", "-crf", "18",
                 "-an", "-t", f"{D}", seg])
        if r.returncode:
            print(f"FAIL slide {nn}: mux: {r.stderr[-300:]}")
            return 1
        vd = ffdur(video)
        if vd is not None and abs(vd - D) > 0.2:
            print(f"WARN slide {nn}: video {vd:.2f} s vs planned {D:.2f} s")
        segs.append(seg)
        wavs.append(wav)
    lst = os.path.join(wd, "list.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in segs)
    joined = os.path.join(wd, "joined.mp4")
    r = run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    if r.returncode:
        print(f"FAIL concat: {r.stderr[-300:]}")
        return 1
    wlst = os.path.join(wd, "wavs.txt")  # one continuous PCM track, encoded to AAC once: no per-segment priming drift
    with open(wlst, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in wavs)
    allwav = os.path.join(wd, "all.wav")
    r = run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", wlst, "-c", "copy", allwav])
    if r.returncode:
        print(f"FAIL audio concat: {r.stderr[-300:]}")
        return 1
    dst = os.path.join(job, out)
    r = run(["ffmpeg", "-v", "error", "-y", "-i", joined, "-i", allwav, "-map", "0:v:0", "-map", "1:a:0", "-af", f"loudnorm=I={lufs}:TP=-1.5:LRA=11",
             "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", dst])
    if r.returncode:
        print(f"FAIL encode: {r.stderr[-300:]}")
        return 1
    print(f"{dst}: {ffdur(dst):.2f} s from {len(segs)} segments")
    return 0


def frames(job, video, cues=False):
    plan, cfg = load(job)
    vp = os.path.join(job, video)
    qd = os.path.join(job, "qc")
    os.makedirs(qd, exist_ok=True)
    t, shots = 0.0, []
    for s in plan["slides"]:
        D = s["duration"]
        shots.append((f"slide-{s['n']:02d}", t + D / 2))
        for k, z in enumerate(s.get("zooms") or []):
            if z.get("quadrant"):
                shots.append((f"slide-{s['n']:02d}-q{k + 1}", t + z["t"] + 1.0))
        t += D
    bad = 0
    for name, at in shots:
        out = os.path.join(qd, f"{name}.png")
        r = run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", vp, "-frames:v", "1", out])
        if r.returncode or not os.path.exists(out):
            print(f"FAIL {name} at {at:.2f} s")
            bad += 1
    try:
        from PIL import Image, ImageDraw
        ims = [(n, Image.open(os.path.join(qd, f"{n}.png"))) for n, _ in shots if os.path.exists(os.path.join(qd, f"{n}.png"))]
        cols = 6
        tw = 320
        th = int(tw * ims[0][1].height / ims[0][1].width) if ims else 320
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * (th + 28)), "white")
        d = ImageDraw.Draw(sheet)
        for i, (n, im) in enumerate(ims):
            x, y = (i % cols) * tw, (i // cols) * (th + 28)
            sheet.paste(im.convert("RGB").resize((tw, th)), (x, y + 28))
            d.text((x + 6, y + 6), n, fill="black")
        sheet.save(os.path.join(qd, "sheet.png"))
        print(f"qc/sheet.png: {len(ims)} frames")
    except Exception as e:  # the per-frame files are still there
        print(f"WARN no contact sheet: {e}")
    print(f"{len(shots)} frames in qc/")
    if cues:
        bad += cue_frames(job, plan, vp, qd)
    return 1 if bad else 0


def cue_frames(job, plan, vp, qd):
    """Sample the video at each pointer cue; count pixels near the highlight colour (#ffb547)."""
    from PIL import Image, ImageDraw
    fps, t, rows, bad = plan["fps"], 0.0, [], 0
    for s in plan["slides"]:
        for c in s.get("cue_log") or []:
            if not c["pointer"]:
                continue
            ats = [t + c["t"] + (k + 0.5) / fps for k in range(max(1, int(round(c["d"] * fps))))] if c["short"] else [t + c["t"] + 0.1]
            hit = 0
            for j, at in enumerate(ats):
                out = os.path.join(qd, f"cue-{s['n']:02d}-{len(rows):03d}-{j}.png")
                if run(["ffmpeg", "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", vp, "-frames:v", "1", out]).returncode or not os.path.exists(out):
                    continue
                im = Image.open(out).convert("RGB")
                raw = im.resize((im.width // 4, im.height // 4)).tobytes()
                n = sum(1 for i in range(0, len(raw), 3) if raw[i] > 225 and 150 < raw[i + 1] < 205 and raw[i + 2] < 110)
                hit = max(hit, n)
                rows.append((f"s{s['n']:02d} {c['label'][:18]}", out, n))
            if hit < 3:
                print(f"FAIL slide {s['n']:02d} cue '{c['label']}' at {t + c['t']:.2f} s: no highlight pixels in {len(ats)} sampled frame(s)")
                bad += 1
        t += s["duration"]
    if rows:
        tw = 320
        ims = [(n, Image.open(p).convert("RGB"), k) for n, p, k in rows]
        th = int(tw * ims[0][1].height / ims[0][1].width)
        cols = 6
        sheet = Image.new("RGB", (cols * tw, ((len(ims) + cols - 1) // cols) * (th + 28)), "white")
        d = ImageDraw.Draw(sheet)
        for i, (n, im, k) in enumerate(ims):
            x, y = (i % cols) * tw, (i // cols) * (th + 28)
            sheet.paste(im.resize((tw, th)), (x, y + 28))
            d.text((x + 6, y + 6), f"{n} px={k}", fill="black")
        sheet.save(os.path.join(qd, "cues.png"))
    print(f"qc/cues.png: {len(rows)} cue frames; cues with no highlight: {bad}")
    return bad


def probe(job, video):
    plan, cfg = load(job)
    W, H = SIZE[cfg["mode"]]
    vp = os.path.join(job, video)
    st = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "json", vp]).stdout or "{}").get("streams", [])
    v = [s for s in st if s.get("codec_type") == "video"]
    a = [s for s in st if s.get("codec_type") == "audio"]
    want = sum(s["duration"] for s in plan["slides"])
    got = ffdur(vp) or 0.0
    lufs = re.findall(r"I:\s+([-\d.]+) LUFS", run(["ffmpeg", "-hide_banner", "-nostats", "-i", vp, "-af", "ebur128", "-f", "null", "-"]).stderr)
    fails = []
    if len(v) != 1 or len(a) != 1:
        fails.append(f"{len(v)} video and {len(a)} audio streams (want 1 and 1)")
    if v and (v[0].get("width"), v[0].get("height")) != (W, H):
        fails.append(f"frame {v[0].get('width')}x{v[0].get('height')} (want {W}x{H})")
    if plan.get("slide_count") and len(plan["slides"]) != plan["slide_count"]:
        fails.append(f"plan has {len(plan['slides'])} slides, the document has {plan['slide_count']} (including the end card)")
    if abs(got - want) > 0.5:
        fails.append(f"duration {got:.2f} s vs {want:.2f} s planned")
    print(json.dumps({"video": vp, "streams": {"video": len(v), "audio": len(a)}, "size": [v[0].get("width"), v[0].get("height")] if v else None,
                      "duration": round(got, 2), "planned": round(want, 2), "integrated_lufs": float(lufs[-1]) if lufs else None, "fails": fails}, indent=2))
    return 1 if fails else 0


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    cmd, job = argv[1], argv[2]
    o = lambda n, d: argv[argv.index(n) + 1] if n in argv else d
    if cmd == "audio":
        return audio_check(job)
    if cmd == "join":
        return join(job, o("--out", "explainer.mp4"), float(o("--lufs", -16)))
    if cmd == "frames":
        return frames(job, o("--video", "explainer.mp4"), "--cues" in argv)
    if cmd == "probe":
        return probe(job, o("--video", "explainer.mp4"))
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
