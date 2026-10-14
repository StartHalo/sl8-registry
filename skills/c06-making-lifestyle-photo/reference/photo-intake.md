# Find, probe and convert the product photo (SKILL.md step 3)

# Product photo intake (SKILL.md step 3)

Files the customer attached are in `artifacts/attachments/`. The attachment is never overwritten.

```bash
ls -l artifacts/attachments/
```

The brief promises a photo (or a reference scene) and the file is not there: write PROGRESS.md (SKILL.md step 15) naming the missing file as the debt, write this outcome, and stop with nothing spent. Never switch to generated-scene silently (HR15):

```bash
cat > artifacts/<project>/outcome.json <<'EOF'
{"status":"partial","reason":"attached photo <name> not found in artifacts/attachments/"}
EOF
```

## 1. Branch on the extension first

```bash
python3 -c "import os,sys;print(os.path.splitext(sys.argv[1])[1].lower())" artifacts/attachments/<file>
```

- `.heic`, `.heif`, RAW (`.cr2`, `.cr3`, `.nef`, `.arw`, `.dng`, `.raf`, `.orf`, `.rw2`) and every extension other than `.png`, `.jpg`, `.jpeg` and `.webp`: go straight to section 3. Do not probe with Pillow first, because it cannot open HEIC without pillow_heif registered.
- `.png`, `.jpg`, `.jpeg`, `.webp`: section 2.

## 2. Probe a PNG, JPEG or WebP

```bash
python3 -c "import os;from PIL import Image;f='artifacts/attachments/<file>';im=Image.open(f);print(im.format,im.size,im.getexif().get(274,1),os.path.getsize(f))"
```

When orientation is 1 and the file is at most 3 MB (3145728 bytes), copy it as is. A reference scene is copied the same way to `scene.<ext>`:

```bash
cp artifacts/attachments/<file> artifacts/<project>/source/product.<ext>
cp artifacts/attachments/<scene file> artifacts/<project>/source/scene.<ext>
```

Otherwise, go to section 3.

## 3. Convert

The kit's helper applies ImageOps.exif_transpose, registers pillow_heif or decodes RAW with rawpy, and writes PNG. When the PNG is over 3 MB, it caps the long side at 2048 and steps it down until the file fits. It prints w, h, format, bytes and whether it resized. A scene that needs conversion goes to `source/scene.png`:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/convert.py artifacts/attachments/<file> artifacts/<project>/source/product.png --max-long 2048
```

Why 3 MB: when storage upload is unavailable, a media flag inlines a file as a data URI only up to 3 MB, and a body over the proxy limit fails with exit 2 (413). A phone JPEG tagged with orientation 6 would otherwise reach the model unrotated. The delivery note names any resize.

## 4. Measure and record

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/source/product.<ext>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/product.<ext>
```

mediaqc artifact exit 1 (BQ-01 empty, BQ-02 undecodable) stops the job, with that file named as the debt. Only when convert.py ran, record it as one tool row with the figures it printed (a tool row cannot be updated, so it is measured first):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"product-source","node":"source","tool":"python3 scripts/convert.py (exif_transpose, pillow_heif or rawpy import, long side capped at 2048, PNG out)","parents":["attachments/<file>"],"declared":{"format":"png"},"measured":{"w":<w>,"h":<h>,"format":"png"},"files":["source/product.png"]}'
```

If the photo is a prior generated render rather than the original, use it and record the HR11 debt. A logo is never sent to the model (HR10).
