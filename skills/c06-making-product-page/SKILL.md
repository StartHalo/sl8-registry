---
name: c06-making-product-page
description: "Product page images, PDP images, catalog photos, e-commerce listing sets, marketplace main images, packshots on seamless white or brand colour. Makes clean catalog and product-detail-page images on the SL8 Image Studio: the customer's product centred and front-facing on a seamless background, as one PDP image or as a matched listing set (white, brand colour, scale or detail, packaging close-up) built from one invariant prompt skeleton plus one clause per cell. It edits from an attached packshot so that shape, label, material and colour stay faithful, generates from text when there is none, and uses a Bria cutout and a local composite when the product must stay pixel-identical. Runs headless through ai-gen with stated defaults, cost gates, one manifest row per generation and media-qc figures. Use it when a merchant or brand needs storefront or marketplace product images on a plain seamless background. It does not make lifestyle scenes, ad creatives with copy, or video."
license: MIT
compatibility: "SL8 Image Studio 1.0.2 (sl8-image build 333aaa35); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: image/product-page
  source: "D1/commercial (fal community)"
  status: untested
---

## Factory steps on this bot

This skill runs as a job of an SL8 bot. Three steps wrap the kit workflow below; keep the kit's steps as they are.

- [ ] A. Before the kit's first step creates any folder or file, save the request word for word to `work/request.md` and run `node ${CLAUDE_SKILL_DIR}/scripts/inputs.mjs work/request.md`. Exit 1 means no product: write nothing under `artifacts/`, spend nothing, and end partial, saying what to send (its `say`). If the brief speaks of the customer's own photo or packshot ("from my photo", "our packshot") and no image is in `artifacts/attachments/`, end partial the same way and ask them to attach it; never switch to the text route for a promised image. Otherwise, once the kit's first step has the project slug, copy `work/request.md` to `artifacts/<project>/inputs/request.md`. Every field in `assume` takes the kit's default, named under Decisions in PROGRESS.md. Wherever the kit writes `artifacts/attachments/<file>`, `<file>` is the file's base name, even when the brief gives a full path.
- [ ] B. Before the kit writes outcome.json done, run `node ${CLAUDE_SKILL_DIR}/scripts/validate.mjs artifacts/<project>/final/<cell>_<id>_a<n>.png --request artifacts/<project>/inputs/request.md` once for each final image this job delivered. Fix what it names and rerun until it prints ok.
- [ ] C. Last, write `artifacts/<project>/inputs/job.json` (job `product-page`, what, state, the context used, decisions made and open, deliverables, blockers) and run `node ${CLAUDE_SKILL_DIR}/../c06-router/scripts/status.mjs --project <project> --record artifacts/<project>/inputs/job.json`.

## Commercial product-page images on SL8

Use this skill when the job is a clean e-commerce catalog or product-detail-page (PDP) image: the product on a seamless background, as one PDP image or as a matched listing set. Load the reference files when you need prompt patterns or category examples, at the steps that name them:

- `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md`: step 4 (the prompt build order, the E-commerce PDP image template, material cues, negative prompt components) and step 8 (background replacement).
- `${CLAUDE_SKILL_DIR}/reference/workflows.md`: steps 4 and 7 (the e-commerce batch recipe, controlled variants, hero from a product reference, the claims rule) and step 10 (the reject rule).
- `${CLAUDE_SKILL_DIR}/reference/examples.md`: step 4, before you write the skeleton.
- `${CLAUDE_SKILL_DIR}/scripts/composite.py`: run at step 8 (pixel_identical only).

Do not load a routing skill: this kit names its own models (see Model choice). If a routed id fails, `media-image-generation`'s routing table is the fallback.

Keep the output production-focused. Do not add inflated marketing language,
unsupported claims, fake text in the image, or em dashes.

## Inputs to read from the brief

Never ask. Read each input from the brief or from the files attached to it (in `artifacts/attachments/`). When an input is missing, use the default below and record it in `plan.json` and under Decisions in PROGRESS.md. Anything the brief names (cells, lighting, background colour, camera, aspect, model) overrides the defaults.

- Product: exact product name, category, material, color, scale, logo rules.

- Goal: always a PDP image. `set_mode` is `single-pdp-image` (the default) or `e-commerce-batch-set` (when the brief asks for a set, a listing, a matrix or several matched images).

- Platform: square 1:1 by default; 4:5 when the brief says PDP portrait; 16:9 for a banner. Always send it explicitly: `aspect_ratio` on Nano Banana, `image_size` on gpt-image-2. The background is always seamless; `background_color` defaults to seamless white (#FFFFFF).

- Brand: premium, playful, clinical, athletic, minimal, natural, technical.

- Source media: the product packshot, attached in `artifacts/attachments/`. A logo is never passed to a model (HR10); a logo composite belongs to media-photo-editing and is outside this deliverable.

- Constraints: preserve packaging, avoid new labels, no fake readable copy.

- Model preference: use this kit's Model choice unless the brief names a model or the job is unusually expensive. A model the brief names wins; if it breaks a house rule, record it with `manifest.mjs waive` (step 1). Step 5 gates on the total cost.

Defaults when the brief is silent:
- packshot: none. The text-to-image route runs, and the delivery flags fidelity as unanchored. If the brief says a packshot is attached and the file is not in `artifacts/attachments/`, the job stops at step 2 and reports the missing file as the debt. It never switches to text-to-image silently.
- background_color: seamless white, written to plan.json as `#FFFFFF`. This hex is what the step 8 composite paints.
- matrix (batch only): white background, brand-color background, scale/detail, packaging close-up. The source's lifestyle cell is not a seamless-background image: leave it out and flag it as a hand-off to the image/product-lifestyle kit. Cells the brief names override these.
- brand_color: none. Skip the brand-color cell and flag the skip.
- lighting: even softbox lighting plus the material cue for the product's material (reference/prompt-patterns.md).
- brand_tone: clean, minimal catalog.
- pixel_identical: false (a generative edit from the packshot). When true (marketplace main image, compliance packshot), the job skips the Nano Banana params at step 4, their estimate at step 5, and steps 6 and 7, and takes the cutout-and-composite path (step 8).
- detail_resolution: 1K. A close-up cell that must carry small readable detail uses 2K (priced at step 5).
- model_preference: `fal-ai/nano-banana-pro/edit` with a packshot, `fal-ai/nano-banana-pro` without one. If the brief names `openai/gpt-image-2/edit` (or the packaging text must hold), use the gpt-image-2-edit-primary option: steps 4 to 7 use `<cell>.gpt.params.json` on that route.
- variants_per_cell: 1. Use 2 to 4 (`num_images`) only when the brief asks and the budget covers them; the owner picks the strongest.
- format: png.
- budget_credits: SL8_SPEND_CEILING minus the ledger, as printed by `manifest.mjs budget`.
- user_copy: none. No text is generated in the image, and no claim, price, discount or health claim goes into any prompt. Copy the brief supplies is recorded as a debt for media-photo-editing to composite, with the customer's confirmation.
- project: a kebab-case slug of the product name.

## 1. Read the brief, resume, declare defaults

Load `media-ai-gen` and `media-image-generation` (Skill tool). Create every folder this kit writes to, then read the gate state:

```bash
mkdir -p artifacts/<project>/final artifacts/<project>/source artifacts/<project>/qc artifacts/<project>/params work/<project>
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project> > work/<project>/gate-status.json; echo $?
```

Exit 10 means a spend gate is open: spend nothing, write PROGRESS.md and end partial, unless the brief plainly picks one of the gate's options. Then record that answer:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <id> --option <id> --by "<the brief's words>"
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project> > work/<project>/gate-status.json
```

Read the last answered gate before any spend:

```bash
python3 -c "import json,sys;s=json.load(open(sys.argv[1]));a=s.get('answered',[]);print((a[-1]['answer'] or 'none')+' '+(a[-1]['resume_at'] or '') if a else 'none')" work/<project>/gate-status.json
```

- `a` (the option that approves the spend): resume at the printed `resume_at` step. That step reads its params from `artifacts/<project>/params/` and `plan.json`.
- `b` (Stop here, or Stop: deliver as is): a Stop answer spends nothing. Make no paid call, write PROGRESS.md as in step 11 with the stopped cells under Known gaps, leave `outcome.json` partial, and end.
- `none`: a fresh job. Start the manifest and write the plan.

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
cat > artifacts/<project>/plan.json <<'EOF'
{"schema":"sl8.media.plan/1","project":"<project>","declared":{"aspect":"1:1","format":"png"},"background_color":"#FFFFFF","cells":[{"item":"white","delta":"<one clause>","resolution":"1K"}],"budget":{"credits":<n>,"approved_by":"brief"}}
EOF
```

Fill each value from the brief or its default and ask nothing. `single-pdp-image` has one cell (`white`, or the background the brief names); `e-commerce-batch-set` has one cell per matrix entry. Declare everything before any spend (HR1): each manifest row copies its declared block from plan.json, and anything left undeclared gives `mediaqc declared` exit 3 at step 9. If the brief explicitly overrides a house rule, follow it and record the override with that rule's number:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR7 --instruction "<the brief's words>"
```

## 2. Find and probe the packshot

There is no upload step: the packshot goes into the same `ai-gen` call through `--ref` (steps 6, 7, 10) or `--image` (step 8). Load `media-qc` (Skill tool). Find the file, measure it before any spend, and copy it unaltered into `source/`. Every edit starts from that original (HR11); files in `artifacts/attachments/` are never overwritten.

```bash
test -f artifacts/attachments/<packshot> || echo MISSING
```

If this prints MISSING and the brief promised a packshot, stop: spend nothing, write `artifacts/<project>/PROGRESS.md` naming the missing file as the debt, and write the outcome:

```bash
printf '{"status":"failed","reason":"packshot <packshot> promised but not attached"}' > artifacts/<project>/outcome.json
```

Otherwise measure the packshot, copy it, and record its figures under `packshot` in plan.json (never under `declared`, so the finals are never compared with the packshot's size):

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/attachments/<packshot>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/attachments/<packshot> > work/<project>/packshot.qc.json
cp artifacts/attachments/<packshot> artifacts/<project>/source/<packshot>
python3 -c "import json,sys;p=json.load(open(sys.argv[1]));q=json.load(open(sys.argv[2]));p['packshot']={'file':'source/'+sys.argv[3],'figures':q.get('figures',q)};json.dump(p,open(sys.argv[1],'w'),indent=1)" artifacts/<project>/plan.json work/<project>/packshot.qc.json <packshot>
```

If `mediaqc artifact` exits 1 or 3, the packshot is unusable: stop and report it as the debt, as for a missing file. The composite canvas on the pixel_identical path is sized later, from the cutout itself (step 8).

## 3. Confirm routes and schemas

Start from routed endpoint IDs. Load `media-ai-gen` (Skill tool) and check every route the job may use, fallbacks included. Each file name is the full id with every / replaced by -:

```bash
ai-gen info fal-ai/nano-banana-pro/edit --format json > work/<project>/fal-ai-nano-banana-pro-edit.info.json
ai-gen info fal-ai/nano-banana-pro --format json > work/<project>/fal-ai-nano-banana-pro.info.json
ai-gen info openai/gpt-image-2/edit --format json > work/<project>/openai-gpt-image-2-edit.info.json
ai-gen info openai/gpt-image-2 --format json > work/<project>/openai-gpt-image-2.info.json
ai-gen info fal-ai/bria/background/remove --format json > work/<project>/fal-ai-bria-background-remove.info.json   # pixel_identical only
```

Exit 8 means the endpoint is unknown. For each route, print its raw OpenAPI fields (const, enum, default) with the raw OpenAPI printer from media-ai-gen's SKILL.md, into `fal-ai-nano-banana-pro-edit.schema.txt`, `fal-ai-nano-banana-pro.schema.txt`, `openai-gpt-image-2-edit.schema.txt`, `openai-gpt-image-2.schema.txt` and `fal-ai-bria-background-remove.schema.txt`:

```bash
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>" | python3 -c '<raw OpenAPI printer from media-ai-gen SKILL.md>' > work/<project>/<route-file-name>.schema.txt
```

The printer must not print UNRESOLVED, and every value the params will set must appear in the printed enum or const. List every field the printer shows with a default that is on (for example `enable_safety_checker` default true, `sync_mode`, `output_format`): step 4 pins each one. The printer is the authority over Studio prose; the live schema lists `enable_safety_checker` and `sync_mode` on both gpt-image-2 routes.

Use text search only as fallback discovery, when a routed id exits 8 or prints UNRESOLVED, one keyword at a time: `ai-gen models --search <keyword> --format json`. There is no documentation search on SL8.

- Use schema fields exactly. Do not pass guessed flags. If the model uses `image_urls`, `reference_image_url`, `aspect_ratio`, `duration`, `seed`, or another name, mirror that schema. On SL8, Nano Banana takes `aspect_ratio` and `resolution`; gpt-image-2 takes `image_size` and `quality`. `--strict-params` refuses any other key.

## 4. Build the prompt skeleton and per-cell params

pixel_identical jobs skip this step and go to step 5, where only Bria is priced. Otherwise load `media-image-generation` (Skill tool) and read `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` (the prompt build order, the E-commerce PDP image template, material cues, negative prompt components), `${CLAUDE_SKILL_DIR}/reference/examples.md`, and the E-commerce batch recipe in `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Write the prompt from the PDP template, in the source's build order.

- E-commerce batch: keep the same prompt skeleton and vary only background,
  crop, lighting, or platform format.

**The skeleton** is the invariant core every cell shares word for word, in build order: product invariant (exact object, material, colour, packaging, plus 'exactly as in Image 1, label and packaging unchanged' when there is a packshot); PDP role (clean product catalog photography); lighting (the brief's, or even softbox lighting plus the material cue); camera (front-facing, accurate silhouette, high detail); composition (centred); brand tone; guardrails as positive clauses. It carries no background, crop or framing clause, and no lighting or format clause that a cell varies. 'Full product in frame' belongs only to the full-product deltas, so a close-up cell never gets contradictory instructions.

Each cell prompt is the skeleton plus exactly one delta clause. A single PDP image is one cell. Default deltas when the brief names no cells:
- white: on seamless pure white, full product in frame, realistic soft shadow.
- brand-color: on seamless <brand_color>, full product in frame, realistic soft shadow.
- detail: close-up crop where the scale or detail feature fills the frame, on seamless white.
- packaging: close-up crop where the label and packaging fill the frame, on seamless white.

A close-up cell whose detail must stay readable sets `resolution` to "2K". Nano Banana takes no `negative_prompt`: write the negative components as positive guardrails ('the only object', 'label and packaging unchanged', 'plain unlettered surfaces') and note under Known gaps that the model does not enforce them. Never write copy, prices, claims or invented label text into a prompt.

Write the skeleton and one params file per cell, each prompt one line with no single quotes and no em dashes. Pin every default-on field the step 3 printer lists for the route, at the value you mean (for example `"sync_mode":false` and `"output_format":"png"` when printed):

```bash
printf '%s' '<skeleton>' > artifacts/<project>/params/skeleton.txt
cat > artifacts/<project>/params/<cell>.params.json <<'EOF'
{"prompt":"<skeleton> <one-clause delta>","aspect_ratio":"1:1","resolution":"1K","num_images":1,"safety_tolerance":"4","limit_generations":true,"enable_web_search":false}
EOF
```

On the gpt-image-2-edit-primary option, write `<cell>.gpt.params.json` for each cell instead, in that family's sectioned grammar (its Preserve section carries the product invariant, so it is exempt from the skeleton grep). For 4:5 use `"image_size":{"width":1024,"height":1280}`:

```bash
cat > artifacts/<project>/params/<cell>.gpt.params.json <<'EOF'
{"prompt":"Image 1: the product packshot. Change: <the cell's delta clause>. Preserve: <the product invariant from skeleton.txt>, exact shape, label and colour from Image 1. Constraints: single product, no added text.","image_size":"square_hd","quality":"high","num_images":1,"output_format":"png","background":"opaque","enable_safety_checker":true,"sync_mode":false}
EOF
```

Check the prompts; each line must print nothing:

```bash
for f in artifacts/<project>/params/*.params.json; do case "$f" in *.gpt.params.json|*/cutout.params.json) continue;; esac; grep -qF "$(cat artifacts/<project>/params/skeleton.txt)" "$f" || echo "NO-SKELETON $f"; done
grep -l '—' artifacts/<project>/params/*.params.json
grep -Eil 'best|clinically|proven|percent|guarantee|discount|price' artifacts/<project>/params/*.params.json
```

## 5. Estimate every paid step and gate on the planned total

Load `media-ai-gen` (Skill tool). Before the first paid call, price every paid step of attempt 1 from its own params file:

```bash
ai-gen estimate fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/<cell>.params.json --format json   # fal-ai/nano-banana-pro without a packshot; skipped when pixel_identical
ai-gen estimate openai/gpt-image-2/edit --params-file artifacts/<project>/params/<cell>.gpt.params.json --format json   # gpt-image-2-edit-primary option only
echo '{}' > artifacts/<project>/params/cutout.params.json && ai-gen estimate fal-ai/bria/background/remove --params-file artifacts/<project>/params/cutout.params.json --format json   # pixel_identical only
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Add up the quotes and write each quote and the total into plan.json, in credits only (never `estimated_usd`). Gate on the total, because parallel submits each see the whole budget. Exit 12 from `estimate` means the route has no price, so it never runs inside a budget. The total covers attempt 1; each retry is estimated and gated on its own at step 10. For reference, media-image-generation's facts record Nano Banana Pro at 37.5 cr per image at 1K and 2K; the estimate is the number that counts.

If the total is over the remaining figure, spend nothing, open a gate, write PROGRESS.md and end, leaving `outcome.json` partial:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-pdp-set --question "<n> PDP cells on <route>, <sum> credits" --options '[{"id":"a","label":"Run all cells","credits":<sum>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "6. Generate the single PDP image (or the batch base cell)" --quote <sum>
```

On the pixel_identical path use `--resume-at "8. Cutout and composite (pixel_identical only)"`. Every params file the resumed step needs is already under `artifacts/<project>/params/`. If the gate is later answered `b` (Stop here), the resumed job spends nothing and the outcome stays partial (step 1).

## 6. Generate the single PDP image (or the batch base cell)

pixel_identical jobs skip this step and step 7. Load `media-ai-gen` and `media-image-generation` (Skill tool). Run the white cell (or the background the brief names). Every paid call uses `--queue` and `--strict-params`.

```bash
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/white.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/white.result.json
```

Without a packshot, run `fal-ai/nano-banana-pro` with no `--ref`:

```bash
ai-gen run fal-ai/nano-banana-pro --params-file artifacts/<project>/params/white.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/white.result.json
```

On the gpt-image-2-edit-primary option, run `openai/gpt-image-2/edit` with `white.gpt.params.json` and its own quote, in the same form.

Read the downloaded path from `files[0].local_path` (never guess a name), the request id from the envelope and the aspect from plan.json; rename, and write one row with the renamed path. Without a packshot, leave out `parents`.

```bash
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/white.result.json)
RID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['request_id'])" work/<project>/white.result.json)
A=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['declared']['aspect'])")
mv "$F" artifacts/<project>/final/white_${RID}_a1.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/white.result.json --params artifacts/<project>/params/white.params.json --json '{"item":"white","node":"final","declared":{"aspect":"'"$A"'","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["final/white_'"$RID"'_a1.png"]}'
```

On exit 10 (timeout) or 14 (download failed), never resubmit. The request id is in `error.details.requestId`, or in `~/.cache/ai-gen/jobs.json` if the command was cut off. Fetch the result, then rename and add the row as above:

```bash
ai-gen result <request-id> -o artifacts/<project>/final/ --format json > work/<project>/white.result.json
```

For every other exit code, follow media-ai-gen's recovery table.

## 7. Run the batch matrix (e-commerce-batch-set only)

Follow the E-commerce batch recipe in `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Run one queued call for each remaining cell, each from its own params file and the original packshot. Shell variables do not carry over between steps, so re-read A:

```bash
A=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['declared']['aspect'])")
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/<cell>.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/<cell>.result.json
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<cell>.result.json)
RID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['request_id'])" work/<project>/<cell>.result.json)
mv "$F" artifacts/<project>/final/<cell>_${RID}_a1.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<cell>.result.json --params artifacts/<project>/params/<cell>.params.json --json '{"item":"<cell>","node":"final","declared":{"aspect":"'"$A"'","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["final/<cell>_'"$RID"'_a1.png"]}'
```

On the gpt-image-2-edit-primary option, run `openai/gpt-image-2/edit` with `<cell>.gpt.params.json` and that file in `--params`. Without a packshot, the white base frame from step 6 stands in for the source's 'pick the strongest frame': pass `--ref artifacts/<project>/final/white_<request_id>_a1.png` on `fal-ai/nano-banana-pro/edit` and set `parents` to that path. When variants were budgeted (`num_images` above 1), rename each `files[i].local_path` to `<cell>_<request_id>_a1_<i>.png` and list every renamed path in that row; the owner, not the agent, picks the strongest from qc/contact.jpg. On exit 10 or 14, fetch with `ai-gen result`, as at step 6.

## 8. Cutout and composite (pixel_identical only)

When the product must stay pixel-identical, no generative model touches it. Load `media-photo-editing`, `media-ai-gen` and `media-qc` (Skill tool). Cut the product out with Bria (quote <q> from step 5), measure the cutout and write its generation row:

```bash
ai-gen run fal-ai/bria/background/remove --params-file artifacts/<project>/params/cutout.params.json --image artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <q> -o artifacts/<project>/source/ --format json > work/<project>/cutout.result.json
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/cutout.result.json)
RID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['request_id'])" work/<project>/cutout.result.json)
mv "$F" artifacts/<project>/source/cutout_${RID}.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/cutout_${RID}.png --alpha required --format png > work/<project>/cutout.qc.json
M=$(python3 -c "import json,sys;q=json.load(open(sys.argv[1]));print(json.dumps(q.get('figures',q)))" work/<project>/cutout.qc.json)
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/cutout.result.json --params artifacts/<project>/params/cutout.params.json --json '{"item":"cutout","node":"source","declared":{"format":"png","alpha":"required"},"credits":{"estimate":<q>},"attempt":1,"parents":["source/<packshot>"],"files":["source/cutout_'"$RID"'.png"],"measured":'"$M"'}'
```

Size the canvas from the cutout's alpha box, so the product fills at most 80% of each side at the declared aspect and is never resized. Then read the aspect and the background colour (`background_color` in plan.json, #FFFFFF for seamless white):

```bash
python3 -c "import json,sys,math;from PIL import Image;p=json.load(open(sys.argv[1]));x0,y0,x1,y1=Image.open(sys.argv[2]).getchannel('A').getbbox();bw,bh=x1-x0,y1-y0;a,b=map(int,p['declared']['aspect'].split(':'));s=max(bw/(0.8*a),bh/(0.8*b));W=math.ceil(a*s);H=math.ceil(b*s);W+=W%2;H+=H%2;p['declared'].update(width=W,height=H);json.dump(p,open(sys.argv[1],'w'),indent=1);print(W,H)" artifacts/<project>/plan.json artifacts/<project>/source/cutout_${RID}.png
A=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['declared']['aspect'])")
HEX=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json')).get('background_color','#FFFFFF'))")
```

Composite the unchanged cutout at 1:1 scale onto HEX with a soft contact shadow, check that it was not resampled (the grep must print nothing), measure it, and write its one tool row with `measured`:

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/composite.py artifacts/<project>/source/cutout_${RID}.png "$HEX" artifacts/<project>/plan.json artifacts/<project>/final/<cell>_composite.png 2> work/<project>/composite.log; grep -q 'scaled product' work/<project>/composite.log && echo RESAMPLED
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/<cell>_composite.png --aspect "$A" --alpha forbidden --format png > work/<project>/<cell>.qc.json
M=$(python3 -c "import json,sys;q=json.load(open(sys.argv[1]));print(json.dumps(q.get('figures',q)))" work/<project>/<cell>.qc.json)
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"<cell>","node":"final","tool":"python3 scripts/composite.py","parents":["cutout#1"],"declared":{"aspect":"'"$A"'","format":"png","alpha":"forbidden"},"measured":'"$M"',"files":["final/<cell>_composite.png"]}'
```

This carries out the Background replacement pattern in `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` without a prompt. Never use the fallback `fal-ai/bria/background/replace` on this path: it is generative and may redraw the product. The owner reviews the cutout edges and the shadow.

## 9. Measure every output

Load `media-qc` and `media-ai-gen` (Skill tool). Measure every delivered file, then review it against the source's quality bar.

Before returning, check:

- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting makes sense for the product material.

- Output paths come from `files[].local_path` through the manifest, not from manually curled URLs.

For each generation cell, use that attempt's own result file, params file, estimate and file name (attempt 1, 2 or 3):

```bash
A=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['declared']['aspect'])")
RID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['request_id'])" work/<project>/<cell>.result.json)
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/<cell>_${RID}_a1.png --id <cell> > work/<project>/<cell>.qc.json
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/<cell>_${RID}_a1.png --aspect "$A" --format png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/source/<packshot> artifacts/<project>/final/ --out artifacts/<project>/qc/contact.jpg
M=$(python3 -c "import json,sys;q=json.load(open(sys.argv[1]));print(json.dumps(q.get('figures',q)))" work/<project>/<cell>.qc.json)
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<cell>.result.json --params artifacts/<project>/params/<cell>.params.json --json '{"item":"<cell>","node":"final","declared":{"aspect":"'"$A"'","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["final/<cell>_'"$RID"'_a1.png"],"measured":'"$M"'}'
```

`mediaqc declared` reads each file's declaration from its manifest row, which was copied from plan.json. Without a packshot the sheet tiles only `final/`. Tool rows (step 8) already carry `measured` and are not re-added. Report figures, never PASS:
- Exit 0: the figures go in the row.
- Exit 1: a measured failure; the item goes to step 10.
- Exit 3: reported as 'not checked' and named as a debt.

Fidelity against the packshot, props, text, lighting, crop room and background uniformity go to the owner's review on qc/contact.jpg. No media-qc check covers a uniform seamless background.

## 10. Retry or fall back

If the result misses product fidelity, switch from text-only generation to a
reference or edit workflow before retrying.

Load `media-ai-gen` and `media-image-generation` (Skill tool). Retry an item only on a measured failure (media-qc exit 1). A fidelity defect the run cannot measure (the reject rule in reference/workflows.md) goes to the owner's review, never to a retry on the agent's judgement. Without a packshot there is no reference to switch to, so the delivery keeps the 'unanchored' flag.

Attempt 2 moves exactly one named lever (a prompt clause, the reference or the aspect); the skeleton stays verbatim. It has its own params file, estimate and file name:

```bash
cp artifacts/<project>/params/<cell>.params.json artifacts/<project>/params/<cell>.a2.params.json
ai-gen estimate fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/<cell>.a2.params.json --format json && node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

If q2 does not fit what remains, spend nothing, open a gate, write PROGRESS.md and end partial. A `b` answer (Stop: deliver as is) spends nothing and the outcome stays partial:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-retry-<cell> --question "Retry <cell> on <route>, <q2> credits" --options '[{"id":"a","label":"Retry <cell>","credits":<q2>},{"id":"b","label":"Stop: deliver as is","credits":0}]' --resume-at "10. Retry or fall back" --quote <q2>
```

Otherwise run it, rename, and add the row:

```bash
A=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['declared']['aspect'])")
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/<cell>.a2.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <q2> -o artifacts/<project>/final/ --format json > work/<project>/<cell>.a2.result.json
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<cell>.a2.result.json)
RID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['request_id'])" work/<project>/<cell>.a2.result.json)
mv "$F" artifacts/<project>/final/<cell>_${RID}_a2.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<cell>.a2.result.json --params artifacts/<project>/params/<cell>.a2.params.json --json '{"item":"<cell>","node":"final","declared":{"aspect":"'"$A"'","format":"png"},"credits":{"estimate":<q2>},"attempt":2,"lever":"<lever>","parents":["source/<packshot>"],"files":["final/<cell>_'"$RID"'_a2.png"]}'
```

If the submit fails, record it without `--result` (`manifest.mjs` refuses an error envelope), with the request id from `error.details` in place of null when there is one:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/<cell>.a2.params.json --json '{"item":"<cell>","node":"final","endpoint":"fal-ai/nano-banana-pro/edit","request_id":null,"status":"failed","declared":{"aspect":"1:1","format":"png"},"credits":{"estimate":<q2>},"attempt":2,"lever":"<lever>","notes":"exit <n> <error.code>"}'
```

On a second failure, cross families to `openai/gpt-image-2/edit` (`openai/gpt-image-2` with no `--ref` when there is no packshot). Rebuild the params in that route's own fields, every default-on flag pinned; never reuse Nano Banana fields:

```bash
cat > artifacts/<project>/params/<cell>.gpt.params.json <<'EOF'
{"prompt":"Image 1: the product packshot. Change: <the cell's delta clause>. Preserve: <the product invariant from skeleton.txt>, exact shape, label and colour from Image 1. Constraints: single product, no added text.","image_size":"square_hd","quality":"high","num_images":1,"output_format":"png","background":"opaque","enable_safety_checker":true,"sync_mode":false}
EOF
ai-gen estimate openai/gpt-image-2/edit --params-file artifacts/<project>/params/<cell>.gpt.params.json --format json && node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
ai-gen run openai/gpt-image-2/edit --params-file artifacts/<project>/params/<cell>.gpt.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <q3> -o artifacts/<project>/final/ --format json > work/<project>/<cell>.gpt.result.json
```

For 4:5 set `image_size` to `{"width":1024,"height":1280}`. Without a packshot, write the prompt as Scene / Subject / Important details / Use case / Constraints, with the same pinned flags. Gate as above with `--slug approve-fallback-<cell>` if q3 does not fit. Rename the output to `final/<cell>_<request_id>_a3.png` and add its row with `--result work/<project>/<cell>.gpt.result.json --params artifacts/<project>/params/<cell>.gpt.params.json`, `"attempt":3`, `"lever":"route: openai/gpt-image-2/edit"` and `"credits":{"estimate":<q3>}`. On exit 10 or 14 never resubmit: `ai-gen result <request-id> -o artifacts/<project>/final/ --format json`. For every other exit code, follow media-ai-gen's recovery table. Re-run the step 9 checks, unchanged, on each replacement.

## 11. Deliver

Load `media-ai-gen` (Skill tool). Verify the manifest and print the budget:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

`verify` must exit 0, and spend must stay within the planned total plus any gated retries. The delivery note is `artifacts/<project>/PROGRESS.md`: the title line from media-ai-gen's gates-and-manifest.md, then six sections:
- `## Summary`
- `## Decisions`: routes, aspect, the defaults chosen.
- `## Asset inventory`: final/, source/, qc/, params/.
- `## Pipeline`: the batch table of output path, concept, endpoint, request id, credits and notable defects; manifest.json is the map from each file to its prompt and model.
- `## Known gaps`: debts and owner review items (unenforced negatives, a skipped brand-color cell, the lifestyle hand-off, copy to composite, unanchored fidelity, 'not checked' figures, any cell left by a Stop answer).
- `## Next steps`

```bash
for h in Summary Decisions 'Asset inventory' Pipeline 'Known gaps' 'Next steps'; do grep -q "^## $h" artifacts/<project>/PROGRESS.md || echo "MISSING $h"; done
printf '{"status":"done"}' > artifacts/<project>/outcome.json
```

Write `done` only when every cell is delivered, no spend gate is open and no gate was answered Stop; a resumed job that delivers overwrites an earlier gate's `partial`. Otherwise `outcome.json` stays partial. Close with the folder tree, the file count and the credits spent.

## Model choice

- Text-heavy ads, labels, posters, UI mockups, packaging copy, and
  infographics: use `openai/gpt-image-2` at `quality=high`. Prefer 2K or 4K
  when the final must carry small readable details. Treat this as expensive.
- Premium realistic stills: use `openai/gpt-image-2`.
- Premium stylized stills: use `openai/gpt-image-2`, then
  `fal-ai/nano-banana-pro`, then `fal-ai/nano-banana-2`.
- Fast draft stills: use `fal-ai/flux-2/klein/9b`.
- Image edits: use `fal-ai/nano-banana-pro/edit`, then
  `openai/gpt-image-2/edit`, then `fal-ai/bytedance/seedream/v5/lite/edit`.
- Product fidelity: use `fal-ai/nano-banana-pro`, `fal-ai/nano-banana-2`, or
  `fal-ai/bytedance/seedream/v5/lite/text-to-image`; use the matching edit
  endpoint when a product reference image exists.

On SL8 this kit applies those lines as follows:
- PDP edit from a packshot (steps 6 and 7): `fal-ai/nano-banana-pro/edit`. fal's first edit pick and the Studio default agree ('fast, strong product fidelity'). The alternative, and the step 10 fallback, is `openai/gpt-image-2/edit`, fal's second edit pick, for text-on-packaging accuracy.
- PDP without a packshot (step 6): `fal-ai/nano-banana-pro`, the Studio's measured incumbent (37.5 cr against 52.75). fal's pick for premium realistic stills, `openai/gpt-image-2` at quality=high, is the alternative and the step 10 fallback.
- Small readable detail: from the text-heavy line the kit takes only 'prefer 2K when the final must carry small readable details', as the 2K detail cell. Exact copy is never generated in the image (HR10).
- Pixel-identical product (step 8): `fal-ai/bria/background/remove` plus a local composite. Its fallback, `fal-ai/bria/background/replace`, is generative and never used on this path.
- Not used for PDP finals: the stylized chain and the `fal-ai/flux-2/klein/9b` draft (a draft is never final commercial delivery). The third edit pick, seedream v5 lite edit, has no Studio route.
- The single test run uses the packshot route (`fal-ai/nano-banana-pro/edit`), so it does not settle the text-only comparison.

## On SL8

This kit runs on the SL8 Image Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules: declare before spending (HR1); estimate every paid step and gate on the total (HR5); never resubmit a job that may already exist (HR6); deliverables under `artifacts/<project>/` (HR8) with one manifest row per generation (HR9); exact copy and logos never go through a generative model (HR10); edit from the original (HR11); never ask, use the defaults above and gate on spend, and a Stop answer spends nothing (HR12); report figures, never verdicts (HR13, HR14); record a waiver for any instruction that breaks a rule (HR20); never install anything (HR21). When this kit is silent, media-ai-gen's recovery table governs exit codes.
