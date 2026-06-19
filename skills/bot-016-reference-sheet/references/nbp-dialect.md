# Nano Banana Pro Dialect & the Bible Prompt Templates

Per-model prompt adjustments, quirks, and the verbatim recipe-A1 prompt templates this
skill pastes around the spec's frozen blocks. Recipe A is baked **inline** here because
the runtime sandbox has **no KB access** — this file IS the source of truth at runtime.
Source: BOT-016 `research/prompt-engineering.md` + `research/model-evaluation.md`, recipe
family A from KB [Cinematic Video Recipes §A](../../../../../kb/wiki/topics/cinematic-video-recipes.md)
and [Prompting Nano Banana Pro](../../../../../kb/wiki/topics/prompting-nano-banana-pro.md);
ai-gen v2.1.0 surface verified in the Step-0 PoC (2026-06-18).

## The consistency mechanism (read before composing anything)

Identity is carried by **three reinforcing mechanisms**, in priority order — the same
discipline BOT-013 proved:

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
documented path (the Step-0 PoC held identity from a single still), but a real reference
strengthens it.

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
  print the character's name or stray labels on the sheet. A turnaround/hero must be clean.

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
details. White clean background with clear separation between views. Professional
character design sheet" — adapted to take the spec's view list and the no-text rule.)

### Hero portrait instruction (verbatim template)

Paste this after the frozen blocks for `hero.png`:

> "A clean front-facing hero portrait of the same character, head-and-shoulders to
> three-quarter body, centered, looking toward camera, neutral studio background, even
> lighting, sharp focus. Single character, no other figures. No text in the image. 16:9."

The hero is the canonical i2v **start frame** the director bots feed first — it must be one
clean front view, not a multi-pose sheet.

## The pinned chain (walk in order — never improvise out-of-chain)

| Order | Model | fal slug | Role | Notes |
|---|---|---|---|---|
| 1 | Nano Banana Pro | `fal-ai/nano-banana-pro` | primary sheet + hero | best identity + text/no-text control; `--aspect-ratio` + `--resolution` + `--ref` (≤14 refs) |
| 2 | GPT Image 2 | `openai/gpt-image-2` | fallback 1 | Thinking Mode; ≤16 refs; "no text" gotcha is strongest here |
| 3 | Nano Banana 2 | `fal-ai/nano-banana-2` | fallback 2 | cheaper Flash sibling; fixed-seed 5-person consistency; `--ref` supported |

**Unlike BOT-013's chain, all three models here are reference-capable and
aspect-ratio-capable** — so `gen-image.sh` passes `--aspect-ratio` + `--ref` to every
model and the character lock survives a fallback (BOT-013's diffusion fallbacks were
ref-blind and lost the lock). Record the **actual producing model** for every asset in
`generation-log.md`; inventing an out-of-chain model mid-run is exactly the BOT-007 "SD 3.5
incident" — don't.

## Per-model quirks

### fal-ai/nano-banana-pro (primary)

- **Reference-capable** — `--ref <path|url>` (≤14 image refs) carries the locked figure.
  Local paths and hosted URLs both work (the CLI uploads locals via fal storage).
- **Takes `--aspect-ratio`** (one-of incl. `16:9`) plus a **`--resolution` preset**
  (`1K`/`2K`/`4K`, default `1K`). The skill defaults the sheet to `2K` for a crisp,
  inspectable turnaround; `1K` is fine for drafts. The hero can stay `1K`/`2K`.
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
- **Aspect ratio** `16:9` for the sheet (a video-storyboard reference) and the hero, stated
  at the end of the prompt AND passed as `--aspect-ratio`.
- **Resolution** `2K` for the sheet (crisp, inspectable); `1K`/`2K` for the hero.
- Retries after a failed self-check keep the **same seed** — only the prompt tightens
  (e.g. emphasize a drifting token); never change the seed to "fix" drift.

## ai-gen CLI mechanics (v2.1.0)

The command shape `gen-image.sh` issues (same flags to all three models):

```bash
ai-gen image "<prompt>" -m fal-ai/nano-banana-pro \
  --aspect-ratio 16:9 --resolution 2K \
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

- **NBP first** because it produced the on-brief dark-elf bible still in the Step-0 PoC and
  has the strongest identity + reference conditioning + clean-text control.
- **gpt-image-2 second** because Thinking Mode gives the best multi-view coherence among the
  fallbacks when NBP is down — but its ref flag is the one runtime-confirm risk, hence it is
  not first.
- **nano-banana-2 third** as the cheap, reference-capable last resort. If all three fail,
  that is a recorded failure (no partial sheet passed off as complete), not a cue to reach
  for an out-of-chain model.

## See also (build-time only — NOT reachable at runtime)
- KB [Cinematic Video Recipes §A](../../../../../kb/wiki/topics/cinematic-video-recipes.md)
- KB [Prompting Nano Banana Pro](../../../../../kb/wiki/topics/prompting-nano-banana-pro.md)
- The spec contract & token discipline: the sibling skill `bot-016-character-design`.
