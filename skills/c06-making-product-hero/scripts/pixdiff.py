# pixdiff.py: prints figures; exit 1 when any product pixel (cutout alpha 255) differs in the final,
# or differs from the original photo when the cutout has the photo's size.
import argparse, json, sys
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--original', required=True)
ap.add_argument('--cutout', required=True)
ap.add_argument('--final', required=True)
ap.add_argument('--placement', required=True)
a = ap.parse_args()

p = json.load(open(a.placement))
l, t, r, b = p['bbox']
cut_full = Image.open(a.cutout).convert('RGBA')
cut = np.asarray(cut_full.crop((l, t, r, b))).astype(int)
mask = cut[..., 3] == 255
fin = np.asarray(Image.open(a.final).convert('RGB')).astype(int)
fin = fin[p['y']:p['y'] + (b - t), p['x']:p['x'] + (r - l)]
d = np.abs(fin - cut[..., :3])[mask]
fail = d.size == 0 or int(d.max()) > 0
print(f'cutout_vs_final pixels={int(mask.sum())} max={int(d.max()) if d.size else "n/a"} mean={float(d.mean()) if d.size else 0:.4f}')

orig = Image.open(a.original).convert('RGB')
if orig.size == cut_full.size:
    o = np.asarray(orig).astype(int)[t:b, l:r]
    d2 = np.abs(fin - o)[mask]
    print(f'original_vs_final max={int(d2.max()) if d2.size else "n/a"} mean={float(d2.mean()) if d2.size else 0:.4f}')
    fail = fail or (d2.size > 0 and int(d2.max()) > 0)
else:
    print(f'original_vs_final not comparable: original {orig.size} vs cutout {cut_full.size}')
sys.exit(1 if fail else 0)
