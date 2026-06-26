---
name: rm-brand-extract
description: "Extract a brand kit from a website URL (or a brand screenshot) and write it into a project's context.md — an accent + alt color, one of the four runtime font packs, a short brand label, and a transparent logo cutout. Captures the site with the runtime's headless Chrome Headless Shell + ffmpeg (NOT hyperframes) and removes the logo background with ai-gen bria (keyless SL8 proxy). Use as an OPTIONAL onboarding asset, before or alongside onboarding, when the user gives a brand URL/site/screenshot or asks to \"use my brand\", \"pull our colors and logo\", \"match our site\", \"brand this from a URL\". No rendering — this writes the brand block the concept/build phases read; rm-render renders. Local capture + keyless ai-gen; no auth, no cloud."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [onboarding, rm-assets]
  inputs:
    - name: brand-source
      type: text
      required: true
      description: "A brand website URL (e.g. https://acme.com) OR a path to a brand screenshot/logo image. The thing the kit is derived from."
    - name: project
      type: text
      required: false
      description: "The active project slug (the artifacts/[project]/ folder). Default = the active project in state.md, else a slug derived from the brand domain."
    - name: font-pack-hint
      type: text
      required: false
      description: "modern | editorial | bold | tech — override the auto-mapped font pack. Default = mapped from the captured fonts, else modern."
  outputs:
    - name: brand-block
      type: markdown
      path: artifacts/<project>/context.md
      description: "A \"## Brand\" section appended/merged into context.md — accent (hex), accentAlt (hex), fontPack (one of the four runtime packs), label, and the logo cutout path. Read by every later phase (concept, build) and graded by the rubric's brand-application dimension."
    - name: logo-cutout
      type: png
      path: artifacts/<project>/assets/cutouts/logo.png
      description: "The brand logo with its background removed (transparent PNG) via ai-gen bria, for use as a staticFile() composition asset."
    - name: capture
      type: json
      path: artifacts/<project>/assets/captures/brand-capture.json
      description: "The normalized capture (colors, fonts, screenshots, label) harvested from the headless-Chrome DOM/CSS (+ ffmpeg pixel fallback) the brand block was derived from — kept for provenance."
---

# rm-brand-extract — site/screenshot → brand block in context.md

## Purpose
Turn a brand URL or screenshot into the small **brand block** the rest of Remotion Studio reads: an
**accent** + **accentAlt** color, a **font pack** (one of the four the runtime ships), a short
**label**, and a transparent **logo cutout**. It is the *optional* onboarding asset — `onboarding`
collects the brand kit by asking; this skill derives it from the brand's own site instead, so the
captured palette/fonts/logo flow straight into `01-concept.md` (concept) and `remotion-project/`
(build). Capture is **local headless Chrome Headless Shell + ffmpeg** (the same pattern `rm-assets`
uses — not `hyperframes capture`); the logo cutout uses **ai-gen** `bria` (keyless SL8 proxy,
~1 credit). **No rendering, no cloud, no auth.**

`$SKILL` = this skill's directory. The two scripts (`capture.sh`, `bg-remove.sh`) reuse the
capture + background-removal pair that `rm-assets` ships; this skill keeps its own copies so it can
run standalone at phase 0 before `rm-assets` is ever reached.

## When to run
- **Phase 0 (onboard)**, optionally, when the user supplies a brand **URL/site** or a **brand
  screenshot/logo** and wants the video on-brand — run this to seed `context.md`'s brand block.
- Relevant to **JTBD-1 / 4 / 5** (the brand block colors the concept + the generated React). It is
  NOT needed for a pure JTBD-3 caption cut over an existing clip.
- Triggers: "use my brand", "pull our colors/fonts/logo", "match our site", "brand this from <url>".
- Do NOT use to build or render a composition (that is `rm-build`/`rm-render`), or to fetch
  in-video media cutouts/captures for a specific scene (that is `rm-assets`).

## Inputs (read before write)
- `brand-source` (required) — a URL or an image path. If neither resolves (the URL is unreachable,
  Chrome is missing, the file is missing), this is a **clean failure**: record it in
  `artifacts/<project>/state.md` and stop. Onboarding can still proceed with the neutral default kit
  (`#0a0a0a` bg, Inter, cyan accent); do NOT invent a palette or a logo. **Never prompt the user** in
  a headless run.
- `project` (optional) — the active project slug. Default: the active project in `state.md`; if there
  is no project yet, derive a slug from the brand domain (e.g. `acme.com` → `acme`) and create
  `artifacts/<project>/`.
- `font-pack-hint` (optional) — force the font pack. Default: mapped from the captured fonts (the
  mapping table below), else `modern`.
- Read `references/brand-block-contract.md` (the brand-block keys + the runtime font allowlist) and
  `context.md` (if it already exists, so a `## Brand` section is **merged**, not duplicated).

## Procedure

### 1. Resolve the project + the source mode
- Read `state.md` for the active project slug; else derive one from the brand domain. Ensure
  `artifacts/<project>/assets/captures/` and `artifacts/<project>/assets/cutouts/` exist.
- Decide the **source mode**: a `http(s)://…` value → **URL mode** (capture the site); an image path →
  **screenshot mode** (skip capture; read colors/fonts from the image + run bria on the logo).

### 2. Capture the brand (URL mode)
```bash
bash "$SKILL/scripts/capture.sh" "<brand-source>" artifacts/<project>/assets/captures
```
`capture.sh` drives the runtime's **Chrome Headless Shell** (`$CHROME_HEADLESS_SHELL`, default
`/opt/remotion/chrome-headless-shell`) to take a full-window `--screenshot` and a `--dump-dom`, fetches
same-origin stylesheets, and **normalizes** colors/fonts/label into **`brand-capture.json`** with a
stable shape:
```json
{ "source": "https://acme.com", "colors": ["#2D7FF9", "#0B1F3A", "#F5F7FA"],
  "fonts": ["Inter", "Fraunces"], "screenshots": ["...brand-shot.png"], "label": "Acme",
  "via": "dom" }
```
If the DOM/CSS yields no colors, it falls back to an **ffmpeg** pixel reduction of the screenshot
(`scale=6:6` → raw RGB) to lift a dominant accent + a dark contrast color (`"via":"ffmpeg"`). If Chrome
is unavailable or the URL is unreachable, the script writes a `brand-capture.json` carrying an `"error"`
and exits non-zero — treat that as the clean failure in step 1 (no fabricated values).

**Screenshot mode:** skip `capture.sh`. Open the image (Read it) and pull the dominant brand colors and
the visible typeface(s) by eye; write the same `brand-capture.json` yourself (set `"source"` to the
image path and `"screenshots"` to `[<image-path>]`). Use the logo region of the image as the bria input
in step 4.

### 3. Choose the brand fields (from the capture)
From `brand-capture.json`, pick:
- **accent** — the most saturated, brand-defining color (a logo/CTA color, not body grey / near-black /
  near-white). **accentAlt** — a second supporting brand color, else a darker/lighter shade of the
  accent. Keep both as 6-digit hex.
- **label** — the brand/company name (capture `label`, else the site `<title>`/domain, ≤ ~16 chars).
- **fontPack** — map the captured fonts to one of the **four runtime packs** (the literal families the
  bundled engine loads — `engine/fonts.ts`; see `references/brand-block-contract.md`). `font-pack-hint`
  overrides:

  | captured font feel | fontPack | runtime families (body / display / condensed) |
  |---|---|---|
  | clean geometric sans (Inter, Helvetica, system sans) | `modern` | Inter / Fraunces / Oswald |
  | serif / editorial (Georgia, Playfair, any serif headline) | `editorial` | Manrope / Playfair Display / Oswald |
  | heavy display / condensed (Anton, Bebas, all-caps headlines) | `bold` | Inter / Anton / Bebas Neue |
  | technical / mono-ish geometric (Space Grotesk, IBM Plex) | `tech` | Space Grotesk / DM Serif Display / Oswald |

  Never emit a font family the runtime lacks. The only render-safe families are the nine the engine
  loads at module top level: **Inter, Fraunces, Oswald, Manrope, Playfair Display, Anton, Bebas Neue,
  Space Grotesk, DM Serif Display**. A CDN/system font isn't render-safe — emit the **pack name**, not a
  raw family.

### 4. Cut out the logo (ai-gen bria)
Locate the logo: in URL mode use the captured screenshot's logo region (or a favicon/og-image the page
exposes); in screenshot mode use the logo crop. Then:
```bash
bash "$SKILL/scripts/bg-remove.sh" "<logo-image>" artifacts/<project>/assets/cutouts/logo.png
```
`bg-remove.sh` runs `ai-gen run fal-ai/bria/background/remove --image <logo-image>`, parses the v2 JSON
(`success`, `files[0].local_path`), and copies the matte to `assets/cutouts/logo.png`. On
`success:false`, an unreachable proxy, or no logo found, it exits non-zero — **omit** the `logo:` line
from the brand block and note "no logo cutout" (don't fail the whole brand extract over a missing logo).

### 5. Write the brand block into context.md
Append (or **merge** — replace an existing `## Brand` section, never duplicate) this block to
`artifacts/<project>/context.md`:
```markdown
## Brand
- accent: #2D7FF9
- accentAlt: #0B1F3A
- fontPack: modern
- label: Acme
- logo: assets/cutouts/logo.png        <!-- omit this line if no cutout was produced -->
- source: https://acme.com (captured 2026-06-25) — see assets/captures/brand-capture.json
```
These are the exact keys `onboarding` / `rm-concept` / `rm-build` expect (the same `accent`,
`accentAlt`, `fontPack`, `label` keys the bundled engine reads through `props`). Keep it to these
fields — no prose palette story.

### 6. Report (state what was derived vs defaulted)
Tell the user the resolved brand fields — accent + accentAlt (hex), fontPack, label, whether a logo
cutout was produced — and note any fallback (e.g. "DOM had one brand color → accentAlt derived as a
darker accent shade"; "colors came from the ffmpeg pixel fallback, re-check the screenshot"; "bria
failed → no logo cutout, used label chip only"). Update `state.md` (brand block written / failed) and
the `dashboard.md`, and remember. This skill does **not** advance the phase chain itself — `onboarding`
/ `rm-studio` continues to phase 1 (concept).

## Outputs
- `artifacts/<project>/context.md` — a `## Brand` section: `accent` (6-digit hex), `accentAlt` (hex),
  `fontPack` (modern/editorial/bold/tech), `label`, `logo` (path, if produced), `source`. Read by
  concept + build; graded by the rubric's brand-application dimension.
- `artifacts/<project>/assets/cutouts/logo.png` — the transparent logo cutout (bria), if produced.
- `artifacts/<project>/assets/captures/brand-capture.json` — the normalized capture (colors, fonts,
  screenshots, label, `via`) the block was derived from, for provenance.

## Failure / fallback
- **Chrome Headless Shell unavailable / URL unreachable** → `capture.sh` exits non-zero with an `error`
  in `brand-capture.json`. Record the failure in `state.md`; let onboarding proceed with the neutral
  default kit. Do NOT invent colors/fonts. (Reachability gate: attempt pass-through; unreachable → stop
  & report.)
- **DOM/CSS yielded no colors** → the ffmpeg pixel fallback fills accent/accentAlt from the screenshot
  (`"via":"ffmpeg"`); note it in the report so the user can sanity-check the pick.
- **bria `success:false` / no logo found** → `bg-remove.sh` exits non-zero. Omit the `logo:` line; the
  brand still has accent + fontPack + label. Don't fail the extract.
- **Captured a font the runtime lacks** → map it to the nearest of the four packs (table in step 3);
  never write a non-runtime family into the brand block.
- **Existing `## Brand` section** → replace it in place (merge), don't append a duplicate.

## Quality criteria
- [ ] `context.md` has a `## Brand` section with `accent` (6-digit hex), `accentAlt` (hex), `fontPack`
      (one of modern/editorial/bold/tech), and a `label` — the exact keys concept/build read.
- [ ] The brand fields are **derived from the capture**, not invented; colors are real brand colors
      (not body grey / pure black / pure white); the font pack is a runtime-supported pack.
- [ ] A transparent `assets/cutouts/logo.png` exists when a logo was found (else the `logo:` line is
      omitted and the omission is noted) — bria, keyless, no auth.
- [ ] `brand-capture.json` records source + tokens + `via` for provenance; an unreachable source is a
      clean, reported failure (recorded in `state.md`), never a fabricated kit.
