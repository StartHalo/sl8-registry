#!/usr/bin/env python3
"""Pointer timing for motion-doc-explainer (SL8-authored; standard library plus ffprobe).

  python3 align.py <job> [--min-similarity 0.6]

Reads <job>/says.json (preflight.py says), each say's audio <job>/audio/say-NN.mp3 and, when present,
its word-timed transcript <job>/audio/say-NN.words.json (the ai-gen envelope of a scribe-v2 call, or a
bare {"words": [...]}). Writes <job>/timeline.json:

  says[]:   n, slide, duration, timing ("words" or "even"), similarity, links[] {label, target,
            line_start, line_end, selector, t_start, t_end} in seconds from the start of the say
  readback: says whose heard names differ from the script (regenerate only those); plain numbers are not compared
  even:     says timed by even spread (no transcript, no word times, or alignment under the floor)

Only entries with type "word" are used (diarize and audio-event tags are dropped). A link starts at
the first word of its label; it ends where the next link starts, or at the end of the say.
Exit 0 written; 1 a say's audio is missing or unreadable; 2 usage.
"""
import difflib, json, os, re, subprocess, sys

sys.dont_write_bytecode = True  # no __pycache__ inside the skill folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preflight import LINK_RE  # noqa: E402

TOKEN = re.compile(r"[\w'’.-]+", re.UNICODE)


def norm(w):
    return re.sub(r"[^\w]", "", w.lower())


def tokens(text):
    return [m.group(0) for m in TOKEN.finditer(text)]


def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    try:
        return float(r.stdout.strip())
    except ValueError:
        return None


def stt_words(path):
    if not os.path.exists(path):
        return None
    d = json.load(open(path, encoding="utf-8"))
    for cand in (d.get("words"), (d.get("raw") or {}).get("words"), ((d.get("raw") or {}).get("data") or {}).get("words")):
        if isinstance(cand, list):
            out = []
            for w in cand:
                if w.get("type", "word") != "word":
                    continue
                text = w.get("text") or w.get("word") or ""
                if text.strip() and w.get("start") is not None:
                    out.append({"w": text.strip(), "start": float(w["start"]), "end": float(w.get("end", w["start"]))})
            return out
    return []


def label_word_index(say):
    """Index (in spoken tokens) of the first word of each link label, in link order."""
    text, out, pos, count = say["text"], [], 0, 0
    for m in LINK_RE.finditer(text):
        count += len(tokens(text[pos:m.start()]))
        out.append(count)
        count += len(tokens(m.group(1)))
        pos = m.end()
    return out


def facts(text):
    """Capitalised or code-like names, for the read-back check (plain numbers are excluded: the voice speaks them as words)."""
    toks = tokens(text)
    nums = set()  # digits are spoken as words under apply_text_normalization: numbers are listed apart, not as misreads
    names = {norm(t) for i, t in enumerate(toks) if i > 0 and not re.search(r"\d", t) and (t[:1].isupper() or "_" in t or re.search(r"[a-z][A-Z]", t))}
    return nums | names


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    job = argv[1]
    floor = float(argv[argv.index("--min-similarity") + 1]) if "--min-similarity" in argv else 0.6
    says = json.load(open(os.path.join(job, "says.json"), encoding="utf-8"))["says"]
    out, readback, even, bad = [], [], [], 0
    for s in says:
        nn = f"{s['n']:02d}"
        audio = os.path.join(job, "audio", f"say-{nn}.mp3")
        dur = duration(audio) if os.path.exists(audio) else None
        if not dur:
            print(f"FAIL say {nn}: {audio} is missing or unreadable")
            bad += 1
            continue
        spoken = tokens(s["spoken"])
        starts = label_word_index(s)
        words = stt_words(os.path.join(job, "audio", f"say-{nn}.words.json"))
        timing, sim, times = "even", 0.0, None
        if words:
            a, b = [norm(t) for t in spoken], [norm(w["w"]) for w in words]
            sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
            sim = sm.ratio()
            if sim >= floor:
                timing, idx = "words", {}
                for blk in sm.get_matching_blocks():
                    for k in range(blk.size):
                        idx[blk.a + k] = blk.b + k
                times = []
                for i in range(len(spoken)):
                    if i in idx:
                        times.append(words[idx[i]]["start"])
                    else:  # unmatched script word: interpolate between matched neighbours
                        lo = max([j for j in idx if j < i], default=None)
                        hi = min([j for j in idx if j > i], default=None)
                        t0 = words[idx[lo]]["end"] if lo is not None else 0.0
                        t1 = words[idx[hi]]["start"] if hi is not None else dur
                        times.append(t0 + (t1 - t0) * 0.5)
            heard = facts(" ".join(w["w"] for w in words))
            missing = sorted(f for f in facts(s["spoken"]) if f and f not in heard)
            if missing:
                readback.append({"n": s["n"], "not_heard": missing})
        if timing == "even":
            even.append(s["n"])
            step = dur / max(1, len(spoken))
            times = [i * step for i in range(len(spoken))]
        links = []
        for k, l in enumerate(s["links"]):
            wi = starts[k] if k < len(starts) else 0
            t0 = times[wi] if wi < len(times) else 0.0
            links.append({**{x: l[x] for x in ("label", "target", "line_start", "line_end", "selector")}, "t_start": round(t0, 3)})
        for k, l in enumerate(links):
            l["t_end"] = round(links[k + 1]["t_start"] if k + 1 < len(links) else dur, 3)
            if l["t_end"] <= l["t_start"]:
                l["t_end"] = round(min(dur, l["t_start"] + 0.2), 3)
        out.append({"n": s["n"], "slide": s["slide"], "slide_anchor": s["slide_anchor"], "duration": round(dur, 3),
                    "timing": timing, "similarity": round(sim, 3), "links": links})
    with open(os.path.join(job, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump({"says": out, "readback": readback, "even": even}, f, indent=2, ensure_ascii=False)
    total = sum(x["duration"] for x in out)
    print(f"timeline.json: {len(out)} says, {total:.1f} s narration; even spread: {even or 'none'}; read-back differences: {[r['n'] for r in readback] or 'none'}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
