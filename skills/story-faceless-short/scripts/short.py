#!/usr/bin/env python3
"""Measured checks and params files for story-faceless-short (SL8-authored from WF35-a2).

  python3 short.py show <slug>                       print one row of references/prompts.json
  python3 short.py budget --length S --wps W [--character-key]
  python3 short.py script-check SCRIPT --length S --wps W
  python3 short.py timing --script SCRIPT --audio NARRATION (--words WORDS_JSON | --local --language en)
                          [--tail 1.0] --out TIMING_JSON
  python3 short.py plan-check --plan SHOT_PLAN_JSON --timing TIMING_JSON [--landed] [--cut-tol 0.1] [--sum-tol 0.25]
  python3 short.py selftest                          fill the prompt rows with plain values and expect params to pass
  python3 short.py params --kind key|frame|clip --plan SHOT_PLAN_JSON [--n N] --prompt-file F --out PARAMS_JSON
  python3 short.py params --kind tts --script SCRIPT [--voice Brian] [--language-code xx] --out PARAMS_JSON
  python3 short.py params --kind stt [--language-code eng] [--keyterms 'Term,Name'] --out PARAMS_JSON

Every command prints JSON figures, then FAIL or WARN lines on stderr. Exit: 0 pass; 1 a check failed
(nothing written by params or timing); 2 bad input or a missing tool. It prints figures, never a
verdict on taste: the section 8 items a script cannot count stay with the agent and the customer.
Python 3.11 standard library; faster-whisper only for timing --local (baked, never fetched).
"""
import argparse, difflib, json, math, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(HERE, "..", "references", "prompts.json")

# The vendor's word budget at 3.1 words/s (prompts.json word-budget) and clip counts (pacing check).
BUDGET_31 = {20: (60, 65), 25: (75, 80), 30: (90, 95), 35: (105, 110), 40: (120, 125), 50: (150, 155)}
CLIPS = {20: (6, 8), 30: (8, 12), 40: (11, 15), 50: (13, 18)}
BANNED_LOOK = re.compile(r"\b(stylized|stylised|feature[- ]film|luminous|glowing|volumetric|sparkling|magical|cinematic)\b", re.I)
SLOW = re.compile(r"\b(slowly|gently|gradually)\b", re.I)
LOUD = re.compile(r"\b(loud|huge|booming|explosions?|dramatic|epic)\b", re.I)
IN_CLIP_CUT = re.compile(r"\b(cut to|cuts to|then cut|hard cut|jump cut)\b", re.I)
OPENERS_BANNED = ["turns out", "that's because", "basically", "here's the thing", "fun fact", "interestingly"]
FIRST_PERSON = re.compile(r"\b(i|i'm|i've|i'd|me|my|mine|we|we're|our|ours)\b", re.I)
GREETING = re.compile(r"^\s*(hi|hey|hello|welcome|what's up|today we)\b", re.I)
CTA = re.compile(r"\b(subscribe|follow (me|us|for)|like and|comment below|link in (the )?(bio|description)|smash that)\b", re.I)
FINAL = re.compile(r"[.!?…][\"'”’)\]]*$")
CLAUSE = re.compile(r"[,;:—–-][\"'”’)\]]*$")
problems, warnings = [], []


def fail(msg):
    problems.append(msg)


def warn(msg):
    warnings.append(msg)


def finish(figures):
    print(json.dumps(figures, indent=1, ensure_ascii=False))
    for w in warnings:
        print(f"WARN {w}", file=sys.stderr)
    for p in problems:
        print(f"FAIL {p}", file=sys.stderr)
    sys.exit(1 if problems else 0)


def die(msg, code=2):
    print(f"FAIL {msg}", file=sys.stderr)
    sys.exit(code)


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        die(f"cannot read {path}: {e}")


def rows():
    return {r["slug"]: r for r in load_json(PROMPTS)["rows"]}


def norm(tok):
    return re.sub(r"\W+", "", tok.casefold())


def nearest(table, length):
    return min(table, key=lambda k: (abs(k - length), k))


def budget_words(length, wps):
    r = nearest(BUDGET_31, length)
    lo, hi = BUDGET_31[r]
    scale = (length / r) * (wps / 3.1)
    return math.floor(lo * scale), math.ceil(hi * scale)


def clip_range(length):
    keys = sorted(CLIPS)
    if length <= keys[0]:
        return CLIPS[keys[0]]
    if length >= keys[-1]:
        return CLIPS[keys[-1]]
    for a, b in zip(keys, keys[1:]):
        if a <= length <= b:
            f = (length - a) / (b - a)
            return (round(CLIPS[a][0] + f * (CLIPS[b][0] - CLIPS[a][0])), round(CLIPS[a][1] + f * (CLIPS[b][1] - CLIPS[a][1])))


def cmd_show(a):
    r = rows().get(a.slug)
    if not r:
        die(f"no row '{a.slug}'; rows: {', '.join(rows())}")
    print(f"# {r['slug']} ({r['use']})\n{r['prompt']}")


def cmd_budget(a):
    lo, hi = budget_words(a.length, a.wps)
    n = max(1, round(a.length / 3))
    finish({"length_s": a.length, "wps": a.wps, "words": [lo, hi], "seconds_at_wps": [round(lo / a.wps, 1), round(hi / a.wps, 1)],
            "clips_check": list(clip_range(a.length)), "hook_clips_in_first_5s": [1, 3],
            "estimate": {"tts": 1, "transcription": 1, "style_key": 1, "start_frames": n if a.character_key else n - 1,
                         "renders": n, "rendered_s_assumed": n * max(4, math.ceil(a.length / n - 1e-6)), "redo_allowance": {"frames": n if a.character_key else n - 1, "renders": n}},
            "note": "a clip under 4 s still renders 4 s (and is paid for), so rendered_s_assumed is the figure to quote; counts are a check, not a quota; the shot plan sets the real numbers"})


def script_tokens(text):
    return [t for t in re.split(r"\s+", text.strip()) if t]


def sentences(tokens):
    out, cur = [], []
    for i, t in enumerate(tokens):
        cur.append(i)
        if FINAL.search(t):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def cmd_script_check(a):
    with open(a.script, encoding="utf-8") as f:
        text = f.read()
    toks = script_tokens(text)
    n = len(toks)
    lo, hi = budget_words(a.length, a.wps)
    if not lo <= n <= hi:
        fail(f"{n} words; the budget for {a.length} s at {a.wps} w/s is {lo}-{hi}")
    if re.search(r"[\u2014\u2013]", text):
        fail("em or en dash found: write two sentences or use a comma (a dash joins two words the transcript splits)")
    if re.search(r"\w-\w", text):
        warn("hyphen compound found: the transcript may split it; write it as two words if the timing check under-matches")
    if re.search(r"\d", text):
        fail("numerals found: write numbers as words so the transcript aligns with the script")
    if re.search(r"[\[\]{}]|^\s*[A-Z][A-Z ]{2,}:", text, re.M):
        fail("stage directions or labels found: script.txt holds narration only")
    low = text.casefold().replace("’", "'")
    for p in OPENERS_BANNED:
        if p in low:
            fail(f"banned phrase '{p}'")
    fp = sorted({m.group(0).lower() for m in FIRST_PERSON.finditer(text)})
    if fp:
        fail(f"first person: {', '.join(fp)}")
    if GREETING.search(text):
        fail("opens with a greeting")
    if CTA.search(text):
        fail("call to action found")
    you_see = len(re.findall(r"\byou see\b", low))
    if you_see > 1:
        fail(f"'You see' used {you_see} times (once per script)")
    sents = sentences(toks)
    first = len(sents[0]) if sents else 0
    words15 = " ".join(toks[:15])
    if first and not 6 <= first <= 12:
        warn(f"first sentence has {first} words; the hook is about 9 (6-12) in the first 3 s")
    finish({"words": n, "budget": [lo, hi], "est_seconds": round(n / a.wps, 1), "sentences": len(sents),
            "first_sentence_words": first, "first_15_words": words15, "you_see": you_see,
            "number_words": len(re.findall(r"\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion)\b", low)),
            "not_measured": "reading level, real flip, one answer, hook shape, turn at ~30%, picture per clause, one cast, payoff last: the agent's checklist"})


def stt_words(path):
    data = load_json(path)
    if isinstance(data, dict):
        raw = data.get("raw") if isinstance(data.get("raw"), dict) else {}
        words = raw.get("words") or data.get("words") or (data.get("data") or {}).get("words") or []
    else:
        words = data
    out = []
    for w in words:
        if not isinstance(w, dict) or w.get("type", "word") != "word":
            continue
        t = str(w.get("text") or w.get("word") or "").strip()
        if t and w.get("start") is not None and w.get("end") is not None:
            out.append({"text": t, "start": float(w["start"]), "end": float(w["end"])})
    return out


def local_words(audio, language, model):
    try:
        from faster_whisper import WhisperModel
    except Exception as e:  # noqa: BLE001
        die(f"faster-whisper is not importable ({e}); use the Scribe v2 words file")
    try:  # weights are baked at build; never fetched (HR21)
        m = WhisperModel(model, device="cpu", compute_type="int8", local_files_only=True)
    except Exception as e:  # noqa: BLE001
        die(f"faster-whisper weights for '{model}' are not on disk ({e})")
    segs, _ = m.transcribe(audio, language=language, vad_filter=True, condition_on_previous_text=False, beam_size=5, word_timestamps=True)
    return [{"text": w.word.strip(), "start": float(w.start), "end": float(w.end)} for s in segs for w in (s.words or []) if w.word.strip()]


def probe_duration(path):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception as e:  # noqa: BLE001
        die(f"ffprobe could not read {path}: {e}")


def cmd_timing(a):
    with open(a.script, encoding="utf-8") as f:
        toks = script_tokens(f.read())
    if not toks:
        die("empty script")
    if a.local:
        stt, provider = local_words(a.audio, a.language, a.model), f"faster-whisper/{a.model}"
    elif a.words:
        stt, provider = stt_words(a.words), "words file (type == word only)"
    else:
        die("give --words <Scribe v2 envelope> or --local --language <xx>")
    if not stt:
        die("the transcript has no timed words: a failed transcription; never spread the script over the audio", 1)
    dur = probe_duration(a.audio)
    sn, tn = [norm(t) for t in toks], [norm(w["text"]) for w in stt]
    times = [None] * len(toks)
    used, hit = set(), set()
    for blk in difflib.SequenceMatcher(None, sn, tn, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (stt[blk.b + k]["start"], stt[blk.b + k]["end"])
            used.add(blk.b + k)
            hit.add(blk.a + k)
    matched = len(hit)
    i = 0
    while i < len(toks):  # unmatched runs: spread evenly between the neighbours (the source's fallback)
        if times[i]:
            i += 1
            continue
        j = i
        while j < len(toks) and not times[j]:
            j += 1
        left = times[i - 1][1] if i > 0 else (stt[0]["start"] if j >= len(toks) else max(0.0, times[j][0] - 0.3 * (j - i)))
        right = times[j][0] if j < len(toks) else stt[-1]["end"]
        step = max(0.0, right - left) / (j - i)
        for k in range(i, j):
            times[k] = (left + step * (k - i), left + step * (k - i + 1))
        i = j
    words = [{"i": k, "text": t, "start": round(times[k][0], 3), "end": round(times[k][1], 3), "matched": k in hit} for k, t in enumerate(toks)]
    sents = []
    for n, idx in enumerate(sentences(toks), 1):
        sents.append({"n": n, "text": " ".join(toks[x] for x in idx), "first_word": idx[0], "last_word": idx[-1],
                      "start": words[idx[0]]["start"], "end": words[idx[-1]]["end"]})
    speech_start, speech_end = words[0]["start"], words[-1]["end"]
    target = round(max(dur, speech_end + a.tail), 3)
    cov = matched / len(toks)
    if speech_start > 0.15:
        warn(f"speech starts at {speech_start:.2f} s (over 0.15 s): the first word will not play on the first frame; trim the lead silence (step 9) and record the words again")
    if cov < a.min_coverage:
        fail(f"only {cov:.0%} of script words matched the transcript (minimum {a.min_coverage:.0%}): wrong audio or a failed transcription")
    out = {"durationSeconds": round(dur, 3), "speechStartSeconds": speech_start, "speechEndSeconds": speech_end,
           "tailSilenceSeconds": round(dur - speech_end, 3), "targetSeconds": target, "tail_rule_s": a.tail,
           "script_words": len(toks), "matched_words": matched, "coverage": round(cov, 3),
           "stt_extra_words": len(stt) - len(used), "measured_wps": round(len(toks) / dur, 3),
           "speech_wps": round(len(toks) / max(0.01, speech_end - speech_start), 3), "provider": provider,
           "sentenceEnds": [s["end"] for s in sents],
           "beatEnds": [w["end"] for w in words if CLAUSE.search(w["text"]) or FINAL.search(w["text"])],
           "sentences": sents, "words": words}
    if not problems:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1, ensure_ascii=False)
    finish({k: v for k, v in out.items() if k not in ("words", "sentences")} | {"out": a.out if not problems else None})


def render_duration(planned):
    return max(4, math.ceil(planned - 1e-6))


def clip_file(plan_path, c):
    """The clip's file: its `file`, else the first clip-NN/*.mp4 the download step left beside clips/."""
    import glob
    if c.get("file"):
        return c["file"]
    base = os.path.join(os.path.dirname(os.path.abspath(plan_path)), "clips", f"clip-{c.get('n', 0):02d}")
    hits = sorted(glob.glob(os.path.join(base, "*.mp4")))
    return hits[0] if hits else None


def cmd_plan_check(a):
    plan, tim = load_json(a.plan), load_json(a.timing)
    clips = sorted(plan.get("clips", []), key=lambda c: c.get("n", 0))
    words = tim.get("words", [])
    target = float(tim.get("targetSeconds") or tim.get("durationSeconds") or 0)
    places = plan.get("places", {})
    if not clips:
        die("shot plan has no clips")
    t, last_fw, rows_out, hook = 0.0, -1, [], 0
    for c in clips:
        n, ln, st = c.get("n"), float(c.get("planned_len_s", 0)), float(c.get("start_s", -1))
        if abs(st - t) > 0.02:
            fail(f"clip {n}: start_s {st} but the clips before end at {round(t, 3)} (clips are contiguous)")
        if not 1.0 <= ln <= 10.0:
            fail(f"clip {n}: planned_len_s {ln} outside 1-10 s")
        rd = render_duration(ln)
        if rd > 15:
            fail(f"clip {n}: render duration {rd} s over the route's 15 s")
        fw = c.get("first_word")
        if not isinstance(fw, int) or not 0 <= fw < len(words):
            fail(f"clip {n}: first_word {fw} is not an index into timing.json words")
        else:
            if n == clips[0].get("n") and fw != 0:
                fail(f"clip {n}: the first clip starts at word 0, not {fw}")
            if fw <= last_fw:
                fail(f"clip {n}: first_word {fw} does not move past clip before ({last_fw})")
            if n != clips[0].get("n") and abs(st - words[fw]["start"]) > a.cut_tol:
                fail(f"clip {n}: cut at {st} s but its word '{words[fw]['text']}' starts at {words[fw]['start']} s (tolerance {a.cut_tol})")
            last_fw = fw
        if a.landed:
            f = clip_file(a.plan, c)
            if not f or not os.path.exists(f):
                fail(f"clip {n}: no landed file (set shot_plan.json clip 'file' at step 17)")
            elif not c.get("file"):
                fail(f"clip {n}: 'file' is empty in shot_plan.json; set it to {f}")
        p = places.get(c.get("place"))
        if not p:
            fail(f"clip {n}: place '{c.get('place')}' is not in places")
        else:
            for k in ("set_line", "sound_bg", "time_of_day"):
                if not str(p.get(k, "")).strip():
                    fail(f"place '{c.get('place')}': {k} is empty")
            if LOUD.search(str(p.get("sound_bg", ""))):
                fail(f"place '{c.get('place')}': loud word in the background sound")
        snd = c.get("sounds", [])
        for s in snd:
            ts = float(s.get("t", -1))
            if ts < 0.3:
                fail(f"clip {n}: sound '{s.get('what')}' at {ts} s, before 0.3 s")
            if ts > ln - 0.5:
                fail(f"clip {n}: sound '{s.get('what')}' at {ts} s, inside the last half second of {ln} s")
            if LOUD.search(str(s.get("what", ""))):
                fail(f"clip {n}: loud word in sound '{s.get('what')}'")
        if len(snd) > 2 * ln:
            fail(f"clip {n}: {len(snd)} sounds in {ln} s (one or two a second at most)")
        if st < 5.0:
            hook += 1
        rows_out.append({"n": n, "start_s": st, "planned_len_s": ln, "render_s": rd, "place": c.get("place"), "sounds": len(snd)})
        t = st + ln
    if abs(t - target) > a.sum_tol:
        fail(f"clip lengths sum to {round(t, 3)} s; the target is {target} s (tolerance {a.sum_tol})")
    length = float(plan.get("length_s") or target)
    lo, hi = clip_range(length)
    if not lo <= len(clips) <= hi:
        warn(f"{len(clips)} clips; {lo}-{hi} is usual for {round(length)} s (a check, not a quota)")
    if not 1 <= hook <= 3:
        warn(f"{hook} clips start in the first 5 s (usually 1-3)")
    if any(c.get("people") for c in clips) and not str(plan.get("character_line", "")).strip() and plan.get("key", {}).get("kind") != "none":
        fail("a clip shows the star but character_line is empty")
    tods = {}
    for c in clips:
        p = places.get(c.get("place")) or {}
        tods.setdefault(c.get("place"), set()).add(p.get("time_of_day"))
    finish({"clips": len(clips), "sum_s": round(t, 3), "target_s": target, "speech_end_s": tim.get("speechEndSeconds"),
            "last_word_to_end_s": round(target - float(tim.get("speechEndSeconds") or 0), 3), "hook_clips": hook,
            "clips_check": [lo, hi], "renders_total_s": sum(r["render_s"] for r in rows_out), "rows": rows_out})


STEP_STAMP = r"\b\d+(?:\.\d+)?\s*-\s*(?:\{|\d)"


def strip_camera(text):
    """Exempt only the Camera sentence block: it ends at the first timed-step stamp (0.0-2.1s)."""
    return re.sub(r"Camera:.*?(?=" + STEP_STAMP + r"|$)", " ", text, flags=re.S)


def cmd_params(a):
    if a.kind in ("tts", "stt"):
        return speech_params(a)
    if not a.plan or not a.prompt_file:
        die("--kind key, frame and clip need --plan and --prompt-file")
    plan = load_json(a.plan)
    with open(a.prompt_file, encoding="utf-8") as f:
        prompt = f.read().strip()
    if len(prompt) >= 2500:
        fail(f"prompt is {len(prompt)} characters (under 2,500): shorten SET and SHOT, never PEOPLE or LIGHT")
    for m in BANNED_LOOK.finditer(prompt):
        fail(f"look-breaking word '{m.group(0)}'")
    clip = None
    if a.kind in ("frame", "clip"):
        clip = next((c for c in plan.get("clips", []) if c.get("n") == a.n), None)
        if clip is None:
            die(f"--n {a.n} is not a clip in the plan")
    line = str(plan.get("character_line", "")).strip()
    needs_line = line and (a.kind == "key" and plan.get("key", {}).get("kind") != "none" or (clip and clip.get("people")))
    if needs_line and line not in prompt:
        fail("the character line is not in the prompt word for word")
    need_no_text = "No subtitles, captions, labels, text" if a.kind == "clip" else "No text, lettering"
    if need_no_text.casefold() not in prompt.casefold():
        fail(f"the prompt lacks the row's '{need_no_text}' clause")
    if a.kind == "clip":
        closing = rows()["sound-closing"]["prompt"]
        if closing not in prompt:
            fail(f"the prompt does not contain the closing sound line: {closing}")
        if "Camera:" not in prompt:
            fail("no 'Camera:' sentence: the camera move is its own sentence before the timed steps")
        if not re.search(STEP_STAMP, prompt):
            fail("no timed step stamp (0.0-2.1s): the Camera sentence must end where the timed steps start")
        for m in SLOW.finditer(strip_camera(prompt)):
            fail(f"'{m.group(0)}' outside the Camera line (slow-motion trigger; only the camera may move slowly)")
        snd = prompt.split("Sound:", 1)[1] if "Sound:" in prompt else ""
        for m in LOUD.finditer(snd):
            fail(f"loud word '{m.group(0)}' in the sound line")
        if IN_CLIP_CUT.search(prompt):
            fail("a cut is asked for inside the clip: cuts belong to the stitch")
        rd = render_duration(float(clip["planned_len_s"]))
        params = {"prompt": prompt, "duration": str(rd), "resolution": "720p", "aspect_ratio": "9:16", "generate_audio": True}
        declared = {"aspect": "9:16", "width": 720, "height": 1280, "duration_s": rd, "audio": "on"}
    else:
        params = {"prompt": prompt, "aspect_ratio": "9:16", "resolution": "2K", "num_images": 1,
                  "limit_generations": True, "enable_web_search": False, "safety_tolerance": "4"}
        declared = {"aspect": "9:16", "format": "png"}
    if not problems:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(params, f, indent=1, ensure_ascii=False)
    finish({"out": a.out if not problems else None, "chars": len(prompt), "declared": declared,
            **({"duration": params["duration"]} if a.kind == "clip" else {})})


def speech_params(a):
    """HR4: every default-on field pinned; values from the media-audio-generation facts rows."""
    if a.kind == "tts":
        if not a.script:
            die("--kind tts needs --script")
        with open(a.script, encoding="utf-8") as f:
            text = " ".join(f.read().split())
        if not text:
            die("empty script")
        params = {"text": text, "voice": a.voice, "stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "speed": 1.0,
                  "apply_text_normalization": "on"}
        if a.language_code:
            params["language_code"] = a.language_code
        figures = {"words": len(text.split()), "chars": len(text), "voice": a.voice}
    else:
        params = {"language_code": a.language_code or "eng", "diarize": False, "tag_audio_events": False}
        if a.keyterms:
            params["keyterms"] = [k.strip() for k in a.keyterms.split(",") if k.strip()][:100]
        figures = {"language_code": params["language_code"], "keyterms": len(params.get("keyterms", []))}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(params, f, indent=1, ensure_ascii=False)
    finish({"out": a.out, **figures})


def cmd_selftest(a):
    """Fill each template row's slots with plain words and run the same checks params runs (R1: template and gate agree)."""
    import tempfile
    d = tempfile.mkdtemp()
    plan = {"character_line": "A thirty year old man", "key": {"kind": "clip1"},
            "clips": [{"n": 1, "planned_len_s": 3, "people": True}]}
    pp = os.path.join(d, "plan.json")
    json.dump(plan, open(pp, "w"))
    bad = 0
    for kind, slug in (("clip", "video-template"), ("frame", "look-template")):
        t = rows()[slug]["prompt"]
        t = t.replace("{closing line from row sound-closing}", rows()["sound-closing"]["prompt"])
        t = re.sub(r"\{(?:N|t\d)\}", "3", t)
        t = re.sub(r"\{[^{}]*\}", "A thirty year old man", t)
        pf = os.path.join(d, kind + ".txt")
        open(pf, "w").write(t)
        r = subprocess.run([sys.executable, os.path.abspath(__file__), "params", "--kind", kind, "--plan", pp, "--n", "1",
                            "--prompt-file", pf, "--out", os.path.join(d, kind + ".json")], capture_output=True, text=True)
        print(f"{slug}: exit {r.returncode} {r.stderr.strip()[:300]}")
        bad += r.returncode != 0
    sys.exit(1 if bad else 0)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("show"); s.add_argument("slug")
    s = sub.add_parser("budget"); s.add_argument("--length", type=float, required=True); s.add_argument("--wps", type=float, required=True); s.add_argument("--character-key", action="store_true")
    s = sub.add_parser("script-check"); s.add_argument("script"); s.add_argument("--length", type=float, required=True); s.add_argument("--wps", type=float, required=True)
    s = sub.add_parser("timing"); s.add_argument("--script", required=True); s.add_argument("--audio", required=True); s.add_argument("--words")
    s.add_argument("--local", action="store_true"); s.add_argument("--language"); s.add_argument("--model", default="small")
    s.add_argument("--tail", type=float, default=1.0); s.add_argument("--min-coverage", type=float, default=0.85); s.add_argument("--out", required=True)
    s = sub.add_parser("plan-check"); s.add_argument("--plan", required=True); s.add_argument("--timing", required=True)
    s.add_argument("--landed", action="store_true"); s.add_argument("--cut-tol", type=float, default=0.1); s.add_argument("--sum-tol", type=float, default=0.25)
    s = sub.add_parser("params"); s.add_argument("--kind", choices=["key", "frame", "clip", "tts", "stt"], required=True); s.add_argument("--plan")
    s.add_argument("--n", type=int); s.add_argument("--prompt-file"); s.add_argument("--out", required=True)
    s.add_argument("--script"); s.add_argument("--voice", default="Brian"); s.add_argument("--language-code"); s.add_argument("--keyterms")
    sub.add_parser("selftest")
    a = p.parse_args()
    {"show": cmd_show, "budget": cmd_budget, "script-check": cmd_script_check, "timing": cmd_timing,
     "plan-check": cmd_plan_check, "params": cmd_params, "selftest": cmd_selftest}[a.cmd](a)


if __name__ == "__main__":
    main()
