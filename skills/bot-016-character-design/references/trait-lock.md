# Trait-Lock — the no-synonym discipline, the 5-part frame, and worked blocks

The craft reference for `bot-016-character-design`. Everything a character bible needs to hold
one identity across many downstream shots is here — baked **inline** from recipe family A
(the runtime sandbox has no KB access). Load this before composing tokens.

The single idea behind this whole skill: **identity comes from reference images + verbatim
tokens + a fixed seed — not from longer prompts.** Over-describing *hurts* consistency. Lock a
handful of distinctive traits, phrase each as one fixed string, and reuse those strings
byte-identical everywhere.

---

## 1. The no-synonym rule (the consistency mechanism)

> Once a token is set, it is reused **byte-identical** everywhere — in the spec, in
> CHARACTER_BLOCK, and in every downstream prompt. **Never paraphrase a locked token.**

Drift between shots is caused by paraphrase. The model treats "emerald eyes" and "green eyes"
as two different intents and renders two different characters across two shots. The fix is
mechanical, not creative: pick the exact words once, freeze them, and copy-paste — never
retype from memory, never "improve" the wording.

Canonical drift pairs to refuse:

| locked token (keep verbatim) | the drift it must never become |
|---|---|
| `glowing violet eyes` | "purple eyes", "violet eyes", "bright eyes" |
| `matte black-violet skin` | "dark skin", "black skin", "dusky skin" |
| `silver-white braided hair` | "white braids", "silver hair", "long braided hair" |
| `obsidian-and-crimson lamellar armor` | "dark red armor", "black armor", "scaled armor" |

The deterministic half of this rule is enforced by `scripts/validate-spec.sh`: every
comma-separated token inside CHARACTER_BLOCK must appear byte-identical as a token value in the
Identity Tokens list. If you paraphrase in CHARACTER_BLOCK, the validator fails. The semantic
half (never paraphrasing in a *downstream* prompt) is a discipline phase 2 inherits via the
frozen-block copy-paste contract.

---

## 2. The 5-part trait frame (recipe A4)

A4's frame is the skeleton of a good CHARACTER_BLOCK. Build the spec by filling these five
parts in order:

1. **Subject anchor** — what the character *is* in one phrase (the name / archetype): "Vyre
   the dark-elf warrior", "the brand mascot", "a weathered ship's captain".
2. **5-7 trait locks** — the distinctive identity tokens, ordered **face → hair → outfit/props**
   (list face first, then hair, then clothing). These become the Identity Tokens list.
3. **Pose / scene** — handled downstream per asset (the turnaround views, the hero portrait);
   the spec stays pose-neutral.
4. **Style** — art style + render + lighting + camera look; becomes STYLE_STACK.
5. **Fixed seed** — one integer (default 7777), recorded once, reused across every asset.
   Random seeds give ~30% variance run-to-run; a fixed seed is non-negotiable for a bible.

A4's verbatim example (a rogue elf — directly adaptable to any fantasy brief):

> "Elara the rogue elf: sharp green eyes, freckled cheeks, short auburn hair in braid, leather
> vest with silver clasps, scar on left jaw. Dynamic sword draw in misty forest. Realistic
> fantasy, cinematic lighting. Seed:12345."

Note the ordering inside it (face features → hair → clothing → distinctive scar), the fixed
seed, and that the *pose* ("dynamic sword draw") is separable from the *identity* — in our
spec the pose lives downstream, the identity is what we freeze.

---

## 3. Token ordering and craft

**Order: face → hair → eyes → outfit/props → other distinctive (scar, marking, signature
prop).** The first three Identity Token bullets MUST be keyed `face`, `hair`, `eyes` (the
validator checks this) — face leads because it is what a viewer locks onto and what the
downstream director bots key their reference on.

**Distinctive, not generic.** A token earns its place only if it visibly separates this
character from a generic one. "brown hair" is filler; "silver-white braided hair" is a lock.
"armor" is filler; "obsidian-and-crimson lamellar armor" is a lock. The single
highest-leverage move (from the Nano Banana Pro guide) is **specific materiality** — swap the
generic noun for its material:

- "armor" → "ornate elven plate armor, etched with silver leaf patterns"
- "jacket" → "worn leather aviator jacket"
- "mug" → "minimalist ceramic coffee mug"

**Each token is a self-contained noun phrase** with its distinguishing detail baked in, so it
survives copy-paste out of context: `jagged scar across the left cheekbone`, not "scar"
qualified three bullets later.

**Cap at 7.** Five to seven distinctive tokens is the sweet spot. More tokens dilute the lock
and the model starts dropping or averaging them (recipe A's over-describing penalty). Studies
behind recipe C echo this: 2-3 distinctive details per character hit ~78% consistency; piling
on more *reduces* it.

**Positive framing only.** The downstream models (Gemini-family Nano Banana Pro / 2) respond
badly to negation — write what the character *is*, never "no beard, no glasses". Negatives, if
ever needed, are a phase-2 concern, not a token.

---

## 4. The model-agnostic bible template (recipe A2)

Use this as the fill-in skeleton when a brief is thin and you need to reason about which slots
are present vs. defaulted. Each bracket maps to a token or to STYLE_STACK:

> "Character identity: [NAME], [AGE], [GENDER PRESENTATION], [ETHNICITY/FEATURES], [HAIR
> STYLE/COLOR], [EYE COLOR], [FACE SHAPE], [DISTINCTIVE FEATURE], [BODY TYPE], [OUTFIT DETAILS],
> [COLOR PALETTE], [PERSONALITY VIBE]. Style lock: [ART STYLE], [LINE/RENDER STYLE], [LIGHTING],
> [CAMERA LOOK]. Constraints: keep face and hairstyle identical, keep outfit design consistent
> unless explicitly changed, no text."

Mapping to our spec:

- the `[...identity...]` brackets → the **Identity Tokens** list (collapse the relevant ones
  into 5-7 distinctive tokens; do not emit 12 generic slots);
- `[COLOR PALETTE]` → the **Palette** section (name it + one line of reasoning);
- the `Style lock:` brackets → **STYLE_STACK**;
- "keep face and hairstyle identical … no text" → the downstream discipline phase 2 enforces.

**A2's rule:** change ONE variable at a time downstream (scene OR emotion OR outfit) — never
two at once. That is why identity is frozen in writing *before* any pixels: the only variable
that changes between the turnaround views is the camera angle.

A1's turnaround-prompt shape (for context — phase 2 owns this, you just write the blocks it
consumes): a turnaround sheet showing the character "from four angles: front view, side
profile, back view, and three-quarter view … All four views show same character with
consistent proportions and design details … no text". Your STYLE_STACK + CHARACTER_BLOCK are
what get pasted in front of that instruction, verbatim.

---

## 5. STYLE_STACK — composing the frozen style line

STYLE_STACK carries **only** style: art style + render + lighting + camera look. No identity
tokens. One double-quoted line. Derive it from the brief's style preference, or use the
default.

- **Default** (when the brief states no style):
  `"cinematic concept-art realism, photorealistic render, dramatic rim light"`
- **Richer default** (a crisp bible sheet):
  `"cinematic concept-art realism, photorealistic render, dramatic rim light, volumetric atmosphere, sharp focus"`
- **Adapted from a stated preference** — keep the slot structure (style · render · lighting ·
  camera), swap the words only:
  - brief says "gritty dark-fantasy, Unreal Engine 5" →
    `"gritty dark-fantasy concept art, Unreal Engine 5 realistic render, low-key chiaroscuro lighting, shallow depth of field"`
  - brief says "flat 2D mascot, bright and friendly" →
    `"flat vector mascot illustration, clean cel render, even soft lighting, head-on camera"`

Use creative-director vocabulary, not adjective soup. "beautiful professional masterpiece"
adds nothing; "dramatic rim light, volumetric atmosphere, 85mm portrait look" each change the
render measurably.

---

## 6. CHARACTER_BLOCK — composing the frozen identity line

CHARACTER_BLOCK is the Identity Tokens, **comma-joined in the fixed face → hair → eyes → outfit/props
order**, as one double-quoted line. Every token in it must be **byte-identical** to its bullet
in the Identity Tokens list — that byte-identity is the no-synonym lock the validator checks
and the thing that keeps the character the same across shots.

Build it by concatenating the token *values* (the text after each `- <key>:`), in list order,
with `, ` between them, wrapped in double quotes. Do not re-word, re-order, or summarize.

---

## 7. Worked example — the Step-0 dark-elf (the PoC token set)

This is the dark-elf bible the Step-0 PoC locked, in the exact spec shape phase 1 writes.

```markdown
# Character Spec: Vyre

## Identity Tokens   (verbatim — reuse byte-identical downstream, never paraphrase)
- face: matte black-violet skin
- hair: silver-white braided hair
- eyes: glowing violet eyes
- outfit/props: obsidian-and-crimson lamellar armor
- scar: jagged scar across the left cheekbone

## Seed
7777

## Palette
Obsidian & Violet — matte-black skin and glowing violet eyes against cold-steel armor read as menacing dark-elf nobility; the crimson lacing is the single warm accent.

## STYLE_STACK   (frozen — paste verbatim into every prompt)
"cinematic concept-art realism, photorealistic render, dramatic rim light, volumetric atmosphere, sharp focus"

## CHARACTER_BLOCK   (frozen — paste verbatim into every prompt)
"matte black-violet skin, silver-white braided hair, glowing violet eyes, obsidian-and-crimson lamellar armor, jagged scar across the left cheekbone"

## Reference image
none

## Provenance
brief source: context.md · defaults applied: name coined "Vyre", seed 7777 · 2026-06-19 · model used for the sheet: TBD (phase 2 records it)

## Downstream use
front-frame: hero.png · identity reference: reference-sheet.png · tokens: CHARACTER_BLOCK
```

Note how each CHARACTER_BLOCK token is a verbatim copy of an Identity Token value, in list
order. That is the whole trick.

---

## 8. Worked example — a sparse brief with neutral defaults

Brief in context.md: *"a friendly robot mascot for a coffee app"* — distinctive enough on
"robot mascot" and "coffee", but thin on face/hair/outfit. Add neutral defaults to reach ≥5
tokens and FLAG every invented one.

```markdown
# Character Spec: Bean-Bot

## Identity Tokens   (verbatim — reuse byte-identical downstream, never paraphrase)
- face: rounded white robot face with two warm amber LED eyes
- hair: smooth domed chrome head (no hair)
- eyes: warm amber LED eyes
- outfit/props: glossy cream-and-espresso enamel body holding a small steaming cup
- props: a single steam curl rising from the cup

## Seed
7777

## Palette
Cream & Espresso — warm coffee browns with a cream body and amber accents read as friendly and on-brand for a coffee app.

## STYLE_STACK   (frozen — paste verbatim into every prompt)
"flat vector mascot illustration, clean cel render, even soft lighting, head-on camera"

## CHARACTER_BLOCK   (frozen — paste verbatim into every prompt)
"rounded white robot face with two warm amber LED eyes, smooth domed chrome head (no hair), warm amber LED eyes, glossy cream-and-espresso enamel body holding a small steaming cup, a single steam curl rising from the cup"

## Reference image
none

## Provenance
brief source: context.md · defaults applied: face/hair/outfit invented as neutral defaults (see note); name coined "Bean-Bot"; seed 7777 · 2026-06-19 · model used for the sheet: TBD
Defaults applied: the brief gave only "friendly robot mascot for a coffee app" — face (rounded white, amber LEDs), the chrome head, and the enamel body were chosen as neutral, on-genre defaults for the creator to refine.

## Downstream use
front-frame: hero.png · identity reference: reference-sheet.png · tokens: CHARACTER_BLOCK
```

The `eyes` token intentionally restates the amber-LED detail from the `face` token because
the face/hair/eyes ordering requires an explicit `eyes` bullet — keep it byte-identical to how
it reads in the face token's eye clause so there is no second, competing description.

---

## See also (in this skill)

- `SKILL.md` — the phase workflow that consumes this reference.
- `scripts/validate-spec.sh` — the deterministic gate that enforces token count, ordering,
  single-integer seed, non-empty frozen blocks, and the CHARACTER_BLOCK byte-identity lock.
