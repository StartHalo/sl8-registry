# Stage 3 — plan (the continuous-shot plan)

Absorbs BOT-030 `bot-030-continuous-plan`. Turns the concrete subject into a linter-gated
**continuous-plan** describing ONE unbroken take (no cuts) as a base segment + a chain of
extend "hops". This is a **pure-LLM phase** — no `ai-gen` calls, no network, no images.

**Reads:** `context.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/continuous-plan.md` (gated by `scripts/validate-plan.sh`).

> Read `references/continuous-grammar.md` before composing — it carries the Veo
> image-to-video + extend recipe, the ≥80%-subject-repeat rule, the "one evolving shot, no
> cuts" rules, the camera/look vocabularies, and a fully worked `dawn-owl` example, all baked
> inline (the runtime sandbox has no KB access).

---

## The render mechanic (why the plan is shaped this way)

Veo renders this plan as **one continuous take in N+1 inference passes that share a frame
boundary**:

1. **BASE** — a Veo `image-to-video` pass turns the opening-frame image into the first ~8s
   with native audio (seeded from the ONE base still the generate stage makes via the shared
   `gen-image.sh`).
2. **HOP 1..N** — each Veo `extend-video` pass takes the *previous clip* and continues it for
   ~7s with no cut. The extend model only sees the trailing frame + your hop prompt, so the
   hop prompt must **re-state the subject ≥80% verbatim** or identity drifts. **There is no
   concat** — `extend-video` returns the FULL grown video each hop.

Because there is exactly one shot, there are **no time-codes and no shot list**.

## Step 1 — Resolve inputs and defaults (headless)

| input | required | default when absent |
|---|---|---|
| subject/journey (from `context.md`) | yes | — (clean recorded failure if context.md has none) |
| hop-count | no | `2` (valid 2-3 → base 8s + N×7s) |
| aspect | no | `16:9` (`9:16` only if the brief says Shorts; Veo allows only these two) |

Every default applied and assumption made gets a bullet in the plan's `## Notes`.

## Step 2 — The global style/look header (one line, FIRST under the title)

Pair `cinematic` with concrete look words — a medium, a lighting phrase, a grade — never bare
`cinematic`/`epic`. **Use the seed's look header verbatim** from `seed-snapshot/style.md`
(e.g. `One continuous take, stylized 3D animation, soft volumetric dawn light, warm gentle
color grading, shallow depth of field, polished render.`). This applies to the WHOLE take —
base and every hop inherit it; do not restate it per hop.

## Step 3 — The CHARACTER token block (the seed tokens, verbatim)

Under the header, a `CHARACTER:` line listing the **5–7 frozen tokens from
`seed-snapshot/identity.md`**, verbatim and `;`-separated. These ARE the channel's locked
identity (token kit) — do not invent new ones for a continue-channel/new-shot run; only a
reset-character run changes them (via `bot-036-update-character`, before this stage). They are
the exact phrases you reuse, verbatim, in the base subject sentence and in every hop.

```
CHARACTER: <token 1>; <token 2>; <token 3>; <token 4>; <token 5> (5-7 frozen verbatim tokens)
```

## Step 4 — The BASE block (opening frame + base motion + native audio)

One `Base:` line = the opening frame as an image description PLUS the base continuous motion
PLUS one native-audio phrase:

```
Base: <opening-frame image description — the subject (tokens woven in verbatim) in its world, the look, the framing> <the subject in ONE continuous primary movement over ~8s> Audio: <native ambience + soft score + diegetic SFX>.
```

- **Opening-frame description** establishes the full subject (tokens verbatim), the world,
  the light, the framing — this is the still the base i2v is seeded from.
- **Base motion** is ONE continuous movement the camera follows over ~8s, present tense, a
  direction to execute, not a state ("the owl lifts and glides low over the treetops"). Name
  the camera as a continuous move (gentle tracking / slow push-in / following gimbal), not a cut.
- **Native audio** — one short phrase; Veo generates it in-pass (no separate TTS/mix).

## Step 5 — The HOP continuation prompts (2-3)

`hop-count` numbered `Hop N:` lines. Each hop continues the SAME unbroken shot — camera and
subject keep moving from where the last segment ended, **with no cut**. Each hop:

- **Repeats the subject ≥80% verbatim** — re-state the frozen CHARACTER tokens and subject
  phrasing almost word-for-word. The #1 continuity rule for extend; paraphrasing drifts identity.
- **Adds only ONE new beat** — one new motion or scenery development the shot evolves into
  (lower along a stream; then rise toward the sun). One beat per hop, never a fresh scene.
- **Continues, never cuts** — open with continuity language ("The same <subject> continues",
  "without any cut, the shot keeps moving"); keep the camera move continuous. Never "cut to",
  "next shot", "meanwhile", or a new framing implying an edit.
- **No time-codes** (a hop is ~7s by construction); **no negative prompts** (positives only —
  the stability/identity/no-cut constraints live once in the footer).

```
Hop 1: The same <subject, ≥80% verbatim>, without any cut the shot continues as <one new beat>, <continuous camera>.
```

## Step 6 — The footer + constraint suffix (exact shape)

```
Total: ~<8 + 7*hops>s (one continuous take, no cuts) / <aspect>. Audio: <native score + SFX + ambience>. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.
```

`Total:` restates the computed length (`8 + 7*hop-count`; ±1s), marks it one continuous take,
and states the aspect — the render greps this line. The suffix is appended once, verbatim.

## Step 7 — Write `continuous-plan.md` (the linter's exact shape)

```markdown
# Continuous-plan: <slug>

<global style/look header — one line, from the seed>
CHARACTER: <token 1>; <token 2>; <token 3>; <token 4>; <token 5> (5-7 frozen verbatim tokens)

Base: <opening-frame image description + base 8s continuous motion + native audio>.
Hop 1: The same <subject ≥80% verbatim>, without any cut <one new beat>, <continuous camera>.
Hop 2: The same <subject ≥80% verbatim>, without any cut <one new beat>, <continuous camera>.
... (2-3 hops total)

Total: ~<8 + 7*hops>s (one continuous take, no cuts) / <aspect>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.

## Notes

- <hop-count, aspect, defaults applied, assumptions, the new beat per hop>
```

Keep the whole file ≤1,000 words — the per-pass Veo prompts must stay within model limits.

## Step 8 — Validate (≤3 fix cycles)

```bash
scripts/validate-plan.sh artifacts/<slug>/continuous-plan.md
```

The linter is fully structural (zero LLM judgment): the `# Continuous-plan:` title; a non-empty
look header; a `CHARACTER:` block of 5–7 tokens; exactly ONE `Base:` block (≥60 chars); 2–3
numbered `Hop N:` lines each carrying continuity language, repeating ≥half the CHARACTER tokens
verbatim, leaking no cut-language, not opening with a bare negative; and the `Total: ~Ns (one
continuous take...) / AR.` footer with `N = 8 + 7*hops` (±1s), the `Audio:` clause, and the
positive-constraint suffix. It prints itemized `FAIL: …` lines or `OK: …`.

Fix and re-run up to **3 cycles**. After 3 failed cycles, keep the best version, mark stage 3
`blocked` in `state.md` with the linter output quoted — never proceed to paid generation on an
invalid plan.

## Step 9 — Advance the ledger

Mark stage 3 `done` (note "validate-plan: PASS — 1 base + N hops, ~Xs total"), set stage 4
`generate` `in-progress`. Update the dashboard "Plan continuous shot" row to `✓ done`. Update
`next_action`: "Stage 4 generate — compose the base-frame prompt, gen the ONE base still via
video-toolkit/gen-image.sh, then run scripts/gen-extend.sh (Veo base i2v + extend chain → episode.mp4)."
