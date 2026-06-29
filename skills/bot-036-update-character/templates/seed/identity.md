# Identity — continuous-shot character (token kit)

This file defines your channel's recurring **subject** (Layer 2 seed). It is read when the
kit is frozen and is the source of the **5–7 frozen CHARACTER tokens** + the locked seed in
`seed.manifest.json`. Edit it (then run **Update Character** → reset) to change the subject;
the tokens re-freeze and the linter re-runs. **This is a TOKEN kit — there are no PNG
anchors.** The base frame is regenerated per project from these tokens; "regenerate anchors"
is a declared no-op (`anchors: []`). Reset is FREE and instant — no image-gen.

---

## Character tokens (5–7, frozen, verbatim)
These exact phrases are the language-level identity lock. They are pasted verbatim into the
continuous-plan's `CHARACTER:` block and repeated **≥80% verbatim** into the base prompt and
EVERY extend hop (`consumption: text-repeat`) — the extend model only sees the trailing frame
plus your text, so the tokens must recur nearly word-for-word or the subject drifts. Choose
concrete, visual, non-overlapping tokens (body shape, color/material, a signature feature,
size, texture). Stylized friendly creatures only — never a realistic identifiable human face.

- friendly fluffy round owl
- soft cream-and-tan feathers
- big gentle amber eyes
- tiny hooked beak
- stubby rounded wings
- plump button body

## Character block (the prose subject sentence)
A friendly fluffy round owl with soft cream-and-tan feathers, big gentle amber eyes, a tiny
hooked beak, stubby rounded wings and a plump button body. This sentence (the tokens woven
into prose) is the one the Base opening-frame description and every hop re-state ≥80% verbatim.

## Seed
7777

## Anchor note (token kit — no PNGs)
This kit ships **no `anchors/` directory** by design. Identity is held by the frozen tokens
above, not by reference images. The single base still is generated per project (stage 4) from
these tokens via the shared image driver; nothing here is a persistent PNG, and a reset never
regenerates an image.
