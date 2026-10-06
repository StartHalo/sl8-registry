---
name: media-character-sheet
description: >-
  Character sheets, character design sheets, model sheets, turnarounds and
  expression sheets as ONE image from ONE generation call: hero pose, front,
  side and back views, expressions, detail panels and palette, or a clean
  4-column turnaround reference for video identity. Works from a text brief or
  from an existing photo or render (edit mode, uploaded with --ref). Writes the
  CHARACTER ANCHOR text that every later image or video call repeats verbatim,
  and the sheet becomes the identity reference those calls attach. Use when: a
  brief asks for a character sheet, turnaround, expression sheet, character
  reference or identity anchor, or a character must stay the same across later
  images or video. NOT for: single images, scenes, storyboards or
  multi-character boards (media-image-generation); photo adjustments or
  background removal (media-photo-editing); running ai-gen in general
  (media-ai-gen); scripted output checks (media-qc); animating the character.
license: Adapted from fal agent skills; no licence stated; used with attribution
compatibility: "sl8-image >=1.0.0 (Base 2.0.2); ai-gen 2.2.0"
metadata:
  version: 1.0.0
  revision: 2026-10-05a
  house-rules: HR-1.0
  upstream: fal-agent/character-sheet
  upstream-pin: export 2026-10-05
  attribution: Adapted from fal (fal.ai/agent/skills export 2026-10-05)
  deltas: IMG-D60..IMG-D69
---
# Character Sheet

Produce one character design/reference sheet — hero pose, turnaround views, expressions, and detail panels — as ONE image from ONE generation call. The sheet is the identity anchor for everything downstream: every later image or video call attaches it as a reference and repeats its descriptor tokens verbatim.

**THE ONE-IMAGE LAW applies: all views and panels render together in a single call — that is WHY they match.** Never generate views as separate images; separate calls cannot share a canon.

Load references as needed:
* `references/sheet-patterns.md` — worked sheet prompts (AAA design sheet, 4-column turnaround, expression sheet, from-photo mode) and downstream binding clauses

## Inputs to collect

Ask only for what changes the sheet; default the rest and say so.
* Sheet type: full design sheet (hero + turnaround + details + palette, 16:9) or clean turnaround reference (4 columns, no text — for video identity refs).
* Source: text brief, or an existing image (edit mode — identity comes from the upload).
* Style anchor (e.g. "anime realism, premium game artbook" vs "photoreal") and any name/title text to render (goes in quotes).

## Core contract

```text
CHARACTER ANCHOR: face geometry + skin + eyes + hair (cut, color) + build +
                  signature wardrobe items (named one by one) + props
SHEET VARIABLE:   layout, views, detail panels, palette swatches
```

Descriptor tokens are permanent: "golden amber eyes" stays "golden amber eyes" in every future prompt — never paraphrase. Repair rule: drift between views → regenerate the whole sheet with a tightened anchor; never patch one view.

## Model routing (as of 2026-07-20 (fal), check live per HR22)

Inspect the model's schema (`ai-gen info <id> --format json`, plus the raw OpenAPI for `const`) and use only supported fields.
* Sheet generation: `fal-ai/nano-banana-pro` (1K/2K/4K, seed) → fallback `openai/gpt-image-2` (long structured prompts; renders quoted name/title text cleanly) → draft `fal-ai/nano-banana-2`
* Sheet FROM an existing image: `fal-ai/nano-banana-pro/edit` (upload = identity source, passed with `--ref`, repeatable; "keep the facial features exactly the same as Image 1") → `openai/gpt-image-2/edit`
* Angle variants of one existing render: `fal-ai/qwen-image-edit-2511-multiple-angles` (96 poses)
* Panel extraction: model-side re-render for the hero portrait ("extract the front portrait, render it full-frame"); deterministic local crop for reference thumbnails

## Workflow

1. Write the CHARACTER ANCHOR; pick a layout pattern from `sheet-patterns.md`; put any name/title text in quotes.
2. Generate ONE sheet in one call at 2K+ (4K when detail panels matter), into `artifacts/<project>/characters/<name>/` (`-o`).
3. QC against the quality bar; on identity drift regenerate the whole sheet.
4. Extract panels as needed (into the same folder); record a manifest row with `node $HOME/.agents/skills/media-ai-gen/scripts/manifest.mjs add …`: anchor text verbatim, sheet file, endpoint, seed, final prompt.
5. Downstream binding: attach the sheet image to every later call (`--ref`) and scope it — "Use @Image1 only for the character's final identity, wardrobe, and props."

## Retry & budget

Change ONE rung per retry: 1) anchor specificity — name each wardrobe item, count the views explicitly; 2) determinism lever — seed, or the approved sheet as an edit reference; 3) workflow tier — text → from-image edit mode; 4) fallback model. Max 3 attempts per sheet, then surface the best candidate and the next change.

## Quality bar — reject when

* Face, hair, or any named wardrobe item differs between views.
* View count or order doesn't match the requested layout (front/side/back missing or duplicated).
* Views were generated as separate images instead of one sheet.
* Name/title text renders garbled (quote it; describe the typeface, never name fonts).
* Anatomy errors (extra limbs, deformed hands), or a cluttered background when the sheet is meant as a clean reference.
* Style drifts from the anchor — photoreal creeping into an anime sheet or vice versa.

## Output contract

Report: sheet file, endpoint, seed, final prompt, the CHARACTER ANCHOR text verbatim (reusable), extracted panels, manifest path.

## Scope

This skill owns one character's identity sheet and its anchor text. Scene storyboards, multi-character boards, and animating the character are out of scope.

## House rules (HR-1.0)

Relies on: HR1, HR2, HR3 (an unlisted field, such as an `input_fidelity` the schema lacks, is dropped without an error), HR4, HR5, HR6, HR7 (the retry ladder above allows three attempts; the third must leave the route — rung 3 or 4 — or open a gate), HR8, HR9, HR10 (a name or title that must be exact is composited afterwards with `media-photo-editing`; quoted in-model text is not exact text), HR11, HR12 (a job has no one to answer: take inputs from the brief, default the rest and say so), HR13, HR14, HR15, HR16, HR17 (from-photo mode: a real person's likeness only with their documented consent), HR20, HR21, HR22 (the routing picks above are dated) — see `media-ai-gen/references/house-rules.md`.

Not applicable: HR18 (a character sheet carries no claims); HR19 (an authoring rule; no ignored warning is on record for this skill yet).
