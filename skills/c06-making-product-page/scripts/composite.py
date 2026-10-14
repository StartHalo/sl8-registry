import json
import sys

from PIL import Image, ImageFilter, ImageOps

# usage: composite.py <cutout.png> <hex> <plan.json> <out.png>
# The canvas W x H is declared in plan.json by SKILL.md step 8, sized from the
# cutout's alpha box so the product fills at most 80% of each side at scale 1.0.
cut, hexcol, plan, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
d = json.load(open(plan))["declared"]
W, H = int(d["width"]), int(d["height"])

p = ImageOps.exif_transpose(Image.open(cut)).convert("RGBA")
box = p.getchannel("A").getbbox()
if box:
    p = p.crop(box)  # lossless: removes transparent padding only

# Guard only: never fires when step 8 sized the canvas. If it does, say so.
s = min(1.0, W * 0.8 / p.width, H * 0.8 / p.height)
if s < 1.0:
    p = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
    print(f"scaled product by {s:.3f}: record under Known gaps", file=sys.stderr)

x, y = (W - p.width) // 2, (H - p.height) // 2

dark = Image.new("RGBA", p.size, (0, 0, 0, 255))
dark.putalpha(p.getchannel("A").point(lambda v: int(v * 0.35)))
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
shadow.alpha_composite(dark, (x, y + max(4, p.height // 40)))
shadow = shadow.filter(ImageFilter.GaussianBlur(max(6, p.height // 30)))

img = Image.new("RGBA", (W, H), "#" + hexcol.lstrip("#"))
img.alpha_composite(shadow)
img.alpha_composite(p, (x, y))
img.convert("RGB").save(out, "PNG")
print(W, H, x, y, p.width, p.height)
