# Identity — keyframe character (token seed)

This file defines your channel's recurring **character** as **5–7 frozen CHARACTER tokens**
(Layer 2 seed). This is a **token kit**: identity is pinned by *text only* — there are **no
PNG anchors**. Each token is woven byte-identical into every keyframe state image prompt
(`consumption: text-weave`), and consecutive keyframes also chain `--ref state[i-1]` so the
SAME character carries across the journey. The tokens here are mirrored verbatim into
`seed.manifest.json` → `identity.tokens`.

Edit the bullets below (then run **Update Character** → reset) to change the character. Reset
is **FREE and instant** — it re-reads this file, re-freezes the tokens, re-runs the token-lock
linter, and bumps provenance. There are no anchors to regenerate.

---

## Character tokens
(5–7 distinctive, concrete, *visual* traits — face / body / color / eyes / signature at
minimum. Each `- <key>: <token>` is FROZEN and reused byte-identical in every keyframe.
Friendly / stylized characters and creatures only — never a realistic human face.)

- face: a round button-nosed baby dragon face with big soft cheeks
- body: a small chubby dragon body with stubby legs and a stubby tail
- color: smooth teal-and-mint scales with a pale cream belly
- eyes: enormous round amber eyes with bright catchlights
- signature: tiny translucent gold wings and three little dorsal nubs
- horns: two soft rounded baby horns the color of honey

## Seed
2929

## Token-weave note
These tokens ARE the identity lock — there is no separate character bible or reference PNG.
Paste each token verbatim into the keyframe state descriptions (the plan stage does this).
Paraphrasing a token between states ("amber eyes" → "golden eyes") is the drift vector this
kit exists to prevent; the plan linter and the token-lock linter both enforce verbatim reuse.
