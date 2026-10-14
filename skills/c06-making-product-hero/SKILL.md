---
name: c06-making-product-hero
description: "Product hero image, hero shot, launch still, landing-page or campaign hero, product background replacement. Makes one premium still in which the customer's exact product is the only hero object. It works from a text description (2 variants by default, up to 4, each differing from variant_a in one dimension, with variant_a as the stated default pick), from the customer's own product photo through a Nano Banana Pro edit, or by keeping the photo's product pixels unchanged with a Bria cutout composited over a generated empty background. It runs headless on the SL8 Image Studio through ai-gen. It reads every input from the brief and uses stated defaults, verifies each route's schema, quotes credits for the whole chain and gates on the total, writes one manifest row per output, measures every file with media-qc and pixdiff, and leaves fidelity and taste to the owner. Not for lifestyle scenes with people, PDP batches, social ad sets or reveal videos."
license: MIT
compatibility: "SL8 Image Studio 1.0.2 (sl8-image build 333aaa35); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: image/product-hero
  source: "D1/commercial (fal community)"
  status: untested
---

## Factory steps on this bot

This skill runs as a job of an SL8 bot. Three steps wrap the kit workflow below; keep the kit's steps as they are.

- [ ] A. Before the kit's first step creates any folder or file, save the request word for word to `work/request.md` and run `node ${CLAUDE_SKILL_DIR}/scripts/inputs.mjs work/request.md`. Exit 1 means no product: write nothing under `artifacts/`, spend nothing, and end partial, saying what to send (its `say`). If the brief speaks of the customer's own photo or packshot ("from my photo", "our packshot") and no image is in `artifacts/attachments/`, end partial the same way and ask them to attach it; never switch to the text route for a promised image. Otherwise, once the kit's first step has the project slug, copy `work/request.md` to `artifacts/<project>/inputs/request.md`. Every field in `assume` takes the kit's default, named under Decisions in PROGRESS.md. Wherever the kit writes `artifacts/attachments/<file>`, `<file>` is the file's base name, even when the brief gives a full path.
- [ ] B. Before the kit writes outcome.json done, run `node ${CLAUDE_SKILL_DIR}/scripts/validate.mjs artifacts/<project>/final/hero.png --request artifacts/<project>/inputs/request.md` for final/hero.png (or the hero file this job delivered). Fix what it names and rerun until it prints ok.
- [ ] C. Last, write `artifacts/<project>/inputs/job.json` (job `product-hero`, what, state, the context used, decisions made and open, deliverables, blockers) and run `node ${CLAUDE_SKILL_DIR}/../c06-router/scripts/status.mjs --project <project> --record artifacts/<project>/inputs/job.json`.

## Commercial product hero

Use this skill when the job is a product hero still: one premium image in which the customer's exact product is the only hero object, made from a text description or from the customer's own product photo. Read the reference files at the steps that name them:

- `${CLAUDE_SKILL_DIR}/reference/routing.md` and `${CLAUDE_SKILL_DIR}/reference/workflows.md` (step 2)
- `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` and `${CLAUDE_SKILL_DIR}/reference/examples.md` (step 5)
- `${CLAUDE_SKILL_DIR}/reference/background-path.md` (step 9)
- `${CLAUDE_SKILL_DIR}/reference/quality-bar.md` (step 12)
- `${CLAUDE_SKILL_DIR}/reference/recovery.md` (step 13)

Local helpers: `${CLAUDE_SKILL_DIR}/scripts/probe_photo.py` (step 4), `${CLAUDE_SKILL_DIR}/scripts/composite.py` and `${CLAUDE_SKILL_DIR}/scripts/pixdiff.py` (steps 9, 11 and 13), `${CLAUDE_SKILL_DIR}/scripts/overlay.py` (step 11).

This kit names its own models (reference/routing.md). Load `media-ai-gen`, `media-image-generation`, `media-photo-editing` and `media-qc` (Skill tool) at the steps that name them, and follow media-ai-gen's house rules: estimate every paid step first (HR5), never resubmit a job that may exist (HR6), deliverables under `artifacts/<project>/` (HR8), one manifest row per generation (HR9), exact copy and logos never generated (HR10), never ask: use the defaults and gate spend (HR12), fidelity and taste go to the owner (HR14), a brief-ordered break is a waiver (HR20), never install anything (HR21).

Keep the output production-focused. Do not add inflated marketing language,
unsupported claims, fake text in the image, or em dashes.

## Inputs to collect

Never stop to ask. Read each input from the brief or from the files in `artifacts/attachments/`. When an input is missing, use its default from the table below and list it under Decisions in the delivery note.

- Product: exact product name, category, material, color, scale, logo rules.

- Goal: hero shot (fixed for this kit).

- Platform: square, vertical, landscape, banner. Square is 1:1, a PDP is 4:5, vertical or story is 9:16, landscape is 16:9, and banner is treated as 16:9.

- Brand: premium, playful, clinical, athletic, minimal, natural, technical.

- Source media: product packshot (a file in `artifacts/attachments/` that the brief names) and logo file (composited locally in step 11, never sent to a model). If the brief names a file that is not there, stop and report it as the debt. Never switch paths silently.

- Constraints: preserve packaging, avoid new labels, no fake readable copy.

- Model preference: use this kit's routing (reference/routing.md) unless the brief names a model
  or the job is unusually expensive. A named model wins, and if it breaks a house rule it is recorded as a waiver (step 1). For an expensive job, the step 6 quote and gate decide.

Defaults when the brief is silent:

| Input | Default |
|---|---|
| product | required. Without it, write outcome.json {"status":"partial","reason":"no product named"} and PROGRESS.md, and stop |
| product material and color | from the product description. With no material named, use the plastic cue (softbox, clean shadow, realistic molded edges) and flag it in the delivery note |
| product_photo | none, so the from-text-description path runs. A named photo missing from artifacts/attachments/ stops the job partial as the debt |
| background_replacement | false. True only when the brief asks to keep the uploaded product unchanged and replace only the background; it needs product_photo |
| setting (surface, background, props) | one plain surface on a seamless neutral background, no props |
| lighting | the material cue for the product's material, with one named key light and its direction |
| camera | three-quarter front view at product eye level, short-telephoto feel |
| platform / aspect | 1:1 centered square crop, always sent explicitly; 4:5 (PDP), 9:16 (vertical or story), 16:9 (landscape or banner) when named |
| brand tone | premium |
| style | realistic |
| draft | false. When true: fal-ai/flux/schnell, files named draft-<v>.png, nothing in final/, and the delivery note says they are drafts |
| variants | 2 on the text path; 3 or 4 when the brief asks, never more. 1 on the photo paths. Variation rule in step 5 |
| constraints | preserve packaging, avoid new labels, no fake readable copy, no hands unless requested |
| copy | none: the image carries no text. Only user-supplied copy is used, composited locally into the top band in step 11; on the background path the composite then reserves the top 20% of the canvas |
| logo_file | none. When supplied, composited locally, never sent to a model |
| resolution | 1K on Nano Banana; a square_hd-class image_size on gpt-image-2 and FLUX. 2K only when the brief needs small readable detail, priced first. The background plate uses 2K (same 37.5 cr list price as 1K); when the canvas is larger than the plate it is up-scaled and the delivery note states the factor |
| fidelity_miss | none. A later brief that reports a product-fidelity miss on a delivered item resumes at step 13 |
| gate_answer | none. With an open spend gate, nothing is spent and the job ends partial again. With an open pick-variant gate, the default a stands. A Stop answer spends nothing |
| project | the project the brief names; otherwise this product's artifacts/<slug>/ folder that holds an open or answered gate, unless its last spend gate was answered Stop and the brief brings a new Budget or a new request: then a new project <product-slug>-<YYYYMMDD>-2 (the next free suffix); a new job derives a kebab-case slug from the product name plus the date |
| budget_credits | the brief's 'Budget:' figure when it is lower than the remaining amount manifest.mjs budget prints (SL8_SPEND_CEILING minus the ledger); otherwise that remaining amount |

## Workflow

### 1. intake-and-resume

Load `media-ai-gen` and `media-image-generation` (Skill tool). Find the project with the `project` default above (after a Stop answer, a new Budget or request starts the next suffixed project, because gate.mjs cannot re-answer an answered gate). Then read the gates:

```bash
ls -d artifacts/*/ 2>/dev/null   # reuse the named project, or this product's folder that has gates/
mkdir -p artifacts/<project> work/<project>
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>
python3 -I -c 'import json,sys;g=json.load(open(sys.argv[1]));print([o.get("credits") for o in g["options"] if o["id"]==g["answer"]])' artifacts/<project>/gates/<NN>-<slug>.json
```

Read the status exit code (0, or 10 when a spend gate is open). gate.mjs status prints only the answered option's id, so read that option's credits from the gate JSON with the python line. Take the first branch that applies:

**An open spend gate (approve-hero or approve-retry) that the brief answers.** Record the answer, then follow the answered-gate branch:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <id> --option <option> --by "<brief words>"
```

**An open spend gate the brief does not answer.** Spend nothing. Write PROGRESS.md with the six sections (the gate's question under Known gaps and Next steps), leave outcome.json `partial`, and end.

**An answered spend gate whose work is not delivered** (outcome.json is not `done`):

- Credits > 0 approve the spend. Copy the saved params back, skip items whose rows are done and verify, and resume at the gate's resume_at. On an answered approve-retry, the resumed attempt runs without a new gate when its new estimate is at most the gate's credits.

```bash
mkdir -p work/<project> && cp artifacts/<project>/params/*.params.json work/<project>/
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
```

- Option b, `Stop here` (credits 0): spend nothing, run no ai-gen call, write PROGRESS.md with the Stop answer under Decisions, leave outcome.json `partial`, and end.

**The pick-variant text gate answered with a variant other than a** (record the brief's answer first with gate.mjs answer). Copy that variant to its own final file, never over final/hero.png, whose row holds a sha256; measure it, add one tool row, check it, and continue at step 14:

```bash
mkdir -p artifacts/<project>/final && cp artifacts/<project>/variant_<v>/hero-<v>.png artifacts/<project>/final/hero-<v>.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero-<v>.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero-pick","node":"final","tool":"cp variant_<v>/hero-<v>.png (owner pick <v>)","parents":["hero-<v>#1"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero-<v>.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/hero-<v>.png --id hero-pick
```

An answer of a is recorded and continues at step 14; final/hero.png stands.

**A product-fidelity miss reported on a delivered item.** Go to step 13.

**Otherwise, a new job:**

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
test -f artifacts/attachments/<photo> || echo MISSING   # only when the brief names a photo
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HRn --instruction "<brief words>"   # only when the brief orders a house-rule break
```

If the photo is MISSING, write `artifacts/<project>/outcome.json` as `{"status":"partial","reason":"<photo> named in the brief is not in artifacts/attachments/"}`, write PROGRESS.md and stop. Write every input, every stated default, budget_credits and the declared output (aspect, format png, alpha forbidden) to `artifacts/<project>/plan.json`.

Check: the status exit code and the answered option's credits were read; plan.json parses and has a `declared` object; on a pick, mediaqc image and declared exit 0.

### 2. choose-path-and-model

Read `${CLAUDE_SKILL_DIR}/reference/routing.md` and `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Load `media-image-generation` (Skill tool). Pick one option:

- **background-replacement**: the brief asks to keep the uploaded product exactly unchanged and replace only the background, and the photo exists.
- **from-product-photo (reference or edit)**: a product reference image exists.
- **from-text-description**: no reference exists, or the brief wants early creative exploration. `style` (realistic or stylized) and `draft` select the route.

Take the route and its named fallback from routing.md. Write the option, route, fallback, params-block name, variant count and reason to plan.json; steps 5 to 13 read the route from there. Check: the route and fallback ids appear in media-image-generation's routing table; step 3 verifies them live.

### 3. verify-endpoints-and-schema

Start from the routed endpoint IDs. Load `media-ai-gen` (Skill tool). For the chosen route and its named fallback, and again for any route first used in step 13, let `<route_slug>` be the route id with every `/` replaced by `__`:

```bash
ai-gen info <route> --format json > work/<project>/<route_slug>.info.json
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<route>" | python3 -c "<the raw OpenAPI printer, copied verbatim from media-ai-gen SKILL.md 'Check every value against const and enum'>" > work/<project>/<route_slug>.schema.txt
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<route>" | python3 -I -c 'import json,sys;d=json.load(sys.stdin);s=d["components"]["schemas"];R=lambda a:s[a["$ref"].split("/")[-1]] if "$ref" in a else a;[print(n,f,[R(a).get("enum") or R(a).get("type") for a in p["anyOf"]]) for n,v in s.items() if n.endswith("Input") for f,p in v.get("properties",{}).items() if "anyOf" in p]' > work/<project>/<route_slug>.anyof.txt
```

The standard printer shows an anyOf field (aspect_ratio, image_size) with its default only, and ai-gen info gives image_size no enum on gpt-image-2 and FLUX, so check those values against the members in `.anyof.txt` (an enum member, or an object type such as {width, height}). Check every other key and value of the step 5 block against the printed enum and const values. Remove any key the schema does not list. Pin every flag with a default of true or a default-on behavior (enable_safety_checker, sync_mode, prompt rewriters such as refine_prompt) with the value step 5 gives.

   Use text search only as fallback discovery for a missing utility or
   unsupported role:

One keyword, and only if info exits 8 or the printer prints UNRESOLVED:

```bash
ai-gen models --search <single keyword> --format json
```

If a route is gone, use its named fallback, whose block is in step 5, and report the stale pick. If the fallback is gone too, end partial.

6. Use schema fields exactly. Do not pass guessed flags. If the model uses
   `image_urls`, `reference_image_url`, `aspect_ratio`, `duration`, `seed`, or
   another name, mirror that schema.

On SL8 the names are each route's own: `aspect_ratio` and `resolution` on Nano Banana, `image_size` on gpt-image-2 and FLUX, `image_urls` (filled by `--ref`) and `image_url` (filled by `--image`). Every paid call carries `--strict-params`, which refuses unknown keys before submit (exit 7, not charged).

Check: ai-gen info exits 0 and the printer prints no UNRESOLVED. Every key in the block is listed; every value is inside its enum or const, or inside an anyOf member's enum or type; every boolean default is in the block.

### 4. probe-product-photo (photo and background paths only)

There is no upload step: the photo reaches the model in the same `ai-gen run` call, through `--ref` (image_urls) or `--image` (image_url). Before any spend, copy the photo unchanged, straighten or convert it if needed, and measure it. Load `media-photo-editing` and `media-qc` (Skill tool):

```bash
mkdir -p artifacts/<project>/source
cp artifacts/attachments/<photo> artifacts/<project>/source/<photo>
python3 -I ${CLAUDE_SKILL_DIR}/scripts/probe_photo.py artifacts/<project>/source/<photo> artifacts/<project>/source/<base>-upright.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/<input>
```

`<base>` is the photo's name without its extension; `<input>` is `<base>-upright.png` if the script wrote it, otherwise `<photo>`. The script uses exif_transpose and decodes HEIC (pillow_heif) and RAW (rawpy). When it wrote the upright PNG, put the mediaqc figures in its single tool row:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"photo-upright","node":"source","tool":"python3 scripts/probe_photo.py (exif_transpose / heif / rawpy)","parents":["source/<photo>"],"declared":{"format":"png"},"measured":{<figures>},"files":["source/<base>-upright.png"]}'
```

Record the figures in plan.json. If probe_photo.py does not exit 0, or mediaqc image exits 1 or 3, the photo path stops partial and the failure is reported as the debt.

### 5. build-prompt-and-params

Load `media-image-generation` (Skill tool). Read `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` and `${CLAUDE_SKILL_DIR}/reference/examples.md`, and write the prompt in the Prompt build order below.

- **Text and edit paths:** the Product hero image template.
- **Background path:** the empty-plate prompt in `${CLAUDE_SKILL_DIR}/reference/background-path.md`. The product never enters the plate prompt.
- **Lighting:** the material cue for the product's material.
- **Photo path:** address the product as @Image1, with a short, exact product invariant.
- **Negative components:** only fal-ai/bria/background/replace has negative_prompt. On every other route write each component as a positive clause (single product fully in frame, clean geometry, intact packaging, clean background), and note in the delivery note that these exclusions are unenforced.
- **Copy:** when step 11 will add copy, ask for clean negative space in the upper fifth of the frame (on the background path composite.py reserves it).
- **Variants (text path):** variant_a is the base prompt and keeps every clause the brief wrote. Each further variant (b, then c and d when asked) keeps all of variant_a's clauses and changes one dimension: the one the brief names; otherwise the first of lighting, camera angle, background (surface or backdrop) or prop set (props, or atmosphere such as dust, water or steam) that the brief leaves open, the next open one for each further variant. When the brief fixes all four, change camera height or lens feel inside camera angle (for example a low angle at the same view). Write each variant's dimension and value to plan.json.

Write one params file per paid item to `work/<project>/<item>.params.json` from the block plan.json names. `<item>` is hero-<v> (v = a..d), hero, plate, cutout, draft-<v>, or `<item>-r2` for a retry or re-run.

| Route | Params block |
|---|---|
| fal-ai/nano-banana-pro | {"prompt":"…","aspect_ratio":"1:1","resolution":"1K","num_images":1,"limit_generations":true,"enable_web_search":false,"safety_tolerance":"4","sync_mode":false} |
| fal-ai/nano-banana-pro/edit | the same keys, aspect_ratio pinned (its default is auto); the prompt addresses @Image1; image_urls by --ref |
| plate (fal-ai/nano-banana-pro) | the same keys, resolution "2K", aspect_ratio = the declared aspect |
| openai/gpt-image-2 | {"prompt":"…","image_size":"square_hd","quality":"high","num_images":1,"output_format":"png","background":"opaque","enable_safety_checker":true,"sync_mode":false}; 4:5 = {"width":1024,"height":1280}, 16:9 = "landscape_16_9", 9:16 = "portrait_16_9" |
| openai/gpt-image-2/edit | the same keys, explicit image_size (never auto); image_urls by --ref |
| fal-ai/flux/schnell (draft) | {"prompt":"…","image_size":"square_hd","num_inference_steps":4,"num_images":1,"output_format":"png","enable_safety_checker":true,"sync_mode":false}; sizes as on gpt-image-2 |
| fal-ai/flux-2/klein/9b (draft fallback) | {"prompt":"…","image_size":"square_hd","num_inference_steps":4,"num_images":1,"enable_safety_checker":true,"sync_mode":false}; keep only the keys step 3 lists |
| fal-ai/bria/background/remove | {"sync_mode":false} if the printer lists it, else {} (image_url by --image) |
| fal-ai/bria/background/replace (brief's explicit instruction only) | {"prompt":"<environment>, <lighting direction>, matching reflections and contact shadows","negative_prompt":"<the prompt-patterns.md negative components>","refine_prompt":false,"fast":true,"num_images":1,"sync_mode":false} (image_url by --image) |

On a gpt-image-2 route, re-render the prompt into that family's sections, never resent unchanged: Scene / Subject / Important details / Use case / Constraints for text; Change / Preserve / Constraints with 'Image 1: product reference' for edits. Check:

```bash
grep -n '—' work/<project>/*.params.json   # must print nothing
```

### 6. quote-and-gate

Load `media-ai-gen` (Skill tool). Estimate every paid item of the chain with its own params file (every variant on the text path; cutout and plate on the background path; the replace route only when the brief orders it). Sum and compare with budget_credits:

```bash
ai-gen estimate <route> --params-file work/<project>/<item>.params.json --format json > work/<project>/<item>.estimate.json
ai-gen estimate fal-ai/bria/background/remove --params-file work/<project>/cutout.params.json --format json > work/<project>/cutout.estimate.json   # background path
ai-gen estimate fal-ai/bria/background/replace --params-file work/<project>/hero.params.json --format json > work/<project>/hero.estimate.json   # replace route, brief's instruction only
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Quote in credits, never estimated_usd. Never run an unpriced route (exit 12) inside a budget. Write each estimate and the total to plan.json. If the total is over budget, do not ask: save the params, open a spend gate, write PROGRESS.md (the gate under Known gaps and Next steps), leave outcome.json `{"status":"partial"}` and end.

```bash
mkdir -p artifacts/<project>/params && cp work/<project>/*.params.json artifacts/<project>/params/
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-hero --question "<route>, <items>, <total> credits" --options '[{"id":"a","label":"<route>","credits":<total>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 7: generate-from-text" --quote <total>
```

On the other paths use `--resume-at "step 8: generate-from-photo"` or `--resume-at "step 9: generate-background-replacement"`. Check: every estimate exits 0 and the total is at most budget_credits; otherwise the gate file exists, nothing is submitted, and `grep -c '^## ' artifacts/<project>/PROGRESS.md` returns 6.

### 7. generate-from-text

Load `media-ai-gen` (Skill tool). Run one queued call per variant, each into its own folder, with the route plan.json names (separate calls, not num_images):

```bash
mkdir -p artifacts/<project>/variant_<v> work/<project>   # for each v that is asked
ai-gen run <route from plan.json> --params-file work/<project>/hero-<v>.params.json --queue --strict-params --max-cost <estimate> -o artifacts/<project>/variant_<v>/ --format json > work/<project>/hero-<v>.result.json
```

In draft mode the route is fal-ai/flux/schnell (fallback fal-ai/flux-2/klein/9b) and the item is draft-<v>:

```bash
ai-gen run fal-ai/flux/schnell --params-file work/<project>/draft-<v>.params.json --queue --strict-params --max-cost <estimate> -o artifacts/<project>/variant_<v>/ --format json > work/<project>/draft-<v>.result.json
```

After exit 10 (timeout) or 14 (download failed), never resubmit. The request id is in error.details.requestId (exit 10) or error.details.envelope.request_id (exit 14), or in ~/.cache/ai-gen/jobs.json if the call was cut off:

```bash
ai-gen result <request-id> -o artifacts/<project>/variant_<v>/ --format json > work/<project>/hero-<v>.result.json
```

For any other failure, follow media-ai-gen's recovery.md and record the failed attempt without --result:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params work/<project>/hero-<v>.params.json --json '{"item":"hero-<v>","node":"variant_<v>","endpoint":"<route from plan.json>","request_id":<id or null>,"status":"failed","declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"credits":{"estimate":<estimate>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

When recovery.md allows a re-run (exit 9 or 11 with no request id), it is attempt 2 with the lever 'same params, resubmitted after exit <n>', on its own result and file name; a further failure goes to the fallback or a gate (step 13):

```bash
ai-gen run <route from plan.json> --params-file work/<project>/hero-<v>.params.json --queue --strict-params --max-cost <estimate> -o artifacts/<project>/variant_<v>/ --format json > work/<project>/hero-<v>-r2.result.json
```

Check: exit 0 and files[0].local_path exists. ai-gen names that file {model-tail}-{timestamp}.png; read it from the result JSON, never guess it.

### 8. generate-from-photo

Load `media-ai-gen` and `media-image-generation` (Skill tool). Send one reference only, always the unaltered probed original, because more references dilute identity:

```bash
mkdir -p artifacts/<project>/final
ai-gen run <route from plan.json> --params-file work/<project>/hero.params.json --ref artifacts/<project>/source/<input> --queue --strict-params --max-cost <estimate> -o artifacts/<project>/final/ --format json > work/<project>/hero.result.json
```

After exit 10 or 14, never resubmit; run `ai-gen result <request-id> -o artifacts/<project>/final/ --format json > work/<project>/hero.result.json` with the id from step 7's rule. Record any other failure as in step 7, with item hero and node final:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params work/<project>/hero.params.json --json '{"item":"hero","node":"final","endpoint":"<route from plan.json>","request_id":<id or null>,"status":"failed","declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"credits":{"estimate":<estimate>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

A permitted re-run is attempt 2 into hero-r2.result.json, as in step 7. Check: exit 0 and files[0].local_path exists. The owner judges fidelity against `source/`.

### 9. generate-background-replacement

The product pixels are never regenerated. Read `${CLAUDE_SKILL_DIR}/reference/background-path.md`. Load `media-photo-editing`, `media-ai-gen`, `media-image-generation` and `media-qc` (Skill tool). Cut the product out and generate the empty plate:

```bash
mkdir -p artifacts/<project>/keyframes artifacts/<project>/final
ai-gen run fal-ai/bria/background/remove --params-file work/<project>/cutout.params.json --image artifacts/<project>/source/<input> --queue --strict-params --max-cost <estimate> -o artifacts/<project>/keyframes/ --format json > work/<project>/cutout.result.json
ai-gen run fal-ai/nano-banana-pro --params-file work/<project>/plate.params.json --queue --strict-params --max-cost <estimate> -o artifacts/<project>/keyframes/ --format json > work/<project>/plate.result.json
```

Rename and record both with step 10 (keyframes/cutout.png, keyframes/plate.png), then measure the cutout, composite and compare. Add `--reserve-top 0.2` only when copy is supplied:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/keyframes/cutout.png --alpha required
python3 -I ${CLAUDE_SKILL_DIR}/scripts/composite.py --cutout artifacts/<project>/keyframes/cutout.png --plate artifacts/<project>/keyframes/plate.png --aspect <W:H> --fill 0.6 --reserve-top 0.2 --placement work/<project>/placement.json --out artifacts/<project>/final/hero.png
python3 -I ${CLAUDE_SKILL_DIR}/scripts/pixdiff.py --original artifacts/<project>/source/<input> --cutout artifacts/<project>/keyframes/cutout.png --final artifacts/<project>/final/hero.png --placement work/<project>/placement.json
```

composite.py prints the effective fill and plate_scale; copy them to plan.json. A plate_scale above 1 means the plate was up-scaled behind the native-scale product; state the factor under Known gaps.

Only on the brief's explicit instruction, and only after the HR10 waiver is recorded, run the generative re-background instead (background-path.md):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR10 --instruction "<brief words>"
ai-gen run fal-ai/bria/background/replace --params-file work/<project>/hero.params.json --image artifacts/<project>/source/<input> --queue --strict-params --max-cost <estimate> -o artifacts/<project>/final/ --format json > work/<project>/hero.result.json
```

Checks: mediaqc image --alpha required on the cutout exits 0. pixdiff.py prints max 0 where the cutout's alpha is 255; exit 1 is a measured failure and goes to step 13. The contact shadow goes to the owner's review; a requested reflection is not produced and is a named debt (step 14).

### 10. rename-and-record

Load `media-ai-gen` and `media-qc` (Skill tool). Take each path from files[0].local_path, never a curled URL or a guessed name. Rename it to its stable name, never over an earlier file, and write its row with the new path in `files`:

| Path | item | node | file |
|---|---|---|---|
| text | hero-<v> | variant_<v> | variant_<v>/hero-<v>.png |
| draft | draft-<v> | variant_<v> | variant_<v>/draft-<v>.png |
| photo, or Bria replace | hero | final | final/hero.png |
| background | cutout, plate | keyframes | keyframes/cutout.png, keyframes/plate.png |

After a re-run the file is `<item>-r2.png` and the result file `<item>-r2.result.json`.

```bash
SRC=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<item>.result.json)
test ! -e artifacts/<project>/<node>/<item>.png && mv "$SRC" artifacts/<project>/<node>/<item>.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<item>.result.json --params work/<project>/<item>.params.json --json '{"item":"<item>","node":"<node>","declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"credits":{"estimate":<estimate>},"attempt":<n>,"files":["<node>/<item>.png"]}'
```

`<n>` is 1, or 2 when this item already has a failed row; at 2 add `"lever":"same params, resubmitted after exit <code>"`. The cutout row declares `{"format":"png","alpha":"required"}` with no aspect. A tool row has no request id, so measure its file before its single add. On the background path, after step 9:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero","node":"final","tool":"python3 scripts/composite.py","parents":["cutout#1","plate#1","source/<input>"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero.png"]}'
```

On the text path (not in draft mode), do not pick the strongest frame yourself. Copy the stated default pick to final/, measure it, record it, and open a text gate that never stops the job (add c and d options when those variants exist):

```bash
mkdir -p artifacts/<project>/final && cp artifacts/<project>/variant_a/hero-a.png artifacts/<project>/final/hero.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero","node":"final","tool":"cp variant_a/hero-a.png (stated default pick)","parents":["hero-a#1"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero.png"]}'
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --kind text --slug pick-variant --question "Which variant is the hero?" --options '[{"id":"a","label":"variant_a"},{"id":"b","label":"variant_b"}]' --resume-at "step 14: deliver" --default a
```

Check: `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>` exits 0, and gate.mjs open exits 0.

### 11. exact-copy-and-logo (only when supplied)

Text overlays: generate with empty safe space. Then add only the user's exact copy and logo file in that space, last, after every generative step, with the kit's overlay.py, which follows `media-photo-editing` (Skill tool; Pillow ImageDraw and ImageFont, alpha_composite for the logo). A model never draws the copy or the logo. overlay.py wraps the copy to 90% of the width and shrinks the font down to the minimum until it fits the top band (H/24 to H/5). Given `--placement` (background path), it also exits 1 when the copy box or the logo box meets the product bbox. On exit 1 it writes no file: report the copy as a debt and never clip it.

```bash
mkdir -p artifacts/<project>/source
cp artifacts/attachments/<logo_file> artifacts/<project>/source/<logo_file>
printf '%s' "<exact copy from the brief>" > artifacts/<project>/source/copy.txt
python3 -I ${CLAUDE_SKILL_DIR}/scripts/overlay.py --in artifacts/<project>/final/<hero file> --copy artifacts/<project>/source/copy.txt --logo artifacts/<project>/source/<logo_file> --max-width 0.9 --min-font 18 --placement work/<project>/placement.json --out artifacts/<project>/final/hero-copy.png
python3 -I ${CLAUDE_SKILL_DIR}/scripts/pixdiff.py --original artifacts/<project>/source/<input> --cutout artifacts/<project>/keyframes/cutout.png --final artifacts/<project>/final/hero-copy.png --placement work/<project>/placement.json   # background path: max 0 expected
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/hero-copy.png --aspect <W:H> --format png --alpha forbidden
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"hero-copy","node":"final","tool":"python3 scripts/overlay.py","parents":["<hero row id>","source/<logo_file>","source/copy.txt"],"declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"measured":{<figures>},"files":["final/hero-copy.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/hero-copy.png --id hero-copy
```

On the text and photo paths there is no placement.json: leave out `--placement` and the pixdiff line, and the owner checks that the copy is clear of the product. After a background re-cut, use placement-r2.json and cutout-r2.png. `<hero file>` and `<hero row id>` are the delivered hero: hero.png and hero#1, hero-<v>.png and hero-pick#1 after a pick, or hero-r2.png and hero-retry#1 after a promoted retry. When only copy or only a logo is supplied, leave out the other flag and its parent. Check: overlay.py exits 0, pixdiff on hero-copy.png prints max 0 (background path), and mediaqc declared exits 0.

### 12. measure-outputs

Load `media-qc` and `media-ai-gen` (Skill tool). Report figures, never PASS. Measure every deliverable of this job: each variant_<v>/hero-<v>.png, final/hero.png, final/hero-<v>.png, final/hero-copy.png and any retry.

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/<node>/<item>.png --aspect <W:H> --format png --alpha forbidden   # cutout: --alpha required, no --aspect
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/<node>/<item>.png --id <item>
```

Put the figures into each generation row made in this job by re-running add with the same --result (same request id). Tool rows already carry measured, and rows from an earlier job are not re-added.

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<item>.result.json --params work/<project>/<item>.params.json --json '{"item":"<item>","node":"<node>","declared":{"aspect":"<W:H>","format":"png","alpha":"forbidden"},"credits":{"estimate":<estimate>},"attempt":<n>,"files":["<node>/<file>.png"],"measured":{<figures>}}'
```

Exit 0: the figures matched. Exit 1 is a measured failure and goes to step 13. Exit 3 is reported as not checked and listed as a debt. Then read `${CLAUDE_SKILL_DIR}/reference/quality-bar.md` and run it; its visual items go to the owner's review.

### 13. recover-from-a-miss

Read `${CLAUDE_SKILL_DIR}/reference/recovery.md` and follow it. Load `media-ai-gen`, `media-image-generation`, `media-photo-editing` and `media-qc` (Skill tool). In short: retry only on a measured failure (media-qc exit 1 or pixdiff exit 1) or on a fidelity miss the owner reports in a later brief. A generative path gets one same-route retry that moves one named lever, then switches to the photo path or the fallback. The background path does one Bria re-cut. Every retry is estimated first; over budget it opens approve-retry, unless an answered approve-retry already covers that estimate, in which case it runs. A passing retry is delivered as final/hero-r2.png, never over final/hero.png.

### 14. deliver

Load `media-qc` and `media-ai-gen` (Skill tool). Build one contact sheet from the folders that exist (a missing folder makes sheet exit 1):

```bash
mkdir -p artifacts/<project>/qc
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet $(for d in final variant_a variant_b variant_c variant_d keyframes source; do test -d artifacts/<project>/$d && printf '%s ' artifacts/<project>/$d/; done) --out artifacts/<project>/qc/contact.jpg
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Write the delivery note, `artifacts/<project>/PROGRESS.md`, with the six sections from gates-and-manifest.md:

- `## Summary`
- `## Decisions`: the delivered hero file (final/hero.png, final/hero-<v>.png or final/hero-r2.png), option, route, fallback, every stated default, each variant's dimension, the default pick variant_a, and any substitution or waiver with its cost
- `## Asset inventory`: paths from the manifest, with figures
- `## Pipeline`
- `## Known gaps`: the owner review items; the unenforced exclusions; 'reflection not produced (composite.py draws a contact shadow only)' when the brief asked for a reflection; the plate up-scale factor when plate_scale is above 1; copy that did not fit; every other debt
- `## Next steps`

Then write the outcome, only when this job delivered; `done` overwrites an earlier gate's `partial`:

```bash
printf '{"status":"done"}\n' > artifacts/<project>/outcome.json
grep -c '^## ' artifacts/<project>/PROGRESS.md   # must print 6
```

Check: sheet exits 0 and manifest verify exits 0. Close with the tree, the file count and the credits spent; the delivery note is artifacts/<project>/PROGRESS.md.

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

## On SL8

This kit runs on the SL8 Image Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules (HR-1.0): estimate every paid step first and keep a running total (HR5); never resubmit a job that may exist (HR6); deliverables go under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask the user: use the defaults above, and open a gate if a step would spend past what the brief approved (HR12); never install anything (HR21).
