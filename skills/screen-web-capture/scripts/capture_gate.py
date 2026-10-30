#!/usr/bin/env python3
"""capture_gate.py: the pass/fail gate for a web capture (screen-web-capture 1.0.0, SL8-authored).

  python3 capture_gate.py project --dir <capture dir> --result <capture-run.json> [--strict] [--status <file>]
  python3 capture_gate.py stills --lines <stills.jsonl> [--full <site_full.png>] [--page-html <page.html>]
                                 [--page-status <file with the HTTP code>] [--skip-page-check]
                                 [--min 3] [--min-full-bytes 15000] [--status <file>]
  python3 capture_gate.py summary --summary <capture-summary.md> --tokens <tokens.json>

project: checks a `hyperframes capture --json` run (research: hyperframes/hyperframescli-e1e7eb#16-17,
WF21-a1 step 3): the run's own JSON says ok true, no BLOCKED.md, and the files a build reads exist.
stills: checks capture_site.mjs output (research: higgsfield/ugc-website-lane#3, WF20-a1 step 5):
usable stills are lines with exists true and a rect; a missing page.html, an HTTP status of 400 or
more, a bot-wall page, a tiny full-page file or fewer than --min usable stills fails the capture.
Re-run it on the kept lines (stills.kept.jsonl) after the view-and-drop pass.
summary: every HEX in capture-summary.md must appear in tokens.json.

Writes the status JSON (project: capture-status.json BESIDE the capture dir, never inside it;
stills: beside the lines file; summary: prints only) and prints it.
Exit 0 passed, 5 failed (the status says why), 2 bad usage.
"""
import argparse, json, os, re, sys

# A bot wall is judged on the page's visible text, not on its scripts: a reCAPTCHA script on a form or a
# <noscript>Please enable JavaScript</noscript> line is on ordinary sites.
WALL_TITLE = re.compile(r"access denied|just a moment|attention required|verify you are human|checking your browser|are you a robot|security check|blocked", re.I)
WALL_WEAK = re.compile(r"captcha|enable javascript|verify you are human|cf-browser-verification|cf-chl|press (&amp; |and )?hold", re.I)
THIN_HTML_BYTES = 20000
HEX = re.compile(r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b")


def bot_wall_hits(raw):
    """Hits for a block page: a wall phrase in the title/H1, or (on a thin page) a weak marker in the visible text."""
    hits = []
    title = " ".join(m[0] or m[1] for m in re.findall(r"<title[^>]*>(.*?)</title>|<h1[^>]*>(.*?)</h1>", raw, re.I | re.S))
    hits += WALL_TITLE.findall(re.sub(r"<[^>]+>", " ", title))
    body = re.sub(r"<(script|style|noscript)\b.*?</\1>", " ", raw, flags=re.I | re.S)
    visible = re.sub(r"<[^>]+>", " ", body)
    if len(raw) < THIN_HTML_BYTES:
        hits += WALL_WEAK.findall(visible) + [h for h in re.findall(r"cf-chl[\w-]*|cf-browser-verification", raw, re.I)]
    return [h if isinstance(h, str) else h[0] for h in hits]


def last_result(path):
    """The capture's JSON result: the last object that has an 'ok' key, found by decoding at every '{'.
    Works for a pretty-printed or single-line result mixed with HYPERFRAMES_CAPTURE_PHASE records."""
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        return None
    dec = json.JSONDecoder()
    found = None
    pos = text.find("{")
    while pos != -1:
        try:
            obj, end = dec.raw_decode(text, pos)
        except ValueError:
            pos = text.find("{", pos + 1)
            continue
        if isinstance(obj, dict) and "ok" in obj:
            found = obj
        pos = text.find("{", end)
    return found


def walk(o, key=""):
    """Yield (key, string) for every string leaf of a JSON value."""
    if isinstance(o, dict):
        for k, v in o.items():
            yield from walk(v, str(k))
    elif isinstance(o, list):
        for v in o:
            yield from walk(v, key)
    elif isinstance(o, str):
        yield key, o


def token_facts(path):
    """(colours, fonts) found in tokens.json; the file's exact shape is unconfirmed (HF-L322), so read by pattern."""
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError):
        return None, None
    colours, fonts = set(), set()
    for key, val in walk(data):
        for h in HEX.findall(val) + re.findall(r"rgba?\([^)]*\)", val):
            colours.add(h.lower())
        if re.search(r"font|family", key, re.I) and val.strip() and not HEX.search(val):
            fonts.add(val.strip().strip("\"'").split(",")[0].strip("\"' "))
    return colours, fonts


def project(a):
    d = a.dir.rstrip("/")
    reasons, warnings = [], []
    res = last_result(a.result)
    if res is None:
        reasons.append(f"no JSON result in {a.result} (run capture with --json and keep stdout)")
    elif res.get("ok") is not True:
        reasons.append(f"capture reported ok={res.get('ok')!r}" + (f", last phase {res.get('lastPhase')}" if res.get("lastPhase") else ""))
    if res:
        warnings += [str(w) for w in (res.get("warnings") or [])]
    if os.path.exists(os.path.join(d, "BLOCKED.md")):
        reasons.append("BLOCKED.md present: take nothing from this folder; retry once into a fresh folder")
    need = ["extracted/tokens.json", "extracted/visible-text.txt", "extracted/asset-descriptions.md"]
    for rel in need:
        if not os.path.isfile(os.path.join(d, rel)):
            reasons.append(f"missing {rel}")
    if not os.path.isdir(os.path.join(d, "assets")):
        reasons.append("missing assets/")
    shots_dir = os.path.join(d, "screenshots")
    scroll = sorted(f for f in os.listdir(shots_dir) if re.match(r"scroll-\d+\.png$", f)) if os.path.isdir(shots_dir) else []
    if not scroll:
        reasons.append("no screenshots/scroll-*.png")
    tk = os.path.join(d, "extracted/tokens.json")
    if os.path.isfile(tk):
        colours, fonts = token_facts(tk)
        if colours is None:
            reasons.append("extracted/tokens.json does not parse")
        elif not colours and not fonts:
            reasons.append("extracted/tokens.json has no colours and no fonts: nothing to build the brand from")
        else:
            if not colours:
                warnings.append("tokens.json lists no colours")
            if not fonts:
                warnings.append("tokens.json lists no fonts")
            fdir = os.path.join(d, "assets", "fonts")
            have = re.sub(r"[^a-z0-9]", "", " ".join(os.listdir(fdir)).lower()) if os.path.isdir(fdir) else ""
            miss = sorted(f for f in fonts if re.sub(r"[^a-z0-9]", "", f.lower()) not in have and f.lower() not in ("sans-serif", "serif", "monospace", "system-ui", "inherit"))
            if miss:
                warnings.append("font families in tokens.json with no file in assets/fonts/ (say so in the summary; the offline Google Fonts preload may have changed them): " + ", ".join(miss[:8]))
    text_lines = 0
    vt = os.path.join(d, "extracted/visible-text.txt")
    if os.path.isfile(vt):
        text_lines = sum(1 for ln in open(vt, encoding="utf-8", errors="replace") if re.sub(r"^\[\w+\]\s*", "", ln.strip()))
        if text_lines == 0:
            reasons.append("visible-text.txt is empty: no usable page structure")
    assets = 0
    if os.path.isdir(os.path.join(d, "assets")):
        for _root, _dirs, files in os.walk(os.path.join(d, "assets")):
            assets += len(files)
    if text_lines and text_lines < 5 and assets == 0:
        msg = f"thin capture: {text_lines} text lines and no assets; a show-it-as-is brief needs a screenshot from the customer"
        (reasons if a.strict else warnings).append(msg)
    return {
        "route": "project", "capture_dir": d, "passed": not reasons, "reasons": reasons, "warnings": warnings,
        "scroll_frames": [os.path.join("screenshots", f) for f in scroll],
        "full_page": os.path.join("screenshots", "full-page.png") if os.path.isfile(os.path.join(shots_dir, "full-page.png")) else None,
        "visible_text_lines": text_lines, "asset_files": assets,
    }


def stills(a):
    reasons, warnings, usable, skipped = [], [], [], []
    try:
        lines = [ln for ln in open(a.lines, encoding="utf-8", errors="replace") if ln.strip().startswith("{")]
    except OSError:
        lines = []
        reasons.append(f"cannot read {a.lines}")
    full = None
    for ln in lines:
        try:
            o = json.loads(ln)
        except ValueError:
            continue
        if o.get("kind") == "error":
            reasons.append(f"capture run reported {o.get('error')}")
        if isinstance(o.get("status"), int) and o["status"] >= 400:
            reasons.append(f"navigation status {o['status']} on {o.get('label') or o.get('kind')}: an error page is not the site")
        if o.get("kind") == "full":
            full = o
            if o.get("truncated"):
                warnings.append(f"full page cut at the height cap ({o.get('full_height')} CSS px tall); rects below the cut are not in the file")
        elif o.get("kind") == "section":
            if o.get("exists") and o.get("rect") and os.path.isfile(o.get("path", "")):
                usable.append({"label": o["label"], "path": o["path"], "rect": o["rect"], "rect_valid_for_full": bool(o.get("rect_valid_for_full"))})
                if not o.get("rect_valid_for_full"):
                    warnings.append(f"rect for {o['label']!r} is not valid on the full-page file; crop the section still, not the full page")
            else:
                skipped.append({"label": o.get("label"), "why": o.get("error") or ("no rect: never painted" if o.get("exists") else "file missing")})
    full_path = a.full or (full or {}).get("path")
    full_bytes = os.path.getsize(full_path) if full_path and os.path.isfile(full_path) else 0
    if full_path is not None and full_bytes < a.min_full_bytes:
        reasons.append(f"full-page capture is {full_bytes} bytes (under {a.min_full_bytes}): dead page or bot wall")
    code = None
    if a.page_status:
        try:
            code = int(open(a.page_status, encoding="utf-8").read().strip()[-3:])
        except (OSError, ValueError):
            reasons.append(f"cannot read an HTTP status from {a.page_status}")
    if code is not None and code >= 400:
        reasons.append(f"the page fetch returned HTTP {code}: blocked or missing, not the site")
    if a.page_html:
        if not os.path.isfile(a.page_html):
            reasons.append(f"no {a.page_html}: the page fetch wrote nothing (blocked or unreachable)")
        else:
            hits = bot_wall_hits(open(a.page_html, encoding="utf-8", errors="replace").read())
            if hits:
                reasons.append(f"bot-wall marker in the page HTML ({len(hits)} hit(s), e.g. {hits[0]!r})")
    elif not a.skip_page_check:
        reasons.append("no --page-html: the bot-wall check was not run (pass --skip-page-check to waive it, and say so)")
    else:
        warnings.append("bot-wall check waived with --skip-page-check")
    if len(usable) < a.min:
        reasons.append(f"{len(usable)} usable still(s), fewer than {a.min}")
    return {
        "route": "stills", "passed": not reasons, "reasons": reasons, "warnings": warnings,
        "full_page": full_path, "full_page_bytes": full_bytes, "usable": usable, "skipped": skipped,
    }


def summary(a):
    reasons = []
    colours, _fonts = token_facts(a.tokens)
    if colours is None:
        reasons.append(f"cannot parse {a.tokens}")
        colours = set()
    try:
        text = open(a.summary, encoding="utf-8", errors="replace").read()
    except OSError:
        text = ""
        reasons.append(f"cannot read {a.summary}")
    def norm(h):
        h = h.lower()
        return "#" + "".join(c * 2 for c in h[1:]) if len(h) == 4 else h
    have = {norm(c) for c in colours if c.startswith("#")}
    bad = sorted({h for h in HEX.findall(text) if norm(h) not in have})
    if bad:
        reasons.append("HEX in the summary but not in tokens.json: " + ", ".join(bad))
    return {"route": "summary", "passed": not reasons, "reasons": reasons, "warnings": []}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="mode", required=True)
    pp = sub.add_parser("project")
    pp.add_argument("--dir", required=True)
    pp.add_argument("--result", required=True)
    pp.add_argument("--strict", action="store_true", help="a thin capture fails (use for a show-it-as-is brief)")
    pp.add_argument("--status")
    pm = sub.add_parser("summary")
    pm.add_argument("--summary", required=True)
    pm.add_argument("--tokens", required=True)
    ps = sub.add_parser("stills")
    ps.add_argument("--lines", required=True)
    ps.add_argument("--full")
    ps.add_argument("--page-html")
    ps.add_argument("--page-status")
    ps.add_argument("--skip-page-check", action="store_true")
    ps.add_argument("--min", type=int, default=3)
    ps.add_argument("--min-full-bytes", type=int, default=15000)
    ps.add_argument("--status")
    a = p.parse_args()
    out = {"project": project, "stills": stills, "summary": summary}[a.mode](a)
    if a.mode == "summary":
        print(json.dumps(out, indent=1))
        return 0 if out["passed"] else 5
    default_dir = os.path.dirname(os.path.abspath(a.dir.rstrip("/"))) if a.mode == "project" else os.path.dirname(os.path.abspath(a.lines))
    status = a.status or os.path.join(default_dir, "capture-status.json")
    try:
        with open(status, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=1)
    except OSError as e:
        print(f"capture_gate: cannot write {status}: {e}", file=sys.stderr)
        return 2
    print(json.dumps(out, indent=1))
    return 0 if out["passed"] else 5


if __name__ == "__main__":
    sys.exit(main())
