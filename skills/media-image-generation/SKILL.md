---
name: media-image-generation
description: >-
  Chooses and runs the image model for a still: text-to-image, photoreal and product stills,
  stylized illustration, vector icons, fast drafts, generative edits, multi-reference composites,
  inpainting, object removal, outpainting, relighting, upscaling and restoration through ai-gen.
  Gives each intent a primary endpoint and a named fallback, quotes credits first, declares
  defaults, pins default-on flags, checks values against the schema, writes the prompt to the
  route's contract and hands the file to media-qc. Use when: generate an image, picture, still,
  poster art, product shot, hero image, illustration, icon or draft; edit, remove an object,
  inpaint, outpaint, relight, upscale or restore with a model; which image model to use. NOT for:
  slider adjustments, crops, grades, cutouts, composites, exact text or logos
  (media-photo-editing); character reference sheets (media-character-sheet); running ai-gen,
  manifests and gates (media-ai-gen); measuring outputs (media-qc); video (not on this machine).
license: MIT (fal-ai-community/skills README) for the fal-community parts; the fal-agent parts adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-image >=1.0.0 (Base 2.0.2); ai-gen 2.2.0; python-imaging 1.0.0; media-qc 1.0.0; fal endpoints and list prices as of 2026-10-05"
metadata:
  version: 1.0.1
  revision: 2026-10-06a
  house-rules: HR-1.0
  upstream: [fal-community/model-routing, fal-community/fal-models-catalog, fal-community/fal-prompting, fal-community/fal-recipes, fal-community/commercial, fal-community/marketing, fal-community/genmedia, fal-agent/fal-video-generation, fal-agent/fal-motion-graphics, fal-agent/cinematography, fal-agent/photo-editing, fal-agent/character-sheet, fal-agent/fal-gamedev]  # genmedia, video-generation, motion-graphics: structure and rules only, no command or router copied
  upstream-pin: fal-community 9ca850412943251fc9a466c4c29fdaf7a303a3d8 (2026-05-13); fal-agent export 2026-10-05
  attribution: Adapted from fal-ai-community/skills (MIT) and fal (fal.ai/agent/skills export 2026-10-05)
  deltas: IMG-D20..IMG-D49
---

# Image generation

A routing skill, not a pipeline. Sixteen intents, each with a primary endpoint and a named
fallback: identify the intent, settle the settings that drive cost, submit, collect, hand back the
file. Anything needing a bespoke multi-stage workflow belongs to a sibling skill. Dated data lives
in [picks.md](references/picks.md), [endpoints.md](references/endpoints.md), [facts.md](references/facts.md).

## Hand off instead of routing here

Route here whenever none of these claims the request:
- **A slider could do it.** The test: **could a darkroom or Photoshop slider do it?** → deterministic.
  **Does it require inventing new image content?** → a route below. Grades, crops, resizes, format
  changes, compositing, background blur, and the Bria cutout with its composite:
  **media-photo-editing** (the routing row below only names the cutout endpoint).
- **A character design or reference sheet** (turnaround, expressions, the identity anchor for later
  calls): **media-character-sheet**. All views render in one call; that is why they match.
- **Exact text, logos, brand marks and prices** are never generated. "Type and logos never pass
  through a generative model — an edit model redraws, it does not composite, and a redrawn wordmark
  is the oldest failure in this corpus." Generate the picture "with empty safe space" and hand the
  exact copy to media-photo-editing to composite last (HR10).
- **Video** (animate a still, extend, reframe a clip): not on this machine. Deliver the still and
  name the debt.

**What handing off means, mechanically.** Read `$HOME/.agents/skills/<skill>/SKILL.md` (for example
`$HOME/.agents/skills/media-photo-editing/SKILL.md`), follow it for the item it owns, and say in one
line which item went to which skill. If the sibling is not installed, do not quietly build the thing
yourself: name the skill the job needs; a substitute is labelled as not the specialist output.

**A request can split.** One message can hold items this skill owns and items a sibling owns — that
is the normal case, not an edge. Do the owned items in full, hand the rest off, and close out by
naming the file being passed onward and anything the sibling still needs. If every item hands off,
stop there — the submit and delivery steps below are n/a, and forcing an output into existence to
satisfy them is the bug.

**A delegated step still imposes an order.** Edit, relight, upscale and restore re-render every
pixel, so anything composited onto the frame — text, logos, prices, watermarks — does not survive
passing through them. Exact copy is composited **last**, after every re-rendering step, whatever
order the user listed the asks in; say so in one line when you reorder.

**The debt is yours to name** (HR15): **your closing line names the text still owed, and the file
it is owed on**, in the sentence that names the file you pass over: "Handing `hero-01.png` to
media-photo-editing; still owed: headline OPEN HOUSE and the logo, in the empty top third." A
hand-off that names the file but not the debt is how the debt disappears.

## Cost comes first

Images bill **per image, per megapixel or per token**, and four multipliers run at once:
- **Quality tier.** gpt-image-2 defaults to `quality=high`, about 35× `low` (52.75 cr against 1.5 cr
  at 1024²). Ideogram v4.5 is 7.5 / 15 / 55 cr for low / medium / high.
- **Resolution.** Nano Banana 2 is 20 cr at 1K, ×0.75 at 0.5K, ×1.5 at 2K, ×2 at 4K; Nano Banana Pro
  is 37.5 cr, ×2 at 4K. Seedream v5 pro defaults to `auto_2K`, the 33.75 cr tier, twice its 16.9 cr
  at 1536² or less. "Prefer 2K or 4K custom `image_size` when the final must be detailed" is right
  for small readable detail and costs about 2–4× on gpt-image-2: price it first.
- **Count.** `num_images` multiplies the bill; Seedream adds a `max_images` fan-out; gpt-image edits
  also bill the input image tokens, so an edit costs at least what a generation does.
- **Add-ons.** Web search on Nano Banana adds 3.75 cr; high thinking on Nano Banana 2 adds 0.5 cr.

**These are fal list prices × 250 cr/$, dated 2026-10-05** ([facts.md](references/facts.md)), not
proxy quotes: before every paid call run `ai-gen estimate <id> --params-file <p.json> --format json`
on the exact payload and use its figure. Where a list price disagrees with itself (Bria remove 4.5
or 10 cr; Recraft 4.1 vector 1.75 or 20; FLUX.2 klein 1.5 or 2.25), quote the higher meanwhile.

**Quote before you spend.** One line per paid step plus a running total against the brief's budget
or `SL8_SPEND_CEILING`, gated on the total: generate → edit → upscale is three bills. An unpriced
route runs uncapped. A spend past what the brief approved opens a gate with media-ai-gen's
`scripts/gate.mjs open …` and the job ends `partial`.

**Draft when the concept is unproven** on `fal-ai/flux/schnell` (about 2 cr): a different grammar, so
a draft that works is evidence about the composition, not the wording. Never draft text there.

## Step 0 — Declared defaults, not questions

No person is present to answer. Write every value into `plan.json` as a `declared` object before any
paid call (HR1), state each default you chose in the delivery note, and ask nothing (HR12).

| Field | Default when the brief is silent |
|---|---|
| Product | "exact product name, category, material, color, scale, logo rules" as briefed; "preserve packaging, avoid new labels, no fake readable copy" |
| Goal | the brief's: "hero shot, PDP image, ad creative, motion reveal, demo, UGC, lifestyle"; else a single hero still |
| Platform / aspect | `1:1`; "square (Instagram), 4:5 (PDP), 16:9 (banner), 9:16 (story)" when named; always sent explicitly |
| Resolution | 1K on Nano Banana; a 1024-class `image_size` on gpt-image and FLUX; 2K or 4K only when small readable detail must survive, priced |
| Quality | gpt-image `high` for a deliverable, `low` only for a probe: "Drafts at lower quality are misleading" |
| Count | 1; variants only when the plan budgets them (HR5) |
| Genre and era (photoreal) | "2024 flagship phone for candid genres and 2024 mirrorless for editorial, studio, food, nature, and architectural genres" |
| Light | one named source with a direction: "Direction matters more than intensity" |
| Text in image | none; a named empty safe area when copy follows (HR10) |
| Identity | a generic person; a real person only with documented consent (HR17) |
| Model | the routing table; a model the user names wins (HR20) |
| Format | `png`; `jpeg` "for shipped social" |

**Before the first paid call, in order** (HR19: a step, not a warning):
1. Read `$HOME/.agents/skills/media-ai-gen/SKILL.md`. It runs every model on this machine, writes
   the manifest row (HR9) and opens gates (HR12).
2. Start the project record once (`node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs init
   --project <project>`), quote the call (`ai-gen estimate <id> --params-file <p.json> --format json`)
   and read what remains (`… manifest.mjs budget --project <project>`).
3. If the quote is more than what remains, and that includes a run with **no spend authority**
   (ceiling 0), open the gate and end the job there:
   `node $HOME/.agents/skills/media-ai-gen/scripts/gate.mjs open --project <project> --slug approve-<item> --question "<what, route, credits>" --options '[{"id":"a","label":"<route>","credits":<quote>},{"id":"b","label":"Stop here","credits":0}]' --resume-at "<this step>" --quote <quote>`.
   The gate file, not a question in your reply, is how a job asks; it writes
   `artifacts/<project>/outcome.json` as `partial`.

## Routing table

Snapshot as of 2026-10-05: every id resolved against fal's live OpenAPI that day. Evidence and
alternates per row are in [picks.md](references/picks.md). Fallbacks are named, not implied.

| Intent | Primary | Fallback | Why the primary wins |
|---|---|---|---|
| Photoreal still (no reference person) | `fal-ai/nano-banana-pro` | `openai/gpt-image-2` (`quality=high`) | SL8's incumbent for stills; 37.5 cr against 52.75; gpt-image-2 when a texture cue or in-frame detail misses |
| The same real person from a reference photo | `openai/gpt-image-2/edit` | `fal-ai/nano-banana-pro/edit` | First on SL8 for identity-preserving headshots, where NBP scored 0/4 twice; consent first (HR17) |
| Stylized, illustration, anime, concept art | `fal-ai/nano-banana-pro` | `openai/gpt-image-2` | SL8 incumbent (characters 9/10); a cross-family fallback covers a style NBP will not hold |
| Lettering is part of the art (stylized type, signage in a scene) | `fal-ai/nano-banana-pro` | `openai/gpt-image-2` (`quality=high`) | 9.5/10 on simple text cards on SL8; exact copy is never this row (HR10) |
| Vector illustration or icon (SVG; not an existing brand mark) | `fal-ai/recraft/v4.1/text-to-vector` | `fal-ai/recraft/v4/pro/text-to-vector` | SL8's pick for SVG and palette-locked graphics; `colors[]` fixes the palette |
| Fast draft (composition, mood, options) | `fal-ai/flux/schnell` | `fal-ai/flux-2/klein/9b` | The only draft model SL8 verified (~2 cr) and ai-gen's own default; never text, never final |
| Single edit (change one thing, keep the rest) | `fal-ai/nano-banana-pro/edit` | `openai/gpt-image-2/edit` | fal's first edit pick and SL8's incumbent; gpt edit when labels or geometry must hold |
| Multi-reference composite (product + scene, person + garment) | `openai/gpt-image-2/edit` | `fal-ai/nano-banana-pro/edit` | `image_urls` ≤16 enforced by schema, and its grammar labels each input by role |
| Inpaint a masked region | `openai/gpt-image-2/edit` with `mask_url` | `fal-ai/nano-banana-pro/edit` (instruction only) | The only routed edit with a mask field |
| Remove an object | `fal-ai/qwen-image-edit` | `fal-ai/bria/eraser` (needs a mask) | NBP "smears/hallucinates" at removal on SL8 |
| Outpaint or expand the canvas | `fal-ai/bria/expand` | `fal-ai/image-apps-v2/outpaint` | Purpose-built: places the original on a named `canvas_size` |
| Background remove or replace | `fal-ai/bria/background/remove`, composite run by media-photo-editing | `fal-ai/bria/background/replace` | Pixel-faithful cutout on SL8; a generative re-background redraws the product |
| Relight | `fal-ai/nano-banana-pro/edit` | `bria/fibo-edit/relight` | Takes a free-text light; Fibo is a fixed 13-value `light_type` enum |
| Product in a styled scene (hero from a packshot) | `fal-ai/nano-banana-pro/edit` | `openai/gpt-image-2/edit` | fal's product-shot first pick, "fast, strong product fidelity"; gpt edit for "text-on-packaging accuracy" |
| Upscale for delivery | `fal-ai/topaz/upscale/image` | `fal-ai/seedvr/upscale/image` | fal's "High-quality upscale for final delivery"; SeedVR is far cheaper per megapixel |
| Restore (blur, noise, damaged face, scan) | by defect: `fal-ai/nafnet/deblur` · `fal-ai/nafnet/denoise` · `fal-ai/codeformer` · `fal-ai/docres` | `fal-ai/nano-banana-pro/edit` ("clean up artifacts, sharpen edges") | "pick the right specialist endpoint for the dominant defect" |

**Route on content as well as on intent, and do it on the first attempt.** One thing overrides the
table: what the frame must survive as.
- **A product that must stay pixel-identical** (marketplace main image, compliance packshot) takes
  no generative route at all: cutout and composite. A nano-banana-pro edit once "hallucinated a
  different product: the mug became a luggage tag" (T3 #21).
- **Removal never goes to NBP** (T3 #22). **FLUX and Seedream never carry any text** (T3 §3).
- **A real person's likeness** needs documented consent before any route (HR17).
- **Moderation exposure.** Nano Banana exposes `safety_tolerance` (a string `"1"`–`"6"`, default
  `"4"`), a lever; gpt-image-2 has no moderation field, FLUX, Seedream and Recraft only
  `enable_safety_checker`. A refusal on a route with no lever is the wrong route, not a transient
  failure, and the retry ceiling applies. *The image refusal boundary is unmapped on SL8.*

**The fallbacks cross families on purpose:** gpt-image and Nano Banana fail differently. The cost is
grammar: re-render the prompt through the new family's contract, never resend it unchanged.

## Per-endpoint parameters

These endpoints disagree constantly: read your route's block in [endpoints.md](references/endpoints.md).
Four rules hold across all of them:
- **Size has three dialects:** `image_size` (preset or `{width, height}`: gpt-image, FLUX, Seedream,
  Recraft, Ideogram), `aspect_ratio` + `resolution` (Nano Banana) and `canvas_size` (Bria expand).
  A field the route lacks is dropped silently (HR3): `image_size` on nano-banana-pro "was ignored →
  square 1:1 default" (T3 #1). **Always set `aspect_ratio` on Nano Banana Pro**: it defaults to `1:1`
  (its edit route defaults to `auto`).
- **`ai-gen image` has no `--resolution` or `--image-size` flag.** Put `resolution=2K` or
  `image_size=landscape_4_3` in the params file or as `k=v` (T3 #3).
- **Edit arrays go through a repeated `--ref <file>`**, which ai-gen uploads into `image_urls` in
  order. A local path inside a JSON array is not uploaded and 422s (T3 #2). Single-input routes
  (Bria, Qwen edit, Topaz, SeedVR, CodeFormer, NAFNet, DocRes) take `--image <file>`.
- **Negative prompts do not travel.** Qwen edit, Bria replace and expand, and Ideogram v3 accept
  `negative_prompt`; gpt-image, Nano Banana, Seedream, FLUX, Recraft and Ideogram 4.x do not. Where
  the field is absent, carry the avoidance as a positive clause — "empty concrete floor" rather than
  "no furniture" — and say the exclusion is unenforced on that route.

## Default-on flags to pin explicitly

Set each of these even when you want the default value, so the intent is visible in the request:
- **`quality`** on gpt-image (=`high`): send `high` for a deliverable, `low` for a probe.
- **`aspect_ratio`** on Nano Banana Pro (=`1:1`) and **`resolution`** (=`1K`) on every Nano Banana
  route.
- **`limit_generations: true`** and **`enable_web_search: false`** on every Nano Banana route; web
  search adds 3.75 cr and pulls live web content into the picture.
- **Prompt rewriters** (HR16): `enable_prompt_expansion` (=true) on `ideogram/v4.5`, `expand_prompt`
  (=true) on `fal-ai/ideogram/v3`, `refine_prompt` (=true) on Bria replace, `optimize_description`
  (=true) on Bria product-shot: send `false` when your prompt is complete. Seedream rewrites every
  prompt and cannot be turned off: pin `enhance_prompt_mode`, store the rewrite if one is returned,
  and say so.
- **Size and face defaults:** `auto_2K` on Seedream v5 pro (send `auto_1K` unless 2K was asked);
  `face_enhancement` (=true) on Topaz, `false` unless faces need it; `face_upscale` on CodeFormer.
- **`sync_mode: false`** everywhere (`true` returns a data URI and no request id for the manifest),
  and the moderation level you mean: `safety_tolerance` or `enable_safety_checker`.

## Model IDs drift — query, never remember

The table above is a snapshot. Endpoints get renamed, versioned and retired — and fields get pinned.
1. Pick the endpoint ID from this skill. **Never invent endpoint IDs.**
2. Verify it with `ai-gen info <id> --format json` (exit 8: unknown). Discovery is advisory: listed
   ids 404 and unlisted ones serve (T3 #11); a successful call is the only truth.
3. Check every value you set against `const` / `enum` with the raw OpenAPI check in
   `$HOME/.agents/skills/media-ai-gen/SKILL.md`: `ai-gen info` shows a `const` as a plain default
   (HR2). A check that only confirms a field's name exists will pass a route that rejects your
   value; if a `const` or `enum` excludes the value the job needs, move to the row that can.
4. Search only if the routed endpoint is missing, deprecated, rejected, or the role is not covered
   here: `ai-gen models --search "<intent words>" --format json`, then `ai-gen estimate` each.
   Never assemble a payload from a sibling endpoint's parameters.

Known drift on 2026-10-05: Seedream v5 lives at the unprefixed `bytedance/seedream/v5/{lite,pro}/…`;
`fal-ai/seedream-4.5` 404s; D1's dehaze route was gone ([facts.md](references/facts.md)).

## Prompt contract per route

Universal principles (all families):
1. **Visual facts beat prestige adjectives.** Replace "stunning, cinematic, masterpiece" with
   "overcast daylight, brushed aluminum, 50mm feel."
2. **Style tags need visual targets.** "Minimalist brutalist" → "cream background, heavy black sans
   serif, asymmetrical type block, generous negative space."
3. **One controlled variable per iteration.** Comparison only works when one axis changes at a time.
4. **Inspect schema before assuming a control exists.** `ai-gen info <id> --format json`. Negative
   prompt, seed, multi-prompt, and reference-image fields differ across families.
5. **Per-family rules override universal advice.**

| Route | Contract | Load |
|---|---|---|
| gpt-image-2 (+edit) | Five sections: Scene / Subject / Important details / Use case / Constraints; edits as Change / Preserve / Constraints; every input labelled "Image 1: …" by role | [family-gpt-image-2.md](references/family-gpt-image-2.md) |
| Nano Banana (Pro, 2, edit) | The universal principles and the craft files; no family guide ships in 1.0. State exclusions as positives: "rewrite 'no cars' as 'empty street'" (T3 #24) | — |
| Any photoreal still | Six questions in order: who or what, doing what, where with one anchoring detail, light, camera, imperfections; one genre and one era | [craft-realism.md](references/craft-realism.md) |
| Product, packshot, commercial | "Write prompts in this order so commercial intent stays clear": product invariant, commercial role, setting, lighting, camera, composition, brand tone, guardrails; the product-shot template; lighting matched to the material (glass "backlight + thin rim light", metal "hard strip highlights") | [craft-product.md](references/craft-product.md) |
| Light, lens, depth, grade, texture vocabulary | Named setups only | [craft-lighting-lens-color.md](references/craft-lighting-lens-color.md) |
| gpt-image-2 naming a character | Add "no text in the image", or it prints the name (T3 #24) | — |

## Submit, poll, deliver

Execution belongs to media-ai-gen ("Run one endpoint, from discovery to manifest row"). In short:
1. Build the params file from the settled route's field names and enums only, every flag above
   pinned; estimate with that same file. Submit one run: `ai-gen run <id> --params-file <p.json>
   [--ref <file> …|--image <file>] --queue -o artifacts/<project>/<node>/ --format json`. No
   variants unless the plan budgets them.
2. A timeout is already charged: rejoin with `ai-gen result <request-id>`, never resubmit (HR6). On a
   4xx, read the error before retrying; a rejected enum or unknown field is a payload bug.
3. Take files from the envelope's `files[].local_path`; hosted URLs expire (HR8). One manifest row per
   output with `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`, including any
   rewritten prompt, the attempt and the lever (HR9).
4. Deliver the path and state the route, the measured size, the credits, each default you chose and
   any debt handed on.

## Check the output before you deliver it

**Measured, by script (HR13, HR14):**

```bash
Q=$HOME/.agents/skills/media-qc/scripts/mediaqc.mjs
node $Q image artifacts/<project>/<node>/<file> --aspect 4:5 --format png
node $Q declared --plan artifacts/<project>/plan.json --file artifacts/<project>/<node>/<file>
```

Report the printed figures; never write PASS. A declared 720p came back 864×496 three times, and only
a delivered-versus-declared check catches that (T3 #16). Exit 1 is a failed item: retry rule below.

**Judged by the owner, not by you** (taste, listed in the delivery note as review items):
- Product shape, logo, material, and color are not invented or distorted.
- The composition leaves enough room for platform crop and optional copy.
- Background props support the product and do not compete with it.
- Any generated text is absent or intentionally controlled.
- Lighting matches the material (glass gets backlit, metal gets specular highlights).
- No extra products or extra text in frame.
- Photoreal: the anti-AI-look checklist in [craft-realism.md](references/craft-realism.md).

**On a miss, do not iterate on the prompt with more adjectives.** Add concrete imperfections by
name; force a single primary light direction; replace "standing" with what the subject is doing;
cut every prestige adjective. "If the result misses product fidelity, switch from text-only
generation to a reference or edit workflow before retrying." If a result still fails realism,
"switch to edit-mode against a real reference photograph rather than text-to-image."

## Guardrails

- **One retry, then change route — and the retry changes a named lever** (HR7). Resubmitting the
  same payload pays twice for the same failure. Levers: a prompt clause, the references (fewer, or
  the unaltered original), the quality tier, the aspect. If the second attempt fails the same way,
  move to the named fallback rather than paying a third time. **This ceiling is per image, and it is
  the one that gets broken**: keep the count in the manifest, not in your head.
- **Edit from the original** (HR11): "Re-feed the UNALTERED original each turn… Editing a render of
  a render multiplies drift" (T3 #23).
- **References dilute:** "1 ref = 7/10 identity; 4 refs = 2/10" (T3 #19). Give each reference a role
  and send the fewest that carry it.
- **A generative route redraws every pixel** — edit, relight, upscale and restore included. If a
  logo, product, face or specific room must survive *as itself*, nothing that passes through a
  generative model preserves it. Check every generative output against the source before delivering.
- **Probe the source before spending:** dimensions, format, alpha, EXIF orientation, input limits.
- **Never substitute a route silently.** Name the fallback and its different price in the reply.
- **Claims** (HR18): never invent review quotes, user counts, ratings, award badges, or clinical,
  financial or performance claims; "when claims are missing, use observable language".

Revision 2026-10-05a · picks and prices as of 2026-10-05 · re-verify per [facts.md](references/facts.md).

## House rules (HR-1.0)

Relies on: HR1, HR2, HR3, HR4, HR5, HR6, HR7, HR8, HR9, HR10, HR11, HR12, HR13, HR14, HR15, HR16,
HR17, HR18, HR20, HR21, HR22 — see media-ai-gen/references/house-rules.md.
Not applicable: HR19 (an authoring rule for maintainers; no warning here has yet been ignored in a run).
