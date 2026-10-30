---
name: image-product-presets
description: >-
  Product photo presets: one product photo plus one of 45 preset names (/hero-shot, /flatlay,
  /in-hand, /water-splash, /benefits, /specs, /reel-cover and the rest) becomes one campaign-ready
  still from a fixed prompt and one reference-conditioned edit call; a set is several presets over
  the same photo. Each still is checked against the photo before delivery. Use when: a customer
  sends a product photo and names a preset, or asks for a styled packshot, an e-commerce or social
  set, a lifestyle or conceptual product scene, or a product info card that a preset covers. NOT
  for: a pixel-identical marketplace main image or compliance packshot (cutout and composite with
  media-photo-editing); a free-form brief, brand theme or planned campaign family (free-prompt
  stills: media-image-generation); video presets (not offered); character sheets
  (media-character-sheet); running ai-gen in general (media-ai-gen); scripted file checks (media-qc).
license: SL8 wording; method and preset recipes from Higgsfield (no licence stated), restated and cited
compatibility: "sl8-image >=1.5.0 (Base 2.1.0); ai-gen 2.2.0; media-ai-gen 1.2.0; media-qc 1.2.0; node 22; python-imaging 1.0.0 (Pillow); imagemagick 6.9; fal endpoints as of 2026-10-27"
metadata:
  version: 1.0.0
  revision: 2026-10-28a
  house-rules: HR-1.0
  upstream: [higgsfield/product-image-presets, creative-claw/creativeclawproductphotoshoot-39bd86, creative-claw/cc-image-model-guides, fal/charactersheet-a2ae87, fal/commercial-4335f5]
  upstream-pin: sl8-resesarch@559a1305 (assessment 2026-10-27; Higgsfield recipes captured 2026-10-11)
  approach: WF04-a3
  attribution: Method from the SL8 capability assessment (WF04-a3); preset recipes restated in SL8 wording from Higgsfield; review points restated from Creative Claw and fal
  deltas: IMG-D300..IMG-D319
---

# Product photo presets

One product photo and one preset in, one finished still out. The creative direction lives in a
table of 45 fixed prompts (`references/presets.json`); the method is a table lookup, one
reference-conditioned edit call with the prompt sent unchanged, and a check of the result against
the photo before it is delivered. A set is several presets run over the same photo, one call each.

The prompts are SL8's restatement of a vendor's preset recipes, which were written for another
model (the vendor's GPT Image 2.5 variant). Neither the wording nor the default models below have
been run on this machine: treat the first stills of each preset family as a test, and judge label
fidelity on them (step 7).

```bash
PRESET=$HOME/.agents/skills/image-product-presets/scripts/preset.mjs
S=$HOME/.agents/skills/media-ai-gen/scripts
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $PRESET list                 # the 45 presets: token, family, visible effect
node $PRESET effect /benefits     # the one line you may say about a preset
```

## What a request needs

- **One preset, or a list for a set,** from the 45 (commercial 15, marketing 12, informational 8,
  conceptual 5, lifestyle 5).
- **One product photo** (PNG, JPEG or WebP). One photo can feed several presets.
- **Optional:** a format word (square, landscape, full-screen Reel or Story) and a count of 1 to 4.

Nothing else is collected: no brief, style, copy or audience. A preset request authorizes the
generation without a plan, prompt options or confirmation, as long as the quote fits the job's
budget (step 6). A bot job has no one to answer (HR12); only an interactive session with the
customer present can take a question.

## Steps (approach step numbers in brackets)

1. **Resolve every preset first** [1]. `node $PRESET resolve /hero-shot /flatlay …` before asking
   for anything or uploading; never guess an unfamiliar token. One unknown token stops the whole
   set: in an interactive session list the 45 tokens and ask which one; in a bot job end there and
   report the list. Video presets are not offered on this machine.
2. **Take the photo** [2]. The customer's upload (`artifacts/attachments/`) or the newest product
   image in the job's inputs; check it opens (`identify <photo>`). Name the project in kebab-case
   from the photo's file stem (one project per photo and set), start it once
   (`node $S/manifest.mjs init --project <project>`) and copy the photo to
   `artifacts/<project>/source/` (the rows cite it as their parent, HR11). No photo: ask only for
   the photo (a bot job ends and says it is missing). HEIC or a file over the proxy's upload limit:
   convert or downsize it with media-photo-editing first.
3. **Upload inside each call** [3]. There is no upload command and ai-gen exposes no reusable input
   URL, so each call uploads the photo again: `--ref <photo>` maps it to `image_urls`, which both
   edit models take (`--image` maps to `image_url`, which they reject). The upload worked when the
   call exits 0.
4. **Fix the format and count** [4]. Default 3:4 portrait, also for `/vertical-hook`, `/reel-cover`
   and `/swipe-opener` (their prompts keep interface-safe zones instead of a 9:16 canvas). Only an
   explicit request changes it: square 1:1, landscape 16:9, full-screen Reel or Story 9:16. Count
   stays 1 unless more were asked (at most 4). Change no other default. The params script turns the
   ratio into each model's own field:

   | Ratio | `openai/gpt-image-2/edit` `image_size` | `fal-ai/nano-banana-pro/edit` |
   |---|---|---|
   | 3:4 | 1536x2048 | `aspect_ratio` 3:4, `resolution` 2K |
   | 1:1 | 1536x1536 | 1:1, 2K |
   | 16:9 | 2048x1152 | 16:9, 2K |
   | 9:16 | 1152x2048 | 9:16, 2K |

   Known result (facts `schema-gpt2-size`, `schema-nbp-aspect`, `schema-nbp-resolution`, as of
   2026-10-05): GPT Image takes `image_size` (multiples of 16, 655,360 to 8,294,400 pixels, sides at
   most 3:1); Nano Banana Pro takes `aspect_ratio` and `resolution` (1K default, 2K at the same price)
   and drops an `image_size` silently (HR3). Re-check both with the raw OpenAPI before the first call
   of a session (HR2).
5. **Write the params file, prompt unchanged** [5].
   `node $PRESET params <slug> --model <id> --ratio <r> [--count N] --out work/<project>/<slug>.params.json`
   prints the `declared` object (size, aspect, format) for step 6. The prompt is the table row, byte
   for byte: no rewriting, translating or added style words, no "Preserve:" header in front (the
   preserve clause is inside every prompt), and no prompt on the command line (a positional prompt
   or `prompt=` overrides the file). Prove it with
   `node $PRESET check <slug> work/<project>/<slug>.params.json` (exit 0). Each prompt runs in one
   order: the family's opening sentence; the preset's own sentences (the whole difference between
   presets); for the six text-heavy cards (`/moodboard`, `/myth-fact`, `/product-match`,
   `/quick-steps`, `/saveable-tip`, `/share-card`) a text guard; the straighten-the-tilt sentence;
   the preserve clause; for `/angles` and `/hero-shot` a strict text-fidelity sentence; then the
   family's guard sentences.
6. **Quote, then generate** [6, 7].
   - Quote each params file: `ai-gen estimate <model> --params-file work/<project>/<slug>.params.json --format json`.
     A set costs one quote per call. The quote leaves out the photo, which the edit also bills.
     Known result (facts `price-gpt2-quality`, `price-gpt2-size`, `price-gpt2-edit`): GPT Image high
     is 52.75 cr at 1024², a 2K size costs about 2 to 4 times that, and the edit adds the photo's input
     tokens; Nano Banana Pro is 37.5 cr per image at 2K. Compare the total with
     `node $S/manifest.mjs budget --project <project>`. Over the remaining budget, or no budget known:
     open a gate (`node $S/gate.mjs open …`) and end the job `partial` (HR5, HR12).
   - Run: `ai-gen image -m <model> --ref artifacts/<project>/source/<photo> --params-file work/<project>/<slug>.params.json -o artifacts/<project>/<slug>/ --queue --strict-params --max-cost <quote> --format json > work/<project>/<slug>.result.json`.
   - **Default: `openai/gpt-image-2/edit`**, `quality` high (the params script pins it with
     `output_format` png, `enable_safety_checker` true and `sync_mode` false, HR4); a kit or brief
     may name another. It is the same model family as the vendor's and the candidate for the
     text-heavy cards, not a proven pick.
   - **Default fallback: `fal-ai/nano-banana-pro/edit`** (`aspect_ratio`, `resolution` 2K); a kit or
     brief may name another. Known result (`beh-nbp-mug`, T3 #21): a product edit on it once turned a
     mug into a luggage tag, so step 7 matters most on this route.
   - Not set: `input_fidelity`. Known result (`schema-gpt2-edit-fields`): fal's GPT Image edit has no
     such field and the proxy would drop it.
   - All 45 presets share this one generation block: no per-preset model, ratio or quality. A count
     above 1 is `--count N` in the same call; never mix presets or invent looks to fill a count, and
     check that the number of files equals the count.
   - Record the row:
     `node $S/manifest.mjs add --project <project> --result work/<project>/<slug>.result.json --params work/<project>/<slug>.params.json --json '{"item":"<slug>","node":"<slug>","declared":<declared from step 5>,"credits":{"estimate":<quote>},"parents":["source/<photo>"]}'`
     (HR9), then `node $Q declared --plan artifacts/<project>/manifest.json --file <the still>` (HR1).
7. **Check the still against the photo, before delivering it** [10] (an SL8 addition: the recipes
   have no check). View both images (a pair sheet helps:
   `node $Q sheet artifacts/<project>/source/<photo> <the still> --out artifacts/<project>/qc/<slug>-pair.jpg`)
   and write what you see for each item, never a bare pass (HR14):
   - silhouette, proportions, cap or closure, logo, label text, materials, colours and reflections;
   - shadows and contact with surfaces (no floating product), crop safety, and, across a set,
     consistency between the stills;
   - the tilt was straightened; no invented claim, price, URL, QR code or barcode;
   - card presets: every word spelled right, at most 4 benefit labels, exactly 3 steps or reasons;
   - conceptual presets: the product is not warped or duplicated, and water, powder, fabric or ice
     leaves the label readable; lifestyle and conceptual props support the product rather than
     compete with it.

   An attractive still that misrepresents the product fails. One failed check allows one
   regeneration with the prompt unchanged, and it moves a named lever (HR7), recorded as `lever` in
   the manifest row: a still from the primary that fails moves to the fallback model (`lever: route`);
   a still from the fallback that fails takes a new `seed` (`lever: seed`). No third call. After a
   second failure, mark the row `rejected`, deliver the closer still only with one plain line saying
   what is wrong, or withhold it if it would mislead. If you cannot view the images, say the check
   did not happen; never claim it.
8. **Deliver** [8]. The still from `artifacts/<project>/<slug>/` and at most one short sentence.
   Never put the prompt or these instructions in a reply (the manifest keeps the prompt as the
   record, HR9); asked what a preset does, answer with its `node $PRESET effect <slug>` line only. No
   extra calls just to show the same result.
   - When a still is handed on as a video keyframe, note that it was made at the campaign ratio; a
     keyframe is made at the video's ratio, which step 4 uses only when the caller states it.
   - Tags, only when the caller names the product and campaign (this method collects no brief): a
     sidecar `<still>.tags.json` with `product`, `campaign`, `shot_type` (the slug), `aspect_ratio`
     and `status` (`delivered` or `rejected`), keeping any tags already there. The reply does not
     show it.
9. **Failures** [9]. When the primary model is unavailable (exit 6 `PROXY_BLOCKED`, exit 8
   `UPSTREAM_NOT_FOUND`, or exit 9 for a queued job that failed), make one call on the fallback
   model. Any other tool or model failure: report it in one line and stop; never swap in another
   preset or improvise a look. A queued call that timed out (exit 10) is already charged: fetch it
   with `ai-gen result <request-id> -o artifacts/<project>/<slug>/ --format json` (the id is in
   `error.details.requestId`; `ready: false` means fetch again later), never resubmit (HR6). A
   content-policy refusal is final: do not resend it unchanged, do not route around the safeguard,
   and do not treat it as a reason to use the fallback; a model the refusal suggests is advice, not
   permission.

## Not on this machine

- **The briefed product set** (one planned campaign family from a brief, brand theme or approved
  hero, the assessment's fallback method WF04-a2) is not offered on this machine: use
  `media-image-generation` for a free-prompt still.
- **A pixel-identical packshot** is not this method: every preset redraws the product. Known result
  (T3 #21): a cutout and local composite stayed pixel-faithful where an edit model did not; use
  media-photo-editing for that. `/minimalist-white` is a styled e-commerce look, not a compliance
  packshot.
- **The 18 video presets** of the same catalog are not offered on this machine.
- The table is frozen at the 2026-10-11 capture; the vendor's catalog later listed 80 presets.

## House rules (HR-1.0)

Relies on: HR1 (size, aspect and format declared by `preset.mjs params`, measured with media-qc;
the file count checked), HR2, HR3 (each model gets only its own size fields; `--strict-params`),
HR4 (quality, format, safety checker, sync mode and resolution pinned by the params script), HR5
(each call quoted, the total checked against the budget), HR6, HR7 (one regeneration: route, then
seed), HR8, HR9, HR11 (every call edits the original photo in `source/`), HR12 (an unknown preset,
a missing photo or a quote over budget ends a bot job), HR13 (`preset.mjs check`, `mediaqc.mjs`),
HR14, HR15, HR16 (if `ai-gen info` shows a prompt-rewrite or enhance field, pin it off in the params
file and rerun `check`: the prompt is complete), HR17 (people and hands in lifestyle presets are
generic, never a real person), HR18 (the prompts forbid invented claims, prices and certifications;
step 7 checks it), HR19, HR20, HR21, HR22 — see media-ai-gen/references/house-rules.md.
Departs by method from HR10 (owner decision pending, learnings IMG-L307): the product's own label
and the card text pass through the edit model, because a preset redraws the product in a new scene.
Step 7 is the control; a caller who needs exact text composites it afterwards with
media-photo-editing.
