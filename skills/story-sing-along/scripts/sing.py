#!/usr/bin/env python3
"""story-sing-along helper: the song is the clock, every number reads from one timeline.

SL8-authored from the behaviour the capability assessment records for WF46-a1-s1 (no vendor file is
copied). Subcommands (all print one JSON object on stdout):

  plan         lyrics + BPM -> timeline.json (one row per sung line, bar = 240/BPM, intro and end bars)
  song-prompt  timeline + style -> params file for the song route (lyria or minimax), with the pre-checks
  check-prompt length and banned-phrase checks for an image, video or song prompt file
  readback     the song's measured length and its word transcript against the lyrics
  retime       STEP A: the timeline re-timed to the real song (word times, else scaling)
  shots        shot-plan checks (sums, shot and clip limits, framing) and the render durations
  clip-prompt  one clip's prompt (header, timed rows, sound line, closer) -> params file for its route
  stitch       trim-from-end segments, one encode setting, concat, the song as the only sound
  lyricmap     LYRIC MAP {lines:[{text,start,end,words}]} from the retimed timeline and the words
  ass          karaoke (or plain) ASS captions from the LYRIC MAP, with the accuracy checks; optional SRT
  cut          remove a range (snapped to sung-line boundaries) from the stitch, the song and the map
  cutcheck     where a rendered clip really cut, against the planned cut times (scene detection)
  out          print files[0].local_path of an ai-gen result envelope

Exit codes: 0 done; 1 bad input; 2 a tool is missing; 3 unusable transcript; 4 a check failed (nothing
written, or written with "ok": false where stated); 5 song TOO LONG; 6 sung line(s) missing.
"""
import argparse
import difflib
import json
import math
import os
import re
import shutil
import subprocess
import sys

LENGTH_TABLE = {  # lines per planned length, by tempo column (song rules: count lines, not seconds)
    120: {15: 6, 20: 8, 25: 10, 30: 12, 40: 16, 60: 24},
    92: {15: 5, 20: 6, 25: 8, 30: 10, 40: 13, 60: 20},
    128: {15: 7, 20: 9, 25: 11, 30: 14, 40: 18, 60: 27},
}
# Phrases a music model's filter reads as an existing song (assessment WF46-a1-s1 step 7). Facts, kept short.
BLOCKED = [
    r"\bsung to\b", r"\btune of\b", r"\bmelody of\b", r"\btraditional\b", r"\bpublic domain\b",
    r"\bbeep,? beep,? beep\b", r"\bround and round\b", r"\be-i-e-i-o\b", r"\bnow i know my abcs?\b",
    r"\bnext time won'?t you sing with me\b", r"\bwhere are you\?? here i am\b", r"\bdoo,? doo,? doo\b",
    r"\btwinkle,? twinkle\b", r"\bif you'?re happy and you know it\b", r"\bover the hills and far away\b",
    r"\bjumping on the bed\b", r"\bhead,? shoulders,? knees and toes\b", r"\brow,? row,? row\b",
    r"\bdo not imitate\b", r"\bno copyrighted\b",
]
NUMS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
SLOW = re.compile(r"\b(slowly|gently|gradually)\b", re.I)
CAPS = {"song": 1500, "image": 2300, "video": 2500}


def out(obj, code=0):
    print(json.dumps(obj, ensure_ascii=False))
    sys.exit(code)


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, obj):
    os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def tokens(s):
    return re.findall(r"[a-z0-9À-ɏЀ-ӿ']+", s.lower().replace("’", "'"))


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    groups = re.findall(r"[aeiouy]+", w)
    n = len(groups)
    if w.endswith("e") and not w.endswith(("le", "ee", "ye")) and n > 1:
        n -= 1
    return max(1, n)


def mmss(t):
    m, s = divmod(max(0.0, t), 60)
    if abs(s - round(s)) < 0.05:
        return "%d:%02d" % (m, round(s))
    return "%d:%04.1f" % (m, s)


def column(bpm):
    if 85 <= bpm <= 95:
        return 92
    if 125 < bpm <= 130:
        return 128
    if 115 <= bpm <= 125:
        return 120
    return None


def ffprobe_duration(path, stream=None):
    if not shutil.which("ffprobe"):
        out({"ok": False, "error": "ffprobe missing (broken machine; never install)"}, 2)
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", stream, "-show_entries", "stream=duration"]
    else:
        cmd += ["-show_entries", "format=duration"]
    cmd += ["-of", "csv=p=0", path]
    r = subprocess.run(cmd, capture_output=True, text=True)
    vals = [v for v in r.stdout.split() if v and v != "N/A"]
    if r.returncode or not vals:
        return None
    return float(vals[0])


def probe_size(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height", "-of", "csv=p=0:s=x", path], capture_output=True, text=True)
    try:
        w, h = r.stdout.strip().split("x")[:2]
        return int(w), int(h)
    except ValueError:
        return None


def audio_streams(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    return len([x for x in r.stdout.split() if x.strip()])


def read_lyrics(path):
    stanzas, cur = [], []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                if cur:
                    stanzas.append(cur)
                cur = []
                continue
            cur.append(line)
    if cur:
        stanzas.append(cur)
    return stanzas


# ---------------------------------------------------------------- plan
def cmd_plan(a):
    stanzas = read_lyrics(a.lyrics)
    lines = [l for s in stanzas for l in s]
    if not lines:
        out({"ok": False, "error": "no lyric lines"}, 1)
    if a.bpm == int(a.bpm):
        a.bpm = int(a.bpm)
    bar = 240.0 / a.bpm
    rows, t = [], 0.0
    rows.append({"n": 0, "kind": "intro", "line": "", "bars": a.intro_bars, "start_s": 0.0,
                 "end_s": round(bar * a.intro_bars, 3)})
    t = bar * a.intro_bars
    k = 0
    for si, s in enumerate(stanzas):
        for line in s:
            k += 1
            rows.append({"n": k, "kind": "line", "verse": si + 1, "line": line, "bars": 1,
                         "start_s": round(t, 3), "end_s": round(t + bar, 3)})
            t += bar
    rows.append({"n": k + 1, "kind": "end", "line": "", "bars": a.end_bars, "start_s": round(t, 3),
                 "end_s": round(t + bar * a.end_bars, 3)})
    planned = round(t + bar * a.end_bars, 3)
    fails, warns = [], []
    col = column(a.bpm)
    if col is None:
        warns.append("BPM %s is outside the three tempo bands (85-95, 115-125, 125-130)" % a.bpm)
        row_len = None
    else:
        hits = [L for L, n in LENGTH_TABLE[col].items() if n == len(lines)]
        row_len = hits[0] if hits else None
        if not hits and not (a.free_length or "length" in waived):
            fails.append("%d lines is no LENGTH row at %d BPM (rows: %s)" % (len(lines), col, LENGTH_TABLE[col]))
    waived = set(a.waive or [])
    waivers = []
    if planned > 60.0:
        fails.append("planned %.1f s is over 60 s" % planned)
    if tokens(lines[0]) != tokens(lines[-1]):
        if "open-ending" in waived:
            waivers.append("the last line is not line 1 (waived: the customer's own words)")
        else:
            fails.append("the last line is not line 1 (--waive open-ending when the customer's own words end otherwise)")
    over = []
    for i, line in enumerate(lines, 1):
        n = sum(syllables(w) for w in tokens(line))
        if n > 8:
            over.append({"line": i, "syllables_est": n, "text": line})
        for b in BLOCKED:
            if re.search(b, line, re.I):
                if "blocked" in waived:
                    waivers.append("line %d has a phrase the music filter often blocks: %s (waived: the customer's own words)" % (i, b))
                else:
                    fails.append("line %d has a phrase the music filter blocks: %s (--waive blocked when the customer's own words use it)" % (i, b))
        toks = tokens(line)
        run = 0
        for w in toks:
            run = run + 1 if w in NUMS else 0
            if run >= 4:
                fails.append("line %d is a bare number list" % i)
                break
    if over:
        warns.append("%d line(s) estimated over 8 syllables (the estimate is rough; read them out)" % len(over))
    tl = {"schema": "sing.timeline/1", "bpm": a.bpm, "bar_s": round(bar, 4), "lines": len(lines),
          "verses": len(stanzas), "length_row_s": row_len, "planned_s": planned, "song_s": None,
          "timed_from": "plan", "rows": rows, "waivers": waivers, "waived": sorted(waived)}
    res = {"ok": not fails, "lines": len(lines), "planned_s": planned, "bar_s": round(bar, 4),
           "length_row_s": row_len, "fails": fails, "warnings": warns, "over_8": over, "waivers": waivers}
    if fails:
        out(res, 4)
    save(a.out, tl)
    res["timeline"] = a.out
    out(res)


# ---------------------------------------------------------------- prompts
SONG_SOFT = 1500    # the vendor's observation: longer prompts were blocked more often (a default, a warning)
SONG_HARD = 4500    # under the route's own limit (5,000 on lyria3/pro)


def scan(text, kind, warns=None, waive_blocked=False):
    fails = []
    cap = CAPS[kind]
    if kind == "song":
        if len(text) >= SONG_HARD:
            fails.append("%d characters, the route takes under 5,000; cut lines or the style note" % len(text))
        elif len(text) >= SONG_SOFT and warns is not None:
            warns.append("%d characters; the vendor saw more blocks above %d (a default, not a limit): keep going, "
                         "and if the song is blocked, trim the style note before the lyrics" % (len(text), SONG_SOFT))
        for b in BLOCKED:
            if re.search(b, text, re.I):
                (warns if waive_blocked and warns is not None else fails).append("blocked phrase %s" % b)
    elif len(text) >= cap:
        fails.append("%d characters, the cap is under %d" % (len(text), cap))
    return fails


def cmd_song_prompt(a):
    tl = load(a.timeline)
    st = load(a.style)
    tpl = {r["slug"]: r["prompt"] for r in load(a.templates)["rows"]}
    lines = [r for r in tl["rows"] if r["kind"] == "line"]
    end = [r for r in tl["rows"] if r["kind"] == "end"][0]
    intro = tl["rows"][0]
    fill = {"mood": st.get("mood", "cheerful"), "bpm": tl["bpm"], "key": st.get("key", "C major"),
            "time_signature": st.get("time_signature", "4/4"), "genre": st.get("genre", "bouncy toddler pop"),
            "instruments": ", ".join(st.get("instruments", ["ukulele", "marimba", "glockenspiel"])[:3]),
            "voice": st.get("voice", "one warm clear female lead"), "n_lines": len(lines),
            "length_s": int(round(tl["planned_s"])), "sound_note": st.get("sound_note", "")}
    warns = []
    wb = "blocked" in tl.get("waived", [])
    if a.route == "lyria":
        rows = ["%s (intro, music only)" % mmss(intro["start_s"])]
        rows += ["%s %s" % (mmss(r["start_s"]), r.get("sung", r["line"])) for r in lines]
        rows.append("%s (closing chord, then silence)" % mmss(end["start_s"]))
        prompt = tpl["song-lyria"].format(**fill).replace("  ", " ").strip() + "\n" + "\n".join(rows)
        params = {"prompt": prompt}
        fails = scan(prompt, "song", warns, wb)
    else:
        hook = tokens(lines[0]["line"])
        blocks, cur, cur_v = ["[Intro]"], [], None
        for r in lines:
            if tokens(r["line"]) == hook:
                if cur:
                    blocks.append("[Verse]\n" + "\n".join(cur))
                    cur = []
                blocks.append("[Chorus]\n" + r.get("sung", r["line"]))
                cur_v = None
                continue
            if cur_v is not None and r.get("verse") != cur_v and cur:
                blocks.append("[Verse]\n" + "\n".join(cur))
                cur = []
            cur.append(r.get("sung", r["line"]))
            cur_v = r.get("verse")
        if cur:
            blocks.append("[Verse]\n" + "\n".join(cur))
        blocks.append("[Outro]")
        prompt = tpl["song-minimax"].format(**fill).replace("  ", " ").strip()
        lyrics = "\n\n".join(blocks)
        params = {"prompt": prompt, "lyrics": lyrics, "lyrics_optimizer": False, "is_instrumental": False}
        fails = scan(prompt + "\n" + lyrics, "song", warns, wb)
        if not 10 <= len(prompt) <= 2000:
            fails.append("minimax prompt must be 10-2000 characters")
        if len(lyrics) > 3500:
            fails.append("minimax lyrics over 3500 characters")
    res = {"ok": not fails, "route": a.route, "chars": len(params["prompt"]), "fails": fails, "warnings": warns,
           "waivers": tl.get("waivers", [])}
    if fails:
        out(res, 4)
    save(a.out, params)
    res["params"] = a.out
    out(res)


def cmd_check_prompt(a):
    text = open(a.file, encoding="utf-8").read()
    if a.file.endswith(".json"):
        text = load(a.file).get("prompt", "")
    warns = []
    fails = scan(text, a.kind, warns)
    if a.kind in ("image", "video") and not re.search(r"no (on-screen )?text", text, re.I):
        fails.append("the closer (no text, captions, watermarks or logos) is missing")
    out({"ok": not fails, "kind": a.kind, "chars": len(text), "fails": fails, "warnings": warns}, 4 if fails else 0)


# ---------------------------------------------------------------- words
def find_words(obj):
    if isinstance(obj, dict):
        w = obj.get("words")
        if isinstance(w, list) and w and isinstance(w[0], dict) and "start" in w[0]:
            return w
        for k in ("raw", "output", "data", "result"):
            if k in obj:
                got = find_words(obj[k])
                if got:
                    return got
        for v in obj.values():
            got = find_words(v)
            if got:
                return got
    elif isinstance(obj, list):
        for v in obj:
            got = find_words(v)
            if got:
                return got
    return None


def words_of(path):
    w = find_words(load(path)) or []
    res = []
    for x in w:
        if x.get("type", "word") != "word":
            continue
        t = tokens(str(x.get("text", x.get("word", ""))))
        if not t or x.get("start") is None:
            continue
        res.append({"tok": t[0], "text": str(x.get("text", "")).strip(), "start": float(x["start"]),
                    "end": float(x.get("end", x["start"]))})
    return res


def sim(a, b):
    if a == b:
        return 1.0
    if len(a) > 2 and len(b) > 2 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.75:
        return 0.8  # singing stretches and blurs words ("pippa" heard as "pipa")
    return 0.0


def align(lt, wt):
    """Order-keeping alignment of lyric tokens to transcript tokens; transcript ends are free."""
    n, m = len(lt), len(wt)
    NEG = -1e9
    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    B = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        S[i][0], B[i][0] = S[i - 1][0] - 1.0, 1
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = sim(lt[i - 1], wt[j - 1])
            diag = S[i - 1][j - 1] + (2.0 * s if s else -1.0)
            up = S[i - 1][j] - 1.0                                  # lyric token not heard
            left = S[i][j - 1] - (0.0 if i == n else 0.5)           # extra heard word
            best = max(diag, up, left)
            S[i][j], B[i][j] = best, (0 if best == diag else 1 if best == up else 2)
    i, j = n, max(range(m + 1), key=lambda k: S[n][k])
    pairs = {}
    while i > 0 and j > 0:
        b = B[i][j]
        if b == 0:
            if sim(lt[i - 1], wt[j - 1]):
                pairs[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif b == 1:
            i -= 1
        else:
            j -= 1
    return pairs


def match_lines(lines, words, near):
    """Match every lyric line, in order, to the transcript. Returns per-line matches and the last word used."""
    lt, owner = [], []
    for li, line in enumerate(lines):
        for t in tokens(line):
            lt.append(t)
            owner.append(li)
    pairs = align(lt, [w["tok"] for w in words]) if words else {}
    res, last = [], -1
    for li, line in enumerate(lines):
        idx = [k for k in range(len(lt)) if owner[k] == li]
        got = [pairs[k] for k in idx if k in pairs]
        score = len(got) / max(1, len(idx))
        if got and score >= near:
            a0, a1 = min(got), max(got)
            last = max(last, a1)
            res.append({"n": li + 1, "found": True, "score": round(score, 2), "start": words[a0]["start"],
                        "end": words[a1]["end"],
                        "words": [{"tok": words[j]["tok"], "start": words[j]["start"], "end": words[j]["end"]} for j in range(a0, a1 + 1)]})
        else:
            res.append({"n": li + 1, "found": False, "score": round(score, 2)})
    return res, last + 1


def cmd_readback(a):
    tl = load(a.timeline)
    song_s = ffprobe_duration(a.song)
    if song_s is None:
        out({"ok": False, "error": "cannot measure %s" % a.song}, 1)
    lines = [r.get("sung", r["line"]) for r in tl["rows"] if r["kind"] == "line"]  # match what is sung
    words = words_of(a.words) if a.words else []
    res = {"song_s": round(song_s, 3), "planned_s": tl["planned_s"], "over_s": round(song_s - tl["planned_s"], 3),
           "words": len(words), "near": a.near}
    if a.words and not words:
        res.update({"ok": False, "verdict": "transcript has no word entries (type word)"})
        save(a.out, res)
        out(res, 3)
    m, ptr = (match_lines(lines, words, a.near) if words else ([], 0))
    res["lines"] = m
    missing = [x["n"] for x in m if not x["found"]]
    leftover = words[ptr:]
    twice = False
    if len(leftover) >= 4:
        again, _ = match_lines(lines, leftover, max(a.near, 0.6))
        twice = sum(1 for x in again if x["found"]) >= 2
    res["missing"] = missing
    res["sung_twice"] = twice
    res["leftover_words"] = len(leftover)
    code = 0
    if song_s > tl["planned_s"] + a.too_long or twice:
        res["verdict"] = "TOO LONG"
        code = 5
    elif missing:
        res["verdict"] = "missing line(s)"
        code = 6
    else:
        res["verdict"] = "song usable" if words else "length usable; no transcript read"
    res["ok"] = code == 0
    save(a.out, res)
    out(res, code)


# ---------------------------------------------------------------- retime
def cmd_retime(a):
    tl = load(a.timeline)
    rb = load(a.readback)
    song_s = rb["song_s"]
    plan = tl["planned_s"]
    if song_s > plan + a.too_long:
        out({"ok": False, "error": "TOO LONG: %.2f s against %.2f planned; redo the song, never stretch the plan" % (song_s, plan)}, 5)
    rows = [dict(r) for r in tl["rows"]]
    lines = [r for r in rows if r["kind"] == "line"]
    m = {x["n"]: x for x in rb.get("lines", []) if x.get("found")}
    if m:
        anchors = sorted(m)
        first, last = m[anchors[0]], m[anchors[-1]]
        # starts: matched lines take their first sung word; unmatched ones are interpolated by bars
        starts = {}
        for r in lines:
            if r["n"] in m:
                starts[r["n"]] = m[r["n"]]["start"]
        known = sorted(starts)
        for r in lines:
            n = r["n"]
            if n in starts:
                continue
            prev = max([k for k in known if k < n], default=None)
            nxt = min([k for k in known if k > n], default=None)
            if prev is not None and nxt is not None:
                starts[n] = starts[prev] + (starts[nxt] - starts[prev]) * (n - prev) / (nxt - prev)
            elif prev is not None:
                step = (last["end"] - first["start"]) / max(1, len(lines))
                starts[n] = starts[prev] + step * (n - prev)
            else:
                step = (last["end"] - first["start"]) / max(1, len(lines))
                starts[n] = max(0.0, starts[nxt] - step * (nxt - n))
        new, prev_end = [], 0.0
        for i, r in enumerate(lines):
            s = starts[r["n"]]
            if i + 1 < len(lines):
                nxt_s = starts[lines[i + 1]["n"]]
                own_end = m[r["n"]]["end"] if r["n"] in m else nxt_s
                e = nxt_s
                if nxt_s - own_end > a.gap:  # an instrumental gap gets its own row
                    e = own_end
            else:
                e = m[r["n"]]["end"] if r["n"] in m else min(song_s, s + tl["bar_s"])
            new.append((r, s, e))
        out_rows = [{"n": 0, "kind": "intro", "line": "", "start_s": 0.0, "end_s": round(new[0][1], 3)}]
        for i, (r, s, e) in enumerate(new):
            rr = dict(r)
            rr["start_s"], rr["end_s"] = round(s, 3), round(e, 3)
            out_rows.append(rr)
            if i + 1 < len(new) and new[i + 1][1] - e > 1e-3:
                out_rows.append({"n": None, "kind": "gap", "line": "", "start_s": round(e, 3), "end_s": round(new[i + 1][1], 3)})
        out_rows.append({"n": lines[-1]["n"] + 1, "kind": "end", "line": "", "start_s": round(new[-1][2], 3), "end_s": round(song_s, 3)})
        timed_from = "words (%d of %d lines matched)" % (len(m), len(lines))
    else:
        f = song_s / plan
        out_rows = []
        for r in rows:
            rr = dict(r)
            rr["start_s"], rr["end_s"] = round(r["start_s"] * f, 3), round(r["end_s"] * f, 3)
            out_rows.append(rr)
        out_rows[-1]["end_s"] = round(song_s, 3)
        timed_from = "scaled %.4f (no word times)" % f
    gaps = [r for r in out_rows if r["kind"] == "gap" and r["end_s"] - r["start_s"] > a.gap]
    tl.update({"rows": out_rows, "song_s": song_s, "timed_from": timed_from})
    save(a.out, tl)
    out({"ok": True, "song_s": song_s, "timed_from": timed_from, "gap_rows_over_1_5s": len(gaps), "timeline": a.out})


# ---------------------------------------------------------------- shots
def cmd_shots(a):
    tl = load(a.timeline)
    sp = load(a.plan)
    song_s = tl.get("song_s") or tl["planned_s"]
    lo, hi = (3.0, 6.0) if a.lullaby else (1.0, 5.0)
    starts = [r["start_s"] for r in tl["rows"] if r["kind"] in ("line", "gap", "intro")]
    fails, warns, t = [], [], 0.0
    prev = None   # carried across clips: a repeat over a clip boundary is still a repeat
    allshots = [s for c in sp["clips"] for s in c["shots"]]
    if not allshots:
        out({"ok": False, "error": "no shots"}, 1)
    total = sum(float(s["seconds"]) for s in allshots)
    if a.fix_last and abs(total - song_s) > 0.25 and abs(total - song_s) <= 1.5:
        allshots[-1]["seconds"] = round(float(allshots[-1]["seconds"]) + (song_s - total), 3)
        total = sum(float(s["seconds"]) for s in allshots)
    if abs(total - song_s) > 0.25:
        fails.append("shots sum to %.2f s, the song is %.2f s (tolerance 0.25)" % (total, song_s))
    report = []
    for ci, c in enumerate(sp["clips"]):
        c_start = t
        for si, s in enumerate(c["shots"]):
            sec = float(s["seconds"])
            s["start_s"] = round(t, 3)
            s["clip_t"] = round(t - c_start, 3)
            if not (lo - 1e-6 <= sec <= hi + 1e-6):
                (warns if s.get("kind") in ("intro", "gap", "end") else fails).append(
                    "%s shot %d is %.2f s (limits %.0f-%.0f s)" % (c["id"], si + 1, sec, lo, hi))
            if prev is not None and s.get("framing") == prev:
                fails.append("%s shot %d repeats the framing of the shot before (%s); change the size or the subject (pictures.md)" % (c["id"], si + 1, prev))
            prev = s.get("framing")
            for k in ("framing", "see"):
                if not s.get(k):
                    fails.append("%s shot %d has no %s" % (c["id"], si + 1, k))
            t += sec
        length = round(t - c_start, 3)
        render = max(4, int(math.ceil(length - 1e-6)))
        c["start_s"], c["length_s"], c["render_s"] = round(c_start, 3), length, render
        if length > 15.0 + 1e-6:
            fails.append("%s is %.2f s, over the 15 s cap" % (c["id"], length))
        if not any(abs(c_start - x) <= 0.25 for x in starts):
            fails.append("%s starts at %.2f s, not on a sung-line start" % (c["id"], c_start))
        report.append({"id": c["id"], "start_s": c["start_s"], "length_s": length, "render_s": render,
                       "shots": len(c["shots"])})
    size = lambda f: str(f or "").split("\u00b7")[0].strip().lower()   # "close \u00b7 wipers" -> "close"
    if size(allshots[0].get("framing")) != size(allshots[-1].get("framing")):
        fails.append("the last shot's size (%s) does not match shot 1 (%s), so the video will not loop" % (
            size(allshots[-1].get("framing")), size(allshots[0].get("framing"))))
    exp = {20: (7, 9), 30: (10, 12), 60: (18, 22)}
    near = min(exp, key=lambda k: abs(k - song_s))
    e = exp[near]
    if a.lullaby:
        e = (max(1, e[0] // 2), e[1] // 2 + 1)
    if not (e[0] <= len(allshots) <= e[1] + 2) and abs(near - song_s) < 6:
        warns.append("%d shots; about %d-%d is usual near %d s (a check, not a quota)" % (len(allshots), e[0], e[1], near))
    res = {"ok": not fails, "song_s": song_s, "shots": len(allshots), "sum_s": round(total, 3), "clips": report,
           "fails": fails, "warnings": warns}
    if not fails and a.write:
        save(a.plan, sp)
        res["written"] = a.plan
    out(res, 4 if fails else 0)


# ---------------------------------------------------------------- clip prompt
def cmd_clip_prompt(a):
    sp = load(a.plan)
    st = load(a.state)
    tl = load(a.timeline)
    tpl = {r["slug"]: r["prompt"] for r in load(a.templates)["rows"]}
    clip = [c for c in sp["clips"] if c["id"] == a.clip]
    if not clip:
        out({"ok": False, "error": "no clip %s" % a.clip}, 1)
    c = clip[0]
    if "render_s" not in c:
        out({"ok": False, "error": "run shots --write first"}, 1)
    lyric = [r["line"] for r in tl["rows"] if r["kind"] == "line"]
    fill = dict(st)
    fill.setdefault("bpm", tl["bpm"])
    need = {"look_lock"} if a.shot is not None else {"look_lock", "set_sentence", "prop_pin", "cast", "performance"}
    missing = sorted(k for k in need if not str(fill.get(k, "")).strip())
    if missing:
        out({"ok": False, "error": "state.json lacks %s (keys: look_lock, set_sentence, prop_pin, cast, performance; "
             "optional sky_pin, bpm)" % ", ".join(missing), "missing": missing}, 1)
    if a.shot is not None:  # way B: one shot, one continuous take
        s = c["shots"][a.shot - 1]
        dur = float(s["seconds"])
        fill.update({"seconds": a.render or max(4, int(math.ceil(dur))), "framing": s["framing"],
                     "camera": s.get("camera", "camera locked at hero height"), "act_end": mmss(dur),
                     "action": s["row"], "after": s.get("after", "the move settles and holds")})
        prompt = tpl["clip-one-shot"].format(**fill) + " " + tpl["clip-sound"] + " " + tpl["clip-closer"]
        rows_txt = [s["row"]]
    else:
        fill["seconds"] = c["render_s"]
        head = tpl["clip-header"].format(**fill)
        rows_txt, body = [], []
        for s in c["shots"]:
            t0, t1 = s["clip_t"], s["clip_t"] + float(s["seconds"])
            rows_txt.append(s["row"])
            body.append("%s-%s | %s" % (mmss(t0), mmss(t1), s["row"].strip()))
        prompt = head + "\n" + "\n".join(body) + "\n" + tpl["clip-sound"] + " " + st.get("sky_pin", "") + " " + tpl["clip-closer"]
        prompt = re.sub(r"  +", " ", prompt)
    fails = scan(prompt, "video")
    for i, r in enumerate(rows_txt, 1):
        if SLOW.search(r):
            fails.append("row %d slows the hero's action (%s)" % (i, SLOW.search(r).group(0)))
        if re.search(r"[\"“”]", r):
            fails.append("row %d quotes words (a quoted line gets sung or written on screen)" % i)
    low = prompt.lower()
    for line in lyric:
        lt = tokens(line)
        for k in range(0, max(0, len(lt) - 3)):
            if " ".join(lt[k:k + 4]) in " ".join(tokens(low)):
                fails.append("the prompt quotes the lyric '%s'" % line)
                break
    route = a.route
    dur = fill["seconds"]
    if route == "seedance":
        params = {"prompt": prompt, "duration": str(dur), "resolution": a.resolution, "aspect_ratio": a.aspect,
                  "generate_audio": False}
        if not 4 <= dur <= 15:
            fails.append("Seedance 2.0 duration %s outside 4-15" % dur)
    elif route == "kling":
        params = {"prompt": prompt, "duration": str(max(3, dur)), "generate_audio": False}
    else:
        params = {"prompt": prompt, "duration": max(5, int(dur)), "resolution": a.resolution.upper() if a.resolution != "480p" else "480P",
                  "prompt_expansion_mode": "disabled"}
    res = {"ok": not fails, "clip": a.clip, "shot": a.shot, "route": route, "chars": len(prompt), "fails": fails}
    if fails:
        out(res, 4)
    save(a.out, params)
    res["params"] = a.out
    out(res)


# ---------------------------------------------------------------- stitch
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        out({"ok": False, "error": "command failed", "cmd": " ".join(cmd[:6]) + " ...", "stderr": r.stderr[-800:]}, 1)


def cmd_stitch(a):
    if not shutil.which("ffmpeg"):
        out({"ok": False, "error": "ffmpeg missing (broken machine; never install)"}, 2)
    sp = load(a.plan)
    song_s = ffprobe_duration(a.song)
    segs = []  # (file, offset, dur)
    for c in sp["clips"]:
        for s in c["shots"]:
            dur = float(s["seconds"])
            if s.get("replace"):
                segs.append([s["replace"], 0.0, dur])
            else:
                if not c.get("file"):
                    out({"ok": False, "error": "%s has no file" % c["id"]}, 1)
                if segs and segs[-1][0] == c["file"] and abs(segs[-1][1] + segs[-1][2] - s["clip_t"]) < 1e-3:
                    segs[-1][2] += dur
                else:
                    segs.append([c["file"], float(s["clip_t"]), dur])
    fails = []
    for f, off, dur in segs:
        real = ffprobe_duration(f, "v:0") or ffprobe_duration(f)
        if real is None or real + 0.05 < off + dur:
            fails.append("%s is %.2f s, the cut needs %.2f s (a short clip would freeze)" % (f, real or 0, off + dur))
    if fails:
        out({"ok": False, "fails": fails}, 4)
    first = segs[0][0]
    size = probe_size(first)
    if a.size:
        size = tuple(int(x) for x in a.size.split("x"))
    W, H = size
    W -= W % 2
    H -= H % 2
    os.makedirs(a.work, exist_ok=True)
    listf = os.path.join(a.work, "concat.txt")
    with open(listf, "w") as lf:
        for i, (f, off, dur) in enumerate(segs):
            seg = os.path.join(a.work, "seg%03d.mp4" % i)
            vf = ("scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,"
                  "fps=%d,format=yuv420p,setsar=1" % (W, H, W, H, a.fps))
            run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % off, "-i", f, "-t", "%.3f" % dur, "-vf", vf,
                 "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", seg])
            lf.write("file '%s'\n" % os.path.abspath(seg))
    video = os.path.join(a.work, "video_only.mp4")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", video])
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", a.song, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "192k", "-shortest", a.out])
    got = ffprobe_duration(a.out)
    vid = ffprobe_duration(video)
    res = {"stitch": a.out, "size": "%dx%d" % (W, H), "segments": len(segs), "video_s": vid, "song_s": song_s,
           "stitch_s": got, "audio_streams": audio_streams(a.out)}
    bad = []
    if got is None or abs((vid or 0) - song_s) > 0.25:
        bad.append("picture %.2f s against song %.2f s (tolerance 0.25)" % (vid or 0, song_s))
    if res["audio_streams"] != 1:
        bad.append("%d audio streams, want 1 (the song)" % res["audio_streams"])
    res["ok"] = not bad
    res["fails"] = bad
    out(res, 4 if bad else 0)


# ---------------------------------------------------------------- lyric map and captions
def cmd_lyricmap(a):
    tl = load(a.timeline)
    rb = load(a.readback) if a.readback else {"lines": []}
    m = {x["n"]: x for x in rb.get("lines", []) if x.get("found")}
    lines = []
    for r in tl["rows"]:
        if r["kind"] != "line":
            continue
        text = r["line"]
        words = text.split()
        s0, s1 = r["start_s"], r["end_s"]
        heard = m.get(r["n"], {}).get("words", [])
        timed, j = [], 0
        for w in words:
            wt = (tokens(w) or [""])[0]
            hit = None
            for k in range(j, len(heard)):
                if heard[k]["tok"] == wt and s0 - 0.3 <= heard[k]["start"] <= s1:
                    hit = k
                    break
            timed.append({"w": w, "start": heard[hit]["start"] if hit is not None else None})
            if hit is not None:
                j = hit + 1
        # unmatched words share the time around them by length; times stay inside the line window
        n = len(timed)
        known = [i for i, x in enumerate(timed) if x["start"] is not None]
        lens = [max(1, len(x["w"])) for x in timed]
        for i, x in enumerate(timed):
            if x["start"] is not None:
                continue
            p = max([k for k in known if k < i], default=None)
            q = min([k for k in known if k > i], default=None)
            ta = timed[p]["start"] if p is not None else s0
            tb = timed[q]["start"] if q is not None else s1
            ia = p if p is not None else -1
            ib = q if q is not None else n
            span = sum(lens[ia + 1:ib]) + (lens[ia] if p is not None else 0)
            before = sum(lens[ia + 1:i]) + (lens[ia] if p is not None else 0)
            x["start"] = ta + (tb - ta) * before / max(1, span)
        for i, x in enumerate(timed):
            x["start"] = round(min(max(x["start"], s0), s1), 3)
        for i, x in enumerate(timed):
            x["end"] = timed[i + 1]["start"] if i + 1 < n else s1
            if x["end"] <= x["start"]:
                x["end"] = round(x["start"] + 0.05, 3)
        lines.append({"text": text, "start": s0, "end": s1, "words": timed})
    lm = {"schema": "sing.lyricmap/1", "song_s": tl.get("song_s"), "timed_from": tl.get("timed_from"), "lines": lines}
    save(a.out, lm)
    out({"ok": True, "lines": len(lines), "word_times_heard": sum(len(m.get(r, {}).get("words", [])) > 0 for r in m),
         "lyric_map": a.out})


def ass_time(t):
    t = max(0.0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    cs = int(round((s - int(s)) * 100))
    if cs == 100:
        cs = 0
        s = int(s) + 1
    return "%d:%02d:%02d.%02d" % (h, m, int(s), cs)


def srt_time(t):
    ms = int(round(max(0.0, t) * 1000))
    return "%02d:%02d:%02d,%03d" % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)


def chunks(words, max_chars, max_s):
    res, cur = [], []
    for w in words:
        trial = " ".join(x["w"] for x in cur + [w])
        if cur and (len(trial) > max_chars or w["end"] - cur[0]["start"] > max_s):
            res.append(cur)
            cur = []
        cur.append(w)
    if cur:
        res.append(cur)
    if len(res) > 1 and len(res[-1]) == 1 and len(res[-2]) > 1:   # no one-word orphan at the end of a line
        moved = [res[-2][-1]] + res[-1]
        if len(" ".join(x["w"] for x in moved)) <= max_chars and moved[-1]["end"] - moved[0]["start"] <= max_s:
            res[-2] = res[-2][:-1]
            res[-1] = moved
    return res


def ass_escape(s):
    return s.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def cmd_ass(a):
    lm = load(a.map)
    size = probe_size(a.video) if a.video else None
    if a.size:
        size = tuple(int(x) for x in a.size.split("x"))
    if not size:
        out({"ok": False, "error": "need --video or --size"}, 1)
    W, H = size
    fs = max(18, int(round(H * a.font_frac)))
    outline = max(2, int(round(3 * H / 1280.0)))
    if a.position == "top":
        align, marginv = 8, int(round(a.top * H))
    else:
        align, marginv = 2, int(round(a.bottom * H))
    gold, white, black = "&H0000D7FF", "&H00FFFFFF", "&H00000000"
    primary = white if a.plain else gold      # \k shows SecondaryColour first, then PrimaryColour when sung
    head = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: %d" % W, "PlayResY: %d" % H, "WrapStyle: 2",
            "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
            "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            "Style: Lyric,%s,%d,%s,%s,%s,%s,-1,0,0,0,100,100,0,0,1,%d,0,%d,%d,%d,%d,1" % (
                a.font, fs, primary, white, black, black, outline, align, int(W * 0.05), int(W * 0.05), marginv),
            "Style: Title,%s,%d,&H00FFFFFF,&H00FFFFFF,%s,%s,-1,0,0,0,100,100,0,0,1,%d,0,8,%d,%d,%d,1" % (
                a.font, int(fs * 1.2), black, black, outline, int(W * 0.05), int(W * 0.05), int(H * 0.06)),
            "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    ev, srt, fails = [], [], []
    lines = lm["lines"]
    for li, L in enumerate(lines):
        nxt = lines[li + 1]["start"] if li + 1 < len(lines) else None
        line_end = min(L["end"], nxt) if nxt is not None else L["end"]
        got = []
        for ch in chunks(L["words"], a.max_chars, a.max_s):
            s0 = ch[0]["start"]
            s1 = min(ch[-1]["end"], line_end)
            if s1 - s0 < 0.2:
                s1 = min(line_end, s0 + 0.2)
            if a.plain:
                text = ass_escape(" ".join(w["w"] for w in ch))
            else:
                parts = []
                for w in ch:
                    k = max(1, int(round((min(w["end"], s1) - w["start"]) * 100)))
                    parts.append("{\\k%d}%s" % (k, ass_escape(w["w"])))
                text = " ".join(parts)
            ev.append("Dialogue: 0,%s,%s,Lyric,,0,0,0,,%s" % (ass_time(s0), ass_time(s1), text))
            srt.append((s0, s1, " ".join(w["w"] for w in ch)))
            got += [w["w"] for w in ch]
            if s0 < L["start"] - 0.31 or s1 > line_end + 1e-3:
                fails.append("a caption of line %d runs outside its line" % (li + 1))
        if " ".join(got) != " ".join(L["text"].split()):
            fails.append("line %d captions do not spell the lyric exactly" % (li + 1))
    if a.title:
        ev.insert(0, "Dialogue: 1,%s,%s,Title,,0,0,0,,%s" % (ass_time(0), ass_time(a.title_s), ass_escape(a.title)))
    res = {"ok": not fails, "events": len(ev), "font": a.font, "fontsize": fs, "position": a.position,
           "marginv": marginv, "style": "plain" if a.plain else "karaoke", "fails": fails}
    if fails:
        out(res, 4)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write("\n".join(head + ev) + "\n")
    res["ass"] = a.out
    if a.srt:
        with open(a.srt, "w", encoding="utf-8") as f:
            for i, (s0, s1, t) in enumerate(srt, 1):
                f.write("%d\n%s --> %s\n%s\n\n" % (i, srt_time(s0), srt_time(s1), t))
        res["srt"] = a.srt
    out(res)


# ---------------------------------------------------------------- cut
def cmd_cut(a):
    lm = load(a.map)
    bounds = sorted({0.0} | {L["start"] for L in lm["lines"]} | {L["end"] for L in lm["lines"]} | {lm.get("song_s") or 0.0})
    snap = lambda t: min(bounds, key=lambda b: abs(b - t))
    t0, t1 = snap(a.start), snap(a.end)
    if t1 <= t0:
        out({"ok": False, "error": "the range snaps to nothing (%.2f-%.2f)" % (t0, t1)}, 1)
    d = t1 - t0
    fc = ("[0:v]trim=0:%.3f,setpts=PTS-STARTPTS[v0];[0:v]trim=%.3f,setpts=PTS-STARTPTS[v1];"
          "[0:a]atrim=0:%.3f,asetpts=PTS-STARTPTS[a0];[0:a]atrim=%.3f,asetpts=PTS-STARTPTS[a1];"
          "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" % (t0, t1, t0, t1))
    run(["ffmpeg", "-v", "error", "-y", "-i", a.stitch, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", a.out_stitch])
    kept, dropped = [], 0
    for L in lm["lines"]:
        if L["end"] <= t0 + 1e-3:
            kept.append(L)
        elif L["start"] >= t1 - 1e-3:
            L2 = dict(L)
            L2["start"], L2["end"] = round(L["start"] - d, 3), round(L["end"] - d, 3)
            L2["words"] = [dict(w, start=round(w["start"] - d, 3), end=round(w["end"] - d, 3)) for w in L["words"]]
            kept.append(L2)
        else:
            dropped += 1
    lm2 = dict(lm, lines=kept, song_s=round((lm.get("song_s") or 0) - d, 3))
    save(a.out_map, lm2)
    out({"ok": True, "cut_from": t0, "cut_to": t1, "removed_s": round(d, 3), "lines_removed": dropped,
         "stitch": a.out_stitch, "stitch_s": ffprobe_duration(a.out_stitch), "lyric_map": a.out_map})


def cmd_cutcheck(a):
    """Compare where the clip really cut (scene detection) with the planned cut times of its shots."""
    if not shutil.which("ffmpeg"):
        out({"ok": False, "error": "ffmpeg missing (broken machine; never install)"}, 2)
    sp = load(a.plan)
    c = [x for x in sp["clips"] if x["id"] == a.clip]
    if not c or "clip_t" not in c[0]["shots"][0]:
        out({"ok": False, "error": "no clip %s, or shots --write has not run" % a.clip}, 1)
    c = c[0]
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.file, "-vf", "select='gt(scene,%s)',showinfo" % a.scene,
                        "-an", "-f", "null", "-"], capture_output=True, text=True)
    if r.returncode:
        out({"ok": False, "error": "ffmpeg failed", "stderr": r.stderr[-400:]}, 1)
    found = [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]
    planned = [float(s["clip_t"]) for s in c["shots"][1:]]
    rows, left, bad = [], list(found), []
    for i, t in enumerate(planned, 2):
        hit = min(left, key=lambda f: abs(f - t), default=None)
        if hit is not None and abs(hit - t) <= a.tol:
            left.remove(hit)
            rows.append({"shot": i, "planned_s": t, "found_s": round(hit, 3), "off_s": round(hit - t, 3), "ok": True})
        else:
            rows.append({"shot": i, "planned_s": t, "found_s": None if hit is None else round(hit, 3),
                         "off_s": None if hit is None else round(hit - t, 3), "ok": False})
            bad.append(i)
    res = {"ok": not bad, "clip": a.clip, "detected_cuts": found, "shots": rows, "extra_cuts_s": [round(x, 3) for x in left],
           "missed_shots": bad,
           "note": "a missed or off-time cut means that shot goes to way B (SKILL.md step 13); extra cuts inside a shot are drift to look at"}
    if a.out:
        save(a.out, res)
    out(res, 4 if bad else 0)


def cmd_out(a):
    env = load(a.result)
    files = env.get("files") or []
    if not files:
        out({"ok": False, "error": "no files in the envelope", "success": env.get("success")}, 1)
    print(files[0]["local_path"])


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("plan"); s.add_argument("--lyrics", required=True); s.add_argument("--bpm", type=float, required=True)
    s.add_argument("--intro-bars", type=int, default=1); s.add_argument("--end-bars", type=int, default=1)
    s.add_argument("--free-length", action="store_true", help="the customer named an exact line count")
    s.add_argument("--waive", action="append", choices=["blocked", "open-ending", "length"],
                   help="the customer's own words need it; recorded in the timeline and result, then in the manifest waivers (HR20)")
    s.add_argument("--out", required=True)
    s = sub.add_parser("song-prompt"); s.add_argument("--timeline", required=True); s.add_argument("--style", required=True)
    s.add_argument("--route", choices=["lyria", "minimax"], default="lyria"); s.add_argument("--templates", required=True)
    s.add_argument("--out", required=True)
    s = sub.add_parser("check-prompt"); s.add_argument("--file", required=True); s.add_argument("--kind", choices=list(CAPS), required=True)
    s = sub.add_parser("readback"); s.add_argument("--timeline", required=True); s.add_argument("--song", required=True)
    s.add_argument("--words"); s.add_argument("--near", type=float, default=0.5); s.add_argument("--too-long", type=float, default=5.0)
    s.add_argument("--out", required=True)
    s = sub.add_parser("retime"); s.add_argument("--timeline", required=True); s.add_argument("--readback", required=True)
    s.add_argument("--gap", type=float, default=1.5); s.add_argument("--too-long", type=float, default=5.0); s.add_argument("--out", required=True)
    s = sub.add_parser("shots"); s.add_argument("--timeline", required=True); s.add_argument("--plan", required=True)
    s.add_argument("--lullaby", action="store_true"); s.add_argument("--fix-last", action="store_true"); s.add_argument("--write", action="store_true")
    s = sub.add_parser("clip-prompt"); s.add_argument("--plan", required=True); s.add_argument("--state", required=True)
    s.add_argument("--timeline", required=True); s.add_argument("--templates", required=True); s.add_argument("--clip", required=True)
    s.add_argument("--shot", type=int); s.add_argument("--render", type=int)
    s.add_argument("--route", choices=["seedance", "kling", "h3"], default="seedance")
    s.add_argument("--resolution", default="480p"); s.add_argument("--aspect", default="9:16"); s.add_argument("--out", required=True)
    s = sub.add_parser("stitch"); s.add_argument("--plan", required=True); s.add_argument("--song", required=True)
    s.add_argument("--out", required=True); s.add_argument("--work", required=True); s.add_argument("--size"); s.add_argument("--fps", type=int, default=24)
    s = sub.add_parser("lyricmap"); s.add_argument("--timeline", required=True); s.add_argument("--readback"); s.add_argument("--out", required=True)
    s = sub.add_parser("ass"); s.add_argument("--map", required=True); s.add_argument("--video"); s.add_argument("--size")
    s.add_argument("--out", required=True); s.add_argument("--srt"); s.add_argument("--plain", action="store_true")
    s.add_argument("--position", choices=["top", "bottom"], default="top"); s.add_argument("--top", type=float, default=0.74)
    s.add_argument("--bottom", type=float, default=0.10); s.add_argument("--font", default="Comic Neue")
    s.add_argument("--font-frac", type=float, default=0.055); s.add_argument("--max-chars", type=int, default=14)
    s.add_argument("--max-s", type=float, default=3.0); s.add_argument("--title"); s.add_argument("--title-s", type=float, default=2.0)
    s = sub.add_parser("cut"); s.add_argument("--stitch", required=True); s.add_argument("--map", required=True)
    s.add_argument("--start", type=float, required=True); s.add_argument("--end", type=float, required=True)
    s.add_argument("--out-stitch", required=True); s.add_argument("--out-map", required=True)
    s = sub.add_parser("cutcheck"); s.add_argument("--file", required=True); s.add_argument("--plan", required=True)
    s.add_argument("--clip", required=True); s.add_argument("--scene", type=float, default=0.3)
    s.add_argument("--tol", type=float, default=0.3); s.add_argument("--out")
    s = sub.add_parser("out"); s.add_argument("result")
    a = p.parse_args()
    {"plan": cmd_plan, "song-prompt": cmd_song_prompt, "check-prompt": cmd_check_prompt, "readback": cmd_readback,
     "retime": cmd_retime, "shots": cmd_shots, "clip-prompt": cmd_clip_prompt, "stitch": cmd_stitch,
     "lyricmap": cmd_lyricmap, "ass": cmd_ass, "cut": cmd_cut, "cutcheck": cmd_cutcheck, "out": cmd_out}[a.cmd](a)


if __name__ == "__main__":
    main()
