#!/usr/bin/env python3
"""Word clock -> caption file for edit-captions (SL8-authored from WF24-a1 steps 6-9).

Times come only from speech-to-text on the audio; an authored script supplies the words, never the
times. Writes an SRT and a JSON report, or no SRT when a gate fails.

  python3 caption_words.py AUDIO_OR_VIDEO [--mixed] [--words-json F] [--script F]
      [--per-block SIDECAR --voice-dir DIR [--words-dir DIR]] [--model small] [--model-dir DIR]
      [--language en] [--max-words 5] [--max-chars 32] [--max-gap 0.4] [--min-similarity 0.75]
      [--gate] [--hook-end SECONDS] --srt work/<p>/caps.srt --json work/<p>/caps.json

--hook-end (UGC Hook or Both): words spoken before the hook ends are shown by the hook, not captioned
again; they are listed as hook_words in the report.

Exit: 0 written; 1 nothing written (bad input, word-count mismatch, failed transcript); 2 no STT
backend (faster-whisper or its weights missing, no ffmpeg) and no words file; 4 script similarity
under --min-similarity; 5 with --gate, the burn gate failed (similarity under 0.90 with a script,
or under 1.6 words a second over more than 5 s without one): the report is written, the SRT is not.
"""
import argparse, difflib, json, os, re, shutil, subprocess, sys, tempfile

MUSIC = re.compile(r"^[\[\(]?(music|musique|música|musik|applause|♪+|♫+)[\]\)]?$", re.I)
FINAL = re.compile(r"[.!?…。！？][\"'”’)\]]*$")
_MODELS = {}


def norm(tok):
    return re.sub(r"\W+", "", tok.casefold())


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def band_pass(src, dst, mixed):
    """16 kHz mono for STT; --mixed also keeps only the voice band. No ffmpeg: use the file as is."""
    if not shutil.which("ffmpeg"):
        print("WARN ffmpeg not found: transcribing the input as is", file=sys.stderr)
        return src
    af = ["-af", "highpass=f=180,lowpass=f=3800,dynaudnorm=f=250:g=15"] if mixed else []
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", *af, "-ac", "1", "-ar", "16000", dst])
    return dst if r.returncode == 0 else src


def whisper_words(path, model, model_dir, language):
    try:
        from faster_whisper import WhisperModel
    except Exception as e:  # noqa: BLE001
        fail(2, f"faster-whisper is not importable ({e}); use --words-json from Scribe v2, or return the clean video")
    if model not in _MODELS:
        try:  # weights are baked into the template at build: never fetch at run time (HR21)
            _MODELS[model] = WhisperModel(model, device="cpu", compute_type="int8", local_files_only=True,
                                          **({"download_root": model_dir} if model_dir else {}))
        except Exception as e:  # noqa: BLE001
            fail(2, f"faster-whisper weights for '{model}' are not on disk ({e}); the machine is missing them")
    segs, _ = _MODELS[model].transcribe(path, language=language, vad_filter=True, condition_on_previous_text=False,
                                        beam_size=5, word_timestamps=True)
    return [{"text": w.word.strip(), "start": float(w.start), "end": float(w.end)}
            for s in segs for w in (s.words or []) if w.word.strip()], f"faster-whisper/{model}"


def json_words(path):
    try:
        data = json.load(open(path))
    except Exception as e:  # noqa: BLE001
        fail(1, f"cannot read words file {path}: {e}")
    if isinstance(data, dict) and data.get("success") is False:
        fail(1, f"{path} is an error envelope: {json.dumps(data.get('error'))[:300]}")
    words = data
    if isinstance(data, dict):
        raw = data.get("raw") or data
        words = raw.get("words") or data.get("words") or []
    if not words:
        fail(1, f"{path}: text but no words[]; a transcript without word timings has failed")
    out = []
    for w in words:
        if w.get("type", "word") != "word":
            continue  # Scribe v2 also returns spacing and audio events
        t = (w.get("text") or w.get("word") or "").strip()
        if t:
            out.append({"text": t, "start": float(w["start"]), "end": float(w["end"])})
    if not out:
        fail(1, f"{path}: no entries of type word")
    return out, "words-json"


def script_rows(path):
    if path.endswith(".json"):
        d = json.load(open(path))
        items = d if isinstance(d, list) else (d.get("beats") or d.get("blocks") or [])
        rows = [b if isinstance(b, str) else (b.get("phrase") or b.get("vo_line")) for b in items]
    else:
        rows = [l for l in open(path, encoding="utf-8").read().splitlines() if l.strip()]
    clean = []
    for i, r in enumerate(rows):
        r = re.sub(r"\[[^\]]*\]", " ", r or "").strip()  # bracketed directions such as [pause]
        if not r:
            fail(1, f"script row {i + 1} has no narration")
        clean.append(r.split())
    if not clean:
        fail(1, f"{path}: no script rows")
    return clean


def align(stt, script, window=None):
    """Script tokens timed from the STT clock: matched spans 1:1, others spread by character length.
    Returns the timed script words, the similarity and the STT words that matched no script word."""
    a, b = [norm(w["text"]) for w in stt], [norm(t) for t in script]
    out, extra = [None] * len(script), []
    allowed = set(b)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op in ("delete", "replace"):
            extra += [stt[i]["text"] for i in range(i1, i2) if a[i] and a[i] not in allowed and not MUSIC.match(stt[i]["text"])]
        if op == "equal":
            for k in range(j2 - j1):
                out[j1 + k] = {"text": script[j1 + k], "start": stt[i1 + k]["start"], "end": stt[i1 + k]["end"]}
        elif op in ("replace", "insert"):
            if op == "replace":
                lo, hi = stt[i1]["start"], stt[i2 - 1]["end"]
            else:
                lo = stt[i1 - 1]["end"] if i1 > 0 else (window[0] if window else 0.0)
                hi = stt[i1]["start"] if i1 < len(stt) else (window[1] if window else lo + 0.05 * (j2 - j1))
            lens = [max(1, len(script[j])) for j in range(j1, j2)]
            span = max(hi - lo, 0.05 * len(lens))
            t = lo
            for k, j in enumerate(range(j1, j2)):
                d = max(0.05, span * lens[k] / sum(lens))
                out[j] = {"text": script[j], "start": t, "end": t + d}
                t += d
    if window:  # per-block: a swallowed opener cannot fire before its block is spoken
        for w in out:
            if w:
                w["start"] = min(max(w["start"], window[0]), window[1])
                w["end"] = min(max(w["end"], w["start"] + 0.05), window[1] + 0.05)
    sim = difflib.SequenceMatcher(None, " ".join(a), " ".join(b), autojunk=False).ratio()
    return [w for w in out if w], sim, extra


def chunk(words, max_words, max_chars, max_gap):
    caps, cur = [], []
    for w in words:
        if cur:
            text = " ".join(x["text"] for x in cur + [w])
            if (len(cur) >= max_words or len(text) > max_chars or round(w["start"] - cur[-1]["end"], 3) > max_gap
                    or FINAL.search(cur[-1]["text"])):
                caps.append(cur)
                cur = []
        cur.append(w)
    if cur:
        caps.append(cur)
    return caps


def ts(s):
    ms = int(round(s * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("audio")
    p.add_argument("--mixed", action="store_true", help="band-pass the voice range of a mixed track (local STT)")
    p.add_argument("--words-json", help="word timings from another STT (ai-gen Scribe v2 envelope or a list)")
    p.add_argument("--words-dir", help="per-block mode: one <voice file stem>.json words file per block")
    p.add_argument("--script", help="script_manifest.json (beats[].phrase / blocks[].vo_line), a JSON list, or a text file")
    p.add_argument("--per-block", help="assembler sidecar with per_block[] voice, speech_s, speech_abs_s")
    p.add_argument("--voice-dir", default=".")
    p.add_argument("--model", default="small")
    p.add_argument("--model-dir", help="where the baked weights sit, when not in the default cache")
    p.add_argument("--language", help="ISO 639-1 code for faster-whisper (en, ru); omit only when unknown")
    p.add_argument("--max-words", type=int, default=5)
    p.add_argument("--max-chars", type=int, default=32)
    p.add_argument("--max-gap", type=float, default=0.4)
    p.add_argument("--min-similarity", type=float, default=0.75)
    p.add_argument("--gate", action="store_true", help="exit 5 and write no SRT when the burn gate fails")
    p.add_argument("--hook-end", type=float, help="end of an on-screen hook: earlier words are not captioned again")
    p.add_argument("--srt")
    p.add_argument("--json")
    a = p.parse_args()

    if a.per_block and a.words_json:
        fail(1, "--per-block takes one words file per block (--words-dir), not --words-json")
    if a.mixed and (a.words_json or a.words_dir):
        fail(1, "--mixed applies to local STT; for Scribe v2 band-pass the audio with ffmpeg before transcribing")
    if a.language:
        a.language = a.language.lower()
        if a.language in ("xx", "xxx") or not re.fullmatch(r"[a-z]{2,3}", a.language):
            fail(1, f"--language '{a.language}' is not a language code (a placeholder is never a value)")
    if a.model.endswith(".en") and a.language != "en":
        fail(1, f"{a.model} translates other languages into English: use the multilingual model unless --language en")
    tmp = tempfile.mkdtemp(prefix="capwords-")
    rows = script_rows(a.script) if a.script else None
    warnings, blocks, timed, stt_all, extras = [], [], [], [], []
    provider = None

    def transcribe(path, words_file=None):
        if words_file:
            return json_words(words_file)
        wav = band_pass(path, os.path.join(tmp, f"{len(blocks)}-{os.getpid()}.wav"), a.mixed)
        return whisper_words(wav, a.model, a.model_dir, a.language)

    if a.per_block:
        side = json.load(open(a.per_block))
        per = [b for b in side.get("per_block", []) if float(b.get("speech_s") or 0) > 0]
        if not per:
            fail(1, "sidecar has no voiced block (song mode is not captioned here)")
        if any("speech_abs_s" not in b for b in per):
            fail(1, "sidecar block without speech_abs_s: use the final audio with --mixed and the matching script")
        if rows is not None and len(rows) != len(per):
            fail(1, f"sidecar has {len(per)} voiced blocks, script has {len(rows)} rows")
        for i, b in enumerate(per):
            cands = [os.path.join(a.voice_dir, b.get("voice", "")), b.get("voice_path") or "",
                     os.path.join(a.voice_dir, os.path.basename(b.get("voice_path") or "")),
                     os.path.join(a.voice_dir, b.get("voice_norm") or "")]
            f = next((c for c in cands if c and os.path.isfile(c)), None)
            if not f:
                fail(1, f"block {i + 1}: no voice file among {cands}")
            wf = os.path.join(a.words_dir, os.path.splitext(os.path.basename(f))[0] + ".json") if a.words_dir else None
            words, provider = transcribe(f, wf)
            # Our reading of the sidecar: the voice file starts with its lead silence (learnings VID-L323).
            shift = float(b["speech_abs_s"]) - float(b.get("lead_silence_s") or 0)
            words = [{**w, "start": w["start"] + shift, "end": w["end"] + shift} for w in words]
            win = (float(b["speech_abs_s"]), float(b["speech_abs_s"]) + float(b["speech_s"]))
            stt_all += words
            if rows is not None:
                got, sim, extra = align(words, rows[i], win)
                blocks.append({"block": i + 1, "similarity": round(sim, 3)})
                timed += got
                extras += extra
            else:
                timed += words
    else:
        words, provider = transcribe(a.audio, a.words_json)
        stt_all = words
        if rows is not None:
            timed, _, extras = align(words, [t for r in rows for t in r])
        else:
            timed = words

    music = sum(1 for w in stt_all if MUSIC.match(w["text"]))
    if stt_all and music / len(stt_all) > 0.20:
        fail(1, f"music tokens are {music / len(stt_all):.0%} of the transcript (> 20%): failed transcript")
    if rows is None:  # clean music tokens and non-word entries out of an STT-only transcript
        timed = [w for w in timed if not MUSIC.match(w["text"]) and norm(w["text"])]
    if not timed:
        fail(1, "no words to caption (no speech?): return the clean video")

    hook = []
    if a.hook_end is not None:
        hook = [w["text"] for w in timed if w["start"] < a.hook_end]
        timed = [w for w in timed if w["start"] >= a.hook_end]
        if not timed:
            fail(1, "no words after the hook end: a Hook-only job needs no speech captions")
        if timed[0]["start"] - a.hook_end > 0.25:
            warnings.append(f"WARN the first body word starts {timed[0]['start']:.2f} s, not at the hook end {a.hook_end:.2f} s")

    sim = None
    if rows is not None:
        sim = difflib.SequenceMatcher(None, " ".join(norm(w["text"]) for w in stt_all),
                                      " ".join(norm(t) for r in rows for t in r), autojunk=False).ratio()
        if sim < a.min_similarity:
            fail(4, f"script similarity {sim:.3f} < {a.min_similarity}: no captions written")
        if sim < 0.90:
            warnings.append(f"WARN similarity {sim:.3f} < 0.90")
        weak = [b for b in blocks if b["similarity"] < 0.90]
        if weak:
            worst = min(weak, key=lambda x: x["similarity"])
            warnings.append(f"WARN block {worst['block']} similarity {worst['similarity']} < 0.90 (worst block)")
        allowed = {norm(t) for r in rows for t in r}
        assert all(norm(w["text"]) in allowed for w in timed)  # captions hold only script words, by construction
        if extras:
            warnings.append(f"NOTE {len(extras)} heard words match no script word and are not captioned: {extras[:10]}")
    span = timed[-1]["end"] - timed[0]["start"]
    wps = len(timed) / span if span > 0 else 0.0
    thin = rows is None and span > 5 and wps < 1.6
    if thin:
        warnings.append(f"WARN {wps:.2f} words/s over {span:.1f} s without a script: retry with --model medium and --language")

    caps = chunk(timed, a.max_words, a.max_chars, a.max_gap)
    caption_words = sum(len(c) for c in caps)
    if caption_words != len(timed):
        fail(1, f"caption_words {caption_words} != timed_words {len(timed)}")
    gate_failed = a.gate and ((sim is not None and sim < 0.90) or thin)
    report = {"captions": len(caps), "script_aligned": rows is not None,
              "similarity": round(sim, 3) if sim is not None else None,
              "similarity_min_block": min((b["similarity"] for b in blocks), default=None), "blocks": blocks,
              "timed_words": len(timed), "caption_words": caption_words, "words_per_second": round(wps, 2),
              "provider": provider, "music_tokens": music, "stt_extra_words": extras, "hook_words": hook,
              "first_body_word_s": round(timed[0]["start"], 3), "warnings": warnings,
              "gate": "failed" if gate_failed else ("passed" if a.gate else "not run")}
    if a.json:
        json.dump(report, open(a.json, "w"), indent=1)
    for w in warnings:
        print(w, file=sys.stderr)
    if gate_failed:
        fail(5, "burn gate failed (" + "; ".join(warnings) + "): retry per-block or with --model medium, then return the clean video")
    if a.srt:
        with open(a.srt, "w", encoding="utf-8") as fh:
            for i, c in enumerate(caps, 1):
                fh.write(f"{i}\n{ts(c[0]['start'])} --> {ts(c[-1]['end'])}\n{' '.join(w['text'] for w in c)}\n\n")
    print(json.dumps({k: report[k] for k in ("captions", "similarity", "timed_words", "caption_words", "words_per_second", "provider", "gate")}))


if __name__ == "__main__":
    main()
