#!/usr/bin/env python3
"""make_ass.py: captions as an ASS file (burned by ffmpeg's libass `subtitles` filter) plus an SRT
sidecar and a JSON report. SL8-authored from the behaviour WF26-a1 records (steps 10-11); no vendor
code. Python 3.11 stdlib only.

Inputs (one of):
  --words W.json      word timings: an ai-gen envelope (raw.words), {"words": [...]}, or a list of
                      {text|word, start, end[, type, speaker_id]}; entries whose type is not "word"
                      are skipped. Times are taken as the video's own times (the standalone pass runs
                      on the final-framed video; remap_captions.py feeds this module for a cut).
  --captions C        timed captions as given: .srt, .vtt, or .json ([{start, end, text}] seconds)
Options:
  --script S          exact spoken text (txt, one line per row; [bracketed] directions dropped):
                      wording from the script, timing from the words; ignored under 0.75 similarity
  --corrections J     '[{"from":"note book","to":"Notebook"}]' phrase fixes after transcription
  --video V | --size WxH --fps F   frame size and rate (ffprobe reads V)
  --style clean|plain|karaoke|highlight|bold_pop|box|one_word|reveal|cinematic   (default clean)
  --wpc N             words per caption (default by aspect: portrait 3, square 1, landscape 4)
  --font NAME --font-size PX --color #RRGGBB --highlight #RRGGBB --stroke PX --y-offset PX --uppercase
  --ass OUT.ass  --srt OUT.srt  --json OUT.json
Exit: 0 written; 1 nothing to caption or bad input; 2 usage or a look not offered.
"""
import argparse, difflib, json, math, os, re, subprocess, sys, unicodedata

LOOKS = ["clean", "plain", "karaoke", "highlight", "bold_pop", "box", "one_word", "reveal", "cinematic"]
NOT_OFFERED = {"word_box": "not offered on this machine yet: use highlight (the spoken word in colour) or box"}
# Grouping defaults (WF26 enrichment 11, a retired source: defaults to override, not rules)
JOIN_GAP, TAIL, MIN_HOLD = 0.35, 0.15, 0.20
EMOJI = re.compile("[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF️‍⃣]")
RTL = re.compile("[֐-ࣿיִ-﷿ﹰ-﻿]")


def fail(code, msg):
    print(f"make_ass: {msg}", file=sys.stderr)
    sys.exit(code)


def norm(t):
    t = unicodedata.normalize("NFKC", t).lower()
    return re.sub(r"[^\w']+", "", t)


# ---------- inputs
def load_words(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict):
        raw = data.get("raw") if isinstance(data.get("raw"), dict) else data
        items = raw.get("words") or data.get("words") or []
    else:
        items = data
    out = []
    for w in items:
        if not isinstance(w, dict):
            continue
        if w.get("type") not in (None, "word"):
            continue
        text = str(w.get("text", w.get("word", ""))).strip()
        try:
            s, e = float(w["start"]), float(w["end"])
        except (KeyError, TypeError, ValueError):
            continue
        if not text or e < s:
            continue
        out.append({"text": text, "start": s, "end": e, "speaker": w.get("speaker_id", w.get("speaker"))})
    return out


def parse_ts(s):
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        return float(parts[0])
    except ValueError:
        return None


def clean_cue_text(t):
    t = re.sub(r"<[^>]+>", "", t)          # SRT/VTT inline tags
    t = re.sub(r"\{[^}]*\}", "", t)        # ASS override blocks
    return " ".join(t.split())


def load_captions(path):
    ext = os.path.splitext(path)[1].lower()
    with open(path, encoding="utf-8-sig") as f:
        body = f.read()
    cues = []
    if ext == ".json":
        data = json.loads(body)
        if isinstance(data, dict):
            data = data.get("captions") or data.get("cues") or []
        for c in data:
            try:
                cues.append({"start": float(c["start"]), "end": float(c["end"]), "text": clean_cue_text(str(c["text"]))})
            except (KeyError, TypeError, ValueError):
                continue
    elif ext in (".srt", ".vtt"):
        for block in re.split(r"\n\s*\n", body.replace("\r\n", "\n")):
            lines = [l for l in block.strip().split("\n") if l.strip()]
            if not lines or lines[0].startswith(("WEBVTT", "NOTE", "STYLE", "REGION")):
                continue
            ti = next((i for i, l in enumerate(lines) if "-->" in l), None)
            if ti is None:
                continue
            a, b = lines[ti].split("-->", 1)
            s, e = parse_ts(a), parse_ts(b.strip().split(" ")[0])
            text = clean_cue_text(" ".join(lines[ti + 1:]))
            if s is None or e is None or e <= s or not text:
                continue
            cues.append({"start": s, "end": e, "text": text})
    else:
        fail(1, f"{path}: timed captions must be .srt, .vtt or .json")
    cues.sort(key=lambda c: c["start"])
    return cues


def load_script(path):
    with open(path, encoding="utf-8") as f:
        body = f.read()
    body = re.sub(r"\[[^\]]*\]", " ", body)
    return [t for t in body.split() if norm(t)]


# ---------- wording
def apply_script(words, script_tokens, min_sim=0.75):
    """Wording from the script, timing from the words. Returns (words, similarity, used)."""
    a = [norm(w["text"]) for w in words]
    b = [norm(t) for t in script_tokens]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    sim = sm.ratio()
    if sim < min_sim:
        return words, round(sim, 3), False
    out = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                w = dict(words[i1 + k]); w["text"] = script_tokens[j1 + k]; out.append(w)
        elif op in ("replace", "insert"):
            if op == "replace":
                t0, t1 = words[i1]["start"], words[i2 - 1]["end"]
                spk = words[i1]["speaker"]
            else:
                t0 = out[-1]["end"] if out else (words[i1]["start"] if i1 < len(words) else 0.0)
                t1 = words[i1]["start"] if i1 < len(words) else t0 + 0.3 * (j2 - j1)
                spk = out[-1]["speaker"] if out else None
                if t1 <= t0:
                    t1 = t0 + 0.05 * (j2 - j1)
            toks = script_tokens[j1:j2]
            total = sum(len(t) for t in toks) or 1
            t = t0
            for tok in toks:
                d = (t1 - t0) * len(tok) / total
                out.append({"text": tok, "start": t, "end": t + d, "speaker": spk}); t += d
        # "delete": heard words with no script word are not captioned
    return out, round(sim, 3), True


def apply_corrections(words, corrections):
    for c in corrections:
        src = [norm(t) for t in str(c.get("from", "")).split() if norm(t)]
        dst = str(c.get("to", "")).strip()
        if not src or not dst:
            continue
        i, res = 0, []
        while i < len(words):
            if [norm(w["text"]) for w in words[i:i + len(src)]] == src:
                punct = re.search(r"[^\w']+$", words[i + len(src) - 1]["text"])   # keep trailing punctuation
                res.append({**words[i], "text": dst + (punct.group(0) if punct else ""), "end": words[i + len(src) - 1]["end"]})
                i += len(src)
            else:
                res.append(words[i]); i += 1
        words = res
    return words


def strip_emoji(text):
    new = EMOJI.sub("", text)
    return " ".join(new.split()), new != text


# ---------- frame and look
def probe_video(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,avg_frame_rate:stream_side_data=rotation", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode:
        fail(1, f"ffprobe cannot read {path}: {r.stderr.strip()[:200]}")
    s = json.loads(r.stdout)["streams"][0]
    w, h = int(s["width"]), int(s["height"])
    rot = 0
    for sd in s.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, den = (s.get("avg_frame_rate") or "30/1").split("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 30.0
    return w, h, fps or 30.0


def ass_colour(hexrgb, alpha=0):
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", hexrgb or "")
    if not m:
        fail(2, f"colour {hexrgb!r} is not #RRGGBB")
    r, g, b = m.group(1)[0:2], m.group(1)[2:4], m.group(1)[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def face_for(text):
    """Noto face for the script of the caption text (fonts-noto pack)."""
    if re.search("[぀-ヿ]", text):
        return "Noto Sans CJK JP"
    if re.search("[가-힯ᄀ-ᇿ]", text):
        return "Noto Sans CJK KR"
    if re.search("[一-鿿]", text):
        return "Noto Sans CJK SC"
    if re.search("[֐-׿]", text):
        return "Noto Sans Hebrew"
    if re.search("[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]", text):
        return "Noto Sans Arabic"
    return "Noto Sans"


def aspect_kind(w, h):
    r = w / h
    return "portrait" if r < 0.9 else ("landscape" if r > 1.1 else "square")


def default_wpc(kind, style):
    if style == "one_word":
        return 1
    if style == "bold_pop":
        return 3
    return {"portrait": 3, "square": 1, "landscape": 4}[kind]


def default_margin_v(kind, h):
    # WF26 enrichment 10 (HyperFrames caption placement): landscape 80-120 px, portrait about 600-700 px
    # from the bottom; scaled here to the frame height (1080 landscape, 1920 portrait reference).
    if kind == "portrait":
        return round(h * 650 / 1920)
    if kind == "landscape":
        return round(h * 100 / 1080)
    return round(h * 0.12)


# ---------- grouping and timing
def group_words(words, wpc, seg_key="seg"):
    caps, cur = [], []
    for w in words:
        if cur:
            prev = cur[-1]
            brk = (len(cur) >= wpc or w["start"] - prev["end"] > JOIN_GAP or w.get(seg_key) != prev.get(seg_key)
                   or re.search(r"[.!?。！？]$", prev["text"]))
            if brk:
                caps.append(cur); cur = []
        cur.append(w)
    if cur:
        caps.append(cur)
    return caps


def time_cues(cues, fps, warnings):
    """Word-built cues: hold through short gaps, a short tail after a real pause, a minimum hold, no
    overlap. Supplied cues keep their times. Then every cue is quantised to output frames
    (start/end = ceil(t*fps)); adjacent cues share one frame boundary, so none overlap or leave a gap.
    A word-built cue that would show on no frame is dropped and listed; a supplied one gets one frame."""
    for i, c in enumerate(cues):
        if c.get("given"):
            continue
        nxt = cues[i + 1]["start"] if i + 1 < len(cues) else None
        end = c["end"] + TAIL
        if nxt is not None:
            if nxt - c["end"] < JOIN_GAP:
                end = nxt
            end = min(end, nxt)
        if end - c["start"] < MIN_HOLD:
            end = c["start"] + MIN_HOLD if nxt is None else min(c["start"] + MIN_HOLD, max(nxt, c["start"]))
        c["end"] = end
    out, dropped = [], []
    last_end_f = -1
    for c in cues:
        sf, ef = math.ceil(c["start"] * fps - 1e-6), math.ceil(c["end"] * fps - 1e-6)
        sf = max(sf, last_end_f)
        if ef <= sf:
            if not c.get("given"):
                dropped.append(c["text"]); continue
            ef = sf + 1
            warnings.append(f"supplied cue '{c['text'][:30]}' is shorter than one frame: shown for one frame")
        c["sf"], c["ef"] = sf, ef
        last_end_f = ef
        out.append(c)
    return out, dropped


def cs(frame, fps):
    t = frame / fps
    c = math.floor(t * 100 + 1e-6)
    return f"{c // 360000}:{(c // 6000) % 60:02d}:{(c // 100) % 60:02d}.{c % 100:02d}"


def srt_ts(frame, fps):
    ms = round(frame / fps * 1000)
    return f"{ms // 3600000:02d}:{(ms // 60000) % 60:02d}:{(ms // 1000) % 60:02d},{ms % 1000:03d}"


def esc(t):
    return t.replace("\\", "/").replace("{", "(").replace("}", ")")


# ---------- build
def build(words=None, cues=None, *, width, height, fps, style="clean", wpc=None, font=None, font_size=None,
          color="#FFFFFF", highlight="#FFD400", stroke=3, y_offset=None, uppercase=False):
    if style in NOT_OFFERED:
        fail(2, f"look {style}: {NOT_OFFERED[style]}")
    if style not in LOOKS:
        fail(2, f"look {style} is not one of {', '.join(LOOKS)}")
    style = "clean" if style == "plain" else style
    warnings, emoji_removed = [], 0
    kind = aspect_kind(width, height)
    if cues is not None and style in ("karaoke", "highlight", "reveal"):
        warnings.append(f"look {style} needs word times; supplied captions carry cue times only, so the clean look is used")
        style = "clean"
    wpc = wpc or default_wpc(kind, style)
    if not 1 <= wpc <= 7:
        fail(2, "words per caption must be 1 to 7")
    if words is not None:
        kept = []
        for w in words:
            t, had = strip_emoji(w["text"])
            emoji_removed += had
            if t:
                kept.append({**w, "text": t})
        groups = group_words(kept, wpc)
        cues = [{"start": g[0]["start"], "end": g[-1]["end"], "words": g, "text": " ".join(x["text"] for x in g)} for g in groups]
    else:
        fixed = []
        for c in cues:
            t, had = strip_emoji(c["text"])
            emoji_removed += had
            if t:
                fixed.append({**c, "text": t, "given": True})
        cues = fixed
    if not cues:
        fail(1, "nothing to caption (no words or cues left)")
    all_text = " ".join(c["text"] for c in cues)
    face = font or face_for(all_text)
    if RTL.search(all_text) and style in ("karaoke", "highlight", "reveal"):
        warnings.append("right-to-left text with a word-timed look: review the frames, or use clean (plain)")
    spk = [w.get("speaker") for c in cues for w in c.get("words", [])]
    if len({s for s in spk if s is not None}) > 1 and style in ("karaoke", "highlight", "reveal"):
        warnings.append("several speakers: overlapping speech breaks word-timed looks; review the frames or use clean (plain)")
    cues, dropped = time_cues(cues, fps, warnings)

    base = font_size or max(20, min(150, round(0.065 * min(width, height))))
    size = {"bold_pop": round(base * 1.35), "one_word": round(base * 1.2), "cinematic": round(base * 0.7)}.get(style, base)
    size = max(20, min(150, size))
    upper = uppercase or style == "bold_pop"
    margin_v = y_offset if y_offset is not None else (round(height * 0.06) if style == "cinematic" else default_margin_v(kind, height))
    bold = 0 if style == "cinematic" else -1
    outline = {"bold_pop": stroke + 2, "cinematic": 1, "box": 10}.get(style, stroke)
    shadow = 1 if style == "cinematic" else 0
    border_style = 3 if style == "box" else 1
    prim = ass_colour(color)
    hi = ass_colour(highlight)
    outline_col = "&H80000000" if style == "box" else "&H00000000"
    second = prim
    if style == "karaoke":   # unsung text in the base colour, sung text turns to the highlight colour
        prim, second = hi, ass_colour(color)
    margin_lr = round(width * 0.06)
    lines = [
        "[Script Info]", "; written by edit-cut-reframe make_ass.py", "ScriptType: v4.00+",
        f"PlayResX: {width}", f"PlayResY: {height}", "WrapStyle: 0", "ScaledBorderAndShadow: yes", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{face},{size},{prim},{second},{outline_col},&H80000000,{bold},0,0,0,100,100,0,0,"
        f"{border_style},{outline},{shadow},2,{margin_lr},{margin_lr},{margin_v},1", "",
        "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    up = (lambda t: t.upper()) if upper else (lambda t: t)
    hi_tag = "{\\c" + hi + "&}"
    events = 0
    for c in cues:
        ws = c.get("words")
        if style == "karaoke" and ws:
            parts, t = [], c["sf"] / fps
            lead = max(0, round((ws[0]["start"] - t) * 100))
            if lead:
                parts.append("{\\k%d}" % lead)
            for i, w in enumerate(ws):
                stop = ws[i + 1]["start"] if i + 1 < len(ws) else w["end"]
                parts.append("{\\k%d}%s " % (max(1, round((stop - w["start"]) * 100)), esc(up(w["text"]))))
            lines.append(f"Dialogue: 0,{cs(c['sf'], fps)},{cs(c['ef'], fps)},Default,,0,0,0,,{''.join(parts).rstrip()}")
            events += 1
        elif style in ("highlight", "reveal") and ws:
            for i, w in enumerate(ws):
                sf = c["sf"] if i == 0 else max(c["sf"], math.ceil(w["start"] * fps - 1e-6))
                ef = c["ef"] if i + 1 == len(ws) else min(c["ef"], math.ceil(ws[i + 1]["start"] * fps - 1e-6))
                if ef <= sf:
                    continue
                if style == "highlight":
                    text = " ".join((hi_tag + esc(up(x["text"])) + "{\\r}") if j == i else esc(up(x["text"])) for j, x in enumerate(ws))
                else:
                    text = " ".join(esc(up(x["text"])) for x in ws[:i + 1])
                lines.append(f"Dialogue: 0,{cs(sf, fps)},{cs(ef, fps)},Default,,0,0,0,,{text}")
                events += 1
        else:
            lines.append(f"Dialogue: 0,{cs(c['sf'], fps)},{cs(c['ef'], fps)},Default,,0,0,0,,{esc(up(c['text']))}")
            events += 1
    srt = []
    for i, c in enumerate(cues, 1):
        srt += [str(i), f"{srt_ts(c['sf'], fps)} --> {srt_ts(c['ef'], fps)}", up(c["text"]), ""]
    report = {"look": style, "font": face, "font_size": size, "margin_v": margin_v, "words_per_caption": wpc,
              "frame": f"{width}x{height}", "fps": round(fps, 3), "aspect": kind, "captions": len(cues), "events": events,
              "caption_text": [c["text"] for c in cues], "emoji_removed": emoji_removed,
              "zero_frame_cues_dropped": dropped, "warnings": warnings,
              "cues": [{"start": round(c["sf"] / fps, 3), "end": round(c["ef"] / fps, 3), "text": up(c["text"])} for c in cues]}
    return "\n".join(lines) + "\n", "\n".join(srt), report


def write_outputs(ass, srt, report, a):
    for path, body in ((a.ass, ass), (a.srt, srt)):
        if path:
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
    if a.json:
        os.makedirs(os.path.dirname(a.json) or ".", exist_ok=True)
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=1, ensure_ascii=False)
    for w in report["warnings"]:
        print(f"WARN {w}", file=sys.stderr)
    print(json.dumps({k: report[k] for k in ("look", "font", "captions", "events", "emoji_removed", "warnings")}, ensure_ascii=False))


def add_look_args(p):
    p.add_argument("--style", default="clean")
    p.add_argument("--wpc", type=int)
    p.add_argument("--font")
    p.add_argument("--font-size", type=int)
    p.add_argument("--color", default="#FFFFFF")
    p.add_argument("--highlight", default="#FFD400")
    p.add_argument("--stroke", type=int, default=3)
    p.add_argument("--y-offset", type=int)
    p.add_argument("--uppercase", action="store_true")
    p.add_argument("--ass")
    p.add_argument("--srt")
    p.add_argument("--json")


def look_kwargs(a):
    return dict(style=a.style, wpc=a.wpc, font=a.font, font_size=a.font_size, color=a.color, highlight=a.highlight,
                stroke=a.stroke, y_offset=a.y_offset, uppercase=a.uppercase)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--words")
    src.add_argument("--captions")
    p.add_argument("--script")
    p.add_argument("--corrections")
    p.add_argument("--video")
    p.add_argument("--size")
    p.add_argument("--fps", type=float)
    add_look_args(p)
    a = p.parse_args()
    if not a.ass:
        fail(2, "--ass is required")
    if a.video:
        w, h, fps = probe_video(a.video)
    elif a.size and a.fps:
        m = re.fullmatch(r"(\d+)x(\d+)", a.size)
        if not m:
            fail(2, "--size must be WxH")
        w, h, fps = int(m.group(1)), int(m.group(2)), a.fps
    else:
        fail(2, "give --video, or --size and --fps")
    if a.fps:
        fps = a.fps
    extra = {}
    corrections = json.loads(a.corrections) if a.corrections else []
    if a.words:
        words = load_words(a.words)
        if not words:
            fail(1, f"{a.words}: no word entries with times (a transcript with text but no words cannot be timed)")
        if a.script:
            words, sim, used = apply_script(words, load_script(a.script))
            extra = {"script_similarity": sim, "script_used": used}
            if not used:
                print(f"WARN script similarity {sim} is under 0.75: the script does not match the speech and is ignored", file=sys.stderr)
        words = apply_corrections(words, corrections)
        ass, srt, report = build(words=words, width=w, height=h, fps=fps, **look_kwargs(a))
    else:
        cues = load_captions(a.captions)
        if not cues:
            fail(1, f"{a.captions}: no timed cues")
        for c in cues:
            for cor in corrections:
                c["text"] = re.sub(re.escape(cor.get("from", "")), cor.get("to", ""), c["text"], flags=re.I) if cor.get("from") else c["text"]
        ass, srt, report = build(cues=cues, width=w, height=h, fps=fps, **look_kwargs(a))
    report.update(extra)
    write_outputs(ass, srt, report, a)


if __name__ == "__main__":
    main()
