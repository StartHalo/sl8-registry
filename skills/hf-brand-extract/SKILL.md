---
name: hf-brand-extract
description: Extract a brand kit from a website URL (or a brand screenshot) and write it into a project's context.md — accent + alt color, a font pack, a short brand label, and a transparent logo cutout. Uses hyperframes capture for design tokens/fonts/colors and ai-gen bria for the logo background removal. Use as an OPTIONAL onboarding asset, before or alongside onboarding, when the user gives a brand URL/site/screenshot or asks to "use my brand", "pull our colors and logo", "match our site", or "brand this from a URL". Local capture + keyless ai-gen; no HeyGen cloud/auth.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [onboarding]
  inputs:
    - name: brand-source
      type: text
      required: true
      description: A brand website URL (e.g. https://acme.com) OR a path to a brand screenshot/logo image. The thing the kit is derived from.
    - name: project
      type: text
      required: false
      description: The active project slug (the artifacts/<project-name>/ folder). Default = the active project in state.md, else a slug derived from the brand domain.
    - name: font-pack-hint
      type: text
      required: false
      description: modern | editorial | bold | tech — override the auto-mapped font pack. Default = mapped from the captured fonts, else modern.
  outputs:
    - name: brand-block
      type: markdown
      path: artifacts/<project-name>/context.md
      description: A "## Brand" section appended/merged into context.md — accent (hex), accentAlt (hex), fontPack, label, and the logo cutout path. Read by every later phase (concept, build) and graded by the rubric's brand-application dimension.
    - name: logo-cutout
      type: png
      path: artifacts/<project-name>/assets/cutouts/logo.png
      description: The brand logo with its background removed (transparent PNG) via ai-gen bria, for use as a composition asset.
    - name: capture
      type: json
      path: artifacts/<project-name>/assets/captures/brand-capture.json
      description: The raw hyperframes capture output (design tokens, fonts, palette, screenshot paths) the brand block was derived from — kept for provenance.
---

# hf-brand-extract — site/screenshot → brand block in context.md

## Purpose
Turn a brand URL or screenshot into the small **brand block** the rest of Motion Studio reads: an
**accent** + **accentAlt** color, a **font pack**, a short **label**, and a transparent **logo cutout**.
It is the *optional* onboarding asset — `onboarding` collects the brand kit by asking; this skill derives
it from the brand's own site instead, so the captured palette/fonts/logo flow straight into
`01-concept.md` (concept) and `composition/` (build). Capture is local (headless Chrome); the logo
cutout uses **ai-gen** `bria` (keyless SL8 proxy, ~1 credit). **No HeyGen cloud/auth.**

`$SKILL` = this skill's directory. The two scripts (`capture.sh`, `bg-remove.sh`) reuse the
capture + background-removal pattern (the same pair `hf-assets` uses).

## When to use
- During onboarding (phase 0), when the user supplies a brand **URL/site** or a **brand
  screenshot/logo** and wants the video on-brand — run this to seed `context.md`'s brand block.
- Triggers: "use my brand", "pull our colors/fonts/logo", "match our site", "brand this from <url>".
- Do NOT use to build or render a composition (that is `hf-build`/`hf-render`), or to fetch
  in-video media cutouts/captures for a specific scene (that is `hf-assets`).

## Inputs
- `brand-source` (required) — a URL or an image path. If neither resolves (no `composition`-style
  artifact, the URL is unreachable, the file is missing), this is a **clean failure**: record it in
  `artifacts/<project-name>/state.md` and stop. Onboarding can still proceed with a neutral kit; do
  NOT invent a palette or a logo. **Never prompt the user** in a headless run.
- `project` (optional) — the active project slug. Default: the active project in `state.md`; if there is
  no project yet, derive a slug from the brand domain (e.g. `acme.com` → `acme`) and create
  `artifacts/<slug>/`.
- `font-pack-hint` (optional) — force the font pack. Default: mapped from the captured fonts (see the
  mapping table below), else `modern`.

## Instructions

### 1. Resolve the project + the source
- Read `state.md` for the active project slug; else derive one from the brand domain. Ensure
  `artifacts/<project-name>/assets/captures/` and `artifacts/<project-name>/assets/cutouts/` exist.
- Decide the **source mode**: a `http(s)://…` value → **URL mode** (capture the site); an image path →
  **screenshot mode** (skip capture; read colors/fonts from the image + run bria on the logo).

### 2. Capture the brand (URL mode)
```bash
bash "$SKILL/scripts/capture.sh" "<brand-source>" artifacts/<project-name>/assets/captures
```
`capture.sh` runs `hyperframes capture <url>` into `assets/captures/`, then normalizes whatever it
produced (tokens / `design.json` / a screenshot) into **`brand-capture.json`** with a stable shape:
```json
{ "source": "<url>", "colors": ["#0B1F3A", "#2D7FF9", "#F5F7FA"], "fonts": ["Inter", "Fraunces"],
  "screenshots": ["assets/captures/<file>.png"], "label": "Acme" }
```
If `hyperframes capture` is unavailable or the URL is unreachable, the script writes a `brand-capture.json`
with `"error"` set and exits non-zero — treat that as the clean failure in step 1 (no fabricated values).

**Screenshot mode:** skip `capture.sh`. Open the image (Read it) and pull the dominant brand colors and
the visible typeface(s) by eye; write the same `brand-capture.json` yourself (set `"source"` to the image
path and `"screenshots"` to `[<image-path>]`). Use the logo region of the image as the bria input in step 4.

### 3. Choose the brand fields (from the capture)
From `brand-capture.json`, pick:
- **accent** — the most saturated, brand-defining color (a logo/CTA color, not body grey/near-black/
  near-white). **accentAlt** — a second supporting brand color, else a darker/lighter shade of the accent.
  Keep both as 6-digit hex.
- **label** — the brand/company name (capture `label`, else the site `<title>`/domain, ≤ ~16 chars).
- **fontPack** — map the captured fonts to one of the four packs (the literal families the runtime has —
  see `hf-build/references/composition-contract.md`). `font-pack-hint` overrides:

  | captured font feel | fontPack | runtime families |
  |---|---|---|
  | clean geometric sans (Inter, Helvetica, system sans) | `modern` | Inter + Fraunces + Outfit |
  | serif / editorial (Georgia, Playfair, any serif headline) | `editorial` | Fraunces + Inter |
  | heavy display / condensed (Anton, Bebas, all-caps headlines) | `bold` | Anton + Inter |
  | technical / mono-ish geometric (Space Grotesk, IBM Plex) | `tech` | Space Grotesk + Inter |

  Never emit a font family the runtime lacks (`Inter, Outfit, Anton, Fraunces, Space Grotesk` + DejaVu/
  Comic-Neue) — the build's lint can't resolve `var()` and a CDN font isn't render-safe.

### 4. Cut out the logo (ai-gen bria)
Locate the logo: in URL mode use the captured logo screenshot (or the favicon/og-image the capture saved);
in screenshot mode use the logo crop. Then:
```bash
bash "$SKILL/scripts/bg-remove.sh" "<logo-image>" artifacts/<project-name>/assets/cutouts/logo.png
```
`bg-remove.sh` runs `ai-gen run fal-ai/bria/background/remove --image <logo-image>`, parses the v2 JSON
(`success`, `files[].local_path`), and copies the matte to `assets/cutouts/logo.png`. On `success:false`,
an unreachable proxy, or no logo found, it exits non-zero — **omit** the logo line from the brand block and
note "no logo cutout" (don't fail the whole brand extract over a missing logo).

### 5. Write the brand block into context.md
Append (or merge — replace an existing `## Brand` section, never duplicate) this block to
`artifacts/<project-name>/context.md`:
```markdown
## Brand
- accent: #2D7FF9
- accentAlt: #0B1F3A
- fontPack: modern
- label: Acme
- logo: assets/cutouts/logo.png        <!-- omit this line if no cutout was produced -->
- source: https://acme.com (captured 2026-06-18) — see assets/captures/brand-capture.json
```
These are the exact keys `onboarding` / `hf-concept` / `hf-build` expect (matches the BOT-014 brand-kit
keys: `accent`, `accentAlt`, `fontPack`, `label`). Keep it to these fields — no prose palette story.

### 6. Report (state what was derived vs defaulted)
Tell the user the resolved brand fields — accent + accentAlt (hex), fontPack, label, whether a logo cutout
was produced — and note any fallback (e.g. "capture returned no second color → accentAlt derived as a
darker accent shade"; "bria failed → no logo cutout, used label chip only"). Update `state.md` (brand
block written / failed) and remember. This skill does not advance the phase chain itself — onboarding /
`hf-studio` continues to phase 1 (concept).

## Outputs
- `artifacts/<project-name>/context.md` — a `## Brand` section: `accent`, `accentAlt`, `fontPack`,
  `label`, `logo` (path), `source`. Read by concept + build; graded by the rubric.
- `artifacts/<project-name>/assets/cutouts/logo.png` — the transparent logo cutout (bria), if produced.
- `artifacts/<project-name>/assets/captures/brand-capture.json` — the normalized capture (tokens, fonts,
  colors, screenshots) the block was derived from, for provenance.

## Examples

### Example 1: brand from a URL
User: "Make a 15s teaser for our launch — brand it from https://acme.com". Run `capture.sh acme.com …` →
`brand-capture.json` (`colors:[#2D7FF9,#0B1F3A,#F5F7FA]`, `fonts:[Inter]`) → accent `#2D7FF9`, accentAlt
`#0B1F3A`, fontPack `modern`, label `Acme` → `bg-remove.sh <logo>` → `assets/cutouts/logo.png` → write the
`## Brand` block to `context.md` → report. Concept/build then read it; no further prompts.

### Example 2: brand from a screenshot
User pastes a brand screenshot. No URL → screenshot mode: Read the image, pull accent `#E0245E` + a dark
neutral by eye, see an editorial serif → fontPack `editorial`, label from the wordmark; `bg-remove.sh`
on the logo crop → cutout. Same `## Brand` block written to `context.md`.

## Troubleshooting
- **`hyperframes capture` unavailable / URL unreachable** → `capture.sh` exits non-zero with an `error`
  in `brand-capture.json`. Record the failure in `state.md`; let onboarding proceed with a neutral kit.
  Do NOT invent colors/fonts. (Reachability gate: attempt pass-through; unreachable → stop & report.)
- **bria `success:false` / no logo found** → `bg-remove.sh` exits non-zero. Omit the `logo:` line; the
  brand still has accent + fontPack + label. Don't fail the extract.
- **Captured a font the runtime lacks** → map it to the nearest of the four packs (table in step 3); never
  write a non-runtime family into the brand block.
- **Existing `## Brand` section** → replace it in place (merge), don't append a duplicate.

## Quality Criteria
- [ ] `context.md` has a `## Brand` section with `accent` (6-digit hex), `accentAlt` (hex), `fontPack`
      (one of modern/editorial/bold/tech), and a `label` — the exact keys concept/build read.
- [ ] The brand fields are **derived from the capture**, not invented; colors are real brand colors (not
      body grey / pure black / pure white); the font pack is a runtime-supported family set.
- [ ] A transparent `assets/cutouts/logo.png` exists when a logo was found (else the `logo:` line is
      omitted and the omission is noted) — bria, not a model that needs HeyGen auth.
- [ ] `brand-capture.json` records the source + tokens for provenance; an unreachable source is a clean,
      reported failure (recorded in `state.md`), never a fabricated kit.
