# Pixel-exact composite (SKILL.md step 11)

This runs only when pixel_exact is true and a photo exists, in place of steps 8 to 10. Caps and quotes come from plan.json (step 7). Each paid call gets its own row. The composite gets one tool row, measured before its single add.

## 1. Cutout

Load `media-ai-gen` (Skill tool) and run `ai-gen run fal-ai/bria/background/remove`:

```bash
ai-gen run fal-ai/bria/background/remove --params-file artifacts/<project>/params/cutout.params.json --image artifacts/<project>/source/product.<ext> --queue --strict-params --max-cost <cap-bria> -o artifacts/<project>/source/ --format json > work/<project>/cutout.result.json
mv "$(python3 -c "import json;print(json.load(open('work/<project>/cutout.result.json'))['files'][0]['local_path'])")" artifacts/<project>/source/cutout.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/cutout.png --alpha required --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/cutout.result.json --params artifacts/<project>/params/cutout.params.json --json '{"item":"cutout","node":"source","declared":{"format":"png","alpha":"required"},"credits":{"estimate":<quote-bria>},"attempt":1,"parents":["source/product.<ext>"],"files":["source/cutout.png"]}'
```

Cutout alpha failure (mediaqc exit 1, IQ-05): rerun Bria once, as cutout attempt 2.

1. If step 3 copied the photo as is, first run `python3 ${CLAUDE_SKILL_DIR}/scripts/convert.py artifacts/attachments/<file> artifacts/<project>/source/product.png --max-long 2048` and record its tool row (photo-intake.md).
2. Estimate the rerun and check the budget.
3. Run the same command with `--image artifacts/<project>/source/product.png`, into `work/<project>/cutout-a2.result.json`.
4. Move the result to `source/cutout-a2.png` and check it with `--alpha required`.
5. Add its row with `"attempt":2,"lever":"input re-encoded, EXIF applied"` and `"files":["source/cutout-a2.png"]`.

## 2. A second cutout failure: prepare the edit path, then gate

Before opening the gate, prepare everything the resumed step 8 (and any step 13) reads from `artifacts/`: confirm the route, write its params file in the Nano Banana shape (SKILL.md step 6, the photo-option prompt), estimate it (or use the list figure 37.5 if estimate refuses the file), and rewrite the route and quote in plan.json:

```bash
ai-gen info fal-ai/nano-banana-pro/edit --format json
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/nano-banana-pro/edit" | python3 -c "<raw OpenAPI printer from media-ai-gen SKILL.md>" > work/<project>/nbp-edit.schema.txt
ai-gen estimate fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/lifestyle-01.params.json --format json
python3 -c "import json;p='artifacts/<project>/plan.json';d=json.load(open(p));d['route']={'option':'product-photo-into-lifestyle-background','primary':'fal-ai/nano-banana-pro/edit','fallback':None,'pixel_exact':False,'refs':1};d['quote']['per_route']['fal-ai/nano-banana-pro/edit']=<estimate>;d['quote']['caps']['fal-ai/nano-banana-pro/edit']=<estimate>;json.dump(d,open(p,'w'))"
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-edit-path --question "The cutout failed twice. Run a generative edit on fal-ai/nano-banana-pro/edit, which redraws the product, for <estimate> credits?" --options '[{"id":"a","label":"Generative edit on fal-ai/nano-banana-pro/edit (redraws the product)","credits":<estimate>},{"id":"b","label":"Stop","credits":0}]' --resume-at "step 8: generate the lifestyle still" --quote <estimate>
```

Then write PROGRESS.md and outcome.json `{"status":"partial"}`, and end. Option b spends nothing, and the outcome stays partial. With route.fallback null, a later second failure is delivered with the defect named.

## 3. Fit check before the setting

`--scale 0` keeps the product's pixels only while the cutout's opaque box is at most 0.9 x the frame width and no taller than the frame. Measure the box against a 1K frame (about 1 megapixel at the declared aspect; `<a>` is width divided by height, 1.0 for 1:1):

```bash
python3 -c "from PIL import Image;a=<a>;b=Image.open('artifacts/<project>/source/cutout.png').split()[-1].getbbox();w,h=b[2]-b[0],b[3]-b[1];W=round((2**20*a)**0.5);H=round((2**20/a)**0.5);print(w,h,W,H,w>0.9*W or h>H)"
```

If it prints True, set the setting to 2K (nano-banana-pro bills 37.5 cr at 1K and 2K alike), re-estimate, and record the change in plan.json defaults:

```bash
python3 -c "import json;p='artifacts/<project>/params/setting.params.json';d=json.load(open(p));d['resolution']='2K';json.dump(d,open(p,'w'))"
ai-gen estimate fal-ai/nano-banana-pro --params-file artifacts/<project>/params/setting.params.json --format json
```

## 4. Empty setting

Run `ai-gen run fal-ai/nano-banana-pro`. The setting prompt keeps an empty clear area at the centre of the lower third, which is where composite.py places the product:

```bash
ai-gen run fal-ai/nano-banana-pro --params-file artifacts/<project>/params/setting.params.json --queue --strict-params --max-cost <cap-setting> -o artifacts/<project>/source/ --format json > work/<project>/setting.result.json
mv "$(python3 -c "import json;print(json.load(open('work/<project>/setting.result.json'))['files'][0]['local_path'])")" artifacts/<project>/source/setting.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/setting.png --aspect <aspect> --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/setting.result.json --params artifacts/<project>/params/setting.params.json --json '{"item":"setting","node":"source","declared":{"aspect":"<aspect>","format":"png"},"credits":{"estimate":<quote-setting>},"attempt":1,"files":["source/setting.png"]}'
```

Setting measured failure (exit 1): rerun once, as setting attempt 2.

1. Copy setting.params.json to `setting-a2.params.json` and change one lever (the aspect or one setting clause).
2. Estimate it.
3. Run it as above, into `work/<project>/setting-a2.result.json`.
4. Move the result to `source/setting-a2.png`.
5. Add its row with `"attempt":2,"lever":"<lever>"` and `"files":["source/setting-a2.png"]`.

A second setting failure is delivered with the defect named as a debt.

## 5. Composite

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/composite.py artifacts/<project>/source/cutout.png artifacts/<project>/source/setting.png artifacts/<project>/final/lifestyle-01.png --light <left|right|top> --scale 0 --x 0.5 --y 0.8
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/lifestyle-01.png --aspect <aspect> --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"lifestyle-01","node":"final","tool":"python3 scripts/composite.py --light <dir> --scale 0 --x 0.5 --y 0.8 (Pillow alpha_composite of the cutout on the setting, blurred-alpha contact shadow)","parents":["cutout#<n>","setting#<n>"],"declared":{"aspect":"<aspect>","format":"png"},"measured":{"w":<w>,"h":<h>,"aspect":"<measured aspect>","format":"png","resampled":<true|false from composite.py>},"files":["final/lifestyle-01.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/lifestyle-01.png --id lifestyle-01
```

Use the cutout and setting attempts that passed (cutout-a2.png, setting-a2.png). `--light` is the briefed light side; the shadow falls away from it. `--x 0.5 --y 0.8` puts the product's base at the centre of the lower third, matching the setting prompt. Choose other `--x`/`--y` values only when the briefed setting places the product elsewhere, and keep the prompt and the flags in step.

composite.py prints w, h, format, the product box and `resampled`. If `resampled` is still true, record it and name the debt 'product pixels resampled' in Known gaps. Next steps then offers a 4K setting at 75 cr.

A recomposite after setting attempt 2 writes `final/lifestyle-01-a2.png` as a new tool row, with `"item":"lifestyle-01-a2"` and `"parents":["cutout#<n>","setting#2"]`. Placement, scale, shadow and cutout edges go to owner review.
