#!/usr/bin/env python3
"""Word-timed spoken lines from the customer's footage, for titles and the line mix (edit-beat-montage).

  words.py local <audio.wav> --out work/<p>/words/<clip>.json [--model small] [--language xx]
           [--model-dir DIR]
      local faster-whisper (baked weights only: local_files_only), word timestamps, VAD on.
  words.py scribe <ai-gen envelope.json> --out work/<p>/words/<clip>.json
      reads the envelope of an ai-gen Scribe v2 call and keeps only entries whose type is "word".

  words.py place --edl work/<p>/edl.json --words work/<p>/words/<clip>.json --shot N
           --from-word A --to-word B [--per word|line] [--speaking]
      turns clip seconds into timeline frames for shot N (1-based): f = start_f + round((t - in) / speed * fps).
      Prints ready "text" entries (one per word, or one for the span with --per line) and one "lines"
      entry. A word that runs across a cut is split into one entry per shot it touches. Words marked
      "likely_sung" are refused unless --speaking says the footage's speaker is speaking, not singing.
      "lines" are not offered on a shot whose speed is not 1 (the picture is retimed, the line is not).

Both write {"provider", "words": [{"w", "start", "end"}], "lines": [{"text", "start", "end", "words": [i..]}]}
with times in seconds of the audio given. A line breaks at a pause over --gap seconds (default 0.6).
Exit 0 written; 1 no words (bad input, failed transcript, error envelope); 2 faster-whisper or its
weights are not on the machine.
SL8-authored from the method recorded in the capability assessment (WF27-a1 step 4 and the fal
Scribe v2 note on diarize, tag_audio_events and type == word); no vendor file is copied.
"""
import argparse
import json
import os
import sys

sys.dont_write_bytecode = True


def fail(code, msg):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def lines_of(words, gap):
    out, cur = [], []
    for i, w in enumerate(words):
        if cur and round(w["start"] - words[cur[-1]]["end"], 3) > gap:
            out.append(cur)
            cur = []
        cur.append(i)
    if cur:
        out.append(cur)
    return [{"text": " ".join(words[i]["w"] for i in c), "start": words[c[0]]["start"],
             "end": words[c[-1]]["end"], "words": c} for c in out]


def local(a):
    if a.language and (a.language == "xx" or not a.language.isalpha()):
        fail(1, f"--language {a.language}: give the real ISO 639-1 code, or leave it out to detect")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        fail(2, "faster-whisper is not importable: the machine is broken (HR21); use the Scribe v2 route "
                "only if the job allows remote speech-to-text")
    try:
        kw = {"download_root": a.model_dir} if a.model_dir else {}
        model = WhisperModel(a.model, device="cpu", compute_type="int8", local_files_only=True, **kw)
    except Exception as e:  # weights not baked where faster-whisper looks
        fail(2, f"weights for '{a.model}' are not on disk ({type(e).__name__}); never download them (HR21)")
    segs, info = model.transcribe(a.audio, word_timestamps=True, vad_filter=True, beam_size=5,
                                  condition_on_previous_text=False, language=a.language or None)
    words = []
    for s in segs:
        # Singing is transcribed as words too. A segment the model doubts is speech (high no_speech_prob
        # or low average log-probability) is marked likely_sung. The thresholds are SL8's first guess.
        nsp, alp = float(s.no_speech_prob), float(s.avg_logprob)
        sung = nsp > a.sung_nsp or alp < a.sung_logprob
        for w in s.words or []:
            t = w.word.strip()
            if t:
                words.append({"w": t, "start": round(float(w.start), 3), "end": round(float(w.end), 3),
                              "no_speech_prob": round(nsp, 3), "avg_logprob": round(alp, 3),
                              "likely_sung": sung})
    return "faster-whisper " + a.model, words, getattr(info, "language", None)


def scribe(a):
    env = json.load(open(a.envelope, encoding="utf-8"))
    if env.get("success") is False:
        fail(1, f"the ai-gen call failed: {env.get('error', {}).get('message', 'no message')}")
    raw = env.get("raw") or {}
    items = raw.get("words") or (raw.get("data") or {}).get("words") or []
    if not items:
        fail(1, "the envelope has no raw.words: a failed transcription (never spread text over time)")
    words = [{"w": str(x.get("text", "")).strip(), "start": round(float(x["start"]), 3),
              "end": round(float(x["end"]), 3)}
             for x in items if x.get("type", "word") == "word" and str(x.get("text", "")).strip()]
    return "fal-ai/elevenlabs/speech-to-text/scribe-v2", words, raw.get("language_code")


def place(a):
    e = json.load(open(a.edl, encoding="utf-8"))
    shots = sorted(e["shots"], key=lambda x: x["start_f"])
    if not 1 <= a.shot <= len(shots):
        fail(1, f"--shot {a.shot} is outside 1..{len(shots)}")
    sh = shots[a.shot - 1]
    wj = json.load(open(a.words, encoding="utf-8"))
    ws = wj["words"]
    if not (0 <= a.from_word <= a.to_word < len(ws)):
        fail(1, f"--from-word/--to-word must satisfy 0 <= A <= B < {len(ws)}")
    span = ws[a.from_word:a.to_word + 1]
    sung = [w["w"] for w in span if w.get("likely_sung")]
    if sung and not a.speaking:
        fail(1, f"likely sung, not spoken: {' '.join(sung)}. Song lyrics never go on screen (SKILL.md "
                "boundaries); pass --speaking only when the brief says the speaker is speaking")
    fps, speed, t_in = float(e["fps"]), float(sh.get("speed", 1)), float(sh.get("in", 0))
    fr = lambda t: sh["start_f"] + int(round((t - t_in) / speed * fps))
    f_lo, f_hi = fr(span[0]["start"]), fr(span[-1]["end"])
    if f_lo < sh["start_f"] or f_hi > sh["end_f"] + 2 * round(fps):
        fail(1, f"words {a.from_word}-{a.to_word} (clip {span[0]['start']}-{span[-1]['end']} s) fall at timeline "
                f"frames {f_lo}-{f_hi}, outside shot {a.shot} ({sh['start_f']}-{sh['end_f']}): wrong shot or words")
    groups = [(span[0]["w"] if len(span) == 1 else " ".join(w["w"] for w in span), f_lo, f_hi)] if a.per == "line" \
        else [(w["w"], fr(w["start"]), max(fr(w["end"]), fr(w["start"]) + 2)) for w in span]
    text = []
    for word, g0, g1 in groups:
        for s2 in shots:  # one entry per shot the word touches
            lo, hi = max(g0, s2["start_f"]), min(g1, s2["end_f"])
            if lo < hi:
                text.append({"word": word, "f0": lo, "f1": hi})
    out = {"text": text}
    if speed == 1:
        out["lines"] = [{"src": sh["src"], "in": span[0]["start"], "out": span[-1]["end"], "f": f_lo}]
    else:
        out["note"] = f"shot {a.shot} has speed {speed}: no lines entry (a line plays at normal speed)"
    print(json.dumps(out, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    lo = sub.add_parser("local")
    lo.add_argument("audio")
    lo.add_argument("--model", default="small")
    lo.add_argument("--model-dir")
    lo.add_argument("--language")
    lo.add_argument("--sung-nsp", type=float, default=0.5, help="no_speech_prob above this marks likely_sung")
    lo.add_argument("--sung-logprob", type=float, default=-1.0, help="avg_logprob below this marks likely_sung")
    pl = sub.add_parser("place")
    pl.add_argument("--edl", required=True)
    pl.add_argument("--words", required=True)
    pl.add_argument("--shot", type=int, required=True)
    pl.add_argument("--from-word", type=int, required=True)
    pl.add_argument("--to-word", type=int, required=True)
    pl.add_argument("--per", choices=("word", "line"), default="word")
    pl.add_argument("--speaking", action="store_true")
    sc = sub.add_parser("scribe")
    sc.add_argument("envelope")
    for p in (lo, sc):
        p.add_argument("--out", required=True)
        p.add_argument("--gap", type=float, default=0.6)
    a = ap.parse_args()
    if a.cmd == "place":
        return place(a)
    src = a.audio if a.cmd == "local" else a.envelope
    if not os.path.exists(src):
        fail(1, f"{src}: no such file")
    provider, words, lang = local(a) if a.cmd == "local" else scribe(a)
    if not words:
        fail(1, "no spoken words found: footage without speech gets no spoken-line titles (route P3)")
    out = {"provider": provider, "language": lang, "source": src, "words": words, "lines": lines_of(words, a.gap)}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1)
    print(json.dumps({"provider": provider, "words": len(words), "lines": len(out["lines"]), "out": a.out}))


if __name__ == "__main__":
    main()
