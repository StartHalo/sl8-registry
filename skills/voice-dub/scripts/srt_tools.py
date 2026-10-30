#!/usr/bin/env python3
"""srt_tools.py: the proofread path's SRT checks, glossary edits and track builder, for voice-dub.

SL8-authored from the behaviour WF23-a1 steps 17, 18 and 20 record, with the WF23 enrichment from
fal (falaudiogeneration-ba1a03#35): length is never fixed by time-stretching, speed changes or tail
trimming; a cue that does not fit is rewritten shorter, and a short cue is padded with silence.

  check   <original.srt> <target.srt>
      same cue count and identical timecodes (text only was edited); lists empty cues. A cue whose
      text is unchanged from the original is a warning, not a problem (names, numbers, "OK" and
      glossary do-not-translate terms legitimately do not change). Exit 0 ok, 1 mismatch.
  budget  <original.srt> --expansion 0.15 [--out budget.json]
      per-cue character budget = source characters x (1 + expansion) and the cue's slot in seconds
      (the formula is ours, untested; use the locale guide's expansion for the language pair).
  glossary <target.srt> --terms terms.json [--apply --out <srt>] [--no-space]
      terms.json: [{"find": "...", "replace": "...", "whole_word": true}]. whole_word is off for a term
      with CJK or Thai characters and with --no-space (word boundaries do not exist there). Without --apply it lists
      every match per term so the list can be confirmed first; with --apply it edits cue text only.
  vtt     <in.srt> <out.vtt>
  retime  <target.srt> <track.wav.json> --out <srt> [--max-end S]
      flexible policy: writes the SRT with each cue at its placed start (from the track report) and
      end = placed start + cue length, capped at the next cue's start, so captions follow the voice.
      Prints last_end_s; exit 4 when --max-end is given and the last caption ends after it.
  compare <target.srt> <back-transcript.json> --language <639-3> [--terms terms.json] [--threshold 0.8]
      token overlap (F1) of the target text and the back-transcription, every number of the target
      found in it, glossary replacements found, the transcript's language_code. Prints the figures.
      Exit 0 pass, 5 below the threshold, a number missing or a wrong language (threshold ours, untested).
  track   <target.srt> --cues-dir <dir> --out <track.wav> --policy flexible|fixed
          [--source-duration S] [--gap 0.05] [--rate 48000]
      places cue_NNN.(wav|mp3|m4a) (NNN = the SRT cue number) at its start time and writes one mono
      track. flexible: a cue longer than its slot pushes the next ones later and the track may run
      longer than the source (a shorter track is padded to the source length). fixed: any cue longer than its slot is listed for a shorter rewrite and
      nothing is written (exit 4). Writes <track>.json with placed starts and lengths.
      Exit 0 written; 1 bad input or a missing cue file; 2 ffmpeg failed; 4 overflow under fixed.
"""
import argparse, json, os, re, subprocess, sys

NOSPACE = re.compile(r"[\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")
TC = re.compile(r"(\d+):(\d\d):(\d\d)[,.](\d{3})\s*-->\s*(\d+):(\d\d):(\d\d)[,.](\d{3})")


def secs(h, m, s, ms):
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def parse(path):
    with open(path, encoding="utf-8-sig") as f:
        blocks = re.split(r"\n\s*\n", f.read().replace("\r\n", "\n").strip())
    cues = []
    for b in blocks:
        lines = b.split("\n")
        i = next((k for k, l in enumerate(lines) if TC.search(l)), None)
        if i is None:
            continue
        m = TC.search(lines[i])
        num = lines[i - 1].strip() if i > 0 else str(len(cues) + 1)
        cues.append({"n": num, "tc": lines[i].strip(), "start": secs(*m.groups()[:4]),
                     "end": secs(*m.groups()[4:]), "text": "\n".join(lines[i + 1:]).strip()})
    return cues


def write(path, cues):
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(f"{c['n']}\n{c['tc']}\n{c['text']}\n" for c in cues))


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return float(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip() else None


def cmd_check(a):
    o, t = parse(a.original), parse(a.target)
    probs, warns = [], []
    if len(o) != len(t):
        probs.append(f"cue count {len(t)} differs from the original's {len(o)}")
    for x, y in zip(o, t):
        if x["tc"] != y["tc"]:
            probs.append(f"cue {y['n']}: timecode changed ({x['tc']} -> {y['tc']})")
        if not y["text"]:
            probs.append(f"cue {y['n']}: empty text")
        elif y["text"] == x["text"]:
            warns.append(f"cue {y['n']}: text unchanged from the original (untranslated, or a name, number or kept term)")
    print(json.dumps({"original": len(o), "target": len(t), "problems": probs, "warnings": warns}, ensure_ascii=False, indent=1))
    return 1 if probs else 0


def cmd_budget(a):
    cues = parse(a.original)
    rows = [{"n": c["n"], "slot_s": round(c["end"] - c["start"], 3), "source_chars": len(c["text"]),
             "budget_chars": int(len(c["text"]) * (1 + a.expansion))} for c in cues]
    out = json.dumps({"expansion": a.expansion, "formula": "source chars x (1 + expansion); ours, untested", "cues": rows},
                     ensure_ascii=False, indent=1)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(out)
    print(out)
    return 0


def cmd_glossary(a):
    with open(a.terms, encoding="utf-8") as f:
        terms = json.load(f)
    cues = parse(a.srt)
    report = []
    for t in terms:
        pat = re.escape(t["find"])
        if t.get("whole_word", True) and not a.no_space and not NOSPACE.search(t["find"]):
            pat = rf"(?<!\w){pat}(?!\w)"
        rx = re.compile(pat)
        hits = [c["n"] for c in cues if rx.search(c["text"])]
        report.append({"find": t["find"], "replace": t["replace"], "cues": hits,
                       "sample": next((c["text"] for c in cues if rx.search(c["text"])), None)})
        if a.apply:
            for c in cues:
                c["text"] = rx.sub(t["replace"], c["text"])
    if a.apply:
        if not a.out:
            print("--apply needs --out", file=sys.stderr)
            return 1
        write(a.out, cues)
    print(json.dumps({"applied": bool(a.apply), "terms": report}, ensure_ascii=False, indent=1))
    return 0


def cmd_vtt(a):
    cues = parse(a.input)
    with open(a.output, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n" + "\n".join(f"{c['tc'].replace(',', '.')}\n{c['text']}\n" for c in cues))
    return 0


def tc(x):
    ms = int(round(x * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def cmd_retime(a):
    cues = parse(a.srt)
    with open(a.report, encoding="utf-8") as f:
        rows = json.load(f)["cues"]
    if len(rows) != len(cues):
        print(f"track report has {len(rows)} cues, the SRT {len(cues)}", file=sys.stderr)
        return 1
    for i, (c, r) in enumerate(zip(cues, rows)):
        s = r["placed"]
        e = s + r["length_s"]
        if i + 1 < len(rows):
            e = min(e, rows[i + 1]["placed"] - 0.001)
        c["tc"] = f"{tc(s)} --> {tc(max(e, s + 0.1))}"
        c["_end"] = max(e, s + 0.1)
    write(a.out, cues)
    last = cues[-1]["_end"]
    print(json.dumps({"written": a.out, "cues": len(cues), "last_end_s": round(last, 3), "max_end_s": a.max_end}, indent=1))
    return 4 if a.max_end is not None and last > a.max_end + 1e-3 else 0


def load_words(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    raw = d.get("raw", d) if isinstance(d, dict) else {"words": d}
    words = [w.get("text", "") for w in (raw.get("words") or []) if w.get("type", "word") == "word"]
    return (" ".join(words) or raw.get("text") or ""), raw.get("language_code")


def toks(text):
    text = text.lower()
    if NOSPACE.search(text):
        return [ch for ch in text if ch.isalnum()]
    return re.findall(r"\w+", text)


def cmd_compare(a):
    from collections import Counter
    target = " ".join(c["text"] for c in parse(a.target))
    heard, lang = load_words(a.transcript)
    tt, ht = Counter(toks(target)), Counter(toks(heard))
    hit = sum((tt & ht).values())
    p = hit / max(sum(ht.values()), 1)
    r = hit / max(sum(tt.values()), 1)
    f1 = 2 * p * r / (p + r) if p + r else 0.0
    nums = sorted(set(re.findall(r"\d+", target)))
    missing = [n for n in nums if n not in set(re.findall(r"\d+", heard))]
    terms = []
    if a.terms:
        with open(a.terms, encoding="utf-8") as f:
            terms = [t["replace"] for t in json.load(f)]
    lost = [t for t in terms if t.lower() not in heard.lower() and t.lower() in target.lower()]
    lang_ok = lang is None or lang == a.language
    rep = {"f1": round(f1, 3), "precision": round(p, 3), "recall": round(r, 3), "threshold": a.threshold,
           "numbers_missing": missing, "glossary_terms_missing": lost, "language_code": lang,
           "language_ok": lang_ok, "note": "threshold is ours, untested; names and numbers are the commonest misses"}
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    return 0 if f1 >= a.threshold and not missing and not lost and lang_ok else 5


def cmd_track(a):
    cues = parse(a.srt)
    if not cues:
        print("no cues", file=sys.stderr)
        return 1
    files, lens = [], []
    for c in cues:
        f = next((os.path.join(a.cues_dir, f"cue_{int(c['n']):03d}.{e}") for e in ("wav", "mp3", "m4a")
                  if os.path.exists(os.path.join(a.cues_dir, f"cue_{int(c['n']):03d}.{e}"))), None)
        d = probe(f) if f else None
        if not f or d is None:
            print(f"cue {c['n']}: no readable cue_{int(c['n']):03d}.(wav|mp3|m4a) in {a.cues_dir}", file=sys.stderr)
            return 1
        files.append(f)
        lens.append(d)
    placed, overflow, t = [], [], 0.0
    for i, c in enumerate(cues):
        slot_end = cues[i + 1]["start"] if i + 1 < len(cues) else (a.source_duration or c["end"])
        if lens[i] > slot_end - c["start"] + 1e-3:
            overflow.append({"n": c["n"], "length_s": round(lens[i], 3), "slot_s": round(slot_end - c["start"], 3)})
        start = max(c["start"], t + (a.gap if placed else 0.0))
        placed.append(start)
        t = start + lens[i]
    rep = {"policy": a.policy, "cues": [{"n": c["n"], "srt_start": c["start"], "placed": round(p, 3), "length_s": round(l, 3)}
                                        for c, p, l in zip(cues, placed, lens)],
           "overflow": overflow, "track_end_s": round(t, 3), "source_duration_s": a.source_duration}
    if a.policy == "fixed" and overflow:
        rep["action"] = "rewrite the listed cues shorter (at most two rewrites each), then rebuild; never time-stretch"
        print(json.dumps(rep, ensure_ascii=False, indent=1))
        return 4
    total = max(t, a.source_duration or 0.0)
    parts, inputs = [], []
    for i, f in enumerate(files):
        inputs += ["-i", f]
        seg_end = placed[i + 1] if i + 1 < len(files) else total
        parts.append(f"[{i}:a]aresample={a.rate},aformat=sample_fmts=s16:channel_layouts=mono,"
                     f"apad=whole_dur={max(seg_end - placed[i], lens[i]):.3f}[s{i}]")
    lead = placed[0]
    graph = f"anullsrc=r={a.rate}:cl=mono,atrim=duration={lead:.3f},aformat=sample_fmts=s16[lead];" if lead > 0 else ""
    graph += ";".join(parts) + ";" + ("[lead]" if lead > 0 else "") + "".join(f"[s{i}]" for i in range(len(files)))
    graph += f"concat=n={len(files) + (1 if lead > 0 else 0)}:v=0:a=1[out]"
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]",
                        "-c:a", "pcm_s16le", a.out], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:], file=sys.stderr)
        return 2
    rep["written"] = a.out
    rep["measured_s"] = probe(a.out)
    with open(a.out + ".json", "w", encoding="utf-8") as f:
        json.dump(rep, f, ensure_ascii=False, indent=1)
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    return 0


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("check"); p.add_argument("original"); p.add_argument("target"); p.set_defaults(fn=cmd_check)
    p = sp.add_parser("budget"); p.add_argument("original"); p.add_argument("--expansion", type=float, required=True)
    p.add_argument("--out"); p.set_defaults(fn=cmd_budget)
    p = sp.add_parser("glossary"); p.add_argument("srt"); p.add_argument("--terms", required=True)
    p.add_argument("--apply", action="store_true"); p.add_argument("--no-space", action="store_true"); p.add_argument("--out"); p.set_defaults(fn=cmd_glossary)
    p = sp.add_parser("retime"); p.add_argument("srt"); p.add_argument("report"); p.add_argument("--out", required=True)
    p.add_argument("--max-end", type=float); p.set_defaults(fn=cmd_retime)
    p = sp.add_parser("compare"); p.add_argument("target"); p.add_argument("transcript")
    p.add_argument("--language", required=True); p.add_argument("--terms"); p.add_argument("--threshold", type=float, default=0.8)
    p.set_defaults(fn=cmd_compare)
    p = sp.add_parser("vtt"); p.add_argument("input"); p.add_argument("output"); p.set_defaults(fn=cmd_vtt)
    p = sp.add_parser("track"); p.add_argument("srt"); p.add_argument("--cues-dir", required=True)
    p.add_argument("--out", required=True); p.add_argument("--policy", choices=["flexible", "fixed"], required=True)
    p.add_argument("--source-duration", type=float); p.add_argument("--gap", type=float, default=0.05)
    p.add_argument("--rate", type=int, default=48000); p.set_defaults(fn=cmd_track)
    a = ap.parse_args()
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
