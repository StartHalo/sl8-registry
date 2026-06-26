---
name: rm-assets
description: "Prepare visual source assets for a Remotion composition and stage them where staticFile() resolves. Cuts the background out of a subject/product/logo image via ai-gen (fal-ai/bria/background/remove) into a transparent cutout, and ingests a brand site/screen (hyperframes capture, or the runtime Chrome Headless Shell as a fallback) into screenshots + extracted design tokens. Writes cutouts to assets/cutouts/ AND stages a copy into remotion-project/public/cutouts/; writes capture frames into remotion-project/public/captures/[slug]/ (staticFile-reachable) and design tokens into assets/captures/[slug]/extracted/. Use during the asset-prep phase (phase 4, alongside rm-voiceover) before rm-build, whenever the storyboard calls for a subject cutout/matte, a product shot on transparency, or captured brand frames. Local and keyless (ai-gen via the SL8 proxy; capture via the runtime Chrome) — no HeyGen, no cloud, no auth. It does NOT author or render the composition (that is rm-build / rm-render) — no rendering here."
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [rm-storyboard, rm-build, rm-brand-extract, onboarding]
  inputs:
    - name: source-image
      type: image
      required: false
      description: "A readable PNG/JPG/WebP to background-remove (a subject, product shot, or logo). Required for a cutout; omit if only capturing."
    - name: capture-url
      type: text
      required: false
      description: "A website/brand/screen URL to ingest into the project's public/ frames. Required for a capture; omit if only cutting out."
    - name: project
      type: text
      required: true
      description: "The active project slug — outputs land under artifacts/[project-name]/. From state.md/context.md, never invented."
    - name: out-name
      type: text
      required: false
      description: "Output stem for a cutout (cutouts/[out-name].png) or folder slug for a capture (captures/[slug]/). Default = the source image basename / the URL host."
  outputs:
    - name: cutout
      type: png
      path: artifacts/[project-name]/assets/cutouts/[out-name].png
      description: "Canonical transparent-background matte (RGBA PNG) of the subject/product/logo."
    - name: cutout-staged
      type: png
      path: artifacts/[project-name]/remotion-project/public/cutouts/[out-name].png
      description: "The same matte staged under public/ so the composition reaches it via staticFile(\"cutouts/[out-name].png\")."
    - name: capture-frames
      type: x-dir
      path: artifacts/[project-name]/remotion-project/public/captures/[slug]/
      description: "Captured brand frames (scroll-NNN.png + contact-sheet.jpg) + any downloaded site assets, staticFile-reachable as staticFile(\"captures/[slug]/[file].png\")."
    - name: capture-tokens
      type: x-dir
      path: artifacts/[project-name]/assets/captures/[slug]/extracted/
      description: "Extracted design tokens (tokens.json palette/fonts/headings, design-styles.json, fonts-manifest.json, visible-text.txt, page.html) — metadata for rm-build / rm-brand-extract, not a render asset."
---

# rm-assets — prepare visual source assets (cutouts + captures), staged for staticFile()

## Purpose
Produce the **visual source material** a Remotion composition needs before `rm-build` authors it, and put
it where the renderer can find it: transparent **cutouts** (subject/product/logo with the background
removed) and **captures** (brand-site screenshots + extracted design tokens). Both paths are **local and
keyless** — background removal goes through the `ai-gen` SL8 proxy, capture uses the runtime's
`hyperframes` (or Chrome Headless Shell as a fallback). The key Remotion-specific difference from
HyperFrames asset prep: every render-usable asset is **staged into `remotion-project/public/`** so a
`staticFile()` reference resolves at render time (see `references/staticfile-staging.md`). **No HeyGen,
no cloud, no auth; no bundled local ML weights** — the matte comes from `ai-gen`. **This skill renders
nothing.** `$SKILL` below = this skill's directory.

## When to run
Phase **4** (asset prep), alongside `rm-voiceover`, *before* `rm-build` (phase 5). The storyboard
(`03-storyboard.md`) decides *which* assets a beat needs; this skill *makes* them and parks them at the
stable paths `rm-build` reads. JTBDs that reach for it:
- **JTBD-1** — a beat floats a founder photo / product PNG / logo on a colored or animated background.
- **JTBD-3** — a social caption cut wants the speaker cut out and re-placed over a card (optional matte).
- Either JTBD — a brief references a brand site whose frames/palette should theme the video.

Do **not** use this to author the composition (`rm-build`), make voiceover (`rm-voiceover`), build a
structured brand block in `context.md` (`rm-brand-extract`), or generate net-new illustrations (out of
scope — bring source images in).

## Inputs (read before write)
- `project` (required) — the active project slug, from `state.md`/`context.md`. Outputs go under
  `artifacts/<project-name>/`. Never invent it.
- `source-image` (cutout path, optional) — a readable PNG/JPG/WebP.
- `capture-url` (capture path, optional) — a page URL.
- `out-name` (optional) — cutout stem / capture slug; defaults to the source basename / URL host.
- Read `03-storyboard.md` (and `01-concept.md`) to confirm *which* assets the beats actually call for.
- **At least one of `source-image` / `capture-url` is required.** Headless: if neither is present and the
  storyboard names no asset, record in `state.md` that no source asset was needed and skip cleanly (do
  not prompt). If a required image is missing/unreadable, record the failure in `state.md` and stop —
  never fabricate an asset.

## Procedure

### A. Background removal → a transparent cutout (staged for staticFile)
For each subject/product/logo the storyboard needs on transparency:
```bash
bash "$SKILL/scripts/bg-remove.sh" <source-image> artifacts/<project-name> <out-name>
# e.g. bash "$SKILL/scripts/bg-remove.sh" ~/uploads/founder.jpg artifacts/api-teaser founder
```
`bg-remove.sh`:
1. Runs the spec-confirmed command `ai-gen run fal-ai/bria/background/remove --image <source-image>`
   (keyless SL8 proxy, ~1 credit). ai-gen writes `~/artifacts/remove-<ts>.png` and prints v2 JSON
   `{ "success": …, "files": [{ "local_path": … }] }`.
2. Parses `files[0].local_path` with node (fails cleanly on `success:false` or a missing file — never a
   glob-the-newest guess).
3. Copies the matte to **both** `artifacts/<project-name>/assets/cutouts/<out-name>.png` (canonical) and
   `artifacts/<project-name>/remotion-project/public/cutouts/<out-name>.png` (staged), and reports the
   `pix_fmt`/dims so you can confirm a real alpha channel.

Then **Read** the cutout PNG and confirm the subject is cleanly isolated (no halo, no hard-cropped limbs,
the alpha is transparent where the background was). A poor matte is a source-image problem (low contrast,
busy background) — note it; do not retry the same image expecting a different result. `rm-build` layers
it as `<Img src={staticFile("cutouts/<out-name>.png")} />` (never a native `<img>` or absolute path).

### B. Capture a brand site / screen → frames + tokens (frames staged for staticFile)
For each URL the brief/storyboard references:
```bash
bash "$SKILL/scripts/capture.sh" "<capture-url>" artifacts/<project-name> <slug> <max-screenshots>
# e.g. bash "$SKILL/scripts/capture.sh" "https://acme.com" artifacts/api-teaser acme 6
```
`capture.sh`:
1. Prefers `hyperframes capture "<url>" -o <tmp> --json --max-screenshots <n>` (present on
   `sl8-animation`; URL positional; local Chrome; no auth). If `hyperframes` is absent, falls back to the
   runtime's Chrome Headless Shell (`$CHROME_HEADLESS_SHELL`, default `/opt/remotion/chrome-headless-shell`)
   for a single full-page screenshot. Default `max-screenshots` = 8.
2. Parses `ok` + `projectDir` from the JSON (fails cleanly on `ok:false`).
3. Copies the durable pieces to the two targets:
   - **Frames → `remotion-project/public/captures/<slug>/`** (`scroll-NNN.png` + `contact-sheet.jpg` +
     any downloaded `assets/`) — staticFile-reachable, drop straight into a composition.
   - **Design tokens → `assets/captures/<slug>/extracted/`** (`tokens.json` palette/fonts/headings,
     `design-styles.json`, `fonts-manifest.json`, `visible-text.txt`, `page.html`) — metadata for
     `rm-build` / `rm-brand-extract`, not a render asset (kept out of `public/`).

Then **Read** the contact sheet (and `extracted/tokens.json` if present) to confirm the capture is the
right page and the palette/fonts read sensibly. `rm-build` references a frame as
`<Img src={staticFile("captures/<slug>/contact-sheet.jpg")} />`.

> **Ordering note (load-bearing):** rm-assets runs *before* `rm-build`'s `init.sh` creates
> `remotion-project/`, so the scripts `mkdir -p` and **pre-seed** `public/`. `rm-build`/`init.sh` MUST
> merge the starter into a pre-seeded `public/` (copy-if-absent; never `rm -rf public/`). Full contract
> in `references/staticfile-staging.md`.

### C. Record what was produced
List the files written under `assets/cutouts/`, `remotion-project/public/cutouts/`,
`remotion-project/public/captures/<slug>/`, and `assets/captures/<slug>/extracted/`. Note any fallback
("no source image — skipped cutout", "hyperframes absent — Chrome single-screenshot fallback, no design
tokens", "capture returned 0 downloadable assets — screenshots only") and update `state.md`. `rm-build`
references these by their stable `staticFile()` paths; do not move or rename them.

## Outputs
Save under `artifacts/<project-name>/`:
- `artifacts/<project-name>/assets/cutouts/<out-name>.png` — canonical transparent-background matte
  (RGBA PNG) per background-removed image.
- `artifacts/<project-name>/remotion-project/public/cutouts/<out-name>.png` — the same matte staged
  under `public/`, reachable as `staticFile("cutouts/<out-name>.png")`.
- `artifacts/<project-name>/remotion-project/public/captures/<slug>/` — captured brand frames
  (`scroll-NNN.png` + `contact-sheet.jpg`) + any downloaded site `assets/`, reachable as
  `staticFile("captures/<slug>/<file>.png")`.
- `artifacts/<project-name>/assets/captures/<slug>/extracted/` — extracted design tokens
  (`tokens.json`, `design-styles.json`, `fonts-manifest.json`, `visible-text.txt`, `page.html`) for
  `rm-build` / `rm-brand-extract` (metadata, not a render asset).

`<project-name>`, `<out-name>`, and `<slug>` are runtime substitution tokens — never hardcode a real name.

## Examples

### Example 1: subject cutout for a launch teaser (JTBD-1)
Storyboard beat 2 floats the founder over a brand gradient.
`bash "$SKILL/scripts/bg-remove.sh" ~/uploads/founder.jpg artifacts/api-teaser founder` →
`assets/cutouts/founder.png` (canonical) + `remotion-project/public/cutouts/founder.png` (staged). Read
it: subject isolated, transparent → `rm-build` layers `<Img src={staticFile("cutouts/founder.png")} />`.

### Example 2: brand capture to theme the video (JTBD-1)
Brief says "match acme.com's look".
`bash "$SKILL/scripts/capture.sh" "https://acme.com" artifacts/api-teaser acme 6` →
`remotion-project/public/captures/acme/` (frames) + `assets/captures/acme/extracted/tokens.json`
(palette/fonts). Carry the accent + headings into `01-concept.md` / `rm-build`'s `:root` tokens; use a
screenshot as a beat backdrop via `staticFile("captures/acme/scroll-001.png")`.

### Example 3: caption-cut needing a subject matte (JTBD-3)
A vertical social cut wants the speaker cut out and re-placed over a colored card.
`bash "$SKILL/scripts/bg-remove.sh" ~/uploads/speaker-frame.png artifacts/social-cut speaker` →
`public/cutouts/speaker.png` for `rm-build`'s overlay track over `<OffthreadVideo>`.

## Failure / fallback
- **`ai-gen CLI not found`** — background removal needs the keyless `ai-gen` proxy (present in
  `sl8-animation`, absent on host/dev). Run the cutout step in-sandbox; on host, capture-only is fine.
- **`ai-gen success:false` / `no files[].local_path`** — the proxy rejected the request or returned no
  file (unreadable image, exhausted credits). Verify the source image opens; check `ai-gen balance`;
  re-attempt once. If unreachable, STOP and record in `state.md` (reachability gate) — never substitute a
  fake matte.
- **Missing/unreadable source image** — the script exits before calling ai-gen; record the named missing
  path in `state.md` and stop. No file is written. Do not prompt.
- **Capture `ok:false` / 0 screenshots** — the URL didn't load or the page blocked headless. Confirm the
  URL is reachable; `hyperframes doctor` false-negatives on Chrome (ignore it). On a slow page, the Chrome
  fallback bounds the wait with `--virtual-time-budget`.
- **`hyperframes` absent** — the script falls back to the runtime Chrome Headless Shell for one full-page
  screenshot (no design tokens). Record the reduced-fidelity fallback in `state.md`.
- **Matte has a halo / hard crop** — a source-image contrast problem; supply a cleaner source. Do not
  retry the same image.
- Bash 3.2 / no GNU `timeout`: the scripts avoid `timeout` and GNU-only flags (Chrome bounds itself with
  `--virtual-time-budget`).

## Quality criteria
- [ ] Every requested cutout exists at `assets/cutouts/<out-name>.png` **and** staged at
      `remotion-project/public/cutouts/<out-name>.png`, with a real alpha channel; Read confirms the
      subject is cleanly isolated (no halo / hard crop).
- [ ] Every requested capture lands ≥1 screenshot under `remotion-project/public/captures/<slug>/`
      (staticFile-reachable); when `hyperframes` ran, `extracted/tokens.json` is in
      `assets/captures/<slug>/extracted/`. Read confirms it is the right page.
- [ ] Render-usable assets are reachable via `staticFile("cutouts/…")` / `staticFile("captures/…")` —
      the public/ staging contract is honored so `rm-build` finds them by stable path.
- [ ] Failures are recorded in `state.md` (missing image, unreachable proxy/URL, hyperframes-absent
      fallback) — no fabricated assets, no runtime prompts.
- [ ] Local + keyless only: ai-gen via the SL8 proxy, capture via the runtime Chrome — no HeyGen
      cloud/auth. No rendering performed.
