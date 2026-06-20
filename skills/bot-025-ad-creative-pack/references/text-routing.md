# Text routing — the load-bearing rule of this bot

Text is the deliverable, not decoration. The single rule that makes this bot work is:
**every surface that carries readable on-image text is rendered by a text-specialist
model, and FLUX / Seedream are NEVER used for embedded text.** `gen-graphic.sh`
enforces the block mechanically (it refuses any slug matching `*flux*` / `*seedream*`),
but the routing intelligence is here.

## 1 · Why (the failure mode)

FLUX and Seedream garble subtitle / label / packaging text — they produce confident
gibberish where letters should be (KB §Known Limitations: "FLUX models may garble
subtitle/embedded text — avoid for text-heavy designs"). For a benefit graphic whose
whole value is a legible headline + feature labels, a garbled headline is a total
failure, not a blemish. Routing is therefore a hard gate, not a preference.

## 2 · The routing table (which model for which surface)

| Surface | Route to | Why |
|---|---|---|
| Headline / benefit graphic (big clean text on a plain canvas) | `ideogram/v4` | Best-in-class OCR (0.97 X-Omni English), native 2K, layout control, native transparency |
| Comparison chart / feature grid, palette-locked | `fal-ai/recraft/v3/text-to-image` | `colors=` array = brand-palette lock + `style=` enum; clean readable cells |
| Editable vector / SVG (logos, icon callouts, A+ icon rows) | `fal-ai/recraft/v4/text-to-vector` | The only model that emits true editable SVG with structured layers |
| Dense text IN a rich product scene + localization | `fal-ai/nano-banana-pro` | Renders dense on-image text in a composite + translates copy in one call; takes `--image` hero |
| Brand-styled raster headline (alt to Ideogram) | `fal-ai/recraft/v3/text-to-image` | Strong text + palette lock when the brand needs Recraft's look |
| ANY surface, on FLUX / Seedream | **REFUSED** | They garble embedded text — `gen-graphic.sh` exits 2 |

Default for a plain headline/benefit surface = **ideogram/v4**. Default for a
palette-locked chart = **recraft v3** (with `colors=` from `brand-kit.py`). Default for
a text-in-photo composite = **nano-banana-pro** (the only one that takes the real hero
via `--image` and keeps the product in-scene).

## 3 · The verified ai-gen syntax contract (2026-06-20 — use EXACTLY, do not re-flag as unverified)

ai-gen 2.1.0 runs in the sandbox. The forms this skill uses:

```bash
# Ideogram headline / benefit graphic (text-to-image)
ai-gen image "<layout-structured prompt with the exact headline + labels>" \
  -m ideogram/v4 -s portrait_4_3 rendering_speed=QUALITY -o work/graphics --format json --max-cost 40

# Recraft palette-locked comparison chart (raster)
ai-gen image "<comparison chart prompt>" -m fal-ai/recraft/v3/text-to-image -s square_hd \
  style=digital_illustration colors='[{"r":27,"g":127,"b":92},{"r":17,"g":17,"b":17}]' \
  -o work/graphics --format json --max-cost 40

# Recraft editable SVG / vector
ai-gen image "<icon-row / vector callout prompt>" -m fal-ai/recraft/v4/text-to-vector \
  -o work/graphics --format json --max-cost 40

# Nano Banana Pro — drop the real hero into a scene + localized copy
ai-gen image "Place this product into a clean studio ad scene; add headline 'SUMMER SALE 20% OFF' \
top-left; keep product color and shape exact; also render the headline in Spanish 'REBAJA DE VERANO'." \
  -m fal-ai/nano-banana-pro --image artifacts/<project>/inputs/hero.png --aspect-ratio 16:9 \
  resolution=2K -o work/graphics --format json --max-cost 40
```

Hard rules (verified live — DO NOT re-flag as unverified):

- **Model params are POSITIONAL `key=value`** — `rendering_speed=QUALITY` (Ideogram:
  TURBO / BALANCED / QUALITY), `style=digital_illustration` + `colors=[...]` (Recraft),
  `resolution=2K` (nano-banana-pro: 1K / 2K / 4K). There is **NO** `--rendering-speed`,
  `--style`, `--colors`, or `--resolution` flag (they error).
- **`--image <path|url>` → the model's single `image_url`** (the source/edit input —
  used to drop the real hero into a nano-banana-pro scene). **`--ref <path|url>`** is
  multi-ref (repeatable) — used for the brand logo.
- **`colors=` is a JSON array of `{r,g,b}` objects** (Recraft's brand-palette lock).
  `brand-kit.py resolve` emits exactly this string as `colors_param`.
- Aspect via `-s/--size` presets (`square_hd`, `portrait_4_3`, …) OR `--aspect-ratio 1:1`.
- **Outputs:** read `files[0].local_path` from the `--format json` blob (entries are
  **objects**, not strings). The `*.fal.media` URL **expires** — use the local file
  immediately. Never `startswith("https://fal.media")` (rejects every real URL).
- **Cost:** ignore the `credits_used` JSON field (over-reports ~8.4×). Read cost from
  `ai-gen estimate <slug>` + `ai-gen balance` deltas; billing lags ~5 min. `--max-cost`
  (in credits) is a per-call guard.

## 4 · Reachability gate (attempt, don't gate the engine)

Confirm the slugs are live, but attempt the run regardless (the proxy has served models
`info` could not describe — KB reachability gate):

```bash
ai-gen info ideogram/v4                          > work/info-ideogram.json   2>&1 || true
ai-gen info fal-ai/recraft/v3/text-to-image      > work/info-recraft-v3.json 2>&1 || true
ai-gen info fal-ai/recraft/v4/text-to-vector     > work/info-recraft-v4.json 2>&1 || true
ai-gen info fal-ai/nano-banana-pro               > work/info-nbp.json        2>&1 || true
ai-gen balance                                   > work/balance-before.txt
```

The deep-dive's single biggest build risk is the **`ideogram/v4` slug resolving live**
(KB recorded `fal-ai/ideogram/v3` returning "Application not found" in April 2026).
Fallback chain if `ideogram/v4` fails on a headline surface, in order:

1. `fal-ai/recraft/v3/text-to-image` (strong text + palette lock) — the proven fallback.
2. `fal-ai/nano-banana-pro` (text-in-scene; takes the hero via `--image`).

NEVER fall back to FLUX / Seedream for a text surface. If every text engine is
unreachable, STOP and record `blocked` — do not ship a text surface from a garbling
model.

## 5 · The fidelity gate still applies to product-bearing surfaces

When a surface includes the seller's REAL product (a nano-banana-pro composite that
drops the hero into a scene), the reachable models have no hard fidelity lock (the
BOT-022 PoC: a mug became a luggage tag). So any product-bearing creative passes the
same blocking fidelity check before it ships — compare the output's product against the
real hero on identity / color / shape / label; DROP or FLAG drift. Pure-text surfaces
on a plain canvas (no real product pixels) skip the product-fidelity check but still get
the **text-legibility** check (every word spelled correctly, readable at thumbnail size).
