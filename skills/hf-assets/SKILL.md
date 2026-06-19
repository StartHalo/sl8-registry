---
name: hf-assets
description: Prepare visual source assets for a HyperFrames composition. Cuts the background out of a subject/product/logo image via ai-gen (fal-ai/bria/background/remove) into a transparent cutout, and ingests a brand site or screen with hyperframes capture (screenshots + extracted design tokens + downloaded assets). Use during the asset-prep phase before hf-build, whenever the storyboard calls for a subject cutout/matte, a product shot on transparency, or captured brand frames/screenshots. Local and keyless (ai-gen via the SL8 proxy; capture via the pinned Chrome) — no HeyGen cloud, lambda, or auth.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-storyboard, onboarding, hf-brand-extract]
  inputs:
    - name: source-image
      type: image
      required: false
      description: A readable PNG/JPG/WebP to background-remove (a subject, product shot, or logo). Required for a cutout; omit if only capturing.
    - name: capture-url
      type: text
      required: false
      description: A website/brand/screen URL to ingest with hyperframes capture. Required for a capture; omit if only cutting out.
    - name: project
      type: text
      required: true
      description: The active project slug — outputs land under artifacts/<project-name>/assets/. From state.md/context.md, never invented.
    - name: out-name
      type: text
      required: false
      description: Output stem for a cutout (assets/cutouts/<out-name>.png) or folder slug for a capture (assets/captures/<slug>/). Default = the source image basename / the URL host.
  outputs:
    - name: cutouts
      type: png
      path: artifacts/<project-name>/assets/cutouts/<out-name>.png
      description: Transparent-background matte (RGBA PNG) of the subject/product/logo, ready to layer in the composition.
    - name: captures
      type: x-dir
      path: artifacts/<project-name>/assets/captures/<slug>/
      description: Captured brand frames (screenshots/*.png + contact-sheet.jpg) plus extracted design tokens (palette/fonts/text) and any downloaded site assets.
---

# hf-assets — prepare visual source assets (cutouts + captures)

## Purpose
Produce the **visual source material** a composition needs before `hf-build` authors it: transparent
**cutouts** (subject/product/logo with the background removed) and **captures** (brand-site screenshots +
extracted design tokens + downloaded assets). Both paths are **local and keyless** — background removal
goes through the `ai-gen` SL8 proxy, capture uses the pinned/system Chrome. **No HeyGen** cloud, lambda,
auth, or avatars; **no** bundled local ML weights (deferred REQ-005 — the matte comes from `ai-gen`).

This is a support phase (phase 4-adjacent, alongside `hf-voiceover`): the storyboard decides *which*
assets a beat needs; this skill *makes* them and parks them at the stable `assets/` paths `hf-build`
reads. `$SKILL` below = this skill's directory.

## When to use
- **Cutout** — the storyboard places a subject/product/logo on a colored or animated background and you
  need it on transparency (e.g. a founder photo over a gradient, a product PNG that floats in). Run
  `bg-remove.sh` per image.
- **Capture** — a brief references a brand site, a competitor page, or a product screen and you want real
  frames + the page's palette/fonts to theme the video. Run `capture.sh` per URL. (For a structured brand
  block in `context.md`, that is `hf-brand-extract` — this skill just lands the raw frames/tokens.)
- Do **not** use this to author the composition (that is `hf-build`), to make voiceover audio (that is
  `hf-voiceover`), or to generate net-new illustrations (out of scope — bring source images in).

## Inputs
- `project` (required) — the active project slug, from `state.md`/`context.md`. Outputs go under
  `artifacts/<project-name>/assets/`. Never invent it.
- `source-image` (cutout path, optional) — a readable PNG/JPG/WebP.
- `capture-url` (capture path, optional) — a page URL.
- `out-name` (optional) — cutout stem / capture slug; defaults to the source basename / URL host.
- **At least one of `source-image` / `capture-url` is required.** Headless: if neither is present and the
  storyboard names no asset, record in `state.md` that no source asset was needed and skip cleanly (do not
  prompt). If a required image is missing/unreadable, record the failure in `state.md` and stop — never
  fabricate an asset.

## Instructions

### A. Background removal → a transparent cutout
For each subject/product/logo the storyboard needs on transparency:
```bash
bash "$SKILL/scripts/bg-remove.sh" <source-image> artifacts/<project-name> <out-name>
# e.g. bash "$SKILL/scripts/bg-remove.sh" ~/uploads/founder.jpg artifacts/launch-teaser founder
```
`bg-remove.sh`:
1. Runs the spec-confirmed command `ai-gen run fal-ai/bria/background/remove --image <source-image>`
   (keyless SL8 proxy, ~1 credit). ai-gen writes `~/artifacts/remove-<ts>.png` and prints v2 JSON
   `{ "success": …, "files": [{ "local_path": … }] }`.
2. Parses `files[0].local_path` (fails cleanly on `success:false` or a missing file).
3. Copies the matte into `artifacts/<project-name>/assets/cutouts/<out-name>.png` and reports the
   `pix_fmt`/dims so you can confirm a real alpha channel.

Then **Read** the cutout PNG and confirm the subject is cleanly isolated (no halo, no hard-cropped limbs,
the alpha is transparent where the background was). If the matte is poor, that is a source-image problem
(low contrast, busy background) — note it; do not retry endlessly.

### B. Capture a brand site / screen → frames + tokens
For each URL the brief/storyboard references:
```bash
bash "$SKILL/scripts/capture.sh" "<capture-url>" artifacts/<project-name> <slug> <max-screenshots>
# e.g. bash "$SKILL/scripts/capture.sh" "https://acme.com" artifacts/launch-teaser acme 6
```
`capture.sh`:
1. Runs the spec-confirmed command `hyperframes capture "<url>" -o <tmp> --json --max-screenshots <n>`
   (the URL is positional; local Chrome; no auth). Default `max-screenshots` = 8.
2. Parses `ok` + `projectDir` from the JSON (fails cleanly on `ok:false`).
3. Copies the durable pieces into `artifacts/<project-name>/assets/captures/<slug>/`:
   - `screenshots/` — `scroll-NNN.png` frames + `contact-sheet.jpg` (drop straight into a composition).
   - `extracted/` — `tokens.json` (palette colors, fonts, headings), `design-styles.json`,
     `fonts-manifest.json`, `visible-text.txt`, `page.html` (the brand palette/type for `hf-build` /
     `hf-brand-extract`).
   - `assets/` — any images/SVGs/fonts the page exposed.

Then **Read** the contact sheet (and `extracted/tokens.json`) to confirm the capture is the right page and
the palette/fonts read sensibly.

### C. Record what was produced
List the files written under `assets/cutouts/` and `assets/captures/<slug>/`, note any fallback (e.g.
"no source image — skipped cutout", "capture returned 0 downloadable assets — screenshots only"), and
update `state.md`. `hf-build` will reference these by their stable paths; do not move or rename them.

## Outputs
Save under `artifacts/<project-name>/assets/`:
- `artifacts/<project-name>/assets/cutouts/<out-name>.png` — transparent-background matte (RGBA PNG) per
  background-removed image.
- `artifacts/<project-name>/assets/captures/<slug>/` — captured brand frames (`screenshots/*.png` +
  `contact-sheet.jpg`), extracted design tokens (`extracted/tokens.json`, `design-styles.json`,
  `fonts-manifest.json`, `visible-text.txt`, `page.html`), and any downloaded site `assets/`.

`<project-name>`, `<out-name>`, and `<slug>` are runtime substitution tokens — never hardcode a real name.

## Examples

### Example 1: subject cutout for a launch teaser (JTBD-1)
Storyboard beat 2 floats the founder over a brand gradient.
`bash "$SKILL/scripts/bg-remove.sh" ~/uploads/founder.jpg artifacts/launch-teaser founder` →
`artifacts/launch-teaser/assets/cutouts/founder.png` (RGBA). Read it: subject isolated, transparent
background → `hf-build` layers it as `<img src="assets/cutouts/founder.png">` over the gradient track.

### Example 2: brand capture to theme the video (JTBD-1)
Brief says "match acme.com's look".
`bash "$SKILL/scripts/capture.sh" "https://acme.com" artifacts/launch-teaser acme 6` →
`artifacts/launch-teaser/assets/captures/acme/{screenshots,extracted,assets}`. Read `extracted/tokens.json`
for the palette/fonts → carry the accent + headings into `01-concept.md` / `hf-build`'s `:root` tokens; use
a screenshot as a beat backdrop if the storyboard calls for it.

### Example 3: caption-cut needing a subject matte (JTBD-3)
A vertical social cut wants the speaker cut out and re-placed over a colored card.
`bash "$SKILL/scripts/bg-remove.sh" ~/uploads/speaker-frame.png artifacts/social-cut speaker` →
`assets/cutouts/speaker.png` for `hf-build`'s overlay track.

## Troubleshooting

### `ai-gen CLI not found`
Cause: background removal needs the keyless `ai-gen` proxy, present in the `sl8-animation` runtime but not
on host/dev. Solution: run the cutout step in-sandbox; on host, capture-only is fine.

### `ai-gen reported success:false` / `no files[].local_path`
Cause: the proxy rejected the request or returned no file (unreadable image, exhausted credits). Solution:
verify the source image opens; check `ai-gen balance`; re-attempt once. If unreachable, STOP and report
(per the reachability gate) — never substitute a fake matte.

### capture returns `ok:false` or 0 screenshots
Cause: the URL didn't load, Chrome is missing, or the page blocked headless. Solution: confirm the URL is
reachable and Chrome is present (pinned in-sandbox, system on host); `hyperframes doctor` false-negatives on
Chrome — ignore it. Re-run with a longer `--timeout` if the page is slow.

### Matte has a halo / hard crop
Cause: low subject/background contrast in the SOURCE image. Solution: this is a source problem — supply a
cleaner source image; do not retry the same image expecting a different matte.

## Quality Criteria
- [ ] Every requested cutout exists at `assets/cutouts/<out-name>.png` with a real alpha channel; Read
      confirms the subject is cleanly isolated (no halo / hard crop).
- [ ] Every requested capture lands under `assets/captures/<slug>/` with at least one screenshot + the
      extracted `tokens.json`; Read confirms it is the right page and the palette/fonts read sensibly.
- [ ] Failures are recorded in `state.md` (missing image, unreachable proxy/URL) — no fabricated assets,
      no runtime prompts.
- [ ] Local + keyless only: ai-gen via the SL8 proxy, capture via local Chrome — no HeyGen cloud/lambda/auth.
- [ ] Output paths match the artifact-path map exactly so `hf-build` finds the assets by stable path.
