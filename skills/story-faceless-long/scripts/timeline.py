#!/usr/bin/env python3
"""Picture Story frame timeline for story-faceless-long (SL8-authored from the method recorded as WF53-a1).

  timeline.py build --script work/<p>/script_manifest.json --audio work/<p>/voices/narration.wav \
      --requested-duration S --out work/<p>/scene_manifest.json \
      [--words-json work/<p>/narration.words.json | --model small --language en]
      Word clock from speech-to-text on the one continuous narration, beats aligned to the spoken
      words, then contiguous frames of 0.7-1.2 s (none over 1.5 s), numbered in spoken order with
      generation waves (0 new framings; 1 and 2 the edits that chain on them).
  timeline.py bind --timeline work/<p>/scene_manifest.json --project-dir artifacts/<p> \
      --frames-dir work/<p>/frames --out work/<p>/scene_manifest.bound.json
      Binds each frame slot to its manifest row (item frame-NNN, status done), checks every edit
      names the previous frame as its parent, and copies the files into --frames-dir through a
      staging folder; a missing slot fails closed.

Exit 0 written; 1 a check failed (nothing written); 2 bad input or no speech-to-text backend.
"""
import argparse, difflib, json, math, os, re, shutil, subprocess, sys

sys.dont_write_bytecode = True
SEG_MIN, SEG_MAX, SEG_TARGET, SEG_CAP = 0.7, 1.2, 1.2, 1.5
TAIL_HOLD = 0.3
MAX_EDITS_IN_A_ROW = 2


def fail(code, msg):
    print(json.dumps({"ok": False, "error": msg}, indent=1))
    sys.exit(code)


def words(s):
    return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", str(s or "").casefold())


def audio_seconds(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        fail(2, f"cannot read {path}")


def heard_words(a):
    if a.words_json:
        env = json.load(open(a.words_json, encoding="utf-8"))
        raw = env.get("raw") or env
        out = []
        for w in raw.get("words") or []:
            if (w.get("type") or "word") != "word":
                continue
            for tok in words(w.get("text") or w.get("word")):
                out.append((tok, float(w["start"]), float(w["end"])))
        return out
    try:
        from faster_whisper import WhisperModel  # baked into the machine; never installed at run time
        m = WhisperModel(a.model, device="cpu", compute_type="int8", local_files_only=True,
                         **({"download_root": a.model_dir} if a.model_dir else {}))
    except Exception:  # noqa: BLE001
        fail(2, "faster-whisper or its weights are not available (try --model-dir): pass --words-json from the remote route")
    segs, _ = m.transcribe(a.audio, language=a.language or None, word_timestamps=True, vad_filter=True, beam_size=5)
    out = []
    for s in segs:
        for w in s.words or []:
            for tok in words(w.word):
                out.append((tok, float(w.start), float(w.end)))
    return out


def build(a):
    m = json.load(open(a.script, encoding="utf-8"))
    beats = m.get("beats") or []
    if not beats:
        fail(1, "the manifest has no beats")
    dur = audio_seconds(a.audio)
    tol = max(3.0, 0.10 * a.requested_duration)
    if abs(dur - a.requested_duration) > tol:
        fail(1, f"narration is {dur:.1f} s for a {a.requested_duration:g} s request (tolerance {tol:.1f} s): rewrite, never stretch")
    heard = heard_words(a)
    if not heard:
        fail(1, "speech-to-text returned no timed words")
    ref, owner = [], []
    for i, b in enumerate(beats):
        for t in words(b.get("phrase")):
            ref.append(t)
            owner.append(i)
    hyp = [h[0] for h in heard]
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    sim = sm.ratio()
    if sim < 0.5:
        fail(1, f"the narration matches the script at {sim:.2f} (needs 0.50): the take is not this script")
    first, last = [None] * len(beats), [None] * len(beats)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            bi = owner[blk.a + k]
            _, s, e = heard[blk.b + k]
            first[bi] = s if first[bi] is None else min(first[bi], s)
            last[bi] = e if last[bi] is None else max(last[bi], e)
    missing = [i + 1 for i in range(len(beats)) if first[i] is None]
    if missing:
        fail(1, f"beats {missing[:8]} were not heard in the narration")
    bounds = [0.0]
    for i in range(len(beats) - 1):
        bounds.append(round((last[i] + first[i + 1]) / 2, 3))
    bounds.append(round(dur + TAIL_HOLD, 3))
    frames, n, edits_in_row = [], 0, 0
    for i, b in enumerate(beats):
        s, e = bounds[i], bounds[i + 1]
        span = e - s
        if span <= 0:
            fail(1, f"beat {i + 1} has no time of its own")
        k = max(1, math.ceil(span / SEG_TARGET))
        while k > 1 and span / k < SEG_MIN:
            k -= 1
        seg = span / k
        cap = SEG_CAP + (TAIL_HOLD if i == len(beats) - 1 else 0)
        if seg > cap + 1e-6:
            fail(1, f"beat {i + 1} would hold a frame {seg:.2f} s (over {SEG_CAP} s): split the beat")
        for j in range(k):
            n += 1
            want_edit = j > 0 or b.get("image_mode") == "variation"
            if n == 1 or edits_in_row >= MAX_EDITS_IN_A_ROW:
                want_edit = False
            edits_in_row = edits_in_row + 1 if want_edit else 0
            fs, fe = round(s + j * seg, 3), round(s + (j + 1) * seg if j < k - 1 else e, 3)
            frames.append({"n": n, "beat_n": i + 1, "start": fs, "end": fe, "duration": round(fe - fs, 3),
                           "output_slot": f"frame-{n:03d}", "image_mode": "variation" if want_edit else "new",
                           "variation_of_frame": n - 1 if want_edit else None,
                           "reference_output_slot": f"frame-{n - 1:03d}" if want_edit else None,
                           "change_only": (b.get("change_only") if j == 0 else None) if want_edit else None,
                           "generation_wave": edits_in_row})
    floor = math.ceil(dur / 1.5)
    if len(frames) < floor:
        fail(1, f"{len(frames)} frames for {dur:.1f} s; the floor is {floor}")
    waves = {w: [f["n"] for f in frames if f["generation_wave"] == w] for w in range(MAX_EDITS_IN_A_ROW + 1)}
    out = {"manifest_version": 2, "audio_s": round(dur, 3), "requested_s": a.requested_duration, "similarity": round(sim, 3),
           "frames": frames, "generation_waves": waves, "edits": sum(1 for f in frames if f["image_mode"] == "variation")}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({"ok": True, "out": a.out, "frames": len(frames), "edits": out["edits"],
                      "waves": {k: len(v) for k, v in waves.items()}, "similarity": out["similarity"]}, indent=1))
    return 0


def bind(a):
    tl = json.load(open(a.timeline, encoding="utf-8"))
    man = json.load(open(os.path.join(a.project_dir, "manifest.json"), encoding="utf-8"))
    rows = {}
    for r in man.get("assets") or []:
        if r.get("status") in ("done", "accepted") and r.get("files"):
            rows[r.get("item")] = r          # the latest done row per item wins
    stage = a.frames_dir.rstrip("/") + ".staging"
    shutil.rmtree(stage, ignore_errors=True)
    os.makedirs(stage)
    problems = []
    for fr in tl["frames"]:
        r = rows.get(fr["output_slot"])
        if not r:
            problems.append(f"{fr['output_slot']}: no done manifest row")
            continue
        f0 = r["files"][0]
        src = os.path.join(a.project_dir, f0["path"] if isinstance(f0, dict) else f0)
        if not os.path.exists(src) or os.path.getsize(src) < 64:
            problems.append(f"{fr['output_slot']}: file missing or empty ({src})")
            continue
        if fr["image_mode"] == "variation":
            parents = [str(x) for x in r.get("parents") or []]
            if not any(fr["reference_output_slot"] in x for x in parents):
                problems.append(f"{fr['output_slot']}: an edit must name {fr['reference_output_slot']} as its only parent")
        dst = os.path.join(stage, fr["output_slot"] + os.path.splitext(src)[1].lower())
        shutil.copyfile(src, dst)
        fr["path"] = os.path.join(a.frames_dir, os.path.basename(dst))
        fr["request_id"] = r.get("request_id")
    if problems:
        shutil.rmtree(stage, ignore_errors=True)
        fail(1, "; ".join(problems[:10]) + (f" (+{len(problems) - 10} more)" if len(problems) > 10 else ""))
    old = a.frames_dir.rstrip("/") + ".old"
    shutil.rmtree(old, ignore_errors=True)
    if os.path.exists(a.frames_dir):
        os.replace(a.frames_dir, old)
    os.replace(stage, a.frames_dir)
    shutil.rmtree(old, ignore_errors=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(tl, f, indent=1)
    print(json.dumps({"ok": True, "out": a.out, "frames": len(tl["frames"]), "frames_dir": a.frames_dir}, indent=1))
    return 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--script", required=True)
    b.add_argument("--audio", required=True)
    b.add_argument("--requested-duration", type=float, required=True)
    b.add_argument("--out", required=True)
    b.add_argument("--words-json")
    b.add_argument("--model", default="small")
    b.add_argument("--model-dir", default="")
    b.add_argument("--language", default="")
    d = sub.add_parser("bind")
    d.add_argument("--timeline", required=True)
    d.add_argument("--project-dir", required=True)
    d.add_argument("--frames-dir", required=True)
    d.add_argument("--out", required=True)
    a = p.parse_args()
    return build(a) if a.cmd == "build" else bind(a)


if __name__ == "__main__":
    sys.exit(main())
