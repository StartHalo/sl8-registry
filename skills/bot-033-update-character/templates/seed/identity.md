# Identity — stickman character

This file defines your channel's recurring **character** (Layer 2 seed). It is read when
the character is first generated and is the source of the frozen CHARACTER block + the
locked seed in `seed.manifest.json`. Edit it (then run **Update Character** → reset) to
change the character; the three anchor views regenerate from it.

---

## Character block
An extremely minimal hand-drawn stick figure: a plain circle head, two small dot eyes,
a simple curved smile, a small baseball cap worn slightly tilted, a small plain rounded
torso drawn as one soft solid teardrop shape, and single-stroke arms and legs. No other
facial features, no clothing besides the cap, no fingers — simple line hands.
Proportions: head about one fifth of total height, limbs slightly longer than the torso.
Every image of this character uses this exact same body construction.

## Seed
4242

## Anchor views
(Filled by Update Character after generation — until then these are pending.)

| View | Local | Hosted |
|------|-------|--------|
| source (front-facing) | anchors/character-source.png | — not yet generated |
| three-quarter (¾) | anchors/character-threequarter.png | — not yet generated |
| side profile (90°) | anchors/character-sideprofile.png | — not yet generated |

## Text asset note
When generating the source image (e.g. character standing next to a box labeled "TASK"),
one short word on one object is permitted. This overrides the positive constraints for
that single asset only — all other stills keep the strict no-text constraint.
