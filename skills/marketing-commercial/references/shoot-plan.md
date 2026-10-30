# Shoot plan: shape, layers and the campaign hand-off

`artifacts/<project>/shoot/shoot.json` is written before the first paid call and checked with
`python3 $SH check` (exit 0). The script assembles each prompt from it, so the file is the record of
what was sent. SL8 shape; fal's method names no file.

## Contents
- [Shape](#shape)
- [The eight layers](#the-eight-layers)
- [Batch rules](#batch-rules)
- [What check refuses](#what-check-refuses)
- [Called from marketing-campaign-pack](#called-from-marketing-campaign-pack)

## Shape

```json
{
 "project": "acme-bottle-pdp",
 "invariant": "A 500 ml matte black steel water bottle, 26 cm tall, with a brushed steel cap and the white wordmark printed once on the front, unchanged.",
 "goal": "pdp", "platform": "square", "brand_tone": "minimal",
 "source": ["source/packshot.png"],
 "fidelity": true,
 "batch": true, "ratio": "1:1",
 "constraints": ["preserve packaging", "avoid new labels", "no fake readable copy"],
 "skeleton": {
  "invariant": "A 500 ml matte black steel water bottle, 26 cm tall, with a brushed steel cap and the white wordmark printed once on the front, unchanged",
  "role": "PDP main image for an online store",
  "setting": "on a seamless pale grey sweep, no props",
  "lighting": "large softbox from the left, strip light rim on the right edge",
  "camera": "eye level, 85 mm feel, whole bottle sharp",
  "composition": "centred, 12% margin on every side, room above for external copy",
  "tone": "minimal, calm, premium",
  "guardrails": "preserve the logo and package exactly, no extra text, no distorted labels, no new labels"
 },
 "assets": [
  {"id": "pdp-grey", "kind": "still", "model": "fal-ai/nano-banana-pro/edit", "ratio": "1:1",
   "axis": {"background": "pale grey"}, "copy": "safe-space", "copy_box": {"x": 0.1, "y": 0.02, "w": 0.8, "h": 0.1},
   "refs": ["source/packshot.png"], "label": "composite", "summary": "PDP main, grey sweep"},
  {"id": "pdp-sand", "kind": "still", "model": "fal-ai/nano-banana-pro/edit", "ratio": "1:1",
   "axis": {"background": "sand"}, "layers": {"setting": "on a seamless warm sand sweep, no props"},
   "copy": "safe-space", "label": "composite", "summary": "PDP variant, sand sweep"},
  {"id": "reveal", "kind": "video", "model": "bytedance/seedance-2.0/image-to-video", "from_still": "pdp-grey",
   "duration": "5", "layers": {"role": "product reveal clip", "camera": "slow 20 degree orbit to the right, then hold"},
   "label": "not legible",
   "summary": "5 s reveal from the PDP still"}
 ],
 "defects": []
}
```

- `source` paths are relative to `artifacts/<project>/`. `fidelity` defaults to true when a source is
  held; set it false only with the brief's reason (exploration of a product that does not exist yet).
- `copy`: `safe-space` (default: clean space kept for copy added outside the model), `none`, or
  `exact` (the model renders `copy_text`; needs `waiver`, see SKILL.md step 6).
- `label` (HR10, SKILL.md step 3): `composite` (default for a still with a held packshot: the
  packshot's cut-out product is composited over the generated one), `waiver` (the model's redraw
  ships on the brief's words in `waiver`; the only choice besides `not legible` for a clip), or
  `not legible` (the label is kept out of legible view).
- `label` applies to an asset that uses the packshot: a still on an edit route, or a clip made from
  one. A clip's default is `not legible`: compose it with the label out of view (product turned away
  or soft focus), because Seedance redraws a composited label; `waiver` only on the brief's words. An
  exploration still with no packshot parent needs no `label`.
- `refs` (optional) lists the `source` files sent with `--ref`, in `@Image1`, `@Image2` order, each
  one in `source`. `copy_box` (optional) is the copy area as fractions of the frame, derived from the
  layer-6 margins; `python3 $SH box` turns it into pixels. `fallback: "none"` says the still has no
  fallback route. `extra_params` holds fields pinned from `ai-gen info` and the raw OpenAPI for a
  route the script does not know (required for Grok Imagine). `deliver` names the attempt number
  to deliver when it is not the last accepted one.
- Per asset, `defects` (a list of plain lines) is filled at step 9 and printed by `report`.
- A video asset takes `from_still` (an approved still in the same plan) unless `exploration` is
  true; Seedance `duration` is a string `"4"` to `"15"`, Grok Imagine an integer 1 to 15.

## The eight layers

fal's prompt order, kept as written (fal commercial skill, used with attribution):

1. Product invariant: object, material, packaging, scale, logo rules.
2. Commercial role: hero, PDP, launch teaser, social ad, demo.
3. Setting: surface, background, props, environment.
4. Lighting: softbox, strip light, rim light, practicals, caustics.
5. Camera: angle, focal-length feel, macro, depth of field, motion.
6. Composition: safe zones, crop, negative space, platform.
7. Brand tone.
8. Guardrails: preserve logo/package, no extra text, no distorted labels.

`prompt` joins the layers in this order, one sentence each. On a Nano Banana route, phrase the
guardrails positively where you can ("the label exactly as in the reference"): known result (facts
`beh-gemini-negation`, 2026-06), negation can misfire on Gemini image models, and Google's own guides
make this weaker; keep the three guardrail ideas either way.

## Batch rules

- One skeleton; at most one variant may be the skeleton itself (no layer moved); every other variant
  names one `axis`, must override that axis's layer with different text (a `platform` variant must
  change the ratio), and no two variants share an axis value. Each variant names one `axis`: `background` (moves layer 3), `crop` (layer 6),
  `lighting` (layer 4), `platform` (layer 6, and the ratio) or `colour` (layer 7, the colour
  treatment).
- The invariant and the guardrails never change inside a plan. The ratio changes only on a crop or
  platform variant.
- Put the axis and value in the asset `id` (`pdp-bg-sand`): `-o` is a directory (`artifacts/<project>/<id>/`)
  and ai-gen names the file. Never rename a downloaded file before `manifest.mjs add`, which takes
  the path from the result envelope; a delivery name is a copy made after `add`, with its own `tool` row.
- GPT Image sizes for 4:5 (1536x1920) and 9:16 (1152x2048) are multiples of 16 but not confirmed
  against the schema's pixel limits: read the raw OpenAPI before the first submit at those ratios (HR2).

## What check refuses

Missing project, invariant or any skeleton layer; an invariant of more than one sentence or chained
with a semicolon; guardrails without the logo, text and label ideas, or a logo idea that does not
preserve it; an edit-route still whose ratio is missing from the Nano Banana or the GPT Image table
(unless `fallback` is "none"); a Grok Imagine clip with no `extra_params`; a `refs` entry outside
`source`; a malformed `copy_box`; a held source with a text-to-image route while fidelity is
true; an edit route with no source; exact copy without the wording, a GPT Image route or a waiver; a
batch variant that moves more than its axis's layer, moves none while another also moves none, repeats
an axis value, or is a platform variant with an unchanged ratio; a reveal with no approved still; a Seedance
duration that is not a bare-integer string, or a ratio Seedance does not have (no 4:5: make the still
and the clip at 1:1 or 3:4 and say so).

## Called from marketing-campaign-pack

A campaign row handed here (product rows, fal's "marketing plans; the domain skills execute") keeps
the caller's choices and fills the eight layers from its seven:

| Campaign layer | Here |
|---|---|
| 1 role and channel | layer 2 role; the channel's ratio is the asset's `ratio` |
| 2 product invariant | layer 1, unchanged |
| 3 audience context | layer 3 setting (props and environment) |
| 4 shared visual system | layers 4, 5 and 7, the same text for every row of the campaign |
| 5 copy handling | `copy`, and layer 6 composition (the safe space) |
| 6 variation axis | `axis` |
| 7 guardrails | layer 8, plus the brand's taboo visuals and competitors |

The plan lives in the caller's project (`artifacts/<project>/shoot/shoot.json`), the asset `id` is
the matrix row id, the files go to `artifacts/<project>/<id>/`, and the rows go in the caller's
manifest. The caller's priced matrix is the budget: quote again here, and stop at a gate if the quote
is above the row's price. Return the `report` rows; the caller copies endpoint, request id, files and
defects into its own manifest.
