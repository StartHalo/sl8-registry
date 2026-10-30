#!/usr/bin/env python3
"""edit-highlights word helper (SL8-authored; standard library only).

Source-timed words for transcript-led highlight selection (method WF25-a1 of the SL8 capability
assessment). Five commands:

  normalize <envelope|transcript> --out words.json [--duration S] [--offset S] [--segments-out F] [--replace]
      Reads an ai-gen JSON envelope (scribe-v2 word timings live in raw.words), a supplied word
      list, or an SRT/VTT file. Keeps only entries of type "word" (spacing and audio events are
      dropped), writes a flat list {start, end, text, speaker} in SOURCE seconds and checks it:
      every word has start <= end, starts never go backwards, and the last word ends inside the
      probed duration. Prints one JSON line of figures.
      Exit 0 written; 1 unreadable, failed envelope or a failed check (nothing written);
      3 no word timings (sentence or segment timing only: segments are written when
      --segments-out is given, words.json is not).
  text <words.json> [--out words.txt]
      Timestamped lines for reading: a new line at a pause of 0.4 s or more, a speaker change, a
      sentence end or 30 words.
  bounds <words.json> --start S --end S [--margin 0.10] [--release 0.28] [--duration S]
      Snaps a proposed range to word edges and reports the gap on each side (natural >= 0.40 s,
      careful 0.15-0.40 s, tight < 0.15 s), a speaker handoff across it, the slice to re-transcribe
      when the cut lands in a long gap, and the nearest natural gap when a side is tight.
  overlap <candidates.json|cut_k.json>...
      Sorts every range of every file in source time and exits 1 when two candidates overlap.
  compare --expected TEXT|--expected-file F --heard <envelope|words.json>
      Token comparison of the words a slice should contain against what was heard. Prints the
      figures (missing, extra, ratio); it never prints a verdict.

The gap classes, margins and release are the method's heuristics, never silence-removal settings.
"""
import argparse
import difflib
import json
import os
import re
import sys

NATURAL = 0.40
CAREFUL = 0.15
SENTENCE_END = re.compile(r"[.?!…。？！]$")


def out(obj):
    print(json.dumps(obj, ensure_ascii=False))


def fail(rc, msg, **extra):
    out({"ok": False, "error": msg, **extra})
    sys.exit(rc)


def load_any(path):
    with open(path, encoding="utf-8") as fh:
        raw = fh.read()
    stripped = raw.lstrip()
    if stripped.startswith("{") or stripped.startswith("["):
        return json.loads(raw), None
    return None, raw  # SRT / VTT / plain text


def ts_to_s(ts):
    ts = ts.strip().replace(",", ".")
    parts = ts.split(":")
    secs = 0.0
    for p in parts:
        secs = secs * 60 + float(p)
    return secs


def parse_subtitles(text):
    """SRT or WebVTT cues -> segments. Cue timing is sentence-level, never word-level."""
    segs = []
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n"))
    for b in blocks:
        lines = [x for x in b.strip().split("\n") if x.strip()]
        for i, ln in enumerate(lines):
            m = re.match(r"\s*([\d:.,]+)\s*-->\s*([\d:.,]+)", ln)
            if m:
                body = " ".join(lines[i + 1:]).strip()
                body = re.sub(r"<[^>]+>", "", body)
                if body:
                    segs.append({"start": ts_to_s(m.group(1)), "end": ts_to_s(m.group(2)), "text": body})
                break
    return segs


def extract(obj):
    """Return (words, segments) from an ai-gen envelope or a supplied transcript."""
    if isinstance(obj, dict) and obj.get("success") is False:
        err = obj.get("error") or {}
        fail(1, "the envelope is a failed call", error_code=err.get("code"), ai_gen_exit=err.get("exit_code"),
             message=err.get("message"), retryable=err.get("retryable"))
    pools = []
    if isinstance(obj, list):
        pools.append(obj)
    elif isinstance(obj, dict):
        raw = obj.get("raw") if isinstance(obj.get("raw"), dict) else {}
        for src in (raw, obj):
            if isinstance(src.get("words"), list):
                pools.append(src["words"])
        segs = None
        for src in (raw, obj):
            if isinstance(src.get("chunks"), list):  # wizper: [{timestamp: [s, e], text}]
                segs = [{"start": c.get("timestamp", [None, None])[0], "end": c.get("timestamp", [None, None])[1],
                         "text": str(c.get("text", "")).strip()} for c in src["chunks"]]
                break
            if isinstance(src.get("segments"), list):
                segs = [{"start": s.get("start"), "end": s.get("end"), "text": str(s.get("text", "")).strip()}
                        for s in src["segments"]]
                for s in src["segments"]:
                    if isinstance(s.get("words"), list):
                        pools.append(s["words"])
                break
        if not pools:
            return [], segs or []
    words = []
    for pool in pools:
        for w in pool:
            if not isinstance(w, dict):
                continue
            if w.get("type") not in (None, "word"):
                continue  # scribe-v2 spacing and audio_event entries
            text = str(w.get("text", w.get("word", ""))).strip()
            if not text:
                continue
            s, e = w.get("start"), w.get("end")
            if s is None or e is None:
                continue
            words.append({"start": float(s), "end": float(e), "text": text,
                          "speaker": w.get("speaker_id", w.get("speaker"))})
        if words:
            break
    return words, []


def cmd_normalize(a):
    obj, text = load_any(a.input)
    if obj is None:
        words, segs = [], parse_subtitles(text)
    else:
        words, segs = extract(obj)
    off = a.offset or 0.0
    if not words:
        segs = [s for s in segs if s.get("start") is not None and s.get("end") is not None and s.get("text")]
        for s in segs:
            s["start"] = round(float(s["start"]) + off, 3)
            s["end"] = round(float(s["end"]) + off, 3)
        if a.segments_out and segs:
            with open(a.segments_out, "w", encoding="utf-8") as fh:
                json.dump(segs, fh, ensure_ascii=False, indent=1)
        fail(3, "no word timings: sentence or segment timing only (take the sentence-level branch)",
             segments=len(segs), segments_out=a.segments_out if segs and a.segments_out else None)
    for w in words:
        w["start"] = round(w["start"] + off, 3)
        w["end"] = round(w["end"] + off, 3)
    problems = []
    for i, w in enumerate(words):
        if w["end"] < w["start"]:
            problems.append(f"word {i} '{w['text']}' ends before it starts")
        if i and w["start"] < words[i - 1]["start"] - 0.01:
            problems.append(f"word {i} '{w['text']}' starts before word {i - 1}: times go backwards")
        if len(problems) > 5:
            break
    last_end = words[-1]["end"]
    if a.duration is not None and last_end > a.duration + 0.5:
        problems.append(f"last word ends at {last_end:.2f} s, after the source's {a.duration:.2f} s: "
                        "a transcript of another file or a wrong offset")
    if problems:
        fail(1, "word check failed; words.json not written", problems=problems)
    if os.path.exists(a.out) and not a.replace:
        fail(1, f"{a.out} exists: source-timed words are never overwritten (use a new name, or --replace "
                "only when a supplied transcript was discarded)")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as fh:
        json.dump(words, fh, ensure_ascii=False, indent=0)
    span = max(1e-6, last_end - words[0]["start"])
    speakers = sorted({str(w["speaker"]) for w in words if w["speaker"] is not None})
    figures = {"ok": True, "out": a.out, "words": len(words), "first_start": words[0]["start"],
               "last_end": last_end, "words_per_min": round(len(words) * 60 / span, 1),
               "speakers": speakers}
    if a.duration is not None:
        figures["duration"] = a.duration
        figures["tail_after_last_word_s"] = round(a.duration - last_end, 2)
    out(figures)


def load_words(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list) or not data:
        fail(1, f"{path} is not a non-empty word list (run normalize first)")
    return data


def hms(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t - h * 3600 - m * 60
    return f"{h:02d}:{m:02d}:{s:04.1f}"


def cmd_text(a):
    words = load_words(a.words)
    lines, cur = [], []

    def flush():
        if cur:
            spk = cur[0].get("speaker")
            tag = f" {spk}:" if spk is not None else ""
            lines.append(f"[{hms(cur[0]['start'])}-{hms(cur[-1]['end'])}]{tag} " + " ".join(w["text"] for w in cur))
            cur.clear()

    for i, w in enumerate(words):
        if cur:
            gap = w["start"] - cur[-1]["end"]
            if gap >= NATURAL or w.get("speaker") != cur[-1].get("speaker") or len(cur) >= 30 \
                    or SENTENCE_END.search(cur[-1]["text"]):
                flush()
        cur.append(w)
    flush()
    body = "\n".join(lines) + "\n"
    if a.out:
        with open(a.out, "w", encoding="utf-8") as fh:
            fh.write(body)
        out({"ok": True, "out": a.out, "lines": len(lines), "words": len(words)})
    else:
        sys.stdout.write(body)


def gap_class(g):
    if g >= NATURAL:
        return "natural"
    if g >= CAREFUL:
        return "careful"
    return "tight"


def cmd_bounds(a):
    words = load_words(a.words)
    if a.end <= a.start:
        fail(1, "--end must be after --start")
    # The word containing a boundary stays whole: a range never starts or ends inside a word.
    first = next((i for i, w in enumerate(words) if w["end"] > a.start), None)
    last = next((i for i in range(len(words) - 1, -1, -1) if words[i]["start"] < a.end), None)
    if first is None or last is None or last < first:
        fail(1, "no words inside the proposed range")
    fw, lw = words[first], words[last]
    prev = words[first - 1] if first > 0 else None
    nxt = words[last + 1] if last + 1 < len(words) else None
    src_end = a.duration if a.duration is not None else lw["end"] + 5.0
    gap_before = fw["start"] - (prev["end"] if prev else 0.0)
    gap_after = (nxt["start"] if nxt else src_end) - lw["end"]
    # Margin and release never reach into the neighbouring word: at most half the gap.
    start = round(max(0.0, fw["start"] - min(a.margin, max(0.0, gap_before) / 2)), 3)
    end = round(min(src_end, lw["end"] + min(a.release, max(0.0, gap_after) / 2)), 3)
    res = {"ok": True, "start": start, "end": end, "length_s": round(end - start, 3),
           "first_word": {"i": first, **fw}, "last_word": {"i": last, **lw},
           "gap_before_s": round(gap_before, 3), "class_before": gap_class(gap_before),
           "gap_after_s": round(gap_after, 3), "class_after": gap_class(gap_after),
           "handoff_before": bool(prev and prev.get("speaker") != fw.get("speaker")),
           "handoff_after": bool(nxt and nxt.get("speaker") != lw.get("speaker")),
           "moved_from": {"start": a.start, "end": a.end}, "veto_slices": [], "suggestions": []}
    if prev and gap_before >= NATURAL:
        res["veto_slices"].append({"side": "start", "start": round(prev["end"], 3), "end": round(fw["start"], 3)})
    if nxt and gap_after >= NATURAL:
        res["veto_slices"].append({"side": "end", "start": round(lw["end"], 3), "end": round(nxt["start"], 3)})

    def natural_before(idx):
        # The nearest pause of 0.4 s or more before word idx, within 15 s: start the range there.
        for j in range(idx, 0, -1):
            if words[idx]["start"] - words[j]["start"] > 15.0:
                break
            if words[j]["start"] - words[j - 1]["end"] >= NATURAL:
                return {"gap_start": round(words[j - 1]["end"], 3), "gap_end": round(words[j]["start"], 3)}
        return None

    def natural_after(idx):
        # The nearest pause of 0.4 s or more after word idx, within 15 s: end the range there.
        for j in range(idx, len(words) - 1):
            if words[j]["end"] - words[idx]["end"] > 15.0:
                break
            if words[j + 1]["start"] - words[j]["end"] >= NATURAL:
                return {"gap_start": round(words[j]["end"], 3), "gap_end": round(words[j + 1]["start"], 3)}
        return None

    if res["class_before"] == "tight":
        hit = natural_before(first)
        res["suggestions"].append({"side": "start", "why": "gap under 0.15 s: keep a larger span",
                                   "natural_gap": hit})
    if res["class_after"] == "tight":
        hit = natural_after(last)
        res["suggestions"].append({"side": "end", "why": "gap under 0.15 s: keep a larger span",
                                   "natural_gap": hit})
    out(res)


TOKEN = re.compile(r"[\w']+", re.UNICODE)


def tokens(text):
    return [t.lower().strip("'") for t in TOKEN.findall(text) if t.strip("'")]


def cmd_compare(a):
    if a.expected_file:
        with open(a.expected_file, encoding="utf-8") as fh:
            exp_text = fh.read()
    else:
        exp_text = a.expected or ""
    obj, text = load_any(a.heard)
    if obj is None:
        heard_text = text
    else:
        words, _ = extract(obj)
        heard_text = " ".join(w["text"] for w in words) if words else str(
            obj.get("text", "") if isinstance(obj, dict) else "")
    e, h = tokens(exp_text), tokens(heard_text)
    sm = difflib.SequenceMatcher(a=e, b=h, autojunk=False)
    missing, extra = [], []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("delete", "replace"):
            missing.append({"at": i1, "words": e[i1:i2]})
        if op in ("insert", "replace"):
            extra.append({"at": j1, "words": h[j1:j2]})
    out({"expected": len(e), "heard": len(h), "ratio": round(sm.ratio(), 3),
         "missing": missing, "extra": extra,
         "note": "a word missing at the very first or last position may be the slice edge, not the cut"})


def cmd_overlap(a):
    """Exit 1 when two candidate ranges overlap in source time (candidates.json or cut_*.json, any mix)."""
    rows = []
    for path in a.files:
        data, _ = load_any(path)
        if data is None:
            fail(1, f"{path} is not JSON")
        items = data if isinstance(data, list) else data.get("candidates", data.get("ranges", []))
        for n, c in enumerate(items):
            for r in (c.get("ranges") or []):
                rows.append((float(r[0]), float(r[1]), f"{os.path.basename(path)}#{c.get('k', n + 1)}"))
    rows.sort()
    clashes = [{"a": rows[i][2], "b": rows[i + 1][2], "range_a": rows[i][:2], "range_b": rows[i + 1][:2]}
               for i in range(len(rows) - 1) if rows[i + 1][0] < rows[i][1] - 1e-6 and rows[i][2] != rows[i + 1][2]]
    out({"ranges": len(rows), "overlaps": clashes})
    if clashes:
        sys.exit(1)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("normalize")
    n.add_argument("input")
    n.add_argument("--out", required=True)
    n.add_argument("--duration", type=float)
    n.add_argument("--offset", type=float, default=0.0)
    n.add_argument("--segments-out")
    n.add_argument("--replace", action="store_true")
    t = sub.add_parser("text")
    t.add_argument("words")
    t.add_argument("--out")
    b = sub.add_parser("bounds")
    b.add_argument("words")
    b.add_argument("--start", type=float, required=True)
    b.add_argument("--end", type=float, required=True)
    b.add_argument("--margin", type=float, default=0.10)
    b.add_argument("--release", type=float, default=0.28)
    b.add_argument("--duration", type=float)
    o = sub.add_parser("overlap")
    o.add_argument("files", nargs="+")
    c = sub.add_parser("compare")
    c.add_argument("--expected")
    c.add_argument("--expected-file")
    c.add_argument("--heard", required=True)
    a = p.parse_args()
    if a.cmd == "bounds" and not (0.03 <= a.margin <= 0.20 and 0.0 <= a.release <= 0.30):
        fail(1, "margin is 0.03-0.20 s and release at most 0.30 s (the method's starting points)")
    try:
        {"normalize": cmd_normalize, "text": cmd_text, "bounds": cmd_bounds, "compare": cmd_compare, "overlap": cmd_overlap}[a.cmd](a)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        fail(1, f"{type(exc).__name__}: {exc}")


if __name__ == "__main__":
    main()
