---
name: c07-making-ad-frame
description: "Makes one social ad image on the SL8 Image Studio: a single safe-zone frame of the product, with large clean negative space for a headline and CTA added later, in square, 4:5, 9:16, 16:9 or 21:9. Use it when a brief asks for one ad image, a social ad or a banner frame with room for copy, made from text or from a product packshot. It never invents claims, prices or copy. Exact copy the user supplies is composited locally afterwards, or listed as copy still owed. A model renders text only on the user's explicit instruction, recorded as a waiver. The skill runs to the end without asking, fills gaps with stated defaults, quotes every paid step first, and stops at a spend gate rather than overspend."
license: MIT
compatibility: "SL8 Image Studio 1.0.2 (sl8-image build 333aaa35); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: image/social-ad
  source: "D1/commercial (fal community)"
  status: untested
---

## Commercial social ad production

Use this skill when the user wants a social ad image: one safe-zone frame, or an ad creative set (hook, proof, lifestyle, conversion), with clean space for copy added later. Load the reference files when you need prompt patterns or category examples:

- `${CLAUDE_SKILL_DIR}/reference/workflows.md`: read it in "Check gates, declare the job, create folders" when the brief asks for an ad creative set, and again in "Build the prompts and params files" for the frame roles.
- `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md`: read it in "Build the prompts and params files", before you write any prompt.
- `${CLAUDE_SKILL_DIR}/reference/examples.md`: read it in the same step, as the quality bar for prompt wording.

This kit names its own models (see Model routing), because fal companion skills are not on SL8. Load `media-ai-gen` and `media-image-generation` (Skill tool) for running and routing, `media-qc` for measuring, and `media-photo-editing` for the copy composite.

The steps, in order: 1 Check gates, declare the job, create folders; 2 Screen copy and claims; 3 Route and verify every endpoint the job may use; 4 Build the prompts and params files; 5 Quote the whole chain and gate; 6 Generate the frames; 7 Measure each frame and record the figures; 8 Retry or fall back on a measured failure only; 9 Composite exact copy and logo (only when asked); 10 Contact sheet, verify and deliver.

Keep the output production-focused. Do not add inflated marketing language,
unsupported claims, fake text in the image, or em dashes.

House rules (media-ai-gen, load it before the first `ai-gen` call): estimate every paid step first and gate on the quote (HR5); never resubmit a job that may exist (HR6); one retry per item, moving a named lever (HR7); deliverables under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); exact text and logos never pass through a model unless the user waives it (HR10, HR20); never ask, use the defaults below and open a gate rather than overspend (HR12); report figures, never verdicts (HR14); never install anything (HR21).

## Inputs to collect

Never ask. Read each input from the brief or from the files in `artifacts/attachments/`. If an input is missing, use its default from the table below and record that default in `artifacts/<project>/DELIVERY.md`.

- Product: exact product name, category, material, color, scale, logo rules.

- Goal: ad creative, as one safe-zone frame (single-safe-zone-frame) or an ad creative set (ad-creative-set: hook, proof, lifestyle, conversion).
- Platform: square, vertical, landscape, banner.

- Brand: premium, playful, clinical, athletic, minimal, natural, technical.
- Source media: product packshot, logo, reference scene, prior generated asset.
- Constraints: preserve packaging, avoid new labels, no fake readable copy.

- Model preference: use this kit's Model routing defaults unless the user names a model
  (a named model wins, HR20) or the job is unusually expensive ("Quote the whole chain and gate" quotes it and gates).

Defaults when the brief is silent:

| Input | Default |
|---|---|
| project | the project named in the brief, else an existing `artifacts/<project>/` that the brief resumes, else a kebab-case slug of the product name plus the submit date, e.g. saas-laptop-20261013 (HR8). A resumed job never derives a new dated slug |
| product | required. Nothing is invented. If the brief names no product and resumes no existing project, there is no project to write to: create no folder or file, end partial and say 'send the product: what it is, its material and colour' (the router writes the outcome) |
| format | single-safe-zone-frame |
| scene | a clean studio surface on a plain background in the brand tone, with no props that compete with the product |
| platform aspect ratio | 1:1. Named platforms map as follows: square 1:1; feed, or 'vertical' with no other hint, 4:5; stories, reels or 'full-screen vertical' 9:16; landscape 16:9; banner 16:9 (the Studio's mapping). An explicit 21:9 request goes to openai/gpt-image-2 as the primary route at image_size {"width":2016,"height":864}, because Nano Banana's 21:9 output (1584x672) is 1.02% off the ratio and fails the 1% aspect check. The ratio is always sent explicitly: aspect_ratio on Nano Banana, a {width,height} image_size object on gpt-image-2 |
| subject placement and copy side | 1:1, 16:9 and 21:9: product in the left third, negative space on the right (at least the right 40% of the frame). 4:5 and 9:16: product in the lower third, negative space in the top 40% |
| brand tone | clean, minimal |
| source media (packshot) | none: frames are made from text only. If the brief promises a packshot that is not in `artifacts/attachments/`, stop, write PROGRESS.md and outcome.json partial, and name the missing file as the debt. Never switch to text-only silently |
| logo file | none. A logo is never sent to a model. When one is supplied, it is copied to source/ and composited last, in "Composite exact copy and logo" |
| constraints | preserve packaging, avoid new labels, no fake readable copy |
| exact copy (headline, CTA, claim, price, discount, legal or health text) | none: frames are delivered with the safe space empty, and the copy is named as a debt |
| composite copy now | false. True only when the brief supplies exact copy and asks for it to be placed |
| text rendered in image | false. True only when the user explicitly asks the model to render their exact copy. It is recorded as an HR10 waiver in "Quote the whole chain and gate", before any gate opens |
| font for composited copy | /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, else the file `fc-match` returns for 'DejaVu Sans:bold', else Pillow's ImageFont.load_default(size=<px>), flagged in DELIVERY.md |
| model preference | fal-ai/nano-banana-pro (text only) or fal-ai/nano-banana-pro/edit (with a packshot). Fallback: openai/gpt-image-2 or openai/gpt-image-2/edit at quality=high. A model the user names wins (HR20) |
| budget (credits) | the smaller of the brief's stated budget and 'remaining' from `manifest.mjs budget` (SL8_SPEND_CEILING minus the ledger). If only one exists, it applies. If neither exists, there is no spend authority: "Quote the whole chain and gate" opens a spend gate and the job ends partial |
| output format | png (lossless, so a later composite does not recompress) |

## Model routing

The source's picks follow. They are kept as fal's reasons for this kit's alternatives, not as instructions; the SL8 routes this kit runs come after them.

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

The SL8 routes this kit runs:

- Text-only frame: `fal-ai/nano-banana-pro`, SL8's measured incumbent for stills at 37.5 cr at 1K. Alternative and retry fallback: `openai/gpt-image-2` at quality=high, fal's premium realistic pick at 52.75 cr at 1024². The two have never been compared head to head on SL8 (IMG-L29). The test run uses nano-banana-pro. The premium-stylized chain collapses to the same pair.
- Frame from a customer packshot: `fal-ai/nano-banana-pro/edit`, with the packshot passed through `--ref`. fal and the Studio both pick it first. Alternative: `openai/gpt-image-2/edit`, which fal prefers when packaging text must stay accurate.
- Explicit 21:9 request: `openai/gpt-image-2` at {"width":2016,"height":864} is the primary (exact ratio); Nano Banana at aspect_ratio 21:9 is the fallback, quoted with a note that it may miss the aspect.
- text-rendered-in-image option, only on the user's explicit instruction: `fal-ai/nano-banana-pro` at resolution 2K by default (the Studio's route for lettering that is part of the art, 9.5/10 on SL8 text cards). Alternative: `openai/gpt-image-2` at quality=high with a 2K size from the table below (fal's text-heavy pick, 'treat as expensive'), used when the user names it or the copy is long or small.
- Not routed: `fal-ai/nano-banana-2` and the Seedream v5 lite endpoints (unmeasured and unpriced on SL8; Seedream rewrites every prompt, never carries text, and its `fal-ai/` ids have drifted to the unprefixed `bytedance/seedream/v5/lite/...`). A fast draft is never a final ad frame.

Declared ratio to the gpt-image-2 `image_size` (that route has no aspect_ratio, and a dropped field returns the default size, HR3). Always write it as a JSON object:

| Ratio | Standard | 2K (text option only) |
|---|---|---|
| 1:1 | {"width":1024,"height":1024} | {"width":2048,"height":2048} |
| 16:9 | {"width":1536,"height":864} | {"width":2048,"height":1152} |
| 9:16 | {"width":864,"height":1536} | {"width":1152,"height":2048} |
| 4:5 | {"width":1024,"height":1280} | {"width":1600,"height":2000} |
| 21:9 | {"width":2016,"height":864} | {"width":2688,"height":1152} |

For any other ratio, derive a size by the same rules: sides in multiples of 16, between 655,360 and 8,294,400 px, aspect at most 3:1 (media-image-generation endpoints.md).

- Text overlays: generate with empty safe space. Add final text afterwards in "Composite exact copy and logo" with a local Pillow composite (load `media-photo-editing`, Skill tool), unless the user explicitly chose the text-rendered-in-image option.

## Check gates, declare the job, create folders

Load `media-ai-gen` and `media-image-generation` (Skill tool). No model runs in this step.

First check that the brief names a product or resumes an existing project; if not, stop as the product row below says, before creating anything. Then, on every job, new or resumed, create the folders and initialise the manifest. Both are idempotent, and `work/<project>/` is lost between jobs:

```bash
mkdir -p artifacts/<project>/final artifacts/<project>/source artifacts/<project>/params artifacts/<project>/qc artifacts/<project>/rejected work/<project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
```

Then check for gates:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <gate id> --option <option id> --by "<their words>"   # only when the brief answers the open gate
```

- Exit 10, and the brief does not answer the gate: spend nothing. Rewrite PROGRESS.md with the gate under Known gaps, leave outcome.json partial, and end. A job never answers its own gate.
- Answered with option `a` (the option that approves the spend): run `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>`. Skip every role whose row is done and verifies. Fetch any pending row with `ai-gen result <id> -o artifacts/<project>/final/ --format json` before submitting anything. Then go to the gate's `resume_at` step, reading the params, prompts and quotes from `artifacts/<project>/params/` and `artifacts/<project>/plan.json`.
- Answered with option `b` (Stop): spend nothing. Write PROGRESS.md (the stop under Known gaps), leave outcome.json `partial`, and end.

Otherwise this is a new job. Read every input from the brief and fill each gap with its default. This bot makes one frame per job, with the role `single` (single-safe-zone-frame). If the brief asks for an ad creative set, make the single frame from the hook role clause and note in DELIVERY.md that the set was not made. Copy the attachments:

```bash
cp artifacts/attachments/<packshot> artifacts/<project>/source/   # only when supplied
cp artifacts/attachments/<logo> artifacts/<project>/source/   # only when supplied
```

If the product is not given, or the brief promises a packshot or logo that is not in `artifacts/attachments/`, stop: write PROGRESS.md and outcome.json {"status":"partial"}, and name the missing input as the debt. Never switch to text-only silently.

Write the plan with one `frames[]` entry per role, each with its route, file and declared object (an ad set has four entries, each with its own `final/<role>.png`):

```bash
cat > artifacts/<project>/plan.json <<'EOF'
{"schema":"sl8.media.plan/1","project":"<project>","declared":{"aspect":"<ratio>","format":"png"},"option":"single-safe-zone-frame|ad-creative-set","copy_side":"right|top","copy":[],"text_in_image":false,"budget":{"credits":<n>,"approved_by":"brief|ceiling"},"frames":[{"role":"single","route":"fal-ai/nano-banana-pro","file":"artifacts/<project>/final/single.png","declared":{"aspect":"<ratio>","format":"png"}}]}
EOF
```

Check: gate.mjs status exits 0 (or the brief answers the open gate), and:

```bash
python3 -c "import json;p=json.load(open('artifacts/<project>/plan.json'));assert all('file' in f and 'declared' in f for f in p['frames'])"
```

## Screen copy and claims

Do not promise claims like "best", "clinically proven", "50 percent faster",
or celebrity endorsements unless the user provides that copy.

Load `media-image-generation` (Skill tool). No model runs in this step.

Put into plan.json `copy[]` only the copy the user supplied, word for word. If the brief asks for a claim but gives no exact copy, drop the claim and list it under dropped claims in DELIVERY.md. This covers best, clinically proven, a percentage, a price, a discount, a health or legal claim, and an endorsement.

If the user explicitly asks the model to render their exact copy (text-rendered-in-image), their instruction wins (HR20): set `"text_in_image":true` in plan.json. The HR10 waiver is recorded in "Quote the whole chain and gate", with its quote, before any gate opens. Check: the owner reviews `copy[]` against the brief, as shown in DELIVERY.md.

## Route and verify every endpoint the job may use

Load `media-ai-gen` (Skill tool). No paid model runs in this step.

Start from routed endpoint IDs. Take the primary and the fallback for this job from Model routing and run `ai-gen info` on each one to confirm it is live:

```bash
ai-gen info fal-ai/nano-banana-pro --format json > work/<project>/info-nano-banana-pro.json
ai-gen info fal-ai/nano-banana-pro/edit --format json > work/<project>/info-nano-banana-pro-edit.json   # packshot jobs
ai-gen info openai/gpt-image-2 --format json > work/<project>/info-openai-gpt-image-2.json
ai-gen info openai/gpt-image-2/edit --format json > work/<project>/info-openai-gpt-image-2-edit.json   # packshot jobs
```

Use text search only as fallback discovery for a missing or stale route: exit 8 from info, or UNRESOLVED from the printer below. Search one keyword at a time, then run info and estimate on the candidate, and record the stale pick in PROGRESS.md. There is no documentation search on SL8.

```bash
ai-gen models --search <single keyword> --format json
```

Inspect each endpoint before running. Print its raw OpenAPI input fields once, into a file named for the whole endpoint id with slashes as dashes (`<endpoint-slug>`, e.g. `openai-gpt-image-2-edit`), and check every value you plan to send against const and enum:

```bash
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<endpoint>" | python3 -c "import json,sys
doc=json.load(sys.stdin)
sch=(doc or {}).get('components',{}).get('schemas',{})
if not sch: print('UNRESOLVED'); sys.exit(1)
for n,s in sch.items():
    if n.endswith('Input'):
        print(n,'required:',s.get('required',[]))
        for f,p in s.get('properties',{}).items():
            print(' ',f,{k:p[k] for k in ('type','const','enum','default') if k in p})" > work/<project>/openapi-<endpoint-slug>.txt
```

Expected fields. Nano Banana: prompt, aspect_ratio, resolution, num_images, seed, safety_tolerance, limit_generations, enable_web_search, output_format and sync_mode, plus image_urls on /edit. gpt-image-2: prompt, image_size, quality, num_images, output_format, background, enable_safety_checker (default true) and sync_mode, plus image_urls on /edit. Pricing is quoted in "Quote the whole chain and gate".

Use schema fields exactly. Do not pass guessed flags. If the model uses
`image_urls`, `aspect_ratio`, `image_size`, `seed`, or
another name, mirror that schema.

Check: ai-gen info exits 0 for each id, and no printer file reads UNRESOLVED. Every planned value fits its enum or the size rules: aspect_ratio, resolution '1K' or '2K', quality 'high', safety_tolerance '4' and the image_size object. Every default-on field the printer lists (sync_mode, enable_safety_checker, safety_tolerance, quality, resolution) has a slot in the params templates of the next step; a listed default-on field with no slot is added before the estimate.

## Build the prompts and params files

Load `media-image-generation` (Skill tool). Read `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` and `${CLAUDE_SKILL_DIR}/reference/examples.md` now; for an ad creative set, also read `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Fill the Social ad safe-zone composition template from the brief, and take the lighting from the material cues. No model runs in this step.

Prompt for surface, lighting, crop, and background. Keep the product
invariant short and exact.

Write prompts in this order so commercial intent stays clear:

1. Product invariant: exact object, material, color, packaging, scale.
2. Commercial role: hero image, PDP image, launch teaser, demo shot, social ad.
3. Setting: surface, background, props, environment, distance from product.
4. Lighting: softbox, strip light, rim light, backlight, caustics, practicals.
5. Camera: angle, focal length feel, macro, depth of field, motion if video.
6. Composition: centered, negative space, safe zone, text-free area, platform.
7. Brand tone: premium, clean, clinical, bold, energetic, warm, editorial.
8. Guardrails: preserve logo and packaging, no extra text, no distorted labels.

Role clauses for an ad set. Keep the same product invariant and the declared aspect in all four frames:

- hook: 'product and its benefit shown visually, readable in one glance'
- proof: 'close detail of <feature, ingredient, texture>'
- lifestyle: the Product with lifestyle context pattern, '[product] used in [real setting], natural interaction with [person or environment], product remains sharp'
- conversion: 'clean safe-zone layout, at least half the frame empty for text and CTA'

Packshot route: the Nano Banana edit prompt adds 'exact label and packaging preserved from the reference image' (the Skincare serum hero wording) and keeps aspect_ratio pinned, because the edit route defaults to auto. On gpt-image-2/edit, label the input 'Image 1: product packshot, preserve exactly'. Neither route has a negative_prompt field: write the negative prompt components as positive guardrails, and note in DELIVERY.md that the exclusion is unenforced.

Write one primary and one fallback params file per frame. The fallback's image_size is the Standard object from the Model routing table:

```bash
cat > artifacts/<project>/params/<role>.params.json <<'EOF'
{"prompt":"<product invariant>, social ad, <role clause>, <scene>, <material light>, <camera>, subject placed in <left third|lower third>, large clean negative space on <right|top> for copy, <ratio> frame, strong first-frame readability, <tone>, <guardrails as positives>, plain surfaces with no lettering","aspect_ratio":"<ratio>","resolution":"1K","num_images":1,"output_format":"png","limit_generations":true,"enable_web_search":false,"safety_tolerance":"4","sync_mode":false}
EOF
cat > artifacts/<project>/params/<role>.fb.params.json <<'EOF'
{"prompt":"Scene: <setting, light, camera>\nSubject: <product invariant>\nImportant details: product in <left third|lower third>, large clean empty area on <right|top> for copy\nUse case: social ad, <role>, <ratio>\nConstraints: no text, no extra products, no new labels","image_size":{"width":<w>,"height":<h>},"quality":"high","num_images":1,"output_format":"png","background":"opaque","enable_safety_checker":true,"sync_mode":false}
EOF
```

Explicit 21:9 request: swap the two bodies. `<role>.params.json` is the gpt-image-2 body at {"width":2016,"height":864} (with "enable_safety_checker":true and "sync_mode":false), and `<role>.fb.params.json` is the Nano Banana body at aspect_ratio "21:9". Note in plan.json that the fallback may miss the aspect.

Text-rendered-in-image branch:

- Nano Banana: replace 'plain surfaces with no lettering' with 'the only text is "<exact copy>", spelled exactly, in <placement>', and set resolution to "2K".
- gpt-image-2: put the quoted copy under Important details, take image_size from the 2K column, and replace the Constraints line with 'Constraints: the only text is the quoted copy, spelled exactly; no extra words, no extra products, no new labels'.

Check that every file parses, that no prompt holds an em dash, and that every file pins its default-on flags (each command must print nothing):

```bash
for f in artifacts/<project>/params/*.json; do python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$f" || echo "BAD $f"; done
grep -l $'\xe2\x80\x94' artifacts/<project>/params/*.params.json
python3 -c "import json,glob;[print(f) for f in glob.glob('artifacts/<project>/params/*.json') if 'sync_mode' not in json.load(open(f)) or ('image_size' in json.load(open(f)) and 'enable_safety_checker' not in json.load(open(f)))]"
```

`--strict-params` at submit refuses any unknown key (exit 7, client-side, not charged). The owner reviews the prompt text in the manifest row.

## Quote the whole chain and gate

Load `media-ai-gen` (Skill tool). No model runs; estimates are free. Before the first paid call, estimate every frame on its primary and its fallback, from the exact params files:

```bash
ai-gen estimate fal-ai/nano-banana-pro --params-file artifacts/<project>/params/<role>.params.json --format json   # fal-ai/nano-banana-pro/edit on packshot jobs; openai/gpt-image-2 on explicit 21:9 jobs
ai-gen estimate openai/gpt-image-2 --params-file artifacts/<project>/params/<role>.fb.params.json --format json   # openai/gpt-image-2/edit on packshot jobs; fal-ai/nano-banana-pro on explicit 21:9 jobs
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Use credits, never estimated_usd. The first ai-gen call can take 1-3 minutes, so never wrap it in a timeout under 300 s. Exit 12 means unpriced: that route is not run, and the job moves to the next route or to a gate. `ai-gen estimate` takes no media flags, so a quote on an edit route omits the packshot's input tokens: it is a lower bound, and an exit 13 at submit is recovered in the next steps.

In plan.json `budget`, write each frame's primary and fallback quote, `sum_primary`, `retry_headroom` (the sum of the fallback quotes) and the budget (the smaller of the brief's and remaining).

Text-rendered-in-image only, now, before any gate can open:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR10 --instruction "<user's words asking for the text in the image>" --cost "<sum_primary> cr"
```

- If sum_primary is at most the budget, go on to "Generate the frames". If the retry headroom does not also fit, note the shortfall in PROGRESS.md; any retry that does not fit opens its own gate later.
- If sum_primary is over the budget, or there is no spend authority, spend nothing. Open the gate, write PROGRESS.md and end; gate.mjs writes outcome.json {status: partial}:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-frames --question "<n> frames on <route>, <sum_primary> cr (retry headroom <retry_headroom> cr); budget <budget> cr" --options '[{"id":"a","label":"Run <n> frames on <route>","credits":<sum_primary>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "Generate the frames" --quote <sum_primary>
```

The params and quotes are already under `artifacts/<project>/`, where a resumed job reads them. On resume, only option `a` starts "Generate the frames"; option `b` spends nothing and leaves the outcome partial.

Check: each estimate exits 0 with estimated_credits, and sum_primary is at most the budget. In the text branch, manifest.json `waivers[]` holds the HR10 entry.

## Generate the frames

Load `media-ai-gen` (Skill tool) and run `ai-gen run`, one queued call per frame, into `artifacts/<project>/final/`. Pass the packshot in the same call with `--ref`; there is no separate upload. The logo is never passed.

```bash
ai-gen run fal-ai/nano-banana-pro --params-file artifacts/<project>/params/<role>.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/<role>.result.json
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/<role>.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/<role>.result.json   # packshot jobs
ai-gen run openai/gpt-image-2 --params-file artifacts/<project>/params/<role>.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/<role>.result.json   # explicit 21:9 jobs only
```

Read the download path from `files[0].local_path`; ai-gen names the file `{model-tail}-{timestamp}.png`, so never guess the name. Rename the file to its role and write one manifest row whose `files` carries the new path:

```bash
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<role>.result.json); mv "$F" artifacts/<project>/final/<role>.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<role>.result.json --params artifacts/<project>/params/<role>.params.json --json '{"item":"<role>","node":"final","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["final/<role>.png"]}'   # parents only on packshot jobs
```

If a call ends without a usable result, fetch it and never resubmit (HR6). The request id is in: exit 10 (timeout) `error.details.requestId`; exit 14 (download failed) `error.details.envelope.request_id`; a command cut off before writing the envelope, the newest entry for this model in `~/.cache/ai-gen/jobs.json`:

```bash
python3 -c "import json,os;[print(j['submitted_at'],j['model'],j['request_id']) for j in json.load(open(os.path.expanduser('~/.cache/ai-gen/jobs.json')))['jobs'][:5]]"
ai-gen result <request-id> -o artifacts/<project>/final/ --format json > work/<project>/<role>.result.json   # then read local_path, mv and add as above
```

Exit 13 (cost cap) means nothing was submitted: re-plan or open a gate, and never raise the cap. A failed call (exit 7, 9 and so on, following media-ai-gen's recovery table) gets a failed row without `--result`. It counts as attempt 1, so the next try is attempt 2 with lever `route` in "Retry or fall back on a measured failure only":

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/<role>.params.json --json '{"item":"<role>","node":"final","endpoint":"<endpoint>","request_id":null,"status":"failed","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"notes":"exit <n> <error.code>"}'   # request_id from error.details if present
```

Check: run exits 0 and the envelope has `files[0].local_path`; manifest.mjs add exits 0; `test -s artifacts/<project>/final/<role>.png`.

## Measure each frame and record the figures

Load `media-qc` and `media-ai-gen` (Skill tool). No model runs in this step. For each attempt-1 frame:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/<role>.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/<role>.png --aspect <ratio> --format png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/<role>.png --id <role>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<role>.result.json --params artifacts/<project>/params/<role>.params.json --json '{"item":"<role>","node":"final","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"files":["final/<role>.png"],"measured":{"width":<w>,"height":<h>,"aspect_value":<a>,"format":"png"}}'
```

The last add uses the same envelope, so it updates the row by its request id. A dropped field returns a default-size image (HR3), and only this declared-versus-measured check catches it. Report figures, never PASS (HR14). Exit 0 means the figures matched. Exit 1 with BQ-01, BQ-02, IQ-03 or IQ-04 is a measured failure, and that frame goes to "Retry or fall back on a measured failure only". Exit 3 is reported as 'not checked' with its error and named as a debt.

## Retry or fall back on a measured failure only

Before returning, check:

- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting makes sense for the product material.

- Output paths are from `files[].local_path` in the ai-gen result, renamed to their role, and each has a manifest row.

Reject outputs with altered logos, warped packaging, or invented text.

If the result misses product fidelity, switch from text-only generation to a
reference or edit workflow before retrying.

On SL8, every check above is an owner review item (HR14), and so is a fidelity miss. List each one in DELIVERY.md with the frame it concerns. For an ad set, also list the hook frame (product and benefit in under one second) and the conversion frame (a clean safe-zone layout for external text and CTA). A fidelity miss does not trigger a paid retry here. DELIVERY.md names the lever for the next job: supply a packshot (for a text-only job), or add a prompt clause or switch to openai/gpt-image-2/edit (for a packshot job).

Load `media-image-generation`, `media-ai-gen` and `media-qc` (Skill tool). Only a media-qc exit 1, or a failed call in "Generate the frames", triggers a retry (HR7). Read the attempt count from manifest.json, never from memory.

**BQ-01 or BQ-02: re-fetch first.** This is the same attempt, not a retry. Re-fetch, rename back to the role name, then re-run the "Generate the frames" add and the "Measure each frame" commands unchanged; the same request id updates the row:

```bash
mv artifacts/<project>/final/<role>.png work/<project>/<role>.broken.png
ai-gen result <request-id> -o artifacts/<project>/final/ --format json > work/<project>/<role>.result.json
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<role>.result.json); mv "$F" artifacts/<project>/final/<role>.png
```

Only a re-fetched file that still fails BQ-01 or BQ-02 is a bad generation.

**Pick one lever** for one attempt-2 retry:

- IQ-03 or IQ-04 (the route ignored size or format), a re-fetched BQ-01, or a failed call: lever `route`. Resending an ignored aspect_ratio is not a lever. The retry endpoint is openai/gpt-image-2 (or /edit on packshot jobs; fal-ai/nano-banana-pro on explicit 21:9 jobs):

```bash
cp artifacts/<project>/params/<role>.fb.params.json artifacts/<project>/params/<role>.r2.params.json
```

- A re-fetched BQ-02 on Nano Banana: lever `seed`, on the same route:

```bash
cp artifacts/<project>/params/<role>.params.json artifacts/<project>/params/<role>.r2.params.json && python3 -c "import json,sys;p=json.load(open(sys.argv[1]));p['seed']=int(sys.argv[2]);json.dump(p,open(sys.argv[1],'w'))" artifacts/<project>/params/<role>.r2.params.json <new seed>
```

**Set the failed file aside** (a bad generation only; a failed call has no file). On a resumed job where `rejected/<role>.png` already exists, skip both commands (the result file in work/ is gone and the row is already rejected):

```bash
test -f artifacts/<project>/rejected/<role>.png || mv artifacts/<project>/final/<role>.png artifacts/<project>/rejected/<role>.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<role>.result.json --params artifacts/<project>/params/<role>.params.json --json '{"item":"<role>","node":"rejected","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"status":"rejected","notes":"<QC code and figure>","files":["rejected/<role>.png"]}'
```

**Quote the retry on its own** and check it against what remains:

```bash
ai-gen estimate <retry endpoint> --params-file artifacts/<project>/params/<role>.r2.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

On packshot jobs the gpt-image-2/edit quote is a lower bound (input tokens unpriced). If `--max-cost <r2 quote>` exits 13, nothing was submitted: open the gate below with the quote rounded up, and never raise the cap.

**Run it if it fits** (or, on a resumed job whose answered option `a` approved this gate, run it at the quote saved in the gate, with no new gate). It writes its own file, and no retry overwrites an earlier attempt's file:

```bash
ai-gen run <retry endpoint> --params-file artifacts/<project>/params/<role>.r2.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <r2 quote> -o artifacts/<project>/final/ --format json > work/<project>/<role>.r2.result.json   # drop --ref on text-only jobs
F=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['files'][0]['local_path'])" work/<project>/<role>.r2.result.json); mv "$F" artifacts/<project>/final/<role>-r2.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/<role>-r2.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/<role>-r2.png --aspect <ratio> --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<role>.r2.result.json --params artifacts/<project>/params/<role>.r2.params.json --json '{"item":"<role>","node":"final","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<r2 quote>},"attempt":2,"lever":"<lever>","parents":["<role>#1"],"files":["final/<role>-r2.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/final/<role>-r2.png --id <role>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<role>.r2.result.json --params artifacts/<project>/params/<role>.r2.params.json --json '{"item":"<role>","node":"final","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<r2 quote>},"attempt":2,"lever":"<lever>","parents":["<role>#1"],"files":["final/<role>-r2.png"],"measured":{"width":<w>,"height":<h>,"aspect_value":<a>,"format":"png"}}'
python3 -c "import json,sys;f=sys.argv[1];p=json.load(open(f));[x.update(file='artifacts/'+p['project']+'/final/'+sys.argv[2]+'-r2.png') for x in p['frames'] if x['role']==sys.argv[2]];json.dump(p,open(f,'w'),indent=1)" artifacts/<project>/plan.json <role>
```

`final/<role>-r2.png` is now that role's deliverable; the failed file stays in `rejected/`. If the retry call itself fails, record it without `--result`, then gate:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/<role>.r2.params.json --json '{"item":"<role>","node":"final","endpoint":"<retry endpoint>","request_id":null,"status":"failed","declared":{"aspect":"<ratio>","format":"png"},"credits":{"estimate":<r2 quote>},"attempt":2,"lever":"<lever>","notes":"exit <n> <error.code>"}'   # request_id from error.details if present
```

**Gate** if the retry does not fit the budget, exits 13, or attempt 2 also fails. Save nothing new (the r2 params are already under `artifacts/<project>/params/`), write PROGRESS.md and end partial with the debt named. On resume, option `a` re-enters this step; option `b` spends nothing and keeps the outcome partial:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug fallback-<role> --question "<role>: <retry does not fit the budget, or failed twice (<codes>)>; run <route> at <quote> cr?" --options '[{"id":"a","label":"Run <route> for <role>","credits":<quote>},{"id":"b","label":"Stop with what is delivered","credits":0}]' --resume-at "Retry or fall back on a measured failure only" --quote <quote>
```

Check: the attempt-2 mediaqc commands exit 0, and `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>` exits 0 after the moves.

## Composite exact copy and logo (only when asked)

Run this step only when the brief supplies exact copy with composite-copy-now true, or supplies a logo. In the text-rendered-in-image branch, skip the copy but still composite a supplied logo. Otherwise write a debt line in DELIVERY.md, e.g. 'headline still owed on final/single.png, right 40%'.

Load `media-photo-editing` (Skill tool), which teaches Pillow ImageDraw and ImageFont compositing, plus `media-qc` and `media-ai-gen`. Choose the font, run the kit's helper on the clean delivered frame (`<role>-r2.png` where a retry replaced it), and write the result to a separate file. Measure it before the tool row, because a tool row cannot be updated:

```bash
mkdir -p artifacts/<project>/final_copy
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf; test -f "$FONT" || FONT=$(fc-match -f '%{file}' 'DejaVu Sans:bold' 2>/dev/null); test -n "$FONT" && test -f "$FONT" || FONT=default
python3 ${CLAUDE_SKILL_DIR}/scripts/composite_copy.py --in artifacts/<project>/final/<role>.png --out artifacts/<project>/final_copy/<role>.png --font "$FONT" --side <right|top> --copy "<exact line 1>" [--copy "<exact line 2>"] [--logo artifacts/<project>/source/<logo>]   # --copy omitted in the text-in-image branch
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final_copy/<role>.png --aspect <ratio> --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"<role>-copy","node":"final_copy","tool":"python3 scripts/composite_copy.py","parents":["<role>#<attempt>"],"declared":{"aspect":"<ratio>","format":"png"},"measured":{"width":<w>,"height":<h>,"aspect_value":<a>,"format":"png"},"files":["final_copy/<role>.png"]}'
```

The helper loads with ImageOps.exif_transpose and converts to RGBA. It treats the copy side's 40% as the safe box, starts at box height/4 and shrinks until every line's textbbox width is at most 90% of the box, picks dark or light text from the box luminance, places the logo with alpha_composite and saves png. It prints the font it used; if that is the Pillow default, flag it in DELIVERY.md. No model runs in this step. Check: mediaqc image exits 0 (the aspect is unchanged). The owner reviews spelling and placement.

## Contact sheet, verify and deliver

Load `media-qc` and `media-ai-gen` (Skill tool). No model runs in this step.

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/final/
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/final/ --out artifacts/<project>/qc/contact.jpg   # add artifacts/<project>/final_copy/ when the composite ran
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
```

Write `artifacts/<project>/PROGRESS.md` with the six sections Summary, Decisions, Asset inventory, Pipeline, Known gaps and Next steps. Name manifest.json as the map from each file to its prompt and model, and record the copy debt.

The delivery note is `artifacts/<project>/DELIVERY.md`. For each deliverable give its path, route, measured figures and credits. Also list every default chosen, the dropped claims, the owner review items, the unenforced negative-prompt exclusions, the font fallback if one was used, and the copy debt (e.g. 'headline still owed on final/single.png, right 40%').

When every frame is delivered and no spend gate is open, write the outcome. This overwrites a gate's partial when a resumed job delivers:

```bash
printf '{"status":"done"}\n' > artifacts/<project>/outcome.json
```

Close with one line: the folder tree, the file count and the credits spent. Check: manifest.mjs verify exits 0; mediaqc artifact on final/ exits 0; `grep -c '^## ' artifacts/<project>/PROGRESS.md` prints 6.

**Check the deliverables and write the project status.** Run `node ${CLAUDE_SKILL_DIR}/scripts/verify.mjs --project <project>`; it checks that every frame in plan.json exists, and that qc/contact.jpg, manifest.json, DELIVERY.md and PROGRESS.md (six sections) are there. Fix what it names and run it again. Then write `artifacts/<project>/source/job-status.json` as `{"job":"ad-frame","what":"<product> social ad","state":"closed","context":{"aspect":"<ratio>","copy_side":"<right|top>","packshot":"<file or none>","budget":"<credits>"},"decisions":[],"deliverables":[<one {"name","file"} per final/ file>]}` (state `waiting`, with the open gate as a decision, when a spend gate is open) and run `node ${CLAUDE_SKILL_DIR}/../c07-router/scripts/status.mjs --project <project> --record artifacts/<project>/source/job-status.json`.

## On SL8

This kit runs on the SL8 Image Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules (HR-1.0): estimate every paid step first and keep a running total (HR5); never resubmit a job that may exist (HR6); deliverables go under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask the user: use the defaults above, and open a gate if a step would spend past what the brief approved (HR12); never install anything (HR21).
