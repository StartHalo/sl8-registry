# Character bible — the trait lock and the two reference stills

> Harvested from BOT-027 cinematic-director-seedance (`bot-027-character-bible`:
> `references/trait-lock.md` + `references/nbp-dialect.md`), 2026-08. Reframed for the
> studio: style has ONE home — `style.md`'s aesthetic block (style-system) — so BOT-027's
> separate STYLE_STACK is folded into it; identity keeps its own home
> (`character/spec.md`). Image generation routes through frame-craft; BOT-027's pinned
> three-model fallback chain is dropped.

The single idea: **identity comes from reference images + verbatim tokens + a fixed seed
— not from longer prompts.** Over-describing hurts consistency. Lock a handful of
distinctive traits, phrase each as one fixed string, and reuse those strings
byte-identical everywhere — in the bible stills here and in every `@Image`-anchored shot
the reference-to-video pass renders.

## The lock — three mechanisms, in priority order

1. **The reference image (primary, when supplied).** If the brief cites an uploaded
   reference, it is the strongest anchor: pass it as THE one ref on both bible stills
   (frame-craft's 1-ref rule — refs are weighted equally and dilute the anchor; max 2
   total). Tokens reinforce it; they never contradict what the image shows.
2. **The frozen CHARACTER_BLOCK (the written lock).** Composed once, frozen, pasted
   byte-identical into every prompt downstream.
3. **The fixed seed (tie-breaker).** One integer, reused across both stills and any
   retry. Random seeds ≈30% variance run-to-run; a fixed seed is non-negotiable.

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

## Token craft

- **5–7 distinctive tokens**, ordered **face → hair → eyes → outfit/props → other
  distinctive** (scar, marking, signature prop). The first three are keyed `face`,
  `hair`, `eyes` — face leads because it is what the render keys its `@Image` reference
  on across cuts.
- **Distinctive, not generic** — a token earns its place only if it visibly separates
  THIS character from a generic one. The highest-leverage move is **specific
  materiality**: "armor" → "obsidian-and-crimson lamellar armor"; "jacket" → "worn
  leather aviator jacket".
- **Self-contained noun phrases** — each token survives copy-paste out of context:
  `jagged scar across the left cheekbone`, not "scar" qualified elsewhere.
- **Cap at 7.** More dilutes the lock and the model averages or drops traits (2–3
  distinctive details ≈78% consistency; piling on more reduces it). The block is also
  read across 4–6 shots per scene — a diluted lock drifts shot-to-shot.
- **Positive framing only** — write what the character IS, never "no beard, no glasses".
  The one sanctioned negative is the appended "no text in the image".
- **Sparse brief** (<2 distinctive traits): add neutral, on-genre defaults to reach ≥5
  tokens and flag every invented token in the spec's Provenance line — never stall, never
  invent exotic detail the brief doesn't imply.

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

CHARACTER_BLOCK is built by comma-joining the token VALUES in list order, wrapped in
double quotes — every token byte-identical to its bullet. Style words stay OUT of it
(style.md's aesthetic block owns the look); identity words stay out of the aesthetic
block.

## The two stills (generated via frame-craft)

Both prompts assemble in this fixed order — the frozen parts verbatim, same seed on both,
explicit `aspect_ratio` (the project aspect):

```
<aesthetic block verbatim from style.md> . <CHARACTER_BLOCK verbatim> . <instruction> . no text in the image . <aspect>
```

**Turnaround instruction** (`character/sheet.png` — becomes `@Image1`):

> "Create a complete character turnaround sheet showing the same character from these
> angles: front view, three-quarter view, side profile, back view. All views show the
> SAME character with consistent proportions, facial features, hair, outfit, and color
> palette — no drift between views. Clean neutral background with clear separation
> between views. Professional character-design reference sheet, clean render."

**Hero instruction** (`character/hero.png` — becomes `@Image2`, and the start frame of
any per-shot fallback clip):

> "A clean front-facing hero portrait of the same character, head-and-shoulders to
> three-quarter body, centered, looking toward camera, neutral studio background, even
> lighting, sharp focus. Single character, no other figures."

"No text in the image" is always appended — image models print stray names/labels on
sheets, and a label baked into the bible carries into every shot.

## Self-check before approval (read the pixels)

- **sheet** — all four views present? ONE consistent character across every view (face,
  hair, outfit, palette agree — no warping)? On-spec vs CHARACTER_BLOCK? Clean
  background, zero stray text?
- **hero** — a single clean front portrait of the SAME character, usable as a start
  frame (one figure, no text)?

On a miss: ONE retry on the same seed, tightening the prompt toward the drifting token —
never a new seed. Still failing → keep the best attempt, record which dimension failed,
and surface it at the gate. Never loop, never hide it.

## Worked token set (the PoC dark-elf — held identity through a 5-shot cinematic)

```
- face: matte black-violet skin
- hair: silver-white braided hair
- eyes: glowing violet eyes
- outfit/props: obsidian-and-crimson lamellar armor
- scar: jagged scar across the left cheekbone
```

CHARACTER_BLOCK: `"matte black-violet skin, silver-white braided hair, glowing violet
eyes, obsidian-and-crimson lamellar armor, jagged scar across the left cheekbone"` —
each token a verbatim copy, in list order. That is the whole trick.
