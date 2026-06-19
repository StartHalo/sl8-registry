---
name: hf-script
description: Write a faithful, beat-structured video script for a motion-graphics project — one beat per idea, each carrying a voiceover (VO) line and a short on-screen-text distillation, with every fact traced to the brief. Reads the project brief (context.md) and the base concept (01-concept.md); writes 02-script.md. On-screen text is the headline/keyword distillation, NOT the narration verbatim. Never invents facts, numbers, names, or quotes. Use during the SCRIPT phase (phase 2) of a narrated/data-viz video, after hf-concept and before hf-storyboard. Also use to RE-SCRIPT when the user wants to change the message (this is the only phase allowed to change facts).
metadata:
  author: sl8
  version: 1.0.0
  references-skills: [hf-concept]
  inputs:
    - name: context
      type: markdown
      required: true
      description: artifacts/<project-name>/context.md — the project brief (topic/script, audience, brand kit, source facts, requested duration/aspect ratio, voice/music defaults).
    - name: concept
      type: markdown
      required: true
      description: artifacts/<project-name>/01-concept.md — the 6-dimension base concept (subject, composition, style, palette, typography, mood) the script's tone and pacing align to.
  outputs:
    - name: script
      type: markdown
      path: artifacts/<project-name>/02-script.md
      description: A beat-structured script — narrative arc, per-beat VO line + on-screen text + estimated seconds, plus a provenance table mapping every fact to its source. Faithful to the brief; no invented facts.
---

# hf-script — beat-structured, fidelity-tracked video script

## Purpose
Turn the brief (`context.md`) and the base concept (`01-concept.md`) into a **beat-structured script**
at `artifacts/<project-name>/02-script.md`: a narrative arc broken into beats, where **each beat carries
one VO (voiceover) line and one short on-screen-text distillation**, paced to a duration. This is the
faithful "what the video says" layer that `hf-storyboard` (phase 3) maps onto blocks/transitions and
`hf-voiceover` (phase 4) reads its VO from. You write words, not HTML.

Two non-negotiables: **(1)** on-screen text is the headline/keyword **distillation**, never the narration
verbatim — narration carries the detail, the screen carries the emphasis; **(2)** every fact (number,
name, quote, claim) comes from the brief and is **never invented**. This phase is the *only* one allowed
to change facts (see `references/fidelity-rule.md`).

`$SKILL` below = this skill's directory.

## When to use
- **Script** (phase 2): after `hf-concept` wrote `01-concept.md`, before `hf-storyboard`.
- **Re-script** (JTBD-4, facts change): when the user wants to change the *message* (add/remove/correct a
  fact). Re-running this phase is the ONLY way facts change — a restyle/re-voice/resize must NOT touch
  them. Rewrite `02-script.md` and let phase 3+ re-run from it.
- Do NOT use to design the visuals/layout (that is `hf-storyboard`) or to generate the concept/palette
  (that is `hf-concept`). Do NOT use to silently fix facts during a restyle.

## Inputs
- `artifacts/<project-name>/context.md` (required) — the brief: topic or pasted script, audience, the
  source facts (figures/names/quotes/feature claims), brand voice, requested duration + aspect ratio(s),
  voice/music defaults.
- `artifacts/<project-name>/01-concept.md` (required) — the base concept; align tone + pacing energy to
  its **mood** dimension (calm → slower beats, longer reads; upbeat/tech → tighter, punchier beats).
- **Missing required input** (no `context.md` or no `01-concept.md`): record the failure in `state.md`
  and stop — do NOT invent a brief or a concept. **Missing optional details** (duration, audience): use
  the documented defaults below and state the assumption at the top of `02-script.md`.

### Defaults when the brief is silent (headless — never prompt)
| Missing | Default | Note in the script |
|---|---|---|
| total duration | 15 s | "duration defaulted to 15 s" |
| audience | the persona implied by the concept's *subject* dimension | state who you wrote for |
| narration vs silent | narrated (write VO lines) | if the brief says silent, still write per-beat VO as the read-time guide, marked `[silent — read-time]` |
| tone | the concept's *mood* dimension | — |

## Instructions

### 1. Read the brief and the concept (read-before-write)
Read `context.md` (the facts + audience + duration) and `01-concept.md` (subject, mood, pacing). Build a
**fact inventory** first: list every figure, name, quote, date, product/feature name, and claim the brief
actually contains. This list is your provenance budget — the script may use ONLY these facts. If the
brief is a pasted full script, treat its sentences as the source facts and re-cut them into beats; do not
add new claims. See `references/fidelity-rule.md`.

### 2. Choose the narrative arc + beat count
Pick the arc that fits the brief (`references/scriptwriting-beats.md`): the default is
**hook → context → proof → payoff/CTA**. Set the beat count from the duration — about one beat per
**3–5 s** of video, so ~3 beats for 10 s, ~4–5 for 15 s, ~6–8 for 30 s. Each beat is **one idea / one
focal message**; never cram two facts into one beat. The hook beat must earn attention in the first
~2 s (a strong line or the single most striking number).

### 3. Write each beat: VO line + on-screen text + seconds
For every beat write three things (`references/scriptwriting-beats.md` has the patterns + examples):
- **VO line** — written *for the ear*: short clauses, a strong opening line, numbers spoken naturally
  ("forty-seven percent", not "47%"). Pace it: estimated seconds ≈ `max(1.2, word_count / 2.5)` (≈ 2.5
  spoken words/sec). The beat's duration = its VO read-time (or a fixed read-time for a silent beat).
- **On-screen text** — the **distillation**: the headline or 1–4 keywords/the bare number for that beat,
  NOT the VO sentence. (VO: "We cut p99 latency by forty-seven percent." → on-screen: **47% faster** or
  **p99 −47%**.) Mark the focal token the storyboard should emphasize.
- **Estimated seconds** — the read-time, so the beat seconds sum to ~the target duration. Note the running
  total; if it overshoots, tighten VO or drop a beat (don't speed past legibility).

### 4. Track provenance (the fidelity gate)
Build a **provenance table** mapping every fact that appears in any VO line or on-screen text to where it
came from in the brief (a quote/figure/line). Anything not traceable to the brief must NOT appear. If the
brief is thin and a beat needs connective tissue, you may write **framing/transition language** (no new
facts) and mark it `[framing]` — but never a new number/name/claim. If a required fact is missing to make
the arc work, say so in the script's assumptions block and keep the arc within the facts you have. See
`references/fidelity-rule.md` for what counts as a fact vs framing, and the restyle rule.

### 5. Align tone + pacing to the concept; write the file
Match the VO tone and beat rhythm to `01-concept.md`'s **mood** (calm = fewer, longer beats; tech/upbeat
= more, tighter beats). Then write `artifacts/<project-name>/02-script.md` using the structure in
`references/scriptwriting-beats.md` → "Output format": a title + the resolved assumptions (duration,
audience, narrated/silent), the **arc** named, a **per-beat table** (`# · seconds · VO line ·
on-screen text · focal token`), and the **provenance table**. State the total duration the beats sum to.

## Outputs
- `artifacts/<project-name>/02-script.md` — the beat-structured script: assumptions block (resolved
  defaults), the named narrative arc, a per-beat table (beat #, estimated seconds, VO line, on-screen
  text, focal token), running/total duration, and a provenance table (fact → source in the brief).
  Faithful to the brief; no invented facts; on-screen text distilled (not the VO verbatim).

## Examples

### Example 1: one-line brief → 15 s narrated teaser (JTBD-1)
Brief: "15s teaser for our API rate-limit feature, devs; we cut p99 latency 47%." Concept mood: tech.
Actions: fact inventory = {feature: API rate-limiting, audience: devs, stat: 47% p99 latency cut}. Arc =
hook → context → proof → CTA, 4 beats. Beat 1 VO "Your API just got faster." on-screen **Faster APIs**.
Beat 3 (proof) VO "We cut p99 latency by forty-seven percent." on-screen **p99 −47%** (focal: 47%).
Provenance: 47% ← brief. Seconds sum ≈ 15. No new numbers introduced.

### Example 2: revenue CSV → data narrative (JTBD-2)
`context.md` carries 4 quarterly figures. Build beats that name each figure exactly as given (the on-screen
text per beat is the bare number, e.g. **$1.2M**) and a payoff beat with the growth framing. Provenance
table lists all four figures ← the CSV. The displayed numbers in later phases must equal these exactly —
so write them exactly, no rounding the brief didn't ask for.

### Example 3: re-script to change the message (JTBD-4)
User: "change the stat to 52%." This DOES change a fact → re-run THIS phase (not a restyle). Update the
proof beat's VO + on-screen text + provenance row to 52%, leave the arc/other beats intact, save
`02-script.md`, and note the change so phase 3+ re-run from the new facts.

## Troubleshooting
- **On-screen text is the whole VO sentence** → distill it. The screen gets the headline/keyword/number,
  the VO carries the sentence. (`references/scriptwriting-beats.md` → "Distillation".)
- **A fact in the script isn't in the brief** → remove it or mark connective tissue `[framing]`; never
  fabricate. If the arc needs a fact you don't have, note the gap in the assumptions block.
- **Beats overshoot the duration** → tighten VO wording or drop the weakest beat; do not shrink read-time
  below ~1.2 s/beat (text won't be legible). Re-sum the seconds.
- **User asks to "make it punchier" / restyle** → that does NOT change facts; do not re-script. Only
  re-script when the user changes the message itself (a fact). (`references/fidelity-rule.md`.)

## Quality Criteria
- [ ] Beat-structured: a named arc (hook→context→proof→payoff) with one idea per beat; ~1 beat / 3–5 s.
- [ ] Every beat has a VO line AND a distilled on-screen text (on-screen ≠ the VO verbatim).
- [ ] Faithful: every fact/number/name/quote traces to the brief in the provenance table; nothing invented.
- [ ] Seconds estimated per beat and summed to ~the target duration (default 15 s if unstated).
- [ ] Tone + pacing align to `01-concept.md`'s mood; assumptions/defaults stated at the top.
- [ ] Written to `artifacts/<project-name>/02-script.md`.
