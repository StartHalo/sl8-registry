#!/usr/bin/env python3
"""Copy and logo composite for marketing-static-ad-production (SL8-authored; no vendor file copied).

Sets every approved line in its own box over a text-free plate, then places the real logo file in the
corner of the safe area. Deterministic and free: no model call.

  compose.py features
  compose.py compose PLATE --copy COPY.json --out MASTER.png [--phone PHONE.png] [--conventions DIR]
  compose.py stamp   IMAGE --logo FILE --out OUT.png [--corner bottom-right] [--width-pct 18] [--margin-pct 4]
                     [--ratio 9x16] [--conventions DIR]       logo only, for an already-lettered image
  compose.py ocr-name IMAGE --name "Brand Name" [--langs eng]  exact brand-name check by tesseract (exit 1 when absent)

COPY.json (all boxes are percentages of the frame, [x, y, w, h]; sizes are percentages of the frame width):
  {"ratio": "9x16", "font": "/path/Brand.ttf", "scrim": "auto",
   "lines": [{"role": "headline", "text": "...", "box": [8, 20, 84, 22], "anchor": "center",
              "valign": "middle", "size_pct": 9, "min_size_pct": 5, "colour": "#FFFFFF", "max_lines": 3,
              "font": "(optional per line)", "direction": "ltr|rtl", "language": "ar"}],
   "logo": {"file": "/path/logo.png", "corner": "bottom-right", "width_pct": 18, "margin_pct": 4}}
Safe zones come from conventions.json `safe_zones`; text boxes and the logo must sit inside them.

Exit codes: 0 written; 1 a check failed (nothing is written); 2 a missing library, font, file or shaping engine.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULTS = HERE.parent / 'references' / 'conventions.json'
COMPLEX = re.compile('[֐-ࣿऀ-෿฀-໿က-႟ក-៿]')
CORNERS = {'top-left': ('l', 't'), 'top-right': ('r', 't'), 'bottom-left': ('l', 'b'), 'bottom-right': ('r', 'b')}


def die(msg, code=1, **extra):
    print(json.dumps({'ok': False, 'error': msg, **extra}, ensure_ascii=False), file=sys.stderr)
    sys.exit(code)


def libs():
    try:
        from PIL import Image, ImageDraw, ImageFont, features
    except Exception as e:  # noqa: BLE001
        die(f'missing library ({e}); the machine is broken (HR21: report, never install)', 2)
    return Image, ImageDraw, ImageFont, features


def conventions(a):
    f = Path(a.conventions) / 'conventions.json' if getattr(a, 'conventions', None) else DEFAULTS
    try:
        c = json.loads(f.read_text())
    except Exception as e:  # noqa: BLE001
        die(f'conventions unreadable: {f} ({e})', 2)
    if 'safe_zones' not in c and f != DEFAULTS:
        c['safe_zones'] = json.loads(DEFAULTS.read_text())['safe_zones']
    return c


def safe_rect(c, ratio, W, H):
    z = c['safe_zones'].get(ratio) or c['safe_zones']['default']
    return (W * z['side'] / 100, H * z['top'] / 100, W * (1 - z['side'] / 100), H * (1 - z['bottom'] / 100))


def lum(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(l1, l2):
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mean_rgb(img, box):
    x0, y0, x1, y1 = [int(v) for v in box]
    crop = img.crop((x0, y0, x1, y1)).convert('RGB').resize((1, 1))
    return crop.getpixel((0, 0))


def need_raqm(features, text, direction):
    if (direction == 'rtl' or COMPLEX.search(text)) and not features.check('raqm'):
        die('this text needs libraqm shaping (Arabic, Hebrew, Indic or similar) and Pillow has none: report it, do not draw it unshaped', 2)


def wrap(draw, font, text, width, kw):
    words = text.split()
    if len(words) < 2 and len(text) > 8:  # no spaces (Chinese, Japanese): break by character
        words = list(text)
        join = ''
    else:
        join = ' '
    lines, cur = [], ''
    for w in words:
        t = (cur + join + w) if cur else w
        if draw.textlength(t, font=font, **kw) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def place_logo(Image, img, lg, c, ratio, problems, texts):
    W, H = img.size
    f = Path(lg['file'])
    if f.suffix.lower() == '.svg':
        die('the logo is an SVG: convert it once (convert -density 300 logo.svg logo.png) and pass the PNG', 2)
    if not f.exists():
        die(f'logo file not found: {f}', 2)
    logo = Image.open(f).convert('RGBA')
    note = None
    if logo.getchannel('A').getextrema()[0] == 255:
        note = 'the logo file has no transparency: it is placed as a rectangle'
    lw = round(W * lg.get('width_pct', 18) / 100)
    lh = round(logo.height * lw / logo.width)
    logo = logo.resize((lw, lh), Image.LANCZOS)
    sx0, sy0, sx1, sy1 = safe_rect(c, ratio, W, H)
    m = W * lg.get('margin_pct', 4) / 100
    corner = lg.get('corner', 'bottom-right')
    if corner not in CORNERS:
        die(f'corner is one of {", ".join(CORNERS)}', 2)
    h, v = CORNERS[corner]
    x = sx0 + m if h == 'l' else sx1 - m - lw
    y = sy0 + m if v == 't' else sy1 - m - lh
    box = (round(x), round(y), round(x) + lw, round(y) + lh)
    if box[0] < sx0 or box[1] < sy0 or box[2] > sx1 or box[3] > sy1:
        problems.append('logo does not fit inside the safe area at this width and margin')
    for t in texts:
        if not (box[2] <= t[0] or box[0] >= t[2] or box[3] <= t[1] or box[1] >= t[3]):
            problems.append('logo overlaps a text box')
    img.paste(logo, box[:2], logo)
    return {'file': str(f), 'box_px': list(box), 'corner': corner, 'note': note}


def cmd_features(a):
    Image, _, ImageFont, features = libs()
    import PIL
    r = {'pillow': PIL.__version__, 'raqm': bool(features.check('raqm')), 'freetype': bool(features.check('freetype2'))}
    print(json.dumps(r))
    sys.exit(0 if r['freetype'] else 1)  # no raqm: Latin only; Arabic, Hebrew and Indic lines are refused, never drawn unshaped


def cmd_compose(a):
    Image, ImageDraw, ImageFont, features = libs()
    c = conventions(a)
    try:
        spec = json.loads(Path(a.copy).read_text())
    except Exception as e:  # noqa: BLE001
        die(f'copy file unreadable: {a.copy} ({e})', 2)
    img = Image.open(a.plate).convert('RGB')
    W, H = img.size
    ratio = spec.get('ratio', '9x16')
    sx0, sy0, sx1, sy1 = safe_rect(c, ratio, W, H)
    engine = ImageFont.Layout.RAQM if features.check('raqm') else ImageFont.Layout.BASIC
    problems, report, sizes, boxes = [], [], {}, []
    draw = ImageDraw.Draw(img, 'RGBA')
    for ln in spec.get('lines', []):
        role, text = ln.get('role', '?'), ln.get('text', '')
        if not text.strip():
            problems.append(f'{role}: empty text')
            continue
        direction = ln.get('direction', 'ltr')
        need_raqm(features, text, direction)
        fpath = ln.get('font') or spec.get('font')
        if not fpath or not Path(fpath).exists():
            die(f'{role}: font file not found ({fpath}); deliver the plate and list the copy as a debt (HR15)', 2)
        bx, by, bw, bh = ln['box']
        px = (W * bx / 100, H * by / 100, W * (bx + bw) / 100, H * (by + bh) / 100)
        if px[0] < sx0 - 1 or px[1] < sy0 - 1 or px[2] > sx1 + 1 or px[3] > sy1 + 1:
            problems.append(f'{role}: box leaves the safe area ({ratio})')
        boxes.append(px)
        kw = {}
        if features.check('raqm'):
            kw['direction'] = direction
            if ln.get('language'):
                kw['language'] = ln['language']
        size = W * ln.get('size_pct', 8) / 100
        lo = W * ln.get('min_size_pct', ln.get('size_pct', 8) * 0.6) / 100
        placed = None
        while size >= lo:
            font = ImageFont.truetype(fpath, round(size), layout_engine=engine)
            lines = wrap(draw, font, text, px[2] - px[0], kw)
            lh = size * 1.2
            if len(lines) <= ln.get('max_lines', 3) and lh * len(lines) <= px[3] - px[1] and all(draw.textlength(t, font=font, **kw) <= px[2] - px[0] for t in lines):
                placed = (font, lines, lh, size)
                break
            size -= W * 0.004
        if not placed:
            problems.append(f'{role}: does not fit its box down to {lo / W * 100:.1f}% of the width: shorten the line or enlarge the box')
            continue
        font, lines, lh, size = placed
        sizes[role] = size
        colour = hexrgb(ln.get('colour', '#FFFFFF'))
        th = lh * len(lines)
        top = px[1] + {'top': 0, 'middle': (px[3] - px[1] - th) / 2, 'bottom': px[3] - px[1] - th}[ln.get('valign', 'middle')]
        tw = max(draw.textlength(t, font=font, **kw) for t in lines)
        region = (px[0], top, px[2], top + th)
        bg = mean_rgb(img, region)
        cr = contrast(lum(colour), lum(bg))
        scrim = None
        if cr < 4.5 and spec.get('scrim', 'auto') == 'auto':
            dark = (0, 0, 0)
            light = (255, 255, 255)
            sc = dark if contrast(lum(colour), 0.0) >= contrast(lum(colour), 1.0) else light
            pad = size * 0.3
            draw.rectangle((px[0] - pad, top - pad / 2, px[2] + pad, top + th + pad / 2), fill=sc + (140,))
            bg2 = mean_rgb(img, region)
            cr2 = contrast(lum(colour), lum(bg2))
            scrim = {'colour': '#%02x%02x%02x' % sc, 'alpha': 140, 'contrast_after': round(cr2, 2)}
            cr = cr2
        if cr < 4.5:
            problems.append(f'{role}: contrast {cr:.2f}:1 is below 4.5:1 after the scrim; change the colour')
        anchor = ln.get('anchor', 'center')
        for i, t in enumerate(lines):
            w = draw.textlength(t, font=font, **kw)
            x = {'left': px[0], 'center': px[0] + (px[2] - px[0] - w) / 2, 'right': px[2] - w}[anchor]
            draw.text((x, top + i * lh), t, font=font, fill=colour + (255,), **kw)
        report.append({'role': role, 'lines': lines, 'size_px': round(size), 'contrast': round(cr, 2), 'scrim': scrim})
    head = sizes.get('headline')
    if head and any(s > head + 0.5 for r, s in sizes.items() if r != 'headline'):
        problems.append('hierarchy: another line is set larger than the headline')
    logo = None
    if spec.get('logo'):
        logo = place_logo(Image, img, spec['logo'], c, ratio, problems, boxes)
    if problems:
        die('composite refused, nothing written', 1, problems=problems, lines=report)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    img.save(a.out, 'PNG')
    if a.phone:
        Path(a.phone).parent.mkdir(parents=True, exist_ok=True)
        img.resize((360, round(H * 360 / W)), Image.LANCZOS).save(a.phone, 'PNG')
    print(json.dumps({'ok': True, 'out': a.out, 'size': [W, H], 'lines': report, 'logo': logo, 'phone': a.phone}, ensure_ascii=False))


def cmd_stamp(a):
    Image, *_ = libs()
    c = conventions(a)
    img = Image.open(a.image).convert('RGB')
    problems = []
    logo = place_logo(Image, img, {'file': a.logo, 'corner': a.corner, 'width_pct': a.width_pct, 'margin_pct': a.margin_pct}, c, a.ratio, problems, [])
    if problems:
        die('stamp refused, nothing written', 1, problems=problems)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    img.save(a.out, 'PNG')
    print(json.dumps({'ok': True, 'out': a.out, 'size': list(img.size), 'logo': logo}))


def cmd_ocr_name(a):
    if not shutil.which('tesseract'):
        die('tesseract is not on this machine: read the brand name by eye at 100% and write what you see (HR14)', 2)
    r = subprocess.run(['tesseract', a.image, 'stdout', '-l', a.langs, '--psm', '11'], capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        die(r.stderr.strip()[:300] or 'tesseract failed', 2)
    flat = re.sub(r'\s+', ' ', r.stdout).strip().lower()
    found = a.name.lower() in flat
    print(json.dumps({'ok': found, 'name': a.name, 'found': found, 'note': 'OCR is a screen, not a proof: confirm by eye'}))
    sys.exit(0 if found else 1)


def main():
    p = argparse.ArgumentParser(prog='compose.py')
    sp = p.add_subparsers(dest='cmd', required=True)
    sp.add_parser('features').set_defaults(fn=cmd_features)
    s = sp.add_parser('compose')
    s.add_argument('plate')
    s.add_argument('--copy', required=True)
    s.add_argument('--out', required=True)
    s.add_argument('--phone')
    s.add_argument('--conventions')
    s.set_defaults(fn=cmd_compose)
    s = sp.add_parser('stamp')
    s.add_argument('image')
    s.add_argument('--logo', required=True)
    s.add_argument('--out', required=True)
    s.add_argument('--corner', default='bottom-right')
    s.add_argument('--width-pct', type=float, default=18)
    s.add_argument('--margin-pct', type=float, default=4)
    s.add_argument('--ratio', default='9x16')
    s.add_argument('--conventions')
    s.set_defaults(fn=cmd_stamp)
    s = sp.add_parser('ocr-name')
    s.add_argument('image')
    s.add_argument('--name', required=True)
    s.add_argument('--langs', default='eng')
    s.set_defaults(fn=cmd_ocr_name)
    a = p.parse_args()
    a.fn(a)


if __name__ == '__main__':
    main()
