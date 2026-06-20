# Nano Banana Pro Dialect & the Bible Prompt Templates (recipe A1)

The image reference for **phase B** of `bot-027-character-bible` (generate the sheet + hero).
Per-model prompt adjustments, quirks, and the verbatim recipe-A1 prompt templates this phase
pastes around the spec's frozen blocks. Recipe A is baked **inline** here because the runtime
sandbox has **no KB access** — this file IS the source of truth at runtime. (Adapted from
BOT-016 `bot-016-reference-sheet/references/nbp-dialect.md`, including the `--resolution`-removed
fix proven at Test 2026-06-19.) Source: BOT-027 `research/prompt-engineering.md` +
`research/model-evaluation.md`, recipe family A from KB Cinematic Video Recipes §A1 + Prompting
Nano Banana Pro; ai-gen v2.1.0 surface verified in the Step-0 PoC (2026-06-18/20).

## The consistency mechanism (read before composing anything)

Identity is carried by **three reinforcing mechanisms**, in priority order:

1. **The reference image (primary, when present).** The user's `inputs/ref.png` recorded
   in the spec's `## Reference image` field is passed as `--ref` on BOTH the sheet and the
   hero. A reference is the single biggest fix for identity drift — pass it on every
   generation when the spec has one.
2. **The frozen blocks (reinforcement).** `STYLE_STACK` + `CHARACTER_BLOCK` are pasted
   from `character-spec.md` **byte-for-byte**, never retyped from memory, never
   "improved". The moment a token is paraphrased ("violet eyes" → "purple eyes") the model
   drifts toward the looser description. This is the **no-synonym rule**.
3. **The fixed seed (tie-breaker).** The spec's `## Seed` (default 7777) is reused on the
   sheet, the hero, and any retry — it keeps low-level rendering choices stable.

If the spec has no reference image, the lock degrades to blocks-plus-seed — still the
documented path (the Step-0 PoC held identity from a single still through a whole 5-shot
cinematic), but a real reference strengthens it.

## Why this bible feeds Seedance (the downstream contract)

These two images ARE the cross-shot identity anchor for phase 3: the Seedance
`reference-to-video` call passes `reference-sheet.png` as `--ref` (`@Image1`) and `hero.png` as
`--ref` (`@Image2`), and the render prompt says "maintain the EXACT same identity in every
shot". So the bible must be **clean and unambiguous**: ONE consistent character, no stray text,
a hero usable as the first frame. A drifting or text-littered sheet poisons every shot
downstream — which is why phase B self-checks the pixels before passing the bible off.

## Prompt assembly contract (what the caller composes per asset)

Every prompt is assembled in this fixed order and written to `work/<project>/prompt-*.txt`,
then handed to `scripts/gen-image.sh` (which composes nothing itself):

```
<STYLE_STACK verbatim from spec> . <CHARACTER_BLOCK verbatim from spec> . <view/hero instruction> . no text in the image . <aspect ratio>
```

- The frozen blocks come **first** and **verbatim** — never reorder their internal tokens,
  never swap a synonym.
- The aspect ratio is stated at the **END** of the prompt (recipe-A convention) AND passed
  as `--aspect-ratio` to the CLI (belt-and-suspenders).
- **Always append "no text in the image"** — recipe A3's gotcha: these models sometimes
  print the character's name or stray labels on the sheet. A turnaround/hero must be clean
  (a label baked into the bible would carry into the Seedance shots).

### A1 — turnaround sheet instruction (verbatim template)

Paste this **after** the frozen blocks for `reference-sheet.png`. `[VIEW_LIST]` is the
spec's requested views as a comma list (default: `front view, three-quarter view, side
profile, back view`):

> "Create a complete character turnaround sheet showing the same character from these
> angles: [VIEW_LIST]. All views show the SAME character with consistent proportions,
> facial features, hair, outfit, and color palette — no drift between views. Clean neutral
> background with clear separation between views. Professional character-design reference
> sheet, clean render. No text in the image. 16:9."

(Mirrors KB §A1's "four angles … same character with consistent proportions and design
details. White clean background with clear separation between views. Professional character
design sheet" — adapted to take the spec's view list and the no-text rule.)

### Hero portrait instruction (verbatim template)

Paste this after the frozen blocks for `hero.png`:

> "A clean front-facing hero portrait of the same character, head-and-shoulders to
> three-quarter body, centered, looking toward camera, neutral studio background, even
> lighting, sharp focus. Single character, no other figures. No text in the image. 16:9."

The hero is the canonical i2v **start frame** the Seedance render feeds first (`@Image2`) — it
must be one clean front view, not a multi-pose sheet.

## The pinned chain (walk in order — never improvise out-of-chain)

| Order | Model | fal slug | Role | Notes |
|---|---|---|---|---|
| 1 | Nano Banana Pro | `fal-ai/nano-banana-pro` | primary sheet + hero | best identity + text/no-text control; `--aspect-ratio` + `--ref` (≤14 refs); renders at model-default resolution (no `--resolution` flag — see quirks) |
| 2 | GPT Image 2 | `openai/gpt-image-2` | fallback 1 | Thinking Mode; ≤16 refs; "no text" gotcha is strongest here |
| 3 | Nano Banana 2 | `fal-ai/nano-banana-2` | fallback 2 | cheaper Flash sibling; fixed-seed 5-person consistency; `--ref` supported |

**Unlike BOT-013's chain, all three models here are reference-capable and
aspect-ratio-capable** — so `gen-image.sh` passes `--aspect-ratio` + `--ref` to every
model and the character lock survives a fallback (BOT-013's diffusion fallbacks were
ref-blind and lost the lock). Record the **actual producing model** for every asset in
`bible-log.md`; inventing an out-of-chain model mid-run is exactly the BOT-007 "SD 3.5
incident" — don't.

## Per-model quirks

### fal-ai/nano-banana-pro (primary)

- **Reference-capable** — `--ref <path|url>` (≤14 image refs) carries the locked figure.
  Local paths and hosted URLs both work (the CLI uploads locals via fal storage).
- **Takes `--aspect-ratio`** (one-of incl. `16:9`). The model *has* a `1K`/`2K`/`4K`
  resolution parameter, but the ai-gen CLI does **not** expose a `--resolution` flag for it
  — Test 2026-06-19 showed passing `--resolution` makes nano-banana-pro exit non-zero and
  the chain skip the primary. So `gen-image.sh` passes NO resolution flag; every model
  renders at its own default (16:9 was crisp at default in the Step-0 PoC). The skill's
  `resolution` input is accepted-but-ignored for forward-compat.
- **Positive framing only** (Gemini image models break on negation) — but "no text in the
  image" is the one sanctioned constraint the recipes keep, because it reliably suppresses
  the printed-name failure. Phrase the rest of the prompt positively (e.g. "clean neutral
  background", not "no clutter").
- Strong material/lighting affinity — the STYLE_STACK lands as written; do not pad it.
- Cheap (tens of credits per image). Honors `--seed`. Pass `--max-cost 80` as a guard.

### openai/gpt-image-2 (fallback 1)

- **Thinking Mode** improves multi-view coherence on a face/turnaround sheet; up to 16 ref
  images per edit, up to 3840×2160. Good when NBP is unavailable.
- **"No text" gotcha is strongest here** — A3 notes it readily prints the character's name
  as a label. The appended "no text in the image" constraint is doing real work for this
  model; keep it.
- **Reference-flag is runtime-confirm.** The exact CLI flag for passing a reference image
  to `openai/gpt-image-2` via ai-gen v2.1.0 was not pinned at Author. `gen-image.sh` passes
  the SAME `--ref` (and `--aspect-ratio`) it passes to NBP; **if gpt-image-2 rejects an
  argument, ai-gen exits non-zero and the chain simply FALLS THROUGH to nano-banana-2** —
  an honest availability/arg failure, recorded in the log, never worked around with an
  out-of-chain model. Confirm the flag at Test with `ai-gen --help` and
  `ai-gen info openai/gpt-image-2`; if it differs, this is the one place to adjust.

### fal-ai/nano-banana-2 (fallback 2)

- The cheaper Gemini-Flash sibling — last resort, still reference-capable and supports a
  fixed seed (recipe A4: random seeds ≈30% variance, so the spec's fixed seed matters
  here). Holds up to ~5-person consistency.
- Takes `--aspect-ratio` + `--ref`. Weaker than NBP on fine identity detail; acceptable as
  insurance. Record the substitution honestly in the log.

## Seed & settings discipline

- **One seed per character**, taken from `character-spec.md`'s `## Seed` (default **7777**),
  reused on the sheet, the hero, and any retry. Changing the seed mid-bible re-rolls
  low-level rendering even with an identical prompt + ref.
- **Aspect ratio** `16:9` for the sheet (a video-storyboard reference matching the render's
  default AR) and the hero, stated at the end of the prompt AND passed as `--aspect-ratio`.
- **Resolution** is accepted-but-ignored (see the NBP quirk); each model renders at its own
  default. Do not pass `--resolution` — it skips the primary model.
- Retries after a failed self-check keep the **same seed** — only the prompt tightens
  (e.g. emphasize a drifting token); never change the seed to "fix" drift.

## ai-gen CLI mechanics (v2.1.0)

The command shape `gen-image.sh` issues (same flags to all three models):

```bash
ai-gen image "<prompt>" -m fal-ai/nano-banana-pro \
  --aspect-ratio 16:9 \
  --ref <inputs/ref.png|url> --seed 7777 \
  -o <artifacts/<project>> --format json --max-cost 80
```

- **Always pass `-o` explicitly.** The CLI default output dir is `/home/user/artifacts`
  (flat) — without `-o`, files land outside the project folder and break the path contract.
- **Always pass `-m` explicitly.** Never rely on CLI defaults for model choice.
- **`--max-cost` is in CREDITS** (1 cr ≈ $0.004), and aborts *before* submitting if the
  estimate exceeds it.
- `--format json` returns the v2.1.0 stable contract: the local file is
  **`files[0].local_path`** (files[] entries are OBJECTS, not strings), the hosted URL is
  **`hosted_urls[0]`** (a fixed field regardless of model, a `*.fal.media` URL). Never regex
  the raw blob; `gen-image.sh` reads `hosted_urls[0]` first with a `*.fal.media` walk as
  fallback, and retries once when a response lacks the URL.
- **`credits_used` is unreliable** (over-reported ~8.4× on some models 2026-06-15) — trust
  `ai-gen estimate` / `ai-gen balance` deltas for true cost, never the JSON `credits_used`.
- **Runtime discovery is informative only.** The chain is pinned; the proxy has served
  unlisted models and 404'd listed ones. Attempt the chain in order regardless of what
  `ai-gen models` says; the JSON `success` field is the only truth. `ai-gen info <slug>`
  shows the per-model parameter schema (use it at Test to confirm the gpt-image-2 ref flag).

## Fallback reasoning (why this order)

- **NBP first** because it produced the on-brief robot bible in the Step-0 PoC and has the
  strongest identity + reference conditioning + clean-text control.
- **gpt-image-2 second** because Thinking Mode gives the best multi-view coherence among the
  fallbacks when NBP is down — but its ref flag is the one runtime-confirm risk, hence it is
  not first.
- **nano-banana-2 third** as the cheap, reference-capable last resort. If all three fail,
  that is a recorded failure (no partial sheet passed off as complete), not a cue to reach
  for an out-of-chain model.

## See also (build-time only — NOT reachable at runtime)
- KB Cinematic Video Recipes §A1 + Prompting Nano Banana Pro (baked inline above).
- The spec contract & token discipline: `references/trait-lock.md` (phase A).
