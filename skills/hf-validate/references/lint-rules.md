# Lint rules — what `hyperframes lint` checks and how to fix each finding

> Reference for the validate gate. Confirmed against `hyperframes@0.6.112`. `validate.sh` runs
> `hyperframes lint` (human), then `hyperframes lint --json` as the strict gate (errorCount must be 0),
> then `hyperframes snapshot`. Errors BLOCK the render; warnings do not. The fixes live upstream in
> `hf-build` — validate only reports; it does not edit the composition.

## Severity model

- **error** → blocks the render (the strict gate fails, exit 2). Must be fixed in hf-build.
- **warning** → informational; does not block. One warning is expected (see below).
- **info** → hidden unless `--verbose`.

## Errors (must be 0)

| code | meaning | fix (in hf-build) |
|---|---|---|
| `root_missing_composition_id` | linter can't find the root's `data-composition-id` | Usually a **tag token inside an HTML comment** (`<!-- ... <body> ... -->`) hijacking the root-finder. Rephrase comments without `<...>` tags. Otherwise add `data-composition-id` to the root div. |
| `root_missing_dimensions` | root has no numeric `data-width`/`data-height` | Same root-detection cause as above, or genuinely add numeric `data-width`/`data-height`. |
| `timed_element_missing_clip_class` | an element has `data-start`/`data-duration` but no `class="clip"` | Add `class="clip"` — the runtime keys visibility off `.clip`. Without it the element shows for the whole video. |
| `overlapping_clips_same_track` | two clips on one track overlap in time | **Shared boundaries count** (`[0,6)` + start `6`). Shorten the earlier clip's `data-duration` (6 → 5.97) or move one to a different `data-track-index`. |
| `font_family_without_font_face` | a `font-family` names a family with no resolvable `@font-face` | Use a **literal** family name (not `var(--font-x)` — lint can't resolve it), matching an `@font-face` in `assets/fonts.css`, with a generic fallback. Inter/Outfit are auto-resolved; Anton/Fraunces/Space Grotesk need the `@font-face local()` declarations (the bundled fonts.css provides them). |

## Warnings (do not block)

| code | meaning | action |
|---|---|---|
| `gsap_studio_edit_blocked` | a manual `window.__timelines` timeline controls elements; the Studio GUI can't drag-edit them | **Expected and benign** for our render-only flow. The composition contract requires the manual timeline. Leave it. |
| `timeline_track_too_dense` | one track has >~5 timed elements in one file | Optional: split a coherent scene group into a `compositions/<name>.html` sub-composition mounted via `data-composition-src`. Not required to pass. |

## The strict gate

```bash
hyperframes lint --json   # validate.sh parses .errorCount; > 0 => BLOCK (exit 2)
```

`validate.sh` writes the human findings + the error/warning counts into `05-validation.md`, and only
proceeds to snapshot when `errorCount == 0`. If the gate blocks, the report says **BLOCKED** and names the
errors — route back to `hf-build`, fix, re-validate.

## Snapshot (headless seek)

After a clean lint, `validate.sh` runs `hyperframes snapshot . --at <csv>` (or `--frames 5`). This seeks
the paused timeline at each time and writes PNGs to `<composition>/snapshots/` (plus a `contact-sheet.jpg`
grid), which the script copies to `<project>/snapshots/`. **A clean lint with zero captured frames is
itself a failure** (the render would risk blank output) — the report marks it BLOCKED. Vision-grade the
captured frames before rendering: legible? safe-zone correct? on-brand? composed (not a centered
single element)? This is the cheap pre-render check before the (slower) full render in `hf-render`.
