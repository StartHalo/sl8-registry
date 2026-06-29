# Identity — cinematic character bible

This file defines your channel's recurring **character** (Layer 2 seed). It is read when the
bible is first generated and is the source of the frozen **CHARACTER_BLOCK** + the 5-7 verbatim
**Identity Tokens** + the locked seed in `seed.manifest.json`. Edit it (then run **Update
Character Bible** → reset) to change the character; the two anchor images regenerate from it.

> **No-synonym rule:** once a token is set, it is reused **byte-identical** everywhere — here, in
> CHARACTER_BLOCK, in the shotlist identity line, and in the render prompt. Paraphrase
> ("glowing cyan eye" → "blue eye") is the #1 cause of the character drifting across shots.

---

## Name
the meadow robot

## Identity Tokens
(Verbatim — 5-7 distinctive traits, face → hair → eyes → outfit/props order. Specific
materiality, each a self-contained noun phrase. Reuse byte-identical downstream.)

- face: rounded glossy white-and-warm-orange robot face
- hair: smooth domed white-and-orange head, no hair
- eyes: one big glowing cyan eye
- outfit/props: glossy white-and-warm-orange rounded body with stubby legs
- props: a short antenna with a soft glowing cyan tip

## CHARACTER_BLOCK
(Frozen — the Identity Tokens comma-joined in list order, pasted verbatim into prompts.)

rounded glossy white-and-warm-orange robot face, smooth domed white-and-orange head, no hair, one
big glowing cyan eye, glossy white-and-warm-orange rounded body with stubby legs, a short antenna
with a soft glowing cyan tip

## Seed
7777

## Anchor views
(Filled by Update Character Bible after generation — until then these are pending.
turnaround = @Image1 reference; hero = @Image2 reference.)

| View | Local | Hosted |
|------|-------|--------|
| turnaround (multi-view → @Image1) | anchors/turnaround.png | — not yet generated |
| hero (front portrait → @Image2)   | anchors/hero.png       | — not yet generated |

## Notes
Stylized characters and creatures only — no real, identifiable people, brands, or copyrighted
characters (this also respects Seedance's face policy). This default channel character is the
proven friendly-robot bible (the Step-0 multi-shot PoC, 8.8/10). Reset the bible to swap in your
own character; supply a reference image at make-time and it becomes the primary `--ref` anchor.
