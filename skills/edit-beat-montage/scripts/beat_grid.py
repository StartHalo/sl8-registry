#!/usr/bin/env python3
"""Beat grid for a beat-cut montage (edit-beat-montage).

  beat_grid.py grid <track.wav> --fps 30 --out work/<p>/beats.json [--entry-bar N | --audio-in S]
               [--need 15] [--beats-per-bar 4] [--bpm N]
      librosa tempo, beats and onsets; a straight-line fit of the strong onsets against their beat
      numbers gives the beat period and phase (the fit error is printed in ms); bars, a suggested
      entry bar, and the timeline from that bar (or from --audio-in, e.g. 0 for a remake on the
      reference's own track): a beat's frame is round((phase + k * period - audio_in) * fps),
      always computed from the beat number k, never by adding up rounded beat lengths.
  beat_grid.py snap work/<p>/beats.json --cuts <cuts.json | t1,t2,...> --out work/<p>/cuts.json
      checks planned cuts given in timeline seconds (0 = audio_in): an offset of at most one
      frame from the nearest beat is kept; two or three frames triggers the onset check and the cut
      moves to the nearest beat that has an onset; more than three frames is reported as off-grid.

  --bpm N forces the starting tempo (use it when "tempo_octave" in the output says the grid may be at
  half or double the felt beat); --beats-per-bar 3 or 6 for waltz and 6/8 feels. The output lists
  "tempo_octave": the onset score of the chosen tempo, half and double, and "ambiguous" when an
  alternative scores within 15% of the chosen one.

Exit 0 written; 1 bad input, no usable beat, or a fit error over 25 ms (the file is still written);
2 librosa or numpy missing.
SL8-authored from the method recorded in the capability assessment (WF27-a1 step 6, with the
HyperFrames beat-to-frame arithmetic and bar-line entry and exit); no vendor file is copied.
"""
import argparse
import json
import math
import os
import sys

sys.dont_write_bytecode = True


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def chain(strong, period, t0, tol):
    """Beat numbers by steps from the previous kept onset, so a small period error cannot pile up
    over a long track; onsets between beats (off-beats, fills) are left out."""
    ks, ts, prev_t, prev_k = [], [], None, None
    for t in strong:
        if prev_t is None:
            k = round((t - t0) / period)
            if abs(t - (t0 + k * period)) < tol * period:
                prev_t, prev_k = t, k
                ks.append(k)
                ts.append(t)
            continue
        steps = round((t - prev_t) / period)
        if steps >= 1 and abs((t - prev_t) - steps * period) < tol * period:
            prev_t, prev_k = t, prev_k + steps
            ks.append(prev_k)
            ts.append(t)
    return ks, ts


def fit_grid(beat_t, onset_t, onset_s, strong_pct, bpm=None):
    import numpy as np
    p0 = 60.0 / bpm if bpm else float(np.median(np.diff(beat_t)))
    t0 = float(beat_t[0])
    thr = float(np.percentile(onset_s, strong_pct)) if len(onset_s) else 0.0
    strong = onset_t[onset_s >= thr] if len(onset_s) else np.array([])
    period, phase, used, errs, basis = p0, t0, 0, None, "onsets"
    for tol in (0.25, 0.15, 0.1):
        if strong.size < 8:
            break
        ks, ts = chain(strong, period, phase, tol)
        if len(ks) < 8:
            break
        k, t = np.array(ks, dtype=float), np.array(ts)
        slope, icpt = np.polyfit(k, t, 1)
        period, phase = float(slope), float(icpt)
        used = len(ks)
        errs = np.abs(t - (phase + k * period))
    if errs is None:
        # Too few strong onsets on the beat: fit the tracker's own beats instead (less precise).
        k = np.arange(len(beat_t))
        period, phase = (float(v) for v in np.polyfit(k, beat_t, 1))
        errs = np.abs(beat_t - (phase + k * period))
        used, basis = len(beat_t), "beats"
    # Move the phase to the first beat at or after 0 s.
    phase = phase - math.floor(phase / period) * period
    return period, phase, used, basis, errs, strong


def cmd_grid(a):
    try:
        import numpy as np
        import librosa
    except ImportError as e:
        fail(2, f"{e.name} is missing: the machine is broken (HR21), report it")
    if not os.path.exists(a.track):
        fail(1, f"{a.track}: no such file")
    y, sr = librosa.load(a.track, sr=22050, mono=True)
    dur = len(y) / sr
    if dur < 4:
        fail(1, f"track is {dur:.1f} s: too short for a beat grid")
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    beat_t = librosa.frames_to_time(beats, sr=sr)
    if len(beat_t) < 8:
        fail(1, f"only {len(beat_t)} beats found: no usable pulse (a beat-cut needs a rhythmic track)")
    env = librosa.onset.onset_strength(y=y, sr=sr)
    on_f = librosa.onset.onset_detect(onset_envelope=env, sr=sr)
    onset_t = librosa.frames_to_time(on_f, sr=sr)
    onset_s = env[on_f] if len(on_f) else np.array([])
    period, phase, used, basis, errs, strong = fit_grid(beat_t, onset_t, onset_s, a.strong_pct, a.bpm)
    n_beats = int(math.floor((dur - phase) / period)) + 1
    k = np.arange(n_beats)
    grid_t = phase + k * period
    # Downbeat guess: the bar offset whose beats carry the most onset strength.
    env_t = librosa.times_like(env, sr=sr)
    at = np.interp(grid_t, env_t, env)
    # Tempo octave check: mean onset strength at the beats of the chosen period, of half the tempo
    # (every second beat) and of double the tempo (a beat between each pair).
    def score(per):
        tt = np.arange(phase, dur, per)
        return float(np.interp(tt, env_t, env).mean()) if len(tt) else 0.0
    sc = {"half": score(period * 2), "chosen": score(period), "double": score(period / 2)}
    ambiguous = any(sc[k] >= 0.85 * sc["chosen"] for k in ("half", "double"))
    octave = {"bpm_half": round(30.0 / period, 2), "bpm_chosen": round(60.0 / period, 2),
              "bpm_double": round(120.0 / period, 2), "scores": {k: round(v, 4) for k, v in sc.items()},
              "ambiguous": ambiguous}
    bpb = a.beats_per_bar
    offset = int(np.argmax([at[b::bpb].sum() for b in range(bpb)]))
    rms = librosa.feature.rms(y=y)[0]
    rms_t = librosa.times_like(rms, sr=sr)
    bars = []
    for i, kb in enumerate(range(offset, n_beats, bpb)):
        t0, t1 = grid_t[kb], grid_t[kb] + bpb * period
        sel = (rms_t >= t0) & (rms_t < t1)
        bars.append({"bar": i, "k": int(kb), "t": round(float(t0), 4),
                     "energy": round(float(rms[sel].mean()) if sel.any() else 0.0, 5)})
    # Suggested entry: the bar where the next 4 bars rise most over the 2 before (a section start),
    # among bars that leave --need seconds of track. A suggestion: the agent may pick another bar.
    e = [b["energy"] for b in bars]
    best, best_score = None, -1e9
    for i, b in enumerate(bars):
        if b["t"] + a.need > dur:
            break
        after = sum(e[i:i + 4]) / max(1, len(e[i:i + 4]))
        before = sum(e[max(0, i - 2):i]) / max(1, i - max(0, i - 2)) if i else 0.0
        score = after - before
        if score > best_score:
            best, best_score = i, score
    loudest = int(max(range(len(bars)), key=lambda i: sum(e[i:i + 4]))) if bars else None
    if a.audio_in is not None:
        # A fixed origin, e.g. 0 for a remake that keeps the reference's own timeline.
        t_in, entry = float(a.audio_in), None
    else:
        entry = a.entry_bar if a.entry_bar is not None else (best if best is not None else 0)
        if entry < 0 or entry >= len(bars):
            fail(1, f"--entry-bar {entry} is outside 0..{len(bars) - 1}")
        t_in = float(grid_t[bars[entry]["k"]])
    # Frame of beat k on the timeline, from the beat number every time (never a running sum).
    ks = [int(k) for k in range(n_beats) if phase + k * period >= t_in - 1e-6]
    frame = lambda k: int(round((phase + k * period - t_in) * a.fps))
    timeline = {"entry_bar": entry, "audio_in": round(t_in, 5),
                "beat_frames": [frame(k) for k in ks],
                "bar_frames": [frame(k) for k in ks if (k - offset) % bpb == 0],
                "seconds_left": round(dur - t_in, 3)}
    out = {"track": a.track, "duration_s": round(dur, 3), "fps": a.fps, "tempo_bpm_librosa": round(tempo, 2),
           "period_s": round(period, 6), "bpm": round(60.0 / period, 3), "phase_s": round(phase, 5),
           "fit": {"basis": basis, "points": used, "median_err_ms": round(float(np.median(errs)) * 1000, 2),
                   "p90_err_ms": round(float(np.percentile(errs, 90)) * 1000, 2)},
           "tempo_octave": octave, "beats_per_bar": bpb, "bar_offset": offset,
           "beats": [round(float(t), 4) for t in grid_t],
           "strong_onsets": [round(float(t), 4) for t in strong],
           "onsets": [round(float(t), 4) for t in onset_t],
           "bars": bars, "suggested_entry_bar": best, "loudest_bar": loudest, "timeline": timeline}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({"bpm": out["bpm"], "tempo_bpm_librosa": out["tempo_bpm_librosa"], "fit": out["fit"],
                      "tempo_octave": octave, "beats_per_bar": bpb,
                      "bars": len(bars), "entry_bar": entry, "audio_in": timeline["audio_in"],
                      "seconds_left": timeline["seconds_left"], "out": a.out}))
    if ambiguous:
        print(f"WARN tempo octave is ambiguous ({octave}): read the chosen bpm against the track's feel "
              "and pass --bpm if it is half or double", file=sys.stderr)
    if out["fit"]["median_err_ms"] > 25:
        fail(1, f"median fit error {out['fit']['median_err_ms']} ms is over 25 ms: no reliable grid "
                f"(written to {a.out} for inspection); try --bpm, --beats-per-bar, or ask for another track")
    if out["fit"]["median_err_ms"] > 10:
        print(f"WARN median fit error {out['fit']['median_err_ms']} ms is over 10 ms: check the beats "
              "on the timeline before cutting to them", file=sys.stderr)


def cmd_snap(a):
    g = json.load(open(a.beats, encoding="utf-8"))
    fps, period = a.fps or g["fps"], g["period_s"]
    t_in, phase = g["timeline"]["audio_in"], g["phase_s"]
    # Every detected onset counts here (a vocal hit is often not among the strongest).
    onsets = g.get("onsets", g["strong_onsets"])
    if os.path.exists(a.cuts):
        raw = json.load(open(a.cuts, encoding="utf-8"))
        cuts = [c["t"] if isinstance(c, dict) else c for c in raw]
    else:
        cuts = [float(x) for x in a.cuts.split(",") if x.strip()]
    # Beat k of the track, as a timeline frame: computed from k every time, never accumulated.
    frame_of = lambda k: int(round((phase + k * period - t_in) * fps))
    has_onset = lambda k: any(abs(o - (phase + k * period)) * fps <= 1.0 for o in onsets)
    rows = []
    for t in cuts:
        f_in = int(round(t * fps))
        x = (t + t_in - phase) / period
        k = int(round(x))
        off = f_in - frame_of(k)
        row = {"t": t, "frame_in": f_in, "beat": k, "beat_frame": frame_of(k), "offset_frames": off}
        if abs(off) <= 1:
            row.update(status="keep", frame=f_in)
        elif abs(off) <= 3:
            near = sorted({k, int(math.floor(x)), int(math.ceil(x))}, key=lambda b: abs(f_in - frame_of(b)))
            hit = next((b for b in near if has_onset(b)), None)
            b = hit if hit is not None else k
            row.update(status="snapped" if hit is not None else "snapped-no-onset", beat=b, frame=frame_of(b))
        else:
            row.update(status="off-grid", frame=f_in)
        rows.append(row)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump({"fps": fps, "period_s": period, "audio_in": t_in, "cuts": rows}, fh, indent=1)
    print(json.dumps({"cuts": len(rows), "keep": sum(r["status"] == "keep" for r in rows),
                      "snapped": sum(r["status"].startswith("snapped") for r in rows),
                      "off_grid": sum(r["status"] == "off-grid" for r in rows), "out": a.out}))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("grid")
    g.add_argument("track")
    g.add_argument("--fps", type=float, default=30)
    g.add_argument("--out", required=True)
    g.add_argument("--entry-bar", type=int)
    g.add_argument("--audio-in", type=float, help="fixed timeline origin in track seconds (0 for a remake)")
    g.add_argument("--need", type=float, default=15.0, help="seconds of track the edit needs after the entry")
    g.add_argument("--beats-per-bar", type=int, default=4)
    g.add_argument("--bpm", type=float, help="force the starting tempo (half or double of the detected one)")
    g.add_argument("--strong-pct", type=float, default=70.0, help="onset strength percentile for 'strong'")
    s = sub.add_parser("snap")
    s.add_argument("beats")
    s.add_argument("--cuts", required=True)
    s.add_argument("--fps", type=float)
    s.add_argument("--out", required=True)
    a = ap.parse_args()
    cmd_grid(a) if a.cmd == "grid" else cmd_snap(a)


if __name__ == "__main__":
    main()
