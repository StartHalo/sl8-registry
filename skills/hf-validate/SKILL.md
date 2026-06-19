---
name: hf-validate
description: Validate a HyperFrames composition before rendering — run hyperframes lint (with a strict 0-errors gate), then headless-seek and capture key frames as PNGs for a quick vision check. Writes 05-validation.md with the lint findings, the pass/block verdict, and the captured frames. Use during the VALIDATE phase (phase 6), after hf-build and before hf-render, so a broken composition never wastes a full render. Local and offline; no HeyGen cloud.
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-build]
  inputs:
    - name: composition
      type: html
      required: true
      description: artifacts/<project-name>/composition/ — the HyperFrames project authored by hf-build.
    - name: at-seconds
      type: text
      required: false
      description: Comma-separated timestamps to snapshot (e.g. "2,9,15"), one per scene/beat. Default = 5 evenly-spaced frames.
  outputs:
    - name: validation
      type: markdown
      path: artifacts/<project-name>/05-validation.md
      description: Lint findings + error/warning counts + the pass/block verdict + paths to the captured key frames.
    - name: snapshots
      type: png
      path: artifacts/<project-name>/snapshots/
      description: Key frames captured by headless seek (one per requested timestamp) plus a contact-sheet.jpg, for the pre-render vision check.
---

# hf-validate — lint + seek + snapshot gate

## Purpose
The cheap pre-render gate. Before spending render time (≈1 s per second of 1080p video in the low-memory
sandbox), confirm the composition is renderable and looks right: `hyperframes lint` must report **0
errors** (strict gate), and a headless seek must produce real key frames you can vision-check. A clean
pass means `hf-render` will produce a real video, not a blank or broken one.

`$SKILL` = this skill's directory.

## When to use
- **Validate** (phase 6): after `hf-build` left `composition/` at 0 lint errors, before `hf-render`.
- After any edit to `composition/` (a restyle, a hand-fix) — re-validate before re-rendering.
- Do NOT use to author or fix the composition (that is `hf-build`) — validate only reports + gates.

## Inputs
- `artifacts/<project-name>/composition/` (required) — the project to validate. If `index.html` is
  missing, the script errors out and you should run `hf-build` first (record in `state.md`).
- `at-seconds` (optional) — timestamps to snapshot; default 5 evenly-spaced frames. Pick one timestamp
  per scene/beat (mid-scene reads best) so the snapshots cover the whole story.

## Instructions

### 1. Run the validate gate
```bash
bash "$SKILL/scripts/validate.sh" artifacts/<project-name>/composition artifacts/<project-name> "2,9,15"
```
The script (in order):
1. `hyperframes lint` — prints the human findings.
2. `hyperframes lint --json` — the **strict gate**: if `errorCount > 0` it writes a **BLOCKED**
   verdict to `05-validation.md` and exits non-zero (no snapshot).
3. `hyperframes snapshot . --at "2,9,15"` — captures key frames to `composition/snapshots/`, then copies
   them (and `contact-sheet.jpg`) to `artifacts/<project-name>/snapshots/`.

It writes the full report to `artifacts/<project-name>/05-validation.md` and exits 0 only when lint is
clean AND at least one frame was captured.

### 2. If BLOCKED, route back to hf-build
A non-zero exit + a **BLOCKED** verdict means lint errors (or zero captured frames). Read the named
findings (and `references/lint-rules.md` for the fix for each `code`), then go back to `hf-build`, fix the
composition, and re-run validate. Do NOT proceed to render on a blocked composition.

### 3. Vision-check the key frames (the real check)
On a PASS, **Read** the captured PNGs in `artifacts/<project-name>/snapshots/` (or the `contact-sheet.jpg`
grid) and judge the pixels yourself, not the filenames:
- **Legible** — headline + key facts present and readable; high contrast.
- **Safe-zone** — text not clipped at the edges; correct for the aspect ratio.
- **On-brand** — the concept palette + fonts are applied (not generic defaults).
- **Composed** — hierarchy + density per the storyboard; not a centered single element.
If a frame looks wrong (clipped, blank, wrong font, off-brand), note it and route the fix to `hf-build`
before rendering. Record what you saw in `05-validation.md`.

## Outputs
- `artifacts/<project-name>/05-validation.md` — lint findings, error/warning counts, the pass/block
  verdict, and the captured-frame paths (plus your vision notes).
- `artifacts/<project-name>/snapshots/` — the key frames + `contact-sheet.jpg`.

## Examples

### Example 1: clean 3-scene teaser
`validate.sh ... "2,9,15"` → lint 0 errors → 3 frames captured → report **PASS** → Read the frames
(title / stat / CTA), confirm legible + on-brand → hand off to `hf-render`.

### Example 2: blocked on overlap
Lint reports `overlapping_clips_same_track` → report **BLOCKED**, exit 2 → fix in `hf-build` (gap the
clip boundary, e.g. duration 6 → 5.97) → re-run validate → PASS.

## Troubleshooting
- **`Not a directory: .../composition/.../composition`** → you passed the composition path while inside it.
  `validate.sh` already snapshots with `.` from inside the dir; pass the composition dir as the first arg.
- **Lint clean but 0 frames captured** → report is BLOCKED. The runtime/Chrome failed to seek. On
  sl8-animation, confirm the pinned Chrome is present; the snapshot does not download Chrome.
- **`gsap_studio_edit_blocked` warning** → expected and benign; it does not block (see `references/lint-rules.md`).

## Quality Criteria
- [ ] `hyperframes lint` reports **0 errors** (strict gate); the report records the error/warning counts.
- [ ] At least one key frame per scene captured to `snapshots/`; a clean-lint-but-no-frames case is BLOCKED.
- [ ] `05-validation.md` records the verdict, the findings, the frame paths, and a vision note per frame.
- [ ] A BLOCKED composition is routed back to `hf-build` and never rendered.
