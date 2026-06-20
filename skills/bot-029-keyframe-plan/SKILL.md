---
name: bot-029-keyframe-plan
description: Turn a story brief into a validated keyframe plan that pins BOTH the first and last frame of every scene — a global style/look header, 5-7 frozen CHARACTER tokens (face/body/color/eyes/signature reused verbatim), a sequence of K+1 numbered KEYFRAME STATES (state 0..state K) each a full standalone image of the character in that exact pose/moment, and K continuity-chained SCENES where scene i animates state[i-1] into state[i] with one motion/transition line, closed by a Total / Audio footer. The character is SELF-CONTAINED in the keyframes (no separate bible). This is THE first-last-frame step; precise reveals, transformations, and morphs come from pinning before-and-after frames so the render only interpolates the motion between them. Run as phase 1 of every BOT-029 keyframe project whenever keyframe-plan.md is missing or fails validate-keyframe-plan.sh, or when asked to plan, re-plan, or rework a keyframe short. Pure-LLM; no generation, no network.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-029
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the story brief (the character, the transformation, the world, the genre). Absence is a recorded failure, never an invented story.
    - name: scene-count
      type: text
      required: false
      description: Target number of scenes as an integer in text form; this is K. Default 4; valid 3-6. The plan then has K+1 keyframe states (state 0..state K) and K scenes; each scene is ~6s, so 4 scenes is ~24s.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the states, scenes, and footer. Default 16:9; common alternatives 9:16, 1:1, 21:9. Written into the Total footer verbatim so the render phase reads it back.
  outputs:
    - name: keyframe-plan
      type: markdown
      path: artifacts/<project-name>/keyframe-plan.md
      description: The keyframe plan — a ## Style header, 5-7 frozen ## Character tokens, ## Keyframe States with K+1 numbered standalone state images (state 0..state K), ## Scenes with K continuity-chained motion lines (scene i animates state[i-1] into state[i]), and a Total / Audio footer. The render phase pins each state as a frame and animates each scene between two pinned frames.
---

# Keyframe Plan — pin the first and last frame of every scene

Convert the project's brief into `artifacts/<project-name>/keyframe-plan.md`: a global
style/look header, a block of frozen CHARACTER tokens, a sequence of **K+1 numbered keyframe
states** (state 0 .. state K), and **K continuity-chained scenes** that each animate one state
into the next. The whole short is the journey through these pinned states.

This bot pins **BOTH** the first and last frame of every scene. That is the whole trick: the
render phase generates one still image per *state*, then animates each *scene* in first-frame +
last-frame mode (first frame = `state[i-1]`, last frame = `state[i]`). The model invents only
the *motion* between two frames it is pinned to, so precise reveals / transformations / morphs
(an egg cracks, a dragon unfurls) are reliable. The character is **self-contained in the
keyframes** — there is **no separate character-bible skill**; the frozen CHARACTER tokens reused
verbatim in the states ARE the identity lock.

This is a **pure-LLM phase** — no `ai-gen` calls, no network, no images. The plan is the render
contract; phase 2 reads it and renders.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing brief is a clean, recorded failure (see "Failure handling").

## The render mechanic (read before writing anything)

Per scene `i` (1..K) the render phase: (1) gets the still for `state[i-1]` — the first frame;
(2) gets the still for `state[i]` — the last frame; (3) calls the image-to-video model in
first-last-frame mode (start here, end there, ~6s); (4) concatenates the K clips in order.

Two facts make that hold together, and both are your job here:

1. **Continuity chain.** `state[i]` is the LAST frame of scene `i` AND the FIRST frame of scene
   `i+1` — the same image. So scene `i+1` begins on the exact frame scene `i` ended on; there
   are **no jump cuts**. Every scene line must declare its chain `state (i-1) -> state i`.
2. **K+1 states for K scenes.** A journey through K scenes touches K+1 pinned moments — state 0
   is the very first frame of the short, state K is the very last. Off-by-one breaks the render;
   the linter hard-gates it.

Read `references/keyframe-grammar.md` before composing — it carries the B1/B2 first-last-frame
recipe, the continuity-chaining rule, the state-sequence arc, and a fully worked baby-dragon
example baked inline.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/context.md` and `state.md`. The brief lives in context.md
(usually under "Strategic question / objective" or "What this project is"): the character, the
transformation/reveal, the world, the genre. Honor any standing constraints in context.md (tone,
a stated genre, a do-not-touch subject).

**If context.md has no brief at all**: do NOT invent one — record the failure in state.md (see
"Failure handling") and stop.

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| brief (in context.md) | yes | — (clean recorded failure) |
| scene-count (K) | no | `4` (valid 3-6) → plan has K+1 states |
| aspect-ratio | no | `16:9` (`9:16` for Shorts-first briefs that say so) |

Every default you apply and every assumption you make gets a bullet in the plan's `## Notes`
section — the render phase and the run summary rely on that honesty.

### 3. Write the global style/look header

`## Style` is one short paragraph pairing a genre with a concrete cinematic look — medium +
lighting + color/palette. Pick the genre/medium from context.md; never write `cinematic` or
`epic` bare — always pair with a medium ("soft Pixar-style 3D animation"), a lighting phrase
("warm magical lighting"), and a palette ("cozy children's-book color palette"). This look
applies to **every** state so the frames share a world.

### 4. Freeze the CHARACTER tokens

`## Character` lists **5–7** distinctive traits as `- <key>: <token>` bullets — at minimum
**face, body, color, eyes, and a signature** feature, plus one or two more. Each token is a
short concrete visual phrase ("enormous round amber eyes with bright catchlights", not
"expressive eyes"). These are FROZEN: you will paste each token **byte-identical** into the
state descriptions. **Friendly / cute / stylized characters and creatures only** — never a
realistic identifiable human face or a real named person.

### 5. Design the state sequence (the arc lives here)

The states ARE the storyboard. Load `references/keyframe-grammar.md` first, then write
`scene-count + 1` numbered states under `## Keyframe States`:

```
State 0: <full standalone image of the opening frame>
State 1: <full standalone image of the next pinned moment>
... up to State K: <full standalone image of the closing payoff frame>
```

- Each `State N:` is a **complete image prompt on its own** — character + setting + lighting +
  composition, with **no reference to other states** (the image model sees only this line).
- Reuse the frozen CHARACTER tokens **verbatim** in the states (copy-paste; never paraphrase).
  The linter checks every token reappears byte-identical across the states.
- Give each state a **distinct silhouette** from its neighbours (closed egg vs cracked egg vs
  peeking head vs standing+wings vs hovering) — that legible difference is what the scene
  between them animates.
- The arc: **dormant/hidden → first sign → emergence → full form → payoff action.** State 0 is
  often the character *before* it appears; state K is the payoff pose.

### 6. Write the continuity-chained scenes

`## Scenes` lists **K** numbered scenes. Each scene opens by declaring its chain and gives ONE
motion/transition line:

```
Scene 1: state 0 -> state 1. <one motion/transition — how state 0 becomes state 1 + an optional gentle camera move>
Scene 2: state 1 -> state 2. <...>
... Scene K: state (K-1) -> state K. <...>
```

- Scene `i` is `state (i-1) -> state i` — contiguous, no skipped states (a skip is a jump cut).
- **One transformation per scene** + an optional gentle camera idea ("the egg cracks and light
  spills out; camera holds a static framing"). Two beats in one scene → split into two scenes
  (add a state). The model interpolates ONE clean beat between the two pinned frames.
- Do **not** re-describe the character in the scene line — the two pinned frames carry it. Refer
  to it as "the dragon" / "the egg".

### 7. Write the footer

Close with the footer. Hailuo (the keyframe render model) clips are **silent**, so the audio is
always an **added ambient bed** — disclose it:

```
Total: <K> scenes, ~6s each, <AR>. Audio: <ambient music bed + gentle SFX> (an added ambient bed — Hailuo clips are silent).
```

`Total:` must restate the scene count `K` (= number of `Scene` blocks) and the aspect ratio.

### 8. Write the plan file

Write `artifacts/<project-name>/keyframe-plan.md` in EXACTLY this layout:

```markdown
# Keyframe Plan: <project-name>

## Style

<one-paragraph genre + medium + lighting + palette look>

## Character

- face: <token>
- body: <token>
- color: <token>
- eyes: <token>
- signature: <token>
  (5-7 total)

## Keyframe States

State 0: <full standalone image>
State 1: <full standalone image>
... (K+1 states, 0..K, frozen tokens reused verbatim)

## Scenes

Scene 1: state 0 -> state 1. <one motion/transition line>
... (K scenes, each state (i-1) -> state i)

## Footer

Total: <K> scenes, ~6s each, <AR>. Audio: <ambient bed> (an added ambient bed — Hailuo clips are silent).

## Notes

- <scene-count K and states K+1; defaults applied; assumptions; arc beats>
```

Keep the whole file ≤1,200 words.

### 9. Validate

Run the structural linter and fix every reported line until it passes:

```bash
bash <skill-dir>/scripts/validate-keyframe-plan.sh artifacts/<project-name>/keyframe-plan.md
```

Exit 0 = the plan is structurally sound; exit 1 = line-itemized errors. Fix and re-run, up to 3
fix cycles. If it still fails after 3 cycles, keep the best version on disk, mark the phase
`blocked` in state.md with the linter output quoted under "Open questions / blockers", and stop
— never advance the chain on an invalid plan. The linter is the deterministic gate the eval loop
uses; do not hand-wave past it.

### 10. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

## What the linter checks (and why)

`scripts/validate-keyframe-plan.sh` is the structural floor. It verifies:

- the `# Keyframe Plan:` title and a non-empty `## Style` header;
- a `## Character` section with ≥5 `- <key>: <token>` bullets, none empty;
- `## Keyframe States` with states numbered contiguously from `State 0`, each with a non-empty
  standalone description;
- `## Scenes` with scenes numbered contiguously from `Scene 1`, each declaring the
  `state (i-1) -> state i` continuity chain and a non-empty motion line;
- the **K+1 states for K scenes** arithmetic (number of states == number of scenes + 1) and that
  the highest state index is exactly K;
- the `Total: K scenes, ~Ss each, AR` footer with an `Audio:` clause, and `K` agreeing with the
  scene count;
- the **verbatim-token lock** (python pass): every frozen Character token reappears
  byte-identical across the state descriptions.

It cannot judge whether the arc reads as a clean transformation or whether each state has a
distinct silhouette — that is the rubric's job (`evals/rubric.md`). The linter is the floor;
arc quality is the ceiling.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker `keyframe plan blocked — no context.md, run onboarding first`. Stop. |
| no brief in context.md | Do NOT write a plan. Mark the phase row `blocked`, project `status: blocked`, blocker `keyframe plan blocked — brief required; add a story brief to context.md, then re-run phase 1`. `next_action` `Add a brief to context.md, then re-run phase 1 (bot-029-keyframe-plan).` Stop. |
| brief implies a real person / realistic human face | Keep the premise, swap in a stylized stand-in (friendly stylized characters/creatures only); note the substitution in `## Notes`. Proceed. |
| two beats packed into one scene | Split into two scenes and add the intermediate state (K and K+1 both grow by one); record it in `## Notes`. Proceed. |
| linter still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the linter output quoted in state.md. Stop. |

## Outputs

This phase writes exactly one artifact:

- `artifacts/<project-name>/keyframe-plan.md` — the keyframe plan: a `## Style` global style/look
  header, 5-7 frozen `## Character` tokens, `## Keyframe States` with K+1 numbered standalone
  state images (state 0..state K), `## Scenes` with K continuity-chained motion lines (scene i
  animates state[i-1] into state[i]), a `Total: ... Audio: ...` footer, and a `## Notes` section
  for the scene-count, defaults, and assumptions.

No other files. The rendered MP4 + summary belong to the render phase (phase 2).

## Ledger updates

After the plan validates, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`keyframe-plan`) `done`; set the next row (`render`) to `next` (or
  `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for the render phase, e.g.:
  `next_action: Render the keyframe short — read keyframe-plan.md, pin each state as a frame, animate each scene between two pinned frames, write episode.mp4 + summary.md.`
- Append a Decisions-log line for the scene-count and any default or assumption that shaped the
  plan.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded failure
is a correct outcome; a silent or invented one is not.

## References

- `references/keyframe-grammar.md` — the B1/B2 first-last-frame recipe, the continuity-chaining
  rule, the state-sequence arc (dormant → first sign → emergence → full form → payoff), the
  anti-pattern table, and a fully worked `baby-dragon` example (5 states / 4 scenes) baked
  inline. Load before writing.
- `scripts/validate-keyframe-plan.sh` — deterministic structural linter; the phase gate.
