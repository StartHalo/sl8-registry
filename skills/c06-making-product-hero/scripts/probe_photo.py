# probe_photo.py <in> <upright_out.png>: follows media-photo-editing (exif_transpose, pillow_heif, rawpy).
# Writes the upright PNG only when orientation is not 1 or the file is HEIC or RAW.
import sys
from PIL import Image, ImageOps

src, out = sys.argv[1], sys.argv[2]
low = src.lower()
RAW = ('.dng', '.cr2', '.cr3', '.nef', '.arw', '.raf', '.orf', '.rw2')
if low.endswith(RAW):
    import numpy as np
    import rawpy
    with rawpy.imread(src) as r:
        rgb = r.postprocess(use_camera_wb=True, no_auto_bright=True, output_bps=16)
    im = Image.fromarray((rgb >> 8).astype(np.uint8), 'RGB')
    im.save(out, format='PNG')
    print(f'orientation=raw size={im.width}x{im.height} mode={im.mode} wrote_upright=yes')
    sys.exit(0)
heic = low.endswith(('.heic', '.heif'))
if heic:
    import pillow_heif
    pillow_heif.register_heif_opener()
im = Image.open(src)
orientation = im.getexif().get(0x0112, 1)
write = heic or orientation != 1
if write:
    up = ImageOps.exif_transpose(im)
    if up.mode not in ('RGB', 'RGBA'):
        up = up.convert('RGBA' if 'A' in up.getbands() else 'RGB')
    up.save(out, format='PNG')
    w, h = up.size
else:
    w, h = im.size
print(f'orientation={orientation} size={w}x{h} mode={im.mode} wrote_upright={"yes" if write else "no"}')
