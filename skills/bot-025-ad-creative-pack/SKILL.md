---
name: bot-025-ad-creative-pack
description: Turn a product photo plus feature bullets plus a brand kit into a pack of listing and ad creatives with READABLE on-image text — a benefit/feature graphic, an us-vs-alternative comparison chart, Amazon A+/EBC modules, and per-channel sized social ad variants (Meta 1:1 and 4:5, TikTok 9:16). Text is the deliverable, so the load-bearing rule is routing — every text-bearing surface goes to a text-specialist model (ideogram/v4 for headlines, fal-ai/recraft v3/v4 for palette-locked charts and editable SVG, fal-ai/nano-banana-pro for text-in-rich-scene); FLUX and Seedream are HARD-BLOCKED for embedded text because they garble it. Per-channel sizing is DETERMINISTIC (Pillow crop/pad from one master). Every final creative routes through the compliance-guard for the Meta AI-label mandate plus C2PA; the bot never auto-publishes. Use it to make benefit graphics, comparison charts, Amazon A+ modules, or sized Meta/TikTok ad variants from a product photo and bullets.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-025
  inputs:
    - name: product-photo
      type: image
      required: true
      description: artifacts/<project>/inputs/hero.<jpg|png> — a clean product photo (ideally the BOT-022-style compliant hero). Used as the --image source for any text-in-scene composite and as the fidelity ground-truth for product-bearing surfaces. Pure-text surfaces (a headline on a plain canvas) do not require it but it strengthens them.
    - name: bullets
      type: text
      required: true
      description: The product's feature bullets / selling points (from context.md or the prompt). The bot writes the on-image copy (headline + feature labels + comparison rows) FROM these — short, punchy, correctly spelled. Without bullets there is no text to render.
    - name: brand-kit
      type: text
      required: false
      description: Brand palette (hex), font name, and logo path (artifacts/<project>/inputs/logo.png), e.g. via a brand.json. Drives brand-kit.py — the Recraft colors= palette lock + the prepended brand clause + the logo --ref. Default — neutral clean palette, a generic sans-serif, no logo; the partial-lock note is recorded.
    - name: surfaces
      type: text
      required: false
      description: Which creatives to produce — any of benefit-graphic, comparison-chart, aplus-module, social-variants. Default all four. Each text-bearing surface is routed per references/text-routing.md.
    - name: channels
      type: text
      required: false
      description: Which social channels to size for — any of meta-1-1, meta-4-5, tiktok-9-16 (plus aplus-std, aplus-ovl for Amazon). Default meta-1-1,meta-4-5,tiktok-9-16. Sizing is deterministic via resize-variants.py.
  outputs:
    - name: benefit-graphic
      type: image
      path: artifacts/<project>/01-benefit/benefit-graphic.png
      description: A clean benefit/feature graphic — one legible headline plus 3-4 feature callouts — rendered by ideogram/v4 (best text). The master other variants resize from. Passes the text-legibility check (every word spelled, readable at thumbnail).
    - name: comparison-chart
      type: image
      path: artifacts/<project>/02-comparison/comparison-chart.png
      description: An us-vs-alternative feature grid with checks/x-marks, palette-locked via Recraft colors=. Readable column labels, brand-consistent palette.
    - name: aplus-modules
      type: image
      path: artifacts/<project>/03-aplus/NN-<module>.jpg
      description: Amazon A+/EBC modules sized to the hard spec (970x600 standard image+text, 970x300 overlay), RGB sRGB, under 2MB, with text kept well inside the frame. Handed to compliance-guard for the A+ spec check.
    - name: social-variants
      type: image
      path: artifacts/<project>/04-variants/<channel>.jpg
      description: Per-channel sized ad creatives (meta-1-1 1080x1080, meta-4-5 1080x1350, tiktok-9-16 1080x1920) produced DETERMINISTICALLY by Pillow crop/pad from the master — the exact text preserved, no per-channel regeneration.
    - name: legibility-qc
      type: markdown
      path: artifacts/<project>/qc.md
      description: Per-surface verdict — text legibility (every word spelled + readable), brand consistency (palette/font/logo applied), on-channel sizing, no-AI-slop, and (for product-bearing surfaces) the blocking product-fidelity compare. Drift/garble is dropped or flagged, never silently shipped.
---

# Ad-Creative Pack — legible-text listing & ad graphics (BOT-025)

Turn one product photo + feature bullets + a brand kit into a **pack of conversion
graphics with readable on-image text**: a benefit/feature graphic, an us-vs-alternative
comparison chart, Amazon A+/EBC modules, and per-channel sized social ad variants (Meta
1:1 & 4:5, TikTok 9:16). **Text is the deliverable, not decoration** — so the whole skill
is organized around one rule: route every text surface to a model that can spell, size
deterministically, and never auto-publish.

This skill runs **headless**. Never ask the user anything: every optional input has a
default below; a missing required input (bullets) is a clean recorded failure, not a
question.

## The architecture (read this first — it is load-bearing)

Three disciplines, in priority order:

1. **Text routing is a HARD gate** (`references/text-routing.md`). Every text-bearing
   surface goes to a text-specialist model — `ideogram/v4` (headlines, best OCR),
   `fal-ai/recraft/v3/text-to-image` (palette-locked charts via `colors=`),
   `fal-ai/recraft/v4/text-to-vector` (editable SVG), `fal-ai/nano-banana-pro`
   (text-in-rich-scene + localization). **FLUX and Seedream are NEVER used for embedded
   text — they garble it** (KB §Known Limitations). `gen-graphic.sh` refuses those slugs
   mechanically (exit 2).
2. **Per-channel sizing is DETERMINISTIC** (`scripts/resize-variants.py`). Generate ONE
   master per surface, then Pillow crops/pads it to the exact channel canvases. Never
   re-generate per channel — that re-imagines the text and wastes credits. This is the
   highest-ROI, lowest-risk part of the bot.
3. **Every final creative routes through `bot-022-compliance-guard`**
   (`references/compliance-note.md`). The outputs are AI-generated, so the Meta 2026
   AI-label mandate requires an AI disclosure + C2PA on every Meta-bound creative, or it
   is auto-rejected. The bot is a checker/generator — it **never auto-publishes**.

And the fidelity rule inherited from the persona: a surface that contains the seller's
REAL product (a nano-banana-pro composite) has **no hard fidelity lock** in the reachable
models (the BOT-022 PoC: a mug became a luggage tag), so it passes a **blocking
product-fidelity compare** before it ships. Pure-text surfaces on a plain canvas skip the
product check but still pass the **text-legibility** check.

## When to use

A project's `01-benefit` / `02-comparison` / `03-aplus` / `04-variants` phases. Also
invoked directly when asked to "make a benefit graphic / feature graphic", "build a
comparison chart", "make Amazon A+ modules", or "size this for Meta / TikTok / give me
1:1, 4:5, and 9:16 ad variants".

## Read first (READ-BEFORE-WRITE)

Read, in this order:

1. `artifacts/<project>/context.md` — product truth (name, bullets, brand kit, channels).
   Optional; defaults below if absent.
2. `artifacts/<project>/inputs/` — the optional `hero.<jpg|png>` (used as `--image` for
   composites + the fidelity anchor) and optional `logo.png` + `brand.json`.

**Required-input gate** (record, don't ask):

- No feature bullets anywhere (context.md or the prompt) → write a failure note in
  `state.md` (`status: blocked`, `next_action: re-run onboarding — feature bullets
  missing`) and stop. There is no text to render without bullets.

**Defaults for optional inputs:** brand kit = neutral clean palette + generic sans-serif
+ no logo (record the partial-lock note); surfaces = all four; channels =
`meta-1-1,meta-4-5,tiktok-9-16`; the product photo strengthens but is not required for
pure-text surfaces.

## Step 0 — Reachability + brand kit

Confirm the text models are reachable (attempt the run regardless — the reachability
gate is a check, not a switch), and resolve the brand kit once:

```bash
ai-gen info ideogram/v4                       > work/info-ideogram.json   2>&1 || true
ai-gen info fal-ai/recraft/v3/text-to-image   > work/info-recraft-v3.json 2>&1 || true
ai-gen info fal-ai/recraft/v4/text-to-vector  > work/info-recraft-v4.json 2>&1 || true
ai-gen info fal-ai/nano-banana-pro            > work/info-nbp.json        2>&1 || true
ai-gen balance                                > work/balance-before.txt

# Resolve the brand kit -> colors= param + brand clause + logo --ref
scripts/brand-kit.py resolve artifacts/<project>/inputs/brand.json work/brand-lock.json
```

The single biggest build risk is `ideogram/v4` resolving live (KB recorded
`fal-ai/ideogram/v3` "Application not found" in April 2026). Fallback chain for a headline
surface: `ideogram/v4` → `fal-ai/recraft/v3/text-to-image` → `fal-ai/nano-banana-pro`.
**Never fall back to FLUX/Seedream for text.** Read cost from `ai-gen balance` deltas,
never the `credits_used` JSON (`references/text-routing.md` §3).

## Step 1 — Benefit / feature graphic (master) → ideogram/v4

Write the headline + 3-4 feature labels FROM the bullets (short, spelled), prepend the
brand clause from `work/brand-lock.json`, and generate the master with the
layout-structured prompt (`references/ad-templates.md` §1):

```bash
scripts/gen-graphic.sh -m ideogram/v4 \
  -o artifacts/<project>/01-benefit/benefit-graphic.png \
  -t "<brand clause> <benefit-graphic prompt from ad-templates.md §1>" \
  -s portrait_4_3 rendering_speed=QUALITY -c 40
```

`gen-graphic.sh` writes the PNG (from `files[0].local_path`), the raw JSON, and the exact
prompt (provenance). It REFUSES a FLUX/Seedream slug. Then run the **text-legibility
check** (Step 5).

## Step 2 — Comparison chart → recraft v3 (palette-locked)

Use the Recraft `colors=` lock from the brand kit so the chart stays on-brand
(`references/ad-templates.md` §2):

```bash
scripts/gen-graphic.sh -m fal-ai/recraft/v3/text-to-image \
  -o artifacts/<project>/02-comparison/comparison-chart.png \
  -t "<brand clause> <comparison-chart prompt>" \
  -s square_hd style=digital_illustration "$(jq -r .colors_param work/brand-lock.json)" -c 40
```

For an editable SVG variant, re-run on `fal-ai/recraft/v4/text-to-vector` (drop
`colors=`/`style=` if the slug rejects them — confirm at smoke-test). Then legibility check.

## Step 3 — Amazon A+ / EBC modules → ideogram/v4, then crop to spec

Generate the A+ master(s) at a generous canvas (route text to `ideogram/v4`, or `recraft
v3` if icon/palette-heavy), then crop to the A+ hard spec with `--mode contain` so text
is never clipped (`references/ad-templates.md` §3, `references/compliance-note.md` §2):

```bash
scripts/gen-graphic.sh -m ideogram/v4 \
  -o work/aplus-master.png -t "<brand clause> <A+ module prompt>" \
  -s square_hd rendering_speed=QUALITY -c 40

scripts/resize-variants.py work/aplus-master.png artifacts/<project>/03-aplus \
  aplus-std,aplus-ovl --mode contain --pad-color "#FFFFFF" --max-bytes 2097152 --prefix 01-
```

`resize-variants.py` enforces RGB sRGB + <2MB (steps JPEG quality down, flags over-size).
The 24px-min-font rule is verified in the legibility check.

## Step 4 — Social variants (DETERMINISTIC) → resize-variants.py

Pick the best text master (default the benefit graphic) and crop/pad to each channel —
no regeneration (`references/ad-templates.md` §5):

```bash
scripts/resize-variants.py artifacts/<project>/01-benefit/benefit-graphic.png \
  artifacts/<project>/04-variants \
  meta-1-1,meta-4-5,tiktok-9-16 --mode cover --max-bytes 2097152
```

Use `--mode contain` (pad on the brand/white color) when a `cover` crop would clip the
master's headline; `--mode cover` for full-bleed scenes. For a text-in-scene composite,
generate the master on `fal-ai/nano-banana-pro --image <hero>` first (the only route that
drops the REAL product into the scene) — and that master, being product-bearing, takes
the **blocking fidelity check** before it is resized.

## Step 5 — QC (blocking) — legibility + brand + fidelity

For each shipped surface, view the actual image and record a verdict in `qc.md`:

- **Text legibility** (every surface): every headline/label/cell word is correctly
  spelled and readable at thumbnail size. Garbled or invented text → **drop + flag**
  (re-generate, or fall back per the routing chain). NEVER ship a garbled text surface.
- **Brand consistency**: the palette/font/logo were actually applied (the brand clause was
  prepended; the logo stamped via `brand-kit.py stamp` if provided). Note the **partial
  lock** (palette enforced; font/composition prompt-level only).
- **On-channel sizing**: each variant matches its channel spec (read
  `04-variants/variants-manifest.json`); any over-2MB or wrong-aspect file is flagged.
- **No AI-slop**: non-template layout, real product where possible, no nonsense sub-text
  (`references/ad-templates.md` §6).
- **Product-fidelity (product-bearing surfaces only)**: compare the composite's product
  against the real hero on identity/color/shape/label. Drift → **blocking drop**.

Then hand the FINAL channel files to **`bot-022-compliance-guard`** with
`channels`/`jurisdictions`/`copy` for the Meta AI-label + C2PA + per-channel linter
(`references/compliance-note.md`). **Never auto-publish.**

## Outputs

This skill writes exactly these paths (`<project>` = the active product slug):

- `artifacts/<project>/01-benefit/benefit-graphic.png` — the benefit-graphic master.
- `artifacts/<project>/02-comparison/comparison-chart.png` — the palette-locked chart.
- `artifacts/<project>/03-aplus/NN-<module>.jpg` — A+ modules to spec (970×600 / 970×300).
- `artifacts/<project>/04-variants/<channel>.jpg` + `variants-manifest.json` — sized social variants.
- `artifacts/<project>/qc.md` — the per-surface legibility/brand/sizing/fidelity verdict.

Plus working files under `work/` (brand-lock.json, masters, raw generations, info/balance
JSON) — never under `artifacts/`.

## Update state.md (the ledger is how phases chain)

After the phase completes (or fails), update the project's `state.md` rows: mark `done`
(or `blocked` with the reason), refresh `updated`/`status`, and rewrite `next_action` to
the one imperative that is true now (e.g. "Benefit graphic + comparison + variants
shipped — run compliance-guard pre-flight" or "Re-run onboarding: feature bullets
missing"). Then do the Remember step per the bot's execution loop. Never stop with a stale
ledger.

## Failure modes (headless rules)

| Situation | Action |
|---|---|
| Feature bullets missing everywhere | Record failure in `state.md`, stop. No text to render. |
| A text slug requested is FLUX/Seedream | `gen-graphic.sh` REFUSES (exit 2) — re-route to a text-capable model. |
| `ideogram/v4` unreachable | Fall back: recraft v3 → nano-banana-pro (never FLUX/Seedream). If all text engines down → `blocked`. |
| Generated text is garbled / misspelled | Legibility check DROPS it + flags; re-generate or fall back. Never ship garbled text. |
| Product-bearing composite drifts from the hero | Blocking fidelity drop + flag; ship the clean surfaces. |
| A+ module text looks under-24px at 970px | Flag for human review (the spec's judgment part); resizer handles size/RGB/bytes. |
| A variant exceeds 2MB after max compression | `resize-variants.py` writes it + flags `under_max=false`; report it. |
| Brand kit absent / logo file missing | Use the neutral default + record the partial-lock + missing-logo flag; never invent a logo. |
| fal output URL expired | Always use `files[0].local_path` (the saved local file); never re-fetch `*.fal.media`. |

## References

- `references/text-routing.md` — the HARD routing rule (which model for which surface),
  the no-FLUX/Seedream block, the verified ai-gen syntax contract (positional `key=value`
  params, `--image`/`--ref`, `files[0].local_path`, ignore `credits_used`), the
  reachability gate + `ideogram/v4` fallback chain.
- `references/ad-templates.md` — the prompt skeletons for benefit-graphic / comparison-
  chart / A+ module / text-in-scene, the master→variants flow, the anti-AI-slop checklist.
- `references/compliance-note.md` — the Meta 2026 AI-label mandate, the Amazon A+ hard
  spec, and the per-channel handoff to `bot-022-compliance-guard`. Read this for the
  *why* of the pre-flight.
