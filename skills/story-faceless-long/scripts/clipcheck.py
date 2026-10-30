#!/usr/bin/env python3
"""Clip check for story-faceless-long (SL8-authored from the method recorded as WF53-a1, step 16).

  clipcheck.py --clips-dir artifacts/<p>/clips --script work/<p>/script_manifest.json --aspect 16:9 \
      [--flat 2,5] [--expect-cuts 4] [--no-stt] [--model small] [--model-dir DIR] [--motion] \
      [--mediaqc $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs] [--report work/<p>/clipcheck.json]

Per clip: the cuts (ffmpeg scene score, 0.3, or 0.15 for a block named in --flat) must equal the
shots the script gave the block minus one (or --expect-cuts), no shot may reach max(3 s, 1.1 x its
planned length), the first 1.5 s and last 2 s must not be frozen, the picture must be the stated
aspect, and the clip must carry an audio stream. Narration blocks are listened to with local
faster-whisper: more than two recognised words fail (speech in a clip that must have none). Music
cannot be detected here: that part of the rule is not offered on this machine yet (the assembler's
clip-sound level is the only guard). --motion adds media-qc's motion check against a frozen control
made from each clip's first frame; it flags, it never fails a clip (a slow push-in can be wanted).
Exit 0 every clip passes; 1 failing blocks are listed in `fail_blocks`; 2 bad input.
"""
import argparse, json, os, re, subprocess, sys, tempfile

sys.dont_write_bytecode = True


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", path])
    d = json.loads(r.stdout or "{}")
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    return float(d.get("format", {}).get("duration") or 0), v, a


def cut_times(path, thr):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-i", path, "-map", "0:v:0",
             "-vf", f"select=gt(scene\\,{thr}),showinfo", "-an", "-f", "null", "-"])
    return [round(float(m), 2) for m in re.findall(r"pts_time:\s*([\d.]+)", r.stderr)]


def frozen(path, start, length, d):
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-ss", f"{start:.3f}", "-t", f"{length:.3f}", "-i", path,
             "-vf", f"freezedetect=n=-60dB:d={d}", "-map", "0:v:0", "-f", "null", "-"])
    return "freeze_start" in r.stderr


def words_heard(model, path, tmp):
    wav = os.path.join(tmp, "a.wav")
    r = run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", "16000", wav])
    if r.returncode or not os.path.exists(wav):
        return 0
    segs, _ = model.transcribe(wav, vad_filter=True, beam_size=1)
    return len(re.findall(r"[^\W\d_]+", " ".join(s.text for s in segs)))


def ids(s):
    return {int(x) for x in str(s or "").replace(" ", "").split(",") if x}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--clips-dir", required=True)
    p.add_argument("--script", default="")
    p.add_argument("--aspect", default="")
    p.add_argument("--flat", default="")
    p.add_argument("--expect-cuts", type=int, default=4)
    p.add_argument("--no-stt", action="store_true")
    p.add_argument("--model", default="small")
    p.add_argument("--model-dir", default="")
    p.add_argument("--motion", action="store_true")
    p.add_argument("--mediaqc", default=os.path.expanduser("~/.agents/skills/media-qc/scripts/mediaqc.mjs"))
    p.add_argument("--report", default="")
    a = p.parse_args()
    if not os.path.isdir(a.clips_dir):
        print(json.dumps({"error": f"no folder {a.clips_dir}"}))
        return 2
    files = sorted((f for f in os.listdir(a.clips_dir) if re.fullmatch(r"block\d{2,3}\.mp4", f)), key=lambda f: int(f[5:-4]))
    if not files:
        print(json.dumps({"error": f"no blockNN.mp4 in {a.clips_dir}"}))
        return 2
    blocks = json.load(open(a.script, encoding="utf-8")).get("blocks", []) if a.script else []
    flat = ids(a.flat)
    model, stt_note = None, None
    if not a.no_stt:
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel(a.model, device="cpu", compute_type="int8", local_files_only=True,
                                 **({"download_root": a.model_dir} if a.model_dir else {}))
        except Exception:  # noqa: BLE001
            stt_note = "speech check not run: faster-whisper or its weights are unavailable"
    rows, fail_blocks, flags = [], [], []
    tmp = tempfile.mkdtemp(prefix="sfl-clipcheck-")
    for f in files:
        n = int(f[5:-4])
        path = os.path.join(a.clips_dir, f)
        dur, v, au = probe(path)
        b = blocks[n - 1] if 0 < n <= len(blocks) else {}
        shots = len(b.get("shots") or []) or (a.expect_cuts + 1)
        want = shots - 1
        why = []
        if not v:
            rows.append({"n": n, "pass": False, "why": ["no video stream"]})
            fail_blocks.append(n)
            continue
        cuts = cut_times(path, 0.15 if n in flat else 0.3)
        if len(cuts) != want and n in flat:
            cuts = cut_times(path, 0.15)
        if len(cuts) != want:
            why.append(f"{len(cuts)} cuts at {cuts}, the script gave {want}")
        edges = [0.0] + cuts + [dur]
        gap = max(y - x for x, y in zip(edges, edges[1:]))
        limit = max(3.0, 1.1 * 10.0 / shots)
        if gap >= limit:
            why.append(f"a shot lasts {gap:.2f} s (limit {limit:.2f})")
        if frozen(path, 0, 1.5, 1.0):
            why.append("static opening")
        if frozen(path, max(0.0, dur - 2), 2, 1.2):
            why.append("static tail")
        if a.aspect:
            aw, _, ah = a.aspect.partition(":")
            if abs((int(v["width"]) / int(v["height"])) / (float(aw) / float(ah)) - 1) > 0.02:
                why.append(f"{v['width']}x{v['height']} is not {a.aspect}")
        if not au:
            why.append("no audio stream")
        heard = None
        if model and au and b.get("block_kind", "narration") == "narration":
            heard = words_heard(model, path, tmp)
            if heard > 2:
                why.append(f"{heard} spoken words heard in a block that must have none")
        row = {"n": n, "pass": not why, "why": why, "cuts": cuts, "longest_shot_s": round(gap, 2), "words_heard": heard}
        if a.motion and os.path.exists(a.mediaqc):
            ctl, fr = os.path.join(tmp, f"control{n:03d}.mp4"), os.path.join(tmp, f"first{n:03d}.png")
            run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-frames:v", "1", fr])
            run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", fr, "-t", "3",
                 "-r", "24", "-vf", "format=yuv420p", "-c:v", "libx264", ctl])
            r = run(["node", a.mediaqc, "motion", path, "--control", ctl])
            row["motion"] = (r.stdout.strip() or r.stderr.strip())[:400]
            if r.returncode == 1:
                flags.append(n)
        rows.append(row)
        if why:
            fail_blocks.append(n)
    out = {"clips": len(rows), "fail_blocks": fail_blocks, "motion_flagged": flags,
           "speech_check": stt_note or ("skipped" if a.no_stt else "run"),
           "music_check": "not offered on this machine yet", "rows": rows, "pass": not fail_blocks}
    text = json.dumps(out, indent=1)
    if a.report:
        os.makedirs(os.path.dirname(os.path.abspath(a.report)), exist_ok=True)
        open(a.report, "w", encoding="utf-8").write(text)
    print(text)
    return 0 if not fail_blocks else 1


if __name__ == "__main__":
    sys.exit(main())
