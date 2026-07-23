---
name: style-system
description: >
  Owns a video project's visual identity: the editable style.md identity file, the preset
  library, the bake-off procedure, and the style-key consistency mechanism that makes N
  generated shots feel like one film. Use when: "pick a style", "set up the brand/look",
  "make it match our brand", "the shots look inconsistent", "compose a new style preset",
  starting any new video project (the identity file is created before any frame is
  generated). Chain: runs before frame-craft (which consumes the aesthetic block verbatim)
  and video-prompting (which attaches the style key to every clip). NOT for: writing frame
  prompts (use frame-craft), motion prompts (use video-prompting), or assembly color
  grading (use assembly-qc).
---

# style-system — the identity file, presets, and the consistency law

Consistency across generated shots is not luck; it is three mechanisms working together:
**one editable identity file** per project, **one aesthetic block reused verbatim** in every
frame prompt, and **one style-key image** attached to every clip call. This skill owns all
three.

## Inputs to collect

Only ask when the answer cannot be inferred from the brief or an existing project:

1. **Brief fit** — topic, audience, mood. Used to shortlist 3–4 presets (or compose one).
2. **Brand constraints** — palette/logo/type requirements, if any. A logo is NEVER
   generated into frames — it is composited in post (assembly-qc).
3. **Aspect + platform** — decides `aspect_ratio` values downstream.
4. **Existing identity** — if `style.md` exists in the project, it WINS; do not re-ask.

## The identity file — `artifacts/<project>/style.md`

Created once per project (copy a preset, then edit). YAML frontmatter = machine-readable
tokens (assembly-qc reads them for captions/overlays); body = the prompt-facing text.

```markdown
---
preset: newsprint-editorial        # or "custom"
palette: "cream white, deep red, mustard yellow, charcoal black"
type_style: "bold condensed newsprint headlines, all-caps"
finish: "aged paper, heavy halftone dots, high contrast, slight print misregistration"
mood: "energetic, tactile, cinematic editorial"
motion_style: punchy               # calm | punchy | max (video-prompting's amplitude)
voice: af_nova                     # the ONE narrator (voice-timing)
accent: "deep red"
logo: null                         # path if provided; composited in post only
aspect: "16:9"
style_key: style-key.png           # generated at bake-off; the style carrier on every clip (i2v: via the frame; r2v: as a ref)
---
## Aesthetic block (reused VERBATIM in every frame prompt — only scene/bg/headline change)
<the full style text: idiom + mechanics + palette + finish>

## For
<one line: what briefs this identity suits>
```

**The verbatim law:** the aesthetic block is pasted unchanged into every frame prompt.
Editing it mid-project forks the film's look — bump the project instead, or accept the
seam knowingly.

## The preset library — quality floor, not a cage

Shipped presets live in [`references/presets.md`](references/presets.md) (each = idiom +
palette + type_style + finish + mood + motion_style + a full aesthetic block + a "For:"
fit line). The library is a **quality floor**: the agent may compose a custom preset from
the labeled axes in [`references/axes.md`](references/axes.md)
(medium · era · composition · palette · type · finish · lighting · mood) when no preset
fits — a composed preset gets its own full aesthetic block and a "For:" line, and enters
the project's `style.md` like any other.

## The bake-off (the human picks by eye)

Before committing a look, render **one representative frame across 3–4 candidate presets**
(frame-craft, cheap stills — ~$0.15 each) and show them side by side. The human picks;
AI proposes, the library is the floor, the human decides. The winning frame (or a
dedicated style frame) becomes **`style-key.png`** — the project's style anchor. How it
travels (video-prompting owns the mechanics): on single-shot i2v the approved frame IS
the style carrier (it was generated under the verbatim block); on r2v/multi-ref calls the
style key rides as a ref in every call. When a user supplies a reference image instead,
treat it as a **style donor**: "take only the render style and color grading; never the
characters, inscriptions, or objects."

## Model routing

This skill spends only through frame-craft's bake-off frames. No direct model calls.

## Quality bar

- [ ] `style.md` exists before the first non-bake-off frame is generated.
- [ ] The aesthetic block appears VERBATIM (diff-identical) in every frame prompt of the
      project.
- [ ] Exactly one `style_key` image exists; every clip call carries a style carrier (i2v:
      the approved frame; r2v: the key as a ref).
- [ ] One narrator voice across the whole project.
- [ ] Logo (if any) never appears in a generation prompt — post-composite only.
- [ ] A composed custom preset carries all six token fields (preset name · palette ·
      type_style · finish · mood · motion_style) + an aesthetic block + "For:".
