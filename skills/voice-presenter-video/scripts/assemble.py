#!/usr/bin/env python3
"""Scene clips -> one presenter MP4 for voice-presenter-video (SL8-authored from WF22-a6 steps 13 and 15).

Joins the scene clips in order with ONE re-encode to a common frame rate, frame size and audio rate,
then (unless --loudness off) normalises the mix with two-pass ffmpeg loudnorm using the measured
values and linear=true, and checks that the result lasts as long as the clips together.

  python3 assemble.py --clips artifacts/<p>/scenes/scene-01.mp4 artifacts/<p>/scenes/scene-02.mp4 ... \
      --expect N --out artifacts/<p>/final/presenter.mp4 [--fps N] [--size WxH] [--fit pad|crop] \
      [--loudness social|standard|off]

--expect is the scene count of scenes.json: a missing scene, a gap or a repeat in the scene-NN
numbering fails the join (a faulty scene blocks assembly; it is retried or the job ends partial).
Each clip is cut to the shorter of its video and audio stream before the join, so a video tail
(fabric clips can run past their speech) never shifts the next scene's sound off its picture; a clip
whose two streams differ by more than 0.5 s fails. --fit pad (default) fits a clip of another shape
inside the frame with bars; --fit crop fills the frame and cuts the edges (look at the face first).

Defaults: frame rate and size of the first clip; audio 48 kHz stereo AAC; H.264 yuv420p CRF 18;
loudness social = -14 LUFS, standard = -16 LUFS, both true peak -1.5 dBTP and LRA 11 (enrichment from
hyperframes/mediause-ec397d#64). Writes <out>.assembly.json with every clip's probe, the targets and
the loudness passes. Prints the same JSON. It never prints PASS: the exit code is the verdict (HR14).

Exit: 0 written and the duration matches; 1 a clip has no video or no audio, the scene numbering has a
gap, a clip's streams differ by more than 0.5 s, the mix is silent, ffmpeg failed, or the output's
duration is off by more than 0.1 s per join; 2 usage; 3 ffmpeg or ffprobe is missing.
"""
import argparse, json, os, re, shutil, subprocess, sys
from fractions import Fraction

TARGETS = {"social": -14.0, "standard": -16.0}


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries",
             "stream=index,codec_type,width,height,r_frame_rate,sample_rate,channels,duration:format=duration",
             "-of", "json", path])
    if r.returncode != 0:
        return {"file": path, "error": r.stderr.strip()[:300]}
    d = json.loads(r.stdout or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    out = {"file": path, "duration": float(d.get("format", {}).get("duration") or 0)}
    if v:
        out.update(width=v.get("width"), height=v.get("height"), fps=str(Fraction(v.get("r_frame_rate", "0/1"))),
                   video_s=float(v.get("duration") or 0))
    if a:
        out.update(sample_rate=int(a.get("sample_rate") or 0), channels=a.get("channels"), audio_s=float(a.get("duration") or 0))
    return out


def loudnorm_json(stderr):
    blocks = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr, re.S)
    return json.loads(blocks[-1]) if blocks else None


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--clips", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--fps")
    ap.add_argument("--size")
    ap.add_argument("--expect", type=int, required=True)
    ap.add_argument("--fit", choices=["pad", "crop"], default="pad")
    ap.add_argument("--loudness", choices=["social", "standard", "off"], default="standard")
    a = ap.parse_args()
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print(json.dumps({"check": "assemble", "exit": 3, "fails": ["ffmpeg or ffprobe is missing: the machine is broken (HR21)"]}))
        return 3
    fails, warns = [], []
    clips = [probe(c) for c in a.clips]
    for c in clips:
        if "error" in c or "width" not in c:
            fails.append(f"{c['file']}: no video stream")
        elif "sample_rate" not in c:
            fails.append(f"{c['file']}: no audio stream (a presenter clip carries its speech)")
        else:
            c["video_s"] = c.get("video_s") or c["duration"]
            c["audio_s"] = c.get("audio_s") or c["duration"]
            c["keep_s"] = round(min(c["video_s"], c["audio_s"]), 3)
            c["offset_s"] = round(c["video_s"] - c["audio_s"], 3)
            if abs(c["offset_s"]) > 0.5:
                fails.append(f"{c['file']}: video {c['video_s']:.2f} s against audio {c['audio_s']:.2f} s; a clip this far off is faulty, re-render the scene")
            elif abs(c["offset_s"]) > 0.05:
                warns.append(f"{c['file']}: video {c['video_s']:.2f} s against audio {c['audio_s']:.2f} s; cut to {c['keep_s']:.2f} s before the join")
    if len(clips) != a.expect:
        fails.append(f"{len(clips)} clips given, {a.expect} scenes expected (--expect): a missing scene blocks assembly")
    nums = [re.search(r"scene-(\d+)", os.path.basename(c["file"])) for c in clips]
    if all(nums):
        got = [int(n.group(1)) for n in nums]
        if got != list(range(1, len(got) + 1)):
            fails.append(f"scene numbers {got} are not 1..{len(got)} in order")
    else:
        warns.append("clip names are not scene-NN.mp4: the numbering was not checked")
    report = {"check": "assemble", "clips": clips, "fit": a.fit, "fails": fails, "warns": warns}
    if fails:
        report["exit"] = 1
        print(json.dumps(report))
        return 1
    fps = a.fps or clips[0]["fps"]
    if a.size:
        w, h = (int(x) for x in a.size.lower().split("x"))
    else:
        w, h = clips[0]["width"], clips[0]["height"]
    w, h = w - w % 2, h - h % 2
    for c in clips:
        if (c["width"], c["height"]) != (clips[0]["width"], clips[0]["height"]):
            warns.append(f"{c['file']}: {c['width']}x{c['height']} differs from the first clip; it is fitted inside {w}x{h} with padding")
        if c["fps"] != str(Fraction(fps)):
            warns.append(f"{c['file']}: {c['fps']} fps re-timed to {fps}")
    parts, chains = [], []
    for i, c in enumerate(clips):
        parts += ["-i", c["file"]]
        if a.fit == "crop":
            fit = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
        else:
            fit = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"
        chains.append(f"[{i}:v]trim=duration={c['keep_s']},setpts=PTS-STARTPTS,fps={fps},{fit},setsar=1,format=yuv420p[v{i}];"
                      f"[{i}:a]atrim=duration={c['keep_s']},asetpts=PTS-STARTPTS,aresample=48000,"
                      f"aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]")
    graph = ";".join(chains) + ";" + "".join(f"[v{i}][a{i}]" for i in range(len(clips))) + f"concat=n={len(clips)}:v=1:a=1[v][a]"
    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or ".", exist_ok=True)
    # With a loudness pass the join keeps the audio as PCM in a scratch MKV, so the audio is encoded to AAC once.
    joined = a.out if a.loudness == "off" else re.sub(r"(\.\w+)$", ".joined.mkv", a.out)
    acodec = ["-c:a", "aac", "-b:a", "192k"] if a.loudness == "off" else ["-c:a", "pcm_s16le"]
    r = run(["ffmpeg", "-v", "error", "-y", *parts, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
             *acodec, "-ar", "48000", *(["-movflags", "+faststart"] if a.loudness == "off" else []), joined])
    if r.returncode != 0:
        fails.append(f"join failed: {r.stderr.strip()[-400:]}")
    if not fails and a.loudness != "off":
        tgt = TARGETS[a.loudness]
        spec = f"loudnorm=I={tgt}:TP=-1.5:LRA=11"
        m = run(["ffmpeg", "-hide_banner", "-nostats", "-i", joined, "-vn", "-af", spec + ":print_format=json", "-f", "null", "-"])
        first = loudnorm_json(m.stderr)
        if not first:
            fails.append("loudnorm measurement printed no figures")
        elif any(str(first.get(k, "")).lstrip("+") in ("-inf", "inf", "nan") for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")):
            fails.append("the joined audio is silent or below loudnorm's measuring floor: loudness cannot be set (look at the clips' sound)")
        else:
            apply = (f"{spec}:measured_I={first['input_i']}:measured_TP={first['input_tp']}:measured_LRA={first['input_lra']}"
                     f":measured_thresh={first['input_thresh']}:offset={first['target_offset']}:linear=true:print_format=json")
            r2 = run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", joined, "-map", "0:v", "-map", "0:a", "-c:v", "copy",
                      "-af", apply, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", a.out])
            second = loudnorm_json(r2.stderr)
            if r2.returncode != 0:
                fails.append(f"loudnorm pass failed: {r2.stderr.strip()[-400:]}")
            report["loudness"] = {"target_lufs": tgt, "true_peak": -1.5, "lra": 11, "measured": first, "applied": second}
            if second and second.get("normalization_type") != "linear":
                warns.append("loudnorm fell back to dynamic normalisation (the target was not reachable linearly); listen to the result")
            if os.path.exists(joined) and joined != a.out:
                os.remove(joined)
    if not fails:
        o = probe(a.out)
        want = sum(c["keep_s"] for c in clips)
        report.update(output=o, expected_s=round(want, 3), size=f"{w}x{h}", fps=fps)
        if abs(o["duration"] - want) > 0.1 * len(clips):
            fails.append(f"output lasts {o['duration']:.2f} s, the clips together {want:.2f} s")
        if o.get("audio_s") and o.get("video_s") and abs(o["audio_s"] - o["video_s"]) > 0.2:
            fails.append(f"output audio {o['audio_s']:.2f} s against video {o['video_s']:.2f} s")
    report["exit"] = 1 if fails else 0
    if not fails:
        with open(a.out + ".assembly.json", "w") as f:
            json.dump(report, f, indent=1)
    print(json.dumps(report))
    return report["exit"]


if __name__ == "__main__":
    sys.exit(main())
