#!/usr/bin/env python3
"""Per-slide HyperFrames compositions for motion-doc-explainer (SL8-authored; standard library).

  python3 build_slides.py <job> [--fps 30] [--pre 0.3] [--tail 0.4] [--gap 0.35] [--end-card 3.0]
                                [--text-font Inter] [--code-font "JetBrains Mono"] [--only NN]
                                [--gsap-file gsap.min.js]

Reads config.json, document.xml, timeline.json and assets/manifest.json in <job>; writes one standalone
composition per slide at <job>/render/slide-NN/index.html (its pictures copied beside it) and
<job>/render/plan.json (kind, duration, say offsets, zoom cues, clip paths) for assemble.py.

Slide length = pre-roll + its says' audio + gap between says + tail. Pointer and highlight cues are
snapped to the frame grid (ceil(t * fps) / fps) and held at least two frames, so no cue falls between
frames. The timeline is registered synchronously at load (hyperframes-core rule); box positions are
function values read when GSAP first renders each tween, and a check refuses any async wrapper.
Animation slides (variant B) get no composition: assemble.py retimes render/anim-<anchor>.mp4.
GSAP is loaded from the jsDelivr address hyperframes-core's examples use; with no network at render time pass
--gsap-file <path to a local gsap.min.js> and a copy is placed beside each slide.
Exit 0 written; 1 a slide cannot be built (the reason is printed); 2 usage.
"""
import difflib, html, json, math, os, re, shutil, sys

sys.dont_write_bytecode = True  # no __pycache__ inside the skill folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preflight import body_lines, parse_document, slides_and_says  # noqa: E402

SIZE = {"square": (1080, 1080), "portrait": (1080, 1920), "landscape": (1920, 1080)}
RTL = {"ar", "he", "fa", "ur"}
GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"  # the include hyperframes-core's minimal composition uses


def opt(argv, name, default, cast=float):
    return cast(argv[argv.index(name) + 1]) if name in argv else default


def esc(s):
    return html.escape(s or "", quote=True)


def snap(t, fps):
    return math.ceil(round(t * fps, 6)) / fps


def code_rows(lines, prefix, marks=None, spans=None):
    """One row per line, id <prefix>-L<n>; spans: {line: [(start, end, id)]} wrap literal selectors."""
    rows = []
    for i, line in enumerate(lines, 1):
        segs, pos = [], 0
        for (s, e, sid) in sorted((spans or {}).get(i, [])):
            if s < pos:
                continue
            segs.append(esc(line[pos:s]))
            segs.append(f'<span class="sel" id="{sid}">{esc(line[s:e])}</span>')
            pos = e
        segs.append(esc(line[pos:]))
        cls = f"ln {marks.get(i, '')}" if marks else "ln"
        rows.append(f'<div class="{cls.strip()}" id="{prefix}-L{i}"><span class="no">{i}</span><span class="tx">{"".join(segs) or "&#8203;"}</span></div>')
    return "\n".join(rows)


def selector_spans(anchor, lines, links):
    """Map each link with a selector to a span id inside its line(s)."""
    spans, ids = {}, {}
    for k, l in enumerate(links):
        if l["target"] != anchor or not l["selector"] or not l["line_start"]:
            continue
        sel = l["selector"]
        parts = sel.split("...", 1) if "..." in sel else [sel]
        a, b = l["line_start"], l["line_end"] or l["line_start"]
        made = []
        for li, part in ((a, parts[0]), (b, parts[-1])) if len(parts) == 2 else ((a, parts[0]),):
            text = lines[li - 1] if 0 < li <= len(lines) else ""
            s = text.find(part) if part else -1
            if s < 0 and len(parts) == 1:  # selector may sit on a later line of the range
                for lj in range(a, b + 1):
                    s = lines[lj - 1].find(part)
                    if s >= 0:
                        li = lj
                        break
            if s >= 0:
                sid = f"s{k}-{li}"
                spans.setdefault(li, []).append((s, s + len(part), sid))
                made.append(sid)
        ids[k] = made
    return spans, ids


def code_px(W, H, longest, lines, panes=1, extra_lines=0):
    """Largest monospace size (px) at which `longest` characters and `lines` rows fit; capped at 30/1080."""
    base = min(W, H) / 1080
    pad, g = round(min(W, H) * 0.07), round(18 * base)
    avail_w = (W - 2 * pad - (panes - 1) * g) / panes - 2 * g
    avail_h = H - 2 * pad - round(54 * base) * 1.15 - round(34 * base) * 2.6 - 3 * g
    by_w = avail_w / ((longest + 3.4) * 0.6)
    by_h = avail_h / ((lines + extra_lines) * 1.45 + 1.5)
    return max(10, int(min(30 * base, by_w, by_h)))


def table_html(text):
    rows = [r.strip() for r in text.strip().split("\n") if r.strip().startswith("|")]
    if len(rows) < 2:
        return ""
    cells = lambda r: [c.strip() for c in r.strip("|").split("|")]
    head = cells(rows[0])
    body = [cells(r) for r in rows[2:]] if re.match(r"^\|?\s*:?-", rows[1]) else [cells(r) for r in rows[1:]]
    h = "".join(f"<th>{esc(c)}</th>" for c in head)
    b = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in body)
    return f'<table class="tbl"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'


def diff_marks(before, after):
    mb, ma = {}, {}
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, before, after, autojunk=False).get_opcodes():
        if op in ("replace", "delete"):
            for i in range(i1, i2):
                mb[i + 1] = "del"
        if op in ("replace", "insert"):
            for j in range(j1, j2):
                ma[j + 1] = "add"
    return mb, ma


CSS = """
:root{--bg:#0f1218;--fg:#eef1f5;--dim:#9aa4b2;--acc:#ffb547;--panel:#171c25;--add:#16351f;--del:#3a1a1d}
html,body{margin:0;background:var(--bg)}
#root{position:relative;width:{W}px;height:{H}px;overflow:hidden;background:var(--bg);color:var(--fg);font-family:'{TF}',sans-serif}
.clip{position:absolute;inset:0}
.ground{background:var(--bg)}
.wrap{position:absolute;left:{PAD}px;right:{PAD}px;top:{PAD}px;bottom:{PAD}px;display:flex;flex-direction:column;gap:{G}px}
h1{margin:0;font-size:{H1}px;line-height:1.15;font-weight:700}
.lede{margin:0;font-size:{P}px;line-height:1.35;color:var(--dim)}
.intro{justify-content:center}
.intro h1{font-size:{HI}px}
.entries{display:flex;flex-direction:column;gap:{G}px;margin:0;padding:0;list-style:none}
.entries.cards{display:grid;grid-template-columns:{COLS};gap:{G}px}
.entry{background:var(--panel);border-radius:14px;padding:{G}px;font-size:{P}px;line-height:1.3}
.entry b{display:block;font-size:{P}px;margin-bottom:6px}
.entries.ol{counter-reset:n}
.entries.ol .entry::before{counter-increment:n;content:counter(n);color:var(--acc);font-weight:700;margin-right:12px}
.entries.ul .entry::before{content:"\\2022";color:var(--acc);margin-right:12px}
.code{background:var(--panel);border-radius:14px;padding:{G}px 0;font-family:'{CF}',monospace;font-size:{C}px;line-height:1.45}
.tx{white-space:pre}
.ln{display:flex;padding:0 {G}px}
.no{width:2.2em;color:#5d6675;flex:none}
.ln.add{background:var(--add)}.ln.del{background:var(--del)}
.panes{display:flex;flex-direction:{PANES};gap:{G}px;flex:1;min-height:0}
.pane{flex:{PF};min-width:0;display:flex;flex-direction:column;gap:8px}
.pane .lab{font-size:{S}px;color:var(--dim)}
.meta{font-size:{S}px;color:var(--dim);font-family:'{CF}',monospace}
.tbl{border-collapse:collapse;font-size:{P}px}
.tbl th,.tbl td{border-bottom:1px solid #2a3140;padding:10px 14px;text-align:left}
.pic{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.band{position:absolute;left:0;right:0;bottom:0;padding:{G}px {PAD}px;background:linear-gradient(transparent,rgba(0,0,0,.75));font-size:{P}px}
#info{position:absolute;inset:0;transform-origin:50% 50%}
#hl{position:absolute;left:0;top:0;width:10px;height:10px;border:4px solid var(--acc);border-radius:10px;opacity:0;pointer-events:none}
#ptr{position:absolute;left:0;top:0;width:{PT}px;height:{PT}px;margin:-{PTH}px 0 0 -{PTH}px;border-radius:50%;background:var(--acc);box-shadow:0 0 0 6px rgba(255,181,71,.25);opacity:0}
.sel.on{background:rgba(255,181,71,.28);border-radius:4px}
.next{display:grid;gap:{G}px}
"""


SCRIPT = """
window.__timelines = window.__timelines || {};
const CUES = __CUES__;
const ZOOMS = __ZOOMS__;
const D = __D__;
// Built synchronously. Layout is read lazily: the function values below run when GSAP first renders each tween.
const tl = gsap.timeline({ paused: true });
const rootEl = () => document.getElementById('root').getBoundingClientRect();
const bb = (ids) => {
  const r = rootEl(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id of ids) {
    const el = document.getElementById(id); if (!el) continue;
    const b = el.getBoundingClientRect();
    x0 = Math.min(x0, b.left - r.left); y0 = Math.min(y0, b.top - r.top);
    x1 = Math.max(x1, b.right - r.left); y1 = Math.max(y1, b.bottom - r.top);
  }
  return { x0, y0, x1, y1 };
};
for (const c of CUES) {
  const ids = c.targets;
  if (!ids.length) { tl.to(['#hl', '#ptr'], { opacity: 0, duration: 0.2 }, c.t); continue; }
  tl.to('#hl', { x: () => bb(ids).x0 - 8, y: () => bb(ids).y0 - 6, width: () => bb(ids).x1 - bb(ids).x0 + 16,
                 height: () => bb(ids).y1 - bb(ids).y0 + 12, opacity: 1, duration: 0.25, ease: 'power2.out', immediateRender: false }, c.t);
  tl.to('#ptr', { x: () => bb(ids).x0 - 18, y: () => (bb(ids).y0 + bb(ids).y1) / 2, opacity: 1, duration: 0.25, ease: 'power2.out', immediateRender: false }, Math.max(0, c.t - 0.05));
  for (const s of c.sels) tl.set('#' + s, { className: 'sel on' }, c.t);
  for (const s of c.sels) tl.set('#' + s, { className: 'sel' }, c.t + c.d);
}
for (const z of ZOOMS) tl.to('#info', { scale: z.scale, xPercent: z.x, yPercent: z.y, duration: 0.8, ease: 'power2.inOut' }, z.t);
tl.to({}, { duration: D }, 0);
window.__timelines['__CID__'] = tl;
"""


def page(cid, W, H, D, body, cues, zooms, fonts, rtl, over=None, gsap_src=GSAP):
    pad = round(min(W, H) * 0.07)
    base = min(W, H) / 1080
    css = CSS
    for k, v in {"W": W, "H": H, "PAD": pad, "G": round(18 * base), "H1": round(54 * base), "HI": round(76 * base),
                 "P": round(34 * base), "S": round(26 * base), "C": round((30 if W >= H else 26) * base),
                 "COLS": "repeat(3,1fr)" if W > H else ("1fr" if H > W else "repeat(2,1fr)"),
                 "PANES": "column" if H > W else "row", "PF": "1", "PT": round(22 * base), "PTH": round(11 * base),
                 "TF": fonts[0], "CF": fonts[1], **(over or {})}.items():
        css = css.replace("{" + k + "}", str(v))
    script = (SCRIPT.replace("__CUES__", json.dumps(cues)).replace("__ZOOMS__", json.dumps(zooms))
              .replace("__D__", str(D)).replace("__CID__", cid))
    if re.search(r"\.then\(|async\s|await\s|DOMContentLoaded|fonts\.ready", script):
        raise SystemExit("FAIL: the emitted script builds the timeline asynchronously (hyperframes-core determinism rules)")
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<title>{cid}</title>
<script src="{gsap_src}"></script>
<style>{css}</style>
</head>
<body>
<div id="root" data-composition-id="{cid}" data-start="0" data-width="{W}" data-height="{H}" data-duration="{D}"{' dir="rtl"' if rtl else ''}>
<section class="clip ground" data-start="0" data-duration="{D}" data-track-index="1">
{body}
<div id="hl"></div><div id="ptr"></div>
</section>
</div>
<script>{script}</script>
</body>
</html>
"""


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    job = argv[1]
    fps = opt(argv, "--fps", 30, int)
    pre, tail, gap, endc = opt(argv, "--pre", 0.3), opt(argv, "--tail", 0.4), opt(argv, "--gap", 0.35), opt(argv, "--end-card", 3.0)
    fonts = (opt(argv, "--text-font", "Inter", str), opt(argv, "--code-font", "JetBrains Mono", str))
    only = opt(argv, "--only", None, int)
    gsap_file = opt(argv, "--gsap-file", None, str)
    if gsap_file and not os.path.exists(gsap_file):
        print(f"FAIL --gsap-file {gsap_file} not found")
        return 2
    cfg = json.load(open(os.path.join(job, "config.json"), encoding="utf-8"))
    W, H = SIZE[cfg["mode"]]
    rtl = cfg.get("lang", "en")[:2] in RTL
    root = parse_document(os.path.join(job, "document.xml"))
    tl = {s["n"]: s for s in json.load(open(os.path.join(job, "timeline.json"), encoding="utf-8"))["says"]}
    mp = os.path.join(job, "assets", "manifest.json")
    assets = {a["id"]: a for a in (json.load(open(mp, encoding="utf-8"))["assets"] if os.path.exists(mp) else [])}
    rd = os.path.join(job, "render")
    os.makedirs(rd, exist_ok=True)
    if os.path.exists(os.path.join(rd, "plan.json")):
        os.remove(os.path.join(rd, "plan.json"))  # a failed build must not leave a stale plan behind
    plan, n_say, bad = [], 0, 0
    groups = slides_and_says(root)
    followups = [f.get("prompt", "") for f in root if f.tag == "followup"]
    for gi, g in enumerate(groups, 1):
        el, typ, lay = g["item"], g["item"].get("type"), g["item"].get("layout")
        anchor = el.get("anchor")
        says, t, cues, zooms, offsets = [], pre, [], [], []
        for s in g["says"]:
            n_say += 1
            row = tl.get(n_say)
            if not row:
                print(f"FAIL slide {gi:02d}: say {n_say} has no timing (run align.py)")
                bad += 1
                break
            offsets.append({"n": n_say, "offset": round(t, 3), "duration": row["duration"]})
            for l in row["links"]:
                cues.append({"t0": t + l["t_start"], "t1": t + l["t_end"], **l})
            t += row["duration"] + gap
        D = round(t - gap + tail if g["says"] else endc, 3)
        nn = f"{gi:02d}"
        entry = {"n": gi, "anchor": anchor, "kind": typ or lay or ("intro" if gi == 1 else "text"), "duration": D,
                 "says": offsets, "video": f"render/slide-{nn}.mp4"}
        if typ == "animation":
            entry["clip"] = f"render/anim-{anchor}.mp4"
            plan.append(entry)
            continue
        if only and gi != only:
            plan.append(entry)
            continue
        sd = os.path.join(rd, f"slide-{nn}")
        os.makedirs(os.path.join(sd, "assets"), exist_ok=True)
        title, text = esc(el.get("title")), esc(el.get("text"))
        head = f'<h1 id="a-{esc(anchor)}">{title}</h1>' + (f'<p class="lede">{text}</p>' if text else "")
        all_links = [c for c in cues]
        target_ids, over = {}, {}
        if gi == 1 and not typ and not lay:
            body = f'<div class="wrap intro"><h1 id="a-{esc(anchor)}">{title}</h1><p class="lede">{text}</p></div>'
        elif lay:
            items = "".join(f'<li class="entry" id="a-{esc(k.get("anchor"))}"><b>{esc(k.get("title"))}</b>{esc(k.get("text"))}</li>' for k in el)
            body = f'<div class="wrap">{head}<ul class="entries {lay}">{items}</ul></div>'
        elif typ == "code":
            lines = body_lines(el)
            spans, ids = selector_spans(anchor, lines, all_links)
            target_ids.update({k: v for k, v in ids.items()})
            over = {"C": code_px(W, H, max([len(x) for x in lines] or [1]), len(lines))}
            body = (f'<div class="wrap">{head}<div class="meta">{esc(el.get("filename"))} · {esc(el.get("language"))}</div>'
                    f'<div class="code" id="c-{esc(anchor)}">{code_rows(lines, "a-" + anchor, None, spans)}</div></div>')
        elif typ == "diff":
            kids = list(el)
            bl, al = body_lines(kids[0]), body_lines(kids[1])
            mb, ma = diff_marks(bl, al)
            longest = max([len(x) for x in bl + al] or [1])
            side = code_px(W, H, longest, max(len(bl), len(al)), panes=2)
            if H <= W and side >= round(22 * min(W, H) / 1080):
                over = {"C": side, "PANES": "row", "PF": "1"}
            else:
                over = {"C": code_px(W, H, longest, len(bl) + len(al), extra_lines=3), "PANES": "column", "PF": "none"}
            panes = []
            for k, ls, marks, default in ((kids[0], bl, mb, "Before"), (kids[1], al, ma, "After")):
                ka = k.get("anchor")
                spans, ids = selector_spans(ka, ls, all_links)
                target_ids.update(ids)
                fn = k.get("filename") or el.get("filename")
                panes.append(f'<div class="pane"><div class="lab">{esc(k.get("title") or default)} · {esc(fn)}</div>'
                             f'<div class="code" id="a-{esc(ka)}">{code_rows(ls, "a-" + ka, marks, spans)}</div></div>')
            body = f'<div class="wrap">{head}<div class="panes">{"".join(panes)}</div></div>'
        elif typ == "image":
            if el.get("attachment"):
                a = assets.get(el.get("attachment"))
                src = os.path.join(job, "assets", a["file"]) if a else None
            else:
                src = os.path.join(job, "assets", f"gen-{anchor}.png")
            if not src or not os.path.exists(src):
                print(f"FAIL slide {nn}: picture {src} is missing")
                bad += 1
                continue
            shutil.copyfile(src, os.path.join(sd, "assets", os.path.basename(src)))
            fit = "contain" if el.get("attachment") else "cover"
            body = (f'<img class="pic" id="a-{esc(anchor)}" style="object-fit:{fit}" src="assets/{esc(os.path.basename(src))}" alt="" />'
                    + (f'<div class="band">{text}</div>' if text else ""))
        elif typ == "infographic":
            src = os.path.join(job, "assets", f"infographic-{anchor}.png")
            if not os.path.exists(src):
                print(f"FAIL slide {nn}: picture {src} is missing")
                bad += 1
                continue
            shutil.copyfile(src, os.path.join(sd, "assets", os.path.basename(src)))
            body = f'<div id="info"><img class="pic" id="a-{esc(anchor)}" src="assets/{esc(os.path.basename(src))}" alt="" /></div>'
            quads = [k.get("anchor") for k in el]
            # visiting order TL, TR, BR, BL: scale 2 about the centre, then shift the quadrant's centre to the frame's
            shift = {0: (50, 50), 1: (-50, 50), 2: (-50, -50), 3: (50, -50)}
            for o in offsets[1:5]:
                qi = len(zooms)
                if qi < 4:
                    zooms.append({"t": snap(o["offset"], fps), "scale": 2, "x": shift[qi][0], "y": shift[qi][1], "quadrant": quads[qi] if qi < len(quads) else None})
            if len(offsets) >= 6:
                zooms.append({"t": snap(offsets[5]["offset"], fps), "scale": 1, "x": 0, "y": 0, "quadrant": None})
            cues = []  # an infographic links whole parts only; the zoom is the pointer
        elif (el.text or "").strip() or "|" in (el.get("text") or ""):
            tbl = table_html((el.text or "") or el.get("text", ""))
            lede = "" if (el.get("text") or "").strip().startswith("|") else f'<p class="lede">{text}</p>'
            body = f'<div class="wrap"><h1 id="a-{esc(anchor)}">{title}</h1>{lede}{tbl}</div>'
        else:
            print(f"FAIL slide {nn}: {entry['kind']} is not a slide kind this builder draws")
            bad += 1
            continue
        # cues -> element ids (snapped to the frame grid, held at least two frames)
        out_cues, short, cue_log = [], [], []
        for k, c in enumerate(all_links if typ not in ("infographic",) else []):
            t0 = snap(c["t0"], fps)
            t1 = max(snap(c["t1"], fps), t0 + 2 / fps)
            if c["t1"] - c["t0"] < 2 / fps:
                short.append(c["label"])
            if c["line_start"]:
                targets = [f"a-{c['target']}-L{i}" for i in range(c["line_start"], (c["line_end"] or c["line_start"]) + 1)]
            elif c["target"] == anchor:
                targets = [] if typ in ("image",) else [f"a-{c['target']}"]
            else:
                targets = [f"a-{c['target']}"]
            cue_log.append({"t": round(t0, 4), "d": round(t1 - t0, 4), "label": c["label"], "short": c["t1"] - c["t0"] < 2 / fps,
                            "pointer": bool(targets)})
            out_cues.append({"t": round(t0, 4), "d": round(t1 - t0, 4), "targets": targets, "sels": target_ids.get(k, [])})
        with open(os.path.join(sd, "index.html"), "w", encoding="utf-8") as f:
            if gsap_file:
                shutil.copyfile(gsap_file, os.path.join(sd, "gsap.min.js"))
            f.write(page(f"slide-{nn}", W, H, D, body, out_cues, zooms, fonts, rtl, over, "gsap.min.js" if gsap_file else GSAP))
        entry.update({"dir": f"render/slide-{nn}", "cues": len(out_cues), "cue_log": cue_log, "zooms": zooms, "short_cues": short})
        plan.append(entry)
    # end card: the two follow-ups as suggested next explainers
    nn = f"{len(groups) + 1:02d}"
    sd = os.path.join(rd, f"slide-{nn}")
    os.makedirs(sd, exist_ok=True)
    nxt = "".join(f'<div class="entry" id="a-next-{i}">{esc(p)}</div>' for i, p in enumerate(followups))
    body = f'<div class="wrap intro"><h1 id="a-up-next">Up next</h1><div class="next">{nxt}</div></div>'
    with open(os.path.join(sd, "index.html"), "w", encoding="utf-8") as f:
        if gsap_file:
            shutil.copyfile(gsap_file, os.path.join(sd, "gsap.min.js"))
        f.write(page(f"slide-{nn}", W, H, endc, body, [], [], fonts, rtl, None, "gsap.min.js" if gsap_file else GSAP))
    plan.append({"n": len(groups) + 1, "anchor": "end-card", "kind": "end-card", "duration": endc, "says": [],
                 "video": f"render/slide-{nn}.mp4", "dir": f"render/slide-{nn}"})
    with open(os.path.join(rd, "plan.partial.json" if bad else "plan.json"), "w", encoding="utf-8") as f:
        json.dump({"fps": fps, "size": [W, H], "pre": pre, "tail": tail, "gap": gap, "slide_count": len(groups) + 1, "slides": plan}, f, indent=2, ensure_ascii=False)
    if not bad and os.path.exists(os.path.join(rd, "plan.partial.json")):
        os.remove(os.path.join(rd, "plan.partial.json"))
    print(f"render/{'plan.partial.json (plan.json NOT written)' if bad else 'plan.json'}: {len(plan)} slides, {sum(p['duration'] for p in plan):.1f} s; problems: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
