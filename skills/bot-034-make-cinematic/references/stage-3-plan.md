# Stage 3 — plan (the shot-list)

Absorbs BOT-027 `bot-027-shotlist` (phase 2). Turns the concrete story + the locked bible into
a numbered, time-coded **shot-list** — the render contract. This is a **pure-LLM** stage (no
`ai-gen`, no network). The deep grammar lives in `references/shot-grammar.md` (the C/E recipes,
the 5-layer stack, the camera/lighting vocabulary, two fully worked examples) — **load it before
writing shots.**

**Reads:** `context.md`, `artifacts/<slug>/seed-snapshot/` (the bible tokens + blocks).
**Writes:** `artifacts/<slug>/shotlist.md` (gated by `scripts/validate-shotlist.sh`).

> The file is named `shotlist.md` because the bot-local linter (`validate-shotlist.sh`) and the
> generate stage key off that exact name. It IS this recipe's `plan.md`.

---

## Step 1 — The render mechanic (read before writing)

Seedance 2.0 renders the **entire numbered shot-list in ONE `reference-to-video` pass** and
carries the character, lighting, and palette across the cuts itself — the bible turnaround
(`@Image1`) + hero (`@Image2`) are passed as `--ref`. There is no separate edit, so a weak or
malformed shot-list **cannot be rescued downstream**. Two things make the pass hold together,
and both are this stage's job:

1. **State shot count + total duration + aspect at the TOP, then write each shot individually.**
   The model reads the time-codes as cut instructions. Stack two actions or two camera moves
   into one shot and you get the #1 jitter cause.
2. **Lock identity to the bible explicitly** with the `@Image1`/`@Image2` line, quoting a tight
   2–3 token subset of the bible's CHARACTER_BLOCK **verbatim** (never paraphrase a locked token).

## Step 2 — Choose profile + global header

- **`story` (default).** Arc: **wide establishing → tighter → climax → resolve.** Header =
  `Multi-shot cinematic <genre> short, <medium e.g. Pixar-style 3D animation / 35mm live-action>,
  cinematic lighting, professional color grading, <one lighting/look phrase>.` Derive the
  medium/look from the bible's STYLE_STACK and any style in `context.md`. Never write `cinematic`
  or `epic` bare — always pair `cinematic` with a lighting word, a texture, or a film reference.
- **`fight`.** Arc: **standoff → first clash → escalation → counter → final strike.** Header =
  the E2 dark-fantasy block (verbatim where it fits) from `references/shot-grammar.md` §E2, with
  the lighting-first + color-grading shape kept if the world is not dark-fantasy.

## Step 3 — The identity-lock line + scene line

Immediately under the header, one line that pins the bible to the prompt — EXACTLY this shape
(substitute the bible Name and a tight 2–3 verbatim token subset from `identity.md`):

```
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2-3 verbatim Identity Tokens>) — maintain the EXACT same character identity in every shot.
```

`@Image1` = the turnaround, `@Image2` = the hero — that order matches how stage 4 passes `--ref`.
Then one short line of world/scene establishment.

## Step 4 — Write the time-coded shots

Write **shot-count** (default 5, valid 4–6) numbered shots that **tile `[0..duration]` with no
gaps and no overlaps** — shot 1 starts at `0s`, each start equals the previous end, the last
ends at exactly `duration` (±1s). Each shot is ONE line:

```
[0-3s]: <camera move> + <ONE action> + <lighting/look>. <optional [VFX: ...]>
```

Craft rules (`validate-shotlist.sh` enforces the structural ones; `shot-grammar.md` carries the rest):

- **One action + one camera move per shot** (separate subject motion from camera motion).
- **Name a camera move** from the vocabulary (push-in, tracking shot, orbit, low-angle, static,
  close-up, wide establishing, …) and a **concrete present-tense action**.
- **Lighting first** among style words (golden hour / rim light / volumetric) — highest
  quality-per-word; state a lighting/look phrase in most shots.
- **One slow-mo ramp** on the key beat (story climax / fight final strike): "ramps into slow
  motion … snaps back". `fast` is the most dangerous keyword — make only ONE element fast.
- **No negative prompts inside a shot** — stability/identity constraints live once in the footer
  suffix. Refer to the character as "the `<Name>`"; don't re-describe the full bible per shot.
- Optional inline VFX as `[VFX: petals scattering]` — one short bracketed cue.

## Step 5 — The footer + constraint suffix

Close with EXACTLY this footer (the render greps `Total:` for `--duration` / `--aspect-ratio`):

```
Total: <duration>s / <shot-count> shots / <aspect-ratio>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.
```

`Total:` restates duration / shot count / aspect (all must agree with the time-codes and header).
`Audio:` describes the native in-pass score + 2–3 concrete SFX + an ambience bed (Seedance
generates audio in the same pass — there is no separate mix).

## Step 6 — Write `shotlist.md` (the linter's exact shape)

```markdown
# Shotlist: <slug>

<global style/look header — one line>
@Image1 is the character turnaround reference and @Image2 is the hero reference for <Name> (<2-3 tokens>) — maintain the EXACT same character identity in every shot.
<one-line world/scene establishment>

[0-Xs]: <camera> + <action> + <lighting>. <optional [VFX: ...]>
[X-Ys]: <camera> + <action> + <lighting>.
... (4-6 shots, tiling [0..duration])

Total: <duration>s / <shot-count> shots / <aspect-ratio>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, avoid jitter, smooth motion, stable picture, no flicker.

## Notes

- <profile chosen, defaults applied, the slow-mo beat, any VFX>
```

Keep the whole file ≤1,200 words — the composed render prompt must stay within model limits.

## Step 7 — Validate (≤3 fix cycles)

```bash
scripts/validate-shotlist.sh artifacts/<slug>/shotlist.md
```

The linter is fully structural (zero LLM judgment): title + non-empty header; the
`@Image1`/`@Image2` identity line; 4–6 `[Xs-Ys]:` shots tiling `[0..duration]` (no gaps/overlaps,
last end == footer duration ±1s); each shot names a camera move AND has ≥25 chars of action and
≤400 chars; no negative-prompt syntax opening a shot; the `Total: Ns / K shots / AR.` footer with
`K` == shot count and the `Audio:` clause + the positive-constraint suffix present.

Fix and re-run up to **3 cycles**. After 3 failed cycles, mark stage 3 `blocked` in `state.md`
with the specific linter error — never proceed to the paid render on an invalid shot-list.

## Step 8 — Advance the ledger

Mark stage 3 `done` (note "validate-shotlist: PASS — K shots, Xs total"), set stage 4 `generate`
`in-progress`. Update the dashboard "Plan shot-list" row to `✓ done (K shots, Xs)`. Update
`next_action`: "Stage 4 generate — compose the render prompt from shotlist.md (verbatim) + the
bible refs; cost.sh estimate; ONE gen-cinematic.sh reference-to-video call (turnaround=@Image1,
hero=@Image2), --max-cost gated."
