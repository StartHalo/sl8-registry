---
name: bot-030-continuous-plan
description: Plan ONE long UNBROKEN continuous shot (over 15s, no cuts) for a Veo image-to-video then extend-video render — a global style/look header, 5-7 FROZEN verbatim CHARACTER tokens, a BASE block (one opening-frame image description plus the base 8s continuous motion with native audio described), and 2-3 HOP continuation prompts where the SAME shot keeps evolving with no cut (camera and subject continue), each HOP repeating the subject description at least 80 percent verbatim and adding only the new motion or scenery beat, closed by a footer stating Total seconds (8 + 7 times hops), aspect, and native audio. This is THE continuous-grammar step; identity drift on extend or an accidental cut comes from skipping it. Run as phase 1 of every BOT-030 continuous project whenever continuous-plan.md is missing or fails validate-continuous-plan.sh, or when asked to plan, re-plan, or rework one continuous take.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-030
  inputs:
    - name: project-context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the brief (the subject, the world, the single continuous motion idea). Absence is a recorded failure, never an invented story.
    - name: hop-count
      type: text
      required: false
      description: Number of extend HOPs as an integer in text form. Default 2 (base 8s plus 2 times 7s ~= 22s); valid 2-3. Each hop adds ~7s of one continuous take; more than 3 hops drifts identity on Veo extend.
    - name: aspect-ratio
      type: text
      required: false
      description: Frame aspect for the footer and render. Default 16:9; Veo supports 16:9 and 9:16 only. Written into the footer so the render phase reads it verbatim.
  outputs:
    - name: continuous-plan
      type: markdown
      path: artifacts/<project-name>/continuous-plan.md
      description: The continuous-shot plan — a global style/look header, 5-7 FROZEN verbatim CHARACTER tokens, a Base block (opening-frame image description plus the base 8s continuous motion with native audio), 2-3 Hop continuation prompts each repeating the subject at least 80 percent verbatim and adding only the new beat, and a footer with Total seconds (8 + 7 times hops), aspect, and native Audio.
---

# Continuous-plan — design the one-take continuous shot

Convert the project's brief into `artifacts/<project-name>/continuous-plan.md`: a single
**unbroken continuous shot** (>15s, NO cuts) described as a base segment plus a chain of
extend "hops". This is a **pure-LLM phase** — no `ai-gen` calls, no network, no images. The
plan is the render contract: phase 3 (the render skill) feeds the BASE block to a Veo
`image-to-video` call (8s, native audio) and then feeds each HOP to a Veo `extend-video` call
(~7s each), producing ONE evolving take that the render concatenates into a single MP4. There
is no separate edit — a weak or drifting plan cannot be rescued downstream.

This skill runs **headless**. Never ask the user anything: missing optional inputs take the
documented defaults; a missing brief is a clean, recorded failure (never an invented story).

## The render mechanic (read before writing anything)

Veo renders this plan as **one continuous take in N+1 inference passes that share a frame
boundary**:

1. **BASE** — a Veo `image-to-video` pass turns the opening-frame image description into the
   first 8 seconds with native audio. This is the only place the full opening frame is
   established.
2. **HOP 1..N** — each Veo `extend-video` pass takes the *previous clip* and continues it for
   ~7 more seconds with no cut — the camera and the subject keep moving from exactly where the
   last frame left off. The extend model only sees the trailing frame plus your hop prompt, so
   the hop prompt must **re-state the subject almost verbatim** or the model re-imagines the
   character and identity drifts. This is the #1 continuity rule for extend: **repeat the
   subject description at least 80 percent verbatim in every hop**, then add only the one new
   motion or scenery beat.

Because there is exactly one shot, there are **no time-codes and no shot list** here — the
opposite of the cut-based shotlist. Your job is to make N+1 prompts read as one breath: same
character, same look, continuous camera, evolving scene. Read
`references/continuous-grammar.md` before composing — it carries the D1 Veo-extend recipe, the
80-percent-subject-repeat rule, the "one evolving shot, no cuts" rules, and a fully worked owl
example baked inline (the runtime sandbox has no KB access).

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/context.md` and `state.md`. The brief lives in context.md
(usually under "Strategic question / objective" or "What this project is"): the subject, the
world, and the single continuous motion idea (a glide, a walk, a drift, a flight). Honor any
standing constraints in context.md (tone, a stated look, a do-not-touch subject).

**If context.md has no brief at all**: do NOT invent one — record the failure in state.md (see
"Failure handling") and stop.

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| brief | yes | — (clean recorded failure) |
| hop-count | no | `2` (valid 2-3) |
| aspect-ratio | no | `16:9` (`9:16` for Shorts-first briefs that say so; Veo allows only these two) |

Every default you apply and every assumption you make gets a bullet in the plan's `## Notes`
section — the render phase and the run summary rely on that honesty.

### 3. Write the global style/look header

One line, FIRST under the title. Pair `cinematic` with concrete look words — a medium, a
lighting phrase, a color-grading phrase — never bare `cinematic` or `epic` (they mean nothing
to the model). Pick the medium from the brief. Examples: `One continuous take, stylized 3D
animation, soft volumetric morning light, warm gentle color grading, shallow depth of field,
polished render.` This header applies to the WHOLE take — base and every hop inherit it; do not
restate it per hop.

### 4. Freeze the CHARACTER tokens (5-7, verbatim)

Under the header, a `CHARACTER:` block listing **5-7 frozen trait tokens** that pin the
subject's identity — the exact phrases you will reuse, verbatim, in the base subject sentence
and in every hop. These are the language-level identity lock that survives a Veo extend (the
extend model never sees the original image, only the trailing frame plus your text). Choose
concrete, visual, non-overlapping tokens: body shape, color/material, a signature feature,
size, texture. Example for an owl: `friendly fluffy round owl`, `soft cream-and-tan feathers`,
`big gentle amber eyes`, `tiny hooked beak`, `stubby rounded wings`, `plump button body`.
Friendly, stylized characters only — never a realistic identifiable human face.

### 5. Write the BASE block

One `Base:` block = the opening frame as an image description PLUS the base continuous motion.
Layout:

```
Base: <opening-frame image description — the subject in its world, the look, the framing> <the subject in motion — one continuous primary movement over ~8s> <one line of native audio>.
```

- **Opening-frame image description** establishes the full subject (weave in the frozen
  CHARACTER tokens verbatim), the world, the light, and the framing — this is the still the
  Veo `image-to-video` pass is seeded from.
- **Base motion** is ONE continuous primary movement the camera follows over ~8 seconds —
  present tense, a direction to execute, not a state ("the owl lifts from a pine and glides low
  over the treetops", not "the owl looks peaceful"). Name the camera behaviour as a continuous
  move (gentle tracking / slow push-in / following gimbal), not a cut.
- **Native audio** — one short phrase of the in-pass audio Veo generates (ambience + a soft
  score + diegetic SFX). Veo audio is native to the pass; there is no separate TTS.

### 6. Write the HOP continuation prompts (2-3)

`hop-count` numbered `Hop N:` lines. Each hop continues the SAME unbroken shot — the camera and
subject keep moving from where the previous segment ended, **with no cut**. Each hop:

- **Repeats the subject description at least 80 percent verbatim** — re-state the frozen
  CHARACTER tokens and the subject phrasing from the base/previous hop almost word-for-word.
  This is the lock that holds identity across an extend. Paraphrasing the subject is the #1
  cause of drift.
- **Adds only the ONE new beat** — the new motion or the new scenery the shot evolves into
  (the owl glides *lower along a winding silver stream*; then *rises toward the rising sun*).
  One new beat per hop, not a fresh scene.
- **Continues, never cuts** — open with continuity language ("the same <subject> continues",
  "without any cut, the shot keeps moving") and keep the camera move continuous. Never write
  "cut to", "next shot", "meanwhile", or a new framing that implies an edit.
- **No time-codes** — a hop is ~7s by construction; do not number seconds.
- **No negative prompts** — positive constraints only; stability/identity constraints live once
  in the footer suffix.

Hop layout:

```
Hop 1: The same <subject, >=80% verbatim from base>, without any cut the shot continues as <one new motion/scenery beat>, <continuous camera move>, <look carried from the header>.
```

### 7. The footer and the constraint suffix

Close with the footer and the standard positive-constraint suffix, EXACTLY this shape:

```
Total: ~<8 + 7*hops>s (one continuous take, no cuts) / <aspect-ratio>. Audio: <native score + SFX + ambience>. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.
```

- `Total:` restates the computed length (`8 + 7*hop-count`, e.g. 2 hops → ~22s), marks it as
  one continuous take, and states the aspect — the render phase greps this line.
- `Audio:` describes the native in-pass audio the whole take carries.
- The suffix is the positive-constraint tail (note `one continuous shot, no cuts` — the
  no-cut + identity lock for this bot) — append it once, verbatim.

### 8. Write the continuous-plan file

Write `artifacts/<project-name>/continuous-plan.md` in EXACTLY this layout (header line,
CHARACTER block, the Base block, the Hop lines, the footer, then `## Notes`):

```markdown
# Continuous-plan: <project-name>

<global style/look header — one line>
CHARACTER: <token 1>; <token 2>; <token 3>; <token 4>; <token 5> (5-7 frozen verbatim tokens)

Base: <opening-frame image description + base 8s continuous motion + native audio>.
Hop 1: The same <subject >=80% verbatim>, without any cut <one new beat>, <continuous camera>.
Hop 2: The same <subject >=80% verbatim>, without any cut <one new beat>, <continuous camera>.
... (2-3 hops total)

Total: ~<8 + 7*hops>s (one continuous take, no cuts) / <aspect-ratio>. Audio: <score + SFX + ambience>. Maintain character identity, avoid identity drift, one continuous shot, no cuts, smooth motion, stable picture, no flicker.

## Notes

- <hop-count, aspect, defaults applied, assumptions, the new beat per hop>
```

Keep the whole file ≤1,000 words — the per-pass Veo prompts must stay within model limits.

### 9. Validate

Run the structural linter and fix every reported line until it passes:

```bash
bash <skill-dir>/scripts/validate-continuous-plan.sh artifacts/<project-name>/continuous-plan.md
```

Exit 0 = the plan is structurally sound; exit 1 = line-itemized errors. Fix and re-run, up to 3
fix cycles. If it still fails after 3 cycles, keep the best version on disk, mark the phase
`blocked` in state.md with the linter output quoted under "Open questions / blockers", and stop
— never advance the chain on an invalid plan. The linter is the deterministic gate the eval
loop uses; do not hand-wave past it.

### 10. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

## What the linter checks (and why)

`scripts/validate-continuous-plan.sh` is the structural floor. It verifies:

- the `# Continuous-plan:` title and a non-empty global style/look header line;
- a `CHARACTER:` block with 5-7 frozen tokens;
- exactly one `Base:` block, non-empty, of reasonable length;
- 2-3 numbered `Hop N:` lines, each of which **repeats a meaningful share of the subject
  description** (a token-overlap check approximating the 80-percent-verbatim rule) and carries
  continuity language (no cut);
- no cut-language leakage (`cut to`, `next shot`, `meanwhile`) and no negative-prompt syntax
  opening a hop;
- the `Total: ~Ns (one continuous take...) / AR.` footer with `N` agreeing with `8 + 7*hops`
  (±1s), the `Audio:` clause, and the positive-constraint suffix (`one continuous shot, no
  cuts` AND `stable picture`).

It cannot judge whether the take reads as one evolving breath or whether the new beat per hop
is natural — that is the rubric's job (`evals/rubric.md`). The linter is the floor; continuity
quality is the ceiling.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker `continuous-plan blocked — no context.md, run onboarding first`. Stop. |
| no brief in context.md | Do NOT write a plan. Mark the phase row `blocked`, project `status: blocked`, blocker `continuous-plan blocked — brief required, add a continuous-motion brief to context.md then re-run phase 2`. `next_action` to add a brief then re-run phase 2. Stop. |
| hop-count out of range | Clamp to 2-3, record the clamp in `## Notes`, proceed. |
| aspect not 16:9 or 9:16 | Veo supports only those two — snap to the nearest (default 16:9), record it in `## Notes`, proceed. |
| branded / real-person brief | Keep the premise, swap in a friendly stylized stand-in (stylized characters/creatures only — never a realistic human face); note the substitution in `## Notes`. Proceed. |
| linter still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the linter output quoted in state.md. Stop. |

## Outputs

This phase writes exactly one artifact:

- `artifacts/<project-name>/continuous-plan.md` — the continuous-shot plan: a global style/look
  header, a `CHARACTER:` block of 5-7 frozen verbatim tokens, one `Base:` block (opening-frame
  image description + base 8s continuous motion + native audio), 2-3 numbered `Hop N:`
  continuation prompts (each repeating the subject ≥80 percent verbatim and adding one new
  beat, no cut), a `Total: ~Ns (one continuous take...) / AR. Audio: ...` footer with the
  positive-constraint suffix, and a `## Notes` section for the hop-count, aspect, defaults, and
  assumptions.

No other files. The rendered MP4 + summary belong to phase 3.

## Ledger updates

After the plan validates, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`continuous-plan`) `done`; set the next row (`render`) to `next` (or
  `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for phase 3, e.g.
  `next_action: Render the continuous take — run the render skill phase 3 (reads continuous-plan.md, writes episode.mp4 + summary.md).`
- Append a Decisions-log line for the hop-count, aspect, and any default or assumption that
  shaped the plan.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded
failure is a correct outcome; a silent or invented one is not.

## References

- `references/continuous-grammar.md` — the D1 Veo image-to-video + extend-video recipe baked
  inline, the ≥80-percent-subject-repeat rule, the "one evolving shot, no cuts" rules, the
  camera/look vocabularies, and a fully worked owl example (`dawn-owl`). Load before writing.
- `scripts/validate-continuous-plan.sh` — deterministic structural linter; the phase gate.
