---
name: c09-making-ugc-broll
description: "UGC ad, creator ad, creator-style video ad, testimonial-style ad, unboxing, first reaction, before-after, founder clip, faceless voiceover, product demo b-roll, split-screen proof, hook variants, social proof video, TikTok, Reels, Shorts, paid social vertical video. Makes a believable, platform-native, claim-safe creator-style video ad for a product on the SL8 Video Studio: a single clip, 2-5 b-roll clips in edit order with voiceover notes, or 3-5 hook variants with a manifest. Output is usually 9:16, with hooks at 6-15 s and ads at 15-45 s. Use it when a brand or marketer sends a product (a packshot, and optionally a script, claims and tone) and wants creator content rather than a polished studio commercial. Runs headless from the brief with stated defaults. Today the faceless route runs (product still, Seedance image-to-video b-roll, optional TTS voiceover). Talking-head, avatar and lip-sync routes are recorded as gaps and end partial at a gate."
license: MIT
compatibility: "SL8 Video Studio 1.0.2 (sl8-video build 15483cb4); loads media-ai-gen and the Studio's media skills"
metadata:
  version: 0.1.0
  kit: video/ugc-creator-ad
  source: "D1/ugc (fal community)"
  status: untested
---

## UGC creator ad (kit-ugc-creator-ad)

# UGC creator ads on the SL8 Video Studio

This kit makes video/ugc-creator-ad: UGC-style creator ads and social proof videos for a product, as a single clip, b-roll clips in edit order with voiceover notes, or a hook variant set.

Use this skill when the user wants creator-style content rather than polished
studio advertising. Load references as needed:

- `${CLAUDE_SKILL_DIR}/reference/formats.md`: format structures and the hook bank. Read it at step 3 (format) and step 4 (hooks).
- `${CLAUDE_SKILL_DIR}/reference/workflows.md`: production routes per input type. Read it at step 3 (route) and before steps 9-12.
- `${CLAUDE_SKILL_DIR}/reference/examples.md`: worked clip prompts and the hook variant table. Read it at step 5 and step 10.

Do not load a routing companion, because fal skills are refused on SL8. This kit names its own model for every step (see Model routing). Where it names none, the routing tables in `media-video-generation` and `media-image-generation` are the fallback.

Keep outputs believable, platform-native, and claim-safe. Do not write fake
testimonials, fake metrics, invented reviews, medical claims, financial
claims, or readable legal copy unless the user provides the exact wording.

What runs on SL8 today: the faceless product b-roll route (a product still, Seedance image-to-video clips, optional voiceover audio), the hook variant set, and the optional polished end frame and stitch. The talking-head, portrait-plus-text, generated-avatar and footage-redub routes, and any shot that needs a visible realistic human face, have no Studio route and no verified price. For those the kit records the gap, opens a gate offering faceless b-roll, and ends partial (step 11).

Jobs run headless. Never ask, preview or confirm. Follow media-ai-gen's house rules throughout: cost first (HR5), never resubmit (HR6), deliverables under `artifacts/<project>/` (HR8), one manifest row per generation (HR9), copy composited last (HR10), never ask (HR12), taste goes to the owner (HR14), name every debt (HR15), waivers are recorded (HR20), never install anything (HR21). Results are delivered as files and never played.

## Inputs to collect

Read every input from the brief and never stop to ask. Where an input is missing, use the default given after this list.

- Product or offer: what is being shown, sold, taught, or explained.
- Format: direct-to-camera, demo, reaction, unboxing, founder, faceless b-roll.
- Speaker: supplied portrait/video, generated avatar, no face, or voiceover.

- Script source: exact script, bullet points, offer copy, or a request in the brief to draft one.

- Platform: TikTok, Reels, Shorts, paid social, landing page, prototype.
- Runtime and crop: usually 9:16, 6-15 seconds for hooks, 15-45 seconds for ads.
- Source media: portrait, product image, product video, logo, b-roll, audio.
- Claims: proof the user supplied, required disclaimers, banned phrases.
- Tone: casual, expert, founder-led, skeptical, excited, calm, documentary.

Defaults when the brief is silent:
- project: kebab-case `<product>-ugc` derived from the brief. A name the run harness supplies wins.
- product: required. Its appearance is never invented. With no packshot, prompts describe placement and light only, and the delivery note says so.
- format: faceless voiceover b-roll when no speaker media is supplied, told as a problem-solution demo when the product has visible use.
- speaker: no face (voiceover notes). A supplied portrait or creator clip, a generated avatar, or any shot that needs a visible realistic face goes to step 11.
- script_source: drafted from the six-beat Script build order, held to the word budget, with no invented facts.
- platform: paid social / Reels-style vertical.
- deliverable_shape: a b-roll set of 3 clips in edit order (problem/product action, proof, close) with voiceover notes. `single` gives one clip; `hooks` gives a hook variant set.
- aspect: 9:16. resolution: 720p.
- runtime: an ad is 15 s, as 3 clips x 5 s. A single clip is one Seedance base call of up to 15 s (the /fast/ fallback fails above 10 s at 720p). Each hook is 6 s, the floor of the 6-15 s range.
- hook_set: 3 hooks, with angles A pain point, B curiosity and C proof. `all` adds D objection and E result.
- source_media: none. A packshot in `artifacts/attachments/` is copied to `artifacts/<project>/source/`, and the still is edited from it. With no packshot, the still is made text-to-image from the product as briefed. A file the brief promises but that is missing stops the job (step 1).
- claims: none. Use only observable statements. An unsupplied testimonial is framed as a scripted creator ad (HR18).
- tone: casual.
- voiceover_audio: notes only (one text fragment per clip). `generate` adds one TTS file per fragment, after a priced one-line test (step 8).
- voice: the project registry entry, else Brian on `fal-ai/elevenlabs/tts/multilingual-v2`. Never a real person's voice (HR17).
- stitch: no. Clips are delivered unstitched and are never called stitched.
- on_screen_text: none. Captions, labels and CTA copy are never generated in the video. Exact strings the brief supplies are recorded verbatim in edit-order.md and listed as owed on the named files. This kit runs no burn step; burning belongs to media-motion-graphics in a later assembly.
- budget_credits: the brief's budget, capped by SL8_SPEND_CEILING less the ledger (`manifest.mjs budget`). With no spend authority, open a spend gate and end partial.
- review: the approve-clips fence is recorded as a text gate with default a, and the job carries on. It becomes a spend gate that ends partial only when paid stages remain after the clips and `autonomy` (read in step 1) is not 'autonomous'. 'review: run-through' is recorded as an HR12 waiver at intake.
- house_rule_overrides: none. A brief instruction that breaks a house rule is carried out, its cost is stated in one line, and it is recorded as a waiver (step 1, HR20).

## Bot checks (BOT-C09: before step 1 and after step 14)

`S=${CLAUDE_SKILL_DIR}`. Before step 1, derive `<project>` (with no product, it is `ugc-broll`), save the request word for word to `artifacts/<project>/inputs/request.md` and run `node $S/scripts/inputs.mjs artifacts/<project>/inputs/request.md`. If the product is missing, the job ends here: write nothing else under `artifacts/<project>/` (no PROGRESS.md, manifest or outcome.json), run the status step below, and end partial with the script's `say` line, which the router puts in `/home/user/outcome.json`. The skill's own `artifacts/<project>/outcome.json` (complete or partial) is the kit's record; the router reports complete as delivered.
After step 14, add to edit-order.md a `Method: kit-ugc-creator-ad (six-beat script, faceless still, Seedance b-roll)` line and a `## Assumptions` section with one `**<label>:** <what was assumed>; send <what> to change it` line per input inputs.mjs listed under `assume`. Run `node $S/scripts/validate.mjs artifacts/<project>/edit-order.md --request artifacts/<project>/inputs/request.md`; fix and rerun until `ok` is true.
Then write `artifacts/<project>/inputs/job.json` (`{"job":"ugc-broll","what":"<product>: UGC b-roll","state":"active","context":{"product":"…","packshot":"yes|no","beats":"…","clips":"<n> x <s> s","format":"…","credits":"<n>"},"decisions":[one per Assumptions line that asks for something],"deliverables":[{"name":"Edit order","file":"<project>/edit-order.md"},{"name":"Clips","file":"<project>/clips/"}]}`) and run `node $S/../c09-router/scripts/status.mjs --project <project> --record artifacts/<project>/inputs/job.json`.

## 1. Intake as declared defaults

Load `media-ai-gen` and `media-qc` (Skill tool). Derive `<project>`. Create every folder the job writes to. Read `autonomy` once from `$HOME/.sl8/run.json` (media-video-production Step 0); step 9 uses it, and its value (or None) goes into PROGRESS.md Decisions. Check for an open or answered gate. Run `manifest.mjs init` only on a new project:

```bash
mkdir -p artifacts/<project>/keyframes artifacts/<project>/clips artifacts/<project>/hooks artifacts/<project>/audio artifacts/<project>/final artifacts/<project>/source artifacts/<project>/qc artifacts/<project>/params work/<project>
python3 -c 'import json,os;p=os.path.expanduser("~/.sl8/run.json");print(json.load(open(p)).get("autonomy") if os.path.exists(p) else None)'
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init --project <project>
```

Gates. If `gate.mjs status` exits 10, a gate is open. Spend nothing, restate the gate in PROGRESS.md and end partial, unless the brief answers it. If the brief does answer it, record the answer:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs answer --project <project> --gate <NN> --option <id> --by "brief: <its words>"
```

An answered gate resumes at its resume_at only when the answer approves the spend: option a on approve-render, approve-vo, approve-clips and route-*, and option b (reshoot) on approve-clips. A Stop answer (b on approve-render, approve-vo and route-*; c on approve-clips) spends nothing. In that case, write PROGRESS.md, leave outcome.json partial and end. `work/<project>/` is lost between jobs, so a resumed step reads its params and prompts from `artifacts/<project>/params/`.

Files the customer attaches live in `artifacts/attachments/`. Copy the packshot into the project:

```bash
test -s artifacts/attachments/<packshot> && cp artifacts/attachments/<packshot> artifacts/<project>/source/
```

If the brief promises a file and `test -s` fails, stop. Name the missing file as the debt in PROGRESS.md Known gaps, write `outcome.json` `{"status":"partial","reason":"<file> missing from artifacts/attachments/"}`, and end. Never switch to text-to-image silently.

Waivers (HR20). If the brief says to run straight through without the review pause, record that before any spend. For any other house rule the brief overrides, carry out the instruction, state its cost in one line in PROGRESS.md Decisions, and record it:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR12 --instruction "<the brief's words>"
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs waive --project <project> --rule HR<n> --instruction "<the brief's words>"
```

Fill every blank input from the defaults. Write `artifacts/<project>/plan.json` `declared` (aspect 9:16, resolution 720p, per-clip duration_s, audio off, count, format) before generating (HR1). Each manifest row repeats its own `declared`, which the `mediaqc.mjs declared --plan … --file … --id …` commands in steps 7, 9 and 10 read. A row with no declaration gives exit 3, which is reported as not checked. Write the PROGRESS.md skeleton with six sections: Summary, Decisions, Asset inventory, Pipeline, Known gaps, Next steps.

## 2. Verify the routed endpoints and read their schemas

Load `media-ai-gen`, `media-video-generation`, `media-image-generation` and `media-audio-generation` (Skill tool). Start from routed endpoint IDs. Check every route the job may use (primary, fallback, draft, still and TTS) before the route is chosen. Load `media-ai-gen` and run:

```bash
ai-gen info bytedance/seedance-2.0/image-to-video --format json
ai-gen info bytedance/seedance-2.0/fast/image-to-video --format json
ai-gen info fal-ai/nano-banana-pro/edit --format json
ai-gen info fal-ai/nano-banana-pro --format json
ai-gen info openai/gpt-image-2/edit --format json
ai-gen info openai/gpt-image-2 --format json
ai-gen info fal-ai/elevenlabs/tts/multilingual-v2 --format json
ai-gen info fal-ai/kokoro/american-english --format json
ai-gen info fal-ai/veo3.1/lite/image-to-video --format json
ai-gen info xai/grok-imagine-video/image-to-video --format json
```

Exit 8 or UNRESOLVED drops that route for its named fallback, recorded as a stale pick in PROGRESS.md Decisions. Use text search only as fallback discovery for a missing role, one keyword at a time: `ai-gen models --search <single-word> --format json`. SL8 has no docs search.

Inspect each selected endpoint before running. `info` shows a const as a plain default, so also print each route's const and enum lines with media-ai-gen's printer into a file with a unique name:

```bash
curl -s "https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>" | python3 -c '<media-ai-gen const/enum printer>' > work/<project>/schema-<slug with / replaced by __>.txt
```

Prices are taken in step 6 with `ai-gen estimate`, from each item's own params file. Write the live and dropped routes into PROGRESS.md Decisions.

## 3. Pick format and production route

Read `${CLAUDE_SKILL_DIR}/reference/formats.md` for the format structure and `${CLAUDE_SKILL_DIR}/reference/workflows.md` for the route. Run `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs status --project <project>` first. If it lists a `route-*` gate answered with option a ('Switch to faceless b-roll'), the route is product b-roll: skip the face check below and go to step 4. This keeps a resume from looping back to step 11.

Choose the production route from the routes step 2 found live.

- Portrait plus audio: `veed/fabric-1.0`. Not runnable on SL8: go to step 11.
- Portrait plus text: `veed/fabric-1.0/text` when schema supports it. Not runnable on SL8: go to step 11.
- Avatar with stronger visual direction: `fal-ai/creatify/aurora`. Not runnable on SL8: go to step 11.
- Existing video with new speech: `fal-ai/sync-lipsync/v2`. Not runnable on SL8: go to step 11.

   - Product b-roll: `bytedance/seedance-2.0/image-to-video` from an approved
     still or product reference.

- Hook frames and thumbnails: kept only as the start frames of step 7 (`fal-ai/nano-banana-pro/edit` from a packshot; `openai/gpt-image-2/edit`, or `openai/gpt-image-2` at quality=high, especially when text or product fidelity matters). Standalone thumbnails are not this kit's deliverable.

Product b-roll is the default, runnable route. It keeps faces out of frame (hands only), so media-video-generation's face rule never fires on it. The deliverable_shape picks the path: a b-roll set goes to steps 7-9, `single` goes to steps 7-9 with one clip, and `hooks` goes to steps 7 and 10. The 'UGC to polished ad' route adds step 12. Before-after is chosen only when the brief supplies a showable before and after; otherwise use problem-solution and note why. Testimonial and founder formats run on SL8 only as a scripted creator ad over b-roll. Any other shot that needs a visible realistic human face goes to step 11. Write `route` and `format` into plan.json and PROGRESS.md Decisions.

## 4. Build the script

Write short spoken beats in the Script build order below (hook, context, product moment, proof, turn, close), with one voiceover fragment per clip. Keep the script short and conversational. Load `media-script-writer` (Skill tool) and run its Step 1 word-budget pass, inlined here, with one `cuts` entry per planned clip in edit order:

```bash
python3 - <<'EOF'
import json, os
P = 'artifacts/<project>'
seed = os.path.expanduser('~/.agents/skills/media-audio-generation/references/voices.seed.json')
regs = [json.load(open(p)) for p in (P + '/audio/voices.json', 'bot/voices.json', seed) if os.path.exists(p)]
e = next((r['narrator'] for r in regs if 'narrator' in r), json.load(open(seed))['narrator'])
rate, cuts = e['rate_wps'], [5.0, 5.0, 5.0]   # one entry per clip in edit order
print(json.dumps({'rate': rate, 'measured_at': e.get('rate_measured_at'), 'caps': [int(s * rate * 0.9) for s in cuts], 'total_s': sum(cuts), 'total_cap': int(sum(cuts) * rate * 0.9)}))
EOF
```

Each fragment has at most floor(cut_s x rate_wps x 0.9) words. The seed rate of 2.82 w/s is unverified on SL8, and the delivery says so. Take hooks from the hook bank in formats.md. Remove any hook that implies an unsupplied fact, and rewrite unsupported claims as observable statements.

Write `artifacts/<project>/script.md` with: the beats; the fragment for each clip; each fragment's word count (python3 `len(text.split())`) against its printed cap; a claims list giving each claim's source in the brief (a claim with no source is removed, HR18); and the hooks removed and why.

## 5. Build the shot prompts

Load `media-shot-craft` (Skill tool). For each clip, write the seven slots of the Prompt build order below, adapting `${CLAUDE_SKILL_DIR}/reference/examples.md`. Give each clip one physical action and no lettering. Seedance has no negative_prompt, so write guardrails as positive clauses, such as 'product colour and logo exactly as in the start frame' and 'clean surfaces with no printed text'. Write the plan.json rows (n, start, dur, render_dur pending, action, look, vo, vo_words, overlay '') and the prompt text of each params file. Check: media-shot-craft's Step 8 validator prints 10 lines per row into PROGRESS.md, including the transformation-verb lint ('none' or the verbs found). Split any row with a transformation verb before submit.

## 6. Write params files, quote the whole chain and gate

6. Use schema fields exactly. Mirror the model's field names such as
   `image_url`, `audio_url`, `video_url`, `text`, `prompt`,
   `visual_direction`, `aspect_ratio`, `duration`, or `seed`.

Write one `artifacts/<project>/params/<item>.params.json` per item, using only the field names in step 2's schema files. Unknown fields are dropped silently, so every paid call carries `--strict-params`. Params live under artifacts/ so that a resumed job finds them. Pin every default-on flag, including `enable_safety_checker: true` wherever the schema lists it. Params blocks:

- `bytedance/seedance-2.0/image-to-video`: `{"prompt":"…","duration":"5","resolution":"720p","aspect_ratio":"9:16","generate_audio":false,"bitrate_mode":"standard"}` (hooks `"6"`, single clip up to `"15"`)
- `bytedance/seedance-2.0/fast/image-to-video`: the same fields, with `duration` at most `"10"` at 720p
- `fal-ai/nano-banana-pro/edit` and `fal-ai/nano-banana-pro`: `{"prompt":"…","aspect_ratio":"9:16","resolution":"1K","num_images":1,"output_format":"png","limit_generations":true,"enable_web_search":false,"safety_tolerance":"4"}`
- `openai/gpt-image-2/edit` and `openai/gpt-image-2`: `{"prompt":"…","image_size":"portrait_16_9","quality":"high","num_images":1,"output_format":"png","enable_safety_checker":true}` (image_size presets, never aspect_ratio)
- `fal-ai/elevenlabs/tts/multilingual-v2`: `{"text":"…","voice":"Brian","stability":0.5,"similarity_boost":0.75,"style":0,"speed":1.0,"apply_text_normalization":"on"}`
- `fal-ai/kokoro/american-english` (draft voice): `{"prompt":"…","voice":"af_heart","enable_safety_checker":true}`
- `fal-ai/veo3.1/lite/image-to-video` (draft lane): `{"prompt":"…","duration":"4s","resolution":"720p","aspect_ratio":"9:16","generate_audio":false,"safety_tolerance":"4"}`
- `xai/grok-imagine-video/image-to-video` (draft, only when the brief names it): `{"prompt":"…","duration":5,"aspect_ratio":"9:16","enable_safety_checker":true}` (duration is an integer from 1 to 15), plus any other default-on field that `info` prints

Check every value against the step 2 schema file. A mismatch moves the item to its fallback before any payload is sent.

Estimate every paid call from its own params file before the first paid call: stills (one per hook angle on the hooks shape, plus a hero still if step 12 makes one), clips or hooks, the voiceover test line and files (step 8), and a retry reserve of one clip and one still. Quote in credits, never estimated_usd.

```bash
ai-gen estimate <endpoint> --params-file artifacts/<project>/params/<item>.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs budget --project <project>
```

Worked figure for the default chain: 1 still on nano-banana-pro/edit (37.5) + 3 clips on Seedance i2v at 720p for 5 s (378 each, 1,134) = 1,171.5 planned. The retry reserve is 378 + 37.5 = 415.5, which makes 1,587 with reserve. Re-quote every figure with `ai-gen estimate`, and write each item's re-quoted figure as its manifest `estimate`. Exit 12 (unpriced) moves the route to its named fallback, or opens a gate. Parallel submits each see the whole budget and nothing can be cancelled, so the sum is gated before the first submit. If the planned total is over what remains, open a spend gate, write PROGRESS.md and outcome.json (partial), and end. The params are already saved.

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-render --question "Render <n> stills and <n> clips on <route>, <seconds> s at 720p, for <total> credits?" --options '[{"id":"a","label":"Render as planned","credits":<total>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 7: product still" --quote <total>
```

On resume, answer a continues at step 7. Answer b spends nothing and leaves the job partial. Write plan.json `budget` {credits, approved_by, lines[{stage, endpoint, calls, estimate, quote}], total, retry_reserve}.

## 7. Product still (start frame)

Load `media-image-generation`, `media-ai-gen` and `media-qc` (Skill tool). There is no upload step on SL8: each local source file goes in the same call (`--ref` for an edit route's image_urls, `--image` for image_url, `--audio-file`, `--video`), never in the params file.

Make the start frame the b-roll animates from: the product in the creator setting, edited from the packshot when one is supplied, with an empty safe area at top and bottom and no text. On the hooks shape, make one still per hook angle (`still-A`..`still-E`) with the same product reference and crop. Skip this step when the brief supplies a usable in-scene still.

With a packshot (the test run's route), load `media-ai-gen` and run the first command. With no packshot, run the second:

```bash
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/still-01.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <quote> -o artifacts/<project>/keyframes/ --format json > work/<project>/still-01.result.json
ai-gen run fal-ai/nano-banana-pro --params-file artifacts/<project>/params/still-01.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/keyframes/ --format json > work/<project>/still-01.result.json
```

Read the path from `files[0].local_path`; never guess it. Rename the file and add the row with the new path. Check it, then re-run the same `add` with the measured figures; the same request id updates the row:

```bash
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/still-01.result.json)" artifacts/<project>/keyframes/still-01.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/still-01.result.json --params artifacts/<project>/params/still-01.params.json --json '{"item":"still-01","node":"keyframes","declared":{"aspect":"9:16","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["keyframes/still-01.png"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/keyframes/still-01.png --id still-01
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/still-01.result.json --params artifacts/<project>/params/still-01.params.json --json '{"item":"still-01","node":"keyframes","declared":{"aspect":"9:16","format":"png"},"measured":{"width":<width>,"height":<height>},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["keyframes/still-01.png"]}'
```

If the call fails, record the failed attempt without `--result`. Use the request id from `error.details` in place of null when there is one:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/still-01.params.json --json '{"item":"still-01","node":"keyframes","endpoint":"fal-ai/nano-banana-pro/edit","request_id":null,"status":"failed","declared":{"aspect":"9:16","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

The still declares itself on its own row, so the clips' 720p declaration never applies to it. Shape, packaging and logo against the packshot go to the owner's review. Only a measured `declared` exit 1 triggers a retry. Re-quote it, check `manifest.mjs budget` and open a gate if it is over, then run attempt 2 with `"attempt":2`. Attempt 2 has a `"lever"` (a prompt clause, the `openai/gpt-image-2/edit` route, or `openai/gpt-image-2` with no packshot), its own params file `params/still-01-a2.params.json` and its own file `keyframes/still-01-a2.png`. Never overwrite attempt 1. Steps 9 and 10 animate the latest accepted still.

## 8. Voiceover audio (only when voiceover_audio=generate)

Load `media-audio-generation`, `media-ai-gen` and `media-qc` (Skill tool). Create the voice first, before anything that depends on it. Prefer short test sentences before full scripts. The test line, `vo-test`, is its own priced, recorded generation, with its own params file. Its quote is part of step 6's total.

`fal-ai/elevenlabs/tts/multilingual-v2` has no SL8 price on record, so its estimate is expected to exit 12. If it does, and the brief accepts a draft-quality voice, switch to `fal-ai/kokoro/american-english`: re-quote it, batch the lines into as few calls as the schema allows (about 5 cr floor per call), and state the switch in the delivery note. Otherwise open the approve-vo gate, write PROGRESS.md and outcome.json (partial), and end. Never run an unpriced route uncapped.

```bash
ai-gen estimate fal-ai/elevenlabs/tts/multilingual-v2 --params-file artifacts/<project>/params/vo-test.params.json --format json
ai-gen estimate fal-ai/kokoro/american-english --params-file artifacts/<project>/params/vo-test-kokoro.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-vo --question "Voiceover route <route> is unpriced on SL8. Run the voiceover on <route> for up to <quote> credits?" --options '[{"id":"a","label":"Run the voiceover on <route>","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 8: voiceover audio" --quote <quote>
```

With a priced route, run the test line, then one file per script fragment, unconcatenated and unpadded, with the voice pinned in `artifacts/<project>/audio/voices.json`. After a switch, use the Kokoro endpoint and its params files in these commands:

```bash
ai-gen run fal-ai/elevenlabs/tts/multilingual-v2 --params-file artifacts/<project>/params/vo-test.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/audio/ --format json > work/<project>/vo-test.result.json
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/vo-test.result.json)" artifacts/<project>/audio/vo-test.mp3
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/vo-test.result.json --params artifacts/<project>/params/vo-test.params.json --json '{"item":"vo-test","node":"audio","declared":{"audio":"vo","format":"mp3"},"credits":{"estimate":<quote>},"attempt":1,"files":["audio/vo-test.mp3"]}'
ai-gen run fal-ai/elevenlabs/tts/multilingual-v2 --params-file artifacts/<project>/params/vo-01.params.json --queue --strict-params --max-cost <quote> -o artifacts/<project>/audio/ --format json > work/<project>/vo-01.result.json
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/vo-01.result.json)" artifacts/<project>/audio/vo-01.mp3
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/vo-01.result.json --params artifacts/<project>/params/vo-01.params.json --json '{"item":"vo-01","node":"audio","declared":{"audio":"vo","format":"mp3"},"credits":{"estimate":<quote>},"attempt":1,"files":["audio/vo-01.mp3"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs takes artifacts/<project>/audio/vo-01.mp3 --n 1
ffprobe -loglevel error -show_entries format=duration -of default=nk=1:nw=1 artifacts/<project>/audio/vo-01.mp3
```

Check `mediaqc takes` (AQ-01, mean above -50 dB) and the ffprobe duration against the clip's window. An overrun is fixed by rewriting the fragment, never by stretching it, with at most two rewrites. Each rewrite is re-quoted and recorded as its own attempt with its own file.

## 9. B-roll clips and the clip fence

Load `media-video-generation`, `media-ai-gen` and `media-qc` (Skill tool). Animate the latest accepted still into 2-5 b-roll clips (problem, product action, proof, lifestyle, close; default 3, or one for `single`). Run long video jobs async, one call per clip, and write a pending manifest row at once:

```bash
ai-gen video -m bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/clip-01.params.json --image artifacts/<project>/keyframes/<latest accepted still> --async --strict-params --max-cost <quote> --format json > work/<project>/clip-01.submit.json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip-01.submit.json --params artifacts/<project>/params/clip-01.params.json --json '{"item":"clip-01","node":"clips","status":"pending","declared":{"aspect":"9:16","resolution":"720p","duration_s":5,"audio":"off","format":"mp4"},"credits":{"estimate":<quote>},"attempt":1,"parents":["still-01"],"files":[]}'
```

The request id is in `work/<project>/clip-01.submit.json`. If the call was cut off (exit 10, or no file), the id is in the error's `details.requestId` or in `~/.cache/ai-gen/jobs.json`. Fetch by id. While the envelope says `ready:false`, wait and re-run the same command. Never resubmit (HR6). Then rename the clip in edit order and add the row with the new path:

```bash
ai-gen result <request-id> -o artifacts/<project>/clips/ --format json > work/<project>/clip-01.result.json
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/clip-01.result.json)" artifacts/<project>/clips/clip-01.mp4
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip-01.result.json --params artifacts/<project>/params/clip-01.params.json --json '{"item":"clip-01","node":"clips","declared":{"aspect":"9:16","resolution":"720p","duration_s":5,"audio":"off","format":"mp4"},"credits":{"estimate":<quote>},"attempt":1,"parents":["still-01"],"files":["clips/clip-01.mp4"]}'
```

Measure each clip. Build its frozen control from its own first frame, check motion and the declaration, then write the figures back on the same request id:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs streams artifacts/<project>/clips/clip-01.mp4 --audio no
ffmpeg -y -i artifacts/<project>/clips/clip-01.mp4 -frames:v 1 work/<project>/first-01.png
ffmpeg -y -loop 1 -i work/<project>/first-01.png -t <video_duration_s> -r <fps> -c:v libx264 -pix_fmt yuv420p work/<project>/frozen-01.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion artifacts/<project>/clips/clip-01.mp4 --control work/<project>/frozen-01.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/clips/clip-01.mp4 --id clip-01
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/clip-01.result.json --params artifacts/<project>/params/clip-01.params.json --json '{"item":"clip-01","node":"clips","declared":{"aspect":"9:16","resolution":"720p","duration_s":5,"audio":"off","format":"mp4"},"measured":{"video_duration_s":<video_duration_s>,"fps":<fps>,"motion_min":<motion min window>,"motion_control":<control>,"motion_floor":<floor>},"credits":{"estimate":<quote>},"attempt":1,"parents":["still-01"],"files":["clips/clip-01.mp4"]}'
```

`<video_duration_s>` and `<fps>` come from `streams`. Write the duration into the plan.json row as render_dur. For a failed call, record the failed attempt without `--result`, putting the id from `error.details.requestId` in place of null when there is one:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --params artifacts/<project>/params/clip-01.params.json --json '{"item":"clip-01","node":"clips","endpoint":"bytedance/seedance-2.0/image-to-video","request_id":null,"status":"failed","declared":{"aspect":"9:16","resolution":"720p","duration_s":5,"audio":"off","format":"mp4"},"credits":{"estimate":<quote>},"attempt":1,"notes":"exit <n> <error.code>"}'
```

For other exit codes, follow media-ai-gen's recovery section. A retry happens only on a measured mediaqc exit 1. Re-estimate it, check `manifest.mjs budget` and open a gate if it is over, then run attempt 2 with `"attempt":2`. Attempt 2 has a named `"lever"` (action wording, camera or duration), its own params file and its own file `clips/clip-01-a2.mp4`. A second failure goes to `bytedance/seedance-2.0/fast/image-to-video` (re-quoted), or the clip goes to the fence marked failed (HR7).

The clip fence comes next. Check the set, extract a mid frame from each accepted clip, and sheet them:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs clipset artifacts/<project>/clips/
ffmpeg -y -ss <video_duration_s/2> -i artifacts/<project>/clips/clip-01.mp4 -frames:v 1 artifacts/<project>/qc/clip-01-mid.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/qc/clip-01-mid.png artifacts/<project>/qc/clip-02-mid.png artifacts/<project>/qc/clip-03-mid.png --out artifacts/<project>/qc/fence.jpg
```

Before either gate opens, write a numbered clip list into PROGRESS.md Pipeline. Give one line per clip: number, intended action, motion min window against its control and floor, render_dur, credits, and LOOKS STATIC where the min window is under the floor. A static clip is flagged, not silently rejected.

When no paid stage follows the clips (the default), or `autonomy` is 'autonomous', record the fence as a text gate and carry on with option a:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-clips --kind text --default a --question "Approve the <n> clips listed in PROGRESS.md (sheet qc/fence.jpg), or name the clips to reshoot?" --options '[{"id":"a","label":"Carry on with the clips as made"},{"id":"b","label":"Stop and review: name the clips to reshoot"}]' --resume-at "step 9: b-roll clips (reshoot the clips the answer names)"
```

When paid stages remain after the clips (voiceover, hero still, reshoots) and `autonomy` is not 'autonomous', open the spend form instead, write PROGRESS.md and outcome.json (partial), and end:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-clips --question "Approve the <n> clips listed in PROGRESS.md (sheet qc/fence.jpg) and continue to <remaining paid stages> for <quote> credits?" --options '[{"id":"a","label":"Approve: continue","credits":<quote>},{"id":"b","label":"Reshoot some: name the clip numbers","credits":<per-clip quote>},{"id":"c","label":"Stop here, give me the clips","credits":0}]' --resume-at "step 8: voiceover audio, or step 12: polished final frame" --quote <quote>
```

An answer of c (Stop) spends nothing. The job stays partial and the clips are delivered as made. Steps 8 and 12 read their params from `artifacts/<project>/params/`.

## 10. Hook variant set (deliverable_shape=hooks)

Read the hook variant table in `${CLAUDE_SKILL_DIR}/reference/examples.md` and the hook bank in formats.md. Keep the product, proof, crop and product reference constant, and vary the hook angle only. Each angle animates its own start still from step 7, because the opening visual differs per angle, and every hook has the same length (6 s). Load `media-video-generation` and run:

```bash
ai-gen video -m bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/hook-A.params.json --image artifacts/<project>/keyframes/still-A.png --async --strict-params --max-cost <quote> --format json > work/<project>/hook-A.submit.json
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/hook-A.submit.json --params artifacts/<project>/params/hook-A.params.json --json '{"item":"hook-A","node":"hooks","status":"pending","declared":{"aspect":"9:16","resolution":"720p","duration_s":6,"audio":"off","format":"mp4"},"credits":{"estimate":<quote>},"attempt":1,"parents":["still-A"],"files":[]}'
ai-gen result <request-id> -o artifacts/<project>/hooks/ --format json > work/<project>/hook-A.result.json
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/hook-A.result.json)" artifacts/<project>/hooks/hook-A.mp4
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/hook-A.result.json --params artifacts/<project>/params/hook-A.params.json --json '{"item":"hook-A","node":"hooks","declared":{"aspect":"9:16","resolution":"720p","duration_s":6,"audio":"off","format":"mp4"},"credits":{"estimate":<quote>},"attempt":1,"parents":["still-A"],"files":["hooks/hook-A.mp4"]}'
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs declared --plan artifacts/<project>/manifest.json --file artifacts/<project>/hooks/hook-A.mp4 --id hook-A
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs motion artifacts/<project>/hooks/hook-A.mp4 --control work/<project>/frozen-A.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs clipset artifacts/<project>/hooks/
```

Build `frozen-A.mp4` as in step 9. Each hook gets step 9's id handling, measured write-back, retry rule and fence (mid frames in `qc/hook-<X>-mid.png`, with the numbered list in PROGRESS.md). With no speaker, an angle that needs a person (B curiosity, D objection) becomes a hand holding the product half in frame, or a voiceover objection over a product opening. Check `clipset` (VQ-01: same size, fps and codec, for a fair comparison). Whether each hook shows its angle, and whether the variants differ only by angle, goes to the owner's review.

## 11. Talking head / avatar / redub routes (gap)

This step covers portrait+audio (`veed/fabric-1.0`), portrait+text (`veed/fabric-1.0/text`), a generated avatar (`fal-ai/creatify/aurora`), existing footage with new speech (`fal-ai/sync-lipsync/v2`), and any shot that needs a visible realistic face. None of these has an SL8 route: no Studio skill teaches them (media-video-generation leaves lipsync out deliberately), and their prices on the SL8 proxy are unverified. Spend nothing on them.

Quote the faceless alternative directly; no script is needed yet. Write `artifacts/<project>/params/alt-clip.params.json` (step 6's Seedance block, with a placeholder prompt from the brief's product) and `artifacts/<project>/params/alt-still.params.json` (the nano-banana-pro/edit block). Then run:

```bash
ai-gen estimate bytedance/seedance-2.0/image-to-video --params-file artifacts/<project>/params/alt-clip.params.json --format json
ai-gen estimate fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/alt-still.params.json --format json
node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug route-<talking-head|avatar|redub|face> --question "<route> has no SL8 Studio route or verified price. Switch to faceless b-roll (3 x 5 s Seedance 720p + 1 still) for <quote> credits?" --options '[{"id":"a","label":"Switch to faceless b-roll","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "step 3: pick format and production route (answer a: faceless b-roll, face check skipped)" --quote <quote>
```

`<quote>` is 3 x the clip estimate + the still estimate. Write `outcome.json` `{"status":"partial","reason":"<route> has no SL8 route; gate route-<slug>"}`. In PROGRESS.md Known gaps, name the route and say why it cannot run. On resume, answer a goes to step 3, which reads the answered gate and goes straight to b-roll. Answer b spends nothing and the job stays partial. Check: `gate.mjs status` lists the open gate (exit 10).

## 12. Polished final frame and optional stitch

For the 'UGC to polished ad' route (workflows.md), add a clean final product frame with safe space for external copy, taken from the last frame of the last clip in edit order. Measure it first, because a tool row has no request id to update, then record it in one `add`:

```bash
ffmpeg -y -sseof -0.2 -i artifacts/<project>/clips/<last clip in edit order>.mp4 -frames:v 1 artifacts/<project>/final/end-frame.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs image artifacts/<project>/final/end-frame.png --aspect 9:16 --format png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"end-frame","node":"final","tool":"ffmpeg -sseof -0.2 -frames:v 1","parents":["clips/<last clip in edit order>.mp4"],"declared":{"aspect":"9:16","format":"png"},"measured":{"width":<width>,"height":<height>},"files":["final/end-frame.png"]}'
```

If the brief asks for a generated hero still, load `media-image-generation` (Skill tool) and run `fal-ai/nano-banana-pro/edit` from the packshot (fallback `openai/gpt-image-2/edit`), as quoted in step 6. For a standalone hero still, kit-product-hero is the kit.

```bash
ai-gen run fal-ai/nano-banana-pro/edit --params-file artifacts/<project>/params/hero.params.json --ref artifacts/<project>/source/<packshot> --queue --strict-params --max-cost <quote> -o artifacts/<project>/final/ --format json > work/<project>/hero.result.json
mv "$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["files"][0]["local_path"])' work/<project>/hero.result.json)" artifacts/<project>/final/hero.png
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --result work/<project>/hero.result.json --params artifacts/<project>/params/hero.params.json --json '{"item":"hero","node":"final","declared":{"aspect":"9:16","format":"png"},"credits":{"estimate":<quote>},"attempt":1,"parents":["source/<packshot>"],"files":["final/hero.png"]}'
```

Only when stitch=yes: load `media-video-production` (Skill tool) and confirm that `clipset` agreed in step 9. List the accepted file of each clip in edit order, concatenate, measure, and record a tool row:

```bash
printf "file '%s'\n" "$PWD/artifacts/<project>/clips/clip-01.mp4" "$PWD/artifacts/<project>/clips/clip-02.mp4" "$PWD/artifacts/<project>/clips/clip-03.mp4" > work/<project>/concat.txt
ffmpeg -y -f concat -safe 0 -i work/<project>/concat.txt -c copy artifacts/<project>/final/cut.mp4
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs streams artifacts/<project>/final/cut.mp4 --audio no
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add --project <project> --json '{"item":"cut","node":"final","tool":"ffmpeg concat -c copy","parents":["clip-01","clip-02","clip-03"],"declared":{"aspect":"9:16","audio":"off","format":"mp4"},"measured":{"video_duration_s":<video_duration_s>},"files":["final/cut.mp4"]}'
```

Copy (CTA, captions, labels) is never generated or burned in this kit (HR10). Exact strings the brief supplies are recorded verbatim in edit-order.md and listed as owed on `final/end-frame.png` or `final/cut.mp4`. Burning them belongs to media-motion-graphics in a later assembly. Over-styling goes to the owner's review.

## 13. Quality check and contact sheet

Run the scripted checks on the delivery folder. Then extract a last frame of every accepted clip as PNG; the mid frames come from step 9. A sheet built from the mp4s would show only first frames, which are the start still, so product drift shows in the mid and last frames. Sheet them beside the packshot and the still:

```bash
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs artifact artifacts/<project>/
ffmpeg -y -sseof -0.2 -i artifacts/<project>/clips/clip-01.mp4 -frames:v 1 artifacts/<project>/qc/clip-01-last.png
node $HOME/.agents/skills/media-qc/scripts/mediaqc.mjs sheet artifacts/<project>/source/<packshot> artifacts/<project>/keyframes/still-01.png artifacts/<project>/qc/clip-01-mid.png artifacts/<project>/qc/clip-01-last.png artifacts/<project>/qc/clip-02-mid.png artifacts/<project>/qc/clip-02-last.png artifacts/<project>/qc/clip-03-mid.png artifacts/<project>/qc/clip-03-last.png --cols 4 --out artifacts/<project>/qc/clips.jpg
```

Repeat the ffmpeg line for each clip or hook, and list one mid and one last PNG for each clip actually made. Report exit codes and figures per file. Exit 3 is reported as not checked and named as a debt. Quote the sheet's order[] as its legend. Then go through the Quality bar below and list every taste item (creator-native feel, a hook in the first 1-2 s, product stability against the packshot on qc/clips.jpg, no hallucinated text, claims) for the owner's review. Never mark a taste item as passed.

## 14. Deliver

Write the delivery note `artifacts/<project>/edit-order.md`. For b-roll, list the clips in edit order, each with its voiceover note and any on-screen text still owed (supplied strings verbatim). For hooks, write a table of hook angle, endpoint, request id, output path and defects. Write PROGRESS.md (Summary, Decisions, Asset inventory, Pipeline, Known gaps, Next steps), verify the manifest, then write `outcome.json`:

```bash
node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs verify --project <project>
grep -c '^## ' artifacts/<project>/PROGRESS.md
python3 -c 'import json,sys;json.dump({"status":"complete","final":"clips/","credits":float(sys.argv[2])},open(sys.argv[1],"w"))' artifacts/<project>/outcome.json <total credits>
```

Name every debt with its file (captions/CTA and supplied strings, stitch, voiceover audio). Never call the clips stitched unless step 12 stitched them. Only a job that delivers overwrites a spend gate's partial outcome with complete. A job that ends on a Stop answer or an open spend gate leaves it partial. End edit-order.md with a closing line giving the folder tree, file count and credits spent. Check: `manifest.mjs verify` exits 0, grep prints 6, and outcome.json is complete, or partial with a reason.

## Script build order

Build scripts as short spoken beats, not polished ad copy:

1. Hook: one concrete tension, problem, result, or curiosity gap.
2. Context: why this speaker cares or what situation they are in.
3. Product moment: product appears, is used, or is shown solving a problem.
4. Proof: sensory detail, visible demo, supplied metric, or user-provided fact.
5. Turn: before-after, objection answered, or unexpected benefit.
6. Close: soft CTA, next action, or clean final product frame.

Keep claims grounded. Replace unsupported claims with observable statements:
"the texture looks lighter" beats "this cures acne".

## Prompt build order

For each UGC clip or shot, write:

1. Speaker and frame: creator type, age range if supplied, setting, crop.
2. Performance: eye contact, casual delivery, gestures, expression, pace.
3. Product action: held up, opened, applied, compared, demonstrated, shown.
4. Camera: handheld phone, desk tripod, mirror shot, close-up, b-roll insert.
5. Lighting and audio feel: natural window, bathroom light, car interior.
6. Platform constraints: 9:16, safe top/bottom zones, no generated captions.
7. Guardrails: no fake claims, no new logos, no changed product packaging.

On the faceless route, slots 1-2 describe the hands and setting instead of a speaker. On Seedance, write slot 7 as positive clauses, because the route has no negative_prompt field.

## Model routing

- Talking head from portrait and audio: `veed/fabric-1.0`.
- Talking head from portrait and text: `veed/fabric-1.0/text`.
- Avatar with visual direction: `fal-ai/creatify/aurora`.
- Lip-sync existing footage: `fal-ai/sync-lipsync/v2`.
- Product b-roll or demo motion: `bytedance/seedance-2.0/image-to-video`.
- Fast draft b-roll: `xai/grok-imagine-video/image-to-video`.
- Creator keyframes, thumbnails, and product-faithful stills:
  `openai/gpt-image-2` or `fal-ai/nano-banana-pro`.

- TTS: load `media-audio-generation` (Skill tool) and use `fal-ai/elevenlabs/tts/multilingual-v2` (draft: `fal-ai/kokoro/american-english`), reading the schema with `ai-gen info`. Prefer short test sentences before full scripts.

What runs on SL8, and why:
- Talking head, portrait-plus-text, avatar and lip-sync: no SL8 route. No Studio skill teaches these endpoints, and their proxy prices are unverified. Use step 11.
- Product still from a packshot: `fal-ai/nano-banana-pro/edit`. The Studio and fal agree, and it costs 37.5 cr against 52.75. Fallback: `openai/gpt-image-2/edit` when packaging text or geometry drifts. The test run uses nano-banana-pro/edit.
- Product still without a packshot: `fal-ai/nano-banana-pro` (the SL8 incumbent). Fallback: `openai/gpt-image-2` at quality=high, fal's pick 'especially when text or product fidelity matters'.
- B-roll and hooks: `bytedance/seedance-2.0/image-to-video` at 720p. fal and the Studio agree, and it is proven on an SL8 release build. Fallback: `bytedance/seedance-2.0/fast/image-to-video` (same grammar, cheaper, 720p up to 10 s). The test run uses the base route.
- Draft lane, only when the brief asks for a draft: Seedance /fast/, or the Studio's draft lane `fal-ai/veo3.1/lite/image-to-video` (Veo grammar, 4s/6s/8s). fal's draft pick `xai/grok-imagine-video/image-to-video` is unproven on SL8: use it only when the brief names it, after `ai-gen info` and `ai-gen estimate`.
- Voiceover: `fal-ai/elevenlabs/tts/multilingual-v2`, because fal names no TTS model. It is unpriced on SL8, so step 8 switches to `fal-ai/kokoro/american-english` (about a 5 cr floor per call) or opens a gate.
- Hero still for the polished route: `fal-ai/nano-banana-pro/edit`, fallback `openai/gpt-image-2/edit`.

## Quality bar

Before returning:

- The clip feels like plausible creator content, not a studio commercial.
- Spoken script length fits the requested runtime.
- Mouth motion is synced when a speaking face is used.
- Product shape, packaging, and logo are stable.
- Claims are supplied by the user or phrased as visible observations.
- The first 1-2 seconds have a clear hook.
- Captions or text overlays are not hallucinated inside the video.

- Output paths come from `files[0].local_path` in the ai-gen result envelope, not manually fetched URLs, and every generation has a manifest row (`manifest.mjs verify` exits 0).

How each item is checked: aspect, resolution, duration and audio with `mediaqc.mjs declared` (steps 7, 9 and 10); real motion with `mediaqc.mjs motion` against the frozen control; script length with step 4's word budget (plus `mediaqc takes` and the ffprobe duration when audio is generated); clips not called stitched by comparing edit-order.md with final/. Creator feel, the hook, product stability, on-video text and claims go to the owner's visual review on qc/clips.jpg. Mouth sync is n/a on SL8 until a Studio adds a lip-sync route. Never claim a taste item passed.

## Recovery

If the face drifts, shorten the script, use cleaner portrait/audio inputs, or
switch from generated avatar to lip-syncing approved source footage.

On SL8, the face routes and the lip-sync switch above are not runnable (step 11). A clip that fails a measured check on the runnable route gets one re-quoted retry that moves a named lever (attempt 2, its own file), then the named fallback (HR7). On a timeout, never resubmit: fetch with `ai-gen result <id>`. For any other exit code, follow media-ai-gen's recovery section.

## On SL8

This kit runs on the SL8 Video Studio. Load `media-ai-gen` (Skill tool) before the first `ai-gen` call and follow its house rules (HR-1.0): estimate every paid step first and keep a running total (HR5); never resubmit a job that may exist (HR6); deliverables go under `artifacts/<project>/` (HR8); one manifest row per generation (HR9); never ask the user: use the defaults above, and open a gate if a step would spend past what the brief approved (HR12); never install anything (HR21).
