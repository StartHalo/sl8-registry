#!/usr/bin/env python3
"""words_to_srt.py: Scribe v2 word timings -> SRT (and VTT) cues, for voice-dub.

SL8-authored from the behaviour WF23-a1 steps 14, 16 and 22 record (cues from word timings, split on
pauses and sentence ends; diarized speaker count must match the confirmed count) and fal fine point
falaudiogeneration-ba1a03#28 (keep only entries whose type is "word": spacing and audio_event entries
corrupt cue splitting).

  python3 words_to_srt.py <stt.json> --srt <out.srt> [--vtt <out.vtt>] [--report <out.json>]
      [--speakers N] [--pause 0.5] [--max-chars 42] [--max-dur 6.0] [--shift 0] [--no-space]

<stt.json> is the ai-gen envelope (`raw.words`), a {"words": [...]} object or a bare list of
{text, start, end, type, speaker_id}. Text is joined with spaces unless the words are CJK or Thai
(or --no-space). A cue also breaks when the speaker changes.
Exit: 0 written; 1 bad input or no words (a transcript with text but no words[] is a failed
transcription); 3 written, but the diarized speaker count differs from --speakers (stop and fix the
speaker count before any paid step).
"""
import argparse, json, re, sys

END = re.compile(r"[.!?。！？؟।]$")
NOSPACE = re.compile(r"[぀-ヿ㐀-鿿가-힯฀-๿]")


def load_words(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if isinstance(d, dict):
        for key in ("raw", "result", "output"):
            if isinstance(d.get(key), dict) and "words" in d[key]:
                d = d[key]
                break
        d = d.get("words")
    if not isinstance(d, list):
        return None
    out = []
    for w in d:
        if not isinstance(w, dict) or w.get("start") is None or w.get("end") is None:
            continue
        if w.get("type", "word") != "word":
            continue
        t = str(w.get("text", "")).strip()
        if t:
            out.append({"text": t, "start": float(w["start"]), "end": float(w["end"]), "spk": w.get("speaker_id")})
    return out


def stamp(t, sep=","):
    t = max(0.0, t)
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stt")
    ap.add_argument("--srt", required=True)
    ap.add_argument("--vtt")
    ap.add_argument("--report")
    ap.add_argument("--speakers", type=int)
    ap.add_argument("--pause", type=float, default=0.5)
    ap.add_argument("--max-chars", type=int, default=42)
    ap.add_argument("--max-dur", type=float, default=6.0)
    ap.add_argument("--shift", type=float, default=0.0, help="seconds added to every time (a trimmed range)")
    ap.add_argument("--no-space", action="store_true")
    a = ap.parse_args()

    try:
        words = load_words(a.stt)
    except (OSError, ValueError) as e:
        print(f"cannot read {a.stt}: {e}", file=sys.stderr)
        return 1
    if not words:
        print("no word entries: a transcript with text but no words[] is a failed transcription", file=sys.stderr)
        return 1
    nospace = a.no_space or sum(bool(NOSPACE.search(w["text"])) for w in words) > len(words) / 2
    joiner = "" if nospace else " "

    cues, cur = [], []
    for w in words:
        if cur:
            text = joiner.join(x["text"] for x in cur + [w])
            brk = (w["start"] - cur[-1]["end"] > a.pause or END.search(cur[-1]["text"])
                   or len(text) > a.max_chars or w["end"] - cur[0]["start"] > a.max_dur
                   or (w["spk"] is not None and w["spk"] != cur[-1]["spk"]))
            if brk:
                cues.append(cur)
                cur = []
        cur.append(w)
    if cur:
        cues.append(cur)

    srt, vtt = [], ["WEBVTT", ""]
    for i, c in enumerate(cues, 1):
        s, e = c[0]["start"] + a.shift, c[-1]["end"] + a.shift
        if i < len(cues):
            e = min(e, cues[i][0]["start"] + a.shift - 0.001)
        text = joiner.join(x["text"] for x in c)
        srt += [str(i), f"{stamp(s)} --> {stamp(e)}", text, ""]
        vtt += [f"{stamp(s, '.')} --> {stamp(e, '.')}", text, ""]
    with open(a.srt, "w", encoding="utf-8") as f:
        f.write("\n".join(srt))
    if a.vtt:
        with open(a.vtt, "w", encoding="utf-8") as f:
            f.write("\n".join(vtt))

    speakers = sorted({str(w["spk"]) for w in words if w["spk"] is not None})
    rep = {"words": len(words), "cues": len(cues), "speakers_found": speakers,
           "speakers_confirmed": a.speakers, "srt": a.srt, "vtt": a.vtt,
           "first_start": words[0]["start"] + a.shift, "last_end": words[-1]["end"] + a.shift}
    mismatch = a.speakers is not None and speakers and len(speakers) != a.speakers
    rep["speaker_mismatch"] = bool(mismatch)
    if a.report:
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, ensure_ascii=False, indent=1)
    print(json.dumps(rep, ensure_ascii=False))
    if mismatch:
        print(f"diarized {len(speakers)} speaker(s), confirmed {a.speakers}: fix the speaker count first", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
