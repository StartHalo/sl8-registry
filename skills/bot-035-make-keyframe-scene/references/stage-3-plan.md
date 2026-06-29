# Stage 3 — plan (the keyframe plan)

Absorbs BOT-029 `bot-029-keyframe-plan`. Turns the concrete story into a linter-gated keyframe
plan that pins BOTH the first and last frame of every scene.

**Reads:** `context.md`, `artifacts/<slug>/seed-snapshot/`.
**Writes:** `artifacts/<slug>/keyframe-plan.md` (gated by `scripts/validate-keyframe-plan.sh`).

> The file is named `keyframe-plan.md` because the bot-local linter (`validate-keyframe-plan.sh`)
> and the generate stage both key off that exact name. It IS this recipe's `plan.md`.

This is a **pure-LLM stage** — no `ai-gen`, no network, no images. The plan is the render
contract; stage 4 reads it and renders. Read `references/keyframe-grammar.md` before composing —
it carries the first-last recipe, the continuity-chaining rule, the state-sequence arc, the
anti-pattern table, and a fully worked baby-dragon example baked inline.

---

## Step 1 — The render mechanic (why the plan is shaped this way)

The plan defines **K+1 pinned states** (state 0 … state K) and **K continuity-chained scenes**.
Scene `i` morphs **state[i-1] → state[i]**: stage 4 generates one keyframe per state, then runs
Hailuo first-last (start = state[i-1], end = state[i]) so the model invents only the *motion*
between two frames it is pinned to. Two facts make the journey hold together, and both are this
stage's job:

1. **Continuity chain.** `state[i]` is the LAST frame of scene `i` AND the FIRST frame of scene
   `i+1` — the SAME image. So scene `i+1` begins on the exact frame scene `i` ended on; **no jump
   cuts**. Every scene line declares its chain `state (i-1) -> state i`.
2. **K+1 states for K scenes.** A journey through K scenes touches K+1 pinned moments — state 0 is
   the first frame of the short, state K is the last. Off-by-one breaks the render; the linter
   hard-gates it.

## Step 2 — Weave the seed into the plan (text-weave)

The character is **self-contained in the keyframes** — there is no separate bible. The look and
identity come from the **token seed kit** (snapshot), woven verbatim:

- **`## Style`** — one short paragraph = the seed `STYLE_HEADER` (medium + lighting + palette).
  Every state shares this world.
- **`## Character`** — the **5–7 frozen tokens from the seed**, copied **byte-identical** as
  `- <key>: <token>` bullets. Do not invent new tokens or paraphrase the seed's — this is the
  `consumption: text-weave` contract. (If the user's story needs a different character, that is a
  `bot-035-update-character` **reset**, not a per-plan edit.)

## Step 3 — Design the state sequence (the arc lives here)

Write `K+1` numbered states under `## Keyframe States`. The arc shape for a reveal/transformation/
morph: **dormant/hidden → first sign → emergence → full form → payoff action.**

- Each `State N:` is a **complete standalone image prompt** — character + setting + lighting +
  composition, with **no reference to other states** (the image model sees only this line).
- Reuse the frozen CHARACTER tokens **verbatim** in the states (copy-paste; never paraphrase).
  The linter's python pass checks every token reappears byte-identical across the states.
- Give each state a **distinct silhouette** from its neighbours (closed egg vs cracked egg vs
  peeking head vs standing+wings vs hovering) — that legible difference is what the scene between
  them animates. State 0 is often the character *before* it appears; state K is the payoff pose.
- Keep the subject large in frame and clearly lit (avoid the very darkest lighting) so the Hailuo
  morph stays legible.

## Step 4 — Write the continuity-chained scenes

`## Scenes` lists **K** numbered scenes. Each opens by declaring its chain and gives ONE
motion/transition line:

```
Scene 1: state 0 -> state 1. <one transformation — how state 0 becomes state 1 + an optional gentle camera move>
Scene 2: state 1 -> state 2. <...>
... Scene K: state (K-1) -> state K. <...>
```

- Scene `i` is `state (i-1) -> state i` — contiguous, no skipped states (a skip is a jump cut).
- **One transformation per scene** + an optional gentle camera idea. Two beats in one scene → split
  into two scenes (add a state). The model interpolates ONE clean beat between two pinned frames.
- Do **not** re-describe the character in the scene line — the two pinned frames carry it.

## Step 5 — Write the footer (disclose the added audio)

Hailuo clips are **silent**, so the audio is always an **added ambient bed** — disclose it:

```
Total: <K> scenes, ~6s each, <AR>. Audio: <ambient music bed + gentle SFX> (an added ambient bed — Hailuo clips are silent).
```

`Total:` must restate the scene count `K` (= number of `Scene` blocks) and the aspect ratio.

## Step 6 — Write `keyframe-plan.md` (the linter's exact shape)

```markdown
# Keyframe Plan: <slug>

## Style

<the seed STYLE_HEADER — one paragraph: genre + medium + lighting + palette>

## Character

- face: <frozen token, verbatim from the seed>
- body: <frozen token>
- color: <frozen token>
- eyes: <frozen token>
- signature: <frozen token>
  (5-7 total — the seed's tokens, byte-identical)

## Keyframe States

State 0: <full standalone image, frozen tokens reused verbatim>
State 1: <full standalone image>
... (K+1 states, 0..K)

## Scenes

Scene 1: state 0 -> state 1. <one motion/transition line>
... (K scenes, each state (i-1) -> state i)

## Footer

Total: <K> scenes, ~6s each, <AR>. Audio: <ambient bed> (an added ambient bed — Hailuo clips are silent).

## Notes

- <scene-count K and states K+1; defaults applied; assumptions; arc beats>
```

Keep the whole file ≤ 1,200 words. Aspect comes from `context.md` (`16:9` default).

## Step 7 — Validate (≤3 fix cycles)

```bash
scripts/validate-keyframe-plan.sh artifacts/<slug>/keyframe-plan.md
```

The linter is fully structural (zero LLM judgment): title; non-empty `## Style`; ≥5 `## Character`
token bullets; `## Keyframe States` numbered contiguously from State 0; `## Scenes` numbered from
Scene 1, each declaring the `state (i-1) -> state i` chain; the **K+1 states for K scenes**
arithmetic; the `Total:` footer with an `Audio:` clause and a matching scene count; and the
**verbatim-token lock** (every frozen Character token reappears byte-identical across the states).
It prints itemized errors or `OK`.

Fix and re-run up to **3 cycles**. After 3 failed cycles, mark stage 3 `blocked` in `state.md`
with the specific linter error — never proceed to paid generation on an invalid plan.

## Step 8 — Advance the ledger

Mark stage 3 `done` (note "validate: PASS — K scenes, K+1 states"), set stage 4 `generate`
`in-progress`. Update the dashboard "Plan keyframes" row to `✓ done (K scenes / K+1 states)`.
Update `next_action`: "Stage 4 generate — synthesize the K+1 keyframes via gen-image.sh (weave
tokens, chain --ref), then morph each scene with gen-keyframe-clips.sh (Hailuo first-last)."
