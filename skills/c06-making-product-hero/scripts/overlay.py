# overlay.py: sets the user's exact copy in the top band (wrapped to --max-width of W, font shrunk down to
# --min-font) and the logo lower right. Never alters or clips the copy: exit 1, no file, if it cannot fit,
# or (with --placement) if the copy or logo box meets the product bbox.
import argparse, json, sys
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--in', dest='inp', required=True)
ap.add_argument('--copy')
ap.add_argument('--logo')
ap.add_argument('--max-width', type=float, default=0.9)
ap.add_argument('--min-font', type=int, default=18)
ap.add_argument('--placement')
ap.add_argument('--out', required=True)
a = ap.parse_args()

im = Image.open(a.inp).convert('RGBA')
W, H = im.size
prod = None
if a.placement:
    p = json.load(open(a.placement))
    if list(p['canvas']) != [W, H]:
        print(f'placement canvas {p["canvas"]} does not match image {W}x{H}; no file written')
        sys.exit(1)
    l, t, r, b = p['bbox']
    prod = (p['x'], p['y'], p['x'] + r - l, p['y'] + b - t)


def meets(box):
    return prod is not None and box[0] < prod[2] and box[2] > prod[0] and box[1] < prod[3] and box[3] > prod[1]


def font_at(size):
    try:
        return ImageFont.truetype('DejaVuSans-Bold.ttf', size)
    except OSError:
        return ImageFont.load_default(size=size)


def wrap(d, text, font, maxw):
    lines = []
    for para in text.split('\n'):
        cur = ''
        for word in para.split(' '):
            if d.textlength(word, font=font) > maxw:
                return None
            trial = word if cur == '' else cur + ' ' + word
            if d.textlength(trial, font=font) <= maxw:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return '\n'.join(lines)


if a.copy:
    text = open(a.copy, encoding='utf-8').read().strip()
    d = ImageDraw.Draw(im)
    maxw = W * a.max_width
    top = H // 24
    box_h = H // 5 - top
    placed = None
    for size in range(max(a.min_font, W // 18), a.min_font - 1, -1):
        font = font_at(size)
        wrapped = wrap(d, text, font, maxw)
        if wrapped is None:
            continue
        b = d.multiline_textbbox((0, 0), wrapped, font=font, align='center')
        if b[3] - b[1] <= box_h and b[2] - b[0] <= maxw:
            placed = (wrapped, font, b, size)
            break
    if placed is None:
        print(f'copy does not fit: {len(text)} characters in {int(maxw)}x{box_h} px at min font {a.min_font}; no file written')
        sys.exit(1)
    wrapped, font, b, size = placed
    bw, bh = b[2] - b[0], b[3] - b[1]
    left = (W - bw) // 2
    copy_box = (left, top, left + bw, top + bh)
    if meets(copy_box):
        print(f'copy box {copy_box} meets product bbox {prod}; no file written')
        sys.exit(1)
    d.multiline_text((left - b[0], top - b[1]), wrapped, font=font, fill=(20, 20, 20, 255), align='center')
    print(f'copy font={size} lines={wrapped.count(chr(10)) + 1} box={copy_box}')
if a.logo:
    logo = Image.open(a.logo).convert('RGBA')
    lw = W // 8
    logo = logo.resize((lw, max(1, round(logo.height * lw / logo.width))), Image.LANCZOS)
    lx, ly = W - lw - W // 24, H - logo.height - H // 24
    logo_box = (lx, ly, lx + lw, ly + logo.height)
    if meets(logo_box):
        print(f'logo box {logo_box} meets product bbox {prod}; no file written')
        sys.exit(1)
    layer = Image.new('RGBA', im.size, (0, 0, 0, 0))
    layer.paste(logo, (lx, ly))
    im = Image.alpha_composite(im, layer)
im.convert('RGB').save(a.out, format='PNG')
