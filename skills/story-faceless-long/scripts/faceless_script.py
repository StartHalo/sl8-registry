#!/usr/bin/env python3
"""Script gates for story-faceless-long (SL8-authored from the method recorded as WF53-a1).

  faceless_script.py validate --script work/<p>/script_manifest.json --duration-seconds S
        [--duration-retry-blocks 3,5] [--fewer-cuts 4] [--words-min A --words-max B]
      Motion montage gate. Prints a JSON report; on valid:true writes script.lock beside the
      manifest. Exit 0 valid, 1 invalid, 2 unreadable input.
  faceless_script.py verify-lock --script work/<p>/script_manifest.json
      Exit 0 when the narration still matches script.lock, 1 when it was edited or never locked.
  faceless_script.py picture --script work/<p>/script_manifest.json --duration-seconds S
      Picture Story (stills) gate; writes script.lock on valid:true.
  faceless_script.py song-prompt --prompt work/<p>/song_prompt.txt --lyrics work/<p>/song_lyrics.txt
      Song-first gate for the style prompt and the tagged lyrics. Exit 0 pass, 1 fail.

python3 stdlib only. Nothing here calls a model or the network.
"""
import argparse, hashlib, json, math, os, re, sys

sys.dont_write_bytecode = True

GENRES = {"education", "history", "kids", "storytelling"}
BANDS = {"default": (20, 23), "kids": (17, 21), "dialogue": (16, 22)}
RETRY_WORD_MIN = 17
MAX_SENTENCES = 2
SHARED_PHRASE = 5          # no 5-word run shared between two lines
SHARED_SHOT = 8            # no 8-word run shared between two shot descriptions
NEAR_BLOCK = 3             # same location and same ordered assets within 3 blocks
REPEAT_WINDOW = 6          # a long word repeated within 6 words of itself (our reading)
SIZE_LEAD = 48             # the framing size must open the shot, inside its first 48 characters
MAX_REFS = 7
UNSPACED = re.compile(r"[\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")
FILLER = re.compile(r"\b(you know|i mean|sort of|kinda|basically|um+|uh+|erm+)\b", re.I)
SIZES = [("EXTREME CLOSE-UP", "ECU"), ("EXTREME CLOSE UP", "ECU"), ("ECU", "ECU"),
         ("MEDIUM CLOSE-UP", "MCU"), ("MEDIUM CLOSE UP", "MCU"), ("MCU", "MCU"),
         ("CLOSE-UP", "CU"), ("CLOSE UP", "CU"), ("CU", "CU"), ("INSERT", "ECU"),
         ("EXTREME WIDE", "EWS"), ("MEDIUM WIDE", "MWS"), ("MEDIUM", "MS"), ("MS", "MS"),
         ("FULL SHOT", "FS"), ("TWO-SHOT", "MS"), ("WIDE", "WS"), ("WS", "WS"),
         ("LONG SHOT", "WS"), ("ESTABLISHING", "WS"), ("OVERHEAD", "TOP"), ("TOP-DOWN", "TOP"),
         ("BIRD'S-EYE", "TOP"), ("OTS", "OTS"), ("OVER-THE-SHOULDER", "OTS")]


def words(s):
    return re.findall(r"[^\W\d_]+(?:['\u2019][^\W\d_]+)*", str(s or "").casefold())


def sentences(s):
    parts = [p for p in re.split(r"[.!?\u2026]+(?:\s+|$)", str(s or "").strip()) if words(p)]
    return parts


def ngrams(tokens, n):
    return {" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)}


def shot_size(text):
    head = str(text or "")[:SIZE_LEAD].upper()
    best = None
    for token, code in SIZES:
        m = re.search(r"(?<![A-Z])" + re.escape(token) + r"(?![A-Z])", head)
        if m and (best is None or m.start() < best[0] or (m.start() == best[0] and len(token) > best[2])):
            best = (m.start(), code, len(token))
    return best[1] if best else None


def narration_lock(lines):
    joined = "\n".join(" ".join(words(x)) for x in lines)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def lock_path(script):
    return os.path.join(os.path.dirname(os.path.abspath(script)), "script.lock")


def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"valid": False, "errors": [{"field": "script", "message": f"cannot read {path}: {e}"}]}))
        sys.exit(2)


def int_list(s):
    return {int(x) for x in str(s or "").replace(" ", "").split(",") if x}


def block_window(n, count, duration):
    """Every block is 10 s: the delivered length is N x 10 s, so the word band never scales."""
    return 10.0


def validate(a):
    m = load(a.script)
    err, warn = [], []
    E = lambda b, f, msg: err.append({"block": b, "field": f, "message": msg})  # noqa: E731
    genre = m.get("genre")
    if genre not in GENRES:
        E(None, "genre", f"genre must be one of {sorted(GENRES)} (map the channel type, never the display label)")
    if m.get("animation_mode", "fully_animated") != "fully_animated":
        E(None, "animation_mode", "the motion gate takes animation_mode fully_animated; a scene_based script uses `picture`")
    blocks = m.get("blocks") or []
    dur = float(a.duration_seconds)
    want = math.ceil(dur / 10)
    if len(blocks) != want:
        E(None, "blocks", f"{len(blocks)} blocks; a {dur:g} s video needs exactly {want} (ceil(duration/10))")
    for i, b in enumerate(blocks, 1):
        if b.get("n") != i:
            E(i, "n", f"block numbers must run 1..N in order; found {b.get('n')} at position {i}")
    tl = m.get("through_line") or {}
    for k in ("name", "asset", "progression", "resolution"):
        if not str(tl.get(k) or "").strip():
            E(None, f"through_line.{k}", "the through-line needs name, asset, progression and resolution")
    arc = m.get("arc") or {}
    for k in ("hook", "build", "turn", "payoff"):
        if not arc.get(k):
            E(None, f"arc.{k}", "the arc needs hook, build, turn and payoff")
    roles = [b.get("arc_role") for b in blocks]
    if blocks:
        if roles[0] != "hook":
            E(1, "arc_role", "block 1 is the hook")
        if roles[-1] != "payoff":
            E(len(blocks), "arc_role", "the last block is the payoff")
        if "turn" not in roles:
            E(None, "arc_role", "no block carries the turn")
        for i, r in enumerate(roles, 1):
            if r not in ("hook", "build", "turn", "payoff"):
                E(i, "arc_role", f"arc_role {r!r} is not hook, build, turn or payoff")
    talking = bool(m.get("talking_characters"))
    if talking and genre != "kids":
        E(None, "talking_characters", "talking characters exist only for the Kids channel")
    if talking and m.get("song"):
        E(None, "talking_characters", "song intent clears talking_characters")
    retry = int_list(a.duration_retry_blocks)
    fewer = int_list(a.fewer_cuts)
    roster = {str(x.get("id")): x for x in (m.get("assets") or []) if isinstance(x, dict)}
    if not roster:
        warn.append("no assets[] roster in the manifest: the over-the-shoulder rule was not checked")
    line_grams, shot_grams = [], []
    visited, run_loc, run_len = set(), None, 0
    for i, b in enumerate(blocks, 1):
        kind = b.get("block_kind", "narration")
        line = str(b.get("vo_line") or "")
        w = words(line)
        if talking:
            if kind not in ("narration", "dialogue"):
                E(i, "block_kind", "block_kind is narration or dialogue")
            if kind != ("narration" if i % 2 == 1 else "dialogue"):
                E(i, "block_kind", "blocks alternate narration, dialogue, starting with narration")
        elif kind != "narration":
            E(i, "block_kind", "dialogue blocks need talking_characters:true")
        band = BANDS["dialogue"] if kind == "dialogue" else BANDS["kids"] if genre == "kids" else BANDS["default"]
        lo, hi = band
        if a.words_min:
            lo = int(a.words_min)
        if a.words_max:
            hi = int(a.words_max)
        if i in retry:
            lo = min(lo, RETRY_WORD_MIN)
        scale = block_window(i, len(blocks), dur) / 10
        lo_s, hi_s = max(1, math.floor(lo * scale)), max(1, math.ceil(hi * scale))
        if not (lo_s <= len(w) <= hi_s):
            E(i, "vo_line", f"{len(w)} words; this block takes {lo_s}-{hi_s}")
        if UNSPACED.search(line):
            E(i, "vo_line", "an unspaced script (Chinese, Japanese, Thai ...) is not offered on this machine yet: the word gates cannot count it")
        if re.search(r"\d", line):
            E(i, "vo_line", "digits in narration: write numbers as words")
        if re.search(r"[\[\]]|\d\d:\d\d", line):
            E(i, "vo_line", "vo_line holds spoken words only (no brackets, no timecodes)")
        if len(sentences(line)) > MAX_SENTENCES:
            E(i, "vo_line", f"more than {MAX_SENTENCES} sentences")
        if FILLER.search(line):
            E(i, "vo_line", f"filler phrase {FILLER.search(line).group(0)!r}")
        for j, tok in enumerate(w):
            if len(tok) >= 5 and tok in w[max(0, j - REPEAT_WINDOW):j]:
                E(i, "vo_line", f"{tok!r} repeats within {REPEAT_WINDOW} words")
                break
        if kind == "dialogue":
            sp = b.get("speakers") or []
            if not (1 <= len(sp) <= 2):
                E(i, "speakers", "a dialogue block names one or two speakers")
        if i == 1 and genre in ("education", "history"):
            first = sentences(line)[:1]
            if first and len(words(first[0])) > 8:
                E(1, "vo_line", "the cold open's first sentence is 8 words or fewer")
        g = ngrams(w, SHARED_PHRASE)
        for k, (pb, pg) in enumerate(line_grams):
            both = g & pg
            if both:
                E(i, "vo_line", f"shares the phrase {sorted(both)[0]!r} with block {pb}")
                break
        line_grams.append((i, g))
        shots = b.get("shots") or []
        n_shots = (4 if genre == "kids" else 5) - (1 if i in fewer else 0)
        if len(shots) != n_shots:
            E(i, "shots", f"{len(shots)} shots; this block takes {n_shots}")
        sizes = []
        for s_i, s in enumerate(shots, 1):
            text = s if isinstance(s, str) else (s or {}).get("text", "")
            sz = shot_size(text)
            if not sz:
                E(i, f"shots[{s_i}]", f"open the shot with its framing size (within {SIZE_LEAD} characters)")
            sizes.append(sz)
            sg = ngrams(words(text), SHARED_SHOT)
            for pb, ps, pg in shot_grams:
                if sg & pg:
                    E(i, f"shots[{s_i}]", f"repeats an 8-word shot description from block {pb} shot {ps}")
                    break
            shot_grams.append((i, s_i, sg))
            if re.search(r"\b(OTS|over[- ]the[- ]shoulder)\b", text, re.I) and roster:
                names = [str(roster[x].get("name") or x) for x in (b.get("assets_used") or [])
                         if x in roster and roster[x].get("kind") == "character"]
                if not any(nm.casefold() in text.casefold() for nm in names):
                    E(i, f"shots[{s_i}]", "an over-the-shoulder shot names the on-screen character whose shoulder it is")
            loc = str(b.get("location") or "")
            if loc in visited and re.search(r"\bestablishing\b", text, re.I):
                E(i, f"shots[{s_i}]", f"location {loc!r} was already established: never re-establish it")
        for s_i in range(1, len(sizes)):
            if sizes[s_i] and sizes[s_i] == sizes[s_i - 1]:
                E(i, f"shots[{s_i + 1}]", "adjacent shots need different framing sizes")
        assets = b.get("assets_used") or []
        if not (1 <= len(assets) <= MAX_REFS):
            E(i, "assets_used", f"{len(assets)} references; a clip takes 1-{MAX_REFS}")
        if tl.get("asset") and tl.get("asset") not in assets:
            E(i, "assets_used", "the through-line asset is in every block")
        if not str(b.get("through_line_state") or "").strip():
            E(i, "through_line_state", "say how the through-line object has changed in this block")
        loc = str(b.get("location") or "")
        if not loc:
            E(i, "location", "every block names its location asset")
        run_len = run_len + 1 if loc == run_loc else 1
        run_loc = loc
        if run_len > 2:
            E(i, "location", f"{loc!r} carries more than 2 consecutive blocks: move on")
        visited.add(loc)
        for j in range(max(0, i - 1 - NEAR_BLOCK), i - 1):
            p = blocks[j]
            if p.get("location") == loc and list(p.get("assets_used") or []) == list(assets):
                E(i, "assets_used", f"same location and same ordered references as block {j + 1}")
                break
    srcs = m.get("sources") or []
    for s in srcs:
        if not re.match(r"^https?://\S+$", str(s)):
            E(None, "sources", f"source {s!r} is not an absolute URL")
    if genre in ("education", "history") and not srcs:
        warn.append("a factual channel with no sources: research the spoken facts or mark the script as the customer's")
    report = {"valid": not err, "mode": "motion", "blocks": len(blocks), "required_blocks": want,
              "errors": err, "warnings": warn}
    if not err:
        lock = {"narration_sha256": narration_lock([b.get("vo_line") for b in blocks]),
                "block_count": len(blocks), "duration_seconds": dur, "mode": "motion"}
        with open(lock_path(a.script), "w", encoding="utf-8") as f:
            json.dump(lock, f, indent=1)
        report["lock"] = lock_path(a.script)
    print(json.dumps(report, indent=1))
    return 0 if not err else 1


def picture(a):
    m = load(a.script)
    err, warn = [], []
    E = lambda b, f, msg: err.append({"beat": b, "field": f, "message": msg})  # noqa: E731
    if m.get("genre") not in GENRES:
        E(None, "genre", f"genre must be one of {sorted(GENRES)}")
    if m.get("animation_mode") != "scene_based":
        E(None, "animation_mode", "a Picture Story manifest says animation_mode scene_based")
    beats = m.get("beats") or []
    d = float(a.duration_seconds)
    lo, hi = math.ceil(d * 25 / 60), math.floor(d * 35 / 60)
    if not (lo <= len(beats) <= hi):
        E(None, "beats", f"{len(beats)} beats; {d:g} s takes {lo}-{hi} (25-35 a minute)")
    total = 0
    for i, b in enumerate(beats, 1):
        if b.get("n") != i:
            E(i, "n", "beats run 1..N in order")
        w = words(b.get("phrase"))
        total += len(w)
        if not (4 <= len(w) <= 8):
            E(i, "phrase", f"{len(w)} words; a beat phrase takes 4-8")
        if re.search(r"\d", str(b.get("phrase") or "")):
            E(i, "phrase", "digits in narration: write numbers as words")
        mode = b.get("image_mode")
        if mode not in ("new", "variation"):
            E(i, "image_mode", "image_mode is new or variation")
        if mode == "variation":
            if i == 1:
                E(i, "image_mode", "the first beat cannot be a variation")
            if b.get("variation_of") != i - 1:
                E(i, "variation_of", "a variation edits the previous beat (variation_of = n-1)")
            if not str(b.get("change_only") or "").strip():
                E(i, "change_only", "a variation names the one detail that changes")
    cap = math.floor(d * 2.5)
    if total > cap:
        E(None, "beats", f"{total} words; {d:g} s takes at most {cap}")
    report = {"valid": not err, "mode": "picture", "beats": len(beats), "words": total,
              "frame_plan": [round(d / 60 * 45), round(d / 60 * 70)], "errors": err, "warnings": warn}
    if not err:
        lock = {"narration_sha256": narration_lock([b.get("phrase") for b in beats]),
                "block_count": math.ceil(d / 10), "duration_seconds": d, "mode": "picture"}
        with open(lock_path(a.script), "w", encoding="utf-8") as f:
            json.dump(lock, f, indent=1)
        report["lock"] = lock_path(a.script)
    print(json.dumps(report, indent=1))
    return 0 if not err else 1


def verify_lock(a):
    m = load(a.script)
    lp = lock_path(a.script)
    if not os.path.exists(lp):
        print(json.dumps({"ok": False, "message": "no script.lock: run validate first"}))
        return 1
    lock = json.load(open(lp, encoding="utf-8"))
    rows = [b.get("phrase") for b in m.get("beats") or []] if lock.get("mode") == "picture" \
        else [b.get("vo_line") for b in m.get("blocks") or []]
    ok = narration_lock(rows) == lock.get("narration_sha256")
    if lock.get("mode") != "picture":
        ok = ok and len(rows) == lock.get("block_count")
    print(json.dumps({"ok": ok, "lock": lp, "message": "narration matches the validated script" if ok
                      else "narration changed after validation: rerun validate"}))
    return 0 if ok else 1


TEMPO_BANNED = ["bridge", "slow down", "speed up", "ritardando", "accelerando", "tempo change", "key change",
                "breakdown", "drop", "half-time", "double-time"]
GROOVE_BANNED = ["four-on-the-floor", "syncopation", "syncopated", "swung", "swing feel", "shuffle groove"]
REQUIRED = [(r"steady|constant", "a steady, constant beat"), (r"\b4/4\b", "4/4"),
            (r"no tempo changes?", "no tempo changes"), (r"\b(8|eight)[- ]syllable", "eight-syllable lines"),
            (r"one syllable (per|a|on each) beat", "one syllable per beat"), (r"beat one", "lines start on beat one"),
            (r"(4|four)[- ]bar phrase", "each line one 4-bar phrase"),
            (r"chorus\b.*\b(verbatim|identical|same words)", "the chorus repeats word for word")]


def syllables(line):
    total = 0
    for w in words(line):
        groups = re.findall(r"[aeiouy]+", w)
        n = len(groups)
        if w.endswith("e") and n > 1 and not w.endswith(("le", "ee", "ye")):
            n -= 1
        total += max(1, n)
    return total


def song_prompt(a):
    prompt = open(a.prompt, encoding="utf-8").read()
    lyrics = open(a.lyrics, encoding="utf-8").read()
    err = []
    if len(prompt) > a.max_prompt:
        err.append(f"style prompt is {len(prompt)} characters; the route takes {a.max_prompt}: trim instrument adjectives first")
    if len(prompt) < 10:
        err.append("style prompt under 10 characters")
    if len(lyrics) > a.max_lyrics:
        err.append(f"lyrics are {len(lyrics)} characters; the route takes {a.max_lyrics}")
    bpm = re.findall(r"(\d{2,3})\s*BPM", prompt, re.I)
    if len(set(bpm)) != 1 or bpm[0] not in ("100", "112"):
        err.append(f"exactly one tempo, 100 or 112 BPM (found {bpm or 'none'})")
    low = prompt.casefold()
    for rx, what in REQUIRED:
        if not re.search(rx, low):
            err.append(f"missing: {what}")
    for b in TEMPO_BANNED + GROOVE_BANNED:
        if re.search(r"(?<![a-z])" + re.escape(b) + r"(?![a-z])", low) and not re.search(r"no " + re.escape(b), low):
            err.append(f"banned word {b!r}")
    sections, cur = [], None
    for raw in lyrics.splitlines():
        t = raw.strip()
        tag = re.match(r"^\[(\w[\w ]*)\]$", t)
        if tag:
            cur = [tag.group(1).casefold(), []]
            sections.append(cur)
        elif t and cur is not None:
            cur[1].append(t)
        elif t:
            err.append("lyrics start with an untagged line: open with [Intro] or [Verse]")
            cur = ["untagged", [t]]
            sections.append(cur)
    choruses = [tuple(s[1]) for s in sections if s[0].startswith("chorus")]
    if not choruses:
        err.append("no [Chorus] section")
    elif len(set(choruses)) != 1:
        err.append("every chorus repeats the same lines word for word")
    lines = [ln for s in sections if s[0].startswith(("verse", "chorus")) for ln in s[1]]
    off = [(ln, syllables(ln)) for ln in lines if abs(syllables(ln) - 8) > 1]
    gross = [x for x in off if abs(x[1] - 8) >= 4]
    far = [ln for ln in lines if abs(syllables(ln) - 8) >= 2]
    if gross:
        err.append(f"line {gross[0][0]!r} is about {gross[0][1]} syllables (8 wanted)")
    if lines and len(far) > len(lines) / 4:
        err.append(f"{len(far)} of {len(lines)} lines are two or more syllables off 8")
    print(json.dumps({"ok": not err, "prompt_chars": len(prompt), "lyrics_chars": len(lyrics), "bpm": bpm,
                      "lines": len(lines), "lines_off_by_more_than_one": [x[0] for x in off], "errors": err}, indent=1))
    return 0 if not err else 1


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate")
    v.add_argument("--script", required=True)
    v.add_argument("--duration-seconds", required=True, type=float)
    v.add_argument("--duration-retry-blocks", default="")
    v.add_argument("--fewer-cuts", default="")
    v.add_argument("--words-min", type=int)
    v.add_argument("--words-max", type=int)
    pc = sub.add_parser("picture")
    pc.add_argument("--script", required=True)
    pc.add_argument("--duration-seconds", required=True, type=float)
    vl = sub.add_parser("verify-lock")
    vl.add_argument("--script", required=True)
    sp = sub.add_parser("song-prompt")
    sp.add_argument("--prompt", required=True)
    sp.add_argument("--lyrics", required=True)
    sp.add_argument("--max-prompt", type=int, default=2000)
    sp.add_argument("--max-lyrics", type=int, default=3500)
    a = p.parse_args()
    return {"validate": validate, "picture": picture, "verify-lock": verify_lock, "song-prompt": song_prompt}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
