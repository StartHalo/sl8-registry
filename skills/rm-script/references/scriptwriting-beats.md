# Scriptwriting — narrative arc, beats, distillation, pacing

> The craft reference for `rm-script`. Ported from BOT-015 `hf-script`, lightly re-targeted to the
> Remotion engine. The job: turn a brief into a **beat-structured script** where each beat is one idea
> carrying a VO line + a distilled on-screen text, paced to a duration. The fidelity rule (no invented
> facts) lives in `fidelity-rule.md` — read both. No rendering happens in this phase.

## 1. Narrative arc

Every video — even 10 s — has a beginning, middle, and end. Pick the arc that fits the brief:

| Arc | Beats | Use when |
|---|---|---|
| **hook → context → proof → payoff/CTA** (default) | 4 | a feature/product teaser, an announcement, most briefs (JTBD-1) |
| **hook → problem → solution → result** | 4 | a "before/after" story, a fix or improvement |
| **hook → stat → stat → … → takeaway** | 3–8 | a data-viz video (JTBD-2): each stat is a beat, takeaway is the payoff |
| **hook → setup → punchline** | 3 | a very short (≤8 s) clip or a single-idea social cut |

- **Hook (beat 1)** must earn attention in the first ~2 s: a strong line or the single most striking
  number/claim from the brief. Never open with a slow throat-clear ("In this video we will…").
- **Payoff/CTA (final beat)** lands the one thing to remember or do. Keep it concrete; if the brief has
  no CTA, end on the takeaway (don't invent a CTA).
- One **focal message per beat** — never two facts in one beat. If the brief has more facts than beats,
  the lesser ones become supporting on-screen metadata in the storyboard, not their own beats.

## 2. Beat count from duration

About **one beat per 3–5 s** of video. Pick the count, then pace VO to fill it (don't pad).

| Target duration | Beats (typical) |
|---|---|
| ≤ 8 s | 2–3 |
| 10 s | 3 |
| 15 s | 4–5 |
| 30 s | 6–8 |

If the brief gives no duration, default to **15 s / ~4 beats** and say so in the assumptions block.

## 3. The two layers per beat: VO line vs on-screen text

This is the heart of the skill. Each beat has **two distinct text layers**:

- **VO line (narration)** — carries the *detail*. Written for the ear: short clauses, one breath, a
  strong opening, numbers spoken naturally. The VO is what `rm-voiceover` (phase 4) sends to the
  ai-gen Kokoro TTS, and what `rm-voiceover`'s Wizper ASR aligns into word-level `04-timing.json`.
- **On-screen text (distillation)** — carries the *emphasis*. The headline, 1–4 keywords, or the bare
  number — **NOT the VO sentence**. The screen reinforces; it does not transcribe.

### Distillation (the rule, with examples)
On-screen text is the headline/keyword distillation of the beat, not the narration verbatim.

| VO line (narration) | On-screen text (distillation) | Focal token | Downstream Remotion block |
|---|---|---|---|
| "We cut p99 latency by forty-seven percent." | **p99 −47%** (or **47% faster**) | 47% | `Counter` (stat TypeKey) |
| "Built for teams that ship every day." | **Ship daily** | ship | `RiseIn` headline |
| "Revenue more than doubled this quarter, to one point two million." | **$1.2M** | $1.2M | `Counter` |
| "It works in every editor you already use." | **Any editor** | every | `RiseIn` / `dek` |

Rules of thumb: ≤ ~6 words on screen per beat (a single number/word is great); pick the **focal token**
the storyboard should emphasize (the number, the verb, the brand word); never paste the VO sentence as
on-screen text (this is a graded anti-pattern). For a stat beat, the on-screen text is usually just the
number — `rm-storyboard` maps it to the engine's `Counter` primitive, which animates frame-driven to the
exact value downstream.

## 4. Pacing (seconds per beat)

Estimate each beat's duration from its VO word count at ~**2.5 spoken words/sec**:

```
beat_seconds ≈ max(1.2, vo_word_count / 2.5)
```

- A 1.2 s floor keeps any beat legible (text needs ~1 s to read). Don't go below it.
- Sum the beat seconds; they should total ~the target duration. If they overshoot, **tighten the VO
  wording or drop the weakest beat** — never compress read-time below the floor. If they undershoot,
  let the payoff beat breathe (a beat of held silence is fine), or add a supporting beat *only if the
  brief has another fact for it*.
- Match rhythm to the concept's **mood** (from `01-concept.md`): calm = fewer, longer beats (more
  seconds each); tech/upbeat = more, tighter beats.
- These seconds become **frames at FPS = 30** downstream (`engine/tokens.ts`): `frames ≈ round(sec * 30)`.
  The composition contract requires the timeline to end exactly at `durationInFrames`, so keep your stated
  total clean — `rm-storyboard` and `rm-build` budget the frame ranges from it.
- **Silent videos:** there's no narration, but still write a per-beat "VO line" as the **read-time
  guide** for the on-screen text and mark the beat `[silent — read-time]`. The seconds estimate then
  drives how long the text holds.

## 5. Writing for the ear (VO craft)

- Short clauses; one idea per sentence; a strong opening line on the hook beat.
- Spell numbers the way they're spoken ("forty-seven percent", "one point two million") so TTS reads
  them correctly — but keep the **on-screen** form as the figure (`47%`, `$1.2M`).
- No jargon the audience wouldn't say aloud; no stage directions in the VO line itself.
- Don't write camera/visual directions into the VO — those are the storyboard's job (phase 3).

## 6. Output format (`02-script.md`)

Write the file in this shape so `rm-storyboard` and `rm-voiceover` can read it deterministically, and so
`scripts/check-script.sh` passes:

```markdown
# Script — <project>

## Assumptions (resolved defaults)
- Duration: 15 s (defaulted — brief gave none)
- Audience: <who you wrote for>
- Mode: narrated   <!-- or: silent — read-time -->
- Tone/pacing: <from 01-concept.md mood>

## Arc
hook → context → proof → payoff/CTA   <!-- name the arc you chose -->

## Beats

| # | sec | VO line (narration) | On-screen text | Focal token |
|---|-----|---------------------|----------------|-------------|
| 1 | 3.0 | Your API just got faster.                       | **Faster APIs** | faster |
| 2 | 3.6 | Rate limits used to mean dropped requests.      | **No more drops** | drops |
| 3 | 4.4 | We cut p99 latency by forty-seven percent.      | **p99 −47%**    | 47% |
| 4 | 4.0 | Ship faster. Start today.                        | **Start today** | start |

**Total: ~15.0 s** (4 beats)

## Provenance (every fact → source in the brief)

| Fact (as used) | Appears in | Source in brief |
|---|---|---|
| 47% p99 latency cut | beat 3 VO + on-screen | brief: "we cut p99 latency 47%" |
| API rate-limit feature | beats 1–2 | brief topic |
| (framing) "Your API just got faster" | beat 1 VO | [framing] — no new fact |
```

- The **per-beat table** is the contract the downstream phases consume — keep the columns exactly
  (`# | sec | VO line | On-screen text | Focal token`).
- The **provenance table** is the fidelity gate — every fact in any VO/on-screen cell must have a row
  tracing it to the brief; framing language is allowed but marked `[framing]` (no new facts). See
  `fidelity-rule.md`.
- State the **total** the beats sum to, and flag if it differs from the requested duration.
