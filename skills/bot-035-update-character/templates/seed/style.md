# Style — keyframe channel (token seed)

This file defines the **visual look** for your keyframe-scene channel (Layer 2 seed). It is
read at the start of every project and is the source of the frozen STYLE_HEADER in
`seed.manifest.json`. Because this is a **token kit**, the look is carried by *text only* —
there are no PNG anchors. The look header is woven verbatim into every keyframe image prompt
(that is what `consumption: text-weave` means). Edit it to change the look, then run
**Update Character** (reset) so the change re-freezes — reset is FREE and instant (no
image-gen; tokens only).

---

## Style
Cute storybook fantasy short, soft Pixar-style 3D animation, warm magical lighting, gentle
bloom, shallow depth of field, cozy children's-book color palette.

## Audio directive
(Hailuo 02 clips are SILENT — there is no native audio. The render adds a subtle ambient bed
at assembly and discloses it as NON-native.)
A warm whimsical music-box and soft orchestral ambient bed with gentle chimes.

## Look discipline
- Every keyframe state shares this exact world — same medium, lighting, and palette — so the
  pinned states read as one continuous journey.
- Keep the subject large in frame and clearly lit (avoid the very darkest lighting) so the
  Hailuo first-last morph between two keyframes stays legible.
- Friendly, stylized characters and creatures only — never a realistic, identifiable human
  face or a real named person.
