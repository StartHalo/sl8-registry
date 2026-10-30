#!/usr/bin/env python3
"""Audio and master for a beat-cut montage (edit-beat-montage).

  mix_master.py <edl.json> --video work/<p>/video.mp4 --out artifacts/<p>/final/<name>.mp4
                [--work work/<p>/audio] [--track-lufs -14] [--line-lufs -15.5] [--limit 0.80] [--fade 0.5] [--mix-gain DB]

  1. The track from audio_in for total_frames / fps seconds, a short fade at the end (the edit ends
     on a bar line), then two-pass loudnorm with the first pass's measured values fed back and
     linear=true: I -14, TP -1.5, LRA 11.
  2. Each spoken line in lines[]: 25 ms fades in and out, a fixed gain to -15.5 LUFS measured with
     ebur128 (a fixed gain cannot pump on a short clip; a line must be at least 0.4 s, the length of
     one ebur128 block), then a limiter at --limit.
  3. The lines placed at their frames over the track, summed without level scaling (amix
     normalize=0), and the same limiter on the sum when lines exist. --limit is the peak ceiling of
     that limiter (0.80 = -1.94 dBFS, headroom for the AAC encode), not a loudness control.
     Then the mix is measured: when integrated loudness is outside the track target +/- 0.5 LU or its
     true peak is above the track TP, one linear gain (plus --mix-gain) brings it back, never past
     the TP ceiling; the figures before and after are printed.
  4. The picture stream copied as rendered (one video encode in total) with AAC 256k.
Prints the measured figures; verify.py gates the master.
Exit 0 written; 1 bad input or ffmpeg failed; 2 ffmpeg or ffprobe missing.
SL8-authored from the method recorded in the capability assessment (WF27-a1 step 13, with the
HyperFrames two-pass loudnorm rule); no vendor file is copied.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def ff(args, what):
    p = subprocess.run(["ffmpeg", "-v", "info", "-nostdin", "-y"] + args, capture_output=True, text=True)
    if p.returncode != 0:
        fail(1, f"{what} failed: {p.stderr.strip()[-500:]}")
    return p.stderr


def integrated(path):
    err = subprocess.run(["ffmpeg", "-nostdin", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    tail = err[err.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", tail)
    tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", tail)
    val = lambda m: (None if m is None or m.group(1) == "-inf" else float(m.group(1)))
    return val(i), val(tp)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("edl")
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--work")
    ap.add_argument("--track-lufs", type=float, default=-14.0)
    ap.add_argument("--track-tp", type=float, default=-1.5)
    ap.add_argument("--track-lra", type=float, default=11.0)
    ap.add_argument("--line-lufs", type=float, default=-15.5)
    ap.add_argument("--limit", type=float, default=0.80, help="peak ceiling of the limiter (not a loudness control)")
    ap.add_argument("--mix-gain", type=float, default=0.0, help="extra dB on the finished mix")
    ap.add_argument("--fade", type=float, default=0.5)
    ap.add_argument("--line-fade", type=float, default=0.025)
    a = ap.parse_args()
    for t in ("ffmpeg", "ffprobe"):
        if not shutil.which(t):
            fail(2, f"{t} is not on PATH: the machine is broken (HR21), report it")
    e = json.load(open(a.edl, encoding="utf-8"))
    if not e.get("audio"):
        fail(1, "the EDL has no audio: this method needs the customer's track (SKILL.md step 6)")
    for p in (e["audio"], a.video):
        if not os.path.exists(p):
            fail(1, f"{p}: no such file")
    fps, total = float(e["fps"]), int(e["total_frames"])
    dur = total / fps
    work = a.work or os.path.join(os.path.dirname(os.path.abspath(a.video)), "audio")
    os.makedirs(work, exist_ok=True)
    t_in = float(e.get("audio_in", 0))
    fade = f"afade=t=out:st={max(0.0, dur - a.fade):.4f}:d={a.fade:.4f}," if a.fade > 0 else ""
    base = f"atrim=start={t_in:.5f}:duration={dur:.5f},asetpts=PTS-STARTPTS,{fade}"
    target = f"I={a.track_lufs}:TP={a.track_tp}:LRA={a.track_lra}"
    err = ff(["-i", e["audio"], "-af", base + f"loudnorm={target}:print_format=json", "-f", "null", "-"],
             "loudnorm pass 1")
    m = json.loads(err[err.rfind("{"):err.rfind("}") + 1])
    second = (f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:"
              f"offset={m['target_offset']}:linear=true:print_format=json")
    track_n = os.path.join(work, "track_n.wav")
    err = ff(["-i", e["audio"], "-af", base + second, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", track_n],
             "loudnorm pass 2")
    m2 = json.loads(err[err.rfind("{"):err.rfind("}") + 1])
    report = {"track": {"audio_in": t_in, "seconds": round(dur, 4), "measured_I": m["input_i"],
                        "measured_TP": m["input_tp"], "normalization": m2.get("normalization_type")},
              "lines": []}
    if m2.get("normalization_type") != "linear":
        print("WARN loudnorm fell back to dynamic mode (the track's peaks do not allow a linear gain at "
              f"TP {a.track_tp}); it may pump: listen-free check is the step 14 loudness gate", file=sys.stderr)
    inputs, labels, graph = ["-i", track_n], ["[0:a]"], []
    for k, ln in enumerate(e.get("lines", [])):
        if not os.path.exists(ln["src"]):
            fail(1, f"line {k}: {ln['src']} missing")
        ld = float(ln["out"]) - float(ln["in"])
        if ld < 0.4:
            fail(1, f"line {k}: {ld:.3f} s is under 0.4 s, the shortest span ebur128 can measure; "
                    "take a longer span of the clip or use no line for this word")
        raw = os.path.join(work, f"line_{k:02d}_raw.wav")
        ff(["-ss", f"{ln['in']:.4f}", "-t", f"{ld:.4f}", "-i", ln["src"], "-vn", "-ac", "2", "-ar", "48000",
            "-af", f"afade=t=in:d={a.line_fade},afade=t=out:st={ld - a.line_fade:.4f}:d={a.line_fade}", raw],
           f"line {k} cut")
        li, _ = integrated(raw)
        if li is None:
            fail(1, f"line {k}: no measurable speech (silent clip)")
        gain = a.line_lufs - li
        fin = os.path.join(work, f"line_{k:02d}.wav")
        ff(["-i", raw, "-af", f"volume={gain:.2f}dB,alimiter=limit={a.limit}:level=0", "-c:a", "pcm_s24le", fin],
           f"line {k} level")
        delay = int(round(float(ln["f"]) / fps * 1000))
        inputs += ["-i", fin]
        graph.append(f"[{k + 1}:a]adelay={delay}|{delay}[l{k}]")
        labels.append(f"[l{k}]")
        report["lines"].append({"src": ln["src"], "in": ln["in"], "out": ln["out"], "frame": ln["f"],
                                "measured_I": li, "gain_db": round(gain, 2)})
    mix0 = os.path.join(work, "mix0.wav")
    mix = os.path.join(work, "mix.wav")
    if len(labels) > 1:
        graph.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=first:dropout_transition=0,"
                     f"alimiter=limit={a.limit}:level=0,atrim=duration={dur:.5f}[m]")
        ff(inputs + ["-filter_complex", ";".join(graph), "-map", "[m]", "-c:a", "pcm_s24le", mix0], "line mix")
    else:
        shutil.copyfile(track_n, mix0)
    # Measure the sum: a limiter trims peaks, it does not set loudness.
    mi, mtp = integrated(mix0)
    gain = a.mix_gain
    if mi is not None and (abs(mi - a.track_lufs) > 0.5 or (mtp is not None and mtp > a.track_tp)):
        gain += a.track_lufs - mi
        if mtp is not None:
            gain = min(gain, a.track_tp - mtp)  # never past the true-peak ceiling
    report["mix"] = {"before_I": mi, "before_TP": mtp, "gain_db": round(gain, 2)}
    if abs(gain) > 0.05:
        ff(["-i", mix0, "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_s24le", mix], "mix gain")
    else:
        shutil.copyfile(mix0, mix)
    report["mix"]["after_I"], report["mix"]["after_TP"] = integrated(mix)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    ff(["-i", a.video, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
        "-ar", "48000", "-t", f"{dur:.5f}", "-movflags", "+faststart", a.out], "mux")
    report["master"] = a.out
    report["master_I"], report["master_TP"] = integrated(a.out)
    with open(os.path.join(work, "mix_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    print(json.dumps({"out": a.out, "mix": report["mix"], "master_I": report["master_I"], "master_TP": report["master_TP"],
                      "track_normalization": report["track"]["normalization"], "lines": len(report["lines"]),
                      "report": os.path.join(work, "mix_report.json")}))


if __name__ == "__main__":
    main()
