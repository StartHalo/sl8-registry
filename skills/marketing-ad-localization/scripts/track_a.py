#!/usr/bin/env python3
"""Track A text-only replacement for marketing-ad-localization (SL8-authored; no vendor file copied).

Keeps the source pixels, removes only the old letters inside named text regions, and draws the
locked target copy in their place. Run only after the Track A conditions in SKILL.md hold.

  track_a.py boxes SOURCE --langs eng --out boxes.json
      proposes line boxes from tesseract (a starting point: check and edit them by eye)
  track_a.py retype SOURCE --spec spec.json --out OUT.png [--side-by-side PNG]
      glyph mask -> inpaint -> shaped redraw -> lossless PNG at the source size and mode -> diff

spec.json:
  {"dilate": 2, "radius": 3,
   "regions": [{"box": [x, y, w, h], "text": "line one\\nline two", "font": "/path/Font.ttf", "size": 56,
                "color": "#ffffff", "align": "center", "line_spacing": 1.2, "direction": "ltr",
                "exclude": [[x, y, w, h]]}]}

Exit codes: 0 written and nothing outside the regions changed; 1 refused or a check failed
(text does not fit, pixels changed outside the regions); 2 a missing library, font or shaping engine.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def die(msg, code=1):
    print(json.dumps({'ok': False, 'error': msg}), file=sys.stderr)
    sys.exit(code)


def libs():
    try:
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont, features
    except Exception as e:  # noqa: BLE001
        die(f'missing library ({e}); the machine is broken (HR21: report, never install)', 2)
    return cv2, np, Image, ImageDraw, ImageFont, features


def cmd_boxes(a):
    if not shutil.which('tesseract'):
        die('tesseract is not on this machine: draw the boxes by eye from the 100% crops', 2)
    r = subprocess.run(['tesseract', a.source, 'stdout', '-l', a.langs, '--psm', '11', 'tsv'], capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        die(r.stderr.strip()[:400] or 'tesseract failed', 1)
    lines = {}
    rows = [ln.split('\t') for ln in r.stdout.splitlines()]
    head = rows[0]
    for row in rows[1:]:
        d = dict(zip(head, row))
        if d.get('level') != '5' or not d.get('text', '').strip():
            continue
        k = (d['block_num'], d['par_num'], d['line_num'])
        x, y, w, h = int(d['left']), int(d['top']), int(d['width']), int(d['height'])
        L = lines.setdefault(k, [x, y, x + w, y + h, []])
        L[0], L[1], L[2], L[3] = min(L[0], x), min(L[1], y), max(L[2], x + w), max(L[3], y + h)
        L[4].append(d['text'].strip())
    regions = [{'box': [L[0], L[1], L[2] - L[0], L[3] - L[1]], 'old_text': ' '.join(L[4]), 'text': '', 'font': '', 'size': 0,
                'color': '#000000', 'align': 'center', 'line_spacing': 1.2, 'direction': 'ltr', 'exclude': []}
               for L in sorted(lines.values(), key=lambda v: (v[1], v[0]))]
    Path(a.out).write_text(json.dumps({'dilate': 2, 'radius': 3, 'regions': regions}, indent=1, ensure_ascii=False))
    print(json.dumps({'ok': True, 'regions': len(regions), 'out': a.out,
                      'note': 'a proposal: merge, widen or drop boxes by eye, then fill text, font, size and colour'}))


def glyph_mask(cv2, np, gray, box, exclude, dilate):
    x, y, w, h = box
    roi = gray[y:y + h, x:x + w]
    _, th = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # The letters are the minority class inside a tight text box.
    if (th > 0).mean() > 0.5:
        th = 255 - th
    m = np.zeros_like(gray)
    m[y:y + h, x:x + w] = th
    for ex, ey, ew, eh in exclude or []:
        m[ey:ey + eh, ex:ex + ew] = 0
    if dilate > 0:
        m = cv2.dilate(m, np.ones((2 * dilate + 1, 2 * dilate + 1), np.uint8))
    # Never let the dilation leave the region.
    clip = np.zeros_like(gray)
    clip[y:y + h, x:x + w] = 255
    return cv2.bitwise_and(m, clip)


def needs_shaping(ch):
    """Scripts that need a shaping engine: Hebrew, Arabic and its supplements, Indic blocks, Thai and Lao.
    Latin, Cyrillic (Russian, Ukrainian, Kazakh) and Greek need none."""
    o = ord(ch)
    return (0x0590 <= o <= 0x08FF or 0x0900 <= o <= 0x0DFF or 0x0E00 <= o <= 0x0EFF
            or 0xFB1D <= o <= 0xFDFF or 0xFE70 <= o <= 0xFEFF)


def cmd_retype(a):
    cv2, np, Image, ImageDraw, ImageFont, features = libs()
    spec = json.loads(Path(a.spec).read_text())
    raqm = bool(features.check('raqm'))
    src = Image.open(a.source)
    src.load()
    mode, size = src.mode, src.size
    rgb = np.array(src.convert('RGB'))
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    dilate, radius = int(spec.get('dilate', 2)), float(spec.get('radius', 3))
    regions = spec.get('regions') or die('spec has no regions')
    mask = np.zeros_like(gray)
    for r in regions:
        x, y, w, h = r['box']
        if x < 0 or y < 0 or x + w > size[0] or y + h > size[1]:
            die(f'box {r["box"]} leaves the canvas {list(size)}')
        mask = cv2.bitwise_or(mask, glyph_mask(cv2, np, gray, r['box'], r.get('exclude'), dilate))
    clean = cv2.inpaint(bgr, mask, radius, cv2.INPAINT_TELEA)
    out = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(out)
    for r in regions:
        text = r.get('text') or ''
        if not text:
            continue
        complex_script = any(needs_shaping(ch) for ch in text)
        if complex_script and not raqm:
            die('Pillow has no libraqm: shaped text for this script cannot be drawn correctly', 2)
        if not Path(r.get('font', '')).is_file():
            die(f'font file not found: {r.get("font")}', 2)
        font = ImageFont.truetype(r['font'], int(r['size']), layout_engine=ImageFont.Layout.RAQM if raqm else ImageFont.Layout.BASIC)
        kw = {'direction': r['direction']} if raqm and r.get('direction') in ('rtl', 'ltr') else {}
        x, y, w, h = r['box']
        lines = text.split('\n')
        lh = round(int(r['size']) * float(r.get('line_spacing', 1.2)))
        boxes = [draw.textbbox((0, 0), ln, font=font, **kw) for ln in lines]
        widest = max(b[2] - b[0] for b in boxes)
        total_h = lh * (len(lines) - 1) + (boxes[-1][3] - boxes[-1][1])
        if widest > w or total_h > h:
            die(f'text does not fit box {r["box"]} at size {r["size"]} (needs {widest}x{total_h}): shorten the copy first, then lower the size', 1)
        ty = y + (h - total_h) // 2
        for ln, b in zip(lines, boxes):
            lw = b[2] - b[0]
            align = r.get('align', 'center')
            tx = x + (w - lw) // 2 if align == 'center' else (x + w - lw if align == 'right' else x)
            draw.text((tx - b[0], ty - b[1]), ln, font=font, fill=r.get('color', '#000000'), **kw)
            ty += lh
    if mode == 'RGBA':
        out.putalpha(src.getchannel('A'))
    elif mode != 'RGB':
        out = out.convert(mode)
    out.save(a.out, format='PNG')
    # Everything outside the regions must be unchanged.
    after = np.array(Image.open(a.out).convert('RGB'))
    inside = np.zeros(gray.shape, bool)
    for r in regions:
        x, y, w, h = r['box']
        inside[y:y + h, x:x + w] = True
    changed = np.any(after != rgb, axis=2)
    outside = int((changed & ~inside).sum())
    if a.side_by_side:
        sbs = Image.new('RGB', (size[0] * 2, size[1]), 'white')
        sbs.paste(src.convert('RGB'), (0, 0))
        sbs.paste(Image.open(a.out).convert('RGB'), (size[0], 0))
        sbs.save(a.side_by_side)
    res = {'ok': outside == 0, 'out': a.out, 'size': list(size), 'mode': mode, 'raqm': raqm,
           'masked_px': int((mask > 0).sum()), 'changed_inside_px': int((changed & inside).sum()),
           'changed_outside_px': outside,
           'note': 'look at 100%: halos, ghost letters, smears, repeated texture, damaged edges'}
    print(json.dumps(res))
    sys.exit(0 if outside == 0 else 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('boxes')
    p.add_argument('source')
    p.add_argument('--langs', default='eng')
    p.add_argument('--out', required=True)
    p = sp.add_parser('retype')
    p.add_argument('source')
    p.add_argument('--spec', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--side-by-side')
    a = ap.parse_args()
    {'boxes': cmd_boxes, 'retype': cmd_retype}[a.cmd](a)


if __name__ == '__main__':
    main()
