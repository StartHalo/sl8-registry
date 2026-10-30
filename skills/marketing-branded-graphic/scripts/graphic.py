#!/usr/bin/env python3
"""graphic.py: local composition and checks for marketing-branded-graphic (Pillow; no model call).

  compose  --layout L.json --copy copy.txt --out OUT.png
           background (colour, gradient or image), supplied images, the logo file unchanged, then the
           copy lines in the brand font file. Writes OUT.png, OUT.ground.png (everything except the
           text: the ground the text sits on) and OUT.boxes.json (each text and logo box, as drawn).
  fit      --in BG.png --width W --height H --out OUT.png
           cover-crop a generated background to the exact canvas (centred; --anchor top|bottom|left|right)
  check    --file OUT.png --width W --height H --format png [--copy copy.txt] [--feed]
           [--route code|model] [--no-logo] [--safe x,y,w,h]
           reads OUT.boxes.json and OUT.ground.png beside OUT.png (from compose or render.mjs shot):
           size and format; the boxes file belongs to this PNG (sha256); copy equal to copy.txt (same
           lines, any order); a logo box is present, its ratio, scale, size and clear space; every box
           inside the canvas (and the optional safe rectangle, in percent); contrast of each text box
           on its rendered ground (4.5:1, large text 3:1). --route code (default): a missing
           boxes.json or logo box is exit 1 (--no-logo when the brief has none). --route model (route
           C, or D): a missing boxes.json is a note. --feed also writes OUT.q25.png.
  prompt   --kind background|full|background-only --width W --height H --colors '#112233,#ffffff'
           [--platform P] [--style S] [--quiet AREA] [--people] [--copy copy.txt] --out P.txt
           fills a template row of references/prompts.json; nothing is added to it
  params   --model ID --width W --height H --prompt-file P.txt --out PARAMS.json [--quality medium|high]
           [--extra '{"output_format":"png"}']
           the request body for the two default models; prints the declared object for the manifest row.
           Quality defaults: high for the edit model (route C), medium for a background (B, D).
           --extra merges fields you read in the endpoint's schema (HR2, HR4, HR16); none are guessed.
Exit 0 ok; 1 a check failed or the input is refused (the reason is printed); 2 usage; 3 a file is missing.
Figures are printed as JSON; nothing here writes PASS for taste (palette, crop, mood are viewed).
"""
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMPTS = HERE.parent / "references" / "prompts.json"


def die(msg, code=1):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(code)


def opt(args, name, default=None):
    if f"--{name}" in args:
        i = args.index(f"--{name}")
        if i + 1 < len(args):
            return args[i + 1]
    return default


def flag(args, name):
    return f"--{name}" in args


try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:  # noqa: BLE001
    die("Pillow is not importable: this route is not available (report it; no installs, HR21)", 3)


# ---------- colour and contrast ----------

def hex_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: #{h}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


# ---------- copy ----------

def copy_lines(path):
    """copy.txt: one copy line per text line, exactly as supplied. Blank lines are ignored."""
    if not path:
        return []
    p = Path(path)
    if not p.exists():
        die(f"copy file missing: {path}", 3)
    raw = p.read_bytes().decode("utf-8").replace("\r", "")
    # "non-blank line n" is how a layout numbers copy lines
    return [ln for ln in raw.split("\n") if ln.strip() != ""]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# Scripts Pillow cannot shape (no joining, reordering or conjuncts): the HTML route (Chromium) sets them.
COMPLEX = [(0x0590, 0x08FF), (0xFB1D, 0xFDFF), (0xFE70, 0xFEFF), (0x0900, 0x0DFF), (0x0E00, 0x0EFF), (0x1000, 0x109F), (0x1780, 0x17FF)]


def complex_chars(text):
    return sorted({c for c in text if any(a <= ord(c) <= b for a, b in COMPLEX)})


# ---------- fonts ----------

def font_charset(font_file):
    """Codepoints the font covers, read with fc-query (fontconfig is baked). None if unavailable."""
    try:
        out = subprocess.run(["fc-query", "--format=%{charset}", font_file], capture_output=True, text=True, timeout=20)
    except Exception:  # noqa: BLE001
        return None
    if out.returncode != 0 or not out.stdout.strip():
        return None
    cps = set()
    for part in out.stdout.split():
        if "-" in part:
            a, b = part.split("-", 1)
            cps.update(range(int(a, 16), int(b, 16) + 1))
        else:
            cps.add(int(part, 16))
    return cps


def font_at_cap(font_file, cap_px):
    """A font size whose capital H is cap_px tall (cap height as a share of the short edge)."""
    try:
        probe = ImageFont.truetype(font_file, 200)
    except OSError:
        ext = Path(font_file).suffix.lower()
        die(f"Pillow cannot open {Path(font_file).name} ({ext or 'no extension'}): Pillow reads TTF and OTF only. A WOFF or WOFF2 brand font uses the HTML route (render.mjs shot loads it with @font-face)")
    box = probe.getbbox("H")
    cap200 = max(1, box[3] - box[1])
    size = max(1, round(200 * cap_px / cap200))
    return ImageFont.truetype(font_file, size), size


def wrap(draw, text, font, max_w, tid=None):
    words = text.split(" ")
    for w in words:
        if draw.textlength(w, font=font) > max_w + 0.5:
            die(f"text {tid}: the word {w[:40]!r} is {round(draw.textlength(w, font=font))} px wide, the box is {round(max_w)} px; widen the box or lower cap_height_pct, never change the copy. Copy without spaces (CJK) needs the HTML route or explicit line breaks in copy.txt")
    lines, cur = [], ""
    for w in words:
        trial = w if not cur else f"{cur} {w}"
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ---------- compose ----------

def pct_box(box, W, H):
    x, y, w = box[0] / 100 * W, box[1] / 100 * H, box[2] / 100 * W
    h = box[3] / 100 * H if len(box) > 3 else None
    return x, y, w, h


def draw_background(bg, W, H):
    if "image" in bg:
        p = bg["image"]
        if not Path(p).exists():
            die(f"background image missing: {p}", 3)
        im = Image.open(p).convert("RGBA")
        if im.size != (W, H):
            die(f"background is {im.size[0]}x{im.size[1]}, canvas is {W}x{H}: run `graphic.py fit` first")
        return im
    if "gradient" in bg:
        a, b = hex_rgb(bg["gradient"][0]), hex_rgb(bg["gradient"][1])
        ang = math.radians(float(bg["gradient"][2]) if len(bg["gradient"]) > 2 else 90.0)
        dx, dy = math.sin(ang), -math.cos(ang)  # CSS convention: 90 = left to right, 180 = top to bottom
        span = abs(dx) * W + abs(dy) * H or 1
        x0 = 0 if dx >= 0 else W
        y0 = 0 if dy >= 0 else H
        import numpy as np
        xs, ys = np.meshgrid(np.arange(W), np.arange(H))
        t = np.clip(((xs - x0) * dx + (ys - y0) * dy) / span, 0, 1)[..., None]
        rgb = np.array(a) + (np.array(b) - np.array(a)) * t
        arr = np.dstack([np.round(rgb).astype("uint8"), np.full((H, W), 255, "uint8")])
        return Image.fromarray(arr, "RGBA")
    return Image.new("RGBA", (W, H), hex_rgb(bg.get("color", "#ffffff")) + (255,))


def place_image(canvas, spec, W, H, role):
    p = spec["file"]
    if not Path(p).exists():
        die(f"{role} file missing: {p}", 3)
    if p.lower().endswith(".svg"):
        die(f"{role} is SVG: Pillow cannot read it. Rasterise it unchanged first: node render.mjs raster {p} --width N --out X.png")
    im = Image.open(p).convert("RGBA")
    x, y, w, _ = pct_box(spec["box"], W, H)
    tw = max(1, round(w))
    th = max(1, round(im.size[1] * tw / im.size[0]))  # proportions kept: height follows the file's ratio
    if x < -0.5 or y < -0.5 or x + tw > W + 0.5 or y + th > H + 0.5:
        die(f"{role} box [{round(x)}, {round(y)}, {tw}, {th}] px is not inside the {W}x{H} canvas; move or shrink it (a placed logo is never clipped)")
    im2 = im.resize((tw, th), Image.LANCZOS)
    canvas.alpha_composite(im2, (round(x), round(y)))
    return {"role": role, "box": [round(x), round(y), tw, th], "source_size": list(im.size), "file": p,
            "scale": round(tw / im.size[0], 3)}


def compose(args):
    lay_p, out = opt(args, "layout"), opt(args, "out")
    if not lay_p or not out:
        die("compose needs --layout and --out", 2)
    lay = json.loads(Path(lay_p).read_text("utf-8"))
    W, H = int(lay["canvas"]["width"]), int(lay["canvas"]["height"])
    short = min(W, H)
    lines = copy_lines(opt(args, "copy"))
    canvas = draw_background(lay.get("background", {}), W, H)
    boxes = []
    for i, spec in enumerate(lay.get("images", [])):
        boxes.append(place_image(canvas, spec, W, H, f"image{i + 1}"))
    logo = lay.get("logo")
    if logo:
        b = place_image(canvas, logo, W, H, "logo")
        b["clearspace_ratio"] = logo.get("clearspace_ratio")
        b["min_width_px"] = logo.get("min_width_px")
        boxes.append(b)
    ground = canvas.copy()
    draw = ImageDraw.Draw(canvas)
    used = []
    for t in lay.get("text", []):
        ff = t.get("font_file")
        if not ff or not Path(ff).exists():
            die(f"text {t.get('id')}: font file missing ({ff}); no system fallback is used", 3)
        text = "\n".join(lines[n - 1] for n in t["lines"])  # 1-based copy.txt line numbers
        used += t["lines"]
        cx = complex_chars(text)
        if cx:
            die(f"text {t.get('id')}: {''.join(cx)!r} needs a text shaper (right-to-left or joined scripts): Pillow here has none. Use the HTML route (render.mjs shot), where Chromium shapes it")
        cs = font_charset(ff)
        if cs is not None:
            miss = sorted({c for c in text if c not in " \n" and ord(c) not in cs})
            if miss:
                die(f"text {t.get('id')}: {Path(ff).name} has no glyph for {''.join(miss)!r}; use a face that covers the copy")
        font, size = font_at_cap(ff, float(t["cap_height_pct"]) / 100 * short)
        x, y, w, h = pct_box(t["box"], W, H)
        lh = float(t.get("line_height", 1.15)) * size
        out_lines = []
        for para in text.split("\n"):
            out_lines += wrap(draw, para, font, w, t.get("id"))
        if x < -0.5 or y < -0.5 or x + w > W + 0.5 or (h is not None and y + h > H + 0.5) or y + len(out_lines) * lh > H + 0.5:
            die(f"text {t.get('id')}: its box is not inside the {W}x{H} canvas; change the layout")
        if t.get("max_lines") and len(out_lines) > int(t["max_lines"]):
            die(f"text {t.get('id')}: {len(out_lines)} lines > max_lines {t['max_lines']} at this size; change the layout, never the copy")
        if h is not None and len(out_lines) * lh > h + 0.5:
            die(f"text {t.get('id')}: needs {round(len(out_lines) * lh)} px, box is {round(h)} px; change the layout, never the copy")
        colour = hex_rgb(t.get("color", "#000000"))
        x0, y0, x1, y1 = W, H, 0, 0
        for k, ln in enumerate(out_lines):
            lw = draw.textlength(ln, font=font)
            lx = x + (w - lw) / 2 if t.get("align") == "center" else (x + w - lw if t.get("align") == "right" else x)
            ly = y + k * lh
            draw.text((lx, ly), ln, font=font, fill=colour + (255,))
            bb = draw.textbbox((lx, ly), ln, font=font)
            x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
        boxes.append({"role": "text", "id": t.get("id"), "text": text, "lines": t["lines"], "box": [round(x0), round(y0), round(x1 - x0), round(y1 - y0)],
                      "color": t.get("color", "#000000"), "px_size": size, "bold": bool(t.get("bold")), "font_file": ff})
    unused = [n for n in range(1, len(lines) + 1) if n not in used]
    fmt = lay["canvas"].get("format", "png").lower()
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    img = canvas if fmt == "png" else canvas.convert("RGB")
    img.save(out, format={"jpg": "JPEG", "jpeg": "JPEG"}.get(fmt, fmt.upper()))
    ground.save(str(Path(out).with_suffix("")) + ".ground.png")
    meta = {"canvas": [W, H], "format": fmt, "renderer": "pillow", "boxes": boxes, "copy_lines_unused": unused, "png_sha256": sha256(out)}
    Path(str(Path(out).with_suffix("")) + ".boxes.json").write_text(json.dumps(meta, indent=1), "utf-8")
    print(json.dumps({"ok": not unused, "out": out, "boxes": len(boxes), "copy_lines_unused": unused}))
    sys.exit(1 if unused else 0)


# ---------- fit ----------

def fit(args):
    src, out = opt(args, "in"), opt(args, "out")
    W, H = int(opt(args, "width", 0)), int(opt(args, "height", 0))
    if not src or not out or not W or not H:
        die("fit needs --in --width --height --out", 2)
    im = Image.open(src).convert("RGBA")
    s = max(W / im.size[0], H / im.size[1])
    nw, nh = math.ceil(im.size[0] * s), math.ceil(im.size[1] * s)
    im = im.resize((nw, nh), Image.LANCZOS)
    a = opt(args, "anchor", "center")
    left = 0 if a == "left" else (nw - W if a == "right" else (nw - W) // 2)
    top = 0 if a == "top" else (nh - H if a == "bottom" else (nh - H) // 2)
    im.crop((left, top, left + W, top + H)).save(out)
    print(json.dumps({"ok": True, "out": out, "from": list(Image.open(src).size), "scale": round(s, 4), "crop": [left, top]}))


# ---------- check ----------

def ground_ratio(ground, box, text_rgb):
    x, y, w, h = box
    import numpy as np
    reg = np.asarray(ground.crop((max(0, x), max(0, y), max(1, x + w), max(1, y + h))).convert("RGB"), dtype="float64") / 255.0
    if reg.size == 0:
        return None, None
    lin = np.where(reg <= 0.04045, reg / 12.92, ((reg + 0.055) / 1.055) ** 2.4)
    ls = (lin @ np.array([0.2126, 0.7152, 0.0722])).ravel()
    lt = lum(text_rgb)
    # the worst ground: the 5% of ground pixels closest in luminance to the text
    gap = np.sort(np.abs(ls - lt))
    k = max(0, int(len(gap) * 0.05) - 1)
    worst = lt + gap[k] if np.median(ls) >= lt else lt - gap[k]
    return round(ratio(lt, float(worst)), 2), round(ratio(lt, float(np.median(ls))), 2)


def check(args):
    f = opt(args, "file")
    if not f or not Path(f).exists():
        die(f"file missing: {f}", 3)
    stem = str(Path(f).with_suffix(""))
    fails, notes = [], []
    im = Image.open(f)
    W, H, fmt = int(opt(args, "width", 0)), int(opt(args, "height", 0)), (opt(args, "format") or "").lower()
    fig = {"size": list(im.size), "format": im.format}
    if W and H and list(im.size) != [W, H]:
        fails.append(f"size {im.size[0]}x{im.size[1]} is not the requested {W}x{H}")
    if fmt and (im.format or "").lower() != {"jpg": "jpeg"}.get(fmt, fmt):
        fails.append(f"format {im.format} is not the requested {fmt}")
    meta_p = Path(stem + ".boxes.json")
    meta = json.loads(meta_p.read_text("utf-8")) if meta_p.exists() else None
    route = (opt(args, "route") or "code").lower()
    if route not in ("code", "model"):
        die("--route is code or model", 2)
    if meta is None:
        if route == "code":
            fails.append(f"no {meta_p.name} beside {Path(f).name}: copy, logo and contrast cannot be checked. Check the file compose or render.mjs shot wrote (not a renamed or delivered copy), or use --route model for a model-made graphic")
        else:
            notes.append("no boxes.json beside the file: copy, logo and contrast not checked (a model-made graphic is read by eye)")
    else:
        if meta.get("png_sha256") and meta["png_sha256"] != sha256(f):
            fails.append("the boxes file belongs to a different PNG (sha256 differs): re-run compose or shot, do not edit the PNG by hand")
        for k in ("cdp_error",):
            if meta.get(k):
                fails.append(f"font check could not run ({k}: {meta[k]}); the rendered faces are unverified")
        for k in ("failed_faces", "failed_requests", "bad_images"):
            if meta.get(k):
                fails.append(f"{k}: {meta[k]!r}")
        for b in meta["boxes"]:
            if b["role"] == "text" and meta.get("renderer") == "chromium" and not b.get("rendered_fonts"):
                fails.append(f"text {b.get('id')}: no rendered font was read, so the face is unverified")
            if b.get("overflow"):
                fails.append(f"{b['role']} {b.get('id') or ''}: content overflows its element ({b['overflow']}); enlarge the box or lower the size")
        texts = [b for b in meta["boxes"] if b["role"] == "text"]
        logo = next((b for b in meta["boxes"] if b["role"] == "logo"), None)
        # copy: what was drawn equals copy.txt, line for line
        cp = opt(args, "copy")
        if cp:
            want = copy_lines(cp)
            got = []
            for b in texts:
                got += [ln for ln in b["text"].split("\n") if ln.strip() != ""]
            # same lines, any order: a layout may list the call to action first
            fig["copy_equal"] = Counter(got) == Counter(want)
            if Counter(got) != Counter(want):
                fails.append(f"drawn copy differs from {cp}: drawn {got!r}, supplied {want!r}")
            if meta.get("stray_text"):
                fails.append(f"text outside data-copy elements: {meta['stray_text']!r}")
        # every box inside the canvas (and the safe rectangle)
        CW, CH = meta["canvas"]
        safe = [float(v) for v in opt(args, "safe").split(",")] if opt(args, "safe") else None
        fig["outside"] = []
        for b in meta["boxes"]:
            x, y, w, h = b["box"]
            if x < -1 or y < -1 or x + w > CW + 1 or y + h > CH + 1:
                fig["outside"].append(b.get("id") or b["role"])
                fails.append(f"{b['role']} {b.get('id') or ''} box {b['box']} is outside the {CW}x{CH} canvas")
            if safe:
                sx, sy, sw, sh = safe[0] / 100 * CW, safe[1] / 100 * CH, safe[2] / 100 * CW, safe[3] / 100 * CH
                if x < sx - 0.5 or y < sy - 0.5 or x + w > sx + sw + 0.5 or y + h > sy + sh + 0.5:
                    fails.append(f"{b['role']} {b.get('id') or ''} box {b['box']} leaves the safe area {safe}% ")
        # logo: present, proportions, scale, minimum width, clear space
        if not logo and route == "code" and not flag(args, "no-logo"):
            fails.append("no logo box in the composition: add the logo (data-logo in HTML, a logo block in layout.json) or pass --no-logo when the brief has none")
        if logo:
            if logo.get("scale") and logo["scale"] > 1.0:
                fails.append(f"logo is enlarged {logo['scale']}x from its file: ask for a larger file or an SVG")
            sw, sh = logo.get("source_size") or [0, 0]
            bw, bh = logo["box"][2], logo["box"][3]
            if sw and sh:
                off = abs((bw / bh) / (sw / sh) - 1) * 100
                fig["logo_ratio_off_pct"] = round(off, 2)
                if off > 1:
                    fails.append(f"logo ratio {bw}x{bh} is {off:.1f}% off the file's {sw}x{sh}")
            if logo.get("min_width_px") and bw < float(logo["min_width_px"]) - 0.5:
                fails.append(f"logo {bw} px wide < min_width_px {logo['min_width_px']}")
            clear = float(logo.get("clearspace_ratio") or 0) * bh
            lx, ly = logo["box"][0] - clear, logo["box"][1] - clear
            lx1, ly1 = logo["box"][0] + bw + clear, logo["box"][1] + bh + clear
            for b in texts:
                x, y, w, h = b["box"]
                if x < lx1 and x + w > lx and y < ly1 and y + h > ly:
                    fails.append(f"text {b.get('id')} enters the logo's clear space ({clear:.0f} px)")
        # contrast on the rendered ground
        gp = Path(stem + ".ground.png")
        if texts and not gp.exists():
            notes.append("no ground.png: contrast not measured")
        elif texts:
            ground = Image.open(gp)
            gs = ground.size[0] / meta["canvas"][0]
            fig["contrast"] = []
            for b in texts:
                box = [round(v * gs) for v in b["box"]]
                worst, med = ground_ratio(ground, box, hex_rgb(b["color"]))
                large = b.get("px_size", 0) >= 24 or (b.get("bold") and b.get("px_size", 0) >= 19)
                need = 3.0 if large else 4.5
                fig["contrast"].append({"id": b.get("id"), "worst": worst, "median": med, "need": need, "large": large})
                if worst is not None and worst < need:
                    fails.append(f"text {b.get('id')}: contrast {worst}:1 on its ground < {need}:1 (repair: lighter text on a dark ground, darker on a light one, from the palette; or a quieter area)")
    if flag(args, "feed"):
        q = stem + ".q25.png"
        im.convert("RGB").resize((max(1, im.size[0] // 4), max(1, im.size[1] // 4)), Image.LANCZOS).save(q)
        notes.append(f"view {q}: headline readable, product and brand recognisable at a glance")
    print(json.dumps({"ok": not fails, "file": f, "figures": fig, "fails": fails, "notes": notes}, indent=1))
    sys.exit(1 if fails else 0)


# ---------- prompt and params ----------

def prompt(args):
    kind, out = opt(args, "kind"), opt(args, "out")
    rows = {r["slug"]: r for r in json.loads(PROMPTS.read_text("utf-8"))["rows"]}
    if kind not in rows or not out:
        die(f"prompt needs --kind ({', '.join(rows)}) and --out", 2)
    colors = [c.strip() for c in (opt(args, "colors") or "").split(",") if c.strip()]
    if not colors:
        die("--colors needs the exact palette hex values (from the supplied files or the official site)")
    for c in colors:
        hex_rgb(c)
    vals = {
        "W": opt(args, "width"), "H": opt(args, "height"), "PLATFORM": opt(args, "platform", "social"),
        "STYLE": opt(args, "style", "clean, on brand"), "COLORS": ", ".join(colors),
        "QUIET": opt(args, "quiet", "the area the layout reserves for text and logo"),
        "PEOPLE": "people may appear" if flag(args, "people") else "no people",
        "COPY": " / ".join(f'"{ln}"' for ln in copy_lines(opt(args, "copy"))) or "no text apart from the logo",
    }
    text = rows[kind]["prompt"]
    # one pass over the template's own fields; braces inside the customer's wording stay as written
    missing = [f for f in re.findall(r"\{([A-Z]+)\}", text) if f not in vals]
    if missing:
        die(f"unfilled field in the {kind} template: {missing[0]}")
    text = re.sub(r"\{([A-Z]+)\}", lambda m: str(vals[m.group(1)]), text)
    Path(out).write_text(text, "utf-8")
    print(json.dumps({"ok": True, "out": out, "kind": kind, "chars": len(text)}))


def gpt2_size(W, H):
    """openai/gpt-image-2 image_size: multiples of 16, aspect <= 3:1, 655,360..8,294,400 px, long edge <= 3840."""
    a = min(3.0, max(1 / 3.0, W / H))
    w, h = float(W), W / a
    if w * h < 655360:
        k = math.sqrt(655360 / (w * h)); w, h = w * k, h * k
    if max(w, h) > 3840:
        k = 3840 / max(w, h); w, h = w * k, h * k
    if w * h > 8294400:
        k = math.sqrt(8294400 / (w * h)); w, h = w * k, h * k
    w, h = int(math.ceil(w / 16) * 16), int(math.ceil(h / 16) * 16)
    while w * h > 8294400 or max(w, h) > 3840:
        w, h = w - 16, int(round((w - 16) / a / 16) * 16)
    return w, h


def params(args):
    model, out, pf = opt(args, "model"), opt(args, "out"), opt(args, "prompt-file")
    W, H = int(opt(args, "width", 0)), int(opt(args, "height", 0))
    if not model or not out or not pf or not W or not H:
        die("params needs --model --width --height --prompt-file --out", 2)
    text = Path(pf).read_text("utf-8")
    if model in ("openai/gpt-image-2", "openai/gpt-image-2/edit"):
        w, h = gpt2_size(W, H)
        q = opt(args, "quality") or ("high" if model.endswith("/edit") else "medium")
        body = {"prompt": text, "image_size": {"width": w, "height": h}, "quality": q, "num_images": 1, "output_format": "png"}
    elif model == "fal-ai/flux-2/klein/9b":
        w, h = int(math.ceil(W / 16) * 16), int(math.ceil(H / 16) * 16)
        body = {"prompt": text, "image_size": {"width": w, "height": h}, "num_images": 1}
    else:
        die(f"no mapping for {model}: write its params file from `ai-gen info {model} --format json`")
    if opt(args, "extra"):
        try:
            body.update(json.loads(opt(args, "extra")))
        except ValueError:
            die("--extra is a JSON object of schema fields", 2)
    Path(out).write_text(json.dumps(body, indent=1, ensure_ascii=False), "utf-8")
    declared = {"width": w, "height": h, "format": "png"}
    print(json.dumps({"ok": True, "out": out, "declared": declared, "canvas": [W, H], "crop_needed": [w, h] != [W, H], "pinned": sorted(k for k in body if k != "prompt")}))


CMDS = {"compose": compose, "fit": fit, "check": check, "prompt": prompt, "params": params}
if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in CMDS:
        print(__doc__)
        sys.exit(2)
    CMDS[a[0]](a[1:])
