#!/usr/bin/env python3
"""Explainer markup checks for motion-doc-explainer (SL8-authored; standard library, Pillow for register).

  python3 preflight.py check <job>            join chunks/*.xml into document.xml and check it (exit 0 ok, 1 issues)
  python3 preflight.py check --fixture        check references/fixture.xml (the regression fixture)
  python3 preflight.py says <job> [--voice V] write <job>/says.json: one row per say, spoken text and links;
                                              with --voice, also audio/say-NN.params.json for the TTS call
  python3 preflight.py anim <job>             write each animation item's Python scene to <job>/anim/<anchor>.py
  python3 preflight.py register <job> <file>...   copy customer pictures into assets/ as att-NN (limits enforced)
  python3 preflight.py excerpt <file> <a> <b>     print lines a..b of a file byte-exact (for CDATA excerpts)

<job> is work/<project>/ holding config.json, style.txt, chunks/, assets/manifest.json.
The rules are restated in references/markup-grammar.md; every check prints the rule it applies.
"""
import json, os, re, shutil, sys
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
CLOSING = "No text, lettering or labels anywhere in the image."
FIXTURE_STYLE = "Soft gouache illustration, muted blue and amber palette, gentle window light"
FIXTURE_CONFIG = {"mode": "square", "lang": "en-GB", "title": "Token bucket rate limiting",
                  "description": "How a token bucket limiter decides which requests pass, shown through its code, one small refactor, a picture and a four-part view."}
TYPES = {"code", "diff", "image", "infographic", "animation", "diagram", "math"}
NOT_OFFERED = {"diagram": "Mermaid", "math": "KaTeX"}
LAYOUTS = {"ul", "ol", "cards"}
FORBIDDEN_TAGS = {"narrate", "fetch", "insert", "move", "update", "delete", "patch", "code", "diagram", "math", "image", "prop"}
TOP_TAGS = {"item", "say", "followup"}
BANNED_OPENERS = ("welcome", "today we", "in this explainer", "let's", "lets ")
STOCK = ["heavy lifting", "secret sauce", "superpower", "magic", "unlock", "seamless", "game-changer",
         "game changer", "buckle up", "dive in", "dive into"]
# frame: (code lines, code width, diff lines per side, diff width)
FRAME = {"square": (15, 60, 10, 49), "portrait": (15, 39, 8, 39), "landscape": (20, 80, 14, 49)}
LINK_RE = re.compile(r"\[([^\]]+)\]\(#([A-Za-z0-9_.-]+)(?::L(\d+)(?:-(\d+))?)?(?:\s+'([^']*)')?\)")
RAW_LINK_RE = re.compile(r"\]\(#([^)]*)\)")
EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿]")
WORDS_PER_SECOND_MEASURED = 2.82  # facts rate-brian-ml2 (unverified on SL8); 150 wpm = 2.5 w/s is the kit's planning rate
MAX_UPLOAD = 8 * 1024 * 1024


def spoken(text):
    return LINK_RE.sub(lambda m: m.group(1), text or "")


def nwords(text):
    return len([w for w in re.split(r"\s+", spoken(text).strip()) if w])


def links(text):
    out = []
    for m in LINK_RE.finditer(text or ""):
        out.append({"label": m.group(1), "target": m.group(2),
                    "line_start": int(m.group(3)) if m.group(3) else None,
                    "line_end": int(m.group(4)) if m.group(4) else (int(m.group(3)) if m.group(3) else None),
                    "selector": m.group(5), "char_start": m.start()})
    return out


def body_lines(el):
    t = el.text or ""
    if t.startswith("\r\n"):
        t = t[2:]
    elif t.startswith("\n"):
        t = t[1:]
    return t.rstrip().split("\n") if t.strip() else []


def read_job(job, fixture):
    if fixture:
        with open(os.path.join(HERE, "..", "references", "fixture.xml"), encoding="utf-8") as f:
            return FIXTURE_CONFIG, FIXTURE_STYLE, [("references/fixture.xml", f.read())], {"assets": []}
    cfg = json.load(open(os.path.join(job, "config.json"), encoding="utf-8"))
    sp = os.path.join(job, "style.txt")
    style = open(sp, encoding="utf-8").read().strip() if os.path.exists(sp) else None
    cdir = os.path.join(job, "chunks")
    chunks = [(os.path.join("chunks", n), open(os.path.join(cdir, n), encoding="utf-8").read())
              for n in sorted(os.listdir(cdir)) if n.endswith(".xml")] if os.path.isdir(cdir) else []
    mp = os.path.join(job, "assets", "manifest.json")
    man = json.load(open(mp, encoding="utf-8")) if os.path.exists(mp) else {"assets": []}
    return cfg, style, chunks, man


def parse_fragment(text):
    return ET.fromstring("<root>" + text + "</root>")


def parse_document(path):
    return parse_fragment(open(path, encoding="utf-8").read())


def slides_and_says(root):
    """Top-level items with the says that follow each (until the next item or followup)."""
    out, cur = [], None
    for node in root:
        if node.tag == "item":
            cur = {"item": node, "says": []}
            out.append(cur)
        elif node.tag == "say" and cur is not None:
            cur["says"].append(node)
    return out


def anchors(root):
    found = {}
    for el in root.iter("item"):
        a = el.get("anchor")
        if a:
            found.setdefault(a, []).append(el)
    return found


def check(job, fixture):
    """Run the checks; on a real job a pass leaves .check-ok (says and anim refuse to run without a fresh one)."""
    mk = None if fixture else os.path.join(job, ".check-ok")
    if mk and os.path.exists(mk):
        os.remove(mk)
    rc = _check(job, fixture)
    if rc == 0 and not fixture:
        open(mk, "w").write("ok\n")
    return rc


def _check(job, fixture):
    issues, warns = [], []
    I = lambda rule, msg: issues.append(f"[{rule}] {msg}")
    W = lambda rule, msg: warns.append(f"[{rule}] {msg}")
    cfg, style, chunks, man = read_job(job, fixture)
    mode = cfg.get("mode")
    if mode not in FRAME:
        I("frame", f"config.json mode must be square, portrait or landscape, not {mode!r}")
        mode = "square"
    if not re.fullmatch(r"[a-z]{2}-[A-Z]{2}", str(cfg.get("lang", ""))):
        I("language", "config.json lang must look like en-US")
    if len(cfg.get("title", "")) >= 45:
        I("title", f"config.json title is {len(cfg.get('title', ''))} characters (under 45)")
    dl = len(cfg.get("description", ""))
    if not 120 <= dl <= 160:
        I("title", f"config.json description is {dl} characters (120-160)")
    if not chunks:
        I("chunks", "no chunks/*.xml")
        return report(issues, warns, {})
    total, broken = 0, False
    for name, text in chunks:
        b = len(text.encode("utf-8"))
        total += b
        if b > 64000:
            I("budget", f"{name} is {b} bytes (at most 64,000 per chunk)")
        if re.search(r"<!DOCTYPE|<!ENTITY", text, re.I):
            I("safety", f"{name} declares a DOCTYPE or ENTITY; remove it")
            broken = True
            continue
        if re.search(r"```", text):
            I("safety", f"{name} holds a markdown fence; chunks are markup only")
        try:
            parse_fragment(text)
        except ET.ParseError as e:
            I("safety", f"{name} is not a complete well-formed fragment: {e}")
            broken = True
    if total > 512000:
        I("budget", f"document is {total} bytes (at most 512,000)")
    if broken:
        return report(issues, warns, {"bytes_total": total})
    doc = "\n".join(t for _, t in chunks)
    if not fixture:
        with open(os.path.join(job, "document.xml"), "w", encoding="utf-8") as f:
            f.write(doc)
    root = parse_fragment(doc)
    nodes = list(root)
    anc = anchors(root)
    for a, els in anc.items():
        if len(els) > 1:
            I("anchors", f"anchor {a!r} is used {len(els)} times")
    for el in root.iter():
        if el.tag in FORBIDDEN_TAGS:
            I("tags", f"<{el.tag}> is not part of the grammar")
    for n in nodes:
        if n.tag not in TOP_TAGS:
            I("tags", f"top-level <{n.tag}>: only item, say and followup")
    if not nodes or nodes[0].tag != "item":
        I("intro", "the first node must be the intro item")
        return report(issues, warns, {})

    # intro
    intro = nodes[0]
    if intro.get("type") or intro.get("layout") or len(list(intro)):
        I("intro", "the intro is a plain item: no type, no layout, no children")
    if len(intro.get("title", "")) >= 45:
        I("intro", f"intro title is {len(intro.get('title', ''))} characters (under ~45)")
    it = intro.get("text", "")
    if len(it) >= 120 or len(re.findall(r"[.!?](\s|$)", it)) > 1:
        I("intro", "intro text is one plain sentence under ~120 characters")
    if len(EMOJI_RE.findall(intro.get("title", ""))) > 1:
        I("emoji", "at most one emoji on the intro title")

    # follow-ups
    fus = [n for n in nodes if n.tag == "followup"]
    if len(fus) != 2 or [n.tag for n in nodes[-2:]] != ["followup", "followup"]:
        I("followups", "exactly two <followup prompt> nodes, as the last two nodes")
    for f in fus:
        p = f.get("prompt", "")
        if not p or len(p) >= 80 or len(list(f)) or (f.text or "").strip():
            I("followups", f"followup {p!r}: a prompt under ~80 characters, self-closing")
    if len(fus) == 2 and fus[0].get("prompt", "").strip().lower() == fus[1].get("prompt", "").strip().lower():
        I("followups", "the two follow-ups must differ")

    # says
    says = [n for n in nodes if n.tag == "say"]
    langs = set()
    for i, s in enumerate(says):
        keys = list(s.attrib.keys())
        if not keys or keys[0] != "lang":
            I("say", f"say {i + 1}: lang is the first attribute")
        lang = s.get("lang", "")
        langs.add(lang)
        if not re.fullmatch(r"[a-z]{2}-[A-Z]{2}", lang):
            I("say", f"say {i + 1}: lang {lang!r} must look like en-US")
        t = s.get("text", "")
        if not re.match(r"^\[[^\]]+\]\(#", t):
            I("say", f"say {i + 1}: must open with a link to its section")
        if EMOJI_RE.search(t):
            I("emoji", f"say {i + 1}: no emoji in narration")
        for raw in RAW_LINK_RE.findall(t):
            if raw.count("'") > 2:
                I("refs", f"say {i + 1}: a selector holds an apostrophe ({raw!r}); pick another selector")
        low = spoken(t).lower()
        for w in STOCK:
            if re.search(r"\b" + re.escape(w) + r"\b", low):
                W("phrasing", f"say {i + 1}: stock phrase {w!r}")
    if len(langs) > 1:
        I("language", f"says use more than one language-region code: {sorted(langs)}")
    if says and cfg.get("lang") and langs and langs != {cfg["lang"]}:
        I("language", f"says use {sorted(langs)}, config.json says {cfg['lang']}")
    # first say
    if len(nodes) < 2 or nodes[1].tag != "say":
        I("intro", "the intro is followed by its first say")
    else:
        fs = nodes[1].get("text", "")
        if nwords(fs) > 12:
            I("intro", f"first say is {nwords(fs)} words (about ten)")
        if any(l["target"] != intro.get("anchor") for l in links(fs)):
            I("intro", "the first say links only the intro")
        lab = re.sub(r"^\W+", "", spoken(fs).lower())
        if lab.startswith(BANNED_OPENERS):
            I("intro", "the first say does not open with Welcome, Today we, In this explainer or Let's")

    # every top-level item is followed by a say
    for i, n in enumerate(nodes):
        if n.tag == "item" and (i + 1 >= len(nodes) or nodes[i + 1].tag != "say"):
            I("narration", f"item {n.get('anchor')!r} is not followed by a say")

    style_ok = style is not None and style.strip() and "\n" not in style.strip()
    generated = 0
    image_anchors_seen = []
    quadrant_links = {}
    groups = slides_and_says(root)
    lim = FRAME[mode]
    for gi, g in enumerate(groups):
        el = g["item"]
        a = el.get("anchor") or f"#{gi + 1}"
        keys = list(el.attrib.keys())
        typ, lay = el.get("type"), el.get("layout")
        if not el.get("anchor"):
            I("anchors", f"slide {gi + 1} has no anchor")
        if typ and keys[0] != "type":
            I("attrs", f"{a}: type is the first attribute")
        if lay and keys[0] != "layout":
            I("attrs", f"{a}: layout is the first attribute")
        if typ and typ not in TYPES:
            I("type", f"{a}: unknown type {typ!r}")
        if lay and lay not in LAYOUTS:
            I("layout", f"{a}: layout {lay!r}; only ul, ol, cards")
        if typ in NOT_OFFERED:
            I("not-offered", f"{a}: type={typ} is not offered on this machine yet ({NOT_OFFERED[typ]} is not on the machine); use ol, cards, code or a picture")
        if typ == "animation" and not cfg.get("animation"):
            I("not-offered", f"{a}: animation slides need config.json animation=true (variant B)")
        body = (el.text or "").strip()
        if gi > 0 and not typ and not lay and "|" not in el.get("text", "") + body:
            I("one-visual", f"{a}: only the intro may be a plain text slide; give it a type, a layout or a body table")
        titled_visual = typ in TYPES
        if titled_visual and EMOJI_RE.search(el.get("title", "")):
            I("emoji", f"{a}: no emoji on a slide that carries a visual")
        if lay == "cards" and EMOJI_RE.search(el.get("title", "")):
            I("emoji", f"{a}: no emoji on a cards layout's own title")
        if len(EMOJI_RE.findall(el.get("title", ""))) > 1:
            I("emoji", f"{a}: at most one emoji on a title")
        kids = list(el)
        if lay:
            for k in kids:
                if k.get("type") or k.get("layout") or list(k):
                    I("one-visual", f"{a}: layout entries are plain items")
                if re.match(r"^\s*(\d+[.)]|[-*•])\s", k.get("title", "") + " " + k.get("text", "")):
                    W("layout", f"{a}: entry {k.get('anchor')!r} carries its own marker; markers are automatic")
        if typ in ("code", "animation") and kids:
            I("one-visual", f"{a}: a {typ} item has no children")
        if typ == "code":
            if not el.get("language") or not el.get("filename"):
                I("code", f"{a}: code items carry language and filename")
            ls = body_lines(el)
            if len(ls) > lim[0] or any(len(x) > lim[1] for x in ls):
                I("frame", f"{a}: code is {len(ls)} lines, widest {max([len(x) for x in ls] or [0])} (limit {lim[0]} x {lim[1]} in {mode}); pick a narrower excerpt or split")
            if any(re.fullmatch(r"\s*(\.\.\.|//\s*\.\.\.|#\s*\.\.\.|/\*\s*\.\.\.\s*\*/)\s*", x) for x in ls):
                I("code", f"{a}: placeholder lines (...) are not allowed; copy exact source")
        if typ == "diff":
            sides = [k.get("side") for k in kids]
            if sides != ["before", "after"]:
                I("diff", f"{a}: exactly two children, side=before then side=after (got {sides})")
            for k in kids:
                if not k.get("anchor"):
                    I("diff", f"{a}: each diff side has an anchor")
                ls = body_lines(k)
                if len(ls) > lim[2] or any(len(x) > lim[3] for x in ls):
                    I("frame", f"{a}/{k.get('side')}: {len(ls)} lines, widest {max([len(x) for x in ls] or [0])} (limit {lim[2]} x {lim[3]} per side in {mode})")
                if any(re.match(r"^(@@ |\+\+\+ |--- )", x) for x in ls) or (ls and sum(bool(re.match(r"^[+-] ", x)) for x in ls) > len(ls) / 2):
                    I("diff", f"{a}/{k.get('side')}: no unified-diff markers; the renderer computes changes")
            side_anchors = {k.get("anchor") for k in kids}
            linked = {l["target"] for s in g["says"] for l in links(s.get("text", ""))}
            if not side_anchors <= linked:
                I("diff", f"{a}: narration links into both panes ({sorted(side_anchors - linked)} not linked)")
        if typ == "image":
            p, att, ref = el.get("prompt"), el.get("attachment"), el.get("reference")
            if bool(p) == bool(att):
                I("image", f"{a}: an image has a prompt or an attachment, not both or neither")
            if att and att not in {x["id"] for x in man.get("assets", [])}:
                I("image", f"{a}: attachment {att!r} is not in assets/manifest.json")
            if p:
                generated += 1
                if not style_ok:
                    I("image", "style.txt must hold exactly one style line before any image prompt")
                elif not (p.rstrip().endswith(CLOSING) and p.rstrip()[: -len(CLOSING)].rstrip().endswith(style.strip())):
                    I("image", f"{a}: the prompt ends with the style line and then {CLOSING!r}, copied exactly")
                if not 2 <= len(re.findall(r"[.!?](\s|$)", p[: max(0, len(p) - len(CLOSING))])) <= 6:
                    W("image", f"{a}: an image prompt is two to four descriptive sentences before the style line")
            if ref and ref not in image_anchors_seen:
                I("image", f"{a}: reference={ref!r} must name an EARLIER image slide's anchor")
            image_anchors_seen.append(el.get("anchor"))
        if typ == "infographic":
            generated += 1
            if not (el.get("prompt", "").startswith("Style:")):
                I("infographic", f"{a}: the item prompt is one sentence starting 'Style:'")
            if len(kids) != 4:
                I("infographic", f"{a}: exactly four quadrants (got {len(kids)})")
            titles = []
            for k in kids:
                kp = k.get("prompt", "")
                titles.append(k.get("title", "").strip().lower())
                if not k.get("anchor") or not k.get("title") or not kp:
                    I("infographic", f"{a}: each quadrant has anchor, title and prompt")
                if not 1 <= len(k.get("title", "").split()) <= 4:
                    I("infographic", f"{a}/{k.get('anchor')}: quadrant title is one to four words")
                m = re.search(r"Labels:\s*(.+?)\s*$", kp)
                if not m:
                    I("infographic", f"{a}/{k.get('anchor')}: the quadrant prompt ends 'Labels: a, b, c'")
                else:
                    labs = [x.strip().strip('."') for x in m.group(1).split(",") if x.strip()]
                    if len(labs) > 3 or any(len(x.split()) > 3 for x in labs):
                        I("infographic", f"{a}/{k.get('anchor')}: at most three labels of at most three words")
                if CLOSING in kp:
                    I("infographic", f"{a}/{k.get('anchor')}: no no-text sentence in a quadrant prompt")
            if len(set(titles)) != len(titles):
                I("infographic", f"{a}: quadrant titles are distinct")
            qa = [k.get("anchor") for k in kids]
            ss = g["says"]
            if len(ss) != 6:
                I("infographic", f"{a}: six says follow it (got {len(ss)})")
            else:
                l0 = links(ss[0].get("text", ""))
                if {l["target"] for l in l0} != {el.get("anchor")} or not 25 <= nwords(ss[0].get("text", "")) <= 35:
                    I("infographic", f"{a}: the opening say links only the item and runs 25-35 words")
                for qi, s in enumerate(ss[1:5]):
                    ll = links(s.get("text", ""))
                    want = qa[qi] if qi < len(qa) else None
                    if not ll or ll[0]["target"] != want:
                        I("infographic", f"{a}: say {qi + 2} opens with the link to quadrant {qi + 1} (visiting order TL, TR, BR, BL)")
                l5 = links(ss[5].get("text", ""))
                if not l5 or l5[0]["target"] != el.get("anchor") or any(l["target"] in qa for l in l5):
                    I("infographic", f"{a}: the closing say links the item again, no quadrant")
            for s in ss:
                for l in links(s.get("text", "")):
                    if l["line_start"] or l["selector"]:
                        I("infographic", f"{a}: no line refs or quoted selectors inside an infographic")
                    if l["target"] in qa:
                        quadrant_links[l["target"]] = quadrant_links.get(l["target"], 0) + 1
            for q in qa:
                if quadrant_links.get(q, 0) != 1:
                    I("infographic", f"{a}: quadrant {q!r} is linked {quadrant_links.get(q, 0)} times (exactly once)")
            nxt = groups[gi + 1]["item"] if gi + 1 < len(groups) else None
            if nxt is not None and nxt.get("type") in ("image", "animation", "infographic"):
                W("infographic", f"{a}: the next slide should not redraw its parts")

    if generated > 12:
        I("pictures", f"{generated} generated pictures (at most 12, infographics included)")
    ups = man.get("assets", [])
    if len(ups) > 12:
        I("uploads", f"{len(ups)} uploads (at most 12)")
    for u in ups:
        if u.get("bytes", 0) > MAX_UPLOAD or u.get("format") not in ("png", "jpeg", "webp", "gif"):
            I("uploads", f"{u.get('id')}: over 8 MB or not png/jpeg/webp/gif")

    # link targets and selectors
    tl = {a: els[0] for a, els in anc.items()}
    kinds = {}
    for g in groups:
        el = g["item"]
        kinds[el.get("anchor")] = el.get("type") or el.get("layout") or "plain"
        for k in el:
            kinds[k.get("anchor")] = "side" if k.get("side") else "entry"
    for i, s in enumerate(says):
        for l in links(s.get("text", "")):
            tgt = tl.get(l["target"])
            if tgt is None:
                I("refs", f"say {i + 1}: #{l['target']} matches no anchor")
                continue
            kind = kinds.get(l["target"])
            if (l["line_start"] or l["selector"]) and kind not in ("code", "side"):
                I("refs", f"say {i + 1}: line refs and selectors point only into code or diff panes, not {kind} #{l['target']}")
                continue
            if l["line_start"]:
                ls = body_lines(tgt)
                a0, b0 = l["line_start"], l["line_end"]
                if a0 < 1 or b0 < a0 or b0 > len(ls):
                    I("refs", f"say {i + 1}: #{l['target']}:L{a0}-{b0} is outside lines 1-{len(ls)}")
                    continue
                if l["selector"]:
                    sel = l["selector"]
                    span = "\n".join(ls[a0 - 1:b0])
                    if "..." in sel:
                        st, en = sel.split("...", 1)
                        if st not in ls[a0 - 1] or en not in ls[b0 - 1]:
                            I("refs", f"say {i + 1}: range selector {sel!r} must start in line {a0} and end in line {b0} literally")
                    elif sel not in span:
                        I("refs", f"say {i + 1}: selector {sel!r} is not literally in #{l['target']}:L{a0}-{b0}")
            elif l["selector"]:
                I("refs", f"say {i + 1}: a quoted selector needs a line ref (#anchor:L4 'text')")

    words = sum(nwords(s.get("text", "")) for s in says)
    counts = {"slides": len(groups), "says": len(says), "generated_pictures": generated, "uploads": len(ups),
              "approx_spoken_words": words, "estimated_seconds_at_150_wpm": round(words / 2.5, 1),
              "estimated_seconds_at_measured_rate": round(words / WORDS_PER_SECOND_MEASURED, 1), "bytes_total": total}
    if not fixture and not 10 <= len(groups) <= 50:
        I("slides", f"{len(groups)} top-level slides (10-50)")
    if words > 1500:
        I("budget", f"{words} spoken words (about 1,500 at most); cut slides and record what was dropped")
    return report(issues, warns, counts)


def report(issues, warns, counts):
    out = {"ok": not issues, "issues": issues, "warnings": warns, "counts": counts}
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0 if not issues else 1


LANG3 = {"en": "eng", "es": "spa", "de": "deu", "fr": "fra", "pt": "por", "ja": "jpn", "ar": "ara", "it": "ita", "nl": "nld",
         "ko": "kor", "zh": "zho", "hi": "hin", "ru": "rus", "tr": "tur", "pl": "pol", "he": "heb", "fa": "fas"}


def stale(job):
    """Reason the joined document cannot be trusted, or None: no document, or a chunk newer than it."""
    doc = os.path.join(job, "document.xml")
    if not os.path.exists(doc):
        return "document.xml is missing: run `preflight.py check` first"
    cdir = os.path.join(job, "chunks")
    newest = max([os.path.getmtime(os.path.join(cdir, f)) for f in os.listdir(cdir)] or [0]) if os.path.isdir(cdir) else 0
    if newest > os.path.getmtime(doc) + 0.001:
        return "a chunk is newer than document.xml: rerun `preflight.py check` and fix its issues first"
    mk = os.path.join(job, ".check-ok")
    if not os.path.exists(mk) or os.path.getmtime(mk) + 0.001 < os.path.getmtime(doc):
        return "the last `preflight.py check` did not pass (or has not run on this document)"
    return None


def says_cmd(job, voice=None):
    why = stale(job)
    if why:
        print(f"FAIL {why}")
        return 1
    root = parse_document(os.path.join(job, "document.xml"))
    rows, n = [], 0
    for gi, g in enumerate(slides_and_says(root)):
        for s in g["says"]:
            n += 1
            t = s.get("text", "")
            rows.append({"n": n, "slide": gi + 1, "slide_anchor": g["item"].get("anchor"), "lang": s.get("lang"),
                         "title": s.get("title"), "text": t, "spoken": spoken(t), "words": nwords(t), "links": links(t)})
    with open(os.path.join(job, "says.json"), "w", encoding="utf-8") as f:
        json.dump({"says": rows}, f, indent=2, ensure_ascii=False)
    if voice:  # Default: multilingual-v2 fields; apply_text_normalization pinned "on" (numbers and code read the same in every say)
        os.makedirs(os.path.join(job, "audio"), exist_ok=True)
        for r in rows:
            with open(os.path.join(job, "audio", f"say-{r['n']:02d}.params.json"), "w", encoding="utf-8") as f:
                json.dump({"text": r["spoken"], "voice": voice, "apply_text_normalization": "on"}, f, ensure_ascii=False)
        print(f"audio/say-NN.params.json: {len(rows)} files, voice {voice}")
        l2 = (rows[0]["lang"] or "en")[:2].lower() if rows else "en"
        print(f"Scribe language_code for this job: {LANG3.get(l2, 'unlisted: read ai-gen info for the accepted ISO 639-3 code')}")
    print(f"says.json: {len(rows)} says, {sum(r['words'] for r in rows)} words")
    return 0


def anim_cmd(job):
    why = stale(job)
    if why:
        print(f"FAIL {why}")
        return 1
    root = parse_document(os.path.join(job, "document.xml"))
    os.makedirs(os.path.join(job, "anim"), exist_ok=True)
    n = 0
    for el in root:
        if el.tag == "item" and el.get("type") == "animation":
            src = "\n".join(body_lines(el)) + "\n"
            m = re.search(r"^class\s+(\w+)\(", src, re.M)
            with open(os.path.join(job, "anim", f"{el.get('anchor')}.py"), "w", encoding="utf-8") as f:
                f.write(src)
            print(f"anim/{el.get('anchor')}.py scene {m.group(1) if m else 'MISSING: one Scene subclass is required'}")
            n += 1
    print(f"{n} animation scene(s)")
    return 0


def register(job, files):
    from PIL import Image
    ad = os.path.join(job, "assets")
    os.makedirs(ad, exist_ok=True)
    mp = os.path.join(ad, "manifest.json")
    man = json.load(open(mp, encoding="utf-8")) if os.path.exists(mp) else {"assets": []}
    bad = 0
    for f in files:
        try:
            size = os.path.getsize(f)
            with Image.open(f) as im:
                fmt, (w, h) = (im.format or "").lower(), im.size
        except Exception as e:  # unreadable: build without it and say so
            print(f"SKIP {f}: cannot be read ({e})")
            bad += 1
            continue
        if size > MAX_UPLOAD or fmt not in ("png", "jpeg", "webp", "gif") or len(man["assets"]) >= 12:
            print(f"SKIP {f}: {size} bytes, {fmt}; limits are 8 MB, png/jpeg/webp/gif, 12 pictures")
            bad += 1
            continue
        aid = f"att-{len(man['assets']) + 1:02d}"
        dst = f"{aid}.{'jpg' if fmt == 'jpeg' else fmt}"
        shutil.copyfile(f, os.path.join(ad, dst))
        man["assets"].append({"id": aid, "file": dst, "source": os.path.basename(f), "bytes": size, "width": w, "height": h, "format": fmt})
        print(f"{aid} {dst} {w}x{h}")
    with open(mp, "w", encoding="utf-8") as fh:
        json.dump(man, fh, indent=2)
    return 1 if bad else 0


def excerpt(path, a, b):
    with open(path, "rb") as f:
        lines = f.read().split(b"\n")
    sys.stdout.buffer.write(b"\n".join(lines[a - 1:b]) + b"\n")
    return 0


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd = argv[1]
    if cmd == "check":
        fixture = "--fixture" in argv
        job = next((x for x in argv[2:] if not x.startswith("--")), None)
        if not fixture and not job:
            print("check needs <job> or --fixture")
            return 2
        return check(job, fixture)
    if cmd == "says" and len(argv) >= 3:
        return says_cmd(argv[2], argv[argv.index("--voice") + 1] if "--voice" in argv else None)
    if cmd == "anim" and len(argv) == 3:
        return anim_cmd(argv[2])
    if cmd == "register" and len(argv) >= 4:
        return register(argv[2], argv[3:])
    if cmd == "excerpt" and len(argv) == 5:
        return excerpt(argv[2], int(argv[3]), int(argv[4]))
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
