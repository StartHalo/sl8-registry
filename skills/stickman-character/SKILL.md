---
name: stickman-character
description: Generates and manages channel-level character assets for the stickman animator. On first run (US-1/US-3) it generates character-source.png (front-facing), character-threequarter.png (¾ view), and character-sideprofile.png (side profile) as separate anchored images to avoid multi-view drift and model-added watermarks. Always copies all character assets to the episode folder so every episode is self-contained. Use this skill for Phase 2 (lock-character) of any episode run, or standalone for character-only commissions (US-4).
metadata:
  inputs:
    - name: character-definition
      type: markdown
      description: Channel character definition (character.md) — physical traits and construction rules.
    - name: art-direction
      type: markdown
      description: Channel art-direction and style definition (art-direction.md).
  outputs:
    - name: character-source
      type: image
      path: artifacts/character-source.png
      description: Front-facing canonical character anchor used as the --ref for all stills and clips.
    - name: character-views
      type: image
      description: Three-quarter and side-profile character views anchored to the source.
    - name: character-spec
      type: markdown
      path: artifacts/character-spec.md
      description: Frozen character prompt blocks, locked seed, and hosted view URLs.
---

# Phase 2 — Lock Character (stickman-character)

**Reads:** `artifacts/character.md`, `artifacts/art-direction.md`

**Writes (channel-level, generated once):**
`artifacts/character-source.png`, `artifacts/character-threequarter.png`,
`artifacts/character-sideprofile.png`, `artifacts/character-spec.md`

**Writes (episode copy, always):**
`<ep>/character/` — 5 files copied so the episode folder is self-contained

---

## Step 1 — Determine mode

Check two conditions:
1. Does `artifacts/character-source.png` exist?
2. Does the episode's `context.md` say `Reset character: true`?

| source.png exists? | Reset character? | Mode |
|--------------------|-----------------|------|
| No | any | **GENERATE** |
| Yes | true | **RESET** (archive existing, then GENERATE) |
| Yes | false | **COPY-ONLY** (series continuation — skip to Step 8) |

**RESET mode:** before generating, move existing channel character files to
`artifacts/archive/<YYYY-MM-DD>/` (character-source.png, threequarter, sideprofile,
character-spec.md). Note the archive path in state.md.

**COPY-ONLY mode:** skip Steps 2–7 entirely. Go directly to Step 8.

---

## Step 2 — Bootstrap channel files (copy-if-absent)

Ensure channel config files exist before reading them:

1. `artifacts/art-direction.md` — if missing, copy from `templates/art-direction.md`
2. `artifacts/character.md` — if missing, copy from `templates/character.md`

**Never overwrite existing files** — they contain the user's active settings.

---

## Step 3 — Read definitions

Read both files and extract the 4 frozen blocks used verbatim in every image prompt:

- **STYLE block** — visual rendering style (from art-direction.md)
- **CHARACTER block** — physical description (from character.md)
- **DISCIPLINE block** — stickman construction rules (from character.md)
- **CONSTRAINTS block** — output constraints (from art-direction.md)

Also pick a random seed (integer 100–999) — this seed is locked for the whole character
set and reused in every still in Phase 3.

---

## Step 4 — Generate character-source.png (GENERATE mode only)

This is the canonical front-facing anchor image. All other views use it as `--ref`.

```bash
ai-gen image -m fal-ai/nano-banana-pro \
  -s square_hd \
  --seed <seed> \
  --output artifacts/ \
  --format json \
  --max-cost 80 \
  "[Style]: <STYLE block>. [Character]: <CHARACTER block>. [Scene]: Stickman standing upright, front-facing, centre frame. Arms at sides, legs slightly apart. Plain white background, close-medium framing — figure fills ~60% of frame height. [Discipline]: <DISCIPLINE block>. [Constraints]: <CONSTRAINTS block>. NO TEXT LABELS. NO WATERMARKS. NO ANNOTATIONS."
```

**Self-check source.png:**
- Single stick figure, front-facing? (fail → retry once with seed+1)
- Single-stroke arms and legs — no rounded or thick limbs? (fail → retry)
- Cap present and correctly placed? (fail → retry)
- Monochrome pencil sketch on plain white? (fail → retry)
- Any model-added text, labels, copyright, or watermarks? (fail → retry with "NO TEXT NO LABELS NO WATERMARKS NO ANNOTATIONS" prepended to prompt)

One retry budget. If still failing: keep best attempt, log DEVIATION in spec.

Record the fal.media hosted URL from the JSON output — needed for `--ref` in Steps 5–6.

---

## Step 5 — Generate character-threequarter.png (GENERATE mode only)

The ¾ view is anchored to source.png via `--ref`. This avoids multi-view drift.

```bash
ai-gen image -m fal-ai/nano-banana-pro \
  --ref <hosted character-source.png URL from Step 4> \
  -s square_hd \
  --seed <same seed> \
  --output artifacts/ \
  --format json \
  --max-cost 80 \
  "[Style]: <STYLE block>. [Character]: <CHARACTER block>. [Scene]: Same stickman facing three-quarter right (body turned ~45° from front). Same single-stroke arms and legs — absolutely no rounded or thick limbs. Same small baseball cap. Plain white background, close-medium framing. [Discipline]: <DISCIPLINE block>. [Constraints]: <CONSTRAINTS block>. NO TEXT LABELS. NO WATERMARKS. NO ANNOTATIONS."
```

**Self-check threequarter.png:**
- ¾ angle (body turned ~45°)? (fail → retry)
- Single-stroke arms and legs — no rounded limbs? (fail → retry)
- Cap visible and consistent with source.png? (fail → retry)
- Any model-added text, labels, copyright, or watermarks? (fail → retry with "NO TEXT NO LABELS NO WATERMARKS NO ANNOTATIONS" prepended)

One retry budget. If still failing: keep best attempt, log DEVIATION in spec.

Save as `artifacts/character-threequarter.png`. Record hosted URL.

---

## Step 6 — Generate character-sideprofile.png (GENERATE mode only)

The side profile is also anchored to source.png via `--ref`.

```bash
ai-gen image -m fal-ai/nano-banana-pro \
  --ref <hosted character-source.png URL from Step 4> \
  -s square_hd \
  --seed <same seed> \
  --output artifacts/ \
  --format json \
  --max-cost 80 \
  "[Style]: <STYLE block>. [Character]: <CHARACTER block>. [Scene]: Same stickman in strict side profile (body turned 90° right). Stick-thin profile — one visible arm extended forward, one visible leg. Same single-stroke limb construction — absolutely no rounded or thick limbs. Same small baseball cap visible in profile. Plain white background, close-medium framing. [Discipline]: <DISCIPLINE block>. [Constraints]: <CONSTRAINTS block>. NO TEXT LABELS. NO WATERMARKS. NO ANNOTATIONS."
```

**Self-check sideprofile.png:**
- Strict side profile (90°)? (fail → retry)
- Stick-thin — one arm, one leg visible? (fail → retry)
- Single-stroke limbs — no rounded or thick limbs? (fail → retry)
- Cap visible in profile and consistent? (fail → retry)
- Any model-added text, labels, copyright, or watermarks? (fail → retry with "NO TEXT NO LABELS NO WATERMARKS NO ANNOTATIONS" prepended)

One retry budget. If still failing: keep best attempt, log DEVIATION in spec.

Save as `artifacts/character-sideprofile.png`. Record hosted URL.

---

## Step 7 — Write character-spec.md (GENERATE mode only)

Path: `artifacts/character-spec.md`. This file is the frozen specification — it is read
verbatim by Phase 3 (stickman-art) and Phase 4 (stickman-clip-assembly). Do not paraphrase.

```markdown
# Character Spec — locked <YYYY-MM-DD>

## Frozen prompt blocks

[STYLE]: <STYLE block verbatim>

[CHARACTER]: <CHARACTER block verbatim>

[DISCIPLINE]: <DISCIPLINE block verbatim>

[CONSTRAINTS]: <CONSTRAINTS block verbatim>

## Seed
<seed integer>

## Reference anchor
Local: artifacts/character-source.png
Hosted: <fal.media URL for character-source.png>

## Views
| View | Local | Hosted |
|------|-------|--------|
| source (front-facing) | artifacts/character-source.png | <URL> |
| three-quarter (¾) | artifacts/character-threequarter.png | <URL or "— not generated"> |
| side profile (90°) | artifacts/character-sideprofile.png | <URL or "— not generated"> |

## Deviations
<"none" or list of DEVIATION notes from self-checks>
```

---

## Step 8 — Copy character assets to episode folder (ALWAYS — all modes)

This step runs regardless of GENERATE or COPY-ONLY mode.

If the episode slug is available from context.md, copy assets to `artifacts/<slug>/character/`.
For US-4 (character-only), skip this step (no episode folder exists).

```bash
mkdir -p artifacts/<slug>/character/
cp artifacts/character-source.png artifacts/<slug>/character/
cp artifacts/character-spec.md artifacts/<slug>/character/
cp artifacts/art-direction.md artifacts/<slug>/character/
# Copy pose files only if they exist:
[ -f artifacts/character-threequarter.png ] && cp artifacts/character-threequarter.png artifacts/<slug>/character/
[ -f artifacts/character-sideprofile.png ] && cp artifacts/character-sideprofile.png artifacts/<slug>/character/
```

The episode's `<ep>/character/` is the SOLE source for Phase 3 and Phase 4.
They must never read from `artifacts/` root — always from `<ep>/character/`.

---

## Step 9 — Update dashboard.html

Read `artifacts/dashboard.html`. In the channel section:
- `character-source.png` → `✓ done — <model>, seed <seed>` (or `✓ reusing` for COPY-ONLY)
- `character-threequarter.png` → `✓ done` or `✓ reusing` or `⚠ DEVIATION: <note>`
- `character-sideprofile.png` → `✓ done` or `✓ reusing` or `⚠ DEVIATION: <note>`

If the lock-character phase row exists in the episode phases table, update it:
`✓ done — character locked` (or `✓ done — reusing existing character`)

Rewrite the full HTML to `artifacts/dashboard.html`.

---

## Step 10 — Update state.md

Mark phase 2 (`lock-character`) as `done`.

- If episode mode (US-1/US-2/US-3): set phase 3 (`generate-stills`) to `in-progress`.
  Update `next_action`: "Run stickman-art — generate scene stills (phase 3)."
- If character-only mode (US-4): set `status: complete`.
  Update `next_action`: "Character complete — assets at artifacts/character-spec.md."

Log any DEVIATION notes in the state.md open-questions section.
