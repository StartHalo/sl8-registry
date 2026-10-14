# composite.py: the cutout is never resized or redrawn; only the plate is resized; the shadow goes on the plate.
# --reserve-top R keeps the product top at R*H or lower (the fill is lowered as needed) so copy in the top band stays off it.
import argparse, json, math, sys
from PIL import Image, ImageDraw, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('--cutout', required=True)
ap.add_argument('--plate', required=True)
ap.add_argument('--aspect', required=True)  # W:H
ap.add_argument('--fill', type=float, default=0.6)
ap.add_argument('--reserve-top', type=float, default=0.0)
ap.add_argument('--out', required=True)
ap.add_argument('--placement', required=True)
a = ap.parse_args()
if not (0.0 <= a.reserve_top < 0.6) or not (0.0 < a.fill <= 0.9):
    print('reserve-top must be in [0, 0.6) and fill in (0, 0.9]')
    sys.exit(2)

cut_full = Image.open(a.cutout).convert('RGBA')
bbox = cut_full.getchannel('A').getbbox()
if bbox is None:
    print('cutout has no opaque pixels')
    sys.exit(1)
cut = cut_full.crop(bbox)
cw, ch = cut.size
aw, ah = (int(v) for v in a.aspect.split(':'))
fill = a.fill
if a.reserve_top > 0:
    fill = min(fill, 2 / 3 - a.reserve_top)
H = math.ceil(ch / fill)
W = round(H * aw / ah)
if cw > 0.9 * W:  # wide product: fit the width instead
    W = math.ceil(cw / 0.9)
    H = round(W * ah / aw)
while a.reserve_top > 0 and round(H * 2 / 3) - ch < math.ceil(a.reserve_top * H):
    H += 1
    W = max(W, round(H * aw / ah))

plate = Image.open(a.plate).convert('RGB')
s = max(W / plate.width, H / plate.height)
plate = plate.resize((max(W, round(plate.width * s)), max(H, round(plate.height * s))), Image.LANCZOS)
l, t = (plate.width - W) // 2, (plate.height - H) // 2
canvas = plate.crop((l, t, l + W, t + H)).convert('RGBA')

x = (W - cw) // 2
y = max(0, round(H * 2 / 3) - ch)  # base on the lower-third line

sh = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(sh)
ew, eh = int(cw * 0.9), max(4, int(ch * 0.06))
cx, cy = x + cw // 2, y + ch
d.ellipse((cx - ew // 2, cy - eh // 2, cx + ew // 2, cy + eh // 2), fill=120)
sh = sh.filter(ImageFilter.GaussianBlur(max(2, eh // 2)))
shadow = Image.new('RGBA', (W, H), (0, 0, 0, 255))
shadow.putalpha(sh)
canvas = Image.alpha_composite(canvas, shadow)

canvas.paste(cut, (x, y), cut)
canvas.convert('RGB').save(a.out, format='PNG')
place = {'bbox': list(bbox), 'x': x, 'y': y, 'canvas': [W, H], 'fill': round(ch / H, 4),
         'reserve_top': a.reserve_top, 'product_top': round(y / H, 4), 'plate_scale': round(s, 3)}
with open(a.placement, 'w') as f:
    json.dump(place, f)
print(f'canvas={W}x{H} product={cw}x{ch} at {x},{y} fill={place["fill"]} product_top={place["product_top"]} plate_scale={place["plate_scale"]}')
