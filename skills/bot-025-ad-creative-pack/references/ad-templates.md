# Ad templates — prompt patterns for each creative surface

These are the prompt skeletons the bot fills from the seller's product photo + feature
bullets + brand kit. Each pattern names its **route** (which model from
`text-routing.md`), the **canvas** it should be generated at (the master), and the
**brand clause** (`brand-kit.py` emits this — prepend it). The bullets come from the
user; the bot writes the copy (headline + labels) from those bullets — short, punchy,
correctly spelled. Keep on-image words few: legibility falls off fast past ~7 words in a
headline and ~3-4 words per feature label.

The two VERBATIM practitioner prompts the deep-dive anchors on (proof of the patterns):

```
Product packaging mockup of a small kraft paper coffee bag standing upright on a wooden
surface, custom label with bold serif brand name NORTH ROAST centered, mountain
illustration in deep amber, soft window light, branding mockup style
```
```
Create infographic showing 3-4 key product features with callout text, arrows, and
benefit descriptions. Clean, professional design.
```

## 1 · Benefit / feature graphic  →  ideogram/v4

The hero surface: one big headline + 3-4 feature callouts on a clean canvas. Route to
**ideogram/v4** (best text). Generate at the channel's master aspect (default
`portrait_4_3` for a 4:5 master, or `square_hd` for 1:1). Use a LAYOUT-STRUCTURED
prompt so the headline + sub-labels land in fixed regions.

```
<brand clause>
Bold clean ecommerce benefit graphic for <PRODUCT>. Large headline at top: "<HEADLINE,
<=6 words>". Three feature labels each with a simple icon, evenly spaced:
"<LABEL 1>", "<LABEL 2>", "<LABEL 3>". <PALETTE> accents on a clean white background,
sans-serif, high legibility, balanced layout, generous spacing, no spelling errors,
no garbled text, no watermark.
```
Params: `rendering_speed=QUALITY` for the final (use `BALANCED` for cheap drafts).

## 2 · Comparison chart  →  fal-ai/recraft/v3/text-to-image  (+ colors= lock)

Us-vs-alternative feature grid with checkmarks / x-marks. Route to **recraft v3** so the
`colors=` array locks the brand palette and `style=` keeps it on-brand. Generate at
`square_hd` (1:1 master) or the chart's natural aspect.

```
<brand clause>
Minimal product comparison chart: "<OUR PRODUCT>" vs "Generic alternative". <N> feature
rows, each a short label on the left with a green check for ours and a grey x for the
alternative: "<FEATURE 1>", "<FEATURE 2>", "<FEATURE 3>", "<FEATURE 4>", "<FEATURE 5>".
Clean header row, readable column labels, brand-consistent palette, lots of whitespace,
crisp legible type, no spelling errors.
```
Params: `style=digital_illustration colors='[{"r":..,"g":..,"b":..}, ...]'` (from
`brand-kit.py`). For an editable vector version, re-run on
`fal-ai/recraft/v4/text-to-vector` (drop `colors=`/`style=` if the slug rejects them —
confirm at smoke-test).

## 3 · Amazon A+ / EBC module  →  ideogram/v4 (text) or recraft v3 (palette)

Amazon A+ modules carry callout text against the hard spec (see `references/
compliance-note.md` for the numbers). Two common modules:

- **Standard image+text (970×600)** — feature image with a headline + body callouts.
- **Text overlay (970×300)** — a banner strip of brand copy.

Generate the MASTER at a generous size (e.g. `square_hd` or `portrait_4_3`) then crop to
970×600 / 970×300 with `resize-variants.py --mode contain` (so the text is never
clipped). Route the text to **ideogram/v4**; if the module is icon/palette-heavy use
**recraft v3** with the `colors=` lock.

```
<brand clause>
Amazon A+ feature module for <PRODUCT>. Headline: "<HEADLINE>". Show 3-4 key features as
labelled callouts with small icons and one-line benefit descriptions: "<FEATURE+BENEFIT
1>", "<FEATURE+BENEFIT 2>", "<FEATURE+BENEFIT 3>". Clean professional design, brand
palette, large readable type (this will be cropped to 970x600 — keep all text well
inside the frame, min 24px equivalent), white or light background, no watermark.
```
A+ hard rule baked into the prompt: **keep all text well inside the frame** (Amazon's
24px min font + RGB-only + <2MB is enforced downstream by `resize-variants.py
--max-bytes 2097152` + the compliance-guard A+ spec check).

## 4 · Text-in-scene composite (optional)  →  fal-ai/nano-banana-pro

When the creative needs the REAL product photographed in a scene WITH on-image copy
(e.g. a promo banner), drop the hero in via `--image` and let nano-banana-pro render the
copy + (optionally) a localized second language in one call.

```
<brand clause>
Place this product into a clean, on-brand ad scene. Add headline text "<HEADLINE>" in
the upper-left third; keep the product's color, shape, and label EXACTLY as in the
reference; leave the lower-right corner clear for the logo. Also render the same headline
in <LANGUAGE>: "<HEADLINE_TRANSLATED>". Crisp legible type, no spelling errors.
```
Run: `-m fal-ai/nano-banana-pro --image <hero> --ref <logo> resolution=2K --aspect-ratio
<channel>`. **Product-bearing → blocking fidelity check** (see `text-routing.md` §5):
compare the scene's product vs the real hero; DROP/FLAG drift.

## 5 · The master → variants flow (do this, not per-channel regeneration)

Generate ONE master per surface at a generous canvas, THEN
`resize-variants.py master.png 03-variants meta-1-1,meta-4-5,tiktok-9-16` to produce the
sized channel files. Re-generating per channel re-imagines the text and wastes credits;
deterministic resizing preserves the exact text the model already spelled correctly.
Use `--mode contain` when the master's text would be clipped by a `cover` crop (A+
strips, wide headlines); `--mode cover` when the master is a full-bleed scene.

## 6 · Anti-AI-slop checklist (legibility + non-template, both required)

The WeShop ROI index: unlabeled, template-y AI converts BELOW real photos. Variation is
required, not optional. Before shipping a surface, confirm:

- The HEADLINE and every LABEL is correctly spelled and readable at thumbnail size.
- The layout is not the generic centered-icon-row AI-slop template — vary composition,
  use the brand palette + the real product hero where possible.
- No garbled/duplicated letterforms, no nonsense sub-text the model invented.
- Brand palette + font actually applied (the brand clause was prepended).
- A product-bearing surface passed the fidelity check; a pure-text surface passed the
  legibility check.
