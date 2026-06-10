---
name: bot-013-episode-design
description: Turn an episode topic into a validated stickman beat-sheet plan — logline, aspect, a ≤10-word punchline, room-tone setting, and 3-8 beats each carrying a kebab-case name, a still scene block, an i2v motion prompt, a 5|10s duration, and a camera note — written so every downstream generation phase runs unattended. Use as phase 1 of every BOT-013 episode project, right after onboarding, whenever 01-episode-plan.md is missing or fails validation, or when asked to plan, re-plan, or rework a stickman episode.
metadata:
  author: sl8
  version: 1.0.0
  bot: BOT-013
  inputs:
    - name: topic
      type: text
      required: true
      description: Episode topic or brief, read from artifacts/<project-name>/context.md; absence is a recorded failure, never an invented topic
    - name: episode-preferences
      type: text
      required: false
      description: Optional target length, beat count, aspect ratio, and punchline line from context.md; defaults are ~30s, 4-6 beats, 16:9, and a bot-written ≤10-word punchline
  outputs:
    - name: episode-plan
      type: markdown
      path: artifacts/<project-name>/01-episode-plan.md
      description: Machine-checkable beat-sheet plan (logline, aspect, punchline, room tone, 3-8 beats x 5 fields) that phases 2-4 consume
---

# Episode Design — plan a stickman episode

Convert the project's topic into `01-episode-plan.md`: a beat-sheet where every field is
something a later phase consumes literally. This is a **pure-LLM phase** — no `ai-gen`
calls, no network. The plan is the contract for the whole episode: phase 2 reads it for
prop hints, phase 3 turns each beat's `scene` into a still, phase 4 turns each beat's
`motion` + `duration` into a clip and assembles them in beat order. A weak plan cannot be
rescued downstream, and a malformed one breaks the chain — which is why the format is
rigid and machine-checked.

This skill runs headless. Never ask the user anything: missing optional inputs take the
documented defaults; a missing topic is a clean, recorded failure.

## Workflow

### 1. Read before writing

Read `artifacts/<project-name>/context.md` and `state.md`. The topic/brief lives in
context.md (usually under "Strategic question / objective" or "What this project is").
Honor any standing constraints in context.md (tone, do-not-touch subjects).

**If context.md has no topic or brief at all**: do NOT invent one. Record the failure in
state.md (see "Failure handling") and stop the phase.

### 2. Resolve inputs and defaults

| input | required | default when absent |
|---|---|---|
| topic / brief | yes | — (clean recorded failure) |
| target length | no | ~30s |
| beat count | no | 4–6 (3–8 allowed) |
| aspect ratio | no | `16:9` (`9:16` for Shorts-first briefs that say so) |
| punchline line | no | write one yourself: ≤10 words, deadpan, rendered later as a caption card |
| room tone | no | `on` |

Every default you apply and every assumption you make gets a bullet in the plan's
`## Notes` section — downstream phases and the run summary rely on that honesty.

### 3. Concretize the topic

A stickman episode needs ONE concrete everyday scenario: a place, a physical prop, and a
pressure. "Procrastination" is not filmable; "snoozing the alarm until the day is gone"
is. If the topic is vague or abstract, load `references/ideation.md`, pick a concrete
scenario from the format's home territories (life hacks, psychology, money, discipline,
habits, modern digital life), commit to it, and record the assumption in `## Notes`.

Scrub brands, real people, and copyrighted characters while you concretize: a generic
flat-pack box, not a branded one. Family-friendly, advertiser-safe, slapstick at most.

### 4. Design the arc

Load `references/beat-grammar.md` before writing any beat — it carries the grammar, the
composition contract, and two fully worked plans. The shape every episode follows:

- **setup → complication → escalation → visual punchline/anticlimax.** The joke lands
  through action and posture, never dialogue or facial acting.
- Default 4–6 beats (3–8 allowed). Durations only **5 or 10** seconds — that is the
  clip-length granularity of the i2v models, not a style choice. Total must land in
  **15–60s**; give the punchline beat the 10 if any beat gets it.
- Prefer a **loopable ending** (final situation visually rhymes with beat 1) — loops
  measurably boost Shorts retention.
- Prefer **one location** for the whole episode. Each still is generated independently,
  so every new room is a new chance for the world to drift; one room, varied framing.

### 5. Write the beats

Each beat carries exactly five fields. What they are FOR dictates how to write them:

- **name** — kebab-case slug (`[a-z0-9-]`, 2–4 words). It becomes the downstream
  filenames `03-stills/NN-<name>.png` and `04-clips/NN-<name>.mp4`, so keep it short,
  unique, and descriptive.
- **scene** — the VARIABLE block of the still prompt. Downstream composes the full
  prompt as frozen-style + frozen-character + *your scene block* + frozen-discipline +
  frozen-negatives (see "Composition contract"). So the scene block must carry: one
  concrete action, a domestic/everyday setting with 2–3 grounded props, and the framing
  phrase at the end ("Medium shot, eye level."). Close/medium framing only — wide shots
  shrink the figure and break its anatomy. Refer to the character only as "the stickman"
  or "the figure"; never re-describe him (cap, eyes, proportions live in the frozen
  character block). Never mention the art style — the style stack is prepended verbatim.
  1–3 sentences, on ONE line.
- **motion** — the variable middle of the clip prompt; downstream wraps it between the
  frozen first and last lines. ONE action plus AT MOST one camera move ("Static camera."
  / "Slow push-in."). Two actions in one clip is the classic broken-motion failure.
- **duration** — `5` or `10`. Nothing else exists on these models.
- **camera** — a short cinematography note (framing, angle, planned camera behaviour).
  Phases 3–4 use it as the consistency check against what the scene/motion text says.

**In-frame text**: at most ONE beat per episode may carry an in-frame label — a single
word of 2–8 uppercase letters in straight double quotes inside the scene block (e.g. a
cardboard box stenciled "FRAGILE"). The quoted word is the downstream signal to route
that still to the text-capable model chain; also flag it in `## Notes`. Everything else
stays text-free — these models garble anything longer.

### 6. Write the plan file

Write `artifacts/<project-name>/01-episode-plan.md` in EXACTLY this layout. Every field
is a single `key: value` line starting at column 1 — no bullets, no wrapping — because
the linter (and downstream greps) parse it line by line:

```markdown
# Episode Plan: <project-name>

logline: <one sentence: who + want + obstacle + how it lands>
aspect: 16:9
target-length: 30
punchline: <the ≤10-word caption-card line>
room-tone: on

## Beats

### Beat 1: <kebab-slug>
scene: <one concrete action, everyday setting, ends with the framing phrase — one line>
motion: <one action + at most one camera move — one line>
duration: 5
camera: <framing, angle, planned camera behaviour — one line>

### Beat 2: <kebab-slug>
...

## Notes

- <defaults applied, assumptions made, label routing, loop note>
```

Header fields: exactly `logline`, `aspect` (16:9|9:16), `target-length` (integer 15–60),
`punchline`, `room-tone` (on|off). Beats: `### Beat N: <slug>` numbered consecutively
from 1, each with exactly `scene`, `motion`, `duration`, `camera`. Keep the whole plan
≤1,500 words.

### 7. Validate

Run the structural linter and fix every reported line until it passes:

```bash
bash <skill-dir>/scripts/validate-plan.sh artifacts/<project-name>/01-episode-plan.md
```

Exit 0 = plan is structurally sound; exit 1 = line-itemized errors. Fix and re-run, up to
3 fix cycles. If it still fails after 3 cycles, keep the best version on disk, mark the
phase `blocked` in state.md with the linter output quoted under "Open questions /
blockers", and stop — never advance the chain on an invalid plan. The linter is the
deterministic gate the eval loop uses; do not hand-wave past it.

### 8. Update the ledger

state.md is how phases chain — never leave it stale (see "Ledger updates").

## Composition contract

The plan never contains the frozen blocks — downstream skills prepend/append them
verbatim at generation time. You must know them anyway, because the scene and motion
blocks are written to compose with them without overlap or contradiction. They are, and
must always remain, EXACTLY:

- **STYLE_STACK** (still prompt, block 1): "Hand-drawn pencil sketch animation style, visible graphite grain, subtle smudging, light cross-hatching, varied line weight, on plain white paper background."
- **CHARACTER_BLOCK** (still prompt, block 2 — default; the locked one comes from `02-character/character-spec.md`): "An extremely minimal hand-drawn stick figure: single-stroke arms and legs, a plain circle head, two small dot eyes, a simple curved smile, and a small baseball cap worn slightly tilted. No other facial features, no clothing besides the cap, no fingers — simple line hands. Proportions: head about one fifth of total height, limbs slightly longer than the torso."
- **scene block** (still prompt, block 3): yours — the only variable text.
- **DISCIPLINE_BLOCK** (still prompt, block 4): "Environments and objects rendered with realistic structure, weight, and light pencil shading. Communicate narrative through posture and spatial composition alone; no exaggerated facial expressions. Consistent lighting direction. The figure stays minimal while the world stays believable."
- **NEGATIVES_BLOCK** (still prompt, block 5): "No color, no photorealism, no text, no watermarks, no extra limbs, no duplicate figures."
- **CLIP_STYLE_LOCK** (first line of every video prompt): "A stick figure hand-drawn pencil sketch animation."
- **CLIP_NEGATIVES** (last line of every single-shot video prompt): "Single continuous shot, no cuts. No morphing, no extra limbs, no text. The character keeps exactly the same proportions and cap."

Consequences for your writing (the linter enforces the first two):

- Scene/motion must NOT restate style words (pencil sketch, graphite, cross-hatching) —
  paraphrased style is the #1 cause of style drift between stills.
- Scene/motion must NOT re-describe the character (cap, dot eyes, proportions) — a second
  description competes with the frozen block and mutates the figure.
- Scene/motion must not contradict the frozen blocks: no color directions, no facial
  acting ("grins wildly"), no second figure unless the episode truly needs one (it almost
  never does — duplicate figures are explicitly negated).

`references/beat-grammar.md` shows a beat fully composed into its final still prompt and
clip prompt — read it once before writing your first plan.

## Failure handling (headless)

| situation | action |
|---|---|
| context.md missing entirely | Phase cannot run — mark the phase row `blocked`, project `status: blocked`, blocker: "plan-episode blocked: no context.md — run onboarding first". Stop. |
| no topic/brief in context.md | Do NOT write a plan. Mark the phase row `blocked`, project `status: blocked`, blocker: "plan-episode blocked: topic required — add a topic/brief to context.md, then re-run phase 1". `next_action: Add an episode topic to context.md, then re-run phase 1 (bot-013-episode-design).` Stop. |
| vague/abstract topic | Concretize via `references/ideation.md`; record the chosen scenario as an assumption in `## Notes` AND a line in state.md's Decisions log. Proceed. |
| branded/real-person topic | Keep the premise, swap in generic stand-ins; note the substitution in `## Notes`. Proceed. |
| linter still failing after 3 fix cycles | Keep best version, mark phase `blocked` with the linter output quoted in state.md. Stop. |

## Outputs

This phase writes exactly one artifact:

- `artifacts/<project-name>/01-episode-plan.md` — the beat-sheet plan: logline, aspect,
  punchline line, room-tone setting, and 3–8 beats each with the five fields (name slug,
  scene block, motion prompt, duration 5|10, camera note), plus a `## Notes` section for
  defaults and assumptions.

No other files. Stills, character assets, and clips belong to later phases.

## Ledger updates

After the plan validates, update `artifacts/<project-name>/state.md`:

- Mark this phase row (`plan-episode`) `done`; set the next row (`lock-character`) to
  `next` (or `in-progress` if you continue this session).
- Refresh `updated:` to today; keep project `status: in-progress`.
- Rewrite `next_action:` to the one imperative for phase 2, e.g.:
  `next_action: Lock the character — run bot-013-stickman-art phase 2 (reads context.md + 01-episode-plan.md, writes 02-character/).`
- Append a Decisions-log line for any default or assumption that shaped the plan.

On failure, write the `blocked` shape from "Failure handling" instead — a clean recorded
failure is a correct outcome; a silent or invented one is not.

## References

- `references/beat-grammar.md` — the beat arc grammar, duration design, composition
  contract with worked composed prompts, and two complete example plans (16:9 ~30s and
  9:16 loopable). Load before writing beats.
- `references/ideation.md` — topic territories and the vague-topic concretization
  method. Load when the topic is vague, abstract, or branded.
- `scripts/validate-plan.sh` — deterministic structural linter; the phase gate.
