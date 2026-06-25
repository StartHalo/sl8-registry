# Per-Asset Self-Check

Run this against every generated image (Read the PNG — actually look at it) before
logging it as `kept`. The check exists because the failure modes below are the ones
that survive a successful API call: the JSON says `success: true` and the image is
still wrong. Record one verdict per dimension in the asset's log block
(`self-check: figure=PASS cap=PASS style=PASS action=PASS`).

**The retry budget is ONE.** A failed dimension earns one retry with reinforced
negatives (same seed, same model chain). If the retry also fails: keep the best of the
two attempts, mark the dimension `FAIL`, and explain in the notes. Honesty over
perfection — a recorded deviation is graded better than a hidden one, and retry loops
burn credits without converging.

## The checklist

### 1. `figure` — exactly one figure?

- PASS: one stick figure (turnaround: one figure per view, all views the same figure).
- FAIL: duplicate/ghost figures, a second partial figure in the background, merged
  limbs forming a phantom figure.
- **On failure, append to the prompt's negatives:** `Exactly one stick figure in the
  scene. No background figures, no reflections of the figure, no duplicate figures.`

### 2. `cap` — cap present and unmutated?

- PASS: the small baseball cap (or the spec's headwear) is present, correctly placed,
  consistent with the spec. The cap is the character's single identity marker — a
  missing cap is an identity break across the episode.
- FAIL: cap missing, morphed into hair/helmet, duplicated, or on the wrong angle
  relative to the spec.
- **On failure, reinforce in the scene block (not negatives):** restate `wearing a
  small baseball cap slightly tilted` as the last clause of the scene sentence —
  position in the prompt raises its weight.

### 3. `style` — pencil-sketch, monochrome, matches the set?

- PASS: graphite monochrome on paper white, visible sketch texture, consistent with
  the stills already kept this episode (open one earlier kept still side-by-side).
- FAIL: any color tint, photographic rendering (recraft's known quirk), ink/vector
  look, or an obvious texture shift vs the set.
- **On failure, append to negatives:** `Strictly monochrome graphite pencil on white
  paper. No color of any kind, no photographic rendering, no digital vector look.`
  If a recraft output misreads as a photo, also add the guard phrase `flat
  illustration, not a photograph`.

### 4. `action` — one readable action?

- PASS: a viewer names the action in three words within a second ("mopping the
  floor"). Posture carries it; the figure is prominent (close/medium framing).
- FAIL: two competing actions, ambiguous posture, figure too small in a wide shot,
  or background detail competing for the eye.
- **On failure, fix the scene block, not the negatives:** trim to the single
  strongest action, name the posture physically, and pull the framing closer
  (`close-up`, `medium shot, figure fills most of the frame`). Note the trim in the
  log.

### 5. `text` — label legible? (text-bearing assets only)

- PASS: the single planned word ("TASK") reads correctly at a glance.
- FAIL: garbled letters, extra phantom words, the word repeated.
- **On failure:** one regeneration on the same `text` chain. A second failure means
  **drop the label** — rewrite the scene without it, regenerate on the `stills` chain
  with the standard NEGATIVES_BLOCK, and record the drop in the spec/log. A clean
  unlabeled prop beats a garbled word in every graded rubric.

### 6. `views` — ≥3 distinct consistent views? (turnaround only)

- PASS: at least three clearly distinct views (front / three-quarter or profile /
  back) of the SAME figure — cap, proportions, stroke weight consistent across views.
- FAIL: fewer than 3 distinct views, views disagreeing on proportions or cap, or
  different "characters" per view.
- **On failure, reinforce the scene block:** `identical proportions, identical cap,
  identical line weight in every view` and retry once. If the retry still disagrees,
  keep the best sheet and record which views are trustworthy — phase 3 only needs the
  written block + seed, so a weak turnaround degrades the deliverable, not the
  pipeline.

## Recording verdicts

- Beat stills → the `self-check:` line of the beat's block in
  `03-stills/stills-log.md`, deviations in `notes:`.
- Character assets → a `Self-check` line per asset in `character-spec.md`'s Assets
  section or its Deviations list.
- Never round a FAIL up to PASS. The downstream vision grading re-checks these
  dimensions; a dishonest log fails harder than an honest deviation.
