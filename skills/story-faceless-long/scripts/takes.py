#!/usr/bin/env python3
"""Narration takes for story-faceless-long (SL8-authored from the method recorded as WF53-a1).

One command materializes, measures and verifies a whole narration wave:

  takes.py all --script work/<p>/script_manifest.json --src-dir artifacts/<p>/voice \
      --voice-dir work/<p>/voices --duration-seconds S [--accept-soft-blocks 4] \
      [--stt local|scribe|none] [--language en] [--words-dir work/<p>/stt] [--model small] \
      --report work/<p>/takes.json

  takes.py convert  ...   takeNN.mp3 -> voiceNN.wav (mono 24 kHz, tail-click trim and fade)
  takes.py measure  ...   speech length, rate and internal pauses per narration block
  takes.py verify   ...   transcribe each voiceNN.wav and compare it with its vo_line
  takes.py rate     ...   calibrate: read the words a second of 2-3 test takes in the locked voice
                          (--dir calibNN.mp3 --lines lines.json), listen to them (exit 1 when a take
                          reads more than its line) and print the bands to pass on

Rate and band limits are per run: --rushed, --slow, --words-min, --words-max (Default 3.2, 2.1, 17,
23 until `rate` has measured the voice). `verify` also fails a take whose heard text is more than
1.3 times as long as its line (a voice that read a direction aloud).

Measurement needs only ffmpeg. Exit 0 every narration take passes; 1 a take needs a retry (the
report lists retry_blocks, recommended_words and rewrite_requirements) or a transcript does not
match; 2 bad input or no speech-to-text backend for --stt local.
"""
import argparse, difflib, json, math, os, re, subprocess, sys

sys.dont_write_bytecode = True

NOISE, MIN_SIL = "-45dB", 0.25
PAUSE = 0.8
HARD_MIN, TARGET_MIN, HARD_MAX = 7.2, 7.8, 9.5
RUSHED, SLOW = 3.2, 2.1          # unmeasured Defaults; `rate` sets them from the locked voice
EXTRA_RATIO = 1.3                 # heard words over line words: the voice read something that is not the line
OK_SIM, THIN_SIM = 0.55, 0.40


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def words(s):
    return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", str(s or "").casefold())


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def silences(path, noise=NOISE, d=MIN_SIL):
    r = run(["ffmpeg", "-hide_banner", "-nostdin", "-i", path, "-af", f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"])
    out, cur = [], None
    for ln in r.stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", ln)
        if m:
            cur = [max(0.0, float(m.group(1))), None]
            out.append(cur)
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and cur is not None:
            cur[1] = float(m.group(1))
    return out


def speech_bounds(path):
    """(file length, speech start, speech end, internal pauses >= PAUSE s)."""
    dur = duration(path)
    sil = silences(path)
    for s in sil:
        if s[1] is None:
            s[1] = dur
    start, end = 0.0, dur
    if sil and sil[0][0] <= 0.02:
        start = sil[0][1]
    if sil and sil[-1][1] >= dur - 0.02 and sil[-1][0] > start:
        end = sil[-1][0]
    pauses = [round(b - a, 3) for a, b in sil if a > start + 0.01 and b < end - 0.01 and b - a >= PAUSE]
    return dur, start, max(start, end), pauses


def load_manifest(path):
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    return m, m.get("blocks") or []


def ids(s):
    return {int(x) for x in str(s or "").replace(" ", "").split(",") if x}


def convert(a, blocks):
    os.makedirs(a.voice_dir, exist_ok=True)
    done = []
    for b in blocks:
        n = int(b["n"])
        if b.get("block_kind") == "dialogue":
            continue
        src = next((p for p in (os.path.join(a.src_dir, f"take{n:02d}.{e}") for e in ("mp3", "wav", "m4a")) if os.path.exists(p)), None)
        if not src:
            continue
        dst = os.path.join(a.voice_dir, f"voice{n:02d}.wav")
        r = run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", "24000",
                 "-af", "areverse,atrim=start=0.030,asetpts=N/SR/TB,afade=t=in:st=0:d=0.060,areverse", dst])
        if r.returncode:
            print(json.dumps({"error": f"convert failed for {src}: {r.stderr.strip()[-300:]}"}))
            sys.exit(2)
        done.append(dst)
    return done


def window(n, count, dur_s):
    """Every block is 10 s (the delivered length is N x 10 s), so the bands never scale."""
    return 10.0


def measure(a, blocks):
    soft = ids(a.accept_soft_blocks)
    rows, retry, over, rec, req = [], [], [], {}, {}
    for b in blocks:
        n = int(b["n"])
        if b.get("block_kind") == "dialogue":
            rows.append({"n": n, "state": "native_dialogue"})
            continue
        f = os.path.join(a.voice_dir, f"voice{n:02d}.wav")
        w = len(words(b.get("vo_line")))
        scale = window(n, len(blocks), a.duration_seconds) / 10
        hmin, tmin, hmax = HARD_MIN * scale, TARGET_MIN * scale, HARD_MAX * scale
        if not os.path.exists(f):
            rows.append({"n": n, "file": f, "state": "missing", "words": w})
            retry.append(n)
            req[n] = ["no take on disk for this block: generate it"]
            continue
        dur, s0, s1, pauses = speech_bounds(f)
        sp = round(s1 - s0, 3)
        wps = round(w / sp, 2) if sp > 0 else None
        if sp <= 0.05:
            state = "missing"
        elif sp > hmax:
            state = "too_long"
        elif sp < hmin:
            state = "too_short"
        elif wps and wps > a.rushed:
            state = "rushed"
        elif pauses:
            state = "pausey"
        elif wps and wps < a.slow:
            state = "slow"
        elif sp < tmin:
            state = "soft_pass" if n in soft else "soft_retry"
        else:
            state = "pass"
        rows.append({"n": n, "file": f, "state": state, "speech_s": sp, "lead_silence_s": round(s0, 3),
                     "trail_silence_s": round(dur - s1, 3), "file_s": round(dur, 3), "words": w, "wps": wps,
                     "internal_pauses": pauses, "window": [round(hmin, 2), round(tmin, 2), round(hmax, 2)]})
        if state in ("pass", "soft_pass"):
            continue
        retry.append(n)
        if state in ("too_long", "rushed"):
            over.append(n)
            k = round(w * 9.0 * scale / sp) if sp else w - 1
            rec[n] = max(math.floor(a.words_min * scale), min(k, w - 1))
            req[n] = [f"shorter line: about {rec[n]} words, simpler spoken words, one flowing clause"]
            if state == "rushed":
                req[n].append(f"{wps} words a second is over {a.rushed}: a rate flag fails even when the length fits")
        elif state in ("too_short", "soft_retry", "slow"):
            k = math.ceil(w * 8.5 * scale / sp) if sp else w + 1
            rec[n] = min(math.ceil(a.words_max * scale), max(k, w + 1))
            req[n] = [f"fuller line: about {rec[n]} words; never pad with filler"]
        elif state == "pausey":
            req[n] = ["one flowing clause with no internal stops, commas, dashes or performed pauses "
                      "(adding 'minimal pause' to the same text is not a rewrite)"]
        else:
            req[n] = ["regenerate this take"]
    return {"blocks": rows, "retry_blocks": retry, "overlong_blocks": over,
            "recommended_words": rec, "rewrite_requirements": req}


def stt_local(paths, model, language, model_dir=""):
    """None when faster-whisper or its baked weights are unavailable (exit 2, never a retry)."""
    try:
        from faster_whisper import WhisperModel  # baked into the machine; never installed at run time
        m = WhisperModel(model, device="cpu", compute_type="int8", local_files_only=True,
                         **({"download_root": model_dir} if model_dir else {}))
    except Exception:  # noqa: BLE001
        return None
    out = {}
    for p in paths:
        segs, _ = m.transcribe(p, language=language or None, vad_filter=False, beam_size=5)
        out[p] = " ".join(s.text for s in segs)
    return out


def scribe_text(path):
    env = json.load(open(path, encoding="utf-8"))
    raw = env.get("raw") or env
    ws = raw.get("words") or []
    if ws:
        return " ".join(str(w.get("text") or w.get("word") or "") for w in ws if (w.get("type") or "word") == "word")
    return str(env.get("text") or raw.get("text") or "")


def verify(a, blocks):
    targets = [(int(b["n"]), b) for b in blocks if b.get("block_kind") != "dialogue"]
    files = {n: os.path.join(a.voice_dir, f"voice{n:02d}.wav") for n, _ in targets}
    if a.stt == "none":
        return {"route": "none", "receipt": "AUDIO_CONTENT_UNVERIFIED", "blocks": []}
    if a.stt == "local":
        heard = stt_local([p for p in files.values() if os.path.exists(p)], a.model, a.language, a.model_dir)
        if heard is None:
            print(json.dumps({"error": "faster-whisper or its weights are not available (try --model-dir): use --stt scribe or the degraded route"}))
            sys.exit(2)
        got = {n: heard.get(p, "") for n, p in files.items()}
    else:
        got = {}
        for n, _ in targets:
            cand = [os.path.join(a.words_dir or "", f"{stem}{n:02d}.json") for stem in ("voice", "take")]
            f = next((c for c in cand if os.path.exists(c)), None)
            got[n] = scribe_text(f) if f else ""
    rows = []
    for n, b in targets:
        ref, hyp = words(b.get("vo_line")), words(got.get(n))
        sim = round(difflib.SequenceMatcher(None, ref, hyp, autojunk=False).ratio(), 3) if ref else 0.0
        verdict = "ok" if sim >= OK_SIM else "thin" if sim >= THIN_SIM else "MISMATCH"
        extra = len(hyp) - len(ref)
        if ref and len(hyp) > EXTRA_RATIO * len(ref):
            verdict = "MISMATCH"   # a long hypothesis can still reach 0.55 similarity: the voice read more than the line
        rows.append({"n": n, "similarity": sim, "verdict": verdict, "extra_words": extra, "heard": got.get(n, "")[:300]})
    return {"route": a.stt, "model": a.model if a.stt == "local" else "fal-ai/elevenlabs/speech-to-text/scribe-v2",
            "blocks": rows, "mismatch_blocks": [r["n"] for r in rows if r["verdict"] == "MISMATCH"],
            "thin_blocks": [r["n"] for r in rows if r["verdict"] == "thin"]}


def rate(a):
    """Words a second of calibration takes (calibNN.mp3 or .wav in --dir, one line each in --lines)."""
    lines = json.load(open(a.lines, encoding="utf-8"))
    rows = []
    for i, text in enumerate(lines, 1):
        f = next((q for q in (os.path.join(a.dir, f"calib{i:02d}.{e}") for e in ("mp3", "wav")) if os.path.exists(q)), None)
        if not f:
            print(json.dumps({"error": f"no calib{i:02d}.mp3 in {a.dir}"}))
            sys.exit(2)
        dur, s0, s1, pauses = speech_bounds(f)
        sp = s1 - s0
        w = len(words(text))
        rows.append({"n": i, "file": f, "words": w, "speech_s": round(sp, 3), "wps": round(w / sp, 2) if sp > 0.05 else None})
    heard = None if a.stt == "none" else stt_local([r["file"] for r in rows], a.model, a.language, a.model_dir)
    stop = []
    if heard:
        for r, text in zip(rows, lines):
            n_ref, n_hyp = len(words(text)), len(words(heard.get(r["file"], "")))
            r["extra_words"] = n_hyp - n_ref
            if n_hyp > EXTRA_RATIO * n_ref:
                stop.append(f"calib{r['n']:02d}: {n_hyp} words heard for a {n_ref}-word line: the voice read more than the line; stop and fix the text sent")
    got = sorted(r["wps"] for r in rows if r["wps"])
    if not got:
        print(json.dumps({"error": "no calibration take has speech"}))
        sys.exit(2)
    r0 = got[len(got) // 2]
    out = {"takes": rows, "stop": stop, "listened": heard is not None, "wps": r0, "spread": round((got[-1] - got[0]) / r0, 3),
           "words_min": math.ceil(TARGET_MIN * r0), "words_max": math.floor((HARD_MAX - 0.2) * r0),
           "rushed": round(r0 * 1.12, 2), "slow": round(r0 * 0.75, 2),
           "pass_on": f"--words-min {math.ceil(TARGET_MIN * r0)} --words-max {math.floor((HARD_MAX - 0.2) * r0)} to faceless_script.py validate; "
                      f"--rushed {round(r0 * 1.12, 2)} --slow {round(r0 * 0.75, 2)} --words-min/--words-max to takes.py"}
    print(json.dumps(out, indent=1))
    return 1 if stop else 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("cmd", choices=["all", "convert", "measure", "verify", "rate"])
    p.add_argument("--script")
    p.add_argument("--voice-dir")
    p.add_argument("--dir", default="")
    p.add_argument("--lines", default="")
    p.add_argument("--rushed", type=float, default=RUSHED)
    p.add_argument("--slow", type=float, default=SLOW)
    p.add_argument("--words-min", type=int, default=17)
    p.add_argument("--words-max", type=int, default=23)
    p.add_argument("--model-dir", default="")
    p.add_argument("--src-dir", default="")
    p.add_argument("--duration-seconds", type=float, default=0)
    p.add_argument("--accept-soft-blocks", default="")
    p.add_argument("--stt", choices=["local", "scribe", "none"], default="local")
    p.add_argument("--language", default="")
    p.add_argument("--words-dir", default="")
    p.add_argument("--model", default="small")
    p.add_argument("--report", default="")
    a = p.parse_args()
    if a.cmd == "rate":
        if not (a.dir and a.lines):
            p.error("rate needs --dir and --lines")
        return rate(a)
    if not (a.script and a.voice_dir):
        p.error("--script and --voice-dir are required")
    _, blocks = load_manifest(a.script)
    if not a.duration_seconds:
        a.duration_seconds = 10.0 * len(blocks)
    out, code = {"script": a.script}, 0
    if a.cmd in ("all", "convert"):
        if not a.src_dir:
            p.error("convert needs --src-dir")
        out["converted"] = convert(a, blocks)
    if a.cmd in ("all", "measure"):
        out["measure"] = measure(a, blocks)
        code = 1 if out["measure"]["retry_blocks"] else code
    if a.cmd in ("all", "verify"):
        out["verify"] = verify(a, blocks)
        code = 1 if out["verify"].get("mismatch_blocks") else code
    out["pass"] = code == 0
    text = json.dumps(out, indent=1)
    if a.report:
        os.makedirs(os.path.dirname(os.path.abspath(a.report)), exist_ok=True)
        with open(a.report, "w", encoding="utf-8") as f:
            f.write(text)
    print(text)
    return code


if __name__ == "__main__":
    sys.exit(main())
