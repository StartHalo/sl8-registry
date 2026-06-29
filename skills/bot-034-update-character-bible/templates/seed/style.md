# Style — cinematic channel

This file defines the **visual style** for your cinematic channel (Layer 2 seed). It is read at
the start of every cinematic and is the source of the frozen **STYLE_STACK** block in
`seed.manifest.json`. Edit it to change the look, then run **Update Character Bible** (reset) so
the change takes effect and the anchors regenerate.

---

## STYLE_STACK
(Frozen — pasted verbatim into the shotlist header and every render/anchor prompt. Style ONLY —
art style + render + lighting + camera look. No character/identity words here.)

cinematic 3D-animated short, Pixar-style animation, soft warm lighting, shallow depth of field,
polished render

## Palette
Cream & Cyan — a glossy white-and-warm-orange body with a single glowing cyan eye reads as
friendly, modern, and high-contrast against soft naturalistic backgrounds.

## Look / discipline
Lighting first among style words (golden hour / rim light / volumetric is the highest
quality-per-word element). Pair `cinematic` with a concrete lighting word or a film/medium
reference — never bare. One slow-mo ramp on the key beat. `fast` is the most dangerous keyword —
only ever make ONE element fast.

## Profiles
- **story** (default): wide establishing → tighter → climax → resolve.
- **fight**: standoff → first clash → escalation → counter → final strike. Use the E2 dark-fantasy
  header (see `bot-034-make-cinematic/references/shot-grammar.md`) when the world fits, keeping the
  lighting-first + color-grading shape.

## Audio directive
(Native in-pass audio — Seedance generates score + SFX + ambience in the same render; describe it
in the shotlist `Audio:` line, never mix it separately.)

A score mood + 2-3 concrete SFX + an ambience bed fitting the profile. For the default look:
whimsical playful orchestral score, gentle nature ambience, soft robotic chirps and a happy beep.
