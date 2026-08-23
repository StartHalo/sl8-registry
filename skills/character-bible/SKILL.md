---
name: character-bible
description: >
  Locks a recurring character's identity so it survives across shots, scenes and episodes —
  a frozen token set, a fixed seed, and two reference stills (turnaround + hero) that every
  downstream prompt anchors on. Use when: "keep the character consistent", "same character
  in every shot", "build a character bible/turnaround/reference sheet", "the character
  drifts between clips", any project with a named recurring figure. Chain: consumes
  style.md's aesthetic block verbatim (style-system runs first); renders its two stills via
  frame-craft; hands the frozen CHARACTER_BLOCK + hero.png to video-prompting as the
  identity anchor for every clip. NOT for: the look/palette itself (use style-system),
  generating ordinary scene frames (use frame-craft), motion or clip prompts (use
  video-prompting), running a whole deliverable (use cinematic-video or character-episode).
---

# character-bible — identity is a lock, not a description

The single idea: **identity comes from reference images + verbatim tokens + a fixed seed —
not from longer prompts.** Over-describing hurts consistency. Lock a handful of distinctive
traits, phrase each as one fixed string, and reuse those strings byte-identical everywhere.

This skill owns the craft of that lock. It does not own a deliverable — workflows
(`cinematic-video`, `character-episode`) call it and own their own runbook steps.

## Inputs to collect

1. **The project's `style.md`** (required — style-system creates it). The aesthetic block is
   pasted VERBATIM into both still prompts. **Style words never enter the identity tokens,
   and identity words never enter the aesthetic block** — one home each, or they drift apart.
2. **The character brief** — whatever the user actually said about who this is. Name, and
   any distinctive traits. Only ask when the answer cannot be inferred.
3. **A reference image, if supplied** — an uploaded picture of the character is an identity
   anchor, not a style donor. It outranks the tokens (see below).
4. **The project aspect** — passed explicitly on both stills.

## The lock — three mechanisms, in priority order

1. **The reference image (primary, when supplied).** If the brief cites an uploaded
   reference, it is the strongest anchor: pass it as THE one ref on both bible stills
   (frame-craft's 1-ref rule — refs are weighted equally and dilute the anchor; max 2
   total). Tokens reinforce it; they never contradict what the image shows.
2. **The frozen CHARACTER_BLOCK (the written lock).** Composed once, frozen, pasted
   byte-identical into every prompt downstream.
3. **The fixed seed (tie-breaker).** One integer, reused across both stills and any retry.
   Random seeds ≈30% variance run-to-run; a fixed seed is non-negotiable.

## The no-synonym rule

> Once a token is set, it is reused **byte-identical** everywhere — the spec, the
> CHARACTER_BLOCK, both bible-still prompts, and every scene's identity line. Never
> paraphrase a locked token.

Drift between shots is caused by paraphrase: the model treats "emerald eyes" and "green
eyes" as two intents and renders two characters. The fix is mechanical — pick the exact
words once, freeze, copy-paste; never retype from memory, never "improve" the wording.

| locked token (keep verbatim) | the drift it must never become |
|---|---|
| `glowing violet eyes` | "purple eyes", "bright eyes" |
| `silver-white braided hair` | "white braids", "silver hair" |
| `obsidian-and-crimson lamellar armor` | "dark red armor", "scaled armor" |

**This rule has been broken in production, by a skill that told an agent to break it.**
R05 (2026-08-23) put 1 of 5 tokens into the shot prompts because `cinematic-video` Step 3
said "the character's name + 2–3 verbatim tokens". The agent obeyed exactly. Any consumer of
this skill that paraphrases, samples, or summarises the block is defective — the block is a
**copy operation**, and consumers are expected to assert that mechanically before spending
(see Quality bar).

## Token craft

- **5–7 distinctive tokens**, ordered **face → hair → eyes → outfit/props → other
  distinctive** (scar, marking, signature prop). The first three are keyed `face`, `hair`,
  `eyes` — face leads because it is what the render keys its `@Image` reference on across
  cuts.
- **Distinctive, not generic** — a token earns its place only if it visibly separates THIS
  character from a generic one. The highest-leverage move is **specific materiality**:
  "armor" → "obsidian-and-crimson lamellar armor"; "jacket" → "worn leather aviator jacket".
- **Self-contained noun phrases** — each token survives copy-paste out of context:
  `jagged scar across the left cheekbone`, not "scar" qualified elsewhere.
- **Cap at 7.** More dilutes the lock and the model averages or drops traits (2–3 distinctive
  details ≈78% consistency; piling on more reduces it). The block is also read across 4–6
  shots per scene — a diluted lock drifts shot-to-shot.
- **Positive framing only** — write what the character IS, never "no beard, no glasses". The
  one sanctioned negative is the appended "no text in the image".
- **Sparse brief** (<2 distinctive traits): add neutral, on-genre defaults to reach ≥5 tokens
  and flag every invented token in the spec's Provenance line — never stall, never invent
  exotic detail the brief doesn't imply.

## The spec — `character/spec.md`

```markdown
# Character Spec: <Name>

## Identity Tokens   (verbatim — reuse byte-identical downstream, never paraphrase)
- face: <token>
- hair: <token>
- eyes: <token>
- outfit/props: <token>
- <5–7 total, face → hair → eyes → outfit/props order>

## Seed
<one integer>

## CHARACTER_BLOCK   (frozen — paste verbatim into every prompt)
"<the identity tokens, comma-joined, in list order>"

## Reference image
<character/ref.png | none>

## Provenance
brief source · defaults applied (each invented token named) · date
```

CHARACTER_BLOCK is built by comma-joining the token VALUES in list order, wrapped in double
quotes — every token byte-identical to its bullet.

## Prompt build order — the two stills

Both prompts assemble in this fixed order, the frozen parts verbatim, **same seed on both**,
explicit `aspect_ratio`:

```
<aesthetic block verbatim from style.md> . <CHARACTER_BLOCK verbatim> . <instruction> . no text in the image . <aspect>
```

**Turnaround** (`character/sheet.png` — becomes `@Image1`):

> "Create a complete character turnaround sheet showing the same character from these
> angles: front view, three-quarter view, side profile, back view. All views show the SAME
> character with consistent proportions, facial features, hair, outfit, and color palette —
> no drift between views. Clean neutral background with clear separation between views.
> Professional character-design reference sheet, clean render."

**Hero** (`character/hero.png` — becomes `@Image2`, and the start frame of any per-shot
fallback clip):

> "A clean front-facing hero portrait of the same character, head-and-shoulders to
> three-quarter body, centered, looking toward camera, neutral studio background, even
> lighting, sharp focus. Single character, no other figures."

"No text in the image" is always appended — image models print stray names and labels on
sheets, and a label baked into the bible carries into every shot.

## Model routing

Both stills are ordinary image generations: **route them through
[`../frame-craft`](../frame-craft/SKILL.md)** and do not restate its model catalog here — it
owns image model routing, and a second copy would drift from it. What this skill adds on top
of a normal frame-craft call:

| parameter | value | why |
|---|---|---|
| seed | the spec's integer, **identical on both stills and every retry** | random seeds ≈30% run-to-run variance |
| refs | the user's reference image if supplied, else none | 1 ref max — equal weighting dilutes the anchor |
| aspect_ratio | the project aspect, explicit | never left to a default |

`ai-gen models` / `ai-gen estimate` at runtime are the truth for ids and prices — never
invent a model id, never hardcode a price (M1). The paid-call contract itself has one home:
[`../video-prompting`](../video-prompting/SKILL.md).

## Quality bar

Nothing leaves this skill until all four hold.

1. **The spec is complete and self-consistent** — 5–7 tokens in face → hair → eyes →
   outfit/props order, a seed, and a CHARACTER_BLOCK that is a byte-identical comma-join of
   the token values in list order. Check the join mechanically, not by eye.
2. **Both stills exist and are usable** — the sheet has all four views; the hero is a single
   clean front portrait usable as a start frame. Neither carries stray text.
3. **The sheet holds ONE identity, graded on the pixels.** Read
   [`references/consistency-check.md`](references/consistency-check.md) and run it: a
   per-trait verdict against the rendered image, an overall 0–10 score, and an explicit
   `pass` (≥7) or `regenerate` verdict. **Grading from the spec text, the filename, or the
   generation log instead of the pixels is a fabricated grade** — and a fabricated grade
   ships a broken bible into every downstream shot.
4. **Consumers can prove they copied the block.** Any workflow that spends money off this
   bible asserts, before the paid call, that the CHARACTER_BLOCK appears character-for-
   character in every prompt it is about to submit — and refuses to submit otherwise. That
   assertion is free; the drift it prevents is not. The workflow owns the gate; this skill
   states the contract it gates against.

On a still that misses: **ONE retry on the same seed**, tightening the prompt toward the
drifting token — never a new seed, never a synonym. Still failing → keep the best attempt,
record which dimension failed, and surface it at the gate. Never loop, never hide it.

## Worked token set (the PoC dark-elf — held identity through a 5-shot cinematic)

```
- face: matte black-violet skin
- hair: silver-white braided hair
- eyes: glowing violet eyes
- outfit/props: obsidian-and-crimson lamellar armor
- scar: jagged scar across the left cheekbone
```

CHARACTER_BLOCK: `"matte black-violet skin, silver-white braided hair, glowing violet eyes,
obsidian-and-crimson lamellar armor, jagged scar across the left cheekbone"` — each token a
verbatim copy, in list order. That is the whole trick.

## References (load when needed)

- [`references/consistency-check.md`](references/consistency-check.md) — the vision grade:
  what to check per trait class across views, the 0–10 scale and its pass bar, and how to
  phrase a single targeted regenerate (same seed + one tightened token).

## Provenance

Harvested from BOT-027 `bot-027-character-bible` (`references/trait-lock.md` +
`references/nbp-dialect.md`), 2026-08; carried into `cinematic-video` as a workflow-local
reference; promoted to the domain tier 2026-08-23 so a second workflow could cite it rather
than copy it. The consistency check is BOT-016 `bot-016-consistency-check`'s vision grade,
which was the more rigorous of the two self-checks and had no path into the studio until
this promotion.
