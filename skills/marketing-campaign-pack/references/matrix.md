# Campaign matrix: file shape, prompt layers, sizes

## Contents
- [matrix.json](#matrixjson)
- [The seven prompt layers](#the-seven-prompt-layers)
- [Video prompt form (Seedance 2.0)](#video-prompt-form-seedance-20)
- [Ratio to model fields](#ratio-to-model-fields)

The matrix is written before any generation (step 3) and checked with
`python3 $C/campaign.py check artifacts/<project>/campaign/matrix.json`. The shape below is SL8's: the
source names the fields but gives no schema (WF15-a1 gaps[0]).

## matrix.json

```json
{"schema": "sl8.campaign.matrix/1", "project": "spring-launch",
 "intake": {
   "objective": "launch",
   "audience": {"persona": "…", "market": "…", "use_case": "…", "awareness": "problem-aware", "objections": ["…"]},
   "offer": "trial",
   "channels": ["paid social", "landing page"],
   "required_assets": ["stills", "videos"],
   "brand_rules": {"colors": [], "logo": "artifacts/<project>/source/logo.png", "typography": [], "tone": "…",
                   "taboo_visuals": ["…"], "competitors": ["…"]},
   "claims": {"approved_copy": ["Start free today"], "proof_points": [], "disclaimers": [], "compliance_limits": []}},
 "visual_system": "35 mm eye-level, soft window key from the left, warm neutral palette, product centred, slow push-in",
 "omitted_roles": {"retention": "launch only; no later touchpoint asked"},
 "budget": {"credits": 1500, "approved_by": "brief"},
 "assets": [
  {"id": "hook-paid-social-v1", "role": "hook", "channel": "paid social", "crop": "9:16", "format": "png",
   "route": "fal-ai/nano-banana-pro/edit", "copy_mode": "safe space", "delegate": "none",
   "prompt_summary": "product mid-pour, first-frame attention, upper third clear",
   "guardrails": "no fake claims, no extra logos, no distorted UI, no fake proof; no competitor marks",
   "references": ["source/product.png"],
   "layers": {"1": "…", "2": "…", "3": "…", "4": "<visual_system, unchanged>", "5": "…", "6": "hook angle: motion", "7": "…"},
   "price": {"credits": 38}, "review": "", "defects": []},
  {"id": "hook-paid-social-v2", "variant_of": "hook-paid-social-v1", "…": "same fields; only layers.6 differs"},
  {"id": "hook-paid-social-clip-v1", "role": "hook", "format": "mp4", "crop": "9:16",
   "route": "bytedance/seedance-2.0/image-to-video", "from_still": "hook-paid-social-v1", "duration": "5",
   "price": {"credits": 378}, "…": "…"}
 ]}
```

- `id` is `<role>-<channel>-v<n>` in kebab-case and is the asset's folder: `-o artifacts/<project>/<id>/`.
- The seven fields (`role`, `channel`, `crop`, `format`, `route`, `prompt_summary`, `guardrails`) are
  never empty. `copy_mode` is one of the three layer-5 modes; `copy` holds the exact wording when the
  mode is `exact provided wording`, and must be one `approved_copy` entry, verbatim.
- `price.credits` is the quote for ONE call, the `ai-gen estimate` figure for the row's params file
  (`num_images` 1). There is no `count`: a row is one call, more assets are sibling rows (`check`
  fails a `count` other than 1). `budget.credits` is the ceiling `campaign.py total --budget` reads.
- `delegate` is `none` or `image-product-presets` (SKILL.md step 5). `review` is the one-line written look
  at the file (step 12). `final_crop` names a reframe applied after the clip (a 4:5 slot from a 3:4
  clip). A row with `copy_mode` `exact provided wording` has a `gpt-image-2` route and a `waiver`.
- A row the proxy cannot
  price has `"price": "unknown"`, never a remembered rate.
- A variant names `variant_of` and changes only `layers.6`; `check` fails any other difference, and
  any difference in `crop`, `format`, `route`, `references`, `portrait` or `speech`.
- A creator-ad row adds `portrait` (at the row's ratio), `speech` (an audio file or the approved spoken
  text) and `consent`; `check` fails a creator route with no `consent` or with `"price": "unknown"`.
- `defects` collects what step 12 finds; `campaign.py manifest` lists every defect, or "none found".

## The seven prompt layers

fal's prompt order, kept as written (fal marketing skill, used with attribution):

1. Asset role and channel.
2. Product or subject invariant.
3. Audience context and use case.
4. Visual system: camera, lighting, composition, color, motion.
5. Copy handling: no generated text, safe space, or exact provided wording.
6. Variation axis.
7. Guardrails: no fake claims, extra logos, distorted UI, or fake proof.

How SL8 fills them:
- Layer 4 is the matrix's `visual_system`, pasted unchanged into every asset (one visual system for
  the campaign).
- Layer 5: `no generated text` says so in the prompt; `safe space` names the empty area and where the
  copy will sit (for 9:16 social, inside the area the step-12 band leaves clear: between 14% and 65% of the height, 6% in from the sides); `exact provided
  wording` quotes the approved line once, in quotation marks (SKILL.md step 6 says when it is used).
- Layer 6 names the one axis that differs from the sibling variant (hook angle, setting, framing,
  palette accent). Across a hook test, product, proof, speaker, crop and references stay fixed.
- Layer 7 lists the four guardrails plus the brand's taboo visuals and competitors from intake. Where
  the route has no negative-prompt field, write each as a positive instruction ("the label reads
  exactly as in the reference") and tell the owner it is unenforced; never append a "no …" list to a
  positive prompt on a route that has a separate negative field.

## Video prompt form (Seedance 2.0)

A short shot direction, in this order: the layer 1 to 4 content as one or two sentences of action and
camera; a `Duration feel:` line describing the pacing in words (no numbers); `No captions or on-screen
text.`; and a closing `What should not change:` line naming the invariants (product shape, label,
colours, framing). The still the clip starts from carries the look; the prompt adds motion only.
This wording has not been run on SL8.

## Ratio to model fields

| Ratio | `openai/gpt-image-2` · `/edit` `image_size` | Nano Banana Pro / 2 `aspect_ratio` | Seedance 2.0 `aspect_ratio` |
|---|---|---|---|
| 9:16 | `{"width": 1152, "height": 2048}` | `9:16` | `9:16` |
| 1:1 | `{"width": 1536, "height": 1536}` | `1:1` | `1:1` |
| 4:5 | `{"width": 1536, "height": 1920}` | `4:5` | none: make 3:4, crop to 4:5 (SKILL.md step 10) |
| 16:9 | `{"width": 2048, "height": 1152}` | `16:9` | `16:9` |

Known result (facts `schema-gpt2-size`, `schema-nbp-aspect`, `schema-nb2`, `schema-seedance20-aspect`,
as of 2026-10-05/06): GPT Image takes `image_size` (multiples of 16, sides at most 3:1) and has no
`aspect_ratio`, so an `--aspect-ratio` flag there is dropped silently (HR3); Nano Banana takes
`aspect_ratio` plus `resolution`; Seedance 2.0 has no 4:5. Re-check each enum with the raw OpenAPI
printer before the first call of a session (HR2). The sizes are SL8's choice inside those limits.
