---
name: c06-making-lifestyle-photo
description: "Product lifestyle photo, lifestyle shot, product in use, product in context, product photo into a lifestyle background. Makes one product lifestyle still on the SL8 Image Studio, with variants only when the brief asks for them. The still shows the customer's product in use in a specific real setting, with a person or surroundings, and keeps the product sharp, readable and true to the original. For brand, e-commerce and social jobs. With an attached product photo it edits the photo into the setting on fal-ai/nano-banana-pro/edit, or on openai/gpt-image-2/edit when a reference scene is also attached. When the brief demands pixel-identical product pixels, it uses a Bria cutout and a local composite. With no photo, it builds the scene from text on fal-ai/nano-banana-pro. It quotes every paid call first, writes one manifest row per generation, measures each output with media-qc and leaves a contact sheet for the owner. Not for hero packshots, white-background PDP images, ad safe-zone frames or reveal videos."
license: MIT
compatibility: "SL8 Image Studio 1.0.2 (sl8-image build 333aaa35); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: image/product-lifestyle
  source: "D1/commercial (fal community)"
  status: untested
---

## Factory steps on this bot

This skill runs as a job of an SL8 bot. Three steps wrap the kit workflow below; keep the kit's steps as they are.

- [ ] A. Before the kit's first step creates any folder or file, save the request word for word to `work/request.md` and run `node ${CLAUDE_SKILL_DIR}/scripts/inputs.mjs work/request.md`. Exit 1 means no product: write nothing under `artifacts/`, spend nothing, and end partial, saying what to send (its `say`). If the brief speaks of the customer's own photo or packshot ("from my photo", "our packshot") and no image is in `artifacts/attachments/`, end partial the same way and ask them to attach it; never switch to the text route for a promised image. Otherwise, once the kit's first step has the project slug, copy `work/request.md` to `artifacts/<project>/inputs/request.md`. Every field in `assume` takes the kit's default, named under Decisions in PROGRESS.md. Wherever the kit writes `artifacts/attachments/<file>`, `<file>` is the file's base name, even when the brief gives a full path.
- [ ] B. Before the kit writes outcome.json done, run `node ${CLAUDE_SKILL_DIR}/scripts/validate.mjs artifacts/<project>/final/lifestyle-01.png --request artifacts/<project>/inputs/request.md` for final/lifestyle-01.png (or the still this job delivered). Fix what it names and rerun until it prints ok.
- [ ] C. Last, write `artifacts/<project>/inputs/job.json` (job `lifestyle-photo`, what, state, the context used, decisions made and open, deliverables, blockers) and run `node ${CLAUDE_SKILL_DIR}/../c06-router/scripts/status.mjs --project <project> --record artifacts/<project>/inputs/job.json`.

## Product lifestyle stills on SL8

Use this skill when the user wants a product lifestyle still: the product in use in a real setting, with a person or surroundings, the product kept sharp and readable. Load the reference files at the step that names them, when you need prompt patterns, examples or a step's worked commands:

- `${CLAUDE_SKILL_DIR}/reference/photo-intake.md` (step 3: find, probe and convert the product photo)
- `${CLAUDE_SKILL_DIR}/reference/routing.md` (step 4: the fal routing lines behind the model choice)
- `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` (step 6: the lifestyle and background replacement templates, material cues, negative components)
- `${CLAUDE_SKILL_DIR}/reference/examples.md` (step 6: the reference-quality prompts for both options, and how to use them)
- `${CLAUDE_SKILL_DIR}/reference/workflows.md` (steps 2, 6 and 12: the reference-photo workflow, controlled variants, the reject rule, the claims rule)
- `${CLAUDE_SKILL_DIR}/reference/pixel-exact.md` (step 11: cutout, empty setting, composite)
- `${CLAUDE_SKILL_DIR}/reference/retry-fallback.md` (step 13: retry and fallback)
- `${CLAUDE_SKILL_DIR}/reference/copy-overlay.md` (step 14: supplied copy or logo)

This kit names its own models (step 4 and Model choice). It does not load a routing companion skill, because SL8 refuses fal skills. `media-image-generation`'s routing table is the fallback. The kit's helpers are `${CLAUDE_SKILL_DIR}/scripts/convert.py`, `${CLAUDE_SKILL_DIR}/scripts/composite.py` and `${CLAUDE_SKILL_DIR}/scripts/overlay.py`.

Keep the output production-focused. Do not add inflated marketing language,
unsupported claims, fake text in the image, or em dashes.

## Inputs to collect

Read every input from the brief or from the files attached to it, which are in `artifacts/attachments/`. Never stop the job to ask the customer a question. When an input is missing, use the default in the table below and name it in the delivery note as a chosen default.

- Product: exact product name, category, material, color, scale, logo rules.

- Goal: lifestyle. This kit makes only the product in use in a real setting.

- Platform: square, vertical, landscape, banner. This sets `<aspect>` in plan.json. The aspect is always sent explicitly.

- Brand: premium, playful, clinical, athletic, minimal, natural, technical.
- Source media: product packshot, logo, reference scene, prior generated asset.
- Constraints: preserve packaging, avoid new labels, no fake readable copy.

- Model preference: use this kit's routes (step 4 and Model choice) unless the brief names a model or the job is unusually expensive (step 7 quotes it and gates it). A model named in the brief wins. If it breaks a house rule, record the waiver (step 2, HR20).

How each source medium is used: the product packshot is Image 1. A reference scene is Image 2, labelled 'the setting reference' in the prompt. A job with both is a multi-reference composite and goes to `openai/gpt-image-2/edit` (step 4). No job sends more than these two references. A prior generated asset is accepted as the product photo, and the delivery note records an HR11 debt: the edit started from a render. A logo never passes through a model (HR10). It is composited last, in step 14.

Defaults when the brief is silent:

| Input | Default |
|---|---|
| product | required. A brief with no product ends the job partial, and the missing product is named as the debt |
| product_photo | none. Look in `artifacts/attachments/`. If the brief says a photo is attached and the file is not there, stop partial and name the missing file (step 3). Never switch to generated-scene silently. If the brief promises no photo, take generated-scene, and the delivery note says that product fidelity rests on the text alone. A prior render is used, with an HR11 debt |
| reference_scene | none. When one is attached it is Image 2, 'the setting reference', and the route is `openai/gpt-image-2/edit` |
| setting | one everyday setting where this product category is normally used (a kitchen counter for kitchenware), named as a chosen default |
| interaction | environment only, no person. A person appears only when the brief asks, and then as a generic person with no real likeness (HR17) |
| time of day and light | soft morning window light from the left: one named source with a direction, matched to the product's material cue |
| brand tone | warm, natural |
| lens feel | 50mm feel, with the product inside the depth of field |
| platform | 1:1. When the brief names a platform: 4:5 for a PDP, 16:9 for a banner, 9:16 for a story |
| constraints | preserve the packaging, avoid new labels, no fake readable copy, no extra logos |
| copy and logo | none. The model never generates text. No legal, pricing, discount or health claim appears unless the user supplies the exact copy. Supplied copy or a logo is composited last (step 14), and any claim in it is flagged for the user's confirmation (HR18) |
| variants | 1. When the brief asks for 2 to 4, each variant changes one dimension only (background, lighting, camera angle or prop set). Each is its own item (lifestyle-02..04) with its own call, and all are quoted together before the first submit (HR5). Every variant is delivered and the owner picks |
| model_preference | the routes of step 4 |
| resolution | 1K on Nano Banana, a 1024-class image_size on gpt-image-2. 2K only when the brief asks for print-size detail, or for the pixel-exact setting when the cutout does not fit a 1K frame (pixel-exact.md). Always quoted |
| pixel_exact | false. It is true only when the brief says pixel-identical, pixel-exact, untouched pixels or 'do not regenerate the product', or names a marketplace or compliance main image. 'Keep the product exactly as it is' or 'no changes to its shape' alone is a fidelity instruction for the generative edit, not pixel_exact. When pixel_exact is true and a photo exists, step 11 replaces steps 8 to 10. If the brief also asks for a person touching the product, pixel_exact cannot hold: run the generative edit and name this as a debt |
| project | kebab-case slug of the product name plus -lifestyle |
| budget | the 'remaining' figure that `manifest.mjs budget` prints in step 2 (SL8_SPEND_CEILING minus the ledger), or the brief's budget if that is smaller. A planned spend above it opens a spend gate |

## Workflow on SL8

### 1. Load the Studio skills, resume, start the project

Load `media-ai-gen`, `media-image-generation`, `media-photo-editing` and `media-qc` (Skill tool). On every job, new or resumed, first create the scratch folder (`work/<project>/` is lost between jobs), then read the gate status:

```bash
mkdir -p work/<project>
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>
```

- Exit 0: continue.
- Exit 10 and the brief does not answer the gate: spend nothing, write PROGRESS.md (step 15) with the open gate under Known gaps, leave outcome.json `partial`, and end.
- Exit 10 and the brief answers the gate: record the answer in the brief's own words:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <id> --option <a|b> --by "<the brief's words>"
```

Option a approves the spend. Resume at the gate's resume_at step. Read the params from `artifacts/<project>/params/`, and read the route, quote and caps from `artifacts/<project>/plan.json`. On every gate of this kit, option b is Stop: spend nothing, write PROGRESS.md with the gate and its answer under Known gaps, leave outcome.json `partial`, and end.

Start or check the manifest. Before anything new is submitted, fetch any row that is still pending (HR6). Then check the CLI:

```bash
test -f artifacts/<project>/manifest.json || node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
ai-gen result <pending request-id> -o artifacts/<project>/final/ --format json > work/<project>/<stem>.result.json
ai-gen doctor
```

On a resumed project, verify must exit 0. `ai-gen result` runs only for a pending row. A doctor failure is reported in PROGRESS.md and never repaired. Nothing is installed (HR21).

### 2. Read the brief, read the budget, declare defaults

Fill each input from the brief or from the defaults table, and decide pixel_exact by the trigger in that table. Create every folder the job writes to. Read what remains of the ceiling, then declare the output before any spend (HR1). `<aspect>` is 1:1 unless the brief names a platform. `<n>` is the variant count. `budget.credits` is the remaining figure that the budget command prints, or the brief's budget if that is smaller. `defaults` lists each default chosen:

```bash
mkdir -p work/<project> artifacts/<project>/final artifacts/<project>/source artifacts/<project>/qc artifacts/<project>/params
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
cat > artifacts/<project>/plan.json <<'EOF'
{"schema":"sl8.media.plan/1","project":"<project>","declared":{"aspect":"<aspect>","format":"png","resolution":"1K","count":<n>},"budget":{"credits":<remaining from manifest.mjs budget, or the brief's budget if smaller>,"approved_by":"brief"},"defaults":<object of each default chosen>,"pixel_exact":<true|false>,"rows":[]}
EOF
python3 -c "import json;d=json.load(open('artifacts/<project>/plan.json'));print(d['declared']['aspect'],d['declared']['format'],d['budget']['credits'])"
```

The last line must print the aspect, png and a number. Every later `<aspect>` is read from plan.json. When the brief asks for variants, read the controlled-variants rule in `${CLAUDE_SKILL_DIR}/reference/workflows.md`. If the brief tells you to do something that breaks a house rule (for example, it names a model), do it and record the waiver (HR20):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule <HRn> --instruction "<the brief's words>"
```

### 3. Find and probe the product photo

There is no separate upload step. The product photo (and the reference scene, if any) goes into the run call itself through `--ref` (step 8). Load `media-qc` and `media-photo-editing` (Skill tool), then read and follow `${CLAUDE_SKILL_DIR}/reference/photo-intake.md`. It:

- lists `artifacts/attachments/`. If the brief promises a photo (or a reference scene) and the file is not there, it writes PROGRESS.md and outcome.json `partial` naming the missing file, and the job stops with nothing spent. It never switches to generated-scene silently (HR15).
- branches on the file extension first. HEIC/HEIF, RAW and every format other than png, jpg, jpeg and webp go straight to `${CLAUDE_SKILL_DIR}/scripts/convert.py`. A PNG, JPEG or WebP is probed with Pillow. It goes through convert.py when its EXIF orientation is not 1 or the file is over 3 MB. Otherwise it is copied as is to `artifacts/<project>/source/product.<ext>` (the scene to `source/scene.<ext>`).
- measures the file under source/ with media-qc and records a tool row only when convert.py ran.

When the brief promises no photo, skip this step and take generated-scene.

### 4. Pick the option and the route

Read `${CLAUDE_SKILL_DIR}/reference/routing.md` and Model choice below.

- Step 3 found a photo and no reference scene: product-photo-into-lifestyle-background. Primary `fal-ai/nano-banana-pro/edit`, fallback `openai/gpt-image-2/edit`, refs 1.
- A photo and a reference scene: the same option as a multi-reference composite. Primary `openai/gpt-image-2/edit` (its grammar labels each input by role, as in the Studio's multi-reference row), fallback `fal-ai/nano-banana-pro/edit`, refs 2.
- No photo was promised: generated-scene. Primary `fal-ai/nano-banana-pro`, fallback `openai/gpt-image-2` at quality=high, refs 0.
- pixel_exact is true and a photo exists: primary `fal-ai/bria/background/remove`, fallback None, refs 1. Step 11 replaces steps 8 to 10.
- A model named in the brief becomes the primary.

Write the route into plan.json. Every later step reads the primary and the fallback from there. Use Python literals (True, False, None):

```bash
python3 -c "import json;p='artifacts/<project>/plan.json';d=json.load(open(p));d['route']={'option':'<option>','primary':'<primary>','fallback':<'<fallback>' or None>,'pixel_exact':<True|False>,'refs':<0|1|2>};json.dump(d,open(p,'w'))"
```

Before step 5, plan.json must hold route.primary and route.fallback (null on the pixel-exact path).

### 5. Confirm every route and read its schema

Start from the routed endpoint IDs. Load `media-ai-gen` (Skill tool) and run `ai-gen info` on every route the job may use: route.primary and route.fallback, and on the pixel-exact path `fal-ai/bria/background/remove` and `fal-ai/nano-banana-pro` for the setting. Before any paid call, save each route's raw OpenAPI Input fields:

```bash
ai-gen info <route> --format json
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<route>" | python3 -c "<raw OpenAPI printer from media-ai-gen SKILL.md>" > work/<project>/<schema-name>.schema.txt
```

Each route has a fixed `<schema-name>`, so no two routes share one: `nbp-edit` (fal-ai/nano-banana-pro/edit), `nbp` (fal-ai/nano-banana-pro), `gpt-image-2-edit` (openai/gpt-image-2/edit), `gpt-image-2` (openai/gpt-image-2), `bria-bg-remove` (fal-ai/bria/background/remove).

Use text search only as fallback discovery. On exit 8 or UNRESOLVED, search one keyword at a time (`ai-gen models --search nano-banana`, `gpt-image` or `bria`) and report the stale pick. SL8 has no documentation search.

6. Use schema fields exactly. Do not pass guessed flags. If the model uses
   `image_urls`, `reference_image_url`, `aspect_ratio`, `duration`, `seed`, or
   another name, mirror that schema.

On SL8, unknown fields are dropped silently (HR3), and info shows a const as a plain default (HR2). Nano Banana sizes with `aspect_ratio` plus `resolution`; gpt-image-2 sizes with `image_size`. Every key planned in step 6 must be in that route's schema file and fit its enum or const. A key the file lacks is removed, never sent. Every field the file shows with a default (quality, background, safety_tolerance, enable_safety_checker, limit_generations, enable_web_search, sync_mode, resolution, output_format) is pinned in step 6 (HR4).

### 6. Build the prompt and the params files

Read `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md`, `${CLAUDE_SKILL_DIR}/reference/examples.md` and `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Write the prompt in the Prompt build order below. Keep the product invariant short and exact, and apply the product's material cue.

- Photo option: use the Background replacement pattern as written, plus the setting, time of day, brand tone, lens feel and platform crop clauses of the Product with lifestyle context pattern. The prompt carries the product invariant and 'keep the uploaded product exactly unchanged'. A briefed person appears in the setting without altering the product. With a scene, add: 'Image 1: the product photo. Image 2: the setting reference.'
- Generated-scene: fill the Product with lifestyle context template.

Neither family has a negative_prompt field. Turn the relevant negative components into positive clauses ('label stays exactly as in the reference, single product, full product in frame'). Nothing goes into the prompt that the brief did not supply: no text, logo or claim (HR10, HR18).

Write `lifestyle-01.params.json` in the primary route's shape and `lifestyle-01-fb.params.json` in the fallback route's shape, both under `artifacts/<project>/params/`. For the fallback, rewrite the prompt in that family's grammar; never resend it unchanged. Nano Banana shape (nbp and nbp/edit):

```bash
cat > artifacts/<project>/params/<stem>.params.json <<'EOF'
{"prompt":"<prompt; with a scene: Image 1 is the product photo, Image 2 is the setting reference>","aspect_ratio":"<aspect>","resolution":"1K","num_images":1,"limit_generations":true,"enable_web_search":false,"safety_tolerance":"4","sync_mode":false,"output_format":"png"}
EOF
```

gpt-image-2 shape (gpt-image-2 and its edit route; on generated-scene the prompt uses five sections: Scene, Subject, Important details, Use case, Constraints):

```bash
cat > artifacts/<project>/params/<stem>.params.json <<'EOF'
{"prompt":"Image 1: the product photo. [Image 2: the setting reference.] Change: <setting, light, tone, crop>. Preserve: <product invariant, label, shape, color> exactly as in Image 1. Constraints: no text, no new logo, no deformation.","image_size":<"square_hd" | {"width":1024,"height":1280} | "landscape_16_9" | "portrait_16_9">,"quality":"high","background":"auto","num_images":1,"output_format":"png","enable_safety_checker":true,"sync_mode":false}
EOF
```

`image_size` maps 1:1 to square_hd, 4:5 to {"width":1024,"height":1280}, 16:9 to landscape_16_9 and 9:16 to portrait_16_9. `aspect_ratio` is always set on Nano Banana, because the edit route defaults to auto. Variants (only when briefed) get one file each, lifestyle-02..04, and each changes one dimension only.

Only when pixel_exact is true, also write the cutout and empty-setting files. Bria remove's image_url goes through `--image`, and no prompt is sent. The setting keeps an empty area where composite.py places the product (`--x 0.5 --y 0.8`):

```bash
cat > artifacts/<project>/params/cutout.params.json <<'EOF'
{"sync_mode":false}
EOF
cat > artifacts/<project>/params/setting.params.json <<'EOF'
{"prompt":"<empty setting: surface, environment, light from the briefed direction, tone, lens, crop, an empty clear area at the centre of the lower third where the product will stand, no product, no person, no text>","aspect_ratio":"<aspect>","resolution":"1K","num_images":1,"limit_generations":true,"enable_web_search":false,"safety_tolerance":"4","sync_mode":false,"output_format":"png"}
EOF
grep -c '—' artifacts/<project>/params/*.params.json || true
```

grep must print 0 for every file. Every key must be in its route's step-5 schema file. Claim words the brief did not supply go to owner review.

### 7. Quote the whole chain and check the budget

Load `media-ai-gen` (Skill tool). Before the first paid call, run `ai-gen estimate` on every params file step 6 wrote (each variant's too), then read the budget:

```bash
ai-gen estimate <primary> --params-file artifacts/<project>/params/lifestyle-01.params.json --format json
ai-gen estimate <fallback> --params-file artifacts/<project>/params/lifestyle-01-fb.params.json --format json
ai-gen estimate fal-ai/bria/background/remove --params-file artifacts/<project>/params/cutout.params.json --format json
ai-gen estimate fal-ai/nano-banana-pro --params-file artifacts/<project>/params/setting.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

The Bria and setting estimates run only on the pixel-exact path. Use estimated_credits, never estimated_usd. Each call's cap is its estimate, with one exception: the `openai/gpt-image-2/edit` estimate leaves out the input image tokens, so it is a floor, and the cap is ceil(1.5 x estimate). estimate takes no media flags. If it refuses an edit or Bria file because image_urls or image_url is missing, quote the list figure instead and say so in the delivery note: nano-banana-pro/edit 37.5, gpt-image-2/edit 52.75 with cap 80, Bria remove 10.

Planned spend is attempt 1 per variant (parallel submits each see the whole budget, so add them up first), or the cutout plus the setting. The contingency is one retry on the primary plus the fallback. Write the quote:

```bash
python3 -c "import json;p='artifacts/<project>/plan.json';d=json.load(open(p));d['quote']={'per_route':<object>,'caps':<object>,'planned_total':<n>,'contingency':<n>};json.dump(d,open(p,'w'))"
```

Exit 12 (unpriced) means that route does not run inside a budget: take the other route or open a gate. If planned_total is more than the budget shows remaining, the params are already saved under params/. Open a gate, write PROGRESS.md and outcome.json `{"status":"partial"}`, and end. On the pixel-exact path the resume step is "step 11: pixel-exact composite". Option b spends nothing when resumed (step 1):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-lifestyle --question "<item, route, credits>" --options '[{"id":"a","label":"<route>","credits":<cap>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 8: generate the lifestyle still" --quote <cap>
```

### 8. Generate the lifestyle still (attempt 1)

Skipped when pixel_exact is true (step 11). Load `media-ai-gen` and `media-image-generation` (Skill tool). Run `ai-gen run` on the primary from plan.json, queued, downloading into final/. The photo, and the reference scene if any, go into image_urls through `--ref`. Generated-scene has no `--ref`:

```bash
PRIMARY=$(python3 -c "import json;print(json.load(open('artifacts/<project>/plan.json'))['route']['primary'])")
ai-gen run "$PRIMARY" --params-file artifacts/<project>/params/lifestyle-01.params.json [--ref artifacts/<project>/source/product.<ext>] [--ref artifacts/<project>/source/scene.<ext>] --queue --strict-params --max-cost <cap> -o artifacts/<project>/final/ --format json > work/<project>/lifestyle-01.result.json
```

Variants run the same command once per variant, each with its own lifestyle-0N params and result files.

Exit 10 (timeout): the job may still finish, so never resubmit (HR6). The request id is at `error.details.requestId` in the redirected result JSON. If the command was cut off before it printed, the id is in `~/.cache/ai-gen/jobs.json`. From then on, only fetch:

```bash
ai-gen result <request-id> -o artifacts/<project>/final/ --format json > work/<project>/lifestyle-01.result.json
```

- Exit 14: re-download with ai-gen result; never regenerate.
- Exit 13: nothing was submitted; re-plan or open a gate.
- Any other exit: follow media-ai-gen's recovery.

Record a failed attempt (exit 7 upstream, 9, or a queued failure) at once, without `--result`, so the attempt count holds:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/lifestyle-01.params.json --json '{"item":"lifestyle-01","node":"final","endpoint":"<primary>","request_id":<id or null>,"status":"failed","declared":{"aspect":"<aspect>","format":"png"},"credits":{"estimate":<cap>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

The rerun is attempt 2 (step 13). It uses its own params file, and its lever is the fix (on exit 7, the field named in error.details).

### 9. Rename and write the manifest row

This step is a template. Run it once per attempt and per variant, filling `<item>`, `<stem>`, `<attempt>` and `<lever>` from that attempt:

- lifestyle-01 / lifestyle-01 / 1 / no lever
- lifestyle-01 / lifestyle-01-a2 / 2 / its lever
- lifestyle-01 / lifestyle-01-fb / 3 / "route: <fallback>"
- a variant uses its own item (lifestyle-0N)

Read the downloaded path from `files[0].local_path`; never guess a file name. Move the file to its kit name and write one row whose `files` holds the new path. Otherwise add hashes the old path and fails:

```bash
SRC=$(python3 -c "import json;print(json.load(open('work/<project>/<stem>.result.json'))['files'][0]['local_path'])")
mv "$SRC" artifacts/<project>/final/<stem>.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<stem>.result.json --params artifacts/<project>/params/<stem>.params.json --json '{"item":"<item>","node":"final","declared":{"aspect":"<aspect>","format":"png"},"credits":{"estimate":<cap for this attempt>},"attempt":<attempt>,"lever":"<lever; omitted on attempt 1>","parents":[<"source/product.<ext>" and "source/scene.<ext>", or none>],"files":["final/<stem>.png"]}'
```

On generated-scene, `parents` is []. add must exit 0, and the row holds the request id and the sha256 of the file. Each attempt writes its own file and never overwrites an earlier one.

### 10. Measure the output and record the figures

Load `media-qc` (Skill tool). Run this per attempt, with the same `<item>`, `<stem>`, `<attempt>`, `<lever>` and parents as step 9:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/<stem>.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/<stem>.png --id <item>#<attempt>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/<stem>.png --aspect <aspect> --format png
```

Then put the figures into that attempt's row by re-running add with the same `--result` (same request id):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<stem>.result.json --params artifacts/<project>/params/<stem>.params.json --json '{"item":"<item>","node":"final","declared":{"aspect":"<aspect>","format":"png"},"credits":{"estimate":<cap for this attempt>},"attempt":<attempt>,"lever":"<lever; omitted on attempt 1>","parents":[<parents>],"files":["final/<stem>.png"],"measured":{"w":<w>,"h":<h>,"aspect":"<measured aspect>","format":"png"}}'
```

Exit 1 (IQ-03, IQ-04, BQ-02) is a measured failure and triggers step 13. Exit 3 is reported as not checked and named as a debt. Report figures; never write PASS (HR14). The aspect is measured on the file because a dropped size field returns a square (HR3).

### 11. Pixel-exact composite (only when pixel_exact is true, instead of steps 8 to 10)

Background removal or cleanup: on SL8 this is a Bria cutout and a local composite. Load `media-photo-editing`, `media-ai-gen`, `media-image-generation` and `media-qc` (Skill tool), then read and follow `${CLAUDE_SKILL_DIR}/reference/pixel-exact.md`. It runs these steps in order:

1. `ai-gen run fal-ai/bria/background/remove` for the cutout, checked for real alpha.
2. A fit check of the cutout against a 1K frame. A cutout that does not fit raises the setting to 2K at the same price.
3. `ai-gen run fal-ai/nano-banana-pro` for an empty setting with a clear area at the centre of the lower third, checked for aspect.
4. `${CLAUDE_SKILL_DIR}/scripts/composite.py` at `--scale 0 --x 0.5 --y 0.8`, with a contact shadow on the side away from the light.

Each paid call gets its own row. The composite gets one tool row, measured before its add, with composite.py's `resampled` flag. No edit route is used on this path. If the cutout fails twice, the reference prepares plan.json and params for a generative edit and opens the approve-edit-path gate.

### 12. Build the review sheet and list the owner's review items

Load `media-qc` (Skill tool) and build a contact sheet of the source photo beside the outputs (on generated-scene, final/ only):

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/source/product.<ext> artifacts/<project>/final/ --out artifacts/<project>/qc/contact.jpg
```

The agent judges no fidelity or taste and never starts a retry on its own view (HR14). The reject rule in `${CLAUDE_SKILL_DIR}/reference/workflows.md` and the Quality bar lines become owner review items in PROGRESS.md: label, logo, shape and material fidelity, invented text, product replaced by another object, light, props, crop room and, with variants, which frame is strongest. Every variant is delivered and the owner picks. Each item names its next step: either the source's recovery (switch from text-only generation to a reference or edit workflow) or the attempt-2 lever with its quote, so that a later brief ordering the retry runs step 13.

### 13. Retry, then fallback

This step runs only on a measured failure (a media-qc exit 1 in step 10, or a failed ai-gen call recorded in step 8), or when a later brief from the owner orders it. Read and follow `${CLAUDE_SKILL_DIR}/reference/retry-fallback.md`. Attempt 2 reruns the primary with one named lever into lifestyle-01-a2.png. A second failure runs the fallback as attempt 3 into lifestyle-01-fb.png, with every `--ref` of attempt 1, so Image 2 is never dropped. Each attempt is estimated and checked against the budget first. Then steps 9 and 10 run with its stem, and step 12 rebuilds the sheet. Nothing runs past the fallback.

### 14. Composite supplied copy or logo (only when the brief supplies them)

Text overlays: generate with empty safe space, then add the final text or logo afterwards with a local composite, never through the model (HR10). This is the last step, after every generative step. Load `media-photo-editing`, `media-qc` and `media-ai-gen` (Skill tool), then read and follow `${CLAUDE_SKILL_DIR}/reference/copy-overlay.md`. It runs `${CLAUDE_SKILL_DIR}/scripts/overlay.py` (DejaVuSans.ttf, which is baked on the Image Studio) on the still that the brief or the owner chose (lifestyle-01 when several variants exist and no choice is stated). It measures the result, records one tool row and rebuilds `qc/contact.jpg` so the copy version is on it. A claim in the supplied copy is placed as written and listed for the user's confirmation (HR18).

### 15. Deliver

Load `media-qc` and `media-ai-gen` (Skill tool) and check the delivery:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
cat > artifacts/<project>/PROGRESS.md <<'EOF'
# <Project> — Progress
## Summary
## Decisions
## Asset inventory
## Pipeline
## Known gaps
## Next steps
EOF
cat > artifacts/<project>/outcome.json <<'EOF'
{"status":"done"}
EOF
grep -c '^## ' artifacts/<project>/PROGRESS.md
```

Fill each section; grep must print 6. outcome.json `done` replaces a resumed gate's `partial`. Write `{"status":"partial"}` instead when a gate, a Stop answer or a missing attachment ended this job.

The delivery note is the Summary, Known gaps and Next steps of `artifacts/<project>/PROGRESS.md`. It names:

- the deliverable file and which attempt it is
- the route and the measured size
- credits spent against the quote and the ceiling (from budget)
- each default chosen, and any resize of the photo
- the owner review items
- any fallback and its cost
- every debt
- manifest.json, as the map from file to prompt and model

Close the job with one line: folder tree, file count, credits.

## Prompt build order

Write prompts in this order so commercial intent stays clear:

1. Product invariant: exact object, material, color, packaging, scale.
2. Commercial role: hero image, PDP image, launch teaser, demo shot, social ad.
3. Setting: surface, background, props, environment, distance from product.
4. Lighting: softbox, strip light, rim light, backlight, caustics, practicals.
5. Camera: angle, focal length feel, macro, depth of field, motion if video.
6. Composition: centered, negative space, safe zone, text-free area, platform.
7. Brand tone: premium, clean, clinical, bold, energetic, warm, editorial.
8. Guardrails: preserve logo and packaging, no extra text, no distorted labels.

Do not promise claims like "best", "clinically proven", "50 percent faster",
or celebrity endorsements unless the user provides that copy.

For this kit the commercial role is always a lifestyle image.

Do not promise claims like "best", "clinically proven", "50 percent faster",
or celebrity endorsements unless the user provides that copy.

## Model choice

- Premium realistic stills: use `openai/gpt-image-2`.
- Premium stylized stills: use `openai/gpt-image-2`, then
  `fal-ai/nano-banana-pro`, then `fal-ai/nano-banana-2`.
- Fast draft stills: use `fal-ai/flux-2/klein/9b`.
- Image edits: use `fal-ai/nano-banana-pro/edit`, then
  `openai/gpt-image-2/edit`, then `fal-ai/bytedance/seedream/v5/lite/edit`.
- Product fidelity: use `fal-ai/nano-banana-pro`, `fal-ai/nano-banana-2`, or
  `fal-ai/bytedance/seedream/v5/lite/text-to-image`; use the matching edit
  endpoint when a product reference image exists.

On SL8 this kit uses:

| Path | Model | Alternative | Why |
|---|---|---|---|
| product photo only | `fal-ai/nano-banana-pro/edit` | `openai/gpt-image-2/edit` | fal and the Studio agree: fast, with strong product fidelity. The single test run uses this route |
| photo plus reference scene | `openai/gpt-image-2/edit` | `fal-ai/nano-banana-pro/edit` | the Studio's multi-reference composite row; its grammar labels each input by role |
| no product photo | `fal-ai/nano-banana-pro` | `openai/gpt-image-2` at quality=high (fal's 'premium realistic stills' pick) | SL8's measured incumbent, 37.5 cr against 52.75, and on fal's product-fidelity list. The two were never compared head to head on SL8 (IMG-L29) |
| pixel-exact | `fal-ai/bria/background/remove` + `fal-ai/nano-banana-pro` (empty setting) + local composite | none | every edit route, and Bria replace, redraws the product. A Nano Banana Pro edit once turned a mug into a luggage tag |

How the source's other routing lines apply to this deliverable:

- 'Premium stylized stills' is not used: a stylized still is not a photoreal lifestyle still.
- 'Fast draft stills' is never final commercial delivery. On SL8 the draft route is `fal-ai/flux/schnell`, and only the test harness uses it, to make the fixture photo.
- The source's text-heavy route (`openai/gpt-image-2` at quality=high for labels, packaging copy and posters) is not used: exact copy is never generated in the image (HR10). Supplied copy is composited in step 14, and lettering that is part of the art follows `media-image-generation`.
- Seedream v5 lite and `fal-ai/nano-banana-2` (and its edit route) are not used: they are unmeasured on SL8, and Seedream lives at the unprefixed `bytedance/seedream/v5/lite/...` because the `fal-ai/` ids drifted. If a brief names one, run step 5 on it and estimate first (HR5).

## Quality bar

Before returning, check:

- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting makes sense for the product material.

- Output paths come from `files[].local_path` in the result envelope and from the manifest, not from manually curled URLs.

- The product remains sharp and readable, in the specific real setting, with the person or environment as briefed.
- The contact shadow and reflection are realistic, and the light comes from the briefed direction.
- media-qc artifact, declared and image exit 0. manifest.mjs verify exits 0. manifest.mjs budget shows spend inside the quote and the ceiling. PROGRESS.md has six sections and outcome.json exists.

Who checks what: the agent measures with media-qc and reports figures. Every visual line above is an owner review item against qc/contact.jpg (HR14). Only a media-qc exit 1 starts a retry.

If the result misses product fidelity, switch from text-only generation to a
reference or edit workflow before retrying.

## On SL8

Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules:

- Estimate every paid step first and keep a running total (HR5).
- Every paid call carries `--queue --strict-params --max-cost`.
- Never resubmit a job that may exist (HR6).
- Deliverables go under `artifacts/<project>/` (HR8).
- One manifest row per generation, and a tool row per local step (HR9).
- Never ask: use the defaults above, and open a gate if a step would spend past what the brief approved. A Stop answer spends nothing (HR12).
- Never install anything (HR21).
