---
name: c08-making-reveal-clip
description: "Product reveal video, product reveal clip, packshot animation, commercial product video, beverage pour, turntable, push-in, product motion clip. Makes one short, silent commercial clip that reveals a product from a hero frame with one simple camera move, on the SL8 Video Studio with ai-gen. It first generates the hero still (from the customer's packshot when one is attached) or uses the customer's approved frame. It then animates the frame on Seedance 2.0 image-to-video for final quality. It keeps the product's shape, label and logo intact and generates no text, prices or claims. It quotes the whole chain before spending and measures the result. Use it when a brand, e-commerce or ad brief asks for a product reveal or a short product clip made from one still."
license: MIT
compatibility: "SL8 Video Studio 1.0.2 (sl8-video build 15483cb4); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: video/product-reveal
  source: "D1/commercial (fal community)"
  status: untested
---

## Product reveal video on SL8

Use this skill when a brief asks for a short commercial video that reveals the product from a hero frame with simple camera motion (video/product-reveal). Read the reference files when a step tells you to:

- `${CLAUDE_SKILL_DIR}/reference/inputs.md` (step 1): the default for every input the brief leaves out
- `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md` (step 4): the reveal and hero-frame templates, the material cues and the negative prompt components
- `${CLAUDE_SKILL_DIR}/reference/examples.md` (step 4): the reference-quality reveal example (beverage pour)
- `${CLAUDE_SKILL_DIR}/reference/workflows.md` (steps 6 and 10): the reveal recipe and the hero-frame concept recipe

This kit names its own models (see Model choice). Load these Studio skills by name with the Skill tool when a step says so: `media-ai-gen` (every ai-gen call, manifest row and gate), `media-video-generation` (the video route), `media-image-generation` (the hero still), `media-shot-craft` (the motion prompt) and `media-qc` (measurement). Follow media-ai-gen's house rules: declare before spending (HR1), estimate the whole chain first (HR5), never resubmit a job that may exist (HR6), deliverables under `artifacts/<project>/` (HR8), one manifest row per generation (HR9), never ask (HR12) and never install anything (HR21).

Keep the output production-focused. Do not add inflated marketing language,
unsupported claims, fake text in the image, or em dashes.

## Inputs to collect

Never ask. Read every input from the brief and from the files attached in `artifacts/attachments/`. When an input is missing, use its default in `${CLAUDE_SKILL_DIR}/reference/inputs.md` and record it in PROGRESS.md under Decisions.

- Product: exact product name, category, material, color, scale, logo rules.

- Goal: motion reveal (this kit makes only the product reveal video).

- Platform: square, vertical, landscape, banner, transparent background, print.
- Brand: premium, playful, clinical, athletic, minimal, natural, technical.
- Source media: product packshot, logo, reference scene, prior generated asset.
- Constraints: preserve packaging, avoid new labels, no fake readable copy.

- Model preference: use this kit's routes (Model choice) unless the brief names a model, which wins (HR20) and is checked with `ai-gen info` and estimated before it runs, or the job is unusually expensive, which the step 5 quote settles.

## Step 1. Intake, folders, gate status and answer, declared plan

Load `media-ai-gen` and `media-video-generation` (Skill tool). Take every input from the brief, or its default. First save the request unchanged to `work/request.md` and check its inputs, before any project folder exists:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/inputs.mjs work/request.md
```

Exit 1 means no product is named, so there is no project: create no folder under `artifacts/`, spend nothing, write no status, and end partial with the script's say line as the reason (the router writes outcome.json). Every input in its `assume` list takes its default below and gets its line under Decisions.

With a product, the project is its slug (inputs.md). Create every folder the kit writes to, move the request to `artifacts/<project>/source/request.md` (keep an earlier one as `request-<n>.md`) and read the gate state:

```bash
mkdir -p artifacts/<project>/keyframes artifacts/<project>/clips artifacts/<project>/source artifacts/<project>/params artifacts/<project>/qc work/<project>
mv work/request.md artifacts/<project>/source/request.md
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>
```

Existing project (a gate from an earlier job):

- Exit 10 and the brief does not answer the gate: spend nothing. Restate the question in PROGRESS.md (Known gaps and Next steps), leave `artifacts/<project>/outcome.json` as `{"status":"partial","reason":"gate <NN> open"}` and end. Never answer a gate yourself.
- The brief answers it: record its words, then read the answered option with `gate.mjs status` again:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <NN> --option <id> --by "brief: <its words>"
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
```

- Option 'a' (the one that approves the spend): resume at the gate's resume_at ('step 6: hero frame', 'step 7: submit clip' or 'step 10: recovery (fallback render)'). First fetch any pending row with `ai-gen result <id>` before submitting anything. Read prompts and params from `artifacts/<project>/params/` and the hero from `keyframes/` or `source/`: `work/<project>/` is lost between jobs.
- Option 'b' (Stop): spend nothing. Write PROGRESS.md, leave outcome.json `{"status":"partial","reason":"stopped at gate <NN>"}` and end.

New project: start the manifest. If the brief gives an instruction that breaks a house rule (for example 'do not pause' or 'a third attempt'), carry it out and record it now, before anything is spent (HR20):

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule <HRn> --instruction "<the brief's words>"
```

Declare everything before any paid call (HR1), in media-ai-gen's plan shape (gates-and-manifest.md): the brief's values, one timing row and an empty budget. In every command below, `<aspect>`, `<resolution>` and `<n>` (seconds) are the brief's values, else their defaults in inputs.md (16:9, 720p, 4); a 480p 5 s brief declares, quotes and renders 480p and 5 s. Step 5 fills the budget, step 9 fills render_dur. Do not declare fps: no Seedance or Veo field sets it.

```bash
cat > artifacts/<project>/plan.json <<'EOF'
{"schema":"sl8.media.plan/1","project":"<project>","declared":{"aspect":"<aspect>","resolution":"<resolution>","duration_s":<n>,"audio":"off","format":"mp4"},"budget":{"credits":<approved>,"approved_by":"brief|ceiling","lines":[],"total":null},"rows":[{"n":1,"start":0,"dur":<n>,"render_dur":null,"route":"bytedance/seedance-2.0/image-to-video","action":"<one physical action>","look":"<lighting, grade; opening frame>","vo":"","vo_words":0,"vo_start":0,"overlay":""}]}
EOF
```

Check: plan.json parses and declares aspect, resolution, duration_s, audio and format before the first estimate. One of three holds: gate.mjs status exits 0 with no Stop answer; the brief answered the gate with option 'a'; or the job has ended partial with PROGRESS.md written.

## Step 2. Confirm routes and read schemas

1. Start from routed endpoint IDs.

Load `media-ai-gen`, `media-video-generation` and `media-image-generation` (Skill tool). Run `ai-gen info` on every route this job may use, each into its own uniquely named schema file. The four still lines apply only when the hero is generated.

```bash
ai-gen info bytedance/seedance-2.0/image-to-video --format json > work/<project>/schema-seedance20-i2v.json
ai-gen info bytedance/seedance-2.0/fast/image-to-video --format json > work/<project>/schema-seedance20-fast-i2v.json
ai-gen info fal-ai/nano-banana-pro --format json > work/<project>/schema-nbp-t2i.json
ai-gen info fal-ai/nano-banana-pro/edit --format json > work/<project>/schema-nbp-edit.json
ai-gen info openai/gpt-image-2/edit --format json > work/<project>/schema-gptimage2-edit.json
ai-gen info openai/gpt-image-2 --format json > work/<project>/schema-gptimage2-t2i.json
```

Search for models only as a fallback, when a routed ID exits 8 or prints UNRESOLVED, one keyword at a time (`ai-gen models --search seedance --format json`). There is no documentation search on SL8.

2. Inspect the selected endpoint before running.

`ai-gen info` shows a const as a plain default (HR2), so also print each route's input fields with their const and enum values, using media-ai-gen's raw OpenAPI printer:

```bash
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<each route above>" | python3 -c "<media-ai-gen raw OpenAPI printer>" > work/<project>/openapi-<same unique name>.txt
```

Check every value the payload will carry. Seedance (base and /fast/): duration (string enum "4" to "15", never "auto"), resolution, aspect_ratio, generate_audio, bitrate_mode, and enable_safety_checker if listed. Nano Banana Pro and its edit route: aspect_ratio, resolution, limit_generations, enable_web_search, safety_tolerance, and output_format and sync_mode if listed. gpt-image-2 and its edit route: image_size presets (not aspect_ratio), quality, output_format, background, enable_safety_checker, sync_mode. The price check is step 5, on the exact params files.

6. Use schema fields exactly. Do not pass guessed flags. If the model uses
   `image_urls`, `reference_image_url`, `aspect_ratio`, `duration`, `seed`, or
   another name, mirror that schema.

Check: each `ai-gen info` exits 0 (exit 8 means unknown) and the printer does not print UNRESOLVED. Every value a payload carries appears in the printed enum or const. If one does not, change the route before you build any payload, and write the change in PROGRESS.md.

## Step 3. Inputs into source/ (customer's frame or packshot)

Load `media-ai-gen` and `media-qc` (Skill tool). For every attached file the job uses (the customer's approved frame, the product packshot), check it exists, copy it unchanged into `source/` with its original name and extension, and measure it. Run the `--aspect` comparison only on an approved frame, which is animated as is. A packshot is only a reference for the edit route, so it is measured without flags:

```bash
ls artifacts/attachments/<file>
cp artifacts/attachments/<file> artifacts/<project>/source/<file>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/source/<file>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/<packshot>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/source/<approved frame> --aspect <declared W:H>
```

If the brief names a file that `ls` does not find, stop: write PROGRESS.md and outcome.json `{"status":"partial","reason":"attachment <file> missing"}`. Never switch silently to generating a hero.

SL8 has no separate upload step. With option 'customer's approved frame uploaded', the copied frame is the hero: skip step 6 and use `artifacts/<project>/source/<file>` wherever later steps say `<hero>`. With option 'hero frame generated first', a copied packshot reaches the edit route in step 6 through `--ref`, and `<hero>` is `artifacts/<project>/keyframes/hero.png`. A logo is never sent to a model (HR10): name it in PROGRESS.md as a debt for media-motion-graphics to composite after the clip, or as unused. Attachments are never overwritten.

Check: `mediaqc artifact` exits 0 on every copied file. On the approved frame, `image --aspect` may exit 1; that is not a retry trigger, because nothing was generated. State its figures in the delivery: the clip's aspect follows the declaration, and the re-composition is an owner review item.

## Step 4. Build the prompts and params files (hero still and motion)

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

Read the Product reveal video template, the material cues and the negative prompt components in `${CLAUDE_SKILL_DIR}/reference/prompt-patterns.md`, and the reveal example in `${CLAUDE_SKILL_DIR}/reference/examples.md`. With option 'hero frame generated first', also read the Product hero image template. Load `media-shot-craft` and `media-image-generation` (Skill tool). Fill the templates from the brief, in the build order above.

- Motion prompt: one physical action and one camera move. The opening frame (for example a condensation close-up) is the still's settled state, not a beat. A pour with its own splash is one action, because the splash is the pour's consequence. The push-in is the one move. Anything more needs a second clip, which this kit does not make.
- Seedance has no negative_prompt. Write each exclusion as a positive clause (for example 'label stays flat and legible as in the frame', 'clean empty stone surface') and report them as unenforced.
- Hero still prompt: the product as the only hero object, at the declared aspect, in a text-free frame with room for the camera move. With a packshot, the product invariant refers to it as Image 1.

Write each prompt to its .txt file under `artifacts/<project>/params/`, then into its params file with exact JSON types and every default-on flag pinned (HR4). Write the hero files only with option 'hero frame generated first', and only the clip file for the chosen lane. Use the brief's duration on each lane's wire format and its aspect. Before the run, remove any pinned key step 2 did not list for that route (--strict-params refuses it, exit 7, not charged): output_format or sync_mode on Nano Banana, bitrate_mode or enable_safety_checker on Seedance, safety_tolerance or auto_fix on Veo lite. Add and pin a listed key that defaults on (enable_safety_checker, auto_fix). `hero-gpt.params.json` is the params block for the gpt-image-2 fallbacks (image_size and quality; no resolution, limit_generations, enable_web_search or safety_tolerance). The /fast/ fallback uses clip.params.json unchanged.

```bash
python3 -c "import json;p=open('artifacts/<project>/params/hero.prompt.txt').read().strip();json.dump({'prompt':p,'aspect_ratio':'<aspect>','resolution':'1K','num_images':1,'limit_generations':True,'enable_web_search':False,'safety_tolerance':'4','output_format':'png','sync_mode':False},open('artifacts/<project>/params/hero.params.json','w'))"
python3 -c "import json;p=open('artifacts/<project>/params/hero.prompt.txt').read().strip();json.dump({'prompt':p,'image_size':'landscape_16_9','quality':'high','num_images':1,'output_format':'png','background':'auto','enable_safety_checker':True,'sync_mode':False},open('artifacts/<project>/params/hero-gpt.params.json','w'))"
python3 -c "import json;p=open('artifacts/<project>/params/clip.prompt.txt').read().strip();json.dump({'prompt':p,'duration':'<n>','resolution':'<resolution>','aspect_ratio':'<aspect>','generate_audio':False,'bitrate_mode':'standard'},open('artifacts/<project>/params/clip.params.json','w'))"
grep -nE 'becomes|transforms|morphs|resolves into|turns into|shifts to|—' artifacts/<project>/params/hero.prompt.txt artifacts/<project>/params/clip.prompt.txt
```

Check: the grep prints nothing (no transformation verbs, no em dash). media-shot-craft's Step 8 validator prints its ten lines for each prompt, with 'one action' naming one beat and 'lettering and speech: none'. `python3 -m json.tool` parses each params file. Claim words the brief did not supply are listed for the owner's review.

## Step 5. Quote the whole chain and gate on the total

Load `media-ai-gen` (Skill tool). Price every paid step before the first paid call, on the params files that will run: the hero still (option 'hero frame generated first' only; the edit route when a packshot is attached) and the clip on the chosen lane. Prices are credits (about 250 per US$), never estimated_usd.

```bash
ai-gen estimate fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/hero.params.json --format json
ai-gen estimate fal-ai/nano-banana-pro --params-file artifacts/<project>/params/hero.params.json --format json
ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/clip.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Raise each line to any measured-* row that prices the same call higher: the clip line from media-video-generation's `references/facts.md`, the hero line from media-image-generation's `references/facts.md`. Write the quote lines and the total into plan.json:

```bash
python3 -c "import json;f='artifacts/<project>/plan.json';d=json.load(open(f));d['budget']['lines']=[{'stage':'hero','endpoint':'<hero route>','calls':1,'estimate':<e1>,'quote':<q1>},{'stage':'clip','endpoint':'<clip route>','calls':1,'estimate':<e2>,'quote':<q2>}];d['budget']['total']=<q1+q2>;json.dump(d,open(f,'w'),indent=1)"
```

Compare the total with what remains. If budget prints remaining null, use the brief's budget. With no ceiling and no budget there is no spend authority. If the total is over what remains, open the gate. Everything step 6 onward needs is already under `artifacts/<project>/params/` and `source/`. With option 'customer's approved frame uploaded' there is no hero line and resume-at is "step 7: submit clip".

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-reveal --question "Hero still on <route> and a <n> s <resolution> clip on <route>, <total> credits?" --options '[{"id":"a","label":"Hero + clip, <n> s <resolution>","credits":<total>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 6: hero frame" --quote <total>
```

After opening the gate, write PROGRESS.md (the gate under Known gaps and Next steps), leave outcome.json partial and stop. A resumed job proceeds only on option 'a'; a Stop answer spends nothing and stays partial (step 1).

Check: every estimate exits 0. Exit 12 means unpriced: that route never runs inside a budget; take the named fallback (re-estimated) or open the gate. budget.total is at most what remains, or the gate is open and the job has stopped. A retry later adds its own line and raises the total before its call.

## Step 6. Hero frame (option 'hero frame generated first')

When the brief supplies no approved frame, create one still hero frame at the declared aspect. Read the Text-to-image product concept recipe in `${CLAUDE_SKILL_DIR}/reference/workflows.md`. Load `media-image-generation`, `media-ai-gen` and `media-qc` (Skill tool). With a packshot, run the edit route with it as Image 1; otherwise run the text route. The edit route's aspect_ratio defaults to auto, so it stays pinned.

```bash
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/hero.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <q1> -o artifacts/<project>/keyframes/ --format json > work/<project>/hero.result.json
ai-gen run fal-ai/nano-banana-pro --params-file artifacts/<project>/params/hero.params.json --queue --strict-params --max-cost <q1> -o artifacts/<project>/keyframes/ --format json > work/<project>/hero.result.json
```

Read the downloaded path from `files[0].local_path`, rename the file, record the row with the new path in files, measure it, and re-run `add` with the same `--result` and the figures in "measured". Without a packshot, drop parents. If local_path does not end in .png, keep its extension in the new name, in files and in declared.format.

```bash
mv "$(python3 -c "import json;print(json.load(open('work/<project>/hero.result.json'))['files'][0]['local_path'])")" artifacts/<project>/keyframes/hero.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/hero.result.json --params artifacts/<project>/params/hero.params.json --json '{"item":"hero","node":"keyframes","declared":{"aspect":"<aspect>","min_long":1024,"format":"png"},"credits":{"estimate":<q1>},"attempt":1,"parents":["source/<packshot>"],"files":["keyframes/hero.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/keyframes/hero.png --aspect <aspect>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/keyframes/hero.png --id hero
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/hero.result.json --params artifacts/<project>/params/hero.params.json --json '{"item":"hero","node":"keyframes","declared":{"aspect":"<aspect>","min_long":1024,"format":"png"},"measured":{"w":<w>,"h":<h>,"aspect_value":<a>},"credits":{"estimate":<q1>},"attempt":1,"parents":["source/<packshot>"],"files":["keyframes/hero.png"]}'
```

A failed call (error envelope) is recorded without `--result`:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/hero.params.json --json '{"item":"hero","node":"keyframes","endpoint":"<route>","request_id":null,"status":"failed","declared":{"aspect":"<aspect>","format":"png"},"credits":{"estimate":<q1>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

The default is one still. The source's 2 to 4 variants run only when the brief budgets them, as items hero-a and hero-b, each with its own estimate line. Picking the strongest is the owner's call: animate the one the brief names, otherwise hero-a, and list the others in PROGRESS.md.

Retry only on a media-qc exit 1 (IQ-03 or IQ-04), once, moving one lever (the pinned aspect_ratio or output_format). Estimate it first, write it to keyframes/hero-02.png, and record it with "attempt":2 and a "lever". Product shape, logo, label, material and the absence of text go to the owner's review (HR14), against this rule from the source's hero recipe:

6. Reject outputs with altered logos, warped packaging, or invented text.

That rejection is an owner review item, not a measured retry. For a fidelity miss, PROGRESS.md names the reshoot lever: with a packshot, regenerate on the edit route with the product invariant restated; without one, attach a packshot and move from text-only to the edit route (step 10's source rule).

Check: mediaqc image and declared exit 0, and their figures are in the row's measured block. The owner review items are listed in PROGRESS.md.

## Step 7. Submit the reveal clip (async, pending row, fetch by id)

Run video jobs async and fetch by request id. Load `media-ai-gen` and `media-video-generation` (Skill tool). Submit the hero frame with the chosen lane's params file:

```bash
ai-gen video -m bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/clip.params.json --image <hero> --async --strict-params --max-cost <q2> --format json > work/<project>/clip.submit.json
```

At once, write a pending manifest row from the submit envelope:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<clip|draft>.submit.json --params artifacts/<project>/params/<clip|draft>.params.json --json '{"item":"reveal","node":"clips","status":"pending","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q2>},"attempt":1,"parents":["<hero path relative to the project>"],"files":[]}'
```

The request id is `.request_id` in `work/<project>/<clip|draft>.submit.json`. If the submit was cut off before it printed, find the id in the job store, matching model and time:

```bash
python3 -c "import json,os;[print(j['submitted_at'],j['model'],j['request_id']) for j in json.load(open(os.path.expanduser('~/.cache/ai-gen/jobs.json')))['jobs'][:5]]"
```

Fetch the result about once a minute until it is ready (ready:false exits 0):

```bash
ai-gen result <request-id> -o artifacts/<project>/clips/ --format json > work/<project>/<clip|draft>.result.json
```

An --async job writes nothing to the ledger until it is fetched, so fetch every job you submit. Never use status --wait and never resubmit (HR6). Exit 10 or 14: fetch again with `ai-gen result <id>`. Exit 7: read it and fix the named field (that fix is the retry's lever); never retry blindly. Exit 13: nothing was submitted; re-plan or open a gate. A failed call is recorded without `--result`:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/<clip|draft>.params.json --json '{"item":"reveal","node":"clips","endpoint":"<route>","request_id":"<id from error.details or null>","status":"failed","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q2>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

For anything else, follow media-ai-gen's recovery. If a realistic human is in frame, apply media-video-generation's face rule before the first attempt.

Check: the submit envelope has a request_id; the result envelope has success true and `files[0].local_path`.

## Step 8. Name and record the clip

Final delivery: move the downloaded clip from `files[0].local_path` to a stable name, then re-run `manifest.mjs add` with the result envelope. The same request id turns the pending row into done, and files carries the new path:

```bash
mv "$(python3 -c "import json;print(json.load(open('work/<project>/<clip|draft>.result.json'))['files'][0]['local_path'])")" artifacts/<project>/clips/reveal-01.mp4
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<clip|draft>.result.json --params artifacts/<project>/params/<clip|draft>.params.json --json '{"item":"reveal","node":"clips","status":"done","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q2>},"attempt":1,"parents":["<hero path relative to the project>"],"files":["clips/reveal-01.mp4"]}'
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
```

Check: `manifest.mjs verify` exits 0.

## Step 9. Quality bar, measurement and review sheet

Before returning, check:

- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting makes sense for the product material.

- Output paths are from the envelope's `files[].local_path` and are hashed in the manifest, not manually curled URLs.
- Video: the product keeps its shape, stays centered and undistorted, and the logo does not morph (the reveal recipe in `${CLAUDE_SKILL_DIR}/reference/workflows.md`).

Load `media-qc` (Skill tool) and measure. The scripts print figures, never a pass. Use `--audio any`, because a silent Seedance track would fail `--audio no`, while declared audio off already measures sound. Build the frozen control from the clip's first frame, at the length and fps `streams` prints.

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/clips/reveal-01.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs streams artifacts/<project>/clips/reveal-01.mp4 --audio any
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/clips/reveal-01.mp4 --id reveal
mkdir -p work/<project>/frames-01 artifacts/<project>/qc
ffmpeg -y -i artifacts/<project>/clips/reveal-01.mp4 -frames:v 1 work/<project>/frames-01/first.png
ffmpeg -y -loop 1 -i work/<project>/frames-01/first.png -t <video_duration_s from streams> -r <fps from streams> -c:v libx264 -pix_fmt yuv420p work/<project>/frames-01/frozen.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion artifacts/<project>/clips/reveal-01.mp4 --control work/<project>/frames-01/frozen.mp4
ffmpeg -y -ss <video_duration_s/2> -i artifacts/<project>/clips/reveal-01.mp4 -frames:v 1 work/<project>/frames-01/mid.png
ffmpeg -y -sseof -1 -i artifacts/<project>/clips/reveal-01.mp4 -update 1 work/<project>/frames-01/last.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet <hero> work/<project>/frames-01/first.png work/<project>/frames-01/mid.png work/<project>/frames-01/last.png --cols 4 --out artifacts/<project>/qc/reveal-01-sheet.jpg
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/<clip|draft>.result.json --params artifacts/<project>/params/<clip|draft>.params.json --json '{"item":"reveal","node":"clips","status":"done","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"measured":{"video_duration_s":<d>,"w":<w>,"h":<h>,"fps":<fps>,"motion_min_window":<m>,"control_max_window":<c>,"floor":<f>},"credits":{"estimate":<q2>},"attempt":1,"parents":["<hero path relative to the project>"],"files":["clips/reveal-01.mp4"]}'
python3 -c "import json;f='artifacts/<project>/plan.json';d=json.load(open(f));d['rows'][0]['render_dur']=<video_duration_s>;json.dump(d,open(f,'w'),indent=1)"
```

render_dur comes from ffprobe, never from the request.

Check: report exit codes and figures as printed. Report motion as three numbers: the minimum 1-second window, the frozen-control maximum, and the floor. The control is local, so route shimmer is not caught (VID-T5). Exit 3 is reported as 'not checked' and listed as a debt. Fidelity, logo morphing, centring, props and lighting go to the owner with the sheet, and are never claimed as passed (HR14).

## Step 10. Recovery: one retry on a measured failure, then fallback or gate

If the result misses product fidelity, switch from text-only generation to a
reference or edit workflow before retrying.

Retry only on a media-qc exit 1; fidelity and taste go to the owner (HR14). Act on the code:

- VQ-03 duration shortfall on Seedance: do not retry. A short render is a route habit (4.06 s for a 5 s ask) that a resubmit would pay for twice. Report the figures to the owner and list it as a debt; the lever for a later job is requesting 1 s more, estimated first, within the enum.
- VQ-02 (stream defect): re-encode locally as a tool row, measured before its one `add`. It is not a paid retry.
- VQ-04 (frozen) or an IQ/AQ code: mark attempt 1 rejected, keeping its file, and retry once with one lever. A frozen result moves the motion clause up. If the owner reports that the product changed shape or the logo morphed, follow the reveal recipe's last step in `${CLAUDE_SKILL_DIR}/reference/workflows.md` in a later job: reduce motion and strengthen the identity clauses.

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip.result.json --params artifacts/<project>/params/clip.params.json --json '{"item":"reveal","node":"clips","status":"rejected","attempt":1,"notes":"<QC code and figure>","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q2>},"files":["clips/reveal-01.mp4"]}'
ffmpeg -y -i artifacts/<project>/clips/reveal-01.mp4 -c:v libx264 -pix_fmt yuv420p -r <declared or majority fps> -an artifacts/<project>/clips/reveal-01-enc.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs streams artifacts/<project>/clips/reveal-01-enc.mp4 --audio no
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"reveal-enc","node":"clips","tool":"ffmpeg -c:v libx264 -pix_fmt yuv420p -r <fps> -an","parents":["reveal#1"],"declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"measured":{"fps":<fps>,"frames":<frames>,"video_duration_s":<d>},"files":["clips/reveal-01-enc.mp4"]}'
```

For the paid retry, write `artifacts/<project>/params/clip-a2.params.json` with the one lever moved. Estimate it, add its line to plan.json and raise budget.total before the call; if it does not fit what remains, open a gate instead. The pending row carries "attempt":2 and its "lever" from the start. Never overwrite reveal-01.mp4:

```bash
ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/clip-a2.params.json --format json
ai-gen video -m bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/clip-a2.params.json --image <hero> --async --strict-params --max-cost <q3> --format json > work/<project>/clip-a2.submit.json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip-a2.submit.json --params artifacts/<project>/params/clip-a2.params.json --json '{"item":"reveal","node":"clips","status":"pending","attempt":2,"lever":"<one lever, e.g. prompt: slow push-in strengthened to steady push-in with visible pour>","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q3>},"parents":["<hero path relative to the project>"],"files":[]}'
ai-gen result <request-id> -o artifacts/<project>/clips/ --format json > work/<project>/clip-a2.result.json
mv "$(python3 -c "import json;print(json.load(open('work/<project>/clip-a2.result.json'))['files'][0]['local_path'])")" artifacts/<project>/clips/reveal-02.mp4
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip-a2.result.json --params artifacts/<project>/params/clip-a2.params.json --json '{"item":"reveal","node":"clips","status":"done","attempt":2,"lever":"<the same lever>","declared":{"duration_s":<n>,"aspect":"<aspect>","resolution":"<resolution>","audio":"off","format":"mp4"},"credits":{"estimate":<q3>},"parents":["<hero path relative to the project>"],"files":["clips/reveal-02.mp4"]}'
```

Run the step 9 checks unchanged on reveal-02.mp4, with frames in work/<project>/frames-02/ and the sheet at qc/reveal-02-sheet.jpg.

After a second failure there is no third attempt on the same route. Estimate the /fast/ fallback, save nothing new (clip.params.json and the hero are already under artifacts/<project>/), open the gate, write PROGRESS.md and end partial. Only option 'a' resumes here; a Stop answer spends nothing and stays partial (step 1).

```bash
ai-gen estimate bytedance/seedance-2.0/fast/image-to-video --params-file artifacts/<project>/params/clip.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug reveal-fallback --question "Reveal failed twice (<codes>); render on bytedance/seedance-2.0/fast/image-to-video for <q4> credits?" --options '[{"id":"a","label":"/fast/ fallback, <n> s <resolution>","credits":<q4>},{"id":"b","label":"Stop with the attempts","credits":0}]' --resume-at "step 10: recovery (fallback render)" --quote <q4>
```

A moderation refusal (422) goes to media-video-generation's face rule (Veo 3.1 Fast or minimax/h3/image-to-video), estimated first.

Check: step 9's checks on the new file. The manifest shows attempt 1 rejected with its QC code in notes, and attempt 2 with its lever. `manifest.mjs verify` exits 0.

## Step 11. Deliver

Text overlays: generate with empty safe space. Any final text, claim, price or logo the brief supplies is never generated: name it in PROGRESS.md as a debt for `media-motion-graphics`, which burns it in afterwards (HR10).

Verify, print the budget and measure the folder:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/
```

The delivery note is `artifacts/<project>/PROGRESS.md`, in media-ai-gen's six sections. The heredoc below is only the skeleton: write real content under every heading, or 'None' when a section is empty.

```bash
cat > artifacts/<project>/PROGRESS.md <<'EOF'
# <Project>: Progress
## Summary
<filled>
## Decisions
<filled>
## Asset inventory
<filled>
## Pipeline
<filled>
## Known gaps
<filled or None>
## Next steps
<filled or None>
EOF
```

- Summary: what was made, the final file and where it stands.
- Decisions: every default taken and the routes.
- Asset inventory: counts per folder; manifest.json is the map from each file to its prompt and model.
- Pipeline: the steps run, each with its model; the route's release-check status (Seedance i2v proven only at 480p for 5 s, VID-T8).
- Known gaps: measured duration, resolution and motion figures; audio off; any VQ-03 shortfall; the local motion control; owner review items with the sheet path; copy or a logo owed to media-motion-graphics.
- Next steps: the reshoot levers, or None.
- Credits: report both figures, the estimate total from plan.json and the ledger's spent from `manifest.mjs budget`. SL8 recorded credits_used over-reporting about 8.4x on Seedance i2v, so a ledger figure above the quote while the estimate fits is reported, never retried or treated as a failure.

Then write outcome.json. A resumed job that delivers overwrites a gate's partial with done; a job stopped at a gate or by a Stop answer keeps partial.

```bash
python3 -c "import json;json.dump({'status':'done','final':'clips/reveal-0<N>.mp4','credits':{'estimate':<total>,'ledger':<spent>}},open('artifacts/<project>/outcome.json','w'))"
python3 -c "import re;t=open('artifacts/<project>/PROGRESS.md').read();s=re.split(r'^## ',t,flags=re.M)[1:];print(len(s),[x.split(chr(10),1)[0] for x in s if not x.split(chr(10),1)[1].strip()])"
```

Validate the delivery, fix what it names and run it again until it prints ok (completeness, wiring and arithmetic only; quality stays with the owner):

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate.mjs artifacts/<project>/PROGRESS.md --request artifacts/<project>/source/request.md
```

Write the project status with the bot's standard script, from a record of this job (the project, its stored context, any gate still open as an open decision, the clip as the deliverable):

```bash
cat > artifacts/<project>/source/job.json <<'EOF'
{"job":"Make a product reveal clip","what":"<product> reveal clip","state":"closed","context":{"product":"<product>","aspect":"<aspect>","duration_s":<n>,"resolution":"<res>","camera_movement":"<move>"},"decisions":[],"deliverables":[{"name":"Reveal clip","file":"clips/reveal-0<N>.mp4"}],"blockers":"none"}
EOF
node ${CLAUDE_SKILL_DIR}/../c08-router/scripts/status.mjs --project <project> --record artifacts/<project>/source/job.json
```

A job that ends partial at a gate or a Stop answer writes the same record with "state":"waiting", the gate as an open decision with what it needs, and no deliverable.

Close with one line giving the folder tree, the file count, the credits (estimate and ledger), and that the delivery note is artifacts/<project>/PROGRESS.md.

Check: manifest.mjs verify exits 0. The sum of the manifest's credits.estimate is at most plan.json budget.total. mediaqc artifact on the folder exits 0. The six-section script prints 6 and an empty list. outcome.json parses and its final file exists.

## Model choice

- Product reveal video: create or upload a strong hero frame, then use
  `bytedance/seedance-2.0/image-to-video` for final quality.

Fast variants exist for lower latency:

- `bytedance/seedance-2.0/fast/text-to-video`
- `bytedance/seedance-2.0/fast/image-to-video`
- `bytedance/seedance-2.0/fast/reference-to-video`

On SL8 (the reveal uses only the image-to-video ids):

- Hero still from a packshot: `fal-ai/nano-banana-pro/edit` (fal's product-fidelity and edit pick, and the Studio's). Text only: `fal-ai/nano-banana-pro` (SL8's incumbent, 37.5 cr against 52.75). Alternative: `openai/gpt-image-2/edit`, or `openai/gpt-image-2` at quality=high (fal's premium realistic pick), when label text on the packaging must hold, with hero-gpt.params.json, estimated first. Never compared head to head on SL8 (IMG-L29). The test run uses nano-banana-pro/edit.
- Reveal clip, final: `bytedance/seedance-2.0/image-to-video`, proven on a release build only at 480p for 5 s (VID-T8). Fallback, through a gate after a second failure: `bytedance/seedance-2.0/fast/image-to-video`, same grammar and clip.params.json, cheaper, at most 10 s at 720p. The test run uses the base route.
- A model the brief names wins (HR20), and is checked and estimated before it runs.
- One video lane: every clip runs on `bytedance/seedance-2.0/image-to-video` with clip.params.json; the fallback stays `bytedance/seedance-2.0/fast/image-to-video` through the reveal-fallback gate. A brief asking for a draft is rendered on the final route and the choice is stated under Decisions.

## On SL8

This kit runs on the SL8 Video Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules (HR-1.0): estimate every paid step first and keep a running total (HR5); never resubmit a job that may exist (HR6); deliverables go under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask the user: use the defaults above, and open a gate if a step would spend past what the brief approved (HR12); never install anything (HR21).
